import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import * as d3 from 'd3';
import L from 'leaflet';
import { DopplerRadarFrame, RadarSiteId } from '../types';
import { Radio, Play, Pause, Compass, Layers, Zap, Eye, Sliders, Info, ShieldAlert } from 'lucide-react';

export type RadarProduct = 'REFLECTIVITY_DBZ' | 'DIFF_REFLECTIVITY_ZDR' | 'RADIAL_VELOCITY_VR';

interface Props {
  radarSite: {
    id: RadarSiteId;
    name: string;
    lat: number;
    lon: number;
    rangeKm: number;
    frequencyGhz: string;
  };
  frame: DopplerRadarFrame;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onNextFrame?: () => void;
  onPrevFrame?: () => void;
  frameIndex?: number;
  totalFrames?: number;
}

// IMD / WSR-88D Standard Doppler Radar 16-level dBZ Color Scale
export const DBZ_COLOR_SCALE = d3.scaleThreshold<number, string>()
  .domain([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75])
  .range([
    'rgba(0, 0, 0, 0)',        // < 5: Clear Air / Noise
    '#00ffff',                  // 5-10: Light Mist / Fog
    '#00bfff',                  // 10-15: Trace Rain
    '#00ff7f',                  // 15-20: Light Drizzle
    '#00e000',                  // 20-25: Light Rain
    '#00a000',                  // 25-30: Light-to-Moderate Rain
    '#ffff00',                  // 30-35: Moderate Rain
    '#e6b800',                  // 35-40: Moderate-Heavy Rain
    '#ff9900',                  // 40-45: Heavy Rain
    '#ff4500',                  // 45-50: Very Heavy Rain
    '#cc0000',                  // 50-55: Intense Convective Downpour
    '#990000',                  // 55-60: Severe Cloudburst Core
    '#ff00ff',                  // 60-65: Extreme Microburst / Hail Probable
    '#990099',                  // 65-70: Giant Hail Core
    '#ffffff',                  // 70-75: Violent Supercell / Tornado Vortex
    '#e0e7ff',                  // 75+: Extreme Reflectivity Cap
  ]);

// Differential Reflectivity (ZDR, dB) Color Scale (Oblateness / Hydrometeor Shape)
const ZDR_COLOR_SCALE = d3.scaleLinear<string>()
  .domain([-1.0, 0.0, 1.2, 2.5, 4.0, 6.0])
  .range(['#6366f1', '#38bdf8', '#4ade80', '#facc15', '#f97316', '#ef4444']);

// Radial Doppler Velocity (Vr, m/s) Color Scale (Green = Inbound, Red = Outbound)
const VELOCITY_COLOR_SCALE = d3.scaleLinear<string>()
  .domain([-40, -20, 0, 20, 40])
  .range(['#10b981', '#6ee7b7', '#94a3b8', '#fca5a5', '#ef4444']);

// Marshall-Palmer relation: Z = 200 * R^1.6  =>  R = (10^(dBZ/10) / 200)^(1/1.6)
export const dbzToRainRateMmHr = (dbz: number): number => {
  if (dbz < 10) return 0;
  const zLinear = Math.pow(10, dbz / 10);
  const rate = Math.pow(zLinear / 200, 1 / 1.6);
  return Math.round(rate * 10) / 10;
};

// Hydrometeor classification based on dBZ and ZDR
export const classifyHydrometeor = (dbz: number, zdr: number): { type: string; hazard: 'NONE' | 'LOW' | 'MODERATE' | 'SEVERE' | 'EXTREME' } => {
  if (dbz < 10) return { type: 'Clear Air / Boundary Layer', hazard: 'NONE' };
  if (dbz >= 62 && zdr < 1.0) return { type: 'Giant Hail Core / Supercell', hazard: 'EXTREME' };
  if (dbz >= 55) return { type: 'Torrential Tropical Downpour (Microburst)', hazard: 'SEVERE' };
  if (dbz >= 45) return { type: 'Heavy Convective Rain', hazard: 'MODERATE' };
  if (dbz >= 30) return { type: 'Moderate Stratiform Rain', hazard: 'LOW' };
  return { type: 'Light Rain / Drizzle', hazard: 'NONE' };
};

