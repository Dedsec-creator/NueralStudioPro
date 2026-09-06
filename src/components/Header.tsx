import React, { useState } from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Activity,
  Check,
  Cloud,
  Cpu,
  Disc3,
  FolderArchive,
  HelpCircle,
  Layers,
  LayoutGrid,
  Mic,
  ShieldCheck,
  Sliders,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react';
import { ArtistVocalPreset } from '../types';

export type StudioSectionId = 'presets' | 'tuning' | 'pitch_formant' | 'ai_enhancer' | 'mic' | 'plugins' | 'mastering' | 'library' | 'all';

interface HeaderProps {
  onOpenPresetsModal: () => void;
  activeSection: StudioSectionId;
  onSelectSection: (section: StudioSectionId) => void;
  latencyMs: number;
  activePreset?: ArtistVocalPreset;
  quickPresets?: ArtistVocalPreset[];
  onQuickApplyPreset?: (preset: ArtistVocalPreset) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenPresetsModal,
  activeSection,
  onSelectSection,
  latencyMs,
  activePreset,
  quickPresets = [],
  onQuickApplyPreset,
}) => {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/90 shadow-2xl">
      {/* Top Bar: Brand, Engine Stats & Utilities */}
      <div className="max-w-7xl mx-auto px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-violet-600 p-[1px] shadow-lg shadow-cyan-500/20 shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <Disc3 className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 animate-spin-slow" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
                NEURAL<span className="text-cyan-400">TUNE</span>
                <span className="text-[10px] font-mono tracking-widest px-1.5 py-0.5 rounded bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-300 border border-cyan-500/30">
                  ULTRA
                </span>
              </h1>
            </div>
            <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
              Vocal Studio DAW &bull; WebAssembly &bull; SharedArrayBuffer DSP
            </p>
          </div>
        </div>

        {/* Engine Performance & Status Badges */}
        <div className="hidden lg:flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Low-Latency:</span>
            <span className="text-emerald-400 font-bold">{latencyMs} ms</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Offline Web Audio</span>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2">
          {/* Cloud Presets Modal Backup / Sync Button */}
          <button
            id="btn-open-presets"
            onClick={onOpenPresetsModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-semibold shadow-sm transition cursor-pointer"
            title="Cloud Preset Sync & Backup"
          >
            <Cloud className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Cloud Backup</span>
          </button>

          {/* Guide Modal Button */}
          <button
            onClick={() => setShowGuide(true)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer border border-slate-800"
            title="Studio DAW Guide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* PWA In-App Install Button */}
          <PWAInstallButton />
        </div>
      </div>

      {/* Primary Section Bar (Visible on Desktop & Mobile with Presets included) */}
      <div className="border-t border-slate-800/80 bg-slate-950/70">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center justify-between gap-1 overflow-x-auto py-1.5 scrollbar-none">
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-max">
            {/* 1. ARTIST PRESETS SECTION TAB */}
            <button
              id="tab-section-presets"
              onClick={() => onSelectSection('presets')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeSection === 'presets'
                  ? 'bg-gradient-to-r from-cyan-500/25 to-violet-500/25 text-cyan-300 border border-cyan-500/50 shadow-md shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/80 bg-slate-900/40 border border-transparent'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Artist Presets</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                16+ Pro
              </span>
            </button>

            {/* 2. TUNING & PITCH SECTION TAB */}
            <button
              id="tab-section-tuning"
              onClick={() => onSelectSection('tuning')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeSection === 'tuning'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/80 bg-slate-900/40 border border-transparent'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Tuning</span>
            </button>

            {/* 2.5 PITCH & FORMANT PROCESSOR TAB */}
            <button
              id="tab-section-pitch-formant"
              onClick={() => onSelectSection('pitch_formant')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeSection === 'pitch_formant'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/80 bg-slate-900/40 border border-transparent'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pitch &amp; Formant</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                DSP
              </span>
            </button>

            {/* 2.8 PRO VOCAL AI ENHANCER TAB */}
            <button
              id="tab-section-ai-enhancer"
              onClick={() => onSelectSection('ai_enhancer')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeSection === 'ai_enhancer'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm ring-1 ring-purple-400/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/80 bg-slate-900/40 border border-transparent'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Enhancer</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                PRO
              </span>
            </button>

            {/* 3. MIC LOCKER SECTION TAB */}
            <button
              id="tab-section-mic"
              onClick={() => onSelectSection('mic')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeSection === 'mic'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/80 bg-slate-900/40 border border-transparent'
              }`}
            >
              <Mic className="w-3.5 h-3.5 text-amber-400" />
              <span>Mic Locker</span>
            </button>

            {/* 4. MODULAR PLUGINS SECTION TAB */}
            <button
              id="tab-section-plugins"
              onClick={() => onSelectSection('plugins')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeSection === 'plugins'
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/80 bg-slate-900/40 border border-transparent'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-violet-400" />
              <span>Insert Plugins</span>
            </button>

            {/* 5. MASTERING SUITE SECTION TAB */}
            <button
              id="tab-section-mastering"
              onClick={() => onSelectSection('mastering')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeSection === 'mastering'
                  ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/80 bg-slate-900/40 border border-transparent'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-pink-400" />
              <span>Mastering</span>
            </button>

            {/* 6. STUDIO ASSET & RENDER LIBRARY TAB */}
            <button
              id="tab-section-library"
              onClick={() => onSelectSection('library')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeSection === 'library'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-pink-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/80 bg-slate-900/40 border border-transparent'
              }`}
            >
              <FolderArchive className="w-3.5 h-3.5 text-cyan-400" />
              <span>Library</span>
            </button>

            {/* 7. ALL RACKS TOGETHER (Comprehensive DAW view) */}
            <button
              id="tab-section-all"
              onClick={() => onSelectSection('all')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl transition whitespace-nowrap flex items-center gap-1 cursor-pointer hidden md:flex ${
                activeSection === 'all'
                  ? 'bg-slate-800 text-white border border-slate-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/60 border border-transparent'
              }`}
              title="Show all studio modules stacked together"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>All Racks</span>
            </button>
          </div>

          {/* Quick Active Preset Status Pill */}
          {activePreset && (
            <div
              onClick={() => onSelectSection('presets')}
              className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-300 hover:border-cyan-500/60 transition cursor-pointer shrink-0"
              title="Click to view full Presets section"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-500">Preset:</span>
              <span className="text-white font-bold truncate max-w-[140px]">{activePreset.name}</span>
            </div>
          )}
        </div>

        {/* Quick Presets Fast-Switcher Bar */}
        {quickPresets.length > 0 && onQuickApplyPreset && (
          <div className="bg-slate-950/90 border-t border-slate-900/90 px-2 sm:px-4 py-1.5 flex items-center gap-2 overflow-x-auto scrollbar-none text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-500 font-mono shrink-0 pl-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">Quick Presets:</span>
            </div>

            <div className="flex items-center gap-1.5 min-w-max">
              {quickPresets.map(preset => {
                const isCurrent = activePreset?.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => onQuickApplyPreset(preset)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                      isCurrent
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    {isCurrent && <Check className="w-2.5 h-2.5 text-cyan-400" />}
                    <span>{preset.artist.split(' ')[0]} &bull; {preset.name.split(' (')[0]}</span>
                  </button>
                );
              })}

              <button
                onClick={() => onSelectSection('presets')}
                className="px-2 py-1 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap"
              >
                More Presets &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl text-slate-200">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Disc3 className="w-5 h-5 text-cyan-400" />
              Welcome to NeuralTune Ultra Studio
            </h3>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed mt-4">
              <p>
                <strong className="text-cyan-400">1. Artist Vocal Presets:</strong> Click <strong>Artist Presets</strong> in the top section bar to audition Travis Scott (Beep Beep, Dinosaurs), Hunxho, Don Toliver, Post Malone, and Gunna vocal chains.
              </p>
              <p>
                <strong className="text-cyan-400">2. Instant Audio Playback:</strong> Upload your vocal and beat tracks or activate <strong>Live Mic</strong>, then hit the <strong>Play</strong> button on the transport timeline to hear your vocals processed with live pitch-tracking and microphone emulation.
              </p>
              <p>
                <strong className="text-cyan-400">3. Real-Time Mic Input:</strong> Click <strong>Live Mic</strong> to sing directly through the autotune dial and mic locker in real time.
              </p>
              <p>
                <strong className="text-cyan-400">4. Antares-Style Tuning Dial:</strong> Drag vertically on the rotary dial to adjust Retune Speed from <strong>0ms</strong> (hard snap) to <strong>70ms</strong> (transparent). Choose your key and scale.
              </p>
              <p>
                <strong className="text-cyan-400">5. Mic Locker:</strong> Switch between 12 legendary studio microphones like the Sony C800G, Telefunken 251, SM7B, and Neumann U87.
              </p>
            </div>
            <button
              onClick={() => setShowGuide(false)}
              className="mt-6 w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer"
            >
              Ready to Produce
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
