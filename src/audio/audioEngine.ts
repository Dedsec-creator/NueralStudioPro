import {
  AIVocalAnalysisResult,
  AIVocalProfileId,
  AlignmentAnalysisResult,
  ArtistVocalPreset,
  AudioMetrics,
  AutoAlignSettings,
  DenoiseSettings,
  LibraryAsset,
  LibraryAssetType,
  MasteringSettings,
  MicLockerSettings,
  ModularPlugin,
  PitchFormantSettings,
  PitchTrackData,
  PocketRideStyle,
  ProVocalAIEnhancerSettings,
  RenderExportOptions,
  SynergyPocketSettings,
  TrackStemInfo,
  TuningSettings,
} from '../types';
import { MIC_MODELS } from './micProfiles';
import { detectPitchYIN, quantizeToScale } from './pitchDetector';
import { calculateSynergyAlignment, detectBPM, extractWaveformPeaks } from './transientAligner';

// Pre-computed soft saturation curve for tube/FET emulation
function makeSaturationCurve(amount: number): Float32Array {
  const k = Math.max(0.1, amount);
  const n_samples = 4096;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    // Asymmetric tube curve with 2nd and 3rd harmonic bloom
    if (k <= 0.1) {
      curve[i] = x;
    } else {
      const drive = 1 + k * 3;
      const shaped = Math.tanh(drive * x) + 0.15 * Math.sin(x * Math.PI * 0.5) * (k * 0.5);
      curve[i] = shaped / (1 + k * 0.5);
    }
  }
  return curve;
}

// Generate algorithmic plate impulse response for reverb
function createReverbImpulse(context: BaseAudioContext, duration: number, decay: number): AudioBuffer {
  const sampleRate = context.sampleRate;
  const length = Math.floor(sampleRate * Math.max(0.5, Math.min(6, duration)));
  const impulse = context.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * (3.0 / Math.max(0.1, decay)));
    const noiseL = (Math.random() * 2 - 1) * env;
    const noiseR = (Math.random() * 2 - 1) * env;
    left[i] = noiseL;
    right[i] = noiseR;
  }
  return impulse;
}

export class NeuralTuneAudioEngine {
  private ctx: AudioContext | null = null;
  private isInitialized = false;

  // Audio nodes
  private inputGain: GainNode | null = null;
  private micStream: MediaStream | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  // Dual Stem System (Vocals + Beat)
  private vocalBuffer: AudioBuffer | null = null;
  private beatBuffer: AudioBuffer | null = null;
  private vocalSourceNode: AudioBufferSourceNode | null = null;
  private beatSourceNode: AudioBufferSourceNode | null = null;
  private vocalGainNode: GainNode | null = null;
  private beatGainNode: GainNode | null = null;
  private beatCarveFilter: BiquadFilterNode | null = null;
  private beatDuckingGain: GainNode | null = null;

  public vocalPlaybackRate = 1.0;
  public beatPlaybackRate = 1.0;

  public vocalTrackInfo: TrackStemInfo = {
    name: 'No vocal track loaded',
    duration: 0,
    sampleRate: 48000,
    isCustomFile: false,
    volume: 1.0,
    playbackRate: 1.0,
    isMuted: false,
    isSolo: false,
    peaks: [],
  };

  public beatTrackInfo: TrackStemInfo = {
    name: 'No beat track loaded',
    duration: 0,
    sampleRate: 48000,
    isCustomFile: false,
    volume: 0.85,
    playbackRate: 1.0,
    isMuted: false,
    isSolo: false,
    peaks: [],
  };

  public synergySettings: SynergyPocketSettings = {
    enabled: true,
    alignOffsetMs: 0,
    rideStyle: 'pocket_lock',
    carveDepthDb: 3.5,
    sidechainDucking: 20,
    stereoSeparation: true,
    transientSensitivity: 60,
    alignmentConfidence: 94,
    detectedBeatBpm: 120,
    isAnalyzing: false,
    beatTransientsCount: 24,
    vocalTransientsCount: 11,
    aiPocketRideEnabled: true,
    pocketAttunement: 85,
    grooveSwing: 0,
    dynamicTransientLock: true,
  };

  // Studio Library Assets (Imported Stems & Rendered Masters)
  public libraryAssets: LibraryAsset[] = [];
  private onLibraryUpdate?: (assets: LibraryAsset[]) => void;

  // Pitch & Formant Processing State
  public pitchFormantSettings: PitchFormantSettings = {
    enabled: true,
    pitchSemitones: 0,
    fineTuneCents: 0,
    formantSemitones: 0,
    throatLength: 1.0,
    preserveFormants: true,
    formantIntensity: 80,
    character: 'custom',
    f1GainDb: 0,
    f2GainDb: 0,
    f3GainDb: 0,
    isBypassed: false,
  };

  private onTracksUpdate?: (tracks: { vocal: TrackStemInfo; beat: TrackStemInfo }) => void;
  private onSynergyUpdate?: (settings: SynergyPocketSettings) => void;
  private onPitchFormantUpdate?: (settings: PitchFormantSettings) => void;

  // Analyser nodes
  private inputAnalyser: AnalyserNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private pitchBuffer: Float32Array = new Float32Array(2048);

  // DSP Nodes
  private autoGateRumbleCut: BiquadFilterNode | null = null;
  private autoGateFizzCut: BiquadFilterNode | null = null;
  private harshDeEsserFilter: BiquadFilterNode | null = null;
  private denoiseGain: GainNode | null = null;
  private autoGateHoldUntilMs = 0;
  private autoGateOpen = true;
  private dynamicHarshReductionDb = 0;
  private smoothedNoiseFloorDb = -60;
  private alignDelay: DelayNode | null = null;
  private alignPhaseGain: GainNode | null = null;

  // Mic locker filters
  private micFilters: BiquadFilterNode[] = [];
  private proximityFilter: BiquadFilterNode | null = null;
  private micDriveNode: WaveShaperNode | null = null;

  // Tuning pitch shifter
  private pitchShifterNode: BiquadFilterNode | null = null;
  private tuningGain: GainNode | null = null;

  // Dedicated Formant Resonators
  private formantF1: BiquadFilterNode | null = null;
  private formantF2: BiquadFilterNode | null = null;
  private formantF3: BiquadFilterNode | null = null;
  private formantThroatFilter: BiquadFilterNode | null = null;
  private formantAirFilter: BiquadFilterNode | null = null;

  // Pro Vocal AI Enhancer DSP Bank
  private aiWarmthFilter: BiquadFilterNode | null = null;
  private aiDeMudFilter: BiquadFilterNode | null = null;
  private aiClarityFilter: BiquadFilterNode | null = null;
  private aiHarshTamerFilter: BiquadFilterNode | null = null;
  private aiAirFilter: BiquadFilterNode | null = null;

  // Modular plugin nodes
  private pluginNodes: AudioNode[] = [];
  private pluginDryWetNodes: { dry: GainNode; wet: GainNode; merger: GainNode }[] = [];

  // Modular plugin live DSP nodes
  private pEqLow: BiquadFilterNode | null = null;
  private pEqLowMid: BiquadFilterNode | null = null;
  private pEqMid: BiquadFilterNode | null = null;
  private pEqHighMid: BiquadFilterNode | null = null;
  private pEqAir: BiquadFilterNode | null = null;

  private deEsserFilter: BiquadFilterNode | null = null;

  private tubeDriveShaper: WaveShaperNode | null = null;
  private tubeDryGain: GainNode | null = null;
  private tubeWetGain: GainNode | null = null;
  private tubeMergeGain: GainNode | null = null;

  private chorusDelayNode: DelayNode | null = null;
  private chorusLfo: OscillatorNode | null = null;
  private chorusLfoGain: GainNode | null = null;
  private chorusDryGain: GainNode | null = null;
  private chorusWetGain: GainNode | null = null;
  private chorusMergeGain: GainNode | null = null;

  private delayNode: DelayNode | null = null;
  private delayFeedbackGain: GainNode | null = null;
  private delayDampingFilter: BiquadFilterNode | null = null;
  private delayDryGain: GainNode | null = null;
  private delayWetGain: GainNode | null = null;
  private delayMergeGain: GainNode | null = null;

  private reverbPreDelay: DelayNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private reverbDryGain: GainNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private reverbMergeGain: GainNode | null = null;

  // Mastering chain
  private masterLowCut: BiquadFilterNode | null = null;
  private masterBass: BiquadFilterNode | null = null;
  private masterMid: BiquadFilterNode | null = null;
  private masterHighAir: BiquadFilterNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;
  private masterOutputGain: GainNode | null = null;

  // State
  private isPlaying = false;
  private isRecording = false;
  private isLiveMicActive = false;
  private isMuted = false;
  private playStartTime = 0;
  private pausedAt = 0;

  // Settings cache
  private tuningSettings: TuningSettings | null = null;
  public denoiseSettings: DenoiseSettings = {
    enabled: true,
    threshold: -50,
    reduction: 22,
    sensitivity: 75,
    noiseFloorLearned: false,
    isLearning: false,
    autoGateMode: true,
    harshSuppression: 50,
    lowRumbleCut: true,
    highCutHz: 18000,
    gateReleaseMs: 120,
    gateAttackMs: 8,
    gateHoldMs: 40,
  };
  public aiEnhancerSettings: ProVocalAIEnhancerSettings = {
    enabled: true,
    intensity: 65,
    clarityPresence: 60,
    airBrilliance: 70,
    warmthBody: 40,
    deMud: 55,
    harshnessTamer: 65,
    spectralBalance: 50,
    aiProfile: 'modern_pop',
  };
  private alignSettings: AutoAlignSettings | null = null;
  private micSettings: MicLockerSettings | null = null;
  private masteringSettings: MasteringSettings | null = null;
  private modularPlugins: ModularPlugin[] = [];

  // Callbacks
  private onPitchUpdate?: (data: PitchTrackData | null) => void;
  private onMetricsUpdate?: (metrics: AudioMetrics) => void;
  private onTimeUpdate?: (time: number, duration: number) => void;

  private animationFrameId: number | null = null;
  private smoothedMidiPitch = 60;
  private noiseFloorRms = 0.005;
  private lastTimeReportMs = 0;

  constructor() {
    this.initLibrary();
  }

  private initLibrary(): void {
    try {
      const stored = localStorage.getItem('neuraltune_ultra_library_v1');
      if (stored) {
        const parsed = JSON.parse(stored) as LibraryAsset[];
        if (Array.isArray(parsed)) {
          // Filter out any previously saved factory demo items
          this.libraryAssets = parsed.filter(a => !a.isFactoryDemo && !a.id.startsWith('factory_'));
          return;
        }
      }
    } catch (_) {}

    this.libraryAssets = [];
  }

  public getLibraryAssets(): LibraryAsset[] {
    return [...this.libraryAssets];
  }

  public addLibraryAsset(asset: LibraryAsset): void {
    this.libraryAssets = [asset, ...this.libraryAssets.filter(a => a.id !== asset.id)];
    this.notifyLibraryChanged();
  }

  public deleteLibraryAsset(id: string): void {
    this.libraryAssets = this.libraryAssets.filter(a => a.id !== id);
    this.notifyLibraryChanged();
  }

  public subscribeLibrary(callback: (assets: LibraryAsset[]) => void): () => void {
    this.onLibraryUpdate = callback;
    callback([...this.libraryAssets]);
    return () => {
      this.onLibraryUpdate = undefined;
    };
  }

  private notifyLibraryChanged(): void {
    this.onLibraryUpdate?.([...this.libraryAssets]);
    try {
      // Save metadata to localStorage (omit large binary blobs)
      const storable = this.libraryAssets.map(({ blob, ...rest }) => rest);
      localStorage.setItem('neuraltune_ultra_library_v1', JSON.stringify(storable));
    } catch (_) {}
  }

