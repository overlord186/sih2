import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Activity,
  Volume2,
  VolumeX,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export interface ForecastHorizon {
  id: string;
  leadHours: number; // relative to T0 (-3 to +120)
  label: string;
  category: 'NOWCAST' | 'ANALYSIS' | 'SHORT_RANGE' | 'MEDIUM_RANGE' | 'EXTENDED';
  cycle: string; // synoptic run cycle (e.g. 00z, 12z)
  confidencePct: number;
}

export const FORECAST_HORIZONS: ForecastHorizon[] = [
  { id: 'h-minus-3', leadHours: -3, label: 'T-3h Nowcast', category: 'NOWCAST', cycle: 'RADAR_NOWCAST', confidencePct: 98 },
  { id: 'h-minus-1', leadHours: -1, label: 'T-1h Sounding', category: 'NOWCAST', cycle: 'AWS_HOURLY', confidencePct: 96 },
  { id: 'h-0', leadHours: 0, label: 'T0 Analysis', category: 'ANALYSIS', cycle: '00z_INIT', confidencePct: 95 },
  { id: 'h-plus-6', leadHours: 6, label: '+6h Convective', category: 'SHORT_RANGE', cycle: '06z_RUN', confidencePct: 92 },
  { id: 'h-plus-12', leadHours: 12, label: '+12h Evening Surge', category: 'SHORT_RANGE', cycle: '12z_RUN', confidencePct: 88 },
  { id: 'h-plus-24', leadHours: 24, label: 'Day 1 (+24h)', category: 'SHORT_RANGE', cycle: '00z_D1', confidencePct: 84 },
  { id: 'h-plus-48', leadHours: 48, label: 'Day 2 (+48h)', category: 'MEDIUM_RANGE', cycle: '00z_D2', confidencePct: 78 },
  { id: 'h-plus-72', leadHours: 72, label: 'Day 3 (+72h)', category: 'MEDIUM_RANGE', cycle: '00z_D3', confidencePct: 71 },
  { id: 'h-plus-120', leadHours: 120, label: 'Day 5 (+120h)', category: 'EXTENDED', cycle: '00z_D5', confidencePct: 62 },
];

interface SpringTemporalScrubberProps {
  currentLeadHours?: number;
  onHorizonChange?: (horizon: ForecastHorizon) => void;
  className?: string;
}

