import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Circle, useMap, SVGOverlay } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MET_STATIONS } from '../data/monsoonDataset';
import { DOPPLER_RADAR_SITES } from '../data/subBasinAndHydrologyData';
import { RadarSiteId, SatelliteChannel } from '../types';
import {
  CloudRain,
  Wind,
  AlertTriangle,
  Activity,
  Globe,
  Map,
  Search,
  CheckCircle2,
  Zap,
  Droplets,
  Layers,
  Thermometer,
  Gauge,
  Compass,
  Radio,
  Eye,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { InteractiveGlobe } from './InteractiveGlobe';
import { ErrorBoundary } from './ErrorBoundary';
import { fetchLiveWeatherData } from '../utils/weatherApi';

interface Props {
  selectedStationId: string;
  data: any[]; // Monsoon dataset records
  onSelectStation?: (stationId: string) => void;
}


// A simple component to re-center the map when station changes
const MapRecenter = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
};

// Open-Meteo Live Data fetching with resilient caching & fallback
const useLiveData = (lat: number, lon: number) => {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    let isMounted = true;
    fetchLiveWeatherData(lat, lon)
      .then(resData => {
        if (isMounted) setData(resData);
      })
      .catch(() => { /* silently ignore */ });
    return () => { isMounted = false; };
  }, [lat, lon]);
  return data;
};

// Regional cluster groups for quick navigation
const REGIONAL_ZONES = [
  { id: 'ALL', label: 'All Subdivisions (36+)' },
  { id: 'WEST', label: 'Konkan & Western Ghats' },
  { id: 'NORTH', label: 'North India & Himalayas' },
  { id: 'CENTRAL', label: 'Central India & Trough' },
  { id: 'EAST_NE', label: 'East & Northeast' },
  { id: 'SOUTH', label: 'South Peninsula & Malabar' },
  { id: 'ARID', label: 'West Rajasthan & Gujarat' },
];

