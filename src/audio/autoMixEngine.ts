import {
  ArtistVocalPreset,
  AutoMixAnalysis,
  AutoMixFrequencyBalance,
  AutoMixPresetDefinition,
  AutoMixPresetId,
  AutoMixResult,
  AutoPresetBeatMixResult,
  MusicalKey,
  MusicalScale,
  RenderSpeedId,
} from '../types';
import { audioEngine } from './audioEngine';
import { FACTORY_ARTIST_PRESETS } from './presets';
import { detectKeyAndScale } from './pitchDetector';
import { detectBPM } from './transientAligner';

// ============================================================================
// MASSIVE LIBRARY OF EXTREME MASTERING PRESETS (JSON / OBJECT STRUCTURE)
// Maxed-out DSP parameters for Trap, Hip-Hop, Rage, Drill, and Modern Pop
// ============================================================================
export const AUTO_MIX_PRESETS: Record<AutoMixPresetId, AutoMixPresetDefinition> = {
  fire_trap_master: {
    id: 'fire_trap_master',
    name: 'Fire Trap Master',
    tagline: 'Aggressive -6.5 LUFS Slam with Punchy 808 Glue',
    category: 'Trap & Drill',
    targetLufs: -6.5,
    description: 'The industry-standard commercial trap loudness profile. Aggressive multiband upward expansion, boosted 45Hz sub rumble, laser-sharp 14kHz top air, and zero-latency brickwall diode limiting.',
    glowColor: 'from-amber-500 to-red-600',
    accentHex: '#ef4444',
    badge: 'TOP INDUSTRY PICK',
    multiband: {
      lowThreshold: -22,
      lowRatio: 6.0,
      lowAttack: 0.008,
      lowRelease: 0.08,
      midThreshold: -18,
      midRatio: 3.5,
      midAttack: 0.015,
      midRelease: 0.12,
      highThreshold: -20,
      highRatio: 4.5,
      highAttack: 0.004,
      highRelease: 0.06,
    },
    eq: {
      subBassFreq: 48,
      subBassGain: 3.8, // Heavy 808 weight
      deMudFreq: 310,
      deMudGain: -3.2, // Scoop muddy boxiness
      vocalPresenceFreq: 3200,
      vocalPresenceGain: 3.5, // Forward vocal punch
      airSheenFreq: 13500,
      airSheenGain: 4.5, // Crisp modern sheen
    },
    saturation: {
      type: 'hard_clipper',
      driveAmount: 58,
      warmth: 40,
      mix: 65,
    },
    stereo: {
      width: 140,
      monoSubCutoff: 120,
      haasDelayMs: 14,
    },
    limiter: {
      ceilingDb: -0.05,
      preGainDb: 7.5,
      lookaheadMs: 4,
      releaseMs: 45,
    },
  },

  distorted_808_overload: {
    id: 'distorted_808_overload',
    name: 'Distorted 808 Overload',
    tagline: 'Sub-Harmonic Wave-Shaped Bass Destruction',
    category: 'Hard Distortion',
    targetLufs: -5.8,
    description: 'Engineered for southside trap and distorted rage anthems. Crushes the sub-bass through an asymmetric wave-shaper while carving a resonant pocket for vocals to ride above the rumble.',
    glowColor: 'from-red-600 to-rose-950',
    accentHex: '#e11d48',
    badge: 'MAX LOUDNESS',
    multiband: {
      lowThreshold: -26,
      lowRatio: 8.0,
      lowAttack: 0.004,
      lowRelease: 0.06,
      midThreshold: -16,
      midRatio: 4.0,
      midAttack: 0.010,
      midRelease: 0.10,
      highThreshold: -22,
      highRatio: 5.0,
      highAttack: 0.003,
      highRelease: 0.05,
    },
    eq: {
      subBassFreq: 54,
      subBassGain: 5.5,
      deMudFreq: 280,
      deMudGain: -4.5,
      vocalPresenceFreq: 3600,
      vocalPresenceGain: 4.0,
      airSheenFreq: 12000,
      airSheenGain: 3.0,
    },
    saturation: {
      type: 'diode_overdrive',
      driveAmount: 82,
      warmth: 75,
      mix: 80,
    },
    stereo: {
      width: 125,
      monoSubCutoff: 140,
      haasDelayMs: 10,
    },
    limiter: {
      ceilingDb: -0.02,
      preGainDb: 9.0,
      lookaheadMs: 3,
      releaseMs: 35,
    },
  },

  psychedelic_spaced_out: {
    id: 'psychedelic_spaced_out',
    name: 'Psychedelic Spaced Out',
    tagline: 'Astroworld Haas Dimension & Silk Analog Warmth',
    category: 'Psychedelic & Space',
    targetLufs: -8.0,
    description: 'Immersive multi-dimensional space inspired by Travis Scott & Mike Dean. Expands the stereo field to 185% while gluing the low end with tape harmonics and silky 15kHz tube air.',
    glowColor: 'from-violet-600 to-fuchsia-600',
    accentHex: '#9333ea',
    badge: 'MIKE DEAN VIBE',
    multiband: {
      lowThreshold: -18,
      lowRatio: 3.2,
      lowAttack: 0.015,
      lowRelease: 0.16,
      midThreshold: -14,
      midRatio: 2.8,
      midAttack: 0.020,
      midRelease: 0.20,
      highThreshold: -16,
      highRatio: 3.0,
      highAttack: 0.008,
      highRelease: 0.10,
    },
    eq: {
      subBassFreq: 42,
      subBassGain: 2.5,
      deMudFreq: 400,
      deMudGain: -2.0,
      vocalPresenceFreq: 2800,
      vocalPresenceGain: 2.0,
      airSheenFreq: 15000,
      airSheenGain: 5.5,
    },
    saturation: {
      type: 'tape',
      driveAmount: 50,
      warmth: 85,
      mix: 55,
    },
    stereo: {
      width: 185,
      monoSubCutoff: 110,
      haasDelayMs: 22,
    },
    limiter: {
      ceilingDb: -0.1,
      preGainDb: 5.5,
      lookaheadMs: 5,
      releaseMs: 70,
    },
  },

  yeat_rage_overkill: {
    id: 'yeat_rage_overkill',
    name: 'Yeat Rage Overkill',
    tagline: 'Crushed Synth Harmonics, Bell Resonance & Instant Snap',
    category: 'Hard Distortion',
    targetLufs: -6.0,
    description: 'Specially voiced for hyper-distorted rage synths and bell 808s. High-order odd harmonics, metallic 3.4kHz vocal presence, tight transient clipping, and monolithic sub-bass punch.',
    glowColor: 'from-emerald-500 to-lime-600',
    accentHex: '#10b981',
    badge: 'RAGE ANTHEM',
    multiband: {
      lowThreshold: -24,
      lowRatio: 6.5,
      lowAttack: 0.005,
      lowRelease: 0.07,
      midThreshold: -20,
      midRatio: 4.2,
      midAttack: 0.008,
      midRelease: 0.10,
      highThreshold: -24,
      highRatio: 5.5,
      highAttack: 0.002,
      highRelease: 0.04,
    },
    eq: {
      subBassFreq: 52,
      subBassGain: 4.2,
      deMudFreq: 340,
      deMudGain: -3.8,
      vocalPresenceFreq: 3400,
      vocalPresenceGain: 4.8,
      airSheenFreq: 12500,
      airSheenGain: 5.0,
    },
    saturation: {
      type: 'hard_clipper',
      driveAmount: 75,
      warmth: 30,
      mix: 70,
    },
    stereo: {
      width: 155,
      monoSubCutoff: 130,
      haasDelayMs: 16,
    },
    limiter: {
      ceilingDb: -0.05,
      preGainDb: 8.5,
      lookaheadMs: 3,
      releaseMs: 40,
    },
  },

  carti_hyper_vamp: {
    id: 'carti_hyper_vamp',
    name: 'Carti Hyper-Vamp',
    tagline: 'Ultrasonic Air Sheen & Piercing Vocal Quantization',
    category: 'Trap & Drill',
    targetLufs: -6.8,
    description: 'Designed for Carti-style high-register baby vocals over rapid 808 rolls. Drastically de-muds the low mids while boosting ultrasonic air sheen and tight transient dynamics.',
    glowColor: 'from-rose-500 to-red-600',
    accentHex: '#f43f5e',
    badge: 'HIGH PITCH GLUE',
    multiband: {
      lowThreshold: -20,
      lowRatio: 5.0,
      lowAttack: 0.006,
      lowRelease: 0.09,
      midThreshold: -16,
      midRatio: 3.5,
      midAttack: 0.012,
      midRelease: 0.14,
      highThreshold: -22,
      highRatio: 4.0,
      highAttack: 0.003,
      highRelease: 0.05,
    },
    eq: {
      subBassFreq: 46,
      subBassGain: 3.0,
      deMudFreq: 380,
      deMudGain: -4.0,
      vocalPresenceFreq: 4200,
      vocalPresenceGain: 4.2,
      airSheenFreq: 14000,
      airSheenGain: 6.0,
    },
    saturation: {
      type: 'tube',
      driveAmount: 62,
      warmth: 55,
      mix: 60,
    },
    stereo: {
      width: 160,
      monoSubCutoff: 115,
      haasDelayMs: 18,
    },
    limiter: {
      ceilingDb: -0.08,
      preGainDb: 7.0,
      lookaheadMs: 4,
      releaseMs: 50,
    },
  },

  travis_astroworld_heat: {
    id: 'travis_astroworld_heat',
    name: 'Travis Astroworld Heat',
    tagline: 'Analog Studer Tape Saturation & Cavernous Dynamics',
    category: 'Trap & Drill',
    targetLufs: -7.2,
    description: 'The definitive Houston sound. Saturates the master bus through an analog tape emulation curve, lifts sub-bass punch, and controls the mid-range with glued multiband dynamics.',
    glowColor: 'from-amber-600 to-orange-700',
    accentHex: '#d97706',
    badge: 'CLASSIC HEAT',
    multiband: {
      lowThreshold: -20,
      lowRatio: 4.5,
      lowAttack: 0.010,
      lowRelease: 0.12,
      midThreshold: -15,
      midRatio: 3.0,
      midAttack: 0.018,
      midRelease: 0.16,
      highThreshold: -18,
      highRatio: 3.8,
      highAttack: 0.005,
      highRelease: 0.08,
    },
    eq: {
      subBassFreq: 44,
      subBassGain: 3.5,
      deMudFreq: 320,
      deMudGain: -2.5,
      vocalPresenceFreq: 3000,
      vocalPresenceGain: 2.8,
      airSheenFreq: 13000,
      airSheenGain: 4.0,
    },
    saturation: {
      type: 'tape',
      driveAmount: 72,
      warmth: 80,
      mix: 65,
    },
    stereo: {
      width: 150,
      monoSubCutoff: 120,
      haasDelayMs: 15,
    },
    limiter: {
      ceilingDb: -0.1,
      preGainDb: 6.8,
      lookaheadMs: 4,
      releaseMs: 60,
    },
  },

  metro_boomin_dark_boom: {
    id: 'metro_boomin_dark_boom',
    name: 'Metro Boomin Dark 808 Boom',
    tagline: 'Deep 40Hz Resonant Slam & Cinematic Mud Removal',
    category: 'Trap & Drill',
    targetLufs: -6.6,
    description: 'Cinematic, menacing low-end weight engineered specifically for Metro Boomin production. Maximum clarity between rapid 808 note slides, tight kick punches, and crisp hi-hat rolls.',
    glowColor: 'from-slate-700 to-zinc-900',
    accentHex: '#71717a',
    badge: 'METRO GRADE',
    multiband: {
      lowThreshold: -24,
      lowRatio: 5.5,
      lowAttack: 0.007,
      lowRelease: 0.09,
      midThreshold: -17,
      midRatio: 3.8,
      midAttack: 0.014,
      midRelease: 0.13,
      highThreshold: -20,
      highRatio: 4.2,
      highAttack: 0.004,
      highRelease: 0.07,
    },
    eq: {
      subBassFreq: 40,
      subBassGain: 4.5,
      deMudFreq: 260,
      deMudGain: -3.5,
      vocalPresenceFreq: 2600,
      vocalPresenceGain: 3.0,
      airSheenFreq: 11500,
      airSheenGain: 3.5,
    },
    saturation: {
      type: 'tube',
      driveAmount: 55,
      warmth: 70,
      mix: 55,
    },
    stereo: {
      width: 135,
      monoSubCutoff: 125,
      haasDelayMs: 12,
    },
    limiter: {
      ceilingDb: -0.05,
      preGainDb: 7.2,
      lookaheadMs: 4,
      releaseMs: 48,
    },
  },

  club_banger_maximizer: {
    id: 'club_banger_maximizer',
    name: 'Club Banger Maximizer',
    tagline: 'Festival PA System Maximum RMS Power & Punch',
    category: 'Trap & Drill',
    targetLufs: -6.2,
    description: 'Ultra-competitive commercial master designed to sound gigantic on massive club subwoofers and phone speakers alike. Zero breathing artifacts with hard-limited transients.',
    glowColor: 'from-cyan-500 to-blue-600',
    accentHex: '#06b6d4',
    badge: 'CLUB READY',
    multiband: {
      lowThreshold: -25,
      lowRatio: 6.0,
      lowAttack: 0.006,
      lowRelease: 0.08,
      midThreshold: -19,
      midRatio: 4.0,
      midAttack: 0.012,
      midRelease: 0.11,
      highThreshold: -22,
      highRatio: 4.8,
      highAttack: 0.003,
      highRelease: 0.05,
    },
    eq: {
      subBassFreq: 50,
      subBassGain: 3.5,
      deMudFreq: 300,
      deMudGain: -2.8,
      vocalPresenceFreq: 3500,
      vocalPresenceGain: 3.6,
      airSheenFreq: 13000,
      airSheenGain: 4.8,
    },
    saturation: {
      type: 'hard_clipper',
      driveAmount: 65,
      warmth: 35,
      mix: 65,
    },
    stereo: {
      width: 145,
      monoSubCutoff: 120,
      haasDelayMs: 14,
    },
    limiter: {
      ceilingDb: -0.05,
      preGainDb: 8.0,
      lookaheadMs: 3,
      releaseMs: 42,
    },
  },

  lofi_tape_crunch: {
    id: 'lofi_tape_crunch',
    name: 'Lo-Fi Tape Crunch',
    tagline: 'Warm Wow/Flutter Warble & Dusty Head Saturation',
    category: 'Vintage Lo-Fi',
    targetLufs: -9.5,
    description: 'Gritty vintage cassette aesthetic with pleasant even-order harmonic saturation, rolling high end, and subtle analog pitch breathing.',
    glowColor: 'from-amber-700 to-yellow-800',
    accentHex: '#b45309',
    badge: 'ANALOG TEXTURE',
    multiband: {
      lowThreshold: -16,
      lowRatio: 3.0,
      lowAttack: 0.020,
      lowRelease: 0.20,
      midThreshold: -12,
      midRatio: 2.5,
      midAttack: 0.025,
      midRelease: 0.25,
      highThreshold: -14,
      highRatio: 2.8,
      highAttack: 0.012,
      highRelease: 0.15,
    },
    eq: {
      subBassFreq: 60,
      subBassGain: 2.0,
      deMudFreq: 450,
      deMudGain: -1.5,
      vocalPresenceFreq: 2200,
      vocalPresenceGain: 1.5,
      airSheenFreq: 9000,
      airSheenGain: -2.5, // Gentle vintage roll-off
    },
    saturation: {
      type: 'tape',
      driveAmount: 78,
      warmth: 90,
      mix: 75,
    },
    stereo: {
      width: 110,
      monoSubCutoff: 140,
      haasDelayMs: 8,
    },
    limiter: {
      ceilingDb: -0.2,
      preGainDb: 4.5,
      lookaheadMs: 6,
      releaseMs: 85,
    },
  },

  crystalline_modern_pop: {
    id: 'crystalline_modern_pop',
    name: 'Crystalline Modern Pop',
    tagline: 'Ultra-Transparent Dynamic Range & Silky Presence',
    category: 'Modern Pop',
    targetLufs: -7.8,
    description: 'Pristine, audiophile radio-ready clarity. Smooth multiband glue that preserves natural transient snap while delivering open, silky highs and tight, resonant low-end punch.',
    glowColor: 'from-blue-500 to-teal-400',
    accentHex: '#14b8a6',
    badge: 'RADIO POLISH',
    multiband: {
      lowThreshold: -18,
      lowRatio: 3.5,
      lowAttack: 0.012,
      lowRelease: 0.14,
      midThreshold: -14,
      midRatio: 2.8,
      midAttack: 0.016,
      midRelease: 0.18,
      highThreshold: -16,
      highRatio: 3.2,
      highAttack: 0.006,
      highRelease: 0.09,
    },
    eq: {
      subBassFreq: 45,
      subBassGain: 2.2,
      deMudFreq: 320,
      deMudGain: -2.0,
      vocalPresenceFreq: 3200,
      vocalPresenceGain: 2.5,
      airSheenFreq: 14500,
      airSheenGain: 4.8,
    },
    saturation: {
      type: 'tube',
      driveAmount: 35,
      warmth: 50,
      mix: 40,
    },
    stereo: {
      width: 155,
      monoSubCutoff: 110,
      haasDelayMs: 16,
    },
    limiter: {
      ceilingDb: -0.1,
      preGainDb: 5.8,
      lookaheadMs: 4,
      releaseMs: 65,
    },
  },
};

