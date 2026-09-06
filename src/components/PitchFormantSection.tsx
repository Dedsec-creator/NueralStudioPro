import React from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Flame,
  Layers,
  Mic2,
  Music,
  Power,
  RotateCcw,
  Sparkles,
  Volume2,
  Wand2,
  Zap,
} from 'lucide-react';
import { PitchFormantSettings } from '../types';

interface PitchFormantSectionProps {
  settings: PitchFormantSettings;
  onChange: (settings: PitchFormantSettings) => void;
  onApplyPreset?: (presetPatch: Partial<PitchFormantSettings>) => void;
}

interface FormantStylePreset {
  id: string;
  name: string;
  artist: string;
  tagline: string;
  patch: Partial<PitchFormantSettings>;
  badgeColor: string;
}

const ARTIST_FORMANT_PRESETS: FormantStylePreset[] = [
  {
    id: 'travis-deep',
    name: 'Travis Scott Deep Pitch',
    artist: 'Travis Scott',
    tagline: '-3st Deep Vowel & Heavy Chest Throat',
    badgeColor: 'from-amber-600 to-red-600',
    patch: {
      enabled: true,
      isBypassed: false,
      pitchSemitones: -3,
      fineTuneCents: 0,
      formantSemitones: -4.5,
      throatLength: 1.25,
      preserveFormants: false,
      formantIntensity: 85,
      f1GainDb: 3.2,
      f2GainDb: -1.0,
      f3GainDb: -2.0,
      character: 'deep_chest',
    },
  },
  {
    id: 'don-toliver-high',
    name: 'Don Toliver Melodic Lift',
    artist: 'Don Toliver',
    tagline: '+2st Silky Air Lift with Crisp Formant',
    badgeColor: 'from-cyan-600 to-blue-600',
    patch: {
      enabled: true,
      isBypassed: false,
      pitchSemitones: 2,
      fineTuneCents: -5,
      formantSemitones: 1.8,
      throatLength: 0.9,
      preserveFormants: false,
      formantIntensity: 78,
      f1GainDb: -1.0,
      f2GainDb: 2.5,
      f3GainDb: 4.0,
      character: 'melodic_lift',
    },
  },
  {
    id: 'carti-baby-voice',
    name: 'Carti Baby Voice',
    artist: 'Playboi Carti',
    tagline: '+5st Hyperpop High Formant Vocal Shimmer',
    badgeColor: 'from-fuchsia-600 to-pink-600',
    patch: {
      enabled: true,
      isBypassed: false,
      pitchSemitones: 5,
      fineTuneCents: 0,
      formantSemitones: 5.5,
      throatLength: 0.78,
      preserveFormants: false,
      formantIntensity: 92,
      f1GainDb: -2.5,
      f2GainDb: 3.5,
      f3GainDb: 5.5,
      character: 'hyperpop',
    },
  },
  {
    id: 'chopped-screwed',
    name: 'Chopped & Screwed Vibe',
    artist: 'Houston Classic',
    tagline: '-5st Pitched Down Slowed Vowel Resonance',
    badgeColor: 'from-purple-600 to-indigo-700',
    patch: {
      enabled: true,
      isBypassed: false,
      pitchSemitones: -5,
      fineTuneCents: -12,
      formantSemitones: -3.0,
      throatLength: 1.2,
      preserveFormants: false,
      formantIntensity: 80,
      f1GainDb: 4.0,
      f2GainDb: 0.5,
      f3GainDb: -3.0,
      character: 'chopped',
    },
  },
  {
    id: 'natural-transpose',
    name: 'Natural Key Transpose',
    artist: 'Studio Clean',
    tagline: '+3st Transpose with 100% Formant Locked Timbre',
    badgeColor: 'from-emerald-600 to-teal-600',
    patch: {
      enabled: true,
      isBypassed: false,
      pitchSemitones: 3,
      fineTuneCents: 0,
      formantSemitones: 0,
      throatLength: 1.0,
      preserveFormants: true,
      formantIntensity: 100,
      f1GainDb: 0,
      f2GainDb: 0,
      f3GainDb: 0,
      character: 'custom',
    },
  },
  {
    id: 'sub-octave-demon',
    name: 'Sub-Octave Demon Doubler',
    artist: 'Trap Underground',
    tagline: '-12st Full Octave Down Heavy Chest Sub',
    badgeColor: 'from-slate-700 to-zinc-900',
    patch: {
      enabled: true,
      isBypassed: false,
      pitchSemitones: -12,
      fineTuneCents: 0,
      formantSemitones: -6.0,
      throatLength: 1.35,
      preserveFormants: false,
      formantIntensity: 95,
      f1GainDb: 5.0,
      f2GainDb: -1.5,
      f3GainDb: -4.0,
      character: 'alien',
    },
  },
];

