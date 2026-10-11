/**
 * StationSatelliteMap.tsx
 * SAMVARTAKA AI — High-Definition Satellite Catchment & Municipal GIS Map
 * 
 * Renders an ultra-fast 120 FPS raster satellite map (Esri World Imagery / CartoDB Dark Matter)
 * pinned directly over the selected IMD observatory with real-time critical infrastructure
 * waterlogging beacons, catchment drainage basin perimeter, and click-to-inspect popups.
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

// Custom animated SVG pulse icons for critical urban infrastructure
function createHotspotDivIcon(hotspot: CriticalInfrastructureHotspot, currentDepthCm: number) {
  const isCritical = currentDepthCm >= hotspot.criticalThresholdCm;
  const isCaution = !isCritical && currentDepthCm >= hotspot.criticalThresholdCm * 0.45;

  let color = '#10b981'; // emerald
  let pulseColor = 'rgba(16, 185, 129, 0.4)';
  let label = 'CLEAR';

  if (isCritical) {
    color = '#ef4444'; // red
    pulseColor = 'rgba(239, 68, 68, 0.6)';
    label = 'CRITICAL';
  } else if (isCaution) {
    color = '#f59e0b'; // amber
    pulseColor = 'rgba(245, 158, 11, 0.5)';
    label = 'CAUTION';
  }

  const html = `
    <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
      <div style="
        position: absolute;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: ${pulseColor};
        animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      <div style="
        position: relative;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background-color: ${color};
        border: 2px solid white;
        box-shadow: 0 0 12px ${color};
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 6px; height: 6px; border-radius: 50%; background-color: white;"></div>
      </div>
      <div style="
        position: absolute;
        bottom: -18px;
        white-space: nowrap;
        background: rgba(15, 23, 42, 0.85);
        backdrop-filter: blur(4px);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: ${color};
        font-size: 9px;
        font-weight: 800;
        padding: 1px 4px;
        border-radius: 4px;
        font-family: ui-monospace, monospace;
        letter-spacing: 0.5px;
      ">
        ${label}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-hotspot-pin',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
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
  const [showCatchmentBasin, setShowCatchmentBasin] = useState(true);
  const [showSurchargeRadius, setShowSurchargeRadius] = useState(true);

  // Compute live water depths & states for all hotspots
  const liveState = useMemo(() => {
    return computeLiveHydrologicalState(profile, rainRateMmH, 1.0, surfaceWaterDepthCm);
  }, [profile, rainRateMmH, surfaceWaterDepthCm]);

  // Find currently selected hotspot for camera tracking
  const targetHotspot = useMemo(() => {
    if (!selectedHotspotId) return null;
    return profile.hotspots.find((h) => h.id === selectedHotspotId) || null;
  }, [profile, selectedHotspotId]);

  // Basemap tile definitions
  const tileConfig = useMemo(() => {
    switch (basemapStyle) {
      case 'SATELLITE':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: '&copy; Esri World Imagery, Maxar, Earthstar Geographics',
          maxZoom: 19,
        };
      case 'DARK':
        return {
          url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          attribution: '&copy; CartoDB Dark Matter & OpenStreetMap contributors',
          maxZoom: 19,
        };
      case 'STREET':
      default:
        return {
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        };
    }
  }, [basemapStyle]);

  return (
    <div className="relative w-full h-full min-h-[420px] bg-slate-950 overflow-hidden select-none">
      <MapContainer
        center={profile.centerCoordinates}
        zoom={profile.defaultZoom}
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

        {/* Catchment Watershed Drainage Perimeter Overlay */}
        {showCatchmentBasin && (
          <Circle
            center={profile.centerCoordinates}
            radius={Math.sqrt((profile.catchmentAreaKm2 * 1e6) / Math.PI) * 0.45}
            pathOptions={{
              color: '#38bdf8',
              fillColor: '#0284c7',
              fillOpacity: 0.12,
              weight: 2,
              dashArray: '6, 6',
            }}
          />
        )}

        {/* Drainage Surcharge Critical Inundation Zone (Expands with Rain Intensity) */}
        {showSurchargeRadius && liveState.drainageSurplusMmH > 0 && (
          <Circle
            center={profile.centerCoordinates}
            radius={Math.min(4200, 1200 + liveState.drainageSurplusMmH * 65)}
            pathOptions={{
              color: '#ef4444',
              fillColor: '#dc2626',
              fillOpacity: 0.18,
              weight: 2,
              dashArray: '4, 4',
            }}
          />
        )}

        {/* Critical Infrastructure Hotspot Pinned Markers */}
        {liveState.evaluatedHotspots.map((hotspot) => {
          const icon = createHotspotDivIcon(hotspot, hotspot.currentDepthCm);
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
                <div className="p-3 bg-slate-950 text-white rounded-xl border border-slate-700 shadow-2xl min-w-[240px] font-sans">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
                    <span className="font-bold text-xs text-white leading-tight">
                      {hotspot.name}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold uppercase ${
                        isCritical
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                          : isCaution
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}
                    >
                      {hotspot.statusLabel}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 mb-2 leading-relaxed">
                    {hotspot.locationDescription}
                  </p>

                  <div className="grid grid-cols-2 gap-2 p-2 bg-slate-900/80 rounded-lg border border-slate-800 mb-2.5 font-mono text-xs">
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
                  <div className="mb-2">
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
                    <strong className="text-white block mb-0.5">Tactical Action:</strong>
                    {hotspot.actionProtocol}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Top-Left Aero-Glass HUD: Station Coordinates & Active Hotspots */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 max-w-[280px]">
        <div className="p-3 bg-slate-950/85 backdrop-blur-md rounded-xl border border-slate-700/80 shadow-2xl text-white font-sans">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
              {profile.stationName}
            </span>
          </div>

          <div className="text-[11px] font-mono text-cyan-300 flex items-center gap-2 mb-2">
            <span>{profile.centerCoordinates[0].toFixed(3)}°N</span>
            <span>•</span>
            <span>{profile.centerCoordinates[1].toFixed(3)}°E</span>
            <span>•</span>
            <span>Basin: {profile.catchmentAreaKm2} km²</span>
          </div>

          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80 text-[10px]">
            <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 font-bold font-mono">
              {liveState.criticalCount} Submerged
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

      {/* Floating Top-Right Aero-Glass Basemap & Layer Switcher */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 items-end">
        {/* Basemap Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-950/85 backdrop-blur-md rounded-xl border border-slate-700/80 shadow-xl">
          <button
            type="button"
            onClick={() => setBasemapStyle('SATELLITE')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              basemapStyle === 'STREET'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🏙️ Street
          </button>
        </div>

        {/* Layer Toggles */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/85 backdrop-blur-md rounded-xl border border-slate-700/80 text-[11px] text-slate-300">
          <label className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-900 cursor-pointer">
            <input
              type="checkbox"
              checked={showCatchmentBasin}
              onChange={(e) => setShowCatchmentBasin(e.target.checked)}
              className="accent-cyan-500 rounded"
            />
            <span>Basin Perimeter</span>
          </label>
          <label className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-900 cursor-pointer">
            <input
              type="checkbox"
              checked={showSurchargeRadius}
              onChange={(e) => setShowSurchargeRadius(e.target.checked)}
              className="accent-red-500 rounded"
            />
            <span>Surcharge Zone</span>
          </label>
        </div>
      </div>

      {/* Floating Bottom-Left Weather Telemetry Ticker */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-3 px-3 py-1.5 bg-slate-950/85 backdrop-blur-md rounded-xl border border-slate-700/80 text-white font-mono text-xs shadow-xl">
        <div className="flex items-center gap-1.5 text-cyan-400">
          <Droplets className="w-3.5 h-3.5" />
          <span>{rainRateMmH} mm/h</span>
        </div>
        <div className="w-px h-3 bg-slate-800"></div>
        <div className="flex items-center gap-1.5 text-blue-300">
          <Wind className="w-3.5 h-3.5" />
          <span>{windSpeedKmH} km/h ({windDirDeg}°)</span>
        </div>
        <div className="w-px h-3 bg-slate-800"></div>
        <div className="flex items-center gap-1.5 text-emerald-400">
          <Activity className="w-3.5 h-3.5" />
          <span>Pipe Cap: {profile.gravityDrainageCapacityMmH} mm/h</span>
        </div>
      </div>

      {/* Floating Bottom-Right Recenter Button */}
      <div className="absolute bottom-3 right-3 z-20">
        <button
          type="button"
          onClick={() => {
            if (onSelectHotspot) onSelectHotspot('');
          }}
          className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl border border-slate-700 shadow-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
        >
          <Navigation className="w-3.5 h-3.5 text-cyan-400" />
          <span>Recenter Basin</span>
        </button>
      </div>
    </div>
  );
};
