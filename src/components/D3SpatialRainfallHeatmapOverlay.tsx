import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import * as d3 from 'd3';
import L from 'leaflet';
import { Sliders, Flame, Droplets, Layers, Eye, RefreshCw, Compass } from 'lucide-react';

interface StationInfo {
  id: string;
  name: string;
  lat: number;
  lon: number;
  subdivision: string;
  state: string;
}

interface StationStats {
  count: number;
  obs: number;
  fcst: number;
  ai: number;
}

interface Props {
  stations: StationInfo[];
  stationStats: Record<string, StationStats>;
  opacity?: number;
  seasonPhase?: string;
  onPhaseChange?: (phase: string) => void;
}

// IMD Meteorological Rainfall Intensity Color Scale
export const HEATMAP_COLOR_SCALE = d3.scaleThreshold<number, string>()
  .domain([2.5, 15.5, 35.0, 64.5, 115.5, 204.5])
  .range([
    'rgba(56, 189, 248, 0.15)',   // < 2.5 mm: Very Light / Trace
    'rgba(59, 130, 246, 0.45)',   // 2.5 - 15.5 mm: Light Rain
    'rgba(16, 185, 129, 0.65)',   // 15.5 - 35.0 mm: Moderate Rain
    'rgba(245, 158, 11, 0.80)',   // 35.0 - 64.5 mm: Heavy Rain
    'rgba(239, 68, 68, 0.88)',    // 64.5 - 115.5 mm: Very Heavy Deluge
    'rgba(168, 85, 247, 0.92)',   // 115.5 - 204.5 mm: Extremely Heavy Cloudburst
    'rgba(236, 72, 153, 0.95)',   // > 204.5 mm: Exceptional Flash Flood
  ]);

