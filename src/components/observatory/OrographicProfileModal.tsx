import React, { useState } from 'react';
import { OrographicTransect } from './types';
import { X, Mountain, CloudRain, Wind, ArrowRight, Layers, Sliders, Info, ShieldCheck } from 'lucide-react';

interface OrographicProfileModalProps {
  onClose: () => void;
  elevationMultiplier: number;
  onChangeElevationMultiplier: (mult: number) => void;
}

export const OROGRAPHIC_TRANSECTS: OrographicTransect[] = [
  {
    id: 'WESTERN_GHATS',
    title: 'Western Ghats Orographic Barrier Transect',
    subtitle: 'Arabian Sea → Mumbai Coast → Mahabaleshwar Crest → Pune Rain Shadow',
    description: 'Maritime monsoon westerlies hit the sheer 1,400m Western Ghats escarpment. Intense orographic forced ascent produces torrential cloudbursts at the crest (Mahabaleshwar: ~5,800 mm/year), followed by catastrophic adiabatic rain-shadow drying just 60 km inland at Pune (~700 mm/year).',
    totalDistanceKm: 180,
    maxElevationM: 1353,
    peakRainMm: 112.5,
    windwardStation: 'Mumbai / Mahabaleshwar (Windward Deluge)',
    leewardStation: 'Pune Shivajinagar (Leeward Rain Shadow)',
    rainShadowReductionPct: 83.2,
    waypoints: [
      { name: 'Open Arabian Sea', lat: 18.9, lon: 71.8, elevM: 0, baseRainMm: 35, orographicRainMm: 35, terrainType: 'Coastal Ocean', moistureCondensationPct: 40 },
      { name: 'Mumbai Santacruz Coast', lat: 19.07, lon: 72.87, elevM: 14, baseRainMm: 45, orographicRainMm: 68, terrainType: 'Coastal Ocean', moistureCondensationPct: 65 },
      { name: 'Karjat Foothills', lat: 18.91, lon: 73.32, elevM: 120, baseRainMm: 45, orographicRainMm: 85, terrainType: 'Windward Ghats Crest', moistureCondensationPct: 80 },
      { name: 'Khandala / Lonavala Pass', lat: 18.75, lon: 73.40, elevM: 620, baseRainMm: 45, orographicRainMm: 104, terrainType: 'Windward Ghats Crest', moistureCondensationPct: 95 },
      { name: 'Mahabaleshwar Ghats Crest', lat: 17.92, lon: 73.65, elevM: 1353, baseRainMm: 45, orographicRainMm: 138, terrainType: 'Windward Ghats Crest', moistureCondensationPct: 100 },
      { name: 'Panchgani Escarpment Lee', lat: 17.92, lon: 73.80, elevM: 1293, baseRainMm: 40, orographicRainMm: 52, terrainType: 'Leeward Plateau', moistureCondensationPct: 58 },
      { name: 'Shirwal Dry Basin', lat: 18.13, lon: 74.00, elevM: 610, baseRainMm: 35, orographicRainMm: 24, terrainType: 'Leeward Plateau', moistureCondensationPct: 35 },
      { name: 'Pune Shivajinagar Rain Shadow', lat: 18.52, lon: 73.85, elevM: 560, baseRainMm: 30, orographicRainMm: 18.5, terrainType: 'Leeward Plateau', moistureCondensationPct: 28 },
    ],
  },
  {
    id: 'CHERRAPUNJI_HIMALAYA',
    title: 'Meghalaya Funnel & Himalayan Ramp Transect',
    subtitle: 'Bay of Bengal → Sylhet Basin → Cherrapunji Plateau → Brahmaputra Valley',
    description: 'Southerly monsoon surges funneled between the Garo and Khasi Hills are thrust vertically up a 1,300m vertical cliff, creating the wettest place on Earth (Cherrapunji / Mawsynram: ~11,800 mm/year).',
    totalDistanceKm: 220,
    maxElevationM: 1480,
    peakRainMm: 165.0,
    windwardStation: 'Cherrapunji (Sohra Plateau)',
    leewardStation: 'Guwahati / Brahmaputra Trench',
    rainShadowReductionPct: 78.5,
    waypoints: [
      { name: 'Bay of Bengal Head', lat: 21.5, lon: 90.0, elevM: 0, baseRainMm: 40, orographicRainMm: 40, terrainType: 'Coastal Ocean', moistureCondensationPct: 45 },
      { name: 'Sylhet Floodplains', lat: 24.8, lon: 91.8, elevM: 25, baseRainMm: 48, orographicRainMm: 72, terrainType: 'Coastal Ocean', moistureCondensationPct: 70 },
      { name: 'Shella Foothill Choke', lat: 25.1, lon: 91.6, elevM: 180, baseRainMm: 50, orographicRainMm: 110, terrainType: 'Windward Ghats Crest', moistureCondensationPct: 88 },
      { name: 'Cherrapunji Sohra Cliff', lat: 25.27, lon: 91.73, elevM: 1313, baseRainMm: 55, orographicRainMm: 175, terrainType: 'Windward Ghats Crest', moistureCondensationPct: 100 },
      { name: 'Shillong Plateau Peak', lat: 25.57, lon: 91.88, elevM: 1480, baseRainMm: 45, orographicRainMm: 85, terrainType: 'Leeward Plateau', moistureCondensationPct: 62 },
      { name: 'Umiam Descending Lee', lat: 25.65, lon: 91.90, elevM: 980, baseRainMm: 35, orographicRainMm: 42, terrainType: 'Leeward Plateau', moistureCondensationPct: 42 },
      { name: 'Guwahati Brahmaputra Valley', lat: 26.18, lon: 91.74, elevM: 54, baseRainMm: 30, orographicRainMm: 28, terrainType: 'Valley Trench', moistureCondensationPct: 32 },
    ],
  },
];

