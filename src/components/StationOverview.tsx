import React, { useEffect, useState } from 'react';
import { MET_STATIONS } from '../data/monsoonDataset';
import { MapPin, ArrowUpRight, CloudRain, Mountain, Wind, Clock, Activity } from 'lucide-react';

const LiveTicker = ({ stationId }: { stationId: string }) => {
  const [readings, setReadings] = useState<{time: string, rain: number}[]>([]);
  
  useEffect(() => {
    if (stationId === 'ALL') {
      setReadings([]);
      return;
    }
    const station = MET_STATIONS.find(s => s.id === stationId);
    if (!station) return;
    
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${station.lat}&longitude=${station.lon}&hourly=rain`)
      .then(res => res.json())
      .then(data => {
        if (data.hourly && data.hourly.time && data.hourly.rain) {
          const now = new Date();
          let currentIndex = data.hourly.time.findIndex((t: string) => new Date(t) > now);
          if (currentIndex === -1) currentIndex = data.hourly.time.length;
          
          // Get the 3 hours prior to the current next hour
          const recent = [];
          for (let i = 1; i <= 3; i++) {
            const idx = currentIndex - i;
            if (idx >= 0) {
              const dateObj = new Date(data.hourly.time[idx]);
              const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              recent.push({ time: timeStr, rain: data.hourly.rain[idx] });
            }
          }
          setReadings(recent.reverse());
        }
      })
      .catch(() => { /* silently ignore fetch errors */ });
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
}

export const StationOverview: React.FC<StationOverviewProps> = ({
  selectedStationId,
  onSelectStation,
}) => {
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

  return (
    <div id="station-overview-container" className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            Meteorological Observatories & Subdivisions
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Representative stations across distinct rainfall regimes of the Indian Summer Monsoon.
          </p>
        </div>
        
        <div className="flex-1 flex justify-end mr-2">
          <LiveTicker stationId={selectedStationId} />
        </div>
        <button
          id="btn-all-stations"
          onClick={() => onSelectStation('ALL')}
          className={`px-3 py-1 text-xs rounded-md font-semibold transition-colors ${
            selectedStationId === 'ALL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          View All Combined
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {MET_STATIONS.map((stn) => {
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
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                    {stn.subdivision}
                  </span>
                  <ArrowUpRight
                    className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}
                  />
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-2">{stn.name}</h3>
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
    </div>
  );
};
