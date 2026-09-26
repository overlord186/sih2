import React, { useState, useEffect, useCallback } from 'react';
import { Film, Move, Radio, CheckCircle2, AlertTriangle, Sparkles, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface DashboardEngineState {
  grain: boolean;
  wasdScroll: boolean;
  radar: boolean;
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  detail: string;
}

/**
 * DashboardEngineControls
 * 
 * Provides explicit error handling, state-mapping updates, and immediate visual feedback
 * for:
 * 1. Film Grain Overlay ('grain')
 * 2. 3D WASD Camera Scroll ('WASD scroll')
 * 3. Doppler Radar Reflectivity & Beam Overlay ('radar toggle')
 */
export const DashboardEngineControls: React.FC<{
  className?: string;
  compact?: boolean;
}> = ({ className = '', compact = false }) => {
  const [engineState, setEngineState] = useState<DashboardEngineState>(() => {
    try {
      const savedGrain = localStorage.getItem('samvartaka_engine_grain') === 'true';
      const savedWasd = localStorage.getItem('samvartaka_engine_wasd') === 'true';
      const savedRadar = localStorage.getItem('samvartaka_engine_radar') === 'true';
      return {
        grain: savedGrain,
        wasdScroll: savedWasd,
        radar: savedRadar,
      };
    } catch {
      return {
        grain: false,
        wasdScroll: false,
        radar: false,
      };
    }
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const showToast = useCallback((type: 'success' | 'error' | 'info', title: string, detail: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev.slice(-2), { id, type, title, detail }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  }, []);

  // Sync state changes with DOM, WebGL Engine events, and LocalStorage
  const applyEngineGrain = useCallback((active: boolean) => {
    try {
      if (active) {
        document.body.classList.add('cine-4k-grain');
      } else {
        document.body.classList.remove('cine-4k-grain');
      }
      localStorage.setItem('samvartaka_engine_grain', String(active));
      window.dispatchEvent(new CustomEvent('engine-grain-toggle', { detail: { active } }));
      return true;
    } catch (err: any) {
      console.error('[Engine Controller] Failed to update Grain state:', err);
      setLastError(`Grain Error: ${err?.message || 'DOM sync failure'}`);
      return false;
    }
  }, []);

  const applyEngineWasd = useCallback((active: boolean) => {
    try {
      if (active) {
        document.body.classList.add('wasd-camera-active');
      } else {
        document.body.classList.remove('wasd-camera-active');
      }
      localStorage.setItem('samvartaka_engine_wasd', String(active));
      window.dispatchEvent(new CustomEvent('engine-wasd-toggle', { detail: { active } }));
      return true;
    } catch (err: any) {
      console.error('[Engine Controller] Failed to update WASD Camera state:', err);
      setLastError(`WASD Error: ${err?.message || 'Camera controller sync failure'}`);
      return false;
    }
  }, []);

  const applyEngineRadar = useCallback((active: boolean) => {
    try {
      if (active) {
        document.body.classList.add('doppler-radar-active');
      } else {
        document.body.classList.remove('doppler-radar-active');
      }
      localStorage.setItem('samvartaka_engine_radar', String(active));
      window.dispatchEvent(new CustomEvent('engine-radar-toggle', { detail: { active } }));
      return true;
    } catch (err: any) {
      console.error('[Engine Controller] Failed to update Radar state:', err);
      setLastError(`Radar Error: ${err?.message || 'GIS Layer sync failure'}`);
      return false;
    }
  }, []);

  // Initialize engine states on mount
  useEffect(() => {
    applyEngineGrain(engineState.grain);
    applyEngineWasd(engineState.wasdScroll);
    applyEngineRadar(engineState.radar);
  }, [applyEngineGrain, applyEngineWasd, applyEngineRadar, engineState.grain, engineState.wasdScroll, engineState.radar]);

  // Global event listener to keep external triggers synchronized
  useEffect(() => {
    const handleExternalGrain = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.active === 'boolean') {
        setEngineState(prev => (prev.grain !== detail.active ? { ...prev, grain: detail.active } : prev));
      }
    };

    const handleExternalWasd = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.active === 'boolean') {
        setEngineState(prev => (prev.wasdScroll !== detail.active ? { ...prev, wasdScroll: detail.active } : prev));
      }
    };

    const handleExternalRadar = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.active === 'boolean') {
        setEngineState(prev => (prev.radar !== detail.active ? { ...prev, radar: detail.active } : prev));
      }
    };

    window.addEventListener('engine-grain-external', handleExternalGrain);
    window.addEventListener('engine-wasd-external', handleExternalWasd);
    window.addEventListener('engine-radar-external', handleExternalRadar);

    return () => {
      window.removeEventListener('engine-grain-external', handleExternalGrain);
      window.removeEventListener('engine-wasd-external', handleExternalWasd);
      window.removeEventListener('engine-radar-external', handleExternalRadar);
    };
  }, []);

  // Keyboard shortcuts [G], [W], [R] for rapid engine testing & accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.key === 'g' || e.key === 'G') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          toggleGrain();
        }
      } else if (e.key === 'w' || e.key === 'W') {
        // Toggle WASD camera mode if Alt is held or simply in free view
        if (e.altKey) {
          e.preventDefault();
          toggleWasd();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (e.altKey) {
          e.preventDefault();
          toggleRadar();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Safe Toggle Handlers with Explicit Try/Catch Error Handling & Immediate Feedback
  const toggleGrain = () => {
    try {
      const nextVal = !engineState.grain;
      const success = applyEngineGrain(nextVal);
      if (success) {
        setEngineState(prev => ({ ...prev, grain: nextVal }));
        showToast(
          'success',
          nextVal ? 'Film Grain 4K: Active' : 'Film Grain: Disabled',
          nextVal ? 'Cinematic noise texture mapped across viewport.' : 'Standard crystal-clear canvas restored.'
        );
      } else {
        showToast('error', 'Grain Toggle Failed', 'Could not apply CSS overlay class.');
      }
    } catch (err: any) {
      console.error('[DashboardEngineControls] Grain toggle exception:', err);
      showToast('error', 'Engine Error', err?.message || 'Unexpected exception during grain state update.');
    }
  };

  const toggleWasd = () => {
    try {
      const nextVal = !engineState.wasdScroll;
      const success = applyEngineWasd(nextVal);
      if (success) {
        setEngineState(prev => ({ ...prev, wasdScroll: nextVal }));
        showToast(
          'success',
          nextVal ? 'WASD 3D Camera: Free Pan' : 'WASD 3D Camera: Cinematic Orbit',
          nextVal
            ? 'Controls unlocked: Press W/A/S/D or Arrows to pan, Mouse Wheel to zoom.'
            : 'Controls locked: Autonomous smooth orbital rotation restored.'
        );
      } else {
        showToast('error', 'Camera Toggle Failed', 'Could not dispatch OrbitControls signal.');
      }
    } catch (err: any) {
      console.error('[DashboardEngineControls] WASD toggle exception:', err);
      showToast('error', 'Engine Error', err?.message || 'Unexpected exception during camera state update.');
    }
  };

  const toggleRadar = () => {
    try {
      const nextVal = !engineState.radar;
      const success = applyEngineRadar(nextVal);
      if (success) {
        setEngineState(prev => ({ ...prev, radar: nextVal }));
        showToast(
          'success',
          nextVal ? 'Doppler Radar: Broadcast Active' : 'Doppler Radar: Layer Standby',
          nextVal
            ? '3GHz S-Band sweep beam and reflectivity dBZ contours enabled on Live Map.'
            : 'Standard GIS geospatial surface layer restored.'
        );
      } else {
        showToast('error', 'Radar Toggle Failed', 'Could not sync GIS layer controller.');
      }
    } catch (err: any) {
      console.error('[DashboardEngineControls] Radar toggle exception:', err);
      showToast('error', 'Engine Error', err?.message || 'Unexpected exception during radar state update.');
    }
  };

  return (
    <>
      {/* Toast Feedback Notification Banner */}
      <div className="fixed top-20 right-5 z-[9999] pointer-events-none flex flex-col gap-2 max-w-sm">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.92 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className={`pointer-events-auto flex items-start gap-3 p-3 rounded-xl border shadow-2xl backdrop-blur-xl ${
                toast.type === 'success'
                  ? 'bg-slate-950/90 border-sky-500/40 text-slate-100 shadow-[0_0_25px_rgba(6,182,212,0.25)]'
                  : toast.type === 'error'
                  ? 'bg-rose-950/90 border-rose-500/60 text-rose-100 shadow-[0_0_25px_rgba(244,63,94,0.3)]'
                  : 'bg-indigo-950/90 border-indigo-500/40 text-indigo-100'
              }`}
            >
              <div className="mt-0.5">
                {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-sky-400 animate-pulse" />}
                {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />}
                {toast.type === 'info' && <Sparkles className="w-4 h-4 text-indigo-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold font-mono tracking-tight">{toast.title}</div>
                <div className="text-[11px] text-slate-300 font-sans mt-0.5 leading-snug">{toast.detail}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Interactive Toolbar Control Pill */}
      <div
        className={`flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-lg ${className}`}
      >
        <span className="hidden xl:flex items-center gap-1 text-[10px] font-mono font-bold text-slate-400 px-2 uppercase tracking-wider border-r border-slate-700/80 mr-0.5">
          <Sparkles className="w-3 h-3 text-sky-400" />
          Engine:
        </span>

        {/* 1. Film Grain Toggle Button */}
        <button
          id="btn-engine-grain-toggle"
          type="button"
          onClick={toggleGrain}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
            engineState.grain
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.5)] ring-1 ring-purple-400/60'
              : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700/80'
          }`}
          title="Toggle 4K Cinematic Film Grain Overlay (Hotkey: G)"
        >
          <Film className={`w-3.5 h-3.5 ${engineState.grain ? 'text-purple-200 animate-spin' : 'text-slate-400'}`} style={{ animationDuration: '12s' }} />
          <span>Grain</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              engineState.grain ? 'bg-purple-300 shadow-[0_0_6px_#c084fc]' : 'bg-slate-600'
            }`}
          />
        </button>

        {/* 2. WASD Camera / Scroll Toggle Button */}
        <button
          id="btn-engine-wasd-toggle"
          type="button"
          onClick={toggleWasd}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
            engineState.wasdScroll
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.5)] ring-1 ring-sky-400/60'
              : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700/80'
          }`}
          title="Toggle 3D Camera Free Pan & WASD Scroll (Hotkey: Alt+W or [L])"
        >
          <Move className={`w-3.5 h-3.5 ${engineState.wasdScroll ? 'text-sky-200 animate-pulse' : 'text-slate-400'}`} />
          <span>WASD Scroll</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              engineState.wasdScroll ? 'bg-sky-300 shadow-[0_0_6px_#67e8f9]' : 'bg-slate-600'
            }`}
          />
        </button>

        {/* 3. Doppler Radar Toggle Button */}
        <button
          id="btn-engine-radar-toggle"
          type="button"
          onClick={toggleRadar}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
            engineState.radar
              ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-[0_0_12px_rgba(244,63,94,0.5)] ring-1 ring-rose-400/60'
              : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700/80'
          }`}
          title="Toggle Doppler Radar Reflectivity & Live Sweep Beam Overlay (Hotkey: Alt+R)"
        >
          <Radio className={`w-3.5 h-3.5 ${engineState.radar ? 'text-rose-200 animate-pulse' : 'text-slate-400'}`} />
          <span>Radar</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              engineState.radar ? 'bg-rose-300 shadow-[0_0_6px_#fda4af]' : 'bg-slate-600'
            }`}
          />
        </button>
      </div>
    </>
  );
};
