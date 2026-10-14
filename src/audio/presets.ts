import { ArtistVocalPreset } from '../types';
import { createPlugin } from './plugins';
import { EXPANDED_ARTIST_PRESETS } from './artistPresetsExpansion';

const BASE_ARTIST_PRESETS: ArtistVocalPreset[] = [
  // ==========================================
  // TRAVIS SCOTT
  // ==========================================
  {
    id: 'preset-travis-beep-beep',
    name: 'Beep Beep (JB2)',
    artist: 'Travis Scott',
    song: 'Beep Beep',
    album: 'Jackboys 2',
    category: 'Psychedelic Trap',
    description: 'The exact vocal chain engineered for high-octane Jackboys trap: crystalline Sony C-800G air, 0ms instantaneous autotune quantization in F# Minor, overdriven analog tube saturation, and synchronized 1/8-note slap delay.',
    vocalChainSummary: [
      '0ms Lightning Auto-Tune Snap in F# Minor',
      'Sony C-800G Heatsink Tube Air Boost (+5.5dB)',
      'Dual-Triode Harmonic Tube Overdrive (70% Mix)',
      '1/8 Ping-Pong Analog Tape Echo',
      'Wide Glued Master Bus Limiting (135% Spread)',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 0, // Instant snap
      key: 'F#',
      scale: 'Minor Natural',
      humanize: 0,
      flexTune: 0,
      naturalVibrato: 8,
      vibratoRate: 6.2,
      trackingSensitivity: 98,
    },
    mic: {
      enabled: true,
      selectedMic: 'c800g',
      proximity: 3,
      drive: 45,
      polarPattern: 'cardioid',
      lowCutHz: 120,
      airBoost: 5.5,
    },
    denoise: {
      enabled: true,
      threshold: -46,
      reduction: 20,
      sensitivity: 88,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: -2.0,
      invertPhase: false,
      correlation: 0.94,
    },
    mastering: {
      enabled: true,
      lowCut: 38,
      bassGain: 1.2,
      midGain: -0.8,
      highAirGain: 4.2,
      compThreshold: -18,
      compRatio: 5.0,
      compMakeup: 4.5,
      tapeDrive: 48,
      stereoWidth: 135,
      limiterCeiling: -0.1,
    },
    plugins: [
      {
        ...createPlugin('tube_drive'),
        params: { drive: 52, warmth: 60, mix: 70 },
      },
      {
        ...createPlugin('vintage_delay'),
        params: { time: 240, feedback: 42, damping: 6500, mix: 32 },
      },
      {
        ...createPlugin('plate_reverb'),
        params: { decay: 3.2, preDelay: 25, brightness: 85, mix: 28 },
      },
      {
        ...createPlugin('parametric_eq'),
        params: { lowGain: -2.0, lowMidGain: -3.0, midGain: 1.5, highMidGain: 3.0, airGain: 5.5 },
      },
    ],
  },
  {
    id: 'preset-travis-dinosaurs',
    name: 'Dinosaurs (JB2 Grail)',
    artist: 'Travis Scott',
    song: 'Dinosaurs',
    album: 'Jackboys / Astroworld Leaks',
    category: 'Dark Psychedelic Trap',
    description: 'Heavy tube-driven robotic vocal texture with high harmonic sizzle, hard 0ms C# Minor autotune quantization, and vast cavernous reverb reflections designed to ride heavy distorted 808s.',
    vocalChainSummary: [
      'Hard 0ms Snap in C# Minor',
      'Peltier-Cooled C-800G Top End (+6dB)',
      'Heavy Warm Tube Drive Distortion (80% Mix)',
      'Deep 4.2s Atmospheric Space Reverb',
      'Aggressive Low-End Cut Below 42Hz',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 0,
      key: 'C#',
      scale: 'Minor Natural',
      humanize: 0,
      flexTune: 0,
      naturalVibrato: 5,
      vibratoRate: 6.5,
      trackingSensitivity: 100,
    },
    mic: {
      enabled: true,
      selectedMic: 'c800g',
      proximity: 2,
      drive: 55,
      polarPattern: 'cardioid',
      lowCutHz: 120,
      airBoost: 6.0,
    },
    denoise: {
      enabled: true,
      threshold: -44,
      reduction: 22,
      sensitivity: 90,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 1.5,
      invertPhase: false,
      correlation: 0.92,
    },
    mastering: {
      enabled: true,
      lowCut: 42,
      bassGain: 0.5,
      midGain: 1.2,
      highAirGain: 4.8,
      compThreshold: -19,
      compRatio: 6.0,
      compMakeup: 5.5,
      tapeDrive: 55,
      stereoWidth: 140,
      limiterCeiling: -0.1,
    },
    plugins: [
      {
        ...createPlugin('tube_drive'),
        params: { drive: 65, warmth: 45, mix: 80 },
      },
      {
        ...createPlugin('vintage_delay'),
        params: { time: 320, feedback: 48, damping: 5000, mix: 35 },
      },
      {
        ...createPlugin('plate_reverb'),
        params: { decay: 4.2, preDelay: 35, brightness: 75, mix: 38 },
      },
      {
        ...createPlugin('de_esser'),
        params: { frequency: 7200, threshold: -26, reductionMax: 14 },
      },
    ],
  },
  {
    id: 'preset-travis-kick-out',
    name: 'Kick Out (Unreleased)',
    artist: 'Travis Scott',
    song: 'Kick Out',
    album: 'Rodeo / Birds Vault',
    category: 'Rodeo Melodic Trap',
    description: 'Raw, punchy mid-forward vocal processing with biting tube saturation, fast pitch tracking in G Minor, clean parametric boxiness cuts, and synchronized tape delay flutter.',
    vocalChainSummary: [
      'G Minor 0ms Retune Speed',
      'Sony C-800G with 40% Tube Drive',
      'Surgical 450Hz Boxiness Cut',
      'Analog Tape Delay Flutter (280ms)',
      'Aggressive VCA Master Compressor (5:1)',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 0,
      key: 'G',
      scale: 'Minor Natural',
      humanize: 0,
      flexTune: 5,
      naturalVibrato: 0,
      vibratoRate: 6.0,
      trackingSensitivity: 95,
    },
    mic: {
      enabled: true,
      selectedMic: 'c800g',
      proximity: 3,
      drive: 40,
      polarPattern: 'cardioid',
      lowCutHz: 120,
      airBoost: 4.8,
    },
    denoise: {
      enabled: true,
      threshold: -48,
      reduction: 18,
      sensitivity: 85,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: -1.0,
      invertPhase: false,
      correlation: 0.95,
    },
    mastering: {
      enabled: true,
      lowCut: 35,
      bassGain: 1.0,
      midGain: 0.5,
      highAirGain: 3.5,
      compThreshold: -17,
      compRatio: 4.5,
      compMakeup: 4.0,
      tapeDrive: 48,
      stereoWidth: 130,
      limiterCeiling: -0.1,
    },
    plugins: [
      {
        ...createPlugin('parametric_eq'),
        params: { lowGain: 0, lowMidGain: -3.5, midGain: 1.8, highMidGain: 3.0, airGain: 4.0 },
      },
      {
        ...createPlugin('vintage_delay'),
        params: { time: 280, feedback: 38, damping: 6000, mix: 30 },
      },
      {
        ...createPlugin('tube_drive'),
        params: { drive: 48, warmth: 55, mix: 65 },
      },
    ],
  },
  {
    id: 'preset-travis-serenade',
    name: 'Serenade (Birds Vault)',
    artist: 'Travis Scott',
    song: 'Serenade',
    album: 'Birds in the Trap Vault',
    category: 'Atmospheric Hypnotic Trap',
    description: 'The legendary ethereal vocal chain from Serenade: lush multi-voice chorus detuner, 5.2-second cathedral plate reverb, zero-tolerance autotune in A Minor, and wide 150% stereo imaging.',
    vocalChainSummary: [
      'Zero-Tolerance Snap in A Minor',
      'Hypnotic Dimension Doubler Chorus (100% Spread)',
      'Massive 5.2s Ambient Cathedral Reverb',
      'C-800G High-Frequency Air Polish',
      '150% Stereo Width Enhancement',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 0,
      key: 'A',
      scale: 'Minor Natural',
      humanize: 5,
      flexTune: 0,
      naturalVibrato: 14,
      vibratoRate: 5.8,
      trackingSensitivity: 97,
    },
    mic: {
      enabled: true,
      selectedMic: 'c800g',
      proximity: 4,
      drive: 35,
      polarPattern: 'cardioid',
      lowCutHz: 80,
      airBoost: 5.0,
    },
    denoise: {
      enabled: true,
      threshold: -50,
      reduction: 16,
      sensitivity: 82,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 2.0,
      invertPhase: false,
      correlation: 0.96,
    },
    mastering: {
      enabled: true,
      lowCut: 30,
      bassGain: 1.5,
      midGain: 0.0,
      highAirGain: 4.5,
      compThreshold: -15,
      compRatio: 3.8,
      compMakeup: 3.5,
      tapeDrive: 40,
      stereoWidth: 150,
      limiterCeiling: -0.2,
    },
    plugins: [
      {
        ...createPlugin('vocal_chorus'),
        params: { rate: 1.4, depth: 60, width: 100, mix: 40 },
      },
      {
        ...createPlugin('plate_reverb'),
        params: { decay: 5.2, preDelay: 45, brightness: 80, mix: 45 },
      },
      {
        ...createPlugin('vintage_delay'),
        params: { time: 360, feedback: 50, damping: 5500, mix: 35 },
      },
    ],
  },
  {
    id: 'preset-travis-sicko',
    name: 'SICKO MODE (Astroworld)',
    artist: 'Travis Scott',
    song: 'SICKO MODE',
    album: 'Astroworld',
    category: 'Modern Trap Standard',
    description: 'Astroworld superstar vocal chain featuring aggressive C-800G presence, hard-quantized B Minor tuning, punchy tape saturation, and tightly gated room control.',
    vocalChainSummary: [
      'B Minor Hard 0ms Quantization',
      'Sony C-800G Peltier Air Boost',
      'Tape Saturation & Fast Slap Delay',
      'Aggressive Glue Limiting',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 0,
      key: 'B',
      scale: 'Minor Natural',
      humanize: 0,
      flexTune: 0,
      naturalVibrato: 8,
      vibratoRate: 6.0,
      trackingSensitivity: 96,
    },
    mic: {
      enabled: true,
      selectedMic: 'c800g',
      proximity: 3,
      drive: 38,
      polarPattern: 'cardioid',
      lowCutHz: 120,
      airBoost: 4.5,
    },
    denoise: {
      enabled: true,
      threshold: -48,
      reduction: 18,
      sensitivity: 85,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 1.0,
      invertPhase: false,
      correlation: 0.95,
    },
    mastering: {
      enabled: true,
      lowCut: 35,
      bassGain: 1.5,
      midGain: -0.5,
      highAirGain: 3.8,
      compThreshold: -16,
      compRatio: 4.5,
      compMakeup: 4.0,
      tapeDrive: 42,
      stereoWidth: 125,
      limiterCeiling: -0.1,
    },
    plugins: [
      {
        ...createPlugin('vintage_delay'),
        params: { time: 300, feedback: 40, damping: 5000, mix: 30 },
      },
      {
        ...createPlugin('plate_reverb'),
        params: { decay: 3.5, preDelay: 30, brightness: 80, mix: 30 },
      },
      {
        ...createPlugin('tube_drive'),
        params: { drive: 35, warmth: 70, mix: 45 },
      },
    ],
  },
  {
    id: 'preset-travis-goosebumps',
    name: 'Goosebumps (Low-Register)',
    artist: 'Travis Scott',
    song: 'Goosebumps',
    album: 'Birds in the Trap Sing McKnight',
    category: 'Dark Vocal Heavy Drive',
    description: 'Dark, distorted, chest-heavy vocal chain tuned to E Minor with deep tube warmth, U 47 vintage character, and heavy harmonic thickness.',
    vocalChainSummary: [
      'E Minor 0ms Snap',
      'Neumann U 47 Vintage Tube Drive',
      'Thick Chest Proximity & Harmonic Warmth',
      'Subtle Stereo Doubler',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 0,
      key: 'E',
      scale: 'Minor Natural',
      humanize: 0,
      flexTune: 0,
      naturalVibrato: 10,
      vibratoRate: 6.0,
      trackingSensitivity: 95,
    },
    mic: {
      enabled: true,
      selectedMic: 'u47',
      proximity: 6,
      drive: 45,
      polarPattern: 'cardioid',
      lowCutHz: 80,
      airBoost: 2.5,
    },
    denoise: {
      enabled: true,
      threshold: -50,
      reduction: 16,
      sensitivity: 85,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 0,
      invertPhase: false,
      correlation: 0.95,
    },
    mastering: {
      enabled: true,
      lowCut: 32,
      bassGain: 2.5,
      midGain: 1.0,
      highAirGain: 2.0,
      compThreshold: -17,
      compRatio: 5.0,
      compMakeup: 4.8,
      tapeDrive: 50,
      stereoWidth: 120,
      limiterCeiling: -0.1,
    },
    plugins: [
      {
        ...createPlugin('tube_drive'),
        params: { drive: 55, warmth: 75, mix: 60 },
      },
      {
        ...createPlugin('vocal_chorus'),
        params: { rate: 1.0, depth: 50, width: 80, mix: 35 },
      },
    ],
  },

  // ==========================================
  // HUNXHO
  // ==========================================
  {
    id: 'preset-hunxho-all-not-equal',
    name: 'All Not Equal',
    artist: 'Hunxho',
    song: 'All Not Equal',
    album: '22',
    category: 'Street Melodic Rap',
    description: 'Authentic vocal processing for Hunxho\'s breakthrough hit: authoritative Neumann U 87 Ai midrange clarity, 10ms smooth melodic pitch snapping in G# Minor, scooped 450Hz boxiness, and intimate glued compression.',
    vocalChainSummary: [
      'Neumann U 87 Ai Studio Midrange Benchmark',
      '10ms Melodic Snapping in G# Minor (25% Humanize)',
      'Boxiness Scooped at 450Hz (-2.5dB)',
      'Intimate Slapback Delay Throw (260ms)',
      'Radio-Ready Glued Master Bus',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 10, // Smooth melodic slide
      key: 'G#',
      scale: 'Minor Natural',
      humanize: 25,
      flexTune: 20,
      naturalVibrato: 20,
      vibratoRate: 5.6,
      trackingSensitivity: 92,
    },
    mic: {
      enabled: true,
      selectedMic: 'u87',
      proximity: 5,
      drive: 24,
      polarPattern: 'cardioid',
      lowCutHz: 80,
      airBoost: 2.5,
    },
    denoise: {
      enabled: true,
      threshold: -48,
      reduction: 16,
      sensitivity: 82,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 0.5,
      invertPhase: false,
      correlation: 0.95,
    },
    mastering: {
      enabled: true,
      lowCut: 32,
      bassGain: 1.5,
      midGain: 1.2,
      highAirGain: 2.8,
      compThreshold: -15,
      compRatio: 4.0,
      compMakeup: 4.2,
      tapeDrive: 32,
      stereoWidth: 115,
      limiterCeiling: -0.1,
    },
    plugins: [
      {
        ...createPlugin('parametric_eq'),
        params: { lowGain: 1.0, lowMidGain: -2.5, midGain: 2.0, highMidGain: 2.2, airGain: 2.8 },
      },
      {
        ...createPlugin('vintage_delay'),
        params: { time: 260, feedback: 30, damping: 5000, mix: 24 },
      },
      {
        ...createPlugin('plate_reverb'),
        params: { decay: 2.6, preDelay: 20, brightness: 72, mix: 26 },
      },
    ],
  },
  {
    id: 'preset-hunxho-heartless',
    name: 'Heartless (Street Soul)',
    artist: 'Hunxho',
    song: 'Heartless',
    album: 'Street Melodic Soul',
    category: 'Emotional Melodic Rap',
    description: 'Emotional, rich vocal chain engineered for street soul storytelling: close-proximity Neumann U 87 warmth, 14ms vocal glide in C Minor, de-esser suppression, and a spacious 3.4-second chamber halo.',
    vocalChainSummary: [
      'Close-Proximity U 87 Chest Resonance',
      '14ms Vocal Glide in C Minor',
      'Targeted 6.8kHz De-Esser Sibilance Suppression',
      '3.4s Warm Plate Chamber Halo',
      'Dynamic Glue Compression (3.5:1)',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 14,
      key: 'C',
      scale: 'Minor Natural',
      humanize: 35,
      flexTune: 30,
      naturalVibrato: 28,
      vibratoRate: 5.4,
      trackingSensitivity: 90,
    },
    mic: {
      enabled: true,
      selectedMic: 'u87',
      proximity: 6,
      drive: 28,
      polarPattern: 'cardioid',
      lowCutHz: 80,
      airBoost: 3.0,
    },
    denoise: {
      enabled: true,
      threshold: -52,
      reduction: 18,
      sensitivity: 80,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 1.0,
      invertPhase: false,
      correlation: 0.96,
    },
    mastering: {
      enabled: true,
      lowCut: 30,
      bassGain: 1.8,
      midGain: 1.5,
      highAirGain: 3.0,
      compThreshold: -14,
      compRatio: 3.5,
      compMakeup: 3.8,
      tapeDrive: 28,
      stereoWidth: 120,
      limiterCeiling: -0.2,
    },
    plugins: [
      {
        ...createPlugin('plate_reverb'),
        params: { decay: 3.4, preDelay: 30, brightness: 70, mix: 32 },
      },
      {
        ...createPlugin('vintage_delay'),
        params: { time: 310, feedback: 35, damping: 4800, mix: 22 },
      },
      {
        ...createPlugin('de_esser'),
        params: { frequency: 6800, threshold: -26, reductionMax: 12 },
      },
    ],
  },
  {
    id: 'preset-hunxho-lets-get-it',
    name: "Let's Get It",
    artist: 'Hunxho',
    song: "Let's Get It",
    album: 'Street Anthems',
    category: 'Aggressive Melodic Rap',
    description: 'Fast-paced cadence vocal preset with aggressive Neumann TLM 103 presence peak, 6ms fast autotune snap in D Minor, tight noise gate, and heavy punchy bus compression.',
    vocalChainSummary: [
      'Neumann TLM 103 Transformerless Attack',
      'Fast 6ms Retune Snap in D Minor',
      'High Presence Lift at 5kHz (+3.5dB)',
      'Tight Gated Room Rejection',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 6,
      key: 'D',
      scale: 'Minor Natural',
      humanize: 15,
      flexTune: 10,
      naturalVibrato: 10,
      vibratoRate: 6.0,
      trackingSensitivity: 95,
    },
    mic: {
      enabled: true,
      selectedMic: 'tlm103',
      proximity: 4,
      drive: 22,
      polarPattern: 'cardioid',
      lowCutHz: 120,
      airBoost: 3.8,
    },
    denoise: {
      enabled: true,
      threshold: -45,
      reduction: 20,
      sensitivity: 85,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 0,
      invertPhase: false,
      correlation: 0.94,
    },
    mastering: {
      enabled: true,
      lowCut: 35,
      bassGain: 1.0,
      midGain: 2.0,
      highAirGain: 3.5,
      compThreshold: -18,
      compRatio: 5.0,
      compMakeup: 4.8,
      tapeDrive: 35,
      stereoWidth: 118,
      limiterCeiling: -0.1,
    },
    plugins: [
      {
        ...createPlugin('parametric_eq'),
        params: { lowGain: 0, lowMidGain: -2.0, midGain: 2.0, highMidGain: 3.5, airGain: 3.0 },
      },
      {
        ...createPlugin('vintage_delay'),
        params: { time: 180, feedback: 25, damping: 5500, mix: 20 },
      },
      {
        ...createPlugin('tube_drive'),
        params: { drive: 30, warmth: 50, mix: 40 },
      },
    ],
  },

  // ==========================================
  // POST MALONE
  // ==========================================
  {
    id: 'preset-post-white-iverson',
    name: 'White Iverson (Dream Pop)',
    artist: 'Post Malone',
    song: 'White Iverson',
    album: 'Stoney',
    category: 'Atmospheric Pop / Rap',
    description: 'Post Malone\'s breakout dreamy vocal chain: Shure SM7B dynamic chest intimacy, 18ms silky retune in C# Major with natural vibrato, vintage analog chorus doubler, and a lush 4.8-second plate reverb chamber.',
    vocalChainSummary: [
      'Shure SM7B Close-Proximity Intimacy',
      'Smooth 18ms Retune Glide in C# Major',
      'Dimension Vocal Doubler (90% Width)',
      'Massive 4.8s Ethereal Plate Reverb Chamber',
      'Tape Warmth & Wide Stereo Spread (140%)',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 18,
      key: 'C#',
      scale: 'Major',
      humanize: 35,
      flexTune: 25,
      naturalVibrato: 30,
      vibratoRate: 5.2,
      trackingSensitivity: 92,
    },
    mic: {
      enabled: true,
      selectedMic: 'sm7b',
      proximity: 8, // Very close
      drive: 18,
      polarPattern: 'cardioid',
      lowCutHz: 80,
      airBoost: 2.5,
    },
    denoise: {
      enabled: true,
      threshold: -52,
      reduction: 16,
      sensitivity: 80,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 1.0,
      invertPhase: false,
      correlation: 0.95,
    },
    mastering: {
      enabled: true,
      lowCut: 35,
      bassGain: 1.8,
      midGain: 0.5,
      highAirGain: 3.2,
      compThreshold: -16,
      compRatio: 3.5,
      compMakeup: 4.0,
      tapeDrive: 35,
      stereoWidth: 140,
      limiterCeiling: -0.2,
    },
    plugins: [
      {
        ...createPlugin('vocal_chorus'),
        params: { rate: 1.0, depth: 40, width: 90, mix: 35 },
      },
      {
        ...createPlugin('plate_reverb'),
        params: { decay: 4.8, preDelay: 40, brightness: 65, mix: 40 },
      },
      {
        ...createPlugin('vintage_delay'),
        params: { time: 380, feedback: 40, damping: 4500, mix: 28 },
      },
    ],
  },
  {
    id: 'preset-post-rockstar',
    name: 'Rockstar (Heavy Drive)',
    artist: 'Post Malone',
    song: 'Rockstar',
    album: 'Beerbongs & Bentleys',
    category: 'Heavy Trap / Rock Fusion',
    description: 'Aggressive overdriven trap/rock vocal chain featuring Shure SM7B punch, 8ms hard retune in F Minor, 50% analog tube drive, and brickwall peak limiting.',
    vocalChainSummary: [
      'Shure SM7B High-SPL Handling',
      'Fast 8ms Hard Retune in F Minor',
      'Heavy Dual-Triode Tube Overdrive (55% Mix)',
      'Aggressive Peak Limiter (0.0dB Ceiling)',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 8,
      key: 'F',
      scale: 'Minor Natural',
      humanize: 18,
      flexTune: 10,
      naturalVibrato: 15,
      vibratoRate: 5.8,
      trackingSensitivity: 94,
    },
    mic: {
      enabled: true,
      selectedMic: 'sm7b',
      proximity: 7,
      drive: 35,
      polarPattern: 'cardioid',
      lowCutHz: 120,
      airBoost: 2.0,
    },
    denoise: {
      enabled: true,
      threshold: -46,
      reduction: 20,
      sensitivity: 86,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 0,
      invertPhase: false,
      correlation: 0.94,
    },
    mastering: {
      enabled: true,
      lowCut: 40,
      bassGain: 1.0,
      midGain: 1.8,
      highAirGain: 3.0,
      compThreshold: -18,
      compRatio: 6.0,
      compMakeup: 5.5,
      tapeDrive: 50,
      stereoWidth: 125,
      limiterCeiling: 0.0,
    },
    plugins: [
      {
        ...createPlugin('tube_drive'),
        params: { drive: 50, warmth: 65, mix: 55 },
      },
      {
        ...createPlugin('vintage_delay'),
        params: { time: 220, feedback: 30, damping: 5500, mix: 22 },
      },
      {
        ...createPlugin('plate_reverb'),
        params: { decay: 2.4, preDelay: 20, brightness: 70, mix: 25 },
      },
    ],
  },
  {
    id: 'preset-post-chemical',
    name: 'Chemical (Modern Pop)',
    artist: 'Post Malone',
    song: 'Chemical',
    album: 'Austin',
    category: 'Modern Bright Pop',
    description: 'Bright, energetic, acoustic-driven pop vocal chain with Telefunken ELA M 251E high-end sheen, 22ms transparent pitch correction in G Major, and open 16kHz air EQ.',
    vocalChainSummary: [
      'Telefunken ELA M 251E Silky Air',
      'Transparent 22ms Pitch Correction in G Major',
      'Crystalline 16kHz Air Boost (+4.0dB)',
      'Subtle Vintage Chorus Spread',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 22,
      key: 'G',
      scale: 'Major',
      humanize: 40,
      flexTune: 35,
      naturalVibrato: 35,
      vibratoRate: 5.4,
      trackingSensitivity: 94,
    },
    mic: {
      enabled: true,
      selectedMic: 'elam251',
      proximity: 4,
      drive: 25,
      polarPattern: 'cardioid',
      lowCutHz: 80,
      airBoost: 3.5,
    },
    denoise: {
      enabled: true,
      threshold: -50,
      reduction: 15,
      sensitivity: 80,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 0,
      invertPhase: false,
      correlation: 0.97,
    },
    mastering: {
      enabled: true,
      lowCut: 30,
      bassGain: 0.8,
      midGain: 1.0,
      highAirGain: 3.5,
      compThreshold: -14,
      compRatio: 3.2,
      compMakeup: 3.5,
      tapeDrive: 28,
      stereoWidth: 130,
      limiterCeiling: -0.1,
    },
    plugins: [
      {
        ...createPlugin('parametric_eq'),
        params: { lowGain: 0, lowMidGain: -1.5, midGain: 1.2, highMidGain: 2.5, airGain: 4.0 },
      },
      {
        ...createPlugin('vocal_chorus'),
        params: { rate: 1.2, depth: 30, width: 75, mix: 20 },
      },
      {
        ...createPlugin('plate_reverb'),
        params: { decay: 2.8, preDelay: 25, brightness: 75, mix: 25 },
      },
    ],
  },
  {
    id: 'preset-post-circles',
    name: 'Circles (Smooth Acoustic)',
    artist: 'Post Malone',
    song: 'Circles',
    album: 'Hollywood\'s Bleeding',
    category: 'Melodic Pop / Acoustic',
    description: 'Smooth, warm, analog vocal signature utilizing the Neumann U 87 Ai, 25ms gentle natural tuning in C Major, warm plate reverb, and subtle harmonic saturation.',
    vocalChainSummary: [
      'Neumann U 87 Ai Authoritative Warmth',
      'Gentle 25ms Natural Retune in C Major',
      'Subtle Harmonic Saturation (25% Drive)',
      'Spacious 3.0s Plate Reverb',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 25,
      key: 'C',
      scale: 'Major',
      humanize: 50,
      flexTune: 45,
      naturalVibrato: 35,
      vibratoRate: 5.2,
      trackingSensitivity: 90,
    },
    mic: {
      enabled: true,
      selectedMic: 'u87',
      proximity: 5,
      drive: 15,
      polarPattern: 'cardioid',
      lowCutHz: 80,
      airBoost: 2.0,
    },
    denoise: {
      enabled: true,
      threshold: -52,
      reduction: 14,
      sensitivity: 80,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 0,
      invertPhase: false,
      correlation: 0.98,
    },
    mastering: {
      enabled: true,
      lowCut: 30,
      bassGain: 1.2,
      midGain: 0.8,
      highAirGain: 2.0,
      compThreshold: -14,
      compRatio: 3.0,
      compMakeup: 3.2,
      tapeDrive: 25,
      stereoWidth: 120,
      limiterCeiling: -0.2,
    },
    plugins: [
      {
        ...createPlugin('parametric_eq'),
        params: { lowGain: 1.5, lowMidGain: -1.0, midGain: 1.0, highMidGain: 1.8, airGain: 2.5 },
      },
      {
        ...createPlugin('plate_reverb'),
        params: { decay: 3.0, preDelay: 25, brightness: 65, mix: 28 },
      },
    ],
  },

  // ==========================================
  // DON TOLIVER
  // ==========================================
  {
    id: 'preset-don-no-idea',
    name: 'No Idea (Euphoric Vault)',
    artist: 'Don Toliver',
    song: 'No Idea',
    album: 'Heaven or Hell',
    category: 'Psychedelic Melodic Trap',
    description: 'The iconic high-register euphoric vocal chain: vintage AKG C12 brass capsule shimmering high air, 0ms hard autotune snap in F# Minor, wide chorus doubler, and deep psychedelic 4.5-second plate reflections.',
    vocalChainSummary: [
      'AKG C12 Vintage Brass Capsule Highs',
      'Euphoric 0ms Retune Snap in F# Minor',
      'Dimension Doubler Chorus (100% Spread)',
      'Deep 4.5s Psychedelic Plate Reverb',
      'Ultra-Wide 160% Stereo Imaging',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 0,
      key: 'F#',
      scale: 'Minor Natural',
      humanize: 0,
      flexTune: 0,
      naturalVibrato: 15,
      vibratoRate: 6.2,
      trackingSensitivity: 98,
    },
    mic: {
      enabled: true,
      selectedMic: 'c12',
      proximity: 3,
      drive: 32,
      polarPattern: 'cardioid',
      lowCutHz: 80,
      airBoost: 5.5,
    },
    denoise: {
      enabled: true,
      threshold: -48,
      reduction: 18,
      sensitivity: 85,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 1.5,
      invertPhase: false,
      correlation: 0.95,
    },
    mastering: {
      enabled: true,
      lowCut: 40,
      bassGain: 0.5,
      midGain: 1.0,
      highAirGain: 5.0,
      compThreshold: -16,
      compRatio: 4.2,
      compMakeup: 4.2,
      tapeDrive: 42,
      stereoWidth: 160,
      limiterCeiling: -0.1,
    },
    plugins: [
      {
        ...createPlugin('vocal_chorus'),
        params: { rate: 1.6, depth: 65, width: 100, mix: 45 },
      },
      {
        ...createPlugin('vintage_delay'),
        params: { time: 340, feedback: 45, damping: 5500, mix: 35 },
      },
      {
        ...createPlugin('plate_reverb'),
        params: { decay: 4.5, preDelay: 35, brightness: 85, mix: 42 },
      },
    ],
  },
  {
    id: 'preset-don-after-party',
    name: 'After Party',
    artist: 'Don Toliver',
    song: 'After Party',
    album: 'Heaven or Hell',
    category: 'Upbeat Melodic Trap',
    description: 'High-energy bouncy melodic trap vocal chain featuring Sony C-800G hyper-clarity, 2ms rapid retune in G# Minor, ping-pong delay echoes, and tube warmth.',
    vocalChainSummary: [
      'Sony C-800G Hyper-Clarity',
      'Rapid 2ms Retune in G# Minor',
      'Synchronized 260ms Ping-Pong Delay',
      'Harmonic Tube Saturation (45% Mix)',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 2,
      key: 'G#',
      scale: 'Minor Natural',
      humanize: 10,
      flexTune: 5,
      naturalVibrato: 10,
      vibratoRate: 6.0,
      trackingSensitivity: 96,
    },
    mic: {
      enabled: true,
      selectedMic: 'c800g',
      proximity: 3,
      drive: 35,
      polarPattern: 'cardioid',
      lowCutHz: 120,
      airBoost: 5.0,
    },
    denoise: {
      enabled: true,
      threshold: -46,
      reduction: 18,
      sensitivity: 85,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 0.5,
      invertPhase: false,
      correlation: 0.95,
    },
    mastering: {
      enabled: true,
      lowCut: 35,
      bassGain: 1.0,
      midGain: 0.5,
      highAirGain: 4.0,
      compThreshold: -16,
      compRatio: 4.5,
      compMakeup: 4.0,
      tapeDrive: 38,
      stereoWidth: 135,
      limiterCeiling: -0.1,
    },
    plugins: [
      {
        ...createPlugin('vintage_delay'),
        params: { time: 260, feedback: 35, damping: 6000, mix: 30 },
      },
      {
        ...createPlugin('plate_reverb'),
        params: { decay: 3.2, preDelay: 25, brightness: 80, mix: 32 },
      },
      {
        ...createPlugin('tube_drive'),
        params: { drive: 38, warmth: 60, mix: 45 },
      },
    ],
  },
  {
    id: 'preset-don-cardigan',
    name: 'Cardigan',
    artist: 'Don Toliver',
    song: 'Cardigan',
    album: 'Heaven or Hell',
    category: 'Atmospheric R&B Trap',
    description: 'Smooth, spacious vocal chain with Telefunken ELA M 251E tube warmth, 4ms autotune snap in D# Minor, wide chorus doubler, and 3.8-second plate reverb.',
    vocalChainSummary: [
      'Telefunken ELA M 251E Tube Warmth',
      '4ms Autotune Snap in D# Minor',
      'Atmospheric 3.8s Plate Reverb',
      'Subtle Vocal Chorus Modulation',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 4,
      key: 'D#',
      scale: 'Minor Natural',
      humanize: 12,
      flexTune: 10,
      naturalVibrato: 15,
      vibratoRate: 5.8,
      trackingSensitivity: 95,
    },
    mic: {
      enabled: true,
      selectedMic: 'elam251',
      proximity: 4,
      drive: 30,
      polarPattern: 'cardioid',
      lowCutHz: 80,
      airBoost: 4.0,
    },
    denoise: {
      enabled: true,
      threshold: -48,
      reduction: 16,
      sensitivity: 82,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 1.0,
      invertPhase: false,
      correlation: 0.95,
    },
    mastering: {
      enabled: true,
      lowCut: 32,
      bassGain: 1.2,
      midGain: 0.8,
      highAirGain: 3.5,
      compThreshold: -15,
      compRatio: 3.8,
      compMakeup: 3.8,
      tapeDrive: 35,
      stereoWidth: 140,
      limiterCeiling: -0.1,
    },
    plugins: [
      {
        ...createPlugin('plate_reverb'),
        params: { decay: 3.8, preDelay: 30, brightness: 75, mix: 35 },
      },
      {
        ...createPlugin('vocal_chorus'),
        params: { rate: 1.2, depth: 45, width: 85, mix: 30 },
      },
      {
        ...createPlugin('vintage_delay'),
        params: { time: 300, feedback: 32, damping: 5000, mix: 25 },
      },
    ],
  },
  {
    id: 'preset-don-tore-up',
    name: 'Tore Up (Hard Trap)',
    artist: 'Don Toliver',
    song: 'Tore Up',
    album: 'Hardstone Psycho',
    category: 'Biker Rock / Heavy Trap',
    description: 'Fast, high-octane rock-trap vocal chain with Sony C-800G presence, hard 0ms retune in F Minor, split-band de-esser control, and aggressive tube saturation.',
    vocalChainSummary: [
      '0ms Hard Snap in F Minor',
      'Sony C-800G High-Gain Saturation',
      'Split-Band 7.2kHz Sibilance Suppression',
      'Punchy 808 Cut Below 38Hz',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 0,
      key: 'F',
      scale: 'Minor Natural',
      humanize: 0,
      flexTune: 0,
      naturalVibrato: 8,
      vibratoRate: 6.5,
      trackingSensitivity: 98,
    },
    mic: {
      enabled: true,
      selectedMic: 'c800g',
      proximity: 3,
      drive: 42,
      polarPattern: 'cardioid',
      lowCutHz: 120,
      airBoost: 5.2,
    },
    denoise: {
      enabled: true,
      threshold: -45,
      reduction: 20,
      sensitivity: 88,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 0,
      invertPhase: false,
      correlation: 0.94,
    },
    mastering: {
      enabled: true,
      lowCut: 38,
      bassGain: 1.2,
      midGain: 1.5,
      highAirGain: 4.5,
      compThreshold: -17,
      compRatio: 5.0,
      compMakeup: 4.5,
      tapeDrive: 45,
      stereoWidth: 130,
      limiterCeiling: 0.0,
    },
    plugins: [
      {
        ...createPlugin('de_esser'),
        params: { frequency: 7200, threshold: -28, reductionMax: 14 },
      },
      {
        ...createPlugin('tube_drive'),
        params: { drive: 45, warmth: 50, mix: 50 },
      },
      {
        ...createPlugin('vintage_delay'),
        params: { time: 240, feedback: 30, damping: 6500, mix: 25 },
      },
    ],
  },

  // ==========================================
  // LOE SHIMMY
  // ==========================================
  {
    id: 'preset-loe-bounty-hunter',
    name: 'Bounty Hunter',
    artist: 'Loe Shimmy',
    song: 'Bounty Hunter',
    album: 'Zaza Land',
    category: 'Gritty Florida Trap',
    description: 'Raw, visceral Florida underground trap vocal signature: aggressive Sennheiser MD 421 dynamic midrange bite, 8ms hard retune in A Minor, gritty tube saturation, and short slapback delay.',
    vocalChainSummary: [
      'Sennheiser MD 421 Dynamic Raw Midrange Bite',
      'Aggressive 8ms Snapping in A Minor',
      'Gritty Florida Tube Saturation (50% Mix)',
      'Tight 190ms Slapback Echo',
      'Maximum Loudness Brickwall Limiter',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 8,
      key: 'A',
      scale: 'Minor Natural',
      humanize: 18,
      flexTune: 15,
      naturalVibrato: 10,
      vibratoRate: 6.0,
      trackingSensitivity: 92,
    },
    mic: {
      enabled: true,
      selectedMic: 'md421',
      proximity: 6,
      drive: 38,
      polarPattern: 'cardioid',
      lowCutHz: 80,
      airBoost: 2.2,
    },
    denoise: {
      enabled: true,
      threshold: -46,
      reduction: 18,
      sensitivity: 85,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 0,
      invertPhase: false,
      correlation: 0.94,
    },
    mastering: {
      enabled: true,
      lowCut: 35,
      bassGain: 1.5,
      midGain: 2.2,
      highAirGain: 2.5,
      compThreshold: -18,
      compRatio: 5.0,
      compMakeup: 4.8,
      tapeDrive: 42,
      stereoWidth: 115,
      limiterCeiling: 0.0,
    },
    plugins: [
      {
        ...createPlugin('tube_drive'),
        params: { drive: 45, warmth: 60, mix: 50 },
      },
      {
        ...createPlugin('vintage_delay'),
        params: { time: 190, feedback: 28, damping: 5000, mix: 25 },
      },
      {
        ...createPlugin('parametric_eq'),
        params: { lowGain: 0.5, lowMidGain: -2.0, midGain: 2.5, highMidGain: 3.0, airGain: 2.5 },
      },
    ],
  },
  {
    id: 'preset-loe-cant-blame-em',
    name: "Can't Blame Em",
    artist: 'Loe Shimmy',
    song: "Can't Blame Em",
    album: 'Florida Soul',
    category: 'Melodic Street Trap',
    description: 'Emotional Florida street melodic vocal chain with Neumann U 87 presence, 12ms smooth vocal slide in E Minor, warm room reflections, and analog tape drive.',
    vocalChainSummary: [
      'Neumann U 87 Warm Low-Mids',
      '12ms Sliding Autotune in E Minor',
      'Intimate 2.6s Plate Reverb',
      'Analog Tape Harmonic Saturation',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 12,
      key: 'E',
      scale: 'Minor Natural',
      humanize: 28,
      flexTune: 20,
      naturalVibrato: 18,
      vibratoRate: 5.6,
      trackingSensitivity: 92,
    },
    mic: {
      enabled: true,
      selectedMic: 'u87',
      proximity: 5,
      drive: 25,
      polarPattern: 'cardioid',
      lowCutHz: 80,
      airBoost: 2.0,
    },
    denoise: {
      enabled: true,
      threshold: -48,
      reduction: 16,
      sensitivity: 82,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 0.5,
      invertPhase: false,
      correlation: 0.95,
    },
    mastering: {
      enabled: true,
      lowCut: 32,
      bassGain: 1.2,
      midGain: 1.5,
      highAirGain: 2.5,
      compThreshold: -16,
      compRatio: 4.0,
      compMakeup: 4.0,
      tapeDrive: 35,
      stereoWidth: 120,
      limiterCeiling: -0.1,
    },
    plugins: [
      {
        ...createPlugin('plate_reverb'),
        params: { decay: 2.6, preDelay: 20, brightness: 68, mix: 26 },
      },
      {
        ...createPlugin('vintage_delay'),
        params: { time: 240, feedback: 30, damping: 5200, mix: 22 },
      },
    ],
  },
  {
    id: 'preset-loe-zaza',
    name: 'Zaza (Hypnotic Cadence)',
    artist: 'Loe Shimmy',
    song: 'Zaza',
    album: 'Zaza Land',
    category: 'Hypnotic Florida Trap',
    description: 'Hypnotic cadence vocal preset tuned to C# Minor with Sony C-800G clarity, 5ms rapid autotune snap, stereo ping-pong delay throw, and crisp highs.',
    vocalChainSummary: [
      'Sony C-800G Top End Sheen',
      '5ms Rapid Autotune Snap in C# Minor',
      'Stereo Ping-Pong Delay (280ms)',
      'Subtle Overdrive Peak Shaping',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 5,
      key: 'C#',
      scale: 'Minor Natural',
      humanize: 15,
      flexTune: 10,
      naturalVibrato: 12,
      vibratoRate: 6.0,
      trackingSensitivity: 95,
    },
    mic: {
      enabled: true,
      selectedMic: 'c800g',
      proximity: 3,
      drive: 32,
      polarPattern: 'cardioid',
      lowCutHz: 120,
      airBoost: 4.5,
    },
    denoise: {
      enabled: true,
      threshold: -46,
      reduction: 18,
      sensitivity: 85,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 0,
      invertPhase: false,
      correlation: 0.95,
    },
    mastering: {
      enabled: true,
      lowCut: 35,
      bassGain: 1.0,
      midGain: 1.0,
      highAirGain: 4.0,
      compThreshold: -16,
      compRatio: 4.5,
      compMakeup: 4.2,
      tapeDrive: 38,
      stereoWidth: 125,
      limiterCeiling: -0.1,
    },
    plugins: [
      {
        ...createPlugin('vintage_delay'),
        params: { time: 280, feedback: 38, damping: 5800, mix: 30 },
      },
      {
        ...createPlugin('tube_drive'),
        params: { drive: 35, warmth: 55, mix: 40 },
      },
    ],
  },

  // ==========================================
  // LIL TECCA
  // ==========================================
  {
    id: 'preset-tecca-ransom',
    name: 'Ransom (Pop-Trap Anthem)',
    artist: 'Lil Tecca',
    song: 'Ransom',
    album: 'We Love You Tecca',
    category: 'Melodic Pop Trap',
    description: 'The iconic breakout sound of Lil Tecca: unmistakable Sony C-800G piercing high-end presence, 0ms hard autotune snap in B Minor, scooped low-mids to sit perfectly on bouncy Pi\'erre-style beats, and bright plate reverb.',
    vocalChainSummary: [
      'Iconic 0ms Hard Snap in B Minor',
      'Sony C-800G Piercing High-End Sheen (+5.0dB)',
      'Scooped Low-Mids (-3.0dB) for Pop-Trap Bounce',
      'Short 2.2s Bright Plate Reverb Halo',
      'Glued 125% Stereo Master Width',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 0,
      key: 'B',
      scale: 'Minor Natural',
      humanize: 0,
      flexTune: 0,
      naturalVibrato: 10,
      vibratoRate: 6.2,
      trackingSensitivity: 98,
    },
    mic: {
      enabled: true,
      selectedMic: 'c800g',
      proximity: 3,
      drive: 28,
      polarPattern: 'cardioid',
      lowCutHz: 120,
      airBoost: 5.0,
    },
    denoise: {
      enabled: true,
      threshold: -48,
      reduction: 20,
      sensitivity: 85,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: -1.0,
      invertPhase: false,
      correlation: 0.96,
    },
    mastering: {
      enabled: true,
      lowCut: 40,
      bassGain: 0.8,
      midGain: 1.0,
      highAirGain: 4.5,
      compThreshold: -16,
      compRatio: 4.5,
      compMakeup: 4.2,
      tapeDrive: 30,
      stereoWidth: 125,
      limiterCeiling: -0.1,
    },
    plugins: [
      {
        ...createPlugin('parametric_eq'),
        params: { lowGain: 0, lowMidGain: -3.0, midGain: 2.0, highMidGain: 3.5, airGain: 4.5 },
      },
      {
        ...createPlugin('vintage_delay'),
        params: { time: 220, feedback: 28, damping: 6500, mix: 22 },
      },
      {
        ...createPlugin('plate_reverb'),
        params: { decay: 2.2, preDelay: 20, brightness: 85, mix: 24 },
      },
    ],
  },
  {
    id: 'preset-tecca-500lbs',
    name: '500lbs (Modern Flow)',
    artist: 'Lil Tecca',
    song: '500lbs',
    album: 'TEC',
    category: 'Modern Melodic Rap',
    description: 'Modern bouncy cadence vocal preset from TEC: Sony C-800G clarity with +5.5dB 16kHz air, rapid 3ms autotune snap in G Minor, clean stereo doubler, and tight room control.',
    vocalChainSummary: [
      'Sony C-800G High Air Boost (+5.5dB)',
      'Rapid 3ms Retune Snap in G Minor',
      'Stereo Doubler Chorus (90% Width)',
      'Modern Radio Pop-Rap Master Glue',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 3,
      key: 'G',
      scale: 'Minor Natural',
      humanize: 12,
      flexTune: 8,
      naturalVibrato: 12,
      vibratoRate: 6.0,
      trackingSensitivity: 96,
    },
    mic: {
      enabled: true,
      selectedMic: 'c800g',
      proximity: 3,
      drive: 30,
      polarPattern: 'cardioid',
      lowCutHz: 120,
      airBoost: 5.5,
    },
    denoise: {
      enabled: true,
      threshold: -46,
      reduction: 18,
      sensitivity: 85,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 0,
      invertPhase: false,
      correlation: 0.95,
    },
    mastering: {
      enabled: true,
      lowCut: 35,
      bassGain: 1.0,
      midGain: 1.2,
      highAirGain: 4.8,
      compThreshold: -16,
      compRatio: 4.2,
      compMakeup: 4.0,
      tapeDrive: 35,
      stereoWidth: 135,
      limiterCeiling: -0.1,
    },
    plugins: [
      {
        ...createPlugin('vocal_chorus'),
        params: { rate: 1.5, depth: 40, width: 90, mix: 28 },
      },
      {
        ...createPlugin('vintage_delay'),
        params: { time: 240, feedback: 30, damping: 6000, mix: 25 },
      },
      {
        ...createPlugin('parametric_eq'),
        params: { lowGain: 0, lowMidGain: -2.0, midGain: 1.8, highMidGain: 3.0, airGain: 5.0 },
      },
    ],
  },
  {
    id: 'preset-tecca-did-it-again',
    name: 'Did It Again',
    artist: 'Lil Tecca',
    song: 'Did It Again',
    album: 'We Love You Tecca',
    category: 'Melodic Pop Trap',
    description: 'Bright catchy melodic rap vocal signature with Sony C-800G, 0ms retune in D Minor, wide chorus modulation, and tape drive warmth.',
    vocalChainSummary: [
      '0ms Hard Snap in D Minor',
      'C-800G Modern High End',
      'Wide Chorus Doubler (30% Mix)',
      'Bright Pop Vocal Master',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 0,
      key: 'D',
      scale: 'Minor Natural',
      humanize: 0,
      flexTune: 0,
      naturalVibrato: 10,
      vibratoRate: 6.0,
      trackingSensitivity: 96,
    },
    mic: {
      enabled: true,
      selectedMic: 'c800g',
      proximity: 3,
      drive: 26,
      polarPattern: 'cardioid',
      lowCutHz: 120,
      airBoost: 4.8,
    },
    denoise: {
      enabled: true,
      threshold: -48,
      reduction: 18,
      sensitivity: 85,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 0,
      invertPhase: false,
      correlation: 0.95,
    },
    mastering: {
      enabled: true,
      lowCut: 35,
      bassGain: 0.8,
      midGain: 1.0,
      highAirGain: 4.0,
      compThreshold: -15,
      compRatio: 4.0,
      compMakeup: 3.8,
      tapeDrive: 32,
      stereoWidth: 125,
      limiterCeiling: -0.1,
    },
    plugins: [
      {
        ...createPlugin('vocal_chorus'),
        params: { rate: 1.3, depth: 45, width: 85, mix: 30 },
      },
      {
        ...createPlugin('plate_reverb'),
        params: { decay: 2.5, preDelay: 20, brightness: 80, mix: 25 },
      },
    ],
  },
  {
    id: 'preset-tecca-never-left',
    name: 'Never Left',
    artist: 'Lil Tecca',
    song: 'Never Left',
    album: 'We Love You Tecca 2',
    category: 'Fast Pop Trap',
    description: 'Fast syncopated flow vocal chain utilizing the Neumann TLM 103, 2ms rapid retune in F Minor, clean 120Hz low cut, and tight slapback delay.',
    vocalChainSummary: [
      'Neumann TLM 103 Transient Attack',
      '2ms Rapid Retune in F Minor',
      'Clean 120Hz Low Cut',
      'Tight 200ms Slapback Echo',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 2,
      key: 'F',
      scale: 'Minor Natural',
      humanize: 10,
      flexTune: 5,
      naturalVibrato: 10,
      vibratoRate: 6.0,
      trackingSensitivity: 95,
    },
    mic: {
      enabled: true,
      selectedMic: 'tlm103',
      proximity: 4,
      drive: 20,
      polarPattern: 'cardioid',
      lowCutHz: 120,
      airBoost: 4.0,
    },
    denoise: {
      enabled: true,
      threshold: -46,
      reduction: 18,
      sensitivity: 85,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 0,
      invertPhase: false,
      correlation: 0.95,
    },
    mastering: {
      enabled: true,
      lowCut: 40,
      bassGain: 0.8,
      midGain: 1.5,
      highAirGain: 4.0,
      compThreshold: -16,
      compRatio: 4.5,
      compMakeup: 4.0,
      tapeDrive: 32,
      stereoWidth: 120,
      limiterCeiling: -0.1,
    },
    plugins: [
      {
        ...createPlugin('vintage_delay'),
        params: { time: 200, feedback: 25, damping: 6000, mix: 20 },
      },
      {
        ...createPlugin('parametric_eq'),
        params: { lowGain: 0, lowMidGain: -2.5, midGain: 1.5, highMidGain: 3.0, airGain: 4.0 },
      },
    ],
  },

  // ==========================================
  // GUNNA
  // ==========================================
  {
    id: 'preset-gunna-drip-too-hard',
    name: 'Drip Too Hard',
    artist: 'Gunna',
    song: 'Drip Too Hard',
    album: 'Drip Harder',
    category: 'Smooth Melodic Trap',
    description: 'The golden standard of Gunna\'s effortless melodic cadence: Telefunken ELA M 251E velvet tube warmth, 12ms smooth pitch glide in C# Minor, scooped 450Hz boxiness, lush 2.8s plate reverb, and 130% wide stereo imaging.',
    vocalChainSummary: [
      'Telefunken ELA M 251E Velvet Tube Warmth',
      'Smooth 12ms Effortless Pitch Slide in C# Minor',
      'Polished 450Hz Mid-Scoop (-2.0dB)',
      'Lush 2.8s Warm Reverb Chamber',
      '130% Wide Stereo Master Image',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 12,
      key: 'C#',
      scale: 'Minor Natural',
      humanize: 22,
      flexTune: 20,
      naturalVibrato: 15,
      vibratoRate: 5.6,
      trackingSensitivity: 94,
    },
    mic: {
      enabled: true,
      selectedMic: 'elam251',
      proximity: 4,
      drive: 30,
      polarPattern: 'cardioid',
      lowCutHz: 80,
      airBoost: 3.8,
    },
    denoise: {
      enabled: true,
      threshold: -50,
      reduction: 16,
      sensitivity: 82,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 0.5,
      invertPhase: false,
      correlation: 0.96,
    },
    mastering: {
      enabled: true,
      lowCut: 32,
      bassGain: 1.2,
      midGain: 0.5,
      highAirGain: 3.5,
      compThreshold: -15,
      compRatio: 3.5,
      compMakeup: 3.8,
      tapeDrive: 32,
      stereoWidth: 130,
      limiterCeiling: -0.1,
    },
    plugins: [
      {
        ...createPlugin('parametric_eq'),
        params: { lowGain: 0.5, lowMidGain: -2.0, midGain: 1.2, highMidGain: 2.0, airGain: 3.5 },
      },
      {
        ...createPlugin('vintage_delay'),
        params: { time: 270, feedback: 30, damping: 5000, mix: 24 },
      },
      {
        ...createPlugin('plate_reverb'),
        params: { decay: 2.8, preDelay: 25, brightness: 70, mix: 26 },
      },
    ],
  },
  {
    id: 'preset-gunna-fukumean',
    name: 'Fukumean (Radio Standard)',
    artist: 'Gunna',
    song: 'Fukumean',
    album: 'A Gift & a Curse',
    category: 'Billboard Modern Trap',
    description: 'Gunna\'s #1 Billboard hit vocal chain: in-your-face Neumann U 87 Ai crisp punch, fast 8ms melodic snap in F Minor, slap delay throw, and modern glued master bus compression.',
    vocalChainSummary: [
      'Neumann U 87 Ai In-Your-Face Clarity',
      'Fast 8ms Melodic Snap in F Minor',
      'Crisp Tape Slapback Delay (240ms)',
      'Modern Glued VCA Master Bus Compression',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 8,
      key: 'F',
      scale: 'Minor Natural',
      humanize: 18,
      flexTune: 15,
      naturalVibrato: 12,
      vibratoRate: 5.8,
      trackingSensitivity: 94,
    },
    mic: {
      enabled: true,
      selectedMic: 'u87',
      proximity: 5,
      drive: 25,
      polarPattern: 'cardioid',
      lowCutHz: 80,
      airBoost: 3.0,
    },
    denoise: {
      enabled: true,
      threshold: -48,
      reduction: 18,
      sensitivity: 85,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 0,
      invertPhase: false,
      correlation: 0.95,
    },
    mastering: {
      enabled: true,
      lowCut: 35,
      bassGain: 1.2,
      midGain: 1.5,
      highAirGain: 3.8,
      compThreshold: -16,
      compRatio: 4.0,
      compMakeup: 4.2,
      tapeDrive: 36,
      stereoWidth: 125,
      limiterCeiling: 0.0,
    },
    plugins: [
      {
        ...createPlugin('vintage_delay'),
        params: { time: 240, feedback: 32, damping: 5500, mix: 25 },
      },
      {
        ...createPlugin('plate_reverb'),
        params: { decay: 2.4, preDelay: 20, brightness: 75, mix: 25 },
      },
      {
        ...createPlugin('tube_drive'),
        params: { drive: 32, warmth: 55, mix: 40 },
      },
    ],
  },
  {
    id: 'preset-gunna-top-off',
    name: 'Top Off',
    artist: 'Gunna',
    song: 'Top Off',
    album: 'Drip or Drown 2',
    category: 'Silky Melodic Trap',
    description: 'Smooth, effortless vocal float featuring the Telefunken ELA M 251E, 15ms retune in A Minor, warm plate reverb, and gentle de-essing.',
    vocalChainSummary: [
      'Telefunken ELA M 251E Silk',
      '15ms Retune Glide in A Minor',
      'Warm Plate Chamber Reverb (3.2s)',
      'Subtle Vocal Chorus Detune',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 15,
      key: 'A',
      scale: 'Minor Natural',
      humanize: 30,
      flexTune: 25,
      naturalVibrato: 20,
      vibratoRate: 5.4,
      trackingSensitivity: 92,
    },
    mic: {
      enabled: true,
      selectedMic: 'elam251',
      proximity: 4,
      drive: 28,
      polarPattern: 'cardioid',
      lowCutHz: 80,
      airBoost: 3.5,
    },
    denoise: {
      enabled: true,
      threshold: -50,
      reduction: 16,
      sensitivity: 80,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 0.5,
      invertPhase: false,
      correlation: 0.96,
    },
    mastering: {
      enabled: true,
      lowCut: 30,
      bassGain: 1.0,
      midGain: 0.8,
      highAirGain: 3.0,
      compThreshold: -15,
      compRatio: 3.5,
      compMakeup: 3.8,
      tapeDrive: 30,
      stereoWidth: 130,
      limiterCeiling: -0.1,
    },
    plugins: [
      {
        ...createPlugin('plate_reverb'),
        params: { decay: 3.2, preDelay: 25, brightness: 70, mix: 30 },
      },
      {
        ...createPlugin('vocal_chorus'),
        params: { rate: 1.1, depth: 35, width: 80, mix: 22 },
      },
    ],
  },
  {
    id: 'preset-gunna-pushin-p',
    name: 'Pushin P',
    artist: 'Gunna',
    song: 'Pushin P',
    album: 'DS4EVER',
    category: 'Modern Atlanta Trap',
    description: 'Clean, punchy Atlanta studio sound with Sony C-800G clarity, 6ms snappy autotune in G# Minor, dynamic sidechain pocket, and clear 10kHz air boost.',
    vocalChainSummary: [
      'Sony C-800G Crisp Top End',
      '6ms Snappy Autotune in G# Minor',
      'Dynamic Sidechain Beat Ducking',
      'High-Air Parametric Lift (+4.0dB)',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 6,
      key: 'G#',
      scale: 'Minor Natural',
      humanize: 15,
      flexTune: 10,
      naturalVibrato: 10,
      vibratoRate: 6.0,
      trackingSensitivity: 96,
    },
    mic: {
      enabled: true,
      selectedMic: 'c800g',
      proximity: 3,
      drive: 32,
      polarPattern: 'cardioid',
      lowCutHz: 120,
      airBoost: 4.5,
    },
    denoise: {
      enabled: true,
      threshold: -46,
      reduction: 18,
      sensitivity: 85,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 0,
      invertPhase: false,
      correlation: 0.95,
    },
    mastering: {
      enabled: true,
      lowCut: 35,
      bassGain: 1.2,
      midGain: 1.0,
      highAirGain: 4.0,
      compThreshold: -16,
      compRatio: 4.0,
      compMakeup: 4.0,
      tapeDrive: 35,
      stereoWidth: 125,
      limiterCeiling: -0.1,
    },
    plugins: [
      {
        ...createPlugin('parametric_eq'),
        params: { lowGain: 0, lowMidGain: -2.0, midGain: 1.5, highMidGain: 2.5, airGain: 4.0 },
      },
      {
        ...createPlugin('vintage_delay'),
        params: { time: 250, feedback: 28, damping: 5500, mix: 24 },
      },
    ],
  },

  // ==========================================
  // DRAKE
  // ==========================================
  {
    id: 'preset-drake-search-and-rescue',
    name: 'Search & Rescue',
    artist: 'Drake',
    song: 'Search & Rescue',
    album: 'For All The Dogs Era',
    category: 'Toronto Melodic Rap',
    description: 'Noah "40" Shebib\'s signature Toronto production sound: Neumann U 87 Ai thick low-mids, 12ms smooth tuning in G Minor, low-pass damped delay throws, and glued VCA master compression.',
    vocalChainSummary: [
      'Neumann U 87 Ai Authoritative Vocal Weight',
      'Smooth 12ms Retune Glide in G Minor',
      'Signature 40 Low-Pass Damped Delay',
      'Punchy 120% Stereo Bus Compression',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 12,
      key: 'G',
      scale: 'Minor Natural',
      humanize: 20,
      flexTune: 20,
      naturalVibrato: 15,
      vibratoRate: 5.6,
      trackingSensitivity: 94,
    },
    mic: {
      enabled: true,
      selectedMic: 'u87',
      proximity: 5,
      drive: 24,
      polarPattern: 'cardioid',
      lowCutHz: 80,
      airBoost: 2.0,
    },
    denoise: {
      enabled: true,
      threshold: -50,
      reduction: 16,
      sensitivity: 82,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: 0.5,
      invertPhase: false,
      correlation: 0.95,
    },
    mastering: {
      enabled: true,
      lowCut: 32,
      bassGain: 1.5,
      midGain: 1.5,
      highAirGain: 2.5,
      compThreshold: -15,
      compRatio: 4.0,
      compMakeup: 4.2,
      tapeDrive: 35,
      stereoWidth: 120,
      limiterCeiling: -0.1,
    },
    plugins: [
      {
        ...createPlugin('vintage_delay'),
        params: { time: 280, feedback: 28, damping: 4500, mix: 22 },
      },
      {
        ...createPlugin('plate_reverb'),
        params: { decay: 2.4, preDelay: 20, brightness: 70, mix: 25 },
      },
      {
        ...createPlugin('parametric_eq'),
        params: { lowGain: 0.8, lowMidGain: -1.5, midGain: 1.8, highMidGain: 2.0, airGain: 2.5 },
      },
    ],
  },

  // ==========================================
  // PLAYBOI CARTI
  // ==========================================
  {
    id: 'preset-carti-baby-voice',
    name: 'FE!N (Baby Voice Sizzler)',
    artist: 'Playboi Carti',
    song: 'FE!N',
    album: 'Utopia',
    category: 'Experimental Rage / Baby Voice',
    description: 'Extreme high-frequency rage vocal texture: Sony C-800G with heavy +6dB air boost, 0ms instantaneous snap in G# Minor, high-pass 120Hz cut, and overdriven dual-triode tube distortion.',
    vocalChainSummary: [
      '0ms Instantaneous Quantization in G# Minor',
      'Sony C-800G Crystalline Air (+6dB)',
      'Heavy Dual-Triode Overdrive (75% Mix)',
      'High-Pass 120Hz Rumble Eliminator',
      'Aggressive Modern Rage Master Bus',
    ],
    tuning: {
      enabled: true,
      retuneSpeed: 0,
      key: 'G#',
      scale: 'Minor Natural',
      humanize: 0,
      flexTune: 0,
      naturalVibrato: 0,
      vibratoRate: 7.0,
      trackingSensitivity: 100,
    },
    mic: {
      enabled: true,
      selectedMic: 'c800g',
      proximity: 2,
      drive: 55,
      polarPattern: 'cardioid',
      lowCutHz: 120,
      airBoost: 6.0,
    },
    denoise: {
      enabled: true,
      threshold: -44,
      reduction: 22,
      sensitivity: 90,
      noiseFloorLearned: true,
      isLearning: false,
    },
    align: {
      enabled: true,
      delayMs: -2.0,
      invertPhase: false,
      correlation: 0.90,
    },
    mastering: {
      enabled: true,
      lowCut: 45,
      bassGain: -0.5,
      midGain: 2.2,
      highAirGain: 5.0,
      compThreshold: -19,
      compRatio: 6.0,
      compMakeup: 6.0,
      tapeDrive: 60,
      stereoWidth: 140,
      limiterCeiling: 0.0,
    },
    plugins: [
      {
        ...createPlugin('tube_drive'),
        params: { drive: 60, warmth: 40, mix: 75 },
      },
      {
        ...createPlugin('parametric_eq'),
        params: { lowGain: -4.0, lowMidGain: -3.0, midGain: 2.5, highMidGain: 4.0, airGain: 5.5 },
      },
      {
        ...createPlugin('vintage_delay'),
        params: { time: 200, feedback: 40, damping: 7000, mix: 30 },
      },
    ],
  },
];

