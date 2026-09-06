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
