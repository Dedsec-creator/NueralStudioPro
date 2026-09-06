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

export type PluginType = 'parametric_eq' | 'tube_drive' | 'vintage_delay' | 'plate_reverb' | 'vocal_chorus' | 'de_esser';

export interface ModularPlugin {
  id: string;
  type: PluginType;
  name: string;
  enabled: boolean;
  params: Record<string, number>;
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

export type LibraryAssetType = 'imported_vocal' | 'imported_beat' | 'rendered_master' | 'rendered_vocal' | 'rendered_beat';

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
  format: 'wav_24bit' | 'wav_16bit';
  sampleRate: 44100 | 48000;
  customFileName?: string;
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
