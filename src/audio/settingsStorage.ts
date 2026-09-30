import {
  AppThemeId,
  ExportQualityId,
  PresetWallpaperId,
  RenderSpeedId,
  SampleRateId,
  StudioSettings,
} from '../types';

export const SETTINGS_STORAGE_KEY = 'neuraltune_studio_settings_v2';

export const DEFAULT_STUDIO_SETTINGS: StudioSettings = {
  theme: 'cyber_midnight',
  backgroundType: 'none',
  presetWallpaper: 'cyberpunk_studio',
  customWallpaperUrl: null,
  wallpaperOpacity: 0.4,
  wallpaperBlur: 8,
  exportQuality: 'wav_24bit',
  sampleRate: 48000,
  renderSpeed: 'balanced_studio',
  defaultAutoMixPreset: 'fire_trap_master',
  defaultAutoMixStem: 'full_mix',
};

// Theme Definitions with UI swatches & styling
export interface ThemeOption {
  id: AppThemeId;
  name: string;
  tagline: string;
  bgClass: string;
  accentHex: string;
  glowColor: string;
  badge: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'cyber_midnight',
    name: 'Cyber Midnight',
    tagline: 'Deep slate-indigo with neon cyan glow (Default)',
    bgClass: 'bg-[#070b14]',
    accentHex: '#06b6d4',
    glowColor: 'from-cyan-500/20 to-blue-600/20',
    badge: 'STUDIO PRO',
  },
  {
    id: 'high_contrast',
    name: 'High Contrast',
    tagline: 'Ultra-crisp monochrome with vivid neon borders',
    bgClass: 'bg-black text-white',
    accentHex: '#38bdf8',
    glowColor: 'from-sky-500/30 to-slate-200/20',
    badge: 'MAX ACCESSIBILITY',
  },
  {
    id: 'oled_black',
    name: 'OLED Pitch Black',
    tagline: 'Pure #000000 black canvas for infinite depth',
    bgClass: 'bg-black',
    accentHex: '#10b981',
    glowColor: 'from-emerald-500/20 to-teal-500/20',
    badge: 'BATTERY SAVER',
  },
  {
    id: 'neon_cyberpunk',
    name: 'Neon Cyberpunk',
    tagline: 'Synthwave hot magenta and electric cyan aesthetic',
    bgClass: 'bg-[#0a0518]',
    accentHex: '#f43f5e',
    glowColor: 'from-rose-500/30 to-violet-600/30',
    badge: 'SYNTHWAVE',
  },
  {
    id: 'studio_gold',
    name: 'Studio Gold & Bronze',
    tagline: 'Vintage Neve / SSL analog recording console vibe',
    bgClass: 'bg-[#0e0c0a]',
    accentHex: '#f59e0b',
    glowColor: 'from-amber-500/25 to-yellow-600/20',
    badge: 'ANALOG CONSOLE',
  },
  {
    id: 'slate_producer',
    name: 'Slate Minimalist',
    tagline: 'Matte dark carbon titanium finish',
    bgClass: 'bg-[#0f1117]',
    accentHex: '#818cf8',
    glowColor: 'from-indigo-500/20 to-slate-600/20',
    badge: 'MINIMAL MATTE',
  },
];

// Preset Wallpaper Definitions (Generated offline via CSS gradients and SVG patterns)
export interface PresetWallpaperOption {
  id: PresetWallpaperId;
  name: string;
  description: string;
  gradientCss: string;
  patternType: 'grid' | 'dots' | 'waves' | 'wood' | 'console';
}

