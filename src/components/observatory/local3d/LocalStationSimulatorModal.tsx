/**
 * LocalStationSimulatorModal.tsx
 * SAMVARTAKA AI — Municipal Catchment & Satellite GIS Command Center (SAM-GIS C4I)
 * 
 * High-End Defense/Municipal Command Cockpit:
 * - 3 View Modes: Split Command (52/48), Full-Screen Satellite GIS (100%), Deep Hydrology SCADA (100%)
 * - 100% Free, Unwatermarked Esri Dark Gray & True-Color Satellite Imagery (No API keys)
 * - Click-to-Fly-To Camera Tracking between Hotspot Cards and Satellite Imagery
 * - Sleek Cybernetic Aero-HUD with Zero White Scrollbars and Clean Layout
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
  ChevronDown,
  Columns,
  Map as MapIcon,
  BarChart3,
  FileText
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
import { SitRepModal } from './SitRepModal';

interface LocalStationSimulatorModalProps {
  isOpen: boolean;
  initialStationId?: string;
  onClose: () => void;
}

type ViewMode = 'SPLIT' | 'MAP_ONLY' | 'TELEMETRY_ONLY';

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

// Multi-horizon forecast scrubber intervals
const TIME_HORIZONS = [
  { minutes: 0, label: 'Now (T+0)', desc: 'Real-time IMD AWS Telemetry' },
  { minutes: 15, label: '+15m', desc: 'Nowcast Infiltration Window' },
  { minutes: 30, label: '+30m', desc: 'Short-range Surcharge Peak' },
  { minutes: 60, label: '+1h', desc: 'Hourly Catchment Balance' },
  { minutes: 120, label: '+2h', desc: 'Extended Runoff Horizon' },
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

  // View mode switcher: Split Command, Map-Only, or Telemetry-Only
  const [viewMode, setViewMode] = useState<ViewMode>('SPLIT');

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

  // Multi-Horizon Temporal Scrubber & SitRep State
  const [forecastHorizonMinutes, setForecastHorizonMinutes] = useState<number>(0);
  const [isSitRepOpen, setIsSitRepOpen] = useState<boolean>(false);

  const effectiveElapsedSimMinutes = elapsedSimMinutes + forecastHorizonMinutes;

  const effectiveWaterDepthCm = useMemo(() => {
    if (forecastHorizonMinutes === 0) return surfaceWaterDepthCm;
    const netInflow = Math.max(0, rainRateMmH - catchmentProfile.gravityDrainageCapacityMmH);
    const projectedAccumulation = (netInflow / 60) * forecastHorizonMinutes * (catchmentProfile.rationalRunoffCoeffC * 0.18);
    const projectedDrain = rainRateMmH <= catchmentProfile.gravityDrainageCapacityMmH ? (forecastHorizonMinutes * 0.08) : 0;
    return Math.max(0, Math.min(60, Number((surfaceWaterDepthCm + projectedAccumulation - projectedDrain).toFixed(2))));
  }, [surfaceWaterDepthCm, forecastHorizonMinutes, rainRateMmH, catchmentProfile]);

  const triggerThunderIfSevere = (newRate: number) => {
    if (!isAudioMuted && newRate > 80) {
      try {
        weatherSynth.playLightningThunderCrack();
      } catch {
        // Audio handled
      }
    }
  };

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
          isFullscreen ? 'h-full max-w-none rounded-none' : 'max-w-7xl h-[94vh] max-h-[960px] rounded-3xl'
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
            {/* View Mode Segmented Switcher */}
            <div className="hidden sm:flex items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('SPLIT')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'SPLIT'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Split Command View (Map + Dashboard)"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Split</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('MAP_ONLY')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'MAP_ONLY'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Full Satellite Map View"
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Map</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('TELEMETRY_ONLY')}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'TELEMETRY_ONLY'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Full Hydrological Dashboard View"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Telemetry</span>
              </button>
            </div>

            {/* Export SitRep Executive Report Button */}
            <button
              type="button"
              onClick={() => setIsSitRepOpen(true)}
              className="px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 bg-gradient-to-r from-blue-700/70 to-cyan-700/70 hover:from-blue-600 hover:to-cyan-600 text-white border-blue-400/40 shadow-xs cursor-pointer"
              title="Generate Official Disaster Situation Report (SitRep)"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-300" />
              <span className="hidden sm:inline">Export SitRep</span>
            </button>

            {/* Weather Controls Toggle */}
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
              <span className="hidden md:inline">Weather Controls</span>
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

        {/* Clean Weather Control Drawer (Zero White Scrollbars) */}
        {showScenarioDrawer && (
          <div className="bg-slate-900 border-b border-slate-800 p-3 sm:px-6 animate-in slide-in-from-top-2 duration-150">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Presets - Wrap cleanly, zero scrollbars */}
              <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
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
                      triggerThunderIfSevere(sc.rainRateMmH);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
                <div className="flex items-center gap-2">
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
                      const val = parseFloat(e.target.value);
                      setRainRateMmH(val);
                      setActiveScenarioId('CUSTOM');
                      if (val > 80 && rainRateMmH <= 80) {
                        triggerThunderIfSevere(val);
                      }
                    }}
                    className="accent-cyan-400 w-28 cursor-pointer"
                  />
                  <span className="text-white font-bold w-12 text-right">{rainRateMmH} mm/h</span>
                </div>

                {/* Wind Slider */}
                <div className="flex items-center gap-2">
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
                    className="accent-emerald-400 w-24 cursor-pointer"
                  />
                  <span className="text-white font-bold w-12 text-right">{windSpeedKmH} km/h</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Operational Body */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative">
          {/* Left Pane: Interactive High-Definition Satellite GIS Map */}
          {(viewMode === 'SPLIT' || viewMode === 'MAP_ONLY') && (
            <div 
              className={`${
                viewMode === 'MAP_ONLY' ? 'w-full h-full' : 'w-full lg:w-[52%] h-[440px] lg:h-full'
              } relative bg-slate-950 border-b lg:border-b-0 lg:border-r border-slate-800 transition-all`}
            >
              <StationSatelliteMap
                profile={catchmentProfile}
                rainRateMmH={rainRateMmH}
                windSpeedKmH={windSpeedKmH}
                windDirDeg={windDirDeg}
                surfaceWaterDepthCm={effectiveWaterDepthCm}
                selectedHotspotId={selectedHotspotId}
                onSelectHotspot={(id) => setSelectedHotspotId(id || null)}
              />

              {/* Floating High-Tech Temporal Forecast Scrubber Bar */}
              <div className="absolute bottom-3 left-3 right-3 z-[1000] p-2 sm:p-2.5 bg-slate-950/85 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-2 select-none pointer-events-auto">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-blue-600/30 text-cyan-400 border border-blue-500/40 shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-[10px] font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5 flex-wrap">
                      <span>Forecast Horizon</span>
                      {forecastHorizonMinutes > 0 ? (
                        <span className="px-1.5 py-0.2 rounded bg-cyan-900/70 text-cyan-300 text-[9px] border border-cyan-700">
                          +{forecastHorizonMinutes}m Forward Surcharge
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-900/60 text-emerald-300 text-[9px] border border-emerald-700">
                          Live T+0 Telemetry
                        </span>
                      )}
                    </div>
                    <div className="text-[10.5px] font-mono text-cyan-400 font-bold truncate">
                      {TIME_HORIZONS.find((h) => h.minutes === forecastHorizonMinutes)?.desc}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar shrink-0">
                  {TIME_HORIZONS.map((h) => (
                    <button
                      key={h.minutes}
                      type="button"
                      onClick={() => setForecastHorizonMinutes(h.minutes)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                        forecastHorizonMinutes === h.minutes
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50 scale-102'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Right Pane: Operational Telemetry & Surcharge Command Center */}
          {(viewMode === 'SPLIT' || viewMode === 'TELEMETRY_ONLY') && (
            <div 
              className={`${
                viewMode === 'TELEMETRY_ONLY' ? 'w-full h-full' : 'w-full lg:w-[48%] h-full'
              } flex flex-col bg-slate-950 min-h-0 overflow-hidden transition-all`}
            >
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-4 [scrollbar-width:thin] [scrollbar-color:rgba(51,65,85,0.5)_transparent]">
                <StationCatchmentDashboard
                  catchment={catchmentProfile}
                  rainRateMmH={rainRateMmH}
                  surfaceWaterDepthCm={effectiveWaterDepthCm}
                  elapsedSimMinutes={effectiveElapsedSimMinutes}
                  windSpeedKmH={windSpeedKmH}
                  windDirDeg={windDirDeg}
                  selectedHotspotId={selectedHotspotId}
                  onSelectHotspot={(id) => setSelectedHotspotId(id)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Official Municipal Situation Report (SitRep) Modal */}
      <SitRepModal
        isOpen={isSitRepOpen}
        onClose={() => setIsSitRepOpen(false)}
        station={activeStation}
        catchment={catchmentProfile}
        rainRateMmH={rainRateMmH}
        surfaceWaterDepthCm={effectiveWaterDepthCm}
        elapsedSimMinutes={effectiveElapsedSimMinutes}
        forecastHorizonMinutes={forecastHorizonMinutes}
      />
    </div>
  );
};