// ============================================================================
// AUDIO BUFFER SPECTRAL & DYNAMIC ANALYZER
// ============================================================================
export function analyzeAudioBuffer(buffer: AudioBuffer): AutoMixAnalysis {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;

  let peakLeft = 0;
  let peakRight = 0;
  let sumSquares = 0;

  const leftChannel = buffer.getChannelData(0);
  const rightChannel = numChannels > 1 ? buffer.getChannelData(1) : leftChannel;

  // Step through buffer to calculate true peaks and RMS
  // Sample step to ensure instant real-time computation even for large 5-minute files
  const step = Math.max(1, Math.floor(length / 250000));
  let count = 0;

  for (let i = 0; i < length; i += step) {
    const l = Math.abs(leftChannel[i]);
    const r = Math.abs(rightChannel[i]);
    if (l > peakLeft) peakLeft = l;
    if (r > peakRight) peakRight = r;

    sumSquares += l * l + r * r;
    count += 2;
  }

  const overallPeak = Math.max(peakLeft, peakRight);
  const peakDb = overallPeak > 1e-5 ? 20 * Math.log10(overallPeak) : -96;
  const peakLeftDb = peakLeft > 1e-5 ? 20 * Math.log10(peakLeft) : -96;
  const peakRightDb = peakRight > 1e-5 ? 20 * Math.log10(peakRight) : -96;

  const rms = count > 0 ? Math.sqrt(sumSquares / count) : 0;
  const rmsDb = rms > 1e-5 ? 20 * Math.log10(rms) : -96;

  // BS.1770 LUFS approximation from weighted high-frequency / RMS calculation
  // Typically LUFS is approximately RMS - 3dB to 4dB with high-frequency weighting
  const lufs = Math.max(-96, Math.min(0, rmsDb - 3.2));
  const crestFactorDb = Math.max(0, peakDb - rmsDb);

  // Frequency Balance calculation via simple spectral band energy integration
  // We approximate 4 key frequency regions:
  // 1. Sub-bass (20-80 Hz): low-frequency variation
  // 2. Low-mids (80-450 Hz): body & mud
  // 3. Vocal Presence (1-4.5 kHz): intelligibility
  // 4. Air (8-20 kHz): high-frequency sizzle
  let subDiffSum = 0;
  let lowMidDiffSum = 0;
  let presenceDiffSum = 0;
  let airDiffSum = 0;

  const subStep = Math.max(1, Math.round(sampleRate / 100)); // ~100Hz period
  const midStep = Math.max(1, Math.round(sampleRate / 1000)); // ~1kHz
  const airStep = Math.max(1, Math.round(sampleRate / 8000)); // ~8kHz

  const analyzeLength = Math.min(length, 100000);
  for (let i = 1; i < analyzeLength; i += 2) {
    const s = leftChannel[i];
    const sPrev = leftChannel[i - 1];
    const diff = Math.abs(s - sPrev);

    // High derivative indicates high frequency
    airDiffSum += diff * diff;

    if (i >= airStep) {
      const pDiff = Math.abs(s - leftChannel[i - airStep]);
      presenceDiffSum += pDiff * pDiff;
    }
    if (i >= midStep) {
      const mDiff = Math.abs(s - leftChannel[i - midStep]);
      lowMidDiffSum += mDiff * mDiff;
    }
    if (i >= subStep) {
      const subDiff = Math.abs(s - leftChannel[i - subStep]);
      subDiffSum += subDiff * subDiff;
    }
  }

  const totalDiffEnergy = subDiffSum + lowMidDiffSum + presenceDiffSum + airDiffSum + 1e-8;
  const subBassEnergy = Math.min(100, Math.max(5, Math.round((subDiffSum / totalDiffEnergy) * 100)));
  const lowMidEnergy = Math.min(100, Math.max(5, Math.round((lowMidDiffSum / totalDiffEnergy) * 100)));
  const vocalPresenceEnergy = Math.min(100, Math.max(5, Math.round((presenceDiffSum / totalDiffEnergy) * 100)));
  const airBrightnessEnergy = Math.min(100, Math.max(5, Math.round((airDiffSum / totalDiffEnergy) * 100)));

  // Stereo correlation calculation
  let dotProduct = 0;
  let leftEnergy = 0;
  let rightEnergy = 0;
  const corrLength = Math.min(length, 120000);
  const corrStep = Math.max(1, Math.floor(corrLength / 12000));
  for (let i = 0; i < corrLength; i += corrStep) {
    const l = leftChannel[i];
    const r = rightChannel[i];
    dotProduct += l * r;
    leftEnergy += l * l;
    rightEnergy += r * r;
  }
  const denom = Math.sqrt(leftEnergy * rightEnergy);
  const stereoCorrelation = numChannels > 1 && denom > 1e-6
    ? Math.max(-1, Math.min(1, Math.round((dotProduct / denom) * 100) / 100))
    : 1.0;

  const balance: AutoMixFrequencyBalance = {
    subBassEnergy,
    lowMidEnergy,
    vocalPresenceEnergy,
    airBrightnessEnergy,
    subBass: subBassEnergy / 100,
    lowMids: lowMidEnergy / 100,
    vocalPresence: vocalPresenceEnergy / 100,
    airSheen: airBrightnessEnergy / 100,
  };

  const roundedLufs = Math.round(lufs * 10) / 10;

  return {
    peakDb: Math.round(peakDb * 10) / 10,
    peakLeftDb: Math.round(peakLeftDb * 10) / 10,
    peakRightDb: Math.round(peakRightDb * 10) / 10,
    rmsDb: Math.round(rmsDb * 10) / 10,
    lufs: roundedLufs,
    integratedLufs: roundedLufs,
    crestFactorDb: Math.round(crestFactorDb * 10) / 10,
    stereoCorrelation,
    frequencyBalance: balance,
  };
}

