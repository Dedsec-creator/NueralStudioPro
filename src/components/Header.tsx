import React, { useState } from 'react';
import {
  Activity,
  AudioWaveform,
  Check,
  Cloud,
  Cpu,
  Disc3,
  FolderArchive,
  Layers,
  LayoutGrid,
  Mic,
  Settings,
  ShieldCheck,
  Sliders,
  Sparkles,
  Flame,
  Wand2,
  Zap,
  Undo2,
  Redo2,
  Database,
  Save,
} from 'lucide-react';
import { ArtistVocalPreset, AutoSaveStatus } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

export type StudioSectionId = 'tracks' | 'presets' | 'tuning' | 'pitch_formant' | 'ai_enhancer' | 'mic' | 'plugins' | 'mastering' | 'library' | 'all';

interface HeaderProps {
  onOpenPresetsModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenAutoMixModal: () => void;
  onOpenAutoPresetBeatMixModal?: () => void;
  onOpenGoogleDrive?: () => void;
  onOpenGooglePicker?: () => void;
  onOpenOptimizer?: () => void;
  activeSection: StudioSectionId;
  onSelectSection: (section: StudioSectionId) => void;
  latencyMs: number;
  dspLoadPercent?: number;
  activePreset?: ArtistVocalPreset;
  quickPresets?: ArtistVocalPreset[];
  onQuickApplyPreset?: (preset: ArtistVocalPreset) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  lastActionLabel?: string | null;
  databaseStats?: { assetCount: number; hasActiveSession: boolean };
  autoSaveStatus?: AutoSaveStatus;
  onTriggerAutoSave?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenPresetsModal,
  onOpenSettingsModal,
  onOpenAutoMixModal,
  onOpenAutoPresetBeatMixModal,
  onOpenGoogleDrive,
  onOpenGooglePicker,
  onOpenOptimizer,
  activeSection,
  onSelectSection,
  latencyMs,
  dspLoadPercent,
  activePreset,
  quickPresets = [],
  onQuickApplyPreset,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  lastActionLabel,
  databaseStats,
  autoSaveStatus,
  onTriggerAutoSave,
}) => {
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
          <button
            id="btn-header-perf-badge"
            onClick={onOpenOptimizer}
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 text-slate-300 transition cursor-pointer group"
            title="Open Performance & Loading Optimizer"
          >
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="text-slate-400">DSP:</span>
              <span className="text-cyan-300 font-bold">{dspLoadPercent !== undefined ? dspLoadPercent.toFixed(1) : '4.5'}%</span>
            </div>
            <span className="text-slate-700">&bull;</span>
            <div className="flex items-center gap-1">
              <span className="text-slate-400">Latency:</span>
              <span className="text-emerald-400 font-bold">{latencyMs}ms</span>
            </div>
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Offline Web Audio</span>
          </div>

          {databaseStats && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
              title="IndexedDB Persistent Storage: Stems, uploaded files, and master renders preserved on device"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>DB Preserved:</span>
              <span className="text-cyan-400 font-bold">{databaseStats.assetCount} assets</span>
            </div>
          )}

          {/* AutoSave 60s Indicator */}
          {autoSaveStatus && (
            <button
              onClick={onTriggerAutoSave}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition cursor-pointer select-none active:scale-95 ${
                autoSaveStatus.isSaving
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 animate-pulse'
                  : autoSaveStatus.lastSaved
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
              title={`IndexedDB Auto-Save (60s loop): Automatically persists session state and parameter snapshots to protect against browser crashes.\n${
                autoSaveStatus.lastSaved
                  ? `Last saved: ${autoSaveStatus.secondsSinceLastSave}s ago (${autoSaveStatus.snapshotCount} parameter snapshots preserved).\nNext save in ${autoSaveStatus.secondsUntilNextSave}s.`
                  : 'Saves every 60s to IndexedDB.'
              }\nClick to force immediate snapshot save.`}
            >
              {autoSaveStatus.isSaving ? (
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
              <span className="font-semibold hidden md:inline">
                {autoSaveStatus.isSaving
                  ? 'Saving DB...'
                  : autoSaveStatus.lastSaved
                  ? `Auto-Saved (${autoSaveStatus.secondsUntilNextSave}s)`
                  : 'Auto-Save 60s'}
              </span>
              <span className="font-semibold md:hidden">
                {autoSaveStatus.isSaving ? 'Saving' : 'Auto-Save'}
              </span>
            </button>
          )}
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Undo / Redo History Controls */}
          <div className="flex items-center gap-0.5 bg-slate-900/90 border border-slate-800 rounded-xl p-0.5 shadow-sm">
            <button
              id="btn-header-undo"
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-1.5 sm:px-2 sm:py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer ${
                canUndo
                  ? 'text-slate-200 hover:text-white hover:bg-slate-800 active:scale-95'
                  : 'text-slate-600 cursor-not-allowed opacity-40'
              }`}
              title={canUndo ? `Undo ${lastActionLabel || 'action'} (⌘Z / Ctrl+Z)` : 'Undo (⌘Z)'}
            >
              <Undo2 className="w-4 h-4" />
              <span className="hidden xl:inline text-[11px] font-mono">Undo</span>
            </button>
            <button
              id="btn-header-redo"
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-1.5 sm:px-2 sm:py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer ${
                canRedo
                  ? 'text-slate-200 hover:text-white hover:bg-slate-800 active:scale-95'
                  : 'text-slate-600 cursor-not-allowed opacity-40'
              }`}
              title={canRedo ? 'Redo action (⌘⇧Z / Ctrl+Y)' : 'Redo (⌘⇧Z)'}
            >
              <Redo2 className="w-4 h-4" />
              <span className="hidden xl:inline text-[11px] font-mono">Redo</span>
            </button>
          </div>

          {/* Google Picker Direct Launcher */}
          <button
            id="btn-header-google-picker"
            onClick={onOpenGooglePicker}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-cyan-500/20 hover:from-blue-600/30 hover:to-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold shadow-sm transition cursor-pointer active:scale-95"
            title="Google Picker: Pick audio files directly from Google Drive"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
              <path d="M8.27 3.5L1.5 15.2h6.77L15.04 3.5H8.27z" fill="#4285F4" />
              <path d="M15.04 3.5L8.27 15.2l3.38 5.8 6.77-11.7-3.38-5.8z" fill="#0F9D58" />
              <path d="M18.42 9.3l-3.38 5.9H1.5l3.38 5.8h13.54l3.38-5.8-3.38-5.9z" fill="#FFBA00" />
            </svg>
            <span className="hidden md:inline">Google Picker</span>
            <span className="md:hidden">Picker</span>
          </button>

          {/* Google Drive Stems Import */}
          <button
            id="btn-header-google-drive"
            onClick={onOpenGoogleDrive}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs font-semibold shadow-sm transition cursor-pointer active:scale-95"
            title="Google Drive: Access and import beat & vocal stems"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
              <path d="M8.27 3.5L1.5 15.2h6.77L15.04 3.5H8.27z" fill="#4285F4" />
              <path d="M15.04 3.5L8.27 15.2l3.38 5.8 6.77-11.7-3.38-5.8z" fill="#0F9D58" />
              <path d="M18.42 9.3l-3.38 5.9H1.5l3.38 5.8h13.54l3.38-5.8-3.38-5.9z" fill="#FFBA00" />
            </svg>
            <span className="hidden sm:inline">Drive Hub</span>
          </button>

          {/* 1-Click AI Auto-Preset & Beat Mixer Button */}
          <button
            id="btn-header-auto-preset-sync"
            onClick={onOpenAutoPresetBeatMixModal}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:brightness-110 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/25 border border-amber-300 ring-1 ring-amber-400/40 transition cursor-pointer active:scale-95"
            title="✨ Auto-Preset & Beat Mixer: 1-Click AI analyzes beat & vocals, carves frequency pockets, and auto-applies matching artist preset"
          >
            <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
            <span className="hidden sm:inline">Auto-Preset & Mix</span>
            <span className="sm:hidden">Auto-Mix</span>
          </button>

          {/* AI Auto-Mix Trigger Button */}
          <button
            id="btn-header-auto-mix"
            onClick={onOpenAutoMixModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-semibold shadow-sm transition cursor-pointer active:scale-95"
            title="AI Mastering Suite: Multiband loudness & brickwall limiting"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xs:inline">Mastering</span>
          </button>

          {/* Cloud Presets Modal Backup / Sync Button */}
          <button
            id="btn-open-presets"
            onClick={onOpenPresetsModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-semibold shadow-sm transition cursor-pointer"
            title="Cloud Preset Sync & Backup"
          >
            <Cloud className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Cloud Backup</span>
          </button>

          {/* Performance & Loading Optimizer Button */}
          <button
            id="btn-header-optimizer"
            onClick={onOpenOptimizer}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-semibold shadow-sm transition cursor-pointer hover:border-cyan-500/50"
            title="Performance & Loading Optimizer: Buffer Tuning, DSP Turbo, and RAM Compactor"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Optimizer</span>
          </button>

          {/* PWA / Native Desktop App Install Trigger */}
          <PWAInstallButton />

          {/* Settings Menu Button in the Top-Right Corner */}
          <button
            id="btn-header-settings"
            onClick={onOpenSettingsModal}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-semibold shadow-sm transition cursor-pointer hover:border-cyan-500/50"
            title="Studio Settings: Theme, Wallpapers, Audio Buffers & Quality"
          >
            <Settings className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>

      {/* Primary Section Bar (Visible on Desktop & Mobile with Presets included) */}
      <div className="border-t border-slate-800/80 bg-slate-950/70">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center justify-between gap-1 overflow-x-auto py-1.5 scrollbar-none">
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-max">
            {/* 0. AUDIO TRACKS & WAVEFORM DECK */}
            <button
              id="tab-section-tracks"
              onClick={() => onSelectSection('tracks')}
              className={`px-3 py-2 sm:py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeSection === 'tracks'
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-md shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/80 bg-slate-900/40 border border-transparent'
              }`}
            >
              <AudioWaveform className="w-3.5 h-3.5 text-cyan-400" />
              <span>Tracks</span>
            </button>
            {/* 1. ARTIST PRESETS SECTION TAB */}
            <button
              id="tab-section-presets"
              onClick={() => onSelectSection('presets')}
              className={`px-3 py-2 sm:py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeSection === 'presets'
                  ? 'bg-gradient-to-r from-cyan-500/25 to-violet-500/25 text-cyan-300 border border-cyan-500/50 shadow-md shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/80 bg-slate-900/40 border border-transparent'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Artist Presets</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                30+ Pro
              </span>
            </button>

            {/* 2. TUNING & PITCH SECTION TAB */}
            <button
              id="tab-section-tuning"
              onClick={() => onSelectSection('tuning')}
              className={`px-3 py-2 sm:py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
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
              className={`px-3 py-2 sm:py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
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
              className={`px-3 py-2 sm:py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
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
              className={`px-3 py-2 sm:py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
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
              className={`px-3 py-2 sm:py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
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
              className={`px-3 py-2 sm:py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
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
              className={`px-3 py-2 sm:py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
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
              className={`px-2.5 py-2 sm:py-1.5 text-xs font-semibold rounded-xl transition whitespace-nowrap flex items-center gap-1 cursor-pointer hidden md:flex ${
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
    </header>
  );
};
