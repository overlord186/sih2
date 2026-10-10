import React, { useState } from 'react';
import { 
  Zap, 
  Flame, 
  Wind, 
  Waves, 
  ThermometerSun, 
  Plane, 
  Satellite, 
  Radio, 
  Mountain, 
  Activity, 
  ChevronDown, 
  Globe, 
  Compass, 
  Eye, 
  Layers, 
  Cloud,
  Crosshair
} from 'lucide-react';
import { DisasterType, ClimateScenario, CLIMATE_SCENARIOS } from '../GlobeSandbox3DSimulator';

export interface FloatingTacticalDeckProps {
  selectedDisaster: DisasterType;
  onSelectDisaster: (d: DisasterType) => void;
  onTriggerBurst: () => void;

  climateScenario: ClimateScenario;
  onSelectClimateScenario: (c: ClimateScenario) => void;

  enableCycloneHunter: boolean;
  onToggleCycloneHunter: () => void;
  onDropSonde: () => void;

  enableDopplerRadar: boolean;
  onToggleDopplerRadar: () => void;

  enableSatellites: boolean;
  onToggleSatellites: () => void;

  enableLandscapeInteraction: boolean;
  onToggleLandscapeInteraction: () => void;

  showClouds: boolean;
  onToggleClouds: () => void;

  showBorders: boolean;
  onToggleBorders: () => void;

  viewMode: 'REALISTIC_PHOTOREAL' | 'NIGHT_SATELLITE' | 'SYNOPTIC_METEOROLOGY';
  onChangeViewMode: (vm: 'REALISTIC_PHOTOREAL' | 'NIGHT_SATELLITE' | 'SYNOPTIC_METEOROLOGY') => void;

  perspectiveMode: 'GLOBAL' | 'REGIONAL' | 'STORM_TRACKING';
  onChangePerspective: (mode: 'GLOBAL' | 'REGIONAL' | 'STORM_TRACKING') => void;

  onOpenTelemetryDrawer: () => void;
  isTelemetryDrawerOpen: boolean;
}

