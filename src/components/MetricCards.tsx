import React from 'react';
import { MetricSummary } from '../types';
import { TrendingDown, TrendingUp, CheckCircle, ShieldAlert } from 'lucide-react';

interface MetricCardsProps {
  metrics: MetricSummary;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ metrics }) => {
  const maeReduction =
    metrics.maeRaw > 0
      ? Math.round(((metrics.maeRaw - metrics.maeCorrected) / metrics.maeRaw) * 100)
      : 0;

  const rmseReduction =
    metrics.rmseRaw > 0
      ? Math.round(((metrics.rmseRaw - metrics.rmseCorrected) / metrics.rmseRaw) * 100)
      : 0;

  const threatScoreGain =
    metrics.threatScoreRaw > 0
      ? Math.round(
          ((metrics.threatScoreCorrected - metrics.threatScoreRaw) /
            metrics.threatScoreRaw) *
            100
        )
      : 0;

  return (
    <div id="metric-cards-container" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* MAE Card */}
      <div
        id="card-mae-metric"
        className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-blue-400 transition-colors"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Mean Absolute Error (MAE)
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <TrendingDown className="w-3 h-3" /> -{maeReduction}% error
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-slate-900 font-mono tracking-tight">
            {metrics.maeCorrected}
          </span>
          <span className="text-xs text-slate-500 font-medium">mm/day (AI)</span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Raw NWP Forecast:</span>
            <span className="font-mono font-semibold text-rose-600">{metrics.maeRaw} mm</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Global Bias Corr:</span>
            <span className="font-mono font-semibold text-amber-600">{metrics.maeBaseline} mm</span>
          </div>
        </div>
      </div>

      {/* RMSE Card */}
      <div
        id="card-rmse-metric"
        className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-blue-400 transition-colors"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Root Mean Square (RMSE)
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <TrendingDown className="w-3 h-3" /> -{rmseReduction}% error
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-slate-900 font-mono tracking-tight">
            {metrics.rmseCorrected}
          </span>
          <span className="text-xs text-slate-500 font-medium">mm/day (AI)</span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Raw NWP Forecast:</span>
            <span className="font-mono font-semibold text-rose-600">{metrics.rmseRaw} mm</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Global Bias Corr:</span>
            <span className="font-mono font-semibold text-amber-600">{metrics.rmseBaseline} mm</span>
          </div>
        </div>
      </div>

      {/* Mean Bias Card */}
      <div
        id="card-bias-metric"
        className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-blue-400 transition-colors"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Mean Systematic Bias
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle className="w-3 h-3" /> Calibrated
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-slate-900 font-mono tracking-tight">
            {metrics.biasCorrected > 0 ? `+${metrics.biasCorrected}` : metrics.biasCorrected}
          </span>
          <span className="text-xs text-slate-500 font-medium">mm/day</span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Raw NWP Bias:</span>
            <span className="font-mono font-semibold text-rose-600">
              {metrics.biasRaw > 0 ? `+${metrics.biasRaw}` : metrics.biasRaw} mm
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Correlation (r):</span>
            <span className="font-mono font-semibold text-emerald-600">
              {metrics.pearsonCorrected} <span className="text-[10px] text-slate-400">(vs {metrics.pearsonRaw})</span>
            </span>
          </div>
        </div>
      </div>

      {/* Extreme Threat Score (CSI) Card */}
      <div
        id="card-threat-metric"
        className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs hover:border-blue-400 transition-colors"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Heavy Rain Skill (CSI ≥ 64.5mm)
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            <TrendingUp className="w-3 h-3" /> +{threatScoreGain}% skill
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-blue-700 font-mono tracking-tight">
            {metrics.threatScoreCorrected}
          </span>
          <span className="text-xs text-slate-500 font-medium">Critical Success Index</span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Raw NWP Threat Score:</span>
            <span className="font-mono font-semibold text-slate-700">{metrics.threatScoreRaw}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[11px]">IMD Threshold:</span>
            <span className="font-semibold text-amber-700">Extreme Convective</span>
          </div>
        </div>
      </div>
    </div>
  );
};
