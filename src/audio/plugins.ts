import { ModularPlugin, PluginType } from '../types';

export interface ParamSpec {
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

export interface PluginDefinition {
  type: PluginType;
  name: string;
  category: 'Dynamics' | 'Time & Space' | 'Harmonics & Tone' | 'Frequency';
  description: string;
  defaultParams: Record<string, number>;
  paramSpecs: Record<string, ParamSpec>;
}

export const PLUGIN_DEFINITIONS: Record<PluginType, PluginDefinition> = {
  parametric_eq: {
    type: 'parametric_eq',
    name: 'Precision 5-Band Vocal EQ',
    category: 'Frequency',
    description: 'Surgical and musical parametric equalization with high-frequency air shelf and low rumble cut.',
    defaultParams: {
      lowGain: 0,
      lowMidGain: -1.5,
      midGain: 1.0,
      highMidGain: 2.5,
      airGain: 3.5,
    },
    paramSpecs: {
      lowGain: { label: 'Sub Body', min: -12, max: 12, step: 0.5, unit: 'dB' },
      lowMidGain: { label: 'Boxiness', min: -12, max: 12, step: 0.5, unit: 'dB' },
      midGain: { label: 'Clarity', min: -12, max: 12, step: 0.5, unit: 'dB' },
      highMidGain: { label: 'Presence', min: -12, max: 12, step: 0.5, unit: 'dB' },
      airGain: { label: '16kHz Air', min: -12, max: 12, step: 0.5, unit: 'dB' },
    },
  },
  tube_drive: {
    type: 'tube_drive',
    name: 'Harmonic Tube Saturator',
    category: 'Harmonics & Tone',
    description: 'Analog dual-triode saturation offering warm even-order harmonics and subtle peak rounding.',
    defaultParams: {
      drive: 28,
      warmth: 65,
      mix: 60,
    },
    paramSpecs: {
      drive: { label: 'Drive', min: 0, max: 100, step: 1, unit: '%' },
      warmth: { label: 'Warmth', min: 0, max: 100, step: 1, unit: '%' },
      mix: { label: 'Dry / Wet', min: 0, max: 100, step: 1, unit: '%' },
    },
  },
  vintage_delay: {
    type: 'vintage_delay',
    name: 'Analog Tape Echo',
    category: 'Time & Space',
    description: 'Stereo ping-pong tape delay with analog high-cut damping and tape flutter modulation.',
    defaultParams: {
      time: 250,
      feedback: 35,
      damping: 4000,
      mix: 25,
    },
    paramSpecs: {
      time: { label: 'Delay Time', min: 50, max: 1000, step: 10, unit: 'ms' },
      feedback: { label: 'Feedback', min: 0, max: 90, step: 1, unit: '%' },
      damping: { label: 'Hi-Cut Tone', min: 1000, max: 12000, step: 250, unit: 'Hz' },
      mix: { label: 'Dry / Wet', min: 0, max: 100, step: 1, unit: '%' },
    },
  },
  plate_reverb: {
    type: 'plate_reverb',
    name: 'Gold Plate Chamber 140',
    category: 'Time & Space',
    description: 'High-density studio plate reverberation giving vocals a vast, shimmering acoustic halo.',
    defaultParams: {
      decay: 2.2,
      preDelay: 25,
      brightness: 75,
      mix: 28,
    },
    paramSpecs: {
      decay: { label: 'Decay Time', min: 0.5, max: 6.0, step: 0.1, unit: 's' },
      preDelay: { label: 'Pre-Delay', min: 0, max: 120, step: 5, unit: 'ms' },
      brightness: { label: 'Brightness', min: 10, max: 100, step: 1, unit: '%' },
      mix: { label: 'Dry / Wet', min: 0, max: 100, step: 1, unit: '%' },
    },
  },
  vocal_chorus: {
    type: 'vocal_chorus',
    name: 'Dimension Vocal Doubler',
    category: 'Harmonics & Tone',
    description: 'Multi-voice bucket brigade micro-pitch detuning to create thick modern vocal stacks.',
    defaultParams: {
      rate: 1.2,
      depth: 45,
      width: 80,
      mix: 30,
    },
    paramSpecs: {
      rate: { label: 'LFO Rate', min: 0.1, max: 5.0, step: 0.1, unit: 'Hz' },
      depth: { label: 'Detune Depth', min: 0, max: 100, step: 1, unit: '%' },
      width: { label: 'Stereo Spread', min: 0, max: 100, step: 1, unit: '%' },
      mix: { label: 'Dry / Wet', min: 0, max: 100, step: 1, unit: '%' },
    },
  },
  de_esser: {
    type: 'de_esser',
    name: 'Split-Band Sibilance Tamer',
    category: 'Dynamics',
    description: 'Frequency-selective downward dynamic suppression targeting harsh "S" and "T" sibilance.',
    defaultParams: {
      frequency: 6800,
      threshold: -24,
      reductionMax: 12,
    },
    paramSpecs: {
      frequency: { label: 'Target Freq', min: 4000, max: 10000, step: 100, unit: 'Hz' },
      threshold: { label: 'Sens. Threshold', min: -40, max: -10, step: 1, unit: 'dB' },
      reductionMax: { label: 'Max Reduction', min: 3, max: 24, step: 0.5, unit: 'dB' },
    },
  },
  ott_compressor: {
    type: 'ott_compressor',
    name: 'OTT Upward / Downward Multiband Slam',
    category: 'Dynamics',
    description: 'Aggressive 3-band upward expansion and downward crushing compressor. The secret weapon for modern trap, rage, and hyperpop loudness.',
    defaultParams: {
      depth: 65,
      time: 100,
      highUpward: 4,
      midUpward: 2,
      lowUpward: 3,
      downwardRatio: 6,
    },
    paramSpecs: {
      depth: { label: 'OTT Depth', min: 0, max: 100, step: 1, unit: '%' },
      time: { label: 'Attack/Rel Scale', min: 20, max: 300, step: 10, unit: 'ms' },
      highUpward: { label: 'High Air Exp.', min: 0, max: 12, step: 0.5, unit: 'dB' },
      midUpward: { label: 'Mid Glue Exp.', min: 0, max: 12, step: 0.5, unit: 'dB' },
      lowUpward: { label: 'Low Sub Exp.', min: 0, max: 12, step: 0.5, unit: 'dB' },
      downwardRatio: { label: 'Slam Ratio', min: 2, max: 16, step: 1, unit: ':1' },
    },
  },
  sub_808_enhancer: {
    type: 'sub_808_enhancer',
    name: 'Sub 808 Subharmonic Boom Enhancer',
    category: 'Harmonics & Tone',
    description: 'Subharmonic frequency generator and dynamic 808 tightener. Synthesizes ground-shaking low fundamentals (35-80Hz) while keeping the punch clean.',
    defaultParams: {
      subFreq: 48,
      subDrive: 55,
      punchGlue: 60,
      lowCut: 28,
      mix: 65,
    },
    paramSpecs: {
      subFreq: { label: 'Sub Freq', min: 35, max: 90, step: 1, unit: 'Hz' },
      subDrive: { label: '808 Harmonics', min: 0, max: 100, step: 1, unit: '%' },
      punchGlue: { label: 'Kick Glue', min: 0, max: 100, step: 1, unit: '%' },
      lowCut: { label: 'Infrasonic Cut', min: 20, max: 50, step: 1, unit: 'Hz' },
      mix: { label: 'Dry / Wet', min: 0, max: 100, step: 1, unit: '%' },
    },
  },
  hard_clipper: {
    type: 'hard_clipper',
    name: 'Hard Brickwall Clipper & Diode Overdrive',
    category: 'Harmonics & Tone',
    description: 'Extreme zero-latency hard clipper with soft-knee saturation that shaves off peaks and boosts perceived loudness without pump artifacts.',
    defaultParams: {
      clipDrive: 6,
      ceiling: -0.1,
      softKnee: 25,
      asymmetry: 15,
      highPolish: 40,
    },
    paramSpecs: {
      clipDrive: { label: 'Drive Gain', min: 0, max: 18, step: 0.5, unit: 'dB' },
      ceiling: { label: 'Hard Ceiling', min: -1.0, max: 0.0, step: 0.05, unit: 'dB' },
      softKnee: { label: 'Soft Knee Curve', min: 0, max: 100, step: 1, unit: '%' },
      asymmetry: { label: 'Diode Asymmetry', min: 0, max: 100, step: 1, unit: '%' },
      highPolish: { label: 'High Polish', min: 0, max: 100, step: 1, unit: '%' },
    },
  },
  dimension_widener: {
    type: 'dimension_widener',
    name: 'Haas Stereo Dimension & Micro-Pitch Expander',
    category: 'Time & Space',
    description: 'Ultra-wide stereo field expander with Haas micro-delay and center mono-lock for 808s and kick drums.',
    defaultParams: {
      width: 175,
      haasDelay: 14,
      centerFocus: 85,
      sideSheen: 50,
      mix: 45,
    },
    paramSpecs: {
      width: { label: 'Stereo Width', min: 100, max: 300, step: 5, unit: '%' },
      haasDelay: { label: 'Micro Offset', min: 4, max: 30, step: 1, unit: 'ms' },
      centerFocus: { label: 'Mono 808 Focus', min: 0, max: 100, step: 1, unit: '%' },
      sideSheen: { label: 'Side Air Sheen', min: 0, max: 100, step: 1, unit: '%' },
      mix: { label: 'Dry / Wet', min: 0, max: 100, step: 1, unit: '%' },
    },
  },
  transient_shaper: {
    type: 'transient_shaper',
    name: 'Snap & Punch Transient Shaper',
    category: 'Dynamics',
    description: 'Dual-envelope dynamic shaper to boost vocal syllable attack or tighten bloated 808 and snare transients.',
    defaultParams: {
      attackGain: 4.5,
      sustainGain: -1.5,
      punchSensitivity: 65,
      speed: 40,
    },
    paramSpecs: {
      attackGain: { label: 'Attack Snap', min: -12, max: 12, step: 0.5, unit: 'dB' },
      sustainGain: { label: 'Sustain Body', min: -12, max: 12, step: 0.5, unit: 'dB' },
      punchSensitivity: { label: 'Sensitivity', min: 10, max: 100, step: 1, unit: '%' },
      speed: { label: 'Envelope Speed', min: 10, max: 120, step: 5, unit: 'ms' },
    },
  },
  tape_warble_lofi: {
    type: 'tape_warble_lofi',
    name: 'Analog Tape Flutter & Vinyl Warble',
    category: 'Harmonics & Tone',
    description: 'Vintage cassette tape motor instability, subtle wow/flutter pitch drift, and analog head saturation.',
    defaultParams: {
      flutterDepth: 35,
      flutterRate: 2.4,
      warmthBias: 60,
      tapeAging: 4500,
      mix: 40,
    },
    paramSpecs: {
      flutterDepth: { label: 'Wow / Flutter', min: 0, max: 100, step: 1, unit: '%' },
      flutterRate: { label: 'Drift Rate', min: 0.2, max: 8.0, step: 0.1, unit: 'Hz' },
      warmthBias: { label: 'Tape Bias', min: 0, max: 100, step: 1, unit: '%' },
      tapeAging: { label: 'Head Damping', min: 2000, max: 12000, step: 250, unit: 'Hz' },
      mix: { label: 'Dry / Wet', min: 0, max: 100, step: 1, unit: '%' },
    },
  },
  flanger_phaser: {
    type: 'flanger_phaser',
    name: 'Jet Vocal Flanger & Cosmic Phaser',
    category: 'Time & Space',
    description: 'High-altitude comb filtering sweep and 12-stage phase shifting for Travis Scott and Carti vocal textures.',
    defaultParams: {
      rate: 0.6,
      depth: 70,
      feedback: 55,
      centerFreq: 1800,
      mix: 35,
    },
    paramSpecs: {
      rate: { label: 'Sweep Rate', min: 0.1, max: 6.0, step: 0.1, unit: 'Hz' },
      depth: { label: 'Mod Depth', min: 0, max: 100, step: 1, unit: '%' },
      feedback: { label: 'Resonance Fb', min: 0, max: 90, step: 1, unit: '%' },
      centerFreq: { label: 'Center Notch', min: 400, max: 6000, step: 100, unit: 'Hz' },
      mix: { label: 'Dry / Wet', min: 0, max: 100, step: 1, unit: '%' },
    },
  },
  spectral_gate: {
    type: 'spectral_gate',
    name: 'Rhythmic Stutter & Sidechain Pumper',
    category: 'Dynamics',
    description: 'Synchronized volume gating and sidechain pumping effect that locks vocal chops directly into the trap rhythm.',
    defaultParams: {
      chopRateHz: 8,
      duckDepth: 75,
      slewSmoothing: 15,
      mix: 60,
    },
    paramSpecs: {
      chopRateHz: { label: 'Chop Rate', min: 1, max: 32, step: 1, unit: 'Hz' },
      duckDepth: { label: 'Pump Depth', min: 0, max: 100, step: 1, unit: '%' },
      slewSmoothing: { label: 'Smoothing', min: 2, max: 50, step: 1, unit: 'ms' },
      mix: { label: 'Dry / Wet', min: 0, max: 100, step: 1, unit: '%' },
    },
  },
};

export function createPlugin(type: PluginType): ModularPlugin {
  const def = PLUGIN_DEFINITIONS[type];
  return {
    id: `plugin-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type,
    name: def.name,
    enabled: true,
    params: { ...def.defaultParams },
  };
}