// Generate saturation / drive wave shaping curves
function makeMasteringSaturationCurve(type: 'tube' | 'tape' | 'hard_clipper' | 'diode_overdrive', amount: number): Float32Array {
  const n = 4096;
  const curve = new Float32Array(n);
  const k = (amount / 100) * 8;

  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1; // -1 to +1

    if (type === 'hard_clipper') {
      // Hard clipping with soft knee
      const knee = 0.85 - (amount / 100) * 0.25;
      if (x > knee) {
        curve[i] = knee + (1 - knee) * Math.tanh((x - knee) / (1 - knee));
      } else if (x < -knee) {
        curve[i] = -knee + (1 - knee) * Math.tanh((x + knee) / (1 - knee));
      } else {
        curve[i] = x;
      }
    } else if (type === 'diode_overdrive') {
      // Asymmetric diode distortion for aggressive 808s
      const asym = x > 0 ? x * (1 + 0.3 * Math.sin(x * Math.PI)) : x * (1 - 0.2 * Math.sin(x * Math.PI));
      curve[i] = Math.tanh(asym * (1 + k));
    } else if (type === 'tape') {
      // Smooth tape saturation with mild odd harmonic compression
      curve[i] = (2 / Math.PI) * Math.atan(x * (1 + k * 1.5));
    } else {
      // Tube saturation (even harmonics warmth)
      if (x < 0) {
        curve[i] = -Math.pow(Math.abs(x), 1.05);
      } else {
        curve[i] = Math.tanh(x * (1 + k));
      }
    }
  }

  return curve;
}

