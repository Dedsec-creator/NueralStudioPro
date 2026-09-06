import React, { useState, useMemo } from 'react';
import { ArtistVocalPreset } from '../types';
import { FACTORY_ARTIST_PRESETS, getCustomPresets, saveCustomPreset, deleteCustomPreset } from '../audio/presets';
import {
  Sparkles,
  Search,
  Check,
  Play,
  Cloud,
  Sliders,
  Radio,
  Layers,
  Wand2,
  Trash2,
  Plus,
  ArrowRight,
  Disc3,
  Download,
  Upload,
} from 'lucide-react';

interface PresetsSectionProps {
  activePresetId?: string;
  onApplyPreset: (preset: ArtistVocalPreset) => void;
  currentPresetState: Omit<ArtistVocalPreset, 'id' | 'name' | 'artist' | 'category' | 'description'>;
}

export const PresetsSection: React.FC<PresetsSectionProps> = ({
  activePresetId,
  onApplyPreset,
  currentPresetState,
}) => {
  const [customPresets, setCustomPresets] = useState<ArtistVocalPreset[]>(getCustomPresets());
  const [selectedArtist, setSelectedArtist] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [justAppliedId, setJustAppliedId] = useState<string | null>(null);
  const [showSaveCustom, setShowSaveCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  const [customCategory, setCustomCategory] = useState('Custom Vocal Chain');

  const allPresets = useMemo(() => {
    return [...FACTORY_ARTIST_PRESETS, ...customPresets];
  }, [customPresets]);

  // Unique artists list for filter tabs
  const artistTabs = useMemo(() => {
    const list = [
      { id: 'all', label: 'All Artists', count: allPresets.length },
      { id: 'Travis Scott', label: 'Travis Scott', count: allPresets.filter(p => p.artist === 'Travis Scott').length },
      { id: 'Hunxho', label: 'Hunxho', count: allPresets.filter(p => p.artist === 'Hunxho').length },
      { id: 'Don Toliver', label: 'Don Toliver', count: allPresets.filter(p => p.artist === 'Don Toliver').length },
      { id: 'Post Malone', label: 'Post Malone', count: allPresets.filter(p => p.artist === 'Post Malone').length },
      { id: 'Gunna', label: 'Gunna', count: allPresets.filter(p => p.artist === 'Gunna').length },
      { id: 'Lil Tecca', label: 'Lil Tecca', count: allPresets.filter(p => p.artist === 'Lil Tecca').length },
      { id: 'Loe Shimmy', label: 'Loe Shimmy', count: allPresets.filter(p => p.artist === 'Loe Shimmy').length },
      { id: 'Drake', label: 'Drake', count: allPresets.filter(p => p.artist === 'Drake').length },
      { id: 'Playboi Carti', label: 'Playboi Carti', count: allPresets.filter(p => p.artist === 'Playboi Carti').length },
      { id: 'custom', label: 'My Presets', count: customPresets.length },
    ];
    return list;
  }, [allPresets, customPresets]);

  // Filtered preset list
  const filteredPresets = useMemo(() => {
    return allPresets.filter(preset => {
      // Artist filter
      if (selectedArtist === 'custom') {
        if (!preset.isCustom && !preset.id.startsWith('custom-')) return false;
      } else if (selectedArtist !== 'all') {
        if (preset.artist.toLowerCase() !== selectedArtist.toLowerCase()) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = preset.name.toLowerCase().includes(q);
        const matchArtist = preset.artist.toLowerCase().includes(q);
        const matchSong = preset.song?.toLowerCase().includes(q);
        const matchAlbum = preset.album?.toLowerCase().includes(q);
        const matchCategory = preset.category.toLowerCase().includes(q);
        const matchKey = `${preset.tuning.key} ${preset.tuning.scale}`.toLowerCase().includes(q);
        const matchMic = preset.mic.selectedMic.toLowerCase().includes(q);
        return matchName || matchArtist || matchSong || matchAlbum || matchCategory || matchKey || matchMic;
      }

      return true;
    });
  }, [allPresets, selectedArtist, searchQuery]);

  const handleApply = (preset: ArtistVocalPreset) => {
    onApplyPreset(preset);
    setJustAppliedId(preset.id);
    setTimeout(() => {
      setJustAppliedId(null);
    }, 2500);
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newPreset: ArtistVocalPreset = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      artist: customArtist.trim() || 'My Studio Profile',
      category: customCategory.trim() || 'Custom Vocal Chain',
      description: 'Custom vocal chain saved from live NeuralTune Ultra DSP state.',
      isCustom: true,
      updatedAt: new Date().toISOString(),
      vocalChainSummary: [
        `${currentPresetState.tuning.retuneSpeed}ms Retune Speed in ${currentPresetState.tuning.key} ${currentPresetState.tuning.scale}`,
        `Mic: ${currentPresetState.mic.selectedMic.toUpperCase()} (+${currentPresetState.mic.airBoost}dB Air Boost)`,
        `${currentPresetState.plugins.length} Active Insert Plugins`,
        `Master Width: ${currentPresetState.mastering.stereoWidth}%`,
      ],
      ...currentPresetState,
    };

    const updated = saveCustomPreset(newPreset);
    setCustomPresets(updated);
    setCustomName('');
    setCustomArtist('');
    setShowSaveCustom(false);
    setSelectedArtist('custom');
    handleApply(newPreset);
  };

  const handleDeleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this custom preset?')) {
      const updated = deleteCustomPreset(id);
      setCustomPresets(updated);
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(allPresets, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `NeuralTune_All_Artist_Presets_${Date.now()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          let updated = customPresets;
          for (const item of parsed) {
            if (item.id && item.name && item.tuning) {
              updated = saveCustomPreset(item);
            }
          }
          setCustomPresets(updated);
          alert('Imported presets successfully into your library!');
        }
      } catch (err) {
        alert('Invalid preset JSON file');
      }
    };
    reader.readAsText(file);
  };

  // Find currently active preset object if any
  const currentActivePreset = allPresets.find(p => p.id === activePresetId);

  return (
    <div id="section-presets" className="space-y-5">
      {/* Top Banner Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Wand2 className="w-4 h-4" />
              </span>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                Artist Vocal Presets Library
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  {allPresets.length} Presets
                </span>
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Official vocal chain profiles modeled from multi-platinum records. Each preset instantly configures the <strong>Antares Autotune Speed</strong>, <strong>Key & Scale</strong>, <strong>Vintage Mic Model</strong>, <strong>Insert FX Rack</strong>, and <strong>Mastering Suite</strong>.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setShowSaveCustom(!showSaveCustom)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-md shadow-cyan-500/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save Current as Preset</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition cursor-pointer"
              title="Export Presets JSON Backup"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <label
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition cursor-pointer"
              title="Import Presets JSON"
            >
              <Upload className="w-3.5 h-3.5" />
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
          </div>
        </div>

        {/* Active Preset Ribbon */}
        {currentActivePreset && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-slate-400 font-mono">LIVE ON DSP:</span>
              <span className="font-bold text-white">{currentActivePreset.artist}</span>
              <span className="text-slate-500">&bull;</span>
              <span className="text-cyan-300 font-semibold">{currentActivePreset.name}</span>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300">
                Speed: {currentActivePreset.tuning.retuneSpeed}ms
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300">
                Key: {currentActivePreset.tuning.key} {currentActivePreset.tuning.scale}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-300">
                Mic: {currentActivePreset.mic.selectedMic.toUpperCase()}
              </span>
            </div>
          </div>
        )}

        {/* Save Custom Preset Dropdown Panel */}
        {showSaveCustom && (
          <form onSubmit={handleSaveCustom} className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Preset Name</label>
              <input
                type="text"
                placeholder="e.g. My Astroworld Lead"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 font-sans"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Artist / Profile</label>
              <input
                type="text"
                placeholder="e.g. YNB / Travis Style"
                value={customArtist}
                onChange={e => setCustomArtist(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">Category Style</label>
              <input
                type="text"
                placeholder="e.g. Melodic Trap"
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 py-1.5 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer"
              >
                Save Preset
              </button>
              <button
                type="button"
                onClick={() => setShowSaveCustom(false)}
                className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        {/* Artist Selection Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {artistTabs.map(tab => {
            const isSelected = selectedArtist === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedArtist(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by song name (e.g. Beep Beep, Dinosaurs, All Not Equal, Rockstar), album, key, or microphone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-800 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Preset Cards Grid */}
      {filteredPresets.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6">
          <Disc3 className="w-10 h-10 text-slate-600 mx-auto mb-3 animate-spin-slow" />
          <h3 className="text-sm font-bold text-white mb-1">No Presets Found</h3>
          <p className="text-xs text-slate-400 mb-4">Try clearing your search query or selecting "All Artists".</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedArtist('all');
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            Show All Presets
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPresets.map(preset => {
            const isActive = activePresetId === preset.id;
            const isJustApplied = justAppliedId === preset.id;

            return (
              <div
                key={preset.id}
                className={`flex flex-col justify-between rounded-2xl border transition-all duration-200 p-4 relative overflow-hidden group ${
                  isActive
                    ? 'bg-slate-900/95 border-cyan-500 shadow-xl shadow-cyan-500/10 ring-1 ring-cyan-500/50'
                    : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Active Indicator Top Tag */}
                {isActive && (
                  <div className="absolute top-0 right-0 bg-cyan-500 text-slate-950 font-mono text-[10px] font-black px-3 py-0.5 rounded-bl-xl tracking-wider flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>ACTIVE</span>
                  </div>
                )}

                <div>
                  {/* Artist & Song Header */}
                  <div className="flex items-start justify-between gap-2 mb-2 pr-14">
                    <div>
                      <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span>{preset.artist}</span>
                        {preset.album && (
                          <>
                            <span className="text-slate-600">&bull;</span>
                            <span className="text-slate-400 normal-case">{preset.album}</span>
                          </>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-white tracking-tight mt-0.5 group-hover:text-cyan-300 transition">
                        {preset.name}
                      </h3>
                    </div>
                  </div>

                  {/* Category Pill */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-medium text-slate-300 border border-slate-700/60">
                      {preset.category}
                    </span>
                    {preset.isCustom && (
                      <span className="px-2 py-0.5 rounded-md bg-violet-500/20 text-[10px] font-medium text-violet-300 border border-violet-500/40">
                        Custom
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-300/90 leading-relaxed mb-4 line-clamp-3">
                    {preset.description}
                  </p>

                  {/* Technical Specs Bento Chips */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mb-4">
                    <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Retune:</span>
                      <span className="font-bold text-cyan-300">{preset.tuning.retuneSpeed} ms</span>
                    </div>

                    <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Key:</span>
                      <span className="font-bold text-amber-300">{preset.tuning.key} {preset.tuning.scale.split(' ')[0]}</span>
                    </div>

                    <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Mic Model:</span>
                      <span className="font-bold text-white uppercase">{preset.mic.selectedMic}</span>
                    </div>

                    <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Width:</span>
                      <span className="font-bold text-emerald-300">{preset.mastering.stereoWidth}%</span>
                    </div>
                  </div>

                  {/* Vocal Chain Highlights */}
                  {preset.vocalChainSummary && preset.vocalChainSummary.length > 0 && (
                    <div className="mb-4 space-y-1 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-cyan-400" />
                        <span>Vocal Chain Highlights</span>
                      </div>
                      {preset.vocalChainSummary.slice(0, 3).map((line, idx) => (
                        <div key={idx} className="text-[11px] text-slate-300 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-cyan-400 shrink-0" />
                          <span className="truncate">{line}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {preset.isCustom && (
                      <button
                        onClick={e => handleDeleteCustom(preset.id, e)}
                        className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 transition cursor-pointer"
                        title="Delete Custom Preset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleApply(preset)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                      isActive || isJustApplied
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20'
                    }`}
                  >
                    {isActive || isJustApplied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{isJustApplied ? 'Loaded & Active!' : 'Active Preset'}</span>
                      </>
                    ) : (
                      <>
                        <span>Load Preset</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