export const D3RadarReflectivityOverlay: React.FC<Props> = ({
  radarSite,
  frame,
  isPlaying = true,
  onTogglePlay,
  onNextFrame,
  onPrevFrame,
  frameIndex = 4,
  totalFrames = 5,
}) => {
  const map = useMap();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const sweepAngleRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // User Interactive States
  const [product, setProduct] = useState<RadarProduct>('REFLECTIVITY_DBZ');
  const [minDbzThreshold, setMinDbzThreshold] = useState<number>(15);
  const [sweepEnabled, setSweepEnabled] = useState<boolean>(true);
  const [showRings, setShowRings] = useState<boolean>(true);
  const [showAzimuthSpokes, setShowAzimuthSpokes] = useState<boolean>(true);
  const [showStormTrack, setShowStormTrack] = useState<boolean>(true);
  const [inspectData, setInspectData] = useState<{
    x: number;
    y: number;
    rangeKm: number;
    azimuthDeg: number;
    dbz: number;
    zdr: number;
    velocityMs: number;
    rainRateMmHr: number;
    hydrometeor: { type: string; hazard: string };
  } | null>(null);

  // Sync with Leaflet view changes (zoom, pan, resize)
  const [, setMapVersion] = useState(0);
  useEffect(() => {
    const handleViewUpdate = () => {
      setMapVersion((v) => v + 1);
    };
    map.on('move', handleViewUpdate);
    map.on('zoom', handleViewUpdate);
    map.on('viewreset', handleViewUpdate);
    map.on('resize', handleViewUpdate);
    return () => {
      map.off('move', handleViewUpdate);
      map.off('zoom', handleViewUpdate);
      map.off('viewreset', handleViewUpdate);
      map.off('resize', handleViewUpdate);
    };
  }, [map]);

  // High-performance rotating radar sweep beam animation (requestAnimationFrame)
  useEffect(() => {
    if (!sweepEnabled) return;

    let lastTimestamp = performance.now();
    const animateSweep = (timestamp: number) => {
      const dt = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      // 3.0 RPM = 18 degrees per second
      sweepAngleRef.current = (sweepAngleRef.current + dt * 42) % 360;

      if (svgRef.current) {
        const sweepG = svgRef.current.querySelector('#d3-radar-sweep-beam');
        if (sweepG) {
          sweepG.setAttribute('transform', `rotate(${sweepAngleRef.current})`);
        }
      }

      animFrameRef.current = requestAnimationFrame(animateSweep);
    };

    animFrameRef.current = requestAnimationFrame(animateSweep);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [sweepEnabled]);

  // Compute Radar Center in Leaflet Container Pixel Coordinates
  const centerPoint = useMemo(() => {
    try {
      const pt = map.latLngToContainerPoint(L.latLng(radarSite.lat, radarSite.lon));
      return { x: pt.x, y: pt.y };
    } catch {
      return { x: 0, y: 0 };
    }
  }, [map, radarSite.lat, radarSite.lon]);

  // Compute dynamic pixel radius for range rings based on current zoom
  const pixelRadiusForKm = useMemo(() => {
    return (km: number) => {
      try {
        // Approximate 1 degree latitude = 111.139 km
        const latOffset = km / 111.139;
        const targetLatLng = L.latLng(radarSite.lat + latOffset, radarSite.lon);
        const targetPt = map.latLngToContainerPoint(targetLatLng);
        return Math.abs(targetPt.y - centerPoint.y);
      } catch {
        return km * 1.5;
      }
    };
  }, [map, radarSite.lat, radarSite.lon, centerPoint.y]);

  const maxRadiusPx = pixelRadiusForKm(radarSite.rangeKm);

  // Generate synthetic polar radar echo sectors based on the active Doppler frame
  const radarEchoGates = useMemo(() => {
    const gates: Array<{
      startAngle: number;
      endAngle: number;
      innerR: number;
      outerR: number;
      dbz: number;
      zdr: number;
      velocityMs: number;
      rangeKm: number;
      azimuthDeg: number;
    }> = [];

    const numAzimuths = 72; // 5-degree angular bins
    const numRangeBins = 25; // 10km radial bins up to 250km
    const stormDirRad = (frame.stormDirectionDeg * Math.PI) / 180;
    const maxDbz = frame.maxReflectivityDbz;

    // Storm cell center offset in polar coords
    const stormCoreDistanceKm = 65 + (frame.sweepMinutesAgo * 0.5);
    const stormCoreAzimuthDeg = (frame.stormDirectionDeg + 180) % 360;

    for (let a = 0; a < numAzimuths; a++) {
      const azDeg = a * 5;
      const azRad = (azDeg * Math.PI) / 180;

      for (let r = 0; r < numRangeBins; r++) {
        const rangeKm = (r + 1) * 10;
        const innerKm = r * 10;
        const outerKm = (r + 1) * 10;

        // Calculate distance from cell core
        const dAz = Math.abs(azDeg - stormCoreAzimuthDeg);
        const angularDist = Math.min(dAz, 360 - dAz);
        const radialDist = Math.abs(rangeKm - stormCoreDistanceKm);

        // Core intensity calculation with squall line distortion
        const coreFactor = Math.exp(-((angularDist * angularDist) / 450 + (radialDist * radialDist) / 900));
        
        // Flanking convective line along storm direction
        const flankAngle = Math.abs(angularDist - 45);
        const flankFactor = Math.exp(-((flankAngle * flankAngle) / 200 + (radialDist * radialDist) / 1600)) * 0.7;

        // Stratiform background rain shield
        const stratiformFactor = (rangeKm < 180 && angularDist < 90) ? 0.35 : 0.05;

        // Combined intensity
        let intensity = Math.max(coreFactor, flankFactor * 0.8, stratiformFactor);
        
        // Add natural turbulence noise
        const noise = (Math.sin(azDeg * 0.4 + rangeKm * 0.15) * Math.cos(azDeg * 0.8) * 0.12);
        intensity = Math.max(0, Math.min(1.0, intensity + noise));

        const echoDbz = Math.round(intensity * maxDbz * 10) / 10;

        // Differential Reflectivity (ZDR): high in heavy rain, low in hail core
        let zdr = 0.5 + (echoDbz / 70) * 3.5;
        if (echoDbz > 60) zdr = 0.3; // Hail signature (tumbling non-spherical hail has low ZDR)

        // Radial Doppler Velocity (Vr): negative = inbound, positive = outbound
        const radialAngle = azRad - stormDirRad;
        const velocityMs = Math.round(Math.cos(radialAngle) * (frame.stormVelocityKmh / 3.6) * 10) / 10;

        if (echoDbz >= minDbzThreshold) {
          gates.push({
            startAngle: azRad,
            endAngle: azRad + (5 * Math.PI) / 180,
            innerR: innerKm,
            outerR: outerKm,
            dbz: echoDbz,
            zdr: Math.round(zdr * 10) / 10,
            velocityMs,
            rangeKm,
            azimuthDeg: azDeg,
          });
        }
      }
    }

    return gates;
  }, [frame, minDbzThreshold]);

  // Dynamic D3 Arc Generator
  const arcGenerator = useMemo(() => {
    return d3.arc<any>()
      .innerRadius((d) => pixelRadiusForKm(d.innerR))
      .outerRadius((d) => pixelRadiusForKm(d.outerR))
      .startAngle((d) => d.startAngle)
      .endAngle((d) => d.endAngle);
  }, [pixelRadiusForKm]);

  // Color lookup helper based on active product
  const getGateColor = (gate: typeof radarEchoGates[0]) => {
    switch (product) {
      case 'DIFF_REFLECTIVITY_ZDR':
        return ZDR_COLOR_SCALE(gate.zdr);
      case 'RADIAL_VELOCITY_VR':
        return VELOCITY_COLOR_SCALE(gate.velocityMs);
      case 'REFLECTIVITY_DBZ':
      default:
        return DBZ_COLOR_SCALE(gate.dbz);
    }
  };

  // Mouse hover query on radar scope
  const handleScopeMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dx = mouseX - centerPoint.x;
    const dy = mouseY - centerPoint.y;
    const pixelDist = Math.sqrt(dx * dx + dy * dy);

    if (pixelDist > maxRadiusPx || pixelDist < 4) {
      setInspectData(null);
      return;
    }

    // Convert pixel distance to approx Km
    const approxKm = (pixelDist / maxRadiusPx) * radarSite.rangeKm;
    
    // Azimuth in standard meteorological degrees (0 = North, 90 = East)
    let azDeg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (azDeg < 0) azDeg += 360;

    // Find closest gate
    const closestGate = radarEchoGates.find(
      (g) => Math.abs(g.rangeKm - approxKm) < 12 && Math.abs(g.azimuthDeg - azDeg) < 8
    );

    const dbz = closestGate ? closestGate.dbz : Math.max(5, Math.round((1 - pixelDist / maxRadiusPx) * 25));
    const zdr = closestGate ? closestGate.zdr : 0.8;
    const velocityMs = closestGate ? closestGate.velocityMs : Math.round(Math.cos(azDeg * Math.PI / 180) * 15);
    const rainRateMmHr = dbzToRainRateMmHr(dbz);
    const hydrometeor = classifyHydrometeor(dbz, zdr);

    setInspectData({
      x: mouseX,
      y: mouseY,
      rangeKm: Math.round(approxKm * 10) / 10,
      azimuthDeg: Math.round(azDeg),
      dbz,
      zdr,
      velocityMs,
      rainRateMmHr,
      hydrometeor,
    });
  };

  // Storm centroid coordinates in pixel space
  const stormCentroidPx = useMemo(() => {
    const stormDistKm = 65;
    const rPx = pixelRadiusForKm(stormDistKm);
    const azRad = ((frame.stormDirectionDeg + 180) * Math.PI) / 180;
    return {
      x: centerPoint.x + Math.sin(azRad) * rPx,
      y: centerPoint.y - Math.cos(azRad) * rPx,
    };
  }, [centerPoint, pixelRadiusForKm, frame.stormDirectionDeg]);

  // Projected Forecast Track Points (+15m, +30m, +45m)
  const forecastTrackPoints = useMemo(() => {
    const points: Array<{ x: number; y: number; label: string; kmh: number }> = [];
    const dirRad = (frame.stormDirectionDeg * Math.PI) / 180;
    const speedKmh = frame.stormVelocityKmh;

    [15, 30, 45].forEach((mins) => {
      const distKm = (speedKmh * mins) / 60;
      const rPx = pixelRadiusForKm(distKm);
      points.push({
        x: stormCentroidPx.x + Math.sin(dirRad) * rPx,
        y: stormCentroidPx.y - Math.cos(dirRad) * rPx,
        label: `+${mins}m`,
        kmh: speedKmh,
      });
    });
    return points;
  }, [stormCentroidPx, frame.stormDirectionDeg, frame.stormVelocityKmh, pixelRadiusForKm]);

  return (
    <div className="absolute inset-0 pointer-events-none z-[450] overflow-hidden">
      {/* SVG Canvas Overlay for D3 Renderings */}
      <svg
        ref={svgRef}
        className="w-full h-full pointer-events-auto"
        onMouseMove={handleScopeMouseMove}
        onMouseLeave={() => setInspectData(null)}
      >
        <defs>
          {/* Glowing Radial Phosphor Gradient for Radar Sweep */}
          <radialGradient id="radar-phosphor-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(56, 189, 248, 0.45)" />
            <stop offset="85%" stopColor="rgba(6, 182, 212, 0.15)" />
            <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
          </radialGradient>

          {/* Sweep Beam Wedge Gradient */}
          <linearGradient id="sweep-wedge-fade" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(0, 240, 255, 0.65)" />
            <stop offset="40%" stopColor="rgba(0, 240, 255, 0.15)" />
            <stop offset="100%" stopColor="rgba(0, 240, 255, 0)" />
          </linearGradient>

          {/* High-Tech Reticle Glow Filter */}
          <filter id="hud-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* RADAR RETICLE & GATES ROOT GROUP */}
        <g transform={`translate(${centerPoint.x}, ${centerPoint.y})`}>
          {/* Outer Boundary Mask Ring */}
          <circle
            r={maxRadiusPx}
            fill="rgba(2, 6, 23, 0.28)"
            stroke="rgba(56, 189, 248, 0.45)"
            strokeWidth="2"
            filter="url(#hud-glow)"
          />

          {/* Concentric Polar Range Rings */}
          {showRings && [50, 100, 150, 200, 250].map((km) => {
            const rPx = pixelRadiusForKm(km);
            if (rPx > maxRadiusPx) return null;
            return (
              <g key={`d3-ring-${km}`}>
                <circle
                  r={rPx}
                  fill="none"
                  stroke="rgba(56, 189, 248, 0.25)"
                  strokeWidth="1"
                  strokeDasharray={km === 250 ? 'none' : '4,5'}
                />
                {/* Distance Label on Cardinal North Line */}
                <text
                  x="4"
                  y={-rPx + 12}
                  fill="rgba(56, 189, 248, 0.8)"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="600"
                  letterSpacing="0.05em"
                >
                  {km}km
                </text>
              </g>
            );
          })}

          {/* Azimuth Radial Spokes (Every 30 degrees) */}
          {showAzimuthSpokes && Array.from({ length: 12 }).map((_, i) => {
            const deg = i * 30;
            const rad = (deg * Math.PI) / 180;
            const x2 = Math.sin(rad) * maxRadiusPx;
            const y2 = -Math.cos(rad) * maxRadiusPx;
            const labelX = Math.sin(rad) * (maxRadiusPx + 14);
            const labelY = -Math.cos(rad) * (maxRadiusPx + 14);

            return (
              <g key={`d3-spoke-${deg}`}>
                <line
                  x1="0"
                  y1="0"
                  x2={x2}
                  y2={y2}
                  stroke="rgba(56, 189, 248, 0.18)"
                  strokeWidth="0.8"
                />
                {/* Cardinal and Degree Labels */}
                <text
                  x={labelX}
                  y={labelY}
                  fill="rgba(148, 163, 184, 0.85)"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : `${deg}°`}
                </text>
              </g>
            );
          })}

          {/* D3 RADAR ECHO GATES (POLAR PIXEL CELLS) */}
          <g id="d3-radar-echo-cells">
            {radarEchoGates.map((gate, idx) => {
              const pathStr = arcGenerator(gate) || '';
              const fill = getGateColor(gate);
              return (
                <path
                  key={`gate-${idx}`}
                  d={pathStr}
                  fill={fill}
                  fillOpacity={0.72}
                  stroke="rgba(0,0,0,0.1)"
                  strokeWidth="0.3"
                  className="transition-opacity duration-150 hover:fill-opacity-95"
                />
              );
            })}
          </g>

          {/* ROTATING PHOSPHOR SWEEP BEAM (HIGH-TECH RETICLE) */}
          {sweepEnabled && (
            <g id="d3-radar-sweep-beam">
              {/* Sweep Trail Arc (trailing 40 degrees) */}
              <path
                d={d3.arc()({
                  innerRadius: 0,
                  outerRadius: maxRadiusPx,
                  startAngle: -((40 * Math.PI) / 180),
                  endAngle: 0,
                }) || ''}
                fill="url(#sweep-wedge-fade)"
                pointerEvents="none"
              />
              {/* Sharp Leading Edge Beam Line */}
              <line
                x1="0"
                y1="0"
                x2="0"
                y2={-maxRadiusPx}
                stroke="#00f0ff"
                strokeWidth="2.2"
                filter="url(#hud-glow)"
                pointerEvents="none"
              />
            </g>
          )}

          {/* RADAR SITE ANTENNA ORIGIN (CENTER HUB) */}
          <circle r="6" fill="#020617" stroke="#38bdf8" strokeWidth="2" />
          <circle r="2.5" fill="#00f0ff" className="animate-ping" />
        </g>

        {/* STORM CELL CENTROID & TRACKING VECTOR (ABSOLUTE COORDINATES) */}
        {showStormTrack && (
          <g id="d3-storm-centroid-track">
            {/* Projected Motion Vectors */}
            <path
              d={`M ${stormCentroidPx.x} ${stormCentroidPx.y} L ${forecastTrackPoints[2]?.x} ${forecastTrackPoints[2]?.y}`}
              stroke="#ff0055"
              strokeWidth="2"
              strokeDasharray="4,4"
              filter="url(#hud-glow)"
            />

            {/* Projected Waypoints */}
            {forecastTrackPoints.map((pt, idx) => (
              <g key={`forecast-pt-${idx}`} transform={`translate(${pt.x}, ${pt.y})`}>
                <circle r="4" fill="#ff0055" fillOpacity="0.6" stroke="#ffffff" strokeWidth="1" />
                <text
                  x="7"
                  y="3"
                  fill="#ffffff"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                  className="bg-black/60 px-1"
                >
                  {pt.label}
                </text>
              </g>
            ))}

            {/* Main Storm Core Centroid Marker */}
            <g transform={`translate(${stormCentroidPx.x}, ${stormCentroidPx.y})`}>
              <polygon
                points="0,-9 8,6 -8,6"
                fill="#ff0055"
                stroke="#ffffff"
                strokeWidth="1.5"
                filter="url(#hud-glow)"
              />
              <circle r="14" fill="none" stroke="#ff0055" strokeWidth="1.2" className="animate-ping opacity-75" />
              <text
                x="12"
                y="-6"
                fill="#ff0055"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
                className="drop-shadow"
              >
                CELL #{radarSite.id}: {frame.maxReflectivityDbz}dBZ
              </text>
            </g>
          </g>
        )}

        {/* INTERACTIVE CROSSHAIR & HOVER RETICLE */}
        {inspectData && (
          <g transform={`translate(${inspectData.x}, ${inspectData.y})`} pointerEvents="none">
            {/* Target Reticle Crosshair */}
            <circle r="16" fill="none" stroke="#00f0ff" strokeWidth="1.2" strokeDasharray="3,3" />
            <circle r="4" fill="#00f0ff" fillOpacity="0.4" stroke="#ffffff" strokeWidth="1" />
            <line x1="-22" y1="0" x2="-8" y2="0" stroke="#00f0ff" strokeWidth="1.5" />
            <line x1="8" y1="0" x2="22" y2="0" stroke="#00f0ff" strokeWidth="1.5" />
            <line x1="0" y1="-22" x2="0" y2="-8" stroke="#00f0ff" strokeWidth="1.5" />
            <line x1="0" y1="8" x2="0" y2="22" stroke="#00f0ff" strokeWidth="1.5" />
          </g>
        )}
      </svg>

      {/* FLOATING HOVER TELEMETRY READOUT TOOLTIP */}
      {inspectData && (
        <div
          className="absolute z-[500] pointer-events-none transition-transform duration-75"
          style={{
            left: `${Math.min(window.innerWidth - 260, inspectData.x + 24)}px`,
            top: `${Math.min(window.innerHeight - 200, inspectData.y - 40)}px`,
          }}
        >
          <div className="bg-slate-950/95 backdrop-blur-xl border border-cyan-500/50 rounded-xl p-3 shadow-2xl text-white font-mono text-xs w-60 space-y-1.5 ring-1 ring-cyan-500/20">
            <div className="flex items-center justify-between border-b border-cyan-500/30 pb-1 text-[11px]">
              <span className="font-bold text-cyan-300 flex items-center gap-1">
                <Compass className="w-3 h-3 text-cyan-400" />
                {inspectData.rangeKm} km @ {inspectData.azimuthDeg}°
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700">
                {radarSite.frequencyGhz}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-slate-400 text-[9px] block">Reflectivity (Z):</span>
                <span className="font-bold text-rose-400 text-sm">{inspectData.dbz} dBZ</span>
              </div>
              <div>
                <span className="text-slate-400 text-[9px] block">Est. Rain Rate (R):</span>
                <span className="font-bold text-amber-300 text-sm">{inspectData.rainRateMmHr} mm/h</span>
              </div>
              <div>
                <span className="text-slate-400 text-[9px] block">Diff. Reflectivity (Zdr):</span>
                <span className="font-semibold text-indigo-300">{inspectData.zdr} dB</span>
              </div>
              <div>
                <span className="text-slate-400 text-[9px] block">Doppler Velocity (Vr):</span>
                <span className={`font-semibold ${inspectData.velocityMs < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {inspectData.velocityMs > 0 ? `+${inspectData.velocityMs}` : inspectData.velocityMs} m/s
                </span>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-1 text-[10px]">
              <span className="text-slate-400 text-[9px] block">Hydrometeor Classification:</span>
              <span className={`font-semibold flex items-center gap-1 ${
                inspectData.hydrometeor.hazard === 'EXTREME' ? 'text-fuchsia-400' :
                inspectData.hydrometeor.hazard === 'SEVERE' ? 'text-rose-400' :
                inspectData.hydrometeor.hazard === 'MODERATE' ? 'text-amber-400' : 'text-sky-300'
              }`}>
                <ShieldAlert className="w-3 h-3" />
                {inspectData.hydrometeor.type}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TOP-RIGHT RADAR CONTROLS & DUAL-POL PRODUCT SELECTOR */}
      <div className="absolute top-3 right-3 z-[500] pointer-events-auto flex flex-col items-end gap-2">
        <div className="bg-slate-950/90 backdrop-blur-xl border border-cyan-500/40 rounded-xl p-2.5 shadow-2xl text-white text-xs max-w-sm">
          {/* Header Title */}
          <div className="flex items-center justify-between gap-3 mb-2 border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
              <div>
                <div className="font-bold text-xs text-cyan-300 leading-none">{radarSite.name}</div>
                <div className="text-[9px] text-slate-400 font-mono">D3 S-Band Dual-Polarization DWR</div>
              </div>
            </div>
            {/* Play/Pause Sweep Timeline */}
            <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
              <button
                onClick={onPrevFrame}
                className="text-slate-400 hover:text-white p-0.5 text-[10px] cursor-pointer"
                title="Previous volume scan"
              >
                ⏮
              </button>
              <button
                onClick={onTogglePlay}
                className="text-cyan-400 hover:text-cyan-200 p-0.5 cursor-pointer"
                title={isPlaying ? 'Pause radar sweep' : 'Resume live sweep'}
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
              <button
                onClick={onNextFrame}
                className="text-slate-400 hover:text-white p-0.5 text-[10px] cursor-pointer"
                title="Next volume scan"
              >
                ⏭
              </button>
              <span className="text-[10px] font-mono text-cyan-300 font-bold px-1">
                {frame.timestamp}
              </span>
            </div>
          </div>

          {/* Dual-Pol Product Selector Pills */}
          <div className="flex items-center gap-1 mb-2">
            <span className="text-[10px] text-slate-400 mr-1">Product:</span>
            <button
              onClick={() => setProduct('REFLECTIVITY_DBZ')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                product === 'REFLECTIVITY_DBZ'
                  ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-400'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Reflectivity (Z)
            </button>
            <button
              onClick={() => setProduct('DIFF_REFLECTIVITY_ZDR')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                product === 'DIFF_REFLECTIVITY_ZDR'
                  ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Diff Refl (Zdr)
            </button>
            <button
              onClick={() => setProduct('RADIAL_VELOCITY_VR')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all cursor-pointer ${
                product === 'RADIAL_VELOCITY_VR'
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              Velocity (Vr)
            </button>
          </div>

          {/* Quick Toggles */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-slate-800/80 pt-1.5">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={sweepEnabled}
                onChange={(e) => setSweepEnabled(e.target.checked)}
                className="accent-cyan-500 rounded"
              />
              <span>Phosphor Sweep</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={showStormTrack}
                onChange={(e) => setShowStormTrack(e.target.checked)}
                className="accent-rose-500 rounded"
              />
              <span>Cell Track Vector</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={showRings}
                onChange={(e) => setShowRings(e.target.checked)}
                className="accent-cyan-500 rounded"
              />
              <span>Range Rings (50km)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={showAzimuthSpokes}
                onChange={(e) => setShowAzimuthSpokes(e.target.checked)}
                className="accent-cyan-500 rounded"
              />
              <span>Azimuth Spokes (30°)</span>
            </label>
          </div>

          {/* dBZ Threshold Filter Slider */}
          <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-400 flex items-center gap-1">
              <Sliders className="w-3 h-3 text-cyan-400" /> Min Gate: {minDbzThreshold} dBZ
            </span>
            <input
              type="range"
              min="5"
              max="45"
              step="5"
              value={minDbzThreshold}
              onChange={(e) => setMinDbzThreshold(Number(e.target.value))}
              className="w-24 accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>

        {/* COMPACT INTERACTIVE COLOR BAR LEGEND */}
        <div className="bg-slate-950/90 backdrop-blur-xl border border-slate-800 rounded-xl p-2 shadow-xl text-white font-mono text-[9px] w-64">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-300 font-bold">
              {product === 'REFLECTIVITY_DBZ'
                ? 'NWS/IMD Reflectivity (dBZ)'
                : product === 'DIFF_REFLECTIVITY_ZDR'
                ? 'Differential Reflectivity Zdr (dB)'
                : 'Radial Doppler Velocity Vr (m/s)'}
            </span>
            <span className="text-cyan-400 font-bold">Hover for Reticle</span>
          </div>

          {product === 'REFLECTIVITY_DBZ' && (
            <div>
              <div className="h-2 rounded-full w-full flex overflow-hidden border border-slate-700">
                {['#00ffff','#00ff7f','#00e000','#ffff00','#ff9900','#ff4500','#cc0000','#990099','#ffffff'].map((c, i) => (
                  <div key={i} className="flex-1" style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="flex justify-between text-[8px] text-slate-400 mt-0.5">
                <span>5 (Mist)</span>
                <span>30 (Rain)</span>
                <span>50 (Downpour)</span>
                <span>65+ (Hail)</span>
              </div>
            </div>
          )}

          {product === 'DIFF_REFLECTIVITY_ZDR' && (
            <div>
              <div className="h-2 rounded-full w-full bg-gradient-to-r from-indigo-500 via-sky-400 via-yellow-400 to-rose-500 border border-slate-700"></div>
              <div className="flex justify-between text-[8px] text-slate-400 mt-0.5">
                <span>-1.0 (Graupel)</span>
                <span>1.5 (Raindrops)</span>
                <span>4.0+ (Large Drops)</span>
              </div>
            </div>
          )}

          {product === 'RADIAL_VELOCITY_VR' && (
            <div>
              <div className="h-2 rounded-full w-full bg-gradient-to-r from-emerald-500 via-slate-400 to-rose-500 border border-slate-700"></div>
              <div className="flex justify-between text-[8px] text-slate-400 mt-0.5">
                <span>-40 m/s (Inbound)</span>
                <span>0 m/s</span>
                <span>+40 m/s (Outbound)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
