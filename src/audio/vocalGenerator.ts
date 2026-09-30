/**
 * Algorithmic studio vocal synthesizer producing high-fidelity realistic vocal melody stems.
 * Used for testing, offline previews, and as a fault-tolerant fallback when uploaded or mock
 * audio files contain unparseable or non-standard container formats.
 */

export function generateSyntheticVocalBuffer(
  context: BaseAudioContext,
  durationSeconds = 12
): AudioBuffer {
  const sampleRate = context.sampleRate;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const buffer = context.createBuffer(2, numSamples, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Vocal melody notes: [pitchHz, startSec, durationSec, syllable]
  // Key of A minor / C major - melodic vocal line
  const notes: [number, number, number][] = [
    // Phrase 1: "Yeah, take me higher..."
    [220.00, 0.4, 0.7],  // A3
    [261.63, 1.2, 0.6],  // C4
    [293.66, 1.9, 0.7],  // D4
    [329.63, 2.7, 1.2],  // E4 (sustained vibrato)

    // Phrase 2: "Feel the rhythm in my soul..."
    [329.63, 4.4, 0.5],  // E4
    [392.00, 5.0, 0.6],  // G4
    [329.63, 5.7, 0.6],  // E4
    [293.66, 6.4, 0.6],  // D4
    [261.63, 7.1, 1.1],  // C4 (sustained)

    // Phrase 3: "All night long..."
    [261.63, 8.5, 0.6],  // C4
    [293.66, 9.2, 0.7],  // D4
    [261.63, 10.0, 0.6], // C4
    [220.00, 10.7, 1.1], // A3 (resolving root)
  ];

  // Vocal formants for English vowels ("ah" / "oh" resonance)
  // Formant 1: ~700 Hz, Formant 2: ~1220 Hz, Formant 3: ~2600 Hz
  const f1 = 700;
  const f2 = 1220;
  const f3 = 2600;

  for (const [pitchHz, startSec, noteDuration] of notes) {
    const startSample = Math.floor(startSec * sampleRate);
    const noteLength = Math.floor(noteDuration * sampleRate);
    const endSample = Math.min(numSamples, startSample + noteLength);

    for (let s = startSample; s < endSample; s++) {
      const t = (s - startSample) / sampleRate;
      const noteProgress = t / noteDuration;

      // Vibrato: accelerates subtly after 0.25s of holding the note
      const vibratoDepth = t > 0.25 ? Math.min(0.015, (t - 0.25) * 0.02) : 0;
      const vibrato = 1 + vibratoDepth * Math.sin(2 * Math.PI * 5.4 * t);
      const instantPitch = pitchHz * vibrato;

      // Pulse wave / harmonic glottal source
      let glottal = 0;
      for (let h = 1; h <= 8; h++) {
        const hFreq = instantPitch * h;
        if (hFreq > sampleRate * 0.45) break;

        // Formant resonance weighting (Gaussian peaks around F1, F2, F3)
        const q1 = Math.exp(-Math.pow((hFreq - f1) / 180, 2)) * 1.5;
        const q2 = Math.exp(-Math.pow((hFreq - f2) / 220, 2)) * 1.0;
        const q3 = Math.exp(-Math.pow((hFreq - f3) / 350, 2)) * 0.6;
        const formantGain = 0.2 + q1 + q2 + q3;

        const harmonicAmp = (1 / Math.pow(h, 0.85)) * formantGain;
        glottal += Math.sin(2 * Math.PI * hFreq * t) * harmonicAmp;
      }

      // Natural vocal breathiness (subtle pink/white noise)
      const breathNoise = (Math.random() * 2 - 1) * 0.025;

      // ADSR Envelope
      let env = 0;
      const attackTime = 0.06;
      const releaseTime = 0.12;
      if (t < attackTime) {
        env = t / attackTime;
      } else if (noteProgress > (1 - releaseTime / noteDuration)) {
        env = Math.max(0, (1 - noteProgress) / (releaseTime / noteDuration));
      } else {
        env = 0.95 - 0.1 * noteProgress; // gentle natural vocal decay
      }

      const vocalSample = (glottal * 0.18 + breathNoise) * env;

      // Warm stereo spread
      left[s] += vocalSample * 0.98;
      right[s] += vocalSample * 1.02;
    }
  }

  // Soft peak limiter to keep vocal clean and smooth
  for (let i = 0; i < numSamples; i++) {
    left[i] = Math.tanh(left[i] * 1.25);
    right[i] = Math.tanh(right[i] * 1.25);
  }

  return buffer;
}
