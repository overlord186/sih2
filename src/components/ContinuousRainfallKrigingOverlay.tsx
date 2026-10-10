import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Sparkles,
  Droplets,
  Sliders,
  Layers,
  Mountain,
  CheckCircle2,
  Info,
  Maximize2,
  Activity,
  Compass,
} from 'lucide-react';
import {
  generateUniversalKrigingSurface,
  KrigingSpatialAnalysis,
  KrigingGridPoint,
  IMD_RAINFALL_TIERS,
  haversineDistanceKm,
} from '../ml/krigingSurfaceEngine';

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
}

export const ContinuousRainfallKrigingOverlay: React.FC<Props> = ({
  stations,
  stationStats,
  opacity = 0.78,
}) => {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Configuration controls
  const [gridRes, setGridRes] = useState<number>(32); // 24, 32, 44
  const [layerOpacity, setLayerOpacity] = useState<number>(opacity);
  const [showIsohyetBands, setShowIsohyetBands] = useState<boolean>(true);
  const [showGridPoints, setShowGridPoints] = useState<boolean>(false);
  const [elevationDriftActive, setElevationDriftActive] = useState<boolean>(true);

  // Mouse inspector state
  const [inspectInfo, setInspectInfo] = useState<{
    x: number;
    y: number;
    lat: number;
    lon: number;
    rainfallMm: number;
    uncertaintyMm: number;
    elevationM: number;
    isOrographic: boolean;
    tierLabel: string;
  } | null>(null);

  // Force map re-render trigger on pan/zoom
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

  // Build station rainfall lookup map
  const stationRainfallMap = useMemo(() => {
    const mapObj: Record<string, number> = {};
    for (const st of stations) {
      const stats = stationStats[st.id];
      if (stats && stats.count > 0) {
        mapObj[st.id] = stats.ai / stats.count;
      }
    }
    return mapObj;
  }, [stations, stationStats]);

  // Compute Universal Kriging Surface Analysis
  const krigingAnalysis: KrigingSpatialAnalysis = useMemo(() => {
    return generateUniversalKrigingSurface(stationRainfallMap, {
      rows: gridRes,
      cols: gridRes,
    });
  }, [stationRainfallMap, gridRes]);

  // Render Continuous Kriging Surface on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = map.getSize();
    canvas.width = size.x;
    canvas.height = size.y;
    ctx.clearRect(0, 0, size.x, size.y);

    const { grid, rows, cols } = krigingAnalysis;
    if (!grid || grid.length === 0) return;

    // Offscreen buffer for crisp continuous rendering
    const offscreen = document.createElement('canvas');
    offscreen.width = size.x;
    offscreen.height = size.y;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    // Transform grid points to screen coordinates
    const screenGrid: Array<Array<{ x: number; y: number; rain: number; color: string } | null>> = [];

    for (let r = 0; r < rows; r++) {
      const rowArr: Array<{ x: number; y: number; rain: number; color: string } | null> = [];
      for (let c = 0; c < cols; c++) {
        const pt = grid[r][c];
        try {
          const latLng = L.latLng(pt.lat, pt.lon);
          const screenPt = map.latLngToContainerPoint(latLng);
          rowArr.push({
            x: screenPt.x,
            y: screenPt.y,
            rain: pt.rainfallMm,
            color: pt.color,
          });
        } catch {
          rowArr.push(null);
        }
      }
      screenGrid.push(rowArr);
    }

    // Render continuous quad patches with smooth bilinear color shading
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const p00 = screenGrid[r][c];
        const p10 = screenGrid[r + 1][c];
        const p11 = screenGrid[r + 1][c + 1];
        const p01 = screenGrid[r][c + 1];

        if (!p00 || !p10 || !p11 || !p01) continue;

        // Skip quads entirely offscreen
        const minX = Math.min(p00.x, p10.x, p11.x, p01.x);
        const maxX = Math.max(p00.x, p10.x, p11.x, p01.x);
        const minY = Math.min(p00.y, p10.y, p11.y, p01.y);
        const maxY = Math.max(p00.y, p10.y, p11.y, p01.y);

        if (maxX < 0 || minX > size.x || maxY < 0 || minY > size.y) {
          continue;
        }

        const avgRain = (p00.rain + p10.rain + p11.rain + p01.rain) / 4;

        // Draw quad polygon
        offCtx.beginPath();
        offCtx.moveTo(p00.x, p00.y);
        offCtx.lineTo(p10.x, p10.y);
        offCtx.lineTo(p11.x, p11.y);
        offCtx.lineTo(p01.x, p01.y);
        offCtx.closePath();

        // Color based on continuous IMD gradient
        offCtx.fillStyle = p00.color;
        offCtx.fill();

        // Subtle isohyet contour strokes if enabled
        if (showIsohyetBands && avgRain > 15.5) {
          offCtx.lineWidth = avgRain > 115.5 ? 1.4 : 0.6;
          offCtx.strokeStyle = avgRain > 115.5 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.15)';
          offCtx.stroke();
        }
      }
    }

    // Optional discrete grid points for spatial verification
    if (showGridPoints) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const p = screenGrid[r][c];
          if (p && p.x >= 0 && p.x <= size.x && p.y >= 0 && p.y <= size.y) {
            offCtx.beginPath();
            offCtx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
            offCtx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            offCtx.fill();
          }
        }
      }
    }

    // Blend to target canvas with layer opacity
    ctx.globalAlpha = layerOpacity;
    ctx.drawImage(offscreen, 0, 0);
  }, [map, krigingAnalysis, layerOpacity, showIsohyetBands, showGridPoints]);

  // Handle Mouse Hover Inspection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    try {
      const latLng = map.containerPointToLatLng(L.point(x, y));
      const { grid, rows, cols } = krigingAnalysis;

      let closestPt: KrigingGridPoint | null = null;
      let minDistance = Infinity;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const pt = grid[r][c];
          const distKm = haversineDistanceKm(latLng.lat, latLng.lng, pt.lat, pt.lon);
          if (distKm < minDistance) {
            minDistance = distKm;
            closestPt = pt;
          }
        }
      }

      // Maximum inspection radius 180 km
      if (closestPt && minDistance < 180) {
        let tierLabel = 'Dry / Trace (< 2.5 mm)';
        for (const tier of IMD_RAINFALL_TIERS) {
          if (closestPt.rainfallMm >= tier.thresholdMm) {
            tierLabel = tier.label;
          }
        }

        setInspectInfo({
          x,
          y,
          lat: latLng.lat,
          lon: latLng.lng,
          rainfallMm: closestPt.rainfallMm,
          uncertaintyMm: closestPt.uncertaintyStdMm,
          elevationM: closestPt.elevationM,
          isOrographic: closestPt.isOrographicLiftActive,
          tierLabel,
        });
      } else {
        setInspectInfo(null);
      }
    } catch {
      setInspectInfo(null);
    }
  };

  const handleMouseLeave = () => {
    setInspectInfo(null);
  };

  return (
    <div className="leaflet-top leaflet-left w-full h-full pointer-events-none z-[400] relative">
      {/* High-Performance Canvas Surface */}
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="absolute inset-0 pointer-events-auto cursor-crosshair"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Floating Inspection Tooltip */}
      {inspectInfo && (
        <div
          className="absolute z-[500] pointer-events-none bg-slate-950/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl shadow-2xl border border-cyan-500/40 text-xs transform -translate-x-1/2 -translate-y-full mb-3 min-w-[210px] animate-fade-in"
          style={{ left: inspectInfo.x, top: inspectInfo.y }}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1.5">
            <span className="font-bold text-cyan-400 flex items-center gap-1 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              Universal Kriging Estimate
            </span>
            <span className="text-[9px] font-mono text-slate-400">Matérn ν=1.5</span>
          </div>

          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-xl font-black text-white font-mono">
              {inspectInfo.rainfallMm.toFixed(1)}
            </span>
            <span className="text-xs text-slate-300 font-medium">mm / 24h</span>
            <span className="text-[10px] text-cyan-300 font-mono ml-auto">
              ±{inspectInfo.uncertaintyMm.toFixed(1)} mm σ
            </span>
          </div>

          <div className="text-[10px] font-semibold text-amber-300 mb-1">
            {inspectInfo.tierLabel}
          </div>

          <div className="pt-1.5 border-t border-slate-800/80 text-[9px] text-slate-400 font-mono flex flex-col gap-0.5">
            <div className="flex justify-between">
              <span>Coords:</span>
              <span className="text-slate-200">
                {inspectInfo.lat.toFixed(2)}°N, {inspectInfo.lon.toFixed(2)}°E
              </span>
            </div>
            <div className="flex justify-between">
              <span>Topography / Drift:</span>
              <span className={inspectInfo.isOrographic ? 'text-emerald-300 font-bold' : 'text-slate-300'}>
                {inspectInfo.elevationM}m {inspectInfo.isOrographic ? '(Orographic Uplift Active)' : ''}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating HUD Control Panel */}
      <div className="absolute top-4 left-4 z-[450] pointer-events-auto bg-slate-950/92 backdrop-blur-md text-white rounded-2xl p-3.5 shadow-2xl border border-cyan-500/30 text-xs w-72 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div>
              <div className="font-bold text-white text-[12px] leading-tight">Universal Kriging Surface</div>
              <div className="text-[9px] text-cyan-300/80 font-mono">Gaussian Process Downscaling</div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
            C¹ Smooth
          </span>
        </div>

        {/* Spatial Smoothness Metric (Moran's I) */}
        <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 flex items-center gap-1 font-medium">
              <Activity className="w-3 h-3 text-cyan-400" />
              Moran's I Autocorrelation:
            </span>
            <span className="font-mono text-cyan-300 font-extrabold text-[12px]">
              {krigingAnalysis.moransISpatialAutocorrelation.toFixed(3)}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${krigingAnalysis.spatialSmoothnessScore}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
            <span>Spatial Smoothness: {krigingAnalysis.spatialSmoothnessScore}%</span>
            <span>Domain: Subcontinent</span>
          </div>
        </div>

        {/* Resolution Selector */}
        <div>
          <label className="text-[10px] text-slate-400 font-semibold block mb-1">
            GP Grid Matrix Resolution:
          </label>
          <div className="grid grid-cols-3 gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            {[
              { val: 24, label: '24×24 (Fast)' },
              { val: 32, label: '32×32 (Standard)' },
              { val: 44, label: '44×44 (Ultra-Hi)' },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setGridRes(opt.val)}
                className={`py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  gridRes === opt.val
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders: Opacity */}
        <div className="space-y-1.5 pt-1 border-t border-slate-800">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-300">Surface Opacity:</span>
            <span className="font-mono text-cyan-300 font-bold">{Math.round(layerOpacity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.2}
            max={1.0}
            step={0.05}
            value={layerOpacity}
            onChange={(e) => setLayerOpacity(parseFloat(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer h-1 bg-slate-800 rounded-lg"
          />
        </div>

        {/* Feature Toggles */}
        <div className="pt-1 border-t border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-300">Orographic Elevation Drift:</span>
            <button
              onClick={() => setElevationDriftActive(!elevationDriftActive)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                elevationDriftActive
                  ? 'bg-emerald-600 text-white border border-emerald-400'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {elevationDriftActive ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-300">Isohyet Contour Bands:</span>
            <button
              onClick={() => setShowIsohyetBands(!showIsohyetBands)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                showIsohyetBands
                  ? 'bg-cyan-600 text-white border border-cyan-400'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {showIsohyetBands ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-300">GP Sample Points:</span>
            <button
              onClick={() => setShowGridPoints(!showGridPoints)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                showGridPoints
                  ? 'bg-cyan-600 text-white border border-cyan-400'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {showGridPoints ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* IMD Rainfall Tier Coverage Breakdown */}
        <div className="pt-2 border-t border-slate-800">
          <div className="text-[10px] text-slate-400 font-bold mb-1 flex items-center justify-between">
            <span>IMD Tier Area Distribution:</span>
            <span className="font-mono text-[9px] text-slate-500">Subcontinent %</span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[9px] font-mono">
            {krigingAnalysis.contourLevels.map((lvl, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800"
              >
                <div className="flex items-center gap-1 truncate">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: lvl.strokeColor }}
                  />
                  <span className="truncate text-slate-300">{lvl.label.split(' ')[0]}</span>
                </div>
                <span className="text-cyan-300 font-bold ml-1">{lvl.areaPercentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