export const LiveMap: React.FC<Props> = ({ selectedStationId, data, onSelectStation }) => {
  const [is3DMode, setIs3DMode] = useState(false);
  const [showHazardZones, setShowHazardZones] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState('ALL');

  // Remote Sensing State
  const [remoteLayer, setRemoteLayer] = useState<'NONE' | 'INSAT_3D' | 'DOPPLER_RADAR'>('NONE');
  const [satelliteChannel, setSatelliteChannel] = useState<SatelliteChannel>('TIR1_10_8');
  const [satelliteOpacity, setSatelliteOpacity] = useState<number>(0.65);
  const [selectedRadarSite, setSelectedRadarSite] = useState<RadarSiteId>('MUMBAI');
  const [radarFrameIdx, setRadarFrameIdx] = useState<number>(4);
  const [isRadarPlaying, setIsRadarPlaying] = useState<boolean>(true);

  // Auto-play Doppler Radar sweep loop
  useEffect(() => {
    if (remoteLayer !== 'DOPPLER_RADAR' || !isRadarPlaying) return;
    const interval = setInterval(() => {
      setRadarFrameIdx((prev) => (prev + 1) % 5);
    }, 1200);
    return () => clearInterval(interval);
  }, [remoteLayer, isRadarPlaying]);

  const activeStation = MET_STATIONS.find(s => s.id === selectedStationId) || MET_STATIONS[0];
  const center: [number, number] = [activeStation.lat, activeStation.lon];
  const zoom = selectedStationId === 'ALL' ? 5 : 7;
  
  const liveData = useLiveData(activeStation.lat, activeStation.lon);
  const radarSiteData = DOPPLER_RADAR_SITES[selectedRadarSite];
  const currentRadarFrame = radarSiteData.frames[radarFrameIdx] || radarSiteData.frames[0];


  // Filtered stations based on regional zone and search query
  const filteredStations = useMemo(() => {
    return MET_STATIONS.filter(s => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.subdivision.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.state.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedZone === 'ALL') return true;
      if (selectedZone === 'WEST') return ['Konkan & Goa', 'Madhya Maharashtra', 'Western Ghats Crest'].includes(s.subdivision) || s.state === 'Maharashtra' || s.state === 'Goa';
      if (selectedZone === 'NORTH') return ['Northwest India', 'West Uttar Pradesh', 'East Uttar Pradesh', 'Western Himalayas / Uttarakhand', 'Himachal Pradesh', 'Jammu & Kashmir and Ladakh', 'Punjab & Haryana'].includes(s.subdivision);
      if (selectedZone === 'CENTRAL') return ['Vidarbha', 'Marathwada', 'West Madhya Pradesh', 'East Madhya Pradesh', 'Chhattisgarh'].includes(s.subdivision);
      if (selectedZone === 'EAST_NE') return ['Gangetic West Bengal', 'Sub-Himalayan West Bengal & Sikkim', 'Assam & Meghalaya', 'Nagaland, Manipur, Mizoram & Tripura', 'Odisha', 'Bihar', 'Jharkhand'].includes(s.subdivision);
      if (selectedZone === 'SOUTH') return ['South Interior Karnataka', 'Coastal Karnataka', 'Kerala & Mahe', 'North Interior Karnataka', 'Coastal Andhra Pradesh & Yanam', 'Rayalaseema', 'Telangana', 'Tamil Nadu, Puducherry & Karaikal'].includes(s.subdivision);
      if (selectedZone === 'ARID') return ['East Rajasthan', 'West Rajasthan', 'Gujarat Region', 'Saurashtra & Kutch'].includes(s.subdivision);

      return true;
    });
  }, [searchQuery, selectedZone]);

  // Compute geospatial statistics from the current filtered evaluation dataset
  const stationStats = useMemo(() => {
    const stats: Record<string, { count: number, obs: number, fcst: number, ai: number }> = {};
    MET_STATIONS.forEach(s => stats[s.id] = { count: 0, obs: 0, fcst: 0, ai: 0 });
    
    data.forEach(d => {
      if (stats[d.stationId]) {
        stats[d.stationId].count++;
        stats[d.stationId].obs += d.observedMm;
        stats[d.stationId].fcst += d.rawForecastMm;
        stats[d.stationId].ai += d.correctedForecastMm;
      }
    });
    return stats;
  }, [data]);

  // Unique subdivisions count
  const uniqueSubdivisionsCount = useMemo(() => {
    return new Set(MET_STATIONS.map(s => s.subdivision)).size;
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6 relative z-10">
      {/* Top Header Controls */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between bg-gradient-to-r from-blue-50/50 via-sky-50/30 to-white gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-500/20">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm md:text-base flex items-center gap-2">
              Geospatial Synoptic Radar & Regional Map
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
                {MET_STATIONS.length} Stations • {uniqueSubdivisionsCount} Subdivisions
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Interactive meteorological GIS with real-time rainfall intensity tooltips & AI bias correction
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
            <button 
              onClick={() => setIs3DMode(false)}
              className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${!is3DMode ? 'bg-white text-blue-700 shadow-sm border border-slate-200/60 font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Map className="w-3.5 h-3.5" /> 2D GIS Map
            </button>
            <button 
              onClick={() => setIs3DMode(true)}
              className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${is3DMode ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60 font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Globe className="w-3.5 h-3.5" /> 3D Globe
            </button>
          </div>

          {!is3DMode && (
            <button
              onClick={() => setShowHazardZones(!showHazardZones)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                showHazardZones
                  ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold shadow-xs'
                  : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'
              }`}
              title="Toggle Regional Warning Hazard Envelopes on Map"
            >
              <Radio className={`w-3.5 h-3.5 ${showHazardZones ? 'text-amber-600 animate-pulse' : 'text-slate-400'}`} />
              <span>{showHazardZones ? 'Alert Envelopes On' : 'Alert Envelopes Off'}</span>
            </button>
          )}

          {liveData?.current && (
            <div className="hidden sm:flex items-center gap-3 text-xs font-medium text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
              <span className="text-slate-400 uppercase text-[9px] font-bold tracking-wider pr-1.5 border-r border-slate-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {activeStation.name.split(' ')[0]}
              </span>
              <span className="flex items-center gap-1"><Thermometer className="w-3.5 h-3.5 text-amber-500" /> {liveData.current.temperature_2m}°C</span>
              <span className="flex items-center gap-1"><CloudRain className="w-3.5 h-3.5 text-blue-500" /> {liveData.current.rain_intensity_mmh || liveData.current.rain} mm/h</span>
              <span className="flex items-center gap-1"><Wind className="w-3.5 h-3.5 text-slate-400" /> {liveData.current.wind_speed_10m} km/h</span>
            </div>
          )}
        </div>
      </div>

      {/* Sub-header Filter & Search Bar */}
      {!is3DMode && (
        <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex flex-col gap-2.5 text-xs">
          {/* Remote Sensing Layer Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Remote Sensing:
              </span>
              <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-xs">
                <button
                  onClick={() => setRemoteLayer('NONE')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    remoteLayer === 'NONE'
                      ? 'bg-slate-800 text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Standard GIS
                </button>
                <button
                  onClick={() => setRemoteLayer('INSAT_3D')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 ${
                    remoteLayer === 'INSAT_3D'
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3 h-3 text-indigo-300" />
                  <span>INSAT-3D/3DR Satellite</span>
                </button>
                <button
                  onClick={() => setRemoteLayer('DOPPLER_RADAR')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 ${
                    remoteLayer === 'DOPPLER_RADAR'
                      ? 'bg-rose-600 text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Radio className="w-3 h-3 text-rose-300 animate-pulse" />
                  <span>Doppler Radar (dBZ)</span>
                </button>
              </div>

              {/* Sub-controls for INSAT-3D */}
              {remoteLayer === 'INSAT_3D' && (
                <div className="flex items-center gap-2 bg-indigo-50/80 px-2.5 py-1 rounded-lg border border-indigo-200/80">
                  <span className="text-[10px] font-bold text-indigo-900">Channel:</span>
                  <select
                    value={satelliteChannel}
                    onChange={(e) => setSatelliteChannel(e.target.value as any)}
                    className="bg-white border border-indigo-200 rounded text-[11px] px-2 py-0.5 text-indigo-900 font-medium"
                  >
                    <option value="TIR1_10_8">TIR1 (10.8µm Cloud Top Temp)</option>
                    <option value="WV_6_7">WV (6.7µm Water Vapor Plume)</option>
                    <option value="VIS_RGB">Visible RGB Composite</option>
                  </select>
                  <span className="text-[10px] text-indigo-800 ml-1">Opacity:</span>
                  <input
                    type="range"
                    min={0.2}
                    max={0.9}
                    step={0.05}
                    value={satelliteOpacity}
                    onChange={(e) => setSatelliteOpacity(parseFloat(e.target.value))}
                    className="w-16 accent-indigo-600 cursor-pointer"
                  />
                </div>
              )}

              {/* Sub-controls for Doppler Radar */}
              {remoteLayer === 'DOPPLER_RADAR' && (
                <div className="flex items-center gap-2 bg-rose-50/80 px-2.5 py-1 rounded-lg border border-rose-200/80 flex-wrap">
                  <span className="text-[10px] font-bold text-rose-900">Radar Site:</span>
                  <select
                    value={selectedRadarSite}
                    onChange={(e) => setSelectedRadarSite(e.target.value as any)}
                    className="bg-white border border-rose-200 rounded text-[11px] px-2 py-0.5 text-rose-900 font-medium"
                  >
                    <option value="MUMBAI">Mumbai DWR (250km)</option>
                    <option value="CHENNAI">Chennai DWR (250km)</option>
                    <option value="KOLKATA">Kolkata DWR (250km)</option>
                    <option value="DELHI">Delhi DWR (250km)</option>
                    <option value="KOCHI">Kochi DWR (250km)</option>
                  </select>

                  <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-rose-200">
                    <button
                      onClick={() => setIsRadarPlaying(!isRadarPlaying)}
                      className="text-rose-700 hover:text-rose-900 p-0.5 cursor-pointer"
                    >
                      {isRadarPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </button>
                    <span className="text-[10px] font-mono font-bold text-rose-950 px-1">
                      {currentRadarFrame.timestamp} (-{currentRadarFrame.sweepMinutesAgo}m)
                    </span>
                    <button
                      onClick={() => setRadarFrameIdx((prev) => (prev + 1) % 5)}
                      className="text-slate-500 hover:text-slate-900 p-0.5 text-[10px] font-mono cursor-pointer"
                    >
                      ⏭
                    </button>
                  </div>
                  <span className="text-[10px] text-rose-800 font-semibold font-mono">
                    Max: {currentRadarFrame.maxReflectivityDbz} dBZ ({currentRadarFrame.echoTopsKm}km Tops)
                  </span>
                </div>
              )}
            </div>

            {/* Search Box */}
            <div className="relative min-w-[180px] md:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter stations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Regional Zone Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none border-t border-slate-200/60 pt-2">
            {REGIONAL_ZONES.map((zone) => (
              <button
                key={zone.id}
                onClick={() => setSelectedZone(zone.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap font-medium transition-all ${
                  selectedZone === zone.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {zone.label}
              </button>
            ))}
          </div>
        </div>
      )}


      {/* Map View Canvas Container */}
      <div className={`w-full relative overflow-hidden transition-all duration-300 ${is3DMode ? 'h-[580px] md:h-[660px]' : 'h-[520px]'}`}>
        {is3DMode ? (
          <ErrorBoundary fallbackTitle="3D Globe Visualizer Recovery">
            <InteractiveGlobe 
              stationStats={stationStats} 
              selectedStationId={selectedStationId} 
              onSelectStation={onSelectStation}
            />
          </ErrorBoundary>
        ) : (
        <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} zoomControl={true} className="h-full w-full z-0">
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            maxZoom={19}
            subdomains="abcd"
          />
          <MapRecenter center={center} zoom={zoom} />

          {/* Remote Sensing Layer: INSAT-3D Satellite Overlay */}
          {remoteLayer === 'INSAT_3D' && (
            <>
              {/* Arabian Sea Orographic Plume */}
              <Circle
                center={[16.5, 73.2]}
                radius={380000}
                pathOptions={{
                  color: satelliteChannel === 'WV_6_7' ? '#6366f1' : '#0284c7',
                  fillColor: satelliteChannel === 'WV_6_7' ? '#818cf8' : '#38bdf8',
                  fillOpacity: satelliteOpacity * 0.7,
                  weight: 0,
                }}
              />
              {/* Bay of Bengal Monsoon Depression Eye */}
              <Circle
                center={[19.8, 88.5]}
                radius={420000}
                pathOptions={{
                  color: satelliteChannel === 'TIR1_10_8' ? '#dc2626' : '#9333ea',
                  fillColor: satelliteChannel === 'TIR1_10_8' ? '#ef4444' : '#c084fc',
                  fillOpacity: satelliteOpacity * 0.85,
                  weight: 0,
                }}
              />
              {/* Himalayan Foothills Cloud Surge */}
              <Circle
                center={[26.5, 87.0]}
                radius={320000}
                pathOptions={{
                  color: satelliteChannel === 'VIS_RGB' ? '#0d9488' : '#e11d48',
                  fillColor: satelliteChannel === 'VIS_RGB' ? '#2dd4bf' : '#fb7185',
                  fillOpacity: satelliteOpacity * 0.65,
                  weight: 0,
                }}
              />
            </>
          )}

          {/* Remote Sensing Layer: Doppler Weather Radar (DWR) dBZ Sweeps */}
          {remoteLayer === 'DOPPLER_RADAR' && (
            <>
              {/* Radar Range Rings (50, 100, 150, 200, 250 km) */}
              {[50000, 100000, 150000, 200000, 250000].map((radiusM, idx) => (
                <Circle
                  key={`radar-ring-${idx}`}
                  center={[radarSiteData.lat, radarSiteData.lon]}
                  radius={radiusM}
                  pathOptions={{
                    color: '#f43f5e',
                    fillColor: '#f43f5e',
                    fillOpacity: idx === 4 ? 0.04 : 0.02,
                    weight: idx === 4 ? 2 : 0.8,
                    dashArray: idx === 4 ? 'none' : '4,6',
                  }}
                />
              ))}

              {/* Dynamic Doppler Reflectivity Echo Core (Based on active frame) */}
              <Circle
                center={[
                  radarSiteData.lat + (currentRadarFrame.stormDirectionDeg > 180 ? 0.25 : -0.25),
                  radarSiteData.lon + (currentRadarFrame.stormDirectionDeg > 180 ? -0.35 : 0.35),
                ]}
                radius={55000}
                pathOptions={{
                  color: currentRadarFrame.maxReflectivityDbz >= 60 ? '#c026d3' : currentRadarFrame.maxReflectivityDbz >= 50 ? '#dc2626' : '#f59e0b',
                  fillColor: currentRadarFrame.maxReflectivityDbz >= 60 ? '#d946ef' : currentRadarFrame.maxReflectivityDbz >= 50 ? '#ef4444' : '#fbbf24',
                  fillOpacity: 0.55,
                  weight: 2,
                }}
              />
              <Circle
                center={[
                  radarSiteData.lat + (currentRadarFrame.stormDirectionDeg > 180 ? 0.38 : -0.38),
                  radarSiteData.lon + (currentRadarFrame.stormDirectionDeg > 180 ? -0.52 : 0.52),
                ]}
                radius={28000}
                pathOptions={{
                  color: '#ffffff',
                  fillColor: currentRadarFrame.maxReflectivityDbz >= 60 ? '#fae8ff' : '#fee2e2',
                  fillOpacity: 0.85,
                  weight: 2.5,
                }}
              />
            </>
          )}
          
          {filteredStations.map((station) => {
            const isActive = selectedStationId === 'ALL' || station.id === selectedStationId;
            const stats = stationStats[station.id];
            
            // Calculate averages from dataset, safely defaulting to 0 to prevent NaN
            const safeObs = (stats && stats.count > 0) ? (stats.obs / stats.count) : 0;
            const safeAI = (stats && stats.count > 0) ? (stats.ai / stats.count) : 0;
            const safeRaw = (stats && stats.count > 0) ? (stats.fcst / stats.count) : 0;
            
            const avgObs = (typeof safeObs !== 'number' || isNaN(safeObs) || !isFinite(safeObs)) ? 0 : safeObs;
            const avgAI = (typeof safeAI !== 'number' || isNaN(safeAI) || !isFinite(safeAI)) ? 0 : safeAI;
            const avgRaw = (typeof safeRaw !== 'number' || isNaN(safeRaw) || !isFinite(safeRaw)) ? 0 : safeRaw;
            
            const biasDelta = avgAI - avgRaw;

            // Simulated real-time instantaneous rainfall intensity (mm/h) based on climatology and current state
            const simulatedRainIntensity = avgAI > 64.5 
              ? Math.round((avgAI * 0.38 + 5.2) * 10) / 10 
              : avgAI > 15.5 
              ? Math.round((avgAI * 0.22 + 1.5) * 10) / 10 
              : avgAI > 2.5 
              ? Math.round((avgAI * 0.12) * 10) / 10 
              : 0.0;

            // Severity based on predicted AI corrected rainfall
            const isDeluge = avgAI >= 64.5;
            const isModerate = avgAI >= 15.5 && avgAI < 64.5;
            const isLight = avgAI >= 2.5 && avgAI < 15.5;
            const isDry = avgAI < 2.5;
            
            const colorClass = isDeluge ? 'bg-red-500' : (isModerate ? 'bg-amber-500' : (isLight ? 'bg-blue-500' : 'bg-slate-400'));
            const pulseClass = isDeluge ? 'animate-ping' : (isModerate ? 'animate-pulse' : '');
            const shapeClass = isDeluge ? 'rounded-md rotate-45' : 'rounded-full';
            
            let sizeBase = isActive ? 26 : (stats.count > 0 ? 18 : 12);
            if (isDeluge && isActive) sizeBase += 6;
            
            const html = `<div class="relative flex items-center justify-center cursor-pointer group" style="width: ${sizeBase}px; height: ${sizeBase}px;">
              ${(isDeluge || isModerate) ? `<div class="absolute inset-0 ${colorClass} rounded-full ${pulseClass} opacity-60"></div>` : ''}
              <div class="relative w-full h-full ${colorClass} ${shapeClass} border-2 ${isActive ? 'border-white ring-2 ring-blue-500 shadow-xl z-20 scale-110' : 'border-white/80 opacity-90 shadow-sm'} transition-transform duration-300 group-hover:scale-125"></div>
            </div>`;
            
            const customIcon = L.divIcon({
              className: 'bg-transparent',
              html,
              iconSize: [sizeBase, sizeBase],
              iconAnchor: [sizeBase / 2, sizeBase / 2],
            });

            // Intensity Category Pill Label
            const intensityLabel = isDeluge
              ? '⚡ Torrential Deluge (>64.5mm)'
              : isModerate
              ? '🌧️ Moderate / Active Rain'
              : isLight
              ? '🌦️ Light Rain / Drizzle'
              : '☀️ Dry / Break Spell';

            const intensityBadgeColor = isDeluge
              ? 'bg-red-950/80 text-red-300 border-red-500/40'
              : isModerate
              ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
              : isLight
              ? 'bg-blue-950/80 text-blue-300 border-blue-500/40'
              : 'bg-slate-800 text-slate-300 border-slate-700';
            
            return (
              <React.Fragment key={station.id}>
                {showHazardZones && (
                  <Circle
                    center={[station.lat, station.lon]}
                    radius={isDeluge ? 65000 : isModerate ? 45000 : 30000}
                    pathOptions={{
                      color: isDeluge ? '#ef4444' : isModerate ? '#f59e0b' : isLight ? '#3b82f6' : '#94a3b8',
                      fillColor: isDeluge ? '#ef4444' : isModerate ? '#f59e0b' : isLight ? '#3b82f6' : '#94a3b8',
                      fillOpacity: isDeluge ? 0.22 : isModerate ? 0.15 : 0.08,
                      weight: isDeluge ? 1.5 : 1,
                      dashArray: isDeluge ? 'none' : '3,4',
                    }}
                  />
                )}
                <Marker
                  position={[station.lat, station.lon]}
                  icon={customIcon}
                  zIndexOffset={isActive ? 1000 : (isDeluge ? 500 : 0)}
                  eventHandlers={{
                    click: () => {
                      if (onSelectStation) onSelectStation(station.id);
                    }
                  }}
                >
                {/* Rich Interactive Hover Tooltip */}
                <Tooltip
                  direction="top"
                  offset={[0, -14]}
                  opacity={1}
                  className="station-met-tooltip pointer-events-none"
                  sticky={false}
                >
                  <div className="p-3 w-72 max-w-xs text-slate-100 select-none">
                    {/* Header with Station ID badge */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-700/80 pb-2 mb-2">
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-1.5 leading-snug">
                          {station.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800/80 font-semibold font-mono">
                            ID: {station.id}
                          </span>
                          <span>• {station.state}</span>
                        </div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        {station.elevationM}m
                      </span>
                    </div>

                    {/* Meteorological Subdivision */}
                    <div className="text-[11px] text-sky-300 font-medium mb-2.5 flex items-center gap-1 bg-sky-950/40 px-2 py-1 rounded border border-sky-900/60">
                      <Compass className="w-3 h-3 text-sky-400 shrink-0" />
                      <span className="truncate">{station.subdivision}</span>
                    </div>

                    {/* Real-time Rainfall Intensity Indicator */}
                    <div className="bg-slate-950/80 rounded-lg p-2.5 border border-slate-800 mb-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Droplets className="w-3.5 h-3.5 text-blue-400" /> Real-Time Intensity:
                        </span>
                        <strong className="text-blue-300 font-mono text-xs">
                          {simulatedRainIntensity.toFixed(1)} <span className="text-[9px] font-normal text-slate-400">mm/h</span>
                        </strong>
                      </div>

                      {/* Intensity Progress Bar */}
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            isDeluge ? 'bg-gradient-to-r from-red-500 to-rose-400' : isModerate ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                          }`}
                          style={{ width: `${Math.min(100, (simulatedRainIntensity / 35.0) * 100)}%` }}
                        />
                      </div>

                      {/* Intensity Classification Tag */}
                      <div className={`text-[10px] px-2 py-0.5 rounded border font-medium text-center ${intensityBadgeColor}`}>
                        {intensityLabel}
                      </div>
                    </div>

                    {/* NWP vs AI Model Comparison Delta */}
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] mb-2 font-mono">
                      <div className="bg-slate-900/70 p-1.5 rounded border border-slate-800">
                        <div className="text-slate-400 text-[9px]">Raw NWP:</div>
                        <div className="text-slate-300 font-semibold">{avgRaw.toFixed(1)} mm</div>
                      </div>
                      <div className="bg-blue-950/60 p-1.5 rounded border border-blue-800/60">
                        <div className="text-sky-400 text-[9px]">AI Corrected:</div>
                        <div className="text-sky-200 font-bold">{avgAI.toFixed(1)} mm</div>
                      </div>
                    </div>

                    {/* AI Bias Correction Delta */}
                    <div className="flex items-center justify-between text-[10px] bg-slate-900/60 px-2 py-1 rounded border border-slate-800/80 mb-2">
                      <span className="text-slate-400">AI Bias Delta:</span>
                      <span className={`font-mono font-bold ${biasDelta > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {biasDelta >= 0 ? `+${biasDelta.toFixed(1)}` : biasDelta.toFixed(1)} mm
                        <span className="text-[9px] font-normal text-slate-400 ml-1">
                          ({biasDelta > 0 ? 'Lift' : 'Suppression'})
                        </span>
                      </span>
                    </div>

                    {/* Interaction Hint */}
                    <div className="text-[9px] text-sky-400/90 pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
                      <span>Norm: {station.avgMonsoonRainMm}mm</span>
                      <span className="font-semibold tracking-wide flex items-center gap-0.5">
                        Click to filter →
                      </span>
                    </div>
                  </div>
                </Tooltip>

                {/* Detailed Click Popup */}
                <Popup className="rounded-xl overflow-hidden shadow-xl border-0">
                  <div className="p-1 min-w-[220px]">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
                      <div>
                        <div className="text-sm font-bold text-slate-800">{station.name}</div>
                        <div className="text-[10px] font-mono text-blue-600 font-semibold">Station ID: {station.id}</div>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 mb-2.5">
                      Subdivision: <strong>{station.subdivision}</strong> ({station.state})
                    </div>
                    
                    {stats.count > 0 ? (
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded">
                          <span className="text-slate-600 font-medium">Observed Ground Truth:</span> 
                          <strong className="text-slate-900">{avgObs.toFixed(1)} mm</strong>
                        </div>
                        <div className="flex justify-between items-center px-1.5">
                          <span className="text-slate-500">Raw Model Forecast:</span> 
                          <span className="text-slate-500 font-medium">{avgRaw.toFixed(1)} mm</span>
                        </div>
                        <div className="flex justify-between items-center bg-blue-50/70 p-1.5 rounded border border-blue-100">
                          <span className="text-blue-700 font-semibold">AI Corrected Forecast:</span> 
                          <strong className="text-blue-700 font-mono font-bold">{avgAI.toFixed(1)} mm</strong>
                        </div>
                        <div className="flex justify-between items-center bg-emerald-50/70 p-1.5 rounded border border-emerald-100 text-[11px]">
                          <span className="text-emerald-700 font-medium">Real-Time Intensity:</span> 
                          <strong className="text-emerald-700 font-mono">{simulatedRainIntensity.toFixed(1)} mm/h</strong>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-2 pt-1.5 border-t border-slate-100 text-center">
                          Based on {stats.count} seasonal evaluation records
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic text-center py-2">
                        No records match current filters
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
            );
          })}
        </MapContainer>
        )}

        {/* Floating Remote Sensing HUD Legend */}
        {!is3DMode && remoteLayer === 'INSAT_3D' && (
          <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-700/80 text-white shadow-xl text-xs max-w-xs">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="font-bold text-[11px] text-indigo-300 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> INSAT-3D / 3DR {satelliteChannel === 'TIR1_10_8' ? 'TIR1 10.8µm' : satelliteChannel === 'WV_6_7' ? 'Water Vapor 6.7µm' : 'VIS RGB'}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold animate-pulse">● LIVE 03:00Z</span>
            </div>
            <p className="text-[10px] text-slate-300 mb-2 leading-tight">
              {satelliteChannel === 'TIR1_10_8'
                ? 'Cloud-Top Brightness Temperature (CTBT). Overshooting tops indicate deep convective cells.'
                : satelliteChannel === 'WV_6_7'
                ? 'Mid-to-upper tropospheric water vapor transport channels.'
                : 'Visible solar albedo showing heavy stratiform & cumulonimbus cloud decks.'}
            </p>
            {/* Color Ramp */}
            <div className="space-y-1">
              <div className="h-2.5 rounded-full w-full bg-gradient-to-r from-red-600 via-amber-500 via-blue-400 to-indigo-900 border border-slate-700"></div>
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>190 K (-83°C)</span>
                <span>240 K (-33°C)</span>
                <span>300 K (+27°C)</span>
              </div>
            </div>
          </div>
        )}

        {!is3DMode && remoteLayer === 'DOPPLER_RADAR' && (
          <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/95 backdrop-blur-md p-3 rounded-xl border border-rose-500/40 text-white shadow-xl text-xs max-w-xs">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="font-bold text-[11px] text-rose-400 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" /> DWR: {radarSiteData.name} ({radarSiteData.frequencyGhz} GHz)
              </span>
              <span className="text-[10px] font-mono text-amber-300 font-bold">{currentRadarFrame.timestamp}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono bg-slate-950/70 p-1.5 rounded border border-slate-800 mb-2">
              <div>Max Reflectivity: <strong className="text-rose-300">{currentRadarFrame.maxReflectivityDbz} dBZ</strong></div>
              <div>Echo Tops: <strong className="text-sky-300">{currentRadarFrame.echoTopsKm} km</strong></div>
              <div>Storm Dir: <strong className="text-emerald-300">{currentRadarFrame.stormDirectionDeg}°</strong></div>
              <div>Storm Velocity: <strong className="text-amber-300">{currentRadarFrame.stormVelocityKmh} km/h</strong></div>
            </div>
            {/* dBZ Color Bar */}
            <div className="space-y-1">
              <div className="h-2.5 rounded-full w-full bg-gradient-to-r from-sky-400 via-emerald-500 via-amber-500 via-red-600 to-fuchsia-400 border border-slate-700"></div>
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>10 dBZ</span>
                <span>30 dBZ</span>
                <span>50 dBZ</span>
                <span>65+ dBZ</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
