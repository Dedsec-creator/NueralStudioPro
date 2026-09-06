import React, { useState } from 'react';
import { AutoAlignSettings, DenoiseSettings, PocketRideStyle, SynergyPocketSettings } from '../types';
import { audioEngine } from '../audio/audioEngine';
import {
  VolumeX,
  GitCompare,
  Sparkles,
  RotateCw,
  CheckCircle2,
  Sliders,
  Zap,
  Activity,
  Music,
  Compass,
  Repeat,
} from 'lucide-react';

interface DenoiseAndAlignProps {
  denoiseSettings: DenoiseSettings;
  onDenoiseChange: (updated: DenoiseSettings) => void;
  alignSettings: AutoAlignSettings;
  onAlignChange: (updated: AutoAlignSettings) => void;
  activeNoiseReductionDb: number;
  synergySettings?: SynergyPocketSettings;
  onSynergyChange?: (updated: Partial<SynergyPocketSettings>) => void;
}

export const DenoiseAndAlign: React.FC<DenoiseAndAlignProps> = ({
  denoiseSettings,
  onDenoiseChange,
  alignSettings,
  onAlignChange,
  activeNoiseReductionDb,
  synergySettings = audioEngine.synergySettings,
  onSynergyChange,
}) => {
  const [isLearning, setIsLearning] = useState(false);
  const [isAligning, setIsAligning] = useState(false);
  const [synergyStatusMessage, setSynergyStatusMessage] = useState<string | null>(null);

  const handleLearnNoise = async () => {
    setIsLearning(true);
    try {
      const learnedThresh = await audioEngine.learnNoiseFloor();
      onDenoiseChange({
        ...denoiseSettings,
        threshold: learnedThresh,
        noiseFloorLearned: true,
        isLearning: false,
      });
    } catch (e) {
      console.error('Failed to learn noise floor:', e);
    } finally {
      setIsLearning(false);
    }
  };

  const handleRunSynergyAlign = () => {
    setIsAligning(true);
    try {
      const res = audioEngine.autoAlignStems(synergySettings.rideStyle);
      if (res) {
        setSynergyStatusMessage(
          `Locked to ${synergySettings.rideStyle.replace('_', ' ').toUpperCase()} pocket with ${res.confidence}% match confidence (${res.offsetMs > 0 ? `+${res.offsetMs}` : res.offsetMs}ms shift)`
        );
      } else {
        setSynergyStatusMessage('Aligned to transient groove pocket.');
      }
    } catch (e) {
      console.error('Synergy alignment error:', e);
    } finally {
      setIsAligning(false);
      setTimeout(() => setSynergyStatusMessage(null), 4000);
    }
  };

  const handleRideStyle = (style: PocketRideStyle) => {
    audioEngine.updateSynergySettings({ rideStyle: style });
    onSynergyChange?.({ rideStyle: style });
    audioEngine.autoAlignStems(style);
  };

  const handleSynergyParam = (patch: Partial<SynergyPocketSettings>) => {
    audioEngine.updateSynergySettings(patch);
    onSynergyChange?.(patch);
  };

  return (
    <div className="space-y-5">
      {/* 1. VOCAL-BEAT SYNERGY & GROOVE ALIGNMENT ENGINE */}
      <div className="rounded-2xl bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-slate-800 p-5 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-amber-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-sm">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Vocal-Beat Synergy &amp; Groove Alignment
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {synergySettings.detectedBeatBpm} BPM DETECTED
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Cross-Correlation Transient Alignment &bull; Pocket Carving &bull; Sidechain Ducking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-toggle-synergy"
              onClick={() => handleSynergyParam({ enabled: !synergySettings.enabled })}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                synergySettings.enabled
                  ? 'bg-gradient-to-r from-cyan-500 to-amber-500 text-slate-950 shadow-md shadow-cyan-500/25 ring-2 ring-cyan-400/40'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {synergySettings.enabled ? 'ACTIVE SYNERGY' : 'BYPASS'}
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {synergyStatusMessage && (
          <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-xs text-cyan-200 font-mono">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{synergyStatusMessage}</span>
          </div>
        )}

        {/* Synergy Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
          {/* Left Column: Groove Ride Style & Time Shift */}
          <div className="space-y-4">
            {/* Ride Style Selection */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-medium">Vocal Ride Pocket:</span>
                <span className="font-mono text-cyan-400 font-bold text-[11px]">
                  {synergySettings.rideStyle.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      id: 'pocket_lock',
                      name: 'Pocket Lock',
                      desc: '0ms on-grid snap',
                      color: 'border-cyan-500/40 bg-cyan-950/30 text-cyan-300',
                    },
                    {
                      id: 'laid_back',
                      name: 'Laid-Back',
                      desc: '+22ms behind beat (Trap)',
                      color: 'border-amber-500/40 bg-amber-950/30 text-amber-300',
                    },
                    {
                      id: 'ahead_drive',
                      name: 'Driving Pop',
                      desc: '-18ms ahead of beat',
                      color: 'border-violet-500/40 bg-violet-950/30 text-violet-300',
                    },
                    {
                      id: 'vocal_lead',
                      name: 'Vocal Lead',
                      desc: '-35ms lead into drop',
                      color: 'border-rose-500/40 bg-rose-950/30 text-rose-300',
                    },
                  ] as { id: PocketRideStyle; name: string; desc: string; color: string }[]
                ).map(style => (
                  <button
                    key={style.id}
                    onClick={() => handleRideStyle(style.id)}
                    className={`p-2 rounded-xl text-left border transition cursor-pointer ${
                      synergySettings.rideStyle === style.id
                        ? `${style.color} ring-2 ring-cyan-400/40`
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{style.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{style.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Micro-alignment offset slider */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Transient Alignment Offset:</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {synergySettings.alignOffsetMs > 0
                    ? `+${synergySettings.alignOffsetMs} ms`
                    : `${synergySettings.alignOffsetMs} ms`}
                </span>
              </div>
              <input
                type="range"
                min="-120"
                max="120"
                step="1"
                value={synergySettings.alignOffsetMs}
                onChange={e => handleSynergyParam({ alignOffsetMs: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>-120 ms (Push Ahead)</span>
                <button
                  onClick={() => handleSynergyParam({ alignOffsetMs: 0 })}
                  className="text-cyan-400 hover:underline cursor-pointer"
                >
                  Center (0ms)
                </button>
                <span>+120 ms (Pull Back)</span>
              </div>
            </div>

            {/* Transient Detection Sensitivity */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Transient Detection Sensitivity:</span>
                <span className="font-mono text-amber-400 font-bold">{synergySettings.transientSensitivity}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={synergySettings.transientSensitivity}
                onChange={e => handleSynergyParam({ transientSensitivity: Number(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>
          </div>

          {/* Right Column: Dynamic Carving & Sidechain Ducking */}
          <div className="space-y-4">
            {/* Dynamic Beat Carving Depth */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Dynamic Vocal Pocket Carve:</span>
                <span className="font-mono text-emerald-400 font-bold">-{synergySettings.carveDepthDb} dB @ 2.5kHz</span>
              </div>
              <input
                type="range"
                min="0"
                max="9"
                step="0.5"
                value={synergySettings.carveDepthDb}
                onChange={e => handleSynergyParam({ carveDepthDb: Number(e.target.value) })}
                className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Dynamically notches 2.5kHz in the beat when vocals sing, preventing frequency masking and mud.
              </p>
            </div>

            {/* Sidechain Ducking */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Beat Sidechain Ducking:</span>
                <span className="font-mono text-indigo-400 font-bold">{synergySettings.sidechainDucking}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={synergySettings.sidechainDucking}
                onChange={e => handleSynergyParam({ sidechainDucking: Number(e.target.value) })}
                className="w-full accent-indigo-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Subtly attenuates the instrumental stem during vocal phrases for instant modern radio clarity.
              </p>
            </div>

            {/* Analysis Metrics Cards */}
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Confidence</span>
                <span className="text-sm font-bold text-emerald-400">{synergySettings.alignmentConfidence}%</span>
                <span className="text-[9px] text-slate-400 block">Transient Lock</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Detected BPM</span>
                <span className="text-sm font-bold text-cyan-400">{synergySettings.detectedBeatBpm} BPM</span>
                <span className="text-[9px] text-slate-400 block">Grid Synchronized</span>
              </div>
            </div>

            {/* AI Pocket Attunement Controls */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-950/40 via-slate-950 to-indigo-950/40 border border-cyan-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  AI Pocket Attunement Engine
                </span>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                  {synergySettings.pocketAttunement ?? 85}% TIGHTNESS
                </span>
              </div>

              {/* Attunement Slider */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Pocket Attunement Depth:</span>
                  <span className="text-cyan-400 font-mono font-bold">{synergySettings.pocketAttunement ?? 85}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="1"
                  value={synergySettings.pocketAttunement ?? 85}
                  onChange={e => handleSynergyParam({ pocketAttunement: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-0.5">
                  <span>Natural Float (20%)</span>
                  <span>Strict Pocket (100%)</span>
                </div>
              </div>

              {/* Groove Swing & Triplet Bounce */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Groove Swing &amp; Bounce:</span>
                  <span className="text-amber-400 font-mono font-bold">
                    {(synergySettings.grooveSwing ?? 0) > 0 ? `+${synergySettings.grooveSwing}% (Bounce)` : `${synergySettings.grooveSwing ?? 0}% (Straight)`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="50"
                  step="1"
                  value={synergySettings.grooveSwing ?? 0}
                  onChange={e => handleSynergyParam({ grooveSwing: Number(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-0.5">
                  <span>Push Hard (-30%)</span>
                  <button
                    onClick={() => handleSynergyParam({ grooveSwing: 0 })}
                    className="text-amber-400 hover:underline cursor-pointer"
                  >
                    Straight (0%)
                  </button>
                  <span>Triplet Swing (+50%)</span>
                </div>
              </div>

              {/* AI Attunement Diagnostic Report */}
              {synergySettings.aiAttuneReport && (
                <div className="pt-2 border-t border-slate-800/80 text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>AI Groove Score:</span>
                    <span className="font-bold font-mono text-emerald-400">
                      {synergySettings.aiAttuneReport.grooveScore}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Phase Micro Alignment:</span>
                    <span className="font-mono text-cyan-300">
                      {synergySettings.aiAttuneReport.phaseAlignmentDegrees > 0 ? `+` : ''}
                      {synergySettings.aiAttuneReport.phaseAlignmentDegrees}&deg;
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/60 text-[10px] text-slate-400 font-mono">
                    <div className="text-cyan-300 font-bold mb-0.5">{synergySettings.aiAttuneReport.rhythmPattern}</div>
                    <div>{synergySettings.aiAttuneReport.recommendation}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Re-Analyze Action Button */}
            <button
              id="btn-reanalyze-synergy"
              onClick={handleRunSynergyAlign}
              disabled={isAligning}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500/20 via-slate-800 to-amber-500/20 hover:from-cyan-500/30 hover:to-amber-500/30 text-white text-xs font-bold border border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-98"
            >
              {isAligning ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>AI Attuning Vocals to Pocket...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>AI Auto-Attune Vocals to Beat Pocket</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. NOISE ISOLATION & PHASE COHERENCE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Background Noise Removal & Auto-Gate Module */}
        <div className="rounded-2xl bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-slate-800 p-5 shadow-2xl backdrop-blur-md flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <VolumeX className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      Auto Noise Gate &amp; De-Harsh
                    </h3>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold border transition-colors ${
                        audioEngine.getIsGateOpen()
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {audioEngine.getIsGateOpen() ? 'GATE OPEN' : 'GATE CLAMPED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">Dynamic Noise Floor Auto-Sense &bull; Sibilance Clamp</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-toggle-autogate-mode"
                  onClick={() =>
                    onDenoiseChange({ ...denoiseSettings, autoGateMode: !denoiseSettings.autoGateMode })
                  }
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                    denoiseSettings.autoGateMode
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-300'
                  }`}
                  title="Automatically adjusts threshold based on continuous ambient acoustic room sensing"
                >
                  {denoiseSettings.autoGateMode ? 'AUTO-SENSE ON' : 'MANUAL THRESH'}
                </button>

                <button
                  id="btn-toggle-denoise"
                  onClick={() => onDenoiseChange({ ...denoiseSettings, enabled: !denoiseSettings.enabled })}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    denoiseSettings.enabled
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/40'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {denoiseSettings.enabled ? 'ACTIVE' : 'BYPASS'}
                </button>
              </div>
            </div>

            {/* Denoise & Auto-Gate Controls */}
            <div className="space-y-3.5 mt-4">
              {/* Threshold */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">
                    {denoiseSettings.autoGateMode ? 'Auto-Calibrated Threshold:' : 'Gate Threshold:'}
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {denoiseSettings.autoGateMode
                      ? `${audioEngine.getAutoGateThresholdDb()} dB (Auto)`
                      : `${denoiseSettings.threshold} dB`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-70"
                  max="-20"
                  value={denoiseSettings.threshold}
                  disabled={denoiseSettings.autoGateMode}
                  onChange={e => onDenoiseChange({ ...denoiseSettings, threshold: Number(e.target.value) })}
                  className={`w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg ${
                    denoiseSettings.autoGateMode ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                />
              </div>

              {/* Harsh Sound & Resonance Suppression */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    Harsh Frequency Suppression (3.4kHz):
                    {audioEngine.getHarshReductionDb() > 0 && (
                      <span className="text-[10px] font-mono text-rose-400 font-bold animate-pulse">
                        -{audioEngine.getHarshReductionDb()} dB
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {denoiseSettings.harshSuppression ?? 50}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={denoiseSettings.harshSuppression ?? 50}
                  onChange={e =>
                    onDenoiseChange({ ...denoiseSettings, harshSuppression: Number(e.target.value) })
                  }
                  className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Suppresses piercing vocal sibilance, mic diaphragm harshness, and harsh room reflections.
                </p>
              </div>

              {/* Reduction Depth & Gate Timing Envelope */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Max Clamp:</span>
                    <span className="font-mono text-emerald-400 font-bold">-{denoiseSettings.reduction} dB</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="36"
                    value={denoiseSettings.reduction}
                    onChange={e => onDenoiseChange({ ...denoiseSettings, reduction: Number(e.target.value) })}
                    className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Gate Release:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {denoiseSettings.gateReleaseMs ?? 120} ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="350"
                    step="10"
                    value={denoiseSettings.gateReleaseMs ?? 120}
                    onChange={e =>
                      onDenoiseChange({ ...denoiseSettings, gateReleaseMs: Number(e.target.value) })
                    }
                    className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>
              </div>

              {/* Filter Toggles: Low Rumble Cut & High Fizz Cut */}
              <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2">
                <button
                  id="btn-toggle-rumble-cut"
                  onClick={() =>
                    onDenoiseChange({
                      ...denoiseSettings,
                      lowRumbleCut: !(denoiseSettings.lowRumbleCut ?? true),
                    })
                  }
                  className={`py-1.5 px-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                    denoiseSettings.lowRumbleCut ?? true
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300'
                  }`}
                >
                  <span>80Hz Low Rumble Cut</span>
                  <span className="text-[9px] font-mono font-bold">
                    {(denoiseSettings.lowRumbleCut ?? true) ? 'ON' : 'OFF'}
                  </span>
                </button>

                <div className="flex items-center gap-2 bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-800 text-[11px]">
                  <span className="text-slate-400 whitespace-nowrap">Fizz Cut:</span>
                  <input
                    type="range"
                    min="12000"
                    max="20000"
                    step="500"
                    value={denoiseSettings.highCutHz ?? 18000}
                    onChange={e =>
                      onDenoiseChange({ ...denoiseSettings, highCutHz: Number(e.target.value) })
                    }
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded"
                  />
                  <span className="text-[10px] font-mono text-cyan-400 font-bold whitespace-nowrap">
                    {Math.round((denoiseSettings.highCutHz ?? 18000) / 1000)}k
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Learn Noise Profile Action & Live Attenuation Meter */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              id="btn-learn-noise"
              onClick={handleLearnNoise}
              disabled={isLearning}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isLearning
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                  : denoiseSettings.noiseFloorLearned
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30'
              }`}
              title="Samples ambient silence to calibrate the auto-gate threshold"
            >
              {isLearning ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Calibrating Room Noise Floor...</span>
                </>
              ) : denoiseSettings.noiseFloorLearned ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Noise Calibrated (Re-sample)</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Auto-Calibrate Room Floor</span>
                </>
              )}
            </button>

            {/* Attenuation Meter */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 text-xs font-mono">
              <span className="text-[10px] text-slate-400 uppercase">Red:</span>
              <span className={`font-bold ${activeNoiseReductionDb > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                -{activeNoiseReductionDb} dB
              </span>
            </div>
          </div>
        </div>

        {/* Auto-Align Phase & Micro-Delay Module */}
        <div className="rounded-2xl bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-slate-800 p-5 shadow-2xl backdrop-blur-md flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <GitCompare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                    Phase Polarity &amp; Fine Delay
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">Sub-Millisecond Comb-Filter Fix</p>
                </div>
              </div>

              <button
                id="btn-toggle-align"
                onClick={() => onAlignChange({ ...alignSettings, enabled: !alignSettings.enabled })}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  alignSettings.enabled
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-400/40'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {alignSettings.enabled ? 'ACTIVE' : 'BYPASS'}
              </button>
            </div>

            {/* Micro-Delay slider */}
            <div className="space-y-4 mt-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Phase Delay:</span>
                  <span className="font-mono text-indigo-400 font-bold">
                    {alignSettings.delayMs > 0
                      ? `+${alignSettings.delayMs.toFixed(1)} ms`
                      : `${alignSettings.delayMs.toFixed(1)} ms`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="0.5"
                  value={alignSettings.delayMs}
                  onChange={e => onAlignChange({ ...alignSettings, delayMs: Number(e.target.value) })}
                  className="w-full accent-indigo-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                  <span>-50 ms Pre</span>
                  <button
                    onClick={() => onAlignChange({ ...alignSettings, delayMs: 0 })}
                    className="text-indigo-400 hover:underline cursor-pointer"
                  >
                    Reset (0ms)
                  </button>
                  <span>+50 ms Post</span>
                </div>
              </div>

              {/* Invert Phase Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div>
                  <span className="text-xs font-semibold text-white block">Phase Polarity (0° / 180°)</span>
                  <span className="text-[11px] text-slate-400">Inverts waveform to eliminate phase cancelation</span>
                </div>
                <button
                  id="btn-invert-phase"
                  onClick={() => onAlignChange({ ...alignSettings, invertPhase: !alignSettings.invertPhase })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    alignSettings.invertPhase
                      ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {alignSettings.invertPhase ? 'Ø 180° INVERTED' : 'Ø 0° NORMAL'}
                </button>
              </div>
            </div>
          </div>

          {/* Phase Correlation Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-slate-400">Phase Correlation:</span>
              <span className="text-emerald-400 font-bold">
                +{alignSettings.correlation.toFixed(2)} (In-Phase Coherent)
              </span>
            </div>
            {/* Visual Correlation Bar -1 to +1 */}
            <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 relative overflow-hidden flex items-center">
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-600 z-10" />
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-r-full transition-all duration-100"
                style={{
                  marginLeft: '50%',
                  width: `${Math.max(0, alignSettings.correlation) * 50}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1">
              <span>-1 (Out of Phase)</span>
              <span>0</span>
              <span>+1 (Perfect Phase)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
