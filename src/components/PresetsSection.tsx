import React, { useState, useMemo } from 'react';
import {
  ArtistVocalPreset,
  MusicalKey,
  MusicalScale,
  MicModelId,
  TuningSettings,
  MicLockerSettings,
  PitchFormantSettings,
  ModularPlugin,
  MasteringSettings,
} from '../types';
import {
  FACTORY_ARTIST_PRESETS,
  getCustomPresets,
  saveCustomPreset,
  deleteCustomPreset,
  enrichPresetWithMLAndQuality,
} from '../audio/presets';
import { showToast } from '../utils/toast';
import { downloadJson } from '../utils/downloadHelper';
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
  Mic2,
  Lock,
  Unlock,
  Volume2,
  Zap,
  List,
  Grid,
  ChevronDown,
  ChevronUp,
  Cpu,
  RefreshCw,
  Flame,
  Bookmark,
  Edit3,
} from 'lucide-react';

interface PresetsSectionProps {
  activePresetId?: string;
  onApplyPreset: (preset: ArtistVocalPreset) => void;
  currentPresetState: Omit<ArtistVocalPreset, 'id' | 'name' | 'artist' | 'category' | 'description'>;
  onUpdateTuning?: (tuning: TuningSettings) => void;
  onUpdateMic?: (mic: MicLockerSettings) => void;
  onUpdatePitchFormant?: (pitchFormant: PitchFormantSettings) => void;
  onUpdatePlugins?: (plugins: ModularPlugin[]) => void;
  onUpdateMastering?: (mastering: MasteringSettings) => void;
}

