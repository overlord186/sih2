import React from 'react';
import { 
  GlobePerspectiveMode, 
  GlobalPresetId, 
  RegionalPresetId, 
  StormCameraTrackingMode,
  PerspectiveManagerState 
} from './perspectiveTypes';
import { 
  GLOBAL_VIEW_PRESETS, 
  REGIONAL_FOCUS_PRESETS, 
  ACTIVE_STORM_SYSTEMS 
} from '../../data/stormSystems';
import { 
  Globe, 
  MapPin, 
  Compass, 
  Sliders, 
  RotateCw, 
  Radio, 
  Eye, 
  Layers, 
  Wind, 
  Gauge, 
  AlertTriangle, 
  ChevronRight, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Navigation,
  ShieldAlert,
  Zap
} from 'lucide-react';

interface GlobePerspectiveManagerProps {
  state: PerspectiveManagerState;
  onChangeState: (updater: (prev: PerspectiveManagerState) => PerspectiveManagerState) => void;
  onTriggerPerspectiveChange: (mode: GlobePerspectiveMode, pitch: number, yaw: number, distance: number, targetCoord?: { lat: number; lon: number }) => void;
  className?: string;
}

export const GlobePerspectiveManager: React.FC<GlobePerspectiveManagerProps> = ({
  state,
  onChangeState,
  onTriggerPerspectiveChange,
  className = '',
}) => {
  const activeStorm = ACTIVE_STORM_SYSTEMS.find((s) => s.id === state.activeStormId) || ACTIVE_STORM_SYSTEMS[0];
  const activeRegional = REGIONAL_FOCUS_PRESETS.find((r) => r.id === state.regionalPreset) || REGIONAL_FOCUS_PRESETS[0];
  const activeGlobal = GLOBAL_VIEW_PRESETS.find((g) => g.id === state.globalPreset) || GLOBAL_VIEW_PRESETS[0];

  // Handler for switching primary perspective mode
  const handleSelectMode = (mode: GlobePerspectiveMode) => {
    onChangeState((prev) => ({ ...prev, mode }));

    if (mode === 'GLOBAL') {
      const preset = GLOBAL_VIEW_PRESETS.find((g) => g.id === state.globalPreset) || GLOBAL_VIEW_PRESETS[0];
      onTriggerPerspectiveChange('GLOBAL', preset.pitch, preset.yaw, preset.distance);
    } else if (mode === 'REGIONAL') {
      const preset = REGIONAL_FOCUS_PRESETS.find((r) => r.id === state.regionalPreset) || REGIONAL_FOCUS_PRESETS[0];
      onTriggerPerspectiveChange('REGIONAL', preset.pitch, preset.yaw, preset.zoomDistance, { lat: preset.lat, lon: preset.lon });
    } else if (mode === 'STORM_TRACKING') {
      const storm = ACTIVE_STORM_SYSTEMS.find((s) => s.id === state.activeStormId) || ACTIVE_STORM_SYSTEMS[0];
      onTriggerPerspectiveChange('STORM_TRACKING', 26, (storm.currentLon + 180) % 360, 3.2, { lat: storm.currentLat, lon: storm.currentLon });
    }
  };

  // Handler for selecting a global view preset
  const handleSelectGlobalPreset = (presetId: GlobalPresetId) => {
    onChangeState((prev) => ({ ...prev, globalPreset: presetId }));
    const preset = GLOBAL_VIEW_PRESETS.find((g) => g.id === presetId);
    if (preset) {
      onTriggerPerspectiveChange('GLOBAL', preset.pitch, preset.yaw, preset.distance);
    }
  };

  // Handler for selecting a regional focus preset
  const handleSelectRegionalPreset = (presetId: RegionalPresetId) => {
    onChangeState((prev) => ({ ...prev, regionalPreset: presetId }));
    const preset = REGIONAL_FOCUS_PRESETS.find((r) => r.id === presetId);
    if (preset) {
      onTriggerPerspectiveChange('REGIONAL', preset.pitch, preset.yaw, preset.zoomDistance, { lat: preset.lat, lon: preset.lon });
    }
  };

  // Handler for selecting an active storm
  const handleSelectStorm = (stormId: string) => {
    onChangeState((prev) => ({ ...prev, activeStormId: stormId, activeTrackScrubStep: null }));
    const storm = ACTIVE_STORM_SYSTEMS.find((s) => s.id === stormId);
    if (storm) {
      onTriggerPerspectiveChange('STORM_TRACKING', 26, (storm.currentLon + 180) % 360, 3.2, { lat: storm.currentLat, lon: storm.currentLon });
    }
  };

  // Handler for track step scrubbing
  const handleScrubStep = (step: number | null) => {
    onChangeState((prev) => ({ ...prev, activeTrackScrubStep: step }));
    if (step !== null) {
      const point = activeStorm.track.find((p) => p.step === step);
      if (point) {
        onTriggerPerspectiveChange('STORM_TRACKING', 26, (point.lon + 180) % 360, 3.2, { lat: point.lat, lon: point.lon });
      }
    } else {
      onTriggerPerspectiveChange('STORM_TRACKING', 26, (activeStorm.currentLon + 180) % 360, 3.2, { lat: activeStorm.currentLat, lon: activeStorm.currentLon });
    }
  };

  return (
    <div className={`bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-2xl p-3 sm:p-4 text-slate-100 font-sans shadow-2xl ${className}`}>
      {/* Top Header & Primary Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-cyan-600/30">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-white">
                Globe Perspective Manager
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 font-bold">
                {state.mode === 'GLOBAL' ? 'MACRO' : state.mode === 'REGIONAL' ? 'MESO' : 'SYNOPTIC'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Switch perspective cameras to inspect planetary, regional or active storm systems
            </p>
          </div>
        </div>

        {/* Primary 3-Way Mode Segmented Switch */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-mono font-bold shadow-inner">
          <button
            type="button"
            onClick={() => handleSelectMode('GLOBAL')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              state.mode === 'GLOBAL'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40 ring-1 ring-blue-400/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-sky-300" />
            <span>Global View</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode('REGIONAL')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              state.mode === 'REGIONAL'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/40 ring-1 ring-cyan-400/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-cyan-300" />
            <span>Regional Focus</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode('STORM_TRACKING')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              state.mode === 'STORM_TRACKING'
                ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-md shadow-rose-600/40 ring-1 ring-rose-400/60'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Wind className="w-3.5 h-3.5 text-rose-300" />
            <span>Storm Tracking</span>
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse ml-0.5" />
          </button>
        </div>
      </div>

      {/* MODE 1: GLOBAL VIEW PERSPECTIVE CONTROLS */}
      {state.mode === 'GLOBAL' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-mono text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              <span>Planetary Camera Presets:</span>
            </span>

            {/* Auto-Rotation Toggle */}
            <button
              type="button"
              onClick={() => onChangeState((prev) => ({ ...prev, autoRotatePlanetary: !prev.autoRotatePlanetary }))}
              className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all ${
                state.autoRotatePlanetary
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300 ring-1 ring-blue-500/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <RotateCw className={`w-3 h-3 text-cyan-400 ${state.autoRotatePlanetary ? 'animate-spin-slow' : ''}`} />
              <span>Planetary Auto-Orbit: {state.autoRotatePlanetary ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Preset Buttons Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {GLOBAL_VIEW_PRESETS.map((p) => {
              const isActive = state.globalPreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectGlobalPreset(p.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isActive
                      ? 'bg-blue-600/20 border-blue-400 text-white ring-1 ring-blue-400/50 shadow-md'
                      : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base">{p.icon}</span>
                    {isActive && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
                  </div>
                  <div className="text-xs font-bold leading-tight">{p.label}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1 line-clamp-1">{p.synopticFocus}</div>
                </button>
              );
            })}
          </div>

          {/* Planetary Macro Meteorological Telemetry Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-center font-mono">
            <div className="border-r border-slate-800/80 pr-1">
              <div className="text-[9px] text-slate-400 uppercase">Mean Surface Pressure</div>
              <div className="text-xs font-bold text-cyan-300 mt-0.5">1013.2 hPa</div>
            </div>
            <div className="border-r border-slate-800/80 pr-1">
              <div className="text-[9px] text-slate-400 uppercase">ITCZ Mean Latitude</div>
              <div className="text-xs font-bold text-emerald-400 mt-0.5">+8.4°N (Summer)</div>
            </div>
            <div className="border-r border-slate-800/80 pr-1">
              <div className="text-[9px] text-slate-400 uppercase">Jet Stream Zonal Index</div>
              <div className="text-xs font-bold text-amber-300 mt-0.5">High (48 kts)</div>
            </div>
            <div className="border-r border-slate-800/80 pr-1">
              <div className="text-[9px] text-slate-400 uppercase">Planetary Albedo</div>
              <div className="text-xs font-bold text-sky-300 mt-0.5">0.306</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400 uppercase">Active Synoptic Storms</div>
              <div className="text-xs font-bold text-rose-400 mt-0.5">{ACTIVE_STORM_SYSTEMS.length} Tracked</div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: REGIONAL FOCUS PERSPECTIVE CONTROLS */}
      {state.mode === 'REGIONAL' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-mono text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>Select Synoptic Meteorological Domain:</span>
            </span>
            <span className="text-[10px] text-cyan-400 font-mono font-bold">
              Current: {activeRegional.label} ({activeRegional.lat}°N, {activeRegional.lon}°E)
            </span>
          </div>

          {/* Regional Preset Selector Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
            {REGIONAL_FOCUS_PRESETS.map((r) => {
              const isActive = state.regionalPreset === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelectRegionalPreset(r.id)}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-cyan-600/20 border-cyan-400 text-white ring-1 ring-cyan-400/50 shadow-md'
                      : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">{r.flag}</span>
                    <span className="text-[11px] font-bold truncate">{r.label}</span>
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono truncate">{r.subdivision}</div>
                </button>
              );
            })}
          </div>

          {/* Selected Regional Domain Diagnostics Card */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Synoptic Setting & Scope</span>
              <p className="text-[11px] text-slate-200 leading-relaxed font-sans">{activeRegional.description}</p>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-cyan-400 block mb-0.5">Primary Weather Engine</span>
              <p className="text-[11px] text-cyan-200 font-sans">{activeRegional.dominantWeatherFeature}</p>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-amber-400 block mb-0.5">Orographic Barrier Impact</span>
              <p className="text-[11px] text-amber-200 font-sans">{activeRegional.orographicBarrier}</p>
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: STORM TRACKING PERSPECTIVE CONTROLS */}
      {state.mode === 'STORM_TRACKING' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* Active Storm Selector Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-mono text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-rose-400" />
              <span>Track Active Weather System:</span>
            </span>

            {/* Overlays Toggles */}
            <div className="flex items-center gap-1 font-mono text-[10px]">
              <button
                type="button"
                onClick={() => onChangeState((prev) => ({ ...prev, showStormConeOfUncertainty: !prev.showStormConeOfUncertainty }))}
                className={`px-2 py-1 rounded-md border font-bold transition-all ${
                  state.showStormConeOfUncertainty
                    ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
                title="Toggle Forecast Cone of Uncertainty"
              >
                Forecast Cone: {state.showStormConeOfUncertainty ? 'ON' : 'OFF'}
              </button>

              <button
                type="button"
                onClick={() => onChangeState((prev) => ({ ...prev, showWindRadii: !prev.showWindRadii }))}
                className={`px-2 py-1 rounded-md border font-bold transition-all ${
                  state.showWindRadii
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
                title="Toggle 34kt, 50kt, 64kt Wind Isotach Radii"
              >
                Wind Radii: {state.showWindRadii ? 'ON' : 'OFF'}
              </button>

              <button
                type="button"
                onClick={() => onChangeState((prev) => ({ ...prev, showPastTrackWaypoints: !prev.showPastTrackWaypoints }))}
                className={`px-2 py-1 rounded-md border font-bold transition-all ${
                  state.showPastTrackWaypoints
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
                title="Toggle Historical Track Waypoints"
              >
                Track Points: {state.showPastTrackWaypoints ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Storm Systems Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {ACTIVE_STORM_SYSTEMS.map((storm) => {
              const isActive = state.activeStormId === storm.id;
              return (
                <button
                  key={storm.id}
                  type="button"
                  onClick={() => handleSelectStorm(storm.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isActive
                      ? 'bg-rose-950/40 border-rose-500 text-white ring-1 ring-rose-400/50 shadow-md'
                      : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold bg-slate-800 text-slate-300">
                      {storm.type}
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-400">
                      {storm.currentPressureHpa} hPa
                    </span>
                  </div>
                  <div className="text-xs font-black truncate">{storm.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1 flex items-center justify-between">
                    <span>{storm.maxWindKmh} km/h</span>
                    <span className="text-amber-300">{storm.severity}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Storm Detailed Real-Time Telemetry Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono text-xs">
            {/* Column 1: Intensity & Central Pressure */}
            <div className="space-y-1.5 border-b sm:border-b-0 sm:border-r border-slate-800 pb-2 sm:pb-0 pr-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-rose-400" />
                <span>Central Core Barometer</span>
              </div>
              <div className="text-lg font-black text-rose-400">
                {activeStorm.currentPressureHpa} <span className="text-xs text-slate-400 font-normal">hPa</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Dvorak Rating: <span className="font-bold text-cyan-300">{activeStorm.dvorakRating}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Eye Diameter: <span className="font-bold text-amber-300">{activeStorm.eyeDiameterKm} km</span>
              </div>
            </div>

            {/* Column 2: Winds & Velocity */}
            <div className="space-y-1.5 border-b sm:border-b-0 sm:border-r border-slate-800 pb-2 sm:pb-0 pr-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-amber-400" />
                <span>Max Sustained Velocity</span>
              </div>
              <div className="text-lg font-black text-amber-300">
                {activeStorm.maxWindKmh} <span className="text-xs text-slate-400 font-normal">km/h</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Gust Potential: <span className="font-bold text-rose-300">{Math.round(activeStorm.maxWindKmh * 1.25)} km/h ({activeStorm.maxWindKnots} kts)</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Movement: <span className="font-bold text-cyan-300">{activeStorm.movementHeading} @ {activeStorm.forwardSpeedKmh} km/h</span>
              </div>
            </div>

            {/* Column 3: Satellite Diagnostics */}
            <div className="space-y-1 sm:col-span-2">
              <div className="text-[10px] font-bold text-cyan-400 uppercase flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Satellite & Synoptic Diagnosis: {activeStorm.basin}</span>
              </div>
              <p className="text-[11px] font-sans text-slate-300 leading-relaxed">
                {activeStorm.synopticOverview}
              </p>
              <div className="text-[10px] text-slate-400 bg-slate-950/70 p-1.5 rounded border border-slate-800 mt-1">
                <span className="text-cyan-300 font-bold">Cloud Signature:</span> {activeStorm.satelliteSignature}
              </div>
            </div>
          </div>

          {/* Interactive Track Timeline Scrubber */}
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 space-y-2 font-mono">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                <Navigation className="w-3 h-3 text-cyan-400" />
                <span>Track Timeline Step Scrubber:</span>
              </span>

              <button
                type="button"
                onClick={() => handleScrubStep(null)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                  state.activeTrackScrubStep === null
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Latest (00Z) Real-Time
              </button>
            </div>

            {/* Scrubber step buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {activeStorm.track.map((pt) => {
                const isSelected = state.activeTrackScrubStep === pt.step;
                return (
                  <button
                    key={pt.step}
                    type="button"
                    onClick={() => handleScrubStep(pt.step)}
                    className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-mono whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 border-cyan-300 text-white shadow-md ring-1 ring-cyan-400/60 font-bold'
                        : pt.isForecast
                        ? 'bg-amber-950/40 border-amber-800/80 text-amber-300 hover:bg-amber-900/50'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{pt.timeLabel}</span>
                    <span className="text-[9px] opacity-75 font-normal">({pt.pressureHpa}hPa)</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
