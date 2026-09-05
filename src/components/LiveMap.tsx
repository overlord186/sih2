import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MET_STATIONS } from '../data/monsoonDataset';
import { CloudRain, Wind, AlertTriangle, Activity, Globe, Map } from 'lucide-react';
import { InteractiveGlobe } from './InteractiveGlobe';

interface Props {
  selectedStationId: string;
  data: any[]; // Monsoon dataset records
}

// A simple component to re-center the map when station changes
const MapRecenter = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
};

// Open-Meteo Live Data fetching
const useLiveData = (lat: number, lon: number) => {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=\${lat}&longitude=\${lon}&current=temperature_2m,rain,wind_speed_10m&hourly=rain`)
      .then(res => res.json())
      .then(setData)
      .catch(() => { /* silently ignore fetch errors if adblocked */ });
  }, [lat, lon]);
  return data;
};

export const LiveMap: React.FC<Props> = ({ selectedStationId, data }) => {
  const [is3DMode, setIs3DMode] = useState(false);
  const activeStation = MET_STATIONS.find(s => s.id === selectedStationId) || MET_STATIONS[0];
  const center: [number, number] = [activeStation.lat, activeStation.lon];
  const zoom = selectedStationId === 'ALL' ? 5 : 7;
  
  const liveData = useLiveData(activeStation.lat, activeStation.lon);

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

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6 relative z-10">
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between bg-gradient-to-r from-blue-50/50 to-white gap-3">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Geospatial AI Rainfall Projection
        </h3>
        <div className="flex items-center ml-4 bg-slate-100 rounded-lg p-0.5">
          <button 
            onClick={() => setIs3DMode(false)}
            className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${!is3DMode ? 'bg-white text-blue-700 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Map className="w-3.5 h-3.5" /> 2D Map
          </button>
          <button 
            onClick={() => setIs3DMode(true)}
            className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${is3DMode ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Globe className="w-3.5 h-3.5" /> 3D Volumetric
          </button>
        </div>
        {liveData?.current && (
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600 bg-white/60 px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
            <span className="text-slate-400 uppercase text-[10px] tracking-wider pr-1 border-r border-slate-200">Live API</span>
            <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> {liveData.current.temperature_2m}°C</span>
            <span className="flex items-center gap-1"><CloudRain className="w-3.5 h-3.5 text-blue-500" /> {liveData.current.rain}mm</span>
            <span className="flex items-center gap-1"><Wind className="w-3.5 h-3.5 text-slate-400" /> {liveData.current.wind_speed_10m}km/h</span>
          </div>
        )}
      </div>
      <div className={`w-full relative overflow-hidden transition-all duration-300 ${is3DMode ? 'h-[540px] md:h-[600px]' : 'h-[460px]'}`}>
        {is3DMode ? <InteractiveGlobe stationStats={stationStats} selectedStationId={selectedStationId} /> :
        <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} zoomControl={true} className="h-full w-full z-0">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapRecenter center={center} zoom={zoom} />
          
          {MET_STATIONS.map((station) => {
            const isActive = selectedStationId === 'ALL' || station.id === selectedStationId;
            const stats = stationStats[station.id];
            
            // Calculate averages from dataset, safely defaulting to 0 to prevent NaN
            const safeObs = (stats && stats.count > 0) ? (stats.obs / stats.count) : 0;
            const safeAI = (stats && stats.count > 0) ? (stats.ai / stats.count) : 0;
            const safeRaw = (stats && stats.count > 0) ? (stats.fcst / stats.count) : 0;
            
            const avgObs = (typeof safeObs !== 'number' || isNaN(safeObs) || !isFinite(safeObs)) ? 0 : safeObs;
            const avgAI = (typeof safeAI !== 'number' || isNaN(safeAI) || !isFinite(safeAI)) ? 0 : safeAI;
            const avgRaw = (typeof safeRaw !== 'number' || isNaN(safeRaw) || !isFinite(safeRaw)) ? 0 : safeRaw;
            
            // Severity based on predicted AI corrected rainfall
            const isHeavy = avgAI > 64.5;
            const isModerate = avgAI > 15.5;
            
            const colorClass = isHeavy ? 'bg-red-500' : (isModerate ? 'bg-amber-500' : 'bg-blue-500');
            const shapeClass = isHeavy ? 'rounded-md rotate-45' : 'rounded-full';
            
            let sizeBase = isActive ? 28 : (stats.count > 0 ? 20 : 12);
            if (isHeavy && isActive) sizeBase += 8;
            
            const html = `<div class="relative flex items-center justify-center" style="width: ${sizeBase}px; height: ${sizeBase}px;">
              ${(isHeavy || isModerate) ? `<div class="absolute inset-0 ${colorClass} rounded-full animate-ping opacity-60"></div>` : ''}
              <div class="relative w-full h-full ${colorClass} ${shapeClass} border-2 ${isActive ? 'border-white shadow-lg z-10' : 'border-white/70 opacity-90'} shadow-sm transition-all duration-300"></div>
            </div>`;
            
            const customIcon = L.divIcon({
              className: 'bg-transparent',
              html,
              iconSize: [sizeBase, sizeBase],
              iconAnchor: [sizeBase / 2, sizeBase / 2],
            });
            
            return (
              <Marker
                key={station.id}
                position={[station.lat, station.lon]}
                icon={customIcon}
                zIndexOffset={isActive ? 1000 : (isHeavy ? 500 : 0)}
              >
                <Popup className="rounded-xl overflow-hidden shadow-lg border-0">
                  <div className="p-1 min-w-[200px]">
                    <div className="text-sm font-bold text-slate-800">{station.name}</div>
                    <div className="text-[11px] text-slate-500 mb-3 border-b border-slate-100 pb-2">{station.subdivision}</div>
                    
                    {stats.count > 0 ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded">
                          <span className="text-slate-600 font-medium">Observed Ground Truth:</span> 
                          <strong className="text-slate-900">{Number((!isNaN(avgObs) && isFinite(avgObs) && avgObs !== null) ? avgObs : 0).toFixed(1)} mm</strong>
                        </div>
                        <div className="flex justify-between items-center px-1.5">
                          <span className="text-slate-500">Raw Model Forecast:</span> 
                          <span className="text-slate-500 font-medium">{Number((!isNaN(avgRaw) && isFinite(avgRaw) && avgRaw !== null) ? avgRaw : 0).toFixed(1)} mm</span>
                        </div>
                        <div className="flex justify-between items-center bg-blue-50/50 p-1.5 rounded border border-blue-100/50">
                          <span className="text-blue-700 font-semibold">AI Corrected Forecast:</span> 
                          <strong className="text-blue-700">{Number((!isNaN(avgAI) && isFinite(avgAI) && avgAI !== null) ? avgAI : 0).toFixed(1)} mm</strong>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100 text-center">
                          Based on {stats.count} evaluation records
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic text-center py-2">
                        No historical data matches current filters
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>}
      </div>
    </div>
  );
};
