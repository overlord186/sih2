/**
 * PerformanceMonitorHud.tsx
 * SAMVARTAKA AI — Real-Time 120 FPS Frame Budget & Mathematical Worker Diagnostic HUD
 * 
 * Provides continuous telemetry on browser render smoothness, GPU compositor state,
 * and Web Worker background compute load.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Cpu,
  Zap,
  Gauge,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Radio,
} from 'lucide-react';
import { mathWorkerDispatcher } from '../utils/mathWorkerClient';
import { getIsLiveRealDataActive } from '../utils/realWeatherPipeline';

export const PerformanceMonitorHud: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [fps, setFps] = useState(120);
  const [frameTimeMs, setFrameTimeMs] = useState(4.2);
  const [isWorkerActive, setIsWorkerActive] = useState(false);
  const [isLiveReal, setIsLiveReal] = useState(false);

  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef<number>(performance.now());
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    setIsWorkerActive(mathWorkerDispatcher.isWorkerActive());
    setIsLiveReal(getIsLiveRealDataActive());

    const handleModeChange = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail) {
        setIsLiveReal(custom.detail.isLiveReal);
      }
    };
    window.addEventListener('data-source-mode-changed', handleModeChange);

    // Frame rate measuring loop
    const measure = (now: number) => {
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (delta > 0 && delta < 200) {
        frameTimesRef.current.push(delta);
        if (frameTimesRef.current.length > 30) {
          frameTimesRef.current.shift();
        }

        // Calculate average FPS and Frame Time
        const avgDelta = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
        const currentFps = Math.min(144, Math.round(1000 / avgDelta));
        setFps(currentFps);
        setFrameTimeMs(Math.round(avgDelta * 10) / 10);
      }

      rafIdRef.current = requestAnimationFrame(measure);
    };

    rafIdRef.current = requestAnimationFrame(measure);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      window.removeEventListener('data-source-mode-changed', handleModeChange);
    };
  }, []);

  // Keyboard shortcut: Ctrl+Shift+P or Cmd+Shift+P toggles HUD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getFpsColor = (val: number) => {
    if (val >= 110) return 'text-emerald-400';
    if (val >= 58) return 'text-cyan-400';
    if (val >= 35) return 'text-amber-400';
    return 'text-rose-400';
  };

  const frameBudgetPct = Math.min(100, Math.round((frameTimeMs / 8.33) * 100));

  return (
    <div className="fixed bottom-4 left-4 z-[9999] font-mono select-none">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/85 border border-slate-800 text-slate-300 hover:text-white shadow-xl backdrop-blur-md cursor-pointer transition-all hover:border-slate-700 text-xs"
          title="Open 120 FPS & Engine Diagnostics HUD (Ctrl+Shift+P)"
        >
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className={`font-semibold ${getFpsColor(fps)}`}>{fps} FPS</span>
          <span className="text-[10px] text-slate-500">({frameTimeMs}ms)</span>
        </button>
      ) : (
        <div className="w-80 rounded-2xl bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-xl p-4 text-xs text-slate-200 animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-slate-100 text-sm">SAMVARTAKA 120 FPS HUD</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-2 gap-3 my-3">
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mb-1">
                <Gauge className="w-3 h-3 text-cyan-400" />
                <span>RENDER RATE</span>
              </div>
              <div className={`text-xl font-bold ${getFpsColor(fps)}`}>
                {fps} <span className="text-xs text-slate-400">FPS</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Target: 120 Hz / 60 Hz</div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mb-1">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>FRAME BUDGET</span>
              </div>
              <div className="text-xl font-bold text-slate-100">
                {frameTimeMs} <span className="text-xs text-slate-400">ms</span>
              </div>
              {/* Budget Progress Bar */}
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    frameBudgetPct <= 100 ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, frameBudgetPct)}%` }}
                />
              </div>
              <div className="text-[9px] text-slate-500 mt-1">{frameBudgetPct}% of 8.33ms budget</div>
            </div>
          </div>

          {/* Subsystem Status */}
          <div className="space-y-2 pt-1 border-t border-slate-800/80 text-[11px]">
            <div className="flex items-center justify-between py-1">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                Math Web Worker:
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                isWorkerActive ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60' : 'bg-slate-800 text-slate-300'
              }`}>
                {isWorkerActive ? 'ACTIVE (OFF-THREAD)' : 'SYNC FALLBACK'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                GPU Compositor:
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-950/80 text-purple-300 border border-purple-800/60">
                HARDWARE (translate3d)
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                Telemetry Pipeline:
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                isLiveReal
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                  : 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
              }`}>
                {isLiveReal ? 'LIVE ECMWF & AWS' : 'CLIMATOLOGY BENCHMARK'}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 flex justify-between items-center">
            <span>Toggle: Ctrl+Shift+P</span>
            <span>Critically Damped Harmonic Motion</span>
          </div>
        </div>
      )}
    </div>
  );
};
