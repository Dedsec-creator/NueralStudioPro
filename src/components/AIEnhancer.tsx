import React, { useState, useEffect, useRef } from 'react';
import {
  AIVocalAnalysisResult,
  AIVocalProfileId,
  ProVocalAIEnhancerSettings,
} from '../types';
import { audioEngine } from '../audio/audioEngine';
import {
  Sparkles,
  Zap,
  Wand2,
  Sliders,
  CheckCircle2,
  Activity,
  Music,
  ShieldCheck,
  RefreshCw,
  Flame,
  Feather,
  Mic2,
  Radio,
} from 'lucide-react';

interface AIEnhancerProps {
  settings: ProVocalAIEnhancerSettings;
  onChange: (updated: ProVocalAIEnhancerSettings) => void;
}

interface ProfileDefinition {
  id: AIVocalProfileId;
  name: string;
  genre: string;
  description: string;
  icon: React.ElementType;
  badgeColor: string;
  defaults: {
    intensity: number;
    clarityPresence: number;
    airBrilliance: number;
    warmthBody: number;
    deMud: number;
    harshnessTamer: number;
    spectralBalance: number;
  };
}

const AI_PROFILES: ProfileDefinition[] = [
  {
    id: 'modern_pop',
    name: 'Modern Pop Polish',
    genre: 'Pop / Billboard',
    description: 'High-gloss top end with sculpted clarity and silky 11.5kHz brilliance sheen.',
    icon: Sparkles,
    badgeColor: 'border-cyan-500/40 text-cyan-300 bg-cyan-950/30',
    defaults: {
      intensity: 75,
      clarityPresence: 70,
      airBrilliance: 80,
      warmthBody: 35,
      deMud: 65,
      harshnessTamer: 60,
      spectralBalance: 65,
    },
  },
  {
    id: 'trap_rap',
    name: 'Trap & Drill Punch',
    genre: 'Hip-Hop / Rap',
    description: 'Aggressive midrange presence and chest punch that cuts directly through 808s.',
    icon: Flame,
    badgeColor: 'border-amber-500/40 text-amber-300 bg-amber-950/30',
    defaults: {
      intensity: 80,
      clarityPresence: 78,
      airBrilliance: 65,
      warmthBody: 55,
      deMud: 70,
      harshnessTamer: 50,
      spectralBalance: 58,
    },
  },
  {
    id: 'rnb_velvet',
    name: 'Velvet Silk R&B',
    genre: 'R&B / Soul',
    description: 'Warm chest resonance with ultra-smooth de-harshing and intimate proximity presence.',
    icon: Feather,
    badgeColor: 'border-purple-500/40 text-purple-300 bg-purple-950/30',
    defaults: {
      intensity: 70,
      clarityPresence: 52,
      airBrilliance: 72,
      warmthBody: 65,
      deMud: 45,
      harshnessTamer: 75,
      spectralBalance: 46,
    },
  },
  {
    id: 'broadcast_pro',
    name: 'Broadcast & Podcast Pro',
    genre: 'Spoken / Voiceover',
    description: 'Crystal-clear speech intelligibility with heavy room de-box and flat neutral warmth.',
    icon: Radio,
    badgeColor: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/30',
    defaults: {
      intensity: 65,
      clarityPresence: 62,
      airBrilliance: 55,
      warmthBody: 50,
      deMud: 60,
      harshnessTamer: 65,
      spectralBalance: 50,
    },
  },
  {
    id: 'lofi_clean',
    name: 'Lo-Fi Chill & Clean',
    genre: 'Lo-Fi / Indie',
    description: 'Softened top-end, relaxed presence, and rounded vintage harmonic warmth.',
    icon: Music,
    badgeColor: 'border-rose-500/40 text-rose-300 bg-rose-950/30',
    defaults: {
      intensity: 60,
      clarityPresence: 42,
      airBrilliance: 45,
      warmthBody: 60,
      deMud: 50,
      harshnessTamer: 80,
      spectralBalance: 40,
    },
  },
];

