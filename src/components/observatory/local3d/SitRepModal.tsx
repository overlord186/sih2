/**
 * SitRepModal.tsx
 * SAMVARTAKA AI — Municipal Hydrological Disaster Situation Report (SitRep)
 * 
 * Generates an official, printable civil defense situation report for municipal authorities
 * (NDMA / SDMA / MCGM / IMD) detailing:
 * 1. Catchment hydrologic surcharge balance (inflow vs gravity pipe discharge)
 * 2. Critical infrastructure choke-point inundation depths & closure directives
 * 3. Horton soil saturation curves and sheet runoff hazard
 * 4. Active NDRF Standard Operating Protocols (SOP)
 * 5. One-click Markdown copy and PDF print formatting
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  Droplet,
  Layers,
  MapPin,
  Clock,
  Building,
  CheckCircle2,
  FileText,
  Download
} from 'lucide-react';
import { StationMetadata } from '../../../types';
import { StationCatchmentProfile, computeLiveHydrologicalState } from '../../../data/stationCatchments';

interface SitRepModalProps {
  isOpen: boolean;
  onClose: () => void;
  station: StationMetadata;
  catchment: StationCatchmentProfile;
  rainRateMmH: number;
  surfaceWaterDepthCm: number;
  elapsedSimMinutes: number;
  forecastHorizonMinutes: number;
}

export const SitRepModal: React.FC<SitRepModalProps> = ({
  isOpen,
  onClose,
  station,
  catchment,
  rainRateMmH,
  surfaceWaterDepthCm,
  elapsedSimMinutes,
  forecastHorizonMinutes,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const hydroState = useMemo(() => {
    return computeLiveHydrologicalState(
      catchment,
      rainRateMmH,
      Math.max(0.1, elapsedSimMinutes / 60),
      surfaceWaterDepthCm
    );
  }, [catchment, rainRateMmH, surfaceWaterDepthCm, elapsedSimMinutes]);

  const reportTimestamp = useMemo(() => {
    return new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'medium',
    });
  }, [isOpen]);

  // Formatted Markdown representation for control room WhatsApp/Email dispatch
  const markdownReport = useMemo(() => {
    const lines = [
      `# 🚨 MUNICIPAL HYDROLOGICAL SITUATION REPORT (SITREP)`,
      `**Issuing Authority**: Disaster Management Authority & IMD Meteorological Post-Processing Unit`,
      `**Report Generation Time**: ${reportTimestamp} IST`,
      `**Observatory Station**: ${station.name} (${station.id}) • State: ${station.state}`,
      `**Coordinates**: ${station.lat.toFixed(4)}°N, ${station.lon.toFixed(4)}°E • Elevation: ${station.elevationM}m MSL`,
      `**Catchment Area**: ${catchment.catchmentAreaKm2} km² • Rational Runoff Coeff C: ${catchment.rationalRunoffCoeffC}`,
      `**Forecast Horizon Evaluated**: ${forecastHorizonMinutes === 0 ? 'Current Real-Time (T+0)' : `+${forecastHorizonMinutes} Minutes Projection`}`,
      ``,
      `---`,
      `## 1. HYDROMETEOROLOGICAL SURCHARGE BALANCE`,
      `- **Rainfall Inflow Intensity**: ${rainRateMmH} mm/h`,
      `- **Gravity Outfall Drainage Limit**: ${catchment.gravityDrainageCapacityMmH} mm/h`,
      `- **System Status**: ${hydroState.isDrainageOverwhelmed ? `⚠️ CRITICAL SURCHARGE (+${hydroState.drainageSurplusMmH} mm/h excess inflow)` : '✅ STABLE (Stormwater within municipal pipe capacity)'}`,
      `- **Surface Sheet Runoff Rate**: ${hydroState.excessRainMmH} mm/h`,
      `- **Catchment Surface Water Ponding**: ${surfaceWaterDepthCm.toFixed(1)} cm`,
      `- **Soil Infiltration Capacity f(t)**: ${hydroState.currentInfiltrationMmH} mm/h (Steady-state limit fc: ${catchment.hortonSteadyFc} mm/h)`,
      ``,
      `---`,
      `## 2. CRITICAL CHOKE-POINTS & WATERLOGGING MATRIX`,
      `| Infrastructure Hotspot | Type | Elevation | Depth (cm) | Critical Limit | Operational Status | Directed Action |`,
      `|---|---|---|---|---|---|---|`,
    ];

    hydroState.evaluatedHotspots.forEach((h) => {
      lines.push(
        `| ${h.name} | ${h.type} | ${h.elevationM}m | ${h.currentDepthCm} cm | ${h.criticalThresholdCm} cm | ${h.statusLabel} | ${h.actionProtocol} |`
      );
    });

    lines.push(``);
    lines.push(`---`);
    lines.push(`## 3. ACTIVE CIVIL DEFENSE MITIGATION DIRECTIVES (NDRF / MCGM SOP)`);
    catchment.emergencyProtocols.forEach((p, idx) => {
      lines.push(`${idx + 1}. [ACTION REQUIRED] ${p}`);
    });

    lines.push(``);
    lines.push(`*Generated autonomously by SAMVARTAKA AI C4I Defense Engine v2.0*`);
    return lines.join('\n');
  }, [
    station,
    catchment,
    rainRateMmH,
    surfaceWaterDepthCm,
    forecastHorizonMinutes,
    hydroState,
    reportTimestamp,
  ]);

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(markdownReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans print:bg-white print:text-black print:border-none print:shadow-none print:max-w-none print:max-h-none print:h-auto">
        {/* Header Bar */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0 print:border-b-2 print:border-black print:bg-white print:text-black">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/20 text-cyan-400 border border-blue-500/30 print:hidden">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white print:text-black uppercase tracking-tight">
                  Municipal Disaster Situation Report (SitRep)
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/60 text-cyan-300 border border-blue-700/60 print:border-black print:text-black font-bold">
                  OFFICIAL USE ONLY
                </span>
              </div>
              <p className="text-xs text-slate-400 print:text-slate-700 font-mono mt-0.5">
                Catchment ID: {catchment.stationId} • {station.name} • {reportTimestamp} IST
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer"
              title="Copy formatted Markdown to Clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{copied ? 'Copied Markdown!' : 'Copy Markdown'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white border-blue-400 cursor-pointer shadow-xs"
              title="Print official SitRep / Save to PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Report Sheet */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 [scrollbar-width:thin] [scrollbar-color:rgba(51,65,85,0.5)_transparent] print:p-0 print:overflow-visible">
          {/* Executive Summary Card */}
          <div
            className={`p-4 rounded-xl border ${
              hydroState.isDrainageOverwhelmed
                ? 'bg-rose-950/30 border-rose-500/50 text-rose-200 print:border-red-600 print:bg-red-50 print:text-red-950'
                : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200 print:border-emerald-600 print:bg-emerald-50 print:text-emerald-950'
            }`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider block">
                  {hydroState.isDrainageOverwhelmed ? 'CRITICAL DISASTER BRIEFING' : 'STANDARD OPERATIONAL MONITORING'}
                </span>
                <h4 className="text-base font-bold text-white print:text-black mt-1">
                  {hydroState.isDrainageOverwhelmed
                    ? `SURCHARGE ALERT: Gravity outfall capacity exceeded by +${hydroState.drainageSurplusMmH} mm/h`
                    : `NORMAL DRAINAGE: Precipitation is within gravity drainage capacity`}
                </h4>
                <p className="text-xs text-slate-300 print:text-slate-800 mt-1">
                  {hydroState.isDrainageOverwhelmed
                    ? `Precipitation rate of ${rainRateMmH} mm/h generates active sheet runoff across ${catchment.catchmentAreaKm2} km² catchment basin. ${hydroState.criticalCount} critical traffic and transport artery/subway junctions are flooded.`
                    : `Inflow rate (${rainRateMmH} mm/h) is managed by municipal stormwater channels (${catchment.gravityDrainageCapacityMmH} mm/h). No arterial choke points closed.`}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-black/40 print:bg-white print:border print:border-black font-mono text-center shrink-0">
                <span className="text-[9px] text-slate-400 print:text-slate-600 block uppercase">Horizon Evaluated</span>
                <span className="text-sm font-black text-cyan-300 print:text-black">
                  {forecastHorizonMinutes === 0 ? 'T+0 (Now)' : `+${forecastHorizonMinutes}m Lead`}
                </span>
              </div>
            </div>
          </div>

          {/* Key Hydrologic Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 print:border-slate-300 print:bg-slate-50">
              <span className="text-[9px] text-slate-400 print:text-slate-600 block uppercase">Rain Inflow</span>
              <strong className="text-sm text-cyan-400 print:text-black">{rainRateMmH} mm/h</strong>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 print:border-slate-300 print:bg-slate-50">
              <span className="text-[9px] text-slate-400 print:text-slate-600 block uppercase">Drainage Capacity</span>
              <strong className="text-sm text-slate-200 print:text-black">{catchment.gravityDrainageCapacityMmH} mm/h</strong>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 print:border-slate-300 print:bg-slate-50">
              <span className="text-[9px] text-slate-400 print:text-slate-600 block uppercase">Ponding Depth</span>
              <strong className={`text-sm ${surfaceWaterDepthCm > 15 ? 'text-rose-400' : 'text-emerald-400'} print:text-black`}>
                {surfaceWaterDepthCm.toFixed(1)} cm
              </strong>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 print:border-slate-300 print:bg-slate-50">
              <span className="text-[9px] text-slate-400 print:text-slate-600 block uppercase">Choke-Points Status</span>
              <strong className={`text-sm ${hydroState.criticalCount > 0 ? 'text-rose-400' : 'text-emerald-400'} print:text-black`}>
                {hydroState.criticalCount} Closed / {hydroState.cautionCount} Caution
              </strong>
            </div>
          </div>

          {/* Infrastructure Waterlogging Table */}
          <div>
            <h5 className="text-xs font-bold text-slate-300 print:text-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400 print:hidden" />
              <span>Critical Infrastructure Choke-Point Matrix</span>
            </h5>

            <div className="overflow-x-auto border border-slate-800 print:border-slate-300 rounded-xl">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 print:bg-slate-100 print:text-black border-b border-slate-800 print:border-slate-300 text-[10px] uppercase">
                  <tr>
                    <th className="p-2.5">Hotspot Location</th>
                    <th className="p-2.5">Elevation</th>
                    <th className="p-2.5">Ponding Depth</th>
                    <th className="p-2.5">Threshold</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Mandated SOP Protocol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                  {hydroState.evaluatedHotspots.map((hotspot) => {
                    const isCritical = hotspot.severity === 'CRITICAL_FLOODED';
                    const isCaution = hotspot.severity === 'CAUTION';

                    return (
                      <tr key={hotspot.id} className={isCritical ? 'bg-rose-950/20 print:bg-rose-50' : ''}>
                        <td className="p-2.5 font-bold text-slate-200 print:text-black">{hotspot.name}</td>
                        <td className="p-2.5 text-slate-400 print:text-slate-600">{hotspot.elevationM}m</td>
                        <td className={`p-2.5 font-bold ${isCritical ? 'text-rose-400 font-extrabold' : isCaution ? 'text-amber-300' : 'text-emerald-300'} print:text-black`}>
                          {hotspot.currentDepthCm} cm
                        </td>
                        <td className="p-2.5 text-slate-400 print:text-slate-600">{hotspot.criticalThresholdCm} cm</td>
                        <td className="p-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              isCritical
                                ? 'bg-rose-600 text-white'
                                : isCaution
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 print:text-amber-800'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 print:text-emerald-800'
                            }`}
                          >
                            {hotspot.statusLabel}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-300 print:text-black text-[11px] font-sans">
                          {hotspot.actionProtocol}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* NDRF Emergency Action Protocols */}
          <div>
            <h5 className="text-xs font-bold text-slate-300 print:text-black uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 print:hidden" />
              <span>Civil Defense Mitigation Protocols (NDRF / IMD SOP)</span>
            </h5>

            <div className="space-y-2">
              {catchment.emergencyProtocols.map((protocol, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 print:border-slate-300 print:bg-slate-50 flex items-start gap-2.5 text-xs"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 print:text-emerald-700 shrink-0 mt-0.5" />
                  <span className="text-slate-200 print:text-slate-900 leading-relaxed font-sans">{protocol}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Official Sign-off Stamp */}
          <div className="pt-4 border-t border-slate-800 print:border-slate-300 flex items-center justify-between text-[11px] font-mono text-slate-400 print:text-slate-600">
            <div>
              <strong>Dispatch Unit:</strong> Municipal Disaster Operations Center (EOC)
            </div>
            <div>
              <strong>Digital Signature:</strong> SAMVARTAKA-C4I-VERIFIED-AUTH
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
