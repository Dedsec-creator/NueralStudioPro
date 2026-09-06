import React, { useState } from 'react';
import { AudioMetrics, MasteringSettings } from '../types';
import { audioEngine } from '../audio/audioEngine';
import { Sliders, Download, Check, Sparkles, Volume2, ShieldCheck, Waves, Disc } from 'lucide-react';

interface MasteringSuiteProps {
  settings: MasteringSettings;
  onChange: (updated: MasteringSettings) => void;
  metrics: AudioMetrics;
}

export const MasteringSuite: React.FC<MasteringSuiteProps> = ({ settings, onChange, metrics }) => {
  const [isBouncing, setIsBouncing] = useState(false);
  const [bounceSuccess, setBounceSuccess] = useState(false);
  const [savedAssetName, setSavedAssetName] = useState<string | null>(null);

  const handleOfflineBounce = async () => {
    setIsBouncing(true);
    setBounceSuccess(false);
    setSavedAssetName(null);

    try {
      const res = await audioEngine.renderOfflineBounce({
        stemSelection: 'master',
        format: 'wav_24bit',
        sampleRate: 48000,
      });

      // res has .asset and is also a Blob
      const wavBlob = res;
      const downloadName = res.asset?.name || `NeuralTune_Ultra_Master_${Date.now()}.wav`;

      // Trigger automatic browser download
      const url = URL.createObjectURL(wavBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = downloadName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setSavedAssetName(res.asset?.name || 'Master WAV');
      setBounceSuccess(true);
      setTimeout(() => {
        setBounceSuccess(false);
        setSavedAssetName(null);
      }, 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Mastering bounce failed: ${msg}`);
    } finally {
      setIsBouncing(false);
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-slate-800 p-5 shadow-2xl backdrop-blur-md">
      {/* Header with Offline WAV Render button */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wide text-white uppercase flex items-center gap-2">
              Final Vocal & Mixdown Mastering Suite
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Offline Web Audio High-Resolution 24-Bit / 48kHz Engine
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Master bypass */}
          <button
            id="btn-toggle-mastering"
            onClick={() => onChange({ ...settings, enabled: !settings.enabled })}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              settings.enabled
                ? 'bg-pink-500 text-slate-950 shadow-md shadow-pink-500/25 ring-2 ring-pink-400/40'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {settings.enabled ? 'ACTIVE' : 'BYPASS'}
          </button>

          {/* Offline Bounce Button */}
          <button
            id="btn-offline-bounce"
            onClick={handleOfflineBounce}
            disabled={isBouncing}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-lg transition-all cursor-pointer ${
              bounceSuccess
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                : isBouncing
                ? 'bg-slate-800 text-slate-400 border border-slate-700 animate-pulse'
                : 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white shadow-pink-500/20'
            }`}
            title="Renders the entire vocal session through the DSP graph into studio 24-bit 48kHz WAV audio"
          >
            {isBouncing ? (
              <>
                <Disc className="w-4 h-4 animate-spin" />
                <span>Bouncing Studio WAV...</span>
              </>
            ) : bounceSuccess ? (
              <>
                <Check className="w-4 h-4 text-slate-950" />
                <span>WAV Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export Master WAV</span>
              </>
            )}
          </button>
        </div>
      </div>

      {savedAssetName && (
        <div className="mt-3 flex items-center justify-between p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-300 font-mono">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Master render complete: <strong>{savedAssetName}</strong> downloaded and saved to your Studio Library!</span>
          </div>
          <span className="text-[10px] bg-emerald-900/60 px-2 py-0.5 rounded text-emerald-200 border border-emerald-500/30">
            24-Bit / 48kHz WAV
          </span>
        </div>
      )}

      {/* Main Grid: Telemetry Meters (Left 4 cols) + Mastering Controls (Right 8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
        {/* Real-time Loudness & Metering Rack (Col 1-4) */}
        <div className="lg:col-span-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-pink-400" />
              Loudness & Dynamics
            </span>
            <span className="text-[10px] font-mono text-slate-400">EBU R128 Compliant</span>
          </div>

          {/* Integrated LUFS & Peak Readout */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Integrated LUFS</span>
              <span className="text-xl font-black font-mono text-pink-400">
                {metrics.lufs} <span className="text-xs font-normal">LUFS</span>
              </span>
            </div>

            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">True-Peak</span>
              <span className="text-xl font-black font-mono text-slate-100">
                {metrics.peakDb} <span className="text-xs font-normal">dBFS</span>
              </span>
            </div>
          </div>

          {/* Output RMS Meter Bar */}
          <div>
            <div className="flex justify-between text-[11px] font-mono mb-1">
              <span className="text-slate-400">Master Level RMS:</span>
              <span className="text-white font-bold">{metrics.outputRmsDb} dB</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-800 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-rose-500 rounded-full transition-all duration-75"
                style={{ width: `${Math.max(0, Math.min(100, (metrics.outputRmsDb + 60) * 1.66))}%` }}
              />
            </div>
          </div>

          {/* Compressor Gain Reduction Bar */}
          <div>
            <div className="flex justify-between text-[11px] font-mono mb-1">
              <span className="text-slate-400">Glue Gain Reduction:</span>
              <span className="text-pink-400 font-bold">-{metrics.gainReductionDb} dB</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
              <div
                className="h-full bg-pink-500 rounded-full transition-all duration-75"
                style={{ width: `${Math.min(100, (metrics.gainReductionDb / 18) * 100)}%` }}
              />
            </div>
          </div>

          {/* DSP Engine Telemetry */}
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
            <div>Sample Rate: <span className="text-white">48,000 Hz</span></div>
            <div>Processing: <span className="text-pink-300">32-Bit Float</span></div>
            <div>Buffer Latency: <span className="text-emerald-400">{metrics.latencyMs} ms</span></div>
            <div>DSP Load: <span className="text-white">{metrics.dspLoadPercent}%</span></div>
          </div>
        </div>

        {/* Mastering DSP Parameter Controls (Col 5-12) */}
        <div className="lg:col-span-8 space-y-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-slate-200 block pb-2 border-b border-slate-800">
            Master Equalization, Glue Compression & Stereo Width
          </span>

          {/* 4-Band Mastering EQ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Low Cut */}
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Sub Cut:</span>
                <span className="font-mono text-pink-400 font-bold">{settings.lowCut} Hz</span>
              </div>
              <input
                type="range"
                min="20"
                max="60"
                value={settings.lowCut}
                onChange={e => onChange({ ...settings, lowCut: Number(e.target.value) })}
                className="w-full accent-pink-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Bass Gain */}
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Bass Shelf:</span>
                <span className="font-mono text-pink-400 font-bold">{settings.bassGain > 0 ? `+${settings.bassGain}` : settings.bassGain} dB</span>
              </div>
              <input
                type="range"
                min="-6"
                max="6"
                step="0.5"
                value={settings.bassGain}
                onChange={e => onChange({ ...settings, bassGain: Number(e.target.value) })}
                className="w-full accent-pink-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Mid Gain */}
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Mid Presence:</span>
                <span className="font-mono text-pink-400 font-bold">{settings.midGain > 0 ? `+${settings.midGain}` : settings.midGain} dB</span>
              </div>
              <input
                type="range"
                min="-6"
                max="6"
                step="0.5"
                value={settings.midGain}
                onChange={e => onChange({ ...settings, midGain: Number(e.target.value) })}
                className="w-full accent-pink-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* High Air Gain */}
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">12kHz Air:</span>
                <span className="font-mono text-pink-400 font-bold">+{settings.highAirGain} dB</span>
              </div>
              <input
                type="range"
                min="-4"
                max="6"
                step="0.5"
                value={settings.highAirGain}
                onChange={e => onChange({ ...settings, highAirGain: Number(e.target.value) })}
                className="w-full accent-pink-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>
          </div>

          {/* Dynamics & Imager Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {/* VCA Glue Compressor Threshold */}
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Glue Threshold:</span>
                <span className="font-mono text-pink-400 font-bold">{settings.compThreshold} dB</span>
              </div>
              <input
                type="range"
                min="-30"
                max="-6"
                value={settings.compThreshold}
                onChange={e => onChange({ ...settings, compThreshold: Number(e.target.value) })}
                className="w-full accent-pink-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Tape Saturation & Warmth */}
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Tape Warmth Drive:</span>
                <span className="font-mono text-pink-400 font-bold">{settings.tapeDrive}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.tapeDrive}
                onChange={e => onChange({ ...settings, tapeDrive: Number(e.target.value) })}
                className="w-full accent-pink-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Stereo Width Imager */}
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Stereo Imager Width:</span>
                <span className="font-mono text-pink-400 font-bold">{settings.stereoWidth}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="180"
                value={settings.stereoWidth}
                onChange={e => onChange({ ...settings, stereoWidth: Number(e.target.value) })}
                className="w-full accent-pink-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
