import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Flame,
  Volume2,
  Sliders,
  Download,
  Check,
  Play,
  Pause,
  RotateCcw,
  X,
  Radio,
  Zap,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { AutoMixPresetId, AutoMixResult, MasteringSettings, RenderSpeedId, StudioSettings } from '../types';
import { audioEngine } from '../audio/audioEngine';
import { AUTO_MIX_PRESETS, executeOfflineAutoMix, analyzeAudioBuffer } from '../audio/autoMixEngine';
import { encodeAudioBufferToBlob } from '../audio/exportEncoder';
import { DEFAULT_STUDIO_SETTINGS, loadStudioSettings } from '../audio/settingsStorage';

interface AutoMixModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToMasterSuite?: (settings: MasteringSettings) => void;
  studioSettings?: StudioSettings;
  initialPresetId?: string;
  initialStemSource?: 'full_mix' | 'vocal' | 'beat';
  renderSpeed?: RenderSpeedId;
}

export const AutoMixModal: React.FC<AutoMixModalProps> = ({
  isOpen,
  onClose,
  onApplyToMasterSuite,
  studioSettings,
  initialPresetId,
  initialStemSource,
  renderSpeed,
}) => {
  const effectiveSettings = studioSettings || loadStudioSettings() || DEFAULT_STUDIO_SETTINGS;

  const [selectedStem, setSelectedStem] = useState<'full_mix' | 'vocal' | 'beat'>(
    initialStemSource || effectiveSettings.defaultAutoMixStem || 'full_mix'
  );
  const [selectedPresetId, setSelectedPresetId] = useState<AutoMixPresetId>(
    ((initialPresetId || effectiveSettings.defaultAutoMixPreset) as AutoMixPresetId) || 'fire_trap_master'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [result, setResult] = useState<AutoMixResult | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [isApplied, setIsApplied] = useState(false);
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Stop Web Audio preview
  const stopPreview = () => {
    if (previewSourceRef.current) {
      try {
        previewSourceRef.current.stop();
        previewSourceRef.current.disconnect();
      } catch {}
      previewSourceRef.current = null;
    }
    setIsPlayingPreview(false);
  };

  // Clean up audio preview on unmount or close
  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, []);

  if (!isOpen) return null;

  const hasVocal = Boolean(audioEngine.vocalTrackInfo.duration > 0 && audioEngine.vocalBuffer);
  const hasBeat = Boolean(audioEngine.beatTrackInfo.duration > 0 && audioEngine.beatBuffer);
  const canProcess = hasVocal || hasBeat;

  const activePresetDef = AUTO_MIX_PRESETS[selectedPresetId] || AUTO_MIX_PRESETS.fire_trap_master;

  // Execute the offline auto mix engine
  const handleStartAutoMix = async () => {
    let sourceBuffer: AudioBuffer | null = null;

    if (selectedStem === 'vocal') {
      sourceBuffer = audioEngine.vocalBuffer;
    } else if (selectedStem === 'beat') {
      sourceBuffer = audioEngine.beatBuffer;
    } else {
      // Full Mix: If both stems exist, render quick sum buffer
      if (audioEngine.vocalBuffer && audioEngine.beatBuffer) {
        const vBuf = audioEngine.vocalBuffer;
        const bBuf = audioEngine.beatBuffer;
        const maxLen = Math.max(vBuf.length, bBuf.length);
        const ctx = new OfflineAudioContext(2, maxLen, vBuf.sampleRate);
        const vSource = ctx.createBufferSource();
        vSource.buffer = vBuf;
        const bSource = ctx.createBufferSource();
        bSource.buffer = bBuf;
        vSource.connect(ctx.destination);
        bSource.connect(ctx.destination);
        vSource.start(0);
        bSource.start(0);
        sourceBuffer = await ctx.startRendering();
      } else {
        sourceBuffer = audioEngine.vocalBuffer || audioEngine.beatBuffer;
      }
    }

    if (!sourceBuffer) {
      alert('Please upload a vocal track or beat first to run AI Auto-Mix.');
      return;
    }

    setIsProcessing(true);
    setProcessProgress(10);
    setCurrentStage('1. Fast Transient Analysis & Spectral Profiling...');

    try {
      setTimeout(() => {
        setProcessProgress(30);
        setCurrentStage('2. Multi-Band Compressor & Dynamic 808 Glue...');
      }, 250);

      setTimeout(() => {
        setProcessProgress(65);
        setCurrentStage('3. Analog Tube Saturation & Harmonic Exciters...');
      }, 550);

      setTimeout(() => {
        setProcessProgress(85);
        setCurrentStage('4. Brickwall Ceiling Maximizer & Anti-Aliasing Limiter...');
      }, 850);

      const effectiveSpeed = renderSpeed || effectiveSettings.renderSpeed;
      const mixRes = await executeOfflineAutoMix(
        sourceBuffer,
        selectedPresetId,
        effectiveSettings.sampleRate,
        effectiveSpeed
      );

      setProcessProgress(100);
      setCurrentStage('Complete! Mastered successfully.');
      setResult(mixRes);

      // Create preview blob using user's preferred quality
      const { blob } = encodeAudioBufferToBlob(mixRes.masteredBuffer, effectiveSettings.exportQuality);
      if (previewAudioUrl) {
        URL.revokeObjectURL(previewAudioUrl);
      }
      const url = URL.createObjectURL(blob);
      setPreviewAudioUrl(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Auto-Mix error: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTogglePreviewPlay = async () => {
    if (isPlayingPreview) {
      stopPreview();
      return;
    }

    if (!result?.masteredBuffer) return;
    const ctx = audioEngine.getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (err) {
        console.warn('AudioContext resume deferred:', err);
      }
    }

    stopPreview();

    try {
      const source = ctx.createBufferSource();
      source.buffer = result.masteredBuffer;
      const gain = ctx.createGain();
      gain.gain.value = 0.95;
      source.connect(gain);
      gain.connect(ctx.destination);

      source.onended = () => {
        setIsPlayingPreview(false);
        previewSourceRef.current = null;
      };

      source.start(0);
      previewSourceRef.current = source;
      setIsPlayingPreview(true);
    } catch {
      setIsPlayingPreview(false);
    }
  };

  const handleClose = () => {
    stopPreview();
    onClose();
  };

  const handleDownloadMaster = () => {
    if (!result) return;
    const { blob, extension } = encodeAudioBufferToBlob(result.masteredBuffer, effectiveSettings.exportQuality);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AutoMix_${activePresetDef.name.replace(/\s+/g, '_')}_${Date.now().toString().slice(-5)}${extension}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const handleApplyToLiveStudio = () => {
    if (!activePresetDef) return;
    // Map preset to studio mastering parameters
    const liveSettings: MasteringSettings = {
      enabled: true,
      lowCut: activePresetDef.eq.subBassFreq,
      bassGain: activePresetDef.eq.subBassGain,
      midGain: activePresetDef.eq.vocalPresenceGain,
      highAirGain: activePresetDef.eq.airSheenGain,
      compThreshold: activePresetDef.multiband.midThreshold,
      compRatio: activePresetDef.multiband.midRatio,
      compMakeup: Math.max(0, activePresetDef.limiter.preGainDb),
      tapeDrive: activePresetDef.saturation.driveAmount,
      limiterCeiling: activePresetDef.limiter.ceilingDb,
      stereoWidth: activePresetDef.stereo.width,
    };

    audioEngine.updateMasteringSettings(liveSettings);
    if (onApplyToMasterSuite) {
      onApplyToMasterSuite(liveSettings);
    }
    setIsApplied(true);
    setTimeout(() => setIsApplied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black">
              <Flame className="w-5 h-5 text-slate-950 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  AI Auto-Mix &amp; Mastering Engine
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  OFFLINE DSP
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans">
                Maxed-out Web Audio mastering chain for aggressive, industry-loud trap and hip-hop mixes.
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Target Stem & Mode Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setSelectedStem('full_mix')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedStem === 'full_mix'
                  ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40 text-white'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm">Full Mix (Sum)</span>
                <Layers className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-[11px] text-slate-400">
                Master both vocal stems and beat stems together through the full chain.
              </p>
            </button>

            <button
              onClick={() => setSelectedStem('vocal')}
              disabled={!hasVocal}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                !hasVocal
                  ? 'opacity-40 cursor-not-allowed border-slate-850 bg-slate-950/30 text-slate-500'
                  : selectedStem === 'vocal'
                  ? 'border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/40 text-white'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm">Vocal Stem Only</span>
                <Radio className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-[11px] text-slate-400">
                Apply aggressive vocal presence, de-essing, tube drive, and ceiling limiting.
              </p>
            </button>

            <button
              onClick={() => setSelectedStem('beat')}
              disabled={!hasBeat}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                !hasBeat
                  ? 'opacity-40 cursor-not-allowed border-slate-850 bg-slate-950/30 text-slate-500'
                  : selectedStem === 'beat'
                  ? 'border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/40 text-white'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm">Beat Stem Only</span>
                <Zap className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-[11px] text-slate-400">
                Maximize heavy 808 sub-bass, snap transient claps, and widen synth stereo fields.
              </p>
            </button>
          </div>

          {/* Preset Selector Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                Select Mastering Preset Architecture ({Object.keys(AUTO_MIX_PRESETS).length} Presets)
              </label>
              <span className="font-mono text-[10px] text-slate-400">
                Quality: <strong className="text-white">{studioSettings.exportQuality.toUpperCase()}</strong> @{' '}
                <strong className="text-white">{studioSettings.sampleRate / 1000}kHz</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {(Object.keys(AUTO_MIX_PRESETS) as AutoMixPresetId[]).map(pId => {
                const p = AUTO_MIX_PRESETS[pId];
                const isSelected = selectedPresetId === pId;
                return (
                  <button
                    key={pId}
                    onClick={() => setSelectedPresetId(pId)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/15 ring-1 ring-amber-500/50 shadow-md shadow-amber-950/30'
                        : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-950/80 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-bold ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                          {p.name}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                          {p.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/60 font-mono text-[10px] text-slate-400">
                      <span>Drive: <strong className="text-slate-200">{p.saturation.driveAmount}%</strong></span>
                      <span>&bull;</span>
                      <span>Ceiling: <strong className="text-slate-200">{p.limiter.ceilingDb}dB</strong></span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Preset Deep DSP Chain Breakdown */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 font-mono text-[11px]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Active DSP Chain: {activePresetDef.name}
              </span>
              <span className="text-slate-400 text-[10px]">
                Target: {activePresetDef.targetLufsDb} LUFS ({activePresetDef.soundSignature})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-850">
                <span className="text-[10px] text-slate-500 block">Sub &amp; Low-End EQ</span>
                <span className="text-slate-200 font-bold">
                  {activePresetDef.eq.subGainDb > 0 ? `+${activePresetDef.eq.subGainDb}` : activePresetDef.eq.subGainDb}dB @ 55Hz
                </span>
              </div>
              <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-850">
                <span className="text-[10px] text-slate-500 block">Air &amp; Sheen EQ</span>
                <span className="text-cyan-300 font-bold">
                  {activePresetDef.eq.airGainDb > 0 ? `+${activePresetDef.eq.airGainDb}` : activePresetDef.eq.airGainDb}dB @ 12kHz
                </span>
              </div>
              <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-850">
                <span className="text-[10px] text-slate-500 block">Saturation Node</span>
                <span className="text-rose-400 font-bold uppercase">
                  {activePresetDef.saturation.type.replace('_', ' ')} ({activePresetDef.saturation.driveAmount}%)
                </span>
              </div>
              <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-850">
                <span className="text-[10px] text-slate-500 block">Brickwall Limiter</span>
                <span className="text-emerald-400 font-bold">
                  +{activePresetDef.limiter.preGainDb}dB Pre-Gain / {activePresetDef.limiter.ceilingDb}dB
                </span>
              </div>
            </div>
          </div>

          {/* Processing Progress Indicator */}
          {isProcessing && (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2 animate-fade-in font-mono">
              <div className="flex items-center justify-between text-amber-200 text-xs">
                <span className="flex items-center gap-2">
                  <Flame className="w-4 h-4 animate-bounce text-amber-400" />
                  {currentStage}
                </span>
                <span>{processProgress}%</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-amber-500/20">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-amber-400 transition-all duration-300 rounded-full"
                  style={{ width: `${processProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Results Comparison HUD */}
          {result && (
            <div className="p-4 rounded-xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 space-y-4 font-mono">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                  <Check className="w-4 h-4 text-emerald-400" />
                  Mastering Complete &bull; +{(result.loudnessGainDb ?? result.lufsBoostDb ?? 0).toFixed(1)}dB Loudness Boost
                </span>
                <span className="text-[10px] text-slate-400">
                  Target: {result.preset?.targetLufs ?? result.targetLufsDb ?? activePresetDef.targetLufs} LUFS &bull; Output: {(result.outputAnalysis.lufs ?? result.outputAnalysis.integratedLufs ?? 0).toFixed(1)} LUFS
                </span>
              </div>

              {/* Before vs After Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Peak Level</span>
                  <span className="text-slate-400">{(result.inputAnalysis.peakDb ?? -12).toFixed(1)} dBFS</span>
                  <ArrowRight className="w-3 h-3 inline mx-1 text-slate-600" />
                  <strong className="text-emerald-400">{(result.outputAnalysis.peakDb ?? -0.1).toFixed(1)} dBFS</strong>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Integrated LUFS</span>
                  <span className="text-slate-400">{(result.inputAnalysis.lufs ?? result.inputAnalysis.integratedLufs ?? -18).toFixed(1)}</span>
                  <ArrowRight className="w-3 h-3 inline mx-1 text-slate-600" />
                  <strong className="text-amber-400">{(result.outputAnalysis.lufs ?? result.outputAnalysis.integratedLufs ?? -8).toFixed(1)}</strong>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Crest Factor</span>
                  <span className="text-slate-400">{(result.inputAnalysis.crestFactorDb ?? 10).toFixed(1)} dB</span>
                  <ArrowRight className="w-3 h-3 inline mx-1 text-slate-600" />
                  <strong className="text-cyan-400">{(result.outputAnalysis.crestFactorDb ?? 7.5).toFixed(1)} dB</strong>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Stereo Correlation</span>
                  <span className="text-slate-400">+{(result.inputAnalysis.stereoCorrelation ?? 0.95).toFixed(2)}</span>
                  <ArrowRight className="w-3 h-3 inline mx-1 text-slate-600" />
                  <strong className="text-violet-400">+{(result.outputAnalysis.stereoCorrelation ?? 0.88).toFixed(2)}</strong>
                </div>
              </div>

              {/* Spectral Balance Bars */}
              <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-lg border border-slate-850">
                <span className="text-[10px] text-slate-400 font-bold block mb-1">
                  Mastered Spectral Balance (20Hz - 20kHz)
                </span>
                <div className="grid grid-cols-4 gap-2 text-[10px]">
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Sub 808</span>
                      <span>{Math.round(result.outputAnalysis.frequencyBalance.subBassEnergy ?? ((result.outputAnalysis.frequencyBalance.subBass ?? 0.3) * 100))}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${Math.min(100, result.outputAnalysis.frequencyBalance.subBassEnergy ?? ((result.outputAnalysis.frequencyBalance.subBass ?? 0.3) * 100))}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Low-Mids</span>
                      <span>{Math.round(result.outputAnalysis.frequencyBalance.lowMidEnergy ?? ((result.outputAnalysis.frequencyBalance.lowMids ?? 0.25) * 100))}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full"
                        style={{ width: `${Math.min(100, result.outputAnalysis.frequencyBalance.lowMidEnergy ?? ((result.outputAnalysis.frequencyBalance.lowMids ?? 0.25) * 100))}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Presence</span>
                      <span>{Math.round(result.outputAnalysis.frequencyBalance.vocalPresenceEnergy ?? ((result.outputAnalysis.frequencyBalance.vocalPresence ?? 0.25) * 100))}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Math.min(100, result.outputAnalysis.frequencyBalance.vocalPresenceEnergy ?? ((result.outputAnalysis.frequencyBalance.vocalPresence ?? 0.25) * 100))}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Air Sheen</span>
                      <span>{Math.round(result.outputAnalysis.frequencyBalance.airBrightnessEnergy ?? ((result.outputAnalysis.frequencyBalance.airSheen ?? 0.2) * 100))}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${Math.min(100, result.outputAnalysis.frequencyBalance.airBrightnessEnergy ?? ((result.outputAnalysis.frequencyBalance.airSheen ?? 0.2) * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Result */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={handleTogglePreviewPlay}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition cursor-pointer"
                >
                  {isPlayingPreview ? <Pause className="w-4 h-4 fill-current text-amber-400" /> : <Play className="w-4 h-4 fill-current text-amber-400" />}
                  <span>{isPlayingPreview ? 'Pause Master Preview' : 'Play Mastered Audio'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApplyToLiveStudio}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold transition cursor-pointer ${
                      isApplied
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-cyan-300'
                    }`}
                  >
                    {isApplied ? <Check className="w-4 h-4" /> : <Sliders className="w-4 h-4" />}
                    <span>{isApplied ? 'Applied to Live Studio!' : 'Apply to Live Master'}</span>
                  </button>

                  <button
                    onClick={handleDownloadMaster}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-950" />
                    <span>Download Master ({(effectiveSettings.exportQuality || 'wav_24').toUpperCase()})</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Trigger Bar */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Web Audio OfflineContext &bull; Zero Server Latency</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
            >
              Close
            </button>

            <button
              id="btn-run-auto-mix-engine"
              onClick={handleStartAutoMix}
              disabled={isProcessing || !canProcess}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xl cursor-pointer ${
                isProcessing
                  ? 'bg-amber-600/50 text-amber-200 cursor-not-allowed'
                  : !canProcess
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 hover:from-amber-400 hover:via-rose-400 hover:to-amber-400 text-slate-950 shadow-amber-500/30 active:scale-95'
              }`}
            >
              <Flame className="w-4 h-4 fill-current text-slate-950" />
              <span>{isProcessing ? 'Mastering Track...' : 'Execute AI Auto-Mix Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
