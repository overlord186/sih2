import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Circle, useMap, SVGOverlay } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths in React/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
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
  RefreshCw,
  Terminal,
  Bug,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  MapPin,
  SlidersHorizontal,
  Navigation,
  Check,
} from 'lucide-react';
import { InteractiveGlobe } from './InteractiveGlobe';
import { ErrorBoundary } from './ErrorBoundary';
import { fetchLiveWeatherData } from '../utils/weatherApi';
import { D3RadarReflectivityOverlay } from './D3RadarReflectivityOverlay';

export interface TileDiagnosticLog {
  id: string;
  timestamp: string;
  url: string;
  coordsStr: string;
  errorMsg: string;
}

export interface TileDiagnosticStats {
  requested: number;
  loaded: number;
  pending: number;
  errors: number;
  healthPercent: number;
}

interface Props {
  selectedStationId: string;
  data: any[]; // Monsoon dataset records
  onSelectStation?: (stationId: string) => void;
}


// A simple component to re-center the map when station changes


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


function MapController({ center, zoom, bounds }: { center: [number, number], zoom: number, bounds?: [[number, number], [number, number]] | null }) {
  const map = useMap();
  
  // Handle resizing with ResizeObserver observing parent container dimensions
  useEffect(() => {
    if (!map) return;

    let rafId: number | null = null;
    const triggerInvalidate = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        map.invalidateSize({ animate: false });
      });
    };

    // Scheduled invalidations for initial layout stabilization
    triggerInvalidate();
    const t1 = setTimeout(triggerInvalidate, 100);
    const t2 = setTimeout(triggerInvalidate, 400);
    const t3 = setTimeout(triggerInvalidate, 1000);

    const container = map.getContainer();
    const parentContainer = container?.parentElement || container;

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && container) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            triggerInvalidate();
          }
        }
      });
      resizeObserver.observe(container);
      if (parentContainer && parentContainer !== container) {
        resizeObserver.observe(parentContainer);
      }
    }

    const onResize = () => triggerInvalidate();
    window.addEventListener('resize', onResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [map]);

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 1.2 });
    } else {
      map.setView(center, zoom, {
        animate: true,
        duration: 1.2
      });
    }
  }, [map, center, zoom, bounds]);

  return null;
}

