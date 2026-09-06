/**
 * Algorithmic studio beat synthesizer producing high-fidelity demo instrumental tracks
 * (Drums, 808 bass, and chord harmony) for instant testing before user file uploads.
 */

export function generateSyntheticBeatBuffer(
  context: BaseAudioContext,
  genre: 'pop_a_minor' | 'rnb_c_major' | 'rap_f_minor',
  durationSeconds = 12
): AudioBuffer {
  const sampleRate = context.sampleRate;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const buffer = context.createBuffer(2, numSamples, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Genre specific tempo & chord progressions
  let bpm = 120;
  let chordProgression: { freqs: number[]; startBeat: number; endBeat: number }[] = [];

  if (genre === 'pop_a_minor') {
    bpm = 120;
    // Am (A3, C4, E4) -> F (F3, A3, C4) -> C (C3, E3, G3) -> G (G3, B3, D4)
    chordProgression = [
      { freqs: [220, 261.63, 329.63], startBeat: 0, endBeat: 4 },
      { freqs: [174.61, 220, 261.63], startBeat: 4, endBeat: 8 },
      { freqs: [130.81, 164.81, 196.0], startBeat: 8, endBeat: 12 },
      { freqs: [196.0, 246.94, 293.66], startBeat: 12, endBeat: 16 },
      { freqs: [220, 261.63, 329.63], startBeat: 16, endBeat: 20 },
      { freqs: [174.61, 220, 261.63], startBeat: 20, endBeat: 24 },
    ];
  } else if (genre === 'rnb_c_major') {
    bpm = 88;
    // Cmaj7 (C3, E3, G3, B3) -> Am7 (A2, C3, E3, G3) -> Dm7 (D3, F3, A3, C4) -> G7 (G2, B2, D3, F3)
    chordProgression = [
      { freqs: [130.81, 164.81, 196.0, 246.94], startBeat: 0, endBeat: 4 },
      { freqs: [110.0, 130.81, 164.81, 196.0], startBeat: 4, endBeat: 8 },
      { freqs: [146.83, 174.61, 220.0, 261.63], startBeat: 8, endBeat: 12 },
      { freqs: [98.0, 123.47, 146.83, 174.61], startBeat: 12, endBeat: 16 },
      { freqs: [130.81, 164.81, 196.0, 246.94], startBeat: 16, endBeat: 20 },
    ];
  } else {
    bpm = 140;
    // Fm (F2, G#2, C3) -> C# (C#2, F2, G#2) -> D# (D#2, G2, A#2) -> Fm
    chordProgression = [
      { freqs: [87.31, 103.83, 130.81], startBeat: 0, endBeat: 4 },
      { freqs: [69.3, 87.31, 103.83], startBeat: 4, endBeat: 8 },
      { freqs: [77.78, 98.0, 116.54], startBeat: 8, endBeat: 12 },
      { freqs: [87.31, 103.83, 130.81], startBeat: 12, endBeat: 16 },
      { freqs: [69.3, 87.31, 103.83], startBeat: 16, endBeat: 20 },
      { freqs: [77.78, 98.0, 116.54], startBeat: 20, endBeat: 24 },
      { freqs: [87.31, 103.83, 130.81], startBeat: 24, endBeat: 28 },
    ];
  }

  const secPerBeat = 60 / bpm;
  const totalBeats = Math.floor(durationSeconds / secPerBeat);

  // Helper: Synthesize kick drum into buffer
  function renderKick(startSample: number, isSub808 = false) {
    const kickDuration = isSub808 ? 0.45 : 0.28;
    const kickLen = Math.floor(sampleRate * kickDuration);
    for (let i = 0; i < kickLen && startSample + i < numSamples; i++) {
      const t = i / sampleRate;
      const progress = t / kickDuration;
      // Pitch drop: starts high (150Hz) and drops to 45Hz sub punch
      const freq = 45 + (isSub808 ? 120 : 160) * Math.exp(-progress * 18);
      const phase = 2 * Math.PI * freq * t;
      const env = Math.exp(-progress * (isSub808 ? 4 : 8));
      const sample = Math.sin(phase) * env * (isSub808 ? 0.75 : 0.65);
      left[startSample + i] += sample;
      right[startSample + i] += sample;
    }
  }

  // Helper: Synthesize snare / clap into buffer
  function renderSnare(startSample: number, isTrap = false) {
    const snareDuration = isTrap ? 0.22 : 0.26;
    const snareLen = Math.floor(sampleRate * snareDuration);
    for (let i = 0; i < snareLen && startSample + i < numSamples; i++) {
      const t = i / sampleRate;
      const progress = t / snareDuration;
      // Tone body + noise snap
      const tone = Math.sin(2 * Math.PI * 185 * t) * Math.exp(-progress * 14) * 0.35;
      const noise = (Math.random() * 2 - 1) * Math.exp(-progress * 10) * 0.4;
      const sample = tone + noise;
      left[startSample + i] += sample * 0.95;
      right[startSample + i] += sample * 0.95;
    }
  }

  // Helper: Synthesize hi-hat into buffer
  function renderHat(startSample: number, open = false) {
    const hatDuration = open ? 0.15 : 0.045;
    const hatLen = Math.floor(sampleRate * hatDuration);
    for (let i = 0; i < hatLen && startSample + i < numSamples; i++) {
      const progress = i / hatLen;
      // High passed noise
      const noise = (Math.random() * 2 - 1) * Math.exp(-progress * (open ? 8 : 22)) * 0.18;
      // Subtle stereo pan
      left[startSample + i] += noise * 0.75;
      right[startSample + i] += noise * 0.95;
    }
  }

  // Render Drum Pattern across all beats
  for (let b = 0; b < totalBeats; b++) {
    const beatSample = Math.floor(b * secPerBeat * sampleRate);
    const measureBeat = b % 4; // 0, 1, 2, 3

    if (genre === 'pop_a_minor') {
      // 4 on floor kick
      renderKick(beatSample);
      // Snare on 2 and 4
      if (measureBeat === 1 || measureBeat === 3) {
        renderSnare(beatSample);
      }
      // 8th note hats
      renderHat(beatSample);
      const eighthSample = Math.floor((b + 0.5) * secPerBeat * sampleRate);
      renderHat(eighthSample);
    } else if (genre === 'rnb_c_major') {
      // Kick on 1 and 2.5
      if (measureBeat === 0) renderKick(beatSample, true);
      if (measureBeat === 2) {
        const offSample = Math.floor((b + 0.5) * secPerBeat * sampleRate);
        renderKick(offSample, true);
      }
      // Rim/Snare on 2 and 4
      if (measureBeat === 1 || measureBeat === 3) {
        renderSnare(beatSample);
      }
      // Swing hats
      renderHat(beatSample);
      const swingSample = Math.floor((b + 0.58) * secPerBeat * sampleRate);
      renderHat(swingSample);
    } else {
      // Trap pattern
      // Hard 808 kick on 1 and syncopated beats
      if (measureBeat === 0 || (measureBeat === 2 && (b % 8 === 2))) {
        renderKick(beatSample, true);
      }
      // Snare on beat 3 (half-time trap)
      if (measureBeat === 2) {
        renderSnare(beatSample, true);
      }
      // 16th note trap hats
      for (let s = 0; s < 4; s++) {
        const sixteenthSample = Math.floor((b + s * 0.25) * secPerBeat * sampleRate);
        renderHat(sixteenthSample);
      }
    }
  }

  // Render Chord Harmony (warm electric piano / lush synth pad)
  for (const chord of chordProgression) {
    const chordStartSample = Math.floor(chord.startBeat * secPerBeat * sampleRate);
    const chordEndSample = Math.min(numSamples, Math.floor(chord.endBeat * secPerBeat * sampleRate));

    for (let s = chordStartSample; s < chordEndSample; s++) {
      const t = (s - chordStartSample) / sampleRate;
      let chordSampleL = 0;
      let chordSampleR = 0;

      for (let f = 0; f < chord.freqs.length; f++) {
        const freq = chord.freqs[f];
        // Triangle + warm 2nd harmonic
        const p = 2 * Math.PI * freq * t;
        const noteWave = Math.sin(p) + 0.3 * Math.sin(p * 2);
        // Stereo spread per voice
        const pan = (f / (chord.freqs.length - 1 || 1)) * 0.5 - 0.25;
        chordSampleL += noteWave * (0.5 - pan);
        chordSampleR += noteWave * (0.5 + pan);
      }

      // Soft envelope
      const env = Math.min(1.0, t / 0.1) * Math.max(0.2, Math.exp(-t * 0.15));
      left[s] += chordSampleL * env * 0.16;
      right[s] += chordSampleR * env * 0.16;
    }
  }

  // Gentle soft clipping limiter on master beat output
  for (let i = 0; i < numSamples; i++) {
    left[i] = Math.tanh(left[i] * 1.15);
    right[i] = Math.tanh(right[i] * 1.15);
  }

  return buffer;
}
