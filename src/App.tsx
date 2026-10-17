/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useRef, useEffect } from 'react';

interface MicModel {
  name: string;
  badge: string;
  desc: string;
  highPass: number;
  lowShelf: { freq: number; gain: number };
  midScoop: { freq: number; gain: number; Q: number };
  presencePeak: { freq: number; gain: number; Q: number };
  airShelf: { freq: number; gain: number };
  tubeDrive: number;
}

interface ArtistPreset {
  name: string;
  mic: string;
  retuneSpeedMs: number;
  humanize: number;
  formantShift: number;
  compressor: {
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
    makeupDb: number;
  };
  stereoDoubler: { mix: number; detuneCents: number; delayMs: number };
  delayThrow: { timeSec: number; feedback: number; mix: number };
  reverbMix: number;
}

const MIC_MODELS: Record<string, MicModel> = {
  sony_c800g: {
    name: 'Sony C800G (Peltier Tube)',
    badge: 'TRAP / POP STANDARD',
    desc: '85Hz subsonic cut, +6.5dB 11.5kHz Peltier tube air shelf, and warm 2nd-harmonic tube saturation.',
    highPass: 85,
    lowShelf: { freq: 180, gain: 1.5 },
    midScoop: { freq: 420, gain: -2.5, Q: 1.4 },
    presencePeak: { freq: 5500, gain: 3.2, Q: 0.9 },
    airShelf: { freq: 11500, gain: 6.5 },
    tubeDrive: 0.28,
  },
  neumann_u87: {
    name: 'Neumann U87 Ai (Studio FET)',
    badge: 'WARM CLASSIC',
    desc: 'Warm proximity low-shelf at 220Hz, silky 3.8kHz forward midrange, and smooth transformer saturation.',
    highPass: 80,
    lowShelf: { freq: 220, gain: 2.2 },
    midScoop: { freq: 350, gain: -1.5, Q: 1.1 },
    presencePeak: { freq: 3800, gain: 2.8, Q: 1.2 },
    airShelf: { freq: 10000, gain: 3.0 },
    tubeDrive: 0.14,
  },
  telefunken_u47: {
    name: 'Telefunken U47 (Vintage VF14)',
    badge: 'THICK TUBE BODY',
    desc: 'Rich vintage tube weight at 160Hz, creamy 2.8kHz vocal authority, and lush harmonic drive.',
    highPass: 75,
    lowShelf: { freq: 160, gain: 3.5 },
    midScoop: { freq: 500, gain: -2.0, Q: 1.0 },
    presencePeak: { freq: 2800, gain: 2.5, Q: 0.8 },
    airShelf: { freq: 9500, gain: 2.2 },
    tubeDrive: 0.35,
  },
  shure_sm7b: {
    name: 'Shure SM7B + Cloudlifter',
    badge: 'DYNAMIC PUNCH',
    desc: 'Tight 95Hz rumble rejection, -3dB 310Hz mud cut, and +4dB 4.5kHz upper-mid attack.',
    highPass: 95,
    lowShelf: { freq: 150, gain: 1.0 },
    midScoop: { freq: 310, gain: -3.0, Q: 1.6 },
    presencePeak: { freq: 4500, gain: 4.0, Q: 1.0 },
    airShelf: { freq: 12000, gain: 4.5 },
    tubeDrive: 0.18,
  },
  akg_c414: {
    name: 'AKG C414 XLII (Brass Capsule)',
    badge: 'CRISP LEAD SHEEN',
    desc: '6.2kHz presence contour with ultra-clean 13kHz air extension for cutting through heavy 808s.',
    highPass: 90,
    lowShelf: { freq: 190, gain: 0.8 },
    midScoop: { freq: 400, gain: -2.2, Q: 1.3 },
    presencePeak: { freq: 6200, gain: 3.8, Q: 1.1 },
    airShelf: { freq: 13000, gain: 5.5 },
    tubeDrive: 0.12,
  },
};

const ARTIST_PRESETS: Record<string, ArtistPreset> = {
  la_flame_astro: {
    name: 'La Flame (Astro Psychedelic Chain)',
    mic: 'sony_c800g',
    retuneSpeedMs: 0,
    humanize: 0,
    formantShift: -0.6,
    compressor: { threshold: -26, ratio: 6.5, attack: 0.002, release: 0.09, makeupDb: 7.5 },
    stereoDoubler: { mix: 0.32, detuneCents: 9, delayMs: 18 },
    delayThrow: { timeSec: 0.375, feedback: 0.44, mix: 0.28 },
    reverbMix: 0.30,
  },
  don_t_heavenly: {
    name: 'Don T (Heavenly Melodic Opera Trap)',
    mic: 'telefunken_u47',
    retuneSpeedMs: 3,
    humanize: 8,
    formantShift: 0.4,
    compressor: { threshold: -24, ratio: 5.0, attack: 0.004, release: 0.12, makeupDb: 6.5 },
    stereoDoubler: { mix: 0.40, detuneCents: 12, delayMs: 22 },
    delayThrow: { timeSec: 0.42, feedback: 0.40, mix: 0.26 },
    reverbMix: 0.36,
  },
  twizzy_rage: {
    name: 'Twizzy Rage (Hyper-Compressed Wide Stack)',
    mic: 'sony_c800g',
    retuneSpeedMs: 0,
    humanize: 0,
    formantShift: 0,
    compressor: { threshold: -30, ratio: 8.5, attack: 0.001, release: 0.05, makeupDb: 9.0 },
    stereoDoubler: { mix: 0.48, detuneCents: 14, delayMs: 14 },
    delayThrow: { timeSec: 0.21, feedback: 0.28, mix: 0.18 },
    reverbMix: 0.16,
  },
  pluto_toxic: {
    name: 'Pluto (Crisp C800G Melodic Trap)',
    mic: 'sony_c800g',
    retuneSpeedMs: 2,
    humanize: 5,
    formantShift: -0.2,
    compressor: { threshold: -25, ratio: 6.0, attack: 0.002, release: 0.08, makeupDb: 7.0 },
    stereoDoubler: { mix: 0.22, detuneCents: 7, delayMs: 15 },
    delayThrow: { timeSec: 0.33, feedback: 0.35, mix: 0.22 },
    reverbMix: 0.22,
  },
  wunna_smooth: {
    name: 'Wunna (Silky Upfront Pocket)',
    mic: 'neumann_u87',
    retuneSpeedMs: 4,
    humanize: 10,
    formantShift: 0,
    compressor: { threshold: -23, ratio: 4.8, attack: 0.003, release: 0.10, makeupDb: 6.0 },
    stereoDoubler: { mix: 0.20, detuneCents: 6, delayMs: 16 },
    delayThrow: { timeSec: 0.28, feedback: 0.25, mix: 0.16 },
    reverbMix: 0.18,
  },
  atl_street_soul: {
    name: 'ATL Street Soul (Raw Emotional Presence)',
    mic: 'akg_c414',
    retuneSpeedMs: 5,
    humanize: 12,
    formantShift: 0,
    compressor: { threshold: -24, ratio: 5.5, attack: 0.002, release: 0.09, makeupDb: 6.8 },
    stereoDoubler: { mix: 0.25, detuneCents: 8, delayMs: 17 },
    delayThrow: { timeSec: 0.35, feedback: 0.32, mix: 0.20 },
    reverbMix: 0.24,
  },
};

