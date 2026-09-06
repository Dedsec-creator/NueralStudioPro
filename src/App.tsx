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
  SynergyPocketSettings,
  TrackStemInfo,
  TuningSettings,
} from './types';
import { audioEngine } from './audio/audioEngine';
import { DEFAULT_PRESET, FACTORY_ARTIST_PRESETS } from './audio/presets';
import { Header, StudioSectionId } from './components/Header';
import { OfflineIndicator } from './components/OfflineIndicator';
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

export default function App() {
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
  const [activeSection, setActiveSection] = useState<StudioSectionId>('presets');
  const [activePreset, setActivePreset] = useState<ArtistVocalPreset>(FACTORY_ARTIST_PRESETS[0]);

  // Subscribe to audio engine track and synergy events
  useEffect(() => {
    const unsubTracks = audioEngine.subscribeTracks(setTracks);
    const unsubSynergy = audioEngine.subscribeSynergy(setSynergySettings);
    return () => {
      unsubTracks();
      unsubSynergy();
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

  // Transport Handlers
  const handlePlayToggle = async () => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      await audioEngine.play();
      setIsPlaying(true);
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

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    audioEngine.seek(time);
  };

  const handleApplyPreset = (preset: ArtistVocalPreset) => {
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

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Offline PWA Indicator Banner */}
      <OfflineIndicator />

      {/* Global Studio Top Section Bar Navigation */}
      <Header
        onOpenPresetsModal={() => setIsPresetModalOpen(true)}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        latencyMs={audioMetrics.latencyMs}
        activePreset={activePreset}
        quickPresets={FACTORY_ARTIST_PRESETS.slice(0, 8)}
        onQuickApplyPreset={handleApplyPreset}
      />

      {/* Main Studio Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 space-y-5 pb-32">
        {/* Audio Waveform & Transport Deck (Dual Vocal + Beat Stems) */}
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
        />

        {/* Section View Switching (Toggled via the Top Section Bar) */}
        <div className="space-y-5">
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
              />
            </div>
          )}

          {/* Section 1: Antares Tuning Dial & Real-Time Pitch Tracking */}
          {(activeSection === 'tuning' || activeSection === 'all') && (
            <div className="space-y-5">
              <TuningDial
                settings={tuningSettings}
                onChange={setTuningSettings}
                pitchData={pitchData}
              />

              <PitchVisualizer pitchData={pitchData} />
            </div>
          )}

          {/* Section 1.5: Dedicated Pitch Shifter & Formant Resonator Processor */}
          {(activeSection === 'pitch_formant' || activeSection === 'all') && (
            <div className={activeSection === 'all' ? 'border-b border-slate-800/80 pb-6' : ''}>
              <PitchFormantSection
                settings={pitchFormantSettings}
                onChange={setPitchFormantSettings}
              />
            </div>
          )}

          {/* Section 1.8: Pro Vocal AI Enhancer & De-Harsh Chain */}
          {(activeSection === 'ai_enhancer' || activeSection === 'all') && (
            <div className={activeSection === 'all' ? 'border-b border-slate-800/80 pb-6' : ''}>
              <AIEnhancer
                settings={aiEnhancerSettings}
                onChange={setAiEnhancerSettings}
              />
            </div>
          )}

          {/* Section 2: Virtual Mic Locker & Vocal-Beat Synergy / Noise / Alignment */}
          {(activeSection === 'mic' || activeSection === 'all') && (
            <div className="space-y-5">
              <MicLocker
                settings={micSettings}
                onChange={setMicSettings}
              />

              <DenoiseAndAlign
                denoiseSettings={denoiseSettings}
                onDenoiseChange={setDenoiseSettings}
                alignSettings={alignSettings}
                onAlignChange={setAlignSettings}
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
                onChange={setPlugins}
              />
            </div>
          )}

          {/* Section 4: Vocal & Mixdown Mastering Suite */}
          {(activeSection === 'mastering' || activeSection === 'all') && (
            <div>
              <MasteringSuite
                settings={masteringSettings}
                onChange={setMasteringSettings}
                metrics={audioMetrics}
              />
            </div>
          )}

          {/* Section 5: Studio Asset & Render Library */}
          {(activeSection === 'library' || activeSection === 'all') && (
            <div>
              <LibrarySection
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
        onTogglePlay={handlePlayToggle}
        onStop={handleStop}
        onToggleMic={handleMicToggle}
        onOpenPitchFormant={() => setActiveSection('pitch_formant')}
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

      {/* Studio Footer Status Bar */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 px-4 py-2.5 text-[11px] font-mono text-slate-400 pb-20 sm:pb-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              DSP Graph Active
            </span>
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
            <span>Sample Rate: 48kHz 32-bit</span>
            <span>&bull;</span>
            <span>PWA Offline-Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
