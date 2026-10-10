import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Calendar, 
  Grid, 
  Navigation, 
  X, 
  Settings, 
  Info, 
  Share2, 
  Maximize2, 
  Minimize2,
  Sparkles,
  Layers,
  Wind as WindIcon,
  Compass
} from 'lucide-react';
import { 
  NullschoolMode, 
  NullschoolAnimate, 
  NullschoolHeight, 
  NullschoolOverlay, 
  NullschoolProjection, 
  NullschoolProbeData, 
  NULLSCHOOL_SCALES 
} from './nullschoolTypes';

export interface EarthNullschoolHUDProps {
  // Probe state
  probeData: NullschoolProbeData | null;
  onClearProbe: () => void;

  // Mode and layers
  mode: NullschoolMode;
  onChangeMode: (m: NullschoolMode) => void;
  animate: NullschoolAnimate;
  onChangeAnimate: (a: NullschoolAnimate) => void;
  height: NullschoolHeight;
  onChangeHeight: (h: NullschoolHeight) => void;
  overlay: NullschoolOverlay;
  onChangeOverlay: (o: NullschoolOverlay) => void;
  projection: NullschoolProjection;
  onChangeProjection: (p: NullschoolProjection) => void;

  // Animation & Controls
  isPlaying: boolean;
  onTogglePlay: () => void;
  isHd: boolean;
  onToggleHd: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  onRecenter: () => void;
  onStepTime: (deltaHours: number) => void;
  onResetTime: () => void;

  // Time & Display
  simulationTime: Date;
  isUtcTime: boolean;
  onToggleUtc: () => void;
}

