import React, { useEffect, useRef } from 'react';
import { PitchTrackData } from '../types';
import { Activity, Target, Waves } from 'lucide-react';

interface PitchVisualizerProps {
  pitchData: PitchTrackData | null;
}

export const PitchVisualizer: React.FC<PitchVisualizerProps> = ({ pitchData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<{ freq: number; targetMidi: number; detectedMidi: number }[]>([]);

  useEffect(() => {
    // Record current pitch point to history
    if (pitchData) {
      historyRef.current.push({
        freq: pitchData.frequency,
        targetMidi: pitchData.targetMidiNote,
        detectedMidi: pitchData.midiNote,
      });
    } else {
      historyRef.current.push({
        freq: 0,
        targetMidi: 0,
        detectedMidi: 0,
      });
    }

    if (historyRef.current.length > 90) {
      historyRef.current.shift();
    }

    // Skip redundant canvas repainting during prolonged silence
    const history = historyRef.current;
    if (!pitchData && history.length >= 10 && history.slice(-6).every(h => h.freq === 0)) {
      return;
    }

    // Render onto canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background OLED dark slate
    ctx.fillStyle = '#060911';
    ctx.fillRect(0, 0, width, height);

    // Draw horizontal semitone grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const numLines = 8;
    for (let i = 1; i < numLines; i++) {
      const y = (height / numLines) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vertical sweep lines
    ctx.strokeStyle = '#0f172a';
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    if (history.length < 2) return;

    // Draw target note reference trajectory (emerald line)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    let hasTargetPoint = false;

    for (let i = 0; i < history.length; i++) {
      const p = history[i];
      if (p.targetMidi > 0) {
        const x = (i / (history.length - 1)) * width;
        // Map midi range 48 (C3) - 76 (E5)
        const normY = 1 - (p.targetMidi - 48) / 28;
        const y = Math.max(10, Math.min(height - 10, normY * height));
        if (!hasTargetPoint) {
          ctx.moveTo(x, y);
          hasTargetPoint = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    if (hasTargetPoint) ctx.stroke();
    ctx.setLineDash([]);

    // Draw actual singing detected pitch trajectory (cyan glowing curve)
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    let hasPoint = false;

    for (let i = 0; i < history.length; i++) {
      const p = history[i];
      if (p.detectedMidi > 0) {
        const x = (i / (history.length - 1)) * width;
        const normY = 1 - (p.detectedMidi - 48) / 28;
        const y = Math.max(10, Math.min(height - 10, normY * height));
        if (!hasPoint) {
          ctx.moveTo(x, y);
          hasPoint = true;
        } else {
          ctx.lineTo(x, y);
        }
      } else {
        hasPoint = false;
      }
    }
    if (hasPoint) ctx.stroke();
    ctx.shadowBlur = 0; // reset
  }, [pitchData]);

  // Cents deviation needle angle: -50 cents = -45 deg, +50 cents = +45 deg
  const cents = pitchData ? pitchData.centsDeviation : 0;
  const clampedCents = Math.max(-50, Math.min(50, cents));
  const needleAngle = (clampedCents / 50) * 45;
  const isPerfect = Math.abs(cents) <= 5;

  return (
    <div className="rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-5 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Real-Time Pitch Trajectory & Deviation
          </h3>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
            Detected Pitch
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Quantized Target
          </span>
        </div>
      </div>

      {/* Center Display Grid: Cents Meter Gauge (Left) + Pitch Wave Graph (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-4 items-center">
        {/* Cents Deviation Meter (Col 1-4) */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-3 rounded-xl bg-slate-950/80 border border-slate-800">
          <div className="relative w-40 h-24 flex items-center justify-center overflow-hidden">
            {/* Meter Arc Gauge */}
            <svg className="w-36 h-20" viewBox="0 0 120 70">
              {/* Red Flat zone */}
              <path d="M 15 60 A 45 45 0 0 1 45 20" fill="none" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
              {/* Green Center zone */}
              <path d="M 45 20 A 45 45 0 0 1 75 20" fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round" />
              {/* Red Sharp zone */}
              <path d="M 75 20 A 45 45 0 0 1 105 60" fill="none" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
              {/* Center Zero tick */}
              <line x1="60" y1="12" x2="60" y2="24" stroke="#f8fafc" strokeWidth="2" />
            </svg>

            {/* Needle */}
            <div
              className="absolute bottom-1 w-1 h-14 bg-gradient-to-t from-slate-400 to-white rounded-full origin-bottom shadow-lg transition-transform duration-75"
              style={{ transform: `rotate(${needleAngle}deg)` }}
            />
            {/* Center pivot cap */}
            <div className="absolute bottom-0 w-4 h-4 rounded-full bg-slate-200 border-2 border-slate-900" />
          </div>

          {/* Cents Readout */}
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-xl font-mono font-black ${
                isPerfect ? 'text-emerald-400 drop-shadow-[0_0_8px_#10b981]' : Math.abs(cents) < 15 ? 'text-cyan-400' : 'text-amber-400'
              }`}
            >
              {pitchData ? (cents > 0 ? `+${cents.toFixed(0)}¢` : `${cents.toFixed(0)}¢`) : '0¢'}
            </span>
            <span
              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                isPerfect ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isPerfect ? 'LOCK' : 'TUNE'}
            </span>
          </div>

          <div className="flex justify-between w-full text-[10px] font-mono text-slate-400 px-3 mt-1">
            <span>-50¢ Flat</span>
            <span className="text-white font-bold">0¢ In Tune</span>
            <span>+50¢ Sharp</span>
          </div>
        </div>

        {/* Real-time Oscilloscope Pitch Canvas (Col 5-8) */}
        <div className="md:col-span-5 relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col justify-center">
          <canvas
            ref={canvasRef}
            width={340}
            height={130}
            className="w-full h-[130px] block"
          />
          <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-[10px] font-mono text-slate-400">
            F0 Tracking: 65Hz &ndash; 1100Hz
          </div>
        </div>

        {/* Live Pitch Telemetry Panel (Col 9-12) */}
        <div className="md:col-span-3 space-y-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-mono">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="text-slate-400 flex items-center gap-1">
              <Waves className="w-3.5 h-3.5 text-cyan-400" />
              Detected:
            </span>
            <span className="text-sm font-bold text-cyan-400">
              {pitchData ? pitchData.noteName : '--'}
            </span>
          </div>

          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="text-slate-400 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              Target:
            </span>
            <span className="text-sm font-bold text-emerald-400">
              {pitchData ? pitchData.targetNoteName : '--'}
            </span>
          </div>

          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="text-slate-400">Frequency:</span>
            <span className="text-slate-200 font-bold">
              {pitchData ? `${pitchData.frequency} Hz` : '-- Hz'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Tracking Conf:</span>
            <span className="text-slate-200">
              {pitchData ? `${Math.round(pitchData.confidence * 100)}%` : '0%'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