export const D3SpatialRainfallHeatmapOverlay: React.FC<Props> = ({
  stations,
  stationStats,
  opacity = 0.75,
  seasonPhase = 'Active Peak Trough',
  onPhaseChange,
}) => {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Heatmap Customization States
  const [kernelRadius, setKernelRadius] = useState<number>(110);
  const [showContours, setShowContours] = useState<boolean>(true);
  const [layerOpacity, setLayerOpacity] = useState<number>(opacity);
  const [selectedPhase, setSelectedPhase] = useState<string>(seasonPhase);

  // Inspector State
  const [inspectInfo, setInspectInfo] = useState<{
    x: number;
    y: number;
    lat: number;
    lon: number;
    interpolatedMm: number;
    intensityCategory: string;
    nearestStation: string;
  } | null>(null);

  // Force re-render on map move/zoom
  const [, setMapVersion] = useState(0);
  useEffect(() => {
    const handleUpdate = () => setMapVersion((v) => v + 1);
    map.on('move', handleUpdate);
    map.on('zoom', handleUpdate);
    map.on('viewreset', handleUpdate);
    map.on('resize', handleUpdate);
    return () => {
      map.off('move', handleUpdate);
      map.off('zoom', handleUpdate);
      map.off('viewreset', handleUpdate);
      map.off('resize', handleUpdate);
    };
  }, [map]);

  // Phase Multiplier for seasonal dynamics
  const phaseMultiplier = useMemo(() => {
    if (selectedPhase === 'Early Onset (June)') return 0.7;
    if (selectedPhase === 'Active Peak Trough (July-Aug)') return 1.25;
    if (selectedPhase === 'Late Withdrawal (Sept)') return 0.55;
    return 1.0;
  }, [selectedPhase]);

  // Compute station rainfall data array
  const stationValues = useMemo(() => {
    return stations.map((s) => {
      const stats = stationStats[s.id];
      const baseVal = stats && stats.count > 0 ? stats.ai / stats.count : 15.0;
      const rainfallMm = Math.round(baseVal * phaseMultiplier * 10) / 10;
      return {
        ...s,
        rainfallMm,
      };
    });
  }, [stations, stationStats, phaseMultiplier]);

  // Render Canvas Gaussian Heatmap Layer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = map.getSize();
    canvas.width = size.x;
    canvas.height = size.y;

    ctx.clearRect(0, 0, size.x, size.y);

    if (stationValues.length === 0) return;

    // Create an offscreen buffer for smooth additive heatmap blending
    const offscreen = document.createElement('canvas');
    offscreen.width = size.x;
    offscreen.height = size.y;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    // Scale kernel radius dynamically with map zoom
    const zoom = map.getZoom();
    const effectiveRadius = Math.max(40, kernelRadius * Math.pow(1.2, zoom - 6));

    stationValues.forEach((st) => {
      try {
        const pt = map.latLngToContainerPoint(L.latLng(st.lat, st.lon));
        
        // Skip if way offscreen
        if (pt.x < -effectiveRadius || pt.x > size.x + effectiveRadius || pt.y < -effectiveRadius || pt.y > size.y + effectiveRadius) {
          return;
        }

        // Intensity weight 0.1 to 1.0
        const weight = Math.min(1.0, Math.max(0.08, st.rainfallMm / 120.0));
        const rad = effectiveRadius * (0.6 + weight * 0.6);

        const grad = offCtx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, rad);
        
        // Color based on rainfall magnitude
        const baseColor = HEATMAP_COLOR_SCALE(st.rainfallMm);
        
        grad.addColorStop(0, baseColor);
        grad.addColorStop(0.5, baseColor.replace(/[\d\.]+\)$/, '0.3)'));
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        offCtx.fillStyle = grad;
        offCtx.beginPath();
        offCtx.arc(pt.x, pt.y, rad, 0, Math.PI * 2);
        offCtx.fill();
      } catch {
        // ignore out-of-bounds errors during tile shifts
      }
    });

    // Render offscreen buffer onto main canvas with configured opacity
    ctx.globalAlpha = layerOpacity;
    ctx.drawImage(offscreen, 0, 0);

  }, [map, stationValues, kernelRadius, layerOpacity]);

  // Handle Mouse Hover Inspection on Map Canvas
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    try {
      const latLng = map.containerPointToLatLng(L.point(x, y));
      
      // Inverse Distance Weighting (IDW) interpolation from nearest stations
      let weightedSum = 0;
      let totalWeight = 0;
      let nearestDist = Infinity;
      let nearestName = 'Unknown';

      stationValues.forEach((st) => {
        const dLat = st.lat - latLng.lat;
        const dLon = st.lon - latLng.lng;
        const distSq = dLat * dLat + dLon * dLon;
        const dist = Math.sqrt(distSq);

        if (dist < nearestDist) {
          nearestDist = dist;
          nearestName = st.name;
        }

        // Weight = 1 / (dist^2 + 0.001)
        const w = 1 / (distSq + 0.005);
        weightedSum += st.rainfallMm * w;
        totalWeight += w;
      });

      const interpolatedMm = Math.round((weightedSum / (totalWeight || 1)) * 10) / 10;

      let cat = 'Light / Trace';
      if (interpolatedMm >= 115.5) cat = '⚡ Cloudburst / Extreme Deluge';
      else if (interpolatedMm >= 64.5) cat = '🌧️ Heavy Torrential Rainfall';
      else if (interpolatedMm >= 35.0) cat = '🌦️ Moderate-Heavy Monsoon';
      else if (interpolatedMm >= 15.5) cat = '🌧️ Active Monsoon Spell';

      setInspectInfo({
        x,
        y,
        lat: latLng.lat,
        lon: latLng.lng,
        interpolatedMm,
        intensityCategory: cat,
        nearestStation: nearestName,
      });
    } catch {
      setInspectInfo(null);
    }
  };

  const handleMouseLeave = () => {
    setInspectInfo(null);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-[300]">
      {/* Canvas Heatmap Layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-auto cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/* D3 SVG Isohyet Contour Overlay */}
      {showContours && (
        <svg ref={svgRef} className="absolute inset-0 w-full h-full pointer-events-none">
          {stationValues.map((st) => {
            try {
              const pt = map.latLngToContainerPoint(L.latLng(st.lat, st.lon));
              if (st.rainfallMm < 15.0) return null;

              const contourRadius = Math.min(120, st.rainfallMm * 1.2);
              const color = st.rainfallMm >= 64.5 ? '#ef4444' : st.rainfallMm >= 35.0 ? '#f59e0b' : '#3b82f6';

              return (
                <g key={`isohyet-${st.id}`} transform={`translate(${pt.x}, ${pt.y})`}>
                  {/* Isohyet Ring */}
                  <circle
                    r={contourRadius}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    opacity="0.8"
                  />
                  {/* Station Value Label along Contour */}
                  <rect
                    x={contourRadius - 16}
                    y={-7}
                    width="32"
                    height="14"
                    rx="3"
                    fill="#0f172a"
                    fillOpacity="0.85"
                  />
                  <text
                    x={contourRadius}
                    y="3"
                    fill={color}
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {Math.round(st.rainfallMm)}mm
                  </text>
                </g>
              );
            } catch {
              return null;
            }
          })}
        </svg>
      )}

      {/* Floating Spatial Inspection Cursor Tooltip */}
      {inspectInfo && (
        <div
          className="absolute z-[500] pointer-events-none bg-slate-900/95 backdrop-blur-md text-white p-2.5 rounded-xl border border-blue-500/40 shadow-2xl text-xs font-sans -translate-x-1/2 -translate-y-full mb-3"
          style={{ left: inspectInfo.x, top: inspectInfo.y }}
        >
          <div className="flex items-center gap-1.5 font-bold text-sky-300 text-[11px] border-b border-slate-800 pb-1 mb-1">
            <Droplets className="w-3.5 h-3.5 text-blue-400" />
            <span>Spatial Rainfall Inspector</span>
          </div>
          <div className="text-base font-extrabold font-mono text-white flex items-center gap-1">
            {inspectInfo.interpolatedMm} <span className="text-xs font-normal text-slate-400">mm / 24h</span>
          </div>
          <div className="text-[10px] text-amber-300 font-semibold mt-0.5">
            {inspectInfo.intensityCategory}
          </div>
          <div className="text-[9px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-800/80 flex items-center justify-between gap-3">
            <span>Lat: {inspectInfo.lat.toFixed(2)}° N</span>
            <span>Ref: {inspectInfo.nearestStation}</span>
          </div>
        </div>
      )}

      {/* Floating Interactive Controls HUD Panel for Heatmap */}
      <div className="absolute top-4 left-4 z-[450] pointer-events-auto bg-slate-900/90 backdrop-blur-md text-white rounded-2xl p-3 shadow-2xl border border-blue-500/30 text-xs w-64 space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 font-bold text-white">
            <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Spatial Rainfall Heatmap</span>
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
            D3 IDW
          </span>
        </div>

        {/* Season Phase Selector */}
        <div>
          <label className="text-[10px] text-slate-400 font-semibold block mb-1">Seasonal Phase Simulation:</label>
          <select
            value={selectedPhase}
            onChange={(e) => {
              setSelectedPhase(e.target.value);
              if (onPhaseChange) onPhaseChange(e.target.value);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg text-[11px] px-2 py-1 text-sky-300 font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="Early Onset (June)">Early Onset (June - 70% Base)</option>
            <option value="Active Peak Trough (July-Aug)">Active Peak Trough (July-Aug - 125% Surge)</option>
            <option value="Late Withdrawal (Sept)">Late Withdrawal (Sept - 55% Break)</option>
          </select>
        </div>

        {/* Sliders for Kernel Blur & Opacity */}
        <div className="space-y-2 pt-1 border-t border-slate-800">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-300">Spatial Kernel Radius:</span>
            <span className="font-mono text-cyan-300 font-bold">{kernelRadius}px</span>
          </div>
          <input
            type="range"
            min={50}
            max={200}
            step={5}
            value={kernelRadius}
            onChange={(e) => setKernelRadius(parseInt(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
          />

          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-300">Layer Opacity:</span>
            <span className="font-mono text-cyan-300 font-bold">{Math.round(layerOpacity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.2}
            max={1.0}
            step={0.05}
            value={layerOpacity}
            onChange={(e) => setLayerOpacity(parseFloat(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
          />
        </div>

        {/* Toggle Isohyets Button */}
        <div className="pt-1 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-300 font-semibold">D3 Isohyet Contours:</span>
          <button
            onClick={() => setShowContours(!showContours)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
              showContours
                ? 'bg-blue-600 text-white border border-blue-400'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {showContours ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </div>
  );
};
