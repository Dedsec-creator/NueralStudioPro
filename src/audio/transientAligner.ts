import { AlignmentAnalysisResult, PocketRideStyle } from '../types';

/**
 * Extracts normalized peak amplitudes (0 to 100) from an AudioBuffer for waveform rendering.
 */
export function extractWaveformPeaks(buffer: AudioBuffer, numPoints = 80): number[] {
  const channelData = buffer.getChannelData(0);
  const step = Math.floor(channelData.length / numPoints);
  const peaks: number[] = [];

  for (let i = 0; i < numPoints; i++) {
    const start = i * step;
    let max = 0;
    for (let j = 0; j < step; j += 4) {
      const val = Math.abs(channelData[start + j] || 0);
      if (val > max) max = val;
    }
    // Scale 15 to 100 with logarithmic curve
    const normalized = Math.min(100, Math.max(15, Math.round(Math.pow(max, 0.7) * 100)));
    peaks.push(normalized);
  }

  return peaks;
}

/**
 * Detects transient attack points (onsets) across an AudioBuffer in seconds.
 */
export function detectTransients(buffer: AudioBuffer, sensitivity = 0.5): number[] {
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);
  const windowSize = Math.floor(sampleRate * 0.02); // 20ms analysis window
  const hopSize = Math.floor(sampleRate * 0.01); // 10ms hop
  const numWindows = Math.floor((channelData.length - windowSize) / hopSize);

  const energies: number[] = new Float64Array(numWindows) as unknown as number[];

  // Calculate RMS energy per window
  for (let w = 0; w < numWindows; w++) {
    const offset = w * hopSize;
    let sum = 0;
    for (let i = 0; i < windowSize; i += 2) {
      const val = channelData[offset + i];
      sum += val * val;
    }
    energies[w] = Math.sqrt(sum / (windowSize / 2));
  }

  // Detect spectral flux / rapid energy increases
  const onsets: number[] = [];
  const minInterval = Math.floor(0.12 / 0.01); // Minimum 120ms between transients
  let lastOnsetWindow = -minInterval;

  // Threshold scaled by sensitivity
  const threshMultiplier = 1.3 + (1 - Math.max(0.1, Math.min(1, sensitivity))) * 1.5;

  for (let w = 2; w < numWindows - 2; w++) {
    const prevAvg = (energies[w - 2] + energies[w - 1]) / 2 + 0.005;
    const current = energies[w];
    const nextAvg = (energies[w + 1] + energies[w + 2]) / 2;

    if (
      current > prevAvg * threshMultiplier &&
      current > 0.025 &&
      current >= nextAvg &&
      w - lastOnsetWindow >= minInterval
    ) {
      const timeInSec = (w * hopSize) / sampleRate;
      onsets.push(Number(timeInSec.toFixed(3)));
      lastOnsetWindow = w;
    }
  }

  return onsets;
}

/**
 * Estimates BPM from transient inter-onset intervals.
 */
export function detectBPM(buffer: AudioBuffer, defaultBpm = 120): number {
  const transients = detectTransients(buffer, 0.6);
  if (transients.length < 4) return defaultBpm;

  const intervals: number[] = [];
  for (let i = 1; i < transients.length; i++) {
    const diff = transients[i] - transients[i - 1];
    if (diff > 0.25 && diff < 1.5) {
      intervals.push(diff);
    }
  }

  if (intervals.length === 0) return defaultBpm;

  // Sort intervals and take median
  intervals.sort((a, b) => a - b);
  const medianInterval = intervals[Math.floor(intervals.length / 2)];
  let calculatedBpm = Math.round(60 / medianInterval);

  // Normalize into standard musical tempo range (70 - 170 BPM)
  while (calculatedBpm < 70) calculatedBpm *= 2;
  while (calculatedBpm > 170) calculatedBpm = Math.round(calculatedBpm / 2);

  return calculatedBpm;
}

/**
 * Calculates optimal synergy alignment offset between Beat and Vocal stems with AI Pocket Attunement.
 * Analyzes rhythm transient phase and micro-groove pockets to lock vocal attacks right into the beat pocket.
 */
