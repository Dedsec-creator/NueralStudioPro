import React from 'react';
import {
  Radio,
  Square,
  X,
  Volume2,
  Headphones,
  Music,
  Sparkles,
  Check,
  AlertCircle
} from 'lucide-react';
import { RecordingStatus } from '../types';
import { audioEngine } from '../audio/audioEngine';

interface LiveRecordingHUDProps {
  recordingStatus: RecordingStatus;
  hasBeat: boolean;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  onToggleMonitoring: () => void;
}

export const LiveRecordingHUD: React.FC<LiveRecordingHUDProps> = ({
  recordingStatus,
  hasBeat,
  onStopRecording,
  onCancelRecording,
  onToggleMonitoring,
}) => {
  if (!recordingStatus.isRecording && !recordingStatus.isCountingIn) {
    return null;
  }

  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="fixed inset-x-0 bottom-16 sm:bottom-14 z-50 px-3 pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="max-w-3xl mx-auto pointer-events-auto">
        <div className="rounded-2xl bg-slate-950/95 border-2 border-rose-500/60 shadow-[0_0_50px_rgba(244,63,94,0.35)] backdrop-blur-xl p-3 sm:p-4 text-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Status / Countdown / Timer */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            {recordingStatus.isCountingIn ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 font-black text-2xl flex items-center justify-center animate-ping shadow-lg shadow-amber-500/30">
                  {recordingStatus.countInNumber}
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-400 animate-pulse">
                    Get Ready To Sing
                  </div>
                  <div className="text-sm font-semibold text-slate-200">
                    Recording starts in {recordingStatus.countInNumber}...
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-rose-500 animate-ping absolute" />
                  <div className="w-4 h-4 rounded-full bg-rose-600 relative z-10 shadow-lg shadow-rose-500/50" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-rose-400">
                      LIVE RECORDING
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-300">
                      Take #{recordingStatus.takeNumber}
                    </span>
                  </div>
                  <div className="font-mono text-xl sm:text-2xl font-black text-white tracking-wider">
                    {formatSeconds(recordingStatus.duration)}
                  </div>
                </div>
              </div>
            )}

            {/* Input Level Meter (RMS Volume) */}
            {recordingStatus.isRecording && (
              <div className="flex flex-col items-center gap-1 sm:ml-4">
                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-cyan-400" />
                  <span>MIC IN</span>
                </div>
                <div className="w-20 sm:w-28 h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-emerald-500 via-yellow-400 to-rose-500"
                    style={{ width: `${Math.min(100, Math.max(5, recordingStatus.inputLevel))}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Center: Info Badges */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            {hasBeat && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-300 font-mono text-[11px]">
                <Music className="w-3.5 h-3.5 text-amber-400" />
                <span>Beat Synced</span>
              </div>
            )}
            <button
              onClick={onToggleMonitoring}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                recordingStatus.liveMonitoring
                  ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Live Monitoring (Use headphones to avoid speaker feedback)"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>{recordingStatus.liveMonitoring ? 'Monitor: ON' : 'Monitor: OFF'}</span>
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              id="btn-cancel-recording-hud"
              onClick={onCancelRecording}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              title="Discard this take without saving"
            >
              <X className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Discard</span>
            </button>

            <button
              id="btn-stop-recording-hud"
              onClick={onStopRecording}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition cursor-pointer active:scale-95 ring-1 ring-rose-400/50"
              title="Stop and load this take into the Vocal Stem"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Finish & Keep Take</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
