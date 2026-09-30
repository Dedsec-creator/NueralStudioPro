import React, { useState, useRef } from 'react';
import {
  Settings,
  X,
  Palette,
  HardDrive,
  Cpu,
  Upload,
  Image as ImageIcon,
  Check,
  RotateCcw,
  Sliders,
  Volume2,
  Sparkles,
  Flame,
  Layers,
  Zap,
  Eye,
  SlidersHorizontal,
  FolderOpen,
  Save,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import {
  AppThemeId,
  ExportQualityId,
  PresetWallpaperId,
  RenderSpeedId,
  SampleRateId,
  StudioSettings,
  AutoSaveStatus,
} from '../types';
import { autoSaveManager } from '../audio/autoSaveManager';
import {
  EXPORT_QUALITY_OPTIONS,
  PRESET_WALLPAPERS,
  RENDER_SPEED_OPTIONS,
  SAMPLE_RATE_OPTIONS,
  THEME_OPTIONS,
  saveStudioSettings,
  DEFAULT_STUDIO_SETTINGS,
} from '../audio/settingsStorage';
import { AUTO_MIX_PRESETS } from '../audio/autoMixEngine';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: StudioSettings;
  onUpdateSettings: (newSettings: StudioSettings) => void;
  onOpenAutoMixModal: () => void;
  onOpenOptimizer?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onOpenAutoMixModal,
  onOpenOptimizer,
}) => {
  const currentSettings: StudioSettings = settings || DEFAULT_STUDIO_SETTINGS;
  const [activeTab, setActiveTab] = useState<'ui' | 'audio' | 'automix'>('ui');
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>(() => autoSaveManager.getStatus());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const unsub = autoSaveManager.subscribe(setAutoSaveStatus);
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const triggerToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleFieldChange = <K extends keyof StudioSettings>(key: K, value: StudioSettings[K]) => {
    const updated = { ...currentSettings, [key]: value };
    onUpdateSettings(updated);
    saveStudioSettings(updated);
    triggerToast('Setting saved & persisted to localStorage');
  };

  // Custom Wallpaper Upload Handler (via base64 DataURL)
  const handleWallpaperUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WebP, etc.)');
      return;
    }

    // Compress/resize if very large to ensure it fits in localStorage
    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result as string;
      if (result) {
        const updated: StudioSettings = {
          ...currentSettings,
          backgroundType: 'custom',
          customWallpaperUrl: result,
        };
        onUpdateSettings(updated);
        saveStudioSettings(updated);
        triggerToast('Custom studio wallpaper loaded!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetDefaults = () => {
    if (confirm('Reset all Studio Settings to factory defaults?')) {
      onUpdateSettings(DEFAULT_STUDIO_SETTINGS);
      saveStudioSettings(DEFAULT_STUDIO_SETTINGS);
      triggerToast('Reset to factory defaults');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950 font-bold">
              <Settings className="w-5 h-5 text-slate-950 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Studio Settings &amp; Preferences
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  OFFLINE LOCALSTORAGE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans">
                Customize interface themes, custom studio wallpapers, Web Audio engine buffers &amp; export quality.
              </p>
            </div>
          </div>

          <button
            id="btn-close-settings-modal"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center px-4 sm:px-6 border-b border-slate-800 bg-slate-950/60 text-xs font-semibold">
          <button
            id="tab-settings-ui"
            onClick={() => setActiveTab('ui')}
            className={`flex items-center gap-2 py-3.5 px-3 border-b-2 transition cursor-pointer ${
              activeTab === 'ui'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>UI &amp; Background Themes</span>
          </button>

          <button
            id="tab-settings-audio"
            onClick={() => setActiveTab('audio')}
            className={`flex items-center gap-2 py-3.5 px-3 border-b-2 transition cursor-pointer ${
              activeTab === 'audio'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Export &amp; Audio Engine</span>
          </button>

          <button
            id="tab-settings-automix"
            onClick={() => setActiveTab('automix')}
            className={`flex items-center gap-2 py-3.5 px-3 border-b-2 transition cursor-pointer ${
              activeTab === 'automix'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Auto-Mix Defaults</span>
          </button>
        </div>

        {/* Notification Toast */}
        {saveToast && (
          <div className="mx-4 mt-3 px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono flex items-center gap-2 animate-fade-in shadow-lg">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{saveToast}</span>
          </div>
        )}

        {/* Tab Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* TAB 1: UI & BACKGROUND THEMES */}
          {activeTab === 'ui' && (
            <div className="space-y-6">
              {/* Theme Selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
                    <Palette className="w-4 h-4 text-cyan-400" />
                    Interface Color Palette &amp; Contrast
                  </label>
                  <span className="font-mono text-[10px] text-cyan-400 font-bold">
                    Active: {THEME_OPTIONS.find(t => t.id === currentSettings.theme)?.name}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {THEME_OPTIONS.map(theme => {
                    const isSelected = currentSettings.theme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        id={`theme-btn-${theme.id}`}
                        onClick={() => handleFieldChange('theme', theme.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                          isSelected
                            ? 'border-cyan-400 bg-slate-800/80 ring-2 ring-cyan-400/40 shadow-lg shadow-cyan-950/50'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/60 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-white text-xs">{theme.name}</span>
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-inner"
                              style={{ backgroundColor: theme.accentHex }}
                            />
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {theme.tagline}
                          </p>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                          <span className="text-slate-500">{theme.badge}</span>
                          {isSelected && (
                            <span className="text-cyan-400 font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Selected
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wallpaper & Studio Environment */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                    Studio Background Atmosphere &amp; Wallpapers
                  </label>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <button
                      onClick={() => handleFieldChange('backgroundType', 'none')}
                      className={`px-2.5 py-1 rounded-md border transition cursor-pointer ${
                        currentSettings.backgroundType === 'none'
                          ? 'bg-slate-800 border-cyan-400 text-cyan-300 font-bold'
                          : 'border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Plain Minimal
                    </button>
                    <button
                      onClick={() => handleFieldChange('backgroundType', 'preset')}
                      className={`px-2.5 py-1 rounded-md border transition cursor-pointer ${
                        currentSettings.backgroundType === 'preset'
                          ? 'bg-slate-800 border-cyan-400 text-cyan-300 font-bold'
                          : 'border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Preset Studio
                    </button>
                    <button
                      onClick={() => handleFieldChange('backgroundType', 'custom')}
                      className={`px-2.5 py-1 rounded-md border transition cursor-pointer ${
                        currentSettings.backgroundType === 'custom'
                          ? 'bg-slate-800 border-cyan-400 text-cyan-300 font-bold'
                          : 'border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Custom Upload
                    </button>
                  </div>
                </div>

                {/* Preset Wallpapers Picker */}
                {currentSettings.backgroundType === 'preset' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    {PRESET_WALLPAPERS.map(wp => {
                      const isSelected = currentSettings.presetWallpaper === wp.id;
                      return (
                        <button
                          key={wp.id}
                          id={`preset-wallpaper-${wp.id}`}
                          onClick={() => handleFieldChange('presetWallpaper', wp.id)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                            isSelected
                              ? 'border-cyan-400 ring-2 ring-cyan-400/40'
                              : 'border-slate-800 hover:border-slate-700'
                          }`}
                          style={{ background: wp.gradientCss }}
                        >
                          <div className="relative z-10 bg-slate-950/70 p-2 rounded-lg backdrop-blur-xs border border-white/10">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-white text-xs">{wp.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                            </div>
                            <p className="text-[10px] text-slate-300 line-clamp-2">
                              {wp.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Custom Image Upload Zone */}
                {currentSettings.backgroundType === 'custom' && (
                  <div className="space-y-3 pt-1">
                    <div
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        e.preventDefault();
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleWallpaperUpload(e.dataTransfer.files[0]);
                        }
                      }}
                      className="p-5 border-2 border-dashed border-slate-700 hover:border-cyan-400 rounded-xl bg-slate-950/50 flex flex-col items-center justify-center text-center transition cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-6 h-6 text-cyan-400 mb-2" />
                      <p className="font-bold text-white text-xs">
                        Click or Drag &amp; Drop custom studio wallpaper
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Supports high-resolution PNG, JPG, WebP. Stored securely in your offline browser cache.
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            handleWallpaperUpload(e.target.files[0]);
                          }
                        }}
                      />
                    </div>

                    {currentSettings.customWallpaperUrl && (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="flex items-center gap-3">
                          <img
                            src={currentSettings.customWallpaperUrl}
                            alt="Custom Wallpaper Thumbnail"
                            className="w-12 h-8 rounded object-cover border border-slate-700"
                          />
                          <div>
                            <span className="font-bold text-white block text-xs">Active Custom Image</span>
                            <span className="text-[10px] text-emerald-400 font-mono">Loaded in offline storage</span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            handleFieldChange('customWallpaperUrl', null);
                            handleFieldChange('backgroundType', 'none');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-semibold border border-rose-500/40 cursor-pointer"
                        >
                          Remove Image
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Opacity & Blur Sliders (when background is active) */}
                {currentSettings.backgroundType !== 'none' && (
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          Wallpaper Opacity
                        </span>
                        <span className="font-mono text-cyan-300 font-bold">
                          {Math.round(currentSettings.wallpaperOpacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={currentSettings.wallpaperOpacity}
                        onChange={e => handleFieldChange('wallpaperOpacity', parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                          Glass Blur Effect
                        </span>
                        <span className="font-mono text-cyan-300 font-bold">
                          {currentSettings.wallpaperBlur}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="24"
                        step="2"
                        value={currentSettings.wallpaperBlur}
                        onChange={e => handleFieldChange('wallpaperBlur', parseInt(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: EXPORT & AUDIO ENGINE */}
          {activeTab === 'audio' && (
            <div className="space-y-6">
              {/* Performance & Loading Optimizer Shortcut Banner */}
              {onOpenOptimizer && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-violet-950/40 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Live Performance &amp; Loading Optimizer</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
                          DSP Turbo
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Tune live audio buffer frames (128-1024), toggle Eco battery mode, and purge inactive audio RAM cache.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenOptimizer();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
                  >
                    <span>Launch Optimizer</span>
                  </button>
                </div>
              )}

              {/* Auto-Save & Crash Prevention in IndexedDB */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-cyan-950/40 border border-emerald-500/30 space-y-3 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <Save className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <span>IndexedDB Auto-Save &amp; Parameter Snapshots</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                          Every 60s
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Automatically persists current stems, audio buffers, and parameter undo/redo history to prevent data loss during browser crashes.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const ok = await autoSaveManager.triggerImmediateSave();
                        if (ok) triggerToast('Project state & snapshots saved to IndexedDB!');
                      }}
                      disabled={autoSaveStatus.isSaving}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{autoSaveStatus.isSaving ? 'Saving...' : 'Save Snapshot Now'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">INTERVAL</span>
                    <span className="font-bold text-white">60 Seconds</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">STATUS</span>
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">NEXT AUTO-SAVE</span>
                    <span className="font-bold text-cyan-300">
                      {autoSaveStatus.secondsUntilNextSave}s
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">SNAPSHOTS STORED</span>
                    <span className="font-bold text-purple-400">
                      {autoSaveStatus.snapshotCount} states
                    </span>
                  </div>
                </div>
              </div>

              {/* Export Quality Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-cyan-400" />
                    Default Export Quality &amp; Format
                  </label>
                  <span className="font-mono text-[10px] text-slate-400">
                    Offline Web Audio PCM &amp; MP3 Exporter
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {EXPORT_QUALITY_OPTIONS.map(opt => {
                    const isSelected = currentSettings.exportQuality === opt.id;
                    return (
                      <button
                        key={opt.id}
                        id={`export-opt-${opt.id}`}
                        onClick={() => handleFieldChange('exportQuality', opt.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-950/30 ring-2 ring-cyan-400/40 shadow-lg'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-white text-xs">{opt.name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-cyan-300 border border-slate-750">
                              {opt.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {opt.description}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>{opt.bitDepthText}</span>
                          <span>{opt.bitrateKbps} kbps</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Render Speed & Buffer Size */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    Offline Audio Context Render Speed &amp; Buffer Size
                  </label>
                  <span className="font-mono text-[10px] text-emerald-400">
                    Oversampling Anti-Aliasing
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {RENDER_SPEED_OPTIONS.map(opt => {
                    const isSelected = currentSettings.renderSpeed === opt.id;
                    return (
                      <button
                        key={opt.id}
                        id={`render-speed-${opt.id}`}
                        onClick={() => handleFieldChange('renderSpeed', opt.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-950/30 ring-2 ring-cyan-400/40 shadow-lg'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-white text-xs">{opt.name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-amber-300">
                              {opt.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed mb-2">
                            {opt.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 font-mono text-[10px] text-slate-400 space-y-1">
                          <div className="flex justify-between">
                            <span>Buffer Size:</span>
                            <strong className="text-white">{opt.bufferSize} samples</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Oversampling:</span>
                            <strong className="text-cyan-300">{opt.oversampling}</strong>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sample Rate Selector */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-white block text-xs">Audio Engine Target Sample Rate</span>
                  <p className="text-[10px] text-slate-400">
                    Defines the native frequency resolution of the Web Audio offline context during bounce.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {SAMPLE_RATE_OPTIONS.map(sr => (
                    <button
                      key={sr.id}
                      onClick={() => handleFieldChange('sampleRate', sr.id)}
                      className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold border transition cursor-pointer ${
                        currentSettings.sampleRate === sr.id
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                          : 'bg-slate-900 text-slate-300 border-slate-750 hover:border-slate-600'
                      }`}
                    >
                      {sr.tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUTO-MIX DEFAULTS */}
          {activeTab === 'automix' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-950 to-slate-950 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950">
                    <Flame className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Launch AI Auto-Mix Immediately</h3>
                    <p className="text-[11px] text-slate-400">
                      Run the offline mastering DSP chain on your active vocal and beat tracks now.
                    </p>
                  </div>
                </div>

                <button
                  id="btn-settings-open-automix"
                  onClick={() => {
                    onClose();
                    onOpenAutoMixModal();
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold transition shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <Flame className="w-4 h-4 fill-current text-slate-950" />
                  <span>Open Auto-Mix Studio</span>
                </button>
              </div>

              {/* Default Preset Dropdown */}
              <div className="space-y-2">
                <label className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  Default Mastering Preset on Startup
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.keys(AUTO_MIX_PRESETS).map(pId => {
                    const p = AUTO_MIX_PRESETS[pId as keyof typeof AUTO_MIX_PRESETS];
                    const isSelected = currentSettings.defaultAutoMixPreset === pId;
                    return (
                      <button
                        key={pId}
                        onClick={() => handleFieldChange('defaultAutoMixPreset', pId)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40 text-white'
                            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`font-bold ${isSelected ? 'text-amber-300' : 'text-slate-300'}`}>
                            {p.name}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-1">
                          {p.tagline} &bull; {p.targetLufs} LUFS
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Default Target Stem */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-white block text-xs">Default Target Stem Source</span>
                  <p className="text-[10px] text-slate-400">
                    Which audio buffer is selected by default when triggering one-click Auto-Mix.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {(['full_mix', 'vocal', 'beat'] as const).map(stem => (
                    <button
                      key={stem}
                      onClick={() => handleFieldChange('defaultAutoMixStem', stem)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        currentSettings.defaultAutoMixStem === stem
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-900 text-slate-300 border-slate-750 hover:border-slate-600'
                      }`}
                    >
                      {stem === 'full_mix' ? 'Full Mix' : stem === 'vocal' ? 'Vocal Stem' : 'Beat Stem'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-xs font-medium transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Factory Defaults</span>
          </button>

          <button
            id="btn-settings-done"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
