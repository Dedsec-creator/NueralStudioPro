import { MusicalKey, MusicalScale, PitchTrackData } from '../types';

// Standard 12 chromatic note names
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export const KEY_OFFSETS: Record<MusicalKey, number> = {
  'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
  'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
};

// Scale interval definitions (semitones from root)
export const SCALE_INTERVALS: Record<MusicalScale, number[]> = {
  'Chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  'Major': [0, 2, 4, 5, 7, 9, 11],
  'Minor Natural': [0, 2, 3, 5, 7, 8, 10],
  'Minor Harmonic': [0, 2, 3, 5, 7, 8, 11],
  'Minor Melodic': [0, 2, 3, 5, 7, 9, 11],
  'Pentatonic Major': [0, 2, 4, 7, 9],
  'Pentatonic Minor': [0, 3, 5, 7, 10],
  'Dorian': [0, 2, 3, 5, 7, 9, 10],
  'Blues': [0, 3, 5, 6, 7, 10],
};

/**
 * Converts frequency in Hz to fractional MIDI note
 */
export function freqToMidi(freq: number): number {
  if (freq <= 0) return 0;
  return 69 + 12 * Math.log2(freq / 440);
}

/**
 * Converts MIDI note to frequency in Hz
 */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Returns note name and octave from MIDI note integer (e.g. 69 -> A4)
 */
export function midiToNoteName(midi: number): string {
  const rounded = Math.round(midi);
  const noteIndex = ((rounded % 12) + 12) % 12;
  const octave = Math.floor(rounded / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/**
 * Quantize a continuous MIDI note to the nearest allowed note in the chosen key and scale
 */
export function quantizeToScale(
  midiNote: number,
  key: MusicalKey,
  scale: MusicalScale
): { targetMidi: number; targetName: string; centsDeviation: number } {
  const keyOffset = KEY_OFFSETS[key];
  const intervals = SCALE_INTERVALS[scale];

  const roundedMidi = Math.round(midiNote);
  let bestTarget = roundedMidi;
  let minDiff = Infinity;

  // Search candidate notes within 1.5 octaves
  for (let offset = -18; offset <= 18; offset++) {
    const candidateMidi = roundedMidi + offset;
    const noteClass = ((candidateMidi % 12) + 12) % 12;
    const intervalFromKey = ((noteClass - keyOffset) % 12 + 12) % 12;

    if (intervals.includes(intervalFromKey)) {
      const diff = Math.abs(candidateMidi - midiNote);
      if (diff < minDiff) {
        minDiff = diff;
        bestTarget = candidateMidi;
      }
    }
  }

  const centsDeviation = (midiNote - bestTarget) * 100;
  return {
    targetMidi: bestTarget,
    targetName: midiToNoteName(bestTarget),
    centsDeviation: Math.max(-50, Math.min(50, centsDeviation)),
  };
}

/**
 * High-performance Normalized Square Difference (Autocorrelation / YIN sub-sample)
 * pitch detection algorithm optimized for low latency and vocal fundamental frequencies (65Hz - 1100Hz).
 */
export function detectPitchYIN(
  buffer: Float32Array,
  sampleRate: number,
  threshold = 0.12
): PitchTrackData | null {
  const bufferSize = buffer.length;
  // Vocal frequency bounds: C2 (65Hz) to C6 (1046Hz)
  const minPeriod = Math.floor(sampleRate / 1100);
  const maxPeriod = Math.floor(sampleRate / 65);

  if (bufferSize < maxPeriod * 2) {
    return null;
  }

  // Check RMS power to gate quiet noise
  let rms = 0;
  for (let i = 0; i < bufferSize; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / bufferSize);
  if (rms < 0.008) {
    return null; // Signal is below vocal presence gate
  }

  // Step 1: Difference Function
  const halfSize = Math.floor(bufferSize / 2);
  const diff = new Float32Array(halfSize);

  for (let tau = 0; tau < halfSize; tau++) {
    let sum = 0;
    for (let i = 0; i < halfSize; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    diff[tau] = sum;
  }

  // Step 2: Cumulative Mean Normalized Difference Function
  const cmndf = new Float32Array(halfSize);
  cmndf[0] = 1;
  let runningSum = 0;

  for (let tau = 1; tau < halfSize; tau++) {
    runningSum += diff[tau];
    cmndf[tau] = runningSum > 0 ? (diff[tau] * tau) / runningSum : 1;
  }

  // Step 3: Absolute Thresholding
  let period = -1;
  for (let tau = minPeriod; tau < Math.min(maxPeriod, halfSize); tau++) {
    if (cmndf[tau] < threshold) {
      while (tau + 1 < halfSize && cmndf[tau + 1] < cmndf[tau]) {
        tau++;
      }
      period = tau;
      break;
    }
  }

  // If no minimum below threshold, find global minimum in range if reasonable
  if (period === -1) {
    let minVal = Infinity;
    let bestTau = -1;
    for (let tau = minPeriod; tau < Math.min(maxPeriod, halfSize); tau++) {
      if (cmndf[tau] < minVal) {
        minVal = cmndf[tau];
        bestTau = tau;
      }
    }
    if (minVal < 0.35 && bestTau > 0) {
      period = bestTau;
    }
  }

  if (period === -1 || period < minPeriod || period >= halfSize - 1) {
    return null;
  }

  // Step 4: Parabolic Interpolation for exact sub-sample frequency resolution
  const x0 = period > 0 ? period - 1 : period;
  const x2 = period < halfSize - 1 ? period + 1 : period;
  let betterPeriod = period;

  if (x0 !== period && x2 !== period) {
    const s0 = cmndf[x0];
    const s1 = cmndf[period];
    const s2 = cmndf[x2];
    const denominator = 2 * (2 * s1 - s0 - s2);
    if (Math.abs(denominator) > 1e-6) {
      betterPeriod = period + (s2 - s0) / denominator;
    }
  }

  const frequency = sampleRate / betterPeriod;
  if (frequency < 55 || frequency > 1200) {
    return null;
  }

  const confidence = Math.max(0, Math.min(1, 1 - (cmndf[period] || 0)));
  const midi = freqToMidi(frequency);
  const noteName = midiToNoteName(midi);

  return {
    frequency: Math.round(frequency * 10) / 10,
    noteName,
    midiNote: midi,
    targetMidiNote: Math.round(midi),
    targetNoteName: midiToNoteName(Math.round(midi)),
    centsDeviation: 0,
    confidence: Math.round(confidence * 100) / 100,
    clarity: Math.round(Math.min(1, rms * 15) * 100) / 100,
  };
}