export const OrographicProfileModal: React.FC<OrographicProfileModalProps> = ({
  onClose,
  elevationMultiplier,
  onChangeElevationMultiplier,
}) => {
  const [selectedTransectIndex, setSelectedTransectIndex] = useState<number>(0);
  const transect = OROGRAPHIC_TRANSECTS[selectedTransectIndex];

  // SVG Geometry for Orographic Cross-Section
  const width = 560;
  const height = 280;
  const padding = { top: 35, right: 35, bottom: 45, left: 60 };

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const maxElev = transect.maxElevationM * 1.15;
  const maxRain = transect.peakRainMm * 1.2;

  const wps = transect.waypoints;

  // Ground elevation path
  const elevPath = wps
    .map((wp, idx) => {
      const x = padding.left + (idx / (wps.length - 1)) * plotW;
      const y = padding.top + (1 - (wp.elevM * (elevationMultiplier / 2)) / maxElev) * plotH;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  // Ground polygon fill
  const groundPolygon = `${elevPath} L ${padding.left + plotW} ${padding.top + plotH} L ${padding.left} ${padding.top + plotH} Z`;

  // Rainfall curve path
  const rainPath = wps
    .map((wp, idx) => {
      const x = padding.left + (idx / (wps.length - 1)) * plotW;
      const y = padding.top + (1 - wp.orographicRainMm / maxRain) * (plotH * 0.85);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-sky-500/50 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col text-white font-sans">
        {/* Header */}
        <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-emerald-400">
              <Mountain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black tracking-wide text-white uppercase">
                  Orographic Cross-Section & Rain Shadow Analyzer
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-900/50 text-emerald-300 border border-emerald-600/40">
                  {elevationMultiplier}x 3D Topography
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                {transect.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Transect Switcher & Elevation Exaggeration Slider */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5">
              {OROGRAPHIC_TRANSECTS.map((t, idx) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTransectIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedTransectIndex === idx
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {t.title.split(' ')[0]} {t.title.split(' ')[1]}
                </button>
              ))}
            </div>

            {/* Elevation Multiplier Slider */}
            <div className="flex items-center gap-2.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-slate-400">Elevation Multiplier:</span>
              {[1.0, 2.0, 3.5, 5.0].map((m) => (
                <button
                  key={m}
                  onClick={() => onChangeElevationMultiplier(m)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    elevationMultiplier === m
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-400 hover:text-white bg-slate-800'
                  }`}
                >
                  {m}x
                </button>
              ))}
            </div>
          </div>

          {/* Meteorological Physics Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Windward Peak Deluge</span>
              <div className="text-base font-bold font-mono text-sky-400 mt-0.5">
                {transect.peakRainMm} mm/24h
              </div>
              <span className="text-[9px] text-slate-400">{transect.windwardStation}</span>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Leeward Rain Shadow</span>
              <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
                -{transect.rainShadowReductionPct}% Reduction
              </div>
              <span className="text-[9px] text-slate-400">{transect.leewardStation}</span>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Thermodynamic Mechanism</span>
              <div className="text-xs font-bold text-emerald-300 mt-1 flex items-center gap-1">
                <span>Adiabatic Ascent → Lee Warming</span>
              </div>
              <span className="text-[9px] text-slate-400">Foehn Effect ~4.5°C drying</span>
            </div>
          </div>

          {/* SVG Terrain vs Rainfall Cross Section */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col items-center">
            <div className="w-full flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1 px-2">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Mountain className="w-3.5 h-3.5" />
                Terrain Relief (m)
              </span>
              <span className="flex items-center gap-1.5 text-sky-300 font-bold">
                <CloudRain className="w-3.5 h-3.5" />
                Precipitation Rate (mm/24h)
              </span>
            </div>

            <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-h-72 select-none">
              <defs>
                <linearGradient id="terrainGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity="0.8" />
                  <stop offset="40%" stopColor="#1e293b" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
                </linearGradient>
                <linearGradient id="rainFillGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {[0, 400, 800, 1200].map((elev) => {
                const y = padding.top + (1 - (elev * (elevationMultiplier / 2)) / maxElev) * plotH;
                return (
                  <g key={elev}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={width - padding.right}
                      y2={y}
                      stroke="#334155"
                      strokeDasharray="2,2"
                      strokeWidth="0.8"
                    />
                    <text
                      x={padding.left - 6}
                      y={y + 3}
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {elev}m
                    </text>
                  </g>
                );
              })}

              {/* Ground Terrain Mesh Fill & Outline */}
              <path d={groundPolygon} fill="url(#terrainGrad)" />
              <path d={elevPath} fill="none" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" />

              {/* Rainfall Rate Curve */}
              <path d={rainPath} fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeDasharray="4,2" />

              {/* Waypoint stations */}
              {wps.map((wp, idx) => {
                const x = padding.left + (idx / (wps.length - 1)) * plotW;
                const y = padding.top + (1 - (wp.elevM * (elevationMultiplier / 2)) / maxElev) * plotH;
                const isCrest = wp.terrainType === 'Windward Ghats Crest';
                return (
                  <g key={wp.name} transform={`translate(${x}, ${y})`}>
                    <circle r={isCrest ? 5 : 3.5} fill={isCrest ? '#ef4444' : '#10b981'} stroke="#ffffff" strokeWidth="1" />
                    <text
                      x="0"
                      y="18"
                      fill="#cbd5e1"
                      fontSize="8"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="font-bold"
                    >
                      {wp.name.split(' ')[0]}
                    </text>
                    <text
                      x="0"
                      y="26"
                      fill="#38bdf8"
                      fontSize="7.5"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {wp.orographicRainMm}mm
                    </text>
                  </g>
                );
              })}

              {/* Moisture Flow Inflow Direction Arrows */}
              <g transform={`translate(${padding.left + 25}, ${padding.top + 25})`}>
                <text x="0" y="0" fill="#38bdf8" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                  Monsoon Maritime Moisture (Westerlies) ➔
                </text>
              </g>
            </svg>
          </div>

          <p className="text-xs text-slate-400 font-sans leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            {transect.description}
          </p>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Topographic displacement active across 3D Earth terrain mesh
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-white transition-colors"
          >
            Close Transect Analyzer
          </button>
        </div>
      </div>
    </div>
  );
};
