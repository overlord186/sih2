import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MET_STATIONS } from '../data/monsoonDataset';
import { 
  MapPin, 
  ArrowUpRight, 
  CloudRain, 
  Mountain, 
  Clock, 
  Activity, 
  Search, 
  X, 
  Filter, 
  Compass, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { fetchHourlyRainData } from '../utils/weatherApi';
import { ExploreBeacon } from './exploreTour/ExploreBeacon';

const LiveTicker = ({ stationId }: { stationId: string }) => {
  const [readings, setReadings] = useState<{time: string, rain: number}[]>([]);
  
  useEffect(() => {
    let isMounted = true;
    if (stationId === 'ALL') {
      setReadings([]);
      return;
    }
    const station = MET_STATIONS.find(s => s.id === stationId);
    if (!station) return;
    
    fetchHourlyRainData(station.lat, station.lon)
      .then(data => {
        if (!isMounted) return;
        if (data && data.hourly && Array.isArray(data.hourly.time) && Array.isArray(data.hourly.rain)) {
          const now = new Date();
          let currentIndex = data.hourly.time.findIndex((t: string) => new Date(t) > now);
          if (currentIndex === -1) currentIndex = data.hourly.time.length;
          
          // Get the 3 hours prior to the current next hour
          const recent = [];
          for (let i = 1; i <= 3; i++) {
            const idx = currentIndex - i;
            if (idx >= 0 && data.hourly.rain[idx] !== undefined) {
              const dateObj = new Date(data.hourly.time[idx]);
              const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              recent.push({ time: timeStr, rain: data.hourly.rain[idx] });
            }
          }
          setReadings(recent.reverse());
        }
      })
      .catch(() => { /* silently ignore */ });

    return () => { isMounted = false; };
  }, [stationId]);

  if (stationId === 'ALL' || readings.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-hidden bg-slate-50 border border-slate-200 rounded-full px-3 py-1 shadow-inner max-w-xs sm:max-w-md">
      <Activity className="w-3.5 h-3.5 text-blue-500 shrink-0 animate-pulse" />
      <div className="text-[10px] sm:text-xs font-mono text-slate-600 whitespace-nowrap overflow-hidden flex items-center">
        <span className="font-semibold text-slate-700 mr-2 uppercase tracking-wider">Live:</span>
        <div className="flex animate-[cloudDrift_15s_linear_infinite] sm:animate-none space-x-3">
          {readings.map((r, i) => (
            <span key={i} className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {r.time}: <strong className={r.rain > 0 ? 'text-blue-600' : 'text-slate-500'}>{r.rain}mm</strong>
              {i < readings.length - 1 && <span className="text-slate-300 mx-1">|</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

interface StationOverviewProps {
  selectedStationId: string;
  onSelectStation: (id: string) => void;
  onOpenLocal3dSimulator?: (stationId: string) => void;
}

const REGION_SHORTCUTS = [
  { label: 'All (36)', query: '' },
  { label: 'Western Ghats', query: 'Ghats' },
  { label: 'Rain Shadow', query: 'Rain-shadow' },
  { label: 'Gangetic Plains', query: 'Gangetic' },
  { label: 'Northeast', query: 'Assam' },
  { label: 'Coastal & Bay', query: 'Coastal' },
  { label: 'Himalayan', query: 'Himalayan' },
];

export const StationOverview: React.FC<StationOverviewProps> = ({
  selectedStationId,
  onSelectStation,
  onOpenLocal3dSimulator,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global shortcut: press '/' to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getStationBiasNote = (id: string) => {
    switch (id) {
      case 'BOM_SANTACRUZ':
        return 'Frequent orographic surge events; NWP chronically under-predicts 100mm+ deluge peaks by up to 45%.';
      case 'PNQ_SHIVAJINAGAR':
        return 'Ghats rain-shadow lee plateau; prone to persistent NWP false drizzle during prolonged dry breaks.';
      case 'NAG_SONEGAON':
        return 'Core monsoon trough corridor; heavily influenced by Bay of Bengal low-pressure system passages.';
      case 'DEL_SAFDARJUNG':
        return 'Northern monsoon terminus; sensitive to Western Disturbance & monsoon trough interaction floods.';
      case 'CCU_ALIPORE':
        return 'Bay of Bengal head maritime delta; NWP often lags on rapid cyclonic depression landfall rain intensities.';
      case 'BLR_HAL':
        return 'Elevated southern peninsula; sharp evening convective cloudbursts smoothed out by coarse hydrostatic models.';
      case 'GAU_BORJHAR':
        return 'Brahmaputra funnel topography; severe orographic lifting bias causing NWP extreme event underestimation.';
      case 'JAI_SANGANER':
        return 'Semi-arid western margin; high evaporation rates causing NWP to trigger persistent false drizzle alarms.';
      default:
        return '';
    }
  };

  // Filter stations by Name or Region Index
  const filteredStations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const digitsOnly = q.replace(/[^0-9]/g, '');
    const parsedIndex = digitsOnly ? parseInt(digitsOnly, 10) : null;

    return MET_STATIONS.map((station, idx) => ({
      ...station,
      regionIndex: idx + 1, // 1-based region index 1..36
      paddedIndex: String(idx + 1).padStart(2, '0'),
    })).filter((stn) => {
      if (!q) return true;

      // 1. Check Region Index match (e.g., '1', '#1', '01', '#01', '12', '#12')
      if (parsedIndex !== null && parsedIndex >= 1 && parsedIndex <= MET_STATIONS.length) {
        if (stn.regionIndex === parsedIndex) return true;
      }
      const idxStr = String(stn.regionIndex);
      if (
        q === idxStr || 
        q === stn.paddedIndex || 
        q === `#${idxStr}` || 
        q === `#${stn.paddedIndex}` ||
        `#${stn.regionIndex}`.includes(q)
      ) {
        return true;
      }

      // 2. Station Name match
      if (stn.name.toLowerCase().includes(q)) return true;

      // 3. Subdivision match
      if (stn.subdivision.toLowerCase().includes(q)) return true;

      // 4. State match
      if (stn.state.toLowerCase().includes(q)) return true;

      // 5. Station ID match
      if (stn.id.toLowerCase().includes(q)) return true;

      // 6. Climate Zone match
      if (stn.climateZone.toLowerCase().includes(q)) return true;

      return false;
    });
  }, [searchQuery]);

  const activeStation = useMemo(
    () => MET_STATIONS.find((s) => s.id === selectedStationId),
    [selectedStationId]
  );

  return (
    <div 
      id="station-overview-container"
      data-explore-id="station-selector"
      className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs relative"
    >
      {/* Title & Live Ticker Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span>Meteorological Observatories & Subdivisions</span>
            <ExploreBeacon id="station-selector" size="sm" />
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Representative stations across distinct rainfall regimes of the Indian Summer Monsoon.
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <LiveTicker stationId={selectedStationId} />

          {onOpenLocal3dSimulator && (
            <button
              id="btn-launch-3d-station-sim"
              data-explore-id="local-3d-ground-sim"
              type="button"
              onClick={() => onOpenLocal3dSimulator(selectedStationId !== 'ALL' ? selectedStationId : 'BOM_SANTACRUZ')}
              className="px-3 py-1.5 text-xs rounded-lg font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-all active:scale-95"
              title="Enter interactive 3D ground simulation for current station"
            >
              <Mountain className="w-3.5 h-3.5 text-blue-200" />
              <span>3D Ground Sim</span>
            </button>
          )}
          
          <button
            id="btn-all-stations"
            onClick={() => onSelectStation('ALL')}
            className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
              selectedStationId === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400/40'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            title="Clear specific station filter and analyze combined multi-station dataset"
          >
            View All Combined
          </button>
        </div>
      </div>

      {/* Interactive Search Bar & Quick Filters */}
      <div className="mt-4 p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Input Field */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              id="station-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search station by name or region index (e.g., 'Mumbai', 'Konkan', '#04', '#12', 'Assam')..."
              className="w-full pl-9 pr-24 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium transition-all shadow-xs"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {searchQuery ? (
                <button
                  type="button"
                  id="station-search-clear-btn"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  title="Clear search query"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded">
                  /
                </kbd>
              )}
            </div>
          </div>

          {/* Results Counter & Selection Status */}
          <div className="flex items-center gap-2 text-xs shrink-0 self-end sm:self-center">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white text-slate-700 border border-slate-200 shadow-2xs font-mono">
              Showing <strong className="text-blue-600">{filteredStations.length}</strong> of {MET_STATIONS.length} stations
            </span>

            {selectedStationId !== 'ALL' && activeStation && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                <span className="truncate max-w-[140px]">{activeStation.name}</span>
              </span>
            )}
          </div>
        </div>

        {/* Quick Filter Preset Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3 h-3 text-slate-400" />
            Quick:
          </span>
          {REGION_SHORTCUTS.map((item) => {
            const isActive = searchQuery === item.query;
            return (
              <button
                key={item.label}
                onClick={() => {
                  setSearchQuery(item.query);
                  if (item.query && searchInputRef.current) {
                    searchInputRef.current.focus();
                  }
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100/80'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {filteredStations.length === 0 && (
        <div className="mt-6 py-12 px-4 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
          <Compass className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-bounce" />
          <h3 className="text-sm font-bold text-slate-800">
            No meteorological stations found for "{searchQuery}"
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Try searching by station city (e.g. <em>Mumbai</em>, <em>Shimla</em>), meteorological subdivision (e.g. <em>Konkan</em>, <em>Vidarbha</em>), or region index (e.g. <em>#01</em>, <em>#12</em>, <em>#36</em>).
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              searchInputRef.current?.focus();
            }}
            className="mt-3 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Search Filter</span>
          </button>
        </div>
      )}

      {/* Meteorological Observatories Grid */}
      {filteredStations.length > 0 && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredStations.map((stn) => {
            const isSelected = selectedStationId === stn.id;
            return (
              <div
                key={stn.id}
                id={`station-card-${stn.id}`}
                onClick={() => onSelectStation(stn.id)}
                className={`rounded-xl border p-4 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-1 ring-blue-500'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Region Index Badge */}
                      <span 
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold border ${
                          isSelected 
                            ? 'bg-blue-600 text-white border-blue-700' 
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                        title={`Meteorological Subdivision Region Index #${stn.paddedIndex}`}
                      >
                        #{stn.paddedIndex}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold truncate max-w-[150px]">
                        {stn.subdivision}
                      </span>
                    </div>
                    <ArrowUpRight
                      className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}
                    />
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-2 flex items-center justify-between">
                    <span>{stn.name}</span>
                  </h3>
                  <span className="text-xs text-slate-500 block">{stn.state}</span>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <CloudRain className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>Avg Monsoon: <strong className="text-slate-800 font-mono">{stn.avgMonsoonRainMm} mm</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mountain className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Elevation: <strong className="text-slate-800 font-mono">{stn.elevationM} m</strong></span>
                    </div>
                  </div>

                  <p className="mt-3 text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 leading-relaxed">
                    <strong>Local Bias:</strong> {getStationBiasNote(stn.id)}
                  </p>
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-mono">
                    {stn.lat.toFixed(2)}°N, {stn.lon.toFixed(2)}°E
                  </span>
                  <span
                    className={`font-semibold ${
                      isSelected ? 'text-blue-600' : 'text-slate-500'
                    }`}
                  >
                    {isSelected ? 'Active Filter' : 'Click to Filter'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
