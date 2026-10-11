/**
 * LocalStationSimulatorModal.tsx
 * SAMVARTAKA AI — Municipal Catchment & Satellite GIS Command Center (SAM-GIS C4I)
 * 
 * Replaces the 15 FPS cosmetic 3D diorama with an ultra-responsive 120 FPS
 * high-definition satellite GIS command console:
 * - Real Esri World Imagery & CartoDB Dark Matter satellite tiles centered on IMD stations
 * - Real-world critical infrastructure flood choke-points with animated pulse radar beacons
 * - Municipal drainage surcharge calculator (Q_rain vs Q_pipe capacity)
 * - Click-to-fly-to camera tracking between hotspot cards and satellite geography
 * - Real-time Horton soil infiltration hydrograph & NDRF action protocols
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  MapPin, 
  Compass, 
  Wind, 
  CloudRain, 
  Layers, 
  Volume2, 
  VolumeX, 
  Zap, 
  Eye, 
  AlertTriangle, 
  ShieldCheck, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  Droplet,
  Mountain,
  Gauge,
  Thermometer,
  CloudFog,
  Navigation,
  Play,
  Pause,
  Clock,
  Activity,
  Sliders,
  ChevronDown
} from 'lucide-react';
import { StationMetadata } from '../../../types';
import { MET_STATIONS } from '../../../data/monsoonDataset';
import { 
  getStationCatchmentProfile, 
  computeLiveHydrologicalState 
} from '../../../data/stationCatchments';
import { weatherSynth } from '../../../utils/audio';
import { StationSatelliteMap } from './StationSatelliteMap';
import { StationCatchmentDashboard } from './StationCatchmentDashboard';

interface LocalStationSimulatorModalProps {
  isOpen: boolean;
  initialStationId?: string;
  onClose: () => void;
}

// Synoptic weather scenarios for rapid 1-click evaluation
interface WeatherScenario {
  id: string;
  name: string;
  rainRateMmH: number;
  windSpeedKmH: number;
  windDirDeg: number;
  description: string;
  badge: string;
}

const QUICK_WEATHER_SCENARIOS: WeatherScenario[] = [
  {
    id: 'ACTIVE_SURGE',
    name: 'Active Monsoon Jet Surge',
    rainRateMmH: 65,
    windSpeedKmH: 45,
    windDirDeg: 240,
    description: 'Vigorous low-level southwesterly jet pumping maritime vapor',
    badge: 'Torrents • 65 mm/h',
  },
  {
    id: 'CLOUDBURST',
    name: 'Convective Cloudburst Extreme',
    rainRateMmH: 145,
    windSpeedKmH: 70,
    windDirDeg: 260,
    description: 'Mesoscale convective cluster dumping deluge; rapid flash flooding',
    badge: 'Severe • 145 mm/h',
  },
  {
    id: 'MODERATE_MONSOON',
    name: 'Steady Synoptic Inundation',
    rainRateMmH: 28,
    windSpeedKmH: 30,
    windDirDeg: 230,
    description: 'Continuous widespread stratiform rain over saturated urban soil',
    badge: 'Steady • 28 mm/h',
  },
  {
    id: 'BREAK_MONSOON',
    name: 'Break Monsoon Lull',
    rainRateMmH: 0.5,
    windSpeedKmH: 14,
    windDirDeg: 120,
    description: 'Monsoon trough shifts north; clear sky with drainage recovery',
    badge: 'Calm • 0.5 mm/h',
  },
];

export const LocalStationSimulatorModal: React.FC<LocalStationSimulatorModalProps> = ({
  isOpen,
  initialStationId,
  onClose,
}) => {
  // Active IMD Station selection
  const [selectedStationId, setSelectedStationId] = useState<string>(
    initialStationId || 'BOM_SANTACRUZ'
  );

  useEffect(() => {
    if (initialStationId) {
      setSelectedStationId(initialStationId);
    }
  }, [initialStationId]);

  const activeStation = useMemo<StationMetadata>(() => {
    return (
      MET_STATIONS.find((s) => s.id === selectedStationId) ||
      MET_STATIONS.find((s) => s.id === 'BOM_SANTACRUZ') ||
      MET_STATIONS[0]
    );
  }, [selectedStationId]);

  const catchmentProfile = useMemo(() => {
    return getStationCatchmentProfile(activeStation.id);
  }, [activeStation.id]);

  // Environmental Parameters
  const [activeScenarioId, setActiveScenarioId] = useState<string>('ACTIVE_SURGE');
  const [rainRateMmH, setRainRateMmH] = useState<number>(65);
  const [windSpeedKmH, setWindSpeedKmH] = useState<number>(45);
  const [windDirDeg, setWindDirDeg] = useState<number>(240);
  const [surfaceWaterDepthCm, setSurfaceWaterDepthCm] = useState<number>(8.5);
  const [elapsedSimMinutes, setElapsedSimMinutes] = useState<number>(45);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [showScenarioDrawer, setShowScenarioDrawer] = useState<boolean>(false);

  // Audio Engine sync
  useEffect(() => {
    if (!isOpen) {
      weatherSynth.setMuted(true);
      return;
    }

    try {
      weatherSynth.setMuted(isAudioMuted);
      if (!isAudioMuted) {
        weatherSynth.setIntensity(rainRateMmH);
      }
    } catch {
      // Audio autoplay gracefully handled
    }

    return () => {
      weatherSynth.setMuted(true);
    };
  }, [isOpen, isAudioMuted, rainRateMmH]);

  // Dynamic surface water accumulation physics
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setElapsedSimMinutes((prev) => prev + 1);

      setSurfaceWaterDepthCm((prevDepth) => {
        const netInflow = Math.max(0, rainRateMmH - catchmentProfile.gravityDrainageCapacityMmH);
        const accumulationRate = (netInflow / 60) * (catchmentProfile.rationalRunoffCoeffC * 0.15);
        const drainageDrain = rainRateMmH <= catchmentProfile.gravityDrainageCapacityMmH ? 0.08 : 0;
        return Math.max(0, Math.min(60, Number((prevDepth + accumulationRate - drainageDrain).toFixed(2))));
      });
    }, 1500);

    return () => clearInterval(timer);
  }, [isOpen, rainRateMmH, catchmentProfile]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        className={`w-full ${
          isFullscreen ? 'h-full max-w-none rounded-none' : 'max-w-7xl h-[92vh] max-h-[920px] rounded-3xl'
        } bg-slate-950 border border-slate-800 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 font-sans`}
      >
        {/* Supreme Header Bar */}
        <div className="px-4 py-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 shrink-0">
              <Navigation className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-2 truncate">
                  <span>SAMVARTAKA Municipal Catchment Command Center</span>
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                  120 FPS High-Res Satellite GIS
                </span>
              </div>

              {/* Station selector & geo telemetry badge */}
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                <div className="flex items-center gap-1 text-slate-200 font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <select
                    value={activeStation.id}
                    onChange={(e) => {
                      setSelectedStationId(e.target.value);
                      setSelectedHotspotId(null);
                    }}
                    aria-label="Select Meteorological Station"
                    className="bg-slate-800 text-white font-bold text-xs rounded-lg px-2 py-0.5 border border-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  >
                    {MET_STATIONS.map((station) => (
                      <option key={station.id} value={station.id}>
                        {station.name} — {station.state}
                      </option>
                    ))}
                  </select>
                </div>

                <span className="hidden sm:inline-block text-slate-600">•</span>
                <span className="hidden sm:inline-block font-mono text-[11px] text-cyan-300">
                  Elev: {activeStation.elevationM}m • {activeStation.lat.toFixed(2)}°N, {activeStation.lon.toFixed(2)}°E
                </span>
                <span className="hidden sm:inline-block text-slate-600">•</span>
                <span className="hidden md:inline-block font-mono text-[11px] text-slate-300">
                  Drainage Limit: {catchmentProfile.gravityDrainageCapacityMmH} mm/h
                </span>
              </div>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Scenario Drawer Toggle */}
            <button
              type="button"
              onClick={() => setShowScenarioDrawer(!showScenarioDrawer)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                showScenarioDrawer
                  ? 'bg-blue-600 text-white border-blue-400 shadow-xs'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Weather Controls</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showScenarioDrawer ? 'rotate-180' : ''}`} />
            </button>

            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                !isAudioMuted
                  ? 'bg-blue-500/20 text-cyan-400 border-blue-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title={isAudioMuted ? 'Unmute Spatial Audio' : 'Mute Spatial Audio'}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="Close Command Center (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Weather Control Drawer */}
        {showScenarioDrawer && (
          <div className="bg-slate-900 border-b border-slate-800 p-3 sm:px-6 animate-in slide-in-from-top-2 duration-150">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Presets */}
              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                  Synoptic Presets:
                </span>
                {QUICK_WEATHER_SCENARIOS.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => {
                      setActiveScenarioId(sc.id);
                      setRainRateMmH(sc.rainRateMmH);
                      setWindSpeedKmH(sc.windSpeedKmH);
                      setWindDirDeg(sc.windDirDeg);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                      activeScenarioId === sc.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {sc.name} ({sc.rainRateMmH} mm/h)
                  </button>
                ))}
              </div>

              {/* Sliders */}
              <div className="flex items-center gap-6 w-full md:w-auto justify-end font-mono text-xs">
                {/* Rain Slider */}
                <div className="flex items-center gap-2.5">
                  <span className="text-cyan-400 font-bold flex items-center gap-1">
                    <CloudRain className="w-3.5 h-3.5" />
                    Rain:
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="180"
                    step="2"
                    value={rainRateMmH}
                    onChange={(e) => {
                      setRainRateMmH(parseFloat(e.target.value));
                      setActiveScenarioId('CUSTOM');
                    }}
                    className="accent-cyan-400 w-28 sm:w-36 cursor-pointer"
                  />
                  <span className="text-white font-bold w-14 text-right">{rainRateMmH} mm/h</span>
                </div>

                {/* Wind Slider */}
                <div className="flex items-center gap-2.5">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5" />
                    Wind:
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="120"
                    step="2"
                    value={windSpeedKmH}
                    onChange={(e) => {
                      setWindSpeedKmH(parseFloat(e.target.value));
                      setActiveScenarioId('CUSTOM');
                    }}
                    className="accent-emerald-400 w-24 sm:w-28 cursor-pointer"
                  />
                  <span className="text-white font-bold w-14 text-right">{windSpeedKmH} km/h</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Operational Split Console Body */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative">
          {/* Left Pane: Interactive High-Definition Satellite GIS Map (62% Desktop Width) */}
          <div className="w-full lg:w-[62%] h-[420px] lg:h-full relative bg-slate-950 border-b lg:border-b-0 lg:border-r border-slate-800">
            <StationSatelliteMap
              profile={catchmentProfile}
              rainRateMmH={rainRateMmH}
              windSpeedKmH={windSpeedKmH}
              windDirDeg={windDirDeg}
              surfaceWaterDepthCm={surfaceWaterDepthCm}
              selectedHotspotId={selectedHotspotId}
              onSelectHotspot={(id) => setSelectedHotspotId(id || null)}
            />
          </div>

          {/* Right Pane: Operational Telemetry & Surcharge Command Center (38% Desktop Width) */}
          <div className="w-full lg:w-[38%] h-full flex flex-col bg-slate-950 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
              <StationCatchmentDashboard
                catchment={catchmentProfile}
                rainRateMmH={rainRateMmH}
                surfaceWaterDepthCm={surfaceWaterDepthCm}
                elapsedSimMinutes={elapsedSimMinutes}
                windSpeedKmH={windSpeedKmH}
                windDirDeg={windDirDeg}
                selectedHotspotId={selectedHotspotId}
                onSelectHotspot={(id) => setSelectedHotspotId(id)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
