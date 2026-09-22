import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
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
  Camera, 
  Sparkles, 
  Droplet,
  Mountain,
  Gauge,
  Thermometer,
  CloudFog,
  ArrowDownCircle,
  HelpCircle,
  Play,
  Pause,
  Clock
} from 'lucide-react';
import { StationMetadata } from '../../../types';
import { MET_STATIONS } from '../../../data/monsoonDataset';
import { 
  getStationBiome, 
  WEATHER_SCENARIO_PRESETS, 
  LocalBiomeProfile, 
  WeatherScenarioPreset 
} from '../../../data/localBiomeTerrains';
import { LocalStationScene3D } from './LocalStationScene3D';
import { weatherSynth } from '../../../utils/audio';

interface LocalStationSimulatorModalProps {
  initialStationId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const LocalStationSimulatorModal: React.FC<LocalStationSimulatorModalProps> = ({
  initialStationId = 'BOM_SANTACRUZ',
  isOpen,
  onClose,
}) => {
  // Active selected station
  const [selectedStationId, setSelectedStationId] = useState<string>(initialStationId);

  // Sync initial station if prop changes
  useEffect(() => {
    if (initialStationId) {
      setSelectedStationId(initialStationId);
    }
  }, [initialStationId]);

  const activeStation = useMemo(
    () => MET_STATIONS.find((s) => s.id === selectedStationId) || MET_STATIONS[0],
    [selectedStationId]
  );

  const activeBiome: LocalBiomeProfile = useMemo(
    () => getStationBiome(activeStation),
    [activeStation]
  );

  // Simulation interactive parameters
  const [rainRateMmH, setRainRateMmH] = useState<number>(65);
  const [windSpeedKmH, setWindSpeedKmH] = useState<number>(45);
  const [windDirDeg, setWindDirDeg] = useState<number>(240); // WSW
  const [cloudBaseM, setCloudBaseM] = useState<number>(350);
  const [tempC, setTempC] = useState<number>(26.5);
  const [rhPct, setRhPct] = useState<number>(95);

  // Hydrological simulation state
  const [surfaceWaterDepthCm, setSurfaceWaterDepthCm] = useState<number>(3.2);
  const [elapsedSimMinutes, setElapsedSimMinutes] = useState<number>(45);
  const [isSimPaused, setIsSimPaused] = useState<boolean>(false);

  // Visual & Camera state
  const [cameraPreset, setCameraPreset] = useState<'TOP_DOWN' | 'OBSERVER' | 'AERIAL' | 'TOWER' | 'RUNOFF'>('TOP_DOWN');
  const [isLightningActive, setIsLightningActive] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('ACTIVE_SOMALI_SURGE');

  // New Simulation Controls State
  const [showTopoHeatmap, setShowTopoHeatmap] = useState<boolean>(false);
  const [rainDensityMultiplier, setRainDensityMultiplier] = useState<number>(1.0);
  const [timeOfDayHours, setTimeOfDayHours] = useState<number>(12); // Noon
  const [isAutoOrbit, setIsAutoOrbit] = useState<boolean>(true); // For cinematic mode

  // Search filter for station picker in modal
  const [stationSearchText, setStationSearchText] = useState<string>('');
  const [isStationListOpen, setIsStationListOpen] = useState<boolean>(false);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Audio synths sync
  useEffect(() => {
    if (!isOpen) {
      weatherSynth.playRainSound(0);
      return;
    }
    if (!isAudioMuted) {
      weatherSynth.init();
      weatherSynth.setMuted(false);
      weatherSynth.playRainSound(rainRateMmH);
    } else {
      weatherSynth.playRainSound(0);
    }
  }, [isOpen, isAudioMuted, rainRateMmH]);

  // Real-time hydrological accumulation ticker
  useEffect(() => {
    if (!isOpen || isSimPaused) return;

    const interval = setInterval(() => {
      setElapsedSimMinutes((prev) => prev + 1);

      // Horton infiltration: f(t) = f_c + (f_0 - f_c) * exp(-k * t_hr)
      const tHr = elapsedSimMinutes / 60;
      const f0 = activeBiome.initialInfiltrationRateMmH;
      const fc = activeBiome.steadyInfiltrationRateMmH;
      const k = activeBiome.decayConstantK;
      const currentInfiltrationCapacity = fc + (f0 - fc) * Math.exp(-k * tHr);

      // Net surface accumulation: Rain - Infiltration - Storm Drainage
      const excessRate = Math.max(0, rainRateMmH - currentInfiltrationCapacity - activeBiome.drainageCapacityMmH);
      const waterDeltaCm = (excessRate / 60) * 0.1; // cm per minute

      // Natural infiltration/drying if rain rate drops below infiltration
      const dryDeltaCm = (rainRateMmH < currentInfiltrationCapacity ? 0.08 : 0);

      setSurfaceWaterDepthCm((prev) => Math.max(0, Math.min(65, prev + waterDeltaCm - dryDeltaCm)));
    }, 1200);

    return () => clearInterval(interval);
  }, [isOpen, isSimPaused, elapsedSimMinutes, rainRateMmH, activeBiome]);

  // Trigger manual lightning strike
  const triggerLightningStrike = () => {
    setIsLightningActive(true);
    if (!isAudioMuted) {
      weatherSynth.playLightningThunderCrack();
    }
    setTimeout(() => {
      setIsLightningActive(false);
    }, 280);
  };

  // Load a synoptic scenario preset
  const applyScenarioPreset = (preset: WeatherScenarioPreset) => {
    setActiveScenarioId(preset.id);
    setRainRateMmH(preset.rainRateMmH);
    setWindSpeedKmH(preset.windSpeedKmH);
    setWindDirDeg(preset.windDirDeg);
    setCloudBaseM(preset.cloudBaseM);
    setTempC(preset.tempC);
    setRhPct(preset.rhPct);

    // Initial water estimate based on scenario
    if (preset.id === 'CLOUDBURST_DELUGE') {
      setSurfaceWaterDepthCm(18.5);
    } else if (preset.id === 'MONSOON_DEPRESSION_SQUALL') {
      setSurfaceWaterDepthCm(11.2);
    } else if (preset.id === 'BREAK_MONSOON_FOHN' || preset.id === 'CALM_SUNNY_BREAK') {
      setSurfaceWaterDepthCm(0.2);
    } else {
      setSurfaceWaterDepthCm(4.5);
    }
  };

  // Optical Horizontal Visibility (Atlas-Ulbrich equation)
  const opticalVisibilityKm = useMemo(() => {
    if (rainRateMmH <= 0.1) return 25.0;
    // V = 12 * R^(-0.68)
    const v = 12 * Math.pow(Math.max(0.5, rainRateMmH), -0.68);
    return Math.max(0.15, Math.min(25.0, v));
  }, [rainRateMmH]);

  // Dew point temperature calculation
  const dewPointC = useMemo(() => {
    return tempC - (100 - rhPct) / 5;
  }, [tempC, rhPct]);

  // Hazard Alert Level
  const hazardAssessment = useMemo(() => {
    const isLandslideProne = activeBiome.criticalLandslideThresholdMmH > 0 && activeBiome.slopeGradientPct > 20;
    const isLandslideRisk = isLandslideProne && rainRateMmH >= activeBiome.criticalLandslideThresholdMmH;
    const isSevereWaterlogging = surfaceWaterDepthCm >= activeBiome.criticalWaterloggingDepthCm;
    const isCyclonicGale = windSpeedKmH >= 65;

    if (isLandslideRisk || surfaceWaterDepthCm >= activeBiome.criticalWaterloggingDepthCm * 1.5 || rainRateMmH > 110) {
      return {
        level: 'RED_DISASTER',
        title: 'DISASTER RED ALERT',
        textColor: 'text-red-400',
        bgColor: 'bg-red-950/80 border-red-600',
        badgeBg: 'bg-red-600 text-white',
        status: isLandslideRisk ? 'SLOPE LIQUEFACTION & DEBRIS FLOW TRIGGERED' : 'CRITICAL URBAN INUNDATION (>20 CM)',
        icon: AlertTriangle,
      };
    }
    if (isSevereWaterlogging || rainRateMmH >= 50 || isCyclonicGale) {
      return {
        level: 'ORANGE_SEVERE',
        title: 'SEVERE WEATHER WARNING',
        textColor: 'text-amber-400',
        bgColor: 'bg-amber-950/80 border-amber-600',
        badgeBg: 'bg-amber-600 text-white',
        status: 'DRAINAGE SURCHARGE & LOCAL PONDING',
        icon: AlertTriangle,
      };
    }
    if (rainRateMmH >= 15 || surfaceWaterDepthCm > 2) {
      return {
        level: 'YELLOW_ADVISORY',
        title: 'METEOROLOGICAL ADVISORY',
        textColor: 'text-yellow-300',
        bgColor: 'bg-yellow-950/60 border-yellow-700',
        badgeBg: 'bg-yellow-500 text-slate-950',
        status: 'SURFACE RUNOFF IN PROGRESS',
        icon: CloudRain,
      };
    }
    return {
      level: 'GREEN_NORMAL',
      title: 'NORMAL CONDITIONS',
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-950/60 border-emerald-700',
      badgeBg: 'bg-emerald-600 text-white',
      status: 'INFILTRATION BALANCED / NO WATERLOGGING',
      icon: ShieldCheck,
    };
  }, [activeBiome, rainRateMmH, surfaceWaterDepthCm, windSpeedKmH]);

  // Dynamic Physical Narrative explaining *what actually happens*
  const physicalExplanationText = useMemo(() => {
    const stName = activeStation.name;
    const biome = activeBiome;

    if (rainRateMmH <= 1) {
      return `At ${stName} (${activeStation.elevationM}m), dry air and an elevated condensation level (${cloudBaseM}m) maintain high horizontal visibility (${opticalVisibilityKm.toFixed(1)} km). Any remaining surface moisture drains easily through the ${biome.soilType} substrate.`;
    }

    if (biome.id === 'COASTAL_METROPOLIS') {
      if (rainRateMmH > biome.drainageCapacityMmH) {
        return `At ${stName}, the rain rate of ${rainRateMmH} mm/h exceeds the municipal stormwater gravity drainage capacity (${biome.drainageCapacityMmH} mm/h) by +${rainRateMmH - biome.drainageCapacityMmH} mm/h. Because the coastal shelf has a near-zero gradient (${biome.slopeGradientPct}%), water cannot discharge into the sea, causing rapid street ponding to reach ${surfaceWaterDepthCm.toFixed(1)} cm. Low cloud base (${cloudBaseM}m) traps ambient humidity at ${rhPct}%.`;
      }
      return `Rainfall (${rainRateMmH} mm/h) is currently within the gravity outfall capacity (${biome.drainageCapacityMmH} mm/h). Minor localized gutter pooling (${surfaceWaterDepthCm.toFixed(1)} cm), but arterial roads remain clear.`;
    }

    if (biome.id === 'OROGRAPHIC_CREST') {
      return `Direct forced orographic ascent against the Western Ghats escarpment (${activeStation.elevationM}m elevation, ${biome.slopeGradientPct}% slope) forces rapid adiabatic expansion. Moisture condensates into dense nimbostratus clouds at ${cloudBaseM}m ceiling. Torrents of water (${rainRateMmH} mm/h) surge over basalt terraces into mountain ravines at high velocity. Saturated ${biome.soilType} approaches plastic limit.`;
    }

    if (biome.id === 'HIMALAYAN_VALLEY') {
      return `In the steep Himalayan gorge terrain of ${stName} (${activeStation.elevationM}m, slope ${biome.slopeGradientPct}%), heavy downpours (${rainRateMmH} mm/h) generate intense kinetic runoff over mountain colluvium. Channeling winds (${windSpeedKmH} km/h) drive rain sheets through the valley, reducing visibility to ${opticalVisibilityKm.toFixed(1)} km and rapidly swelling mountain torrents.`;
    }

    if (biome.id === 'HIGHLAND_CLOUD_FUNNEL') {
      return `At ${stName}, humid Bay of Bengal westerlies are trapped in deep limestone gorges. Condensation occurs almost at ground level (cloud base ${cloudBaseM}m), shrouding the plateau in saturated mountain mist. Deluges of ${rainRateMmH} mm/h plunge thousands of meters down vertical cliffs into the plains below.`;
    }

    if (biome.id === 'RAIN_SHADOW_PLATEAU') {
      return `Situated on the leeward Deccan plateau (${activeStation.elevationM}m), descending föhn westerlies undergo adiabatic heating. While rain falls at ${rainRateMmH} mm/h, the high cloud base (${cloudBaseM}m) and ${biome.soilType} absorb the moisture initially, limiting waterlogging to ${surfaceWaterDepthCm.toFixed(1)} cm in roadside gullies.`;
    }

    return `Across the alluvial plains of ${stName} (${activeStation.elevationM}m), rainfall of ${rainRateMmH} mm/h produces widespread sheet runoff over flat terrain. Infiltration rate of ${biome.soilType} has declined to ${activeBiome.steadyInfiltrationRateMmH} mm/h, accumulating ${surfaceWaterDepthCm.toFixed(1)} cm in surface depressions.`;
  }, [activeStation, activeBiome, rainRateMmH, cloudBaseM, opticalVisibilityKm, surfaceWaterDepthCm, rhPct, windSpeedKmH]);

  // Filtered station search for quick switching
  const filteredStations = useMemo(() => {
    const q = stationSearchText.toLowerCase().trim();
    if (!q) return MET_STATIONS;
    return MET_STATIONS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.subdivision.toLowerCase().includes(q) ||
        s.state.toLowerCase().includes(q)
    );
  }, [stationSearchText]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="local-3d-station-simulator-modal"
        className={`relative w-full ${
          isFullscreen ? 'h-full max-w-none rounded-none' : 'max-w-7xl max-h-[94vh] rounded-2xl'
        } bg-slate-950 border border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-100 transition-all`}
      >
        {/* Top Header Bar */}
        <div className="p-3 sm:px-5 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 shrink-0">
              <Mountain className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5 truncate">
                  <span>3D Ground Station Simulator:</span>
                  <span className="text-blue-400 font-extrabold underline decoration-blue-500/60">{activeStation.name}</span>
                </h2>
                
                {/* Biome Tag */}
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap">
                  {activeBiome.name}
                </span>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 hidden md:inline-block">
                  Elev: {activeStation.elevationM}m • {activeStation.lat.toFixed(2)}°N, {activeStation.lon.toFixed(2)}°E
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {activeBiome.subtitle} • Real-time mesoscale physics & soil-atmospheric coupling
              </p>
            </div>
          </div>

          {/* Controls Bar: Station Selector, Sound, Fullscreen, Close */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick Station Switcher Dropdown Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsStationListOpen((prev) => !prev)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Switch to another IMD station"
              >
                <Compass className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Change Station</span>
                <span className="text-slate-400 text-[10px]">▾</span>
              </button>

              {/* Station Selection Popover */}
              {isStationListOpen && (
                <div className="absolute right-0 top-full mt-1 w-72 max-h-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 flex flex-col space-y-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="px-1 pt-1 pb-1.5 border-b border-slate-800">
                    <input
                      type="text"
                      value={stationSearchText}
                      onChange={(e) => setStationSearchText(e.target.value)}
                      placeholder="Search station..."
                      className="w-full px-2.5 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-white focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto max-h-60 space-y-1 pr-1">
                    {filteredStations.map((stn, idx) => (
                      <button
                        key={stn.id}
                        onClick={() => {
                          setSelectedStationId(stn.id);
                          setIsStationListOpen(false);
                          setStationSearchText('');
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          selectedStationId === stn.id
                            ? 'bg-blue-600 text-white font-bold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{stn.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 ml-2 shrink-0">
                          #{String(idx + 1).padStart(2, '0')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Audio Toggle */}
            <button
              onClick={() => {
                const nextMuted = !isAudioMuted;
                setIsAudioMuted(nextMuted);
                if (!nextMuted) {
                  weatherSynth.init();
                  weatherSynth.setMuted(false);
                  weatherSynth.playRainSound(rainRateMmH);
                } else {
                  weatherSynth.playRainSound(0);
                }
              }}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border ${
                !isAudioMuted
                  ? 'bg-blue-600/30 text-blue-300 border-blue-500'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title={isAudioMuted ? 'Unmute environmental weather audio' : 'Mute audio'}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
            </button>

            {/* Lightning Trigger Button */}
            <button
              onClick={triggerLightningStrike}
              className="p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Trigger Lightning & Thunder Bolt"
            >
              <Zap className="w-4 h-4 text-amber-400" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors cursor-pointer hidden md:flex"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Modal */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="Close 3D Simulator (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Workspace Body */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative">
          {/* 3D WebGL Canvas Viewport */}
          <div className="flex-1 relative bg-slate-950 flex flex-col min-h-[380px] lg:min-h-0">
            {/* 3D Canvas */}
            <div className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
              <Canvas
                shadows
                camera={{ position: [0, 2, 12], fov: 50 }}
                gl={{ antialias: true, powerPreference: 'high-performance' }}
              >
                <LocalStationScene3D
                  biome={activeBiome}
                  rainRateMmH={rainRateMmH}
                  windSpeedKmH={windSpeedKmH}
                  windDirDeg={windDirDeg}
                  cloudBaseM={cloudBaseM}
                  tempC={tempC}
                  rhPct={rhPct}
                  surfaceWaterDepthCm={surfaceWaterDepthCm}
                  cameraPreset={cameraPreset}
                  isLightningActive={isLightningActive}
                  showTopoHeatmap={showTopoHeatmap}
                  rainDensityMultiplier={rainDensityMultiplier}
                  timeOfDayHours={timeOfDayHours}
                  isAutoOrbit={isAutoOrbit}
                />
              </Canvas>

              {/* Camera Angle Presets Floating HUD */}
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 p-1 bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700/70 shadow-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 flex items-center gap-1">
                  <Camera className="w-3 h-3 text-blue-400" />
                  View:
                </span>
                {(
                  [
                    { id: 'TOP_DOWN', label: 'Top-Down Sim' },
                    { id: 'OBSERVER', label: 'Observer (Eye-Level)' },
                    { id: 'AERIAL', label: 'Drone Aerial' },
                    { id: 'TOWER', label: 'AWS Tower' },
                    { id: 'RUNOFF', label: 'Runoff Channel' },
                  ] as const
                ).map((cam) => (
                  <button
                    key={cam.id}
                    onClick={() => setCameraPreset(cam.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      cameraPreset === cam.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>

              {/* Real-time Status Overlay Banner (Bottom of Viewport) */}
              <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-3 bg-slate-950/85 backdrop-blur-md rounded-xl border border-slate-800 shadow-xl text-xs">
                {/* Hazard Level Badge */}
                <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${hazardAssessment.bgColor}`}>
                  <hazardAssessment.icon className={`w-4 h-4 ${hazardAssessment.textColor} shrink-0 animate-pulse`} />
                  <div>
                    <span className="font-extrabold uppercase tracking-wide block text-[10px]">
                      {hazardAssessment.title}
                    </span>
                    <span className={`font-semibold text-[11px] ${hazardAssessment.textColor}`}>
                      {hazardAssessment.status}
                    </span>
                  </div>
                </div>

                {/* Core Live Hydro Metrics */}
                <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Droplet className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="text-slate-400">Ponding Depth:</span>
                    <strong className="text-blue-300 font-mono text-sm">{surfaceWaterDepthCm.toFixed(1)} cm</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="text-slate-400">Visibility:</span>
                    <strong className="text-cyan-300 font-mono text-sm">{opticalVisibilityKm.toFixed(1)} km</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-slate-400">Gale Force:</span>
                    <strong className="text-emerald-300 font-mono text-sm">{windSpeedKmH} km/h</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Physics Sliders & Environmental Reaction Dashboard */}
          <div className="w-full lg:w-[410px] xl:w-[440px] bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 sm:p-5 flex flex-col space-y-4 overflow-y-auto max-h-[50vh] lg:max-h-none shrink-0">
            {/* Scenario Preset Buttons */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Synoptic Weather Scenarios
                </span>
                <span className="text-[10px] text-slate-500">Quick 1-Click Load</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {WEATHER_SCENARIO_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyScenarioPreset(preset)}
                    className={`px-2.5 py-2 rounded-lg text-left text-xs transition-all border cursor-pointer ${
                      activeScenarioId === preset.id
                        ? 'bg-blue-600/30 border-blue-500 text-white font-bold ring-1 ring-blue-400/40'
                        : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[11px] truncate">{preset.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{preset.badge} • {preset.rainRateMmH}mm/h</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Physics Controls */}
            <div className="space-y-3.5 pt-2 border-t border-slate-800">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-blue-400" />
                Atmospheric & Hydrological Controls
              </h3>

              {/* Rainfall Intensity Slider */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <CloudRain className="w-3.5 h-3.5 text-blue-400" />
                    Rainfall Intensity
                  </span>
                  <span className="font-mono font-bold text-blue-400 text-sm">{rainRateMmH} mm/h</span>
                </div>
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
                  }}
                  className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0 Dry</span>
                  <span>25 Moderate</span>
                  <span>65 Downpour</span>
                  <span>120+ Cloudburst</span>
                </div>
              </div>

              {/* Wind Speed & Direction Controls */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-emerald-400" />
                    Wind Velocity & Gusts
                  </span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">{windSpeedKmH} km/h</span>
                </div>
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
                  className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />

                {/* Wind Heading Direction Angle */}
                <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                    <Compass className="w-3 h-3 text-slate-400" />
                    Heading: <strong className="text-slate-200">{windDirDeg}° ({
                      windDirDeg >= 200 && windDirDeg <= 260 ? 'SW Monsoon' :
                      windDirDeg > 260 && windDirDeg <= 300 ? 'W Westerly' :
                      windDirDeg > 300 && windDirDeg <= 360 ? 'NW Trough' :
                      windDirDeg >= 45 && windDirDeg <= 135 ? 'NE / Bay Surge' : 'SE'
                    })</strong>
                  </span>
                  <div className="flex items-center gap-1">
                    {[
                      { deg: 240, label: 'SW' },
                      { deg: 270, label: 'W' },
                      { deg: 90, label: 'E' },
                      { deg: 45, label: 'NE' },
                    ].map((d) => (
                      <button
                        key={d.label}
                        onClick={() => setWindDirDeg(d.deg)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          windDirDeg === d.deg
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cloud Base Ceiling (LCL) */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <CloudFog className="w-3.5 h-3.5 text-cyan-400" />
                    Condensation Level (LCL Cloud Base)
                  </span>
                  <span className="font-mono font-bold text-cyan-400 text-sm">{cloudBaseM} m</span>
                </div>
                <input
                  type="range"
                  min="150"
                  max="2500"
                  step="50"
                  value={cloudBaseM}
                  onChange={(e) => {
                    setCloudBaseM(parseFloat(e.target.value));
                    setActiveScenarioId('CUSTOM');
                  }}
                  className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>150m (Mountain Fog)</span>
                  <span>800m (Standard)</span>
                  <span>2500m (High Dry)</span>
                </div>
              </div>

              {/* Temperature & Humidity */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-amber-400" />
                      Air Temp
                    </span>
                    <strong className="text-amber-400 font-mono">{tempC.toFixed(1)}°C</strong>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="42"
                    step="0.5"
                    value={tempC}
                    onChange={(e) => setTempC(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer h-1 bg-slate-800 rounded"
                  />
                  <span className="text-[10px] text-slate-500 block">Dew Point: {dewPointC.toFixed(1)}°C</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Droplet className="w-3 h-3 text-blue-400" />
                      Relative Hum
                    </span>
                    <strong className="text-blue-400 font-mono">{rhPct}%</strong>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    step="1"
                    value={rhPct}
                    onChange={(e) => setRhPct(parseFloat(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer h-1 bg-slate-800 rounded"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    {rhPct >= 95 ? 'Fully Saturated' : 'Sub-saturated'}
                  </span>
                </div>
              </div>

              {/* NEW CONTROLS: Temporal Scrubbing & Sim Overrides */}
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-3">
                {/* Temporal Scrubber */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      Temporal Scrubbing (Hour)
                    </span>
                    <span className="font-mono font-bold text-indigo-400 text-sm">
                      {Math.floor(timeOfDayHours).toString().padStart(2, '0')}:{(timeOfDayHours % 1 * 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="0.5"
                    value={timeOfDayHours}
                    onChange={(e) => setTimeOfDayHours(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>00:00</span>
                    <span>12:00</span>
                    <span>24:00</span>
                  </div>
                </div>

                {/* Rain Particle Density */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      Atmospheric Rain Density
                    </span>
                    <span className="font-mono font-bold text-slate-400 text-sm">x{rainDensityMultiplier.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.1"
                    value={rainDensityMultiplier}
                    onChange={(e) => setRainDensityMultiplier(parseFloat(e.target.value))}
                    className="w-full accent-slate-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>

                {/* Toggles */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
                  <button
                    onClick={() => setShowTopoHeatmap(!showTopoHeatmap)}
                    className={`flex-1 px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors border ${
                      showTopoHeatmap ? 'bg-amber-900/40 text-amber-400 border-amber-700' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    Topo Heatmap
                  </button>
                  <button
                    onClick={() => setIsAutoOrbit(!isAutoOrbit)}
                    className={`flex-1 px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors border ${
                      isAutoOrbit ? 'bg-cyan-900/40 text-cyan-400 border-cyan-700' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    Cinematic Orbit
                  </button>
                </div>
              </div>

            </div>

            {/* Ground Truth Physical Narrative Box */}
            <div className="pt-2 border-t border-slate-800">
              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/50 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-300">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                  <span>Physical Mesoscale Explanation</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  {physicalExplanationText}
                </p>
                <div className="pt-1.5 border-t border-blue-900/50 flex items-center justify-between text-[10px] text-blue-400/80 font-mono">
                  <span>Soil: {activeBiome.soilType}</span>
                  <span>Drain Capacity: {activeBiome.drainageCapacityMmH} mm/h</span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setRainRateMmH(activeStation.avgMonsoonRainMm > 2000 ? 55 : 20);
                  setWindSpeedKmH(35);
                  setWindDirDeg(240);
                  setCloudBaseM(activeBiome.defaultCloudBaseM);
                  setSurfaceWaterDepthCm(2.0);
                  setElapsedSimMinutes(0);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Station Defaults</span>
              </button>

              <button
                onClick={() => setIsSimPaused((prev) => !prev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isSimPaused
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {isSimPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{isSimPaused ? 'Resume Sim' : 'Pause Sim'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
