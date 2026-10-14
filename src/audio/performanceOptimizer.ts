import {
  PerformanceConfig,
  PerformanceProfileId,
  PerformanceTelemetry,
  CachePurgeResult,
} from '../types';

export const PERFORMANCE_STORAGE_KEY = 'neuraltune_performance_config_v1';

export function isMobileOrAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    (typeof window !== 'undefined' && window.innerWidth <= 768);
}

export interface PerformanceProfileDefinition {
  id: PerformanceProfileId;
  name: string;
  badge: string;
  badgeColor: string;
  icon: string;
  description: string;
  estimatedLatencyMs: string;
  config: PerformanceConfig;
}

export const PERFORMANCE_PROFILES: Record<PerformanceProfileId, PerformanceProfileDefinition> = {
  android_mobile: {
    id: 'android_mobile',
    name: 'Android Mobile (Low-CPU & Battery)',
    badge: 'ANDROID • LOW-CPU',
    badgeColor: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    icon: 'Smartphone',
    description: 'Hardware-synced 512 smp buffer to eliminate Android audio dropouts, 30 FPS throttled visualizers, deep DSP sleep, and zero background disk churn.',
    estimatedLatencyMs: '10 - 12 ms',
    config: {
      profile: 'android_mobile',
      bufferSize: 512,
      visualizerFps: 30,
      smartDspSleep: true,
      progressiveLoading: true,
      autoGlitchMitigation: true,
      maxMemoryCacheMb: 1024,
      enableOffscreenPeaks: true,
      enableHighRamCache: true,
    },
  },
  turbo_low_latency: {
    id: 'turbo_low_latency',
    name: 'Turbo Low-Latency (256 smp • 2GB RAM)',
    badge: '5ms • 2GB RAM',
    badgeColor: 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300',
    icon: 'Zap',
    description: 'Ultra-low 256-sample buffer stream with 2GB high-speed RAM caching for instantaneous zero-lag vocal recording.',
    estimatedLatencyMs: '5 - 6 ms',
    config: {
      profile: 'turbo_low_latency',
      bufferSize: 256,
      visualizerFps: 60,
      smartDspSleep: true,
      progressiveLoading: true,
      autoGlitchMitigation: true,
      maxMemoryCacheMb: 2048,
      enableOffscreenPeaks: true,
      enableHighRamCache: true,
    },
  },
  balanced_studio: {
    id: 'balanced_studio',
    name: 'Balanced Studio (512 smp • 2GB RAM)',
    badge: 'STUDIO • 2GB RAM',
    badgeColor: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    icon: 'Sliders',
    description: 'Optimal balance of 60 FPS visual rendering, multi-plugin headroom, and 2GB audio buffer RAM caching for stable streaming.',
    estimatedLatencyMs: '8 - 12 ms',
    config: {
      profile: 'balanced_studio',
      bufferSize: 512,
      visualizerFps: 60,
      smartDspSleep: true,
      progressiveLoading: true,
      autoGlitchMitigation: true,
      maxMemoryCacheMb: 2048,
      enableOffscreenPeaks: true,
      enableHighRamCache: true,
    },
  },
  eco_saver: {
    id: 'eco_saver',
    name: 'Eco & Battery Saver (1024 smp • 1GB RAM)',
    badge: '-60% CPU • 1GB RAM',
    badgeColor: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
    icon: 'Leaf',
    description: 'Throttles UI visualizers to 30 FPS, enables deep DSP sleep for idle nodes, and reserves a 1GB memory cache to cut battery drain.',
    estimatedLatencyMs: '18 - 25 ms',
    config: {
      profile: 'eco_saver',
      bufferSize: 1024,
      visualizerFps: 30,
      smartDspSleep: true,
      progressiveLoading: true,
      autoGlitchMitigation: true,
      maxMemoryCacheMb: 1024,
      enableOffscreenPeaks: true,
      enableHighRamCache: false,
    },
  },
  glitch_proof: {
    id: 'glitch_proof',
    name: 'Safe Headroom Buffer (2048 smp • 4GB RAM)',
    badge: 'GLITCH-PROOF • 4GB RAM',
    badgeColor: 'border-violet-500/40 bg-violet-500/15 text-violet-300',
    icon: 'Shield',
    description: 'Maximum 4GB RAM buffer cache to completely eliminate crackle and audio dropouts on complex multi-track sessions.',
    estimatedLatencyMs: '35 - 45 ms',
    config: {
      profile: 'glitch_proof',
      bufferSize: 2048,
      visualizerFps: 30,
      smartDspSleep: true,
      progressiveLoading: true,
      autoGlitchMitigation: true,
      maxMemoryCacheMb: 4096,
      enableOffscreenPeaks: true,
      enableHighRamCache: true,
    },
  },
};

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = isMobileOrAndroid()
  ? { ...PERFORMANCE_PROFILES.android_mobile.config }
  : {
      ...PERFORMANCE_PROFILES.turbo_low_latency.config,
      bufferSize: 256,
      maxMemoryCacheMb: 2048,
      autoGlitchMitigation: true,
      enableHighRamCache: true,
    };

