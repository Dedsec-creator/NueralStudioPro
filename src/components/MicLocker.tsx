import React, { useState } from 'react';
import { MicLockerSettings, MicModelId, PolarPattern } from '../types';
import { MIC_MODELS } from '../audio/micProfiles';
import { Mic2, Radio, Wind, Sparkles, Flame, Sliders, Cpu, Activity, Zap } from 'lucide-react';

interface MicLockerProps {
  settings: MicLockerSettings;
  onChange: (updated: MicLockerSettings) => void;
}

type MicFilterCategory = 'ALL' | 'Tube Condenser' | 'FET Condenser' | 'Dynamic' | 'Ribbon';

export const MicLocker: React.FC<MicLockerProps> = ({ settings, onChange }) => {
  const [activeCategory, setActiveCategory] = useState<MicFilterCategory>('ALL');
  const currentMic = MIC_MODELS[settings.selectedMic] || MIC_MODELS.c800g;

  const handleSelectMic = (id: MicModelId) => {
    const model = MIC_MODELS[id];
    onChange({
      ...settings,
      selectedMic: id,
      proximity: model.defaultProximity,
      drive: model.defaultDrive,
      transformerWarmth: settings.transformerWarmth ?? 40,
      capsuleResonance: settings.capsuleResonance ?? 30,
      impedanceMode: settings.impedanceMode ?? 'modern',
    });
  };

  const filteredMics = Object.values(MIC_MODELS).filter(mic => {
    if (activeCategory === 'ALL') return true;
    return mic.type === activeCategory;
  });

  return (
    <div className="rounded-2xl bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-slate-800 p-5 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Mic2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wide text-white uppercase flex items-center gap-2">
              Virtual Microphone Locker & Modulation
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {Object.keys(MIC_MODELS).length} MICS
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">Analog Capsule, Output Transformer & Impedance Emulation</p>
          </div>
        </div>

        {/* Master bypass */}
        <button
          id="btn-toggle-mic-locker"
          onClick={() => onChange({ ...settings, enabled: !settings.enabled })}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            settings.enabled
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 ring-2 ring-amber-400/40'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          <span>{settings.enabled ? 'ACTIVE' : 'BYPASS'}</span>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 mt-3.5 overflow-x-auto pb-1 scrollbar-none">
        {(['ALL', 'Tube Condenser', 'FET Condenser', 'Dynamic', 'Ribbon'] as MicFilterCategory[]).map(cat => {
          const isCurrent = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap border ${
                isCurrent
                  ? 'bg-amber-500/20 border-amber-400/60 text-amber-300 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Microphone Selector Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 mt-3 max-h-60 overflow-y-auto pr-1">
        {filteredMics.map(mic => {
          const isSelected = settings.selectedMic === mic.id;
          return (
            <button
              key={mic.id}
              onClick={() => handleSelectMic(mic.id)}
              className={`p-2.5 rounded-xl text-left transition-all relative overflow-hidden cursor-pointer border ${
                isSelected
                  ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-amber-400 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/30'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/50'
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 right-0 w-2 h-2 rounded-bl bg-amber-400" />
              )}
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-mono text-amber-400 font-bold uppercase truncate max-w-[70%]">
                  {mic.type.replace(' Condenser', '')}
                </span>
                <span className="text-[9px] font-mono text-slate-500">{mic.vintageYear}</span>
              </div>
              <h4 className="text-xs font-bold text-white truncate">{mic.name}</h4>
              <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{mic.manufacturer}</p>
            </button>
          );
        })}
      </div>

      {/* Selected Mic Detail Strip & Modulation Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
        {/* Mic Profile Description & Frequency Graph (Col 1-6) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400">Current Target Capsule:</span>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                {currentMic.name}
                <span className="text-[11px] font-mono font-normal text-amber-400">({currentMic.manufacturer})</span>
              </h4>
            </div>
            <div className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-300">
              {currentMic.type}
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{currentMic.description}</p>

          {/* Interactive Simulated Frequency Response Curve Bar Chart */}
          <div className="pt-1">
            <span className="text-[10px] font-mono text-slate-400 mb-1 block">Capsule Response Curve (dB offset):</span>
            <div className="grid grid-cols-5 gap-1.5 h-16 items-end bg-slate-900/90 p-2 rounded-lg border border-slate-800">
              {currentMic.eqCurve.map((point, idx) => {
                const totalGain = point.gain + (idx === 4 ? settings.airBoost : 0);
                const heightPct = Math.max(10, Math.min(100, 50 + totalGain * 8));
                return (
                  <div key={point.freq} className="flex flex-col items-center h-full justify-end group">
                    <div
                      className={`w-full rounded-t transition-all ${
                        totalGain >= 0 ? 'bg-amber-400' : 'bg-blue-400'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[9px] font-mono text-slate-400 mt-1">
                      {point.freq >= 1000 ? `${point.freq / 1000}k` : `${point.freq}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preamp Impedance Voicing */}
          <div className="pt-1">
            <label className="text-[10px] font-mono text-slate-400 mb-1 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-amber-400" />
              Preamp Voicing / Impedance Load:
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'modern', label: 'Modern Clean' },
                { id: 'vintage_200', label: '200Ω Transformer' },
                { id: 'tube_high_z', label: 'High-Z Tube' },
              ].map(imp => (
                <button
                  key={imp.id}
                  onClick={() => onChange({ ...settings, impedanceMode: imp.id as any })}
                  className={`py-1 px-1.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer truncate ${
                    (settings.impedanceMode || 'modern') === imp.id
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {imp.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mic Modulation Controls (Col 7-12) */}
        <div className="lg:col-span-6 space-y-3 border-t lg:border-t-0 lg:border-l border-slate-800 pt-3 lg:pt-0 lg:pl-5">
          {/* Proximity Slider */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-amber-400" />
                Proximity (Low-End Chest Bloom):
              </span>
              <span className="font-mono text-amber-400 font-bold">{settings.proximity} cm</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              value={settings.proximity}
              onChange={e => onChange({ ...settings, proximity: Number(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Tube / FET Drive Saturation */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Tube / FET Harmonic Overdrive:
              </span>
              <span className="font-mono text-amber-400 font-bold">{settings.drive}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.drive}
              onChange={e => onChange({ ...settings, drive: Number(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Transformer Warmth (Mic Modulation) */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Output Transformer Warmth:
              </span>
              <span className="font-mono text-amber-400 font-bold">{settings.transformerWarmth ?? 40}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.transformerWarmth ?? 40}
              onChange={e => onChange({ ...settings, transformerWarmth: Number(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Capsule Resonance (Mic Modulation) */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                Capsule Body Resonance:
              </span>
              <span className="font-mono text-amber-400 font-bold">{settings.capsuleResonance ?? 30}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.capsuleResonance ?? 30}
              onChange={e => onChange({ ...settings, capsuleResonance: Number(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Air Boost (14kHz) */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                14kHz Crystalline Air Sheen:
              </span>
              <span className="font-mono text-amber-400 font-bold">+{settings.airBoost.toFixed(1)} dB</span>
            </div>
            <input
              type="range"
              min="0"
              max="6"
              step="0.5"
              value={settings.airBoost}
              onChange={e => onChange({ ...settings, airBoost: Number(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Polar Pattern & Low Cut selectors */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="text-[10px] font-mono text-slate-400 mb-1 block">Polar Pattern</label>
              <div className="grid grid-cols-3 gap-1">
                {(['cardioid', 'omni', 'figure8'] as PolarPattern[]).map(pat => (
                  <button
                    key={pat}
                    onClick={() => onChange({ ...settings, polarPattern: pat })}
                    className={`py-1 rounded text-[10px] font-mono font-bold capitalize transition-all cursor-pointer ${
                      settings.polarPattern === pat
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {pat === 'figure8' ? 'Fig-8' : pat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-slate-400 mb-1 block">Low-Cut Rumble</label>
              <div className="grid grid-cols-3 gap-1">
                {([0, 80, 120] as const).map(cut => (
                  <button
                    key={cut}
                    onClick={() => onChange({ ...settings, lowCutHz: cut })}
                    className={`py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      settings.lowCutHz === cut
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cut === 0 ? 'Flat' : `${cut}Hz`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
