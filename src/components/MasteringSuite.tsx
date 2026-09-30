import React, { useState, useRef } from 'react';
import { AudioMetrics, MasteringSettings, AutoMixPresetId, AutoMixResult } from '../types';
import { audioEngine, audioBufferToWavBlob, extractWaveformPeaks } from '../audio/audioEngine';
import { AUTO_MIX_PRESETS, executeOfflineAutoMix, applyAutoMixToLiveEngine } from '../audio/autoMixEngine';
import { loadStudioSettings } from '../audio/settingsStorage';
import {
  Sliders,
  Download,
  Check,
  Sparkles,
  Volume2,
  Disc,
  Play,
  Square,
  Flame,
  Zap,
  ChevronDown,
  ChevronUp,
  Activity,
} from 'lucide-react';

interface MasteringSuiteProps {
  settings: MasteringSettings;
  onChange: (updated: MasteringSettings) => void;
  metrics: AudioMetrics;
}

export const MasteringSuite: React.FC<MasteringSuiteProps> = ({ settings, onChange, metrics }) => {
  const [isBouncing, setIsBouncing] = useState(false);
  const [bounceSuccess, setBounceSuccess] = useState(false);
  const [savedAssetName, setSavedAssetName] = useState<string | null>(null);

  // AI Auto-Mix States
  const [showAutoMix, setShowAutoMix] = useState(true);
  const [selectedPresetId, setSelectedPresetId] = useState<AutoMixPresetId>('fire_trap_master');
  const [selectedStemSource, setSelectedStemSource] = useState<'full_mix' | 'vocal' | 'beat'>('full_mix');
  const [isAutoMixing, setIsAutoMixing] = useState(false);
  const [autoMixProgress, setAutoMixProgress] = useState<string>('');
  const [autoMixResult, setAutoMixResult] = useState<AutoMixResult | null>(null);
  const [appliedToLive, setAppliedToLive] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const handleOfflineBounce = async () => {
    setIsBouncing(true);
    setBounceSuccess(false);
    setSavedAssetName(null);

    try {
      const userSettings = loadStudioSettings();
      const res = await audioEngine.renderOfflineBounce({
        stemSelection: 'master',
        format: userSettings.exportQuality || 'wav_24bit',
        sampleRate: userSettings.sampleRate || 48000,
        renderSpeed: userSettings.renderSpeed || 'balanced_studio',
      });

      const wavBlob = res;
      const downloadName = res.asset?.name || `NeuralTune_Ultra_Master_${Date.now()}.wav`;

      const url = URL.createObjectURL(wavBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = downloadName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setSavedAssetName(res.asset?.name || 'Master WAV');
      setBounceSuccess(true);
      setTimeout(() => {
        setBounceSuccess(false);
        setSavedAssetName(null);
      }, 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Mastering bounce failed: ${msg}`);
    } finally {
      setIsBouncing(false);
    }
  };

  const handleExecuteAutoMix = async () => {
    setIsAutoMixing(true);
    setAppliedToLive(false);
    setAutoMixProgress('Reading audio buffer & computing initial peak levels...');

    try {
      await audioEngine.initialize();

      let sourceBuffer: AudioBuffer | null = null;
      if (selectedStemSource === 'vocal') {
        sourceBuffer = audioEngine.getVocalBuffer();
      } else if (selectedStemSource === 'beat') {
        sourceBuffer = audioEngine.getBeatBuffer();
      } else {
        sourceBuffer = audioEngine.getMasterSourceBuffer();
      }

      if (!sourceBuffer) {
        throw new Error('No audio tracks loaded. Please record or load audio stems first into your project!');
      }

      setAutoMixProgress('Detecting frequency balance & integrated LUFS...');
      await new Promise(r => setTimeout(r, 60));

      setAutoMixProgress('Running maxed-out mastering chain (3-band compressor, glue EQ, diode overdrive, brickwall limiter)...');
      const result = await executeOfflineAutoMix(sourceBuffer, selectedPresetId, 48000);

      setAutoMixResult(result);
      setAutoMixProgress('Auto-mix master completed!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`AI Auto-Mix failed: ${msg}`);
    } finally {
      setIsAutoMixing(false);
    }
  };

  const handleApplyToLive = () => {
    if (!autoMixResult) return;
    applyAutoMixToLiveEngine(autoMixResult.presetId);
    setAppliedToLive(true);
    setTimeout(() => setAppliedToLive(false), 3000);
  };

  const handleDownloadAutoMasteredWav = () => {
    if (!autoMixResult) return;
    const blob = audioBufferToWavBlob(autoMixResult.masteredBuffer, 24);
    const fileName = `NeuralTune_AIMaster_${autoMixResult.presetId}_${Date.now().toString().slice(-6)}.wav`;

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    audioEngine.addLibraryAsset({
      id: `aimaster_${Date.now()}`,
      name: fileName,
      type: 'rendered_master',
      timestamp: Date.now(),
      duration: autoMixResult.masteredBuffer.duration,
      fileSize: `${(blob.size / (1024 * 1024)).toFixed(2)} MB`,
      format: 'WAV',
      sampleRate: 48000,
      blob,
      audioUrl: URL.createObjectURL(blob),
      presetName: autoMixResult.presetName,
      peaks: extractWaveformPeaks(autoMixResult.masteredBuffer, 80),
      notes: `AI Auto-Mastered via ${autoMixResult.presetName} • Boosted +${autoMixResult.lufsBoostDb} LUFS (${autoMixResult.outputAnalysis.lufs} LUFS target)`,
    });
  };

  const stopPreview = () => {
    if (previewSourceRef.current) {
      try {
        previewSourceRef.current.stop();
        previewSourceRef.current.disconnect();
      } catch (_) {}
      previewSourceRef.current = null;
    }
    setIsPlayingPreview(false);
  };

  const handleTogglePreview = async () => {
    if (isPlayingPreview) {
      stopPreview();
      return;
    }

    if (!autoMixResult) return;
    let ctx = audioEngine.getAudioContext();
    if (!ctx || ctx.state === 'closed') {
      await audioEngine.initialize();
      ctx = audioEngine.getAudioContext();
    }
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (err) {
        console.warn('AudioContext resume deferred:', err);
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = autoMixResult.masteredBuffer;
    source.connect(ctx.destination);
    source.onended = () => {
      setIsPlayingPreview(false);
      previewSourceRef.current = null;
    };
    source.start(0);
    previewSourceRef.current = source;
    setIsPlayingPreview(true);
  };

  const selectedPresetDef = AUTO_MIX_PRESETS[selectedPresetId] || AUTO_MIX_PRESETS.fire_trap_master;

  return (
    <div className="rounded-2xl bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-slate-800 p-5 shadow-2xl backdrop-blur-md">
      {/* Header with AI Auto-Mix and Offline WAV Render buttons */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wide text-white uppercase flex items-center gap-2">
              Final Vocal & Mixdown Mastering Suite
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Offline Web Audio High-Resolution 24-Bit / 48kHz Engine
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* AI Auto-Mix Toggle Button */}
          <button
            id="btn-toggle-auto-mix-panel"
            onClick={() => setShowAutoMix(prev => !prev)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-black tracking-wide uppercase transition-all cursor-pointer shadow-lg ${
              showAutoMix
                ? 'bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 text-white shadow-rose-500/30 ring-2 ring-amber-300'
                : 'bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-amber-500/20'
            }`}
            title="Auto-master your entire track to sound massive, aggressive, and industry-ready for trap and hip-hop"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>AI Auto-Mix</span>
            <span className="px-1.5 py-0.5 text-[9px] bg-black/40 rounded font-mono text-amber-300">TRAP DSP</span>
            {showAutoMix ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Master bypass */}
          <button
            id="btn-toggle-mastering"
            onClick={() => onChange({ ...settings, enabled: !settings.enabled })}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              settings.enabled
                ? 'bg-pink-500 text-slate-950 shadow-md shadow-pink-500/25 ring-2 ring-pink-400/40'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {settings.enabled ? 'ACTIVE' : 'BYPASS'}
          </button>

          {/* Offline Bounce Button */}
          <button
            id="btn-offline-bounce"
            onClick={handleOfflineBounce}
            disabled={isBouncing}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-lg transition-all cursor-pointer ${
              bounceSuccess
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                : isBouncing
                ? 'bg-slate-800 text-slate-400 border border-slate-700 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200'
            }`}
            title="Renders the entire vocal session through the DSP graph into studio 24-bit 48kHz WAV audio"
          >
            {isBouncing ? (
              <>
                <Disc className="w-4 h-4 animate-spin" />
                <span>Bouncing...</span>
              </>
            ) : bounceSuccess ? (
              <>
                <Check className="w-4 h-4 text-slate-950" />
                <span>WAV Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export Master WAV</span>
              </>
            )}
          </button>
        </div>
      </div>

      {savedAssetName && (
        <div className="mt-3 flex items-center justify-between p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-300 font-mono">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Master render complete: <strong>{savedAssetName}</strong> downloaded and saved to your Studio Library!</span>
          </div>
          <span className="text-[10px] bg-emerald-900/60 px-2 py-0.5 rounded text-emerald-200 border border-emerald-500/30">
            24-Bit / 48kHz WAV
          </span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* AI AUTO-MIX SECTION (OFFLINE CLIENT-SIDE DSP MASTERING ENGINE)       */}
      {/* ===================================================================== */}
      {showAutoMix && (
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-b from-slate-950/90 via-slate-900/60 to-slate-950 border border-amber-500/30 shadow-2xl relative overflow-hidden">
          {/* Glowing subtle backdrop accent */}
          <div className="absolute top-0 right-0 w-80 h-32 bg-gradient-to-bl from-amber-500/10 via-rose-500/5 to-transparent pointer-events-none rounded-bl-full" />

          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-inner">
                <Flame className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white tracking-wide flex items-center gap-2">
                  <span>AI Auto-Mix Master Engine</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Offline Web Audio DSP
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Multiband Compressor • Dynamic 808 & Vocal Glue EQ • Diode Saturation • Brickwall Peak Limiter
                </p>
              </div>
            </div>

            {/* Target stem source selector */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
              <span className="text-slate-400 px-2 text-[10px]">SOURCE:</span>
              <button
                onClick={() => setSelectedStemSource('full_mix')}
                className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
                  selectedStemSource === 'full_mix'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mixdown (All)
              </button>
              <button
                onClick={() => setSelectedStemSource('vocal')}
                className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
                  selectedStemSource === 'vocal'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Vocals Only
              </button>
              <button
                onClick={() => setSelectedStemSource('beat')}
                className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
                  selectedStemSource === 'beat'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Beat Only
              </button>
            </div>
          </div>

          {/* Preset Selector Grid */}
          <div className="mt-3">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2 flex items-center justify-between">
              <span>Select Maxed-Out Trap & Hip-Hop Mastering Profile:</span>
              <span className="text-amber-400 font-mono text-[10px]">10 Dedicated Industry Profiles</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {Object.values(AUTO_MIX_PRESETS).map((p) => {
                const isSelected = p.id === selectedPresetId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPresetId(p.id)}
                    className={`p-2.5 rounded-xl text-left transition-all cursor-pointer border relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-900 border-amber-400 shadow-md shadow-amber-500/20 ring-1 ring-amber-400/50'
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {p.category}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-amber-400">
                          {p.targetLufs} LUFS
                        </span>
                      </div>
                      <div className="text-xs font-black text-white leading-snug line-clamp-1">{p.name}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{p.tagline}</div>
                    </div>
                    {isSelected && (
                      <div className="mt-2 flex items-center justify-between text-[9px] font-mono font-bold text-amber-300 pt-1.5 border-t border-slate-800">
                        <span>ACTIVE</span>
                        <Zap className="w-3 h-3 text-amber-400" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Preset Details Bar & Execute Action */}
          <div className="mt-3.5 p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white">{selectedPresetDef.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Target: {selectedPresetDef.targetLufs} LUFS
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Ceiling: {selectedPresetDef.limiter.ceilingDb} dBFS</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                {selectedPresetDef.description}
              </p>
            </div>

            <button
              id="btn-run-auto-mix"
              onClick={handleExecuteAutoMix}
              disabled={isAutoMixing}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs tracking-wider uppercase shadow-xl transition-all cursor-pointer ${
                isAutoMixing
                  ? 'bg-slate-800 text-slate-400 border border-slate-700 animate-pulse'
                  : 'bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:from-amber-300 hover:via-rose-400 hover:to-purple-500 text-slate-950 font-black shadow-rose-500/30 ring-2 ring-amber-300/60'
              }`}
            >
              {isAutoMixing ? (
                <>
                  <Disc className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Mastering Offline...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Run AI Auto-Mix Master</span>
                </>
              )}
            </button>
          </div>

          {/* Progress readout during processing */}
          {isAutoMixing && autoMixProgress && (
            <div className="mt-2 p-2.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-xs font-mono text-amber-300 flex items-center gap-2 animate-pulse">
              <Activity className="w-4 h-4 text-amber-400 animate-spin" />
              <span>{autoMixProgress}</span>
            </div>
          )}

          {/* ================================================================= */}
          {/* AUTO-MIX ANALYSIS & DIAGNOSIS READOUT PANEL                       */}
          {/* ================================================================= */}
          {autoMixResult && !isAutoMixing && (
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-amber-500/40 shadow-inner">
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    Mastering Diagnosis & Analysis Results
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Industry Loudness Reached
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Live playback preview toggle */}
                  <button
                    onClick={handleTogglePreview}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                      isPlayingPreview
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {isPlayingPreview ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Stop Audition</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Audition Master</span>
                      </>
                    )}
                  </button>

                  {/* Apply settings to live DAW engine */}
                  <button
                    id="btn-apply-auto-mix-live"
                    onClick={handleApplyToLive}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                      appliedToLive
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md'
                    }`}
                    title="Snaps live mastering and Pro Vocal AI enhancer parameters to match this profile"
                  >
                    {appliedToLive ? <Check className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                    <span>{appliedToLive ? 'Applied to Live!' : 'Apply to Live Engine'}</span>
                  </button>

                  {/* Download Mastered WAV */}
                  <button
                    id="btn-download-auto-mastered"
                    onClick={handleDownloadAutoMasteredWav}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold font-mono bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black shadow-md cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Master WAV</span>
                  </button>
                </div>
              </div>

              {/* Numerical Comparison Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {/* Integrated LUFS Boost */}
                <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Integrated Loudness</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-black font-mono text-white">
                      {autoMixResult.outputAnalysis.lufs} <span className="text-xs font-normal">LUFS</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      +{autoMixResult.lufsBoostDb} dB
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    Pre: {autoMixResult.inputAnalysis.lufs} LUFS
                  </span>
                </div>

                {/* RMS Level */}
                <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Continuous RMS</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-black font-mono text-white">
                      {autoMixResult.outputAnalysis.rmsDb} <span className="text-xs font-normal">dBFS</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      +{autoMixResult.rmsBoostDb} dB
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    Pre: {autoMixResult.inputAnalysis.rmsDb} dBFS
                  </span>
                </div>

                {/* Peak / Ceiling */}
                <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Brickwall Ceiling</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-black font-mono text-rose-400">
                      {autoMixResult.outputAnalysis.peakDb} <span className="text-xs font-normal">dBFS</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-400">0 Overages</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    Pre: {autoMixResult.inputAnalysis.peakDb} dBFS
                  </span>
                </div>

                {/* Crest Factor */}
                <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">Crest Factor (Punch)</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-black font-mono text-cyan-400">
                      {autoMixResult.outputAnalysis.crestFactorDb} <span className="text-xs font-normal">dB</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Dense Impact</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                    Pre: {autoMixResult.inputAnalysis.crestFactorDb} dB
                  </span>
                </div>
              </div>

              {/* Spectral Balance Frequency Energy Bars */}
              <div className="mt-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
                  Analyzed Spectral Balance & Dynamic 808-Vocal Distribution:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="flex justify-between text-[10px] font-mono mb-1">
                      <span className="text-amber-400 font-bold">Sub-Bass 808:</span>
                      <span className="text-white">{autoMixResult.outputAnalysis.frequencyBalance.subBassEnergy}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all"
                        style={{ width: `${autoMixResult.outputAnalysis.frequencyBalance.subBassEnergy}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-mono mb-1">
                      <span className="text-slate-300 font-bold">Low-Mid Body:</span>
                      <span className="text-white">{autoMixResult.outputAnalysis.frequencyBalance.lowMidEnergy}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full transition-all"
                        style={{ width: `${autoMixResult.outputAnalysis.frequencyBalance.lowMidEnergy}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-mono mb-1">
                      <span className="text-pink-400 font-bold">Vocal Presence:</span>
                      <span className="text-white">{autoMixResult.outputAnalysis.frequencyBalance.vocalPresenceEnergy}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-pink-400 rounded-full transition-all"
                        style={{ width: `${autoMixResult.outputAnalysis.frequencyBalance.vocalPresenceEnergy}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-mono mb-1">
                      <span className="text-cyan-400 font-bold">Air Sheen (12kHz):</span>
                      <span className="text-white">{autoMixResult.outputAnalysis.frequencyBalance.airBrightnessEnergy}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 rounded-full transition-all"
                        style={{ width: `${autoMixResult.outputAnalysis.frequencyBalance.airBrightnessEnergy}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Textual Diagnosis */}
              <div className="mt-3 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-300 leading-relaxed">
                <span className="text-amber-400 font-bold">DSP Mastering Report: </span>
                {autoMixResult.diagnosis}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Telemetry Meters (Left 4 cols) + Mastering Controls (Right 8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
        {/* Real-time Loudness & Metering Rack (Col 1-4) */}
        <div className="lg:col-span-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-pink-400" />
              Loudness & Dynamics
            </span>
            <span className="text-[10px] font-mono text-slate-400">EBU R128 Compliant</span>
          </div>

          {/* Integrated LUFS & Peak Readout */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Integrated LUFS</span>
              <span className="text-xl font-black font-mono text-pink-400">
                {metrics.lufs} <span className="text-xs font-normal">LUFS</span>
              </span>
            </div>

            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">True-Peak</span>
              <span className="text-xl font-black font-mono text-slate-100">
                {metrics.peakDb} <span className="text-xs font-normal">dBFS</span>
              </span>
            </div>
          </div>

          {/* Output RMS Meter Bar */}
          <div>
            <div className="flex justify-between text-[11px] font-mono mb-1">
              <span className="text-slate-400">Master Level RMS:</span>
              <span className="text-white font-bold">{metrics.outputRmsDb} dB</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-800 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-rose-500 rounded-full transition-all duration-75"
                style={{ width: `${Math.max(0, Math.min(100, (metrics.outputRmsDb + 60) * 1.66))}%` }}
              />
            </div>
          </div>

          {/* Compressor Gain Reduction Bar */}
          <div>
            <div className="flex justify-between text-[11px] font-mono mb-1">
              <span className="text-slate-400">Glue Gain Reduction:</span>
              <span className="text-pink-400 font-bold">-{metrics.gainReductionDb} dB</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
              <div
                className="h-full bg-pink-500 rounded-full transition-all duration-75"
                style={{ width: `${Math.min(100, (metrics.gainReductionDb / 18) * 100)}%` }}
              />
            </div>
          </div>

          {/* DSP Engine Telemetry */}
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
            <div>Sample Rate: <span className="text-white">48,000 Hz</span></div>
            <div>Processing: <span className="text-pink-300">32-Bit Float</span></div>
            <div>Buffer Latency: <span className="text-emerald-400">{metrics.latencyMs} ms</span></div>
            <div>DSP Load: <span className="text-white">{metrics.dspLoadPercent}%</span></div>
          </div>
        </div>

        {/* Mastering DSP Parameter Controls (Col 5-12) */}
        <div className="lg:col-span-8 space-y-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-slate-200 block pb-2 border-b border-slate-800">
            Master Equalization, Glue Compression & Stereo Width
          </span>

          {/* 4-Band Mastering EQ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Low Cut */}
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Sub Cut:</span>
                <span className="font-mono text-pink-400 font-bold">{settings.lowCut} Hz</span>
              </div>
              <input
                type="range"
                min="20"
                max="60"
                value={settings.lowCut}
                onChange={e => onChange({ ...settings, lowCut: Number(e.target.value) })}
                className="w-full accent-pink-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Bass Gain */}
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Bass Shelf:</span>
                <span className="font-mono text-pink-400 font-bold">{settings.bassGain > 0 ? `+${settings.bassGain}` : settings.bassGain} dB</span>
              </div>
              <input
                type="range"
                min="-6"
                max="6"
                step="0.5"
                value={settings.bassGain}
                onChange={e => onChange({ ...settings, bassGain: Number(e.target.value) })}
                className="w-full accent-pink-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Mid Gain */}
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Mid Presence:</span>
                <span className="font-mono text-pink-400 font-bold">{settings.midGain > 0 ? `+${settings.midGain}` : settings.midGain} dB</span>
              </div>
              <input
                type="range"
                min="-6"
                max="6"
                step="0.5"
                value={settings.midGain}
                onChange={e => onChange({ ...settings, midGain: Number(e.target.value) })}
                className="w-full accent-pink-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* High Air Gain */}
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">12kHz Air:</span>
                <span className="font-mono text-pink-400 font-bold">+{settings.highAirGain} dB</span>
              </div>
              <input
                type="range"
                min="-4"
                max="6"
                step="0.5"
                value={settings.highAirGain}
                onChange={e => onChange({ ...settings, highAirGain: Number(e.target.value) })}
                className="w-full accent-pink-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
              />
            </div>
          </div>

          {/* Dynamics & Imager Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {/* VCA Glue Compressor Threshold */}
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Glue Threshold:</span>
                <span className="font-mono text-pink-400 font-bold">{settings.compThreshold} dB</span>
              </div>
              <input
                type="range"
                min="-30"
                max="-6"
                value={settings.compThreshold}
                onChange={e => onChange({ ...settings, compThreshold: Number(e.target.value) })}
                className="w-full accent-pink-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Tape Saturation & Warmth */}
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Tape Warmth Drive:</span>
                <span className="font-mono text-pink-400 font-bold">{settings.tapeDrive}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.tapeDrive}
                onChange={e => onChange({ ...settings, tapeDrive: Number(e.target.value) })}
                className="w-full accent-pink-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Stereo Width Imager */}
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Stereo Imager Width:</span>
                <span className="font-mono text-pink-400 font-bold">{settings.stereoWidth}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="180"
                value={settings.stereoWidth}
                onChange={e => onChange({ ...settings, stereoWidth: Number(e.target.value) })}
                className="w-full accent-pink-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

