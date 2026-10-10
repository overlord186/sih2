import React, { useState } from 'react';
import { 
  X, 
  Radio, 
  Activity, 
  Wind, 
  Thermometer, 
  Waves, 
  Users, 
  DollarSign, 
  ShieldAlert, 
  Trophy, 
  Mountain, 
  ChevronRight,
  ChevronDown,
  Gauge,
  Compass
} from 'lucide-react';
import { ClimateScenario, CLIMATE_SCENARIOS } from '../GlobeSandbox3DSimulator';
import { PerspectiveManagerState, GlobePerspectiveMode } from './perspectiveTypes';
import { GlobePerspectiveManager } from './GlobePerspectiveManager';

export interface SlideOverTelemetryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  climateScenario: ClimateScenario;
  derivedMetrics: {
    pressureHpa: number;
    rainMm24: number;
    windKmH: number;
    tempC: number;
    oceanSurgeM: number;
    popAffectedM: number;
    economicLossB: number;
  };
  onOpenGroundSim?: (stationId: string) => void;
  onOpenCrisisModal?: () => void;
  perspectiveState?: PerspectiveManagerState;
  onChangePerspectiveState?: (updater: (prev: PerspectiveManagerState) => PerspectiveManagerState) => void;
  onTriggerPerspectiveChange?: (mode: GlobePerspectiveMode, pitch: number, yaw: number, distance: number, targetCoord?: { lat: number; lon: number }) => void;
}

export const SlideOverTelemetryDrawer: React.FC<SlideOverTelemetryDrawerProps> = ({
  isOpen,
  onClose,
  climateScenario,
  derivedMetrics,
  onOpenGroundSim,
  onOpenCrisisModal,
  perspectiveState,
  onChangePerspectiveState,
  onTriggerPerspectiveChange,
}) => {
  const [showPerspectiveControls, setShowPerspectiveControls] = useState<boolean>(false);
  if (!isOpen) return null;

  const scenarioConfig = CLIMATE_SCENARIOS[climateScenario];

  return (
    <div className="absolute top-0 right-0 h-full w-84 sm:w-96 bg-slate-950/92 backdrop-blur-2xl border-l border-slate-700/80 p-4 shadow-2xl z-50 text-slate-100 font-sans flex flex-col justify-between overflow-y-auto custom-scrollbar animate-in slide-in-from-right duration-300">
      <div className="space-y-4">
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Atmospheric Telemetry & Impact
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Climate Scenario Anomaly Card */}
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1.5 text-[11px] font-mono">
          <div className="text-amber-300 font-bold flex items-center justify-between">
            <span>Scenario Anomaly:</span>
            <span>{scenarioConfig.pressureAnomalyHpa > 0 ? `+${scenarioConfig.pressureAnomalyHpa}` : scenarioConfig.pressureAnomalyHpa} hPa</span>
          </div>
          <div className="text-sky-300 font-bold flex items-center justify-between">
            <span>Global Sea Level Surge:</span>
            <span>+{scenarioConfig.seaLevelRiseM.toFixed(2)} m</span>
          </div>
          <p className="text-[10px] text-slate-400 font-sans pt-1 border-t border-slate-800/80 line-clamp-2">
            {scenarioConfig.description}
          </p>
        </div>

        {/* Real-time Physical Telemetry Readouts */}
        <div className="space-y-2 text-xs font-sans">
          <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <Gauge className="w-3.5 h-3.5 text-sky-400" />
              Surface Pressure:
            </span>
            <span className="font-mono font-bold text-sky-300">{derivedMetrics.pressureHpa} hPa</span>
          </div>

          <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <Waves className="w-3.5 h-3.5 text-blue-400" />
              24h Precip Rate:
            </span>
            <span className="font-mono font-bold text-blue-300">{derivedMetrics.rainMm24} mm</span>
          </div>

          <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <Wind className="w-3.5 h-3.5 text-emerald-400" />
              Wind Velocity:
            </span>
            <span className="font-mono font-bold text-emerald-300">{derivedMetrics.windKmH} km/h</span>
          </div>

          <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <Thermometer className="w-3.5 h-3.5 text-amber-400" />
              Surface Temp:
            </span>
            <span className="font-mono font-bold text-amber-300">{derivedMetrics.tempC}°C</span>
          </div>

          <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <Waves className="w-3.5 h-3.5 text-cyan-400" />
              Storm Surge Height:
            </span>
            <span className="font-mono font-bold text-cyan-300">+{derivedMetrics.oceanSurgeM.toFixed(1)} m</span>
          </div>

          <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              Population Exposed:
            </span>
            <span className="font-mono font-bold text-purple-300">{derivedMetrics.popAffectedM} M</span>
          </div>

          <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
              <DollarSign className="w-3.5 h-3.5 text-rose-400" />
              Est. Economic Risk:
            </span>
            <span className="font-mono font-bold text-rose-300">${derivedMetrics.economicLossB.toFixed(1)} B</span>
          </div>
        </div>

        {/* 3D Ground Station Sim Button */}
        {onOpenGroundSim && (
          <button
            onClick={() => onOpenGroundSim('BOM_SANTACRUZ')}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-700/25 transition-all cursor-pointer active:scale-98"
          >
            <Mountain className="w-4 h-4 text-blue-200" />
            <span>Descend to 3D Ground Simulation</span>
            <ChevronRight className="w-3.5 h-3.5 text-blue-300" />
          </button>
        )}

        {/* Camera & Tracking Perspective Accordion */}
        {perspectiveState && onChangePerspectiveState && onTriggerPerspectiveChange && (
          <div className="bg-slate-900/70 rounded-xl border border-slate-800 overflow-hidden">
            <button
              onClick={() => setShowPerspectiveControls(!showPerspectiveControls)}
              className="w-full p-2.5 flex items-center justify-between text-xs font-semibold text-slate-200 hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-sky-400" />
                <span>Camera & Storm Tracking Presets</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showPerspectiveControls ? 'rotate-180' : ''}`} />
            </button>
            {showPerspectiveControls && (
              <div className="p-2 border-t border-slate-800 bg-slate-950/70">
                <GlobePerspectiveManager
                  state={perspectiveState}
                  onChangeState={onChangePerspectiveState}
                  onTriggerPerspectiveChange={onTriggerPerspectiveChange}
                />
              </div>
            )}
          </div>
        )}

        {/* Planetary Missions Card */}
        <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>PLANETARY MISSIONS</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Level 1/3
            </span>
          </div>
          <div className="text-[11px] text-slate-300 space-y-1">
            <div className="font-semibold text-sky-300">Mission: Mumbai Coastal Deluge Mitigation</div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Deploy atmospheric cloud-seeding triggers to maintain total precipitation below 120 mm/24h while keeping soil moisture under 85%.
            </p>
          </div>
          {onOpenCrisisModal && (
            <button
              onClick={onOpenCrisisModal}
              className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold text-[10px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Launch Crisis Command Scenario</span>
            </button>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 text-center font-mono">
        SAMVARTAKA AI · Planetary Hydro-Meteorology Engine
      </div>
    </div>
  );
};
