/**
 * StationCatchmentDashboard.tsx
 * SAMVARTAKA AI — High-Density Operational Hydrological Catchment & Critical Infrastructure Dashboard
 * 
 * Provides 120 FPS decision-grade civil defense intelligence:
 * 1. Municipal drainage surcharge calculator (Q_rain vs Q_pipe capacity)
 * 2. Critical urban infrastructure waterlogging hotspot matrix (Milan Subway, Airport Runways, Expressways)
 * 3. Dynamic Horton soil infiltration capacity vs excess sheet runoff hydrograph
 * 4. Actionable disaster mitigation protocols and automated diversion directives
 */

import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  Droplet,
  Waves,
  Navigation,
  Compass,
  ArrowUpRight,
  Gauge,
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle,
  Truck,
  Plane,
  Building,
  Info,
} from 'lucide-react';
import { StationCatchmentProfile, computeLiveHydrologicalState } from '../../../data/stationCatchments';

interface StationCatchmentDashboardProps {
  catchment: StationCatchmentProfile;
  rainRateMmH: number;
  surfaceWaterDepthCm: number;
  elapsedSimMinutes: number;
  windSpeedKmH: number;
  windDirDeg: number;
  selectedHotspotId?: string | null;
  onSelectHotspot?: (hotspotId: string) => void;
}