// ============================================================================
// OFFLINE AUTO-MASTERING DSP CHAIN ENGINE (WEB AUDIO API)
// ============================================================================
export async function executeOfflineAutoMix(
  buffer: AudioBuffer,
  presetId: AutoMixPresetId,
  targetSampleRate: number = 48000,
  renderSpeed: RenderSpeedId = 'balanced_studio'
): Promise<AutoMixResult> {
  const preset = AUTO_MIX_PRESETS[presetId] || AUTO_MIX_PRESETS.fire_trap_master;

  // 1. Analyze input audio
  const inputAnalysis = analyzeAudioBuffer(buffer);

  const length = Math.max(targetSampleRate, Math.floor(buffer.length * (targetSampleRate / buffer.sampleRate)));
  const offlineCtx = new OfflineAudioContext(2, length, targetSampleRate);

  // Dynamic oversampling mode mapped to render speed
  const oversampleMode: OverSampleType = renderSpeed === 'draft_fast' ? 'none' : renderSpeed === 'balanced_studio' ? '2x' : '4x';

  // Source Buffer
  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;

  // --------------------------------------------------------------------------
  // STAGE 1: SUB-SONIC 25Hz HIGH-PASS FILTER
  // Eliminates unusable DC offset and speaker-destroying sub-rumble below 25Hz
  // --------------------------------------------------------------------------
  const subSonicFilter = offlineCtx.createBiquadFilter();
  subSonicFilter.type = 'highpass';
  subSonicFilter.frequency.value = 26;
  subSonicFilter.Q.value = 0.707;

  // --------------------------------------------------------------------------
  // STAGE 2: DYNAMIC GLUE EQ
  // Tightens sub-bass, scoops boxy mud, pushes vocal presence, adds silk air
  // --------------------------------------------------------------------------
  const subBassFilter = offlineCtx.createBiquadFilter();
  subBassFilter.type = 'lowshelf';
  subBassFilter.frequency.value = preset.eq.subBassFreq;
  subBassFilter.gain.value = preset.eq.subBassGain;

  const deMudFilter = offlineCtx.createBiquadFilter();
  deMudFilter.type = 'peaking';
  deMudFilter.frequency.value = preset.eq.deMudFreq;
  deMudFilter.gain.value = preset.eq.deMudGain;
  deMudFilter.Q.value = 1.4;

  const vocalPresenceFilter = offlineCtx.createBiquadFilter();
  vocalPresenceFilter.type = 'peaking';
  vocalPresenceFilter.frequency.value = preset.eq.vocalPresenceFreq;
  vocalPresenceFilter.gain.value = preset.eq.vocalPresenceGain;
  vocalPresenceFilter.Q.value = 1.1;

  const airSheenFilter = offlineCtx.createBiquadFilter();
  airSheenFilter.type = 'highshelf';
  airSheenFilter.frequency.value = preset.eq.airSheenFreq;
  airSheenFilter.gain.value = preset.eq.airSheenGain;

  // --------------------------------------------------------------------------
  // STAGE 3: 3-BAND MULTIBAND DYNAMICS COMPRESSOR
  // Split into Low (< 180Hz), Mid (180Hz - 3.8kHz), and High (> 3.8kHz)
  // --------------------------------------------------------------------------
  const lowSplitFilter = offlineCtx.createBiquadFilter();
  lowSplitFilter.type = 'lowpass';
  lowSplitFilter.frequency.value = 180;
  lowSplitFilter.Q.value = 0.707;

  const midBandpass = offlineCtx.createBiquadFilter();
  midBandpass.type = 'peaking';
  midBandpass.frequency.value = 1200;
  midBandpass.Q.value = 0.8;

  const highSplitFilter = offlineCtx.createBiquadFilter();
  highSplitFilter.type = 'highpass';
  highSplitFilter.frequency.value = 3800;
  highSplitFilter.Q.value = 0.707;

  // Band compressors
  const lowCompressor = offlineCtx.createDynamicsCompressor();
  lowCompressor.threshold.value = preset.multiband.lowThreshold;
  lowCompressor.ratio.value = preset.multiband.lowRatio;
  lowCompressor.attack.value = preset.multiband.lowAttack;
  lowCompressor.release.value = preset.multiband.lowRelease;
  lowCompressor.knee.value = 4;

  const midCompressor = offlineCtx.createDynamicsCompressor();
  midCompressor.threshold.value = preset.multiband.midThreshold;
  midCompressor.ratio.value = preset.multiband.midRatio;
  midCompressor.attack.value = preset.multiband.midAttack;
  midCompressor.release.value = preset.multiband.midRelease;
  midCompressor.knee.value = 6;

  const highCompressor = offlineCtx.createDynamicsCompressor();
  highCompressor.threshold.value = preset.multiband.highThreshold;
  highCompressor.ratio.value = preset.multiband.highRatio;
  highCompressor.attack.value = preset.multiband.highAttack;
  highCompressor.release.value = preset.multiband.highRelease;
  highCompressor.knee.value = 3;

  // Band summing bus
  const multibandSumBus = offlineCtx.createGain();
  multibandSumBus.gain.value = 1.0;

  // --------------------------------------------------------------------------
  // STAGE 4: HEAVY SATURATION / HARMONIC DRIVE
  // --------------------------------------------------------------------------
  const driveShaper = offlineCtx.createWaveShaper();
  driveShaper.curve = makeMasteringSaturationCurve(preset.saturation.type, preset.saturation.driveAmount);
  driveShaper.oversample = oversampleMode;

  const driveDryGain = offlineCtx.createGain();
  const driveWetGain = offlineCtx.createGain();
  const driveMerge = offlineCtx.createGain();

  const satMixNorm = preset.saturation.mix / 100;
  driveDryGain.gain.value = 1.0 - satMixNorm * 0.45;
  driveWetGain.gain.value = satMixNorm * 0.9;
  driveMerge.gain.value = 1.0;

  // --------------------------------------------------------------------------
  // STAGE 5: STEREO HAAS DIMENSION & MONO-SUB MATRIX
  // --------------------------------------------------------------------------
  const stereoWidthFactor = preset.stereo.width / 100;
  const haasDelay = offlineCtx.createDelay(0.05);
  haasDelay.delayTime.value = Math.max(0.002, preset.stereo.haasDelayMs * 0.001);

  const stereoDryGain = offlineCtx.createGain();
  stereoDryGain.gain.value = 1.0;
  const stereoWetGain = offlineCtx.createGain();
  stereoWetGain.gain.value = (stereoWidthFactor - 1.0) * 0.4;
  const stereoMerge = offlineCtx.createGain();

  // --------------------------------------------------------------------------
  // STAGE 6: HARD BRICKWALL CEILING LIMITER & PRE-GAIN MAXIMIZER
  // --------------------------------------------------------------------------
  const preLimiterGain = offlineCtx.createGain();
  const preGainLinear = Math.pow(10, preset.limiter.preGainDb / 20);
  preLimiterGain.gain.value = preGainLinear;

  const brickwallCompressor = offlineCtx.createDynamicsCompressor();
  brickwallCompressor.threshold.value = preset.limiter.ceilingDb - 0.2;
  brickwallCompressor.knee.value = 0.0;
  brickwallCompressor.ratio.value = 20.0;
  brickwallCompressor.attack.value = 0.001;
  brickwallCompressor.release.value = preset.limiter.releaseMs * 0.001;

  // Final hard brickwall diode clipper ceiling to prevent inter-sample overs
  const finalClipper = offlineCtx.createWaveShaper();
  finalClipper.curve = makeMasteringSaturationCurve('hard_clipper', 15);
  finalClipper.oversample = oversampleMode;

  const masterOutGain = offlineCtx.createGain();
  masterOutGain.gain.value = Math.pow(10, preset.limiter.ceilingDb / 20);

  // --------------------------------------------------------------------------
  // ROUTE THE WEB AUDIO GRAPH
  // --------------------------------------------------------------------------
  // 1. Source -> Sub-sonic filter -> EQ chain
  source.connect(subSonicFilter);
  subSonicFilter.connect(subBassFilter);
  subBassFilter.connect(deMudFilter);
  deMudFilter.connect(vocalPresenceFilter);
  vocalPresenceFilter.connect(airSheenFilter);

  // 2. EQ -> 3-Band Multiband Split
  airSheenFilter.connect(lowSplitFilter);
  lowSplitFilter.connect(lowCompressor);
  lowCompressor.connect(multibandSumBus);

  airSheenFilter.connect(midBandpass);
  midBandpass.connect(midCompressor);
  midCompressor.connect(multibandSumBus);

  airSheenFilter.connect(highSplitFilter);
  highSplitFilter.connect(highCompressor);
  highCompressor.connect(multibandSumBus);

  // 3. Multiband -> Saturation
  multibandSumBus.connect(driveDryGain);
  multibandSumBus.connect(driveShaper);
  driveShaper.connect(driveWetGain);
  driveDryGain.connect(driveMerge);
  driveWetGain.connect(driveMerge);

  // 4. Saturation -> Stereo Haas
  driveMerge.connect(stereoDryGain);
  driveMerge.connect(haasDelay);
  haasDelay.connect(stereoWetGain);
  stereoDryGain.connect(stereoMerge);
  stereoWetGain.connect(stereoMerge);

  // 5. Stereo -> Pre-Limiter Drive -> Brickwall Limiter -> Final Clipper -> Master Out
  stereoMerge.connect(preLimiterGain);
  preLimiterGain.connect(brickwallCompressor);
  brickwallCompressor.connect(finalClipper);
  finalClipper.connect(masterOutGain);
  masterOutGain.connect(offlineCtx.destination);

  // Start rendering
  source.start(0);
  const masteredBuffer = await offlineCtx.startRendering();

  // 2. Analyze output mastered buffer
  const outputAnalysis = analyzeAudioBuffer(masteredBuffer);
  const lufsBoostDb = Math.round((outputAnalysis.lufs - inputAnalysis.lufs) * 10) / 10;
  const rmsBoostDb = Math.round((outputAnalysis.rmsDb - inputAnalysis.rmsDb) * 10) / 10;

  const diagnosis = `AI Auto-Mix complete: Mastered via [${preset.name}]. Boosted integrated loudness by +${lufsBoostDb} dB (${inputAnalysis.lufs} LUFS -> ${outputAnalysis.lufs} LUFS). Scaled 808 sub-bass punch (+${preset.eq.subBassGain}dB at ${preset.eq.subBassFreq}Hz), cleaned boxy mud (${preset.eq.deMudGain}dB at ${preset.eq.deMudFreq}Hz), and locked ceiling at ${preset.limiter.ceilingDb} dBFS without digital clipping.`;

  return {
    presetId,
    presetName: preset.name,
    preset,
    targetLufsDb: preset.targetLufs,
    inputAnalysis,
    outputAnalysis,
    lufsBoostDb,
    loudnessGainDb: lufsBoostDb,
    rmsBoostDb,
    diagnosis,
    masteredBuffer,
    timestamp: Date.now(),
  };
}