export function calculateSynergyAlignment(
  beatBuffer: AudioBuffer,
  vocalBuffer: AudioBuffer,
  bpm: number,
  style: PocketRideStyle = 'pocket_lock',
  sensitivity = 50,
  pocketAttunement = 85,
  grooveSwing = 0
): AlignmentAnalysisResult {
  const normSens = Math.max(0.2, Math.min(0.9, sensitivity / 100));
  const beatTransients = detectTransients(beatBuffer, normSens * 1.1);
  const vocalTransients = detectTransients(vocalBuffer, normSens * 0.9);

  const beatBpm = bpm || detectBPM(beatBuffer, 120);
  const beatInterval = 60 / beatBpm; // duration of 1 beat in seconds
  const subBeatInterval = beatInterval / 4; // 16th note subdivision in seconds
  const tripletInterval = beatInterval / 3; // 8th note triplet subdivision

  let bestOffsetMs = 0;
  let bestScore = -Infinity;

  if (beatTransients.length > 0 && vocalTransients.length > 0) {
    // Cross-correlate candidate offsets within -150ms to +150ms range in 4ms steps
    for (let testOffsetMs = -150; testOffsetMs <= 150; testOffsetMs += 4) {
      const offsetSec = testOffsetMs / 1000;
      let matchScore = 0;

      for (const vTime of vocalTransients) {
        const shiftedVocalTime = vTime + offsetSec;
        // Check distance to nearest beat transient
        let minDiff = Infinity;
        for (const bTime of beatTransients) {
          const diff = Math.abs(shiftedVocalTime - bTime);
          if (diff < minDiff) {
            minDiff = diff;
          }
        }

        // Distance to nearest 16th note musical grid position (with swing)
        const swingSec = (grooveSwing / 100) * (subBeatInterval * 0.35);
        const gridPhase = (shiftedVocalTime + swingSec) % subBeatInterval;
        const gridDist = Math.min(gridPhase, subBeatInterval - gridPhase);

        // Distance to triplet grid for triplet bounce style
        const tripPhase = shiftedVocalTime % tripletInterval;
        const tripDist = Math.min(tripPhase, tripletInterval - tripPhase);

        // Combined score: proximity to beat transient + musical grid
        const transientScore = Math.exp(-Math.pow(minDiff / 0.035, 2));
        const gridScore = style === 'triplet_bounce'
          ? Math.exp(-Math.pow(tripDist / 0.025, 2))
          : Math.exp(-Math.pow(gridDist / 0.022, 2));

        matchScore += transientScore * 1.6 + gridScore * 1.2;
      }

      if (matchScore > bestScore) {
        bestScore = matchScore;
        bestOffsetMs = testOffsetMs;
      }
    }
  }

  // Apply Pocket Ride Style nuance:
  let styleAdjustedOffsetMs = bestOffsetMs;
  if (style === 'ahead_drive') {
    styleAdjustedOffsetMs -= 18; // 18ms ahead of the beat gives aggressive, driving momentum
  } else if (style === 'laid_back') {
    styleAdjustedOffsetMs += 26; // 26ms behind gives relaxed, soulful R&B groove pocket
  } else if (style === 'triplet_bounce') {
    styleAdjustedOffsetMs += Math.round((tripletInterval * 0.15) * 1000);
  } else if (style === 'pop_tight') {
    styleAdjustedOffsetMs -= 6; // crisp radio pop micro-lead
  }

  // Apply AI pocket attunement weighting (0 to 100%)
  const attuneFactor = pocketAttunement / 100;
  const finalOffsetMs = Math.round(styleAdjustedOffsetMs * attuneFactor + (1 - attuneFactor) * bestOffsetMs);

  // Compute detailed AI Attunement metrics
  let matchedHits = 0;
  let totalDevMs = 0;
  const finalOffsetSec = finalOffsetMs / 1000;

  for (const vTime of vocalTransients) {
    const alignedTime = vTime + finalOffsetSec;
    let minDiffSec = Infinity;
    for (const bTime of beatTransients) {
      const d = Math.abs(alignedTime - bTime);
      if (d < minDiffSec) minDiffSec = d;
    }
    const devMs = minDiffSec * 1000;
    totalDevMs += Math.min(100, devMs);
    if (devMs <= 35) {
      matchedHits++;
    }
  }

  const numVocal = Math.max(1, vocalTransients.length);
  const avgDevMs = Math.round(totalDevMs / numVocal);
  const pocketTightness = Math.min(100, Math.max(60, Math.round((matchedHits / numVocal) * 100)));
  const grooveScore = Math.min(100, Math.max(72, Math.round(100 - avgDevMs * 0.65 + (pocketAttunement * 0.1))));
  const syncopationIndex = Math.min(100, Math.max(45, Math.round(70 + (grooveSwing * 0.3) + (matchedHits % 15))));

  // Diagnosis text describing the alignment
  const diagnosis = `AI Pocket Attunement: Locked ${matchedHits}/${numVocal} vocal transient syllables onto beat groove accents at ${beatBpm} BPM (${pocketTightness}% pocket tightness, ${avgDevMs}ms avg micro-deviation). Applied ${style.replace('_', ' ')} offset of ${finalOffsetMs > 0 ? `+${finalOffsetMs}` : finalOffsetMs}ms with ${pocketAttunement}% attunement.`;

  // Phase degrees alignment calculation (based on offset modulo 16th note cycle)
  const sixteenthSec = (60 / beatBpm) / 4;
  const phaseCycle = ((finalOffsetSec % sixteenthSec) / sixteenthSec);
  const phaseAlignmentDegrees = Math.round(phaseCycle * 360 * 10) / 10;
  const rhythmPattern = grooveSwing !== 0
    ? `Groove Swing: ${grooveSwing > 0 ? `+${grooveSwing}% Triplet Bounce` : `${grooveSwing}% Forward Push`}`
    : `Straight 16th Grid (${beatBpm} BPM Lock)`;
  const recommendation = pocketTightness >= 85
    ? 'Pocket coherence is optimal. Vocals sit squarely inside the drum groove pocket without phase smear.'
    : 'Increasing Pocket Attunement to 85%+ will snap vocal transients tighter onto kick/snare transients.';

  const aiAttuneReport = {
    matchedHits,
    pocketTightness,
    grooveScore,
    syncopationIndex,
    averageDeviationMs: avgDevMs,
    diagnosis,
    phaseAlignmentDegrees,
    rhythmPattern,
    recommendation,
    timestamp: Date.now(),
  };

  const baseConfidence = vocalTransients.length > 0
    ? Math.min(100, Math.max(80, Math.round(grooveScore)))
    : 85;

  return {
    offsetMs: finalOffsetMs,
    confidence: baseConfidence,
    detectedBpm: beatBpm,
    beatTransients,
    vocalTransients,
    aiAttuneReport,
  };
}