export const FloatingTacticalDeck: React.FC<FloatingTacticalDeckProps> = ({
  selectedDisaster,
  onSelectDisaster,
  onTriggerBurst,
  climateScenario,
  onSelectClimateScenario,
  enableCycloneHunter,
  onToggleCycloneHunter,
  onDropSonde,
  enableDopplerRadar,
  onToggleDopplerRadar,
  enableSatellites,
  onToggleSatellites,
  enableLandscapeInteraction,
  onToggleLandscapeInteraction,
  showClouds,
  onToggleClouds,
  showBorders,
  onToggleBorders,
  viewMode,
  onChangeViewMode,
  perspectiveMode,
  onChangePerspective,
  onOpenTelemetryDrawer,
  isTelemetryDrawerOpen,
}) => {
  const [showDisasterMenu, setShowDisasterMenu] = useState<boolean>(false);
  const [showClimateMenu, setShowClimateMenu] = useState<boolean>(false);
  const [showLayersMenu, setShowLayersMenu] = useState<boolean>(false);

  const DISASTERS: Array<{ id: DisasterType; label: string; icon: any; color: string }> = [
    { id: 'CLOUDBURST', label: 'Cloudburst Deluge', icon: Waves, color: 'text-sky-400' },
    { id: 'SUPER_TYPHOON', label: 'Category 5 Typhoon', icon: Wind, color: 'text-rose-400' },
    { id: 'HEATWAVE_DROUGHT', label: 'Heatwave & Drought', icon: Flame, color: 'text-amber-400' },
    { id: 'VOLCANIC_ASH', label: 'Volcanic Plume Column', icon: Flame, color: 'text-orange-500' },
    { id: 'TSUNAMI_SURGE', label: 'Tsunami Storm Surge', icon: Waves, color: 'text-cyan-400' },
    { id: 'POLAR_VORTEX', label: 'Polar Vortex Intrusion', icon: Wind, color: 'text-indigo-300' },
  ];

  const activeDisasterObj = DISASTERS.find((d) => d.id === selectedDisaster) || DISASTERS[0];
  const activeClimateObj = CLIMATE_SCENARIOS[climateScenario];

  return (
    <div className="absolute top-4 right-4 z-40 flex items-center gap-2 flex-wrap max-w-full justify-end select-none">
      {/* 1. Perspective Switcher */}
      <div className="flex items-center gap-1 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-2xl text-[11px] font-mono">
        <button
          onClick={() => onChangePerspective('GLOBAL')}
          className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
            perspectiveMode === 'GLOBAL'
              ? 'bg-blue-600/40 text-blue-200 border border-blue-500/60 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Global Perspective"
        >
          <span>🌐</span>
          <span className="hidden sm:inline">Global</span>
        </button>
        <button
          onClick={() => onChangePerspective('REGIONAL')}
          className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
            perspectiveMode === 'REGIONAL'
              ? 'bg-sky-600/40 text-sky-200 border border-sky-500/60 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Regional Monsoon Focus"
        >
          <span>🗺️</span>
          <span className="hidden sm:inline">Regional</span>
        </button>
        <button
          onClick={() => onChangePerspective('STORM_TRACKING')}
          className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
            perspectiveMode === 'STORM_TRACKING'
              ? 'bg-rose-600/40 text-rose-200 border border-rose-500/60 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Active Cyclonic Storm Track"
        >
          <span>🌀</span>
          <span className="hidden sm:inline">Storm</span>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
        </button>
      </div>

      {/* 2. Disaster Scenario Trigger Capsule */}
      <div className="relative">
        <div className="flex items-center bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 shadow-2xl text-[11px] font-mono">
          <button
            onClick={() => {
              setShowDisasterMenu(!showDisasterMenu);
              setShowClimateMenu(false);
              setShowLayersMenu(false);
            }}
            className="px-2.5 py-1 rounded-lg text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Zap className={`w-3.5 h-3.5 ${activeDisasterObj.color}`} />
            <span className="font-semibold max-w-[120px] truncate">{activeDisasterObj.label}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
          <button
            onClick={onTriggerBurst}
            className="px-2 py-1 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-[10px] shadow transition-all cursor-pointer active:scale-95 flex items-center gap-1"
            title="Spawn Extreme Meteorological Surge Burst"
          >
            <Zap className="w-3 h-3 fill-white" />
            <span>Burst</span>
          </button>
        </div>

        {/* Disaster Dropdown Menu */}
        {showDisasterMenu && (
          <div className="absolute right-0 mt-1.5 w-56 bg-slate-950/95 backdrop-blur-xl border border-slate-700/90 rounded-xl shadow-2xl p-1.5 space-y-1 z-50 text-[11px] font-sans">
            <div className="px-2 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider border-b border-slate-800">
              Select Disaster Event
            </div>
            {DISASTERS.map((dis) => {
              const isSelected = selectedDisaster === dis.id;
              const IconComp = dis.icon;
              return (
                <button
                  key={dis.id}
                  onClick={() => {
                    onSelectDisaster(dis.id);
                    setShowDisasterMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 text-sky-300 font-bold border border-slate-700'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <IconComp className={`w-3.5 h-3.5 ${dis.color}`} />
                  <span>{dis.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Climate Scenario Capsule */}
      <div className="relative">
        <button
          onClick={() => {
            setShowClimateMenu(!showClimateMenu);
            setShowDisasterMenu(false);
            setShowLayersMenu(false);
          }}
          className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-xl px-2.5 py-2 shadow-2xl text-[11px] font-mono text-slate-200 hover:text-white transition-colors cursor-pointer"
        >
          <ThermometerSun className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">{activeClimateObj.label}</span>
          <span className="md:hidden">IPCC</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {/* Climate Dropdown Menu */}
        {showClimateMenu && (
          <div className="absolute right-0 mt-1.5 w-64 bg-slate-950/95 backdrop-blur-xl border border-slate-700/90 rounded-xl shadow-2xl p-1.5 space-y-1 z-50 text-[11px] font-sans">
            <div className="px-2 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider border-b border-slate-800">
              IPCC CMIP6 Climate Scenarios
            </div>
            {(Object.keys(CLIMATE_SCENARIOS) as ClimateScenario[]).map((key) => {
              const sc = CLIMATE_SCENARIOS[key];
              const isSelected = climateScenario === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    onSelectClimateScenario(key);
                    setShowClimateMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 text-amber-300 font-bold border border-slate-700'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{sc.label}</span>
                    <span className="font-mono text-[10px] text-slate-400">+{sc.tempDeltaC}°C</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 line-clamp-1">{sc.description}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Multi-Layer Toggles Dropdown Capsule */}
      <div className="relative">
        <button
          onClick={() => {
            setShowLayersMenu(!showLayersMenu);
            setShowDisasterMenu(false);
            setShowClimateMenu(false);
          }}
          className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-xl px-2.5 py-2 shadow-2xl text-[11px] font-mono text-slate-200 hover:text-white transition-colors cursor-pointer"
          title="Toggle 3D Physical Layers & Missions"
        >
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden md:inline">Layers</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {/* Layers Menu */}
        {showLayersMenu && (
          <div className="absolute right-0 mt-1.5 w-60 bg-slate-950/95 backdrop-blur-xl border border-slate-700/90 rounded-xl shadow-2xl p-2 space-y-2 z-50 text-[11px] font-sans">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-800">
              Active Planetary Layers
            </div>

            {/* Earth View Mode */}
            <div className="space-y-1">
              <span className="text-slate-400 text-[10px]">Earth Biome Texture:</span>
              <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
                <button
                  onClick={() => onChangeViewMode('REALISTIC_PHOTOREAL')}
                  className={`py-1 rounded text-center transition-all ${
                    viewMode === 'REALISTIC_PHOTOREAL' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Photoreal
                </button>
                <button
                  onClick={() => onChangeViewMode('NIGHT_SATELLITE')}
                  className={`py-1 rounded text-center transition-all ${
                    viewMode === 'NIGHT_SATELLITE' ? 'bg-amber-600 text-white font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Night Lights
                </button>
                <button
                  onClick={() => onChangeViewMode('SYNOPTIC_METEOROLOGY')}
                  className={`py-1 rounded text-center transition-all ${
                    viewMode === 'SYNOPTIC_METEOROLOGY' ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  Synoptic
                </button>
              </div>
            </div>

            {/* Interactive Physical Layers */}
            <div className="pt-1.5 border-t border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5 text-amber-400" />
                  <span>Hurricane Hunter:</span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={onToggleCycloneHunter}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      enableCycloneHunter ? 'bg-amber-950 text-amber-300 border border-amber-600' : 'bg-slate-900 text-slate-500'
                    }`}
                  >
                    {enableCycloneHunter ? 'ON' : 'OFF'}
                  </button>
                  {enableCycloneHunter && (
                    <button
                      onClick={onDropSonde}
                      className="px-1.5 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 text-[9px] font-bold"
                      title="Release GPS Dropsonde Sounding"
                    >
                      Drop
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-rose-400" />
                  <span>Doppler Radar Network:</span>
                </span>
                <button
                  onClick={onToggleDopplerRadar}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    enableDopplerRadar ? 'bg-rose-950 text-rose-300 border border-rose-600' : 'bg-slate-900 text-slate-500'
                  }`}
                >
                  {enableDopplerRadar ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Satellite className="w-3.5 h-3.5 text-sky-400" />
                  <span>Satellites & Swaths:</span>
                </span>
                <button
                  onClick={onToggleSatellites}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    enableSatellites ? 'bg-sky-950 text-sky-300 border border-sky-600' : 'bg-slate-900 text-slate-500'
                  }`}
                >
                  {enableSatellites ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Mountain className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mountain Orography:</span>
                </span>
                <button
                  onClick={onToggleLandscapeInteraction}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    enableLandscapeInteraction ? 'bg-emerald-950 text-emerald-300 border border-emerald-600' : 'bg-slate-900 text-slate-500'
                  }`}
                >
                  {enableLandscapeInteraction ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-blue-300" />
                  <span>Cloud Systems:</span>
                </span>
                <button
                  onClick={onToggleClouds}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    showClouds ? 'bg-blue-950 text-blue-300 border border-blue-600' : 'bg-slate-900 text-slate-500'
                  }`}
                >
                  {showClouds ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Vector Borders:</span>
                </span>
                <button
                  onClick={onToggleBorders}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    showBorders ? 'bg-indigo-950 text-indigo-300 border border-indigo-600' : 'bg-slate-900 text-slate-500'
                  }`}
                >
                  {showBorders ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Telemetry Slide-Over Trigger Button */}
      <button
        onClick={onOpenTelemetryDrawer}
        className={`px-3 py-2 rounded-xl backdrop-blur-md border text-[11px] font-mono font-bold flex items-center gap-1.5 shadow-2xl transition-all cursor-pointer ${
          isTelemetryDrawerOpen
            ? 'bg-emerald-600/40 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400/50'
            : 'bg-slate-950/85 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-900'
        }`}
        title="Open Real-time Telemetry & Impact Drawer"
      >
        <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        <span>Telemetry</span>
      </button>
    </div>
  );
};
