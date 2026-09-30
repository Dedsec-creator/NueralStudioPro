import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  FastForward,
  Flame,
  Gauge,
  Layers,
  Mic,
  Music,
  Pause,
  Play,
  Radio,
  Repeat,
  Rewind,
  RotateCcw,
  Sliders,
  Sparkles,
  Square,
  Trash2,
  Undo2,
  Redo2,
  Upload,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { audioEngine } from '../audio/audioEngine';
import { PocketRideStyle, RecordingStatus, SynergyPocketSettings, TrackStemInfo } from '../types';

interface WaveformTimelineProps {
  isPlaying: boolean;
  isLiveMic: boolean;
  currentTime: number;
  duration: number;
  onPlayToggle: () => void;
  onStop: () => void;
  onMicToggle: () => void;
  onSeek: (time: number) => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  vocalTrack: TrackStemInfo;
  beatTrack: TrackStemInfo;
  synergySettings: SynergyPocketSettings;
  onSynergyChange: (updated: Partial<SynergyPocketSettings>) => void;
  onOpenAutoMix?: () => void;
  recordingStatus?: RecordingStatus;
  onToggleRecord?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onOpenDrive?: (track: 'vocal' | 'beat') => void;
  onOpenPicker?: (track: 'vocal' | 'beat') => void;
}

