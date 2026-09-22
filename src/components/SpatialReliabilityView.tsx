import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { SUB_BASINS } from '../data/subBasinAndHydrologyData';
import { SubBasinReliability } from '../types';
import {
  Activity,
  CheckCircle2,
  Layers,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Info,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const SpatialReliabilityView: React.FC = () => {
  const [selectedBasinId, setSelectedBasinId] = useState<string>(SUB_BASINS[0].basinId);
  const [activeThreshold, setActiveThreshold] = useState<'HEAVY_64' | 'VERY_HEAVY_115'>('HEAVY_64');

  const selectedBasin: SubBasinReliability =
    SUB_BASINS.find((b) => b.basinId === selectedBasinId) || SUB_BASINS[0];

  const chartData = selectedBasin.calibrationPoints.map((pt) => ({
    probLabel: `${pt.forecastProb}%`,
    forecastProb: pt.forecastProb,
    perfect1to1: pt.forecastProb,
    observedFreqRaw: pt.observedFreqRaw,
    observedFreqAI: pt.observedFreqAI,
    sampleCountRaw: pt.sampleCountRaw,
    sampleCountAI: pt.sampleCountAI,
  }));

  const brierImprovement = (
    ((selectedBasin.brierScoreRaw - selectedBasin.brierScoreAI) / selectedBasin.brierScoreRaw) *
    100
  ).toFixed(1);

  const reliabilityReduction = (
    ((selectedBasin.reliabilityTermRaw - selectedBasin.reliabilityTermAI) /
      selectedBasin.reliabilityTermRaw) *
    100
  ).toFixed(1);

  const resolutionGain = (
    ((selectedBasin.resolutionTermAI - selectedBasin.resolutionTermRaw) /
      selectedBasin.resolutionTermRaw) *
    100
  ).toFixed(1);

  return (
    <div id="spatial-reliability-container" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Probabilistic Verification
              </span>
              <span className="text-xs text-slate-400">IMD Verification Standard 2024</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Spatial Reliability & Sub-Basin Calibration Curves
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Assesses the statistical reliability and sharpness of probabilistic heavy rainfall forecasts across major Indian river catchments. Perfect forecasts align strictly with the 1:1 diagonal where predicted probability equals observed relative frequency.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/80 flex items-center gap-1">
              <button
                onClick={() => setActiveThreshold('HEAVY_64')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeThreshold === 'HEAVY_64'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Heavy Rain (≥ 64.5 mm)
              </button>
              <button
                onClick={() => setActiveThreshold('VERY_HEAVY_115')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeThreshold === 'VERY_HEAVY_115'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Very Heavy (≥ 115.5 mm)
              </button>
            </div>
          </div>
        </div>

        {/* Sub-basin Selector Pills */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap flex items-center gap-1 mr-1">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            Catchment Sub-Basin:
          </span>
          {SUB_BASINS.map((basin) => (
            <button
              key={basin.basinId}
              onClick={() => setSelectedBasinId(basin.basinId)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer border ${
                selectedBasinId === basin.basinId
                  ? 'bg-blue-600/30 border-blue-500 text-blue-200 font-semibold shadow-sm'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {basin.basinName}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Reliability Diagram & Brier Decomposition */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recharts Reliability Calibration Curve (8 Cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Reliability Diagram:</span>
                <span className="text-blue-400">{selectedBasin.basinName}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Major Drainages: {selectedBasin.majorRiver} • Catchment Area: {selectedBasin.areaSqKm.toLocaleString()} km² • {selectedBasin.sampleCount} Station-Days
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-slate-500" />
                <span className="text-slate-400">Ideal 1:1</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-amber-400" />
                <span className="text-amber-400">Raw NWP</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-emerald-400" />
                <span className="text-emerald-400">SAMVARTAKA AI</span>
              </div>
            </div>
          </div>

          {/* Primary Diagram */}
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis
                  dataKey="probLabel"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  label={{
                    value: 'Forecast Probability Bin (%)',
                    position: 'insideBottom',
                    offset: -10,
                    fill: '#94a3b8',
                    fontSize: 12,
                  }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  domain={[0, 100]}
                  tickLine={false}
                  label={{
                    value: 'Observed Relative Frequency (%)',
                    angle: -90,
                    position: 'insideLeft',
                    fill: '#94a3b8',
                    fontSize: 12,
                  }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs text-white space-y-1.5">
                          <p className="font-bold text-slate-200 border-b border-slate-800 pb-1">
                            Forecast Bin: {label}
                          </p>
                          <div className="flex justify-between gap-4 text-slate-400">
                            <span>Ideal 1:1 Calibration:</span>
                            <span className="font-mono text-slate-200">{data.forecastProb}%</span>
                          </div>
                          <div className="flex justify-between gap-4 text-amber-400">
                            <span>Raw NWP Observed:</span>
                            <span className="font-mono font-bold">{data.observedFreqRaw}%</span>
                          </div>
                          <div className="flex justify-between gap-4 text-emerald-400">
                            <span>SAMVARTAKA AI Observed:</span>
                            <span className="font-mono font-bold">{data.observedFreqAI}%</span>
                          </div>
                          <div className="pt-1 text-[11px] text-slate-400 border-t border-slate-800">
                            Sample Count: {data.sampleCountAI} events
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* 1:1 Perfect Reliability Reference Line */}
                <Line
                  type="monotone"
                  dataKey="perfect1to1"
                  stroke="#64748b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  name="Perfect 1:1 Reliability"
                />
                {/* Raw NWP Calibration Curve */}
                <Line
                  type="monotone"
                  dataKey="observedFreqRaw"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#f59e0b', strokeWidth: 1, stroke: '#fff' }}
                  name="Raw NWP Forecast"
                />
                {/* AI Calibrated Curve */}
                <Line
                  type="monotone"
                  dataKey="observedFreqAI"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  name="SAMVARTAKA AI Post-Processed"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Sharpness Histogram (Sample Counts per Forecast Bin) */}
          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                Forecast Sharpness Distribution (Sample Count per Bin)
              </span>
              <span className="text-[11px] text-slate-400">Higher resolution at extremes is desired</span>
            </div>
            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#334155" opacity={0.3} />
                  <XAxis dataKey="probLabel" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-2 rounded-lg text-xs text-white space-y-1">
                            <p className="font-bold">{label}</p>
                            <p className="text-amber-400">Raw NWP: {payload[0]?.value} samples</p>
                            <p className="text-emerald-400">SAMVARTAKA AI: {payload[1]?.value} samples</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="sampleCountRaw" fill="#f59e0b" opacity={0.4} name="Raw NWP Count" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sampleCountAI" fill="#10b981" opacity={0.8} name="AI Count" radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right: Brier Score Decomposition & Skill Summary (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Brier Score Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Brier Score (BS)
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                +{brierImprovement}% Skill Gain
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                <span className="text-[11px] text-amber-400 block font-medium">Raw NWP</span>
                <span className="text-2xl font-black text-white font-mono mt-0.5 block">
                  {selectedBasin.brierScoreRaw.toFixed(3)}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">High probability bias</span>
              </div>
              <div className="bg-emerald-950/30 p-3 rounded-xl border border-emerald-500/30">
                <span className="text-[11px] text-emerald-400 block font-medium">SAMVARTAKA AI</span>
                <span className="text-2xl font-black text-emerald-300 font-mono mt-0.5 block">
                  {selectedBasin.brierScoreAI.toFixed(3)}
                </span>
                <span className="text-[10px] text-emerald-400/80 block mt-0.5">Calibrated reliability</span>
              </div>
            </div>
          </div>

          {/* Murphy Brier Decomposition Terms */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Murphy Brier Score Decomposition
            </h4>

            {/* Term 1: Reliability */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Reliability Component (REL ↓):</span>
                <span className="text-emerald-400 font-mono font-bold">-{reliabilityReduction}% Error</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono bg-slate-800/40 p-2 rounded-lg border border-slate-700/50">
                <span className="text-amber-400">Raw: {selectedBasin.reliabilityTermRaw.toFixed(3)}</span>
                <span className="text-slate-500">➔</span>
                <span className="text-emerald-400 font-bold">AI: {selectedBasin.reliabilityTermAI.toFixed(3)}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Measures weighted distance between forecast curve and 1:1 diagonal. Lower is better.
              </p>
            </div>

            {/* Term 2: Resolution */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Resolution Component (RES ↑):</span>
                <span className="text-emerald-400 font-mono font-bold">+{resolutionGain}% Gain</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono bg-slate-800/40 p-2 rounded-lg border border-slate-700/50">
                <span className="text-amber-400">Raw: {selectedBasin.resolutionTermRaw.toFixed(3)}</span>
                <span className="text-slate-500">➔</span>
                <span className="text-emerald-400 font-bold">AI: {selectedBasin.resolutionTermAI.toFixed(3)}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Measures ability to sort forecast cases into distinct probability bins differing from climatology. Higher is better.
              </p>
            </div>

            {/* Term 3: Uncertainty */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Uncertainty Term (UNC):</span>
                <span className="text-slate-400 font-mono">{selectedBasin.uncertaintyTerm.toFixed(3)}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Inherent climatological variance $s(1-s)$ for this river catchment.
              </p>
            </div>
          </div>

          {/* Key Takeaway Insight */}
          <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/20 border border-blue-500/30 rounded-2xl p-4 shadow-lg">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-blue-200">Forecaster Interpretation</h5>
                <p className="text-xs text-blue-300/80 mt-1 leading-relaxed">
                  Raw NWP exhibits severe over-forecasting in the low-to-mid range (predicting 10% when observations occur in 25%+ of cases), while under-predicting convective extremes. SAMVARTAKA AI pulls the curve tightly onto the 1:1 diagonal across all sub-basins.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
