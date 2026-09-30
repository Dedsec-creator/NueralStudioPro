import React, { useState, useEffect } from 'react';
import {
  Zap,
  Cpu,
  Sliders,
  Activity,
  HardDrive,
  RotateCcw,
  Check,
  ShieldCheck,
  RefreshCw,
  Trash2,
  X,
  Leaf,
  Layers,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import {
  PerformanceConfig,
  PerformanceProfileId,
  PerformanceTelemetry,
  CachePurgeResult,
  DatabaseStorageStats,
} from '../types';
import { audioEngine } from '../audio/audioEngine';
import {
  PERFORMANCE_PROFILES,
} from '../audio/performanceOptimizer';
import { getDatabaseStorageStats } from '../audio/assetStorage';

interface PerformanceOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLatencyMs?: number;
}

export const PerformanceOptimizerModal: React.FC<PerformanceOptimizerModalProps> = ({
  isOpen,
  onClose,
  currentLatencyMs,
}) => {
  const [config, setConfig] = useState<PerformanceConfig>(() => audioEngine.performanceConfig);
  const [telemetry, setTelemetry] = useState<PerformanceTelemetry>(() => audioEngine.getPerformanceTelemetry());
  const [storageStats, setStorageStats] = useState<DatabaseStorageStats | null>(null);
  const [purgeFeedback, setPurgeFeedback] = useState<string | null>(null);
  const [prewarmSuccess, setPrewarmSuccess] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'profiles' | 'tuning' | 'memory'>('profiles');

  // Poll live telemetry while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const updateData = () => {
      setTelemetry(audioEngine.getPerformanceTelemetry());
      setConfig({ ...audioEngine.performanceConfig });
    };

    updateData();
    const interval = setInterval(updateData, 450);

    getDatabaseStorageStats().then(setStorageStats).catch(() => {});

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectProfile = (profileId: PerformanceProfileId) => {
    audioEngine.setPerformanceProfile(profileId);
    setConfig({ ...audioEngine.performanceConfig });
    setTelemetry(audioEngine.getPerformanceTelemetry());
    setPurgeFeedback(`Profile changed to ${PERFORMANCE_PROFILES[profileId].name}`);
    setTimeout(() => setPurgeFeedback(null), 3000);
  };

  const handleUpdateConfig = (patch: Partial<PerformanceConfig>) => {
    audioEngine.setPerformanceConfig(patch);
    setConfig({ ...audioEngine.performanceConfig });
    setTelemetry(audioEngine.getPerformanceTelemetry());
  };

  const handlePurgeMemory = () => {
    const res: CachePurgeResult = audioEngine.purgeInactiveAudioBuffers();
    setTelemetry(audioEngine.getPerformanceTelemetry());
    if (res.freedMb > 0 || res.purgedBufferCount > 0) {
      setPurgeFeedback(`Freed ${res.freedMb} MB of audio RAM (${res.purgedBufferCount} inactive stem buffers cleared).`);
    } else {
      setPurgeFeedback('Audio RAM already fully optimized. All remaining buffers are in active use.');
    }
    setTimeout(() => setPurgeFeedback(null), 4000);
  };

  const handlePrewarm = async () => {
    setPrewarmSuccess(false);
    const ok = await audioEngine.prewarmAudioPipeline();
    if (ok) {
      setPrewarmSuccess(true);
      setPurgeFeedback('AudioContext threads & DSP pipeline pre-warmed for zero-jitter playback.');
      setTimeout(() => {
        setPrewarmSuccess(false);
        setPurgeFeedback(null);
      }, 3500);
    }
  };

  const handleResetGlitches = () => {
    audioEngine.resetGlitchCount();
    setTelemetry(audioEngine.getPerformanceTelemetry());
  };

  // Status visual attributes
  const dspPercent = Math.min(100, Math.max(0, telemetry.dspLoadPercent));
  const isHighLoad = dspPercent > 65;
  const isModerateLoad = dspPercent > 35;
  const statusColor = isHighLoad
    ? 'text-rose-400 border-rose-500/40 bg-rose-500/10'
    : isModerateLoad
    ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
    : 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950 font-bold">
              <Zap className="w-5 h-5 text-slate-950 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Performance &amp; Loading Optimizer
                </h2>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${statusColor} uppercase font-semibold`}>
                  {telemetry.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Real-time Web Audio DSP load tuning, audio RAM compactor &amp; progressive stem loader
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Close optimizer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live System Telemetry HUD Bar */}
        <div className="px-4 py-3.5 bg-slate-950/90 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs font-mono">
          {/* DSP Load Gauge */}
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                DSP Load
              </span>
              <span className={`font-bold ${isHighLoad ? 'text-rose-400' : isModerateLoad ? 'text-amber-400' : 'text-cyan-400'}`}>
                {dspPercent.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  isHighLoad
                    ? 'bg-rose-500'
                    : isModerateLoad
                    ? 'bg-amber-400'
                    : 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                }`}
                style={{ width: `${Math.min(100, dspPercent)}%` }}
              />
            </div>
          </div>

          {/* Latency */}
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                Audio Latency
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base sm:text-lg font-bold text-emerald-300">
                {currentLatencyMs ?? telemetry.latencyMs} <span className="text-xs font-normal text-slate-400">ms</span>
              </span>
              <span className="text-[10px] text-slate-500">{config.bufferSize} smp</span>
            </div>
          </div>

          {/* Audio RAM Footprint */}
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-violet-400" />
                Audio RAM
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base sm:text-lg font-bold text-violet-300">
                {telemetry.audioRamUsageMb} <span className="text-xs font-normal text-slate-400">MB</span>
              </span>
              <span className="text-[10px] text-slate-500">{telemetry.activeBuffersCount + telemetry.cachedBuffersCount} stems</span>
            </div>
          </div>

          {/* Frame Rate & Underruns */}
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Visual FPS
              </span>
              <span className="font-bold text-amber-300">{telemetry.fps}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Glitches:</span>
              <span className={telemetry.glitchCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                {telemetry.glitchCount === 0 ? 'None (Clean)' : `${telemetry.glitchCount} caught`}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 px-4 sm:px-5 bg-slate-900/60 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('profiles')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'profiles'
                ? 'border-cyan-400 text-cyan-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Engine Profiles</span>
          </button>

          <button
            onClick={() => setActiveTab('tuning')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'tuning'
                ? 'border-cyan-400 text-cyan-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Buffer &amp; DSP Tuning</span>
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'memory'
                ? 'border-cyan-400 text-cyan-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Stem Cache &amp; RAM</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Feedback Banner */}
          {purgeFeedback && (
            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs flex items-center gap-2 animate-fade-in shadow-md">
              <Check className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{purgeFeedback}</span>
            </div>
          )}

          {/* TAB 1: ENGINE PROFILES */}
          {activeTab === 'profiles' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Choose an optimized performance preset tailored to your current workflow:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(PERFORMANCE_PROFILES) as PerformanceProfileId[]).map((pid) => {
                  const p = PERFORMANCE_PROFILES[pid];
                  const isSelected = config.profile === pid;

                  return (
                    <div
                      key={pid}
                      onClick={() => handleSelectProfile(pid)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-slate-800/90 border-cyan-500/70 shadow-lg shadow-cyan-500/10'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            {pid === 'turbo_low_latency' && <Zap className="w-4 h-4 text-cyan-400" />}
                            {pid === 'balanced_studio' && <Sliders className="w-4 h-4 text-emerald-400" />}
                            {pid === 'eco_saver' && <Leaf className="w-4 h-4 text-amber-400" />}
                            {pid === 'glitch_proof' && <ShieldCheck className="w-4 h-4 text-violet-400" />}
                            {p.name}
                          </h3>
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md border ${p.badgeColor} font-semibold`}>
                            {p.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {p.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-500">Latency: <strong className="text-slate-300">{p.estimatedLatencyMs}</strong></span>
                        <div className="flex items-center gap-1.5">
                          {isSelected ? (
                            <span className="flex items-center gap-1 text-cyan-400 font-bold">
                              <Check className="w-3.5 h-3.5" />
                              Active
                            </span>
                          ) : (
                            <span className="text-slate-500 hover:text-slate-300">Click to activate</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Actions Card */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Pre-Warm Audio Graph</h4>
                    <p className="text-[11px] text-slate-400">
                      Prime AudioContext threads to eliminate first-playback latency or clicks.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handlePrewarm}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${prewarmSuccess ? 'animate-spin' : ''}`} />
                  <span>Pre-Warm Engine</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: BUFFER & DSP TUNING */}
          {activeTab === 'tuning' && (
            <div className="space-y-4">
              {/* Buffer Size */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-white flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      Audio Buffer Size (Frames)
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Smaller buffers lower monitoring latency; larger buffers prevent audio stutter under heavy DSP load.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-cyan-400 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
                    {config.bufferSize} samples (~{(config.bufferSize / (telemetry.sampleRate || 48000) * 1000).toFixed(1)}ms)
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {([128, 256, 512, 1024] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => handleUpdateConfig({ bufferSize: size })}
                      className={`py-2 px-2.5 rounded-lg border text-xs font-mono transition cursor-pointer flex flex-col items-center gap-0.5 ${
                        config.bufferSize === size
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <span className="font-bold">{size}</span>
                      <span className="text-[9px] opacity-75">
                        {size === 128 ? 'Zero-Buffer' : size === 256 ? 'Low' : size === 512 ? 'Standard' : 'Safe'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Visualizer FPS Rate */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-amber-400" />
                      Visualizer &amp; Spectrum Refresh Rate
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Throttling visualizers cuts canvas rendering GPU/CPU drain by 50% without affecting audio quality.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
                    {config.visualizerFps} FPS
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  {([60, 30, 15] as const).map((fps) => (
                    <button
                      key={fps}
                      onClick={() => handleUpdateConfig({ visualizerFps: fps })}
                      className={`py-2 px-2.5 rounded-lg border text-xs font-mono transition cursor-pointer flex flex-col items-center gap-0.5 ${
                        config.visualizerFps === fps
                          ? 'bg-amber-500/20 border-amber-500 text-amber-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <span className="font-bold">{fps} FPS</span>
                      <span className="text-[9px] opacity-75">
                        {fps === 60 ? 'Silky Smooth' : fps === 30 ? 'Eco (Saved Battery)' : 'Minimalist'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Smart Toggles */}
              <div className="space-y-2">
                {/* Smart DSP Sleep */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <div className="pr-3">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-emerald-400" />
                      Smart DSP Auto-Sleep
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                      Powers down idle plugins, analyzers, and filters when track is paused or quiet, saving CPU cycles.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.smartDspSleep}
                      onChange={(e) => handleUpdateConfig({ smartDspSleep: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* Auto Glitch Mitigation */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <div className="pr-3">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-violet-400" />
                      Auto-Glitch &amp; Dropout Mitigation
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                      Monitors Web Audio clock stalls; automatically adjusts buffer headroom if dropouts are detected.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.autoGlitchMitigation}
                      onChange={(e) => handleUpdateConfig({ autoGlitchMitigation: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-500"></div>
                  </label>
                </div>

                {/* Progressive Stem Loading */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <div className="pr-3">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      Progressive Strided Waveform Extractor
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                      Sub-samples large audio files in non-blocking slices so importing multi-minute stems never freezes the interface.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.progressiveLoading}
                      onChange={(e) => handleUpdateConfig({ progressiveLoading: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STEM CACHE & MEMORY OPTIMIZER */}
          {activeTab === 'memory' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-cyan-400" />
                      Stem Memory Compactor
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Purge uncompressed Float32 AudioBuffers from RAM. Active vocal and beat stems remain unaffected.
                    </p>
                  </div>
                  <button
                    onClick={handlePurgeMemory}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition cursor-pointer active:scale-95 shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Purge Inactive RAM</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-2 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">ACTIVE STEMS</span>
                    <span className="font-bold text-white text-sm">{telemetry.activeBuffersCount} stems</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">IN-MEMORY CACHE</span>
                    <span className="font-bold text-violet-400 text-sm">{telemetry.cachedBuffersCount} stems</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">ESTIMATED RAM</span>
                    <span className="font-bold text-cyan-400 text-sm">{telemetry.audioRamUsageMb} MB</span>
                  </div>
                </div>
              </div>

              {/* IndexedDB Storage Statistics */}
              {storageStats && (
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      Persistent Storage Database & Auto-Save
                    </h3>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                      60s Auto-Save Active
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">TOTAL ASSETS</span>
                      <span className="font-bold text-white">{storageStats.assetCount} items</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">TAKES RECORDED</span>
                      <span className="font-bold text-cyan-400">{storageStats.recordCount} takes</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">MASTER RENDERS</span>
                      <span className="font-bold text-amber-400">{storageStats.renderCount} renders</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">SNAPSHOTS</span>
                      <span className="font-bold text-purple-400">{storageStats.snapshotCount} saved</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">STORAGE OCCUPIED</span>
                      <span className="font-bold text-emerald-400">
                        {(storageStats.totalBytes / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    NeuralTune Ultra writes full project state, audio stems, and DSP parameter snapshots to browser IndexedDB every 60 seconds. In the event of a browser crash or unexpected tab reload, your exact work is automatically recovered.
                  </p>
                </div>
              )}

              {/* Underrun & Stutter Health */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    {telemetry.glitchCount === 0 ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    )}
                    Audio Clock Integrity Monitor
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {telemetry.glitchCount === 0
                      ? 'Zero audio buffer underruns or timing drops detected. Audio playback is pristine.'
                      : `${telemetry.glitchCount} buffer stalls logged. Buffer size has been dynamically stabilized.`}
                  </p>
                </div>
                {telemetry.glitchCount > 0 && (
                  <button
                    onClick={handleResetGlitches}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Count</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <div className="text-slate-400 flex items-center gap-2 font-mono text-[11px]">
            <span>Profile:</span>
            <strong className="text-white uppercase">{PERFORMANCE_PROFILES[config.profile].name}</strong>
            <span className="text-slate-600">&bull;</span>
            <span>Latency:</span>
            <strong className="text-cyan-400">{currentLatencyMs ?? telemetry.latencyMs}ms</strong>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer active:scale-95"
          >
            Apply &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};