function TileDiagnosticsTracker({
  onStatsChange,
  onErrorLog,
  onMapReady,
}: {
  onStatsChange: React.Dispatch<React.SetStateAction<TileDiagnosticStats>>;
  onErrorLog: (log: TileDiagnosticLog) => void;
  onMapReady: (map: L.Map) => void;
}) {
  const map = useMap();

  useEffect(() => {
    onMapReady(map);

    const handleStart = (e: any) => {
      onStatsChange(prev => {
        const req = prev.requested + 1;
        const pend = prev.pending + 1;
        const loaded = prev.loaded;
        const errs = prev.errors;
        const healthPercent = req > 0 ? Math.min(100, Math.max(0, Math.round((loaded / Math.max(1, req - errs)) * 100))) : 100;
        return {
          ...prev,
          requested: req,
          pending: pend,
          healthPercent,
        };
      });
    };

    const handleLoad = (e: any) => {
      onStatsChange(prev => {
        const ldd = prev.loaded + 1;
        const pend = Math.max(0, prev.pending - 1);
        const req = prev.requested;
        const errs = prev.errors;
        const healthPercent = req > 0 ? Math.min(100, Math.max(0, Math.round((ldd / Math.max(1, req - errs)) * 100))) : 100;
        return {
          ...prev,
          loaded: ldd,
          pending: pend,
          healthPercent,
        };
      });
    };

    const handleError = (e: any) => {
      const tileUrl = e.tile?.src || e.url || 'Unknown Tile Source';
      const coords = e.coords ? `[z:${e.coords.z}, x:${e.coords.x}, y:${e.coords.y}]` : '[Unknown Coords]';
      const timeStr = new Date().toLocaleTimeString();

      // Console error output specifically requested for debugging blocky artifacts
      console.error(`[Leaflet Map Tile Diagnostic 404/Error] ${timeStr} - Failed tile render ${coords}`, {
        url: tileUrl,
        coords: e.coords,
        leafletEvent: e,
      });

      const logEntry: TileDiagnosticLog = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: timeStr,
        url: tileUrl,
        coordsStr: coords,
        errorMsg: 'Tile load HTTP 404 or network render failure',
      };

      onErrorLog(logEntry);

      onStatsChange(prev => {
        const errs = prev.errors + 1;
        const pend = Math.max(0, prev.pending - 1);
        const req = prev.requested;
        const loaded = prev.loaded;
        const healthPercent = req > 0 ? Math.min(100, Math.max(0, Math.round((loaded / Math.max(1, req - errs)) * 100))) : 100;
        return {
          ...prev,
          errors: errs,
          pending: pend,
          healthPercent,
        };
      });
    };

    map.on('tileloadstart', handleStart);
    map.on('tileload', handleLoad);
    map.on('tileerror', handleError);

    return () => {
      map.off('tileloadstart', handleStart);
      map.off('tileload', handleLoad);
      map.off('tileerror', handleError);
    };
  }, [map, onMapReady, onStatsChange, onErrorLog]);

  return null;
}

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

  // Diagnostic Overlay State
  const [tileStats, setTileStats] = useState<TileDiagnosticStats>({
    requested: 0,
    loaded: 0,
    pending: 0,
    errors: 0,
    healthPercent: 100,
  });
  const [tileErrorLogs, setTileErrorLogs] = useState<TileDiagnosticLog[]>([]);
  const [showDiagnosticsPanel, setShowDiagnosticsPanel] = useState<boolean>(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  // Map Tile Cache Control State
  const [mapCacheKey, setMapCacheKey] = useState<number>(() => Date.now());
  const [isClearingCache, setIsClearingCache] = useState<boolean>(false);
  const [cacheNotice, setCacheNotice] = useState<string | null>(null);

  // Dynamic Map Legend State
  const [isLegendCollapsed, setIsLegendCollapsed] = useState<boolean>(false);

  // India Geocoding Search State
  const [geocodingQuery, setGeocodingQuery] = useState<string>('');
  const [geocodingResults, setGeocodingResults] = useState<Array<{
    displayName: string;
    lat: number;
    lon: number;
    source: 'nominatim' | 'station';
  }>>([]);
  const [isGeocodingLoading, setIsGeocodingLoading] = useState<boolean>(false);
  const [isGeocodingOpen, setIsGeocodingOpen] = useState<boolean>(false);
  const [selectedGeocodedTarget, setSelectedGeocodedTarget] = useState<{
    displayName: string;
    lat: number;
    lon: number;
  } | null>(null);

  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleGeocodeSearch = useCallback((term: string) => {
    if (geocodeTimerRef.current) {
      clearTimeout(geocodeTimerRef.current);
    }

    if (!term || term.trim().length < 2) {
      setGeocodingResults([]);
      setIsGeocodingOpen(false);
      setIsGeocodingLoading(false);
      return;
    }

    // Immediately populate local MET_STATIONS matches so user gets instant zero-latency feedback
    const localMatches = MET_STATIONS.filter(s =>
      s.name.toLowerCase().includes(term.toLowerCase()) ||
      s.subdivision.toLowerCase().includes(term.toLowerCase()) ||
      s.state.toLowerCase().includes(term.toLowerCase()) ||
      s.id.toLowerCase().includes(term.toLowerCase())
    ).slice(0, 4);

    const localFormatted: Array<{
      displayName: string;
      lat: number;
      lon: number;
      source: 'nominatim' | 'station';
    }> = localMatches.map(s => ({
      displayName: `${s.name} Observatory (${s.subdivision}, ${s.state})`,
      lat: s.lat,
      lon: s.lon,
      source: 'station' as const,
    }));

    setGeocodingResults(localFormatted);
    if (localFormatted.length > 0) {
      setIsGeocodingOpen(true);
    }

    setIsGeocodingLoading(true);

    // Debounce external Nominatim lookup by 400ms to strictly comply with OpenStreetMap rate limits and avoid 429 Rate Exceeded errors
    geocodeTimerRef.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(term + ', India')}&limit=5&addressdetails=1`;
        const res = await fetch(url, {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'SynopticWeatherSimulator/1.0 (IndiaMonsoonAI)',
          },
        });

        if (!res.ok) {
          console.warn(`Geocoding HTTP status ${res.status} (Rate limit / busy). Falling back to local observatory database.`);
          setIsGeocodingLoading(false);
          return;
        }

        const results = await res.json();
        const externalFormatted: Array<{
          displayName: string;
          lat: number;
          lon: number;
          source: 'nominatim' | 'station';
        }> = [];

        if (Array.isArray(results)) {
          results.forEach((r: any) => {
            externalFormatted.push({
              displayName: r.display_name,
              lat: parseFloat(r.lat),
              lon: parseFloat(r.lon),
              source: 'nominatim',
            });
          });
        }

        // Merge local observatory matches and external geocoding results, avoiding duplicates
        const combined = [...localFormatted];
        externalFormatted.forEach(ext => {
          if (!combined.some(c => Math.abs(c.lat - ext.lat) < 0.01 && Math.abs(c.lon - ext.lon) < 0.01)) {
            combined.push(ext);
          }
        });

        setGeocodingResults(combined);
        if (combined.length > 0) {
          setIsGeocodingOpen(true);
        }
      } catch (err) {
        console.warn('Geocoding search network exception caught, utilizing local observatory catalog:', err);
      } finally {
        setIsGeocodingLoading(false);
      }
    }, 400);
  }, []);

  const handleSelectGeocodedTarget = useCallback((target: { displayName: string; lat: number; lon: number }) => {
    setSelectedGeocodedTarget(target);
    setIsGeocodingOpen(false);
    if (mapInstance) {
      mapInstance.flyTo([target.lat, target.lon], 9, {
        duration: 1.5,
      });
    }
  }, [mapInstance]);

  const handleClearMapCache = useCallback(() => {
    setIsClearingCache(true);
    const newTimestamp = Date.now();
    setMapCacheKey(newTimestamp);

    setTileStats({ requested: 0, loaded: 0, pending: 0, errors: 0, healthPercent: 100 });
    setTileErrorLogs([]);

    if (mapInstance) {
      try {
        mapInstance.eachLayer((layer) => {
          if ((layer as any)._tiles || typeof (layer as any).redraw === 'function') {
            (layer as any).redraw();
          }
        });
        mapInstance.invalidateSize({ animate: false });
      } catch {
        // ignore errors during forced redraw
      }
    }

    setCacheNotice('Leaflet tile cache cleared! Fresh tile layers re-instantiated.');
    setTimeout(() => setIsClearingCache(false), 500);
    setTimeout(() => setCacheNotice(null), 3500);
  }, [mapInstance]);

  const handleAddTileErrorLog = useCallback((log: TileDiagnosticLog) => {
    setTileErrorLogs(prev => [log, ...prev].slice(0, 15));
  }, []);

  const handleMapReady = useCallback((map: L.Map) => {
    setMapInstance(map);
  }, []);

  // Diagnostic Canvas & CSS Reset Overlay Refs
  const diagnosticCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Memoized CSS reset rule to prevent map container overflow hidden issues from creating visual blocky artifacts
  const memoizedTileCSSReset = useMemo(() => (
    <style>{`
      /* Memoized Leaflet CSS Reset to prevent Tailwind max-width / height auto conflict and overflow blocky artifacts */
      .leaflet-container img.leaflet-tile,
      .leaflet-tile-container img,
      .leaflet-layer img,
      .leaflet-marker-icon {
        max-width: none !important;
        max-height: none !important;
        min-width: 0 !important;
        min-height: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
        border: none !important;
        mix-blend-mode: normal !important;
      }
      .leaflet-container {
        overflow: hidden !important;
        background-color: #090d16 !important;
        outline: none !important;
        width: 100% !important;
        height: 100% !important;
      }
      .leaflet-tile {
        visibility: inherit !important;
        opacity: 1 !important;
        filter: none;
      }
      .leaflet-tile-loaded {
        opacity: 1 !important;
      }
      .map-wrapper {
        position: relative;
        overflow: hidden;
        width: 100%;
      }
    `}</style>
  ), []);

  // Transparent diagnostic canvas overlay effect
  useEffect(() => {
    const canvas = diagnosticCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    const width = (canvas.width = parent?.clientWidth || 800);
    const height = (canvas.height = parent?.clientHeight || 600);

    ctx.clearRect(0, 0, width, height);

    if (tileStats.errors > 0) {
      // Draw transparent red wireframes for detected tile load failures
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      const cols = 3;
      const rows = 2;
      const cellW = width / cols;
      const cellH = height / rows;

      tileErrorLogs.slice(0, 4).forEach((log, idx) => {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        const x = c * cellW + 12;
        const y = r * cellH + 12;
        const w = cellW - 24;
        const h = cellH - 24;

        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = 'rgba(244, 63, 94, 0.08)';
        ctx.fillRect(x, y, w, h);

        ctx.fillStyle = 'rgba(251, 113, 133, 0.9)';
        ctx.font = '10px monospace';
        ctx.fillText(`FAIL ${log.coordsStr}`, x + 6, y + 16);
      });
    } else if (tileStats.pending > 0) {
      // Subtle amber scan frame
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.strokeRect(2, 2, width - 4, height - 4);
    } else {
      // Transparent corner diagnostic ticks
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(8, 20); ctx.lineTo(8, 8); ctx.lineTo(20, 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(width - 20, 8); ctx.lineTo(width - 8, 8); ctx.lineTo(width - 8, 20);
      ctx.stroke();
    }
  }, [tileStats, tileErrorLogs]);

  // Synchronize with external dashboard engine controller
  useEffect(() => {
    const handleEngineRadar = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail;
        if (detail && typeof detail.active === 'boolean') {
          setRemoteLayer(detail.active ? 'DOPPLER_RADAR' : 'NONE');
        }
      } catch (err) {
        console.error('[LiveMap] Error handling engine-radar-toggle event:', err);
      }
    };

    window.addEventListener('engine-radar-toggle', handleEngineRadar);
    return () => window.removeEventListener('engine-radar-toggle', handleEngineRadar);
  }, []);

  const handleSetRemoteLayer = (layer: 'NONE' | 'INSAT_3D' | 'DOPPLER_RADAR') => {
    try {
      setRemoteLayer(layer);
      window.dispatchEvent(
        new CustomEvent('engine-radar-external', { detail: { active: layer === 'DOPPLER_RADAR' } })
      );
    } catch (err) {
      console.error('[LiveMap] Error in handleSetRemoteLayer:', err);
    }
  };

  // Auto-play Doppler Radar sweep loop
  useEffect(() => {
    if (remoteLayer !== 'DOPPLER_RADAR' || !isRadarPlaying) return;
    const interval = setInterval(() => {
      setRadarFrameIdx((prev) => (prev + 1) % 5);
    }, 1200);
    return () => clearInterval(interval);
  }, [remoteLayer, isRadarPlaying]);

  const activeStation = MET_STATIONS.find(s => s.id === selectedStationId) || MET_STATIONS[0];
  const center: [number, number] = [activeStation?.lat || 20, activeStation?.lon || 77];
  const zoom = selectedStationId === 'ALL' ? 5 : 7;
  
  const liveData = useLiveData(activeStation.lat, activeStation.lon);
  const radarSiteData = DOPPLER_RADAR_SITES[selectedRadarSite];
  const currentRadarFrame = radarSiteData.frames[radarFrameIdx] || radarSiteData.frames[0];

  // Dynamic map viewport target: Centers onto radar antenna when Doppler is engaged
  let mapCenter: [number, number] = remoteLayer === 'DOPPLER_RADAR'
    ? [radarSiteData?.lat || 20, radarSiteData?.lon || 77]
    : center;
    
  if (isNaN(mapCenter[0]) || isNaN(mapCenter[1])) {
    console.error("Invalid mapCenter detected!", { mapCenter, remoteLayer, radarSiteData, activeStation });
    mapCenter = [20, 77]; // safe fallback
  }
  const mapZoom: number = remoteLayer === 'DOPPLER_RADAR' ? 8 : zoom;
  
  // Calculate bounding box for 'ALL'
  const bounds = useMemo<[[number, number], [number, number]] | null>(() => {
    if (selectedStationId === 'ALL' && remoteLayer !== 'DOPPLER_RADAR') {
      let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
      MET_STATIONS.forEach(s => {
        if (s.lat < minLat) minLat = s.lat;
        if (s.lat > maxLat) maxLat = s.lat;
        if (s.lon < minLon) minLon = s.lon;
        if (s.lon > maxLon) maxLon = s.lon;
      });
      // Add a little padding
      return [[minLat - 2, minLon - 2], [maxLat + 2, maxLon + 2]];
    }
    return null;
  }, [selectedStationId, remoteLayer]);


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
            <>
              <button
                onClick={handleClearMapCache}
                disabled={isClearingCache}
                className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:text-blue-700 hover:bg-blue-50/60 hover:border-blue-300 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                title="Clear Leaflet tile cache, reset tile health diagnostics, and force fresh tile layer instantiation"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isClearingCache ? 'animate-spin' : ''}`} />
                <span>{isClearingCache ? 'Clearing Cache...' : 'Clear Map Cache'}</span>
              </button>

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
            </>
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
                  onClick={() => handleSetRemoteLayer('NONE')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    remoteLayer === 'NONE'
                      ? 'bg-slate-800 text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Standard GIS
                </button>
                <button
                  onClick={() => handleSetRemoteLayer('INSAT_3D')}
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
                  onClick={() => handleSetRemoteLayer('DOPPLER_RADAR')}
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

            {/* Geocoding API Search Input for Districts & Regions in India */}
            <div className="relative flex-1 min-w-[220px] max-w-xs md:max-w-md">
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-blue-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Geocode District / Region in India (e.g. Pune, Wayanad)..."
                  value={geocodingQuery}
                  onChange={(e) => {
                    setGeocodingQuery(e.target.value);
                    handleGeocodeSearch(e.target.value);
                  }}
                  onFocus={() => {
                    if (geocodingQuery.length >= 2) setIsGeocodingOpen(true);
                  }}
                  className="w-full pl-8 pr-8 py-1 bg-white border border-blue-200 rounded-lg text-xs text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                />
                {isGeocodingLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                ) : geocodingQuery ? (
                  <button
                    onClick={() => {
                      setGeocodingQuery('');
                      setGeocodingResults([]);
                      setIsGeocodingOpen(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>

              {/* Geocoding API Results Dropdown */}
              {isGeocodingOpen && geocodingResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-2xl border border-slate-200 z-[1000] overflow-hidden max-h-64 overflow-y-auto">
                  <div className="px-3 py-1.5 bg-blue-50/80 border-b border-blue-100 text-[10px] font-bold text-blue-900 uppercase tracking-wider flex items-center justify-between">
                    <span>Geocoded Indian Districts & Regions</span>
                    <span className="text-blue-600 font-mono text-[9px]">OpenStreetMap Nominatim</span>
                  </div>
                  {geocodingResults.map((res, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectGeocodedTarget(res)}
                      className="w-full text-left px-3 py-2 text-xs border-b border-slate-100 hover:bg-blue-50/80 transition-colors flex items-start gap-2 cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 truncate">
                          {res.displayName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Lat: {res.lat.toFixed(4)}° • Lon: {res.lon.toFixed(4)}°
                        </div>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold shrink-0">
                        Fly To Region
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter Station Input */}
            <div className="relative min-w-[140px] md:w-44">
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
      <div className={`w-full relative overflow-hidden transition-all duration-300 map-wrapper ${is3DMode ? 'h-[580px] md:h-[660px]' : 'h-[520px]'}`}>
        {is3DMode ? (
          <ErrorBoundary fallbackTitle="3D Globe Visualizer Recovery">
            <InteractiveGlobe 
              stationStats={stationStats} 
              selectedStationId={selectedStationId} 
              onSelectStation={onSelectStation}
            />
          </ErrorBoundary>
        ) : (
        <>
          {memoizedTileCSSReset}
          {cacheNotice && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] bg-slate-900/90 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl border border-cyan-400/40 backdrop-blur-md flex items-center gap-2 animate-bounce">
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span>{cacheNotice}</span>
            </div>
          )}
          <div className="absolute inset-0 z-0 bg-slate-100/50 flex items-center justify-center pointer-events-none transition-opacity duration-500 opacity-0" id="map-loading-overlay">
            <div className="flex flex-col items-center text-slate-400">
              <svg className="animate-spin h-8 w-8 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span className="text-xs font-semibold">Initializing Mapping Engine...</span>
            </div>
          </div>

          {/* Transparent Diagnostic Canvas Overlay */}
          <canvas
            ref={diagnosticCanvasRef}
            className="absolute inset-0 pointer-events-none z-[350] w-full h-full"
          />
          
          <MapContainer center={mapCenter} zoom={mapZoom} scrollWheelZoom={false} zoomControl={true} className="h-full w-full z-0">
          <MapController center={mapCenter} zoom={mapZoom} bounds={bounds} />
          <TileDiagnosticsTracker
            onStatsChange={setTileStats}
            onErrorLog={handleAddTileErrorLog}
            onMapReady={handleMapReady}
          />
          <TileLayer
            key={`osm-tile-layer-${mapCacheKey}`}
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
            maxNativeZoom={19}
            subdomains={['a', 'b', 'c']}
            crossOrigin="anonymous"
          />
          

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

          {/* High-Performance D3 Radar Reflectivity & Doppler Velocity Overlay */}
          {remoteLayer === 'DOPPLER_RADAR' && (
            <D3RadarReflectivityOverlay
              radarSite={{
                id: selectedRadarSite,
                name: radarSiteData.name,
                lat: radarSiteData.lat,
                lon: radarSiteData.lon,
                rangeKm: radarSiteData.rangeKm,
                frequencyGhz: radarSiteData.frequencyGhz,
              }}
              frame={currentRadarFrame}
              isPlaying={isRadarPlaying}
              onTogglePlay={() => setIsRadarPlaying(!isRadarPlaying)}
              onNextFrame={() => setRadarFrameIdx((prev) => (prev + 1) % 5)}
              onPrevFrame={() => setRadarFrameIdx((prev) => (prev - 1 + 5) % 5)}
              frameIndex={radarFrameIdx}
              totalFrames={5}
            />
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

          {/* Selected Geocoded Target Pin Marker */}
          {selectedGeocodedTarget && (
            <Marker
              position={[selectedGeocodedTarget.lat, selectedGeocodedTarget.lon]}
              zIndexOffset={2000}
              icon={L.divIcon({
                className: 'bg-transparent',
                html: `<div class="relative flex items-center justify-center cursor-pointer" style="width: 36px; height: 36px;">
                  <div class="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                  <div class="relative w-8 h-8 bg-red-600 rounded-full border-2 border-white shadow-2xl flex items-center justify-center text-white font-bold text-xs">
                    📍
                  </div>
                </div>`,
                iconSize: [36, 36],
                iconAnchor: [18, 18],
              })}
            >
              <Popup autoPan={true}>
                <div className="p-2 text-slate-800 max-w-xs">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-red-700">
                    <MapPin className="w-4 h-4 text-red-600" />
                    <span>Geocoded Target Region</span>
                  </div>
                  <p className="text-xs text-slate-700 font-semibold mt-1 leading-snug">
                    {selectedGeocodedTarget.displayName}
                  </p>
                  <div className="text-[10px] text-slate-500 font-mono mt-1 pt-1 border-t border-slate-100 flex items-center justify-between">
                    <span>Lat: {selectedGeocodedTarget.lat.toFixed(4)}°</span>
                    <span>Lon: {selectedGeocodedTarget.lon.toFixed(4)}°</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
        </>
        )}

        {/* Dynamic Rainfall Intensity & Visual Overlay Legend */}
        {!is3DMode && (
          <div className="absolute bottom-4 right-4 z-[400] max-w-xs sm:max-w-sm pointer-events-auto">
            <div className="bg-slate-900/90 backdrop-blur-md text-white rounded-2xl p-3 shadow-2xl border border-slate-700/80 transition-all duration-300">
              <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold tracking-tight text-white">
                    Rainfall Intensity & Overlay Legend
                  </span>
                </div>
                <button
                  onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title={isLegendCollapsed ? 'Expand Map Legend' : 'Collapse Map Legend'}
                >
                  {isLegendCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {!isLegendCollapsed && (
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Torrential Deluge */}
                    <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950/70 border border-red-500/40">
                      <span className="w-3 h-3 rounded-full bg-red-500 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse"></span>
                      <div>
                        <div className="text-[11px] font-bold text-red-300">Heavy / Deluge</div>
                        <div className="text-[9px] text-slate-400 font-mono">&gt; 64.5 mm/24h</div>
                      </div>
                    </div>

                    {/* Moderate Rain */}
                    <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950/70 border border-amber-500/40">
                      <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></span>
                      <div>
                        <div className="text-[11px] font-bold text-amber-300">Moderate Rain</div>
                        <div className="text-[9px] text-slate-400 font-mono">15.6 - 64.4 mm</div>
                      </div>
                    </div>

                    {/* Light Rain */}
                    <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950/70 border border-blue-500/40">
                      <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                      <div>
                        <div className="text-[11px] font-bold text-blue-300">Light / Drizzle</div>
                        <div className="text-[9px] text-slate-400 font-mono">2.5 - 15.5 mm</div>
                      </div>
                    </div>

                    {/* Dry / Break */}
                    <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950/70 border border-slate-700">
                      <span className="w-3 h-3 rounded-full bg-slate-400 shrink-0"></span>
                      <div>
                        <div className="text-[11px] font-bold text-slate-300">Dry / Break</div>
                        <div className="text-[9px] text-slate-400 font-mono">&lt; 2.5 mm</div>
                      </div>
                    </div>
                  </div>

                  {/* Remote Sensing Dynamic Legend Integration */}
                  {remoteLayer === 'INSAT_3D' && (
                    <div className="mt-2 pt-2 border-t border-slate-800">
                      <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>INSAT-3D Thermal IR CTBT</span>
                        <span className="text-[9px] font-mono text-indigo-400">10.8 µm Channel</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gradient-to-r from-red-600 via-amber-500 via-blue-400 to-indigo-900 border border-slate-700"></div>
                      <div className="flex justify-between text-[8px] text-slate-400 font-mono mt-0.5">
                        <span>190 K (Convective)</span>
                        <span>300 K (Warm Ground)</span>
                      </div>
                    </div>
                  )}

                  {remoteLayer === 'DOPPLER_RADAR' && (
                    <div className="mt-2 pt-2 border-t border-slate-800">
                      <div className="text-[10px] font-bold text-rose-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Doppler Radar Reflectivity</span>
                        <span className="text-[9px] font-mono text-rose-400">dBZ Reflectivity</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 via-rose-500 to-purple-600 border border-rose-400/30"></div>
                      <div className="flex justify-between text-[8px] text-slate-400 font-mono mt-0.5">
                        <span>10 dBZ (Light)</span>
                        <span>35 dBZ</span>
                        <span>65+ dBZ (Hail/Extreme)</span>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Hazard Envelopes: <strong className="text-amber-400">{showHazardZones ? 'On' : 'Off'}</strong></span>
                    <span>Observatories: <strong className="text-sky-300">{MET_STATIONS.length}</strong></span>
                  </div>
                </div>
              )}
            </div>
          </div>
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

        {/* Floating Tile Load Diagnostics & Render Debugger HUD Overlay */}
        {!is3DMode && (
          <div className="absolute top-3 right-3 z-[400] flex flex-col items-end gap-2 pointer-events-auto">
            {/* Compact Toggle Button Badge */}
            <button
              onClick={() => setShowDiagnosticsPanel(!showDiagnosticsPanel)}
              className={`px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                tileStats.errors > 0
                  ? 'bg-rose-950/90 border-rose-500/80 text-rose-200 hover:bg-rose-900/90 animate-pulse shadow-rose-900/30'
                  : tileStats.pending > 0
                  ? 'bg-slate-900/90 border-amber-500/60 text-amber-200 hover:bg-slate-800/90'
                  : 'bg-slate-900/85 border-slate-700/80 text-slate-200 hover:bg-slate-800/90'
              }`}
              title="Toggle Tile Diagnostics & Render Debugger Overlay"
            >
              <Bug className={`w-3.5 h-3.5 ${tileStats.errors > 0 ? 'text-rose-400 animate-spin' : 'text-blue-400'}`} />
              <span className="font-mono text-[11px] font-bold">
                Tiles: {tileStats.loaded}/{tileStats.requested} ({tileStats.healthPercent}%)
              </span>
              {tileStats.pending > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
              {tileStats.errors > 0 ? (
                <span className="px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-300 font-mono text-[10px] font-bold border border-rose-400/40">
                  {tileStats.errors} {tileStats.errors === 1 ? 'Error' : 'Errors'}
                </span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
              {showDiagnosticsPanel ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {/* Expanded Diagnostic Overlay Panel */}
            {showDiagnosticsPanel && (
              <div className="w-80 sm:w-96 bg-slate-900/95 text-slate-100 rounded-2xl border border-slate-700/80 shadow-2xl backdrop-blur-xl p-4 text-xs font-sans animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      <Terminal className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                        Tile Diagnostics Monitor
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50 font-mono">
                          v1.4 GIS
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-400">Tracks Leaflet map tile status & 404/rendering errors</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (mapInstance) {
                          mapInstance.invalidateSize({ animate: true });
                          mapInstance.eachLayer((layer: any) => {
                            if (layer.redraw) layer.redraw();
                          });
                          console.log('[Tile Diagnostic] Force invalidated Leaflet size & redrew tile layers');
                        }
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                      title="Force Map Invalidate & Redraw Tiles"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                    </button>
                    <button
                      onClick={() => setShowDiagnosticsPanel(false)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Stat Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800/80 text-center">
                    <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Loaded / Req</div>
                    <div className="text-xs font-bold font-mono text-emerald-400 mt-0.5">
                      {tileStats.loaded} / {tileStats.requested}
                    </div>
                  </div>
                  <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800/80 text-center">
                    <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Pending Downloads</div>
                    <div className="text-xs font-bold font-mono text-amber-400 mt-0.5">
                      {tileStats.pending}
                    </div>
                  </div>
                  <div className="bg-slate-950/70 p-2 rounded-xl border border-slate-800/80 text-center">
                    <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">404 Errors</div>
                    <div className={`text-xs font-bold font-mono mt-0.5 ${tileStats.errors > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {tileStats.errors}
                    </div>
                  </div>
                </div>

                {/* Server Provider Info */}
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 mb-3 text-[10px] font-mono space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Tile Server URL:</span>
                    <span className="text-sky-300 font-semibold truncate max-w-[190px]">openstreetmap.org</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Subdomains:</span>
                    <span className="text-slate-200">a, b, c</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Render Health:</span>
                    <span className={tileStats.healthPercent >= 90 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {tileStats.healthPercent}% Optimal
                    </span>
                  </div>
                </div>

                {/* Error Log Console Feed */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 text-[11px]">
                    <span className="font-semibold text-slate-300 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Recorded Error Stream ({tileErrorLogs.length})
                    </span>
                    {tileErrorLogs.length > 0 && (
                      <button
                        onClick={() => setTileErrorLogs([])}
                        className="text-[10px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                      >
                        Clear Log
                      </button>
                    )}
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                    {tileErrorLogs.length === 0 ? (
                      <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 text-center text-[10px] text-slate-400 italic">
                        No tile rendering errors or 404s detected. Tiles are serving smoothly without blocky gaps.
                      </div>
                    ) : (
                      tileErrorLogs.map((log) => (
                        <div key={log.id} className="p-2 bg-rose-950/40 border border-rose-500/30 rounded-lg text-[10px] font-mono">
                          <div className="flex justify-between text-rose-300 font-semibold mb-0.5">
                            <span>{log.coordsStr}</span>
                            <span className="text-slate-400">{log.timestamp}</span>
                          </div>
                          <div className="text-slate-300 truncate max-w-full" title={log.url}>
                            {log.url}
                          </div>
                          <div className="flex justify-between items-center mt-1 pt-1 border-t border-rose-500/20">
                            <span className="text-rose-400">{log.errorMsg}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(log, null, 2));
                                setCopiedLogId(log.id);
                                setTimeout(() => setCopiedLogId(null), 1500);
                              }}
                              className="flex items-center gap-1 text-[9px] text-slate-400 hover:text-white cursor-pointer"
                            >
                              {copiedLogId === log.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              {copiedLogId === log.id ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1 text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Console reporting active
                  </span>
                  <button
                    onClick={() => {
                      if (mapInstance) {
                        mapInstance.invalidateSize({ animate: true });
                        mapInstance.eachLayer((layer: any) => {
                          if (layer.redraw) layer.redraw();
                        });
                      }
                    }}
                    className="px-2.5 py-1 bg-blue-600/80 hover:bg-blue-600 text-white rounded font-medium transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Re-sync Map Canvas
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