export function enrichPresetWithMLAndQuality(preset: ArtistVocalPreset): ArtistVocalPreset {
  if (preset.pitchFormant && preset.aiEnhancer) {
    return preset;
  }

  const artistLower = preset.artist.toLowerCase();
  const catLower = (preset.category || '').toLowerCase();

  // Determine ML Formant Model & settings based on artist vibe
  let formantSemi = 0;
  let throat = 1.0;
  let character: 'custom' | 'deep_chest' | 'hyperpop' | 'chopped' | 'melodic_lift' | 'alien' = 'custom';
  let mlModel: 'neural_vowel' | 'transformer_formant' | 'deep_timbre' | 'spectral_morph' = 'neural_vowel';
  let mlWarmth = 60;
  let mlAir = 75;
  let mlClamping = 75;
  let f1 = 0;
  let f2 = 0;
  let f3 = 0;
  let aiProfile: 'trap_rap' | 'modern_pop' | 'rnb_velvet' | 'lofi_clean' | 'broadcast_pro' = 'trap_rap';

  if (artistLower.includes('travis')) {
    character = 'deep_chest';
    formantSemi = -3.5;
    throat = 1.22;
    mlModel = 'deep_timbre';
    mlWarmth = 80;
    mlAir = 70;
    mlClamping = 82;
    f1 = 3.5;
    f2 = -1.0;
    f3 = 1.5;
    aiProfile = 'trap_rap';
  } else if (artistLower.includes('carti')) {
    character = 'hyperpop';
    formantSemi = 5.2;
    throat = 0.80;
    mlModel = 'transformer_formant';
    mlWarmth = 40;
    mlAir = 92;
    mlClamping = 85;
    f1 = -2.5;
    f2 = 3.0;
    f3 = 5.0;
    aiProfile = 'trap_rap';
  } else if (artistLower.includes('yeat') || artistLower.includes('ken carson')) {
    character = 'hyperpop';
    formantSemi = 2.4;
    throat = 0.90;
    mlModel = 'transformer_formant';
    mlWarmth = 65;
    mlAir = 88;
    mlClamping = 80;
    f1 = 1.0;
    f2 = 2.0;
    f3 = 4.5;
    aiProfile = 'trap_rap';
  } else if (artistLower.includes('future') || artistLower.includes('loe shimmy')) {
    character = 'deep_chest';
    formantSemi = -2.0;
    throat = 1.15;
    mlModel = 'deep_timbre';
    mlWarmth = 75;
    mlAir = 65;
    mlClamping = 78;
    f1 = 2.5;
    f2 = -0.5;
    f3 = 1.0;
    aiProfile = 'trap_rap';
  } else if (artistLower.includes('toliver') || artistLower.includes('weeknd')) {
    character = 'melodic_lift';
    formantSemi = 1.6;
    throat = 0.92;
    mlModel = 'neural_vowel';
    mlWarmth = 65;
    mlAir = 82;
    mlClamping = 72;
    f1 = -0.5;
    f2 = 2.0;
    f3 = 3.5;
    aiProfile = 'rnb_velvet';
  } else if (artistLower.includes('sabrina') || artistLower.includes('billie')) {
    character = 'melodic_lift';
    formantSemi = 0.8;
    throat = 0.96;
    mlModel = 'neural_vowel';
    mlWarmth = 55;
    mlAir = 92;
    mlClamping = 80;
    f1 = -1.0;
    f2 = 1.5;
    f3 = 4.0;
    aiProfile = 'modern_pop';
  } else {
    character = 'custom';
    formantSemi = 0;
    throat = 1.0;
    mlModel = 'neural_vowel';
    mlWarmth = 60;
    mlAir = 75;
    mlClamping = 75;
    aiProfile = catLower.includes('pop') ? 'modern_pop' : 'trap_rap';
  }

  const pitchFormant = preset.pitchFormant || {
    enabled: true,
    isBypassed: false,
    pitchSemitones: 0,
    fineTuneCents: 0,
    formantSemitones: formantSemi,
    throatLength: throat,
    preserveFormants: formantSemi === 0,
    formantIntensity: 85,
    character,
    f1GainDb: f1,
    f2GainDb: f2,
    f3GainDb: f3,
    mlFormantEnabled: true,
    mlFormantModel: mlModel,
    mlFormantTrackingSpeed: 88,
    mlFormantClamping: mlClamping,
    mlFormantWarmth: mlWarmth,
    mlVowelPreserve: true,
    mlFormantAirSheen: mlAir,
  };

  const aiEnhancer = preset.aiEnhancer || {
    enabled: true,
    intensity: 75,
    clarityPresence: 72,
    airBrilliance: mlAir,
    warmthBody: mlWarmth,
    deMud: 62,
    harshnessTamer: 74,
    spectralBalance: 80,
    aiProfile,
  };

  return {
    ...preset,
    pitchFormant,
    aiEnhancer,
  };
}

