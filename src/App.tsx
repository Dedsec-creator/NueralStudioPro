/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ArtistVocalPreset,
  AudioMetrics,
  AutoAlignSettings,
  DenoiseSettings,
  MasteringSettings,
  MicLockerSettings,
  ModularPlugin,
  PitchTrackData,
  PitchFormantSettings,
  ProVocalAIEnhancerSettings,
  RecordingStatus,
  SynergyPocketSettings,
  TrackStemInfo,
  TuningSettings,
  StudioSettings,
  AutoSaveStatus,
} from './types';
import { audioEngine } from './audio/audioEngine';
import { DEFAULT_PRESET, FACTORY_ARTIST_PRESETS } from './audio/presets';
import { Header, StudioSectionId } from './components/Header';
import { WaveformTimeline } from './components/WaveformTimeline';
import { TuningDial } from './components/TuningDial';
import { PitchVisualizer } from './components/PitchVisualizer';
import { PitchFormantSection } from './components/PitchFormantSection';
import { AIEnhancer } from './components/AIEnhancer';
import { MicLocker } from './components/MicLocker';
import { DenoiseAndAlign } from './components/DenoiseAndAlign';
import { ModularPluginRack } from './components/ModularPluginRack';
import { MasteringSuite } from './components/MasteringSuite';
import { LibrarySection } from './components/LibrarySection';
import { PresetManagerModal } from './components/PresetManagerModal';
import { PresetsSection } from './components/PresetsSection';
import { BottomTransportDock } from './components/BottomTransportDock';
import { LiveRecordingHUD } from './components/LiveRecordingHUD';
import { SettingsModal } from './components/SettingsModal';
import { AutoMixModal } from './components/AutoMixModal';
import { AutoPresetBeatMixModal } from './components/AutoPresetBeatMixModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { PerformanceOptimizerModal } from './components/PerformanceOptimizerModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { launchGooglePicker } from './services/googlePickerService';
import {
  DEFAULT_STUDIO_SETTINGS,
  loadStudioSettings,
  PRESET_WALLPAPERS,
  THEME_OPTIONS,
} from './audio/settingsStorage';
import { historyManager, HistoryStatus } from './audio/historyManager';
import { getDatabaseStorageStats } from './audio/assetStorage';
import { autoSaveManager } from './audio/autoSaveManager';

