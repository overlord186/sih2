import React, { useMemo, useState } from 'react';
import {
  Cpu,
  BarChart2,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Info,
  Layers,
  Percent,
} from 'lucide-react';
import {
  executeMultiModelStacking,
  MultiModelStackingResult,
} from '../ml/multiModelStacking';
import { MET_STATIONS } from '../data/monsoonDataset';

interface Props {
  stationId: string;
  leadHours?: number;
  baseForecastRainMm: number;
}

export const MultiModelStackingVisualizer: React.FC<Props> = ({
  stationId,
  leadHours = 24,
  baseForecastRainMm,
}) => {
  const [selectedLead, setSelectedLead] = useState<number>(leadHours);

  const station = useMemo(() => {
    return MET_STATIONS.find((s) => s.id === stationId) || MET_STATIONS[0];
  }, [stationId]);

  const isWesternGhats = useMemo(() => {
    return (
      station.subdivision.includes('Konkan') ||
      station.subdivision.includes('Coastal Karnataka') ||
      station.subdivision.includes('Kerala')
    );
  }, [station]);

  // Generate multi-model base forecasts with physical perturbations
  const stackingResult: MultiModelStackingResult = useMemo(() => {
    // Model-specific realistic variations around the base forecast
    const ecmwf = Math.max(0, baseForecastRainMm * 0.92 + 3.1);
    const ncmrwf = Math.max(0, baseForecastRainMm * (isWesternGhats ? 1.14 : 1.02) - 1.5);
    const imd = Math.max(0, baseForecastRainMm * 0.98 + (baseForecastRainMm > 60 ? 6.2 : -2.0));
    const samvartaka = Math.max(0, baseForecastRainMm * 1.05);

    return executeMultiModelStacking(
      stationId,
      { ecmwf, ncmrwf, imd, samvartaka },
      selectedLead,
      isWesternGhats
    );
  }, [stationId, baseForecastRainMm, selectedLead, isWesternGhats]);

  const disagreementBadge = useMemo(() => {
    switch (stackingResult.interModelDisagreementIndex) {
      case 'LOW':
        return {
          label: 'Low Disagreement (High Consensus)',
          color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        };
      case 'MODERATE':
        return {
          label: 'Moderate Disagreement (Synoptic Trough Variance)',
          color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        };
      case 'HIGH':
        return {
          label: 'High Model Spread (Convective Divergence)',
          color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        };
      case 'CRITICAL_SPLIT':
        return {
          label: 'Critical Ensemble Split (Extreme Bifurcation)',
          color: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        };
    }
  }, [stackingResult.interModelDisagreementIndex]);

  return (
    <div className="bg-slate-900 rounded-2xl border border-purple-500/30 p-5 shadow-2xl text-white space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white">
                Multi-Model Stacking & Bayesian Model Averaging (BMA)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700/50">
                NWP Ensemble
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Harmonizing ECMWF IFS, NCMRWF NCUM, IMD GFS, and SAMVARTAKA Deep MetNet via NNLS Meta-Learner
            </p>
          </div>
        </div>

        {/* Lead Time Toggle */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {[12, 24, 48, 72].map((h) => (
            <button
              key={h}
              onClick={() => setSelectedLead(h)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                selectedLead === h
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              +{h}h
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">Stacked Forecast Mean</span>
          <div className="text-2xl font-black font-mono text-purple-300 flex items-baseline gap-1">
            {stackingResult.stackedForecastMm}
            <span className="text-xs font-medium text-slate-400">mm / 24h</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            95% CI: [{stackingResult.confidenceInterval95[0]} – {stackingResult.confidenceInterval95[1]} mm]
          </span>
        </div>

        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">Ensemble Spread (Disagreement)</span>
          <div className="text-2xl font-black font-mono text-amber-300 flex items-baseline gap-1">
            ±{stackingResult.ensembleSpreadMm}
            <span className="text-xs font-medium text-slate-400">mm σ</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            BMA Var: {stackingResult.bmaTotalVarianceMm2} mm²
          </span>
        </div>

        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block mb-1">Dominant NWP Driver</span>
          <div className="text-sm font-extrabold text-white truncate mt-1">
            {stackingResult.dominantModel}
          </div>
          <span className="text-[10px] text-emerald-400 font-mono mt-1.5 block">
            Trough Sync: {stackingResult.monsoonTroughAlignmentScore}%
          </span>
        </div>

        <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400">Inter-Model Diagnostic</span>
          <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border mt-2 ${disagreementBadge.color}`}>
            {disagreementBadge.label}
          </div>
        </div>
      </div>

      {/* Contributing Model Comparison Bars */}
      <div className="space-y-2.5 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1">
          <span>Component NWP Streams & Meta-Weights (Non-Negative Least Squares):</span>
          <span className="font-mono text-[10px] text-purple-400">Σ Weights = 1.00</span>
        </div>

        {stackingResult.models.map((model) => (
          <div key={model.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs">{model.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">({model.gridResolutionKm}km res)</span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span className="text-slate-400 text-[11px]">Weight: {(model.weight * 100).toFixed(0)}%</span>
                <span className="font-extrabold text-purple-300 text-[12px]">
                  {model.deterministicRainMm} mm
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
              <div
                className="bg-purple-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (model.deterministicRainMm / Math.max(1, stackingResult.stackedForecastMm * 1.5)) * 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Probabilistic Exceedance Curve Breakdown */}
      <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Percent className="w-4 h-4 text-cyan-400" />
            <span>Probabilistic Rainfall Exceedance Spectrum (Mixture CDF):</span>
          </div>
          <span className="text-[10px] font-mono text-cyan-400">
            Median P50: {stackingResult.probabilisticExceedance.p50MedianPercentileMm} mm
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { label: 'Trace (>2.5mm)', prob: stackingResult.probabilisticExceedance.pTraceRain, color: 'text-sky-400' },
            { label: 'Moderate (>15.6mm)', prob: stackingResult.probabilisticExceedance.pModerateRain, color: 'text-blue-400' },
            { label: 'Heavy (>64.5mm)', prob: stackingResult.probabilisticExceedance.pHeavyRain, color: 'text-amber-400' },
            { label: 'Very Heavy (>115.6mm)', prob: stackingResult.probabilisticExceedance.pVeryHeavyRain, color: 'text-orange-400' },
            { label: 'Deluge (>204.5mm)', prob: stackingResult.probabilisticExceedance.pCloudburstDeluge, color: 'text-rose-400' },
          ].map((item, idx) => (
            <div key={idx} className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block truncate">{item.label}</span>
              <div className={`text-lg font-black font-mono mt-1 ${item.color}`}>
                {item.prob}%
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1 mt-1.5 overflow-hidden">
                <div
                  className="bg-current h-full rounded-full"
                  style={{ width: `${item.prob}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