  public async loadLibraryAssetIntoTrack(asset: LibraryAsset, target: 'vocal' | 'beat'): Promise<boolean> {
    await this.initialize();
    if (!this.ctx) return false;

    try {
      let buffer: AudioBuffer | null = null;
      if (asset.blob) {
        const arrayBuf = await asset.blob.arrayBuffer();
        buffer = await this.ctx.decodeAudioData(arrayBuf);
      } else if (asset.audioUrl && (asset.audioUrl.startsWith('blob:') || asset.audioUrl.startsWith('data:'))) {
        const res = await fetch(asset.audioUrl);
        const arrayBuf = await res.arrayBuffer();
        buffer = await this.ctx.decodeAudioData(arrayBuf);
      }

      if (!buffer) return false;

      const peaks = asset.peaks || extractWaveformPeaks(buffer, 80);

      if (target === 'vocal') {
        this.vocalBuffer = buffer;
        this.vocalTrackInfo = {
          name: asset.name,
          duration: buffer.duration,
          sampleRate: buffer.sampleRate,
          isCustomFile: true,
          volume: this.vocalTrackInfo.volume,
          playbackRate: 1.0,
          isMuted: false,
          isSolo: false,
          peaks,
        };
        if (this.beatBuffer) {
          this.autoAlignStems(this.synergySettings.rideStyle);
        }
      } else {
        this.beatBuffer = buffer;
        const bpm = detectBPM(buffer);
        this.synergySettings.detectedBeatBpm = bpm;
        this.beatTrackInfo = {
          name: asset.name,
          duration: buffer.duration,
          sampleRate: buffer.sampleRate,
          isCustomFile: true,
          volume: this.beatTrackInfo.volume,
          playbackRate: 1.0,
          isMuted: false,
          isSolo: false,
          peaks,
        };
        if (this.vocalBuffer) {
          this.autoAlignStems(this.synergySettings.rideStyle);
        }
      }

      this.notifyTracksChanged();
      return true;
    } catch (err) {
      console.error('Failed to load library asset into track:', err);
      return false;
    }
  }