export const PitchFormantSection: React.FC<PitchFormantSectionProps> = ({
  settings,
  onChange,
  onApplyPreset,
}) => {
  const update = (patch: Partial<PitchFormantSettings>) => {
    onChange({ ...settings, ...patch });
  };

  const handlePresetSelect = (preset: FormantStylePreset) => {
    update(preset.patch);
    onApplyPreset?.(preset.patch);
  };

  // Calculate simulated formant frequencies for SVG display
  const formantRatio =
    Math.pow(2, settings.formantSemitones / 12) *
    (1 / Math.max(0.65, Math.min(1.45, settings.throatLength)));
  const f1Hz = Math.round(Math.max(150, Math.min(2400, 700 * formantRatio)));
  const f2Hz = Math.round(Math.max(450, Math.min(5500, 1800 * formantRatio)));
  const f3Hz = Math.round(Math.max(1200, Math.min(9500, 2900 * formantRatio)));

  // SVG Curve Path Calculation for 300w x 100h
  // Map log freq (100Hz -> 10,000Hz) to 0..300 x-axis
  const hzToX = (hz: number) => {
    const minLog = Math.log10(100);
    const maxLog = Math.log10(10000);
    const logVal = Math.log10(Math.max(100, Math.min(10000, hz)));
    return ((logVal - minLog) / (maxLog - minLog)) * 280 + 10;
  };

  const p1X = hzToX(f1Hz);
  const p2X = hzToX(f2Hz);
  const p3X = hzToX(f3Hz);

  const p1Y = 70 - (settings.f1GainDb || 0) * 4 - (settings.formantSemitones < 0 ? 12 : -4);
  const p2Y = 60 - (settings.f2GainDb || 0) * 4 - (settings.formantSemitones > 0 ? 10 : -4);
  const p3Y = 65 - (settings.f3GainDb || 0) * 4 - (settings.formantSemitones > 0 ? 14 : -6);

  const curvePath = `M 10 85 Q ${p1X * 0.6} 82, ${p1X} ${Math.max(15, p1Y)} T ${p2X} ${Math.max(
    18,
    p2Y
  )} T ${p3X} ${Math.max(22, p3Y)} T 290 85`;

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800/90 p-4 sm:p-6 shadow-xl space-y-6">
      {/* Top Header & Master Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30 shadow-inner">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Pitch & Formant Processor
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                DSP SHIFTER
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-time semitone pitch transposition, vocal tract throat modeling, and vowel formant shaping
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Formant Preservation Badge */}
          <button
            onClick={() => update({ preserveFormants: !settings.preserveFormants })}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
              settings.preserveFormants
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Lock vocal timbre when pitching (avoids chipmunk or ogre effect)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Preserve Formants: {settings.preserveFormants ? 'ON' : 'OFF'}</span>
          </button>

          {/* Bypass A/B Toggle */}
          <button
            onClick={() => update({ isBypassed: !settings.isBypassed })}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
              settings.isBypassed
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Bypass effect to compare dry original audio"
          >
            <Power className="w-3.5 h-3.5" />
            <span>{settings.isBypassed ? 'BYPASSED' : 'ACTIVE'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Formant Spectrum Display */}
      <div className="bg-slate-950 rounded-xl border border-slate-800/90 p-4 relative overflow-hidden">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              VOCAL FORMANT ENVELOPE SPECTRUM
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-cyan-300">F1: {f1Hz} Hz</span>
            <span className="text-slate-500">&bull;</span>
            <span className="text-amber-300">F2: {f2Hz} Hz</span>
            <span className="text-slate-500">&bull;</span>
            <span className="text-fuchsia-300">F3: {f3Hz} Hz</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Shift Ratio: <strong className="text-white">{formantRatio.toFixed(2)}x</strong>
          </div>
        </div>

        {/* SVG Spectral Graph */}
        <div className="h-28 w-full relative">
          <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
            {/* Grid Lines */}
            <line x1="10" y1="20" x2="290" y2="20" stroke="#1e293b" strokeDasharray="2 3" />
            <line x1="10" y1="50" x2="290" y2="50" stroke="#1e293b" strokeDasharray="2 3" />
            <line x1="10" y1="85" x2="290" y2="85" stroke="#334155" />

            {/* Formant Resonance Peak Markers */}
            <line x1={p1X} y1="10" x2={p1X} y2="85" stroke="#06b6d4" strokeOpacity="0.4" strokeDasharray="2 2" />
            <line x1={p2X} y1="10" x2={p2X} y2="85" stroke="#f59e0b" strokeOpacity="0.4" strokeDasharray="2 2" />
            <line x1={p3X} y1="10" x2={p3X} y2="85" stroke="#d946ef" strokeOpacity="0.4" strokeDasharray="2 2" />

            {/* Dynamic Curve */}
            <path
              d={curvePath}
              fill="none"
              stroke="url(#formantGrad)"
              strokeWidth="2.8"
              className="transition-all duration-150"
            />
            {/* Shaded Area Under Curve */}
            <path
              d={`${curvePath} L 290 85 L 10 85 Z`}
              fill="url(#formantFill)"
              opacity="0.25"
              className="transition-all duration-150"
            />

            {/* Peak Dots */}
            <circle cx={p1X} cy={Math.max(15, p1Y)} r="4" fill="#06b6d4" className="shadow" />
            <circle cx={p2X} cy={Math.max(18, p2Y)} r="4" fill="#f59e0b" className="shadow" />
            <circle cx={p3X} cy={Math.max(22, p3Y)} r="4" fill="#d946ef" className="shadow" />

            <defs>
              <linearGradient id="formantGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="40%" stopColor="#06b6d4" />
                <stop offset="75%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
              <linearGradient id="formantFill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#020617" />
              </linearGradient>
            </defs>
          </svg>

          {/* Frequency Labels */}
          <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1 px-2">
            <span>100 Hz (Chest)</span>
            <span>500 Hz (Vowel F1)</span>
            <span>1.8 kHz (Throat F2)</span>
            <span>3.5 kHz (Mouth F3)</span>
            <span>10 kHz (Air)</span>
          </div>
        </div>
      </div>

      {/* Main Dual Module Grid: Pitch vs Formant */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* MODULE 1: PITCH TRANSPOSER */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Pitch Transposition
              </h3>
            </div>
            <button
              onClick={() => update({ pitchSemitones: 0, fineTuneCents: 0 })}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              title="Reset Pitch to 0st"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset 0st</span>
            </button>
          </div>

          {/* Coarse Pitch Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">Coarse Pitch (Semitones)</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => update({ pitchSemitones: Math.max(-12, settings.pitchSemitones - 1) })}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  -1
                </button>
                <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 font-mono font-bold text-cyan-300 min-w-[72px] text-center text-sm">
                  {settings.pitchSemitones > 0 ? `+${settings.pitchSemitones}` : settings.pitchSemitones} st
                </span>
                <button
                  onClick={() => update({ pitchSemitones: Math.min(12, settings.pitchSemitones + 1) })}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  +1
                </button>
              </div>
            </div>

            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={settings.pitchSemitones}
              onChange={e => update({ pitchSemitones: parseInt(e.target.value, 10) })}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>-12st (-1 Oct)</span>
              <span>-7st (5th)</span>
              <span>0st (Original)</span>
              <span>+7st (5th)</span>
              <span>+12st (+1 Oct)</span>
            </div>
          </div>

          {/* Quick Pitch Interval Buttons */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono text-slate-400">Quick Harmony Intervals:</span>
            <div className="grid grid-cols-5 sm:grid-cols-7 gap-1">
              {[
                { val: -12, label: '-12 Oct' },
                { val: -7, label: '-7 5th' },
                { val: -5, label: '-5 4th' },
                { val: -3, label: '-3 Min' },
                { val: 0, label: '0 Normal' },
                { val: 3, label: '+3 Maj' },
                { val: 5, label: '+5 4th' },
                { val: 7, label: '+7 5th' },
                { val: 12, label: '+12 Oct' },
              ].map(item => (
                <button
                  key={item.val}
                  onClick={() => update({ pitchSemitones: item.val })}
                  className={`py-1 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                    settings.pitchSemitones === item.val
                      ? 'bg-cyan-500 text-slate-950 shadow'
                      : 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fine Tune Slider */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">Fine Tune (Cents)</span>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {settings.fineTuneCents > 0 ? `+${settings.fineTuneCents}` : settings.fineTuneCents} cents
              </span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={settings.fineTuneCents}
              onChange={e => update({ fineTuneCents: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>-100 cents</span>
              <span>0 cents</span>
              <span>+100 cents</span>
            </div>
          </div>
        </div>

        {/* MODULE 2: FORMANT & VOCAL TRACT SHAPER */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Formant & Throat Modeling
              </h3>
            </div>
            <button
              onClick={() => update({ formantSemitones: 0, throatLength: 1.0, formantIntensity: 80 })}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              title="Reset Formant to Neutral"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset 0st</span>
            </button>
          </div>

          {/* Formant Shift Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">Formant Shift (Semitones)</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => update({ formantSemitones: Math.max(-12, settings.formantSemitones - 1) })}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  -1
                </button>
                <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 font-mono font-bold text-emerald-300 min-w-[72px] text-center text-sm">
                  {settings.formantSemitones > 0 ? `+${settings.formantSemitones}` : settings.formantSemitones} st
                </span>
                <button
                  onClick={() => update({ formantSemitones: Math.min(12, settings.formantSemitones + 1) })}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  +1
                </button>
              </div>
            </div>

            <input
              type="range"
              min="-12"
              max="12"
              step="0.5"
              value={settings.formantSemitones}
              onChange={e => update({ formantSemitones: parseFloat(e.target.value) })}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>-12st (Deep Chest)</span>
              <span>-5st (Travis)</span>
              <span>0st (Neutral)</span>
              <span>+5st (Carti)</span>
              <span>+12st (Hyperpop)</span>
            </div>
          </div>

          {/* Throat Length / Tract Resonator */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-300 font-medium">Throat Length (Vocal Tract)</span>
                <span className="ml-2 text-[10px] text-slate-500 font-mono">
                  {settings.throatLength > 1.1
                    ? 'Long / Deep Chest'
                    : settings.throatLength < 0.9
                    ? 'Tight / Crisp Petite'
                    : 'Natural Anatomical'}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {Math.round(settings.throatLength * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.7"
              max="1.4"
              step="0.01"
              value={settings.throatLength}
              onChange={e => update({ throatLength: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>

          {/* Formant Intensity Slider */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">Formant Intensity (Wet Depth)</span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {settings.formantIntensity}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={settings.formantIntensity}
              onChange={e => update({ formantIntensity: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>

          {/* Formant EQ Band Trim (F1, F2, F3) */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              <span className="block text-[10px] font-mono text-cyan-300">F1 (Vowel Body)</span>
              <span className="text-xs font-mono font-bold text-white">
                {settings.f1GainDb > 0 ? `+${settings.f1GainDb}` : settings.f1GainDb || 0} dB
              </span>
              <div className="flex justify-center gap-1 mt-1">
                <button
                  onClick={() => update({ f1GainDb: Math.max(-6, (settings.f1GainDb || 0) - 1) })}
                  className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white"
                >
                  -
                </button>
                <button
                  onClick={() => update({ f1GainDb: Math.min(6, (settings.f1GainDb || 0) + 1) })}
                  className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white"
                >
                  +
                </button>
              </div>
            </div>

            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              <span className="block text-[10px] font-mono text-amber-300">F2 (Nasal / Throat)</span>
              <span className="text-xs font-mono font-bold text-white">
                {settings.f2GainDb > 0 ? `+${settings.f2GainDb}` : settings.f2GainDb || 0} dB
              </span>
              <div className="flex justify-center gap-1 mt-1">
                <button
                  onClick={() => update({ f2GainDb: Math.max(-6, (settings.f2GainDb || 0) - 1) })}
                  className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white"
                >
                  -
                </button>
                <button
                  onClick={() => update({ f2GainDb: Math.min(6, (settings.f2GainDb || 0) + 1) })}
                  className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white"
                >
                  +
                </button>
              </div>
            </div>

            <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              <span className="block text-[10px] font-mono text-fuchsia-300">F3 (Crisp Air)</span>
              <span className="text-xs font-mono font-bold text-white">
                {settings.f3GainDb > 0 ? `+${settings.f3GainDb}` : settings.f3GainDb || 0} dB
              </span>
              <div className="flex justify-center gap-1 mt-1">
                <button
                  onClick={() => update({ f3GainDb: Math.max(-6, (settings.f3GainDb || 0) - 1) })}
                  className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white"
                >
                  -
                </button>
                <button
                  onClick={() => update({ f3GainDb: Math.min(6, (settings.f3GainDb || 0) + 1) })}
                  className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ICONIC ARTIST FORMANT & PITCH STYLE PRESETS */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Iconic Artist Pitch & Formant Styles
            </h3>
          </div>
          <span className="text-xs text-slate-400">One-click artist vocal characters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {ARTIST_FORMANT_PRESETS.map(preset => {
            const isMatch =
              settings.pitchSemitones === preset.patch.pitchSemitones &&
              Math.abs(settings.formantSemitones - (preset.patch.formantSemitones || 0)) < 0.2;
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer relative overflow-hidden group ${
                  isMatch
                    ? 'bg-slate-800/90 border-cyan-500 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                    {preset.name}
                  </span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full text-white bg-gradient-to-r ${preset.badgeColor}`}
                  >
                    {preset.artist}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">{preset.tagline}</p>
                <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-slate-500">
                  <span>
                    Pitch: <strong className="text-cyan-300">{preset.patch.pitchSemitones}st</strong>
                  </span>
                  <span>&bull;</span>
                  <span>
                    Formant: <strong className="text-emerald-300">{preset.patch.formantSemitones}st</strong>
                  </span>
                  <span>&bull;</span>
                  <span>
                    Throat: <strong className="text-white">{Math.round((preset.patch.throatLength || 1) * 100)}%</strong>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
