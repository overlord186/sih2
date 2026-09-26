import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { RIVER_BASINS, URBAN_CHOKE_POINTS } from '../data/subBasinAndHydrologyData';
import { RiverBasinModel, UrbanChokePoint } from '../types';
import {
  Waves,
  AlertTriangle,
  Building2,
  Droplets,
  Activity,
  ArrowUpRight,
  ShieldAlert,
  Gauge,
  Sliders,
  CheckCircle2,
  MapPin,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';

export const HydrologyCatchmentView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'RIVER_BASIN' | 'URBAN_MATRIX'>('RIVER_BASIN');
  const [selectedBasinId, setSelectedBasinId] = useState<string>(RIVER_BASINS[0].id);
  const [amcCondition, setAmcCondition] = useState<'AMC_I' | 'AMC_II' | 'AMC_III'>('AMC_II');
  const [rainMultiplier, setRainMultiplier] = useState<number>(1.0);

  // Selected basin
  const baseBasin = RIVER_BASINS.find((b) => b.id === selectedBasinId) || RIVER_BASINS[0];

  // Dynamic SCS-CN calculations
  const dynamicBasinData = useMemo(() => {
    let cn = baseBasin.curveNumberAMC2;
    if (amcCondition === 'AMC_I') {
      // Dry antecedent moisture condition
      cn = (4.2 * cn) / (10 - 0.058 * cn);
    } else if (amcCondition === 'AMC_III') {
      // Wet / Saturated antecedent moisture condition
      cn = (23 * cn) / (10 + 0.13 * cn);
    }
    cn = Math.min(98, Math.max(50, Math.round(cn)));

    const effectiveP = baseBasin.upstreamRainfallMm * rainMultiplier;
    const S = 25400 / cn - 254; // Potential maximum retention in mm
    const Ia = 0.2 * S; // Initial abstraction
    const directRunoffQ =
      effectiveP > Ia ? Math.pow(effectiveP - Ia, 2) / (effectiveP - Ia + S) : 0;

    // Runoff coefficient
    const runoffCoef = effectiveP > 0 ? directRunoffQ / effectiveP : 0;
    const peakDischarge = Math.round(
      baseBasin.projectedPeakDischargeM3s *
        (directRunoffQ / Math.max(1, baseBasin.runoffVolumeMm)) *
        (cn / baseBasin.curveNumberAMC2)
    );

    let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (peakDischarge > baseBasin.dangerDischargeCusecs * 1.1) riskLevel = 'CRITICAL';
    else if (peakDischarge > baseBasin.dangerDischargeCusecs * 0.9) riskLevel = 'HIGH';
    else if (peakDischarge > baseBasin.dangerDischargeCusecs * 0.65) riskLevel = 'MODERATE';

    // Scale hydrograph
    const scaleFactor = peakDischarge / baseBasin.projectedPeakDischargeM3s;
    const hydrograph = baseBasin.hydrograph.map((pt) => ({
      hour: `+${pt.hour}h`,
      dischargeM3s: Math.round(pt.dischargeM3s * scaleFactor),
      precipitationMm: Math.round(pt.precipitationMm * rainMultiplier),
      stageM: Number((baseBasin.currentWaterLevelM + (pt.stageM - baseBasin.currentWaterLevelM) * scaleFactor).toFixed(2)),
    }));

    return {
      cn,
      effectiveP: Number(effectiveP.toFixed(1)),
      S: Number(S.toFixed(1)),
      Ia: Number(Ia.toFixed(1)),
      directRunoffQ: Number(directRunoffQ.toFixed(1)),
      runoffCoef: Number((runoffCoef * 100).toFixed(1)),
      peakDischarge,
      riskLevel,
      hydrograph,
    };
  }, [baseBasin, amcCondition, rainMultiplier]);

  // Urban choke points with dynamic rain multiplier
  const dynamicUrbanPoints = useMemo(() => {
    return URBAN_CHOKE_POINTS.map((pt) => {
      const rain = pt.recentRainfallMm * rainMultiplier;
      const excessMm = Math.max(0, rain - pt.drainageCapacityMmHr * 2.5);
      const waterloggingCm = Math.round(
        (excessMm / 10) * (pt.imperviousRatioPct / 100) * (1.5 / Math.max(0.1, pt.slopeGradientDeg))
      );

      let status: UrbanChokePoint['evacuationStatus'] = 'NORMAL';
      if (waterloggingCm > 70) status = 'TRAFFIC_DIVERTED';
      else if (waterloggingCm > 40) status = 'PUMPING_ACTIVE';
      else if (waterloggingCm > 20) status = 'STANDBY';

      return {
        ...pt,
        simulatedRainMm: Number(rain.toFixed(1)),
        simulatedWaterloggingCm: Math.min(180, Math.max(0, waterloggingCm)),
        simulatedStatus: status,
      };
    });
  }, [rainMultiplier]);

  return (
    <div id="hydrology-catchment-container" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Waves className="w-3.5 h-3.5" />
                Hydrological Impact Engine
              </span>
              <span className="text-xs text-slate-400">USDA-SCS Curve Number & Runoff Hydrographs</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Catchment Inundation & Urban Vulnerability Matrix
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Couples SAMVARTAKA AI post-processed precipitation exceedances directly into catchment runoff models (SCS-CN Method) to estimate peak river discharge ($m^3/s$) and localized urban choke-point inundation depths.
            </p>
          </div>

          <div className="flex items-center bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/80 gap-1">
            <button
              onClick={() => setActiveSubTab('RIVER_BASIN')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'RIVER_BASIN'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Waves className="w-3.5 h-3.5" />
              <span>River Basin Inundation</span>
            </button>
            <button
              onClick={() => setActiveSubTab('URBAN_MATRIX')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === 'URBAN_MATRIX'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Urban Choke-Points</span>
            </button>
          </div>
        </div>

        {/* Global Scenario Scrubber */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              Precipitation Scaling Multiplier:
            </span>
            <div className="flex items-center gap-2">
              {[0.75, 1.0, 1.25, 1.5, 2.0].map((mult) => (
                <button
                  key={mult}
                  onClick={() => setRainMultiplier(mult)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer border ${
                    rainMultiplier === mult
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mult}x {mult === 1.0 ? '(Forecast)' : mult > 1.0 ? '(Surge)' : '(Attenuated)'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Antecedent Soil State:</span>
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setAmcCondition('AMC_I')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                  amcCondition === 'AMC_I' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'
                }`}
              >
                AMC I (Dry)
              </button>
              <button
                onClick={() => setAmcCondition('AMC_II')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                  amcCondition === 'AMC_II' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'
                }`}
              >
                AMC II (Normal)
              </button>
              <button
                onClick={() => setAmcCondition('AMC_III')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                  amcCondition === 'AMC_III' ? 'bg-red-600 text-white font-bold' : 'text-slate-400'
                }`}
              >
                AMC III (Saturated)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tab 1: River Basin Inundation Modeling (SCS-CN) */}
      {activeSubTab === 'RIVER_BASIN' && (
        <div className="space-y-6">
          {/* Basin Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {RIVER_BASINS.map((basin) => (
              <button
                key={basin.id}
                onClick={() => setSelectedBasinId(basin.id)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all border whitespace-nowrap cursor-pointer ${
                  selectedBasinId === basin.id
                    ? 'bg-sky-600/20 border-sky-500 text-sky-200 font-bold shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {basin.name}
              </button>
            ))}
          </div>

          {/* Basin Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Upstream Rainfall (P)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-white font-mono">
                  {dynamicBasinData.effectiveP}
                </span>
                <span className="text-xs text-slate-400">mm / 24h</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Catchment Area: {baseBasin.drainageAreaSqKm.toLocaleString()} km²
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                SCS Runoff Yield (Q)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-sky-400 font-mono">
                  {dynamicBasinData.directRunoffQ}
                </span>
                <span className="text-xs text-sky-500 font-medium">mm ({dynamicBasinData.runoffCoef}% yield)</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Effective CN: {dynamicBasinData.cn} (Ia = {dynamicBasinData.Ia} mm)
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Projected Peak Discharge
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-white font-mono">
                  {dynamicBasinData.peakDischarge.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">m³/s</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Danger Threshold: {baseBasin.dangerDischargeCusecs.toLocaleString()} m³/s
              </span>
            </div>

            <div className={`border rounded-2xl p-4 ${
              dynamicBasinData.riskLevel === 'CRITICAL'
                ? 'bg-red-950/30 border-red-500/40 text-red-300'
                : dynamicBasinData.riskLevel === 'HIGH'
                ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                : dynamicBasinData.riskLevel === 'MODERATE'
                ? 'bg-yellow-950/20 border-yellow-500/30 text-yellow-300'
                : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
            }`}>
              <span className="text-xs font-bold uppercase tracking-wider block">
                Inundation Risk Level
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-black font-mono">
                  {dynamicBasinData.riskLevel}
                </span>
                {dynamicBasinData.riskLevel === 'CRITICAL' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping" />
                )}
              </div>
              <span className="text-[11px] opacity-80 mt-1 block">
                Lead Time to Peak: +{baseBasin.estimatedTimeToPeakHours} Hours
              </span>
            </div>
          </div>

          {/* Hydrograph Chart & Stage Water Level */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Discharge Hydrograph & Inundation Curve:</span>
                    <span className="text-sky-400">{baseBasin.gaugeStation}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Coupled rainfall hyetograph with unit hydrograph convolution
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-2 bg-sky-500/40 rounded-sm" />
                    <span className="text-sky-300">Discharge (m³/s)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-red-500" />
                    <span className="text-red-400">Danger Mark</span>
                  </div>
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dynamicBasinData.hydrograph} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis dataKey="hour" stroke="#94a3b8" fontSize={12} tickLine={false} />
                    <YAxis
                      yAxisId="discharge"
                      stroke="#94a3b8"
                      fontSize={12}
                      tickLine={false}
                      label={{
                        value: 'Discharge (m³/s)',
                        angle: -90,
                        position: 'insideLeft',
                        fill: '#06b6d4',
                        fontSize: 12,
                      }}
                    />
                    <YAxis
                      yAxisId="rain"
                      orientation="right"
                      reversed
                      stroke="#94a3b8"
                      fontSize={12}
                      domain={[0, 100]}
                      tickLine={false}
                      label={{
                        value: 'Rain (mm/3h)',
                        angle: 90,
                        position: 'insideRight',
                        fill: '#60a5fa',
                        fontSize: 12,
                      }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs text-white space-y-1">
                              <p className="font-bold text-slate-200 border-b border-slate-800 pb-1">
                                Forecast Time: {label}
                              </p>
                              <p className="text-sky-400 font-mono">Discharge: {data.dischargeM3s.toLocaleString()} m³/s</p>
                              <p className="text-blue-400 font-mono">Precipitation: {data.precipitationMm} mm</p>
                              <p className="text-amber-400 font-mono">Stage Level: {data.stageM} m</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine
                      yAxisId="discharge"
                      y={baseBasin.dangerDischargeCusecs}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      label={{ value: 'Danger Level', fill: '#ef4444', fontSize: 11, position: 'insideTopRight' }}
                    />
                    <Area
                      yAxisId="discharge"
                      type="monotone"
                      dataKey="dischargeM3s"
                      fill="#06b6d4"
                      fillOpacity={0.25}
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      name="River Discharge"
                    />
                    <Bar
                      yAxisId="rain"
                      dataKey="precipitationMm"
                      fill="#3b82f6"
                      opacity={0.6}
                      radius={[0, 0, 4, 4]}
                      name="Precipitation Hyetograph"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right: Gauge Level Status & SCS Formulation Card */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 mb-3">
                  <Gauge className="w-4 h-4 text-sky-400" />
                  Hydrological Station Gauge Telemetry
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Gauge Station:</span>
                    <span className="text-white font-semibold">{baseBasin.gaugeStation}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Danger Mark Level:</span>
                    <span className="text-red-400 font-mono font-bold">{baseBasin.dangerWaterLevelM} m</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Current Gauge Level:</span>
                    <span className="text-emerald-400 font-mono font-bold">{baseBasin.currentWaterLevelM} m</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Time of Concentration ($t_c$):</span>
                    <span className="text-slate-200 font-mono">{baseBasin.timeOfConcentrationHours} Hours</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800">
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full ${
                        dynamicBasinData.riskLevel === 'CRITICAL'
                          ? 'bg-red-500 w-[95%]'
                          : dynamicBasinData.riskLevel === 'HIGH'
                          ? 'bg-amber-500 w-[80%]'
                          : dynamicBasinData.riskLevel === 'MODERATE'
                          ? 'bg-yellow-500 w-[60%]'
                          : 'bg-emerald-500 w-[35%]'
                      }`}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>Base Flow</span>
                    <span>Warning Level</span>
                    <span>Extreme Flood</span>
                  </div>
                </div>
              </div>

              {/* SCS Physics Explainer */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-400" />
                  SCS-CN Mathematical Formulation
                </h4>
                <div className="text-xs text-slate-300 space-y-1.5 font-mono bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                  <p>S = (25400 / CN) - 254 = {dynamicBasinData.S} mm</p>
                  <p>Ia = 0.2 × S = {dynamicBasinData.Ia} mm</p>
                  <p>Q = (P - Ia)² / (P - Ia + S) = {dynamicBasinData.directRunoffQ} mm</p>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Incorporates soil hydrologic group (A/B/C/D) and land use coverage to convert bias-corrected rain into immediate streamflow.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Urban Choke-Point Vulnerability Matrix */}
      {activeSubTab === 'URBAN_MATRIX' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {dynamicUrbanPoints.map((point) => (
              <div
                key={point.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {point.metroCity}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1.5">{point.locationName}</h4>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                      point.simulatedStatus === 'TRAFFIC_DIVERTED'
                        ? 'bg-red-950/40 text-red-400 border-red-500/40'
                        : point.simulatedStatus === 'PUMPING_ACTIVE'
                        ? 'bg-amber-950/40 text-amber-400 border-amber-500/40'
                        : 'bg-emerald-950/30 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {point.simulatedStatus.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                    <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
                      <span className="text-slate-400 text-[11px] block">Projected Waterlogging</span>
                      <span className="text-lg font-black text-sky-300 font-mono mt-0.5 block">
                        {point.simulatedWaterloggingCm} cm
                      </span>
                    </div>
                    <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
                      <span className="text-slate-400 text-[11px] block">Drain Throughput</span>
                      <span className="text-lg font-black text-white font-mono mt-0.5 block">
                        {point.drainageCapacityMmHr} mm/h
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-3 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Impervious Surface Area:</span>
                      <span className="text-slate-200 font-mono">{point.imperviousRatioPct}%</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Terrain Slope Gradient:</span>
                      <span className="text-slate-200 font-mono">{point.slopeGradientDeg}° (Bowl Depression)</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Mitigation High-Cap Pumps:</span>
                      <span className="text-emerald-400 font-mono font-bold">{point.mitigationPumpsDeployed} Units</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800">
                  <p className="text-[11px] text-slate-400 leading-snug">
                    <strong className="text-slate-300">Action Impact:</strong> {point.keyImpact}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
