import React, { useState, useEffect, useRef } from 'react';
import { LibraryAsset, LibraryAssetType, RenderExportOptions } from '../types';
import { audioEngine } from '../audio/audioEngine';
import {
  FolderArchive,
  Download,
  Play,
  Pause,
  Trash2,
  Upload,
  Layers,
  Music,
  Mic,
  Disc,
  Clock,
  HardDrive,
  FileAudio,
  Check,
  Sparkles,
  Search,
  Filter,
  ArrowRightCircle,
  Sliders,
  AlertCircle
} from 'lucide-react';

interface LibrarySectionProps {
  onTracksChanged?: () => void;
}

export const LibrarySection: React.FC<LibrarySectionProps> = ({ onTracksChanged }) => {
  const [assets, setAssets] = useState<LibraryAsset[]>(audioEngine.getLibraryAssets());
  const [activeTab, setActiveTab] = useState<'all' | 'imported' | 'renders'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingAssetId, setPlayingAssetId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);
  const [exportOptions, setExportOptions] = useState<RenderExportOptions>({
    stemSelection: 'master',
    format: 'wav_24bit',
    sampleRate: 48000,
    customFileName: '',
  });

  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputVocalRef = useRef<HTMLInputElement | null>(null);
  const fileInputBeatRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsubscribe = audioEngine.subscribeLibrary((updated) => {
      setAssets(updated);
    });
    return () => {
      unsubscribe();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const handlePlayPreview = (asset: LibraryAsset) => {
    if (playingAssetId === asset.id) {
      // Pause
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingAssetId(null);
      return;
    }

    if (!asset.audioUrl && !asset.blob && asset.isFactoryDemo) {
      // For factory demos, trigger engine playback
      audioEngine.seek(0);
      audioEngine.play();
      setPlayingAssetId(asset.id);
      return;
    }

    const src = asset.audioUrl || (asset.blob ? URL.createObjectURL(asset.blob) : '');
    if (!src) return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onended = () => setPlayingAssetId(null);
    }

    audioRef.current.src = src;
    audioRef.current.play().catch(console.error);
    setPlayingAssetId(asset.id);
  };

  const handleDownload = (asset: LibraryAsset) => {
    if (asset.blob) {
      const url = URL.createObjectURL(asset.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = asset.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (asset.audioUrl && asset.audioUrl.startsWith('blob:')) {
      const a = document.createElement('a');
      a.href = asset.audioUrl;
      a.download = asset.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // If no blob is cached (e.g. factory demo), bounce and download
      audioEngine.renderOfflineBounce().then((res) => {
        const url = URL.createObjectURL(res);
        const a = document.createElement('a');
        a.href = url;
        a.download = asset.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }).catch(console.error);
    }
  };

  const handleDelete = (id: string) => {
    if (playingAssetId === id && audioRef.current) {
      audioRef.current.pause();
      setPlayingAssetId(null);
    }
    audioEngine.deleteLibraryAsset(id);
  };

  const handleLoadIntoSession = async (asset: LibraryAsset, target: 'vocal' | 'beat') => {
    setLoadingTrackId(asset.id);
    try {
      const success = await audioEngine.loadLibraryAssetIntoTrack(asset, target);
      if (success) {
        onTracksChanged?.();
      }
    } finally {
      setLoadingTrackId(null);
    }
  };

  const handleQuickExport = async () => {
    setIsExporting(true);
    setExportSuccessMessage(null);
    try {
      const res = await audioEngine.renderOfflineBounce(exportOptions);
      setExportSuccessMessage(`Exported: ${res.asset.name} (${res.asset.fileSize})`);
      setTimeout(() => setExportSuccessMessage(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Export failed: ${msg}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>, type: 'vocal' | 'beat') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'vocal') {
      await audioEngine.loadVocalFile(file);
    } else {
      await audioEngine.loadBeatFile(file);
    }
    onTracksChanged?.();
    e.target.value = '';
  };

  // Filtered assets
  const filteredAssets = assets.filter(a => {
    const matchesTab =
      activeTab === 'all'
        ? true
        : activeTab === 'imported'
        ? a.type === 'imported_vocal' || a.type === 'imported_beat'
        : a.type.startsWith('rendered_');

    const matchesSearch =
      searchQuery.trim() === '' ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.notes && a.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.presetName && a.presetName.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTab && matchesSearch;
  });

  const importedCount = assets.filter(a => a.type.startsWith('imported_')).length;
  const rendersCount = assets.filter(a => a.type.startsWith('rendered_')).length;

  return (
    <div className="space-y-6">
      {/* Top Header & Overview Bar */}
      <div className="rounded-2xl bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-slate-800 p-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 via-cyan-500/20 to-pink-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-wide text-white uppercase">
                  Studio Asset &amp; Render Library
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {assets.length} TOTAL ASSETS
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Manage all imported stems, beat grooves, and 24-bit / 48kHz offline master renders
              </p>
            </div>
          </div>

          {/* Quick Import Buttons */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputVocalRef}
              accept="audio/*"
              className="hidden"
              onChange={(e) => handleImportFile(e, 'vocal')}
            />
            <input
              type="file"
              ref={fileInputBeatRef}
              accept="audio/*"
              className="hidden"
              onChange={(e) => handleImportFile(e, 'beat')}
            />

            <button
              onClick={() => fileInputVocalRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Import Vocal</span>
            </button>

            <button
              onClick={() => fileInputBeatRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Import Beat</span>
            </button>
          </div>
        </div>

        {/* Quick Bounce & Render Bar */}
        <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-5 space-y-1">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Disc className="w-4 h-4 text-pink-400" />
              High-Fidelity Studio Bounce &amp; Render
            </span>
            <p className="text-[11px] text-slate-400">
              Captures all active DSP features: Pitch/Formant, Auto-Gate, Mic Locker, AI Enhancer, Plugins &amp; Master Limiter.
            </p>
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <select
              value={exportOptions.stemSelection}
              onChange={(e) => setExportOptions({ ...exportOptions, stemSelection: e.target.value as any })}
              className="bg-slate-900 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="master">Full Synergistic Master Mix</option>
              <option value="vocal_only">Tuned &amp; Enhanced Vocal Stem Only</option>
              <option value="beat_only">Groove Beat Stem Only</option>
            </select>

            <select
              value={exportOptions.format}
              onChange={(e) => setExportOptions({ ...exportOptions, format: e.target.value as any })}
              className="bg-slate-900 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="wav_24bit">24-Bit / 48kHz WAV</option>
              <option value="wav_16bit">16-Bit / 44.1kHz WAV</option>
            </select>
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button
              onClick={handleQuickExport}
              disabled={isExporting}
              className={`w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg ${
                isExporting
                  ? 'bg-slate-800 text-slate-400 border border-slate-700 animate-pulse'
                  : 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-white shadow-pink-500/20'
              }`}
            >
              {isExporting ? (
                <>
                  <Disc className="w-4 h-4 animate-spin text-white" />
                  <span>Rendering DSP Graph...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Render &amp; Save to Library</span>
                </>
              )}
            </button>
          </div>
        </div>

        {exportSuccessMessage && (
          <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-300 font-mono">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportSuccessMessage}</span>
          </div>
        )}

        {/* Tab Selector & Search Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-3 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Assets ({assets.length})
            </button>
            <button
              onClick={() => setActiveTab('imported')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'imported'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3 h-3 text-cyan-400" />
              <span>Imported Stems ({importedCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('renders')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'renders'
                  ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Disc className="w-3 h-3 text-pink-400" />
              <span>Master Renders ({rendersCount})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search library assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 text-slate-200 text-xs border border-slate-800 focus:outline-none focus:border-cyan-500 placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Asset Cards Grid */}
      {filteredAssets.length === 0 ? (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <FileAudio className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-300">No assets found in this view</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Import an audio stem or render your mix using the Export Master button above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssets.map((asset) => {
            const isPlaying = playingAssetId === asset.id;
            const isRender = asset.type.startsWith('rendered_');
            const isVocal = asset.type.includes('vocal');
            const isLoading = loadingTrackId === asset.id;

            return (
              <div
                key={asset.id}
                className={`rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between ${
                  isPlaying
                    ? 'bg-slate-900 border-cyan-500/50 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Card Header with Badges */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          isRender
                            ? 'bg-pink-500/10 border-pink-500/30 text-pink-400'
                            : isVocal
                            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        }`}
                      >
                        {isRender ? <Disc className="w-4 h-4" /> : isVocal ? <Mic className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                      </div>

                      <div className="overflow-hidden">
                        <h4 className="text-xs font-bold text-white truncate" title={asset.name}>
                          {asset.name}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                          <span>{asset.format}</span>
                          <span>&bull;</span>
                          <span>{asset.duration.toFixed(1)}s</span>
                          <span>&bull;</span>
                          <span>{asset.fileSize}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${
                          isRender
                            ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                            : isVocal
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {isRender ? 'RENDER MASTER' : isVocal ? 'VOCAL STEM' : 'BEAT STEM'}
                      </span>

                      {!asset.isFactoryDemo && (
                        <button
                          onClick={() => handleDelete(asset.id)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          title="Delete asset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notes / Preset metadata */}
                  {asset.notes && (
                    <p className="text-[11px] text-slate-400 mt-2.5 font-mono line-clamp-2">
                      {asset.notes}
                    </p>
                  )}

                  {/* Mini waveform bars visualizer */}
                  {asset.peaks && asset.peaks.length > 0 && (
                    <div className="flex items-center gap-0.5 h-6 my-3 bg-slate-950/60 p-1 rounded-lg border border-slate-800/60">
                      {asset.peaks.slice(0, 48).map((peak, idx) => (
                        <div
                          key={idx}
                          className={`flex-1 rounded-full transition-all ${
                            isPlaying ? 'bg-cyan-400' : 'bg-slate-700'
                          }`}
                          style={{
                            height: `${Math.max(15, peak * 100)}%`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/80 mt-2">
                  <div className="flex items-center gap-1.5">
                    {/* Play/Pause Preview */}
                    <button
                      onClick={() => handlePlayPreview(asset)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        isPlaying
                          ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                          : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isPlaying ? 'Pause' : 'Preview'}</span>
                    </button>

                    {/* Download WAV */}
                    <button
                      onClick={() => handleDownload(asset)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                      title="Download audio file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Load into Session Options */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleLoadIntoSession(asset, isVocal ? 'vocal' : 'beat')}
                      disabled={isLoading}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 text-[11px] font-bold border border-slate-700 hover:border-cyan-500/40 transition cursor-pointer"
                      title={`Load this file into the current ${isVocal ? 'Vocal' : 'Beat'} stem`}
                    >
                      <ArrowRightCircle className="w-3 h-3" />
                      <span>{isLoading ? 'Loading...' : `Load into ${isVocal ? 'Vocal' : 'Beat'}`}</span>
                    </button>

                    {/* Quick alternate target option if needed */}
                    {isVocal && (
                      <button
                        onClick={() => handleLoadIntoSession(asset, 'beat')}
                        className="text-[10px] text-slate-500 hover:text-slate-300 px-1.5 py-1 rounded hover:bg-slate-800 transition cursor-pointer"
                        title="Load as Beat Track"
                      >
                        as Beat
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