export const AIEnhancer: React.FC<AIEnhancerProps> = ({ settings, onChange }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIVocalAnalysisResult | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeProfile =
    AI_PROFILES.find(p => p.id === settings.aiProfile) || AI_PROFILES[0];

  const handleProfileSelect = (profileId: AIVocalProfileId) => {
    const prof = AI_PROFILES.find(p => p.id === profileId);
    if (!prof) return;
    const updated: ProVocalAIEnhancerSettings = {
      ...settings,
      aiProfile: profileId,
      ...prof.defaults,
    };
    onChange(updated);
    audioEngine.updateAIEnhancerSettings(updated);
  };

  const handleParamChange = (patch: Partial<ProVocalAIEnhancerSettings>) => {
    const updated = { ...settings, ...patch };
    onChange(updated);
    audioEngine.updateAIEnhancerSettings(updated);
  };

  const handleRunAIScan = async () => {
    setIsScanning(true);
    try {
      const result = await audioEngine.analyzeAndAutoEnhanceVocals(settings.aiProfile);
      setAnalysisResult(result);

      // Apply intelligent AI optimizations automatically
      const optimized: ProVocalAIEnhancerSettings = {
        ...settings,
        intensity: 80,
        clarityPresence: result.suggestedClarityBoost,
        airBrilliance: result.suggestedAirBoost,
        harshnessTamer: result.suggestedHarshReduction,
        deMud: result.suggestedDeMud,
      };
      onChange(optimized);
      audioEngine.updateAIEnhancerSettings(optimized);
    } catch (e) {
      console.error('AI Vocal Scan error:', e);
    } finally {
      setIsScanning(false);
    }
  };

  // Draw real-time spectral curve visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Zero dB midline
    const midY = height / 2;
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.6)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();
    ctx.setLineDash([]);

    if (!settings.enabled) {
      // Draw flat bypassed line
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();
      return;
    }

    // Calculate curve based on DSP settings
    const intensity = settings.intensity / 100;
    const warmth = (settings.warmthBody / 100) * 25 * intensity;
    const deMud = -(settings.deMud / 100) * 28 * intensity;
    const clarity = (settings.clarityPresence / 100) * 32 * intensity;
    const harshTamer = -(settings.harshnessTamer / 100) * 30 * intensity;
    const air = (settings.airBrilliance / 100) * 36 * intensity;

    ctx.beginPath();
    ctx.moveTo(0, midY);

    for (let x = 0; x <= width; x += 3) {
      const normalizedX = x / width; // 0 to 1 (20Hz to 20kHz approx)

      // Warmth (0.05 to 0.2)
      const wWeight = Math.exp(-Math.pow((normalizedX - 0.12) / 0.08, 2));
      // De-Mud (0.15 to 0.35)
      const mWeight = Math.exp(-Math.pow((normalizedX - 0.24) / 0.09, 2));
      // Clarity (0.45 to 0.65)
      const cWeight = Math.exp(-Math.pow((normalizedX - 0.52) / 0.12, 2));
      // Harshness notch (0.58 to 0.72)
      const hWeight = Math.exp(-Math.pow((normalizedX - 0.64) / 0.08, 2));
      // Air Brilliance (0.75 to 1.0)
      const aWeight = Math.max(0, (normalizedX - 0.7) / 0.3);

      const netDeltaY =
        warmth * wWeight +
        deMud * mWeight +
        clarity * cWeight +
        harshTamer * hWeight +
        air * aWeight;

      const y = midY - netDeltaY;
      ctx.lineTo(x, Math.max(8, Math.min(height - 8, y)));
    }

    // Gradient fill under curve
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.85)'); // Cyan
    gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.9)'); // Indigo
    gradient.addColorStop(1, 'rgba(236, 72, 153, 0.9)'); // Pink

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Area fill
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const fillGradient = ctx.createLinearGradient(0, 0, 0, height);
    fillGradient.addColorStop(0, 'rgba(6, 182, 212, 0.2)');
    fillGradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
    ctx.fillStyle = fillGradient;
    ctx.fill();
  }, [settings]);

  return (
    <div className="space-y-5">
      {/* 1. MASTER AI VOCAL ENHANCER HEADER & SCAN BANNER */}
      <div className="rounded-2xl bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-slate-800 p-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-indigo-500/20 to-pink-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/10">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Pro Vocal AI Enhancer &amp; De-Harsh Chain
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  REAL-TIME DSP
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Multi-Band Acoustic Sculpting &bull; 3.6kHz Harshness Clamp &bull; Silky Air Brilliance &bull; Room De-Box
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-run-ai-scan"
              onClick={handleRunAIScan}
              disabled={isScanning}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/25 active:scale-98"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Scanning Acoustic Profile...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>One-Click AI Vocal Scan</span>
                </>
              )}
            </button>

            <button
              id="btn-toggle-ai-enhancer"
              onClick={() => handleParamChange({ enabled: !settings.enabled })}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                settings.enabled
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 ring-2 ring-cyan-400/40'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {settings.enabled ? 'ACTIVE' : 'BYPASS'}
            </button>
          </div>
        </div>

        {/* Diagnostic Scan Report Card */}
        {analysisResult && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-cyan-500/40 text-xs font-mono space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                AI Vocal Scan Complete
              </span>
              <span className="text-[11px] text-slate-400">
                Processed {new Date(analysisResult.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <p className="text-slate-300 leading-relaxed text-[11px]">
              {analysisResult.diagnosisText}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Room Floor</span>
                <span className="text-sm font-bold text-cyan-300">{analysisResult.noiseFloorDb} dB</span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Harshness Index</span>
                <span className="text-sm font-bold text-rose-400">{analysisResult.harshnessIndex}%</span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Clarity Score</span>
                <span className="text-sm font-bold text-emerald-400">{analysisResult.clarityScore}%</span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Auto-Gate Calib</span>
                <span className="text-sm font-bold text-amber-300">
                  {analysisResult.suggestedGateThreshold} dB
                </span>
              </div>
            </div>
          </div>
        )}

        {/* AI Vocal Genre Profiles Selection */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-300 font-semibold uppercase tracking-wider text-[11px]">
              Vocal Harmonic Profile:
            </span>
            <span className="text-cyan-400 font-mono text-[11px] font-bold">
              {activeProfile.name} ({activeProfile.genre})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {AI_PROFILES.map(p => {
              const IconComp = p.icon;
              const isSelected = settings.aiProfile === p.id;
              return (
                <button
                  key={p.id}
                  id={`btn-profile-${p.id}`}
                  onClick={() => handleProfileSelect(p.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? `${p.badgeColor} border-2 ring-2 ring-cyan-500/20 shadow-lg scale-102`
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <IconComp className={`w-4 h-4 ${isSelected ? 'text-cyan-300' : 'text-slate-400'}`} />
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-950/80 text-slate-300">
                      {p.genre.split('/')[0]}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white mb-0.5 leading-tight">{p.name}</h4>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-snug">
                      {p.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. REAL-TIME SPECTRAL RESPONSE CURVE & DETAILED BAND CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Visual Dynamic Frequency Canvas */}
        <div className="lg:col-span-5 rounded-2xl bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-slate-800 p-5 shadow-2xl backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Harmonic Response Curve
                </h3>
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                <span>20Hz</span>
                <span>&bull;</span>
                <span>1kHz</span>
                <span>&bull;</span>
                <span>20kHz</span>
              </div>
            </div>

            <div className="mt-4 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 relative">
              <canvas
                ref={canvasRef}
                width={380}
                height={160}
                className="w-full h-40 block"
              />
              <div className="absolute top-2 left-2 text-[9px] font-mono text-cyan-400/80 bg-slate-950/80 px-1.5 py-0.5 rounded border border-cyan-500/20">
                +12dB Peak Max
              </div>
              <div className="absolute bottom-2 left-2 text-[9px] font-mono text-rose-400/80 bg-slate-950/80 px-1.5 py-0.5 rounded border border-rose-500/20">
                -12dB Notch
              </div>
              <div className="absolute bottom-2 right-2 text-[9px] font-mono text-pink-400/80 bg-slate-950/80 px-1.5 py-0.5 rounded border border-pink-500/20">
                11.5kHz Air Sheen
              </div>
            </div>

            {/* Intensity Slider */}
            <div className="mt-5 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  Master AI Intensity:
                </span>
                <span className="font-mono text-cyan-400 font-bold">{settings.intensity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.intensity}
                onChange={e => handleParamChange({ intensity: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer h-5 sm:h-2 bg-slate-800 rounded-lg"
              />
              <p className="text-[10px] text-slate-400 mt-1.5">
                Dry/Wet neural blending of the entire enhancement chain without phase cancellation.
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mt-4 pt-3 border-t border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-400 block mb-2">
              Quick Macro Presets:
            </span>
            <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
              <button
                onClick={() =>
                  handleParamChange({
                    clarityPresence: 75,
                    airBrilliance: 85,
                    harshnessTamer: 65,
                    warmthBody: 40,
                    deMud: 65,
                  })
                }
                className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-center transition cursor-pointer"
              >
                Diamond Air
              </button>
              <button
                onClick={() =>
                  handleParamChange({
                    clarityPresence: 55,
                    airBrilliance: 65,
                    harshnessTamer: 80,
                    warmthBody: 65,
                    deMud: 45,
                  })
                }
                className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-center transition cursor-pointer"
              >
                Velvet Silk
              </button>
              <button
                onClick={() =>
                  handleParamChange({
                    clarityPresence: 80,
                    airBrilliance: 70,
                    harshnessTamer: 50,
                    warmthBody: 55,
                    deMud: 70,
                  })
                }
                className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-center transition cursor-pointer"
              >
                Punchy Rap
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Band Acoustic Enhancer Controls */}
        <div className="lg:col-span-7 rounded-2xl bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 border border-slate-800 p-5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Multi-Band Acoustic Sculpting
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Harmonic Exciter &amp; Resonance Tamer</span>
          </div>

          <div className="space-y-4 mt-4">
            {/* 1. Clarity & Intelligible Presence */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">
                  Intelligible Presence (3.2kHz Boost):
                </span>
                <span className="font-mono text-cyan-400 font-bold">{settings.clarityPresence}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.clarityPresence}
                onChange={e => handleParamChange({ clarityPresence: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Pushes consonant articulation forward in the mix without adding megaphone boxiness.
              </p>
            </div>

            {/* 2. Silky Air & Brilliance */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">
                  Silky Air &amp; Sheen (11.5kHz High-Shelf):
                </span>
                <span className="font-mono text-pink-400 font-bold">{settings.airBrilliance}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.airBrilliance}
                onChange={e => handleParamChange({ airBrilliance: Number(e.target.value) })}
                className="w-full accent-pink-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Adds expensive condenser microphone sparkle and open top-end breath.
              </p>
            </div>

            {/* 3. Harshness & Sibilance Tamer */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  Harshness &amp; Whistle Tamer (3.6kHz Notch):
                  {audioEngine.getHarshReductionDb() > 0 && (
                    <span className="text-[10px] font-mono text-rose-400 font-bold">
                      -{audioEngine.getHarshReductionDb()} dB Active
                    </span>
                  )}
                </span>
                <span className="font-mono text-rose-400 font-bold">{settings.harshnessTamer}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.harshnessTamer}
                onChange={e => handleParamChange({ harshnessTamer: Number(e.target.value) })}
                className="w-full accent-rose-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Automatically detects piercing resonances and clamps ear-fatiguing frequency spikes.
              </p>
            </div>

            {/* 4. Warmth & Chest Body */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Warmth &amp; Chest Body (220Hz Low-Shelf):</span>
                <span className="font-mono text-amber-400 font-bold">{settings.warmthBody}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.warmthBody}
                onChange={e => handleParamChange({ warmthBody: Number(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Lifts lower chest fundamental weight for thin or distant recordings.
              </p>
            </div>

            {/* 5. Room De-Mud & Boxiness Carve */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">
                  Room De-Mud &amp; Boxiness Carve (480Hz Notch):
                </span>
                <span className="font-mono text-indigo-400 font-bold">{settings.deMud}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.deMud}
                onChange={e => handleParamChange({ deMud: Number(e.target.value) })}
                className="w-full accent-indigo-400 cursor-pointer h-5 sm:h-1.5 bg-slate-800 rounded-lg"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Notches out untreated bedroom acoustics, hollow cardboard reflections, and muddy standing waves.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
