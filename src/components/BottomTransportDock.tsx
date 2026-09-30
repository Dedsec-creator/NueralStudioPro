import React, { useState } from 'react';
import {
  FastForward,
  Gauge,
  Headphones,
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
  Undo2,
  Redo2,
  Volume2,
  Zap,
} from 'lucide-react';
import { NeuralTuneAudioEngine } from '../audio/audioEngine';
import { PitchFormantSettings, RecordingStatus, TrackStemInfo } from '../types';

interface BottomTransportDockProps {
  audioEngine: NeuralTuneAudioEngine;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  vocalTrack: TrackStemInfo;
  beatTrack: TrackStemInfo;
  isLiveMicActive: boolean;
  pitchFormantSettings?: PitchFormantSettings;
  recordingStatus?: RecordingStatus;
  onTogglePlay: () => void;
  onStop?: () => void;
  onToggleMic: () => void;
  onToggleRecord?: () => void;
  onOpenPitchFormant?: () => void;
  onOpenAutoMix?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const BottomTransportDock: React.FC<BottomTransportDockProps> = ({
  audioEngine,
  isPlaying,
  currentTime,
  duration,
  vocalTrack,
  beatTrack,
  isLiveMicActive,
  pitchFormantSettings,
  recordingStatus,
  onTogglePlay,
  onStop,
  onToggleMic,
  onToggleRecord,
  onOpenPitchFormant,
  onOpenAutoMix,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  const vocalSpeed = vocalTrack.playbackRate || audioEngine.vocalPlaybackRate || 1.0;
  const beatSpeed = beatTrack.playbackRate || audioEngine.beatPlaybackRate || 1.0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  const currentDisplayTime = isSeeking ? seekValue : currentTime;
  const safeDuration = duration > 0 ? duration : 12.0;
  const progressPct = Math.min(100, Math.max(0, (currentDisplayTime / safeDuration) * 100));

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSeekValue(val);
    setIsSeeking(true);
    audioEngine.seek(val);
  };

  const handleSliderCommit = () => {
    setIsSeeking(false);
  };

  const handleSkip = (deltaSeconds: number) => {
    audioEngine.skip(deltaSeconds);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.8)]">
      {/* Top micro progress highlight */}
      <div className="w-full h-1 bg-slate-800/80 relative overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-amber-400 transition-all duration-75"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-6 py-2 flex flex-wrap md:flex-nowrap items-center justify-between gap-y-2 gap-x-4">
        {/* LEFT: Core Transport Buttons */}
        <div className="flex items-center gap-2 order-2 md:order-1 justify-center w-full md:w-auto flex-wrap">
          {/* Main Play / Pause */}
          <button
            id="dock-btn-play"
            onClick={onTogglePlay}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-bold transition shadow-lg cursor-pointer shrink-0 ${
              isPlaying
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/20'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
            }`}
            title={isPlaying ? 'Pause' : 'Play (Space)'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          {/* Stop */}
          <button
            id="dock-btn-stop"
            onClick={() => (onStop ? onStop() : audioEngine.stop())}
            className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 flex items-center justify-center transition cursor-pointer shrink-0"
            title="Stop & Reset to 0:00"
          >
            <Square className="w-4 h-4 sm:w-3.5 sm:h-3.5 fill-current" />
          </button>

          {/* Record Live Vocals */}
          <button
            id="dock-btn-record"
            onClick={onToggleRecord}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-bold transition shadow-lg cursor-pointer shrink-0 ${
              recordingStatus?.isRecording
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/40 animate-pulse ring-2 ring-rose-400'
                : recordingStatus?.isCountingIn
                ? 'bg-amber-500 text-slate-950 font-black shadow-amber-500/30 animate-bounce'
                : 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/40 shadow-rose-950/20'
            }`}
            title={
              recordingStatus?.isRecording
                ? `Recording in progress (${recordingStatus.duration.toFixed(1)}s) - Click to Finish Take`
                : recordingStatus?.isCountingIn
                ? `Count-in ${recordingStatus.countInNumber}...`
                : 'Record Live Vocals (Click to record your vocal take)'
            }
          >
            {recordingStatus?.isRecording ? (
              <Square className="w-4 h-4 fill-white" />
            ) : (
              <span className="w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center shadow-inner">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-200" />
              </span>
            )}
          </button>

          {/* Live Mic Toggle */}
          <button
            id="dock-btn-mic"
            onClick={onToggleMic}
            className={`h-10 sm:h-8 px-3 sm:px-2.5 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              isLiveMicActive
                ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
            }`}
            title="Toggle Live Audio Ingest"
          >
            <Mic className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">{isLiveMicActive ? 'LIVE' : 'MIC'}</span>
          </button>

          {/* 1-Click Auto-Mix & Match Vocals to Beat */}
          {onOpenAutoMix && (
            <button
              id="dock-btn-auto-mix"
              onClick={onOpenAutoMix}
              className="h-10 sm:h-8 px-3 sm:px-3 rounded-lg text-xs font-black bg-gradient-to-r from-amber-400 to-orange-500 hover:brightness-110 text-slate-950 border border-amber-300 shadow-md shadow-amber-500/20 transition cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95"
              title="✨ 1-Click Auto-Mix & Auto-Preset: Syncs beat and vocals perfectly"
            >
              <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
              <span>Auto-Mix</span>
            </button>
          )}

          {/* Skip Back Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleSkip(-5)}
              className="h-10 sm:h-auto px-3 sm:px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono font-bold flex items-center gap-0.5 transition cursor-pointer"
              title="Skip back 5 seconds"
            >
              <Rewind className="w-3 h-3" />
              <span className="hidden sm:inline">-5s</span>
            </button>
          </div>

          {/* Skip Forward Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleSkip(5)}
              className="h-10 sm:h-auto px-3 sm:px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono font-bold flex items-center gap-0.5 transition cursor-pointer"
              title="Skip forward 5 seconds"
            >
              <span className="hidden sm:inline">+5s</span>
              <FastForward className="w-3 h-3" />
            </button>
          </div>

          {/* Undo / Redo Quick Dock Buttons */}
          <div className="flex items-center gap-0.5 border-l border-slate-800/80 pl-1.5 ml-0.5">
            <button
              id="dock-btn-undo"
              onClick={onUndo}
              disabled={!canUndo}
              className={`h-10 sm:h-auto px-2 py-1 rounded flex items-center justify-center transition cursor-pointer ${
                canUndo
                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
                  : 'bg-slate-950/40 text-slate-600 border border-slate-900 cursor-not-allowed opacity-40'
              }`}
              title="Undo last studio action (⌘Z / Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              id="dock-btn-redo"
              onClick={onRedo}
              disabled={!canRedo}
              className={`h-10 sm:h-auto px-2 py-1 rounded flex items-center justify-center transition cursor-pointer ${
                canRedo
                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
                  : 'bg-slate-950/40 text-slate-600 border border-slate-900 cursor-not-allowed opacity-40'
              }`}
              title="Redo action (⌘⇧Z / Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* CENTER: Main Interactive Scrubber Slider */}
        <div className="w-full md:w-auto md:flex-1 flex items-center gap-2 sm:gap-3 px-1 sm:px-2 order-1 md:order-2">
          {/* Timecode Current */}
          <span className="font-mono text-xs font-bold text-cyan-300 min-w-[45px] sm:min-w-[58px] text-right">
            {formatTime(currentDisplayTime)}
          </span>

          {/* Range Scrubber Track */}
          <div className="flex-1 relative flex items-center group h-8 sm:h-auto py-2 sm:py-0">
            <input
              id="dock-scrubber-slider"
              type="range"
              min="0"
              max={safeDuration}
              step="0.01"
              value={currentDisplayTime}
              onChange={handleSliderChange}
              onMouseUp={handleSliderCommit}
              onTouchEnd={handleSliderCommit}
              className="w-full h-4 sm:h-5 sm:h-2.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400 z-10 focus:outline-none"
            />
          </div>

          {/* Total Duration */}
          <span className="font-mono text-xs text-slate-500 min-w-[45px] sm:min-w-[58px]">
            {formatTime(safeDuration)}
          </span>
        </div>

        {/* RIGHT: Speed Adjustments & Pitch/Formant Badge */}
        <div className="hidden md:flex items-center gap-2.5 w-full md:w-auto justify-end order-3">
          {/* Pitch & Formant Status Pill */}
          {pitchFormantSettings && (
            <button
              onClick={onOpenPitchFormant}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition cursor-pointer flex items-center gap-1.5 ${
                pitchFormantSettings.pitchSemitones !== 0 || pitchFormantSettings.formantSemitones !== 0
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title="Open Pitch & Formant Processor"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {pitchFormantSettings.pitchSemitones > 0
                  ? `+${pitchFormantSettings.pitchSemitones}`
                  : pitchFormantSettings.pitchSemitones}
                st /{' '}
                {pitchFormantSettings.formantSemitones > 0
                  ? `+${pitchFormantSettings.formantSemitones}`
                  : pitchFormantSettings.formantSemitones}
                F
              </span>
            </button>
          )}

          {/* Speed Menu Popover Button */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                vocalSpeed !== 1.0 || beatSpeed !== 1.0
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
              }`}
              title="Adjust Vocal & Beat Playback Speed"
            >
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              <span>{beatSpeed === vocalSpeed ? `${vocalSpeed.toFixed(2)}x` : `${vocalSpeed.toFixed(1)}v/${beatSpeed.toFixed(1)}b`}</span>
            </button>

            {/* Quick Speed Popover */}
            {showSpeedMenu && (
              <div className="absolute bottom-full right-0 mb-2 w-72 bg-slate-900 rounded-xl border border-slate-700 shadow-2xl p-3 text-xs space-y-3 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-amber-400" />
                    Playback Speed
                  </span>
                  <button
                    onClick={() => {
                      audioEngine.setMasterPlaybackRate(1.0);
                    }}
                    className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset 1.0x</span>
                  </button>
                </div>

                {/* Master Quick Speed Badges */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-slate-400">Master Sync Speed:</span>
                  <div className="grid grid-cols-5 gap-1 text-center font-mono font-bold text-[10px]">
                    {[0.75, 0.9, 1.0, 1.25, 1.5].map(rate => (
                      <button
                        key={rate}
                        onClick={() => audioEngine.setMasterPlaybackRate(rate)}
                        className={`py-1 rounded border transition cursor-pointer ${
                          vocalSpeed === rate && beatSpeed === rate
                            ? 'bg-amber-400 text-slate-950 border-amber-400'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Individual Vocal Speed Slider */}
                <div className="space-y-1 pt-1 border-t border-slate-800">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-cyan-400 font-semibold flex items-center gap-1">
                      <Mic className="w-3 h-3" />
                      Vocal Speed
                    </span>
                    <span className="font-mono font-bold text-cyan-300">{vocalSpeed.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={vocalSpeed}
                    onChange={e => audioEngine.setVocalPlaybackRate(parseFloat(e.target.value))}
                    className="w-full h-5 sm:h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>0.5x Slow</span>
                    <span>1.0x</span>
                    <span>2.0x Fast</span>
                  </div>
                </div>

                {/* Individual Beat Speed Slider */}
                <div className="space-y-1 pt-1 border-t border-slate-800">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <Music className="w-3 h-3" />
                      Beat Speed
                    </span>
                    <span className="font-mono font-bold text-amber-300">{beatSpeed.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={beatSpeed}
                    onChange={e => audioEngine.setBeatPlaybackRate(parseFloat(e.target.value))}
                    className="w-full h-5 sm:h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>0.5x Slow</span>
                    <span>1.0x</span>
                    <span>2.0x Fast</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