export const EarthNullschoolHUD: React.FC<EarthNullschoolHUDProps> = ({
  probeData,
  onClearProbe,
  mode,
  onChangeMode,
  animate,
  onChangeAnimate,
  height,
  onChangeHeight,
  overlay,
  onChangeOverlay,
  projection,
  onChangeProjection,
  isPlaying,
  onTogglePlay,
  isHd,
  onToggleHd,
  showGrid,
  onToggleGrid,
  onRecenter,
  onStepTime,
  onResetTime,
  simulationTime,
  isUtcTime,
  onToggleUtc,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  const activeScale = NULLSCHOOL_SCALES[overlay] || NULLSCHOOL_SCALES.Wind;

  // Format date display
  const dateFormatted = isUtcTime 
    ? `${simulationTime.toISOString().slice(0, 10)} ${simulationTime.toISOString().slice(11, 16)} UTC`
    : `${simulationTime.getFullYear()}-${String(simulationTime.getMonth() + 1).padStart(2, '0')}-${String(simulationTime.getDate()).padStart(2, '0')} ${String(simulationTime.getHours()).padStart(2, '0')}:${String(simulationTime.getMinutes()).padStart(2, '0')} Local`;

  const MODES: NullschoolMode[] = ['Air', 'Ocean', 'Chem', 'Particulates', 'Space', 'Bio'];
  const ANIMATE_TYPES: NullschoolAnimate[] = ['Wind', 'Currents', 'Waves'];
  const HEIGHTS: NullschoolHeight[] = ['Sfc', '1000', '850', '700', '500', '250', '70', '10'];
  const OVERLAYS: NullschoolOverlay[] = [
    'Wind', 'Temp', 'RH', 'Dew', 'WBT', '3HPA', 'CAPE', 'TPW', 'TCW', 'MSLP', 'MI', 'UVI', 'WPD', 'None'
  ];
  const PROJECTIONS: NullschoolProjection[] = ['A', 'CE', 'E', 'EQ', 'O', 'P', 'S', 'WB', 'W3'];

  // Helper for Lat/Lon cardinal format (e.g. 4.72° N, 135.77° E)
  const formatCoord = (lat: number, lon: number) => {
    const latStr = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`;
    const lonStr = `${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;
    return `${latStr}, ${lonStr}`;
  };

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP-LEFT FLOATING POINT PROBE (Appears on Globe Click)       */}
      {/* ------------------------------------------------------------- */}
      {probeData && (
        <div className="absolute top-20 left-4 z-40 bg-slate-950/80 backdrop-blur-md border border-slate-700/80 rounded-lg p-2.5 text-white shadow-2xl max-w-xs transition-all animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <div className="font-mono text-xs font-semibold tracking-wide text-sky-300 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              {formatCoord(probeData.lat, probeData.lon)}
            </div>
            <button
              onClick={onClearProbe}
              className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close probe"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="pt-1.5 space-y-1 text-[11px] font-sans">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Wind:</span>
              <span className="font-mono font-bold text-emerald-400">
                {probeData.windBearingDeg}° @ {probeData.windSpeedKmh} km/h
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Temperature:</span>
              <span className="font-mono text-amber-300">{probeData.tempC}°C</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Pressure / Alt:</span>
              <span className="font-mono text-slate-300">{probeData.pressureHpa} hPa ({height})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">CAPE (Convective):</span>
              <span className="font-mono text-purple-300">{probeData.capeJkg} J/kg</span>
            </div>
            {overlay !== 'None' && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">{overlay}:</span>
                <span className="font-mono font-bold text-sky-300">
                  {probeData.overlayValue} {probeData.overlayUnit}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. BOTTOM-LEFT EARTH NULLSCHOOL MASTER CONTROL DOCK           */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute bottom-4 left-4 z-40 max-w-[480px] w-full select-none">
        <div className="bg-slate-950/85 backdrop-blur-md border border-slate-700/70 rounded-xl p-3 text-white text-xs font-sans shadow-2xl transition-all">
          {/* Header Row: Minimize toggle and title */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/90 text-[11px]">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono font-bold tracking-wider text-slate-200">
                EARTH OBSERVATORY
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono">
                GFS / NCMRWF
              </span>
            </div>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={isMinimized ? 'Expand HUD' : 'Collapse HUD'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {!isMinimized && (
            <div className="pt-2 space-y-2 text-[11px]">
              {/* Row 1: Date & Time */}
              <div className="flex items-center text-slate-300">
                <span className="w-14 text-slate-400 font-semibold">Date |</span>
                <div className="flex-1 flex items-center justify-between">
                  <span className="font-mono text-slate-100">{dateFormatted}</span>
                  <button
                    onClick={onToggleUtc}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-300 cursor-pointer transition-colors"
                  >
                    ⇄ {isUtcTime ? 'Local' : 'UTC'}
                  </button>
                </div>
              </div>

              {/* Row 2: Data description */}
              <div className="flex items-center text-slate-300">
                <span className="w-14 text-slate-400 font-semibold">Data |</span>
                <span className="font-mono text-emerald-400 font-medium">
                  {overlay} @ {height === 'Sfc' ? 'Surface' : `${height} hPa`}
                </span>
              </div>

              {/* Row 3: Source */}
              <div className="flex items-center text-slate-300">
                <span className="w-14 text-slate-400 font-semibold">Source |</span>
                <span className="text-slate-400 font-mono text-[10px]">
                  GFS / NCEP / US National Weather Service · IMD India
                </span>
              </div>

              {/* Row 4: Scale Bar */}
              <div className="flex items-center text-slate-300">
                <span className="w-14 text-slate-400 font-semibold">Scale |</span>
                <div className="flex-1 space-y-1">
                  <div
                    className="h-2.5 w-full rounded border border-slate-700 shadow-inner"
                    style={{ background: activeScale.gradientCss }}
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-400">
                    <span>{activeScale.min} {activeScale.unit}</span>
                    <span className="text-slate-300 font-sans">{activeScale.label}</span>
                    <span>{activeScale.max} {activeScale.unit}</span>
                  </div>
                </div>
              </div>

              {/* Row 5: Control Bar */}
              <div className="flex items-center text-slate-300">
                <span className="w-14 text-slate-400 font-semibold">Control |</span>
                <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={onResetTime}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-medium text-slate-200 cursor-pointer"
                  >
                    Now
                  </button>
                  <button
                    onClick={() => onStepTime(-24)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 cursor-pointer"
                    title="Step 24h backward"
                  >
                    <ChevronsLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onStepTime(-3)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 cursor-pointer"
                    title="Step 3h backward"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onStepTime(3)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 cursor-pointer"
                    title="Step 3h forward"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onStepTime(24)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 cursor-pointer"
                    title="Step 24h forward"
                  >
                    <ChevronsRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={onToggleGrid}
                    className={`px-1.5 py-0.5 rounded text-[10px] border cursor-pointer ${
                      showGrid ? 'bg-amber-950/80 text-amber-300 border-amber-600' : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    Grid
                  </button>
                  <button
                    onClick={onTogglePlay}
                    className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1 cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-3 h-3 fill-amber-300" /> : <Play className="w-3 h-3 fill-amber-300" />}
                  </button>
                  <button
                    onClick={onToggleHd}
                    className={`px-1.5 py-0.5 rounded text-[10px] border cursor-pointer ${
                      isHd ? 'bg-sky-950 text-sky-300 border-sky-600' : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    HD
                  </button>
                  <button
                    onClick={onRecenter}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 cursor-pointer"
                    title="Recenter to Target"
                  >
                    <Navigation className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Row 6: Mode Selector */}
              <div className="flex items-center text-slate-300">
                <span className="w-14 text-slate-400 font-semibold">Mode |</span>
                <div className="flex-1 flex gap-1 flex-wrap">
                  {MODES.map((m) => {
                    const isSelected = mode === m;
                    return (
                      <button
                        key={m}
                        onClick={() => onChangeMode(m)}
                        className={`px-2 py-0.5 rounded text-[10.5px] font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/25 text-amber-300 border border-amber-500/60 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 7: Animate */}
              <div className="flex items-center text-slate-300">
                <span className="w-14 text-slate-400 font-semibold">Animate |</span>
                <div className="flex-1 flex gap-1">
                  {ANIMATE_TYPES.map((a) => {
                    const isSelected = animate === a;
                    return (
                      <button
                        key={a}
                        onClick={() => onChangeAnimate(a)}
                        className={`px-2 py-0.5 rounded text-[10.5px] font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/25 text-amber-300 border border-amber-500/60 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 8: Height Levels */}
              <div className="flex items-center text-slate-300">
                <span className="w-14 text-slate-400 font-semibold">Height |</span>
                <div className="flex-1 flex items-center gap-1 flex-wrap">
                  {HEIGHTS.map((h) => {
                    const isSelected = height === h;
                    return (
                      <button
                        key={h}
                        onClick={() => onChangeHeight(h)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/25 text-amber-300 border border-amber-500/60 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {h}
                      </button>
                    );
                  })}
                  <span className="text-[10px] text-slate-500 font-mono ml-1">hPa</span>
                </div>
              </div>

              {/* Row 9: Overlays */}
              <div className="flex items-start text-slate-300 pt-0.5">
                <span className="w-14 text-slate-400 font-semibold pt-0.5">Overlay |</span>
                <div className="flex-1 flex gap-1 flex-wrap">
                  {OVERLAYS.map((ov) => {
                    const isSelected = overlay === ov;
                    return (
                      <button
                        key={ov}
                        onClick={() => onChangeOverlay(ov)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/25 text-amber-300 border border-amber-500/60 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {ov}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 10: Projection */}
              <div className="flex items-center text-slate-300 pt-0.5">
                <span className="w-14 text-slate-400 font-semibold">Project |</span>
                <div className="flex-1 flex gap-1 flex-wrap">
                  {PROJECTIONS.map((p) => {
                    const isSelected = projection === p;
                    return (
                      <button
                        key={p}
                        onClick={() => onChangeProjection(p)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/25 text-amber-300 border border-amber-500/60 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-sans">
                <div className="flex items-center gap-2">
                  <span className="hover:text-slate-300 cursor-pointer">about</span>
                  <span>·</span>
                  <span className="text-emerald-400 font-bold">Earth Nullschool AI</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hover:text-slate-300 cursor-pointer">feedback</span>
                  <button
                    onClick={() => setShowSettingsModal(true)}
                    className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Settings"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