export const PRESET_WALLPAPERS: PresetWallpaperOption[] = [
  {
    id: 'cyberpunk_studio',
    name: 'Cyberpunk Control Room',
    description: 'Neon grid lines with atmospheric cyan/purple rim lights',
    gradientCss: 'radial-gradient(ellipse at 80% 10%, rgba(147, 51, 234, 0.25) 0%, transparent 60%), radial-gradient(ellipse at 15% 85%, rgba(6, 182, 212, 0.25) 0%, transparent 55%), linear-gradient(180deg, #070913 0%, #030408 100%)',
    patternType: 'grid',
  },
  {
    id: 'abbey_road',
    name: 'Abbey Road Vintage Studio',
    description: 'Warm analog wood diffuser panels and glowing vintage vacuum tubes',
    gradientCss: 'radial-gradient(ellipse at 50% 0%, rgba(217, 119, 6, 0.22) 0%, transparent 70%), radial-gradient(ellipse at 85% 90%, rgba(180, 83, 9, 0.15) 0%, transparent 60%), linear-gradient(180deg, #0f0b07 0%, #060402 100%)',
    patternType: 'wood',
  },
  {
    id: 'analog_ssl',
    name: 'SSL 4000 G+ Console',
    description: 'Legendary British mixing desk VU meters and carbon channel strips',
    gradientCss: 'radial-gradient(ellipse at 25% 15%, rgba(56, 189, 248, 0.2) 0%, transparent 50%), radial-gradient(ellipse at 75% 80%, rgba(245, 158, 11, 0.18) 0%, transparent 60%), linear-gradient(180deg, #0b0f14 0%, #040608 100%)',
    patternType: 'console',
  },
  {
    id: 'wood_acoustic',
    name: 'Acoustic Wood Live Room',
    description: 'Deep mahogany acoustic slat diffusers with soft studio spotlight',
    gradientCss: 'radial-gradient(circle at 50% 25%, rgba(249, 115, 22, 0.18) 0%, transparent 65%), linear-gradient(180deg, #130d09 0%, #080503 100%)',
    patternType: 'wood',
  },
  {
    id: 'deep_space',
    name: 'Deep Space Nebula',
    description: 'Mike Dean & Astroworld cosmic interstellar dust cloud',
    gradientCss: 'radial-gradient(ellipse at 20% 30%, rgba(168, 85, 247, 0.25) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(236, 72, 153, 0.2) 0%, transparent 55%), radial-gradient(ellipse at 50% 90%, rgba(59, 130, 246, 0.22) 0%, transparent 60%), linear-gradient(180deg, #06040f 0%, #020106 100%)',
    patternType: 'waves',
  },
  {
    id: 'dark_waveform',
    name: 'DSP Spectral Flux',
    description: 'Precision frequency response curves and digital oscilloscope lines',
    gradientCss: 'radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.2) 0%, transparent 70%), linear-gradient(180deg, #050d0a 0%, #020604 100%)',
    patternType: 'grid',
  },
];

// Export Quality Options
export interface ExportQualityOption {
  id: ExportQualityId;
  name: string;
  extension: string;
  bitDepthText: string;
  bitrateKbps: number;
  description: string;
  badge: string;
}

export const EXPORT_QUALITY_OPTIONS: ExportQualityOption[] = [
  {
    id: 'wav_24bit',
    name: '24-Bit Studio Master WAV',
    extension: '.wav',
    bitDepthText: '24-bit PCM (Lossless)',
    bitrateKbps: 2304,
    description: 'Industry standard for streaming distribution (Apple Music, Spotify, Tidal) & label delivery.',
    badge: 'RECOMMENDED',
  },
  {
    id: 'wav_16bit',
    name: '16-Bit Red Book CD WAV',
    extension: '.wav',
    bitDepthText: '16-bit PCM (Lossless)',
    bitrateKbps: 1411,
    description: 'Classic Compact Disc audio format. Universal compatibility with older hardware & car systems.',
    badge: 'CD STANDARD',
  },
  {
    id: 'wav_32float',
    name: '32-Bit IEEE Float WAV',
    extension: '.wav',
    bitDepthText: '32-bit Floating Point',
    bitrateKbps: 3072,
    description: 'Audiophile grade with infinite dynamic headroom. Prevents inter-sample overs & digital clipping.',
    badge: 'MAX HEADROOM',
  },
  {
    id: 'mp3_320',
    name: '320kbps High-Bitrate MP3',
    extension: '.mp3',
    bitDepthText: '320 kbps Constant Bitrate',
    bitrateKbps: 320,
    description: 'Maximum quality compressed audio. Ideal for email demos, social media, and mobile listening.',
    badge: 'SMALL FILE',
  },
];