const seenFactoryPresetIds = new Set<string>();
export const FACTORY_ARTIST_PRESETS: ArtistVocalPreset[] = [
  ...EXPANDED_ARTIST_PRESETS,
  ...BASE_ARTIST_PRESETS,
]
  .filter((preset) => {
    if (seenFactoryPresetIds.has(preset.id)) return false;
    seenFactoryPresetIds.add(preset.id);
    return true;
  })
  .map(enrichPresetWithMLAndQuality);

const LOCAL_STORAGE_KEY = 'neuraltune_custom_presets_v2';
const CLOUD_SYNC_TIME_KEY = 'neuraltune_cloud_sync_timestamp';

export function getCustomPresets(): ArtistVocalPreset[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse local presets:', e);
    return [];
  }
}

export function saveCustomPreset(preset: ArtistVocalPreset): ArtistVocalPreset[] {
  const current = getCustomPresets();
  const existingIdx = current.findIndex(p => p.id === preset.id);
  const updatedPreset = { ...preset, isCustom: true, updatedAt: new Date().toISOString() };
  
  let nextList: ArtistVocalPreset[];
  if (existingIdx >= 0) {
    nextList = [...current];
    nextList[existingIdx] = updatedPreset;
  } else {
    nextList = [updatedPreset, ...current];
  }
  
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextList));
  localStorage.setItem(CLOUD_SYNC_TIME_KEY, new Date().toISOString());
  return nextList;
}

export function deleteCustomPreset(id: string): ArtistVocalPreset[] {
  const current = getCustomPresets();
  const nextList = current.filter(p => p.id !== id);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextList));
  localStorage.setItem(CLOUD_SYNC_TIME_KEY, new Date().toISOString());
  return nextList;
}

export function getLastCloudSyncTime(): string {
  return localStorage.getItem(CLOUD_SYNC_TIME_KEY) || new Date().toISOString();
}

export const DEFAULT_PRESET = FACTORY_ARTIST_PRESETS[0];