export const StationCatchmentDashboard: React.FC<StationCatchmentDashboardProps> = ({
  catchment,
  rainRateMmH,
  surfaceWaterDepthCm,
  elapsedSimMinutes,
  windSpeedKmH,
  windDirDeg,
  selectedHotspotId,
  onSelectHotspot,
}) => {
  const hydroState = useMemo(() => {
    return computeLiveHydrologicalState(
      catchment,
      rainRateMmH,
      Math.max(0.1, elapsedSimMinutes / 60),
      surfaceWaterDepthCm
    );
  }, [catchment, rainRateMmH, surfaceWaterDepthCm, elapsedSimMinutes]);

  // Generate coordinates for SVG Horton Infiltration Hydrograph
  const hydrographPoints = useMemo(() => {
    const points: { t: number; infiltration: number; rain: number }[] = [];
    for (let m = 0; m <= 120; m += 5) {
      const tHr = m / 60;
      const f = catchment.hortonSteadyFc + 
        (catchment.hortonInitialF0 - catchment.hortonSteadyFc) * 
        Math.exp(-catchment.hortonDecayK * tHr);
      points.push({ t: m, infiltration: f, rain: rainRateMmH });
    }
    return points;
  }, [catchment, rainRateMmH]);

  const maxChartY = Math.max(70, catchment.hortonInitialF0 * 1.2, rainRateMmH * 1.15);

  const getHotspotIcon = (type: string) => {
    switch (type) {
      case 'AIRPORT_RUNWAY':
        return <Plane className="w-4 h-4 text-sky-400" />;
      case 'SUBWAY_UNDERPASS':
        return <Truck className="w-4 h-4 text-rose-400" />;
      case 'EXPRESSWAY_JUNCTION':
        return <Navigation className="w-4 h-4 text-amber-400" />;
      case 'DRAINAGE_OUTPOUR':
        return <Waves className="w-4 h-4 text-cyan-400" />;
      case 'PUMPING_STATION':
        return <Activity className="w-4 h-4 text-emerald-400" />;
      default:
        return <Building className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="flex-1 p-3 sm:p-5 flex flex-col space-y-4 overflow-y-auto max-h-full font-sans select-none text-slate-100">
      {/* 1. Top Drainage Surcharge & Hazard Banner */}
      <div
        className={`p-3.5 rounded-2xl border transition-all ${
          hydroState.isDrainageOverwhelmed
            ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
            : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
        }`}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl border shrink-0 ${
                hydroState.isDrainageOverwhelmed
                  ? 'bg-rose-600/20 border-rose-500/40 text-rose-400 animate-pulse'
                  : 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
              }`}
            >
              {hydroState.isDrainageOverwhelmed ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/40 border border-white/10">
                  {hydroState.isDrainageOverwhelmed ? 'CRITICAL DRAINAGE SURCHARGE' : 'STABLE CATCHMENT DRAINAGE'}
                </span>
                {catchment.isCoastalCatchment && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/60">
                    Spring Tide: {catchment.springTideLevelM}m
                  </span>
                )}
              </div>

              <h3 className="text-sm font-bold text-white mt-1 leading-snug">
                {hydroState.isDrainageOverwhelmed
                  ? `Rainfall exceeds gravity outfall capacity by +${hydroState.drainageSurplusMmH} mm/h`
                  : `Stormwater inflow (${rainRateMmH} mm/h) is within municipal drainage limit (${catchment.gravityDrainageCapacityMmH} mm/h)`}
              </h3>

              <p className="text-[11px] text-slate-300/90 mt-1 leading-relaxed">
                {hydroState.isDrainageOverwhelmed
                  ? `Municipal pipes choked. Runoff ponding in low-lying underpasses at rate of ${hydroState.excessRainMmH} mm/h.`
                  : `Soil infiltration and stormwater mains absorbing precipitation. Zero arterial road blockages.`}
              </p>
            </div>
          </div>

          {/* Quick Metrics Cluster Bar */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 font-mono text-xs">
            <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-[9px] text-slate-400 block uppercase">Critical Choke-Points</span>
              <span className={`text-xs font-bold ${hydroState.criticalCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {hydroState.criticalCount} Closed / {hydroState.cautionCount} Caution
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-[9px] text-slate-400 block uppercase">Soil Infiltration f(t)</span>
              <span className="text-xs font-bold text-cyan-300">
                {hydroState.currentInfiltrationMmH} mm/h
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Critical Infrastructure Hotspots Grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Critical Urban Infrastructure & Hotspot Waterlogging Matrix
            </h4>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Catchment Basin: {catchment.catchmentAreaKm2} km² • Runoff Coeff C: {catchment.rationalRunoffCoeffC}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {hydroState.evaluatedHotspots.map((hotspot) => {
            const isCritical = hotspot.severity === 'CRITICAL_FLOODED';
            const isCaution = hotspot.severity === 'CAUTION';

            const fillPct = Math.min(100, Math.round((hotspot.currentDepthCm / hotspot.criticalThresholdCm) * 100));

            return (
              <div
                key={hotspot.id}
                onClick={() => onSelectHotspot && onSelectHotspot(hotspot.id)}
                className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer select-none ${
                  selectedHotspotId === hotspot.id
                    ? 'ring-2 ring-cyan-400 border-cyan-400 bg-cyan-950/40 shadow-lg shadow-cyan-950/50'
                    : isCritical
                    ? 'bg-rose-950/25 border-rose-500/60 shadow-lg shadow-rose-950/30 hover:border-rose-400'
                    : isCaution
                    ? 'bg-amber-950/20 border-amber-500/50 hover:border-amber-400'
                    : 'bg-slate-900/75 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 shrink-0">
                        {getHotspotIcon(hotspot.type)}
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-white truncate" title={hotspot.name}>
                          {hotspot.name}
                        </h5>
                        <span className="text-[10px] font-mono text-slate-400 block">
                          Elev: {hotspot.elevationM}m • Thresh: {hotspot.criticalThresholdCm}cm
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border whitespace-nowrap shrink-0 ${
                        isCritical
                          ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                          : isCaution
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {hotspot.statusLabel}
                    </span>
                  </div>

                  {/* Depth Progress Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                      <span className="text-slate-400">Ponding Depth:</span>
                      <strong
                        className={`text-sm ${
                          isCritical ? 'text-rose-400 font-extrabold' : isCaution ? 'text-amber-300' : 'text-emerald-300'
                        }`}
                      >
                        {hotspot.currentDepthCm} cm
                        <span className="text-[10px] text-slate-500 ml-1">/ {hotspot.criticalThresholdCm}cm</span>
                      </strong>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          isCritical
                            ? 'bg-rose-500'
                            : isCaution
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 mt-2 line-clamp-2">
                    {hotspot.locationDescription}
                  </p>
                </div>

                {/* Tactical Protocol Directive */}
                <div className="mt-3 pt-2.5 border-t border-white/5 flex items-start gap-1.5 text-[10.5px]">
                  <ArrowUpRight className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isCritical ? 'text-rose-400' : 'text-blue-400'}`} />
                  <span className={isCritical ? 'text-rose-300 font-medium' : 'text-slate-300'}>
                    {hotspot.actionProtocol}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Bottom Row: Horton Hydrograph & Civil Defense SOP Protocols */}
      <div className="flex flex-col gap-3.5">
        {/* Dynamic Horton Infiltration Hydrograph */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Horton Infiltration Curve vs. Precipitation Hydrograph
              </h4>
            </div>
            <span className="text-[10px] font-mono text-cyan-300">
              f(t) = f_c + (f_0 - f_c)e^(-kt)
            </span>
          </div>

          <p className="text-[11px] text-slate-400 mb-2">
            Soil absorbs moisture until saturated hydraulic conductivity ({catchment.hortonSteadyFc} mm/h) is reached. 
            The red shaded area represents surface sheet runoff that gravity pipes cannot drain.
          </p>

          {/* Inline SVG Chart */}
          <div className="w-full h-36 bg-slate-950/70 rounded-xl border border-slate-800 p-2 relative">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 400 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="runoffGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="infilGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="30" x2="400" y2="30" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" />
              <line x1="0" y1="60" x2="400" y2="60" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" />
              <line x1="0" y1="90" x2="400" y2="90" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" />

              {/* Rain Constant Level Line */}
              {(() => {
                const rainY = 120 - (rainRateMmH / maxChartY) * 110;
                return (
                  <>
                    <line x1="0" y1={rainY} x2="400" y2={rainY} stroke="#f43f5e" strokeWidth="2" strokeDasharray="4 4" />
                    <text x="395" y={Math.max(12, rainY - 4)} fill="#f43f5e" fontSize="9" textAnchor="end" fontFamily="monospace">
                      Rainfall: {rainRateMmH} mm/h
                    </text>
                  </>
                );
              })()}

              {/* Infiltration Curve Path */}
              {(() => {
                const dPath = hydrographPoints
                  .map((p, i) => {
                    const x = (p.t / 120) * 400;
                    const y = 120 - (p.infiltration / maxChartY) * 110;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ');

                const areaPath = `${dPath} L 400 120 L 0 120 Z`;

                return (
                  <>
                    <path d={areaPath} fill="url(#infilGrad)" />
                    <path d={dPath} fill="none" stroke="#22d3ee" strokeWidth="2.5" />
                  </>
                );
              })()}

              {/* Current Elapsed Time Marker */}
              {(() => {
                const currentX = Math.min(400, (elapsedSimMinutes / 120) * 400);
                return (
                  <>
                    <line x1={currentX} y1="0" x2={currentX} y2="120" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="2 2" />
                    <circle cx={currentX} cy="10" r="3" fill="#fbbf24" />
                    <text x={currentX + 4} y="12" fill="#fbbf24" fontSize="8" fontFamily="monospace">
                      Now ({elapsedSimMinutes}m)
                    </text>
                  </>
                );
              })()}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-1 bg-cyan-400 rounded-full"></span> Soil Infiltration f(t)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-1 bg-rose-500 rounded-full"></span> Rainfall Inflow Rate
            </span>
            <span>Horizon: 120 Mins</span>
          </div>
        </div>

        {/* Civil Defense SOP Emergency Protocols */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Active Tactical Civil Defense & Mitigation SOP
              </h4>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300">
              NDRF / IMD Linked
            </span>
          </div>

          <div className="space-y-2 my-2">
            {catchment.emergencyProtocols.map((protocol, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2 text-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-slate-300 leading-snug">{protocol}</span>
              </div>
            ))}
          </div>

          <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/60 flex items-center justify-between text-[11px] font-mono text-blue-300">
            <span>Automated Weather Station ID: {catchment.stationId}</span>
            <span className="text-slate-400">IMD AWS Network • 10-Min Telemetry Cycle</span>
          </div>
        </div>
      </div>
    </div>
  );
};
