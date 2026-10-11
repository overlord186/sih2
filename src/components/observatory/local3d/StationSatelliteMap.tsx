/**
 * StationSatelliteMap.tsx
 * SAMVARTAKA AI — High-Definition Satellite Catchment & Municipal GIS Map
 * 
 * Renders an ultra-fast 120 FPS raster satellite map with zero API keys or watermarks:
 * - Esri World Imagery (High-Res True Color Satellite)
 * - Esri Dark Gray Canvas (High-End Stealth Tactical GIS, No Watermarks)
 * - OpenStreetMap (Civic Street Geometry)
 * - Pinned urban critical infrastructure flood beacons with click-to-inspect popups
 */

import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  StationCatchmentProfile, 
  CriticalInfrastructureHotspot,
  computeLiveHydrologicalState 
} from '../../../data/stationCatchments';
import { 
  Layers, 
  MapPin, 
  AlertTriangle, 
  ShieldCheck, 
  Activity, 
  Compass, 
  Maximize2, 
  Eye, 
  Navigation,
  Droplets,
  Wind
} from 'lucide-react';

// Fix Leaflet default icon paths in React/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Sleek tactical military radar beacons (Clean, zero label collision)
function createHotspotDivIcon(
  hotspot: CriticalInfrastructureHotspot, 
  currentDepthCm: number,
  isSelected: boolean
) {
  const isCritical = currentDepthCm >= hotspot.criticalThresholdCm;
  const isCaution = !isCritical && currentDepthCm >= hotspot.criticalThresholdCm * 0.45;

  let color = '#10b981'; // emerald
  let pulseColor = 'rgba(16, 185, 129, 0.45)';

  if (isCritical) {
    color = '#ef4444'; // red
    pulseColor = 'rgba(239, 68, 68, 0.65)';
  } else if (isCaution) {
    color = '#f59e0b'; // amber
    pulseColor = 'rgba(245, 158, 11, 0.55)';
  }

  const ringScale = isSelected ? 'scale-125' : '';
  const selectedBorder = isSelected ? 'border-cyan-300 ring-2 ring-cyan-400' : 'border-white';

  const html = `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
      <div style="
        position: absolute;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background-color: ${pulseColor};
        animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      <div style="
        position: relative;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background-color: ${color};
        border: 2px solid ${isSelected ? '#00f0ff' : '#ffffff'};
        box-shadow: 0 0 14px ${color}${isSelected ? ', 0 0 8px #00f0ff' : ''};
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;
      ">
        <div style="width: 5px; height: 5px; border-radius: 50%; background-color: #ffffff;"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-hotspot-pin',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

// Controller component to smoothly fly map to selected hotspot or station
function MapFlightController({
  center,
  zoom,
  targetHotspot,
}: {
  center: [number, number];
  zoom: number;
  targetHotspot: CriticalInfrastructureHotspot | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (targetHotspot) {
      map.flyTo([targetHotspot.lat, targetHotspot.lng], 16, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    } else {
      map.flyTo(center, zoom, {
        duration: 1.0,
      });
    }
  }, [center, zoom, targetHotspot, map]);

  return null;
}

export interface StationSatelliteMapProps {
  profile: StationCatchmentProfile;
  rainRateMmH: number;
  windSpeedKmH: number;
  windDirDeg?: number;
  surfaceWaterDepthCm: number;
  selectedHotspotId?: string | null;
  onSelectHotspot?: (hotspotId: string) => void;
}

export const StationSatelliteMap: React.FC<StationSatelliteMapProps> = ({
  profile,
  rainRateMmH,
  windSpeedKmH,
  windDirDeg = 240,
  surfaceWaterDepthCm,
  selectedHotspotId,
  onSelectHotspot,
}) => {
  const [basemapStyle, setBasemapStyle] = useState<'SATELLITE' | 'DARK' | 'STREET'>('SATELLITE');
  const [showCatchmentBasin, setShowCatchmentBasin] = useState(false);

  // Compute live water depths & states for all hotspots
  const liveState = useMemo(() => {
    return computeLiveHydrologicalState(profile, rainRateMmH, 1.0, surfaceWaterDepthCm);
  }, [profile, rainRateMmH, surfaceWaterDepthCm]);

  // Find currently selected hotspot for camera tracking
  const targetHotspot = useMemo(() => {
    if (!selectedHotspotId) return null;
    return profile.hotspots.find((h) => h.id === selectedHotspotId) || null;
  }, [profile, selectedHotspotId]);

  // Basemap tile definitions — 100% Free, NO API KEYS, NO WATERMARKS
  const tileConfig = useMemo(() => {
    switch (basemapStyle) {
      case 'DARK':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
          attribution: '&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
          maxZoom: 18,
        };
      case 'STREET':
        return {
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        };
      case 'SATELLITE':
      default:
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: '&copy; Esri World Imagery, Maxar, Earthstar Geographics',
          maxZoom: 19,
        };
    }
  }, [basemapStyle]);

  return (
    <div className="relative w-full h-full min-h-[460px] bg-slate-950 overflow-hidden select-none">
      <MapContainer
        center={profile.centerCoordinates}
        zoom={profile.defaultZoom}
        minZoom={12}
        maxZoom={19}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution={tileConfig.attribution}
          url={tileConfig.url}
          maxZoom={tileConfig.maxZoom}
        />

        {/* Flight Controller for Smooth Camera Animations */}
        <MapFlightController
          center={profile.centerCoordinates}
          zoom={profile.defaultZoom}
          targetHotspot={targetHotspot}
        />

        {/* Subtle Catchment Watershed Drainage Perimeter Overlay */}
        {showCatchmentBasin && (
          <Circle
            center={profile.centerCoordinates}
            radius={1800}
            pathOptions={{
              color: '#38bdf8',
              fillColor: '#0284c7',
              fillOpacity: 0.08,
              weight: 1.5,
              dashArray: '4, 4',
            }}
          />
        )}

        {/* Critical Infrastructure Hotspot Pinned Markers */}
        {liveState.evaluatedHotspots.map((hotspot) => {
          const isSelected = selectedHotspotId === hotspot.id;
          const icon = createHotspotDivIcon(hotspot, hotspot.currentDepthCm, isSelected);
          const isCritical = hotspot.severity === 'CRITICAL_FLOODED';
          const isCaution = hotspot.severity === 'CAUTION';

          return (
            <Marker
              key={hotspot.id}
              position={[hotspot.lat, hotspot.lng]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  if (onSelectHotspot) onSelectHotspot(hotspot.id);
                },
              }}
            >
              <Popup className="custom-hotspot-popup">
                <div className="p-3 bg-slate-950 text-white rounded-xl border border-slate-700 shadow-2xl min-w-[260px] max-w-[320px] font-sans">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
                    <span className="font-bold text-xs text-white leading-tight">
                      {hotspot.name}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase whitespace-nowrap ${
                        isCritical
                          ? 'bg-red-500/25 text-red-400 border border-red-500/50'
                          : isCaution
                          ? 'bg-amber-500/25 text-amber-400 border border-amber-500/50'
                          : 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/50'
                      }`}
                    >
                      {hotspot.statusLabel}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 mb-2 leading-relaxed">
                    {hotspot.locationDescription}
                  </p>

                  <div className="grid grid-cols-2 gap-2 p-2 bg-slate-900/90 rounded-lg border border-slate-800 mb-2.5 font-mono text-xs">
                    <div>
                      <div className="text-[9px] text-slate-400">Live Ponding</div>
                      <div
                        className={`font-bold ${
                          isCritical
                            ? 'text-red-400'
                            : isCaution
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {hotspot.currentDepthCm} cm
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-400">Safe Threshold</div>
                      <div className="text-slate-300 font-bold">
                        {hotspot.criticalThresholdCm} cm
                      </div>
                    </div>
                  </div>

                  {/* Water Depth Gauge Bar */}
                  <div className="mb-2.5">
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isCritical ? 'bg-red-500' : isCaution ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (hotspot.currentDepthCm / hotspot.criticalThresholdCm) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="text-[10px] text-sky-300 bg-sky-950/40 p-2 rounded-lg border border-sky-800/40 leading-snug">
                    <strong className="text-white block mb-0.5">Emergency SOP Directive:</strong>
                    {hotspot.actionProtocol}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Top-Left Aero-Glass Station Header HUD */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 max-w-[280px]">
        <div className="p-2.5 bg-slate-950/85 backdrop-blur-md rounded-2xl border border-slate-800/90 shadow-2xl text-white font-sans">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="font-bold text-xs uppercase tracking-wider text-slate-100">
              {profile.stationName}
            </span>
          </div>

          <div className="text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 mb-2">
            <span>{profile.centerCoordinates[0].toFixed(3)}°N</span>
            <span>•</span>
            <span>{profile.centerCoordinates[1].toFixed(3)}°E</span>
            <span>•</span>
            <span>{profile.catchmentAreaKm2} km²</span>
          </div>

          <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-800/80 text-[10px]">
            <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 font-bold font-mono">
              {liveState.criticalCount} Closed
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-bold font-mono">
              {liveState.cautionCount} Caution
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold font-mono">
              {liveState.evaluatedHotspots.length - liveState.criticalCount - liveState.cautionCount} Clear
            </span>
          </div>
        </div>
      </div>

      {/* Floating Top-Right Basemap Switcher */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 items-end">
        <div className="flex items-center gap-1 p-1 bg-slate-950/85 backdrop-blur-md rounded-2xl border border-slate-800/90 shadow-xl">
          <button
            type="button"
            onClick={() => setBasemapStyle('SATELLITE')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              basemapStyle === 'SATELLITE'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🛰️ Satellite
          </button>
          <button
            type="button"
            onClick={() => setBasemapStyle('DARK')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              basemapStyle === 'DARK'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🗺️ Dark GIS
          </button>
          <button
            type="button"
            onClick={() => setBasemapStyle('STREET')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              basemapStyle === 'STREET'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🏙️ Street
          </button>
        </div>
      </div>

      {/* Floating Bottom Hotspot Quick Selector Pills */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Weather Telemetry Bar */}
        <div className="pointer-events-auto flex items-center gap-2.5 px-3 py-1.5 bg-slate-950/90 backdrop-blur-md rounded-xl border border-slate-800 text-white font-mono text-xs shadow-xl">
          <div className="flex items-center gap-1 text-cyan-400">
            <Droplets className="w-3.5 h-3.5" />
            <span>{rainRateMmH} mm/h</span>
          </div>
          <div className="w-px h-3 bg-slate-800"></div>
          <div className="flex items-center gap-1 text-blue-300">
            <Wind className="w-3.5 h-3.5" />
            <span>{windSpeedKmH} km/h ({windDirDeg}°)</span>
          </div>
        </div>

        {/* Right: Recenter Button */}
        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              if (onSelectHotspot) onSelectHotspot('');
            }}
            className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl border border-slate-700 shadow-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            <span>Reset Camera</span>
          </button>
        </div>
      </div>
    </div>
  );
};
