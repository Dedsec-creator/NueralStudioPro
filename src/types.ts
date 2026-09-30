export type MusicalKey = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export type MusicalScale = 
  | 'Chromatic'
  | 'Major'
  | 'Minor Natural'
  | 'Minor Harmonic'
  | 'Minor Melodic'
  | 'Pentatonic Major'
  | 'Pentatonic Minor'
  | 'Dorian'
  | 'Blues';

export type MicModelId = 
  | 'c800g' 
  | 'elam251' 
  | 'sm7b' 
  | 'u87' 
  | 'u47' 
  | 'c12' 
  | 'tlm103' 
  | 'md421' 
  | 're20' 
  | 'r121' 
  | 'manley_gold' 
  | 'nt1';

export type PolarPattern = 'cardioid' | 'omni' | 'figure8';

export interface MicModel {
  id: MicModelId;
  name: string;
  manufacturer: string;
  vintageYear: string;
  tagline: string;
  type: 'Tube Condenser' | 'Dynamic' | 'FET Condenser' | 'Ribbon';
  description: string;
  defaultProximity: number; // 0-10 cm
  defaultDrive: number; // 0-100%
  color: string;
  accentHex: string;
  eqCurve: { freq: number; gain: number; q: number }[];
}

export type TuningMode = 'hard_snap' | 'modern_trap' | 'natural_flex' | 'hyper_yeat' | 'robotic';
export type DoublerMode = 'stereo_wide' | 'octave_down' | 'octave_up' | 'fifth_harmony' | 'detuned_thick';
export type StutterRate = '1/4' | '1/8' | '1/16' | '1/32' | 'triplet';

export interface TuningSettings {
  enabled: boolean;
  retuneSpeed: number; // 0ms (hard robot) to 100ms (slow transparent)
  key: MusicalKey;
  scale: MusicalScale;
  humanize: number; // 0 - 100%
  flexTune: number; // 0 - 100%
  naturalVibrato: number; // 0 - 100%
  vibratoRate: number; // 4 - 8 Hz
  trackingSensitivity: number; // 0 - 100%
  tuningMode?: TuningMode;
  formantCorrection?: boolean;
  throatLength?: number; // 0.6 - 1.4 (1.0 = neutral)
  bypassedNotes?: string[]; // notes disabled in the scale
  // Vocal Doubler & Harmonizer
  doublerEnabled?: boolean;
  doublerMode?: DoublerMode;
  doublerMix?: number; // 0 - 100%
  // Yeat / Trap Stutter & Bell Gate FX
  stutterEnabled?: boolean;
  stutterRate?: StutterRate;
  stutterMix?: number; // 0 - 100%
  bellResonatorEnabled?: boolean;
  bellResonanceHz?: number; // 2500 - 6000 Hz
}

export interface MicLockerSettings {
  enabled: boolean;
  selectedMic: MicModelId;
  proximity: number; // 0 to 10
  drive: number; // 0 to 100%
  polarPattern: PolarPattern;
  lowCutHz: 0 | 80 | 120;
  airBoost: number; // 0 to 6 dB
}

export interface DenoiseSettings {
  enabled: boolean;
  threshold: number; // -70 to -20 dB
  reduction: number; // 0 to 36 dB
  sensitivity: number; // 0 to 100%
  noiseFloorLearned: boolean;
  isLearning: boolean;
  autoGateMode?: boolean; // dynamic auto-adjusting gate threshold
  harshSuppression?: number; // 0 to 100% (2.8k-4.5k dynamic de-harshing)
  lowRumbleCut?: boolean; // highpass 80Hz rumble cut
  highCutHz?: number; // 8kHz to 20kHz (cuts ultrasonic fizz and hiss)
  gateReleaseMs?: number; // 20 to 500ms
  gateAttackMs?: number; // 1 to 50ms
  gateHoldMs?: number; // 0 to 200ms
}

export type AIVocalProfileId = 'modern_pop' | 'trap_rap' | 'rnb_velvet' | 'lofi_clean' | 'broadcast_pro' | 'custom';

