import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import {
  Sliders,
  History,
  Zap,
  Activity,
  ShieldCheck,
  TrendingDown,
  Info,
  Scale,
  Sparkles,
  BarChart2
} from 'lucide-react';

export interface ModelWeightVarianceProps {
  realtimeWeight: number; // 0.0 to 1.0 (e.g., 0.70 = 70% Real-Time NWP / 30% Historical Climatology)
  onChangeRealtimeWeight: (weight: number) => void;
  historicalClimatologyMm: number;
  realtimePredictionMm: number;
  historicalStdDev: number;
  realtimeStdDev: number;
  stationName: string;
}

export const ModelWeightVarianceVisualizer: React.FC<ModelWeightVarianceProps> = ({
  realtimeWeight,
  onChangeRealtimeWeight,
  historicalClimatologyMm,
  realtimePredictionMm,
  historicalStdDev,
  realtimeStdDev,
  stationName,
}) => {
  const [showConfidenceInterval, setShowConfidenceInterval] = useState<boolean>(true);
  // Climatology-NWP synoptic cross-correlation (typical monsoon range 0.28 - 0.35)
  const rho = 0.32;

  // Defensive sanitization of numeric props to prevent NaN in charts and SVGs
  const safeHistStd = Number.isFinite(historicalStdDev) && historicalStdDev > 0 ? historicalStdDev : 10.5;
  const safeRealStd = Number.isFinite(realtimeStdDev) && realtimeStdDev > 0 ? realtimeStdDev : 12.8;
  const safeHistMm = Number.isFinite(historicalClimatologyMm) ? historicalClimatologyMm : 24.0;
  const safeRealMm = Number.isFinite(realtimePredictionMm) ? realtimePredictionMm : 28.5;
  const safeWeight = Number.isFinite(realtimeWeight) ? realtimeWeight : 0.70;

  // Active weights
  const alpha = Math.max(0, Math.min(1, safeWeight));
  const wHist = 1 - alpha;
  const wReal = alpha;

  // Blended output calculation
  const blendedOutput = Math.round((wHist * safeHistMm + wReal * safeRealMm) * 10) / 10;

  // Variance calculation: Var(Y) = w_h^2 * Var_h + w_r^2 * Var_r + 2 * w_h * w_r * Cov(h, r)
  const varHist = Math.pow(safeHistStd, 2);
  const varReal = Math.pow(safeRealStd, 2);
  const covTerm = 2 * wHist * wReal * rho * safeHistStd * safeRealStd;
  const outputVariance = Math.max(0.1, Math.round((Math.pow(wHist, 2) * varHist + Math.pow(wReal, 2) * varReal + covTerm) * 10) / 10);
  const outputStdDev = Math.round(Math.sqrt(outputVariance) * 10) / 10;

  // Pure real-time variance for comparison
  const pureRealtimeVariance = Math.round(varReal * 10) / 10;
  const varianceReductionPct = pureRealtimeVariance > 0
    ? Math.round(((pureRealtimeVariance - outputVariance) / pureRealtimeVariance) * 100)
    : 0;

  // 95% Confidence Interval (±1.96 std dev)
  const ciLower = Math.max(0, Math.round((blendedOutput - 1.96 * outputStdDev) * 10) / 10);
  const ciUpper = Math.round((blendedOutput + 1.96 * outputStdDev) * 10) / 10;

  // Mathematically optimal Bayesian weight (Minimizes output variance)
  const optimalAlpha = useMemo(() => {
    const num = varHist - rho * safeHistStd * safeRealStd;
    const den = varHist + varReal - 2 * rho * safeHistStd * safeRealStd;
    if (den <= 0) return 0.5;
    const opt = num / den;
    return Math.max(0.05, Math.min(0.95, Math.round(opt * 100) / 100));
  }, [varHist, varReal, safeHistStd, safeRealStd]);

  const optimalVariance = useMemo(() => {
    const wH = 1 - optimalAlpha;
    const wR = optimalAlpha;
    const cov = 2 * wH * wR * rho * safeHistStd * safeRealStd;
    return Math.max(0.1, Math.round((Math.pow(wH, 2) * varHist + Math.pow(wR, 2) * varReal + cov) * 10) / 10);
  }, [optimalAlpha, varHist, varReal, safeHistStd, safeRealStd]);

  // Generate 21 discrete sensitivity evaluation steps (0% to 100% in 5% increments)
  const varianceSensitivityData = useMemo(() => {
    const points = [];
    for (let i = 0; i <= 20; i++) {
      const stepAlpha = i * 0.05;
      const stepWH = 1 - stepAlpha;
      const stepWR = stepAlpha;
      const stepCov = 2 * stepWH * stepWR * rho * safeHistStd * safeRealStd;
      const stepVar = Math.max(0.1, Math.round((Math.pow(stepWH, 2) * varHist + Math.pow(stepWR, 2) * varReal + stepCov) * 10) / 10);
      const stepStd = Math.round(Math.sqrt(stepVar) * 10) / 10;
      const stepPred = Math.round((stepWH * safeHistMm + stepWR * safeRealMm) * 10) / 10;

      points.push({
        weightPct: i * 5,
        alpha: stepAlpha,
        variance: stepVar,
        stdDev: stepStd,
        predicted: stepPred,
        ciLower: Math.max(0, Math.round((stepPred - 1.96 * stepStd) * 10) / 10),
        ciUpper: Math.round((stepPred + 1.96 * stepStd) * 10) / 10,
        ciRange: [Math.max(0, Math.round((stepPred - 1.96 * stepStd) * 10) / 10), Math.round((stepPred + 1.96 * stepStd) * 10) / 10],
        isCurrent: Math.abs(stepAlpha - alpha) < 0.026,
      });
    }
    return points;
  }, [alpha, varHist, varReal, safeHistStd, safeRealStd, safeHistMm, safeRealMm]);

  // Stability Classification
  const stabilityInfo = useMemo(() => {
    if (outputVariance <= 75) {
      return {
        label: 'Optimal Bayesian Stability',
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        cardClass: 'border-emerald-500/30',
        desc: 'Low variance region. Balanced shrinkage effectively mitigates convective NWP noise while preserving physical signal.'
      };
    } else if (outputVariance <= 135) {
      return {
        label: 'Moderate Operational Spread',
        badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        cardClass: 'border-blue-500/30',
        desc: 'Standard operational state. Sound balance between climatological stability and real-time telemetry responsiveness.'
      };
    } else {
      return {
        label: 'High Telemetry Volatility',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        cardClass: 'border-amber-500/30',
        desc: 'Elevated variance region. High reliance on real-time NWP / sensor data captures acute bursts but exposes forecast to higher noise.'
      };
    }
  }, [outputVariance]);

  return (
    <div
      id="model-weight-variance-visualizer"
      className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/90 border border-indigo-500/30 text-white rounded-xl p-5 shadow-xl space-y-5"
    >
      {/* Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-400">
              <Scale className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              Predictive Model Reliance & Output Variance Engine
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
                Interactive
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Adjust the slider to balance model reliance between <strong>Historical Climatological Prior</strong> and <strong>Real-Time Telemetry/NWP Guidance</strong>. Observe the immediate impact on forecast output and output variance (σ²).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 ${stabilityInfo.badgeClass}`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            {stabilityInfo.label}
          </span>
        </div>
      </div>

      {/* Main Interactive Visual Slider Container */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3 shadow-inner">
        {/* Dual Reliance Indicator Row */}
        <div className="grid grid-cols-2 gap-3 items-center">
          {/* Historical Reliance (Left) */}
          <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-indigo-500/20 text-indigo-300">
                <History className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-indigo-200 block">
                  Historical Prior Reliance
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Station Climatology: {historicalClimatologyMm.toFixed(1)} mm/d
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-base font-extrabold text-indigo-300">
                {Math.round(wHist * 100)}%
              </span>
              <span className="text-[9px] block text-indigo-400/80 font-mono">
                w_hist = {wHist.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Real-Time Reliance (Right) */}
          <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-cyan-500/20 text-cyan-300">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-cyan-200 block">
                  Real-Time NWP Reliance
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Live Model Signal: {realtimePredictionMm.toFixed(1)} mm/d
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-base font-extrabold text-cyan-300">
                {Math.round(wReal * 100)}%
              </span>
              <span className="text-[9px] block text-cyan-400/80 font-mono">
                w_real = {wReal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Visual Slider Control */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between items-center text-xs text-slate-300 px-1">
            <span className="flex items-center gap-1 font-medium text-indigo-300">
              <History className="w-3.5 h-3.5" /> 100% Historical Climatology
            </span>
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
              Current Split: {Math.round(wHist * 100)}% Hist / {Math.round(wReal * 100)}% Real-Time
            </span>
            <span className="flex items-center gap-1 font-medium text-cyan-300">
              100% Real-Time Telemetry <Zap className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="relative py-2">
            {/* Gradient background track */}
            <div className="h-3 w-full rounded-full bg-gradient-to-r from-indigo-600 via-purple-500 to-cyan-500 p-0.5 shadow-inner">
              <div className="h-full w-full rounded-full bg-slate-900/40"></div>
            </div>

            {/* Native range input positioned over gradient track */}
            <input
              id="model-reliance-weight-slider"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={alpha}
              onChange={(e) => onChangeRealtimeWeight(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
              aria-label="Adjust model reliance weight between historical climatology and real-time telemetry"
            />

            {/* Visual Thumb Marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none transition-transform duration-75 flex flex-col items-center"
              style={{ left: `${alpha * 100}%` }}
            >
              <div className="w-6 h-6 rounded-full bg-white border-2 border-cyan-400 shadow-lg shadow-cyan-500/50 flex items-center justify-center animate-pulse">
                <div className="w-2 h-2 rounded-full bg-slate-900" />
              </div>
            </div>

            {/* Optimal Bayesian Marker Indicator */}
            <div
              className="absolute top-0 -translate-x-1/2 pointer-events-none text-center"
              style={{ left: `${optimalAlpha * 100}%` }}
            >
              <div className="w-0.5 h-3 bg-amber-400/90 mx-auto" />
              <span className="text-[9px] font-mono text-amber-300/90 whitespace-nowrap px-1 rounded bg-slate-900/90 border border-amber-500/30">
                Min Var ({Math.round(optimalAlpha * 100)}%)
              </span>
            </div>
          </div>

          {/* Tick Markers */}
          <div className="flex justify-between text-[10px] text-slate-500 font-mono px-0.5">
            <span>0% (Prior Only)</span>
            <span>25%</span>
            <span>50% (Bayesian Balanced)</span>
            <span>75%</span>
            <span>100% (Telemetry Only)</span>
          </div>
        </div>

        {/* Operational Presets Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Quick Presets:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              id="preset-climatology-anchor-btn"
              onClick={() => onChangeRealtimeWeight(0.20)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                Math.abs(alpha - 0.20) < 0.03
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="80% Historical Climatology / 20% Real-Time NWP"
            >
              Historical Anchor (80/20)
            </button>

            <button
              id="preset-bayesian-optimal-btn"
              onClick={() => onChangeRealtimeWeight(optimalAlpha)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all border ${
                Math.abs(alpha - optimalAlpha) < 0.03
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-xs'
                  : 'bg-slate-800 text-amber-300 border-amber-500/40 hover:bg-slate-700'
              }`}
              title={`Mathematically optimal Bayesian minimum variance weight (${Math.round(optimalAlpha * 100)}% Real-time)`}
            >
              Bayesian Min Variance ({Math.round(optimalAlpha * 100)}%)
            </button>

            <button
              id="preset-imd-operational-btn"
              onClick={() => onChangeRealtimeWeight(0.70)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                Math.abs(alpha - 0.70) < 0.03
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="30% Historical Climatology / 70% Real-Time NWP (Standard IMD Operational Default)"
            >
              Operational IMD (30/70)
            </button>

            <button
              id="preset-pure-telemetry-btn"
              onClick={() => onChangeRealtimeWeight(0.95)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                Math.abs(alpha - 0.95) < 0.03
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-800 text-cyan-300 hover:bg-slate-700'
              }`}
              title="5% Historical / 95% Real-Time Sensor Telemetry"
            >
              Pure Telemetry (5/95)
            </button>
          </div>
        </div>
      </div>

      {/* Immediate Output Variance & Forecast Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Blended Predicted Output */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
            Blended Forecast Output
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-cyan-300">
              {blendedOutput}
            </span>
            <span className="text-xs text-slate-400 font-medium">mm/24h</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80 font-mono">
            <span>Raw NWP: {realtimePredictionMm} mm</span>
            <span className={blendedOutput >= realtimePredictionMm ? 'text-emerald-400' : 'text-amber-400'}>
              {blendedOutput >= realtimePredictionMm ? '+' : ''}
              {(blendedOutput - realtimePredictionMm).toFixed(1)} mm
            </span>
          </div>
        </div>

        {/* Metric 2: Output Variance (σ²) */}
        <div className={`bg-slate-950/80 border rounded-xl p-3.5 space-y-1 ${stabilityInfo.cardClass}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
              Output Variance (σ²)
            </span>
            <Activity className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-amber-300">
              {outputVariance}
            </span>
            <span className="text-xs text-slate-400 font-medium">mm²</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80 font-mono">
            <span>Min Possible: {optimalVariance} mm²</span>
            <span className="text-emerald-400 font-semibold">
              {varianceReductionPct > 0 ? `-${varianceReductionPct}% vs Raw` : 'Baseline'}
            </span>
          </div>
        </div>

        {/* Metric 3: Standard Deviation (σ) & 95% CI */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
            Standard Deviation (σ)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-purple-300">
              ±{outputStdDev}
            </span>
            <span className="text-xs text-slate-400 font-medium">mm</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80 font-mono">
            <span>95% CI Spread:</span>
            <span className="text-purple-300 font-bold">
              [{ciLower} - {ciUpper}] mm
            </span>
          </div>
        </div>

        {/* Metric 4: Variance Reduction Impact */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
            Variance Reduction
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-emerald-400 flex items-center gap-1">
              <TrendingDown className="w-5 h-5" />
              {varianceReductionPct}%
            </span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80 font-mono">
            <span>Pure Real-Time:</span>
            <span className="text-rose-400">{pureRealtimeVariance} mm²</span>
          </div>
        </div>
      </div>

      {/* Visual Composition Bar */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
            Rainfall Component Decomposition (Total: {blendedOutput} mm):
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            Station: <strong className="text-slate-200">{stationName}</strong>
          </span>
        </div>

        {/* Proportional bar */}
        <div className="h-4 rounded-lg overflow-hidden flex bg-slate-800 p-0.5 border border-slate-700">
          <div
            className="h-full bg-indigo-600 rounded-l transition-all duration-150 relative group flex items-center justify-center text-[10px] font-mono font-bold text-white overflow-hidden"
            style={{ width: `${Math.max(8, wHist * 100)}%` }}
            title={`Historical Contribution: ${(wHist * historicalClimatologyMm).toFixed(1)} mm (${Math.round(wHist * 100)}%)`}
          >
            {wHist >= 0.15 && `${(wHist * historicalClimatologyMm).toFixed(1)}mm (${Math.round(wHist * 100)}%)`}
          </div>
          <div
            className="h-full bg-cyan-500 rounded-r transition-all duration-150 relative group flex items-center justify-center text-[10px] font-mono font-bold text-slate-950 overflow-hidden"
            style={{ width: `${Math.max(8, wReal * 100)}%` }}
            title={`Real-Time Contribution: ${(wReal * realtimePredictionMm).toFixed(1)} mm (${Math.round(wReal * 100)}%)`}
          >
            {wReal >= 0.15 && `${(wReal * realtimePredictionMm).toFixed(1)}mm (${Math.round(wReal * 100)}%)`}
          </div>
        </div>

        <div className="flex justify-between items-center text-[11px]">
          <div className="flex items-center gap-1.5 text-indigo-300">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span>Historical Climatology Contribution: <strong>{(wHist * historicalClimatologyMm).toFixed(1)} mm</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-300">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            <span>Real-Time Model Signal Contribution: <strong>{(wReal * realtimePredictionMm).toFixed(1)} mm</strong></span>
          </div>
        </div>
      </div>

      {/* Interactive Variance Sensitivity Chart */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
          <div>
            <span className="font-bold text-xs text-white flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-400" />
              Real-Time Output Variance Sensitivity Curve
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 ml-1 inline-flex items-center">
                σ²(α)
              </span>
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Visualizes how output variance evolves as model reliance shifts from 0% (Pure Historical Prior) to 100% (Pure Real-Time NWP).
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <label className="flex items-center gap-2 cursor-pointer text-indigo-300 font-sans font-semibold hover:text-indigo-200 transition-colors">
              <input 
                type="checkbox" 
                checked={showConfidenceInterval} 
                onChange={(e) => setShowConfidenceInterval(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-indigo-500/50 bg-indigo-900/50 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
              />
              Show 95% Confidence Interval
            </label>
            <div className="w-px h-4 bg-slate-700/80 mx-1"></div>
            <span className="flex items-center gap-1.5 text-amber-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              Variance σ² (mm²)
            </span>
            <span className="flex items-center gap-1.5 text-cyan-300">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              Predicted Output (mm)
            </span>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-56 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={varianceSensitivityData}
              margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="varGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />

              <XAxis
                dataKey="weightPct"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                tickFormatter={(val) => `${val}%`}
              />

              <YAxis
                yAxisId="var"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                unit="mm²"
              />

              <YAxis
                yAxisId="pred"
                orientation="right"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                unit="mm"
              />

              {/* Vertical Marker for Active Slider Operating Point */}
              <ReferenceLine
                yAxisId="var"
                x={Math.round(alpha * 100 / 5) * 5}
                stroke="#38bdf8"
                strokeWidth={2}
                strokeDasharray="4 4"
                label={{
                  value: `Current (${Math.round(alpha * 100)}%)`,
                  fill: '#38bdf8',
                  fontSize: 10,
                  position: 'top',
                }}
              />

              {/* Vertical Marker for Bayesian Minimum Variance Point */}
              <ReferenceLine
                yAxisId="var"
                x={Math.round(optimalAlpha * 100 / 5) * 5}
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                label={{
                  value: `Min Var (${Math.round(optimalAlpha * 100)}%)`,
                  fill: '#fbbf24',
                  fontSize: 9,
                  position: 'insideBottomRight',
                }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-2.5 text-xs text-white shadow-xl space-y-1">
                        <div className="font-bold text-slate-200 border-b border-slate-700 pb-1 flex justify-between gap-3">
                          <span>Reliance Split:</span>
                          <span className="font-mono text-cyan-300">
                            {100 - data.weightPct}% Hist / {data.weightPct}% Real-Time
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-amber-300">
                          <span>Output Variance (σ²):</span>
                          <span className="font-mono font-bold">{data.variance} mm²</span>
                        </div>
                        <div className="flex justify-between items-center text-purple-300">
                          <span>Standard Deviation (σ):</span>
                          <span className="font-mono font-bold">±{data.stdDev} mm</span>
                        </div>
                        <div className="flex justify-between items-center text-cyan-300">
                          <span>Blended Output:</span>
                          <span className="font-mono font-bold">{data.predicted} mm</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5 border-t border-slate-800">
                          <span>95% Prediction Interval:</span>
                          <span className="font-mono">[{data.ciLower} - {data.ciUpper}] mm</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Confidence Interval Area */}
              {showConfidenceInterval && (
                <Area
                  yAxisId="pred"
                  type="monotone"
                  dataKey="ciRange"
                  stroke="none"
                  fill="#818cf8"
                  fillOpacity={0.2}
                  name="95% Confidence Interval"
                />
              )}
              {/* Variance Curve Area */}
              <Area
                yAxisId="var"
                type="monotone"
                dataKey="variance"
                stroke="#f59e0b"
                strokeWidth={2.5}
                fill="url(#varGradient)"
                name="Variance"
              />

              {/* Predicted Output Curve Line */}
              <Line
                yAxisId="pred"
                type="monotone"
                dataKey="predicted"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 2"
                name="Blended Rainfall"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Scientific Narrative Callout */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-white">Meteorological Bias-Variance Diagnosis: </span>
            {stabilityInfo.desc} The minimum variance operating point of{' '}
            <strong className="text-amber-300 font-mono">{optimalVariance} mm²</strong> occurs at{' '}
            <strong className="text-amber-300 font-mono">{Math.round(optimalAlpha * 100)}%</strong> real-time reliance, achieving an optimal balance between historical prior stability and high-resolution telemetry responsiveness.
          </div>
        </div>
      </div>
    </div>
  );
};
