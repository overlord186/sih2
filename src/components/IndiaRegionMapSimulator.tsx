import React, { useState } from 'react';
import { RainfallRegime, PredictionScenarioInput, PredictionResult } from '../types';
import { MET_STATIONS } from '../data/monsoonDataset';
import { WindIsobarCanvas } from './WindIsobarCanvas';
import {
  Compass,
  MapPin,
  CloudRain,
  Sun,
  CloudLightning,
  Droplets,
  Wind,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Play,
  Gauge,
  CloudFog,
  Radio,
  Navigation,
  Eye,
  Activity,
  Zap,
  Thermometer,
  ShieldAlert,
  Waves,
} from 'lucide-react';

interface IndiaRegionMapSimulatorProps {
  currentInput: PredictionScenarioInput;
  currentResult: PredictionResult;
  onSelectStationAndPreset: (updates: Partial<PredictionScenarioInput>) => void;
}

interface StationMapNode {
  id: string;
  name: string;
  state: string;
  subdivision: string;
  climateZone: string;
  // Precise geo coords
  lat: number;
  lon: number;
  mapX: number;
  mapY: number;
  typicalMonsoonIssue: string;
  scenarioPresets: {
    id: string;
    label: string;
    icon: string;
    description: string;
    input: Partial<PredictionScenarioInput>;
  }[];
}

const INDIA_MAP_IMAGE_SRC = '/india_states_map.svg';
const INDIA_MAP_BLACK_BLUE_SRC = '/india_map_black_blue.png';