export interface AIVocalAnalysisResult {
  noiseFloorDb: number;
  harshnessIndex: number; // 0 - 100
  clarityScore: number; // 0 - 100
  recommendedProfile: AIVocalProfileId;
  diagnosisText: string;
  suggestedGateThreshold: number;
  suggestedHarshReduction: number;
  suggestedClarityBoost: number;
  suggestedAirBoost: number;
  suggestedDeMud: number;
  timestamp: number;
}

export interface ProVocalAIEnhancerSettings {
  enabled: boolean;
  intensity: number; // 0 - 100% master intensity
  clarityPresence: number; // 0 - 100% (3.2kHz vocal focus)
  airBrilliance: number; // 0 - 100% (11.5kHz silky air sheen)
  warmthBody: number; // 0 - 100% (220Hz chest resonance)
  deMud: number; // 0 - 100% (480Hz boxiness dynamic cut)
  harshnessTamer: number; // 0 - 100% (3.6kHz harsh resonance clamp)
  spectralBalance: number; // 0 - 100% (auto-leveling curve)
  aiProfile: AIVocalProfileId;
  lastAnalysis?: AIVocalAnalysisResult;
  isAnalyzing?: boolean;
}

export interface AutoAlignSettings {
  enabled: boolean;
  delayMs: number; // -50ms to +50ms
  invertPhase: boolean;
  correlation: number; // -1 to +1
}

export type PluginType = 
  | 'parametric_eq' 
  | 'tube_drive' 
  | 'vintage_delay' 
  | 'plate_reverb' 
  | 'vocal_chorus' 
  | 'de_esser'
  | 'ott_compressor'
  | 'sub_808_enhancer'
  | 'hard_clipper'
  | 'dimension_widener'
  | 'transient_shaper'
  | 'tape_warble_lofi'
  | 'flanger_phaser'
  | 'spectral_gate';

export interface ModularPlugin {
  id: string;
  type: PluginType;
  name: string;
  enabled: boolean;
  params: Record<string, number>;
}

export type AutoMixPresetId = 
  | 'fire_trap_master'
  | 'distorted_808_overload'
  | 'psychedelic_spaced_out'
  | 'yeat_rage_overkill'
  | 'carti_hyper_vamp'
  | 'travis_astroworld_heat'
  | 'metro_boomin_dark_boom'
  | 'club_banger_maximizer'
  | 'lofi_tape_crunch'
  | 'crystalline_modern_pop';

export interface AutoMixFrequencyBalance {
  subBassEnergy: number; // 20 - 80 Hz percentage (0 - 100)
  lowMidEnergy: number; // 80 - 450 Hz percentage (0 - 100)
  vocalPresenceEnergy: number; // 1 - 4.5 kHz percentage (0 - 100)
  airBrightnessEnergy: number; // 8 - 20 kHz percentage (0 - 100)
  subBass?: number; // 0.0 - 1.0 fraction
  lowMids?: number; // 0.0 - 1.0 fraction
  vocalPresence?: number; // 0.0 - 1.0 fraction
  airSheen?: number; // 0.0 - 1.0 fraction
}

export interface AutoMixAnalysis {
  peakDb: number;
  peakLeftDb: number;
  peakRightDb: number;
  rmsDb: number;
  lufs: number;
  integratedLufs?: number;
  crestFactorDb: number;
  stereoCorrelation?: number;
  frequencyBalance: AutoMixFrequencyBalance;
}

export interface AutoMixPresetDefinition {
  id: AutoMixPresetId;
  name: string;
  tagline: string;
  category: 'Trap & Drill' | 'Psychedelic & Space' | 'Hard Distortion' | 'Modern Pop' | 'Vintage Lo-Fi';
  targetLufs: number; // e.g. -6.5 LUFS
  description: string;
  glowColor: string;
  accentHex: string;
  badge: string;
  // Multi-band compressor parameters
  multiband: {
    lowThreshold: number; // dB
    lowRatio: number;
    lowAttack: number; // sec
    lowRelease: number; // sec
    midThreshold: number;
    midRatio: number;
    midAttack: number;
    midRelease: number;
    highThreshold: number;
    highRatio: number;
    highAttack: number;
    highRelease: number;
  };
  // Dynamic glue EQ
  eq: {
    subBassFreq: number; // Hz
    subBassGain: number; // dB
    deMudFreq: number; // Hz
    deMudGain: number; // dB (negative notch)
    vocalPresenceFreq: number; // Hz
    vocalPresenceGain: number; // dB
    airSheenFreq: number; // Hz
    airSheenGain: number; // dB
  };
  // Saturation & drive
  saturation: {
    type: 'tube' | 'tape' | 'hard_clipper' | 'diode_overdrive';
    driveAmount: number; // 0 - 100%
    warmth: number; // 0 - 100%
    mix: number; // 0 - 100%
  };
  // Stereo dimension & 808 mono lock
  stereo: {
    width: number; // 50 - 250%
    monoSubCutoff: number; // Hz (usually 120Hz)
    haasDelayMs: number;
  };
  // Brickwall ceiling limiter
  limiter: {
    ceilingDb: number; // e.g. -0.1 dB
    preGainDb: number; // drive into limiter (0 - 12 dB)
    lookaheadMs: number;
    releaseMs: number;
  };
}

