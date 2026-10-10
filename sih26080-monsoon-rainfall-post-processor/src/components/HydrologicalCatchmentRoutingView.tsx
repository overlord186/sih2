import React, { useState, useMemo } from 'react';
import {
  Droplets,
  Waves,
  AlertTriangle,
  ShieldCheck,
  Compass,
  ArrowRight,
  TrendingUp,
  MapPin,
  Car,
  Activity,
  Layers,
} from 'lucide-react';
import {
  simulateCatchmentHydrology,
  REPRESENTATIVE_BASINS,
  AntecedentMoistureCondition,
  CatchmentBasinProfile,
  HydrologicalSimulationResult,
} from '../ml/hydrologicalRoutingEngine';

interface Props {
  currentRainfall24hMm: number;
}

export const HydrologicalCatchmentRoutingView: React.FC<Props> = ({
  currentRainfall24hMm,
}) => {
  const [selectedBasinId, setSelectedBasinId] = useState<string>('MUMBAI_MITHI');
  const [amcCondition, setAmcCondition] = useState<AntecedentMoistureCondition>('AMC_II_NORMAL');
  const [simulatedRainMm, setSimulatedRainMm] = useState<number>(currentRainfall24hMm);

  // Basin selection
  const basin: CatchmentBasinProfile = useMemo(() => {
    return REPRESENTATIVE_BASINS.find((b) => b.id === selectedBasinId) || REPRESENTATIVE_BASINS[0];
  }, [selectedBasinId]);

  // Run Hydrological Simulation
  const hydroResult: HydrologicalSimulationResult = useMemo(() => {
    return simulateCatchmentHydrology(basin, simulatedRainMm, amcCondition);
  }, [basin, simulatedRainMm, amcCondition]);

  const severityBadge = useMemo(() => {
    switch (hydroResult.floodSeverity) {
      case 'NORMAL':
        return {
          label: 'In-Bank Normal Flow',
          color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        };
      case 'BANKFULL_ALERT':
        return {
          label: 'Bankfull Capacity Alert (Near Brim)',
          color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        };
      case 'MODERATE_FLOOD':
        return {
          label: 'Moderate Riverine Spillover',
          color: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
        };
      case 'EXTREME_INUNDATION':
        return {
          label: 'Severe Inundation & Flash Flood Deluge',
          color: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        };
    }
  }, [hydroResult.floodSeverity]);

  return (
    <div className="bg-slate-900 rounded-2xl border border-blue-500/30 p-5 shadow-2xl text-white space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-500/40 flex items-center justify-center">
            <Waves className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white">
                Catchment-Scale Hydrological Routing & Urban Inundation
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50">
                SCS-CN & Nash IUH
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Translating atmospheric precipitation downpours into surface runoff volume and street-level waterlogging
            </p>
          </div>
        </div>

        {/* Basin Selector */}
        <select
          value={selectedBasinId}
          onChange={(e) => setSelectedBasinId(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl text-xs px-3 py-1.5 text-blue-300 font-bold focus:outline-none focus:border-blue-500"
        >
          {REPRESENTATIVE_BASINS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.areaKm2} km²)
            </option>
          ))}
        </select>
      </div>

      {/* Basin Profile & AMC Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
        <div>
          <label className="text-[10px] text-slate-400 font-semibold block mb-1">
            Antecedent Moisture Condition (Soil Saturation):
          </label>
          <div className="grid grid-cols-3 gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            {[
              { id: 'AMC_I_DRY', label: 'AMC-I (Dry)' },
              { id: 'AMC_II_NORMAL', label: 'AMC-II (Avg)' },
              { id: 'AMC_III_SATURATED', label: 'AMC-III (Wet)' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setAmcCondition(opt.id as any)}
                className={`py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  amcCondition === opt.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 24h Rainfall Input Adjustment */}
        <div>
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-slate-400 font-semibold">24h Rainfall Event:</span>
            <span className="font-mono text-blue-300 font-extrabold">{simulatedRainMm} mm</span>
          </div>
          <input
            type="range"
            min={10}
            max={350}
            step={5}
            value={simulatedRainMm}
            onChange={(e) => setSimulatedRainMm(parseFloat(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg mt-2"
          />
        </div>

        {/* Basin Hydrology Metadata */}
        <div className="text-[10px] font-mono text-slate-400 flex flex-col justify-center space-y-1 pl-2 border-l border-slate-800">
          <div className="flex justify-between">
            <span>Drainage System:</span>
            <span className="text-slate-200">{basin.riverSystem}</span>
          </div>
          <div className="flex justify-between">
            <span>Urban Impervious:</span>
            <span className="text-blue-300 font-bold">{Math.round(basin.urbanImperviousFraction * 100)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Time of Conc (Tc):</span>
            <span className="text-slate-200">{basin.concentrationTimeHours} hrs</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">Peak Discharge (Q_peak)</span>
          <div className="text-2xl font-black font-mono text-blue-300 flex items-baseline gap-1">
            {hydroResult.peakDischargeCumecs}
            <span className="text-xs font-medium text-slate-400">m³/s</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Bankfull Limit: {basin.criticalDischargeCapacityCumecs} m³/s
          </span>
        </div>

        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">Time to Peak Discharge</span>
          <div className="text-2xl font-black font-mono text-cyan-300 flex items-baseline gap-1">
            +{hydroResult.timeToPeakHours}
            <span className="text-xs font-medium text-slate-400">hours</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            Lag from Storm Inception
          </span>
        </div>

        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">Effective Direct Runoff</span>
          <div className="text-2xl font-black font-mono text-purple-300 flex items-baseline gap-1">
            {hydroResult.effectiveRunoffMm}
            <span className="text-xs font-medium text-slate-400">mm</span>
          </div>
          <span className="text-[10px] text-purple-400 font-mono mt-1 block">
            Runoff Ratio: {Math.round(hydroResult.runoffCoefficient * 100)}%
          </span>
        </div>

        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400">Catchment Alert Level</span>
          <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border mt-2 ${severityBadge.color}`}>
            {severityBadge.label}
          </div>
        </div>
      </div>

      {/* Urban Waterlogging & Street Hotspots Table */}
      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-white">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-amber-400" />
            <span>Urban Street Waterlogging & Underpass Ponding Depth Matrix:</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Real-Time Drainage Response</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {hydroResult.urbanHotspots.map((hotspot, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border transition-all ${
                hotspot.severityLevel === 'DELUGE_SEVERITY_DANGER'
                  ? 'bg-rose-950/40 border-rose-500/50'
                  : hotspot.severityLevel === 'WARNING'
                  ? 'bg-amber-950/40 border-amber-500/50'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-bold text-xs text-white">{hotspot.locationName}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {hotspot.drainageType.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5 my-2">
                <span className="text-2xl font-black font-mono text-white">
                  {hotspot.pondingDepthCm}
                </span>
                <span className="text-xs text-slate-400 font-medium">cm water depth</span>
              </div>

              <div className="pt-2 border-t border-slate-800/80 text-[10px] space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Passability:</span>
                  <span
                    className={
                      hotspot.vehiclePassability === 'NO_TRANSIT'
                        ? 'text-rose-400 font-bold'
                        : hotspot.vehiclePassability === 'HEAVY_ONLY'
                        ? 'text-amber-400 font-bold'
                        : 'text-emerald-400'
                    }
                  >
                    {hotspot.vehiclePassability.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Est. Drain Time:</span>
                  <span className="text-slate-200">~{hotspot.estimatedClearanceHours} hours</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