const MUSICAL_KEYS: MusicalKey[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MUSICAL_SCALES: MusicalScale[] = [
  'Minor Natural',
  'Major',
  'Chromatic',
  'Pentatonic Minor',
  'Pentatonic Major',
  'Dorian',
  'Blues',
  'Minor Harmonic',
  'Minor Melodic',
];

const POPULAR_MICS: { id: MicModelId; label: string; tag: string }[] = [
  { id: 'c800g', label: 'Sony C-800G', tag: 'Tube Air' },
  { id: 'elam251', label: 'Telefunken 251', tag: 'Silky Warm' },
  { id: 'sm7b', label: 'Shure SM7B', tag: 'Tight Dynamic' },
  { id: 'u87', label: 'Neumann U87', tag: 'Gold Reference' },
  { id: 'manley_gold', label: 'Manley Gold', tag: 'Lush Top' },
  { id: 'tlm103', label: 'Neumann TLM 103', tag: 'Ultra Crisp' },
];

export const PresetsSection: React.FC<PresetsSectionProps> = ({
  activePresetId,
  onApplyPreset,
  currentPresetState,
  onUpdateTuning,
  onUpdateMic,
  onUpdatePitchFormant,
  onUpdatePlugins,
  onUpdateMastering,
}) => {
  const [customPresets, setCustomPresets] = useState<ArtistVocalPreset[]>(getCustomPresets());
  const [selectedArtist, setSelectedArtist] = useState<string>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [justAppliedId, setJustAppliedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'compact' | 'cards'>('compact');
  const [lockProjectKey, setLockProjectKey] = useState<boolean>(true);
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});

  // Quick Changability Modifier Drawer toggle
  const [showChangabilityDrawer, setShowChangabilityDrawer] = useState(true);

  // Quick Preset Dropdown select state
  const [quickDropdownOpen, setQuickDropdownOpen] = useState(false);

  // Custom preset saving
  const [showSaveCustom, setShowSaveCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  const [customCategory, setCustomCategory] = useState('Custom Vocal Chain');

  const allPresets = useMemo(() => {
    const list = [...FACTORY_ARTIST_PRESETS, ...customPresets];
    const seen = new Set<string>();
    return list.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [customPresets]);

  // Find currently active preset object
  const currentActivePreset = useMemo(() => {
    return allPresets.find(p => p.id === activePresetId) || allPresets[0];
  }, [allPresets, activePresetId]);

  // Genres / Vibe Categories
  const genreFilters = [
    { id: 'all', label: 'All Styles' },
    { id: 'rage', label: 'Rage & Hyperpop' },
    { id: 'trap', label: 'Trap & Drill' },
    { id: 'psychedelic', label: 'Psychedelic Space' },
    { id: 'rnb', label: 'Melodic & R&B' },
    { id: 'pop', label: 'Modern Pop' },
    { id: 'custom', label: 'My Presets' },
  ];

  // Unique artists list for filter tabs
  const artistTabs = useMemo(() => {
    const countsByArtist: Record<string, number> = {};
    allPresets.forEach(p => {
      if (!p.isCustom && !p.id.startsWith('custom-')) {
        countsByArtist[p.artist] = (countsByArtist[p.artist] || 0) + 1;
      }
    });

    const priorityOrder = [
      'Yeat',
      'Playboi Carti',
      'Travis Scott',
      'Future',
      'Ken Carson',
      'The Weeknd',
      'Don Toliver',
      'Sabrina Carpenter',
      'Billie Eilish',
      'Kendrick Lamar',
      'Drake',
      'Gunna',
      'Lil Tecca',
      'Hunxho',
      'Post Malone',
      'Loe Shimmy',
    ];

    const sortedArtists = Object.keys(countsByArtist).sort((a, b) => {
      const idxA = priorityOrder.indexOf(a);
      const idxB = priorityOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return [
      { id: 'all', label: 'All Artists', count: allPresets.length },
      ...sortedArtists.map(artist => ({
        id: artist,
        label: artist,
        count: countsByArtist[artist] || 0,
      })),
      { id: 'custom', label: 'My Presets', count: customPresets.length },
    ];
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

      // Genre filter
      if (selectedGenre !== 'all') {
        const cat = (preset.category || '').toLowerCase();
        const desc = (preset.description || '').toLowerCase();
        if (selectedGenre === 'rage') {
          if (!cat.includes('rage') && !cat.includes('hyper') && !desc.includes('rage') && !desc.includes('hyper')) return false;
        } else if (selectedGenre === 'trap') {
          if (!cat.includes('trap') && !cat.includes('drill') && !desc.includes('trap') && !desc.includes('drill')) return false;
        } else if (selectedGenre === 'psychedelic') {
          if (!cat.includes('psychedelic') && !desc.includes('psychedelic') && !desc.includes('space')) return false;
        } else if (selectedGenre === 'rnb') {
          if (!cat.includes('r&b') && !cat.includes('rnb') && !cat.includes('melodic') && !desc.includes('velvet')) return false;
        } else if (selectedGenre === 'pop') {
          if (!cat.includes('pop') && !desc.includes('pop')) return false;
        } else if (selectedGenre === 'custom') {
          if (!preset.isCustom && !preset.id.startsWith('custom-')) return false;
        }
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
  }, [allPresets, selectedArtist, selectedGenre, searchQuery]);

  // Apply preset with optional project key lock
  const handleApply = (preset: ArtistVocalPreset) => {
    let presetToApply = enrichPresetWithMLAndQuality(preset);

    if (lockProjectKey && currentPresetState.tuning) {
      // Keep user's current project key and scale
      presetToApply = {
        ...presetToApply,
        tuning: {
          ...presetToApply.tuning,
          key: currentPresetState.tuning.key,
          scale: currentPresetState.tuning.scale,
        },
      };
    }

    onApplyPreset(presetToApply);
    setJustAppliedId(preset.id);
    setTimeout(() => {
      setJustAppliedId(null);
    }, 2500);
  };

  // Quick Changability Handlers
  const handleModifyKey = (newKey: MusicalKey) => {
    if (!currentPresetState.tuning) return;
    const updated = { ...currentPresetState.tuning, key: newKey };
    onUpdateTuning?.(updated);
  };

  const handleModifyScale = (newScale: MusicalScale) => {
    if (!currentPresetState.tuning) return;
    const updated = { ...currentPresetState.tuning, scale: newScale };
    onUpdateTuning?.(updated);
  };

  const handleModifyRetuneSpeed = (speed: number) => {
    if (!currentPresetState.tuning) return;
    const updated = { ...currentPresetState.tuning, retuneSpeed: speed };
    onUpdateTuning?.(updated);
  };

  const handleModifyMic = (micId: MicModelId) => {
    if (!currentPresetState.mic) return;
    const updated = { ...currentPresetState.mic, selectedMic: micId };
    onUpdateMic?.(updated);
  };

  const handleModifyFormant = (formantSemi: number) => {
    if (!currentPresetState.pitchFormant) return;
    const updated = {
      ...currentPresetState.pitchFormant,
      formantSemitones: formantSemi,
      preserveFormants: formantSemi === 0,
    };
    onUpdatePitchFormant?.(updated);
  };

  const handleToggleMLFormant = () => {
    if (!currentPresetState.pitchFormant) return;
    const currentEnabled = currentPresetState.pitchFormant.mlFormantEnabled ?? true;
    const updated = {
      ...currentPresetState.pitchFormant,
      mlFormantEnabled: !currentEnabled,
    };
    onUpdatePitchFormant?.(updated);
  };

  const handleModifyMLModel = (model: 'neural_vowel' | 'transformer_formant' | 'deep_timbre' | 'spectral_morph') => {
    if (!currentPresetState.pitchFormant) return;
    const updated = {
      ...currentPresetState.pitchFormant,
      mlFormantModel: model,
      mlFormantEnabled: true,
    };
    onUpdatePitchFormant?.(updated);
  };

  const handleModifyFXWetDry = (intensityPercent: number) => {
    if (!currentPresetState.plugins) return;
    const factor = intensityPercent / 100;
    const updatedPlugins = currentPresetState.plugins.map(plugin => {
      const newParams = { ...plugin.params };
      if ('mix' in newParams) {
        newParams.mix = Math.round(Math.max(5, Math.min(100, (plugin.params.mix || 50) * factor)));
      }
      return { ...plugin, params: newParams };
    });
    onUpdatePlugins?.(updatedPlugins);
  };

  // Custom preset actions
  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newPreset: ArtistVocalPreset = enrichPresetWithMLAndQuality({
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
        `ML Formant: ${currentPresetState.pitchFormant?.mlFormantEnabled ? 'Active Neural Vowel' : 'Off'}`,
        `${currentPresetState.plugins.length} Active Insert Plugins`,
        `Master Width: ${currentPresetState.mastering.stereoWidth}%`,
      ],
      ...currentPresetState,
    });

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
    downloadJson(allPresets, `NeuralTune_All_Artist_Presets_${Date.now()}.json`);
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
              updated = saveCustomPreset(enrichPresetWithMLAndQuality(item));
            }
          }
          setCustomPresets(updated);
          showToast('Imported presets successfully into your library!', 'success');
        }
      } catch (err) {
        showToast('Invalid preset JSON file', 'error');
      }
    };
    reader.readAsText(file);
  };

  const toggleCardExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCardIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Top iconic predefined highlights for instantaneous 1-click loading without scrolling
  const iconicHighlights = useMemo(() => {
    const targetIds = [
      'preset-yeat-2093-cyber-rage',
      'preset-travis-beep-beep',
      'preset-carti-vamp-tour-lead',
      'preset-travis-dinosaurs',
      'preset-future-mask-off',
      'preset-ken-carson-agc-rage',
      'preset-sabrina-espresso-air',
      'preset-billie-whisper-intimate',
    ];
    return allPresets.filter(p => targetIds.includes(p.id)).slice(0, 8);
  }, [allPresets]);

  return (
    <div id="section-presets" className="space-y-4">
      {/* ========================================================================= */}
      {/* 1. INSTANT PREDEFINED SELECTOR & FAST DOCK (ELIMINATES SCROLLING DOWN)    */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl space-y-3 relative overflow-visible">
        {/* Top Header Row with Predefined Combobox & Mode Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-inner">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Artist Vocal Presets
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  {allPresets.length} Chains
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  <Sparkles className="w-2.5 h-2.5" />
                  ML Formant Refined
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Instant platinum vocal chains with autotune speed, vintage mics, and ML Formant (ML F) tracking.
              </p>
            </div>
          </div>

          {/* Quick Actions & View Switcher */}
          <div className="flex items-center gap-2">
            {/* Lock/Keep Project Key Toggle */}
            <button
              onClick={() => setLockProjectKey(!lockProjectKey)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                lockProjectKey
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title={
                lockProjectKey
                  ? `Locked: When applying presets, keep current song key (${currentPresetState.tuning?.key || 'C'} ${currentPresetState.tuning?.scale || 'Minor'})`
                  : 'Unlocked: Applying presets overwrites your current key & scale with the preset default'
              }
            >
              {lockProjectKey ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
              <span className="text-[11px]">{lockProjectKey ? 'Key Locked' : 'Key Unlocked'}</span>
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800">
              <button
                onClick={() => setViewMode('compact')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'compact' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Compact List View (Instant browsing with 0 scrolling)"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'cards' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Card Grid View"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Save Custom Preset Button */}
            <button
              onClick={() => setShowSaveCustom(!showSaveCustom)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save Custom</span>
            </button>

            {/* Import / Export */}
            <button
              onClick={handleExportJSON}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition cursor-pointer"
              title="Export Presets JSON Backup"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <label
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition cursor-pointer"
              title="Import Presets JSON"
            >
              <Upload className="w-3.5 h-3.5" />
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
          </div>
        </div>

        {/* FAST PREDEFINED SELECTOR DROPDOWN (Select any predefined preset without scrolling) */}
        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {/* Quick Predefined Picker Combobox */}
            <div className="relative flex-1">
              <button
                type="button"
                onClick={() => setQuickDropdownOpen(!quickDropdownOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-950 border border-cyan-500/40 hover:border-cyan-400 text-left text-xs transition cursor-pointer group shadow-inner"
              >
                <div className="flex items-center gap-2 truncate">
                  <Flame className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="font-mono text-slate-400">Predefined Selector:</span>
                  <span className="font-bold text-white group-hover:text-cyan-300 transition truncate">
                    {currentActivePreset ? `${currentActivePreset.artist} — ${currentActivePreset.name}` : 'Select Predefined Preset...'}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px]">
                    Fast Jump
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${quickDropdownOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Fast Dropdown Popup with Search */}
              {quickDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 max-h-80 overflow-y-auto space-y-1">
                  <div className="p-1.5 sticky top-0 bg-slate-900 z-10 border-b border-slate-800">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Filter predefined presets by artist, song, or vibe..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="divide-y divide-slate-800/60 pt-1">
                    {filteredPresets.map((preset, idx) => {
                      const isCurr = preset.id === activePresetId;
                      return (
                        <button
                          key={`${preset.id}-${idx}`}
                          type="button"
                          onClick={() => {
                            handleApply(preset);
                            setQuickDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between text-xs transition cursor-pointer ${
                            isCurr ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'hover:bg-slate-800/80 text-slate-300'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <span className="font-mono text-cyan-400 mr-2">{preset.artist}</span>
                            <span className="text-white">{preset.name}</span>
                            <span className="text-slate-500 text-[11px] ml-2">({preset.category})</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] text-slate-400">
                            <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300">
                              {preset.tuning.retuneSpeed}ms
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-300">
                              {preset.tuning.key} {preset.tuning.scale.split(' ')[0]}
                            </span>
                            {isCurr && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Live Modifier Toggle Button */}
            <button
              onClick={() => setShowChangabilityDrawer(!showChangabilityDrawer)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer shrink-0 ${
                showChangabilityDrawer
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-700'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showChangabilityDrawer ? 'Hide Live Tuner' : 'Live Preset Tuner'}</span>
            </button>
          </div>
        </div>

        {/* 1-Click Iconic Predefined Highlights Rail */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
          <span className="text-[10px] font-mono uppercase text-slate-500 shrink-0 flex items-center gap-1 mr-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Top Picks:</span>
          </span>
          {iconicHighlights.map((preset, idx) => {
            const isCurr = preset.id === activePresetId;
            return (
              <button
                key={`${preset.id}-${idx}`}
                onClick={() => handleApply(preset)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isCurr
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                {isCurr && <Check className="w-3 h-3 text-slate-950" />}
                <span>{preset.artist.split(' ')[0]}: {preset.name.split(' (')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Save Custom Dropdown Form */}
        {showSaveCustom && (
          <form onSubmit={handleSaveCustom} className="mt-2 pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-2.5 animate-fade-in">
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
                placeholder="e.g. Studio Profile"
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

      {/* ========================================================================= */}
      {/* 2. LIVE PRESET CHANGABILITY & TWEAKER BAR                                  */}
      {/* ========================================================================= */}
      {showChangabilityDrawer && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-cyan-500/30 rounded-2xl p-3 sm:p-4 shadow-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
              </span>
              <span className="text-xs font-mono text-slate-400">LIVE PRESET MODIFIERS:</span>
              <span className="text-xs font-bold text-white">{currentActivePreset.artist}</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-xs text-cyan-300 font-semibold">{currentActivePreset.name}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* ML Formant (ML F) Quick Switch */}
              <button
                type="button"
                onClick={handleToggleMLFormant}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  (currentPresetState.pitchFormant?.mlFormantEnabled ?? true)
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
                title="Toggle ML Formant Neural Vowel Tracking (ML F)"
              >
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>ML F: {(currentPresetState.pitchFormant?.mlFormantEnabled ?? true) ? 'ACTIVE' : 'BYPASS'}</span>
              </button>
            </div>
          </div>

          {/* Quick Modifier Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {/* 1. Song Key & Scale Modifier */}
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/90 space-y-1.5">
              <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
                <span>Key &amp; Scale</span>
                <span className="text-amber-400 font-bold">
                  {currentPresetState.tuning?.key || 'C'} {currentPresetState.tuning?.scale?.split(' ')[0] || 'Minor'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={currentPresetState.tuning?.key || 'C'}
                  onChange={e => handleModifyKey(e.target.value as MusicalKey)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                >
                  {MUSICAL_KEYS.map(k => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <select
                  value={currentPresetState.tuning?.scale || 'Minor Natural'}
                  onChange={e => handleModifyScale(e.target.value as MusicalScale)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-white font-mono text-[11px] focus:outline-none focus:border-cyan-500"
                >
                  {MUSICAL_SCALES.map(s => (
                    <option key={s} value={s}>
                      {s.replace('Natural', '').trim()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Retune Speed Slider */}
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/90 space-y-1.5">
              <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
                <span>Autotune Speed</span>
                <span className="text-cyan-400 font-bold">
                  {currentPresetState.tuning?.retuneSpeed ?? 0} ms
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={currentPresetState.tuning?.retuneSpeed ?? 0}
                onChange={e => handleModifyRetuneSpeed(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500">
                <span>0ms (Hard Snap)</span>
                <span>40ms (Natural)</span>
              </div>
            </div>

            {/* 3. ML Formant Shift & Throat Slider */}
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/90 space-y-1.5">
              <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
                <span>ML Formant Shift</span>
                <span className="text-emerald-400 font-bold">
                  {(currentPresetState.pitchFormant?.formantSemitones ?? 0) > 0 ? '+' : ''}
                  {currentPresetState.pitchFormant?.formantSemitones ?? 0}st
                </span>
              </div>
              <input
                type="range"
                min="-8"
                max="8"
                step="0.5"
                value={currentPresetState.pitchFormant?.formantSemitones ?? 0}
                onChange={e => handleModifyFormant(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500">
                <span>-8st (Chest)</span>
                <span>0st</span>
                <span>+8st (High)</span>
              </div>
            </div>

            {/* 4. Mic Locker Quick Swapper */}
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/90 space-y-1.5">
              <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
                <span>Mic Model</span>
                <span className="text-white font-mono font-bold truncate max-w-[90px]">
                  {currentPresetState.mic?.selectedMic?.toUpperCase() || 'C800G'}
                </span>
              </div>
              <select
                value={currentPresetState.mic?.selectedMic || 'c800g'}
                onChange={e => handleModifyMic(e.target.value as MicModelId)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
              >
                {POPULAR_MICS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.tag})
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Master FX Wet/Dry Mix */}
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/90 space-y-1.5">
              <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
                <span>FX Master Mix</span>
                <span className="text-fuchsia-400 font-bold">100%</span>
              </div>
              <input
                type="range"
                min="0"
                max="150"
                defaultValue="100"
                onChange={e => handleModifyFXWetDry(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-400"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500">
                <span>Dry</span>
                <span>100% Normal</span>
                <span>150% Wet</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FILTER & SEARCH CONTROLS                                               */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        {/* Style / Genre Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
          {genreFilters.map(filter => {
            const isSel = selectedGenre === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setSelectedGenre(filter.id)}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
                  isSel
                    ? 'bg-slate-100 text-slate-950 font-bold shadow-md'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Artist Tabs */}
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
      </div>

      {/* ========================================================================= */}
      {/* 4. PRESETS VIEW: COMPACT LIST VIEW (NO SCROLLING) vs CARD GRID VIEW       */}
      {/* ========================================================================= */}
      {filteredPresets.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6">
          <Disc3 className="w-10 h-10 text-slate-600 mx-auto mb-3 animate-spin-slow" />
          <h3 className="text-sm font-bold text-white mb-1">No Presets Found</h3>
          <p className="text-xs text-slate-400 mb-4">Try clearing your search query or selecting "All Artists".</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedArtist('all');
              setSelectedGenre('all');
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            Show All Presets
          </button>
        </div>
      ) : viewMode === 'compact' ? (
        /* COMPACT TABLE / LIST VIEW: High density, shows 15-20 presets in view without endless scrolling */
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800/90 shadow-xl overflow-hidden divide-y divide-slate-800/60 text-xs">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-950/80 text-[10px] font-mono text-slate-400 uppercase tracking-wider items-center">
            <div className="col-span-5 sm:col-span-4">Artist &amp; Preset Name</div>
            <div className="hidden sm:block sm:col-span-2">Vibe &amp; Style</div>
            <div className="col-span-4 sm:col-span-4">Tuning &amp; Mic Chain</div>
            <div className="col-span-3 sm:col-span-2 text-right">Action</div>
          </div>

          {/* Table Rows */}
          {filteredPresets.map((preset, idx) => {
            const isActive = activePresetId === preset.id;
            const isJustApplied = justAppliedId === preset.id;
            const isExpanded = expandedCardIds[preset.id];

            return (
              <div
                key={`${preset.id}-${idx}`}
                onClick={() => handleApply(preset)}
                className={`transition-colors cursor-pointer group ${
                  isActive
                    ? 'bg-cyan-500/10 hover:bg-cyan-500/15'
                    : 'hover:bg-slate-800/60'
                }`}
              >
                <div className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center">
                  {/* Col 1: Artist & Preset */}
                  <div className="col-span-5 sm:col-span-4 flex items-center gap-2.5 truncate">
                    {isActive ? (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400 shrink-0" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-700 group-hover:bg-cyan-400 transition-colors shrink-0" />
                    )}
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-cyan-400 text-[11px]">{preset.artist}</span>
                        {preset.isCustom && (
                          <span className="px-1 py-0.2 rounded bg-violet-500/20 text-violet-300 text-[9px] font-mono border border-violet-500/40">
                            Custom
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-white group-hover:text-cyan-300 transition truncate text-xs">
                        {preset.name}
                      </div>
                    </div>
                  </div>

                  {/* Col 2: Vibe & Style */}
                  <div className="hidden sm:block sm:col-span-2 truncate">
                    <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px] text-slate-300">
                      {preset.category}
                    </span>
                  </div>

                  {/* Col 3: Tuning & Mic Specs */}
                  <div className="col-span-4 sm:col-span-4 flex items-center gap-1.5 flex-wrap font-mono text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300">
                      {preset.tuning.retuneSpeed}ms
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-300">
                      {lockProjectKey && currentPresetState.tuning
                        ? `${currentPresetState.tuning.key} ${currentPresetState.tuning.scale.split(' ')[0]}`
                        : `${preset.tuning.key} ${preset.tuning.scale.split(' ')[0]}`}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-white uppercase hidden md:inline">
                      {preset.mic.selectedMic}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hidden lg:inline">
                      ML F
                    </span>
                  </div>

                  {/* Col 4: Action Buttons */}
                  <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={e => toggleCardExpand(preset.id, e)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-[10px] transition hidden sm:inline-block"
                      title="Inspect FX chain details"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {preset.isCustom && (
                      <button
                        type="button"
                        onClick={e => handleDeleteCustom(preset.id, e)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition"
                        title="Delete custom preset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        handleApply(preset);
                      }}
                      className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1 ${
                        isActive || isJustApplied
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-sm'
                      }`}
                    >
                      {isActive || isJustApplied ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span className="hidden sm:inline">{isJustApplied ? 'Loaded!' : 'Active'}</span>
                        </>
                      ) : (
                        <span>Load</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Accordion */}
                {isExpanded && (
                  <div className="px-4 py-3 bg-slate-950/70 border-t border-slate-800/80 space-y-2 text-xs">
                    <p className="text-slate-300 text-xs leading-relaxed">{preset.description}</p>
                    {preset.vocalChainSummary && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {preset.vocalChainSummary.map((line, i) => (
                          <div key={i} className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-cyan-400" />
                            <span className="truncate">{line}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredPresets.map((preset, idx) => {
            const isActive = activePresetId === preset.id;
            const isJustApplied = justAppliedId === preset.id;
            const isExpanded = expandedCardIds[preset.id];

            return (
              <div
                key={`${preset.id}-${idx}`}
                className={`flex flex-col justify-between rounded-2xl border transition-all duration-200 p-4 relative overflow-hidden group ${
                  isActive
                    ? 'bg-slate-900/95 border-cyan-500 shadow-xl shadow-cyan-500/10 ring-1 ring-cyan-500/50'
                    : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 right-0 bg-cyan-500 text-slate-950 font-mono text-[10px] font-black px-3 py-0.5 rounded-bl-xl tracking-wider flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>ACTIVE</span>
                  </div>
                )}

                <div>
                  {/* Artist & Song */}
                  <div className="flex items-start justify-between gap-2 mb-1.5 pr-14">
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
                      <h3 className="text-sm sm:text-base font-bold text-white tracking-tight mt-0.5 group-hover:text-cyan-300 transition">
                        {preset.name}
                      </h3>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-medium text-slate-300 border border-slate-700/60">
                      {preset.category}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-[10px] font-mono font-semibold text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      ML F
                    </span>
                    {preset.isCustom && (
                      <span className="px-2 py-0.5 rounded-md bg-violet-500/20 text-[10px] font-medium text-violet-300 border border-violet-500/40">
                        Custom
                      </span>
                    )}
                  </div>

                  {/* Compact Specs Grid */}
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono mb-3">
                    <div className="px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Retune:</span>
                      <span className="font-bold text-cyan-300">{preset.tuning.retuneSpeed} ms</span>
                    </div>

                    <div className="px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Key:</span>
                      <span className="font-bold text-amber-300">
                        {lockProjectKey && currentPresetState.tuning
                          ? `${currentPresetState.tuning.key} ${currentPresetState.tuning.scale.split(' ')[0]}`
                          : `${preset.tuning.key} ${preset.tuning.scale.split(' ')[0]}`}
                      </span>
                    </div>

                    <div className="px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Mic:</span>
                      <span className="font-bold text-white uppercase">{preset.mic.selectedMic}</span>
                    </div>

                    <div className="px-2 py-1 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                      <span className="text-slate-400">Width:</span>
                      <span className="font-bold text-emerald-300">{preset.mastering.stereoWidth}%</span>
                    </div>
                  </div>

                  {/* Collapsible Details */}
                  {isExpanded && (
                    <div className="mb-3 space-y-2 text-xs bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 animate-fade-in">
                      <p className="text-slate-300 text-xs leading-relaxed">{preset.description}</p>
                      {preset.vocalChainSummary && (
                        <div className="space-y-1 pt-1">
                          {preset.vocalChainSummary.slice(0, 3).map((line, i) => (
                            <div key={i} className="text-[11px] text-slate-400 flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-cyan-400" />
                              <span className="truncate">{line}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={e => toggleCardExpand(preset.id, e)}
                      className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                    >
                      {isExpanded ? 'Less Info' : 'More Info'}
                    </button>
                    {preset.isCustom && (
                      <button
                        onClick={e => handleDeleteCustom(preset.id, e)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition cursor-pointer"
                        title="Delete custom preset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleApply(preset)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                      isActive || isJustApplied
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20'
                    }`}
                  >
                    {isActive || isJustApplied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{isJustApplied ? 'Loaded!' : 'Active'}</span>
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