const REGION_NODES: StationMapNode[] = MET_STATIONS.map(station => {
  const mapX = Math.round(100 + ((station.lon - 68) / (97 - 68)) * 650);
  const mapY = Math.round(850 - ((station.lat - 8) / (37 - 8)) * 770);
  return {
    id: station.id,
    name: station.name,
    state: station.state,
    subdivision: station.subdivision,
    climateZone: station.climateZone,
    lat: station.lat,
    lon: station.lon,
    mapX,
    mapY,
    typicalMonsoonIssue: 'Standard synoptic forcing and local thermodynamic convective parameters.',
    scenarioPresets: [
      {
        id: `${station.id}-heavy`,
        label: 'Heavy Monsoon Surge',
        icon: '⛈️',
        description: 'Strong convective activity or synoptic forcing leading to heavy precipitation.',
        input: {
          stationId: station.id,
          rawForecastMm: 35.0,
          relativeHumidity: 92,
          surfacePressure: 998.0,
          windSpeed: 25,
          prevDayRain: 20.0,
          leadTimeDays: 1,
        },
      },
      {
        id: `${station.id}-moderate`,
        label: 'Moderate Rain',
        icon: '🌧️',
        description: 'Typical monsoon condition with moderate persistent rainfall.',
        input: {
          stationId: station.id,
          rawForecastMm: 15.0,
          relativeHumidity: 85,
          surfacePressure: 1002.0,
          windSpeed: 15,
          prevDayRain: 5.0,
          leadTimeDays: 1,
        },
      }
    ]
  };
});
export const IndiaRegionMapSimulator: React.FC<IndiaRegionMapSimulatorProps> = ({
  currentInput,
  currentResult,
  onSelectStationAndPreset,
}) => {
  const [selectedStationId, setSelectedStationId] = useState<string>(currentInput.stationId);
  const [isMapExpanded, setIsMapExpanded] = useState<boolean>(true);
  const [expandedMacro, setExpandedMacro] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<'neon-dark' | 'meteorological' | 'satellite' | 'radar'>('neon-dark');
  const [showRadar, setShowRadar] = useState<boolean>(true);
  const [showWindVectors, setShowWindVectors] = useState<boolean>(true);
  const [showSatelliteClouds, setShowSatelliteClouds] = useState<boolean>(true);
  const [showRainOverlay, setShowRainOverlay] = useState<boolean>(true);
  const [showStateBorders, setShowStateBorders] = useState<boolean>(true);
  const [showIsobars, setShowIsobars] = useState<boolean>(true);
  const [showVortexDepression, setShowVortexDepression] = useState<boolean>(true);
  const [showGeoGrid, setShowGeoGrid] = useState<boolean>(true);
  const [showStationTags, setShowStationTags] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Sync with prop if it changed externally
  React.useEffect(() => {
    setSelectedStationId(currentInput.stationId);
  }, [currentInput.stationId]);

  const activeNode = REGION_NODES.find((n) => n.id === selectedStationId) || REGION_NODES[0];

  // Group overlapping stations for map rendering
  const renderNodes = React.useMemo(() => {
    const groups: Record<string, any> = {};
    const singles: any[] = [];

    REGION_NODES.forEach(node => {
      if (node.id === 'DEL_SAFDARJUNG' || node.id === 'NOIDA_SECTOR62') {
        const macro = 'Delhi NCR Region';
        if (!groups[macro]) {
          groups[macro] = {
            isGroup: true,
            id: macro,
            name: macro,
            mapX: 289,
            mapY: 295.5,
            nodes: []
          };
        }
        groups[macro].nodes.push(node);
      } else {
        singles.push({
          isGroup: false,
          ...node,
          nodes: [node]
        });
      }
    });
    return [...Object.values(groups), ...singles];
  }, []);

  return (
    <div id="india-region-map-simulator" className="bg-slate-900 text-white rounded-xl border border-slate-800 overflow-hidden shadow-xs">
      {/* Header Bar */}
      <div className="p-4 bg-slate-950/90 border-b border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                India Synoptic Weather & Regional Map Simulator
              </h3>
              <span className="px-2 py-0.5 rounded bg-blue-500/30 text-blue-300 text-[10px] font-bold tracking-wider">
                SURFACE OBSERVATORIES
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Explore how India's topography, coastal vortexes, and monsoon trough shape rainfall at each station.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Map style switcher */}
          <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px]">
            <button
              onClick={() => setMapMode('neon-dark')}
              className={`px-2 py-1 rounded font-medium transition-colors flex items-center gap-1 ${
                mapMode === 'neon-dark' ? 'bg-sky-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-400 inline-block shadow-[0_0_6px_#22d3ee]" />
              Black & Blue
            </button>
            <button
              onClick={() => setMapMode('meteorological')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                mapMode === 'meteorological' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              States Atlas
            </button>
            <button
              onClick={() => setMapMode('radar')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                mapMode === 'radar' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Doppler Live
            </button>
            <button
              onClick={() => setMapMode('satellite')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                mapMode === 'satellite' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              INSAT IR
            </button>
          </div>

          <button
            onClick={() => setIsMapExpanded(!isMapExpanded)}
            className="text-xs font-semibold px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            {isMapExpanded ? 'Hide Map' : 'Show Map'}
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="p-4 space-y-4">
        {/* Meteorological Subdivision Station Selector Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-[11px] shrink-0">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span>Select Station ({renderNodes.length} Regions):</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {renderNodes.map((node) => {
              const isSelected = node.isGroup ? node.nodes.some((n: any) => n.id === selectedStationId) : node.id === selectedStationId;
              const isExpanded = node.isGroup && expandedMacro === node.id;
              return (
                <button
                  key={node.id}
                  onClick={() => {
                    if (node.isGroup) {
                      setExpandedMacro(isExpanded ? null : node.id);
                    } else {
                      setExpandedMacro(null);
                      setSelectedStationId(node.id);
                      onSelectStationAndPreset({ stationId: node.id });
                    }
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-all flex items-center gap-1 ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-xs ring-1 ring-blue-400'
                      : 'bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/60'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-sky-300 animate-pulse' : 'bg-slate-500'
                    }`}
                  />
                  <span>{node.name.split(' ')[0]}</span>
                  <span className="text-[9px] opacity-70 hidden sm:inline">({node.subdivision || 'Subdivisions'})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Layer Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[11px]">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Interactive Visual Layers:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setShowRadar(!showRadar)}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                showRadar ? 'bg-sky-600/30 text-sky-300 border border-sky-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <Radio className="w-3 h-3 text-sky-400 animate-pulse" />
              Doppler Beam
            </button>

            <button
              onClick={() => setShowWindVectors(!showWindVectors)}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                showWindVectors ? 'bg-sky-600/30 text-sky-300 border border-sky-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <Wind className="w-3 h-3 text-sky-400" />
              SW Monsoonal Streams
            </button>

            <button
              onClick={() => setShowSatelliteClouds(!showSatelliteClouds)}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                showSatelliteClouds ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <CloudFog className="w-3 h-3 text-indigo-400" />
              Satellite Clouds
            </button>

            <button
              onClick={() => setShowRainOverlay(!showRainOverlay)}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                showRainOverlay ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <Droplets className="w-3 h-3 text-emerald-400" />
              Rain Footprint
            </button>

            <button
              onClick={() => setShowStateBorders(!showStateBorders)}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                showStateBorders ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <MapPin className="w-3 h-3 text-amber-400" />
              Subdivision Borders
            </button>

            <button
              onClick={() => setShowIsobars(!showIsobars)}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                showIsobars ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <Activity className="w-3 h-3 text-emerald-400" />
              Isobars (hPa)
            </button>

            <button
              onClick={() => setShowVortexDepression(!showVortexDepression)}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                showVortexDepression ? 'bg-rose-600/30 text-rose-300 border border-rose-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <Waves className="w-3 h-3 text-rose-400" />
              Vortex & Lows
            </button>

            <button
              onClick={() => setShowGeoGrid(!showGeoGrid)}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                showGeoGrid ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <Navigation className="w-3 h-3 text-blue-400" />
              Geo-Grid (Lat/Lon)
            </button>

            <button
              onClick={() => setShowStationTags(!showStationTags)}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                showStationTags ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              <Eye className="w-3 h-3 text-purple-400" />
              Station Tags
            </button>
          </div>
        </div>

        {isMapExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Authentic Map of India with Interactive Synoptic Meteorological Overlay */}
            <div className="md:col-span-6 bg-slate-950 rounded-xl p-3 border border-slate-800 flex flex-col items-center relative overflow-hidden shadow-inner">
              <div className="w-full flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-sky-400" />
                  {mapMode === 'neon-dark'
                    ? 'India Blueprint Map (Black & Cyan-Blue 800×953)'
                    : 'Survey & States Official Basemap (800×953)'}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Synchronized Stations
                </span>
              </div>

              {/* Map Canvas with Authentic Base Image & Projected Meteorological Layers */}
              <div className="relative w-full max-w-[420px] aspect-[800/953] rounded-lg overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-900 group select-none">
                
                {/* Map Zoom Controls */}
                <div className="absolute top-2 left-2 z-50 flex flex-col gap-1 bg-slate-800/80 rounded-md border border-slate-600/50 p-1 backdrop-blur-sm">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setZoomLevel(z => Math.min(z + 0.5, 4)); }}
                    className="w-8 h-8 flex items-center justify-center text-white bg-slate-700 hover:bg-blue-600 rounded cursor-pointer transition-colors"
                  >
                    +
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setZoomLevel(z => Math.max(z - 0.5, 1)); }}
                    className="w-8 h-8 flex items-center justify-center text-white bg-slate-700 hover:bg-blue-600 rounded cursor-pointer transition-colors"
                  >
                    -
                  </button>
                </div>

                <div 
                  className="absolute inset-0 w-full h-full transition-transform duration-300 ease-out" 
                  style={{ 
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: `${(activeNode.mapX / 800) * 100}% ${(activeNode.mapY / 953) * 100}%`
                  }}
                >
                {/* India Map Image Base */}
                <img
                  src={mapMode === 'neon-dark' ? INDIA_MAP_BLACK_BLUE_SRC : INDIA_MAP_IMAGE_SRC}
                  alt="India Synoptic Weather Basemap"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.src.includes('/india_map_black_blue.png')) {
                      img.src = '/india_states_map.svg';
                    } else if (!img.src.includes('/india_location_map.svg')) {
                      img.src = '/india_location_map.svg';
                    }
                  }}
                  className={`w-full h-full object-contain pointer-events-none transition-all duration-300 ${
                    mapMode === 'neon-dark'
                      ? 'brightness-110 contrast-125 filter drop-shadow-[0_0_12px_rgba(56,189,248,0.35)]'
                      : mapMode === 'satellite'
                      ? 'brightness-75 contrast-125 saturate-50 hue-rotate-15'
                      : mapMode === 'radar'
                      ? 'brightness-80 contrast-110 hue-rotate-90'
                      : 'brightness-95 contrast-105'
                  }`}
                />

                {/* Night / Dark Map Overlay for Seamless Integration with App Theme */}
                <div
                  className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
                    mapMode === 'neon-dark'
                      ? 'bg-transparent'
                      : mapMode === 'satellite'
                      ? 'bg-indigo-950/35 mix-blend-multiply'
                      : mapMode === 'radar'
                      ? 'bg-emerald-950/30 mix-blend-multiply'
                      : 'bg-slate-900/15 mix-blend-multiply'
                  }`}
                />

                <WindIsobarCanvas 
                  windSpeed={currentInput.windSpeed} 
                  pressure={currentInput.surfacePressure} 
                  lat={activeNode.lat} 
                  lon={activeNode.lon} 
                  intensityMm={currentResult.correctedForecastMm} 
                />

                {/* SVG Overlay aligned to 800 x 953 pixel coordinates */}
                <svg
                  viewBox="0 0 800 953"
                  className="absolute inset-0 w-full h-full pointer-events-auto"
                >
                  <defs>
                    {/* Doppler radar sweep gradient */}
                    <radialGradient id="radarBeamGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.65" />
                      <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                    </radialGradient>

                    {/* Rain intensity glow */}
                    <radialGradient id="rainGlowExtreme" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                      <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="rainGlowModerate" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.75" />
                      <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="rainGlowDry" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#eab308" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#ca8a04" stopOpacity="0" />
                    </radialGradient>

                    {/* Satellite cloud gradient */}
                    <radialGradient id="cloudGrad1" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                      <stop offset="60%" stopColor="#94a3b8" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#64748b" stopOpacity="0" />
                    </radialGradient>

                    {/* Arrowhead marker for wind streamlines */}
                    <marker id="windArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#0284c7" stroke="#ffffff" strokeWidth="0.8" />
                    </marker>

                    {/* Low-pressure depression vortex radial gradient */}
                    <radialGradient id="vortexGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.75" />
                      <stop offset="35%" stopColor="#f97316" stopOpacity="0.4" />
                      <stop offset="70%" stopColor="#0284c7" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                    </radialGradient>

                    {/* Offshore Trough glow gradient */}
                    <linearGradient id="offshoreTroughGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
                    </linearGradient>
                  </defs>

                  {/* Latitude / Longitude Synoptic Geo-Grid Layer */}
                  {showGeoGrid && (
                    <g className="pointer-events-none" stroke={mapMode === 'neon-dark' ? '#0284c7' : '#94a3b8'} strokeWidth="0.8" strokeDasharray="3 4" opacity={mapMode === 'neon-dark' ? '0.35' : '0.25'}>
                      {/* Latitudes: 32°N, 28°N, 24°N, 20°N, 16°N, 12°N, 8°N */}
                      <line x1="40" y1="200" x2="760" y2="200" />
                      <line x1="40" y1="310" x2="760" y2="310" />
                      <line x1="40" y1="420" x2="760" y2="420" />
                      <line x1="40" y1="530" x2="760" y2="530" />
                      <line x1="40" y1="640" x2="760" y2="640" />
                      <line x1="40" y1="750" x2="760" y2="750" />
                      <line x1="40" y1="860" x2="760" y2="860" />

                      {/* Longitudes: 72°E, 76°E, 80°E, 84°E, 88°E */}
                      <line x1="160" y1="60" x2="160" y2="920" />
                      <line x1="280" y1="60" x2="280" y2="920" />
                      <line x1="400" y1="60" x2="400" y2="920" />
                      <line x1="520" y1="60" x2="520" y2="920" />
                      <line x1="640" y1="60" x2="640" y2="920" />

                      {/* Geo Labels */}
                      <text x="45" y="195" fill={mapMode === 'neon-dark' ? '#38bdf8' : '#64748b'} fontSize="9" fontFamily="monospace" opacity="0.8">32°N</text>
                      <text x="45" y="305" fill={mapMode === 'neon-dark' ? '#38bdf8' : '#64748b'} fontSize="9" fontFamily="monospace" opacity="0.8">28°N</text>
                      <text x="45" y="415" fill={mapMode === 'neon-dark' ? '#38bdf8' : '#64748b'} fontSize="9" fontFamily="monospace" opacity="0.8">24°N</text>
                      <text x="45" y="525" fill={mapMode === 'neon-dark' ? '#38bdf8' : '#64748b'} fontSize="9" fontFamily="monospace" opacity="0.8">20°N</text>
                      <text x="45" y="635" fill={mapMode === 'neon-dark' ? '#38bdf8' : '#64748b'} fontSize="9" fontFamily="monospace" opacity="0.8">16°N</text>
                      <text x="45" y="745" fill={mapMode === 'neon-dark' ? '#38bdf8' : '#64748b'} fontSize="9" fontFamily="monospace" opacity="0.8">12°N</text>
                      <text x="45" y="855" fill={mapMode === 'neon-dark' ? '#38bdf8' : '#64748b'} fontSize="9" fontFamily="monospace" opacity="0.8">8°N</text>

                      <text x="165" y="935" fill={mapMode === 'neon-dark' ? '#38bdf8' : '#64748b'} fontSize="9" fontFamily="monospace" opacity="0.8">72°E</text>
                      <text x="285" y="935" fill={mapMode === 'neon-dark' ? '#38bdf8' : '#64748b'} fontSize="9" fontFamily="monospace" opacity="0.8">76°E</text>
                      <text x="405" y="935" fill={mapMode === 'neon-dark' ? '#38bdf8' : '#64748b'} fontSize="9" fontFamily="monospace" opacity="0.8">80°E</text>
                      <text x="525" y="935" fill={mapMode === 'neon-dark' ? '#38bdf8' : '#64748b'} fontSize="9" fontFamily="monospace" opacity="0.8">84°E</text>
                    </g>
                  )}

                  {/* Synoptic Surface Isobars (Constant Pressure Contours) */}
                  {showIsobars && (
                    <g className="pointer-events-none" stroke={mapMode === 'neon-dark' ? '#34d399' : '#059669'} strokeWidth="1.6" fill="none" opacity={mapMode === 'neon-dark' ? '0.7' : '0.5'}>
                      {/* Isobar 998 hPa around monsoon low trough */}
                      <path d="M 210,340 Q 320,380 440,430 Q 560,470 650,510" strokeDasharray="6 3" />
                      <text x="655" y="513" fill={mapMode === 'neon-dark' ? '#6ee7b7' : '#047857'} fontSize="10" fontWeight="bold" fontFamily="monospace">998 hPa</text>

                      {/* Isobar 1002 hPa central corridor */}
                      <path d="M 170,470 Q 290,510 430,530 Q 550,560 670,600" />
                      <text x="675" y="603" fill={mapMode === 'neon-dark' ? '#6ee7b7' : '#047857'} fontSize="10" fontWeight="bold" fontFamily="monospace">1002 hPa</text>

                      {/* Isobar 1006 hPa peninsula */}
                      <path d="M 160,630 Q 260,660 380,680 Q 480,710 610,740" />
                      <text x="615" y="743" fill={mapMode === 'neon-dark' ? '#6ee7b7' : '#047857'} fontSize="10" fontWeight="bold" fontFamily="monospace">1006 hPa</text>

                      {/* Isobar 1010 hPa deep southern oceanic ridge */}
                      <path d="M 170,780 Q 260,800 360,820 Q 460,840 550,860" strokeDasharray="6 3" />
                      <text x="555" y="863" fill={mapMode === 'neon-dark' ? '#6ee7b7' : '#047857'} fontSize="10" fontWeight="bold" fontFamily="monospace">1010 hPa</text>
                    </g>
                  )}

                  {/* Synoptic Low-Pressure Depression Vortex & Offshore Trough */}
                  {showVortexDepression && (
                    <g className="pointer-events-none">
                      {/* Bay of Bengal Monsoon Depression Vortex Center (approx 20°N, 88°E) */}
                      <g transform="translate(560, 500)">
                        <circle r="65" fill="url(#vortexGlow)" className="animate-pulse" />
                        <g style={{ animation: 'vortexSpin 8s linear infinite', transformOrigin: '0px 0px' }}>
                          <path d="M 0,-40 A 40 40 0 0 1 40,0" stroke="#f43f5e" strokeWidth="2" fill="none" strokeDasharray="4 3" />
                          <path d="M 40,0 A 40 40 0 0 1 0,40" stroke="#f43f5e" strokeWidth="2" fill="none" strokeDasharray="4 3" />
                          <path d="M 0,40 A 40 40 0 0 1 -40,0" stroke="#f43f5e" strokeWidth="2" fill="none" strokeDasharray="4 3" />
                          <path d="M -40,0 A 40 40 0 0 1 0,-40" stroke="#f43f5e" strokeWidth="2" fill="none" strokeDasharray="4 3" />
                        </g>
                        <circle r="7" fill="#ef4444" stroke="#ffffff" strokeWidth="1.5" />
                        <text x="-5" y="4" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="monospace">L</text>
                        <text x="14" y="5" fill="#fca5a5" fontSize="11" fontWeight="bold" className="drop-shadow-md">
                          BOB DEPRESSION (996 hPa)
                        </text>
                      </g>

                      {/* Arabian Sea Offshore Trough Ribbon along Konkan/Goa */}
                      <path
                        d="M 148,510 Q 170,610 195,710 Q 215,790 230,830"
                        stroke="url(#offshoreTroughGrad)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        fill="none"
                        opacity="0.65"
                      />
                      <text x="100" y="615" fill={mapMode === 'neon-dark' ? '#38bdf8' : '#0284c7'} fontSize="10" fontWeight="bold" transform="rotate(74 100 615)" opacity="0.9">
                        ≈ OFFSHORE TROUGH (CONVECTIVE RAIN BAND) ≈
                      </text>
                    </g>
                  )}

                  {/* Satellite Cloud Layer Overlay */}
                  {showSatelliteClouds && (
                    <g className="pointer-events-none" style={{ animation: 'cloudDrift 10s ease-in-out infinite' }}>
                      <ellipse cx="160" cy="560" rx="55" ry="90" fill="url(#cloudGrad1)" />
                      <ellipse cx="320" cy="490" rx="90" ry="50" fill="url(#cloudGrad1)" />
                      <ellipse cx="280" cy="300" rx="100" ry="45" fill="url(#cloudGrad1)" />
                      <circle cx="560" cy="620" r="75" fill="url(#cloudGrad1)" />
                    </g>
                  )}

                  {/* Dynamic Rain Intensity Footprint around active selected station */}
                  {showRainOverlay && (
                    <g className="pointer-events-none">
                      <circle
                        cx={activeNode.mapX}
                        cy={activeNode.mapY}
                        r={
                          currentResult.detectedRegime === RainfallRegime.HEAVY_EXTREME
                            ? 80
                            : currentResult.detectedRegime === RainfallRegime.MODERATE
                            ? 55
                            : 38
                        }
                        fill={
                          currentResult.detectedRegime === RainfallRegime.HEAVY_EXTREME
                            ? 'url(#rainGlowExtreme)'
                            : currentResult.detectedRegime === RainfallRegime.MODERATE
                            ? 'url(#rainGlowModerate)'
                            : 'url(#rainGlowDry)'
                        }
                        className="animate-pulse"
                      />
                    </g>
                  )}

                  {/* Southwest Monsoon Streamlines with Flow Animation */}
                  {showWindVectors && (
                    <g stroke="#0284c7" strokeWidth="2.4" strokeDasharray="8 5" fill="none" style={{ animation: 'monsoonStream 2s linear infinite' }}>
                      {/* Arabian Sea Branch hitting Konkan & West Coast */}
                      <path d="M 80,750 Q 115,650 150,560" markerEnd="url(#windArrow)" />
                      <path d="M 120,820 Q 150,720 180,630" markerEnd="url(#windArrow)" />
                      {/* Bay of Bengal Branch curving towards Northern Plains */}
                      <path d="M 580,780 Q 510,610 430,490" markerEnd="url(#windArrow)" />
                      <path d="M 620,670 Q 530,500 370,410" markerEnd="url(#windArrow)" />
                    </g>
                  )}

                  {/* Western Ghats Orographic Mountain Ridge Indicator */}
                  {showStateBorders && (
                    <g>
                      <path
                        d="M 175,515 Q 185,565 210,660 Q 235,740 245,785"
                        fill="none"
                        stroke={mapMode === 'neon-dark' ? '#10b981' : '#059669'}
                        strokeWidth="5"
                        strokeLinecap="round"
                        opacity="0.9"
                      />
                      <text x="145" y="660" fill={mapMode === 'neon-dark' ? '#34d399' : '#047857'} fontSize="11" fontWeight="bold" transform="rotate(76 145 660)" className="drop-shadow-sm select-none">
                        ▲ WESTERN GHATS RIDGE
                      </text>

                      {/* Sub-Himalayan & Gangetic Monsoon Trough Axis Line */}
                      <path
                        d="M 230,305 Q 360,365 480,420"
                        fill="none"
                        stroke={mapMode === 'neon-dark' ? '#fbbf24' : '#d97706'}
                        strokeWidth="3.2"
                        strokeDasharray="7 4"
                        opacity="0.9"
                      />
                      <text x="290" y="345" fill={mapMode === 'neon-dark' ? '#fde047' : '#b45309'} fontSize="11" fontWeight="bold" className="drop-shadow-sm select-none">
                        — MONSOON TROUGH AXIS —
                      </text>
                    </g>
                  )}

                  {/* Doppler Radar Sweep Circle around Active Station */}
                  {showRadar && (
                    <g transform={`translate(${activeNode.mapX}, ${activeNode.mapY})`} className="pointer-events-none">
                      <circle r="55" fill="url(#radarBeamGrad)" opacity="0.85" />
                      <circle r="55" fill="none" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.75" />
                      <line x1="0" y1="0" x2="55" y2="0" stroke="#38bdf8" strokeWidth="2.2" className="origin-top-left animate-spin" />
                    </g>
                  )}

                  {/* Interactive Station Markers */}
                  {renderNodes.map((node) => {
                    const isSelected = node.isGroup ? node.nodes.some((n: any) => n.id === selectedStationId) : node.id === selectedStationId;
                    const isExpanded = node.isGroup && expandedMacro === node.id;

                    return (
                      <React.Fragment key={node.id}>
                      <g
                        className="cursor-pointer group"
                        onClick={() => {
                          if (node.isGroup) {
                            setExpandedMacro(isExpanded ? null : node.id);
                          } else {
                            setExpandedMacro(null);
                            setSelectedStationId(node.id);
                            onSelectStationAndPreset({ stationId: node.id });
                          }
                        }}
                      >
                        {/* Pulse circle for selected */}
                        {isSelected && (
                          <circle
                            cx={node.mapX}
                            cy={node.mapY}
                            r="28"
                            fill="#0284c7"
                            opacity="0.4"
                            className="animate-ping"
                          />
                        )}

                        {/* Radar Range Ring */}
                        <circle
                          cx={node.mapX}
                          cy={node.mapY}
                          r={isSelected ? '20' : '13'}
                          fill="none"
                          stroke={isSelected ? '#0284c7' : '#475569'}
                          strokeWidth="2"
                          strokeDasharray={isSelected ? '3 3' : 'none'}
                          opacity={isSelected ? 1 : 0.65}
                        />

                        {/* Station Anchor Circle */}
                        <circle
                          cx={node.mapX}
                          cy={node.mapY}
                          r={isSelected ? '10' : '7.5'}
                          fill={isSelected ? '#0284c7' : '#1e293b'}
                          stroke="#ffffff"
                          strokeWidth={isSelected ? '3' : '2'}
                          className="transition-all group-hover:r-9 group-hover:fill-sky-500 drop-shadow-md"
                        />

                        {/* Center Pin Indicator */}
                        <circle
                          cx={node.mapX}
                          cy={node.mapY}
                          r="3.5"
                          fill="#ffffff"
                        />

                        {/* City Name & Synoptic Badge Label with Backdrop Plate */}
                        {showStationTags && (
                          <g transform={`translate(${node.mapX + 13}, ${node.mapY - 14})`}>
                            <rect
                              x="0"
                              y="0"
                              width={node.name.split(' ')[0].length * 8 + (isSelected ? 58 : 28)}
                              height={isSelected ? '28' : '22'}
                              rx="5"
                              fill={isSelected ? '#0369a1' : '#0f172a'}
                              stroke={isSelected ? '#38bdf8' : '#334155'}
                              strokeWidth={isSelected ? '1.8' : '1.2'}
                              opacity={isSelected ? '0.98' : '0.92'}
                              className="drop-shadow-md"
                            />
                            <text
                              x="8"
                              y={isSelected ? '15' : '15'}
                              fill={isSelected ? '#ffffff' : '#f1f5f9'}
                              fontSize={isSelected ? '12' : '11'}
                              fontWeight={isSelected ? 'bold' : '600'}
                              className="select-none tracking-wide font-sans"
                            >
                              {node.name.split(' ')[0]}
                            </text>
                            {isSelected && (
                              <text
                                x="8"
                                y="24"
                                fill="#bae6fd"
                                fontSize="8.5"
                                fontFamily="monospace"
                                fontWeight="bold"
                                className="select-none"
                              >
                                {currentResult.detectedRegime === RainfallRegime.DRY
                                  ? '0 mm • GATE'
                                  : `${currentResult.correctedForecastMm} mm • AI`}
                              </text>
                            )}
                          </g>
                        )}
                      </g>
                      {isExpanded && (
                        <foreignObject
                          x={node.mapX - 85}
                          y={node.mapY + 15}
                          width="170"
                          height="120"
                          className="overflow-visible z-50"
                        >
                          <div className="bg-slate-900/95 border border-slate-600 shadow-2xl rounded-lg p-2 flex flex-col gap-1" style={{ pointerEvents: 'auto' }}>
                            <span className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider px-1 text-center">{node.name}</span>
                            {node.nodes.map((subNode: any) => (
                              <button
                                key={subNode.id}
                                className={`text-left text-xs px-2 py-1.5 rounded transition-colors ${selectedStationId === subNode.id ? 'bg-sky-500/20 text-sky-400 border border-sky-500/50' : 'hover:bg-slate-800 text-slate-200 border border-transparent'}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedStationId(subNode.id);
                                  onSelectStationAndPreset({ stationId: subNode.id });
                                  setExpandedMacro(null);
                                }}
                              >
                                {subNode.name}
                              </button>
                            ))}
                          </div>
                        </foreignObject>
                      )}
                    </React.Fragment>
                    );
                  })}
                </svg>

                {/* HTML Overlay for Popovers (Avoids SVG foreignObject scaling blur) */}
                {renderNodes.map((node) => {
                  const isExpanded = node.isGroup && expandedMacro === node.id;
                  if (!isExpanded) return null;
                  return (
                    <div
                      key={`popover-${node.id}`}
                      className="absolute z-50 transform -translate-x-1/2 pointer-events-auto"
                      style={{ 
                        left: `${(node.mapX / 800) * 100}%`, 
                        top: `${(node.mapY / 953) * 100}%`,
                        marginTop: '15px',
                        width: '170px'
                      }}
                    >
                      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-600 shadow-2xl rounded-lg p-2 flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider px-1 text-center">{node.name}</span>
                        {node.nodes.map((subNode: any) => (
                          <button
                            key={subNode.id}
                            className={`text-left text-xs px-2 py-1.5 rounded transition-colors ${selectedStationId === subNode.id ? 'bg-sky-500/20 text-sky-400 border border-sky-500/50' : 'hover:bg-slate-800 text-slate-200 border border-transparent'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStationId(subNode.id);
                              onSelectStationAndPreset({ stationId: subNode.id });
                              setExpandedMacro(null);
                            }}
                          >
                            {subNode.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>

              {/* Comprehensive Synoptic Legend & Scale */}
              <div className="w-full space-y-1.5 mt-2.5 pt-2 border-t border-slate-800/80">
                <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 font-mono px-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-[0_0_6px_#0284c7] inline-block" />
                    <strong className="text-slate-300">Station Pin</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-1 bg-emerald-400 rounded inline-block" />
                    <strong className="text-slate-300">Ghats Ridge (Orographic)</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-1 bg-amber-400 rounded inline-block" />
                    <strong className="text-slate-300">Trough Axis (Convergence)</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse inline-block" />
                    <strong className="text-slate-300">Low Vortex (Depression)</strong>
                  </span>
                </div>

                {/* IMD Rainfall Intensity Color Scale Bar */}
                <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-lg border border-slate-800 text-[9px] font-mono text-slate-400">
                  <span className="shrink-0 font-bold text-slate-300">Rain Footprint Scale:</span>
                  <div className="flex-1 flex h-2 rounded overflow-hidden">
                    <div className="flex-1 bg-amber-400/80" title="Dry / Trace (0 - 2.4 mm)" />
                    <div className="flex-1 bg-sky-400/80" title="Light (2.5 - 15.5 mm)" />
                    <div className="flex-1 bg-blue-500/90" title="Moderate (15.6 - 64.4 mm)" />
                    <div className="flex-1 bg-rose-500" title="Heavy / Extreme (>= 64.5 mm)" />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-amber-400">Dry</span>
                    <span className="text-sky-400">Light</span>
                    <span className="text-blue-400">Moderate</span>
                    <span className="text-rose-400 font-bold">Heavy</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Region Microclimate Dossier & Live Synoptic Gauges */}
            <div className="md:col-span-6 space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                      {activeNode.subdivision} • {activeNode.state}
                    </span>
                    <h4 className="text-base font-bold text-white flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-4 h-4 text-rose-400" />
                      {activeNode.name}
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">
                      Coordinates: {activeNode.lat}°N, {activeNode.lon}°E
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {activeNode.climateZone.split('/')[0]}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-slate-100 font-semibold">Microclimate Challenge: </strong>
                  {activeNode.typicalMonsoonIssue}
                </p>

                {/* Synoptic Sensor Telemetry Pill Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-700/60 text-[11px]">
                  <div className="flex items-center gap-1.5 bg-slate-900/60 px-2 py-1.5 rounded-lg border border-slate-700/60">
                    <Droplets className="w-3.5 h-3.5 text-sky-400" />
                    <div>
                      <span className="text-[9px] text-slate-400 block leading-tight">Humidity (850hPa)</span>
                      <span className="font-bold font-mono text-white">{currentInput.relativeHumidity}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-900/60 px-2 py-1.5 rounded-lg border border-slate-700/60">
                    <Gauge className="w-3.5 h-3.5 text-amber-400" />
                    <div>
                      <span className="text-[9px] text-slate-400 block leading-tight">Surface Pressure</span>
                      <span className="font-bold font-mono text-white">{currentInput.surfacePressure} hPa</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-900/60 px-2 py-1.5 rounded-lg border border-slate-700/60">
                    <Wind className="w-3.5 h-3.5 text-teal-400" />
                    <div>
                      <span className="text-[9px] text-slate-400 block leading-tight">10m Wind Speed</span>
                      <span className="font-bold font-mono text-white">{currentInput.windSpeed} km/h</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-900/60 px-2 py-1.5 rounded-lg border border-slate-700/60">
                    <Thermometer className="w-3.5 h-3.5 text-rose-400" />
                    <div>
                      <span className="text-[9px] text-slate-400 block leading-tight">2m Air Temp</span>
                      <span className="font-bold font-mono text-white">{currentInput.temp2m || 27.5}°C</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time Weather Preview Box for this region */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold uppercase text-[10px] flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    Current Synoptic Inference for {activeNode.name.split(' ')[0]}:
                  </span>
                  <span className="font-mono text-emerald-400 text-xs font-bold">
                    Regime: {currentResult.detectedRegime}
                  </span>
                </div>

                {/* 3-Way Metrics Comparison: Raw vs AI vs Delta */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[9.5px] text-slate-500 block font-mono">Raw NWP Model</span>
                    <span className="text-base font-bold font-mono text-rose-400">
                      {currentInput.rawForecastMm} mm
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">ECMWF / GFS</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900 border border-blue-800/60 bg-blue-950/20">
                    <span className="text-[9.5px] text-blue-400 block font-mono font-bold">AI Calibrated</span>
                    <span className="text-base font-bold font-mono text-blue-300">
                      {currentResult.correctedForecastMm} mm
                    </span>
                    <span className="text-[9px] text-blue-400/80 block mt-0.5">Post-Processed</span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[9.5px] text-slate-500 block font-mono">Correction Delta</span>
                    <span className={`text-base font-bold font-mono ${
                      currentResult.adjustmentDeltaMm > 0
                        ? 'text-emerald-400'
                        : currentResult.adjustmentDeltaMm < 0
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }`}>
                      {currentResult.adjustmentDeltaMm > 0 ? `+${currentResult.adjustmentDeltaMm}` : currentResult.adjustmentDeltaMm} mm
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Confidence: {currentResult.regimeConfidence}%</span>
                  </div>
                </div>

                {/* Dynamic Weather Alert Banner */}
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px]">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className={`w-4 h-4 ${
                      currentResult.correctedForecastMm >= 115.6
                        ? 'text-rose-500 animate-bounce'
                        : currentResult.correctedForecastMm >= 64.5
                        ? 'text-amber-500'
                        : currentResult.correctedForecastMm >= 15.6
                        ? 'text-yellow-400'
                        : 'text-emerald-400'
                    }`} />
                    <span className="font-semibold text-slate-200 font-mono text-[10px] uppercase">
                      IMD Warning Level:
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                    currentResult.correctedForecastMm >= 115.6
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : currentResult.correctedForecastMm >= 64.5
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : currentResult.correctedForecastMm >= 15.6
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {currentResult.correctedForecastMm >= 115.6
                      ? 'RED ALERT (EXTREME EVENT)'
                      : currentResult.correctedForecastMm >= 64.5
                      ? 'ORANGE ALERT (HEAVY RAIN)'
                      : currentResult.correctedForecastMm >= 15.6
                      ? 'YELLOW WATCH (MODERATE)'
                      : 'GREEN (NO WARNING)'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 leading-snug">
                  {currentResult.detectedRegime === RainfallRegime.DRY ? (
                    <span className="text-amber-300 flex items-center gap-1.5">
                      <Sun className="w-4 h-4 shrink-0" />
                      Zero-Rain Gate is currently active. False drizzle alarms are fully suppressed.
                    </span>
                  ) : currentResult.detectedRegime === RainfallRegime.HEAVY_EXTREME ? (
                    <span className="text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Convective Peak Scaling active: Flood warnings restored by +
                      {currentResult.adjustmentDeltaMm} mm.
                    </span>
                  ) : (
                    <span className="text-blue-300 flex items-center gap-1.5">
                      <CloudRain className="w-4 h-4 shrink-0" />
                      Stratiform regression active: Moderate precipitation calibrated within bounds.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preset Weather Event Toggles for Active Region */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Simulate Weather Events for {activeNode.name}:
            </span>
            <span className="text-[10px] text-slate-400">
              Click any scenario to immediately inject atmospheric parameters into the sliders
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {activeNode.scenarioPresets.map((preset) => {
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    onSelectStationAndPreset(preset.input);
                  }}
                  className="p-2.5 rounded-lg text-left bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 hover:border-blue-500/50 transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{preset.icon}</span>
                      <span>{preset.label}</span>
                    </span>
                    <span className="text-[10px] text-blue-400 font-mono font-bold bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      Simulate
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 mt-1.5 leading-snug line-clamp-2">
                    {preset.description}
                  </p>

                  <div className="mt-2 pt-1.5 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>NWP: {preset.input.rawForecastMm} mm</span>
                    <span>RH: {preset.input.relativeHumidity}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
