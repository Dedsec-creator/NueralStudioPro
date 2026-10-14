import React, { useState } from 'react';
import { ExportQualityId, LibraryAsset, RenderExportOptions, SampleRateId } from '../types';
import { audioEngine } from '../audio/audioEngine';
import { showToast } from '../utils/toast';
import { downloadBlob } from '../utils/downloadHelper';
import {
  Disc,
  Sparkles,
  Download,
  Check,
  Music,
  Mic,
  Sliders,
  Radio,
  Layers,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  FileAudio,
  Activity,
  HardDrive
} from 'lucide-react';

interface AdvancedExportSectionProps {
  onExportComplete?: (asset: LibraryAsset) => void;
  defaultStemSelection?: 'master' | 'vocal_only' | 'beat_only';
}

export const AdvancedExportSection: React.FC<AdvancedExportSectionProps> = ({
  onExportComplete,
  defaultStemSelection = 'master',
}) => {
  // Format choice: WAV vs MP3
  const [selectedFormat, setSelectedFormat] = useState<'wav' | 'mp3'>('wav');

  // Bit Depth (for WAV)
  const [bitDepth, setBitDepth] = useState<16 | 24 | 32>(32);

  // Bitrate (for MP3)
  const [mp3Bitrate, setMp3Bitrate] = useState<128 | 192 | 256 | 320>(320);

  // Sample Rate
  const [sampleRate, setSampleRate] = useState<SampleRateId>(48000);

  // Stem Selection
  const [stemSelection, setStemSelection] = useState<'master' | 'vocal_only' | 'beat_only'>(defaultStemSelection);

  // Custom File Name
  const [customFileName, setCustomFileName] = useState<string>('');

  // Processing & UI States
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState<string>('');
  const [lastExportedAsset, setLastExportedAsset] = useState<LibraryAsset | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Quality presets
  const applyPreset = (preset: {
    format: 'wav' | 'mp3';
    bitDepth?: 16 | 24 | 32;
    mp3Bitrate?: 128 | 192 | 256 | 320;
    sampleRate: SampleRateId;
    stem: 'master' | 'vocal_only' | 'beat_only';
  }) => {
    setSelectedFormat(preset.format);
    if (preset.bitDepth) setBitDepth(preset.bitDepth);
    if (preset.mp3Bitrate) setMp3Bitrate(preset.mp3Bitrate);
    setSampleRate(preset.sampleRate);
    setStemSelection(preset.stem);
  };

  // Compute calculated specs
  const getQualityId = (): ExportQualityId => {
    if (selectedFormat === 'mp3') {
      if (mp3Bitrate === 256) return 'mp3_256';
      if (mp3Bitrate === 192) return 'mp3_192';
      if (mp3Bitrate === 128) return 'mp3_128';
      return 'mp3_320';
    }
    if (bitDepth === 16) return 'wav_16bit';
    if (bitDepth === 24) return 'wav_24bit';
    return 'wav_32float';
  };

  const getDynamicRange = (): string => {
    if (selectedFormat === 'mp3') return '~96 dB (Perceptual MPEG Audio)';
    if (bitDepth === 32) return '1,528 dB (32-Bit Float • Clipping-Proof)';
    if (bitDepth === 24) return '144 dB (24-Bit Studio Master)';
    return '96 dB (16-Bit Red Book CD)';
  };

  const getEstimatedFileSizePerMinute = (): string => {
    if (selectedFormat === 'mp3') {
      const mbPerMin = (mp3Bitrate * 60) / (8 * 1024);
      return `~${mbPerMin.toFixed(1)} MB / min`;
    }
    // Stereo WAV: 2 channels * bytesPerSample * sampleRate * 60 sec
    const bytesPerSample = bitDepth / 8;
    const mbPerMin = (2 * bytesPerSample * sampleRate * 60) / (1024 * 1024);
    return `~${mbPerMin.toFixed(1)} MB / min`;
  };

  const handleStartExport = async () => {
    setIsRendering(true);
    setRenderProgress('Initializing DSP chain & lookahead buffers...');
    setLastExportedAsset(null);

    try {
      await audioEngine.initialize();
      // Auto-load studio demo stems if none currently exist in project
      if (!audioEngine.getVocalBuffer() && !audioEngine.getBeatBuffer()) {
        setRenderProgress('Loading studio demo tracks for export...');
        await audioEngine.loadDemoStems('rap_f_minor');
      }

      await new Promise(r => setTimeout(r, 120));
      setRenderProgress('Offline rendering vocal pitch/formant, mic modeling & insert plugins...');
      
      const exportOptions: RenderExportOptions = {
        stemSelection,
        format: getQualityId(),
        sampleRate,
        customFileName: customFileName.trim() || undefined,
        audioFormat: selectedFormat,
        bitDepth: selectedFormat === 'wav' ? bitDepth : undefined,
        mp3Bitrate: selectedFormat === 'mp3' ? mp3Bitrate : undefined,
      };

      const res = await audioEngine.renderOfflineBounce(exportOptions);
      setRenderProgress('Finalizing container metadata & waveform analysis...');
      await new Promise(r => setTimeout(r, 100));

      const asset = res.asset;
      setLastExportedAsset(asset);
      onExportComplete?.(asset);

      // Auto-trigger browser download safely for mobile & desktop
      const blobToDownload = asset?.blob || (res as unknown as Blob);
      if (blobToDownload) {
        downloadBlob(blobToDownload, asset?.name || `Studio_Export_${Date.now()}.${selectedFormat}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Render Export Error: ${msg}`, 'error');
    } finally {
      setIsRendering(false);
      setRenderProgress('');
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-5 shadow-2xl relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-purple-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md">
            <Disc className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black tracking-wide text-white uppercase flex items-center gap-2">
                Advanced Studio Export
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/40 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                32-BIT STUDIO QUALITY AUDIO
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Render uncompressed 32-bit Float studio masters or compressed MP3 broadcast audio with custom sample rate &amp; bit-depth
            </p>
          </div>
        </div>

        {/* 1-Click Master Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase text-slate-400 mr-1 hidden sm:inline">Presets:</span>
          <button
            onClick={() => applyPreset({ format: 'wav', bitDepth: 32, sampleRate: 96000, stem: 'master' })}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer border flex items-center gap-1 ${
              selectedFormat === 'wav' && bitDepth === 32 && sampleRate === 96000
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/20'
                : 'bg-slate-950/80 hover:bg-slate-800 border-slate-700/80 text-amber-300'
            }`}
            title="32-Bit Float WAV @ 96kHz Master Mix"
          >
            <span>💎 32-Bit / 96k</span>
          </button>

          <button
            onClick={() => applyPreset({ format: 'wav', bitDepth: 24, sampleRate: 48000, stem: 'master' })}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer border flex items-center gap-1 ${
              selectedFormat === 'wav' && bitDepth === 24 && sampleRate === 48000
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                : 'bg-slate-950/80 hover:bg-slate-800 border-slate-700/80 text-cyan-300'
            }`}
            title="24-Bit PCM WAV @ 48kHz Commercial Master"
          >
            <span>24-Bit / 48k</span>
          </button>

          <button
            onClick={() => applyPreset({ format: 'wav', bitDepth: 16, sampleRate: 44100, stem: 'master' })}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer border flex items-center gap-1 ${
              selectedFormat === 'wav' && bitDepth === 16 && sampleRate === 44100
                ? 'bg-purple-500 text-white border-purple-400'
                : 'bg-slate-950/80 hover:bg-slate-800 border-slate-700/80 text-purple-300'
            }`}
            title="16-Bit PCM WAV @ 44.1kHz Red Book CD Audio"
          >
            <span>16-Bit CD</span>
          </button>

          <button
            onClick={() => applyPreset({ format: 'mp3', mp3Bitrate: 320, sampleRate: 48000, stem: 'master' })}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer border flex items-center gap-1 ${
              selectedFormat === 'mp3' && mp3Bitrate === 320
                ? 'bg-rose-500 text-white border-rose-400'
                : 'bg-slate-950/80 hover:bg-slate-800 border-slate-700/80 text-rose-300'
            }`}
            title="320kbps MP3 Streaming Broadcast"
          >
            <span>320k MP3</span>
          </button>
        </div>
      </div>

      {/* Main Controls Grid */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-5 relative z-10">
        {/* Left Column: Format & Quality Selectors (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* 1. Format Selection Toggle: WAV vs MP3 */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>1. Audio Encoding Format</span>
              <span className="text-[11px] text-slate-400 font-normal">
                {selectedFormat === 'wav' ? 'Uncompressed Lossless (DAW & Master)' : 'Compressed Streaming (MPEG Layer-3)'}
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedFormat('wav')}
                className={`py-2.5 px-4 rounded-lg font-mono text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  selectedFormat === 'wav'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/25 ring-1 ring-cyan-300/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <FileAudio className="w-4 h-4" />
                <span>WAV (Studio Lossless)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('mp3')}
                className={`py-2.5 px-4 rounded-lg font-mono text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  selectedFormat === 'mp3'
                    ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-md shadow-rose-500/25 ring-1 ring-rose-300/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>MP3 (Web &amp; Broadcast)</span>
              </button>
            </div>
          </div>

          {/* 2. Bit-Depth (WAV) OR Bitrate (MP3) */}
          {selectedFormat === 'wav' ? (
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>2. WAV Bit-Depth Resolution</span>
                <span className="text-[10px] text-amber-300 font-mono font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  32-Bit Float Recommended for Maximum Headroom
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 32-Bit Float Option */}
                <button
                  type="button"
                  onClick={() => setBitDepth(32)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    bitDepth === 32
                      ? 'bg-amber-400/10 border-amber-400/80 ring-2 ring-amber-400/30 text-white shadow-lg shadow-amber-500/10'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-amber-300 flex items-center gap-1">
                      <span>💎 32-Bit Float</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold">
                      STUDIO
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-200 font-semibold">IEEE Floating-Point</div>
                  <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                    Infinite dynamic headroom. Zero digital clipping or inter-sample peak overs.
                  </div>
                </button>

                {/* 24-Bit PCM Option */}
                <button
                  type="button"
                  onClick={() => setBitDepth(24)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    bitDepth === 24
                      ? 'bg-cyan-500/10 border-cyan-400/80 ring-2 ring-cyan-400/30 text-white shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-cyan-300">24-Bit PCM</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                      PRO MASTER
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-200 font-semibold">144 dB Dynamic Range</div>
                  <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                    Industry standard for commercial release (Spotify, Apple Music, Tidal).
                  </div>
                </button>

                {/* 16-Bit PCM Option */}
                <button
                  type="button"
                  onClick={() => setBitDepth(16)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    bitDepth === 16
                      ? 'bg-purple-500/10 border-purple-400/80 ring-2 ring-purple-400/30 text-white shadow-lg shadow-purple-500/10'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-purple-300">16-Bit PCM</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                      CD RED BOOK
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-200 font-semibold">96 dB Dynamic Range</div>
                  <div className="text-[10px] text-slate-400 mt-1 leading-snug">
                    Standard Compact Disc audio. Universal playback on legacy car and home stereo.
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>2. MP3 Constant Bitrate (CBR)</span>
                <span className="text-[10px] text-rose-300 font-mono">LAME Layer III Engine</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { rate: 320 as const, label: '320 kbps', badge: 'INSANE', desc: 'Audiophile MP3' },
                  { rate: 256 as const, label: '256 kbps', badge: 'HIGH', desc: 'Radio Broadcast' },
                  { rate: 192 as const, label: '192 kbps', badge: 'STREAM', desc: 'Standard Web' },
                  { rate: 128 as const, label: '128 kbps', badge: 'COMPACT', desc: 'Fast Mobile' },
                ].map((item) => (
                  <button
                    key={item.rate}
                    type="button"
                    onClick={() => setMp3Bitrate(item.rate)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      mp3Bitrate === item.rate
                        ? 'bg-rose-500/10 border-rose-400/80 ring-2 ring-rose-400/30 text-white shadow-lg shadow-rose-500/10'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-rose-300">{item.label}</span>
                      <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                        {item.badge}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Sample Rate Selector */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>3. Sample Rate (Nyquist Frequency)</span>
              <span className="text-[11px] text-slate-400 font-mono">
                {sampleRate >= 96000 ? 'High-Resolution Audio' : 'Standard Audio Bandwidth'}
              </span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { rate: 44100 as SampleRateId, label: '44.1 kHz', tag: 'CD / Web' },
                { rate: 48000 as SampleRateId, label: '48.0 kHz', tag: 'DAW Default' },
                { rate: 88200 as SampleRateId, label: '88.2 kHz', tag: '2x Hi-Res' },
                { rate: 96000 as SampleRateId, label: '96.0 kHz', tag: 'Audiophile' },
                { rate: 192000 as SampleRateId, label: '192 kHz', tag: 'Archive' },
              ].map((sr) => (
                <button
                  key={sr.rate}
                  type="button"
                  onClick={() => setSampleRate(sr.rate)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    sampleRate === sr.rate
                      ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold shadow-md shadow-cyan-500/10'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-xs font-mono font-bold text-cyan-300">{sr.label}</div>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">{sr.tag}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Stem Routing, Filename & Technical Specs (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            {/* 4. Stem Selection Routing */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-2">
                4. Stem Channel Routing
              </label>
              <div className="space-y-1.5">
                {[
                  {
                    id: 'master' as const,
                    title: 'Full Synergistic Master Mix',
                    desc: 'Combined Vocal + Beat with full mastering limiter & auto-mix pocket EQ',
                    icon: Disc,
                    color: 'text-amber-400',
                  },
                  {
                    id: 'vocal_only' as const,
                    title: 'Tuned & Enhanced Vocal Stem',
                    desc: 'Acapella with autotune, AI enhancer, mic modulation & active plugins',
                    icon: Mic,
                    color: 'text-cyan-400',
                  },
                  {
                    id: 'beat_only' as const,
                    title: 'Instrumental Beat Groove Stem',
                    desc: 'Transient-aligned rhythm track with pocket carving applied',
                    icon: Music,
                    color: 'text-pink-400',
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isCur = stemSelection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStemSelection(item.id)}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                        isCur
                          ? 'bg-slate-800/90 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className={`p-2 rounded-lg bg-slate-900 ${item.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 truncate">
                        <div className="text-xs font-bold leading-tight truncate">{item.title}</div>
                        <div className="text-[10px] text-slate-400 leading-tight truncate mt-0.5">{item.desc}</div>
                      </div>
                      {isCur && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Custom File Name with Tokens */}
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>5. Output Filename</span>
                <span className="text-[10px] font-mono text-slate-400">Optional</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Master_Take1_32Bit_Studio"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-400"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-slate-400 uppercase">
                  .{selectedFormat}
                </span>
              </div>
            </div>

            {/* Technical Specifications Summary Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs font-mono space-y-2">
              <div className="flex items-center justify-between text-slate-400 pb-1.5 border-b border-slate-800/80">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Target Audio Specifications</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {selectedFormat.toUpperCase()} &bull; {selectedFormat === 'wav' ? `${bitDepth}-BIT` : `${mp3Bitrate}k`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Dynamic Range:</span>
                  <span className="text-white font-semibold truncate block">{getDynamicRange()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">File Size Ratio:</span>
                  <span className="text-white font-semibold block">{getEstimatedFileSizePerMinute()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Sample Rate:</span>
                  <span className="text-cyan-300 font-semibold block">{(sampleRate / 1000).toFixed(1)} kHz</span>
                </div>
                <div>
                  <span className="text-slate-500 block">DSP Mastering:</span>
                  <span className="text-emerald-300 font-semibold block">Full Brickwall Limiter</span>
                </div>
              </div>
            </div>
          </div>

          {/* Render Action Button */}
          <div className="pt-2">
            <button
              onClick={handleStartExport}
              disabled={isRendering}
              className={`w-full py-3.5 px-6 rounded-xl font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-xl cursor-pointer ${
                isRendering
                  ? 'bg-slate-800 text-slate-400 border border-slate-700 animate-pulse'
                  : 'bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 hover:from-amber-300 hover:via-rose-400 hover:to-purple-500 text-slate-950 font-black shadow-rose-500/20 ring-2 ring-amber-300/40 active:scale-95'
              }`}
            >
              {isRendering ? (
                <>
                  <Disc className="w-5 h-5 animate-spin text-amber-400" />
                  <span>{renderProgress || 'Rendering Studio Audio...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 fill-slate-950 text-slate-950" />
                  <span>
                    Render &amp; Export {selectedFormat === 'wav' ? `${bitDepth}-Bit WAV` : `${mp3Bitrate}kbps MP3`}
                  </span>
                  <Download className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Bar */}
      {lastExportedAsset && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex flex-wrap items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Successfully rendered and downloaded: <strong>{lastExportedAsset.name}</strong> ({lastExportedAsset.fileSize})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-900 text-emerald-200 text-[10px] border border-emerald-700">
              {lastExportedAsset.format} @ {(lastExportedAsset.sampleRate / 1000).toFixed(1)}kHz
            </span>
            <button
              onClick={() => {
                if (lastExportedAsset.blob) {
                  downloadBlob(lastExportedAsset.blob, lastExportedAsset.name);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Again</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