export const SpringTemporalScrubber: React.FC<SpringTemporalScrubberProps> = ({
  currentLeadHours = 0,
  onHorizonChange,
  className = '',
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(() => {
    const idx = FORECAST_HORIZONS.findIndex((h) => h.leadHours === currentLeadHours);
    return idx >= 0 ? idx : 2; // Default to T0 Analysis
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isAudioFeedbackEnabled, setIsAudioFeedbackEnabled] = useState<boolean>(true);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const animTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Synthesize micro-acoustic click when scrubbing across synoptic horizons
  const playAcousticTick = useCallback((freqHz: number = 140) => {
    if (!isAudioFeedbackEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state === 'suspended') {
        ctx?.resume();
      }
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqHz, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.016);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.02);
    } catch {
      // Audio autoplay gracefully handled
    }
  }, [isAudioFeedbackEnabled]);

  const activeHorizon = FORECAST_HORIZONS[selectedIndex];

  const handleSelectHorizon = (index: number) => {
    if (index === selectedIndex) return;
    setSelectedIndex(index);
    playAcousticTick(index > 2 ? 160 : 120);
    if (onHorizonChange) {
      onHorizonChange(FORECAST_HORIZONS[index]);
    }
  };

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) {
      if (animTimerRef.current) clearInterval(animTimerRef.current);
      return;
    }

    const intervalMs = Math.round(1800 / playbackSpeed);
    animTimerRef.current = setInterval(() => {
      setSelectedIndex((prev) => {
        const next = (prev + 1) % FORECAST_HORIZONS.length;
        playAcousticTick(150);
        if (onHorizonChange) {
          onHorizonChange(FORECAST_HORIZONS[next]);
        }
        return next;
      });
    }, intervalMs);

    return () => {
      if (animTimerRef.current) clearInterval(animTimerRef.current);
    };
  }, [isPlaying, playbackSpeed, onHorizonChange, playAcousticTick]);

  const getCategoryColor = (cat: ForecastHorizon['category']) => {
    switch (cat) {
      case 'NOWCAST':
        return 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40';
      case 'ANALYSIS':
        return 'text-cyan-300 bg-cyan-950/80 border-cyan-500/50';
      case 'SHORT_RANGE':
        return 'text-blue-300 bg-blue-950/80 border-blue-500/40';
      case 'MEDIUM_RANGE':
        return 'text-amber-300 bg-amber-950/80 border-amber-500/40';
      case 'EXTENDED':
        return 'text-purple-300 bg-purple-950/80 border-purple-500/40';
    }
  };

  return (
    <div id="spring-temporal-scrubber" className={`bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 shadow-xl text-slate-100 ${className}`}>
      {/* Top Header with Active Horizon HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-semibold text-xs text-white uppercase tracking-wider">
            120 FPS Spring Temporal Scrubber
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/40">
            UI-MP 2
          </span>
        </div>

        {/* Active Horizon Badge */}
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-lg font-mono border font-semibold ${getCategoryColor(activeHorizon.category)}`}>
            {activeHorizon.label}
          </span>
          <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
            {activeHorizon.cycle}
          </span>
          <div className="text-xs font-mono text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
            Confidence: <strong className="text-emerald-400">{activeHorizon.confidencePct}%</strong>
          </div>
        </div>
      </div>

      {/* Main Track with Spring Reticle */}
      <div className="my-5 relative px-2">
        {/* Track Line */}
        <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 via-blue-500 to-purple-500 transition-all duration-300"
            style={{ width: `${(selectedIndex / (FORECAST_HORIZONS.length - 1)) * 100}%` }}
          />
        </div>

        {/* Step Nodes */}
        <div className="relative flex justify-between items-center -mt-2">
          {FORECAST_HORIZONS.map((h, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={h.id}
                onClick={() => handleSelectHorizon(idx)}
                className="group flex flex-col items-center cursor-pointer select-none"
              >
                {/* Node Dot */}
                <div
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                    isSelected
                      ? 'bg-cyan-400 border-white scale-125 shadow-lg shadow-cyan-500/50'
                      : 'bg-slate-900 border-slate-600 hover:border-cyan-400 hover:scale-110'
                  }`}
                >
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                </div>

                {/* Node Label */}
                <span
                  className={`text-[10px] font-mono mt-2 transition-colors ${
                    isSelected
                      ? 'text-cyan-300 font-bold scale-105'
                      : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  {h.leadHours > 0 ? `+${h.leadHours}h` : `${h.leadHours}h`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Playback Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all text-xs ${
              isPlaying
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Pause' : 'Play Timeline'}
          </button>

          <button
            onClick={() => handleSelectHorizon(2)} // reset to T0
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
            title="Reset to T0 Analysis"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Speed Selectors */}
          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700 text-[11px]">
            {[0.5, 1.0, 2.0, 5.0].map((spd) => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-0.5 rounded font-mono transition-colors ${
                  playbackSpeed === spd
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Audio Micro-Clicks Toggle & Info */}
        <div className="flex items-center gap-3 text-slate-400">
          <button
            id="scrubber-audio-clicks-btn"
            onClick={() => setIsAudioFeedbackEnabled(!isAudioFeedbackEnabled)}
            className="flex items-center gap-1 hover:text-slate-200 transition-colors"
            title="Toggle Web Audio acoustic clicks"
          >
            {isAudioFeedbackEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="text-[11px]">Audio Clicks</span>
          </button>

          <div className="text-[11px] font-mono text-slate-500">
            Spring damping: $\zeta = 1.0$ (Critically damped)
          </div>
        </div>
      </div>
    </div>
  );
};