export interface AutoMixResult {
  presetId: AutoMixPresetId;
  presetName: string;
  preset?: AutoMixPresetDefinition;
  targetLufsDb?: number;
  inputAnalysis: AutoMixAnalysis;
  outputAnalysis: AutoMixAnalysis;
  lufsBoostDb: number;
  loudnessGainDb: number;
  rmsBoostDb: number;
  diagnosis: string;
  masteredBuffer?: AudioBuffer;
  timestamp: number;
}

export interface MasteringSettings {
  enabled: boolean;
  lowCut: number; // 20 - 60 Hz
  bassGain: number; // -6 to +6 dB
  midGain: number; // -6 to +6 dB
  highAirGain: number; // -6 to +6 dB
  compThreshold: number; // -30 to 0 dB
  compRatio: number; // 1.5 to 8
  compMakeup: number; // 0 to 12 dB
  tapeDrive: number; // 0 to 100%
  stereoWidth: number; // 50 to 200%
  limiterCeiling: number; // -1.0 to 0.0 dB
}

export interface TrackStemInfo {
  name: string;
  duration: number;
  sampleRate: number;
  isCustomFile: boolean;
  volume: number; // 0 to 1.5
  playbackRate?: number; // 0.5 to 2.0 (default 1.0)
  isMuted: boolean;
  isSolo: boolean;
  peaks?: number[];
  transients?: number[];
}

export interface PitchFormantSettings {
  enabled: boolean;
  pitchSemitones: number; // -12 to +12 semitones
  fineTuneCents: number; // -100 to +100 cents
  formantSemitones: number; // -12 to +12 semitones
  throatLength: number; // 0.70 to 1.40 (70% to 140%)
  preserveFormants: boolean; // lock natural vocal tone when pitch shifting
  formantIntensity: number; // 0 to 100%
  character: 'custom' | 'deep_chest' | 'hyperpop' | 'chopped' | 'melodic_lift' | 'alien';
  f1GainDb: number; // low formant resonance (-6 to +6 dB)
  f2GainDb: number; // mid formant resonance (-6 to +6 dB)
  f3GainDb: number; // high formant shimmer (-6 to +6 dB)
  isBypassed: boolean;
  // ML Formant & Neural Vowel Tracking (ML F)
  mlFormantEnabled?: boolean;
  mlFormantModel?: 'neural_vowel' | 'transformer_formant' | 'deep_timbre' | 'spectral_morph';
  mlFormantTrackingSpeed?: number; // 0 to 100%
  mlFormantClamping?: number; // 0 to 100% (prevents formant screech)
  mlFormantWarmth?: number; // 0 to 100% (harmonic fullness)
  mlVowelPreserve?: boolean; // preserves natural vowel envelope
  mlFormantAirSheen?: number; // 0 to 100% (ultra-high sheen)
}

export type PocketRideStyle = 'pocket_lock' | 'ahead_drive' | 'laid_back' | 'triplet_bounce' | 'pop_tight' | 'manual';

export interface AIPocketAttuneReport {
  matchedHits: number;
  pocketTightness: number; // 0 - 100%
  grooveScore: number; // 0 - 100%
  syncopationIndex: number; // 0 - 100%
  averageDeviationMs: number;
  diagnosis: string;
  phaseAlignmentDegrees?: number;
  rhythmPattern?: string;
  recommendation?: string;
  timestamp: number;
}