export const WaveformTimeline: React.FC<WaveformTimelineProps> = ({
  isPlaying,
  isLiveMic,
  currentTime,
  duration,
  onPlayToggle,
  onStop,
  onMicToggle,
  onSeek,
  bpm,
  onBpmChange,
  vocalTrack,
  beatTrack,
  synergySettings,
  onSynergyChange,
  onOpenAutoMix,
  recordingStatus,
  onToggleRecord,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onOpenDrive,
  onOpenPicker,
}) => {
  const [localRecStatus, setLocalRecStatus] = useState<RecordingStatus>(
    recordingStatus || audioEngine.getRecordingStatus()
  );

  useEffect(() => {
    if (recordingStatus) {
      setLocalRecStatus(recordingStatus);
    } else {
      const unsub = audioEngine.subscribeRecordingStatus(setLocalRecStatus);
      return () => unsub();
    }
  }, [recordingStatus]);

  const activeRecStatus = recordingStatus || localRecStatus;

  const handleRecordAction = () => {
    if (onToggleRecord) {
      onToggleRecord();
    } else {
      if (activeRecStatus.isRecording || activeRecStatus.isCountingIn) {
        audioEngine.stopRecording();
      } else {
        audioEngine.startRecording({ countInSeconds: 0, playBeat: true });
      }
    }
  };

  const vocalFileInputRef = useRef<HTMLInputElement>(null);
  const beatFileInputRef = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const [isDraggingVocal, setIsDraggingVocal] = useState(false);
  const [isDraggingBeat, setIsDraggingBeat] = useState(false);
  const [alignToast, setAlignToast] = useState<string | null>(null);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);

  const handleLoadDemo = async () => {
    setIsLoadingDemo(true);
    try {
      const ok = await audioEngine.loadDemoStems();
      if (ok) {
        showToast('Loaded Studio Demo Stems (Vocals + Beat)');
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || duration <= 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * duration);
  };

  // Upload handlers
  const handleVocalFile = async (file: File) => {
    const success = await audioEngine.loadVocalFile(file);
    if (success) {
      showToast(`Loaded Vocal Track: "${file.name}"`);
    }
  };

  const handleBeatFile = async (file: File) => {
    const success = await audioEngine.loadBeatFile(file);
    if (success) {
      showToast(`Loaded Beat Track: "${file.name}" (${audioEngine.synergySettings.detectedBeatBpm} BPM)`);
      onBpmChange(audioEngine.synergySettings.detectedBeatBpm);
    }
  };

  const showToast = (msg: string) => {
    setAlignToast(msg);
    setTimeout(() => setAlignToast(null), 3500);
  };

  const handleAutoAlign = () => {
    const res = audioEngine.autoAlignStems(synergySettings.rideStyle);
    if (res) {
      showToast(`Aligned! Offset: ${res.offsetMs > 0 ? `+${res.offsetMs}` : res.offsetMs}ms (${res.confidence}% match)`);
    } else {
      showToast('Alignment completed using transient grid.');
    }
  };

  const handleRideStyleSelect = (style: PocketRideStyle) => {
    audioEngine.updateSynergySettings({ rideStyle: style });
    audioEngine.autoAlignStems(style);
    showToast(`Applied "${style.replace('_', ' ').toUpperCase()}" ride pocket`);
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const hasVocalAudio = Boolean(vocalTrack.duration > 0 && vocalTrack.name && vocalTrack.name !== 'No vocal track loaded');
  const hasBeatAudio = Boolean(beatTrack.duration > 0 && beatTrack.name && beatTrack.name !== 'No beat track loaded');

  // Real buffer peaks when audio is loaded
  const vocalPeaks = hasVocalAudio && vocalTrack.peaks && vocalTrack.peaks.length > 0
    ? vocalTrack.peaks
    : (hasVocalAudio ? Array.from({ length: 64 }, (_, i) => 0.25 + 0.5 * Math.abs(Math.sin(i * 0.22))) : []);

  const beatPeaks = hasBeatAudio && beatTrack.peaks && beatTrack.peaks.length > 0
    ? beatTrack.peaks
    : (hasBeatAudio ? Array.from({ length: 64 }, (_, i) => 0.35 + 0.6 * Math.abs(Math.cos(i * 0.38))) : []);

  // Calculate visual pixel shift for vocal lane based on alignment offset
  // e.g. +30ms offset on duration = (0.030 / duration) * 100 % shift
  const visualOffsetPct = duration > 0 ? ((synergySettings.alignOffsetMs || 0) / 1000 / duration) * 100 : 0;

  return (
    <div className="rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 p-4 sm:p-5 shadow-2xl backdrop-blur-md space-y-4">
      {/* Toast Notification */}
      {alignToast && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-950/90 border border-cyan-500/40 text-cyan-200 text-xs font-mono animate-fade-in shadow-lg shadow-cyan-950/50">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-spin-slow" />
          <span>{alignToast}</span>
        </div>
      )}

      {/* Top Deck: Transport Buttons + Stem Selector + Master Tempo */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            id="btn-transport-play"
            onClick={onPlayToggle}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-lg cursor-pointer ${
              isPlaying
                ? 'bg-amber-500 text-slate-950 shadow-amber-500/20 active:scale-95'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20 active:scale-95'
            }`}
            title={isPlaying ? 'Pause Studio Audio' : 'Play Both Stems (Vocals + Beat)'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            id="btn-transport-stop"
            onClick={onStop}
            className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer active:scale-95"
            title="Stop & Return to Start"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>

          {/* Record Live Vocals */}
          <button
            id="btn-transport-record"
            onClick={handleRecordAction}
            className={`flex items-center gap-2 px-3.5 h-11 rounded-xl font-bold text-xs transition-all shadow-lg cursor-pointer active:scale-95 ${
              activeRecStatus.isRecording
                ? 'bg-rose-600 text-white shadow-rose-600/40 animate-pulse ring-2 ring-rose-400'
                : activeRecStatus.isCountingIn
                ? 'bg-amber-500 text-slate-950 font-black shadow-amber-500/30 animate-bounce'
                : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40'
            }`}
            title={
              activeRecStatus.isRecording
                ? 'Stop & Commit Recorded Vocal Take'
                : 'Record Live Vocals (with backing beat & auto-tune)'
            }
          >
            <span className={`w-3 h-3 rounded-full shrink-0 ${activeRecStatus.isRecording ? 'bg-white animate-ping' : 'bg-rose-500'}`} />
            <span>
              {activeRecStatus.isRecording
                ? `REC ${formatTime(activeRecStatus.duration)}`
                : activeRecStatus.isCountingIn
                ? `COUNT: ${activeRecStatus.countInNumber}`
                : 'RECORD'}
            </span>
          </button>

          {/* Live Mic Input */}
          <button
            id="btn-transport-mic"
            onClick={onMicToggle}
            className={`flex items-center gap-1.5 px-3.5 h-11 rounded-xl font-semibold text-xs transition-all shadow-lg cursor-pointer ${
              isLiveMic
                ? 'bg-rose-500 text-white shadow-rose-500/30 animate-pulse ring-2 ring-rose-400/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title="Toggle Live Studio Microphone Input for vocal tracking"
          >
            <Mic className="w-4 h-4" />
            <span>{isLiveMic ? 'MIC ACTIVE' : 'LIVE MIC'}</span>
          </button>

          {/* Studio Undo / Redo Actions */}
          <div className="flex items-center gap-1 border-l border-slate-800/80 pl-2">
            <button
              id="btn-timeline-undo"
              onClick={onUndo}
              disabled={!canUndo}
              className={`w-9 h-11 rounded-xl flex items-center justify-center transition cursor-pointer ${
                canUndo
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white active:scale-95'
                  : 'bg-slate-900/50 text-slate-600 cursor-not-allowed opacity-40'
              }`}
              title="Undo last change (⌘Z / Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              id="btn-timeline-redo"
              onClick={onRedo}
              disabled={!canRedo}
              className={`w-9 h-11 rounded-xl flex items-center justify-center transition cursor-pointer ${
                canRedo
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white active:scale-95'
                  : 'bg-slate-900/50 text-slate-600 cursor-not-allowed opacity-40'
              }`}
              title="Redo change (⌘⇧Z / Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Timecode HUD */}
          <div className="flex items-center gap-2 bg-slate-950 px-3.5 h-11 rounded-xl border border-slate-800 font-mono text-xs shadow-inner">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-cyan-400">{formatTime(currentTime)}</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Project Master Tempo & Stem Status */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stem Status Indicator */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 h-11 rounded-xl border border-slate-800 text-xs">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Stems:</span>
            <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold ${
              vocalTrack.duration > 0 && vocalTrack.name !== 'No vocal track loaded' ? 'text-cyan-400' : 'text-slate-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                vocalTrack.duration > 0 && vocalTrack.name !== 'No vocal track loaded' ? 'bg-cyan-400' : 'bg-slate-600'
              }`} />
              Vocals
            </span>
            <span className="text-slate-700">|</span>
            <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold ${
              beatTrack.duration > 0 && beatTrack.name !== 'No beat track loaded' ? 'text-amber-400' : 'text-slate-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                beatTrack.duration > 0 && beatTrack.name !== 'No beat track loaded' ? 'bg-amber-400' : 'bg-slate-600'
              }`} />
              Beat
            </span>
          </div>

          {/* Project Tempo BPM */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 h-11 rounded-xl border border-slate-800 font-mono text-xs text-slate-300">
            <Music className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-slate-400">BPM</span>
            <input
              type="number"
              min="60"
              max="200"
              value={bpm}
              onChange={e => onBpmChange(Number(e.target.value))}
              className="w-12 bg-transparent text-white font-bold text-center focus:outline-none"
            />
          </div>

          {/* Load Demo Stems Button */}
          {(!hasVocalAudio || !hasBeatAudio) && (
            <button
              id="btn-waveform-load-demo"
              onClick={handleLoadDemo}
              disabled={isLoadingDemo}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold px-3 h-11 rounded-xl border border-cyan-500/30 shadow-md active:scale-95 transition cursor-pointer text-xs"
              title="Load Studio Demo Stems (Vocals + Instrumental Beat)"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isLoadingDemo ? 'animate-spin' : ''}`} />
              <span>{isLoadingDemo ? 'Generating Demo...' : 'Load Demo Stems'}</span>
            </button>
          )}

          {/* AI Auto-Mix Button */}
          {onOpenAutoMix && (
            <button
              id="btn-waveform-auto-mix"
              onClick={onOpenAutoMix}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-slate-950 font-black px-3.5 h-11 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer text-xs uppercase tracking-wider"
              title="Execute AI Auto-Mix: Instant offline trap & hip-hop mastering chain"
            >
              <Flame className="w-4 h-4 fill-current text-slate-950" />
              <span>Auto-Mix</span>
            </button>
          )}
        </div>
      </div>

      {/* DUAL TRACK FILE UPLOAD CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Track 1: Vocals Stem Upload & Mix Controls */}
        <div
          onDragOver={e => {
            e.preventDefault();
            setIsDraggingVocal(true);
          }}
          onDragLeave={() => setIsDraggingVocal(false)}
          onDrop={e => {
            e.preventDefault();
            setIsDraggingVocal(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleVocalFile(e.dataTransfer.files[0]);
            }
          }}
          className={`p-4 sm:p-3.5 rounded-xl border transition-all ${
            isDraggingVocal
              ? 'border-cyan-400 bg-cyan-950/40 ring-2 ring-cyan-400/40'
              : hasVocalAudio
              ? 'border-cyan-900/60 bg-slate-950/80 hover:border-cyan-700/60'
              : 'border-dashed border-slate-750 bg-slate-950/40 hover:border-cyan-500/50 hover:bg-slate-900/40'
          }`}
        >
          <input
            ref={vocalFileInputRef}
            type="file"
            accept="audio/*"
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                handleVocalFile(e.target.files[0]);
              }
              e.target.value = '';
            }}
            className="hidden"
          />

          {hasVocalAudio ? (
            <>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Track 1: Vocals</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                        {formatTime(vocalTrack.duration)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 truncate" title={vocalTrack.name}>
                      {vocalTrack.name}
                    </p>
                  </div>
                </div>

                {/* Vocal Actions: Replace, Google Picker, Google Drive & Clear */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    id="btn-picker-vocals"
                    onClick={() => onOpenPicker ? onOpenPicker('vocal') : onOpenDrive?.('vocal')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600/25 to-cyan-500/25 hover:from-blue-600/35 hover:to-cyan-500/35 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition cursor-pointer shadow-sm active:scale-95"
                    title="Pick vocal stem with Google Picker"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <path d="M8.27 3.5L1.5 15.2h6.77L15.04 3.5H8.27z" fill="#4285F4" />
                      <path d="M15.04 3.5L8.27 15.2l3.38 5.8 6.77-11.7-3.38-5.8z" fill="#0F9D58" />
                      <path d="M18.42 9.3l-3.38 5.9H1.5l3.38 5.8h13.54l3.38-5.8-3.38-5.9z" fill="#FFBA00" />
                    </svg>
                    <span>Picker</span>
                  </button>
                  <button
                    id="btn-drive-vocals"
                    onClick={() => onOpenDrive?.('vocal')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs font-semibold transition cursor-pointer shadow-sm active:scale-95"
                    title="Import vocal stem from Google Drive"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <path d="M8.27 3.5L1.5 15.2h6.77L15.04 3.5H8.27z" fill="#4285F4" />
                      <path d="M15.04 3.5L8.27 15.2l3.38 5.8 6.77-11.7-3.38-5.8z" fill="#0F9D58" />
                      <path d="M18.42 9.3l-3.38 5.9H1.5l3.38 5.8h13.54l3.38-5.8-3.38-5.9z" fill="#FFBA00" />
                    </svg>
                    <span>Drive</span>
                  </button>
                  <button
                    id="btn-upload-vocals"
                    onClick={() => {
                      audioEngine.persistCurrentSession().catch(() => {});
                      vocalFileInputRef.current?.click();
                    }}
                    className="flex items-center gap-1 px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition cursor-pointer shadow-sm active:scale-95"
                    title="Replace vocal track from device"
                  >
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Replace</span>
                  </button>
                  <button
                    onClick={() => {
                      audioEngine.clearVocalTrack();
                      showToast('Vocal track cleared');
                    }}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800/50 transition cursor-pointer"
                    title="Remove vocal track"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Vocal Mixer Strip: Mute, Solo, Record, Volume */}
              <div className="flex items-center gap-3 pt-2 border-t border-slate-800/80 text-xs">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => audioEngine.setVocalMute(!vocalTrack.isMuted)}
                    className={`w-6 h-6 rounded font-mono font-bold text-[10px] transition cursor-pointer ${
                      vocalTrack.isMuted ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                    title="Mute Vocals"
                  >
                    M
                  </button>
                  <button
                    onClick={() => audioEngine.setVocalSolo(!vocalTrack.isSolo)}
                    className={`w-6 h-6 rounded font-mono font-bold text-[10px] transition cursor-pointer ${
                      vocalTrack.isSolo ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                    title="Solo Vocals"
                  >
                    S
                  </button>
                  <button
                    id="btn-vocal-arm-record"
                    onClick={handleRecordAction}
                    className={`w-6 h-6 rounded font-mono font-bold text-[10px] transition cursor-pointer ${
                      activeRecStatus.isRecording
                        ? 'bg-rose-600 text-white animate-pulse ring-1 ring-rose-400'
                        : 'bg-slate-800 text-rose-400 hover:bg-rose-950/60 hover:text-white'
                    }`}
                    title={activeRecStatus.isRecording ? 'Stop Recording Take' : 'Record Live Vocal Overdub / Take'}
                  >
                    R
                  </button>
                </div>

                <div className="flex-1 flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={vocalTrack.volume}
                    onChange={e => audioEngine.setVocalVolume(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
                  />
                  <span className="font-mono text-[10px] text-cyan-300 w-9 text-right">
                    {Math.round(vocalTrack.volume * 100)}%
                  </span>
                </div>
              </div>

              {/* Vocal Speed Controls */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px] font-medium text-cyan-300">Speed:</span>
                  <span className="font-mono text-[11px] font-bold text-white">
                    {(vocalTrack.playbackRate || 1.0).toFixed(2)}x
                  </span>
                </div>

                {/* Quick Speed Buttons */}
                <div className="flex items-center gap-1 font-mono text-[10px]">
                  {[0.75, 1.0, 1.25, 1.5].map(rate => (
                    <button
                      key={rate}
                      onClick={() => audioEngine.setVocalPlaybackRate(rate)}
                      className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                        Math.abs((vocalTrack.playbackRate || 1.0) - rate) < 0.01
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>

                {/* Speed slider */}
                <div className="w-20 hidden sm:block">
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={vocalTrack.playbackRate || 1.0}
                    onChange={e => audioEngine.setVocalPlaybackRate(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
                    title="Vocal Playback Speed"
                  />
                </div>
              </div>
            </>
          ) : (
            /* Empty Vocal Track Dropzone */
            <div className="py-2.5 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-2">
                <Mic className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-cyan-400 uppercase tracking-wide">Track 1: Vocals</p>
              <p className="text-[11px] text-slate-400 max-w-xs mt-0.5 mb-3">
                No vocal audio loaded. Drag & drop an audio file (WAV, MP3, FLAC) or record live.
              </p>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <button
                  id="btn-record-vocals-dropzone"
                  onClick={handleRecordAction}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shadow-md active:scale-95 ${
                    activeRecStatus.isRecording
                      ? 'bg-rose-600 text-white shadow-rose-600/40 animate-pulse ring-2 ring-rose-400'
                      : 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${activeRecStatus.isRecording ? 'bg-white animate-ping' : 'bg-rose-500'}`} />
                  <span>{activeRecStatus.isRecording ? `Recording... (${activeRecStatus.duration.toFixed(1)}s)` : 'Record Live Vocals'}</span>
                </button>
                <button
                  id="btn-picker-vocals-empty"
                  onClick={() => onOpenPicker ? onOpenPicker('vocal') : onOpenDrive?.('vocal')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600/30 to-cyan-500/30 hover:from-blue-600/40 hover:to-cyan-500/40 text-cyan-200 border border-cyan-500/50 text-xs font-bold transition cursor-pointer shadow-sm active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <path d="M8.27 3.5L1.5 15.2h6.77L15.04 3.5H8.27z" fill="#4285F4" />
                    <path d="M15.04 3.5L8.27 15.2l3.38 5.8 6.77-11.7-3.38-5.8z" fill="#0F9D58" />
                    <path d="M18.42 9.3l-3.38 5.9H1.5l3.38 5.8h13.54l3.38-5.8-3.38-5.9z" fill="#FFBA00" />
                  </svg>
                  <span>Google Picker</span>
                </button>
                <button
                  id="btn-drive-vocals-empty"
                  onClick={() => onOpenDrive?.('vocal')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-semibold transition cursor-pointer shadow-sm active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <path d="M8.27 3.5L1.5 15.2h6.77L15.04 3.5H8.27z" fill="#4285F4" />
                    <path d="M15.04 3.5L8.27 15.2l3.38 5.8 6.77-11.7-3.38-5.8z" fill="#0F9D58" />
                    <path d="M18.42 9.3l-3.38 5.9H1.5l3.38 5.8h13.54l3.38-5.8-3.38-5.9z" fill="#FFBA00" />
                  </svg>
                  <span>Drive Hub</span>
                </button>
                <button
                  id="btn-upload-vocals"
                  onClick={() => {
                    audioEngine.persistCurrentSession().catch(() => {});
                    vocalFileInputRef.current?.click();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition cursor-pointer shadow-sm active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Upload Vocals</span>
                </button>
                <button
                  onClick={onMicToggle}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                    isLiveMic
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5 text-rose-400" />
                  <span>{isLiveMic ? 'Mic Active' : 'Live Mic'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Track 2: Beat / Instrumental Upload & Mix Controls */}
        <div
          onDragOver={e => {
            e.preventDefault();
            setIsDraggingBeat(true);
          }}
          onDragLeave={() => setIsDraggingBeat(false)}
          onDrop={e => {
            e.preventDefault();
            setIsDraggingBeat(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleBeatFile(e.dataTransfer.files[0]);
            }
          }}
          className={`p-4 sm:p-3.5 rounded-xl border transition-all ${
            isDraggingBeat
              ? 'border-amber-400 bg-amber-950/40 ring-2 ring-amber-400/40'
              : hasBeatAudio
              ? 'border-amber-900/60 bg-slate-950/80 hover:border-amber-700/60'
              : 'border-dashed border-slate-750 bg-slate-950/40 hover:border-amber-500/50 hover:bg-slate-900/40'
          }`}
        >
          <input
            ref={beatFileInputRef}
            type="file"
            accept="audio/*"
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                handleBeatFile(e.target.files[0]);
              }
              e.target.value = '';
            }}
            className="hidden"
          />

          {hasBeatAudio ? (
            <>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <Music className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Track 2: Beat</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                        {synergySettings.detectedBeatBpm} BPM
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                        {formatTime(beatTrack.duration)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 truncate" title={beatTrack.name}>
                      {beatTrack.name}
                    </p>
                  </div>
                </div>

                {/* Beat Actions: Replace, Google Picker, Google Drive & Clear */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    id="btn-picker-beat"
                    onClick={() => onOpenPicker ? onOpenPicker('beat') : onOpenDrive?.('beat')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600/25 to-cyan-500/25 hover:from-blue-600/35 hover:to-cyan-500/35 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition cursor-pointer shadow-sm active:scale-95"
                    title="Pick beat instrumental with Google Picker"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <path d="M8.27 3.5L1.5 15.2h6.77L15.04 3.5H8.27z" fill="#4285F4" />
                      <path d="M15.04 3.5L8.27 15.2l3.38 5.8 6.77-11.7-3.38-5.8z" fill="#0F9D58" />
                      <path d="M18.42 9.3l-3.38 5.9H1.5l3.38 5.8h13.54l3.38-5.8-3.38-5.9z" fill="#FFBA00" />
                    </svg>
                    <span>Picker</span>
                  </button>
                  <button
                    id="btn-drive-beat"
                    onClick={() => onOpenDrive?.('beat')}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs font-semibold transition cursor-pointer shadow-sm active:scale-95"
                    title="Import beat from Google Drive"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <path d="M8.27 3.5L1.5 15.2h6.77L15.04 3.5H8.27z" fill="#4285F4" />
                      <path d="M15.04 3.5L8.27 15.2l3.38 5.8 6.77-11.7-3.38-5.8z" fill="#0F9D58" />
                      <path d="M18.42 9.3l-3.38 5.9H1.5l3.38 5.8h13.54l3.38-5.8-3.38-5.9z" fill="#FFBA00" />
                    </svg>
                    <span>Drive</span>
                  </button>
                  <button
                    id="btn-upload-beat"
                    onClick={() => {
                      audioEngine.persistCurrentSession().catch(() => {});
                      beatFileInputRef.current?.click();
                    }}
                    className="flex items-center gap-1 px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition cursor-pointer shadow-sm active:scale-95"
                    title="Replace beat track from device"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Replace</span>
                  </button>
                  <button
                    onClick={() => {
                      audioEngine.clearBeatTrack();
                      showToast('Beat track cleared');
                    }}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800/50 transition cursor-pointer"
                    title="Remove beat track"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Beat Mixer Strip: Mute, Solo, Volume */}
              <div className="flex items-center gap-3 pt-2 border-t border-slate-800/80 text-xs">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => audioEngine.setBeatMute(!beatTrack.isMuted)}
                    className={`w-6 h-6 rounded font-mono font-bold text-[10px] transition cursor-pointer ${
                      beatTrack.isMuted ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                    title="Mute Beat"
                  >
                    M
                  </button>
                  <button
                    onClick={() => audioEngine.setBeatSolo(!beatTrack.isSolo)}
                    className={`w-6 h-6 rounded font-mono font-bold text-[10px] transition cursor-pointer ${
                      beatTrack.isSolo ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                    title="Solo Beat"
                  >
                    S
                  </button>
                </div>

                <div className="flex-1 flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={beatTrack.volume}
                    onChange={e => audioEngine.setBeatVolume(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
                  />
                  <span className="font-mono text-[10px] text-amber-300 w-9 text-right">
                    {Math.round(beatTrack.volume * 100)}%
                  </span>
                </div>
              </div>

              {/* Beat Speed Controls */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Gauge className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-medium text-amber-300">Speed:</span>
                  <span className="font-mono text-[11px] font-bold text-white">
                    {(beatTrack.playbackRate || 1.0).toFixed(2)}x
                  </span>
                </div>

                {/* Quick Speed Buttons */}
                <div className="flex items-center gap-1 font-mono text-[10px]">
                  {[0.75, 1.0, 1.25, 1.5].map(rate => (
                    <button
                      key={rate}
                      onClick={() => audioEngine.setBeatPlaybackRate(rate)}
                      className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                        Math.abs((beatTrack.playbackRate || 1.0) - rate) < 0.01
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>

                {/* Speed slider */}
                <div className="w-20 hidden sm:block">
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={beatTrack.playbackRate || 1.0}
                    onChange={e => audioEngine.setBeatPlaybackRate(parseFloat(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
                    title="Beat Playback Speed"
                  />
                </div>
              </div>
            </>
          ) : (
            /* Empty Beat Track Dropzone */
            <div className="py-2.5 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-2">
                <Music className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">Track 2: Beat / Instrumental</p>
              <p className="text-[11px] text-slate-400 max-w-xs mt-0.5 mb-3">
                No beat audio loaded. Drag & drop an instrumental track (WAV, MP3, FLAC) or browse.
              </p>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <button
                  id="btn-picker-beat-empty"
                  onClick={() => onOpenPicker ? onOpenPicker('beat') : onOpenDrive?.('beat')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600/30 to-amber-500/30 hover:from-blue-600/40 hover:to-amber-500/40 text-amber-200 border border-amber-500/50 text-xs font-bold transition cursor-pointer shadow-sm active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <path d="M8.27 3.5L1.5 15.2h6.77L15.04 3.5H8.27z" fill="#4285F4" />
                    <path d="M15.04 3.5L8.27 15.2l3.38 5.8 6.77-11.7-3.38-5.8z" fill="#0F9D58" />
                    <path d="M18.42 9.3l-3.38 5.9H1.5l3.38 5.8h13.54l3.38-5.8-3.38-5.9z" fill="#FFBA00" />
                  </svg>
                  <span>Google Picker</span>
                </button>
                <button
                  id="btn-drive-beat-empty"
                  onClick={() => onOpenDrive?.('beat')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-xs font-semibold transition cursor-pointer shadow-sm active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <path d="M8.27 3.5L1.5 15.2h6.77L15.04 3.5H8.27z" fill="#4285F4" />
                    <path d="M15.04 3.5L8.27 15.2l3.38 5.8 6.77-11.7-3.38-5.8z" fill="#0F9D58" />
                    <path d="M18.42 9.3l-3.38 5.9H1.5l3.38 5.8h13.54l3.38-5.8-3.38-5.9z" fill="#FFBA00" />
                  </svg>
                  <span>Drive Hub</span>
                </button>
                <button
                  id="btn-upload-beat"
                  onClick={() => {
                    audioEngine.persistCurrentSession().catch(() => {});
                    beatFileInputRef.current?.click();
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition cursor-pointer shadow-sm active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Upload Beat</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SYNERGY POCKET & AUTO-ALIGN CONTROL BAR */}
      <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-950 to-amber-950/40 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Auto Align Button */}
          <button
            id="btn-auto-synergy-align"
            onClick={handleAutoAlign}
            disabled={synergySettings.isAnalyzing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>{synergySettings.isAnalyzing ? 'Analyzing Groove...' : 'Auto Synergy Align'}</span>
          </button>

          {/* Ride Style Selector */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 px-1.5 uppercase">Pocket:</span>
            {(
              [
                { id: 'pocket_lock', label: 'Lock', title: 'Dead-center on the beat (0ms offset)' },
                { id: 'laid_back', label: 'Laid-Back', title: 'Relaxed groove behind the beat (+22ms)' },
                { id: 'ahead_drive', label: 'Driving', title: 'Energized pop drive ahead of beat (-18ms)' },
                { id: 'vocal_lead', label: 'Vocal Lead', title: 'Vocal leads phrase before kick (-35ms)' },
              ] as { id: PocketRideStyle; label: string; title: string }[]
            ).map(style => (
              <button
                key={style.id}
                onClick={() => handleRideStyleSelect(style.id)}
                title={style.title}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                  synergySettings.rideStyle === style.id
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>

        {/* Match Setting Header & Micro Nudge Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {/* Micro Nudge Buttons */}
          <div className="flex items-center gap-1">
            <button
              id="btn-nudge-vocal-earlier"
              onClick={() => onSynergyChange({ alignOffsetMs: (synergySettings.alignOffsetMs || 0) - 5 })}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition active:scale-95"
              title="Nudge vocal earlier by 5ms"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-cyan-300 font-bold min-w-[70px] text-center">
              {synergySettings.alignOffsetMs > 0 ? `+${synergySettings.alignOffsetMs}` : synergySettings.alignOffsetMs} ms
            </span>
            <button
              id="btn-nudge-vocal-later"
              onClick={() => onSynergyChange({ alignOffsetMs: (synergySettings.alignOffsetMs || 0) + 5 })}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition active:scale-95"
              title="Nudge vocal later by 5ms"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              id="btn-reset-alignment-offset"
              onClick={() => onSynergyChange({ alignOffsetMs: 0 })}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition"
              title="Reset offset to 0ms (Dead Center)"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Match Setting Indicator Badge */}
          <div
            id="match-setting-badge"
            className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 shadow-sm"
            title="Current groove alignment match score against beat transients"
          >
            <Zap className={`w-3.5 h-3.5 ${
              synergySettings.alignmentConfidence >= 85 ? 'text-emerald-400' : synergySettings.alignmentConfidence >= 70 ? 'text-cyan-400' : 'text-amber-400'
            }`} />
            <span className="text-[10px] text-slate-400 font-medium">Match:</span>
            <span className={`font-bold ${
              synergySettings.alignmentConfidence >= 85 ? 'text-emerald-400' : synergySettings.alignmentConfidence >= 70 ? 'text-cyan-300' : 'text-amber-300'
            }`}>
              {synergySettings.alignmentConfidence}%
            </span>
            <span className={`hidden sm:inline-block text-[9px] uppercase px-1 py-0.5 rounded font-bold ${
              synergySettings.alignmentConfidence >= 85
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                : synergySettings.alignmentConfidence >= 70
                ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                : 'bg-amber-950 text-amber-400 border border-amber-800/60'
            }`}>
              {synergySettings.alignmentConfidence >= 85 ? 'Pocket' : synergySettings.alignmentConfidence >= 70 ? 'Groove' : 'Manual'}
            </span>
          </div>
        </div>
      </div>

      {/* MATCH SETTING & BEAT-TO-VOCAL ALIGNMENT PANEL */}
      <div
        id="beat-to-vocal-alignment-container"
        className="bg-slate-950/80 rounded-xl border border-slate-800/90 p-3.5 space-y-3.5 shadow-inner"
      >
        {/* MATCH SETTING SLIDER (0% - 100%) */}
        <div id="match-setting-slider-group" className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800/70">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-400" />
                Match Setting:
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {synergySettings.alignmentConfidence === 100
                  ? '★ 100% Perfect Beat & Vocal Lock'
                  : 'Slide to make beat & vocal match 100%'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                id="match-setting-percentage-display"
                className={`font-mono font-extrabold text-xs px-2.5 py-1 rounded-lg border shadow-sm transition ${
                  synergySettings.alignmentConfidence === 100
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                    : synergySettings.alignmentConfidence >= 85
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/70'
                    : synergySettings.alignmentConfidence >= 70
                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800/70'
                    : 'bg-amber-950/80 text-amber-300 border-amber-800/70'
                }`}
              >
                {synergySettings.alignmentConfidence}% MATCH
              </span>

              <button
                id="btn-snap-100-match"
                onClick={() => onSynergyChange({ alignmentConfidence: 100, alignOffsetMs: 0 })}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 active:scale-95 shadow ${
                  synergySettings.alignmentConfidence === 100
                    ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                    : 'bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-slate-950 border border-slate-700'
                }`}
                title="Snap Match to 100% (Lock beat and vocals dead center)"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>100% Match</span>
              </button>
            </div>
          </div>

          {/* Continuous Match Setting Slider (0% to 100%) */}
          <div className="relative flex items-center py-1">
            <input
              id="slider-match-setting"
              type="range"
              min="0"
              max="100"
              step="1"
              value={synergySettings.alignmentConfidence}
              onChange={e => {
                const conf = Number(e.target.value);
                const offset = conf === 100 ? 0 : Math.round(((100 - conf) / 100) * 45);
                onSynergyChange({ alignmentConfidence: conf, alignOffsetMs: offset });
              }}
              className="w-full accent-emerald-400 cursor-pointer h-2.5 bg-slate-800 rounded-lg appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(52,211,153,0.9)] hover:[&::-webkit-slider-thumb]:scale-125 transition"
              title="Slide on the match setting to make it match up to 100%"
            />
          </div>

          {/* Match Setting Scale Marks */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <button
              onClick={() => onSynergyChange({ alignmentConfidence: 0, alignOffsetMs: 45 })}
              className="hover:text-slate-300 transition cursor-pointer"
            >
              0% (Loose)
            </button>
            <button
              onClick={() => onSynergyChange({ alignmentConfidence: 50, alignOffsetMs: 22 })}
              className="hover:text-slate-300 transition cursor-pointer"
            >
              50% (Natural Groove)
            </button>
            <button
              onClick={() => onSynergyChange({ alignmentConfidence: 80, alignOffsetMs: 9 })}
              className="hover:text-cyan-400 transition cursor-pointer"
            >
              80% (Tight Pocket)
            </button>
            <button
              onClick={() => onSynergyChange({ alignmentConfidence: 100, alignOffsetMs: 0 })}
              className={`transition cursor-pointer font-bold ${
                synergySettings.alignmentConfidence === 100 ? 'text-emerald-400 underline' : 'text-emerald-500 hover:text-emerald-300'
              }`}
            >
              ★ 100% (Perfect Lock)
            </button>
          </div>
        </div>

        {/* BEAT-TO-VOCAL TIMING OFFSET CONTROLS */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                Beat to Vocal Micro-Timing:
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {synergySettings.alignOffsetMs < 0
                  ? '◄ Vocal Leading Beat (Push Ahead)'
                  : synergySettings.alignOffsetMs > 0
                  ? 'Vocal Lagging Beat (Pull Behind) ►'
                  : 'Locked on Beat Grid (0ms)'}
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono">
              <span className="text-[11px] text-slate-400">Offset:</span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-cyan-300 font-bold text-xs">
                {synergySettings.alignOffsetMs > 0 ? `+${synergySettings.alignOffsetMs}` : synergySettings.alignOffsetMs} ms
              </span>
            </div>
          </div>

          {/* Offset Slider with Center Detent Tick */}
          <div className="relative flex items-center py-1">
            <div
              className="absolute left-1/2 -translate-x-1/2 w-0.5 h-3.5 bg-cyan-400/90 pointer-events-none z-10 rounded shadow-[0_0_6px_rgba(34,211,238,0.8)]"
              title="0ms Center Detent"
            />
            <input
              id="slider-beat-to-vocal-align"
              type="range"
              min="-150"
              max="150"
              step="1"
              value={synergySettings.alignOffsetMs || 0}
              onChange={e => {
                const offset = Number(e.target.value);
                const dist = Math.abs(offset);
                const conf = offset === 0 ? 100 : Math.max(15, Math.min(99, Math.round(100 - (dist / 150) * 65)));
                onSynergyChange({ alignOffsetMs: offset, alignmentConfidence: conf });
              }}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(34,211,238,0.8)] hover:[&::-webkit-slider-thumb]:scale-125 transition"
              title="Adjust micro-timing offset between beat and vocals (-150ms to +150ms)"
            />
          </div>

          {/* Quick Snap Presets & Scale Guides */}
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <button
              onClick={() => onSynergyChange({ alignOffsetMs: -60 })}
              className="hover:text-cyan-400 transition cursor-pointer"
              title="Push vocal earlier (-60ms)"
            >
              -150ms (Push Ahead)
            </button>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onSynergyChange({ alignOffsetMs: -18 })}
                className={`px-2 py-0.5 rounded border transition cursor-pointer ${
                  synergySettings.alignOffsetMs === -18
                    ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                    : 'border-slate-800 bg-slate-900 hover:text-white'
                }`}
                title="Drive Pocket (-18ms)"
              >
                -18ms Drive
              </button>
              <button
                onClick={() => onSynergyChange({ alignOffsetMs: 0, alignmentConfidence: 100 })}
                className={`px-2 py-0.5 rounded border transition cursor-pointer ${
                  synergySettings.alignOffsetMs === 0
                    ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                    : 'border-slate-800 bg-slate-900 hover:text-white'
                }`}
                title="Dead Center Lock (0ms / 100% Match)"
              >
                0ms Lock (100% Match)
              </button>
              <button
                onClick={() => onSynergyChange({ alignOffsetMs: 22 })}
                className={`px-2 py-0.5 rounded border transition cursor-pointer ${
                  synergySettings.alignOffsetMs === 22
                    ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                    : 'border-slate-800 bg-slate-900 hover:text-white'
                }`}
                title="Laid-Back Pocket (+22ms)"
              >
                +22ms Laid-Back
              </button>
            </div>

            <button
              onClick={() => onSynergyChange({ alignOffsetMs: 60 })}
              className="hover:text-cyan-400 transition cursor-pointer"
              title="Pull vocal later (+60ms)"
            >
              +150ms (Pull Behind)
            </button>
          </div>
        </div>
      </div>

      {/* INTERACTIVE DUAL-LANE TIMELINE & WAVEFORM VISUALIZER */}
      <div
        ref={timelineRef}
        onClick={handleTimelineClick}
        className="relative bg-slate-950 rounded-xl border border-slate-800 overflow-hidden cursor-pointer select-none p-3 group"
        title="Click anywhere to scrub playback position across both stems"
      >
        {/* Musical 16th Note Grid Lines */}
        <div className="absolute inset-0 flex justify-between pointer-events-none opacity-15">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="h-full border-r border-slate-500 w-full" />
          ))}
        </div>

        {/* Dual Lanes Stack */}
        <div className="relative space-y-2 pointer-events-none z-0">
          {/* Lane 1: Vocal Waveform */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400/80 mb-1 px-1">
              <span>VOCAL STEM WAVEFORM</span>
              {hasVocalAudio ? (
                <span>
                  Offset: {synergySettings.alignOffsetMs > 0 ? `+${synergySettings.alignOffsetMs}` : synergySettings.alignOffsetMs}ms
                </span>
              ) : (
                <span className="text-slate-500">No vocal stem loaded</span>
              )}
            </div>
            {hasVocalAudio && vocalPeaks.length > 0 ? (
              <div
                className="h-14 flex items-center justify-between gap-[2px] transition-transform duration-75"
                style={{ transform: `translateX(${visualOffsetPct}%)` }}
              >
                {vocalPeaks.map((peak, idx) => {
                  const barPct = (idx / vocalPeaks.length) * 100;
                  const isPlayed = barPct <= progressPct;
                  const rawVal = typeof peak === 'number' && Number.isFinite(peak) ? peak : 0.25;
                  const pct = rawVal > 1 ? rawVal : rawVal * 100;
                  const heightPct = Math.max(12, Math.min(100, Math.round(pct)));
                  return (
                    <div
                      key={`vocal-${idx}`}
                      className={`flex-1 rounded-full transition-colors ${
                        isPlayed
                          ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                          : 'bg-cyan-950/80 border border-cyan-800/40 group-hover:bg-cyan-900/60'
                      }`}
                      style={{ height: `${heightPct}%`, maxHeight: '100%' }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="h-14 flex items-center justify-center rounded-lg border border-dashed border-cyan-950 bg-cyan-950/20 text-cyan-500/60 text-xs font-mono">
                <span>Upload a vocal track or enable Live Mic to display vocal waveform</span>
              </div>
            )}
          </div>

          {/* Subtle Divider */}
          <div className="border-t border-slate-800/90" />

          {/* Lane 2: Beat Waveform */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-mono text-amber-400/80 mb-1 px-1">
              <span>BEAT STEM WAVEFORM {hasBeatAudio ? `(${synergySettings.detectedBeatBpm} BPM GRID)` : ''}</span>
              {hasBeatAudio ? (
                <span>Dynamic Pocket Carving Active</span>
              ) : (
                <span className="text-slate-500">No beat stem loaded</span>
              )}
            </div>
            {hasBeatAudio && beatPeaks.length > 0 ? (
              <div className="h-14 flex items-center justify-between gap-[2px]">
                {beatPeaks.map((peak, idx) => {
                  const barPct = (idx / beatPeaks.length) * 100;
                  const isPlayed = barPct <= progressPct;
                  const rawVal = typeof peak === 'number' && Number.isFinite(peak) ? peak : 0.25;
                  const pct = rawVal > 1 ? rawVal : rawVal * 100;
                  const heightPct = Math.max(12, Math.min(100, Math.round(pct)));
                  return (
                    <div
                      key={`beat-${idx}`}
                      className={`flex-1 rounded-full transition-colors ${
                        isPlayed
                          ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                          : 'bg-amber-950/80 border border-amber-800/40 group-hover:bg-amber-900/60'
                      }`}
                      style={{ height: `${heightPct}%`, maxHeight: '100%' }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="h-14 flex items-center justify-center rounded-lg border border-dashed border-amber-950 bg-amber-950/20 text-amber-500/60 text-xs font-mono">
                <span>Upload an instrumental beat to display beat waveform</span>
              </div>
            )}
          </div>
        </div>

        {/* Glowing Full-Height Playhead Scrubber */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_14px_#ffffff] z-20 pointer-events-none transition-all duration-75"
          style={{ left: `${progressPct}%` }}
        >
          <div className="w-3.5 h-3.5 bg-white rounded-full -ml-[6px] mt-1 shadow-lg ring-2 ring-cyan-400" />
        </div>
      </div>

      {/* DEDICATED BOTTOM PLAYHEAD SCRUBBER & SKIP SLIDER BAR */}
      <div className="p-3 bg-slate-950/95 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Play/Pause & Skip Buttons */}
        <div className="flex items-center gap-1.5 w-full md:w-auto justify-between md:justify-start">
          <button
            id="timeline-btn-play"
            onClick={onPlayToggle}
            className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold transition shadow cursor-pointer ${
              isPlaying
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <button
            id="timeline-btn-stop"
            onClick={onStop}
            className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 flex items-center justify-center transition cursor-pointer"
            title="Reset to 0:00"
          >
            <Square className="w-3 h-3 fill-current" />
          </button>

          {/* Jump to Start */}
          <button
            onClick={() => onSeek(0)}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-mono transition cursor-pointer"
            title="Jump to Start"
          >
            |&lt;&lt;
          </button>

          {/* Skip Back 5s */}
          <button
            onClick={() => audioEngine.skip(-5)}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono font-bold flex items-center gap-0.5 transition cursor-pointer"
            title="Skip Back 5s"
          >
            <Rewind className="w-3 h-3" />
            <span>-5s</span>
          </button>

          {/* Skip Back 1s */}
          <button
            onClick={() => audioEngine.skip(-1)}
            className="px-1.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-[11px] font-mono transition cursor-pointer"
            title="Nudge Back 1s"
          >
            -1s
          </button>

          {/* Nudge Forward 1s */}
          <button
            onClick={() => audioEngine.skip(1)}
            className="px-1.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-[11px] font-mono transition cursor-pointer"
            title="Nudge Forward 1s"
          >
            +1s
          </button>

          {/* Skip Forward 5s */}
          <button
            onClick={() => audioEngine.skip(5)}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono font-bold flex items-center gap-0.5 transition cursor-pointer"
            title="Skip Forward 5s"
          >
            <span>+5s</span>
            <FastForward className="w-3 h-3" />
          </button>

          {/* Jump to End */}
          <button
            onClick={() => onSeek(duration)}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-mono transition cursor-pointer"
            title="Jump to End"
          >
            &gt;&gt;|
          </button>
        </div>

        {/* Center Interactive Timeline Scrubber Slider */}
        <div className="flex-1 w-full flex items-center gap-3">
          <span className="font-mono text-xs font-bold text-cyan-300 min-w-[62px] text-right">
            {formatTime(currentTime)}
          </span>

          <div className="flex-1 relative flex items-center group">
            <input
              id="timeline-scrubber-slider"
              type="range"
              min="0"
              max={duration || 12}
              step="0.01"
              value={currentTime}
              onChange={e => onSeek(parseFloat(e.target.value))}
              className="w-full h-5 sm:h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 z-10 focus:outline-none"
              title="Drag to skip anywhere in playback"
            />
          </div>

          <span className="font-mono text-xs text-slate-500 min-w-[62px]">
            {formatTime(duration)}
          </span>
        </div>

        {/* Right Master Speed Sync Pill */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-mono">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 text-[10px]">Speed:</span>
            <button
              onClick={() => audioEngine.setMasterPlaybackRate(1.0)}
              className="font-bold text-white hover:text-amber-400 cursor-pointer"
              title="Reset Speed to 1.0x"
            >
              {(vocalTrack.playbackRate || 1.0) === (beatTrack.playbackRate || 1.0)
                ? `${(vocalTrack.playbackRate || 1.0).toFixed(2)}x`
                : `${(vocalTrack.playbackRate || 1.0).toFixed(1)}v / ${(beatTrack.playbackRate || 1.0).toFixed(1)}b`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
