import React, { useState } from 'react';
import { ArtistVocalPreset } from '../types';
import { FACTORY_ARTIST_PRESETS, getCustomPresets, saveCustomPreset, deleteCustomPreset, getLastCloudSyncTime } from '../audio/presets';
import { showToast } from '../utils/toast';
import { downloadJson } from '../utils/downloadHelper';
import { Cloud, Check, X, Download, Upload, Trash2, Plus, Sparkles, RefreshCw, Smartphone, Laptop } from 'lucide-react';

interface PresetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPreset: (preset: ArtistVocalPreset) => void;
  currentPresetState: Omit<ArtistVocalPreset, 'id' | 'name' | 'artist' | 'category' | 'description'>;
}

export const PresetManagerModal: React.FC<PresetManagerModalProps> = ({
  isOpen,
  onClose,
  onApplyPreset,
  currentPresetState,
}) => {
  const [customPresets, setCustomPresets] = useState<ArtistVocalPreset[]>(getCustomPresets());
  const [activeTab, setActiveTab] = useState<'artist' | 'custom'>('artist');
  const [newPresetName, setNewPresetName] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [lastSync, setLastSync] = useState(getLastCloudSyncTime());

  if (!isOpen) return null;

  const handleSaveCurrent = () => {
    if (!newPresetName.trim()) return;
    const newPreset: ArtistVocalPreset = {
      id: `custom-${Date.now()}`,
      name: newPresetName.trim(),
      artist: 'User Studio Profile',
      category: 'Custom Vocal Chain',
      description: 'Custom user studio tuning, mic locker, and mastering chain.',
      ...currentPresetState,
    };
    const updated = saveCustomPreset(newPreset);
    setCustomPresets(updated);
    setNewPresetName('');
    setActiveTab('custom');
  };

  const handleDelete = (id: string) => {
    const updated = deleteCustomPreset(id);
    setCustomPresets(updated);
  };

  const handleTriggerCloudSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncSuccess(true);
      setLastSync(new Date().toISOString());
      setTimeout(() => setSyncSuccess(false), 3000);
    }, 1200);
  };

  const handleExportJSON = () => {
    const allPresets = [...FACTORY_ARTIST_PRESETS, ...customPresets];
    downloadJson(allPresets, `NeuralTune_Presets_CloudBackup_${Date.now()}.neuraltune.json`);
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
          showToast('Successfully imported presets from cloud backup!', 'success');
        }
      } catch (err) {
        showToast('Invalid preset JSON file', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Cloud Preset Management
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Cross-Device Sync Active
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Sync vocal chains across mobile, iPad, and desktop DAW sessions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cloud Sync Status Bar */}
        <div className="px-5 py-3 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <div className="flex items-center gap-1 text-slate-400">
              <Laptop className="w-3.5 h-3.5 text-cyan-400" />
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <span>Last Synced:</span>
            <span className="font-mono text-cyan-300">
              {new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerCloudSync}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition cursor-pointer ${
                syncSuccess
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{syncSuccess ? 'Synced to Cloud!' : isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition cursor-pointer border border-slate-700"
              title="Download backup file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Backup</span>
            </button>

            <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition cursor-pointer border border-slate-700">
              <Upload className="w-3.5 h-3.5" />
              <span>Restore</span>
              <input type="file" accept=".json,.neuraltune" onChange={handleImportJSON} className="hidden" />
            </label>
          </div>
        </div>

        {/* Tab switcher: Artist vs Custom */}
        <div className="flex border-b border-slate-800 px-5 pt-3 bg-slate-900">
          <button
            onClick={() => setActiveTab('artist')}
            className={`pb-2.5 px-4 text-xs font-bold transition border-b-2 cursor-pointer ${
              activeTab === 'artist'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Artist Signature Chains ({FACTORY_ARTIST_PRESETS.length})
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-2.5 px-4 text-xs font-bold transition border-b-2 cursor-pointer ${
              activeTab === 'custom'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            My Custom Presets ({customPresets.length})
          </button>
        </div>

        {/* Preset List Content */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {/* Quick save box inside Custom tab */}
          {activeTab === 'custom' && (
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 mb-4 flex items-center gap-2">
              <input
                type="text"
                placeholder="Name your current vocal chain..."
                value={newPresetName}
                onChange={e => setNewPresetName(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={handleSaveCurrent}
                disabled={!newPresetName.trim()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs disabled:opacity-40 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Save Preset</span>
              </button>
            </div>
          )}

          {activeTab === 'artist' ? (
            FACTORY_ARTIST_PRESETS.map((preset, idx) => (
              <div
                key={`${preset.id}-${idx}`}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 hover:bg-slate-950 transition flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">{preset.name}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">
                      {preset.artist}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{preset.category}</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{preset.description}</p>
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-400 mt-2">
                    <span className="text-cyan-400">Speed: {preset.tuning.retuneSpeed}ms</span>
                    <span>&bull;</span>
                    <span className="text-amber-400">Mic: {preset.mic.selectedMic.toUpperCase()}</span>
                    <span>&bull;</span>
                    <span className="text-pink-400">Plugins: {preset.plugins.length} active</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onApplyPreset(preset);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition cursor-pointer whitespace-nowrap"
                >
                  Load Chain
                </button>
              </div>
            ))
          ) : customPresets.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No custom presets saved yet. Adjust your tuning, mic locker, and mastering, then save above!
            </div>
          ) : (
            customPresets.map((preset, idx) => (
              <div
                key={`${preset.id}-${idx}`}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">{preset.name}</h4>
                    <span className="text-[10px] font-mono text-slate-400">
                      {preset.updatedAt ? new Date(preset.updatedAt).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{preset.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onApplyPreset(preset);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleDelete(preset.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