export function evaluateManualAlignmentMatch(
  offsetMs: number,
  beatTransients: number[],
  vocalTransients: number[],
  beatBpm: number = 128
): { confidence: number; pocketTightness: number; avgDevMs: number } {
  if (!vocalTransients || vocalTransients.length === 0 || !beatTransients || beatTransients.length === 0) {
    // If no transients are loaded yet, evaluate closeness to 16th note grid
    const sixteenthMs = ((60 / Math.max(60, beatBpm)) / 4) * 1000;
    const gridDist = Math.abs(offsetMs % sixteenthMs);
    const minGridDist = Math.min(gridDist, sixteenthMs - gridDist);
    const conf = Math.max(55, Math.min(100, Math.round(100 - (minGridDist / (sixteenthMs / 2)) * 40)));
    return {
      confidence: conf,
      pocketTightness: conf,
      avgDevMs: Math.round(minGridDist),
    };
  }

  const offsetSec = offsetMs / 1000;
  let matchedHits = 0;
  let totalDevMs = 0;

  for (const vTime of vocalTransients) {
    const alignedTime = vTime + offsetSec;
    let minDiffSec = Infinity;
    for (const bTime of beatTransients) {
      const d = Math.abs(alignedTime - bTime);
      if (d < minDiffSec) minDiffSec = d;
    }
    const devMs = minDiffSec * 1000;
    totalDevMs += Math.min(120, devMs);
    if (devMs <= 35) {
      matchedHits++;
    }
  }

  const numVocal = Math.max(1, vocalTransients.length);
  const avgDevMs = Math.round(totalDevMs / numVocal);
  const pocketTightness = Math.min(100, Math.max(45, Math.round((matchedHits / numVocal) * 100)));
  const rawConf = Math.round(100 - avgDevMs * 0.55);
  const confidence = Math.min(100, Math.max(50, rawConf));

  return {
    confidence,
    pocketTightness,
    avgDevMs,
  };
}
