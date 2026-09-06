import React, { useRef, useState, useEffect } from 'react';
import { MusicalKey, MusicalScale, PitchTrackData, TuningSettings } from '../types';
import { NOTE_NAMES, SCALE_INTERVALS } from '../audio/pitchDetector';
import { Disc3, Zap, Sliders, Music2, Gauge } from 'lucide-react';

interface TuningDialProps {
  settings: TuningSettings;
  onChange: (updated: TuningSettings) => void;
  pitchData: PitchTrackData | null;
}

export const TuningDial: React.FC<TuningDialProps> = ({ settings, onChange, pitchData }) => {
  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startVal, setStartVal] = useState(0);

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

  const quickSpeeds = [
    { label: '0 ms', val: 0, desc: 'T-Pain / Hard Snap' },
    { label: '14 ms', val: 14, desc: 'Tight Pop' },
    { label: '35 ms', val: 35, desc: 'Modern R&B' },
    { label: '70 ms', val: 70, desc: 'Transparent' },
  ];

  return (
    <div className="rounded-2xl bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-cyan-500/20 shadow-2xl p-5 relative overflow-hidden backdrop-blur-md">
      {/* Background Accent glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-cyan-500/10 blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
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
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">Antares-Style Phase Engine</p>
          </div>
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

      {/* Main Grid: Tuning Dial + Key/Scale + Fine Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-5 items-center">
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
                {settings.retuneSpeed === 0 ? 'ROBOT' : 'MS RETUNE'}
              </span>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="grid grid-cols-4 gap-1.5 w-full max-w-[240px] mt-3">
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
        <div className="md:col-span-4 space-y-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Music2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Musical Key</span>
              </label>
              <span className="text-[11px] font-mono text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                {settings.key}
              </span>
            </div>
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
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
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
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
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
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
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
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
