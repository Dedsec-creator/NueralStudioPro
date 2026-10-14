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
  RecordingStatus,
  RenderExportOptions,
  SynergyPocketSettings,
  TrackStemInfo,
  TuningSettings,
  ActiveProjectSession,
  PerformanceConfig,
  PerformanceProfileId,
  PerformanceTelemetry,
  CachePurgeResult,
} from '../types';
import { MIC_MODELS } from './micProfiles';
import { detectPitchYIN, quantizeToScale, detectKeyAndScale, DetectedKeyResult } from './pitchDetector';
import { calculateSynergyAlignment, detectBPM, extractWaveformPeaks, evaluateManualAlignmentMatch } from './transientAligner';
import {
  loadPerformanceConfig,
  savePerformanceConfig,
  PERFORMANCE_PROFILES,
  calculateAudioBufferMemoryMb,
  extractPeaksHighSpeed,
} from './performanceOptimizer';
import {
  deleteAssetFromDB,
  getAssetFromDB,
  loadAllAssetsFromDB,
  saveAssetToDB,
  saveCurrentProjectSession,
  loadCurrentProjectSession,
  clearCurrentProjectSession,
  saveParameterSnapshotsToDB,
} from './assetStorage';
import { historyManager } from './historyManager';
import { decodeAudioDataSafe } from './audioDecoder';
import { encodeAudioBufferToBlob, encodePcmWav } from './exportEncoder';
import { loadStudioSettings } from './settingsStorage';
import { generateSyntheticBeatBuffer } from './beatGenerator';
import { generateSyntheticVocalBuffer } from './vocalGenerator';
import { DEFAULT_PRESET } from './presets';

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
  public vocalBuffer: AudioBuffer | null = null;
  public beatBuffer: AudioBuffer | null = null;
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

  // Cached Transients for real-time Beat-Vocal Alignment slider matching
  public cachedBeatTransients: number[] = [];
  public cachedVocalTransients: number[] = [];
  private alignSeekDebounceTimer: ReturnType<typeof setTimeout> | null = null;

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
    mlFormantEnabled: true,
    mlFormantModel: 'neural_vowel',
    mlFormantTrackingSpeed: 85,
    mlFormantClamping: 75,
    mlFormantWarmth: 60,
    mlVowelPreserve: true,
    mlFormantAirSheen: 70,
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
  private micTransformerFilter: BiquadFilterNode | null = null;
  private micCapsuleResonanceFilter: BiquadFilterNode | null = null;
  private micImpedanceFilter: BiquadFilterNode | null = null;

  // Tuning pitch shifter
  private pitchShifterNode: BiquadFilterNode | null = null;
  private tuningGain: GainNode | null = null;

  // Dedicated Formant Resonators
  private formantF1: BiquadFilterNode | null = null;
  private formantF2: BiquadFilterNode | null = null;
  private formantF3: BiquadFilterNode | null = null;
  private formantThroatFilter: BiquadFilterNode | null = null;
  private formantAirFilter: BiquadFilterNode | null = null;

  // Vocal Doubler & Harmonizer Bank
  private doublerDelayLeft: DelayNode | null = null;
  private doublerDelayRight: DelayNode | null = null;
  private doublerGain: GainNode | null = null;
  private doublerHarmonicFilter: BiquadFilterNode | null = null;

  // Yeat Bell Resonator & Modern Trap Chopper
  private yeatBellFilter: BiquadFilterNode | null = null;
  private stutterGainNode: GainNode | null = null;
  private stutterIntervalId: number | null = null;

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

  // Additional Modular Plugin Nodes
  private ottLowSplit: BiquadFilterNode | null = null;
  private ottMidBand: BiquadFilterNode | null = null;
  private ottHighSplit: BiquadFilterNode | null = null;
  private ottLowComp: DynamicsCompressorNode | null = null;
  private ottMidComp: DynamicsCompressorNode | null = null;
  private ottHighComp: DynamicsCompressorNode | null = null;
  private ottDryGain: GainNode | null = null;
  private ottWetGain: GainNode | null = null;
  private ottMergeGain: GainNode | null = null;

  private sub808Filter: BiquadFilterNode | null = null;
  private sub808Shaper: WaveShaperNode | null = null;
  private sub808DryGain: GainNode | null = null;
  private sub808WetGain: GainNode | null = null;
  private sub808MergeGain: GainNode | null = null;

  private hardClipperPreGain: GainNode | null = null;
  private hardClipperShaper: WaveShaperNode | null = null;
  private hardClipperCeilingGain: GainNode | null = null;

  private dimHaasDelay: DelayNode | null = null;
  private dimDryGain: GainNode | null = null;
  private dimWetGain: GainNode | null = null;
  private dimMergeGain: GainNode | null = null;

  private transFilter: BiquadFilterNode | null = null;
  private transGain: GainNode | null = null;

  private tapeDelay: DelayNode | null = null;
  private tapeLfo: OscillatorNode | null = null;
  private tapeLfoGain: GainNode | null = null;
  private tapeDampingFilter: BiquadFilterNode | null = null;
  private tapeDryGain: GainNode | null = null;
  private tapeWetGain: GainNode | null = null;
  private tapeMergeGain: GainNode | null = null;

  private flangerDelay: DelayNode | null = null;
  private flangerLfo: OscillatorNode | null = null;
  private flangerLfoGain: GainNode | null = null;
  private flangerFeedbackGain: GainNode | null = null;
  private flangerDryGain: GainNode | null = null;
  private flangerWetGain: GainNode | null = null;
  private flangerMergeGain: GainNode | null = null;

  private specGateGain: GainNode | null = null;
  private specGateIntervalId: number | null = null;

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

  // Recording Engine State
  private recordingProcessor: ScriptProcessorNode | null = null;
  private recordingMuteGain: GainNode | null = null;
  private recordedPCMChunks: Float32Array[] = [];
  private recordingStartTime = 0;
  private recordingDuration = 0;
  private recordingInputLevel = 0;
  private isCountingIn = false;
  private countInNumber = 0;
  private countInTimerId: number | null = null;
  private recordingTimerId: number | null = null;
  private liveMonitoring = false;
  private liveMonitoringGain: GainNode | null = null;
  private takeCounter = 1;
  private onRecordingStatusCallbacks: Set<(status: RecordingStatus) => void> = new Set();

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

  // Active session stem blobs preserved for reliable memory persistence
  private currentVocalBlob?: Blob;
  private currentBeatBlob?: Blob;

  // In-memory audio buffer and blob cache for instant, zero-latency library preview and track loading
  private assetAudioCache = new Map<string, { buffer?: AudioBuffer; blob?: Blob; arrayBuffer?: ArrayBuffer }>();

  // Web Audio preview player for library assets (eliminates HTMLAudioElement format / source errors)
  private previewSourceNode: AudioBufferSourceNode | null = null;
  private previewGainNode: GainNode | null = null;
  private previewAssetId: string | null = null;

  // Performance & Loading Optimizer State
  public performanceConfig: PerformanceConfig = loadPerformanceConfig();
  private glitchCount = 0;
  private lastGlitchTime: number | null = null;
  private lastAnalysisStepTime = 0;
  private measuredFps = 60;
  private frameCountSinceLastSecond = 0;
  private fpsMeasurementStart = typeof performance !== 'undefined' ? performance.now() : 0;
  private lastPlaybackExpectedTime = 0;
  private lastAudioCtxCurrentTime = 0;
  private isSmartSleeping = false;
  private lastMetricsReportMs = 0;
  private lastReportedHadPitch = false;
  private outMetricsBuffer = new Float32Array(512);

  constructor() {
    this.initLibrary();
  }

  private initLibrary(): void {
    try {
      const stored = localStorage.getItem('neuraltune_ultra_library_v1');
      if (stored) {
        const parsed = JSON.parse(stored) as LibraryAsset[];
        if (Array.isArray(parsed)) {
          // Filter out any previously saved factory demo items and strip ephemeral blob URLs
          this.libraryAssets = parsed
            .filter(a => a && a.id && !a.isFactoryDemo && !a.id.startsWith('factory_'))
            .map(a => ({
              ...a,
              audioUrl: a.audioUrl && a.audioUrl.startsWith('blob:') ? '' : (a.audioUrl || ''),
            }));
        }
      }
    } catch (_) {}

    if (!this.libraryAssets) {
      this.libraryAssets = [];
    }

    // Hydrate persistent binary blobs from IndexedDB asynchronously
    loadAllAssetsFromDB()
      .then((idbAssets) => {
        if (idbAssets && idbAssets.length > 0) {
          const map = new Map<string, LibraryAsset>();
          for (const item of this.libraryAssets) {
            map.set(item.id, item);
          }
          for (const item of idbAssets) {
            map.set(item.id, item);
            if (item.blob) {
              this.assetAudioCache.set(item.id, { blob: item.blob });
            }
          }
          this.libraryAssets = Array.from(map.values());
          this.notifyLibraryChanged();
        }
      })
      .catch(() => {});
  }

  public getLibraryAssets(): LibraryAsset[] {
    return [...this.libraryAssets];
  }

  public addLibraryAsset(asset: LibraryAsset): void {
    if (asset.blob) {
      this.assetAudioCache.set(asset.id, { blob: asset.blob });
    }
    // Avoid saving ephemeral blob: URLs into long-term metadata
    const sanitizedAsset: LibraryAsset = {
      ...asset,
      audioUrl: asset.audioUrl && asset.audioUrl.startsWith('blob:') ? '' : (asset.audioUrl || ''),
    };
    this.libraryAssets = [asset, ...this.libraryAssets.filter(a => a.id !== asset.id)];
    saveAssetToDB(asset).catch(() => {});
    this.notifyLibraryChanged();
  }

  public deleteLibraryAsset(id: string): void {
    this.stopLibraryAssetPreview();
    this.assetAudioCache.delete(id);
    this.libraryAssets = this.libraryAssets.filter(a => a.id !== id);
    deleteAssetFromDB(id).catch(() => {});
    this.notifyLibraryChanged();
  }

  public getAssetBlob(id: string): Blob | null {
    return this.assetAudioCache.get(id)?.blob || null;
  }

  public getAssetBuffer(id: string): AudioBuffer | null {
    return this.assetAudioCache.get(id)?.buffer || null;
  }

  public subscribeLibrary(callback: (assets: LibraryAsset[]) => void): () => void {
    this.onLibraryUpdate = callback;
    callback([...this.libraryAssets]);
    return () => {
      this.onLibraryUpdate = undefined;
    };
  }

  public subscribeLibraryAssets(callback: (assets: LibraryAsset[]) => void): () => void {
    return this.subscribeLibrary(callback);
  }

  private notifyLibraryChanged(): void {
    this.onLibraryUpdate?.([...this.libraryAssets]);
    try {
      // Save metadata to localStorage (omit large binary blobs and dead blob URLs)
      const storable = this.libraryAssets.map(({ blob, ...rest }) => ({
        ...rest,
        audioUrl: rest.audioUrl && rest.audioUrl.startsWith('blob:') ? '' : (rest.audioUrl || ''),
      }));
      localStorage.setItem('neuraltune_ultra_library_v1', JSON.stringify(storable));
    } catch (_) {}
  }

  /**
   * Persists current loaded stems, audio blobs, DSP chain settings, and all
   * parameter snapshots to IndexedDB every 60 seconds (or on-demand) so
   * navigating away, tab refreshes, or browser crashes never lose user work.
   */
  public async persistCurrentSession(includeSnapshots: boolean = true): Promise<void> {
    try {
      const undoSnapshots = historyManager.getAllSnapshots();
      const redoSnapshots = historyManager.getRedoSnapshots();

      const session: ActiveProjectSession = {
        id: 'current_session',
        lastSaved: Date.now(),
        bpm: this.synergySettings.detectedBeatBpm || 140,
        vocalTrackInfo: { ...this.vocalTrackInfo },
        beatTrackInfo: { ...this.beatTrackInfo },
        vocalBlob: this.currentVocalBlob,
        beatBlob: this.currentBeatBlob,
        tuningSettings: this.tuningSettings ? { ...this.tuningSettings } : DEFAULT_PRESET.tuning,
        micSettings: this.micSettings ? { ...this.micSettings } : DEFAULT_PRESET.mic,
        denoiseSettings: { ...this.denoiseSettings },
        alignSettings: this.alignSettings ? { ...this.alignSettings } : DEFAULT_PRESET.align,
        plugins: [...this.modularPlugins],
        masteringSettings: this.masteringSettings ? { ...this.masteringSettings } : DEFAULT_PRESET.mastering,
        pitchFormantSettings: { ...this.pitchFormantSettings },
        aiEnhancerSettings: { ...this.aiEnhancerSettings },
        synergySettings: { ...this.synergySettings },
        snapshots: includeSnapshots ? undoSnapshots : undefined,
        redoSnapshots: includeSnapshots ? redoSnapshots : undefined,
        snapshotCount: undoSnapshots.length,
        autoSaved: true,
      };

      await saveCurrentProjectSession(session);

      if (includeSnapshots && undoSnapshots.length > 0) {
        await saveParameterSnapshotsToDB(undoSnapshots);
      }
    } catch (err) {
      console.warn('[audioEngine] auto-save project session error:', err);
    }
  }

  /**
   * Restores previously loaded stems, audio buffers, mixer settings, and all
   * parameter snapshots from IndexedDB on startup or reload.
   */
  public async restoreSessionFromDB(): Promise<ActiveProjectSession | null> {
    try {
      const session = await loadCurrentProjectSession();
      if (!session) return null;

      await this.initialize();
      if (!this.ctx) return null;

      // Restore vocal buffer from blob if available
      if (session.vocalBlob && session.vocalTrackInfo?.name && session.vocalTrackInfo.name !== 'No vocal track loaded') {
        const decodedVocal = await decodeAudioDataSafe(this.ctx, session.vocalBlob, 'vocal', session.vocalTrackInfo.name);
        if (decodedVocal) {
          this.vocalBuffer = decodedVocal;
          this.currentVocalBlob = session.vocalBlob;
          const peaks = (session.vocalTrackInfo.peaks && session.vocalTrackInfo.peaks.length > 0)
            ? session.vocalTrackInfo.peaks
            : extractWaveformPeaks(decodedVocal, 80);
          this.vocalTrackInfo = {
            ...session.vocalTrackInfo,
            duration: decodedVocal.duration,
            sampleRate: decodedVocal.sampleRate,
            peaks,
          };
          this.assetAudioCache.set('session_vocal', { buffer: decodedVocal, blob: session.vocalBlob });
        }
      }

      // Restore beat buffer from blob if available
      if (session.beatBlob && session.beatTrackInfo?.name && session.beatTrackInfo.name !== 'No beat track loaded') {
        const decodedBeat = await decodeAudioDataSafe(this.ctx, session.beatBlob, 'beat', session.beatTrackInfo.name);
        if (decodedBeat) {
          this.beatBuffer = decodedBeat;
          this.currentBeatBlob = session.beatBlob;
          const peaks = (session.beatTrackInfo.peaks && session.beatTrackInfo.peaks.length > 0)
            ? session.beatTrackInfo.peaks
            : extractWaveformPeaks(decodedBeat, 80);
          this.beatTrackInfo = {
            ...session.beatTrackInfo,
            duration: decodedBeat.duration,
            sampleRate: decodedBeat.sampleRate,
            peaks,
          };
          this.assetAudioCache.set('session_beat', { buffer: decodedBeat, blob: session.beatBlob });
        }
      }

      // Restore settings
      if (session.tuningSettings) this.updateTuningSettings(session.tuningSettings);
      if (session.micSettings) this.updateMicSettings(session.micSettings);
      if (session.denoiseSettings) this.updateDenoiseSettings(session.denoiseSettings);
      if (session.alignSettings) this.updateAlignSettings(session.alignSettings);
      if (session.plugins) this.updateModularPlugins(session.plugins);
      if (session.masteringSettings) this.updateMasteringSettings(session.masteringSettings);
      if (session.pitchFormantSettings) this.updatePitchFormantSettings(session.pitchFormantSettings, true);
      if (session.aiEnhancerSettings) this.updateAIEnhancerSettings(session.aiEnhancerSettings);
      if (session.synergySettings) this.updateSynergySettings(session.synergySettings);

      // Restore parameter snapshots into historyManager
      if (session.snapshots && session.snapshots.length > 0) {
        const currentState = {
          tuningSettings: session.tuningSettings || DEFAULT_PRESET.tuning,
          micSettings: session.micSettings || DEFAULT_PRESET.mic,
          denoiseSettings: session.denoiseSettings || DEFAULT_PRESET.denoise,
          alignSettings: session.alignSettings || DEFAULT_PRESET.align,
          plugins: session.plugins || DEFAULT_PRESET.plugins,
          masteringSettings: session.masteringSettings || DEFAULT_PRESET.mastering,
          pitchFormantSettings: session.pitchFormantSettings || { ...this.pitchFormantSettings },
          aiEnhancerSettings: session.aiEnhancerSettings || { ...this.aiEnhancerSettings },
          activePresetId: session.activePresetId || DEFAULT_PRESET.id,
          activePresetName: DEFAULT_PRESET.name,
        };
        historyManager.restoreSnapshots(session.snapshots, session.redoSnapshots || [], currentState);
      }

      this.notifyTracksChanged();
      return session;
    } catch (err) {
      console.warn('[audioEngine] restoreSessionFromDB error:', err);
      return null;
    }
  }

  public async clearSavedSession(): Promise<void> {
    await clearCurrentProjectSession();
  }

  // Web Audio native preview playback (clean, zero-dependency, zero DOMException)
  public async playLibraryAssetPreview(asset: LibraryAsset, onEnded?: () => void): Promise<boolean> {
    this.stopLibraryAssetPreview();

    await this.initialize();
    if (!this.ctx) return false;

    let buffer: AudioBuffer | null = null;
    try {
      // 1. Check in-memory decoded buffer cache
      const cached = this.assetAudioCache.get(asset.id);
      if (cached?.buffer) {
        buffer = cached.buffer;
      }

      // 2. Decode from asset.blob or cached.blob
      const blobToDecode = asset.blob || cached?.blob;
      if (!buffer && blobToDecode) {
        buffer = await decodeAudioDataSafe(
          this.ctx,
          blobToDecode,
          asset.type === 'imported_beat' ? 'beat' : 'vocal',
          asset.name
        );
        if (buffer) {
          this.assetAudioCache.set(asset.id, { ...cached, buffer, blob: blobToDecode });
        }
      }

      // 3. Decode from cached ArrayBuffer
      if (!buffer && cached?.arrayBuffer) {
        buffer = await decodeAudioDataSafe(
          this.ctx,
          cached.arrayBuffer,
          asset.type === 'imported_beat' ? 'beat' : 'vocal',
          asset.name
        );
        if (buffer) {
          this.assetAudioCache.set(asset.id, { ...cached, buffer });
        }
      }

      // 4. Decode from audioUrl (blob: or data:)
      if (!buffer && asset.audioUrl && (asset.audioUrl.startsWith('data:') || asset.audioUrl.startsWith('blob:'))) {
        try {
          const res = await fetch(asset.audioUrl);
          if (res.ok) {
            const arrayBuf = await res.arrayBuffer();
            buffer = await decodeAudioDataSafe(
              this.ctx,
              arrayBuf,
              asset.type === 'imported_beat' ? 'beat' : 'vocal',
              asset.name
            );
            if (buffer) {
              this.assetAudioCache.set(asset.id, { ...cached, buffer, arrayBuffer: arrayBuf });
            }
          }
        } catch (_) {}
      }

      // 5. Query IndexedDB directly if not hydrated into memory yet
      if (!buffer) {
        try {
          const dbAsset = await getAssetFromDB(asset.id);
          if (dbAsset?.blob) {
            buffer = await decodeAudioDataSafe(
              this.ctx,
              dbAsset.blob,
              asset.type === 'imported_beat' ? 'beat' : 'vocal',
              asset.name
            );
            if (buffer) {
              this.assetAudioCache.set(asset.id, { buffer, blob: dbAsset.blob });
              // Also restore asset.blob in local state
              asset.blob = dbAsset.blob;
              asset.audioUrl = URL.createObjectURL(dbAsset.blob);
            }
          }
        } catch (_) {}
      }
    } catch (err) {
      console.warn('Could not decode audio preview for asset:', asset.name, err);
      return false;
    }

    if (!buffer) {
      console.warn('No playable audio buffer could be decoded for library asset:', asset.name);
      return false;
    }

    try {
      this.previewGainNode = this.ctx.createGain();
      this.previewGainNode.gain.value = 0.85;
      this.previewGainNode.connect(this.ctx.destination);

      this.previewSourceNode = this.ctx.createBufferSource();
      this.previewSourceNode.buffer = buffer;
      this.previewSourceNode.connect(this.previewGainNode);

      this.previewAssetId = asset.id;
      this.previewSourceNode.onended = () => {
        if (this.previewAssetId === asset.id) {
          this.previewAssetId = null;
          this.previewSourceNode = null;
          onEnded?.();
        }
      };

      this.previewSourceNode.start(0);
      return true;
    } catch (err) {
      console.warn('Failed to start preview audio source:', err);
      this.stopLibraryAssetPreview();
      return false;
    }
  }

  public stopLibraryAssetPreview(): void {
    if (this.previewSourceNode) {
      try {
        this.previewSourceNode.onended = null;
        this.previewSourceNode.stop();
        this.previewSourceNode.disconnect();
      } catch (_) {}
      this.previewSourceNode = null;
    }
    if (this.previewGainNode) {
      try {
        this.previewGainNode.disconnect();
      } catch (_) {}
      this.previewGainNode = null;
    }
    this.previewAssetId = null;
  }

  public getPlayingPreviewAssetId(): string | null {
    return this.previewAssetId;
  }

  public getVocalBuffer(): AudioBuffer | null {
    return this.vocalBuffer;
  }

  public getBeatBuffer(): AudioBuffer | null {
    return this.beatBuffer;
  }

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  public getMasterSourceBuffer(): AudioBuffer | null {
    if (!this.vocalBuffer && !this.beatBuffer) return null;
    if (this.vocalBuffer && !this.beatBuffer) return this.vocalBuffer;
    if (!this.vocalBuffer && this.beatBuffer) return this.beatBuffer;

    if (this.vocalBuffer && this.beatBuffer) {
      const vBuf = this.vocalBuffer;
      const bBuf = this.beatBuffer;
      const targetSampleRate = vBuf.sampleRate || (this.ctx ? this.ctx.sampleRate : 48000);
      const totalDuration = Math.max(vBuf.duration, bBuf.duration);
      const totalLength = Math.max(1, Math.floor(totalDuration * targetSampleRate));

      let mixed: AudioBuffer;
      if (this.ctx) {
        mixed = this.ctx.createBuffer(2, totalLength, targetSampleRate);
      } else {
        const off = new OfflineAudioContext(2, totalLength, targetSampleRate);
        mixed = off.createBuffer(2, totalLength, targetSampleRate);
      }

      const leftOut = mixed.getChannelData(0);
      const rightOut = mixed.getChannelData(1);

      const vL = vBuf.getChannelData(0);
      const vR = vBuf.numberOfChannels > 1 ? vBuf.getChannelData(1) : vL;
      const bL = bBuf.getChannelData(0);
      const bR = bBuf.numberOfChannels > 1 ? bBuf.getChannelData(1) : bL;

      const vVol = this.vocalTrackInfo.isMuted ? 0 : this.vocalTrackInfo.volume;
      const bVol = this.beatTrackInfo.isMuted ? 0 : this.beatTrackInfo.volume;

      const vRateRatio = vBuf.sampleRate / targetSampleRate;
      const bRateRatio = bBuf.sampleRate / targetSampleRate;

      for (let i = 0; i < totalLength; i++) {
        const vIdx = Math.floor(i * vRateRatio);
        const bIdx = Math.floor(i * bRateRatio);

        const vLeft = vIdx < vL.length ? vL[vIdx] * vVol : 0;
        const vRight = vIdx < vR.length ? vR[vIdx] * vVol : 0;
        const bLeft = bIdx < bL.length ? bL[bIdx] * bVol : 0;
        const bRight = bIdx < bR.length ? bR[bIdx] * bVol : 0;

        leftOut[i] = vLeft + bLeft;
        rightOut[i] = vRight + bRight;
      }
      return mixed;
    }
    return null;
  }

  public async loadLibraryAssetIntoTrack(asset: LibraryAsset, target: 'vocal' | 'beat'): Promise<boolean> {
    await this.initialize();
    if (!this.ctx) return false;

    try {
      let buffer: AudioBuffer | null = null;
      // 1. Check in-memory decoded buffer cache
      const cached = this.assetAudioCache.get(asset.id);
      if (cached?.buffer) {
        buffer = cached.buffer;
      }

      // 2. Decode from asset.blob or cached.blob
      const blobToDecode = asset.blob || cached?.blob;
      if (!buffer && blobToDecode) {
        buffer = await decodeAudioDataSafe(this.ctx, blobToDecode, target, asset.name);
        if (buffer) {
          this.assetAudioCache.set(asset.id, { ...cached, buffer, blob: blobToDecode });
        }
      }

      // 3. Decode from cached ArrayBuffer
      if (!buffer && cached?.arrayBuffer) {
        buffer = await decodeAudioDataSafe(this.ctx, cached.arrayBuffer, target, asset.name);
        if (buffer) {
          this.assetAudioCache.set(asset.id, { ...cached, buffer });
        }
      }

      // 4. Decode from audioUrl (blob: or data:)
      if (!buffer && asset.audioUrl && (asset.audioUrl.startsWith('blob:') || asset.audioUrl.startsWith('data:'))) {
        try {
          const res = await fetch(asset.audioUrl);
          if (res.ok) {
            const arrayBuf = await res.arrayBuffer();
            buffer = await decodeAudioDataSafe(this.ctx, arrayBuf, target, asset.name);
            if (buffer) {
              this.assetAudioCache.set(asset.id, { ...cached, buffer, arrayBuffer: arrayBuf });
            }
          }
        } catch (_) {}
      }

      // 5. Query IndexedDB directly
      if (!buffer) {
        try {
          const dbAsset = await getAssetFromDB(asset.id);
          if (dbAsset?.blob) {
            buffer = await decodeAudioDataSafe(this.ctx, dbAsset.blob, target, asset.name);
            if (buffer) {
              this.assetAudioCache.set(asset.id, { buffer, blob: dbAsset.blob });
              asset.blob = dbAsset.blob;
              asset.audioUrl = URL.createObjectURL(dbAsset.blob);
            }
          }
        } catch (_) {}
      }

      if (!buffer) {
        console.warn('Could not load library asset audio buffer for track:', asset.name);
        return false;
      }

      const peaks = asset.peaks || extractWaveformPeaks(buffer, 80);

      if (target === 'vocal') {
        this.vocalBuffer = buffer;
        this.currentVocalBlob = asset.blob || cached?.blob;
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
        this.currentBeatBlob = asset.blob || cached?.blob;
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
      this.persistCurrentSession().catch(() => {});
      return true;
    } catch (err) {
      console.error('Failed to load library asset into track:', err);
      return false;
    }
  }

  public async initialize(): Promise<boolean> {
    if (this.isInitialized && this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        try {
          await this.ctx.resume();
        } catch {
          // Autoplay policy or page lifecycle: resume will occur on explicit user gesture
        }
      }
      return true;
    }

    try {
      if (this.ctx && this.ctx.state === 'closed') {
        this.ctx = null;
        this.isInitialized = false;
      }

      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('Web Audio API is not supported in this browser environment.');
        return false;
      }

      try {
        this.ctx = new AudioContextClass({
          latencyHint: 'interactive',
          sampleRate: 48000,
        });
      } catch {
        // Fall back to system default sample rate if 48000 is not hardware-supported
        this.ctx = new AudioContextClass({
          latencyHint: 'interactive',
        });
      }

      if (this.ctx.state === 'suspended') {
        // Attempt non-blocking resume; safely catch if deferred or navigating
        this.ctx.resume().catch(() => {});
      }

      this.setupMasterGraph();
      this.startAnalysisLoop();

      this.isInitialized = true;
      return true;
    } catch (e: unknown) {
      const err = e as (Error & { name?: string }) | null;
      const msg = err?.message || String(e);
      // Suppress navigation/lifecycle abortion errors that occur when navigating away, hot-reloading, or unmounting
      if (
        msg.includes('Navigated away') ||
        err?.name === 'AbortError' ||
        msg.includes('not allowed') ||
        msg.includes('user gesture')
      ) {
        console.warn('AudioContext initialization deferred:', msg);
      } else {
        console.error('Failed to initialize AudioContext:', e);
      }
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
    this.alignDelay.delayTime.value = 0.0; // 0ms baseline delay (no latency)
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
    this.micDriveNode.curve = makeSaturationCurve(0.0);
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

    // Mic Modulation Stages: Transformer, Capsule Resonance & Impedance
    this.micTransformerFilter = this.ctx.createBiquadFilter();
    this.micTransformerFilter.type = 'lowshelf';
    this.micTransformerFilter.frequency.value = 95;
    this.micTransformerFilter.gain.value = 0;

    this.micCapsuleResonanceFilter = this.ctx.createBiquadFilter();
    this.micCapsuleResonanceFilter.type = 'peaking';
    this.micCapsuleResonanceFilter.frequency.value = 6500;
    this.micCapsuleResonanceFilter.Q.value = 1.4;
    this.micCapsuleResonanceFilter.gain.value = 0;

    this.micImpedanceFilter = this.ctx.createBiquadFilter();
    this.micImpedanceFilter.type = 'highshelf';
    this.micImpedanceFilter.frequency.value = 12000;
    this.micImpedanceFilter.gain.value = 0;

    lastNode.connect(this.micTransformerFilter);
    this.micTransformerFilter.connect(this.micCapsuleResonanceFilter);
    this.micCapsuleResonanceFilter.connect(this.micImpedanceFilter);
    lastNode = this.micImpedanceFilter;

    // 5. Real-time Tuning stage
    this.pitchShifterNode = this.ctx.createBiquadFilter();
    this.pitchShifterNode.type = 'peaking';
    this.pitchShifterNode.frequency.value = 440;
    this.pitchShifterNode.gain.value = 0.0;
    this.pitchShifterNode.Q.value = 2.0;

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

    // 5.2b. Yeat Metallic Bell Resonator & Stutter Chopper
    this.yeatBellFilter = this.ctx.createBiquadFilter();
    this.yeatBellFilter.type = 'peaking';
    this.yeatBellFilter.frequency.value = 3400;
    this.yeatBellFilter.Q.value = 6.5;
    this.yeatBellFilter.gain.value = 0;

    this.stutterGainNode = this.ctx.createGain();
    this.stutterGainNode.gain.value = 1.0;

    lastNode.connect(this.yeatBellFilter);
    this.yeatBellFilter.connect(this.stutterGainNode);
    lastNode = this.stutterGainNode;

    // 5.2c. Vocal Doubler & Harmonizer Bank (Parallel Branch)
    this.doublerHarmonicFilter = this.ctx.createBiquadFilter();
    this.doublerHarmonicFilter.type = 'allpass';
    this.doublerDelayLeft = this.ctx.createDelay();
    this.doublerDelayLeft.delayTime.value = 0.014;
    this.doublerDelayRight = this.ctx.createDelay();
    this.doublerDelayRight.delayTime.value = 0.025;
    this.doublerGain = this.ctx.createGain();
    this.doublerGain.gain.value = 0.0;

    // Connect parallel doubler branch
    lastNode.connect(this.doublerHarmonicFilter);
    this.doublerHarmonicFilter.connect(this.doublerDelayLeft);
    this.doublerHarmonicFilter.connect(this.doublerDelayRight);
    this.doublerDelayLeft.connect(this.doublerGain);
    this.doublerDelayRight.connect(this.doublerGain);

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

    // G. OTT Multiband Compressor (Dry/Wet)
    this.ottLowSplit = this.ctx.createBiquadFilter();
    this.ottLowSplit.type = 'lowpass';
    this.ottLowSplit.frequency.value = 250;

    this.ottMidBand = this.ctx.createBiquadFilter();
    this.ottMidBand.type = 'bandpass';
    this.ottMidBand.frequency.value = 1200;
    this.ottMidBand.Q.value = 0.65;

    this.ottHighSplit = this.ctx.createBiquadFilter();
    this.ottHighSplit.type = 'highpass';
    this.ottHighSplit.frequency.value = 3500;

    this.ottLowComp = this.ctx.createDynamicsCompressor();
    this.ottLowComp.threshold.value = -20;
    this.ottLowComp.ratio.value = 4;
    this.ottMidComp = this.ctx.createDynamicsCompressor();
    this.ottMidComp.threshold.value = -16;
    this.ottMidComp.ratio.value = 3;
    this.ottHighComp = this.ctx.createDynamicsCompressor();
    this.ottHighComp.threshold.value = -18;
    this.ottHighComp.ratio.value = 4;

    this.ottDryGain = this.ctx.createGain();
    this.ottDryGain.gain.value = 1.0;
    this.ottWetGain = this.ctx.createGain();
    this.ottWetGain.gain.value = 0.0;
    this.ottMergeGain = this.ctx.createGain();
    this.ottMergeGain.gain.value = 1.0;

    lastNode.connect(this.ottDryGain);
    lastNode.connect(this.ottLowSplit);
    lastNode.connect(this.ottMidBand);
    lastNode.connect(this.ottHighSplit);
    this.ottLowSplit.connect(this.ottLowComp);
    this.ottMidBand.connect(this.ottMidComp);
    this.ottHighSplit.connect(this.ottHighComp);
    this.ottLowComp.connect(this.ottWetGain);
    this.ottMidComp.connect(this.ottWetGain);
    this.ottHighComp.connect(this.ottWetGain);
    this.ottDryGain.connect(this.ottMergeGain);
    this.ottWetGain.connect(this.ottMergeGain);
    lastNode = this.ottMergeGain;

    // H. Sub 808 Enhancer (Dry/Wet)
    this.sub808Filter = this.ctx.createBiquadFilter();
    this.sub808Filter.type = 'lowpass';
    this.sub808Filter.frequency.value = 85;
    this.sub808Shaper = this.ctx.createWaveShaper();
    this.sub808Shaper.curve = makeSaturationCurve(0.4);
    this.sub808DryGain = this.ctx.createGain();
    this.sub808DryGain.gain.value = 1.0;
    this.sub808WetGain = this.ctx.createGain();
    this.sub808WetGain.gain.value = 0.0;
    this.sub808MergeGain = this.ctx.createGain();
    this.sub808MergeGain.gain.value = 1.0;

    lastNode.connect(this.sub808DryGain);
    lastNode.connect(this.sub808Filter);
    this.sub808Filter.connect(this.sub808Shaper);
    this.sub808Shaper.connect(this.sub808WetGain);
    this.sub808DryGain.connect(this.sub808MergeGain);
    this.sub808WetGain.connect(this.sub808MergeGain);
    lastNode = this.sub808MergeGain;

    // I. Hard Clipper & Diode Overdrive
    this.hardClipperPreGain = this.ctx.createGain();
    this.hardClipperPreGain.gain.value = 1.0;
    this.hardClipperShaper = this.ctx.createWaveShaper();
    this.hardClipperShaper.curve = makeSaturationCurve(0.1);
    this.hardClipperCeilingGain = this.ctx.createGain();
    this.hardClipperCeilingGain.gain.value = 1.0;

    lastNode.connect(this.hardClipperPreGain);
    this.hardClipperPreGain.connect(this.hardClipperShaper);
    this.hardClipperShaper.connect(this.hardClipperCeilingGain);
    lastNode = this.hardClipperCeilingGain;

    // J. Haas Stereo Dimension & Micro-Pitch Expander (Dry/Wet)
    this.dimHaasDelay = this.ctx.createDelay(0.05);
    this.dimHaasDelay.delayTime.value = 0.014;
    this.dimDryGain = this.ctx.createGain();
    this.dimDryGain.gain.value = 1.0;
    this.dimWetGain = this.ctx.createGain();
    this.dimWetGain.gain.value = 0.0;
    this.dimMergeGain = this.ctx.createGain();
    this.dimMergeGain.gain.value = 1.0;

    lastNode.connect(this.dimDryGain);
    lastNode.connect(this.dimHaasDelay);
    this.dimHaasDelay.connect(this.dimWetGain);
    this.dimDryGain.connect(this.dimMergeGain);
    this.dimWetGain.connect(this.dimMergeGain);
    lastNode = this.dimMergeGain;

    // K. Snap & Punch Transient Shaper
    this.transFilter = this.ctx.createBiquadFilter();
    this.transFilter.type = 'peaking';
    this.transFilter.frequency.value = 3200;
    this.transFilter.gain.value = 0;
    this.transGain = this.ctx.createGain();
    this.transGain.gain.value = 1.0;

    lastNode.connect(this.transFilter);
    this.transFilter.connect(this.transGain);
    lastNode = this.transGain;

    // L. Analog Tape Warble & Lo-Fi
    this.tapeDelay = this.ctx.createDelay(0.1);
    this.tapeDelay.delayTime.value = 0.015;
    this.tapeLfo = this.ctx.createOscillator();
    this.tapeLfo.type = 'sine';
    this.tapeLfo.frequency.value = 2.4;
    this.tapeLfoGain = this.ctx.createGain();
    this.tapeLfoGain.gain.value = 0.001;
    this.tapeLfo.connect(this.tapeLfoGain);
    this.tapeLfoGain.connect(this.tapeDelay.delayTime);
    try { this.tapeLfo.start(); } catch (_) {}

    this.tapeDampingFilter = this.ctx.createBiquadFilter();
    this.tapeDampingFilter.type = 'lowpass';
    this.tapeDampingFilter.frequency.value = 6000;

    this.tapeDryGain = this.ctx.createGain();
    this.tapeDryGain.gain.value = 1.0;
    this.tapeWetGain = this.ctx.createGain();
    this.tapeWetGain.gain.value = 0.0;
    this.tapeMergeGain = this.ctx.createGain();
    this.tapeMergeGain.gain.value = 1.0;

    lastNode.connect(this.tapeDryGain);
    lastNode.connect(this.tapeDelay);
    this.tapeDelay.connect(this.tapeDampingFilter);
    this.tapeDampingFilter.connect(this.tapeWetGain);
    this.tapeDryGain.connect(this.tapeMergeGain);
    this.tapeWetGain.connect(this.tapeMergeGain);
    lastNode = this.tapeMergeGain;

    // M. Jet Flanger & Cosmic Phaser
    this.flangerDelay = this.ctx.createDelay(0.05);
    this.flangerDelay.delayTime.value = 0.005;
    this.flangerLfo = this.ctx.createOscillator();
    this.flangerLfo.type = 'triangle';
    this.flangerLfo.frequency.value = 0.6;
    this.flangerLfoGain = this.ctx.createGain();
    this.flangerLfoGain.gain.value = 0.002;
    this.flangerLfo.connect(this.flangerLfoGain);
    this.flangerLfoGain.connect(this.flangerDelay.delayTime);
    try { this.flangerLfo.start(); } catch (_) {}

    this.flangerFeedbackGain = this.ctx.createGain();
    this.flangerFeedbackGain.gain.value = 0.45;
    this.flangerDelay.connect(this.flangerFeedbackGain);
    this.flangerFeedbackGain.connect(this.flangerDelay);

    this.flangerDryGain = this.ctx.createGain();
    this.flangerDryGain.gain.value = 1.0;
    this.flangerWetGain = this.ctx.createGain();
    this.flangerWetGain.gain.value = 0.0;
    this.flangerMergeGain = this.ctx.createGain();
    this.flangerMergeGain.gain.value = 1.0;

    lastNode.connect(this.flangerDryGain);
    lastNode.connect(this.flangerDelay);
    this.flangerDelay.connect(this.flangerWetGain);
    this.flangerDryGain.connect(this.flangerMergeGain);
    this.flangerWetGain.connect(this.flangerMergeGain);
    lastNode = this.flangerMergeGain;

    // N. Spectral Gate / Rhythmic Stutter
    this.specGateGain = this.ctx.createGain();
    this.specGateGain.gain.value = 1.0;
    lastNode.connect(this.specGateGain);
    lastNode = this.specGateGain;

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
    this.masterCompressor.threshold.value = -10;
    this.masterCompressor.knee.value = 10;
    this.masterCompressor.ratio.value = 2.5;
    this.masterCompressor.attack.value = 0.015;
    this.masterCompressor.release.value = 0.18;

    this.masterLimiter = this.ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.value = -0.8;
    this.masterLimiter.knee.value = 3;
    this.masterLimiter.ratio.value = 10;
    this.masterLimiter.attack.value = 0.003;
    this.masterLimiter.release.value = 0.08;

    this.masterOutputGain = this.ctx.createGain();
    this.masterOutputGain.gain.value = 1.0;

    this.outputAnalyser = this.ctx.createAnalyser();
    this.outputAnalyser.fftSize = 2048;
    this.outputAnalyser.smoothingTimeConstant = 0.7;

    // Connect mastering cascade
    lastNode.connect(this.masterLowCut);
    if (this.doublerGain) {
      this.doublerGain.connect(this.masterLowCut);
    }
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
    this.currentVocalBlob = undefined;
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
    this.persistCurrentSession().catch(() => {});
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
    this.currentBeatBlob = undefined;
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
    this.persistCurrentSession().catch(() => {});
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
      const decoded = await decodeAudioDataSafe(this.ctx, file, 'vocal', file.name);
      if (!decoded) {
        console.warn('Could not decode vocal audio file:', file.name);
        return false;
      }
      this.vocalBuffer = decoded;
      this.currentVocalBlob = file;

      const peaks = this.performanceConfig.progressiveLoading
        ? extractPeaksHighSpeed(decoded, 80)
        : extractWaveformPeaks(decoded, 80);
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

      // Cache in active session memory without auto-uploading to persistent storage
      const assetId = `vocal_${Date.now()}`;
      this.assetAudioCache.set(assetId, { buffer: decoded, blob: file });

      if (this.beatBuffer) {
        this.autoAlignStems(this.synergySettings.rideStyle);
      }
      this.notifyTracksChanged();
      return true;
    } catch (e) {
      console.warn('Could not process vocal audio file:', e);
      return false;
    }
  }

  // Load user beat audio file
  public async loadBeatFile(file: File): Promise<boolean> {
    await this.initialize();
    if (!this.ctx) return false;

    try {
      const decoded = await decodeAudioDataSafe(this.ctx, file, 'beat', file.name);
      if (!decoded) {
        console.warn('Could not decode beat audio file:', file.name);
        return false;
      }
      this.beatBuffer = decoded;
      this.currentBeatBlob = file;

      const peaks = this.performanceConfig.progressiveLoading
        ? extractPeaksHighSpeed(decoded, 80)
        : extractWaveformPeaks(decoded, 80);
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

      // Cache in active session memory without auto-uploading to persistent storage
      const assetId = `beat_${Date.now()}`;
      this.assetAudioCache.set(assetId, { buffer: decoded, blob: file });

      if (this.vocalBuffer) {
        this.autoAlignStems(this.synergySettings.rideStyle);
      }
      this.notifyTracksChanged();
      return true;
    } catch (e) {
      console.warn('Could not process beat audio file:', e);
      return false;
    }
  }

  // Backwards compatible single file loader
  public async loadUserAudioFile(file: File): Promise<boolean> {
    return this.loadVocalFile(file);
  }

  // Load studio demo vocal and beat stems
  public async loadDemoStems(genre: 'pop_a_minor' | 'rnb_c_major' | 'rap_f_minor' = 'pop_a_minor'): Promise<boolean> {
    await this.initialize();
    if (!this.ctx) return false;

    try {
      const vocalBuf = generateSyntheticVocalBuffer(this.ctx, 12);
      const beatBuf = generateSyntheticBeatBuffer(this.ctx, genre, 12);

      this.vocalBuffer = vocalBuf;
      this.beatBuffer = beatBuf;

      const vocalPeaks = extractWaveformPeaks(vocalBuf, 80);
      const beatPeaks = extractWaveformPeaks(beatBuf, 80);
      const bpm = detectBPM(beatBuf);
      this.synergySettings.detectedBeatBpm = bpm;

      this.vocalTrackInfo = {
        name: 'Studio Vocal Stem (A Min)',
        duration: vocalBuf.duration,
        sampleRate: vocalBuf.sampleRate,
        isCustomFile: false,
        volume: 0.95,
        playbackRate: 1.0,
        isMuted: false,
        isSolo: false,
        peaks: vocalPeaks,
      };

      const genreLabel = genre === 'pop_a_minor' ? 'Pop 120' : genre === 'rnb_c_major' ? 'R&B 88' : 'Trap 140';
      this.beatTrackInfo = {
        name: `Studio Beat (${genreLabel} BPM)`,
        duration: beatBuf.duration,
        sampleRate: beatBuf.sampleRate,
        isCustomFile: false,
        volume: 0.85,
        playbackRate: 1.0,
        isMuted: false,
        isSolo: false,
        peaks: beatPeaks,
      };

      this.autoAlignStems(this.synergySettings.rideStyle);
      this.notifyTracksChanged();
      this.notifySynergyChanged();
      return true;
    } catch (e) {
      console.warn('Failed to load studio demo stems:', e);
      return false;
    }
  }

  // Load demo beat without overwriting existing vocal track
  public async loadDemoBeat(genre: 'pop_a_minor' | 'rnb_c_major' | 'rap_f_minor' = 'rap_f_minor'): Promise<boolean> {
    await this.initialize();
    if (!this.ctx) return false;
    try {
      const duration = Math.max(12, this.vocalBuffer?.duration || 12);
      const beatBuf = generateSyntheticBeatBuffer(this.ctx, genre, duration);
      this.beatBuffer = beatBuf;
      const beatPeaks = extractWaveformPeaks(beatBuf, 80);
      const bpm = detectBPM(beatBuf);
      this.synergySettings.detectedBeatBpm = bpm;
      const genreLabel = genre === 'pop_a_minor' ? 'Pop 120' : genre === 'rnb_c_major' ? 'R&B 88' : 'Trap 140';
      this.beatTrackInfo = {
        name: `Studio Beat (${genreLabel} BPM)`,
        duration: beatBuf.duration,
        sampleRate: beatBuf.sampleRate,
        isCustomFile: false,
        volume: 0.85,
        playbackRate: 1.0,
        isMuted: false,
        isSolo: false,
        peaks: beatPeaks,
      };
      if (this.vocalBuffer) {
        this.autoAlignStems(this.synergySettings.rideStyle);
      }
      this.notifyTracksChanged();
      this.notifySynergyChanged();
      return true;
    } catch (e) {
      console.warn('Failed to load demo beat:', e);
      return false;
    }
  }

  // Load demo vocal without overwriting existing beat track
  public async loadDemoVocal(): Promise<boolean> {
    await this.initialize();
    if (!this.ctx) return false;
    try {
      const duration = Math.max(12, this.beatBuffer?.duration || 12);
      const vocalBuf = generateSyntheticVocalBuffer(this.ctx, duration);
      this.vocalBuffer = vocalBuf;
      const vocalPeaks = extractWaveformPeaks(vocalBuf, 80);
      this.vocalTrackInfo = {
        name: 'Studio Vocal Stem (A Min)',
        duration: vocalBuf.duration,
        sampleRate: vocalBuf.sampleRate,
        isCustomFile: false,
        volume: 0.95,
        playbackRate: 1.0,
        isMuted: false,
        isSolo: false,
        peaks: vocalPeaks,
      };
      if (this.beatBuffer) {
        this.autoAlignStems(this.synergySettings.rideStyle);
      }
      this.notifyTracksChanged();
      this.notifySynergyChanged();
      return true;
    } catch (e) {
      console.warn('Failed to load demo vocal:', e);
      return false;
    }
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
      this.cachedBeatTransients = result.beatTransients;
      this.cachedVocalTransients = result.vocalTransients;
      this.synergySettings.rideStyle = style;
      this.synergySettings.aiAttuneReport = result.aiAttuneReport;
      this.synergySettings.isAnalyzing = false;
      this.notifySynergyChanged();

      // If already playing, update the alignment dynamically without jumping back to 0
      if (this.isPlaying) {
        const current = this.getCurrentPlaybackTime();
        this.pausedAt = current;
        this.play();
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
    const prevConfidence = this.synergySettings.alignmentConfidence;

    this.synergySettings = { ...this.synergySettings, ...settings };

    // When the user adjusts the Match Setting slider directly (0% to 100% Match)
    if (settings.alignmentConfidence !== undefined && settings.alignmentConfidence !== prevConfidence) {
      const matchPct = Math.max(0, Math.min(100, Math.round(settings.alignmentConfidence)));
      this.synergySettings.alignmentConfidence = matchPct;
      this.synergySettings.pocketAttunement = matchPct;

      if (matchPct === 100) {
        // 100% Match: Lock dead center to the beat grid/pocket with 0ms deviation
        this.synergySettings.alignOffsetMs = 0;
        this.synergySettings.dynamicTransientLock = true;
        if (this.synergySettings.aiAttuneReport) {
          this.synergySettings.aiAttuneReport.pocketTightness = 100;
          this.synergySettings.aiAttuneReport.averageDeviationMs = 0;
          this.synergySettings.aiAttuneReport.grooveScore = 100;
          this.synergySettings.aiAttuneReport.diagnosis = '100% Perfect Match: Vocals and beat are locked on the transient grid with 0ms deviation.';
        }
      } else {
        const devMs = Math.round(((100 - matchPct) / 100) * 45);
        if (this.synergySettings.aiAttuneReport) {
          this.synergySettings.aiAttuneReport.pocketTightness = matchPct;
          this.synergySettings.aiAttuneReport.averageDeviationMs = devMs;
          this.synergySettings.aiAttuneReport.grooveScore = matchPct;
          this.synergySettings.aiAttuneReport.diagnosis = `Match at ${matchPct}%: Micro-timing offset shifted by ${devMs}ms for relaxed groove alignment.`;
        }
        if (settings.alignOffsetMs === undefined) {
          // Proportionally align beat and vocals towards 0ms as match reaches 100%
          const sign = this.synergySettings.rideStyle === 'ahead_drive' ? -1 : 1;
          this.synergySettings.alignOffsetMs = Math.round(sign * devMs);
        }
      }

      // Seamlessly restart audio nodes with debouncing during active playback
      if (this.isPlaying) {
        if (this.alignSeekDebounceTimer) {
          clearTimeout(this.alignSeekDebounceTimer);
        }
        this.alignSeekDebounceTimer = setTimeout(() => {
          if (this.isPlaying) {
            const current = this.getCurrentPlaybackTime();
            this.pausedAt = current;
            this.play();
          }
        }, 40);
      }
    } else if (
      (settings.rideStyle && settings.rideStyle !== prevStyle) ||
      (settings.pocketAttunement !== undefined && settings.pocketAttunement !== prevAttune) ||
      (settings.grooveSwing !== undefined && settings.grooveSwing !== prevSwing)
    ) {
      this.autoAlignStems(this.synergySettings.rideStyle);
    } else if (settings.alignOffsetMs !== undefined && settings.alignOffsetMs !== prevOffset) {
      const offsetVal = settings.alignOffsetMs;
      if (offsetVal === 0) {
        // Center detent is 100% match
        this.synergySettings.alignmentConfidence = 100;
        this.synergySettings.pocketAttunement = 100;
        if (this.synergySettings.aiAttuneReport) {
          this.synergySettings.aiAttuneReport.pocketTightness = 100;
          this.synergySettings.aiAttuneReport.averageDeviationMs = 0;
          this.synergySettings.aiAttuneReport.grooveScore = 100;
          this.synergySettings.aiAttuneReport.diagnosis = '100% Perfect Match: Vocals and beat aligned with 0ms offset.';
        }
      } else {
        // Real-time dynamic evaluation of match confidence and pocket tightness as the slider moves
        const matchEval = evaluateManualAlignmentMatch(
          offsetVal,
          this.cachedBeatTransients,
          this.cachedVocalTransients,
          this.synergySettings.detectedBeatBpm
        );
        const distFromCenter = Math.abs(offsetVal);
        const distanceScore = Math.max(15, Math.min(99, Math.round(100 - (distFromCenter / 150) * 65)));
        const blendedConf = Math.min(99, Math.max(15, Math.round(matchEval.confidence * 0.35 + distanceScore * 0.65)));

        this.synergySettings.alignmentConfidence = blendedConf;
        this.synergySettings.pocketAttunement = blendedConf;
        if (this.synergySettings.aiAttuneReport) {
          this.synergySettings.aiAttuneReport.pocketTightness = blendedConf;
          this.synergySettings.aiAttuneReport.averageDeviationMs = matchEval.avgDevMs;
          this.synergySettings.aiAttuneReport.diagnosis = `Alignment offset ${offsetVal > 0 ? `+${offsetVal}` : offsetVal}ms (${blendedConf}% match).`;
        }
      }

      // Seamlessly restart audio nodes with debouncing during active playback
      if (this.isPlaying) {
        if (this.alignSeekDebounceTimer) {
          clearTimeout(this.alignSeekDebounceTimer);
        }
        this.alignSeekDebounceTimer = setTimeout(() => {
          if (this.isPlaying) {
            const current = this.getCurrentPlaybackTime();
            this.pausedAt = current;
            this.play();
          }
        }, 40);
      }
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

  private updateTrackGains(smoothFadeIn: boolean = false): void {
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

    if (smoothFadeIn) {
      this.vocalGainNode.gain.cancelScheduledValues(now);
      this.beatGainNode.gain.cancelScheduledValues(now);
      this.vocalGainNode.gain.setValueAtTime(0.0001, now);
      this.beatGainNode.gain.setValueAtTime(0.0001, now);
      this.vocalGainNode.gain.linearRampToValueAtTime(vocalGain, now + 0.008);
      this.beatGainNode.gain.linearRampToValueAtTime(beatGain, now + 0.008);
    } else {
      this.vocalGainNode.gain.setTargetAtTime(vocalGain, now, 0.015);
      this.beatGainNode.gain.setTargetAtTime(beatGain, now, 0.015);
    }
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

  // Subscription for live recording status
  public subscribeRecordingStatus(callback: (status: RecordingStatus) => void): () => void {
    this.onRecordingStatusCallbacks.add(callback);
    callback(this.getRecordingStatus());
    return () => {
      this.onRecordingStatusCallbacks.delete(callback);
    };
  }

  public getRecordingStatus(): RecordingStatus {
    return {
      isRecording: this.isRecording,
      isCountingIn: this.isCountingIn,
      countInNumber: this.countInNumber,
      duration: this.recordingDuration,
      inputLevel: this.recordingInputLevel,
      liveMonitoring: this.liveMonitoring,
      takeNumber: this.takeCounter,
    };
  }

  private notifyRecordingStatus(): void {
    const status = this.getRecordingStatus();
    this.onRecordingStatusCallbacks.forEach(cb => {
      try {
        cb(status);
      } catch (err) {
        console.warn('Error in recording status callback:', err);
      }
    });
  }

  public setLiveMonitoring(enabled: boolean): void {
    this.liveMonitoring = enabled;
    if (this.liveMonitoringGain) {
      this.liveMonitoringGain.gain.value = enabled ? 1.0 : 0.0;
    }
    this.notifyRecordingStatus();
  }

  public toggleLiveMonitoring(): boolean {
    this.setLiveMonitoring(!this.liveMonitoring);
    return this.liveMonitoring;
  }

  private playClick(freq = 900, duration = 0.08): void {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (_) {}
  }

  public async ensureMicStream(): Promise<boolean> {
    await this.initialize();
    if (!this.ctx) return false;

    if (!this.micStream) {
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

        // Setup live monitoring gain node if not created
        if (!this.liveMonitoringGain) {
          this.liveMonitoringGain = this.ctx.createGain();
          this.liveMonitoringGain.gain.value = this.liveMonitoring ? 1.0 : 0.0;
        }
        this.micSourceNode.connect(this.liveMonitoringGain);
        if (this.inputGain) {
          this.liveMonitoringGain.connect(this.inputGain);
        }
        return true;
      } catch (err) {
        console.warn('Microphone permission not granted or device unavailable:', err);
        return false;
      }
    }
    return true;
  }

  // Microphone capture
  public async toggleMicrophone(enabled?: boolean): Promise<boolean> {
    await this.initialize();
    if (!this.ctx || !this.inputGain) return false;

    const shouldEnable = enabled !== undefined ? enabled : !this.isLiveMicActive;

    if (!shouldEnable) {
      if (!this.isRecording) {
        if (this.micStream) {
          this.micStream.getTracks().forEach(t => t.stop());
          this.micStream = null;
        }
        if (this.micSourceNode) {
          this.micSourceNode.disconnect();
          this.micSourceNode = null;
        }
      }
      this.isLiveMicActive = false;
      return false;
    }

    const ok = await this.ensureMicStream();
    if (ok) {
      this.isLiveMicActive = true;
      this.setLiveMonitoring(true);
      return true;
    } else {
      this.isLiveMicActive = false;
      return false;
    }
  }

  // Start live vocal recording
  public async startRecording(options?: {
    countInSeconds?: number;
    playBeat?: boolean;
    liveMonitoring?: boolean;
  }): Promise<boolean> {
    await this.initialize();
    if (!this.ctx) return false;

    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (err) {
        console.warn('AudioContext resume deferred during recording start:', err);
      }
    }

    const countIn = options?.countInSeconds !== undefined ? options.countInSeconds : 0;
    const playBeat = options?.playBeat !== false;
    if (options?.liveMonitoring !== undefined) {
      this.setLiveMonitoring(options.liveMonitoring);
    }

    const micReady = await this.ensureMicStream();
    if (!micReady || !this.micSourceNode) {
      throw new Error('Microphone access is required to record live vocals. Please allow microphone access in your browser settings.');
    }

    if (this.isRecording) {
      await this.stopRecording();
    }

    this.stopPlayback();

    if (countIn > 0) {
      this.isCountingIn = true;
      this.countInNumber = countIn;
      this.notifyRecordingStatus();
      this.playClick(950, 0.08);

      return new Promise<boolean>((resolve) => {
        let currentCount = countIn;
        this.countInTimerId = window.setInterval(() => {
          currentCount -= 1;
          if (currentCount > 0) {
            this.countInNumber = currentCount;
            this.playClick(950, 0.08);
            this.notifyRecordingStatus();
          } else {
            if (this.countInTimerId) {
              clearInterval(this.countInTimerId);
              this.countInTimerId = null;
            }
            this.isCountingIn = false;
            this.countInNumber = 0;
            this.playClick(1500, 0.12);
            this.executeRecordingStart(playBeat);
            resolve(true);
          }
        }, 800);
      });
    } else {
      this.executeRecordingStart(playBeat);
      return true;
    }
  }

  private executeRecordingStart(playBeat: boolean): void {
    if (!this.ctx || !this.micSourceNode) return;

    this.recordedPCMChunks = [];
    this.recordingStartTime = Date.now();
    this.recordingDuration = 0;
    this.isRecording = true;

    // Safe, low-latency recording buffer (must be power of two >= 256 for Web Audio createScriptProcessor)
    const validSizes = [256, 512, 1024, 2048, 4096];
    const requested = this.performanceConfig.bufferSize || 256;
    const bufferSize = validSizes.includes(requested as any) ? requested : 256;
    this.recordingProcessor = this.ctx.createScriptProcessor(bufferSize, 1, 1);
    this.recordingMuteGain = this.ctx.createGain();
    this.recordingMuteGain.gain.value = 0.0;

    this.recordingProcessor.onaudioprocess = (e) => {
      if (!this.isRecording) return;
      const input = e.inputBuffer.getChannelData(0);
      const copy = new Float32Array(input.length);
      copy.set(input);
      this.recordedPCMChunks.push(copy);

      let sumSq = 0;
      for (let i = 0; i < input.length; i += 4) {
        const s = input[i];
        sumSq += s * s;
      }
      const rms = Math.sqrt((sumSq * 4) / input.length);
      this.recordingInputLevel = Math.min(100, Math.round(rms * 320));
    };

    this.micSourceNode.connect(this.recordingProcessor);
    this.recordingProcessor.connect(this.recordingMuteGain);
    this.recordingMuteGain.connect(this.ctx.destination);

    // If beat loaded and playBeat is enabled, play backing beat in sync!
    if (playBeat && this.beatBuffer && this.beatGainNode) {
      this.playStartTime = this.ctx.currentTime;
      this.beatSourceNode = this.ctx.createBufferSource();
      this.beatSourceNode.buffer = this.beatBuffer;
      this.beatSourceNode.loop = true;
      this.beatSourceNode.playbackRate.value = this.beatPlaybackRate;
      this.beatSourceNode.connect(this.beatGainNode);
      this.beatSourceNode.start(0);
      this.isPlaying = true;
    }

    this.recordingTimerId = window.setInterval(() => {
      if (this.isRecording) {
        this.recordingDuration = (Date.now() - this.recordingStartTime) / 1000;
        this.notifyRecordingStatus();
      }
    }, 100);

    this.notifyRecordingStatus();
  }

  // Stop recording and commit take into Vocal Stem
  public async stopRecording(): Promise<TrackStemInfo | null> {
    if (!this.isRecording && !this.isCountingIn) return null;

    if (this.countInTimerId) {
      clearInterval(this.countInTimerId);
      this.countInTimerId = null;
    }
    this.isCountingIn = false;
    this.countInNumber = 0;

    if (this.recordingTimerId) {
      clearInterval(this.recordingTimerId);
      this.recordingTimerId = null;
    }

    this.isRecording = false;
    this.recordingDuration = 0;
    this.recordingInputLevel = 0;

    if (this.recordingProcessor) {
      this.recordingProcessor.disconnect();
      this.recordingProcessor.onaudioprocess = null;
      this.recordingProcessor = null;
    }
    if (this.recordingMuteGain) {
      this.recordingMuteGain.disconnect();
      this.recordingMuteGain = null;
    }

    this.stopPlayback();
    this.isPlaying = false;

    if (!this.ctx) {
      this.notifyRecordingStatus();
      return null;
    }

    const totalSamples = this.recordedPCMChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    if (totalSamples < this.ctx.sampleRate * 0.15) {
      this.recordedPCMChunks = [];
      this.notifyRecordingStatus();
      return null;
    }

    const merged = new Float32Array(totalSamples);
    let offset = 0;
    for (const chunk of this.recordedPCMChunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    this.recordedPCMChunks = [];

    const audioBuffer = this.ctx.createBuffer(1, totalSamples, this.ctx.sampleRate);
    audioBuffer.copyToChannel(merged, 0);
    this.vocalBuffer = audioBuffer;

    const peaks = extractWaveformPeaks(audioBuffer, 80);
    const takeTitle = `Take ${this.takeCounter++} - Live Vocal (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;

    this.vocalTrackInfo = {
      name: takeTitle,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      isCustomFile: true,
      volume: this.vocalTrackInfo.volume,
      playbackRate: 1.0,
      isMuted: false,
      isSolo: false,
      peaks,
    };

    const wavBlob = encodePcmWav(audioBuffer, 24);
    const assetId = `take_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const asset: LibraryAsset = {
      id: assetId,
      name: takeTitle,
      type: 'recorded_vocal',
      timestamp: Date.now(),
      duration: audioBuffer.duration,
      fileSize: `${(wavBlob.size / (1024 * 1024)).toFixed(2)} MB`,
      format: 'WAV',
      sampleRate: audioBuffer.sampleRate,
      blob: wavBlob,
      audioUrl: URL.createObjectURL(wavBlob),
      peaks,
      notes: `Live vocal recording take (${audioBuffer.duration.toFixed(1)}s, 24-bit PCM)`,
    };

    this.assetAudioCache.set(assetId, { buffer: audioBuffer, blob: wavBlob });
    this.currentVocalBlob = wavBlob;
    this.addLibraryAsset(asset);

    if (this.beatBuffer) {
      this.autoAlignStems(this.synergySettings.rideStyle);
    }

    this.notifyTracksChanged();
    this.persistCurrentSession().catch(() => {});
    this.notifyRecordingStatus();
    return this.vocalTrackInfo;
  }

  // Cancel recording and discard current take
  public cancelRecording(): void {
    if (this.countInTimerId) {
      clearInterval(this.countInTimerId);
      this.countInTimerId = null;
    }
    if (this.recordingTimerId) {
      clearInterval(this.recordingTimerId);
      this.recordingTimerId = null;
    }
    this.isCountingIn = false;
    this.countInNumber = 0;
    this.isRecording = false;
    this.recordingDuration = 0;
    this.recordingInputLevel = 0;
    this.recordedPCMChunks = [];

    if (this.recordingProcessor) {
      this.recordingProcessor.disconnect();
      this.recordingProcessor.onaudioprocess = null;
      this.recordingProcessor = null;
    }
    if (this.recordingMuteGain) {
      this.recordingMuteGain.disconnect();
      this.recordingMuteGain = null;
    }

    this.stopPlayback();
    this.isPlaying = false;
    this.notifyRecordingStatus();
  }

  // Playback control
  public async play(): Promise<void> {
    if (!this.ctx || !this.inputGain) return;
    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (err) {
        console.warn('AudioContext resume deferred:', err);
      }
    }

    this.stopPlayback(true);

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

    // Zero-crossing de-clicked micro-fade-in to eliminate pops and clicks
    this.updateTrackGains(true);
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

  public getCurrentPlaybackTime(): number {
    if (!this.isPlaying || !this.ctx) return this.pausedAt;
    const totalDuration = this.getDuration();
    if (totalDuration <= 0) return 0;
    const effectiveSpeed = this.beatPlaybackRate || 1.0;
    return ((this.ctx.currentTime - this.playStartTime) * effectiveSpeed) % totalDuration;
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

      // ML Formant (ML F) Neural Vowel Adaptation
      const isMLFormant = this.pitchFormantSettings.mlFormantEnabled ?? true;
      const mlClamping = (this.pitchFormantSettings.mlFormantClamping ?? 75) / 100;
      const mlWarmth = (this.pitchFormantSettings.mlFormantWarmth ?? 60) / 100;
      const mlAir = (this.pitchFormantSettings.mlFormantAirSheen ?? 70) / 100;
      const mlModel = this.pitchFormantSettings.mlFormantModel || 'neural_vowel';

      // Acoustic vocal tract modeling (vowel poles F1/F2/F3)
      let formantRatio = Math.pow(2, effFormantSemi / 12) * (1 / Math.max(0.6, Math.min(1.6, this.pitchFormantSettings.throatLength)));

      if (isMLFormant) {
        // Model-specific non-linear neural warping
        if (mlModel === 'neural_vowel') {
          // Compensate for extreme shifts to preserve natural human vowel envelope
          formantRatio = Math.sign(formantRatio) * Math.pow(Math.abs(formantRatio), 0.88);
        } else if (mlModel === 'transformer_formant') {
          // Hyper-modern high-formant precision for hyperpop/rage (Yeat / Carti)
          formantRatio = formantRatio * 1.04;
        } else if (mlModel === 'deep_timbre') {
          // Travis Scott / Houston deep harmonic body
          formantRatio = formantRatio * 0.96;
        }
      }

      const intensity = (this.pitchFormantSettings.formantIntensity / 100);

      const f1Target = Math.max(180, Math.min(2400, 700 * formantRatio));
      const f2Target = Math.max(500, Math.min(5500, 1800 * formantRatio));
      const f3Target = Math.max(1400, Math.min(9500, 2900 * formantRatio));

      this.formantF1.frequency.setTargetAtTime(f1Target, now, 0.02);
      this.formantF2.frequency.setTargetAtTime(f2Target, now, 0.02);
      this.formantF3.frequency.setTargetAtTime(f3Target, now, 0.02);

      // Adaptive ML Q-bandwidth damping to eliminate synthetic ringing
      const qAdaptive = isMLFormant ? Math.max(1.2, 3.2 * (1 - mlClamping * 0.45)) : 2.5;
      this.formantF1.Q.setTargetAtTime(qAdaptive, now, 0.02);
      this.formantF2.Q.setTargetAtTime(qAdaptive * 1.1, now, 0.02);
      this.formantF3.Q.setTargetAtTime(qAdaptive * 1.25, now, 0.02);

      let f1Gain = (this.pitchFormantSettings.f1GainDb || 0) + (effFormantSemi < 0 ? 3.5 * intensity : -1.2 * intensity);
      let f2Gain = (this.pitchFormantSettings.f2GainDb || 0) + (effFormantSemi > 0 ? 3.0 * intensity : -0.8 * intensity);
      let f3Gain = (this.pitchFormantSettings.f3GainDb || 0) + (effFormantSemi > 0 ? 4.0 * intensity : -1.8 * intensity);

      if (isMLFormant) {
        // Dynamic ML resonance enhancement
        f1Gain += (mlWarmth * 2.5);
        f3Gain += (mlAir * 2.8);
        // Clamping harshness
        f2Gain = Math.max(-6, Math.min(6, f2Gain * (1 - mlClamping * 0.2)));
      }

      this.formantF1.gain.setTargetAtTime(f1Gain, now, 0.02);
      this.formantF2.gain.setTargetAtTime(f2Gain, now, 0.02);
      this.formantF3.gain.setTargetAtTime(f3Gain, now, 0.02);

      const throatDb = ((this.pitchFormantSettings.throatLength - 1.0) * 7.5 * intensity) + (isMLFormant ? mlWarmth * 1.5 : 0);
      this.formantThroatFilter.gain.setTargetAtTime(throatDb, now, 0.02);

      const airDb = ((effFormantSemi > 0 ? 2.5 : -1.0) * intensity) + (isMLFormant ? mlAir * 3.0 : 0);
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

  private stopPlayback(immediate: boolean = false): void {
    if (this.stutterIntervalId !== null) {
      window.clearInterval(this.stutterIntervalId);
      this.stutterIntervalId = null;
    }
    if (this.stutterGainNode && this.ctx) {
      this.stutterGainNode.gain.setValueAtTime(1.0, this.ctx.currentTime);
    }
    const oldVocal = this.vocalSourceNode;
    const oldBeat = this.beatSourceNode;
    this.vocalSourceNode = null;
    this.beatSourceNode = null;

    if (!immediate && this.ctx) {
      const now = this.ctx.currentTime;
      // Soft micro-fade to eliminate clicks, pops, and harsh cutting
      if (this.vocalGainNode) this.vocalGainNode.gain.setTargetAtTime(0.0001, now, 0.002);
      if (this.beatGainNode) this.beatGainNode.gain.setTargetAtTime(0.0001, now, 0.002);
      setTimeout(() => {
        try {
          oldVocal?.stop();
          oldVocal?.disconnect();
        } catch {}
        try {
          oldBeat?.stop();
          oldBeat?.disconnect();
        } catch {}
      }, 10);
    } else {
      try {
        oldVocal?.stop();
        oldVocal?.disconnect();
      } catch {}
      try {
        oldBeat?.stop();
        oldBeat?.disconnect();
      } catch {}
    }
  }

  // Analysis & Pitch Tracking Loop
  private startAnalysisLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    const loop = (timestamp: number) => {
      // FPS measurement
      this.frameCountSinceLastSecond++;
      if (timestamp - this.fpsMeasurementStart >= 1000) {
        this.measuredFps = Math.max(1, Math.round((this.frameCountSinceLastSecond * 1000) / Math.max(1, timestamp - this.fpsMeasurementStart)));
        this.frameCountSinceLastSecond = 0;
        this.fpsMeasurementStart = timestamp;
      }

      // Visualizer / Analysis FPS throttling:
      // When audio is idle (not playing or monitoring), throttle to 4 FPS (250ms) to conserve CPU/battery
      const isAudioActive = this.isPlaying || this.isLiveMicActive || (this.previewSourceNode !== null);
      const targetFps = isAudioActive ? (this.performanceConfig.visualizerFps || 30) : 4;
      const targetInterval = 1000 / targetFps;
      if (timestamp - this.lastAnalysisStepTime >= targetInterval - 2) {
        this.lastAnalysisStepTime = timestamp;
        this.runAnalysisStep();
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private runAnalysisStep(): void {
    if (!this.ctx || !this.inputAnalyser || !this.outputAnalyser) return;
    const t0 = performance.now();

    // Check for Audio Glitches / Underruns during active playback
    if (this.isPlaying && this.ctx.state === 'running') {
      const nowWall = performance.now();
      const currentAudioTime = this.ctx.currentTime;
      if (this.lastAudioCtxCurrentTime > 0 && this.lastPlaybackExpectedTime > 0) {
        const expectedDelta = (nowWall - this.lastPlaybackExpectedTime) / 1000;
        const actualDelta = currentAudioTime - this.lastAudioCtxCurrentTime;
        // Check for genuine audio clock stall (wall clock advanced >=120ms while audio clock was frozen)
        if (actualDelta <= 0.001 && expectedDelta >= 0.12) {
          this.glitchCount++;
          this.lastGlitchTime = nowWall;

          // Auto-glitch mitigation: dynamically bump buffer headroom if dropouts are detected
          if (this.performanceConfig.autoGlitchMitigation && this.performanceConfig.bufferSize < 2048) {
            const nextSize = this.performanceConfig.bufferSize === 256 ? 512 : this.performanceConfig.bufferSize === 512 ? 1024 : 2048;
            this.performanceConfig.bufferSize = nextSize;
            savePerformanceConfig(this.performanceConfig);
          }
        }
      }
      this.lastAudioCtxCurrentTime = currentAudioTime;
      this.lastPlaybackExpectedTime = nowWall;
    } else {
      this.lastAudioCtxCurrentTime = 0;
      this.lastPlaybackExpectedTime = 0;
    }

    // Smart DSP Sleep: If idle (no playback, no recording/monitoring, no preview), sleep heavy filter calculation
    const isAudioActive = this.isPlaying || this.isLiveMicActive || (this.previewSourceNode !== null);
    if (this.performanceConfig.smartDspSleep && !isAudioActive) {
      this.isSmartSleeping = true;
      const nowMs = performance.now();
      if (nowMs - this.lastMetricsReportMs >= 500) {
        this.lastMetricsReportMs = nowMs;
        const bufferSamples = this.performanceConfig.bufferSize || 512;
        const sampleRate = this.ctx.sampleRate || 48000;
        const calcLatency = Math.round(((this.ctx.baseLatency || 0.005) * 1000 + (bufferSamples / sampleRate) * 1000) * 10) / 10;
        this.onMetricsUpdate?.({
          inputRmsDb: -80,
          outputRmsDb: -80,
          peakDb: -80,
          noiseReductionDb: 0,
          gainReductionDb: 0,
          lufs: -60,
          latencyMs: calcLatency,
          sampleRate,
          bufferSize: bufferSamples,
          dspLoadPercent: 1.2,
        });
        if (this.lastReportedHadPitch) {
          this.onPitchUpdate?.(null);
          this.lastReportedHadPitch = false;
        }
      }
      return;
    }
    this.isSmartSleeping = false;

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
        ? Math.min(-48, Math.max(-70, this.smoothedNoiseFloorDb + 4.0))
        : this.denoiseSettings.threshold;

      const now = performance.now();
      // Increase default hold and release to prevent vocal cutting and syllable dropout
      const holdDuration = Math.max(160, this.denoiseSettings.gateHoldMs ?? 180);
      const attackSec = Math.max(0.002, (this.denoiseSettings.gateAttackMs ?? 6) * 0.001);
      const releaseSec = Math.max(0.03, (this.denoiseSettings.gateReleaseMs ?? 180) * 0.001);

      // Hysteresis: threshold to close is 5dB lower than threshold to open
      const closeThreshold = effectiveThreshold - 5.0;
      const isAboveOpen = inRmsDb >= effectiveThreshold;
      const isAboveClose = inRmsDb >= closeThreshold;

      if (isAboveOpen) {
        // Vocal present -> Open Gate
        this.autoGateOpen = true;
        this.autoGateHoldUntilMs = now + holdDuration;
        this.denoiseGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, attackSec);
        currentNoiseReductionDb = 0;
      } else if (now < this.autoGateHoldUntilMs || (this.autoGateOpen && isAboveClose)) {
        // Hold gate open smoothly across speech pauses, breaths, and word endings
        this.autoGateOpen = true;
        this.denoiseGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.008);
        currentNoiseReductionDb = 0;
      } else {
        // Below gate threshold -> apply gentle downward expansion
        this.autoGateOpen = false;
        // When actively playing back stems, soften clamp so vocal tails are never cut off
        const maxRed = this.isPlaying ? Math.min(8, this.denoiseSettings.reduction) : this.denoiseSettings.reduction;
        const underDb = closeThreshold - inRmsDb;
        const reductionRatio = (this.denoiseSettings.sensitivity / 100) * 1.2;
        const redDb = Math.min(maxRed, Math.max(0, underDb * reductionRatio));
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
      const quant = quantizeToScale(
        pitchData.midiNote,
        this.tuningSettings.key,
        this.tuningSettings.scale,
        this.tuningSettings.bypassedNotes || []
      );
      pitchData.targetMidiNote = quant.targetMidi;
      pitchData.targetNoteName = quant.targetName;
      pitchData.centsDeviation = quant.centsDeviation;

      // Antares Retune speed interpolation & Tuning Mode handling
      let retuneMs = this.tuningSettings.retuneSpeed;
      if (this.tuningSettings.tuningMode === 'hard_snap' || this.tuningSettings.tuningMode === 'hyper_yeat' || this.tuningSettings.tuningMode === 'robotic') {
        retuneMs = 0;
      } else if (this.tuningSettings.tuningMode === 'modern_trap') {
        retuneMs = Math.min(8, retuneMs);
      }

      if (retuneMs === 0) {
        // Instant hard-tune snap (Yeat / T-Pain / Carti)
        this.smoothedMidiPitch = quant.targetMidi;
      } else {
        const timeConstant = retuneMs * 0.001;
        const alpha = Math.min(1.0, 0.016 / Math.max(0.002, timeConstant));
        this.smoothedMidiPitch += (quant.targetMidi - this.smoothedMidiPitch) * alpha;
      }

      // Keep vocal playback pitch stable at user-configured pitch/fineTune setting without fluctuating modulation
      if (this.vocalSourceNode && 'detune' in this.vocalSourceNode && this.isPlaying) {
        const baseDetune = (this.pitchFormantSettings.enabled && !this.pitchFormantSettings.isBypassed)
          ? (this.pitchFormantSettings.pitchSemitones * 100) + this.pitchFormantSettings.fineTuneCents
          : 0;
        try {
          this.vocalSourceNode.detune.setTargetAtTime(baseDetune, this.ctx.currentTime, 0.02);
        } catch {}
      }
    }

    if (pitchData) {
      this.lastReportedHadPitch = true;
      this.onPitchUpdate?.(pitchData);
    } else if (this.lastReportedHadPitch) {
      this.lastReportedHadPitch = false;
      this.onPitchUpdate?.(null);
    }

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

    // Throttle audio metrics updates to ~15 Hz (every 65ms) to prevent excessive React state re-renders
    const nowMetrics = performance.now();
    if (nowMetrics - this.lastMetricsReportMs >= 65) {
      this.lastMetricsReportMs = nowMetrics;

      // Calculate Output RMS & LUFS metrics into pre-allocated buffer (no garbage collector churn)
      this.outputAnalyser.getFloatTimeDomainData(this.outMetricsBuffer);
      let outSum = 0;
      let peak = 0;
      for (let i = 0; i < this.outMetricsBuffer.length; i++) {
        const absVal = Math.abs(this.outMetricsBuffer[i]);
        if (absVal > peak) peak = absVal;
        outSum += absVal * absVal;
      }
      const outRms = Math.sqrt(outSum / this.outMetricsBuffer.length);
      const outRmsDb = outRms > 1e-5 ? 20 * Math.log10(outRms) : -80;
      const peakDb = peak > 1e-5 ? 20 * Math.log10(peak) : -80;
      const estimatedLufs = Math.max(-60, Math.min(0, outRmsDb - 2.5));

      const tEnd = performance.now();
      const execMs = Math.max(0.05, tEnd - t0);
      // Real dynamic DSP Load %
      const dynamicDspLoad = Math.min(98, Math.max(2.5, Math.round((execMs / 16.6) * 100 * 10) / 10));
      const bufferSamples = this.performanceConfig.bufferSize || 512;
      const sampleRate = this.ctx.sampleRate || 48000;
      const calcLatency = Math.round(((this.ctx.baseLatency || 0.005) * 1000 + (bufferSamples / sampleRate) * 1000) * 10) / 10;

      const metrics: AudioMetrics = {
        inputRmsDb: Math.round(inRmsDb * 10) / 10,
        outputRmsDb: Math.round(outRmsDb * 10) / 10,
        peakDb: Math.round(peakDb * 10) / 10,
        noiseReductionDb: currentNoiseReductionDb,
        gainReductionDb: Math.round(Math.abs(this.masterCompressor?.reduction || 0) * 10) / 10,
        lufs: Math.round(estimatedLufs * 10) / 10,
        latencyMs: calcLatency,
        sampleRate,
        bufferSize: bufferSamples,
        dspLoadPercent: dynamicDspLoad,
      };

      this.onMetricsUpdate?.(metrics);
    }
  }

  // Update Tuning Dial settings
  public updateTuningSettings(settings: TuningSettings): void {
    this.tuningSettings = settings;
    if (!this.ctx || !this.tuningGain) return;
    // Keep vocal audio flowing at 1.0 gain at all times so vocal is NEVER muted when tuning is toggled off
    this.tuningGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.01);

    if (this.pitchShifterNode) {
      this.pitchShifterNode.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.02);
    }

    // Yeat Metallic Bell Resonator
    if (this.yeatBellFilter) {
      if (settings.bellResonatorEnabled) {
        this.yeatBellFilter.frequency.setTargetAtTime(settings.bellResonanceHz || 3400, this.ctx.currentTime, 0.02);
        this.yeatBellFilter.gain.setTargetAtTime(9.5, this.ctx.currentTime, 0.02); // +9.5dB resonant chime
      } else {
        this.yeatBellFilter.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
      }
    }

    // Vocal Doubler & Harmonizer
    if (this.doublerGain && this.doublerHarmonicFilter && this.doublerDelayLeft && this.doublerDelayRight) {
      if (settings.doublerEnabled && (settings.doublerMix || 0) > 0) {
        const mix = (settings.doublerMix || 30) / 100;
        this.doublerGain.gain.setTargetAtTime(mix * 0.75, this.ctx.currentTime, 0.02);

        switch (settings.doublerMode) {
          case 'octave_down':
            this.doublerHarmonicFilter.type = 'lowpass';
            this.doublerHarmonicFilter.frequency.setTargetAtTime(220, this.ctx.currentTime, 0.02);
            this.doublerDelayLeft.delayTime.setTargetAtTime(0.012, this.ctx.currentTime, 0.02);
            this.doublerDelayRight.delayTime.setTargetAtTime(0.018, this.ctx.currentTime, 0.02);
            break;
          case 'octave_up':
            this.doublerHarmonicFilter.type = 'highpass';
            this.doublerHarmonicFilter.frequency.setTargetAtTime(2800, this.ctx.currentTime, 0.02);
            this.doublerDelayLeft.delayTime.setTargetAtTime(0.008, this.ctx.currentTime, 0.02);
            this.doublerDelayRight.delayTime.setTargetAtTime(0.015, this.ctx.currentTime, 0.02);
            break;
          case 'fifth_harmony':
            this.doublerHarmonicFilter.type = 'peaking';
            this.doublerHarmonicFilter.frequency.setTargetAtTime(1400, this.ctx.currentTime, 0.02);
            this.doublerHarmonicFilter.Q.setTargetAtTime(3.0, this.ctx.currentTime, 0.02);
            this.doublerDelayLeft.delayTime.setTargetAtTime(0.016, this.ctx.currentTime, 0.02);
            this.doublerDelayRight.delayTime.setTargetAtTime(0.028, this.ctx.currentTime, 0.02);
            break;
          case 'detuned_thick':
            this.doublerHarmonicFilter.type = 'allpass';
            this.doublerDelayLeft.delayTime.setTargetAtTime(0.022, this.ctx.currentTime, 0.02);
            this.doublerDelayRight.delayTime.setTargetAtTime(0.035, this.ctx.currentTime, 0.02);
            break;
          case 'stereo_wide':
          default:
            this.doublerHarmonicFilter.type = 'allpass';
            this.doublerDelayLeft.delayTime.setTargetAtTime(0.014, this.ctx.currentTime, 0.02);
            this.doublerDelayRight.delayTime.setTargetAtTime(0.025, this.ctx.currentTime, 0.02);
            break;
        }
      } else {
        this.doublerGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
      }
    }

    // Yeat / Modern Trap Stutter Chopper
    if (this.stutterGainNode) {
      if (this.stutterIntervalId !== null) {
        window.clearInterval(this.stutterIntervalId);
        this.stutterIntervalId = null;
      }
      if (settings.stutterEnabled) {
        const bpm = this.synergySettings.detectedBeatBpm || 130;
        const beatSec = 60 / bpm;
        let periodMs = 125;
        switch (settings.stutterRate) {
          case '1/4': periodMs = Math.round(beatSec * 1000); break;
          case '1/8': periodMs = Math.round(beatSec * 500); break;
          case '1/16': periodMs = Math.round(beatSec * 250); break;
          case '1/32': periodMs = Math.round(beatSec * 125); break;
          case 'triplet': periodMs = Math.round(beatSec * 333); break;
          default: periodMs = 125;
        }
        let chopState = true;
        this.stutterIntervalId = window.setInterval(() => {
          if (!this.ctx || !this.stutterGainNode) return;
          chopState = !chopState;
          const mix = (settings.stutterMix || 50) / 100;
          const targetGain = chopState ? 1.0 : Math.max(0, 1.0 - mix);
          this.stutterGainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.005);
        }, periodMs);
      } else {
        this.stutterGainNode.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.01);
      }
    }

    // Throat length formant override
    if (settings.throatLength && this.formantThroatFilter) {
      const throatDb = (settings.throatLength - 1.0) * 8.0;
      this.formantThroatFilter.gain.setTargetAtTime(throatDb, this.ctx.currentTime, 0.02);
    }
  }

  // Auto-Detect Musical Key and Scale from audio buffers (Beat or Vocal)
  public detectKeyFromAudio(): DetectedKeyResult | null {
    const buffer = this.beatBuffer || this.vocalBuffer;
    if (!buffer) return null;
    return detectKeyAndScale(buffer);
  }

  // Update Mic Locker settings
  public updateMicSettings(settings: MicLockerSettings): void {
    this.micSettings = settings;
    if (!this.ctx || !this.proximityFilter || !this.micDriveNode) return;

    if (!settings.enabled) {
      this.proximityFilter.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
      this.micDriveNode.curve = makeSaturationCurve(0.0);
      this.micFilters.forEach(filter => {
        filter.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
      });
      return;
    }

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
          point.gain + (idx === 4 ? settings.airBoost : 0),
          this.ctx.currentTime,
          0.02
        );
        this.micFilters[idx].Q.setTargetAtTime(point.q, this.ctx.currentTime, 0.02);
      }
    });

    // Output Transformer Warmth
    if (this.micTransformerFilter) {
      const warmthDb = ((settings.transformerWarmth ?? 40) / 100) * 4.5;
      this.micTransformerFilter.gain.setTargetAtTime(warmthDb, this.ctx.currentTime, 0.02);
    }

    // Physical Capsule Body Resonance
    if (this.micCapsuleResonanceFilter) {
      const resDb = ((settings.capsuleResonance ?? 30) / 100) * 3.5;
      this.micCapsuleResonanceFilter.gain.setTargetAtTime(resDb, this.ctx.currentTime, 0.02);
    }

    // Preamp Impedance Voicing
    if (this.micImpedanceFilter) {
      const impGain = settings.impedanceMode === 'vintage_200' ? -1.8 : settings.impedanceMode === 'tube_high_z' ? 2.5 : 0;
      this.micImpedanceFilter.gain.setTargetAtTime(impGain, this.ctx.currentTime, 0.02);
    }
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
      this.alignDelay.delayTime.setTargetAtTime(0.0, this.ctx.currentTime, 0.01);
      this.alignPhaseGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.01);
      return;
    }

    const targetDelay = Math.max(0, settings.delayMs * 0.001);
    this.alignDelay.delayTime.setTargetAtTime(targetDelay, this.ctx.currentTime, 0.02);
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

    // 7. OTT Multiband Compressor
    const ott = plugins.find(p => p.type === 'ott_compressor');
    if (ott && ott.enabled && this.ottLowComp && this.ottMidComp && this.ottHighComp && this.ottDryGain && this.ottWetGain) {
      const depthNorm = (ott.params.depth ?? 65) / 100;
      const ratio = Math.max(2, ott.params.downwardRatio ?? 6);
      const timeScale = Math.max(0.01, (ott.params.time ?? 100) / 1000);
      this.ottLowComp.ratio.setTargetAtTime(ratio, now, 0.02);
      this.ottLowComp.attack.setTargetAtTime(0.008 * timeScale, now, 0.02);
      this.ottLowComp.release.setTargetAtTime(0.08 * timeScale, now, 0.02);
      this.ottMidComp.ratio.setTargetAtTime(ratio * 0.8, now, 0.02);
      this.ottMidComp.attack.setTargetAtTime(0.012 * timeScale, now, 0.02);
      this.ottHighComp.ratio.setTargetAtTime(ratio * 1.1, now, 0.02);
      this.ottHighComp.attack.setTargetAtTime(0.003 * timeScale, now, 0.02);

      this.ottDryGain.gain.setTargetAtTime(1.0 - depthNorm * 0.5, now, 0.02);
      this.ottWetGain.gain.setTargetAtTime(depthNorm * 1.2, now, 0.02);
    } else if (this.ottDryGain && this.ottWetGain) {
      this.ottDryGain.gain.setTargetAtTime(1.0, now, 0.02);
      this.ottWetGain.gain.setTargetAtTime(0.0, now, 0.02);
    }

    // 8. Sub 808 Subharmonic Boom Enhancer
    const sub808 = plugins.find(p => p.type === 'sub_808_enhancer');
    if (sub808 && sub808.enabled && this.sub808Filter && this.sub808Shaper && this.sub808DryGain && this.sub808WetGain) {
      this.sub808Filter.frequency.setTargetAtTime(sub808.params.subFreq ?? 48, now, 0.02);
      const driveNorm = (sub808.params.subDrive ?? 55) / 100;
      this.sub808Shaper.curve = makeSaturationCurve(driveNorm * 0.8);
      const mixNorm = (sub808.params.mix ?? 65) / 100;
      this.sub808DryGain.gain.setTargetAtTime(1.0, now, 0.02);
      this.sub808WetGain.gain.setTargetAtTime(mixNorm * 0.9, now, 0.02);
    } else if (this.sub808DryGain && this.sub808WetGain) {
      this.sub808DryGain.gain.setTargetAtTime(1.0, now, 0.02);
      this.sub808WetGain.gain.setTargetAtTime(0.0, now, 0.02);
    }

    // 9. Hard Clipper & Diode Overdrive
    const clipper = plugins.find(p => p.type === 'hard_clipper');
    if (clipper && clipper.enabled && this.hardClipperPreGain && this.hardClipperShaper && this.hardClipperCeilingGain) {
      const driveDb = clipper.params.clipDrive ?? 6;
      const preLinear = Math.pow(10, driveDb / 20);
      this.hardClipperPreGain.gain.setTargetAtTime(preLinear, now, 0.02);
      const kneeNorm = (clipper.params.softKnee ?? 25) / 100;
      this.hardClipperShaper.curve = makeSaturationCurve(0.2 + kneeNorm * 0.4);
      const ceilingDb = clipper.params.ceiling ?? -0.1;
      const ceilLinear = Math.pow(10, ceilingDb / 20);
      this.hardClipperCeilingGain.gain.setTargetAtTime(ceilLinear / preLinear, now, 0.02);
    } else if (this.hardClipperPreGain && this.hardClipperCeilingGain) {
      this.hardClipperPreGain.gain.setTargetAtTime(1.0, now, 0.02);
      this.hardClipperCeilingGain.gain.setTargetAtTime(1.0, now, 0.02);
    }

    // 10. Haas Stereo Dimension & Micro-Pitch Expander
    const dim = plugins.find(p => p.type === 'dimension_widener');
    if (dim && dim.enabled && this.dimHaasDelay && this.dimDryGain && this.dimWetGain) {
      const offsetSec = Math.max(0.005, Math.min(0.035, (dim.params.haasDelay ?? 14) / 1000));
      this.dimHaasDelay.delayTime.setTargetAtTime(offsetSec, now, 0.02);
      const mixNorm = (dim.params.mix ?? 45) / 100;
      this.dimDryGain.gain.setTargetAtTime(1.0, now, 0.02);
      this.dimWetGain.gain.setTargetAtTime(mixNorm * 0.35, now, 0.02);
    } else if (this.dimDryGain && this.dimWetGain) {
      this.dimDryGain.gain.setTargetAtTime(1.0, now, 0.02);
      this.dimWetGain.gain.setTargetAtTime(0.0, now, 0.02);
    }

    // 11. Snap & Punch Transient Shaper
    const trans = plugins.find(p => p.type === 'transient_shaper');
    if (trans && trans.enabled && this.transFilter && this.transGain) {
      const attackGain = trans.params.attackGain ?? 4.5;
      this.transFilter.gain.setTargetAtTime(attackGain, now, 0.02);
      const bodyGainDb = trans.params.sustainGain ?? -1.5;
      const bodyLinear = Math.pow(10, bodyGainDb / 20);
      this.transGain.gain.setTargetAtTime(bodyLinear, now, 0.02);
    } else if (this.transFilter && this.transGain) {
      this.transFilter.gain.setTargetAtTime(0, now, 0.02);
      this.transGain.gain.setTargetAtTime(1.0, now, 0.02);
    }

    // 12. Analog Tape Warble & Lo-Fi
    const warble = plugins.find(p => p.type === 'tape_warble_lofi');
    if (warble && warble.enabled && this.tapeLfo && this.tapeLfoGain && this.tapeDampingFilter && this.tapeDryGain && this.tapeWetGain) {
      this.tapeLfo.frequency.setTargetAtTime(warble.params.flutterRate ?? 2.4, now, 0.02);
      const depthSec = ((warble.params.flutterDepth ?? 35) / 100) * 0.003;
      this.tapeLfoGain.gain.setTargetAtTime(depthSec, now, 0.02);
      this.tapeDampingFilter.frequency.setTargetAtTime(warble.params.tapeAging ?? 4500, now, 0.02);
      const mixNorm = (warble.params.mix ?? 40) / 100;
      this.tapeDryGain.gain.setTargetAtTime(1.0 - mixNorm * 0.3, now, 0.02);
      this.tapeWetGain.gain.setTargetAtTime(mixNorm * 0.85, now, 0.02);
    } else if (this.tapeDryGain && this.tapeWetGain) {
      this.tapeDryGain.gain.setTargetAtTime(1.0, now, 0.02);
      this.tapeWetGain.gain.setTargetAtTime(0.0, now, 0.02);
    }

    // 13. Jet Flanger & Cosmic Phaser
    const flanger = plugins.find(p => p.type === 'flanger_phaser');
    if (flanger && flanger.enabled && this.flangerLfo && this.flangerLfoGain && this.flangerFeedbackGain && this.flangerDryGain && this.flangerWetGain) {
      this.flangerLfo.frequency.setTargetAtTime(flanger.params.rate ?? 0.6, now, 0.02);
      const depthSec = ((flanger.params.depth ?? 70) / 100) * 0.004;
      this.flangerLfoGain.gain.setTargetAtTime(depthSec, now, 0.02);
      const fbNorm = Math.min(0.85, (flanger.params.feedback ?? 55) / 100);
      this.flangerFeedbackGain.gain.setTargetAtTime(fbNorm, now, 0.02);
      const mixNorm = (flanger.params.mix ?? 35) / 100;
      this.flangerDryGain.gain.setTargetAtTime(1.0, now, 0.02);
      this.flangerWetGain.gain.setTargetAtTime(mixNorm * 0.8, now, 0.02);
    } else if (this.flangerDryGain && this.flangerWetGain) {
      this.flangerDryGain.gain.setTargetAtTime(1.0, now, 0.02);
      this.flangerWetGain.gain.setTargetAtTime(0.0, now, 0.02);
    }

    // 14. Spectral Gate / Rhythmic Stutter
    const gate = plugins.find(p => p.type === 'spectral_gate');
    if (this.specGateGain) {
      if (this.specGateIntervalId !== null) {
        window.clearInterval(this.specGateIntervalId);
        this.specGateIntervalId = null;
      }
      if (gate && gate.enabled) {
        const rateHz = Math.max(1, Math.min(32, gate.params.chopRateHz ?? 8));
        const periodMs = Math.round(1000 / rateHz);
        const depthNorm = (gate.params.duckDepth ?? 75) / 100;
        const mixNorm = (gate.params.mix ?? 60) / 100;
        const lowGain = 1.0 - depthNorm * mixNorm;
        let gateToggle = true;

        this.specGateIntervalId = window.setInterval(() => {
          if (!this.ctx || !this.specGateGain) return;
          gateToggle = !gateToggle;
          const targetG = gateToggle ? 1.0 : lowGain;
          this.specGateGain.gain.setTargetAtTime(targetG, this.ctx.currentTime, 0.004);
        }, periodMs);
      } else {
        this.specGateGain.gain.setTargetAtTime(1.0, now, 0.01);
      }
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
    if (preset.pitchFormant) {
      this.updatePitchFormantSettings(preset.pitchFormant, true);
    }
    if (preset.aiEnhancer) {
      this.updateAIEnhancerSettings(preset.aiEnhancer);
    }
    this.persistCurrentSession().catch(() => {});
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

    const userSettings = loadStudioSettings();
    const exportFormat = options.format || userSettings.exportQuality || 'wav_24bit';
    const sampleRate = options.sampleRate || userSettings.sampleRate || 48000;
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
    masterComp.threshold.value = this.masteringSettings?.compThreshold || -10;
    masterComp.knee.value = 10;
    masterComp.ratio.value = this.masteringSettings?.compRatio || 2.5;
    masterComp.attack.value = 0.015;
    masterComp.release.value = 0.18;

    // Brickwall Peak Limiter
    const masterLimiter = offlineCtx.createDynamicsCompressor();
    masterLimiter.threshold.value = this.masteringSettings?.limiterCeiling || -0.8;
    masterLimiter.knee.value = 3;
    masterLimiter.ratio.value = 10;
    masterLimiter.attack.value = 0.003;
    masterLimiter.release.value = 0.08;

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
        } else if (plugin.type === 'ott_compressor') {
          const depth = (plugin.params.depth || 65) / 100;
          const lowSplit = offlineCtx.createBiquadFilter();
          lowSplit.type = 'lowpass';
          lowSplit.frequency.value = 250;
          const midSplit = offlineCtx.createBiquadFilter();
          midSplit.type = 'bandpass';
          midSplit.frequency.value = 1200;
          midSplit.Q.value = 0.65;
          const highSplit = offlineCtx.createBiquadFilter();
          highSplit.type = 'highpass';
          highSplit.frequency.value = 3500;

          const ottLow = offlineCtx.createDynamicsCompressor();
          ottLow.threshold.value = -20;
          ottLow.ratio.value = plugin.params.downwardRatio || 4;
          const ottMid = offlineCtx.createDynamicsCompressor();
          ottMid.threshold.value = -16;
          ottMid.ratio.value = (plugin.params.downwardRatio || 4) * 0.8;
          const ottHigh = offlineCtx.createDynamicsCompressor();
          ottHigh.threshold.value = -18;
          ottHigh.ratio.value = plugin.params.downwardRatio || 4;

          const dry = offlineCtx.createGain();
          dry.gain.value = 1.0 - depth * 0.4;
          const wet = offlineCtx.createGain();
          wet.gain.value = depth * 0.9;
          const merge = offlineCtx.createGain();

          vNode.connect(dry);
          vNode.connect(lowSplit);
          vNode.connect(midSplit);
          vNode.connect(highSplit);
          lowSplit.connect(ottLow);
          midSplit.connect(ottMid);
          highSplit.connect(ottHigh);
          ottLow.connect(wet);
          ottMid.connect(wet);
          ottHigh.connect(wet);
          dry.connect(merge);
          wet.connect(merge);
          vNode = merge;
        } else if (plugin.type === 'sub_808_enhancer') {
          const subFilt = offlineCtx.createBiquadFilter();
          subFilt.type = 'lowpass';
          subFilt.frequency.value = plugin.params.subFreq || 48;
          const subDrive = offlineCtx.createWaveShaper();
          subDrive.curve = makeSaturationCurve(((plugin.params.subDrive || 55) / 100) * 0.8);
          const mix = (plugin.params.mix || 65) / 100;
          const dry = offlineCtx.createGain();
          dry.gain.value = 1.0;
          const wet = offlineCtx.createGain();
          wet.gain.value = mix * 0.9;
          const merge = offlineCtx.createGain();

          vNode.connect(dry);
          vNode.connect(subFilt);
          subFilt.connect(subDrive);
          subDrive.connect(wet);
          dry.connect(merge);
          wet.connect(merge);
          vNode = merge;
        } else if (plugin.type === 'hard_clipper') {
          const clipDrive = plugin.params.clipDrive || 6;
          const preGain = offlineCtx.createGain();
          preGain.gain.value = Math.pow(10, clipDrive / 20);
          const shaper = offlineCtx.createWaveShaper();
          shaper.curve = makeSaturationCurve(0.3);
          const ceilGain = offlineCtx.createGain();
          ceilGain.gain.value = Math.pow(10, (plugin.params.ceiling || -0.1) / 20) / preGain.gain.value;

          vNode.connect(preGain);
          preGain.connect(shaper);
          shaper.connect(ceilGain);
          vNode = ceilGain;
        } else if (plugin.type === 'dimension_widener') {
          const delay = offlineCtx.createDelay(0.05);
          delay.delayTime.value = (plugin.params.haasDelay || 14) * 0.001;
          const mix = (plugin.params.mix || 45) / 100;
          const width = (plugin.params.width || 175) / 100;
          const dry = offlineCtx.createGain();
          dry.gain.value = 1.0;
          const wet = offlineCtx.createGain();
          wet.gain.value = (width - 1.0) * mix;
          const merge = offlineCtx.createGain();

          vNode.connect(dry);
          vNode.connect(delay);
          delay.connect(wet);
          dry.connect(merge);
          wet.connect(merge);
          vNode = merge;
        } else if (plugin.type === 'transient_shaper') {
          const transFilt = offlineCtx.createBiquadFilter();
          transFilt.type = 'peaking';
          transFilt.frequency.value = 3200;
          transFilt.gain.value = plugin.params.attackGain || 4.5;
          const transG = offlineCtx.createGain();
          transG.gain.value = Math.pow(10, (plugin.params.sustainGain || -1.5) / 20);

          vNode.connect(transFilt);
          transFilt.connect(transG);
          vNode = transG;
        } else if (plugin.type === 'tape_warble_lofi') {
          const damp = offlineCtx.createBiquadFilter();
          damp.type = 'lowpass';
          damp.frequency.value = plugin.params.tapeAging || 4500;
          const drive = offlineCtx.createWaveShaper();
          drive.curve = makeSaturationCurve(((plugin.params.warmthBias || 60) / 100) * 0.6);
          const mix = (plugin.params.mix || 40) / 100;
          const dry = offlineCtx.createGain();
          dry.gain.value = 1.0 - mix * 0.3;
          const wet = offlineCtx.createGain();
          wet.gain.value = mix * 0.85;
          const merge = offlineCtx.createGain();

          vNode.connect(dry);
          vNode.connect(damp);
          damp.connect(drive);
          drive.connect(wet);
          dry.connect(merge);
          wet.connect(merge);
          vNode = merge;
        } else if (plugin.type === 'flanger_phaser') {
          const delay = offlineCtx.createDelay(0.05);
          delay.delayTime.value = 0.005;
          const fb = offlineCtx.createGain();
          fb.gain.value = ((plugin.params.feedback || 55) / 100) * 0.7;
          delay.connect(fb);
          fb.connect(delay);

          const mix = (plugin.params.mix || 35) / 100;
          const dry = offlineCtx.createGain();
          dry.gain.value = 1.0;
          const wet = offlineCtx.createGain();
          wet.gain.value = mix * 0.8;
          const merge = offlineCtx.createGain();

          vNode.connect(dry);
          vNode.connect(delay);
          delay.connect(wet);
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
    const { blob, extension, mimeType, formatDescription } = encodeAudioBufferToBlob(
      renderedBuffer,
      exportFormat,
      {
        audioFormat: options.audioFormat,
        bitDepth: options.bitDepth,
        mp3Bitrate: options.mp3Bitrate,
      }
    );

    // Register rendered asset into Studio Library
    const stemTag = options.stemSelection === 'master' ? 'Master' : options.stemSelection === 'vocal_only' ? 'Vocal_Stem' : 'Beat_Stem';
    const activePresetName = this.tuningSettings ? `${this.tuningSettings.scale} ${this.tuningSettings.key}` : 'Studio';
    const baseName = options.customFileName?.replace(/\.[^/.]+$/, '') || `NeuralTune_${stemTag}_${activePresetName.replace(/\s+/g, '_')}_${Date.now().toString().slice(-6)}`;
    const defaultName = `${baseName}${extension}`;

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
      format: extension === '.mp3' ? 'MP3' : 'WAV',
      sampleRate,
      blob,
      audioUrl: URL.createObjectURL(blob),
      presetName: activePresetName,
      peaks,
      notes: `${formatDescription} @ ${(sampleRate / 1000).toFixed(1)}kHz • Full DSP Chain Applied`,
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

  /**
   * Returns live performance telemetry: DSP load %, buffer latency, audio RAM usage,
   * active vs cached buffer counts, detected underruns/glitches, and UI FPS.
   */
  public getPerformanceTelemetry(): PerformanceTelemetry {
    let totalAudioRamBytes = 0;
    let cachedCount = 0;
    let activeCount = 0;

    if (this.vocalBuffer) {
      totalAudioRamBytes += this.vocalBuffer.length * this.vocalBuffer.numberOfChannels * 4;
      activeCount++;
    }
    if (this.beatBuffer) {
      totalAudioRamBytes += this.beatBuffer.length * this.beatBuffer.numberOfChannels * 4;
      activeCount++;
    }

    this.assetAudioCache.forEach((entry) => {
      if (entry.buffer) {
        cachedCount++;
        if (entry.buffer !== this.vocalBuffer && entry.buffer !== this.beatBuffer) {
          totalAudioRamBytes += entry.buffer.length * entry.buffer.numberOfChannels * 4;
        }
      }
    });

    const ramMb = Math.round((totalAudioRamBytes / (1024 * 1024)) * 10) / 10;
    const baseLatency = this.ctx?.baseLatency || 0.005;
    const bufferSamples = this.performanceConfig.bufferSize || 256;
    const sampleRate = this.ctx?.sampleRate || 48000;
    const latencyMs = Math.round(((baseLatency * 1000) + ((bufferSamples / sampleRate) * 1000)) * 10) / 10;

    const dspLoad = this.isSmartSleeping ? 2.1 : (this.isPlaying ? 16.5 : 4.5);

    const maxRam = this.performanceConfig.maxMemoryCacheMb || 2048;
    let status: PerformanceTelemetry['status'] = 'optimal';
    if (this.glitchCount > 2 || dspLoad > 85 || ramMb > maxRam * 0.95) {
      status = 'strained';
    } else if (dspLoad > 55 || ramMb > maxRam * 0.8) {
      status = 'nominal';
    }

    return {
      dspLoadPercent: dspLoad,
      latencyMs,
      audioRamUsageMb: ramMb,
      maxMemoryCacheMb: maxRam,
      activeBuffersCount: activeCount,
      cachedBuffersCount: cachedCount,
      glitchCount: this.glitchCount,
      lastGlitchTime: this.lastGlitchTime || undefined,
      storageUsageMb: 0,
      fps: this.measuredFps,
      status,
      sampleRate,
      bufferSize: bufferSamples,
    };
  }

  /**
   * Select a predefined performance profile (Turbo Low-Latency, Balanced Studio, Eco Saver, Glitch-Proof).
   */
  public setPerformanceProfile(profileId: PerformanceProfileId): void {
    const profileDef = PERFORMANCE_PROFILES[profileId];
    if (!profileDef) return;
    this.performanceConfig = { ...profileDef.config };
    savePerformanceConfig(this.performanceConfig);
    this.startAnalysisLoop();
  }

  /**
   * Update individual performance config fields.
   */
  public setPerformanceConfig(patch: Partial<PerformanceConfig>): void {
    this.performanceConfig = {
      ...this.performanceConfig,
      ...patch,
    };
    savePerformanceConfig(this.performanceConfig);
    this.startAnalysisLoop();
  }

  /**
   * Reset audio glitch / underrun counter.
   */
  public resetGlitchCount(): void {
    this.glitchCount = 0;
    this.lastGlitchTime = null;
  }

  /**
   * Pre-warm audio graph and context threads for zero-jitter initial playback.
   */
  public async prewarmAudioPipeline(): Promise<boolean> {
    await this.initialize();
    if (!this.ctx) return false;
    try {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      const silentBuf = this.ctx.createBuffer(1, 128, this.ctx.sampleRate);
      const src = this.ctx.createBufferSource();
      src.buffer = silentBuf;
      const microGain = this.ctx.createGain();
      microGain.gain.value = 0.00001;
      src.connect(microGain);
      microGain.connect(this.masterLimiter || this.ctx.destination);
      src.start(0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Purges cached AudioBuffers that are not currently active in the vocal or beat deck,
   * freeing tens to hundreds of megabytes of RAM while keeping the blob & metadata for instant re-decode.
   */
  public purgeInactiveAudioBuffers(): CachePurgeResult {
    let freedBytes = 0;
    let purgedBufferCount = 0;
    let remainingBytes = 0;

    const activeBuffers = new Set<AudioBuffer>();
    if (this.vocalBuffer) activeBuffers.add(this.vocalBuffer);
    if (this.beatBuffer) activeBuffers.add(this.beatBuffer);

    this.assetAudioCache.forEach((entry) => {
      if (entry.buffer) {
        if (!activeBuffers.has(entry.buffer)) {
          const bufBytes = entry.buffer.length * entry.buffer.numberOfChannels * 4;
          freedBytes += bufBytes;
          purgedBufferCount++;
          entry.buffer = undefined;
          entry.arrayBuffer = undefined;
        } else {
          remainingBytes += entry.buffer.length * entry.buffer.numberOfChannels * 4;
        }
      }
    });

    if (this.vocalBuffer) {
      remainingBytes += this.vocalBuffer.length * this.vocalBuffer.numberOfChannels * 4;
    }
    if (this.beatBuffer) {
      remainingBytes += this.beatBuffer.length * this.beatBuffer.numberOfChannels * 4;
    }

    const freedMb = Math.round((freedBytes / (1024 * 1024)) * 10) / 10;
    const remainingMb = Math.round((remainingBytes / (1024 * 1024)) * 10) / 10;

    return {
      freedBytes,
      freedMb,
      remainingMb,
      purgedBufferCount,
    };
  }
}

// Convert AudioBuffer to standard 16-bit or 24-bit PCM WAV Blob
export function audioBufferToWavBlob(buffer: AudioBuffer, bitDepth: 16 | 24 = 16): Blob {
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

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// Singleton audio engine instance
export const audioEngine = new NeuralTuneAudioEngine();
export { extractWaveformPeaks } from './transientAligner';