export default function App() {
  // Studio Settings State (Theme, Wallpapers, Export Quality, Buffers)
  const [studioSettings, setStudioSettings] = useState<StudioSettings>(() => {
    try {
      return loadStudioSettings();
    } catch {
      return { ...DEFAULT_STUDIO_SETTINGS };
    }
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAutoMixModalOpen, setIsAutoMixModalOpen] = useState(false);
  const [isAutoPresetBeatMixModalOpen, setIsAutoPresetBeatMixModalOpen] = useState(false);

  // Master Studio State
  const [tuningSettings, setTuningSettings] = useState<TuningSettings>(DEFAULT_PRESET.tuning);
  const [micSettings, setMicSettings] = useState<MicLockerSettings>(DEFAULT_PRESET.mic);
  const [denoiseSettings, setDenoiseSettings] = useState<DenoiseSettings>(DEFAULT_PRESET.denoise);
  const [alignSettings, setAlignSettings] = useState<AutoAlignSettings>(DEFAULT_PRESET.align);
  const [plugins, setPlugins] = useState<ModularPlugin[]>(DEFAULT_PRESET.plugins);
  const [masteringSettings, setMasteringSettings] = useState<MasteringSettings>(DEFAULT_PRESET.mastering);
  const [pitchFormantSettings, setPitchFormantSettings] = useState<PitchFormantSettings>(audioEngine.pitchFormantSettings);
  const [aiEnhancerSettings, setAiEnhancerSettings] = useState<ProVocalAIEnhancerSettings>(
    DEFAULT_PRESET.aiEnhancer || audioEngine.aiEnhancerSettings
  );

  // Audio Playback & Telemetry State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiveMic, setIsLiveMic] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bpm, setBpm] = useState(128);
  const [pitchData, setPitchData] = useState<PitchTrackData | null>(null);
  const [audioMetrics, setAudioMetrics] = useState<AudioMetrics>({
    lufs: -14.2,
    outputRmsDb: -18.4,
    peakDb: -0.8,
    gainReductionDb: 2.1,
    latencyMs: 3.8,
    dspLoadPercent: 12,
  });

  // Dual Track Stems State (Vocals + Beat)
  const [tracks, setTracks] = useState<{ vocal: TrackStemInfo; beat: TrackStemInfo }>({
    vocal: audioEngine.vocalTrackInfo,
    beat: audioEngine.beatTrackInfo,
  });

  // Vocal-Beat Synergy & Alignment State
  const [synergySettings, setSynergySettings] = useState<SynergyPocketSettings>(audioEngine.synergySettings);

  // UI Modals, Active Preset & Top Section Bar State
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isGoogleDriveModalOpen, setIsGoogleDriveModalOpen] = useState(false);
  const [isOptimizerModalOpen, setIsOptimizerModalOpen] = useState(false);
  const [googleDriveTargetTrack, setGoogleDriveTargetTrack] = useState<'vocal' | 'beat'>('beat');
  const [activeSection, setActiveSection] = useState<StudioSectionId>('presets');
  const [activePreset, setActivePreset] = useState<ArtistVocalPreset>(FACTORY_ARTIST_PRESETS[0]);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>(audioEngine.getRecordingStatus());

  // Undo / Redo History State
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>(historyManager.getStatus());

  // 60-Second Auto-Save State (IndexedDB)
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>(() => autoSaveManager.getStatus());
  const [sessionRecoveryNotice, setSessionRecoveryNotice] = useState<{
    snapshotCount: number;
    savedTime: number;
  } | null>(null);

  // Persistent Database & Library Stats (Stored in IndexedDB)
  const [databaseStats, setDatabaseStats] = useState<{ assetCount: number; hasActiveSession: boolean }>({
    assetCount: 0,
    hasActiveSession: false,
  });

  // Persistent Session Restoration from IndexedDB, AutoSave 60s Initialization, and History
  useEffect(() => {
    let isMounted = true;

    const refreshStats = async () => {
      try {
        const stats = await getDatabaseStorageStats();
        if (isMounted) {
          setDatabaseStats({
            assetCount: stats.assetCount,
            hasActiveSession: stats.hasActiveSession,
          });
        }
      } catch {}
    };

    refreshStats();
    const unsubLibrary = audioEngine.subscribeLibrary(() => {
      refreshStats();
    });

    const unsubHistory = historyManager.subscribe((status) => {
      if (isMounted) setHistoryStatus(status);
    });

    // Initialize 60-second auto-save to IndexedDB
    autoSaveManager.init(60);
    const unsubAutoSave = autoSaveManager.subscribe((status) => {
      if (isMounted) setAutoSaveStatus(status);
    });

    // Restore persistent session if available from IndexedDB
    audioEngine.restoreSessionFromDB().then((restored) => {
      if (!isMounted) return;
      if (restored) {
        if (restored.tuningSettings) setTuningSettings(restored.tuningSettings);
        if (restored.micSettings) setMicSettings(restored.micSettings);
        if (restored.denoiseSettings) setDenoiseSettings(restored.denoiseSettings);
        if (restored.alignSettings) setAlignSettings(restored.alignSettings);
        if (restored.plugins) setPlugins(restored.plugins);
        if (restored.masteringSettings) setMasteringSettings(restored.masteringSettings);
        if (restored.pitchFormantSettings) setPitchFormantSettings(restored.pitchFormantSettings);
        if (restored.aiEnhancerSettings) setAiEnhancerSettings(restored.aiEnhancerSettings);
        if (restored.synergySettings) setSynergySettings(restored.synergySettings);
        if (restored.bpm) setBpm(restored.bpm);

        setTracks({
          vocal: audioEngine.vocalTrackInfo,
          beat: audioEngine.beatTrackInfo,
        });
        setDuration(audioEngine.getDuration());

        if (restored.snapshots && restored.snapshots.length > 0) {
          setSessionRecoveryNotice({
            snapshotCount: restored.snapshots.length,
            savedTime: restored.lastSaved,
          });
        } else {
          historyManager.init({
            tuningSettings: restored.tuningSettings || DEFAULT_PRESET.tuning,
            micSettings: restored.micSettings || DEFAULT_PRESET.mic,
            denoiseSettings: restored.denoiseSettings || DEFAULT_PRESET.denoise,
            alignSettings: restored.alignSettings || DEFAULT_PRESET.align,
            plugins: restored.plugins || DEFAULT_PRESET.plugins,
            masteringSettings: restored.masteringSettings || DEFAULT_PRESET.mastering,
            pitchFormantSettings: restored.pitchFormantSettings || audioEngine.pitchFormantSettings,
            aiEnhancerSettings: restored.aiEnhancerSettings || audioEngine.aiEnhancerSettings,
            activePresetId: DEFAULT_PRESET.id,
            activePresetName: DEFAULT_PRESET.name,
          });
        }
      } else {
        historyManager.init({
          tuningSettings,
          micSettings,
          denoiseSettings,
          alignSettings,
          plugins,
          masteringSettings,
          pitchFormantSettings,
          aiEnhancerSettings,
          activePresetId: activePreset.id,
          activePresetName: activePreset.name,
        });
      }
      refreshStats();
    });

    return () => {
      isMounted = false;
      unsubLibrary();
      unsubHistory();
      unsubAutoSave();
    };
  }, []);

  // Subscribe to audio engine track, synergy, and recording events
  useEffect(() => {
    const unsubTracks = audioEngine.subscribeTracks(setTracks);
    const unsubSynergy = audioEngine.subscribeSynergy(setSynergySettings);
    const unsubRecord = audioEngine.subscribeRecordingStatus(setRecordingStatus);
    return () => {
      unsubTracks();
      unsubSynergy();
      unsubRecord();
    };
  }, []);

  // Push updates to Audio Engine whenever state changes
  useEffect(() => {
    audioEngine.updateTuningSettings(tuningSettings);
  }, [tuningSettings]);

  useEffect(() => {
    audioEngine.updatePitchFormantSettings(pitchFormantSettings);
  }, [pitchFormantSettings]);

  useEffect(() => {
    audioEngine.updateMicSettings(micSettings);
  }, [micSettings]);

  useEffect(() => {
    audioEngine.updateDenoiseSettings(denoiseSettings);
  }, [denoiseSettings]);

  useEffect(() => {
    audioEngine.updateAlignSettings(alignSettings);
  }, [alignSettings]);

  useEffect(() => {
    audioEngine.updateMasteringSettings(masteringSettings);
  }, [masteringSettings]);

  useEffect(() => {
    audioEngine.updatePlugins(plugins);
  }, [plugins]);

  // Subscribe to real-time pitch detection & audio metrics from engine
  useEffect(() => {
    const unsubPitch = audioEngine.onPitchData(data => {
      setPitchData(data);
    });

    const unsubMetrics = audioEngine.onMetrics(metrics => {
      setAudioMetrics(metrics);
    });

    const unsubTime = audioEngine.onTime((time, dur) => {
      setCurrentTime(time);
      if (dur > 0) setDuration(dur);
    });

    return () => {
      unsubPitch();
      unsubMetrics();
      unsubTime();
    };
  }, []);

  // Screen Wake Lock & Background Execution Protection
  // Keeps browser audio thread & state alive without sleeping/reloading during file browsing or DSP processing
  useEffect(() => {
    let wakeLockSentinel: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && (navigator as any).wakeLock) {
          wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        }
      } catch {
        // WakeLock may fail if tab not active, ignore safely
      }
    };

    requestWakeLock();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLockSentinel && typeof wakeLockSentinel.release === 'function') {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, []);

  // Google Drive & Google Picker Handlers
  const handleOpenGoogleDrive = (targetTrack: 'vocal' | 'beat' = 'beat') => {
    setGoogleDriveTargetTrack(targetTrack);
    setIsGoogleDriveModalOpen(true);
  };

  const handleOpenGooglePicker = async (targetTrack: 'vocal' | 'beat' = 'beat') => {
    try {
      await launchGooglePicker({
        targetTrack,
        title: `Select ${targetTrack === 'vocal' ? 'Vocal Stem' : 'Beat Track'} - NeuralTune Studio`,
        onStemLoaded: (trackType, fileName) => {
          handleGoogleDriveStemLoaded(trackType as 'vocal' | 'beat', fileName);
        },
      });
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        // Fall back to opening the full Drive modal
        handleOpenGoogleDrive(targetTrack);
      }
    }
  };

  const handleGoogleDriveStemLoaded = (trackType: 'vocal' | 'beat', _fileName: string) => {
    setTracks({
      vocal: audioEngine.vocalTrackInfo,
      beat: audioEngine.beatTrackInfo,
    });
    setDuration(audioEngine.getDuration());
    if (trackType === 'beat') {
      setBpm(audioEngine.synergySettings.detectedBeatBpm);
    }
  };

  // Transport Handlers
  const handlePlayToggle = async () => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      await audioEngine.play();
      setIsPlaying(audioEngine.getIsPlaying());
    }
  };

  const handleStop = () => {
    audioEngine.stop();
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleMicToggle = async () => {
    try {
      const active = await audioEngine.toggleMicrophone();
      setIsLiveMic(active);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Microphone error: ${msg}`);
    }
  };

  // Recording Handlers
  const handleStartRecording = async (options?: {
    countInSeconds?: number;
    playBeat?: boolean;
    liveMonitoring?: boolean;
  }) => {
    try {
      await audioEngine.startRecording(options);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Recording Error: ${msg}`);
    }
  };

  const handleStopRecording = async () => {
    try {
      const take = await audioEngine.stopRecording();
      if (take) {
        setTracks({
          vocal: audioEngine.vocalTrackInfo,
          beat: audioEngine.beatTrackInfo,
        });
        setDuration(audioEngine.getDuration());
      }
    } catch (err: unknown) {
      console.warn('Error stopping recording:', err);
    }
  };

  const handleCancelRecording = () => {
    audioEngine.cancelRecording();
  };

  const handleToggleRecord = async () => {
    if (recordingStatus.isRecording || recordingStatus.isCountingIn) {
      await handleStopRecording();
    } else {
      await handleStartRecording({ countInSeconds: 0, playBeat: true });
    }
  };

  // Undo & Redo Handlers
  const handleUndo = () => {
    const prevState = historyManager.undo();
    if (!prevState) return;
    setTuningSettings(prevState.tuningSettings);
    setMicSettings(prevState.micSettings);
    setDenoiseSettings(prevState.denoiseSettings);
    setAlignSettings(prevState.alignSettings);
    setPlugins(prevState.plugins);
    setMasteringSettings(prevState.masteringSettings);
    setPitchFormantSettings(prevState.pitchFormantSettings);
    setAiEnhancerSettings(prevState.aiEnhancerSettings);
    if (prevState.activePresetId) {
      const match = FACTORY_ARTIST_PRESETS.find(p => p.id === prevState.activePresetId);
      if (match) setActivePreset(match);
    }
  };

  const handleRedo = () => {
    const nextState = historyManager.redo();
    if (!nextState) return;
    setTuningSettings(nextState.tuningSettings);
    setMicSettings(nextState.micSettings);
    setDenoiseSettings(nextState.denoiseSettings);
    setAlignSettings(nextState.alignSettings);
    setPlugins(nextState.plugins);
    setMasteringSettings(nextState.masteringSettings);
    setPitchFormantSettings(nextState.pitchFormantSettings);
    setAiEnhancerSettings(nextState.aiEnhancerSettings);
    if (nextState.activePresetId) {
      const match = FACTORY_ARTIST_PRESETS.find(p => p.id === nextState.activePresetId);
      if (match) setActivePreset(match);
    }
  };

  // Parameter Change Handlers with Undo/Redo History Recording
  const handleUpdateTuning = (tuning: TuningSettings) => {
    historyManager.pushSnapshot(
      {
        tuningSettings: tuning,
        micSettings,
        denoiseSettings,
        alignSettings,
        plugins,
        masteringSettings,
        pitchFormantSettings,
        aiEnhancerSettings,
        activePresetId: activePreset?.id,
        activePresetName: activePreset?.name,
      },
      'Tune Settings',
      350
    );
    setTuningSettings(tuning);
  };

  const handleUpdateMic = (mic: MicLockerSettings) => {
    historyManager.pushSnapshot(
      {
        tuningSettings,
        micSettings: mic,
        denoiseSettings,
        alignSettings,
        plugins,
        masteringSettings,
        pitchFormantSettings,
        aiEnhancerSettings,
        activePresetId: activePreset?.id,
        activePresetName: activePreset?.name,
      },
      'Mic Locker',
      350
    );
    setMicSettings(mic);
  };

  const handleUpdateDenoise = (denoise: DenoiseSettings) => {
    historyManager.pushSnapshot(
      {
        tuningSettings,
        micSettings,
        denoiseSettings: denoise,
        alignSettings,
        plugins,
        masteringSettings,
        pitchFormantSettings,
        aiEnhancerSettings,
        activePresetId: activePreset?.id,
        activePresetName: activePreset?.name,
      },
      'Denoise Settings',
      350
    );
    setDenoiseSettings(denoise);
  };

  const handleUpdateAlign = (align: AutoAlignSettings) => {
    historyManager.pushSnapshot(
      {
        tuningSettings,
        micSettings,
        denoiseSettings,
        alignSettings: align,
        plugins,
        masteringSettings,
        pitchFormantSettings,
        aiEnhancerSettings,
        activePresetId: activePreset?.id,
        activePresetName: activePreset?.name,
      },
      'Auto-Align Settings',
      350
    );
    setAlignSettings(align);
  };

  const handleUpdatePlugins = (newPlugins: ModularPlugin[]) => {
    historyManager.pushSnapshot(
      {
        tuningSettings,
        micSettings,
        denoiseSettings,
        alignSettings,
        plugins: newPlugins,
        masteringSettings,
        pitchFormantSettings,
        aiEnhancerSettings,
        activePresetId: activePreset?.id,
        activePresetName: activePreset?.name,
      },
      'Plugin Rack',
      350
    );
    setPlugins(newPlugins);
  };

  const handleUpdateMastering = (mastering: MasteringSettings) => {
    historyManager.pushSnapshot(
      {
        tuningSettings,
        micSettings,
        denoiseSettings,
        alignSettings,
        plugins,
        masteringSettings: mastering,
        pitchFormantSettings,
        aiEnhancerSettings,
        activePresetId: activePreset?.id,
        activePresetName: activePreset?.name,
      },
      'Mastering Suite',
      350
    );
    setMasteringSettings(mastering);
  };

  const handleUpdatePitchFormant = (pitchFormant: PitchFormantSettings) => {
    historyManager.pushSnapshot(
      {
        tuningSettings,
        micSettings,
        denoiseSettings,
        alignSettings,
        plugins,
        masteringSettings,
        pitchFormantSettings: pitchFormant,
        aiEnhancerSettings,
        activePresetId: activePreset?.id,
        activePresetName: activePreset?.name,
      },
      'Pitch & Formant',
      350
    );
    setPitchFormantSettings(pitchFormant);
  };

  const handleUpdateAiEnhancer = (aiEnhancer: ProVocalAIEnhancerSettings) => {
    historyManager.pushSnapshot(
      {
        tuningSettings,
        micSettings,
        denoiseSettings,
        alignSettings,
        plugins,
        masteringSettings,
        pitchFormantSettings,
        aiEnhancerSettings: aiEnhancer,
        activePresetId: activePreset?.id,
        activePresetName: activePreset?.name,
      },
      'AI Enhancer',
      350
    );
    setAiEnhancerSettings(aiEnhancer);
  };

  // Global Keyboard Shortcuts (Space: Play/Pause, R: Record/Stop, Esc: Cancel Record, ⌘Z: Undo, ⌘⇧Z: Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handlePlayToggle();
      } else if (e.code === 'KeyR' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handleToggleRecord();
      } else if (e.code === 'Escape') {
        if (recordingStatus.isRecording || recordingStatus.isCountingIn) {
          e.preventDefault();
          handleCancelRecording();
        }
      } else if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleRedo();
        } else if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          autoSaveManager.triggerImmediateSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recordingStatus, isPlaying, historyStatus]);

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    audioEngine.seek(time);
  };

  const handleApplyPreset = (preset: ArtistVocalPreset) => {
    historyManager.pushSnapshot(
      {
        tuningSettings: preset.tuning,
        micSettings: preset.mic,
        denoiseSettings: preset.denoise,
        alignSettings: preset.align,
        plugins: preset.plugins,
        masteringSettings: preset.mastering,
        pitchFormantSettings: preset.pitchFormant || pitchFormantSettings,
        aiEnhancerSettings: preset.aiEnhancer || aiEnhancerSettings,
        activePresetId: preset.id,
        activePresetName: preset.name,
      },
      `Apply ${preset.name} Preset`
    );
    setActivePreset(preset);
    setTuningSettings(preset.tuning);
    setMicSettings(preset.mic);
    setDenoiseSettings(preset.denoise);
    setAlignSettings(preset.align);
    setPlugins(preset.plugins);
    setMasteringSettings(preset.mastering);
    if (preset.pitchFormant) {
      setPitchFormantSettings(preset.pitchFormant);
      audioEngine.updatePitchFormantSettings(preset.pitchFormant);
    }
    if (preset.aiEnhancer) {
      setAiEnhancerSettings(preset.aiEnhancer);
      audioEngine.updateAIEnhancerSettings(preset.aiEnhancer);
    }
    audioEngine.applyFullPreset(preset);
  };

  const currentSettings = studioSettings || DEFAULT_STUDIO_SETTINGS;
  const activeTheme = THEME_OPTIONS.find(t => t.id === currentSettings.theme) || THEME_OPTIONS[0];
  const activeWallpaper = PRESET_WALLPAPERS.find(w => w.id === currentSettings.presetWallpaper);

  return (
    <div
      className={`min-h-screen ${activeTheme.bgClass} text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950 relative overflow-x-hidden`}
    >
      {/* Dynamic Background Wallpaper Layer */}
      {currentSettings.backgroundType === 'preset' && activeWallpaper && (
        <div
          className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-500"
          style={{
            background: activeWallpaper.gradientCss,
            opacity: currentSettings.wallpaperOpacity,
            filter: `blur(${currentSettings.wallpaperBlur}px)`,
          }}
        />
      )}

      {currentSettings.backgroundType === 'custom' && currentSettings.customWallpaperUrl && (
        <div
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center transition-opacity duration-500"
          style={{
            backgroundImage: `url(${currentSettings.customWallpaperUrl})`,
            opacity: currentSettings.wallpaperOpacity,
            filter: `blur(${currentSettings.wallpaperBlur}px)`,
          }}
        />
      )}

      {/* Global Studio Top Section Bar Navigation */}
      <Header
        onOpenPresetsModal={() => setIsPresetModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenAutoMixModal={() => setIsAutoMixModalOpen(true)}
        onOpenAutoPresetBeatMixModal={() => setIsAutoPresetBeatMixModalOpen(true)}
        onOpenGoogleDrive={() => handleOpenGoogleDrive('beat')}
        onOpenGooglePicker={() => handleOpenGooglePicker('beat')}
        onOpenOptimizer={() => setIsOptimizerModalOpen(true)}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        latencyMs={audioMetrics.latencyMs}
        dspLoadPercent={audioMetrics.dspLoadPercent}
        activePreset={activePreset}
        quickPresets={FACTORY_ARTIST_PRESETS.slice(0, 12)}
        onQuickApplyPreset={handleApplyPreset}
        canUndo={historyStatus.canUndo}
        canRedo={historyStatus.canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        lastActionLabel={historyStatus.lastAction}
        databaseStats={databaseStats}
        autoSaveStatus={autoSaveStatus}
        onTriggerAutoSave={() => autoSaveManager.triggerImmediateSave()}
      />

      {/* Auto-Save Crash Recovery Banner */}
      {sessionRecoveryNotice && (
        <div className="max-w-7xl mx-auto px-3 sm:px-5 pt-3">
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-cyan-950/80 border border-emerald-500/40 text-emerald-200 text-xs shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                <strong className="text-white font-semibold">Session Automatically Restored:</strong> Stems, DSP settings, and{' '}
                <strong className="text-emerald-300 font-mono">{sessionRecoveryNotice.snapshotCount} parameter snapshots</strong>{' '}
                were recovered from IndexedDB (saved {new Date(sessionRecoveryNotice.savedTime).toLocaleTimeString()}).
              </span>
            </div>
            <button
              onClick={() => setSessionRecoveryNotice(null)}
              className="text-slate-400 hover:text-white px-2 py-0.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition cursor-pointer text-[11px]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Studio Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 space-y-5 pb-40 sm:pb-32 relative z-10">
        {/* Section View Switching (Toggled via the Top Section Bar) */}
        <div className="space-y-5">
          {/* Section 00: Audio Waveform & Dual-Stem Tracks Deck */}
          {(activeSection === 'tracks' || activeSection === 'all') && (
            <div className={activeSection === 'all' ? 'border-b border-slate-800/80 pb-6' : ''}>
              <WaveformTimeline
                isPlaying={isPlaying}
                isLiveMic={isLiveMic}
                currentTime={currentTime}
                duration={duration}
                onPlayToggle={handlePlayToggle}
                onStop={handleStop}
                onMicToggle={handleMicToggle}
                onSeek={handleSeek}
                bpm={bpm}
                onBpmChange={setBpm}
                vocalTrack={tracks.vocal}
                beatTrack={tracks.beat}
                synergySettings={synergySettings}
                onSynergyChange={patch => audioEngine.updateSynergySettings(patch)}
                onOpenAutoMix={() => setIsAutoMixModalOpen(true)}
                onOpenDrive={track => handleOpenGoogleDrive(track)}
                onOpenPicker={track => handleOpenGooglePicker(track)}
                recordingStatus={recordingStatus}
                onToggleRecord={handleToggleRecord}
                canUndo={historyStatus.canUndo}
                canRedo={historyStatus.canRedo}
                onUndo={handleUndo}
                onRedo={handleRedo}
              />
            </div>
          )}

          {/* Section 0: Dedicated Artist Vocal Presets Library */}
          {(activeSection === 'presets' || activeSection === 'all') && (
            <div className={activeSection === 'all' ? 'border-b border-slate-800/80 pb-6' : ''}>
              <PresetsSection
                activePresetId={activePreset?.id}
                onApplyPreset={handleApplyPreset}
                currentPresetState={{
                  tuning: tuningSettings,
                  mic: micSettings,
                  denoise: denoiseSettings,
                  align: alignSettings,
                  plugins: plugins,
                  mastering: masteringSettings,
                  pitchFormant: pitchFormantSettings,
                  aiEnhancer: aiEnhancerSettings,
                }}
                onUpdateTuning={tuning => {
                  handleUpdateTuning(tuning);
                  audioEngine.updateTuningSettings(tuning);
                }}
                onUpdateMic={mic => {
                  handleUpdateMic(mic);
                  audioEngine.updateMicSettings(mic);
                }}
                onUpdatePitchFormant={formant => {
                  handleUpdatePitchFormant(formant);
                  audioEngine.updatePitchFormantSettings(formant);
                }}
                onUpdatePlugins={newPlugins => {
                  handleUpdatePlugins(newPlugins);
                  audioEngine.updateModularPlugins(newPlugins);
                }}
                onUpdateMastering={mastering => {
                  handleUpdateMastering(mastering);
                  audioEngine.updateMasteringSettings(mastering);
                }}
              />
            </div>
          )}

          {/* Section 1: Antares Tuning Dial & Real-Time Pitch Tracking */}
          {(activeSection === 'tuning' || activeSection === 'all') && (
            <div className="space-y-5">
              <TuningDial
                settings={tuningSettings}
                onChange={handleUpdateTuning}
                pitchData={pitchData}
                onAutoDetectKey={() => audioEngine.detectKeyFromAudio()}
              />

              <PitchVisualizer pitchData={pitchData} />
            </div>
          )}

          {/* Section 1.5: Dedicated Pitch Shifter & Formant Resonator Processor */}
          {(activeSection === 'pitch_formant' || activeSection === 'all') && (
            <div className={activeSection === 'all' ? 'border-b border-slate-800/80 pb-6' : ''}>
              <PitchFormantSection
                settings={pitchFormantSettings}
                onChange={handleUpdatePitchFormant}
              />
            </div>
          )}

          {/* Section 1.8: Pro Vocal AI Enhancer & De-Harsh Chain */}
          {(activeSection === 'ai_enhancer' || activeSection === 'all') && (
            <div className={activeSection === 'all' ? 'border-b border-slate-800/80 pb-6' : ''}>
              <AIEnhancer
                settings={aiEnhancerSettings}
                onChange={handleUpdateAiEnhancer}
              />
            </div>
          )}

          {/* Section 2: Virtual Mic Locker & Vocal-Beat Synergy / Noise / Alignment */}
          {(activeSection === 'mic' || activeSection === 'all') && (
            <div className="space-y-5">
              <MicLocker
                settings={micSettings}
                onChange={handleUpdateMic}
              />

              <DenoiseAndAlign
                denoiseSettings={denoiseSettings}
                onDenoiseChange={handleUpdateDenoise}
                alignSettings={alignSettings}
                onAlignChange={handleUpdateAlign}
                activeNoiseReductionDb={Math.round(audioMetrics.outputRmsDb < denoiseSettings.threshold ? denoiseSettings.reduction : 0)}
                synergySettings={synergySettings}
                onSynergyChange={patch => audioEngine.updateSynergySettings(patch)}
              />
            </div>
          )}

          {/* Section 3: Modular Insert Effect Rack */}
          {(activeSection === 'plugins' || activeSection === 'all') && (
            <div>
              <ModularPluginRack
                plugins={plugins}
                onChange={handleUpdatePlugins}
              />
            </div>
          )}

          {/* Section 4: Vocal & Mixdown Mastering Suite */}
          {(activeSection === 'mastering' || activeSection === 'all') && (
            <div>
              <MasteringSuite
                settings={masteringSettings}
                onChange={handleUpdateMastering}
                metrics={audioMetrics}
              />
            </div>
          )}

          {/* Section 5: Studio Asset & Render Library */}
          {(activeSection === 'library' || activeSection === 'all') && (
            <div>
              <LibrarySection
                onOpenGoogleDrive={() => handleOpenGoogleDrive('beat')}
                onTracksChanged={() => {
                  setTracks({
                    vocal: audioEngine.vocalTrackInfo,
                    beat: audioEngine.beatTrackInfo,
                  });
                  setDuration(audioEngine.getDuration());
                }}
              />
            </div>
          )}
        </div>
      </main>

      {/* Fixed Bottom Transport Dock with Scrubber, Skip Controls & Speed Sync */}
      <BottomTransportDock
        audioEngine={audioEngine}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        vocalTrack={tracks.vocal}
        beatTrack={tracks.beat}
        isLiveMicActive={isLiveMic}
        pitchFormantSettings={pitchFormantSettings}
        recordingStatus={recordingStatus}
        onTogglePlay={handlePlayToggle}
        onStop={handleStop}
        onToggleMic={handleMicToggle}
        onToggleRecord={handleToggleRecord}
        onOpenPitchFormant={() => setActiveSection('pitch_formant')}
        onOpenAutoMix={() => setIsAutoPresetBeatMixModalOpen(true)}
        canUndo={historyStatus.canUndo}
        canRedo={historyStatus.canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Floating Live Vocal Recording HUD Overlay */}
      <LiveRecordingHUD
        recordingStatus={recordingStatus}
        hasBeat={Boolean(tracks.beat.duration && tracks.beat.duration > 0)}
        onStopRecording={handleStopRecording}
        onCancelRecording={handleCancelRecording}
        onToggleMonitoring={() => audioEngine.toggleLiveMonitoring()}
      />

      {/* 1-Click AI Auto-Preset & Smart Beat-Vocal Sync Modal */}
      <AutoPresetBeatMixModal
        isOpen={isAutoPresetBeatMixModalOpen}
        onClose={() => setIsAutoPresetBeatMixModalOpen(false)}
        onPresetApplied={(preset) => {
          handleApplyPreset(preset);
          setTracks({
            vocal: { ...audioEngine.vocalTrackInfo },
            beat: { ...audioEngine.beatTrackInfo },
          });
          setSynergySettings({ ...audioEngine.synergySettings });
        }}
      />

      {/* Cloud Presets Modal */}
      <PresetManagerModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        onApplyPreset={handleApplyPreset}
        currentPresetState={{
          tuning: tuningSettings,
          mic: micSettings,
          denoise: denoiseSettings,
          align: alignSettings,
          plugins: plugins,
          mastering: masteringSettings,
        }}
      />

      {/* Modern Studio Settings Modal (Theme, Custom Wallpapers, Export Quality, Audio Buffers) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={currentSettings}
        onUpdateSettings={setStudioSettings}
        onOpenAutoMixModal={() => setIsAutoMixModalOpen(true)}
        onOpenOptimizer={() => setIsOptimizerModalOpen(true)}
      />

      {/* AI Auto-Mix Mastering Suite Modal */}
      <AutoMixModal
        isOpen={isAutoMixModalOpen}
        onClose={() => setIsAutoMixModalOpen(false)}
        studioSettings={currentSettings}
        initialPresetId={currentSettings.defaultAutoMixPreset}
        initialStemSource={currentSettings.defaultAutoMixStem}
        renderSpeed={currentSettings.renderSpeed}
        onApplyToMasterSuite={setMasteringSettings}
      />

      {/* Google Drive Integration Modal for Beat & Audio Stems */}
      <GoogleDriveModal
        isOpen={isGoogleDriveModalOpen}
        onClose={() => setIsGoogleDriveModalOpen(false)}
        initialTargetTrack={googleDriveTargetTrack}
        onStemLoaded={handleGoogleDriveStemLoaded}
      />

      {/* Studio Engine & Loading Optimizer Modal */}
      <PerformanceOptimizerModal
        isOpen={isOptimizerModalOpen}
        onClose={() => setIsOptimizerModalOpen(false)}
        currentLatencyMs={audioMetrics.latencyMs}
      />

      {/* Offline Connectivity Notification Indicator */}
      <OfflineIndicator />

      {/* Studio Footer Status Bar */}
      <footer className="hidden sm:block border-t border-slate-800/80 bg-slate-950/80 px-4 py-2.5 text-[11px] font-mono text-slate-400 pb-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOptimizerModalOpen(true)}
              className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
              title="Open Performance Optimizer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>DSP Graph Active ({audioMetrics.dspLoadPercent.toFixed(1)}%)</span>
            </button>
            <span className="hidden sm:inline">&bull;</span>
            <span className="hidden sm:inline text-slate-400">
              Mic Model: <strong className="text-white">{micSettings.selectedMic.toUpperCase()}</strong>
            </span>
            <span className="hidden sm:inline">&bull;</span>
            <span className="hidden sm:inline text-slate-400">
              Tune Key: <strong className="text-cyan-300">{tuningSettings.key} {tuningSettings.scale}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOptimizerModalOpen(true)}
              className="hover:text-cyan-300 transition cursor-pointer"
              title="Buffer & Sample Rate Settings"
            >
              Buffer: <span className="text-cyan-400 font-bold">{audioEngine.performanceConfig.bufferSize || 128} smp (Direct)</span>
            </button>
            <span>&bull;</span>
            <span>Sample Rate: 48kHz 32-bit</span>
            <span>&bull;</span>
            <span className="text-emerald-400 font-medium">Direct Stream (Online)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