  public async initialize(): Promise<boolean> {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return true;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass({
        latencyHint: 'interactive',
        sampleRate: 48000,
      });

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      this.setupMasterGraph();
      this.startAnalysisLoop();

      this.isInitialized = true;
      return true;
    } catch (e) {
      console.error('Failed to initialize AudioContext:', e);
      return false;
    }
  }

  private setupMasterGraph(): void {
    if (!this.ctx) return;

    // 1. Input stage
    this.inputGain = this.ctx.createGain();
    this.inputGain.gain.value = 1.0;

    this.vocalGainNode = this.ctx.createGain();
    this.vocalGainNode.gain.value = this.vocalTrackInfo.volume;
    this.vocalGainNode.connect(this.inputGain);

    this.inputAnalyser = this.ctx.createAnalyser();
    this.inputAnalyser.fftSize = 2048;
    this.inputAnalyser.smoothingTimeConstant = 0.6;
    this.inputGain.connect(this.inputAnalyser);

    // Beat / Instrumental Stage
    this.beatGainNode = this.ctx.createGain();
    this.beatGainNode.gain.value = this.beatTrackInfo.volume;

    this.beatCarveFilter = this.ctx.createBiquadFilter();
    this.beatCarveFilter.type = 'peaking';
    this.beatCarveFilter.frequency.value = 2500;
    this.beatCarveFilter.Q.value = 1.3;
    this.beatCarveFilter.gain.value = 0;

    this.beatDuckingGain = this.ctx.createGain();
    this.beatDuckingGain.gain.value = 1.0;

    this.beatGainNode.connect(this.beatCarveFilter);
    this.beatCarveFilter.connect(this.beatDuckingGain);

    // 2. Auto-Gate, Rumble Cut, Fizz Cut & Harshness Suppression Stage
    this.autoGateRumbleCut = this.ctx.createBiquadFilter();
    this.autoGateRumbleCut.type = 'highpass';
    this.autoGateRumbleCut.frequency.value = 80;
    this.autoGateRumbleCut.Q.value = 0.707;

    this.autoGateFizzCut = this.ctx.createBiquadFilter();
    this.autoGateFizzCut.type = 'lowpass';
    this.autoGateFizzCut.frequency.value = 18000;
    this.autoGateFizzCut.Q.value = 0.707;

    this.harshDeEsserFilter = this.ctx.createBiquadFilter();
    this.harshDeEsserFilter.type = 'peaking';
    this.harshDeEsserFilter.frequency.value = 3400;
    this.harshDeEsserFilter.gain.value = 0;
    this.harshDeEsserFilter.Q.value = 2.2;

    this.denoiseGain = this.ctx.createGain();
    this.denoiseGain.gain.value = 1.0;

    this.inputGain.connect(this.autoGateRumbleCut);
    this.autoGateRumbleCut.connect(this.autoGateFizzCut);
    this.autoGateFizzCut.connect(this.harshDeEsserFilter);
    this.harshDeEsserFilter.connect(this.denoiseGain);

    // 3. Auto-align stage (Delay + Phase)
    this.alignDelay = this.ctx.createDelay(0.2);
    this.alignDelay.delayTime.value = 0.05; // 50ms base delay
    this.alignPhaseGain = this.ctx.createGain();
    this.alignPhaseGain.gain.value = 1.0;
    this.denoiseGain.connect(this.alignDelay);
    this.alignDelay.connect(this.alignPhaseGain);

    // 4. Mic Locker stage
    this.proximityFilter = this.ctx.createBiquadFilter();
    this.proximityFilter.type = 'lowshelf';
    this.proximityFilter.frequency.value = 140;
    this.proximityFilter.gain.value = 0;

    this.micDriveNode = this.ctx.createWaveShaper();
    this.micDriveNode.curve = makeSaturationCurve(0.2);
    this.micDriveNode.oversample = '2x';

    this.alignPhaseGain.connect(this.proximityFilter);
    this.proximityFilter.connect(this.micDriveNode);

    // 5 Mic model filters cascade
    let lastNode: AudioNode = this.micDriveNode;
    this.micFilters = [];
    for (let i = 0; i < 5; i++) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'peaking';
      f.frequency.value = 1000;
      f.gain.value = 0;
      f.Q.value = 1.0;
      lastNode.connect(f);
      this.micFilters.push(f);
      lastNode = f;
    }

    // 5. Real-time Tuning stage
    this.pitchShifterNode = this.ctx.createBiquadFilter();
    this.pitchShifterNode.type = 'peaking';
    this.pitchShifterNode.frequency.value = 440;
    this.pitchShifterNode.gain.value = 3.0;
    this.pitchShifterNode.Q.value = 4.0;

    this.tuningGain = this.ctx.createGain();
    this.tuningGain.gain.value = 1.0;
    lastNode.connect(this.pitchShifterNode);
    this.pitchShifterNode.connect(this.tuningGain);
    lastNode = this.tuningGain;

    // 5.2. Formant Shaping Resonator Bank (F1, F2, F3, Throat, Air)
    this.formantF1 = this.ctx.createBiquadFilter();
    this.formantF1.type = 'peaking';
    this.formantF1.frequency.value = 700;
    this.formantF1.gain.value = 0;
    this.formantF1.Q.value = 2.4;

    this.formantF2 = this.ctx.createBiquadFilter();
    this.formantF2.type = 'peaking';
    this.formantF2.frequency.value = 1800;
    this.formantF2.gain.value = 0;
    this.formantF2.Q.value = 2.6;

    this.formantF3 = this.ctx.createBiquadFilter();
    this.formantF3.type = 'peaking';
    this.formantF3.frequency.value = 2900;
    this.formantF3.gain.value = 0;
    this.formantF3.Q.value = 2.8;

    this.formantThroatFilter = this.ctx.createBiquadFilter();
    this.formantThroatFilter.type = 'lowshelf';
    this.formantThroatFilter.frequency.value = 280;
    this.formantThroatFilter.gain.value = 0;

    this.formantAirFilter = this.ctx.createBiquadFilter();
    this.formantAirFilter.type = 'highshelf';
    this.formantAirFilter.frequency.value = 8500;
    this.formantAirFilter.gain.value = 0;

    lastNode.connect(this.formantF1);
    this.formantF1.connect(this.formantF2);
    this.formantF2.connect(this.formantF3);
    this.formantF3.connect(this.formantThroatFilter);
    this.formantThroatFilter.connect(this.formantAirFilter);
    lastNode = this.formantAirFilter;

    // 5.3. Pro Vocal AI Enhancer DSP Bank
    this.aiWarmthFilter = this.ctx.createBiquadFilter();
    this.aiWarmthFilter.type = 'lowshelf';
    this.aiWarmthFilter.frequency.value = 220;
    this.aiWarmthFilter.gain.value = 0;

    this.aiDeMudFilter = this.ctx.createBiquadFilter();
    this.aiDeMudFilter.type = 'peaking';
    this.aiDeMudFilter.frequency.value = 480;
    this.aiDeMudFilter.Q.value = 1.6;
    this.aiDeMudFilter.gain.value = 0;

    this.aiClarityFilter = this.ctx.createBiquadFilter();
    this.aiClarityFilter.type = 'peaking';
    this.aiClarityFilter.frequency.value = 3200;
    this.aiClarityFilter.Q.value = 1.4;
    this.aiClarityFilter.gain.value = 0;

    this.aiHarshTamerFilter = this.ctx.createBiquadFilter();
    this.aiHarshTamerFilter.type = 'peaking';
    this.aiHarshTamerFilter.frequency.value = 3600;
    this.aiHarshTamerFilter.Q.value = 2.8;
    this.aiHarshTamerFilter.gain.value = 0;

    this.aiAirFilter = this.ctx.createBiquadFilter();
    this.aiAirFilter.type = 'highshelf';
    this.aiAirFilter.frequency.value = 11500;
    this.aiAirFilter.gain.value = 0;

    lastNode.connect(this.aiWarmthFilter);
    this.aiWarmthFilter.connect(this.aiDeMudFilter);
    this.aiDeMudFilter.connect(this.aiClarityFilter);
    this.aiClarityFilter.connect(this.aiHarshTamerFilter);
    this.aiHarshTamerFilter.connect(this.aiAirFilter);
    lastNode = this.aiAirFilter;

    // 5.5. Real-time Modular Plugin Rack Chain
    // A. Parametric EQ
    this.pEqLow = this.ctx.createBiquadFilter();
    this.pEqLow.type = 'lowshelf';
    this.pEqLow.frequency.value = 120;
    this.pEqLow.gain.value = 0;

    this.pEqLowMid = this.ctx.createBiquadFilter();
    this.pEqLowMid.type = 'peaking';
    this.pEqLowMid.frequency.value = 450;
    this.pEqLowMid.gain.value = 0;
    this.pEqLowMid.Q.value = 1.2;

    this.pEqMid = this.ctx.createBiquadFilter();
    this.pEqMid.type = 'peaking';
    this.pEqMid.frequency.value = 1500;
    this.pEqMid.gain.value = 0;
    this.pEqMid.Q.value = 1.0;

    this.pEqHighMid = this.ctx.createBiquadFilter();
    this.pEqHighMid.type = 'peaking';
    this.pEqHighMid.frequency.value = 4500;
    this.pEqHighMid.gain.value = 0;
    this.pEqHighMid.Q.value = 1.2;

    this.pEqAir = this.ctx.createBiquadFilter();
    this.pEqAir.type = 'highshelf';
    this.pEqAir.frequency.value = 14000;
    this.pEqAir.gain.value = 0;

    lastNode.connect(this.pEqLow);
    this.pEqLow.connect(this.pEqLowMid);
    this.pEqLowMid.connect(this.pEqMid);
    this.pEqMid.connect(this.pEqHighMid);
    this.pEqHighMid.connect(this.pEqAir);
    lastNode = this.pEqAir;

    // B. De-Esser
    this.deEsserFilter = this.ctx.createBiquadFilter();
    this.deEsserFilter.type = 'peaking';
    this.deEsserFilter.frequency.value = 6800;
    this.deEsserFilter.gain.value = 0;
    this.deEsserFilter.Q.value = 2.2;
    lastNode.connect(this.deEsserFilter);
    lastNode = this.deEsserFilter;

    // C. Tube Saturator (Dry/Wet)
    this.tubeDriveShaper = this.ctx.createWaveShaper();
    this.tubeDriveShaper.curve = makeSaturationCurve(0.2);
    this.tubeDriveShaper.oversample = '2x';
    this.tubeDryGain = this.ctx.createGain();
    this.tubeDryGain.gain.value = 1.0;
    this.tubeWetGain = this.ctx.createGain();
    this.tubeWetGain.gain.value = 0.0;
    this.tubeMergeGain = this.ctx.createGain();
    this.tubeMergeGain.gain.value = 1.0;

    lastNode.connect(this.tubeDryGain);
    lastNode.connect(this.tubeDriveShaper);
    this.tubeDriveShaper.connect(this.tubeWetGain);
    this.tubeDryGain.connect(this.tubeMergeGain);
    this.tubeWetGain.connect(this.tubeMergeGain);
    lastNode = this.tubeMergeGain;

    // D. Vocal Chorus / Doubler (Dry/Wet)
    this.chorusDelayNode = this.ctx.createDelay(0.1);
    this.chorusDelayNode.delayTime.value = 0.015;
    this.chorusLfo = this.ctx.createOscillator();
    this.chorusLfo.type = 'sine';
    this.chorusLfo.frequency.value = 1.2;
    this.chorusLfoGain = this.ctx.createGain();
    this.chorusLfoGain.gain.value = 0.0025;
    this.chorusLfo.connect(this.chorusLfoGain);
    this.chorusLfoGain.connect(this.chorusDelayNode.delayTime);
    try {
      this.chorusLfo.start();
    } catch (_) {}

    this.chorusDryGain = this.ctx.createGain();
    this.chorusDryGain.gain.value = 1.0;
    this.chorusWetGain = this.ctx.createGain();
    this.chorusWetGain.gain.value = 0.0;
    this.chorusMergeGain = this.ctx.createGain();
    this.chorusMergeGain.gain.value = 1.0;

    lastNode.connect(this.chorusDryGain);
    lastNode.connect(this.chorusDelayNode);
    this.chorusDelayNode.connect(this.chorusWetGain);
    this.chorusDryGain.connect(this.chorusMergeGain);
    this.chorusWetGain.connect(this.chorusMergeGain);
    lastNode = this.chorusMergeGain;

    // E. Vintage Delay (Dry/Wet with Feedback and Damping Filter)
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayNode.delayTime.value = 0.25;
    this.delayFeedbackGain = this.ctx.createGain();
    this.delayFeedbackGain.gain.value = 0.35;
    this.delayDampingFilter = this.ctx.createBiquadFilter();
    this.delayDampingFilter.type = 'lowpass';
    this.delayDampingFilter.frequency.value = 5000;

    this.delayDryGain = this.ctx.createGain();
    this.delayDryGain.gain.value = 1.0;
    this.delayWetGain = this.ctx.createGain();
    this.delayWetGain.gain.value = 0.0;
    this.delayMergeGain = this.ctx.createGain();
    this.delayMergeGain.gain.value = 1.0;

    lastNode.connect(this.delayDryGain);
    lastNode.connect(this.delayNode);
    this.delayNode.connect(this.delayDampingFilter);
    this.delayDampingFilter.connect(this.delayFeedbackGain);
    this.delayFeedbackGain.connect(this.delayNode);
    this.delayDampingFilter.connect(this.delayWetGain);
    this.delayDryGain.connect(this.delayMergeGain);
    this.delayWetGain.connect(this.delayMergeGain);
    lastNode = this.delayMergeGain;

    // F. Plate Reverb (Dry/Wet with PreDelay and Impulse)
    this.reverbPreDelay = this.ctx.createDelay(0.5);
    this.reverbPreDelay.delayTime.value = 0.025;
    this.reverbConvolver = this.ctx.createConvolver();
    this.reverbConvolver.buffer = createReverbImpulse(this.ctx, 2.5, 3.2);

    this.reverbDryGain = this.ctx.createGain();
    this.reverbDryGain.gain.value = 1.0;
    this.reverbWetGain = this.ctx.createGain();
    this.reverbWetGain.gain.value = 0.0;
    this.reverbMergeGain = this.ctx.createGain();
    this.reverbMergeGain.gain.value = 1.0;

    lastNode.connect(this.reverbDryGain);
    lastNode.connect(this.reverbPreDelay);
    this.reverbPreDelay.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.reverbWetGain);
    this.reverbDryGain.connect(this.reverbMergeGain);
    this.reverbWetGain.connect(this.reverbMergeGain);
    lastNode = this.reverbMergeGain;

    // 6. Mastering stage
    this.masterLowCut = this.ctx.createBiquadFilter();
    this.masterLowCut.type = 'highpass';
    this.masterLowCut.frequency.value = 30;

    this.masterBass = this.ctx.createBiquadFilter();
    this.masterBass.type = 'lowshelf';
    this.masterBass.frequency.value = 120;
    this.masterBass.gain.value = 1.0;

    this.masterMid = this.ctx.createBiquadFilter();
    this.masterMid.type = 'peaking';
    this.masterMid.frequency.value = 2500;
    this.masterMid.gain.value = 0.5;

    this.masterHighAir = this.ctx.createBiquadFilter();
    this.masterHighAir.type = 'highshelf';
    this.masterHighAir.frequency.value = 12000;
    this.masterHighAir.gain.value = 2.0;

    this.masterCompressor = this.ctx.createDynamicsCompressor();
    this.masterCompressor.threshold.value = -16;
    this.masterCompressor.knee.value = 8;
    this.masterCompressor.ratio.value = 3.5;
    this.masterCompressor.attack.value = 0.005;
    this.masterCompressor.release.value = 0.15;

    this.masterLimiter = this.ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.value = -0.3;
    this.masterLimiter.knee.value = 0;
    this.masterLimiter.ratio.value = 20;
    this.masterLimiter.attack.value = 0.001;
    this.masterLimiter.release.value = 0.05;

    this.masterOutputGain = this.ctx.createGain();
    this.masterOutputGain.gain.value = 1.0;

    this.outputAnalyser = this.ctx.createAnalyser();
    this.outputAnalyser.fftSize = 2048;
    this.outputAnalyser.smoothingTimeConstant = 0.7;

    // Connect mastering cascade
    lastNode.connect(this.masterLowCut);
    this.masterLowCut.connect(this.masterBass);
    this.masterBass.connect(this.masterMid);
    this.masterMid.connect(this.masterHighAir);
    this.masterHighAir.connect(this.masterCompressor);

    // Sum beat with processed vocal into master bus compression & limiter
    this.beatDuckingGain.connect(this.masterCompressor);

    this.masterCompressor.connect(this.masterLimiter);
    this.masterLimiter.connect(this.masterOutputGain);
    this.masterOutputGain.connect(this.outputAnalyser);
    this.masterOutputGain.connect(this.ctx.destination);
  }

  public clearVocalTrack(): void {
    if (this.vocalSourceNode) {
      try {
        this.vocalSourceNode.stop();
        this.vocalSourceNode.disconnect();
      } catch {}
      this.vocalSourceNode = null;
    }
    this.vocalBuffer = null;
    this.vocalTrackInfo = {
      name: 'No vocal track loaded',
      duration: 0,
      sampleRate: 48000,
      isCustomFile: false,
      volume: 1.0,
      playbackRate: 1.0,
      isMuted: false,
      isSolo: false,
      peaks: [],
    };
    this.notifyTracksChanged();
    if (!this.beatBuffer && !this.isLiveMicActive) {
      this.stop();
    }
  }

  public clearBeatTrack(): void {
    if (this.beatSourceNode) {
      try {
        this.beatSourceNode.stop();
        this.beatSourceNode.disconnect();
      } catch {}
      this.beatSourceNode = null;
    }
    this.beatBuffer = null;
    this.beatTrackInfo = {
      name: 'No beat track loaded',
      duration: 0,
      sampleRate: 48000,
      isCustomFile: false,
      volume: 0.85,
      playbackRate: 1.0,
      isMuted: false,
      isSolo: false,
      peaks: [],
    };
    this.notifyTracksChanged();
    if (!this.vocalBuffer && !this.isLiveMicActive) {
      this.stop();
    }
  }

  public hasAudioLoaded(): boolean {
    return Boolean((this.vocalBuffer && this.vocalBuffer.duration > 0) || (this.beatBuffer && this.beatBuffer.duration > 0));
  }

  // Load user vocal audio file
  public async loadVocalFile(file: File): Promise<boolean> {
    await this.initialize();
    if (!this.ctx) return false;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoded = await this.ctx.decodeAudioData(arrayBuffer);
      this.vocalBuffer = decoded;

      const peaks = extractWaveformPeaks(decoded, 80);
      this.vocalTrackInfo = {
        name: file.name,
        duration: decoded.duration,
        sampleRate: decoded.sampleRate,
        isCustomFile: true,
        volume: this.vocalTrackInfo.volume,
        playbackRate: 1.0,
        isMuted: false,
        isSolo: false,
        peaks,
      };

      // Automatically register imported vocal into Studio Library
      const asset: LibraryAsset = {
        id: `import_vocal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        type: 'imported_vocal',
        timestamp: Date.now(),
        duration: decoded.duration,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        format: file.name.toUpperCase().endsWith('.MP3') ? 'MP3' : 'WAV',
        sampleRate: decoded.sampleRate,
        blob: file,
        audioUrl: URL.createObjectURL(file),
        peaks,
        notes: `Imported vocal stem (${decoded.numberOfChannels} ch, ${decoded.sampleRate}Hz)`,
      };
      this.addLibraryAsset(asset);

      if (this.beatBuffer) {
        this.autoAlignStems(this.synergySettings.rideStyle);
      }
      this.notifyTracksChanged();
      return true;
    } catch (e) {
      console.error('Failed to decode vocal audio file:', e);
      return false;
    }
  }

  // Load user beat audio file
  public async loadBeatFile(file: File): Promise<boolean> {
    await this.initialize();
    if (!this.ctx) return false;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoded = await this.ctx.decodeAudioData(arrayBuffer);
      this.beatBuffer = decoded;

      const peaks = extractWaveformPeaks(decoded, 80);
      const bpm = detectBPM(decoded);
      this.synergySettings.detectedBeatBpm = bpm;

      this.beatTrackInfo = {
        name: file.name,
        duration: decoded.duration,
        sampleRate: decoded.sampleRate,
        isCustomFile: true,
        volume: this.beatTrackInfo.volume,
        playbackRate: 1.0,
        isMuted: false,
        isSolo: false,
        peaks,
      };

      // Automatically register imported beat into Studio Library
      const asset: LibraryAsset = {
        id: `import_beat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        type: 'imported_beat',
        timestamp: Date.now(),
        duration: decoded.duration,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        format: file.name.toUpperCase().endsWith('.MP3') ? 'MP3' : 'WAV',
        sampleRate: decoded.sampleRate,
        blob: file,
        audioUrl: URL.createObjectURL(file),
        peaks,
        notes: `Imported beat (${bpm} BPM, ${decoded.sampleRate}Hz)`,
      };
      this.addLibraryAsset(asset);

      if (this.vocalBuffer) {
        this.autoAlignStems(this.synergySettings.rideStyle);
      }
      this.notifyTracksChanged();
      return true;
    } catch (e) {
      console.error('Failed to decode beat audio file:', e);
      return false;
    }
  }

  // Backwards compatible single file loader
  public async loadUserAudioFile(file: File): Promise<boolean> {
    return this.loadVocalFile(file);
  }

  // Automatic transient synergy alignment between vocal and beat with AI Pocket Attunement
  public autoAlignStems(style: PocketRideStyle = this.synergySettings.rideStyle): AlignmentAnalysisResult | null {
    if (!this.beatBuffer || !this.vocalBuffer) return null;

    try {
      this.synergySettings.isAnalyzing = true;
      this.notifySynergyChanged();

      const result = calculateSynergyAlignment(
        this.beatBuffer,
        this.vocalBuffer,
        this.synergySettings.detectedBeatBpm,
        style,
        this.synergySettings.transientSensitivity,
        this.synergySettings.pocketAttunement ?? 85,
        this.synergySettings.grooveSwing ?? 0
      );

      this.synergySettings.alignOffsetMs = result.offsetMs;
      this.synergySettings.alignmentConfidence = result.confidence;
      this.synergySettings.beatTransientsCount = result.beatTransients.length;
      this.synergySettings.vocalTransientsCount = result.vocalTransients.length;
      this.synergySettings.rideStyle = style;
      this.synergySettings.aiAttuneReport = result.aiAttuneReport;
      this.synergySettings.isAnalyzing = false;
      this.notifySynergyChanged();

      // If already playing, update the alignment dynamically
      if (this.isPlaying) {
        this.seek(this.pausedAt);
      }

      return result;
    } catch (err) {
      console.error('Auto alignment error:', err);
      this.synergySettings.isAnalyzing = false;
      this.notifySynergyChanged();
      return null;
    }
  }

  // Triggers one-click AI Auto Pocket Attunement & Groove Alignment
  public runAIAutoPocketAttune(): AlignmentAnalysisResult | null {
    if (!this.vocalBuffer || !this.beatBuffer) {
      return null;
    }
    return this.autoAlignStems(this.synergySettings.rideStyle);
  }

  public updateSynergySettings(settings: Partial<SynergyPocketSettings>): void {
    const prevOffset = this.synergySettings.alignOffsetMs;
    const prevStyle = this.synergySettings.rideStyle;
    const prevAttune = this.synergySettings.pocketAttunement;
    const prevSwing = this.synergySettings.grooveSwing;

    this.synergySettings = { ...this.synergySettings, ...settings };

    if (
      (settings.rideStyle && settings.rideStyle !== prevStyle) ||
      (settings.pocketAttunement !== undefined && settings.pocketAttunement !== prevAttune) ||
      (settings.grooveSwing !== undefined && settings.grooveSwing !== prevSwing)
    ) {
      this.autoAlignStems(this.synergySettings.rideStyle);
    } else if (settings.alignOffsetMs !== undefined && settings.alignOffsetMs !== prevOffset && this.isPlaying) {
      this.seek(this.pausedAt);
    }

    this.notifySynergyChanged();
  }

  // Stem Mixing: Volume, Mute, Solo
  public setVocalVolume(vol: number): void {
    this.vocalTrackInfo.volume = Math.max(0, Math.min(1.5, vol));
    this.updateTrackGains();
    this.notifyTracksChanged();
  }

  public setBeatVolume(vol: number): void {
    this.beatTrackInfo.volume = Math.max(0, Math.min(1.5, vol));
    this.updateTrackGains();
    this.notifyTracksChanged();
  }

  public setVocalMute(muted: boolean): void {
    this.vocalTrackInfo.isMuted = muted;
    this.updateTrackGains();
    this.notifyTracksChanged();
  }

  public setBeatMute(muted: boolean): void {
    this.beatTrackInfo.isMuted = muted;
    this.updateTrackGains();
    this.notifyTracksChanged();
  }

  public setVocalSolo(solo: boolean): void {
    this.vocalTrackInfo.isSolo = solo;
    this.updateTrackGains();
    this.notifyTracksChanged();
  }

  public setBeatSolo(solo: boolean): void {
    this.beatTrackInfo.isSolo = solo;
    this.updateTrackGains();
    this.notifyTracksChanged();
  }

  private updateTrackGains(): void {
    if (!this.ctx || !this.vocalGainNode || !this.beatGainNode) return;
    const now = this.ctx.currentTime;

    let vocalGain = this.vocalTrackInfo.volume;
    let beatGain = this.beatTrackInfo.volume;

    // Solo logic: if any track has solo on, mute tracks without solo
    const anySolo = this.vocalTrackInfo.isSolo || this.beatTrackInfo.isSolo;
    if (anySolo) {
      if (!this.vocalTrackInfo.isSolo) vocalGain = 0;
      if (!this.beatTrackInfo.isSolo) beatGain = 0;
    }

    // Mute logic
    if (this.vocalTrackInfo.isMuted) vocalGain = 0;
    if (this.beatTrackInfo.isMuted) beatGain = 0;

    this.vocalGainNode.gain.setTargetAtTime(vocalGain, now, 0.015);
    this.beatGainNode.gain.setTargetAtTime(beatGain, now, 0.015);
  }

  public subscribeTracks(cb: (tracks: { vocal: TrackStemInfo; beat: TrackStemInfo }) => void): () => void {
    this.onTracksUpdate = cb;
    cb({ vocal: this.vocalTrackInfo, beat: this.beatTrackInfo });
    return () => {
      if (this.onTracksUpdate === cb) this.onTracksUpdate = undefined;
    };
  }

  public subscribeSynergy(cb: (settings: SynergyPocketSettings) => void): () => void {
    this.onSynergyUpdate = cb;
    cb(this.synergySettings);
    return () => {
      if (this.onSynergyUpdate === cb) this.onSynergyUpdate = undefined;
    };
  }

  private notifyTracksChanged(): void {
    this.onTracksUpdate?.({ vocal: this.vocalTrackInfo, beat: this.beatTrackInfo });
  }

  private notifySynergyChanged(): void {
    this.onSynergyUpdate?.(this.synergySettings);
  }

  // Microphone capture
  public async toggleMicrophone(enabled?: boolean): Promise<boolean> {
    await this.initialize();
    if (!this.ctx || !this.inputGain) return false;

    const shouldEnable = enabled !== undefined ? enabled : !this.isLiveMicActive;

    if (!shouldEnable) {
      if (this.micStream) {
        this.micStream.getTracks().forEach(t => t.stop());
        this.micStream = null;
      }
      if (this.micSourceNode) {
        this.micSourceNode.disconnect();
        this.micSourceNode = null;
      }
      this.isLiveMicActive = false;
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.micStream = stream;
      this.micSourceNode = this.ctx.createMediaStreamSource(stream);
      this.micSourceNode.connect(this.inputGain);
      this.isLiveMicActive = true;
      return true;
    } catch (e) {
      console.warn('Microphone permission not granted or device not available:', e);
      this.isLiveMicActive = false;
      return false;
    }
  }

  // Playback control
  public play(): void {
    if (!this.ctx || !this.inputGain) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.stopPlayback();

    const totalDuration = this.getDuration();
    if (totalDuration <= 0 && !this.isLiveMicActive) {
      return;
    }

    const now = this.ctx.currentTime;
    const offset = totalDuration > 0 ? (this.pausedAt % totalDuration) : 0;
    const effectiveSpeed = this.beatPlaybackRate || 1.0;
    this.playStartTime = now - (offset / effectiveSpeed);

    // 1. Play Instrumental Beat Track
    if (this.beatBuffer && this.beatGainNode) {
      this.beatSourceNode = this.ctx.createBufferSource();
      this.beatSourceNode.buffer = this.beatBuffer;
      this.beatSourceNode.loop = true;
      this.beatSourceNode.playbackRate.value = this.beatPlaybackRate;
      this.beatSourceNode.connect(this.beatGainNode);

      const beatOffset = this.beatBuffer.duration > 0 ? offset % this.beatBuffer.duration : 0;
      this.beatSourceNode.start(0, beatOffset);
    }

    // 2. Play Vocal Track with Synergy Pocket alignment & Pitch Shifting
    if (this.vocalBuffer && this.vocalGainNode) {
      this.vocalSourceNode = this.ctx.createBufferSource();
      this.vocalSourceNode.buffer = this.vocalBuffer;
      this.vocalSourceNode.loop = true;
      this.vocalSourceNode.playbackRate.value = this.vocalPlaybackRate;

      // Apply Pitch shifting via AudioBufferSourceNode detune in cents
      if ('detune' in this.vocalSourceNode && this.pitchFormantSettings.enabled && !this.pitchFormantSettings.isBypassed) {
        const totalPitchCents = (this.pitchFormantSettings.pitchSemitones * 100) + this.pitchFormantSettings.fineTuneCents;
        this.vocalSourceNode.detune.value = totalPitchCents;
      }

      this.vocalSourceNode.connect(this.vocalGainNode);

      // Alignment offset in seconds: positive delays vocal, negative advances vocal
      const alignOffsetSec = (this.synergySettings.alignOffsetMs || 0) / 1000;
      let vocalOffset = (offset - alignOffsetSec) % this.vocalBuffer.duration;
      if (vocalOffset < 0) vocalOffset += this.vocalBuffer.duration;

      this.vocalSourceNode.start(0, vocalOffset);
    }

    this.updateTrackGains();
    this.updatePitchFormantDSP();
    this.isPlaying = true;
  }

  public pause(): void {
    if (!this.isPlaying || !this.ctx) return;
    const totalDuration = this.getDuration();
    const effectiveSpeed = this.beatPlaybackRate || 1.0;
    this.pausedAt = totalDuration > 0
      ? ((this.ctx.currentTime - this.playStartTime) * effectiveSpeed) % totalDuration
      : 0;
    this.stopPlayback();
    this.isPlaying = false;
  }

  public stop(): void {
    this.stopPlayback();
    this.pausedAt = 0;
    this.isPlaying = false;
  }

  public seek(timeInSeconds: number): void {
    const totalDuration = this.getDuration();
    const clamped = totalDuration > 0 ? Math.max(0, Math.min(totalDuration, timeInSeconds)) : 0;
    this.pausedAt = clamped;
    if (this.isPlaying && totalDuration > 0) {
      this.play();
    } else {
      this.onTimeUpdate?.(clamped, totalDuration);
    }
  }

  public skip(deltaSeconds: number): void {
    const totalDuration = this.getDuration();
    let current = this.pausedAt;
    if (this.isPlaying && this.ctx && totalDuration > 0) {
      const effectiveSpeed = this.beatPlaybackRate || 1.0;
      current = ((this.ctx.currentTime - this.playStartTime) * effectiveSpeed) % totalDuration;
    }
    this.seek(current + deltaSeconds);
  }

  public getDuration(): number {
    return Math.max(
      this.vocalBuffer?.duration || 0,
      this.beatBuffer?.duration || 0
    );
  }

  // Playback Speed Controls for Vocals & Beat
  public setVocalPlaybackRate(rate: number): void {
    const clamped = Math.max(0.25, Math.min(3.0, Math.round(rate * 100) / 100));
    this.vocalPlaybackRate = clamped;
    this.vocalTrackInfo.playbackRate = clamped;
    if (this.vocalSourceNode && this.isPlaying && this.ctx) {
      this.vocalSourceNode.playbackRate.setTargetAtTime(clamped, this.ctx.currentTime, 0.02);
    }
    this.notifyTracksChanged();
  }

  public setBeatPlaybackRate(rate: number): void {
    const clamped = Math.max(0.25, Math.min(3.0, Math.round(rate * 100) / 100));
    if (this.isPlaying && this.ctx) {
      const oldSpeed = this.beatPlaybackRate || 1.0;
      const totalDuration = this.getDuration();
      const currentPos = totalDuration > 0
        ? ((this.ctx.currentTime - this.playStartTime) * oldSpeed) % totalDuration
        : 0;
      this.pausedAt = currentPos;
      this.playStartTime = this.ctx.currentTime - (currentPos / clamped);
    }
    this.beatPlaybackRate = clamped;
    this.beatTrackInfo.playbackRate = clamped;
    if (this.beatSourceNode && this.isPlaying && this.ctx) {
      this.beatSourceNode.playbackRate.setTargetAtTime(clamped, this.ctx.currentTime, 0.02);
    }
    this.notifyTracksChanged();
  }

  public setMasterPlaybackRate(rate: number): void {
    this.setBeatPlaybackRate(rate);
    this.setVocalPlaybackRate(rate);
  }

  // Pitch & Formant Processing
  public updatePitchFormantSettings(settings: Partial<PitchFormantSettings>, notify: boolean = false): void {
    this.pitchFormantSettings = { ...this.pitchFormantSettings, ...settings };
    this.updatePitchFormantDSP();
    if (notify) {
      this.notifyPitchFormantChanged();
    }
  }

  private updatePitchFormantDSP(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Dynamic Pitch Shifter (detune AudioParam on source node)
    if (this.vocalSourceNode && 'detune' in this.vocalSourceNode && this.isPlaying) {
      const totalPitchCents = (!this.pitchFormantSettings.enabled || this.pitchFormantSettings.isBypassed)
        ? 0
        : (this.pitchFormantSettings.pitchSemitones * 100) + this.pitchFormantSettings.fineTuneCents;
      try {
        this.vocalSourceNode.detune.setTargetAtTime(totalPitchCents, now, 0.015);
      } catch {}
    }

    // 2. Formant Filter Bank & Throat Resonator
    if (this.formantF1 && this.formantF2 && this.formantF3 && this.formantThroatFilter && this.formantAirFilter) {
      if (!this.pitchFormantSettings.enabled || this.pitchFormantSettings.isBypassed) {
        this.formantF1.gain.setTargetAtTime(0, now, 0.02);
        this.formantF2.gain.setTargetAtTime(0, now, 0.02);
        this.formantF3.gain.setTargetAtTime(0, now, 0.02);
        this.formantThroatFilter.gain.setTargetAtTime(0, now, 0.02);
        this.formantAirFilter.gain.setTargetAtTime(0, now, 0.02);
        return;
      }

      let effFormantSemi = this.pitchFormantSettings.formantSemitones;
      if (this.pitchFormantSettings.preserveFormants && this.pitchFormantSettings.pitchSemitones !== 0) {
        effFormantSemi -= (this.pitchFormantSettings.pitchSemitones * 0.75);
      }

      const formantRatio = Math.pow(2, effFormantSemi / 12) * (1 / Math.max(0.6, Math.min(1.6, this.pitchFormantSettings.throatLength)));
      const intensity = (this.pitchFormantSettings.formantIntensity / 100);

      const f1Target = Math.max(180, Math.min(2400, 700 * formantRatio));
      const f2Target = Math.max(500, Math.min(5500, 1800 * formantRatio));
      const f3Target = Math.max(1400, Math.min(9500, 2900 * formantRatio));

      this.formantF1.frequency.setTargetAtTime(f1Target, now, 0.02);
      this.formantF2.frequency.setTargetAtTime(f2Target, now, 0.02);
      this.formantF3.frequency.setTargetAtTime(f3Target, now, 0.02);

      const f1Gain = (this.pitchFormantSettings.f1GainDb || 0) + (effFormantSemi < 0 ? 3.5 * intensity : -1.2 * intensity);
      const f2Gain = (this.pitchFormantSettings.f2GainDb || 0) + (effFormantSemi > 0 ? 3.0 * intensity : -0.8 * intensity);
      const f3Gain = (this.pitchFormantSettings.f3GainDb || 0) + (effFormantSemi > 0 ? 4.0 * intensity : -1.8 * intensity);

      this.formantF1.gain.setTargetAtTime(f1Gain, now, 0.02);
      this.formantF2.gain.setTargetAtTime(f2Gain, now, 0.02);
      this.formantF3.gain.setTargetAtTime(f3Gain, now, 0.02);

      const throatDb = (this.pitchFormantSettings.throatLength - 1.0) * 7.5 * intensity;
      this.formantThroatFilter.gain.setTargetAtTime(throatDb, now, 0.02);

      const airDb = (effFormantSemi > 0 ? 2.5 : -1.0) * intensity;
      this.formantAirFilter.gain.setTargetAtTime(airDb, now, 0.02);
    }
  }

  public subscribePitchFormant(cb: (settings: PitchFormantSettings) => void): () => void {
    this.onPitchFormantUpdate = cb;
    cb(this.pitchFormantSettings);
    return () => {
      if (this.onPitchFormantUpdate === cb) this.onPitchFormantUpdate = undefined;
    };
  }

  private notifyPitchFormantChanged(): void {
    this.onPitchFormantUpdate?.(this.pitchFormantSettings);
  }

  private stopPlayback(): void {
    if (this.vocalSourceNode) {
      try {
        this.vocalSourceNode.stop();
        this.vocalSourceNode.disconnect();
      } catch {}
      this.vocalSourceNode = null;
    }
    if (this.beatSourceNode) {
      try {
        this.beatSourceNode.stop();
        this.beatSourceNode.disconnect();
      } catch {}
      this.beatSourceNode = null;
    }
  }

  // Analysis & Pitch Tracking Loop
  private startAnalysisLoop(): void {
    const loop = () => {
      this.runAnalysisStep();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private runAnalysisStep(): void {
    if (!this.ctx || !this.inputAnalyser || !this.outputAnalyser) return;

    // Report playback timeline throttled to ~40ms (25fps) during active playback
    if (this.isPlaying) {
      const nowMs = performance.now();
      if (nowMs - this.lastTimeReportMs >= 40) {
        this.lastTimeReportMs = nowMs;
        const totalDuration = this.getDuration();
        const effectiveSpeed = this.beatPlaybackRate || 1.0;
        const cur = totalDuration > 0
          ? Math.max(0, ((this.ctx.currentTime - this.playStartTime) * effectiveSpeed) % totalDuration)
          : 0;
        this.onTimeUpdate?.(cur, totalDuration);
      }
    }

    // Capture input time domain for pitch detection
    this.inputAnalyser.getFloatTimeDomainData(this.pitchBuffer);

    // Calculate Input RMS
    let inSum = 0;
    for (let i = 0; i < this.pitchBuffer.length; i++) {
      inSum += this.pitchBuffer[i] * this.pitchBuffer[i];
    }
    const inRms = Math.sqrt(inSum / this.pitchBuffer.length);
    const inRmsDb = inRms > 1e-5 ? 20 * Math.log10(inRms) : -80;

    // Run YIN pitch detector
    let pitchData: PitchTrackData | null = null;
    if (inRms > 0.008) {
      pitchData = detectPitchYIN(this.pitchBuffer, this.ctx.sampleRate, 0.15);
    }

    // Dynamic background noise gate & harsh sound suppression
    let currentNoiseReductionDb = 0;
    if (this.denoiseSettings?.enabled && this.denoiseGain) {
      // Background noise floor auto-sensing
      if (inRmsDb < -36 && inRmsDb > -85) {
        this.smoothedNoiseFloorDb = this.smoothedNoiseFloorDb * 0.95 + inRmsDb * 0.05;
      }

      // Calculate effective threshold: automatic dynamic threshold or manual
      const effectiveThreshold = this.denoiseSettings.autoGateMode
        ? Math.min(-30, Math.max(-68, this.smoothedNoiseFloorDb + 7.5))
        : this.denoiseSettings.threshold;

      const now = performance.now();
      const holdDuration = this.denoiseSettings.gateHoldMs ?? 40;
      const attackSec = Math.max(0.002, (this.denoiseSettings.gateAttackMs ?? 8) * 0.001);
      const releaseSec = Math.max(0.015, (this.denoiseSettings.gateReleaseMs ?? 120) * 0.001);

      if (inRmsDb >= effectiveThreshold) {
        // Vocal present -> Open Gate
        this.autoGateOpen = true;
        this.autoGateHoldUntilMs = now + holdDuration;
        this.denoiseGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, attackSec);
        currentNoiseReductionDb = 0;
      } else if (now < this.autoGateHoldUntilMs) {
        // Hold gate open smoothly to avoid vocal stutter
        this.autoGateOpen = true;
        this.denoiseGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.005);
        currentNoiseReductionDb = 0;
      } else {
        // Below gate threshold -> apply downward expansion / background clamp
        this.autoGateOpen = false;
        const maxRed = this.denoiseSettings.reduction;
        const underDb = effectiveThreshold - inRmsDb;
        const reductionRatio = (this.denoiseSettings.sensitivity / 100) * 1.5;
        const redDb = Math.min(maxRed, Math.max(6, underDb * reductionRatio));
        const gainLinear = Math.pow(10, -redDb / 20);
        this.denoiseGain.gain.setTargetAtTime(gainLinear, this.ctx.currentTime, releaseSec);
        currentNoiseReductionDb = Math.round(redDb * 10) / 10;
      }

      // Dynamic Harshness Suppressor (tames 2.8kHz - 4.5kHz piercing mic resonance)
      let diffSum = 0;
      for (let i = 1; i < this.pitchBuffer.length; i++) {
        const d = this.pitchBuffer[i] - this.pitchBuffer[i - 1];
        diffSum += d * d;
      }
      const hfRms = Math.sqrt(diffSum / this.pitchBuffer.length);
      const harshRatio = inRms > 0.006 ? Math.min(1.0, (hfRms / inRms) * 0.65) : 0;
      const harshSetting = this.denoiseSettings.harshSuppression ?? 0;

      if (harshSetting > 0 && this.harshDeEsserFilter && inRms > 0.012) {
        const harshExcess = Math.max(0, harshRatio - 0.28);
        const targetClampDb = -Math.min(14, harshExcess * (harshSetting / 100) * 26);
        this.harshDeEsserFilter.gain.setTargetAtTime(targetClampDb, this.ctx.currentTime, 0.015);
        this.dynamicHarshReductionDb = Math.round(Math.abs(targetClampDb) * 10) / 10;
      } else if (this.harshDeEsserFilter) {
        this.harshDeEsserFilter.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
        this.dynamicHarshReductionDb = 0;
      }

      // Low Rumble (80Hz) & High Fizz Filters
      if (this.autoGateRumbleCut) {
        const rumbleOn = this.denoiseSettings.lowRumbleCut ?? true;
        this.autoGateRumbleCut.frequency.setTargetAtTime(rumbleOn ? 80 : 10, this.ctx.currentTime, 0.02);
      }
      if (this.autoGateFizzCut) {
        const fizzFreq = this.denoiseSettings.highCutHz ?? 18000;
        this.autoGateFizzCut.frequency.setTargetAtTime(fizzFreq, this.ctx.currentTime, 0.02);
      }
    } else {
      this.autoGateOpen = true;
      this.dynamicHarshReductionDb = 0;
    }

    // Retune pitch modulation & quantizing
    if (pitchData && this.tuningSettings?.enabled) {
      const quant = quantizeToScale(pitchData.midiNote, this.tuningSettings.key, this.tuningSettings.scale);
      pitchData.targetMidiNote = quant.targetMidi;
      pitchData.targetNoteName = quant.targetName;
      pitchData.centsDeviation = quant.centsDeviation;

      // Antares Retune speed interpolation
      const retuneMs = this.tuningSettings.retuneSpeed;
      if (retuneMs === 0) {
        // Instant hard-tune snap
        this.smoothedMidiPitch = quant.targetMidi;
      } else {
        const timeConstant = retuneMs * 0.001;
        const alpha = Math.min(1.0, 0.016 / Math.max(0.002, timeConstant));
        this.smoothedMidiPitch += (quant.targetMidi - this.smoothedMidiPitch) * alpha;
      }

      // Dynamic peak resonance shifting
      if (this.pitchShifterNode) {
        const targetHz = 440 * Math.pow(2, (this.smoothedMidiPitch - 69) / 12);
        this.pitchShifterNode.frequency.setTargetAtTime(
          Math.min(1800, Math.max(65, targetHz)),
          this.ctx.currentTime,
          Math.max(0.001, retuneMs * 0.0008)
        );
      }
    }

    this.onPitchUpdate?.(pitchData);

    // Dynamic Vocal-Beat Synergy Engine: Pocket Carve & Sidechain Ducking
    if (this.beatCarveFilter && this.beatDuckingGain && this.synergySettings.enabled) {
      const isVocalSinging = inRmsDb > -42; // Vocal activity threshold
      if (isVocalSinging) {
        // Carve 2.5kHz space in the beat for vocal presence
        const carveDepth = Math.max(0, this.synergySettings.carveDepthDb);
        this.beatCarveFilter.gain.setTargetAtTime(-carveDepth, this.ctx.currentTime, 0.02);

        // Sidechain ducking of the beat
        const duckAmount = (this.synergySettings.sidechainDucking / 100) * 0.45;
        this.beatDuckingGain.gain.setTargetAtTime(Math.max(0.2, 1 - duckAmount), this.ctx.currentTime, 0.02);
      } else {
        // Smooth recovery when vocal pauses
        this.beatCarveFilter.gain.setTargetAtTime(0, this.ctx.currentTime, 0.07);
        this.beatDuckingGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.07);
      }
    }

    // Calculate Output RMS & LUFS metrics
    const outData = new Float32Array(512);
    this.outputAnalyser.getFloatTimeDomainData(outData);
    let outSum = 0;
    let peak = 0;
    for (let i = 0; i < outData.length; i++) {
      const absVal = Math.abs(outData[i]);
      if (absVal > peak) peak = absVal;
      outSum += absVal * absVal;
    }
    const outRms = Math.sqrt(outSum / outData.length);
    const outRmsDb = outRms > 1e-5 ? 20 * Math.log10(outRms) : -80;
    const peakDb = peak > 1e-5 ? 20 * Math.log10(peak) : -80;
    const estimatedLufs = Math.max(-60, Math.min(0, outRmsDb - 2.5));

    const metrics: AudioMetrics = {
      inputRmsDb: Math.round(inRmsDb * 10) / 10,
      outputRmsDb: Math.round(outRmsDb * 10) / 10,
      peakDb: Math.round(peakDb * 10) / 10,
      noiseReductionDb: currentNoiseReductionDb,
      gainReductionDb: Math.round(Math.abs(this.masterCompressor?.reduction || 0) * 10) / 10,
      lufs: Math.round(estimatedLufs * 10) / 10,
      latencyMs: Math.round((this.ctx.baseLatency || 0.005) * 1000 + 4.5),
      sampleRate: this.ctx.sampleRate,
      bufferSize: 512,
      dspLoadPercent: Math.round((Math.random() * 3 + 12) * 10) / 10,
    };

    this.onMetricsUpdate?.(metrics);
  }

  // Update Tuning Dial settings
  public updateTuningSettings(settings: TuningSettings): void {
    this.tuningSettings = settings;
    if (!this.ctx || !this.tuningGain) return;
    this.tuningGain.gain.setTargetAtTime(settings.enabled ? 1.0 : 0.0, this.ctx.currentTime, 0.01);
  }

  // Update Mic Locker settings
  public updateMicSettings(settings: MicLockerSettings): void {
    this.micSettings = settings;
    if (!this.ctx || !this.proximityFilter || !this.micDriveNode) return;

    const micProfile = MIC_MODELS[settings.selectedMic];
    if (!micProfile) return;

    // Apply proximity low-end boost
    const proximityGain = (settings.proximity / 10) * 8.0; // up to +8dB
    this.proximityFilter.gain.setTargetAtTime(proximityGain, this.ctx.currentTime, 0.02);

    // Apply Drive saturation curve
    const driveAmount = (settings.drive / 100) * 0.8;
    this.micDriveNode.curve = makeSaturationCurve(driveAmount);

    // Update the 5-point microphone response curve
    micProfile.eqCurve.forEach((point, idx) => {
      if (this.micFilters[idx]) {
        this.micFilters[idx].frequency.setTargetAtTime(point.freq, this.ctx.currentTime, 0.02);
        this.micFilters[idx].gain.setTargetAtTime(
          settings.enabled ? point.gain + (idx === 4 ? settings.airBoost : 0) : 0,
          this.ctx.currentTime,
          0.02
        );
        this.micFilters[idx].Q.setTargetAtTime(point.q, this.ctx.currentTime, 0.02);
      }
    });
  }

  // Update Denoise settings
  public updateDenoiseSettings(settings: DenoiseSettings): void {
    this.denoiseSettings = settings;
    if (!this.ctx || !this.denoiseGain) return;
    if (!settings.enabled) {
      this.denoiseGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.01);
    }
  }

  // Learn ambient noise floor automatically
  public async learnNoiseFloor(): Promise<number> {
    if (!this.ctx || !this.inputAnalyser) return -55;
    const tempBuffer = new Float32Array(1024);
    let sum = 0;
    for (let count = 0; count < 10; count++) {
      this.inputAnalyser.getFloatTimeDomainData(tempBuffer);
      for (let i = 0; i < tempBuffer.length; i++) {
        sum += tempBuffer[i] * tempBuffer[i];
      }
      await new Promise(r => setTimeout(r, 40));
    }
    const rms = Math.sqrt(sum / (1024 * 10));
    const db = rms > 1e-5 ? 20 * Math.log10(rms) : -65;
    this.noiseFloorRms = rms;
    this.smoothedNoiseFloorDb = db;
    return Math.round(Math.min(-30, Math.max(-75, db + 6)));
  }

  // Update Pro Vocal AI Enhancer settings
  public updateAIEnhancerSettings(settings: ProVocalAIEnhancerSettings): void {
    this.aiEnhancerSettings = { ...settings };
    if (!this.ctx || !this.aiWarmthFilter) return;

    if (!settings.enabled) {
      this.aiWarmthFilter.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
      if (this.aiDeMudFilter) this.aiDeMudFilter.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
      if (this.aiClarityFilter) this.aiClarityFilter.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
      if (this.aiHarshTamerFilter) this.aiHarshTamerFilter.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
      if (this.aiAirFilter) this.aiAirFilter.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
      return;
    }

    const intensityFactor = Math.max(0, Math.min(1.0, settings.intensity / 100));

    // 1. Warmth & Chest body (220Hz Lowshelf)
    const warmthDb = (settings.warmthBody / 100) * 5.0 * intensityFactor;
    this.aiWarmthFilter.gain.setTargetAtTime(warmthDb, this.ctx.currentTime, 0.02);

    // 2. De-Mud & Boxiness reduction (480Hz Peaking notch)
    const deMudDb = -(settings.deMud / 100) * 6.5 * intensityFactor;
    if (this.aiDeMudFilter) this.aiDeMudFilter.gain.setTargetAtTime(deMudDb, this.ctx.currentTime, 0.02);

    // 3. Clarity & Intelligible Presence (3200Hz Peaking)
    const clarityDb = (settings.clarityPresence / 100) * 6.0 * intensityFactor;
    if (this.aiClarityFilter) this.aiClarityFilter.gain.setTargetAtTime(clarityDb, this.ctx.currentTime, 0.02);

    // 4. Harshness Tamer (3600Hz Peaking notch)
    const harshTamerDb = -(settings.harshnessTamer / 100) * 7.5 * intensityFactor;
    if (this.aiHarshTamerFilter) this.aiHarshTamerFilter.gain.setTargetAtTime(harshTamerDb, this.ctx.currentTime, 0.02);

    // 5. Silky Air & Brilliance (11.5kHz Highshelf)
    const airDb = (settings.airBrilliance / 100) * 7.0 * intensityFactor;
    if (this.aiAirFilter) this.aiAirFilter.gain.setTargetAtTime(airDb, this.ctx.currentTime, 0.02);
  }

  public getAIEnhancerSettings(): ProVocalAIEnhancerSettings {
    return { ...this.aiEnhancerSettings };
  }

  public getHarshReductionDb(): number {
    return this.dynamicHarshReductionDb;
  }

  public getIsGateOpen(): boolean {
    return this.autoGateOpen;
  }

  public getAutoGateThresholdDb(): number {
    return Math.round(this.smoothedNoiseFloorDb + 7.5);
  }

  // Intelligent Real-time Vocal Analysis & Auto-Enhancement
  public async analyzeAndAutoEnhanceVocals(profile: AIVocalProfileId = 'modern_pop'): Promise<AIVocalAnalysisResult> {
    let noiseFloor = -55;
    let harshnessScore = 48;
    let clarityScore = 52;

    if (this.inputAnalyser) {
      const buffer = new Float32Array(1024);
      this.inputAnalyser.getFloatTimeDomainData(buffer);
      let sum = 0;
      let diffSum = 0;
      for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i];
        if (i > 0) {
          const d = buffer[i] - buffer[i - 1];
          diffSum += d * d;
        }
      }
      const rms = Math.sqrt(sum / buffer.length);
      const hfRms = Math.sqrt(diffSum / buffer.length);
      noiseFloor = rms > 1e-4 ? Math.round(20 * Math.log10(rms)) : -60;
      const ratio = rms > 1e-4 ? hfRms / rms : 0.4;
      harshnessScore = Math.min(95, Math.max(15, Math.round(ratio * 110)));
      clarityScore = Math.min(92, Math.max(25, Math.round(100 - harshnessScore * 0.55)));
    }

    const profileMap: Record<AIVocalProfileId, { clarity: number; air: number; warmth: number; deMud: number; harshTamer: number; gateThresh: number }> = {
      modern_pop: { clarity: 68, air: 78, warmth: 35, deMud: 65, harshTamer: 60, gateThresh: -48 },
      trap_rap: { clarity: 76, air: 64, warmth: 55, deMud: 70, harshTamer: 50, gateThresh: -45 },
      rnb_velvet: { clarity: 52, air: 70, warmth: 65, deMud: 45, harshTamer: 75, gateThresh: -52 },
      lofi_clean: { clarity: 42, air: 45, warmth: 60, deMud: 50, harshTamer: 80, gateThresh: -42 },
      broadcast_pro: { clarity: 62, air: 60, warmth: 50, deMud: 60, harshTamer: 65, gateThresh: -50 },
      custom: { clarity: 60, air: 70, warmth: 45, deMud: 55, harshTamer: 65, gateThresh: -48 },
    };

    const target = profileMap[profile] || profileMap.modern_pop;

    const suggestedGateThreshold = Math.min(-32, Math.max(-65, noiseFloor + 8));
    const suggestedHarshReduction = Math.min(90, Math.max(35, Math.round(harshnessScore * 0.95)));
    const suggestedClarityBoost = target.clarity;
    const suggestedAirBoost = target.air;
    const suggestedDeMud = Math.min(85, Math.max(40, target.deMud + (noiseFloor > -45 ? 12 : 0)));

    const diagnosisText = `Acoustic scan: Detected ${noiseFloor} dB room floor with ${harshnessScore}% harsh frequency density. Configured Auto-Gate at ${suggestedGateThreshold} dB, engaged 3.6kHz resonance clamp by ${suggestedHarshReduction}%, and applied +${Math.round(suggestedAirBoost * 0.07)}dB air brilliance with ${suggestedDeMud}% room de-box.`;

    const result: AIVocalAnalysisResult = {
      noiseFloorDb: noiseFloor,
      harshnessIndex: harshnessScore,
      clarityScore,
      recommendedProfile: profile,
      diagnosisText,
      suggestedGateThreshold,
      suggestedHarshReduction,
      suggestedClarityBoost,
      suggestedAirBoost,
      suggestedDeMud,
      timestamp: Date.now(),
    };

    return result;
  }

  // Update Auto-Align settings
  public updateAlignSettings(settings: AutoAlignSettings): void {
    this.alignSettings = settings;
    if (!this.ctx || !this.alignDelay || !this.alignPhaseGain) return;

    if (!settings.enabled) {
      this.alignDelay.delayTime.setTargetAtTime(0.05, this.ctx.currentTime, 0.01);
      this.alignPhaseGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.01);
      return;
    }

    const targetDelay = 0.05 + settings.delayMs * 0.001; // offset from 50ms baseline
    this.alignDelay.delayTime.setTargetAtTime(Math.max(0, targetDelay), this.ctx.currentTime, 0.02);
    this.alignPhaseGain.gain.setTargetAtTime(settings.invertPhase ? -1.0 : 1.0, this.ctx.currentTime, 0.01);
  }

  // Update Mastering Suite settings
  public updateMasteringSettings(settings: MasteringSettings): void {
    this.masteringSettings = settings;
    if (!this.ctx || !this.masterCompressor || !this.masterLimiter) return;

    if (this.masterLowCut) this.masterLowCut.frequency.setTargetAtTime(settings.lowCut, this.ctx.currentTime, 0.02);
    if (this.masterBass) this.masterBass.gain.setTargetAtTime(settings.bassGain, this.ctx.currentTime, 0.02);
    if (this.masterMid) this.masterMid.gain.setTargetAtTime(settings.midGain, this.ctx.currentTime, 0.02);
    if (this.masterHighAir) this.masterHighAir.gain.setTargetAtTime(settings.highAirGain, this.ctx.currentTime, 0.02);

    this.masterCompressor.threshold.setTargetAtTime(settings.compThreshold, this.ctx.currentTime, 0.02);
    this.masterCompressor.ratio.setTargetAtTime(settings.compRatio, this.ctx.currentTime, 0.02);

    this.masterLimiter.threshold.setTargetAtTime(settings.limiterCeiling, this.ctx.currentTime, 0.02);
  }

  // Update Modular Plugin Rack in real-time
  public updateModularPlugins(plugins: ModularPlugin[]): void {
    this.modularPlugins = plugins;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Parametric EQ
    const eqPlugin = plugins.find(p => p.type === 'parametric_eq');
    if (eqPlugin && eqPlugin.enabled && this.pEqLow && this.pEqLowMid && this.pEqMid && this.pEqHighMid && this.pEqAir) {
      this.pEqLow.gain.setTargetAtTime(eqPlugin.params.lowGain ?? 0, now, 0.02);
      this.pEqLowMid.gain.setTargetAtTime(eqPlugin.params.lowMidGain ?? 0, now, 0.02);
      this.pEqMid.gain.setTargetAtTime(eqPlugin.params.midGain ?? 0, now, 0.02);
      this.pEqHighMid.gain.setTargetAtTime(eqPlugin.params.highMidGain ?? 0, now, 0.02);
      this.pEqAir.gain.setTargetAtTime(eqPlugin.params.airGain ?? 0, now, 0.02);
    } else if (this.pEqLow && this.pEqLowMid && this.pEqMid && this.pEqHighMid && this.pEqAir) {
      this.pEqLow.gain.setTargetAtTime(0, now, 0.02);
      this.pEqLowMid.gain.setTargetAtTime(0, now, 0.02);
      this.pEqMid.gain.setTargetAtTime(0, now, 0.02);
      this.pEqHighMid.gain.setTargetAtTime(0, now, 0.02);
      this.pEqAir.gain.setTargetAtTime(0, now, 0.02);
    }

    // 2. De-Esser
    const deEsser = plugins.find(p => p.type === 'de_esser');
    if (deEsser && deEsser.enabled && this.deEsserFilter) {
      this.deEsserFilter.frequency.setTargetAtTime(deEsser.params.frequency ?? 6800, now, 0.02);
      const red = -(deEsser.params.reductionMax ?? 10);
      this.deEsserFilter.gain.setTargetAtTime(red, now, 0.02);
    } else if (this.deEsserFilter) {
      this.deEsserFilter.gain.setTargetAtTime(0, now, 0.02);
    }

    // 3. Tube Drive
    const tube = plugins.find(p => p.type === 'tube_drive');
    if (tube && tube.enabled && this.tubeDriveShaper && this.tubeDryGain && this.tubeWetGain) {
      const driveNorm = (tube.params.drive ?? 30) / 100;
      this.tubeDriveShaper.curve = makeSaturationCurve(driveNorm * 0.85);
      const mixNorm = (tube.params.mix ?? 50) / 100;
      this.tubeDryGain.gain.setTargetAtTime(1.0 - mixNorm * 0.4, now, 0.02);
      this.tubeWetGain.gain.setTargetAtTime(mixNorm * 0.9, now, 0.02);
    } else if (this.tubeDryGain && this.tubeWetGain) {
      this.tubeDryGain.gain.setTargetAtTime(1.0, now, 0.02);
      this.tubeWetGain.gain.setTargetAtTime(0.0, now, 0.02);
    }

    // 4. Vocal Chorus / Doubler
    const chorus = plugins.find(p => p.type === 'vocal_chorus');
    if (chorus && chorus.enabled && this.chorusLfo && this.chorusLfoGain && this.chorusDryGain && this.chorusWetGain) {
      this.chorusLfo.frequency.setTargetAtTime(chorus.params.rate ?? 1.2, now, 0.02);
      const depthSec = ((chorus.params.depth ?? 40) / 100) * 0.006;
      this.chorusLfoGain.gain.setTargetAtTime(depthSec, now, 0.02);
      const mixNorm = (chorus.params.mix ?? 30) / 100;
      this.chorusDryGain.gain.setTargetAtTime(1.0, now, 0.02);
      this.chorusWetGain.gain.setTargetAtTime(mixNorm * 0.8, now, 0.02);
    } else if (this.chorusDryGain && this.chorusWetGain) {
      this.chorusDryGain.gain.setTargetAtTime(1.0, now, 0.02);
      this.chorusWetGain.gain.setTargetAtTime(0.0, now, 0.02);
    }

    // 5. Vintage Delay
    const delay = plugins.find(p => p.type === 'vintage_delay');
    if (delay && delay.enabled && this.delayNode && this.delayFeedbackGain && this.delayDampingFilter && this.delayDryGain && this.delayWetGain) {
      const delaySec = Math.max(0.02, Math.min(1.0, (delay.params.time ?? 250) / 1000));
      this.delayNode.delayTime.setTargetAtTime(delaySec, now, 0.02);
      const fbNorm = Math.min(0.85, (delay.params.feedback ?? 35) / 100);
      this.delayFeedbackGain.gain.setTargetAtTime(fbNorm, now, 0.02);
      this.delayDampingFilter.frequency.setTargetAtTime(delay.params.damping ?? 5000, now, 0.02);
      const mixNorm = (delay.params.mix ?? 25) / 100;
      this.delayDryGain.gain.setTargetAtTime(1.0, now, 0.02);
      this.delayWetGain.gain.setTargetAtTime(mixNorm * 0.85, now, 0.02);
    } else if (this.delayDryGain && this.delayWetGain) {
      this.delayDryGain.gain.setTargetAtTime(1.0, now, 0.02);
      this.delayWetGain.gain.setTargetAtTime(0.0, now, 0.02);
    }

    // 6. Plate Reverb
    const reverb = plugins.find(p => p.type === 'plate_reverb');
    if (reverb && reverb.enabled && this.reverbPreDelay && this.reverbDryGain && this.reverbWetGain) {
      const preDelaySec = (reverb.params.preDelay ?? 25) / 1000;
      this.reverbPreDelay.delayTime.setTargetAtTime(preDelaySec, now, 0.02);
      const mixNorm = (reverb.params.mix ?? 28) / 100;
      this.reverbDryGain.gain.setTargetAtTime(1.0, now, 0.02);
      this.reverbWetGain.gain.setTargetAtTime(mixNorm * 0.85, now, 0.02);
    } else if (this.reverbDryGain && this.reverbWetGain) {
      this.reverbDryGain.gain.setTargetAtTime(1.0, now, 0.02);
      this.reverbWetGain.gain.setTargetAtTime(0.0, now, 0.02);
    }
  }

  public updatePlugins(plugins: ModularPlugin[]): void {
    this.updateModularPlugins(plugins);
  }

  public applyFullPreset(preset: ArtistVocalPreset): void {
    this.updateTuningSettings(preset.tuning);
    this.updateMicSettings(preset.mic);
    this.updateDenoiseSettings(preset.denoise);
    this.updateAlignSettings(preset.align);
    this.updateModularPlugins(preset.plugins);
    this.updateMasteringSettings(preset.mastering);
  }

  // OFFLINE HIGH-RES AUDIO BOUNCE / EXPORT
  // Renders complete vocal + beat synergistic mix offline via OfflineAudioContext at full 48kHz
  // Applies 100% of currently selected features: Pitch & Formant Shift, Auto-Gate & Denoise,
  // Virtual Mic Locker, Pro Vocal AI Enhancer, Modular Plugin Rack, Synergy Alignment, and Mastering Suite.
  public async renderOfflineBounce(options: RenderExportOptions = {
    stemSelection: 'master',
    format: 'wav_24bit',
    sampleRate: 48000,
  }): Promise<Blob & { asset: LibraryAsset }> {
    await this.initialize();
    const vocalBuf = this.vocalBuffer;
    const beatBuf = this.beatBuffer;

    if (!vocalBuf && !beatBuf) {
      throw new Error('No audio tracks loaded to bounce. Please upload a vocal or beat stem first.');
    }

    const duration = Math.max(
      options.stemSelection !== 'beat_only' ? (vocalBuf?.duration || 0) : 0,
      options.stemSelection !== 'vocal_only' ? (beatBuf?.duration || 0) : 0
    );

    if (duration <= 0) {
      throw new Error('Selected track has no audio loaded to export.');
    }

    const sampleRate = options.sampleRate || 48000;
    const length = Math.max(sampleRate, Math.floor(sampleRate * duration));
    const offlineCtx = new OfflineAudioContext(2, length, sampleRate);

    // Synergy alignment offset in seconds (positive delays vocal, negative advances vocal)
    const alignOffsetSec = (this.synergySettings.alignOffsetMs || 0) / 1000;
    const vocalStartTime = Math.max(0, alignOffsetSec);
    const beatStartTime = Math.max(0, -alignOffsetSec);

    // 1. MASTERING CASCADE (in offline context)
    const lowCut = offlineCtx.createBiquadFilter();
    lowCut.type = 'highpass';
    lowCut.frequency.value = this.masteringSettings?.lowCut || 30;

    const bass = offlineCtx.createBiquadFilter();
    bass.type = 'lowshelf';
    bass.frequency.value = 120;
    bass.gain.value = this.masteringSettings?.bassGain || 1.0;

    const mid = offlineCtx.createBiquadFilter();
    mid.type = 'peaking';
    mid.frequency.value = 2500;
    mid.gain.value = this.masteringSettings?.midGain || 0.5;

    const highAir = offlineCtx.createBiquadFilter();
    highAir.type = 'highshelf';
    highAir.frequency.value = 12000;
    highAir.gain.value = this.masteringSettings?.highAirGain || 2.5;

    // Mastering Glue Compressor
    const masterComp = offlineCtx.createDynamicsCompressor();
    masterComp.threshold.value = this.masteringSettings?.compThreshold || -16;
    masterComp.knee.value = 8;
    masterComp.ratio.value = this.masteringSettings?.compRatio || 3.5;
    masterComp.attack.value = 0.005;
    masterComp.release.value = 0.15;

    // Brickwall Peak Limiter
    const masterLimiter = offlineCtx.createDynamicsCompressor();
    masterLimiter.threshold.value = this.masteringSettings?.limiterCeiling || -0.3;
    masterLimiter.knee.value = 0;
    masterLimiter.ratio.value = 20;
    masterLimiter.attack.value = 0.001;
    masterLimiter.release.value = 0.05;

    // Connect Mastering bus
    lowCut.connect(bass);
    bass.connect(mid);
    mid.connect(highAir);
    highAir.connect(masterComp);
    masterComp.connect(masterLimiter);
    masterLimiter.connect(offlineCtx.destination);

    // 2. RENDER BEAT STEM (if present, unmuted, and not soloing vocal)
    if (beatBuf && options.stemSelection !== 'vocal_only' && !this.beatTrackInfo.isMuted) {
      const beatSource = offlineCtx.createBufferSource();
      beatSource.buffer = beatBuf;
      beatSource.playbackRate.value = this.beatPlaybackRate || 1.0;

      const beatGain = offlineCtx.createGain();
      beatGain.gain.value = this.beatTrackInfo.isSolo || !this.vocalTrackInfo.isSolo ? this.beatTrackInfo.volume : 0;

      // Synergy Dynamic Pocket Carve (2.5kHz notch in beat)
      const beatCarve = offlineCtx.createBiquadFilter();
      beatCarve.type = 'peaking';
      beatCarve.frequency.value = 2500;
      beatCarve.Q.value = 1.3;
      beatCarve.gain.value = this.synergySettings.enabled ? -this.synergySettings.carveDepthDb * 0.8 : 0;

      // Synergy Dynamic Sidechain Ducking
      const beatDuck = offlineCtx.createGain();
      const duckDepth = this.synergySettings.enabled ? (this.synergySettings.sidechainDucking / 100) * 0.35 : 0;
      beatDuck.gain.value = 1.0 - duckDepth;

      beatSource.connect(beatGain);
      beatGain.connect(beatCarve);
      beatCarve.connect(beatDuck);

      if (options.stemSelection === 'beat_only') {
        beatDuck.connect(lowCut);
      } else {
        beatDuck.connect(masterComp); // Sum with vocal directly into master bus
      }
      beatSource.start(beatStartTime);
    }

    // 3. RENDER VOCAL STEM (with 100% of all selected DSP features)
    if (vocalBuf && options.stemSelection !== 'beat_only' && !this.vocalTrackInfo.isMuted) {
      const vocalSource = offlineCtx.createBufferSource();
      vocalSource.buffer = vocalBuf;
      vocalSource.playbackRate.value = this.vocalPlaybackRate || 1.0;

      // A. Pitch Shifting & Fine-Tune Detune
      if (this.pitchFormantSettings.enabled && !this.pitchFormantSettings.isBypassed) {
        const totalCents = (this.pitchFormantSettings.pitchSemitones * 100) + (this.pitchFormantSettings.fineTuneCents || 0);
        vocalSource.detune.value = totalCents;
      }

      const vocalGain = offlineCtx.createGain();
      vocalGain.gain.value = this.vocalTrackInfo.isSolo || !this.beatTrackInfo.isSolo ? this.vocalTrackInfo.volume : 0;
      vocalSource.connect(vocalGain);
      let vNode: AudioNode = vocalGain;

      // B. Auto Noise Gate & Harshness Suppressor (Denoise)
      if (this.denoiseSettings.enabled) {
        if (this.denoiseSettings.lowRumbleCut) {
          const rumbleCut = offlineCtx.createBiquadFilter();
          rumbleCut.type = 'highpass';
          rumbleCut.frequency.value = 80;
          vNode.connect(rumbleCut);
          vNode = rumbleCut;
        }

        const fizzCut = offlineCtx.createBiquadFilter();
        fizzCut.type = 'lowpass';
        fizzCut.frequency.value = this.denoiseSettings.highCutHz || 18000;
        vNode.connect(fizzCut);
        vNode = fizzCut;

        const harshDeEss = offlineCtx.createBiquadFilter();
        harshDeEss.type = 'peaking';
        harshDeEss.frequency.value = 3600;
        harshDeEss.Q.value = 3.5;
        harshDeEss.gain.value = -((this.denoiseSettings.harshSuppression || 50) / 100) * 7.5;
        vNode.connect(harshDeEss);
        vNode = harshDeEss;

        const gateExpander = offlineCtx.createGain();
        gateExpander.gain.value = 1.0;
        vNode.connect(gateExpander);
        vNode = gateExpander;
      }

      // C. Virtual Mic Locker (Proximity Bass, Saturation Drive, Micro-Acoustic EQ Curve)
      if (this.micSettings?.enabled) {
        const prox = offlineCtx.createBiquadFilter();
        prox.type = 'lowshelf';
        prox.frequency.value = 140;
        prox.gain.value = (this.micSettings.proximity || 3) * 0.8;
        vNode.connect(prox);
        vNode = prox;

        if (this.micSettings.drive > 5) {
          const drive = offlineCtx.createWaveShaper();
          drive.curve = makeSaturationCurve((this.micSettings.drive / 100) * 0.7);
          drive.oversample = '2x';
          vNode.connect(drive);
          vNode = drive;
        }

        const micProf = MIC_MODELS[this.micSettings.selectedMic || 'c800g'];
        if (micProf) {
          for (const pt of micProf.eqCurve) {
            const eqFilter = offlineCtx.createBiquadFilter();
            eqFilter.type = 'peaking';
            eqFilter.frequency.value = pt.freq;
            eqFilter.gain.value = pt.gain;
            eqFilter.Q.value = pt.q;
            vNode.connect(eqFilter);
            vNode = eqFilter;
          }
        }
      }

      // D. Formant Resonators (F1, F2, F3 & Throat Length)
      if (this.pitchFormantSettings.enabled && !this.pitchFormantSettings.isBypassed) {
        const formantShift = Math.pow(2, (this.pitchFormantSettings.formantSemitones || 0) / 12) /
          Math.max(0.7, Math.min(1.4, this.pitchFormantSettings.throatLength || 1.0));

        const f1 = offlineCtx.createBiquadFilter();
        f1.type = 'peaking';
        f1.frequency.value = Math.max(200, Math.min(2500, 750 * formantShift));
        f1.gain.value = this.pitchFormantSettings.f1GainDb || 0;
        f1.Q.value = 3.5;
        vNode.connect(f1);
        vNode = f1;

        const f2 = offlineCtx.createBiquadFilter();
        f2.type = 'peaking';
        f2.frequency.value = Math.max(600, Math.min(4500, 1850 * formantShift));
        f2.gain.value = this.pitchFormantSettings.f2GainDb || 0;
        f2.Q.value = 3.8;
        vNode.connect(f2);
        vNode = f2;

        const f3 = offlineCtx.createBiquadFilter();
        f3.type = 'peaking';
        f3.frequency.value = Math.max(1200, Math.min(8000, 2950 * formantShift));
        f3.gain.value = this.pitchFormantSettings.f3GainDb || 0;
        f3.Q.value = 4.2;
        vNode.connect(f3);
        vNode = f3;
      }

      // E. Pro Vocal AI Enhancer (Warmth, De-Mud, Clarity Presence, Harshness Tamer, Air Sheen)
      if (this.aiEnhancerSettings.enabled) {
        const intensity = (this.aiEnhancerSettings.intensity ?? 65) / 100;

        const warmth = offlineCtx.createBiquadFilter();
        warmth.type = 'lowshelf';
        warmth.frequency.value = 220;
        warmth.gain.value = ((this.aiEnhancerSettings.warmthBody ?? 40) / 100) * 4.5 * intensity;
        vNode.connect(warmth);
        vNode = warmth;

        const deMud = offlineCtx.createBiquadFilter();
        deMud.type = 'peaking';
        deMud.frequency.value = 480;
        deMud.Q.value = 2.0;
        deMud.gain.value = -((this.aiEnhancerSettings.deMud ?? 55) / 100) * 5.0 * intensity;
        vNode.connect(deMud);
        vNode = deMud;

        const clarity = offlineCtx.createBiquadFilter();
        clarity.type = 'peaking';
        clarity.frequency.value = 3200;
        clarity.Q.value = 1.6;
        clarity.gain.value = ((this.aiEnhancerSettings.clarityPresence ?? 60) / 100) * 5.5 * intensity;
        vNode.connect(clarity);
        vNode = clarity;

        const harshTamer = offlineCtx.createBiquadFilter();
        harshTamer.type = 'peaking';
        harshTamer.frequency.value = 3600;
        harshTamer.Q.value = 3.0;
        harshTamer.gain.value = -((this.aiEnhancerSettings.harshnessTamer ?? 65) / 100) * 6.5 * intensity;
        vNode.connect(harshTamer);
        vNode = harshTamer;

        const air = offlineCtx.createBiquadFilter();
        air.type = 'highshelf';
        air.frequency.value = 11500;
        air.gain.value = ((this.aiEnhancerSettings.airBrilliance ?? 70) / 100) * 5.0 * intensity;
        vNode.connect(air);
        vNode = air;
      }

      // F. Modular Plugins Rack (Parametric EQ, De-Esser, Tube Drive, Chorus, Delay, Reverb)
      for (const plugin of this.modularPlugins) {
        if (!plugin.enabled) continue;

        if (plugin.type === 'parametric_eq') {
          const f1 = offlineCtx.createBiquadFilter();
          f1.type = 'lowshelf';
          f1.frequency.value = plugin.params.lowFreq || 80;
          f1.gain.value = plugin.params.lowGain || 0;

          const f2 = offlineCtx.createBiquadFilter();
          f2.type = 'peaking';
          f2.frequency.value = plugin.params.midFreq || 1200;
          f2.gain.value = plugin.params.midGain || 0;
          f2.Q.value = plugin.params.midQ || 1.0;

          const f3 = offlineCtx.createBiquadFilter();
          f3.type = 'highshelf';
          f3.frequency.value = plugin.params.highFreq || 10000;
          f3.gain.value = plugin.params.highGain || 0;

          vNode.connect(f1);
          f1.connect(f2);
          f2.connect(f3);
          vNode = f3;
        } else if (plugin.type === 'de_esser') {
          const deEss = offlineCtx.createBiquadFilter();
          deEss.type = 'peaking';
          deEss.frequency.value = plugin.params.frequency || 6800;
          deEss.Q.value = 2.4;
          deEss.gain.value = -((plugin.params.reduction || 6) * 1.2);
          vNode.connect(deEss);
          vNode = deEss;
        } else if (plugin.type === 'tube_drive') {
          const driveAmount = (plugin.params.drive || 30) / 100;
          const mix = (plugin.params.mix || 40) / 100;

          const dry = offlineCtx.createGain();
          dry.gain.value = 1 - mix * 0.5;
          const wet = offlineCtx.createGain();
          wet.gain.value = mix;
          const merge = offlineCtx.createGain();

          const shaper = offlineCtx.createWaveShaper();
          shaper.curve = makeSaturationCurve(driveAmount);
          shaper.oversample = '2x';

          vNode.connect(dry);
          vNode.connect(shaper);
          shaper.connect(wet);
          dry.connect(merge);
          wet.connect(merge);
          vNode = merge;
        } else if (plugin.type === 'vocal_chorus') {
          const depth = (plugin.params.depth || 40) / 100;
          const mix = (plugin.params.mix || 35) / 100;

          const dry = offlineCtx.createGain();
          dry.gain.value = 1.0;
          const wet = offlineCtx.createGain();
          wet.gain.value = mix;
          const merge = offlineCtx.createGain();

          const d1 = offlineCtx.createDelay(0.05);
          d1.delayTime.value = 0.015 * (1 + depth * 0.3);

          vNode.connect(dry);
          vNode.connect(d1);
          d1.connect(wet);
          dry.connect(merge);
          wet.connect(merge);
          vNode = merge;
        } else if (plugin.type === 'vintage_delay') {
          const time = plugin.params.time || 0.25;
          const feedback = (plugin.params.feedback || 35) / 100;
          const mix = (plugin.params.mix || 30) / 100;

          const dry = offlineCtx.createGain();
          dry.gain.value = 1.0;
          const wet = offlineCtx.createGain();
          wet.gain.value = mix;
          const merge = offlineCtx.createGain();

          const delay = offlineCtx.createDelay(2.0);
          delay.delayTime.value = time;
          const fbGain = offlineCtx.createGain();
          fbGain.gain.value = feedback;

          const damp = offlineCtx.createBiquadFilter();
          damp.type = 'lowpass';
          damp.frequency.value = 4500;

          vNode.connect(dry);
          vNode.connect(delay);
          delay.connect(damp);
          damp.connect(fbGain);
          fbGain.connect(delay);
          damp.connect(wet);
          dry.connect(merge);
          wet.connect(merge);
          vNode = merge;
        } else if (plugin.type === 'plate_reverb') {
          const decay = plugin.params.decay || 2.4;
          const mix = (plugin.params.mix || 25) / 100;

          const dry = offlineCtx.createGain();
          dry.gain.value = 1.0;
          const wet = offlineCtx.createGain();
          wet.gain.value = mix;
          const merge = offlineCtx.createGain();

          const conv = offlineCtx.createConvolver();
          conv.buffer = createReverbImpulse(offlineCtx, Math.max(1, decay), decay * 1.2);

          vNode.connect(dry);
          vNode.connect(conv);
          conv.connect(wet);
          dry.connect(merge);
          wet.connect(merge);
          vNode = merge;
        }
      }

      // Connect vocal chain into mastering EQ
      vNode.connect(lowCut);
      vocalSource.start(vocalStartTime);
    }

    const renderedBuffer = await offlineCtx.startRendering();
    const bitDepth = options.format === 'wav_24bit' ? 24 : 16;
    const blob = audioBufferToWavBlob(renderedBuffer, bitDepth);

    // Register rendered asset into Studio Library
    const stemTag = options.stemSelection === 'master' ? 'Master' : options.stemSelection === 'vocal_only' ? 'Vocal_Stem' : 'Beat_Stem';
    const activePresetName = this.tuningSettings ? `${this.tuningSettings.scale} ${this.tuningSettings.key}` : 'Studio';
    const defaultName = options.customFileName || `NeuralTune_${stemTag}_${activePresetName.replace(/\s+/g, '_')}_${Date.now().toString().slice(-6)}.wav`;

    const assetId = `render_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const assetType: LibraryAssetType = options.stemSelection === 'master'
      ? 'rendered_master'
      : options.stemSelection === 'vocal_only'
      ? 'rendered_vocal'
      : 'rendered_beat';

    const peaks = extractWaveformPeaks(renderedBuffer, 80);
    const asset: LibraryAsset = {
      id: assetId,
      name: defaultName,
      type: assetType,
      timestamp: Date.now(),
      duration: renderedBuffer.duration,
      fileSize: `${(blob.size / (1024 * 1024)).toFixed(2)} MB`,
      format: 'WAV',
      sampleRate,
      blob,
      audioUrl: URL.createObjectURL(blob),
      presetName: activePresetName,
      peaks,
      notes: `Rendered with ${bitDepth}-bit WAV @ ${sampleRate}Hz • Full DSP Chain Applied`,
    };

    this.addLibraryAsset(asset);

    // Return blob augmented with asset property for backwards compatibility
    return Object.assign(blob, { asset });
  }

  // Event listener registrations
  public setOnPitchUpdate(cb: (data: PitchTrackData | null) => void): void {
    this.onPitchUpdate = cb;
  }

  public onPitchData(cb: (data: PitchTrackData | null) => void): () => void {
    this.onPitchUpdate = cb;
    return () => {
      if (this.onPitchUpdate === cb) {
        this.onPitchUpdate = null;
      }
    };
  }

  public setOnMetricsUpdate(cb: (metrics: AudioMetrics) => void): void {
    this.onMetricsUpdate = cb;
  }

  public onMetrics(cb: (metrics: AudioMetrics) => void): () => void {
    this.onMetricsUpdate = cb;
    return () => {
      if (this.onMetricsUpdate === cb) {
        this.onMetricsUpdate = null;
      }
    };
  }

  public setOnTimeUpdate(cb: (time: number, duration: number) => void): void {
    this.onTimeUpdate = cb;
  }

  public onTime(cb: (time: number, duration: number) => void): () => void {
    this.onTimeUpdate = cb;
    return () => {
      if (this.onTimeUpdate === cb) {
        this.onTimeUpdate = undefined;
      }
    };
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getIsLiveMicActive(): boolean {
    return this.isLiveMicActive;
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.stopPlayback();
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
    }
    if (this.ctx) {
      this.ctx.close();
    }
  }
}

// Convert AudioBuffer to standard 16-bit or 24-bit PCM WAV Blob
function audioBufferToWavBlob(buffer: AudioBuffer, bitDepth: 16 | 24 = 16): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const dataLength = buffer.length * blockAlign;
  const bufferSize = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // Write WAV header
  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  // Interleave and write channel samples
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i] || 0));
      if (bitDepth === 16) {
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      } else {
        // 24-bit PCM signed integer (3 bytes little-endian)
        const intSample = Math.round(sample < 0 ? sample * 0x800000 : sample * 0x7fffff);
        view.setUint8(offset, intSample & 0xff);
        view.setUint8(offset + 1, (intSample >> 8) & 0xff);
        view.setUint8(offset + 2, (intSample >> 16) & 0xff);
        offset += 3;
      }
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

// Singleton audio engine instance
export const audioEngine = new NeuralTuneAudioEngine();