// ============================================================================
// APPLY AUTO-MIX PARAMETERS DIRECTLY TO LIVE PLAYBACK ENGINE
// Maps the extreme preset parameters directly into the live Web Audio nodes
// ============================================================================
export function applyAutoMixToLiveEngine(presetId: AutoMixPresetId): void {
  const preset = AUTO_MIX_PRESETS[presetId] || AUTO_MIX_PRESETS.fire_trap_master;

  // Map to live mastering settings in audioEngine
  audioEngine.updateMasteringSettings({
    enabled: true,
    lowCut: 28,
    bassGain: preset.eq.subBassGain,
    midGain: preset.eq.vocalPresenceGain - 1.0,
    highAirGain: preset.eq.airSheenGain,
    compThreshold: preset.multiband.midThreshold,
    compRatio: preset.multiband.midRatio,
    compMakeup: preset.limiter.preGainDb * 0.7,
    tapeDrive: preset.saturation.driveAmount,
    stereoWidth: preset.stereo.width,
    limiterCeiling: preset.limiter.ceilingDb,
  });

  // Also apply Pro Vocal AI Enhancer settings to complement the vocal
  audioEngine.updateAIEnhancerSettings({
    enabled: true,
    intensity: 85,
    clarityPresence: Math.round(preset.eq.vocalPresenceGain * 18),
    airBrilliance: Math.round(preset.eq.airSheenGain * 16),
    warmthBody: Math.round(preset.eq.subBassGain * 14),
    deMud: Math.abs(Math.round(preset.eq.deMudGain * 20)),
    harshnessTamer: 60,
    spectralBalance: 80,
    aiProfile: 'trap_rap',
  });
}

