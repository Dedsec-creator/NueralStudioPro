import React, { useState } from 'react';
import { ModularPlugin, PluginType } from '../types';
import { createPlugin, PLUGIN_DEFINITIONS, ParamSpec } from '../audio/plugins';
import { Layers, Plus, ArrowUp, ArrowDown, Trash2, Power, SlidersHorizontal, Sparkles } from 'lucide-react';

interface ModularPluginRackProps {
  plugins: ModularPlugin[];
  onChange: (updatedPlugins: ModularPlugin[]) => void;
}

export const ModularPluginRack: React.FC<ModularPluginRackProps> = ({ plugins, onChange }) => {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const handleAddPlugin = (type: PluginType) => {
    const newPlugin = createPlugin(type);
    onChange([...plugins, newPlugin]);
    setShowAddMenu(false);
  };

  const handleTogglePlugin = (index: number) => {
    const updated = [...plugins];
    updated[index] = { ...updated[index], enabled: !updated[index].enabled };
    onChange(updated);
  };

  const handleRemovePlugin = (index: number) => {
    const updated = plugins.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleMovePlugin = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= plugins.length) return;
    const updated = [...plugins];
    const [item] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, item);
    onChange(updated);
  };

  const handleParamChange = (pluginIndex: number, paramKey: string, value: number) => {
    const updated = [...plugins];
    updated[pluginIndex] = {
      ...updated[pluginIndex],
      params: {
        ...updated[pluginIndex].params,
        [paramKey]: value,
      },
    };
    onChange(updated);
  };

  return (
    <div className="rounded-2xl bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-slate-800 p-5 shadow-2xl backdrop-blur-md">
      {/* Rack Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wide text-white uppercase flex items-center gap-2">
              Modular Insert Effect Rack
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-violet-950 text-violet-300 border border-violet-800/40">
                {plugins.length} Active / 8 Max
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">Third-Party DSP Architecture & Serial Processing</p>
          </div>
        </div>

        {/* Add Plugin Button */}
        <div className="relative">
          <button
            id="btn-add-plugin"
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Effect Slot</span>
          </button>

          {/* Plugin Selection Dropdown */}
          {showAddMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 p-2 space-y-1 backdrop-blur-xl">
              <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-slate-400 font-bold border-b border-slate-800">
                Studio Effect Catalog
              </div>
              {(Object.keys(PLUGIN_DEFINITIONS) as PluginType[]).map(type => {
                const def = PLUGIN_DEFINITIONS[type];
                return (
                  <button
                    key={type}
                    onClick={() => handleAddPlugin(type)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition flex flex-col cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-violet-300">
                        {def.name}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 uppercase">
                        {def.category}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                      {def.description}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Plugins Container */}
      <div className="mt-4 space-y-3">
        {plugins.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-slate-400">
            <SlidersHorizontal className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-300">No insert plugins in signal chain</p>
            <p className="text-[11px] text-slate-400 mt-1">Click &ldquo;Add Effect Slot&rdquo; above to mount Parametric EQ, Tape Echo, Plate Reverb, or Vocal Doubler</p>
          </div>
        ) : (
          plugins.map((plugin, index) => {
            const def = PLUGIN_DEFINITIONS[plugin.type] || PLUGIN_DEFINITIONS.parametric_eq;
            return (
              <div
                key={plugin.id}
                className={`p-4 rounded-xl border transition-all ${
                  plugin.enabled
                    ? 'bg-slate-950/90 border-slate-800 shadow-md'
                    : 'bg-slate-950/40 border-slate-900 opacity-60'
                }`}
              >
                {/* Plugin Item Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleTogglePlugin(index)}
                      className={`w-6 h-6 rounded-md flex items-center justify-center transition cursor-pointer ${
                        plugin.enabled
                          ? 'bg-violet-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-500 hover:text-white'
                      }`}
                      title={plugin.enabled ? 'Bypass Plugin' : 'Activate Plugin'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{plugin.name}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 uppercase">
                          Slot #{index + 1}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{def.category}</span>
                    </div>
                  </div>

                  {/* Move Up/Down & Remove actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMovePlugin(index, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                      title="Move Up in Signal Flow"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMovePlugin(index, 'down')}
                      disabled={index === plugins.length - 1}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                      title="Move Down in Signal Flow"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemovePlugin(index)}
                      className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 ml-1 cursor-pointer"
                      title="Remove Plugin"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Plugin Parameter Knobs / Sliders Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-3">
                  {Object.entries(def.paramSpecs).map(([paramKey, rawSpec]) => {
                    const spec = rawSpec as ParamSpec;
                    const currentVal = plugin.params[paramKey] ?? def.defaultParams[paramKey];
                    return (
                      <div key={paramKey} className="bg-slate-900/70 p-2 rounded-lg border border-slate-800/80">
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400 truncate">{spec.label}:</span>
                          <span className="font-mono text-violet-300 font-bold ml-1">
                            {currentVal} {spec.unit}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={spec.min}
                          max={spec.max}
                          step={spec.step}
                          value={currentVal}
                          disabled={!plugin.enabled}
                          onChange={e => handleParamChange(index, paramKey, Number(e.target.value))}
                          className="w-full accent-violet-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
