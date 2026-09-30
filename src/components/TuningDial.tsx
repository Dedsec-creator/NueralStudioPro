import React, { useRef, useState, useEffect } from 'react';
import {
  MusicalKey,
  MusicalScale,
  PitchTrackData,
  TuningSettings,
  TuningMode,
  DoublerMode,
  StutterRate,
} from '../types';
import { NOTE_NAMES, SCALE_INTERVALS } from '../audio/pitchDetector';
import {
  Disc3,
  Zap,
  Sliders,
  Music2,
  Gauge,
  Sparkles,
  Layers,
  Bell,
  Scissors,
  Check,
  Volume2,
  HelpCircle,
  Wand2,
} from 'lucide-react';

interface TuningDialProps {
  settings: TuningSettings;
  onChange: (updated: TuningSettings) => void;
  pitchData: PitchTrackData | null;
  onAutoDetectKey?: () => { key: MusicalKey; scale: MusicalScale; label: string; confidence: number } | null;
}

export const TuningDial: React.FC<TuningDialProps> = ({
  settings,
  onChange,
  pitchData,
  onAutoDetectKey,
}) => {
  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startVal, setStartVal] = useState(0);
  const [detectedFeedback, setDetectedFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'core' | 'doubler' | 'trap_fx'>('core');

  // Compute rotation angle: 0ms is -135 deg, 100ms is +135 deg
  const normalizedSpeed = Math.max(0, Math.min(100, settings.retuneSpeed)) / 100;
  const rotationDeg = -135 + normalizedSpeed * 270;

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setStartVal(settings.retuneSpeed);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      setIsDragging(true);
      setStartY(e.touches[0].clientY);
      setStartVal(settings.retuneSpeed);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaY = startY - e.clientY;
      const change = deltaY * 0.5; // sensitivity
      const nextVal = Math.round(Math.max(0, Math.min(100, startVal - change)));
      onChange({ ...settings, retuneSpeed: nextVal });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length === 0) return;
      const deltaY = startY - e.touches[0].clientY;
      const change = deltaY * 0.5;
      const nextVal = Math.round(Math.max(0, Math.min(100, startVal - change)));
      onChange({ ...settings, retuneSpeed: nextVal });
    };

    const handleEnd = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, startY, startVal, settings, onChange]);

  // Quick preset retune speeds
  const quickSpeeds = [
    { label: '0 ms', val: 0, desc: 'Yeat / T-Pain / Hard Snap' },
    { label: '8 ms', val: 8, desc: 'Playboi Carti / Ken Carson' },
    { label: '20 ms', val: 20, desc: 'Modern Trap / Hip-Hop' },
    { label: '45 ms', val: 45, desc: 'Pop / Contemporary R&B' },
    { label: '80 ms', val: 80, desc: 'Transparent Natural' },
  ];

  // Calculate notes in active scale
  const keyIndex = NOTE_NAMES.indexOf(settings.key);
  const intervals = SCALE_INTERVALS[settings.scale] || SCALE_INTERVALS['Chromatic'];
  const inScaleNotes = new Set(
    intervals.map(semitone => NOTE_NAMES[(keyIndex + semitone) % 12])
  );

  const toggleBypassNote = (note: string) => {
    const current = settings.bypassedNotes || [];
    const updated = current.includes(note)
      ? current.filter(n => n !== note)
      : [...current, note];
    onChange({ ...settings, bypassedNotes: updated });
  };

  const handleRunAutoKey = () => {
    if (!onAutoDetectKey) return;
    const result = onAutoDetectKey();
    if (result) {
      onChange({
        ...settings,
        key: result.key,
        scale: result.scale,
      });
      setDetectedFeedback(`Detected: ${result.label} (${result.confidence}% match)`);
      setTimeout(() => setDetectedFeedback(null), 4000);
    } else {
      setDetectedFeedback('No audio loaded to analyze key');
      setTimeout(() => setDetectedFeedback(null), 3000);
    }
  };

  const tuningModes: { id: TuningMode; label: string; desc: string }[] = [
    { id: 'hard_snap', label: 'Hard Snap', desc: 'Instant 0ms quantum snap (Yeat / T-Pain)' },
    { id: 'modern_trap', label: 'Modern Trap', desc: 'Punchy 3-8ms snap (Carti / Ken Carson)' },
    { id: 'natural_flex', label: 'Natural Flex', desc: 'Expressive nuance with pitch inflection' },
    { id: 'hyper_yeat', label: 'Hyper Yeat', desc: 'Hard snap with metallic bell resonance' },
    { id: 'robotic', label: 'Robotic', desc: 'Rigid fixed-pitch phase vocoder snap' },
  ];

  const doublerModes: { id: DoublerMode; label: string; desc: string }[] = [
    { id: 'stereo_wide', label: 'Stereo Haas', desc: 'Micro-delay wide Haas stereo spread' },
    { id: 'octave_down', label: 'Deep Voice', desc: 'Yeat / Carti dark pitch down octave sub' },
    { id: 'octave_up', label: 'Baby Voice', desc: 'Carti / Pierre high pitched formant octave' },
    { id: 'fifth_harmony', label: '5th Harmony', desc: 'Travis Scott / Weeknd perfect 5th spread' },
    { id: 'detuned_thick', label: 'Thick Chorus', desc: 'Analog BBD multi-voice chorus' },
  ];

  const stutterRates: StutterRate[] = ['1/4', '1/8', '1/16', '1/32', 'triplet'];

  return (
    <div className="rounded-2xl bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-cyan-500/20 shadow-2xl p-4 sm:p-5 relative overflow-hidden backdrop-blur-md">
      {/* Background Accent glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-cyan-500/10 blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
            <Disc3 className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide text-white uppercase flex items-center gap-2">
              Neural Pitch Quantum
              {settings.retuneSpeed === 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-cyan-400 text-slate-950 animate-pulse">
                  Hard Snap 0ms
                </span>
              )}
              {settings.tuningMode === 'hyper_yeat' && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950">
                  YEAT MODE
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">Antares Phase Correction &bull; Yeat Bell &bull; Vocal Doubler</p>
          </div>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('core')}
            className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'core'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3 h-3 text-cyan-400" />
            <span>Tuning Core</span>
          </button>
          <button
            onClick={() => setActiveTab('doubler')}
            className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'doubler'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3 text-blue-400" />
            <span>Doubler &amp; Harmonies</span>
            {settings.doublerEnabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('trap_fx')}
            className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'trap_fx'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bell className="w-3 h-3 text-purple-400" />
            <span>Yeat FX / Chopper</span>
            {(settings.bellResonatorEnabled || settings.stutterEnabled) && (
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Master bypass toggle */}
        <button
          id="btn-toggle-tuning"
          onClick={() => onChange({ ...settings, enabled: !settings.enabled })}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            settings.enabled
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25 ring-2 ring-cyan-400/40'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Zap className="w-3 h-3" />
          <span>{settings.enabled ? 'ACTIVE' : 'BYPASS'}</span>
        </button>
      </div>

      {/* Mode Switcher Bar */}
      <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-mono text-slate-400 shrink-0 mr-1 flex items-center gap-1">
          <Wand2 className="w-3 h-3 text-cyan-400" /> Mode:
        </span>
        {tuningModes.map(m => {
          const isCurrent = (settings.tuningMode || 'hard_snap') === m.id;
          return (
            <button
              key={m.id}
              onClick={() => {
                let speed = settings.retuneSpeed;
                if (m.id === 'hard_snap' || m.id === 'hyper_yeat' || m.id === 'robotic') speed = 0;
                else if (m.id === 'modern_trap' && speed > 8) speed = 8;
                onChange({
                  ...settings,
                  tuningMode: m.id,
                  retuneSpeed: speed,
                  bellResonatorEnabled: m.id === 'hyper_yeat' ? true : settings.bellResonatorEnabled,
                });
              }}
              title={m.desc}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                isCurrent
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 font-bold shadow-sm'
                  : 'bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {isCurrent && <Check className="w-2.5 h-2.5 text-cyan-400" />}
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'core' && (
        <>
          {/* Main Grid: Tuning Dial + Key/Scale + Fine Controls */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-4 items-center">
            {/* Antares Rotary Dial (Left/Center col 1-5) */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-3">
              <div
                ref={dialRef}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className="relative w-44 h-44 rounded-full bg-slate-950 border-4 border-slate-800 shadow-[0_0_30px_rgba(0,0,0,0.8),inset_0_2px_8px_rgba(255,255,255,0.08)] flex items-center justify-center cursor-ns-resize select-none group"
                title="Click and drag vertically to adjust Retune Speed"
              >
                {/* Outer LED Meter ticks */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 160 160">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="6"
                    strokeDasharray="330"
                    strokeDashoffset="82"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="url(#cyanDialGrad)"
                    strokeWidth="7"
                    strokeDasharray="330"
                    strokeDashoffset={330 - normalizedSpeed * 248}
                    strokeLinecap="round"
                    className="transition-all duration-75"
                  />
                  <defs>
                    <linearGradient id="cyanDialGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="60%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Inner Metallic Knob with marker */}
                <div
                  className="w-32 h-32 rounded-full bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border border-slate-700/80 shadow-2xl flex flex-col items-center justify-center relative transition-transform duration-75"
                  style={{ transform: `rotate(${rotationDeg}deg)` }}
                >
                  {/* Dial Indicator Notch / LED pip */}
                  <div className="absolute top-2 w-1.5 h-5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                </div>

                {/* Center Readout HUD (counter-rotated for readability) */}
                <div className="absolute flex flex-col items-center pointer-events-none">
                  <span className="text-3xl font-black tracking-tight text-white font-mono drop-shadow">
                    {settings.retuneSpeed}
                  </span>
                  <span className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase font-mono">
                    {settings.retuneSpeed === 0 ? 'HARD SNAP' : 'MS RETUNE'}
                  </span>
                </div>
              </div>

              {/* Quick preset buttons */}
              <div className="grid grid-cols-5 gap-1 w-full max-w-[280px] mt-3">
                {quickSpeeds.map(q => (
                  <button
                    key={q.val}
                    onClick={() => onChange({ ...settings, retuneSpeed: q.val })}
                    className={`py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      settings.retuneSpeed === q.val
                        ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-sm'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                    title={q.desc}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Key & Scale Selectors + Pitch Lock (Middle col 6-8) */}
            <div className="md:col-span-4 space-y-3.5 bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Music2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Musical Key</span>
                  </label>

                  {/* 1-Click Auto Key Detection Button */}
                  <button
                    onClick={handleRunAutoKey}
                    className="px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-300 transition cursor-pointer flex items-center gap-1"
                    title="Run Krumhansl-Schmuckler harmonic key detection on loaded audio"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Auto-Detect</span>
                  </button>
                </div>

                {detectedFeedback && (
                  <div className="mb-2 px-2 py-1 rounded bg-cyan-950/90 border border-cyan-500/40 text-[11px] font-mono text-cyan-300 animate-fadeIn">
                    {detectedFeedback}
                  </div>
                )}

                <div className="grid grid-cols-6 gap-1">
                  {NOTE_NAMES.map(note => (
                    <button
                      key={note}
                      onClick={() => onChange({ ...settings, key: note as MusicalKey })}
                      className={`py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                        settings.key === note
                          ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                          : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {note}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Scale Type</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">{settings.scale}</span>
                </div>
                <select
                  id="select-scale"
                  value={settings.scale}
                  onChange={e => onChange({ ...settings, scale: e.target.value as MusicalScale })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  {(Object.keys(SCALE_INTERVALS) as MusicalScale[]).map(scale => (
                    <option key={scale} value={scale} className="bg-slate-900 text-white">
                      {scale}
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Lock indicator */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Scale Lock:</span>
                {pitchData ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      Target: {pitchData.targetNoteName}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-mono text-slate-500">Standby (Silent)</span>
                )}
              </div>
            </div>

            {/* Humanize, Flex-Tune & Vibrato (Right col 9-12) */}
            <div className="md:col-span-3 space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
              <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800 text-xs font-bold text-slate-200">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Expressive Nuance</span>
              </div>

              {/* Humanize Slider */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Humanize:</span>
                  <span className="font-mono text-cyan-400 font-bold">{settings.humanize}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.humanize}
                  onChange={e => onChange({ ...settings, humanize: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Flex-Tune Slider */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Flex-Tune:</span>
                  <span className="font-mono text-cyan-400 font-bold">{settings.flexTune}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.flexTune}
                  onChange={e => onChange({ ...settings, flexTune: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Natural Vibrato */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Natural Vibrato:</span>
                  <span className="font-mono text-cyan-400 font-bold">{settings.naturalVibrato}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.naturalVibrato}
                  onChange={e => onChange({ ...settings, naturalVibrato: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Tracking Sensitivity */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Tracking Sens:</span>
                  <span className="font-mono text-cyan-400 font-bold">{settings.trackingSensitivity}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={settings.trackingSensitivity}
                  onChange={e => onChange({ ...settings, trackingSensitivity: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Scale Note Bypass Keyboard Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Music2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Scale Note Bypass Keyboard</span>
                <span className="text-[10px] text-slate-500 font-normal font-mono hidden sm:inline">
                  (Click any note to exclude it from autotune quantization)
                </span>
              </span>
              {(settings.bypassedNotes || []).length > 0 && (
                <button
                  onClick={() => onChange({ ...settings, bypassedNotes: [] })}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono transition cursor-pointer"
                >
                  Clear Bypass ({(settings.bypassedNotes || []).length})
                </button>
              )}
            </div>

            <div className="grid grid-cols-12 gap-1 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
              {NOTE_NAMES.map(note => {
                const isInScale = inScaleNotes.has(note);
                const isBypassed = (settings.bypassedNotes || []).includes(note);
                return (
                  <button
                    key={note}
                    onClick={() => toggleBypassNote(note)}
                    title={
                      isBypassed
                        ? `${note} is BYPASSED (ignored during tuning)`
                        : isInScale
                        ? `${note} is IN-SCALE`
                        : `${note} is OUT-OF-SCALE`
                    }
                    className={`py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex flex-col items-center justify-center relative ${
                      isBypassed
                        ? 'bg-rose-950/60 border border-rose-500/50 text-rose-400 line-through'
                        : isInScale
                        ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:border-cyan-400'
                        : 'bg-slate-900/60 border border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <span>{note}</span>
                    <span className="text-[9px] font-normal">
                      {isBypassed ? 'BYP' : isInScale ? 'KEY' : 'OFF'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Doubler & Harmonies Tab */}
      {activeTab === 'doubler' && (
        <div className="mt-4 bg-slate-950/80 p-4 sm:p-5 rounded-xl border border-blue-500/30 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Multi-Voice Vocal Doubler &amp; Harmonizer</span>
              </h3>
              <p className="text-xs text-slate-400">
                Generates stereo thickness, deep vocal octaves (Yeat style), and high formants (Carti baby voice).
              </p>
            </div>
            <button
              onClick={() => onChange({ ...settings, doublerEnabled: !settings.doublerEnabled })}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                settings.doublerEnabled
                  ? 'bg-blue-500 text-slate-950 shadow-md ring-2 ring-blue-400/40'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <span>{settings.doublerEnabled ? 'DOUBLER ON' : 'DOUBLER OFF'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {doublerModes.map(dm => {
              const isCurrent = (settings.doublerMode || 'stereo_wide') === dm.id;
              return (
                <div
                  key={dm.id}
                  onClick={() => onChange({ ...settings, doublerMode: dm.id, doublerEnabled: true })}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isCurrent
                      ? 'bg-blue-950/40 border-blue-400 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">{dm.label}</span>
                    {isCurrent && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{dm.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Doubler Wet Mix</span>
              </span>
              <span className="font-mono text-blue-400 font-bold">{settings.doublerMix || 30}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.doublerMix || 30}
              onChange={e => onChange({ ...settings, doublerMix: Number(e.target.value) })}
              className="w-full accent-blue-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Yeat FX / Chopper Tab */}
      {activeTab === 'trap_fx' && (
        <div className="mt-4 space-y-4">
          {/* 1. Yeat Metallic Bell Resonator */}
          <div className="bg-slate-950/80 p-4 sm:p-5 rounded-xl border border-purple-500/30 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-purple-400" />
                  <span>Yeat Metallic Bell Resonator</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Injects the high-Q metallic chime and high-frequency ringing characteristic of Yeat vocal chains.
                </p>
              </div>
              <button
                onClick={() =>
                  onChange({ ...settings, bellResonatorEnabled: !settings.bellResonatorEnabled })
                }
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  settings.bellResonatorEnabled
                    ? 'bg-purple-500 text-slate-950 shadow-md ring-2 ring-purple-400/40'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <span>{settings.bellResonatorEnabled ? 'BELL RESONATOR ON' : 'BELL OFF'}</span>
              </button>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300">Resonant Frequency:</span>
                <span className="font-mono text-purple-400 font-bold">
                  {settings.bellResonanceHz || 3400} Hz
                </span>
              </div>
              <input
                type="range"
                min="2000"
                max="5200"
                step="50"
                value={settings.bellResonanceHz || 3400}
                onChange={e => onChange({ ...settings, bellResonanceHz: Number(e.target.value) })}
                className="w-full accent-purple-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
            </div>
          </div>

          {/* 2. Modern Trap Stutter Chopper */}
          <div className="bg-slate-950/80 p-4 sm:p-5 rounded-xl border border-purple-500/30 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-purple-400" />
                  <span>Modern Trap Stutter Chopper</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Rhythmic tremolo gating synced with beat tempo for robotic and stutter glitch effects.
                </p>
              </div>
              <button
                onClick={() =>
                  onChange({ ...settings, stutterEnabled: !settings.stutterEnabled })
                }
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  settings.stutterEnabled
                    ? 'bg-purple-500 text-slate-950 shadow-md ring-2 ring-purple-400/40'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <span>{settings.stutterEnabled ? 'CHOPPER ON' : 'CHOPPER OFF'}</span>
              </button>
            </div>

            {/* Stutter Rates */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 shrink-0">Chop Rate:</span>
              <div className="flex items-center gap-1.5">
                {stutterRates.map(rate => (
                  <button
                    key={rate}
                    onClick={() => onChange({ ...settings, stutterRate: rate, stutterEnabled: true })}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                      (settings.stutterRate || '1/16') === rate
                        ? 'bg-purple-500 text-slate-950'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {rate}
                  </button>
                ))}
              </div>
            </div>

            {/* Stutter Mix */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300">Chop Depth:</span>
                <span className="font-mono text-purple-400 font-bold">
                  {settings.stutterMix || 50}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={settings.stutterMix || 50}
                onChange={e => onChange({ ...settings, stutterMix: Number(e.target.value) })}
                className="w-full accent-purple-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
