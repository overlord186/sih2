import React from 'react';
import { Dropsonde } from './types';
import { X, Activity, Wind, Thermometer, ShieldCheck, Download, Sparkles, Navigation } from 'lucide-react';

interface SkewTSoundingModalProps {
  sonde?: Dropsonde;
  dropsonde?: Dropsonde;
  onClose: () => void;
}

export const SkewTSoundingModal: React.FC<SkewTSoundingModalProps> = ({ sonde: propSonde, dropsonde, onClose }) => {
  const sonde = propSonde || dropsonde;
  if (!sonde) return null;
  const levels = sonde.soundingData;

  // Sounding SVG Geometry calculation
  const width = 440;
  const height = 320;
  const padding = { top: 25, right: 45, bottom: 35, left: 55 };

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  // Pressure log scale from 1000 hPa to 150 hPa
  const minP = 150;
  const maxP = 1013;
  const getY = (p: number) => {
    const logMin = Math.log(minP);
    const logMax = Math.log(maxP);
    const logP = Math.log(Math.max(minP, Math.min(maxP, p)));
    return padding.top + (1 - (logP - logMin) / (logMax - logMin)) * plotH;
  };

  // Temperature scale from -70°C to +40°C
  const minT = -70;
  const maxT = 40;
  const getX = (t: number, p: number) => {
    // Skewing effect: isobar lines are skewed 35 degrees to simulate Skew-T
    const baseNorm = (t - minT) / (maxT - minT);
    const yNorm = (getY(p) - padding.top) / plotH;
    const skewOffset = (1 - yNorm) * 65; // Skew offset
    return padding.left + baseNorm * (plotW - 70) + skewOffset;
  };

  // Generate SVG path strings for Temp and DewPoint
  const tempPath = levels
    .map((l, i) => `${i === 0 ? 'M' : 'L'} ${getX(l.tempC, l.pressureHpa).toFixed(1)} ${getY(l.pressureHpa).toFixed(1)}`)
    .join(' ');

  const dewPath = levels
    .map((l, i) => `${i === 0 ? 'M' : 'L'} ${getX(l.dewPointC, l.pressureHpa).toFixed(1)} ${getY(l.pressureHpa).toFixed(1)}`)
    .join(' ');

  // Standard isobar lines
  const isobars = [1000, 850, 700, 500, 300, 200];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-sky-500/50 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col text-white font-sans">
        {/* Header */}
        <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-sky-950/80 border border-sky-700/60 text-sky-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black tracking-wide text-white uppercase">
                  Atmospheric Sounding Profile (Skew-T / Log-P)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-900/50 text-sky-300 border border-sky-600/40">
                  {sonde.id}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Dropsonde Coordinate: {Math.abs(sonde.lat).toFixed(2)}°{sonde.lat >= 0 ? 'N' : 'S'},{' '}
                {Math.abs(sonde.lon).toFixed(2)}°{sonde.lon >= 0 ? 'E' : 'W'} • Alt: {sonde.currentAltKm.toFixed(1)} km
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
          {/* Key Meteorological Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Surface CAPE</span>
              <div className="text-base font-bold font-mono text-rose-400 flex items-baseline gap-1 mt-0.5">
                <span>{Math.round(sonde.capeJoulesPerKg)}</span>
                <span className="text-[10px] font-normal text-slate-400">J/kg</span>
              </div>
              <span className="text-[9px] text-rose-400 font-medium">
                {sonde.capeJoulesPerKg > 2500 ? 'Extreme Instability' : 'Moderate Convection'}
              </span>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Lifted Index (LI)</span>
              <div className="text-base font-bold font-mono text-amber-400 flex items-baseline gap-1 mt-0.5">
                <span>{sonde.liftedIndex > 0 ? `+${sonde.liftedIndex}` : sonde.liftedIndex}</span>
                <span className="text-[10px] font-normal text-slate-400">°C</span>
              </div>
              <span className="text-[9px] text-amber-300 font-medium">
                {sonde.liftedIndex < -4 ? 'Severe Thunderstorm Threat' : 'Marginal Shear'}
              </span>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Boundary Temp / DP</span>
              <div className="text-base font-bold font-mono text-sky-300 flex items-baseline gap-1 mt-0.5">
                <span>{levels[0]?.tempC || 27}°</span>
                <span className="text-slate-500">/</span>
                <span>{levels[0]?.dewPointC || 24}°C</span>
              </div>
              <span className="text-[9px] text-sky-400 font-medium">High Surface Moisture</span>
            </div>

            <div className="bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/40">
              <span className="text-[10px] text-emerald-300 uppercase font-mono block flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                AI Calibration Gain
              </span>
              <div className="text-base font-bold font-mono text-emerald-400 flex items-baseline gap-1 mt-0.5">
                <span>+{sonde.verificationConfidenceBoost}%</span>
              </div>
              <span className="text-[9px] text-emerald-300/90 font-medium">Model Bias Reduced</span>
            </div>
          </div>

          {/* Skew-T Thermodynamic Chart Display */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col items-center">
            <div className="w-full flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1 px-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-rose-400">
                  <span className="w-2.5 h-0.5 bg-rose-400 inline-block" />
                  Temperature (T)
                </span>
                <span className="flex items-center gap-1 text-sky-400">
                  <span className="w-2.5 h-0.5 bg-sky-400 inline-block" />
                  Dew Point (Td)
                </span>
              </div>
              <span className="text-slate-500">Isobars: hPa (Logarithmic)</span>
            </div>

            <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-h-72 select-none">
              {/* Background grid isobars */}
              {isobars.map((p) => {
                const y = getY(p);
                return (
                  <g key={p}>
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
                      {p}
                    </text>
                  </g>
                );
              })}

              {/* Freezing 0°C Isotherm Reference */}
              <line
                x1={getX(0, 1000)}
                y1={getY(1000)}
                x2={getX(0, 150)}
                y2={getY(150)}
                stroke="#06b6d4"
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity="0.45"
              />
              <text
                x={getX(0, 1000) + 4}
                y={getY(1000) - 4}
                fill="#06b6d4"
                fontSize="8"
                fontFamily="monospace"
              >
                0°C Freezing
              </text>

              {/* Temperature Curve */}
              <path d={tempPath} fill="none" stroke="#f43f5e" strokeWidth="2.4" strokeLinecap="round" />

              {/* Dew Point Curve */}
              <path d={dewPath} fill="none" stroke="#38bdf8" strokeWidth="2.4" strokeLinecap="round" />

              {/* Wind Barb Column on the Right Margin */}
              {levels.map((lvl) => {
                const y = getY(lvl.pressureHpa);
                const xBarb = width - padding.right + 18;
                return (
                  <g key={lvl.pressureHpa} transform={`translate(${xBarb}, ${y})`}>
                    <circle r="2" fill="#94a3b8" />
                    <line x1="0" y1="0" x2="-14" y2="0" stroke="#94a3b8" strokeWidth="1.2" />
                    {/* Barb flags */}
                    {lvl.windSpeedKmH > 40 && (
                      <line x1="-12" y1="0" x2="-12" y2="-6" stroke="#38bdf8" strokeWidth="1.2" />
                    )}
                    {lvl.windSpeedKmH > 70 && (
                      <line x1="-8" y1="0" x2="-8" y2="-6" stroke="#38bdf8" strokeWidth="1.2" />
                    )}
                    <text x="5" y="3" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                      {Math.round(lvl.windSpeedKmH / 1.852)}kt
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Sounding Telemetry Data Table Slice */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-[11px] font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-1.5 px-3">Altitude</th>
                  <th className="py-1.5 px-3">Pressure</th>
                  <th className="py-1.5 px-3">Temp (T)</th>
                  <th className="py-1.5 px-3">Dew Pt (Td)</th>
                  <th className="py-1.5 px-3">Rel Hum</th>
                  <th className="py-1.5 px-3">Wind Speed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 text-slate-300">
                {levels.slice(0, 5).map((l, i) => (
                  <tr key={i} className="hover:bg-slate-800/40">
                    <td className="py-1.5 px-3 text-sky-300 font-bold">{l.altKm.toFixed(1)} km</td>
                    <td className="py-1.5 px-3">{l.pressureHpa} hPa</td>
                    <td className="py-1.5 px-3 text-rose-400">{l.tempC.toFixed(1)}°C</td>
                    <td className="py-1.5 px-3 text-sky-400">{l.dewPointC.toFixed(1)}°C</td>
                    <td className="py-1.5 px-3">{l.rhPct}%</td>
                    <td className="py-1.5 px-3 font-semibold">{l.windSpeedKmH} km/h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Atmospheric observation ingested into SAMVARTAKA model ensemble
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 font-bold text-white transition-colors"
          >
            Close Sounding
          </button>
        </div>
      </div>
    </div>
  );
};