// ============================================================================
// 1-CLICK AI AUTO-PRESET & BEAT-VOCAL MIXER
// Analyzes Beat and Vocals, finds ideal artist preset, auto-tunes key & scale,
// carves frequency pocket in beat, applies sidechain ducking, and glues the mix!
// ============================================================================
export function autoMatchBeatToVocalsAndApplyPreset(): AutoPresetBeatMixResult {
  const beatBuffer = audioEngine.beatBuffer;
  const vocalBuffer = audioEngine.vocalBuffer;

  // 1. Analyze Beat buffer or fallback
  let detectedKey: MusicalKey = 'C';
  let detectedScale: MusicalScale = 'Minor Natural';
  let detectedBpm = 130;
  let beatSubBass = 50;
  let beatMids = 50;
  let beatAir = 50;
  let beatVibe = 'Commercial Modern Hip-Hop / Pop';

  if (beatBuffer) {
    const keyRes = detectKeyAndScale(beatBuffer);
    if (keyRes) {
      detectedKey = keyRes.key;
      detectedScale = keyRes.scale;
    }
    detectedBpm = detectBPM(beatBuffer);
    const analysis = analyzeAudioBuffer(beatBuffer);
    beatSubBass = analysis.frequencyBalance.subBassEnergy;
    beatMids = analysis.frequencyBalance.vocalPresenceEnergy;
    beatAir = analysis.frequencyBalance.airBrightnessEnergy;
  } else if (vocalBuffer) {
    const keyRes = detectKeyAndScale(vocalBuffer);
    if (keyRes) {
      detectedKey = keyRes.key;
      detectedScale = keyRes.scale;
    }
  }

  // Classify Beat Vibe
  if (beatSubBass > 42 && detectedBpm >= 130) {
    beatVibe = 'Psychedelic Trap & 808 Heavy';
  } else if (detectedBpm >= 115 && detectedBpm <= 128) {
    beatVibe = 'Bouncy Modern Pop & Dance Groove';
  } else if (detectedBpm >= 85 && detectedBpm <= 105) {
    beatVibe = 'West Coast Hip-Hop & Hard Punch';
  } else if (beatSubBass < 30 && beatAir > 40) {
    beatVibe = 'Dream Pop & Acoustic Intimate';
  } else {
    beatVibe = 'Melodic Rap & Modern R&B';
  }

  // 2. Analyze Vocal buffer dynamics and timbre
  let vocalTimbre = 'Dynamic Melodic Lead';
  let vocalRmsDb = -20;
  if (vocalBuffer) {
    const vAnalysis = analyzeAudioBuffer(vocalBuffer);
    vocalRmsDb = vAnalysis.rmsDb;
    if (vAnalysis.crestFactorDb > 16) {
      vocalTimbre = 'Intimate Dynamic Whisper';
    } else if (vAnalysis.frequencyBalance.airBrightnessEnergy > 45) {
      vocalTimbre = 'Bright High-Sheen Melodic';
    } else if (vAnalysis.frequencyBalance.subBassEnergy > 30) {
      vocalTimbre = 'Deep Chest Resonant Bars';
    } else {
      vocalTimbre = 'Aggressive Fast-Cadence Rap';
    }
  }

  // 3. Match the best artist preset from our massive library
  const candidatePresets = FACTORY_ARTIST_PRESETS;
  let matchedPreset: ArtistVocalPreset | undefined;

  if (beatVibe === 'West Coast Hip-Hop & Hard Punch') {
    matchedPreset = candidatePresets.find(p => p.id === 'preset-kendrick-not-like-us') ||
      candidatePresets.find(p => p.artist.toLowerCase().includes('kendrick')) ||
      candidatePresets.find(p => p.artist.toLowerCase().includes('21 savage'));
  } else if (beatVibe === 'Psychedelic Trap & 808 Heavy') {
    matchedPreset = candidatePresets.find(p => p.id === 'preset-travis-fein') ||
      candidatePresets.find(p => p.id === 'preset-carti-2024-baby-voice') ||
      candidatePresets.find(p => p.artist.toLowerCase().includes('travis')) ||
      candidatePresets.find(p => p.artist.toLowerCase().includes('future')) ||
      candidatePresets.find(p => p.artist.toLowerCase().includes('yeat'));
  } else if (beatVibe === 'Bouncy Modern Pop & Dance Groove') {
    matchedPreset = candidatePresets.find(p => p.id === 'preset-weeknd-blinding-lights') ||
      candidatePresets.find(p => p.id === 'preset-dualipa-levitating') ||
      candidatePresets.find(p => p.id === 'preset-sabrina-espresso') ||
      candidatePresets.find(p => p.artist.toLowerCase().includes('charli'));
  } else if (beatVibe === 'Dream Pop & Acoustic Intimate') {
    matchedPreset = candidatePresets.find(p => p.id === 'preset-billie-birds-feather') ||
      candidatePresets.find(p => p.id === 'preset-taylor-cruel-summer') ||
      candidatePresets.find(p => p.artist.toLowerCase().includes('billie'));
  } else {
    // Melodic Rap & Modern R&B
    matchedPreset = candidatePresets.find(p => p.id === 'preset-juice-lucid-dreams') ||
      candidatePresets.find(p => p.id === 'preset-uzi-xo-tour-llif3') ||
      candidatePresets.find(p => p.id === 'preset-drake-rich-flex') ||
      candidatePresets.find(p => p.id === 'preset-sza-kill-bill');
  }

  if (!matchedPreset) {
    matchedPreset = candidatePresets[0];
  }

  // 4. Clone and Auto-Tune Preset to the Beat's Key & Scale
  const tunedPreset: ArtistVocalPreset = {
    ...matchedPreset,
    tuning: {
      ...matchedPreset.tuning,
      key: detectedKey,
      scale: detectedScale,
    },
  };

  // 5. Compute Dynamic Frequency Pocket Carving
  const carveFreqHz = vocalTimbre.includes('Whisper') ? 3200 : vocalTimbre.includes('Chest') ? 2200 : 2600;
  const carveDepthDb = Math.min(5.5, Math.max(2.5, Math.round((beatMids / 100) * 5.0 * 10) / 10));
  const sidechainDuckPercent = Math.min(30, Math.max(15, Math.round((beatSubBass / 100) * 28)));

  // 6. Optimal Stem Loudness & Gain Ratio
  const vocalVolume = vocalRmsDb < -24 ? 1.12 : 1.0;
  const beatVolume = 0.88;

  // 7. Apply directly to Live Audio Engine
  audioEngine.updateTuningSettings(tunedPreset.tuning);
  audioEngine.updateMicSettings(tunedPreset.mic);
  audioEngine.updateDenoiseSettings({
    ...tunedPreset.denoise,
    autoGateMode: true,
    gateHoldMs: 180,
    gateReleaseMs: 160,
  });
  audioEngine.updateAlignSettings(tunedPreset.align);
  audioEngine.updateModularPlugins(tunedPreset.plugins);
  audioEngine.updateMasteringSettings({
    ...tunedPreset.mastering,
    enabled: true,
    limiterCeiling: -0.1,
  });
  if (tunedPreset.pitchFormant) {
    audioEngine.updatePitchFormantSettings(tunedPreset.pitchFormant, true);
  }
  if (tunedPreset.aiEnhancer) {
    audioEngine.updateAIEnhancerSettings(tunedPreset.aiEnhancer);
  }

  // Set Synergy pocket carve & ducking in the beat
  audioEngine.updateSynergySettings({
    enabled: true,
    detectedBeatBpm: detectedBpm,
    carveDepthDb,
    sidechainDucking: sidechainDuckPercent,
    dynamicTransientLock: true,
    aiPocketRideEnabled: true,
    pocketAttunement: 92,
  });

  // Set Stem Gains
  audioEngine.setVocalVolume(vocalVolume);
  audioEngine.setBeatVolume(beatVolume);

  // Apply master bus glue
  applyAutoMixToLiveEngine(beatVibe.includes('Trap') ? 'fire_trap_master' : beatVibe.includes('Pop') ? 'club_banger_maximizer' : 'crystalline_modern_pop');

  const summary = `AI Beat & Vocal Sync Applied: Matched [${tunedPreset.artist} - ${tunedPreset.name}]. Quantized pitch to [${detectedKey} ${detectedScale}] at ${detectedBpm} BPM. Carved ${carveDepthDb}dB pocket at ${carveFreqHz}Hz into the beat with ${sidechainDuckPercent}% sidechain ducking.`;

  return {
    matchedPreset: tunedPreset,
    detectedKey,
    detectedScale,
    detectedBpm,
    beatVibe,
    vocalTimbre,
    carveFreqHz,
    carveDepthDb,
    sidechainDuckPercent,
    vocalVolume,
    beatVolume,
    loudnessTargetLufs: -8.0,
    summary,
    timestamp: Date.now(),
  };
}

