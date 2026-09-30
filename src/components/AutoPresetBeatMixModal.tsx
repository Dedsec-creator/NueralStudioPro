import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Sliders,
  Volume2,
  CheckCircle2,
  Music2,
  Mic2,
  Radio,
  X,
  Play,
  Pause,
  RotateCcw,
  Layers,
  ArrowRight,
  Flame,
  Check,
  Disc,
} from 'lucide-react';
import { ArtistVocalPreset, AutoPresetBeatMixResult, MusicalKey, MusicalScale } from '../types';
import { audioEngine } from '../audio/audioEngine';
import { autoMatchBeatToVocalsAndApplyPreset } from '../audio/autoMixEngine';
import { FACTORY_ARTIST_PRESETS } from '../audio/presets';

interface AutoPresetBeatMixModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPresetApplied?: (preset: ArtistVocalPreset) => void;
}

export const AutoPresetBeatMixModal: React.FC<AutoPresetBeatMixModalProps> = ({
  isOpen,
  onClose,
  onPresetApplied,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AutoPresetBeatMixResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [manualSelectedGenre, setManualSelectedGenre] = useState<string>('auto');

  if (!isOpen) return null;

  const hasBeat = Boolean(audioEngine.beatBuffer && audioEngine.beatTrackInfo.duration > 0);
  const hasVocal = Boolean(audioEngine.vocalBuffer && audioEngine.vocalTrackInfo.duration > 0);

  const handleRunAutoMix = async () => {
    setIsAnalyzing(true);
    // Short realistic DSP analysis delay for sleek UI feel
    await new Promise(r => setTimeout(r, 600));

    try {
      await audioEngine.initialize();

      // If neither stem is loaded, load demo stems so user can hear it immediately
      if (!hasBeat && !hasVocal) {
        await audioEngine.loadDemoStems('rap_f_minor');
      } else if (!hasBeat) {
        // Vocal is already loaded; synthesize complementary beat without overwriting user vocal
        await audioEngine.loadDemoBeat('rap_f_minor');
      } else if (!hasVocal) {
        // Beat is already loaded; synthesize complementary vocal without overwriting user beat
        await audioEngine.loadDemoVocal();
      }

      const res = autoMatchBeatToVocalsAndApplyPreset();
      setResult(res);
      onPresetApplied?.(res.matchedPreset);
    } catch (err) {
      console.error('AutoMix error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTogglePlayback = () => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      audioEngine.play();
      setIsPlaying(true);
    }
  };

  const handleApplySpecificPreset = (preset: ArtistVocalPreset) => {
    // Keep beat key sync
    const currentKey = result?.detectedKey || preset.tuning.key;
    const currentScale = result?.detectedScale || preset.tuning.scale;

    const tuned = {
      ...preset,
      tuning: {
        ...preset.tuning,
        key: currentKey,
        scale: currentScale,
      },
    };

    audioEngine.updateTuningSettings(tuned.tuning);
    audioEngine.updateMicSettings(tuned.mic);
    audioEngine.updateDenoiseSettings({
      ...tuned.denoise,
      autoGateMode: true,
      gateHoldMs: 180,
      gateReleaseMs: 160,
    });
    audioEngine.updateAlignSettings(tuned.align);
    audioEngine.updateModularPlugins(tuned.plugins);
    audioEngine.updateMasteringSettings(tuned.mastering);
    if (tuned.pitchFormant) audioEngine.updatePitchFormantSettings(tuned.pitchFormant, true);
    if (tuned.aiEnhancer) audioEngine.updateAIEnhancerSettings(tuned.aiEnhancer);

    if (result) {
      setResult({
        ...result,
        matchedPreset: tuned,
        summary: `Swapped to [${tuned.artist} - ${tuned.name}] locked in [${currentKey} ${currentScale}].`,
      });
    }
    onPresetApplied?.(tuned);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Glow ambient background accent */}
        <div className="absolute top-0 right-1/4 w-72 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-72 h-36 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/25">
              <Zap className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide text-white uppercase flex items-center gap-2">
                Auto-Preset & Smart Beat Mixer
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold">
                  1-CLICK AI SYNC
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Analyzes your beat & vocals, carves frequency pockets, and applies the ideal artist chain
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (isPlaying) audioEngine.pause();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 relative z-10">
          {/* Stems Status Bar */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
            <div className="flex items-center gap-2.5">
              <div className={`w-3 h-3 rounded-full ${hasBeat ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <div className="truncate">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Instrumental Beat:</span>
                <span className="font-bold text-white truncate block">
                  {hasBeat ? audioEngine.beatTrackInfo.name : 'Demo beat will be loaded'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className={`w-3 h-3 rounded-full ${hasVocal ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <div className="truncate">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Vocal Track:</span>
                <span className="font-bold text-white truncate block">
                  {hasVocal ? audioEngine.vocalTrackInfo.name : 'Demo vocal will be loaded'}
                </span>
              </div>
            </div>
          </div>

          {/* Big Action Button */}
          <button
            onClick={handleRunAutoMix}
            disabled={isAnalyzing}
            className={`w-full py-4 px-6 rounded-xl font-black text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-3 cursor-pointer shadow-xl ${
              isAnalyzing
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-slate-950 hover:brightness-110 shadow-amber-500/25 border border-amber-300 ring-2 ring-amber-400/40 active:scale-[0.99]'
            }`}
          >
            {isAnalyzing ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-400 border-t-amber-400 rounded-full animate-spin" />
                <span>Analyzing Beat & Aligning Vocals...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 fill-slate-950" />
                <span>{result ? '⚡ Re-Analyze & Auto-Mix Again' : '✨ 1-Click Auto-Mix & Match Vocals to Beat'}</span>
              </>
            )}
          </button>

          {/* Analysis & Match Result Card */}
          {result && (
            <div className="p-4 rounded-xl bg-gradient-to-b from-slate-950 to-slate-900 border border-amber-500/40 shadow-xl space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Auto-Applied Vocal Match:
                  </span>
                  <h3 className="text-base font-black text-white mt-0.5">
                    {result.matchedPreset.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    by <span className="text-amber-300 font-bold">{result.matchedPreset.artist}</span> ({result.matchedPreset.category})
                  </p>
                </div>

                {/* Key / Scale / BPM Badge */}
                <div className="text-right">
                  <div className="inline-block px-2.5 py-1 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-300 font-mono text-xs font-bold">
                    {result.detectedKey} {result.detectedScale.replace(' Natural', '')} • {result.detectedBpm} BPM
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">Auto-Key Locked</span>
                </div>
              </div>

              {/* Real DSP Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Beat Vibe</span>
                  <span className="text-xs font-bold text-white truncate block mt-0.5">{result.beatVibe.split('&')[0]}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Beat Pocket</span>
                  <span className="text-xs font-bold text-amber-400 block mt-0.5">-{result.carveDepthDb} dB @ {result.carveFreqHz}Hz</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Sidechain Duck</span>
                  <span className="text-xs font-bold text-cyan-400 block mt-0.5">{result.sidechainDuckPercent}% depth</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Vocal Timbre</span>
                  <span className="text-xs font-bold text-emerald-400 truncate block mt-0.5">{result.vocalTimbre}</span>
                </div>
              </div>

              {/* Diagnosis Summary Text */}
              <p className="text-xs text-slate-300 bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 leading-relaxed font-mono">
                {result.summary}
              </p>

              {/* Instant Playback Test & Controls */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  onClick={handleTogglePlayback}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all border ${
                    isPlaying
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-rose-300" />
                      <span>Pause Studio Audio</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-emerald-300" />
                      <span>▶ Preview Mixed Beat & Vocal</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Swappable Artist Presets */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] font-mono uppercase text-slate-400 mb-2 block">
                  Or Try An Alternative Artist Style on This Beat:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'preset-travis-fein', name: 'Travis Scott (UTOPIA / FE!N)' },
                    { id: 'preset-kendrick-not-like-us', name: 'Kendrick Lamar (Not Like Us)' },
                    { id: 'preset-carti-2024-baby-voice', name: 'Playboi Carti (2024 Voice)' },
                    { id: 'preset-drake-rich-flex', name: 'Drake (Rich Flex / OVO)' },
                    { id: 'preset-weeknd-blinding-lights', name: 'The Weeknd (Blinding Lights)' },
                    { id: 'preset-billie-birds-feather', name: 'Billie Eilish (Whisper Haas)' },
                  ].map(p => {
                    const presetDef = FACTORY_ARTIST_PRESETS.find(pr => pr.id === p.id);
                    if (!presetDef) return null;
                    const isCur = result.matchedPreset.id === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleApplySpecificPreset(presetDef)}
                        className={`p-2 rounded-lg text-left text-[11px] font-mono transition-all cursor-pointer truncate border ${
                          isCur
                            ? 'bg-amber-400 text-slate-950 font-black border-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400 relative z-10">
          <span className="font-mono text-[11px]">Automatic Sidechain & 32-bit Float Audio Engine</span>
          <button
            onClick={() => {
              if (isPlaying) audioEngine.pause();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