// Render Speed / Buffer Size Options
export interface RenderSpeedOption {
  id: RenderSpeedId;
  name: string;
  bufferSize: number;
  oversampling: '1x' | '2x' | '4x';
  renderMultiplier: string;
  description: string;
  badge: string;
}

export const RENDER_SPEED_OPTIONS: RenderSpeedOption[] = [
  {
    id: 'draft_fast',
    name: 'Fast / Draft Render (1x)',
    bufferSize: 256,
    oversampling: '1x',
    renderMultiplier: '~15x real-time speed',
    description: 'Lightning-fast offline rendering for rapid arrangement checks and rough mixes.',
    badge: 'FASTEST',
  },
  {
    id: 'balanced_studio',
    name: 'Balanced Studio (2x Oversample)',
    bufferSize: 512,
    oversampling: '2x',
    renderMultiplier: '~7x real-time speed',
    description: 'Optimal balance of speed, clean harmonic saturation curves, and aliasing reduction.',
    badge: 'BALANCED',
  },
  {
    id: 'audiophile_offline',
    name: 'Audiophile Master (4x Oversample)',
    bufferSize: 1024,
    oversampling: '4x',
    renderMultiplier: '~3x real-time speed',
    description: 'Maximum precision offline math with 4x wave-shaper oversampling, pristine lookahead, and anti-aliased brickwall ceiling.',
    badge: 'HIGHEST QUALITY',
  },
];

// Sample Rate Options
export const SAMPLE_RATE_OPTIONS: { id: SampleRateId; label: string; tag: string }[] = [
  { id: 44100, label: '44.1 kHz (CD / Streaming)', tag: '44.1k' },
  { id: 48000, label: '48.0 kHz (Pro Studio & Video Default)', tag: '48k' },
  { id: 96000, label: '96.0 kHz (Hi-Res Audiophile Master)', tag: '96k' },
];

// Load Studio Settings from LocalStorage with safe fallbacks
export function loadStudioSettings(): StudioSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_STUDIO_SETTINGS };
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_STUDIO_SETTINGS };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_STUDIO_SETTINGS };
    }
    return {
      ...DEFAULT_STUDIO_SETTINGS,
      ...parsed,
      // Ensure specific fields always have valid fallbacks even if stored with an older schema
      defaultAutoMixPreset: parsed.defaultAutoMixPreset || DEFAULT_STUDIO_SETTINGS.defaultAutoMixPreset,
      defaultAutoMixStem: parsed.defaultAutoMixStem || DEFAULT_STUDIO_SETTINGS.defaultAutoMixStem,
      exportQuality: parsed.exportQuality || DEFAULT_STUDIO_SETTINGS.exportQuality,
      sampleRate: parsed.sampleRate || DEFAULT_STUDIO_SETTINGS.sampleRate,
      renderSpeed: parsed.renderSpeed || DEFAULT_STUDIO_SETTINGS.renderSpeed,
      theme: parsed.theme || DEFAULT_STUDIO_SETTINGS.theme,
    };
  } catch (err) {
    console.warn('Failed to parse saved studio settings from localStorage:', err);
    return { ...DEFAULT_STUDIO_SETTINGS };
  }
}

// Save Studio Settings to LocalStorage
export function saveStudioSettings(settings: StudioSettings): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch (err) {
    console.warn('Failed to save studio settings to localStorage:', err);
    // If quota exceeded due to custom wallpaper image, strip image and retry
    try {
      const stripped = { ...settings, customWallpaperUrl: null };
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(stripped));
      return true;
    } catch {
      return false;
    }
  }
}
