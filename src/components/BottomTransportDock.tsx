import React, { useState } from 'react';
import {
  FastForward,
  Gauge,
  Mic,
  Music,
  Pause,
  Play,
  Repeat,
  Rewind,
  RotateCcw,
  Sliders,
  Sparkles,
  Square,
  Volume2,
  Zap,
} from 'lucide-react';
import { NeuralTuneAudioEngine } from '../audio/audioEngine';
import { PitchFormantSettings, TrackStemInfo } from '../types';

interface BottomTransportDockProps {
  audioEngine: NeuralTuneAudioEngine;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  vocalTrack: TrackStemInfo;
  beatTrack: TrackStemInfo;
  isLiveMicActive: boolean;
  pitchFormantSettings?: PitchFormantSettings;
  onTogglePlay: () => void;
  onStop?: () => void;
  onToggleMic: () => void;
  onOpenPitchFormant?: () => void;
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
  onTogglePlay,
  onStop,
  onToggleMic,
  onOpenPitchFormant,
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

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* LEFT: Core Transport Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
          {/* Main Play / Pause */}
          <button
            id="dock-btn-play"
            onClick={onTogglePlay}
            className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold transition shadow-lg cursor-pointer ${
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
            className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 flex items-center justify-center transition cursor-pointer"
            title="Stop & Reset to 0:00"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          {/* Live Mic Toggle */}
          <button
            id="dock-btn-mic"
            onClick={onToggleMic}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
              isLiveMicActive
                ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
            }`}
            title="Toggle Live Audio Ingest"
          >
            <Mic className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isLiveMicActive ? 'LIVE' : 'MIC'}</span>
          </button>

          {/* Skip Back Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleSkip(-5)}
              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono font-bold flex items-center gap-0.5 transition cursor-pointer"
              title="Skip back 5 seconds"
            >
              <Rewind className="w-3 h-3" />
              <span>-5s</span>
            </button>
            <button
              onClick={() => handleSkip(-1)}
              className="px-1.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-[11px] font-mono transition cursor-pointer"
              title="Nudge back 1 second"
            >
              -1s
            </button>
          </div>

          {/* Skip Forward Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleSkip(1)}
              className="px-1.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-[11px] font-mono transition cursor-pointer"
              title="Nudge forward 1 second"
            >
              +1s
            </button>
            <button
              onClick={() => handleSkip(5)}
              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-mono font-bold flex items-center gap-0.5 transition cursor-pointer"
              title="Skip forward 5 seconds"
            >
              <span>+5s</span>
              <FastForward className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* CENTER: Main Interactive Scrubber Slider */}
        <div className="flex-1 w-full flex items-center gap-3 px-2">
          {/* Timecode Current */}
          <span className="font-mono text-xs font-bold text-cyan-300 min-w-[58px] text-right">
            {formatTime(currentDisplayTime)}
          </span>

          {/* Range Scrubber Track */}
          <div className="flex-1 relative flex items-center group">
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
              className="w-full h-2.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400 z-10 focus:outline-none"
            />
          </div>

          {/* Total Duration */}
          <span className="font-mono text-xs text-slate-500 min-w-[58px]">
            {formatTime(safeDuration)}
          </span>
        </div>

        {/* RIGHT: Speed Adjustments & Pitch/Formant Badge */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
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
                    className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
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
                    className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-400"
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