export interface SynergyPocketSettings {
  enabled: boolean;
  alignOffsetMs: number; // -500ms to +500ms (negative = vocal leads beat, positive = vocal lags beat)
  rideStyle: PocketRideStyle;
  carveDepthDb: number; // 0 to 8 dB (carves 2.5kHz space in beat for vocal)
  sidechainDucking: number; // 0 to 40% (ducks beat on vocal syllables)
  stereoSeparation: boolean; // vocal center focus + beat stereo width
  transientSensitivity: number; // 0 to 100%
  alignmentConfidence: number; // 0 to 100%
  detectedBeatBpm: number;
  isAnalyzing: boolean;
  beatTransientsCount: number;
  vocalTransientsCount: number;
  // AI Pocket Attunement & Groove Riding
  aiPocketRideEnabled: boolean;
  pocketAttunement: number; // 0 - 100% (how tightly vocals ride beat pockets)
  grooveSwing: number; // -50% to +50% (micro-timing swing feel)
  dynamicTransientLock: boolean; // real-time dynamic transient syllable locking
  aiAttuneReport?: AIPocketAttuneReport;
}

export interface AlignmentAnalysisResult {
  offsetMs: number;
  confidence: number;
  detectedBpm: number;
  beatTransients: number[];
  vocalTransients: number[];
  aiAttuneReport?: AIPocketAttuneReport;
}

export type LibraryAssetType = 'imported_vocal' | 'imported_beat' | 'rendered_master' | 'rendered_vocal' | 'rendered_beat' | 'recorded_vocal';

export interface RecordingStatus {
  isRecording: boolean;
  isCountingIn: boolean;
  countInNumber: number; // 3, 2, 1, 0
  duration: number; // in seconds
  inputLevel: number; // 0 to 100%
  liveMonitoring: boolean; // whether mic is monitored through speakers/headphones
  takeNumber: number;
}

export interface LibraryAsset {
  id: string;
  name: string;
  type: LibraryAssetType;
  timestamp: number;
  duration: number;
  fileSize: string; // e.g. "4.8 MB"
  format: 'WAV' | 'MP3' | 'AAC' | 'OGG';
  sampleRate: number;
  blob?: Blob;
  audioUrl: string;
  presetName?: string;
  peaks?: number[];
  notes?: string;
  isFactoryDemo?: boolean;
}

export interface RenderExportOptions {
  stemSelection: 'master' | 'vocal_only' | 'beat_only';
  format: 'wav_24bit' | 'wav_16bit' | 'wav_32float' | 'mp3_320';
  sampleRate: 44100 | 48000 | 96000;
  customFileName?: string;
  renderSpeed?: 'draft_fast' | 'balanced_studio' | 'audiophile_offline';
}

export type AppThemeId =
  | 'cyber_midnight'
  | 'high_contrast'
  | 'oled_black'
  | 'neon_cyberpunk'
  | 'studio_gold'
  | 'slate_producer';

export type ExportQualityId = 'wav_16bit' | 'wav_24bit' | 'wav_32float' | 'mp3_320';
export type RenderSpeedId = 'draft_fast' | 'balanced_studio' | 'audiophile_offline';
export type SampleRateId = 44100 | 48000 | 96000;

export type PresetWallpaperId =
  | 'none'
  | 'abbey_road'
  | 'cyberpunk_studio'
  | 'wood_acoustic'
  | 'analog_ssl'
  | 'deep_space'
  | 'dark_waveform';

export interface StudioSettings {
  theme: AppThemeId;
  backgroundType: 'none' | 'preset' | 'custom';
  presetWallpaper: PresetWallpaperId;
  customWallpaperUrl: string | null;
  wallpaperOpacity: number; // 0.1 to 1.0
  wallpaperBlur: number; // 0 to 30 px
  exportQuality: ExportQualityId;
  sampleRate: SampleRateId;
  renderSpeed: RenderSpeedId;
  defaultAutoMixPreset: string; // AutoMixPresetId
  defaultAutoMixStem: 'full_mix' | 'vocal' | 'beat';
}