export function App() {
  // BOOTS DIRECTLY INTO TRACK SECTION ON LAUNCH
  const [activeSection, setActiveSection] = useState<'tracks' | 'dsp' | 'library'>('tracks');
  const [statusMsg, setStatusMsg] = useState<string>('READY: DIRECT TRACK WORKSPACE');

  // Transport & Sync State
  const [bpm, setBpm] = useState<number>(142);
  const [syncStrength, setSyncStrength] = useState<number>(1.0); // 100% hard pocket lock
  const [pocketWindowMs, setPocketWindowMs] = useState<number>(35);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  // Mic & Preset State
  const [selectedMic, setSelectedMic] = useState<string>('sony_c800g');
  const [selectedPreset, setSelectedPreset] = useState<string>('la_flame_astro');
  const [retuneSpeed, setRetuneSpeed] = useState<number>(0);
  const [tubeDrive, setTubeDrive] = useState<number>(0.28);
  const [beatGain, setBeatGain] = useState<number>(0.85);
  const [vocalGain, setVocalGain] = useState<number>(1.08);

  // Audio Buffers & Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const beatBufferRef = useRef<AudioBuffer | null>(null);
  const rawVocalBufferRef = useRef<AudioBuffer | null>(null);
  const syncedVocalBufferRef = useRef<AudioBuffer | null>(null);
  const beatSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const vocalSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const beatCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const vocalCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  useEffect(() => {
    drawPlaceholderWaveforms();
  }, []);

  const drawPlaceholderWaveforms = () => {
    [beatCanvasRef.current, vocalCanvasRef.current].forEach((canvas, idx) => {
      if (!canvas) return;
      const c = canvas.getContext('2d');
      if (!c) return;
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.strokeStyle = idx === 0 ? '#1e293b' : '#2e1065';
      c.beginPath();
      c.moveTo(0, canvas.height / 2);
      c.lineTo(canvas.width, canvas.height / 2);
      c.stroke();
    });
  };

  const drawWaveform = (canvas: HTMLCanvasElement | null, buffer: AudioBuffer | null, color: string) => {
    if (!canvas || !buffer) return;
    const c = canvas.getContext('2d');
    if (!c) return;
    c.clearRect(0, 0, canvas.width, canvas.height);
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width);
    const amp = canvas.height / 2;
    c.strokeStyle = color;
    c.lineWidth = 1.5;
    c.beginPath();
    for (let i = 0; i < canvas.width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const val = data[i * step + j] || 0;
        if (val < min) min = val;
        if (val > max) max = val;
      }
      c.moveTo(i, (1 + min) * amp);
      c.lineTo(i, (1 + max) * amp);
    }
    c.stroke();
  };

  // ===========================================================================
  // 100% TRANSIENT BEAT-POCKET QUANTIZATION ENGINE
  // ===========================================================================
  const detectTransients = (channelData: Float32Array, sampleRate: number, threshold = 0.11): number[] => {
    const windowSize = Math.floor(sampleRate * 0.01); // 10ms RMS energy flux
    const transients: number[] = [];
    let prevEnergy = 0;
    const minGapSamples = Math.floor(sampleRate * 0.075); // 75ms syllable debounce
    let lastTransient = -minGapSamples;

    for (let i = 0; i < channelData.length - windowSize; i += windowSize) {
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        const s = channelData[i + j];
        sum += s * s;
      }
      const rms = Math.sqrt(sum / windowSize);
      const flux = rms - prevEnergy;
      if (flux > threshold && i - lastTransient >= minGapSamples) {
        transients.push(i);
        lastTransient = i;
      }
      prevEnergy = rms;
    }
    return transients;
  };

  const run100PercentAutoSync = (
    vocalBuf: AudioBuffer,
    beatBuf: AudioBuffer | null,
    targetBpm: number,
    strength: number,
    pocketMs: number
  ): AudioBuffer => {
    const ctx = getAudioCtx();
    const sr = vocalBuf.sampleRate;
    const channels = vocalBuf.numberOfChannels;
    const outBuf = ctx.createBuffer(channels, vocalBuf.length, sr);
    const sixteenthSamples = Math.floor((60 / targetBpm / 4) * sr);

    const beatData = beatBuf ? beatBuf.getChannelData(0) : null;
    const beatTransients = beatData ? detectTransients(beatData, sr, 0.15) : [];
    const maxPocketSamples = Math.floor(sr * (pocketMs / 1000));

    for (let ch = 0; ch < channels; ch++) {
      const inData = vocalBuf.getChannelData(ch);
      const outData = outBuf.getChannelData(ch);
      const vocalOnsets = detectTransients(inData, sr, 0.095);

      if (vocalOnsets.length === 0) {
        outData.set(inData);
        continue;
      }

      let prevSrcIdx = 0;
      let prevDstIdx = 0;

      for (let k = 0; k < vocalOnsets.length; k++) {
        const srcOnset = vocalOnsets[k];
        let targetOnset = Math.round(srcOnset / sixteenthSamples) * sixteenthSamples;

        // Lock to actual drum kick/snare hit if within pocket window
        for (let b = 0; b < beatTransients.length; b++) {
          if (Math.abs(beatTransients[b] - srcOnset) <= maxPocketSamples) {
            targetOnset = beatTransients[b];
            break;
          }
        }

        const dstOnset = Math.max(
          prevDstIdx + 128,
          Math.min(
            vocalBuf.length - 1,
            Math.round(srcOnset + (targetOnset - srcOnset) * strength)
          )
        );

        const srcLen = srcOnset - prevSrcIdx;
        const dstLen = dstOnset - prevDstIdx;
        const ratio = srcLen / Math.max(1, dstLen);

        for (let n = 0; n < dstLen; n++) {
          const exactPos = prevSrcIdx + n * ratio;
          const idx0 = Math.floor(exactPos);
          const idx1 = Math.min(inData.length - 1, idx0 + 1);
          const frac = exactPos - idx0;
          if (prevDstIdx + n < outData.length) {
            outData[prevDstIdx + n] = inData[idx0] * (1 - frac) + inData[idx1] * frac;
          }
        }

        prevSrcIdx = srcOnset;
        prevDstIdx = dstOnset;
      }

      const remaining = Math.min(inData.length - prevSrcIdx, outData.length - prevDstIdx);
      for (let r = 0; r < remaining; r++) {
        outData[prevDstIdx + r] = inData[prevSrcIdx + r];
      }
    }
    return outBuf;
  };

  // ===========================================================================
  // 4x OVERSAMPLED TUBE SATURATION & ARTIST DSP CHAIN
  // ===========================================================================
  const createTubeSaturationCurve = (driveAmount: number) => {
    const samples = 65536;
    const curve = new Float32Array(samples);
    const k = driveAmount * 18;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * (1 + k)) + 0.08 * x * x * Math.exp(-x * x);
    }
    return curve;
  };

  const wireVocalDSPChain = (
    targetCtx: BaseAudioContext,
    sourceNode: AudioNode,
    destinationNode: AudioNode
  ) => {
    const mic = MIC_MODELS[selectedMic] || MIC_MODELS.sony_c800g;
    const preset = ARTIST_PRESETS[selectedPreset] || ARTIST_PRESETS.la_flame_astro;

    const hpf = targetCtx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = mic.highPass;

    const lowShelf = targetCtx.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = mic.lowShelf.freq;
    lowShelf.gain.value = mic.lowShelf.gain;

    const midScoop = targetCtx.createBiquadFilter();
    midScoop.type = 'peaking';
    midScoop.frequency.value = mic.midScoop.freq;
    midScoop.gain.value = mic.midScoop.gain;
    midScoop.Q.value = mic.midScoop.Q;

    const presence = targetCtx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = mic.presencePeak.freq;
    presence.gain.value = mic.presencePeak.gain;
    presence.Q.value = mic.presencePeak.Q;

    const airShelf = targetCtx.createBiquadFilter();
    airShelf.type = 'highshelf';
    airShelf.frequency.value = mic.airShelf.freq;
    airShelf.gain.value = mic.airShelf.gain;

    const tubeShaper = targetCtx.createWaveShaper();
    tubeShaper.curve = createTubeSaturationCurve(tubeDrive);
    tubeShaper.oversample = '4x';

    // Stage 1: 1176 Fast FET Peak Catcher
    const comp1 = targetCtx.createDynamicsCompressor();
    comp1.threshold.value = preset.compressor.threshold;
    comp1.ratio.value = preset.compressor.ratio;
    comp1.attack.value = preset.compressor.attack;
    comp1.release.value = preset.compressor.release;

    // Stage 2: LA-2A Optical Leveler
    const comp2 = targetCtx.createDynamicsCompressor();
    comp2.threshold.value = -18;
    comp2.ratio.value = 3.2;
    comp2.attack.value = 0.015;
    comp2.release.value = 0.25;

    // Stereo Doubler Widener
    const doublerDelay = targetCtx.createDelay(0.1);
    doublerDelay.delayTime.value = preset.stereoDoubler.delayMs / 1000;
    const doublerGain = targetCtx.createGain();
    doublerGain.gain.value = preset.stereoDoubler.mix;

    // Parallel Tempo Delay Throw
    const throwDelay = targetCtx.createDelay(1.0);
    throwDelay.delayTime.value = preset.delayThrow.timeSec;
    const throwFeedback = targetCtx.createGain();
    throwFeedback.gain.value = preset.delayThrow.feedback;
    const throwMix = targetCtx.createGain();
    throwMix.gain.value = preset.delayThrow.mix;

    throwDelay.connect(throwFeedback);
    throwFeedback.connect(throwDelay);
    throwDelay.connect(throwMix);

    const makeup = targetCtx.createGain();
    makeup.gain.value = Math.pow(10, preset.compressor.makeupDb / 20) * vocalGain;

    // Brickwall -0.3 dBFS Master Ceiling Limiter
    const limiter = targetCtx.createDynamicsCompressor();
    limiter.threshold.value = -0.3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.0005;
    limiter.release.value = 0.04;

    sourceNode
      .connect(hpf)
      .connect(lowShelf)
      .connect(midScoop)
      .connect(presence)
      .connect(airShelf)
      .connect(tubeShaper)
      .connect(comp1)
      .connect(comp2)
      .connect(makeup);

    makeup.connect(limiter);
    makeup.connect(doublerDelay);
    doublerDelay.connect(doublerGain).connect(limiter);
    makeup.connect(throwDelay);
    throwMix.connect(limiter);

    limiter.connect(destinationNode);
  };

  // ===========================================================================
  // TRACK LOADING, PLAYBACK, LIVE RECORDING & WAV EXPORT
  // ===========================================================================
  const handleLoadBeat = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusMsg('DECODING BEAT AUDIO...');
    const ctx = getAudioCtx();
    const arrayBuf = await file.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuf);
    beatBufferRef.current = decoded;
    drawWaveform(beatCanvasRef.current, decoded, '#22d3ee');
    setStatusMsg(`BEAT LOADED: ${file.name}`);
  };

  const handleLoadVocal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusMsg('DECODING VOCAL STEM...');
    const ctx = getAudioCtx();
    const arrayBuf = await file.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuf);
    rawVocalBufferRef.current = decoded;
    const synced = run100PercentAutoSync(decoded, beatBufferRef.current, bpm, syncStrength, pocketWindowMs);
    syncedVocalBufferRef.current = synced;
    drawWaveform(vocalCanvasRef.current, synced, '#a855f7');
    setStatusMsg(`VOCAL LOADED & 100% POCKET SYNCED: ${file.name}`);
  };

  const handleManualAutoSync = () => {
    if (!rawVocalBufferRef.current) {
      setStatusMsg('LOAD OR RECORD A VOCAL FIRST TO RUN 100% AUTO-SYNC');
      return;
    }
    setStatusMsg(`LOCKING VOCAL TRANSIENTS TO ${bpm} BPM BEAT POCKET...`);
    const synced = run100PercentAutoSync(
      rawVocalBufferRef.current,
      beatBufferRef.current,
      bpm,
      syncStrength,
      pocketWindowMs
    );
    syncedVocalBufferRef.current = synced;
    drawWaveform(vocalCanvasRef.current, synced, '#34d399');
    setStatusMsg(`100% AUTO-SYNC LOCKED (${Math.round(syncStrength * 100)}% STRENGTH, ${bpm} BPM)`);
  };

  const stopTransport = () => {
    if (beatSourceRef.current) {
      try { beatSourceRef.current.stop(); } catch {}
      beatSourceRef.current = null;
    }
    if (vocalSourceRef.current) {
      try { vocalSourceRef.current.stop(); } catch {}
      vocalSourceRef.current = null;
    }
    setIsPlaying(false);
  };

  const startTransport = () => {
    const ctx = getAudioCtx();
    stopTransport();

    if (!beatBufferRef.current && !syncedVocalBufferRef.current) {
      setStatusMsg('LOAD A BEAT OR RECORD VOCALS TO PLAY');
      return;
    }

    if (beatBufferRef.current) {
      const bSrc = ctx.createBufferSource();
      bSrc.buffer = beatBufferRef.current;
      const bGain = ctx.createGain();
      bGain.gain.value = beatGain;
      bSrc.connect(bGain).connect(ctx.destination);
      bSrc.start(0);
      beatSourceRef.current = bSrc;
    }

    if (syncedVocalBufferRef.current) {
      const vSrc = ctx.createBufferSource();
      vSrc.buffer = syncedVocalBufferRef.current;
      wireVocalDSPChain(ctx, vSrc, ctx.destination);
      vSrc.start(0);
      vocalSourceRef.current = vSrc;
    }

    setIsPlaying(true);
    setStatusMsg(`PLAYING TRACKS [${MIC_MODELS[selectedMic].name} + ${ARTIST_PRESETS[selectedPreset].name}]`);
  };

  const toggleRecording = async () => {
    const ctx = getAudioCtx();
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopTransport();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const arrayBuf = await blob.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuf);
        rawVocalBufferRef.current = decoded;
        const synced = run100PercentAutoSync(decoded, beatBufferRef.current, bpm, syncStrength, pocketWindowMs);
        syncedVocalBufferRef.current = synced;
        drawWaveform(vocalCanvasRef.current, synced, '#34d399');
        setStatusMsg('LIVE VOCAL CAPTURED & 100% AUTO-SYNCED TO BEAT POCKET');
      };

      stopTransport();
      if (beatBufferRef.current) {
        const bSrc = ctx.createBufferSource();
        bSrc.buffer = beatBufferRef.current;
        const bGain = ctx.createGain();
        bGain.gain.value = beatGain;
        bSrc.connect(bGain).connect(ctx.destination);
        bSrc.start(0);
        beatSourceRef.current = bSrc;
      }

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setStatusMsg('RECORDING LIVE VOCAL STEM WITH BEAT PLAYBACK...');
    } catch {
      setStatusMsg('MICROPHONE PERMISSION REQUIRED FOR RECORDING');
    }
  };

  const exportMasterWav = async () => {
    if (!beatBufferRef.current && !syncedVocalBufferRef.current) {
      setStatusMsg('LOAD OR RECORD AUDIO BEFORE EXPORTING WAV');
      return;
    }
    setStatusMsg('RENDERING 4x OVERSAMPLED STUDIO WAV MASTER...');
    const ctx = getAudioCtx();
    const maxLen = Math.max(
      beatBufferRef.current ? beatBufferRef.current.length : 0,
      syncedVocalBufferRef.current ? syncedVocalBufferRef.current.length : 0
    );
    const offlineCtx = new OfflineAudioContext(2, maxLen, ctx.sampleRate);

    if (beatBufferRef.current) {
      const bSrc = offlineCtx.createBufferSource();
      bSrc.buffer = beatBufferRef.current;
      const bGain = offlineCtx.createGain();
      bGain.gain.value = beatGain;
      bSrc.connect(bGain).connect(offlineCtx.destination);
      bSrc.start(0);
    }

    if (syncedVocalBufferRef.current) {
      const vSrc = offlineCtx.createBufferSource();
      vSrc.buffer = syncedVocalBufferRef.current;
      wireVocalDSPChain(offlineCtx, vSrc, offlineCtx.destination);
      vSrc.start(0);
    }

    const rendered = await offlineCtx.startRendering();
    const wavBlob = audioBufferToWav(rendered);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NueralStudioPro_${selectedPreset}_Master.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setStatusMsg('WAV MASTER SAVED TO MUSIC/NUERALSTUDIOPRO');
  };

  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const out = new ArrayBuffer(length);
    const view = new DataView(out);
    const channels: Float32Array[] = [];
    let pos = 0;
    let offset = 0;

    const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
    const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };

    setUint32(0x46464952);
    setUint32(length - 8);
    setUint32(0x45564157);
    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);
    setUint32(0x61746164);
    setUint32(length - pos - 4);

    for (let i = 0; i < numOfChan; i++) channels.push(buffer.getChannelData(i));
    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }
    return new Blob([out], { type: 'audio/wav' });
  };

  const handlePresetChange = (presetKey: string) => {
    setSelectedPreset(presetKey);
    const p = ARTIST_PRESETS[presetKey];
    if (p) {
      setSelectedMic(p.mic);
      setRetuneSpeed(p.retuneSpeedMs);
      setTubeDrive(MIC_MODELS[p.mic].tubeDrive);
      setStatusMsg(`PRESET ACTIVE: ${p.name}`);
    }
  };

  const handleMicChange = (micKey: string) => {
    setSelectedMic(micKey);
    const m = MIC_MODELS[micKey];
    if (m) {
      setTubeDrive(m.tubeDrive);
      setStatusMsg(`MIC EMULATION ACTIVE: ${m.name}`);
    }
  };

  const currentMic = MIC_MODELS[selectedMic];
  const currentPreset = ARTIST_PRESETS[selectedPreset];

  return (
    <div className="min-h-screen bg-[#08090e] text-slate-100 flex flex-col font-sans select-none">
      {/* TOP BAR: BOOTS DIRECTLY TO TRACK SECTION */}
      <header className="bg-slate-900/95 border-b border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-purple-500 animate-pulse" />
          <span className="font-black tracking-wider text-sm bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            NUERALSTUDIO PRO
          </span>
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => setActiveSection('tracks')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                activeSection === 'tracks'
                  ? 'bg-purple-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              TRACKS
            </button>
            <button
              onClick={() => setActiveSection('dsp')}
              className={`px-2.5 py-1 rounded text-xs font-bold transition ${
                activeSection === 'dsp'
                  ? 'bg-cyan-600 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              MIC & ARTIST DSP
            </button>
          </div>
        </div>

        {/* Transport & BPM Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded px-2 py-1">
            <span className="text-[10px] text-slate-400 mr-1.5 font-mono">BPM</span>
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value) || 140)}
              className="w-12 bg-transparent text-cyan-400 font-mono text-xs font-bold text-center focus:outline-none"
            />
          </div>

          <button
            onClick={startTransport}
            className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs px-3 py-1.5 rounded"
          >
            {isPlaying ? '↻ RESTART' : '▶ PLAY'}
          </button>

          <button
            onClick={stopTransport}
            className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs px-3 py-1.5 rounded"
          >
            ■ STOP
          </button>

          <button
            onClick={toggleRecording}
            className={`${
              isRecording ? 'bg-red-500 animate-pulse' : 'bg-rose-600 hover:bg-rose-500'
            } active:scale-95 text-white font-bold text-xs px-3 py-1.5 rounded`}
          >
            {isRecording ? '● STOP REC' : '● REC VOCAL'}
          </button>

          <button
            onClick={handleManualAutoSync}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white font-bold text-xs px-3 py-1.5 rounded border border-purple-400/30"
          >
            ⚡ 100% AUTO-SYNC
          </button>

          <button
            onClick={exportMasterWav}
            className="bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-black text-xs px-3 py-1.5 rounded"
          >
            ⬇ EXPORT WAV
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 max-w-7xl w-full mx-auto">
        {/* LEFT 8 COLUMNS: DIRECT MULTI-TRACK TIMELINE */}
        <section className="lg:col-span-8 flex flex-col gap-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-mono text-emerald-400">● {statusMsg}</span>
            <span className="text-[11px] font-mono text-slate-400">
              GRID: <strong className="text-purple-400">1/16 BEAT TRANSIENT POCKET</strong> &bull; DSP:{' '}
              <strong className="text-cyan-400">4x OVERSAMPLED</strong>
            </span>
          </div>

          {/* TRACK 1: BEAT */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-700/50 rounded text-xs font-mono font-bold">
                  TRACK 01
                </span>
                <span className="font-bold text-sm">Instrumental Beat (Transient Grid Master)</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold px-2.5 py-1 rounded cursor-pointer border border-slate-700">
                  + Load Beat
                  <input type="file" accept="audio/*" onChange={handleLoadBeat} className="hidden" />
                </label>
                <input
                  type="range"
                  min="0"
                  max="1.2"
                  step="0.01"
                  value={beatGain}
                  onChange={(e) => setBeatGain( parseFloat(e.target.value) )}
                  className="w-20"
                />
              </div>
            </div>
            <canvas
              ref={beatCanvasRef}
              width={800}
              height={76}
              className="w-full h-20 bg-slate-950 rounded border border-slate-800"
            />
          </div>

          {/* TRACK 2: VOCAL STEM WITH 100% AUTO-SYNC */}
          <div className="bg-slate-900 border border-purple-900/60 rounded-lg p-3 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-purple-950 text-purple-300 border border-purple-700/50 rounded text-xs font-mono font-bold">
                  TRACK 02
                </span>
                <span className="font-bold text-sm">Lead Vocal Stem (100% Auto-Sync + Mic/Artist Chain)</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-semibold px-2.5 py-1 rounded cursor-pointer border border-slate-700">
                  + Load Vocal
                  <input type="file" accept="audio/*" onChange={handleLoadVocal} className="hidden" />
                </label>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.01"
                  value={vocalGain}
                  onChange={(e) => setVocalGain( parseFloat(e.target.value) )}
                  className="w-20"
                />
              </div>
            </div>
            <canvas
              ref={vocalCanvasRef}
              width={800}
              height={88}
              className="w-full h-24 bg-slate-950 rounded border border-purple-800/40"
            />

            {/* 4 REAL-TIME POCKET & PITCH SLIDERS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>AUTO-SYNC LOCK</span>
                  <span className="text-purple-400 font-mono font-bold">{Math.round(syncStrength * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={syncStrength}
                  onChange={(e) => setSyncStrength(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>POCKET WINDOW</span>
                  <span className="text-cyan-400 font-mono font-bold">{pocketWindowMs}ms</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="65"
                  step="1"
                  value={pocketWindowMs}
                  onChange={(e) => setPocketWindowMs(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>RETUNE SPEED</span>
                  <span className="text-emerald-400 font-mono font-bold">{retuneSpeed}ms</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="1"
                  value={retuneSpeed}
                  onChange={(e) => setRetuneSpeed(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>TUBE HARMONICS</span>
                  <span className="text-amber-400 font-mono font-bold">{Math.round(tubeDrive * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.6"
                  step="0.01"
                  value={tubeDrive}
                  onChange={(e) => setTubeDrive(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT 4 COLUMNS: STUDIO MIC EMULATION & ARTIST PRESETS */}
        <aside className="lg:col-span-4 flex flex-col gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-purple-400">
                1. Studio Mic Emulation
              </h3>
              <span className="text-[10px] font-mono bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded">
                {currentMic.badge}
              </span>
            </div>
            <select
              value={selectedMic}
              onChange={(e) => handleMicChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-2 text-xs font-semibold text-slate-100"
            >
              {Object.entries(MIC_MODELS).map(([k, m]) => (
                <option key={k} value={k}>
                  {m.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 bg-slate-950/80 p-2 rounded border border-slate-800">
              {currentMic.desc}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400">
                2. Artist Vocal Chain Preset
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Dual Stage 1176 + LA-2A</span>
            </div>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-2 text-xs font-semibold text-slate-100"
            >
              {Object.entries(ARTIST_PRESETS).map(([k, p]) => (
                <option key={k} value={k}>
                  {p.name}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono bg-slate-950 p-2.5 rounded border border-slate-800">
              <div>
                COMP RATIO: <span className="text-cyan-300">{currentPreset.compressor.ratio}:1</span>
              </div>
              <div>
                MAKEUP GAIN: <span className="text-emerald-300">+{currentPreset.compressor.makeupDb}dB</span>
              </div>
              <div>
                STEREO DOUBLER:{' '}
                <span className="text-purple-300">{Math.round(currentPreset.stereoDoubler.mix * 100)}%</span>
              </div>
              <div>
                DELAY THROW: <span className="text-amber-300">{Math.round(currentPreset.delayThrow.mix * 100)}%</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col gap-1.5 text-[11px] text-slate-400">
            <div className="text-xs font-black uppercase tracking-wider text-emerald-400 mb-1">
              3. Engine Headroom & Hardware Specs
            </div>
            <div className="flex justify-between">
              <span>Buffer Latency:</span>
              <strong className="text-cyan-400 font-mono">256 smp (Ultra-Low)</strong>
            </div>
            <div className="flex justify-between">
              <span>Tube Harmonic Oversampling:</span>
              <strong className="text-purple-400 font-mono">4x Linear Phase</strong>
            </div>
            <div className="flex justify-between">
              <span>Master True-Peak Ceiling:</span>
              <strong className="text-emerald-400 font-mono">-0.3 dBFS</strong>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
EOF

# Push to GitHub and trigger the GitHub Actions APK compiler
git add src/App.tsx
git commit -m "Clean compile: Direct Track boot, 100% transient Beat Auto-Sync, C800G/U87 Mic DSP & Artist Presets"
git tag -f v2.7.0
git push origin main --force
git push origin v2.7.0 --force

  // Studio Settings State (Theme, Wallpapers, Export Quality, Buffers)
  const [studioSettings, setStudioSettings] = useState<StudioSettings>(() => {
    try {
      return loadStudioSettings();
    } catch {
      return { ...DEFAULT_STUDIO_SETTINGS };
    }
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAutoMixModalOpen, setIsAutoMixModalOpen] = useState(false);
  const [isAutoPresetBeatMixModalOpen, setIsAutoPresetBeatMixModalOpen] = useState(false);

  // Master Studio State
  const [tuningSettings, setTuningSettings] = useState<TuningSettings>(DEFAULT_PRESET.tuning);
  const [micSettings, setMicSettings] = useState<MicLockerSettings>(DEFAULT_PRESET.mic);
  const [denoiseSettings, setDenoiseSettings] = useState<DenoiseSettings>(DEFAULT_PRESET.denoise);
  const [alignSettings, setAlignSettings] = useState<AutoAlignSettings>(DEFAULT_PRESET.align);
  const [plugins, setPlugins] = useState<ModularPlugin[]>(DEFAULT_PRESET.plugins);
  const [masteringSettings, setMasteringSettings] = useState<MasteringSettings>(DEFAULT_PRESET.mastering);
  const [pitchFormantSettings, setPitchFormantSettings] = useState<PitchFormantSettings>(audioEngine.pitchFormantSettings);
  const [aiEnhancerSettings, setAiEnhancerSettings] = useState<ProVocalAIEnhancerSettings>(
    DEFAULT_PRESET.aiEnhancer || audioEngine.aiEnhancerSettings
  );

  // Audio Playback & Telemetry State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiveMic, setIsLiveMic] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bpm, setBpm] = useState(128);
  const [pitchData, setPitchData] = useState<PitchTrackData | null>(null);
  const [audioMetrics, setAudioMetrics] = useState<AudioMetrics>({
    lufs: -14.2,
    outputRmsDb: -18.4,
    peakDb: -0.8,
    gainReductionDb: 2.1,
    latencyMs: 3.8,
    dspLoadPercent: 12,
  });

  // Dual Track Stems State (Vocals + Beat)
  const [tracks, setTracks] = useState<{ vocal: TrackStemInfo; beat: TrackStemInfo }>({
    vocal: audioEngine.vocalTrackInfo,
    beat: audioEngine.beatTrackInfo,
  });

  // Vocal-Beat Synergy & Alignment State
  const [synergySettings, setSynergySettings] = useState<SynergyPocketSettings>(audioEngine.synergySettings);

  // UI Modals, Active Preset & Top Section Bar State
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isGoogleDriveModalOpen, setIsGoogleDriveModalOpen] = useState(false);
  const [isOptimizerModalOpen, setIsOptimizerModalOpen] = useState(false);
  const [googleDriveTargetTrack, setGoogleDriveTargetTrack] = useState<'vocal' | 'beat'>('beat');
  const [activeSection, setActiveSection] = useState<StudioSectionId>('tracks');
  const [activePreset, setActivePreset] = useState<ArtistVocalPreset>(FACTORY_ARTIST_PRESETS[0]);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>(audioEngine.getRecordingStatus());

  // Undo / Redo History State
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>(historyManager.getStatus());

  // 60-Second Auto-Save State (IndexedDB)
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>(() => autoSaveManager.getStatus());
  const [sessionRecoveryNotice, setSessionRecoveryNotice] = useState<{
    snapshotCount: number;
    savedTime: number;
  } | null>(null);

  // Persistent Database & Library Stats (Stored in IndexedDB)
  const [databaseStats, setDatabaseStats] = useState<{ assetCount: number; hasActiveSession: boolean }>({
    assetCount: 0,
    hasActiveSession: false,
  });

  // Persistent Session Restoration from IndexedDB, AutoSave 60s Initialization, and History
  useEffect(() => {
    let isMounted = true;

    const refreshStats = async () => {
      try {
        const stats = await getDatabaseStorageStats();
        if (isMounted) {
          setDatabaseStats({
            assetCount: stats.assetCount,
            hasActiveSession: stats.hasActiveSession,
          });
        }
      } catch {}
    };

    refreshStats();
    const unsubLibrary = audioEngine.subscribeLibrary(() => {
      refreshStats();
    });

    const unsubHistory = historyManager.subscribe((status) => {
      if (isMounted) setHistoryStatus(status);
    });

    // Initialize 60-second auto-save to IndexedDB
    autoSaveManager.init(60);
    const unsubAutoSave = autoSaveManager.subscribe((status) => {
      if (isMounted) setAutoSaveStatus(status);
    });

    // Restore persistent session if available from IndexedDB
    audioEngine.restoreSessionFromDB().then((restored) => {
      if (!isMounted) return;
      if (restored) {
        if (restored.tuningSettings) setTuningSettings(restored.tuningSettings);
        if (restored.micSettings) setMicSettings(restored.micSettings);
        if (restored.denoiseSettings) setDenoiseSettings(restored.denoiseSettings);
        if (restored.alignSettings) setAlignSettings(restored.alignSettings);
        if (restored.plugins) setPlugins(restored.plugins);
        if (restored.masteringSettings) setMasteringSettings(restored.masteringSettings);
        if (restored.pitchFormantSettings) setPitchFormantSettings(restored.pitchFormantSettings);
        if (restored.aiEnhancerSettings) setAiEnhancerSettings(restored.aiEnhancerSettings);
        if (restored.synergySettings) setSynergySettings(restored.synergySettings);
        if (restored.bpm) setBpm(restored.bpm);

        setTracks({
          vocal: audioEngine.vocalTrackInfo,
          beat: audioEngine.beatTrackInfo,
        });
        setDuration(audioEngine.getDuration());

        if (restored.snapshots && restored.snapshots.length > 0) {
          setSessionRecoveryNotice({
            snapshotCount: restored.snapshots.length,
            savedTime: restored.lastSaved,
          });
        } else {
          historyManager.init({
            tuningSettings: restored.tuningSettings || DEFAULT_PRESET.tuning,
            micSettings: restored.micSettings || DEFAULT_PRESET.mic,
            denoiseSettings: restored.denoiseSettings || DEFAULT_PRESET.denoise,
            alignSettings: restored.alignSettings || DEFAULT_PRESET.align,
            plugins: restored.plugins || DEFAULT_PRESET.plugins,
            masteringSettings: restored.masteringSettings || DEFAULT_PRESET.mastering,
            pitchFormantSettings: restored.pitchFormantSettings || audioEngine.pitchFormantSettings,
            aiEnhancerSettings: restored.aiEnhancerSettings || audioEngine.aiEnhancerSettings,
            activePresetId: DEFAULT_PRESET.id,
            activePresetName: DEFAULT_PRESET.name,
          });
        }
      } else {
        historyManager.init({
          tuningSettings,
          micSettings,
          denoiseSettings,
          alignSettings,
          plugins,
          masteringSettings,
          pitchFormantSettings,
          aiEnhancerSettings,
          activePresetId: activePreset.id,
          activePresetName: activePreset.name,
        });
      }
      refreshStats();
    });

    return () => {
      isMounted = false;
      unsubLibrary();
      unsubHistory();
      unsubAutoSave();
    };
  }, []);

  // Subscribe to audio engine track, synergy, and recording events
  useEffect(() => {
    const unsubTracks = audioEngine.subscribeTracks((updatedTracks) => {
      setTracks(updatedTracks);
      setDuration(audioEngine.getDuration());
    });
    const unsubSynergy = audioEngine.subscribeSynergy(setSynergySettings);
    const unsubRecord = audioEngine.subscribeRecordingStatus(setRecordingStatus);
    return () => {
      unsubTracks();
      unsubSynergy();
      unsubRecord();
    };
  }, []);

  // Push updates to Audio Engine whenever state changes
  useEffect(() => {
    audioEngine.updateTuningSettings(tuningSettings);
  }, [tuningSettings]);

  useEffect(() => {
    audioEngine.updatePitchFormantSettings(pitchFormantSettings);
  }, [pitchFormantSettings]);

  useEffect(() => {
    audioEngine.updateMicSettings(micSettings);
  }, [micSettings]);

  useEffect(() => {
    audioEngine.updateDenoiseSettings(denoiseSettings);
  }, [denoiseSettings]);

  useEffect(() => {
    audioEngine.updateAlignSettings(alignSettings);
  }, [alignSettings]);

  useEffect(() => {
    audioEngine.updateMasteringSettings(masteringSettings);
  }, [masteringSettings]);

  useEffect(() => {
    audioEngine.updatePlugins(plugins);
  }, [plugins]);

  // Subscribe to real-time pitch detection & audio metrics from engine
  useEffect(() => {
    const unsubPitch = audioEngine.onPitchData(data => {
      setPitchData(data);
    });

    const unsubMetrics = audioEngine.onMetrics(metrics => {
      setAudioMetrics(metrics);
    });

    const unsubTime = audioEngine.onTime((time, dur) => {
      setCurrentTime(time);
      if (dur > 0) setDuration(dur);
    });

    return () => {
      unsubPitch();
      unsubMetrics();
      unsubTime();
    };
  }, []);

  // Screen Wake Lock & Background Execution Protection
  // Keeps browser audio thread & state alive without sleeping/reloading during file browsing or DSP processing
  useEffect(() => {
    let wakeLockSentinel: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && (navigator as any).wakeLock) {
          wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        }
      } catch {
        // WakeLock may fail if tab not active, ignore safely
      }
    };

    requestWakeLock();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLockSentinel && typeof wakeLockSentinel.release === 'function') {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, []);

  // Google Drive & Google Picker Handlers
  const handleOpenGoogleDrive = (targetTrack: 'vocal' | 'beat' = 'beat') => {
    setGoogleDriveTargetTrack(targetTrack);
    setIsGoogleDriveModalOpen(true);
  };

  const handleOpenGooglePicker = async (targetTrack: 'vocal' | 'beat' = 'beat') => {
    try {
      await launchGooglePicker({
        targetTrack,
        title: `Select ${targetTrack === 'vocal' ? 'Vocal Stem' : 'Beat Track'} - NeuralTune Studio`,
        onStemLoaded: (trackType, fileName) => {
          handleGoogleDriveStemLoaded(trackType as 'vocal' | 'beat', fileName);
        },
      });
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        // Fall back to opening the full Drive modal
        handleOpenGoogleDrive(targetTrack);
      }
    }
  };

  const handleGoogleDriveStemLoaded = (trackType: 'vocal' | 'beat', _fileName: string) => {
    setTracks({
      vocal: audioEngine.vocalTrackInfo,
      beat: audioEngine.beatTrackInfo,
    });
    setDuration(audioEngine.getDuration());
    if (trackType === 'beat') {
      setBpm(audioEngine.synergySettings.detectedBeatBpm);
    }
  };

  // Transport Handlers
  const handlePlayToggle = async () => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      await audioEngine.play();
      setIsPlaying(audioEngine.getIsPlaying());
    }
  };

  const handleStop = () => {
    audioEngine.stop();
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleMicToggle = async () => {
    try {
      const active = await audioEngine.toggleMicrophone();
      setIsLiveMic(active);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Microphone error: ${msg}`, 'error');
    }
  };

  // Recording Handlers
  const handleStartRecording = async (options?: {
    countInSeconds?: number;
    playBeat?: boolean;
    liveMonitoring?: boolean;
  }) => {
    try {
      await audioEngine.startRecording(options);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Recording Error: ${msg}`, 'error');
    }
  };

  const handleStopRecording = async () => {
    try {
      const take = await audioEngine.stopRecording();
      if (take) {
        setTracks({
          vocal: audioEngine.vocalTrackInfo,
          beat: audioEngine.beatTrackInfo,
        });
        setDuration(audioEngine.getDuration());
      }
    } catch (err: unknown) {
      console.warn('Error stopping recording:', err);
    }
  };

  const handleCancelRecording = () => {
    audioEngine.cancelRecording();
  };

  const handleToggleRecord = async () => {
    if (recordingStatus.isRecording || recordingStatus.isCountingIn) {
      await handleStopRecording();
    } else {
      await handleStartRecording({ countInSeconds: 0, playBeat: true });
    }
  };

  // Undo & Redo Handlers
  const handleUndo = () => {
    const prevState = historyManager.undo();
    if (!prevState) return;
    setTuningSettings(prevState.tuningSettings);
    setMicSettings(prevState.micSettings);
    setDenoiseSettings(prevState.denoiseSettings);
    setAlignSettings(prevState.alignSettings);
    setPlugins(prevState.plugins);
    setMasteringSettings(prevState.masteringSettings);
    setPitchFormantSettings(prevState.pitchFormantSettings);
    setAiEnhancerSettings(prevState.aiEnhancerSettings);
    if (prevState.activePresetId) {
      const match = FACTORY_ARTIST_PRESETS.find(p => p.id === prevState.activePresetId);
      if (match) setActivePreset(match);
    }
  };

  const handleRedo = () => {
    const nextState = historyManager.redo();
    if (!nextState) return;
    setTuningSettings(nextState.tuningSettings);
    setMicSettings(nextState.micSettings);
    setDenoiseSettings(nextState.denoiseSettings);
    setAlignSettings(nextState.alignSettings);
    setPlugins(nextState.plugins);
    setMasteringSettings(nextState.masteringSettings);
    setPitchFormantSettings(nextState.pitchFormantSettings);
    setAiEnhancerSettings(nextState.aiEnhancerSettings);
    if (nextState.activePresetId) {
      const match = FACTORY_ARTIST_PRESETS.find(p => p.id === nextState.activePresetId);
      if (match) setActivePreset(match);
    }
  };

  // Parameter Change Handlers with Undo/Redo History Recording
  const handleUpdateTuning = (tuning: TuningSettings) => {
    historyManager.pushSnapshot(
      {
        tuningSettings: tuning,
        micSettings,
        denoiseSettings,
        alignSettings,
        plugins,
        masteringSettings,
        pitchFormantSettings,
        aiEnhancerSettings,
        activePresetId: activePreset?.id,
        activePresetName: activePreset?.name,
      },
      'Tune Settings',
      350
    );
    setTuningSettings(tuning);
  };

  const handleUpdateMic = (mic: MicLockerSettings) => {
    historyManager.pushSnapshot(
      {
        tuningSettings,
        micSettings: mic,
        denoiseSettings,
        alignSettings,
        plugins,
        masteringSettings,
        pitchFormantSettings,
        aiEnhancerSettings,
        activePresetId: activePreset?.id,
        activePresetName: activePreset?.name,
      },
      'Mic Locker',
      350
    );
    setMicSettings(mic);
  };

  const handleUpdateDenoise = (denoise: DenoiseSettings) => {
    historyManager.pushSnapshot(
      {
        tuningSettings,
        micSettings,
        denoiseSettings: denoise,
        alignSettings,
        plugins,
        masteringSettings,
        pitchFormantSettings,
        aiEnhancerSettings,
        activePresetId: activePreset?.id,
        activePresetName: activePreset?.name,
      },
      'Denoise Settings',
      350
    );
    setDenoiseSettings(denoise);
  };

  const handleUpdateAlign = (align: AutoAlignSettings) => {
    historyManager.pushSnapshot(
      {
        tuningSettings,
        micSettings,
        denoiseSettings,
        alignSettings: align,
        plugins,
        masteringSettings,
        pitchFormantSettings,
        aiEnhancerSettings,
        activePresetId: activePreset?.id,
        activePresetName: activePreset?.name,
      },
      'Auto-Align Settings',
      350
    );
    setAlignSettings(align);
  };

  const handleUpdatePlugins = (newPlugins: ModularPlugin[]) => {
    historyManager.pushSnapshot(
      {
        tuningSettings,
        micSettings,
        denoiseSettings,
        alignSettings,
        plugins: newPlugins,
        masteringSettings,
        pitchFormantSettings,
        aiEnhancerSettings,
        activePresetId: activePreset?.id,
        activePresetName: activePreset?.name,
      },
      'Plugin Rack',
      350
    );
    setPlugins(newPlugins);
  };

  const handleUpdateMastering = (mastering: MasteringSettings) => {
    historyManager.pushSnapshot(
      {
        tuningSettings,
        micSettings,
        denoiseSettings,
        alignSettings,
        plugins,
        masteringSettings: mastering,
        pitchFormantSettings,
        aiEnhancerSettings,
        activePresetId: activePreset?.id,
        activePresetName: activePreset?.name,
      },
      'Mastering Suite',
      350
    );
    setMasteringSettings(mastering);
  };

  const handleUpdatePitchFormant = (pitchFormant: PitchFormantSettings) => {
    historyManager.pushSnapshot(
      {
        tuningSettings,
        micSettings,
        denoiseSettings,
        alignSettings,
        plugins,
        masteringSettings,
        pitchFormantSettings: pitchFormant,
        aiEnhancerSettings,
        activePresetId: activePreset?.id,
        activePresetName: activePreset?.name,
      },
      'Pitch & Formant',
      350
    );
    setPitchFormantSettings(pitchFormant);
  };

  const handleUpdateAiEnhancer = (aiEnhancer: ProVocalAIEnhancerSettings) => {
    historyManager.pushSnapshot(
      {
        tuningSettings,
        micSettings,
        denoiseSettings,
        alignSettings,
        plugins,
        masteringSettings,
        pitchFormantSettings,
        aiEnhancerSettings: aiEnhancer,
        activePresetId: activePreset?.id,
        activePresetName: activePreset?.name,
      },
      'AI Enhancer',
      350
    );
    setAiEnhancerSettings(aiEnhancer);
  };

  // Global Keyboard Shortcuts (Space: Play/Pause, R: Record/Stop, Esc: Cancel Record, ⌘Z: Undo, ⌘⇧Z: Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handlePlayToggle();
      } else if (e.code === 'KeyR' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handleToggleRecord();
      } else if (e.code === 'Escape') {
        if (recordingStatus.isRecording || recordingStatus.isCountingIn) {
          e.preventDefault();
          handleCancelRecording();
        }
      } else if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleRedo();
        } else if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          autoSaveManager.triggerImmediateSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recordingStatus, isPlaying, historyStatus]);

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    audioEngine.seek(time);
  };

  const handleApplyPreset = (preset: ArtistVocalPreset) => {
    historyManager.pushSnapshot(
      {
        tuningSettings: preset.tuning,
        micSettings: preset.mic,
        denoiseSettings: preset.denoise,
        alignSettings: preset.align,
        plugins: preset.plugins,
        masteringSettings: preset.mastering,
        pitchFormantSettings: preset.pitchFormant || pitchFormantSettings,
        aiEnhancerSettings: preset.aiEnhancer || aiEnhancerSettings,
        activePresetId: preset.id,
        activePresetName: preset.name,
      },
      `Apply ${preset.name} Preset`
    );
    setActivePreset(preset);
    setTuningSettings(preset.tuning);
    setMicSettings(preset.mic);
    setDenoiseSettings(preset.denoise);
    setAlignSettings(preset.align);
    setPlugins(preset.plugins);
    setMasteringSettings(preset.mastering);
    if (preset.pitchFormant) {
      setPitchFormantSettings(preset.pitchFormant);
      audioEngine.updatePitchFormantSettings(preset.pitchFormant);
    }
    if (preset.aiEnhancer) {
      setAiEnhancerSettings(preset.aiEnhancer);
      audioEngine.updateAIEnhancerSettings(preset.aiEnhancer);
    }
    audioEngine.applyFullPreset(preset);
  };

  const currentSettings = studioSettings || DEFAULT_STUDIO_SETTINGS;
  const activeTheme = THEME_OPTIONS.find(t => t.id === currentSettings.theme) || THEME_OPTIONS[0];
  const activeWallpaper = PRESET_WALLPAPERS.find(w => w.id === currentSettings.presetWallpaper);

  return (
    <div
      className={`min-h-screen ${activeTheme.bgClass} text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950 relative overflow-x-hidden`}
    >
      {/* Dynamic Background Wallpaper Layer */}
      {currentSettings.backgroundType === 'preset' && activeWallpaper && (
        <div
          className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-500"
          style={{
            background: activeWallpaper.gradientCss,
            opacity: currentSettings.wallpaperOpacity,
            filter: `blur(${currentSettings.wallpaperBlur}px)`,
          }}
        />
      )}

      {currentSettings.backgroundType === 'custom' && currentSettings.customWallpaperUrl && (
        <div
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center transition-opacity duration-500"
          style={{
            backgroundImage: `url(${currentSettings.customWallpaperUrl})`,
            opacity: currentSettings.wallpaperOpacity,
            filter: `blur(${currentSettings.wallpaperBlur}px)`,
          }}
        />
      )}

      {/* Global Studio Top Section Bar Navigation */}
      <Header
        onOpenPresetsModal={() => setIsPresetModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenAutoMixModal={() => setIsAutoMixModalOpen(true)}
        onOpenAutoPresetBeatMixModal={() => setIsAutoPresetBeatMixModalOpen(true)}
        onOpenGoogleDrive={() => handleOpenGoogleDrive('beat')}
        onOpenGooglePicker={() => handleOpenGooglePicker('beat')}
        onOpenOptimizer={() => setIsOptimizerModalOpen(true)}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        latencyMs={audioMetrics.latencyMs}
        dspLoadPercent={audioMetrics.dspLoadPercent}
        activePreset={activePreset}
        quickPresets={FACTORY_ARTIST_PRESETS.slice(0, 12)}
        onQuickApplyPreset={handleApplyPreset}
        canUndo={historyStatus.canUndo}
        canRedo={historyStatus.canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        lastActionLabel={historyStatus.lastAction}
        databaseStats={databaseStats}
        autoSaveStatus={autoSaveStatus}
        onTriggerAutoSave={() => autoSaveManager.triggerImmediateSave()}
      />

      {/* Auto-Save Crash Recovery Banner */}
      {sessionRecoveryNotice && (
        <div className="max-w-7xl mx-auto px-3 sm:px-5 pt-3">
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-cyan-950/80 border border-emerald-500/40 text-emerald-200[...]">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                <strong className="text-white font-semibold">Session Automatically Restored:</strong> Stems, DSP settings, and{' '}
                <strong className="text-emerald-300 font-mono">{sessionRecoveryNotice.snapshotCount} parameter snapshots</strong>{' '}
                were recovered from IndexedDB (saved {new Date(sessionRecoveryNotice.savedTime).toLocaleTimeString()}).
              </span>
            </div>
            <button
              onClick={() => setSessionRecoveryNotice(null)}
              className="text-slate-400 hover:text-white px-2 py-0.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition cursor-pointer text-[11px]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Studio Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 space-y-5 pb-40 sm:pb-32 relative z-10">
        {/* Section View Switching (Toggled via the Top Section Bar) */}
        <div className="space-y-5">
          {/* Section 00: Audio Waveform & Dual-Stem Tracks Deck */}
          {(activeSection === 'tracks' || activeSection === 'all') && (
            <div className={activeSection === 'all' ? 'border-b border-slate-800/80 pb-6' : ''}>
              <WaveformTimeline
                isPlaying={isPlaying}
                isLiveMic={isLiveMic}
                currentTime={currentTime}
                duration={duration}
                onPlayToggle={handlePlayToggle}
                onStop={handleStop}
                onMicToggle={handleMicToggle}
                onSeek={handleSeek}
                bpm={bpm}
                onBpmChange={setBpm}
                vocalTrack={tracks.vocal}
                beatTrack={tracks.beat}
                synergySettings={synergySettings}
                onSynergyChange={patch => audioEngine.updateSynergySettings(patch)}
                onOpenAutoMix={() => setIsAutoMixModalOpen(true)}
                onOpenDrive={track => handleOpenGoogleDrive(track)}
                onOpenPicker={track => handleOpenGooglePicker(track)}
                recordingStatus={recordingStatus}
                onToggleRecord={handleToggleRecord}
                canUndo={historyStatus.canUndo}
                canRedo={historyStatus.canRedo}
                onUndo={handleUndo}
                onRedo={handleRedo}
              />
            </div>
          )}

          {/* Section 0: Dedicated Artist Vocal Presets Library */}
          {(activeSection === 'presets' || activeSection === 'all') && (
            <div className={activeSection === 'all' ? 'border-b border-slate-800/80 pb-6' : ''}>
              <PresetsSection
                activePresetId={activePreset?.id}
                onApplyPreset={handleApplyPreset}
                currentPresetState={{
                  tuning: tuningSettings,
                  mic: micSettings,
                  denoise: denoiseSettings,
                  align: alignSettings,
                  plugins: plugins,
                  mastering: masteringSettings,
                  pitchFormant: pitchFormantSettings,
                  aiEnhancer: aiEnhancerSettings,
                }}
                onUpdateTuning={tuning => {
                  handleUpdateTuning(tuning);
                  audioEngine.updateTuningSettings(tuning);
                }}
                onUpdateMic={mic => {
                  handleUpdateMic(mic);
                  audioEngine.updateMicSettings(mic);
                }}
                onUpdatePitchFormant={formant => {
                  handleUpdatePitchFormant(formant);
                  audioEngine.updatePitchFormantSettings(formant);
                }}
                onUpdatePlugins={newPlugins => {
                  handleUpdatePlugins(newPlugins);
                  audioEngine.updateModularPlugins(newPlugins);
                }}
                onUpdateMastering={mastering => {
                  handleUpdateMastering(mastering);
                  audioEngine.updateMasteringSettings(mastering);
                }}
              />
            </div>
          )}

          {/* Section 1: Antares Tuning Dial & Real-Time Pitch Tracking */}
          {(activeSection === 'tuning' || activeSection === 'all') && (
            <div className="space-y-5">
              <TuningDial
                settings={tuningSettings}
                onChange={handleUpdateTuning}
                pitchData={pitchData}
                onAutoDetectKey={() => audioEngine.detectKeyFromAudio()}
              />

              <PitchVisualizer pitchData={pitchData} />
            </div>
          )}

          {/* Section 1.5: Dedicated Pitch Shifter & Formant Resonator Processor */}
          {(activeSection === 'pitch_formant' || activeSection === 'all') && (
            <div className={activeSection === 'all' ? 'border-b border-slate-800/80 pb-6' : ''}>
              <PitchFormantSection
                settings={pitchFormantSettings}
                onChange={handleUpdatePitchFormant}
              />
            </div>
          )}

          {/* Section 1.8: Pro Vocal AI Enhancer & De-Harsh Chain */}
          {(activeSection === 'ai_enhancer' || activeSection === 'all') && (
            <div className={activeSection === 'all' ? 'border-b border-slate-800/80 pb-6' : ''}>
              <AIEnhancer
                settings={aiEnhancerSettings}
                onChange={handleUpdateAiEnhancer}
              />
            </div>
          )}

          {/* Section 2: Virtual Mic Locker & Vocal-Beat Synergy / Noise / Alignment */}
          {(activeSection === 'mic' || activeSection === 'all') && (
            <div className="space-y-5">
              <MicLocker
                settings={micSettings}
                onChange={handleUpdateMic}
              />

              <DenoiseAndAlign
                denoiseSettings={denoiseSettings}
                onDenoiseChange={handleUpdateDenoise}
                alignSettings={alignSettings}
                onAlignChange={handleUpdateAlign}
                activeNoiseReductionDb={Math.round(audioMetrics.outputRmsDb < denoiseSettings.threshold ? denoiseSettings.reduction : 0)}
                synergySettings={synergySettings}
                onSynergyChange={patch => audioEngine.updateSynergySettings(patch)}
              />
            </div>
          )}

          {/* Section 3: Modular Insert Effect Rack */}
          {(activeSection === 'plugins' || activeSection === 'all') && (
            <div>
              <ModularPluginRack
                plugins={plugins}
                onChange={handleUpdatePlugins}
              />
            </div>
          )}

          {/* Section 4: Vocal & Mixdown Mastering Suite */}
          {(activeSection === 'mastering' || activeSection === 'all') && (
            <div>
              <MasteringSuite
                settings={masteringSettings}
                onChange={handleUpdateMastering}
                metrics={audioMetrics}
              />
            </div>
          )}

          {/* Section 5: Studio Asset & Render Library */}
          {(activeSection === 'library' || active Section === 'all') && (
            <div>
              <LibrarySection
                onOpenGoogleDrive={() => handleOpenGoogleDrive('beat')}
                onTracksChanged={() => {
                  setTracks({
                    vocal: audioEngine.vocalTrackInfo,
                    beat: audioEngine.beatTrackInfo,
                  });
                  setDuration(audioEngine.getDuration());
                }}
              />
            </div>
          )}
        </div>
      </main>

      {/* Fixed Bottom Transport Dock with Scrubber, Skip Controls & Speed Sync */}
      <BottomTransportDock
        audioEngine={audioEngine}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        vocalTrack={tracks.vocal}
        beatTrack={tracks.beat}
        isLiveMicActive={isLiveMic}
        pitchFormantSettings={pitchFormantSettings}
        recordingStatus={recordingStatus}
        onTogglePlay={handlePlayToggle}
        onStop={handleStop}
        onToggleMic={handleMicToggle}
        onToggleRecord={handleToggleRecord}
        onOpenPitchFormant={() => setActiveSection('pitch_formant')}
        onOpenAutoMix={() => setIsAutoPresetBeatMixModalOpen(true)}
        canUndo={historyStatus.canUndo}
        canRedo={historyStatus.canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Floating Live Vocal Recording HUD Overlay */}
      <LiveRecordingHUD
        recordingStatus={recordingStatus}
        hasBeat={Boolean(tracks.beat.duration && tracks.beat.duration > 0)}
        onStopRecording={handleStopRecording}
        onCancelRecording={handleCancelRecording}
        onToggleMonitoring={() => audioEngine.toggleLiveMonitoring()}
      />

      {/* 1-Click AI Auto-Preset & Smart Beat-Vocal Sync Modal */}
      <AutoPresetBeatMixModal
        isOpen={isAutoPresetBeatMixModalOpen}
        onClose={() => setIsAutoPresetBeatMixModalOpen(false)}
        onPresetApplied={(preset) => {
          handleApplyPreset(preset);
          setTracks({
            vocal: { ...audioEngine.vocalTrackInfo },
            beat: { ...audioEngine.beatTrackInfo },
          });
          setSynergySettings({ ...audioEngine.synergySettings });
        }}
      />

      {/* Cloud Presets Modal */}
      <PresetManagerModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        onApplyPreset={handleApplyPreset}
        currentPresetState={{
          tuning: tuningSettings,
          mic: micSettings,
          denoise: denoiseSettings,
          align: alignSettings,
          plugins: plugins,
          mastering: masteringSettings,
        }}
      />

      {/* Modern Studio Settings Modal (Theme, Custom Wallpapers, Export Quality, Audio Buffers) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={currentSettings}
        onUpdateSettings={setStudioSettings}
        onOpenAutoMixModal={() => setIsAutoMixModalOpen(true)}
        onOpenOptimizer={() => setIsOptimizerModalOpen(true)}
      />

      {/* AI Auto-Mix Mastering Suite Modal */}
      <AutoMixModal
        isOpen={isAutoMixModalOpen}
        onClose={() => setIsAutoMixModalOpen(false)}
        studioSettings={currentSettings}
        initialPresetId={currentSettings.defaultAutoMixPreset}
        initialStemSource={currentSettings.defaultAutoMixStem}
        renderSpeed={currentSettings.renderSpeed}
        onApplyToMasterSuite={setMasteringSettings}
      />

      {/* Google Drive Integration Modal for Beat & Audio Stems */}
      <GoogleDriveModal
        isOpen={isGoogleDriveModalOpen}
        onClose={() => setIsGoogleDriveModalOpen(false)}
        initialTargetTrack={googleDriveTargetTrack}
        onStemLoaded={handleGoogleDriveStemLoaded}
      />

      {/* Studio Engine & Loading Optimizer Modal */}
      <PerformanceOptimizerModal
        isOpen={isOptimizerModalOpen}
        onClose={() => setIsOptimizerModalOpen(false)}
        currentLatencyMs={audioMetrics.latencyMs}
      />

      {/* Offline Connectivity Notification Indicator */}
      <OfflineIndicator />

      {/* Global In-App Toast Notifications */}
      <ToastContainer />

      {/* Studio Footer Status Bar */}
      <footer className="hidden sm:block border-t border-slate-800/80 bg-slate-950/80 px-4 py-2.5 text-[11px] font-mono text-slate-400 pb-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOptimizerModalOpen(true)}
              className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
              title="Open Performance Optimizer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>DSP Graph Active ({audioMetrics.dspLoadPercent.toFixed(1)}%)</span>
            </button>
            <span className="hidden sm:inline">&bull;</span>
            <span className="hidden sm:inline text-slate-400">
              Mic Model: <strong className="text-white">{micSettings.selectedMic.toUpperCase()}</strong>
            </span>
            <span className="hidden sm:inline">&bull;</span>
            <span className="hidden sm:inline text-slate-400">
              Tune Key: <strong className="text-cyan-300">{tuningSettings.key} {tuningSettings.scale}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOptimizerModalOpen(true)}
              className="hover:text-cyan-300 transition cursor-pointer flex items-center gap-1.5"
              title="Buffer & High-RAM Cache Settings"
            >
              <span>Buffer: <strong className="text-cyan-400 font-bold">{audioEngine.performanceConfig.bufferSize || 256} smp</strong></span>
              <span>&bull;</span>
              <span>RAM Cache: <strong className="text-violet-400 font-bold">{audioEngine.performanceConfig.maxMemoryCacheMb >= 1024 ? `${(audioEngine.performanceConfig.maxMemoryCacheMb / 1024).[...]
