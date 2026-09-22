import React from 'react';
import { 
  MOUNTAIN_BARRIERS, 
  MONSOON_REGIMES, 
  MountainBarrierId, 
  MonsoonRegimeId,
  MountainBarrier,
  MonsoonRegime 
} from '../../data/landscapeInteractions';
import { 
  Mountain, 
  CloudRain, 
  Wind, 
  Droplets, 
  TrendingDown, 
  Flame, 
  Compass, 
  Layers, 
  Eye, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight, 
  Navigation,
  Info,
  Maximize2
} from 'lucide-react';

interface LandscapeInteractionHUDProps {
  activeBarrierId: MountainBarrierId;
  activeRegimeId: MonsoonRegimeId;
  onChangeBarrier: (barrierId: MountainBarrierId) => void;
  onChangeRegime: (regimeId: MonsoonRegimeId) => void;
  showRidgeElevation: boolean;
  showLiftStreamlines: boolean;
  showRainCurtains: boolean;
  showRainShadowSwath: boolean;
  showStationPins: boolean;
  onToggleLayer: (layerKey: string) => void;
  onFlyToBarrier: (barrier: MountainBarrier) => void;
  className?: string;
}

export const LandscapeInteractionHUD: React.FC<LandscapeInteractionHUDProps> = ({
  activeBarrierId,
  activeRegimeId,
  onChangeBarrier,
  onChangeRegime,
  showRidgeElevation,
  showLiftStreamlines,
  showRainCurtains,
  showRainShadowSwath,
  showStationPins,
  onToggleLayer,
  onFlyToBarrier,
  className = '',
}) => {
  const activeBarrier = MOUNTAIN_BARRIERS.find((b) => b.id === activeBarrierId) || MOUNTAIN_BARRIERS[0];
  const activeRegime = MONSOON_REGIMES.find((r) => r.id === activeRegimeId) || MONSOON_REGIMES[0];
  const interaction = activeRegime.barrierInteractions[activeBarrierId] || activeRegime.barrierInteractions.WESTERN_GHATS;

  return (
    <div className={`bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-2xl p-3 sm:p-4 text-slate-100 font-sans shadow-2xl ${className}`}>
      {/* Header & Sub-Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-600/30">
            <Mountain className="w-4 h-4 text-emerald-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-white">
                Landscape Interaction: Orographic Monsoon Simulator
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-bold">
                MESO-OROGRAPHY
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Visualize how Indian monsoon regimes interact with mountain barriers to trigger orographic rainfall & rain shadows
            </p>
          </div>
        </div>

        {/* 3D Visual Layers Toggles */}
        <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono font-bold">
          <button
            type="button"
            onClick={() => onToggleLayer('ridges')}
            className={`px-2 py-1 rounded-md border transition-all cursor-pointer ${
              showRidgeElevation
                ? 'bg-cyan-600/20 border-cyan-400 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
            title="Toggle 3D Mountain Ridge Extrusions"
          >
            🏔️ Ridges: {showRidgeElevation ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={() => onToggleLayer('streamlines')}
            className={`px-2 py-1 rounded-md border transition-all cursor-pointer ${
              showLiftStreamlines
                ? 'bg-blue-600/20 border-blue-400 text-blue-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
            title="Toggle Orographic Forced Ascent Streamlines"
          >
            💨 Ascent Streamlines: {showLiftStreamlines ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={() => onToggleLayer('curtains')}
            className={`px-2 py-1 rounded-md border transition-all cursor-pointer ${
              showRainCurtains
                ? 'bg-emerald-600/20 border-emerald-400 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
            title="Toggle Windward Rain Curtains"
          >
            🌧️ Rain Curtains: {showRainCurtains ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={() => onToggleLayer('shadow')}
            className={`px-2 py-1 rounded-md border transition-all cursor-pointer ${
              showRainShadowSwath
                ? 'bg-amber-600/20 border-amber-400 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
            title="Toggle Leeward Rain Shadow Föhn Swath"
          >
            ☀️ Rain Shadow: {showRainShadowSwath ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={() => onToggleLayer('pins')}
            className={`px-2 py-1 rounded-md border transition-all cursor-pointer ${
              showStationPins
                ? 'bg-rose-600/20 border-rose-400 text-rose-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
            title="Toggle Meteorological Station Pins"
          >
            📍 Stations: {showStationPins ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* SECTION 1: MONSOON REGIME SELECTOR */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
            <span>Select Indian Monsoon Synoptic Regime:</span>
          </span>
          <span className="text-[10px] text-cyan-300 font-bold">
            Wind: {activeRegime.windSpeedKmh} km/h • Specific Humidity: {activeRegime.moistureContentGKg} g/kg
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {MONSOON_REGIMES.map((regime) => {
            const isSelected = regime.id === activeRegimeId;
            return (
              <button
                key={regime.id}
                type="button"
                onClick={() => onChangeRegime(regime.id)}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-400 text-white ring-2 ring-cyan-400/50 shadow-lg'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: regime.color }}
                  />
                  <span className="text-[9px] font-mono text-slate-400">
                    {regime.season.split('(')[0].trim()}
                  </span>
                </div>
                <div className="text-[11px] font-black leading-snug line-clamp-1">
                  {regime.name}
                </div>
                <div className="text-[9px] text-slate-400 font-mono mt-1 flex items-center justify-between">
                  <span>{regime.windSpeedKmh} km/h</span>
                  <span className="text-cyan-300">{regime.moistureContentGKg} g/kg</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: REGIONAL GEOGRAPHY / MOUNTAIN BARRIER SELECTOR */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Mountain className="w-3.5 h-3.5 text-amber-400" />
            <span>Select Regional Orographic Barrier:</span>
          </span>
          <button
            type="button"
            onClick={() => onFlyToBarrier(activeBarrier)}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Fly 3D Camera to Barrier</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {MOUNTAIN_BARRIERS.map((barrier) => {
            const isSelected = barrier.id === activeBarrierId;
            return (
              <button
                key={barrier.id}
                type="button"
                onClick={() => onChangeBarrier(barrier.id)}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-950/40 border-emerald-400 text-white ring-2 ring-emerald-400/50 shadow-md'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-black truncate">{barrier.name}</span>
                </div>
                <div className="text-[10px] text-amber-300 font-mono truncate">
                  {barrier.peakName}
                </div>
                <div className="text-[9px] text-slate-400 font-mono flex items-center justify-between mt-1">
                  <span>Avg: {barrier.avgElevationM}m</span>
                  <span className="text-emerald-300 font-bold">Max: {barrier.maxPeakM}m</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: QUANTITATIVE OROGRAPHIC PHYSICS METRICS */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-5 gap-2.5 font-mono text-xs mb-3">
        {/* Metric 1: Froude Number & Blocking */}
        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
          <div className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <span>Froude Number (Fr)</span>
            <span
              className={`px-1 rounded text-[8px] font-black ${
                interaction.froudeNumber >= 1.0
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                  : 'bg-rose-950 text-rose-400 border border-rose-700'
              }`}
            >
              {interaction.froudeNumber >= 1.0 ? 'UNBLOCKED' : 'BLOCKED'}
            </span>
          </div>
          <div className="text-base font-black text-cyan-300 mt-1">
            {interaction.froudeNumber.toFixed(2)}
          </div>
          <div className="text-[8px] text-slate-400 mt-0.5">
            {interaction.froudeNumber >= 1.0 ? 'Flow ascents crest' : 'Deflected / channeled'}
          </div>
        </div>

        {/* Metric 2: Lifted Condensation Level (LCL) */}
        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
          <div className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <CloudRain className="w-3 h-3 text-sky-400" />
            <span>Condensation LCL</span>
          </div>
          <div className="text-base font-black text-sky-300 mt-1">
            {interaction.liftCondensationLevelM} <span className="text-xs text-slate-400 font-normal">m</span>
          </div>
          <div className="text-[8px] text-slate-400 mt-0.5">
            Cloud base elevation
          </div>
        </div>

        {/* Metric 3: Windward Forced Precipitation */}
        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
          <div className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            <span>Windward Deluge</span>
          </div>
          <div className="text-base font-black text-emerald-300 mt-1">
            {interaction.windwardRainMmDay} <span className="text-xs text-slate-400 font-normal">mm/d</span>
          </div>
          <div className="text-[8px] text-slate-400 mt-0.5">
            Orographic ascent yield
          </div>
        </div>

        {/* Metric 4: Leeward Rain Shadow Deficit */}
        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
          <div className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3 text-amber-400" />
            <span>Rain Shadow Deficit</span>
          </div>
          <div className="text-base font-black text-amber-300 mt-1">
            -{interaction.rainShadowDeficitPct.toFixed(1)}%
          </div>
          <div className="text-[8px] text-slate-400 mt-0.5">
            Leeward rain: {interaction.leewardRainMmDay} mm/d
          </div>
        </div>

        {/* Metric 5: Adiabatic Foehn Warming */}
        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 col-span-2 sm:col-span-1">
          <div className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <Flame className="w-3 h-3 text-rose-400" />
            <span>Adiabatic Föhn Rise</span>
          </div>
          <div className="text-base font-black text-rose-400 mt-1">
            +{interaction.foehnHeatingDeltaC.toFixed(1)}°C
          </div>
          <div className="text-[8px] text-slate-400 mt-0.5">
            Descent warming rate
          </div>
        </div>
      </div>

      {/* SECTION 4: SYNOPTIC ANALYSIS & KEY STATIONS BAR */}
      <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
        <div className="sm:col-span-2">
          <span className="text-[9px] uppercase font-bold text-cyan-400 block mb-1">
            Synoptic Interaction Analysis: {activeRegime.name} × {activeBarrier.name}
          </span>
          <p className="text-[11px] font-sans text-slate-200 leading-relaxed">
            {interaction.summary}
          </p>
          <div className="text-[9px] text-slate-400 mt-1">
            <span className="text-amber-300 font-bold">Geology:</span> {activeBarrier.geologicalContext}
          </div>
        </div>

        {/* Key Stations Summary */}
        <div className="border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-3">
          <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">
            Observation Stations Along Transect
          </span>
          <div className="space-y-1">
            {interaction.keyStations.slice(0, 3).map((st) => (
              <div
                key={st.name}
                className="flex items-center justify-between text-[10px] bg-slate-950/80 px-1.5 py-1 rounded border border-slate-800"
              >
                <div className="flex items-center gap-1 truncate max-w-[120px]">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      st.type === 'WINDWARD'
                        ? 'bg-cyan-400'
                        : st.type === 'CREST'
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                  />
                  <span className="truncate">{st.name}</span>
                </div>
                <span className="font-bold text-cyan-300 font-mono">
                  {st.regimeRainfallMmDay} mm/d
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