export interface ArtistVocalPreset {
  id: string;
  name: string;
  artist: string;
  song?: string;
  album?: string;
  category: string;
  description: string;
  tuning: TuningSettings;
  mic: MicLockerSettings;
  denoise: DenoiseSettings;
  align: AutoAlignSettings;
  mastering: MasteringSettings;
  plugins: ModularPlugin[];
  pitchFormant?: PitchFormantSettings;
  aiEnhancer?: ProVocalAIEnhancerSettings;
  isCustom?: boolean;
  updatedAt?: string;
  vocalChainSummary?: string[];
}

export interface PitchTrackData {
  frequency: number;
  noteName: string;
  midiNote: number;
  targetMidiNote: number;
  targetNoteName: string;
  centsDeviation: number;
  confidence: number;
  clarity: number;
}

export interface AudioMetrics {
  inputRmsDb: number;
  outputRmsDb: number;
  peakDb: number;
  noiseReductionDb: number;
  gainReductionDb: number;
  lufs: number;
  latencyMs: number;
  sampleRate: number;
  bufferSize: number;
  dspLoadPercent: number;
}

export interface HistoryStudioState {
  tuningSettings: TuningSettings;
  micSettings: MicLockerSettings;
  denoiseSettings: DenoiseSettings;
  alignSettings: AutoAlignSettings;
  plugins: ModularPlugin[];
  masteringSettings: MasteringSettings;
  pitchFormantSettings: PitchFormantSettings;
  aiEnhancerSettings: ProVocalAIEnhancerSettings;
  activePresetId?: string;
  activePresetName?: string;
}

export interface HistorySnapshot {
  id: string;
  timestamp: number;
  label: string;
  state: HistoryStudioState;
}

export interface AutoSaveStatus {
  enabled: boolean;
  intervalSeconds: number;
  lastSaved: number | null;
  secondsSinceLastSave: number;
  secondsUntilNextSave: number;
  isSaving: boolean;
  snapshotCount: number;
  lastError: string | null;
}

export interface ActiveProjectSession {
  id: 'current_session';
  lastSaved: number;
  bpm: number;
  vocalTrackInfo: TrackStemInfo;
  beatTrackInfo: TrackStemInfo;
  vocalBlob?: Blob;
  beatBlob?: Blob;
  vocalAssetId?: string;
  beatAssetId?: string;
  tuningSettings: TuningSettings;
  micSettings: MicLockerSettings;
  denoiseSettings: DenoiseSettings;
  alignSettings: AutoAlignSettings;
  plugins: ModularPlugin[];
  masteringSettings: MasteringSettings;
  pitchFormantSettings: PitchFormantSettings;
  aiEnhancerSettings: ProVocalAIEnhancerSettings;
  synergySettings: SynergyPocketSettings;
  activePresetId?: string;
  snapshots?: HistorySnapshot[];
  redoSnapshots?: HistorySnapshot[];
  snapshotCount?: number;
  autoSaved?: boolean;
}

export interface DatabaseStorageStats {
  assetCount: number;
  uploadCount: number;
  renderCount: number;
  recordCount: number;
  totalBytes: number;
  hasActiveSession: boolean;
  snapshotCount: number;
  lastAutoSaveTime: number | null;
}

export type PerformanceProfileId =
  | 'turbo_low_latency'
  | 'balanced_studio'
  | 'eco_saver'
  | 'glitch_proof';

export interface PerformanceConfig {
  profile: PerformanceProfileId;
  bufferSize: 128 | 256 | 512 | 1024;
  visualizerFps: 60 | 30 | 15;
  smartDspSleep: boolean;
  progressiveLoading: boolean;
  autoGlitchMitigation: boolean;
  maxMemoryCacheMb: number;
  enableOffscreenPeaks: boolean;
}

export interface PerformanceTelemetry {
  dspLoadPercent: number;
  latencyMs: number;
  audioRamUsageMb: number;
  activeBuffersCount: number;
  cachedBuffersCount: number;
  glitchCount: number;
  lastGlitchTime?: number;
  storageUsageMb: number;
  fps: number;
  status: 'optimal' | 'nominal' | 'strained' | 'throttling';
  sampleRate: number;
  bufferSize: number;
}

export interface CachePurgeResult {
  freedBytes: number;
  freedMb: number;
  remainingMb: number;
  purgedBufferCount: number;
}