/**
 * Load saved performance configuration from localStorage.
 */
export function loadPerformanceConfig(): PerformanceConfig {
  const isMobile = isMobileOrAndroid();
  try {
    const raw = localStorage.getItem(PERFORMANCE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PerformanceConfig>;
      const validSizes: (256 | 512 | 1024 | 2048)[] = [256, 512, 1024, 2048];
      const defaultBuffer = isMobile ? 512 : 256;
      const safeBuffer = (parsed.bufferSize && validSizes.includes(parsed.bufferSize as any))
        ? (parsed.bufferSize as 256 | 512 | 1024 | 2048)
        : defaultBuffer;

      // Safe RAM cache
      const safeRam = (!parsed.maxMemoryCacheMb || parsed.maxMemoryCacheMb < 512)
        ? (isMobile ? 1024 : 2048)
        : parsed.maxMemoryCacheMb;

      return {
        ...DEFAULT_PERFORMANCE_CONFIG,
        ...parsed,
        bufferSize: safeBuffer,
        maxMemoryCacheMb: safeRam,
        visualizerFps: parsed.visualizerFps || (isMobile ? 30 : 60),
        smartDspSleep: parsed.smartDspSleep ?? true,
        autoGlitchMitigation: parsed.autoGlitchMitigation ?? true,
        enableHighRamCache: parsed.enableHighRamCache ?? true,
      };
    }
  } catch {
    // Fall back to default on parse failure
  }
  return { ...DEFAULT_PERFORMANCE_CONFIG };
}

/**
 * Save performance configuration to localStorage.
 */
export function savePerformanceConfig(config: PerformanceConfig): void {
  try {
    localStorage.setItem(PERFORMANCE_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Safe fail if storage is full or private mode
  }
}

/**
 * Calculate approximate audio RAM usage for an AudioBuffer in Megabytes.
 */
export function calculateAudioBufferMemoryMb(buffer: AudioBuffer | null | undefined): number {
  if (!buffer) return 0;
  // 4 bytes per Float32 sample * numberOfChannels * length
  const bytes = buffer.length * buffer.numberOfChannels * 4;
  return Math.round((bytes / (1024 * 1024)) * 10) / 10;
}

/**
 * Extract waveform visual peaks using high-speed progressive subsampling.
 */
export function extractPeaksHighSpeed(buffer: AudioBuffer, numPoints = 80): number[] {
  const channelData = buffer.getChannelData(0);
  const totalSamples = channelData.length;
  if (totalSamples === 0) return new Array(numPoints).fill(0.05);

  const step = Math.max(1, Math.floor(totalSamples / numPoints));
  const peaks: number[] = new Array(numPoints);

  for (let i = 0; i < numPoints; i++) {
    const start = i * step;
    const end = Math.min(totalSamples, start + step);
    let max = 0;

    // Stride by 8 for instantaneous extraction without UI lockup
    const stride = Math.max(1, Math.floor((end - start) / 32));
    for (let j = start; j < end; j += stride) {
      const val = Math.abs(channelData[j] || 0);
      if (val > max) max = val;
    }
    peaks[i] = Math.min(1.0, Math.max(0.02, Math.round(max * 1000) / 1000));
  }

  return peaks;
}
