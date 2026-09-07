import React, { useRef, useState } from 'react';
import { MetricSummary } from '../types';
import { TrendingDown, TrendingUp, CheckCircle, ShieldAlert, Info } from 'lucide-react';

interface MetricCardsProps {
  metrics: MetricSummary;
}

const SpotlightCard: React.FC<{ children: React.ReactNode; className?: string; id?: string }> = ({ children, className = '', id }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current || isFocused) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => { setIsFocused(true); setOpacity(1); };
  const handleBlur = () => { setIsFocused(false); setOpacity(0); };
  const handleMouseEnter = () => setOpacity(1);
  const handleMouseLeave = () => setOpacity(0);

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden bg-white rounded-xl border border-slate-200 shadow-xs transition-colors duration-300 ${className}`}
      id={id}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 z-10 rounded-xl mix-blend-overlay"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(59, 130, 246, 0.15), transparent 40%)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 z-0 rounded-xl mix-blend-overlay"
        style={{
          opacity,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, rgba(255, 255, 255, 0.8), transparent 40%)`,
        }}
      />
      <div className="relative z-20 h-full">{children}</div>
    </div>
  );
};

export const MetricCards: React.FC<MetricCardsProps> = ({ metrics }) => {
  const safeNumber = (num: unknown): number => (typeof num === 'number' && !isNaN(num) && isFinite(num) ? num : 0);
  
  const maeRaw = safeNumber(metrics.maeRaw);
  const maeCorrected = safeNumber(metrics.maeCorrected);
  const rmseRaw = safeNumber(metrics.rmseRaw);
  const rmseCorrected = safeNumber(metrics.rmseCorrected);
  const threatScoreRaw = safeNumber(metrics.threatScoreRaw);
  const threatScoreCorrected = safeNumber(metrics.threatScoreCorrected);

  const maeReduction =
    maeRaw > 0
      ? Math.round(((maeRaw - maeCorrected) / maeRaw) * 100)
      : 0;

  const rmseReduction =
    rmseRaw > 0
      ? Math.round(((rmseRaw - rmseCorrected) / rmseRaw) * 100)
      : 0;

  const threatScoreGain =
    threatScoreRaw > 0
      ? Math.round(
          ((threatScoreCorrected - threatScoreRaw) /
            threatScoreRaw) *
            100
        )
      : 0;

  return (
    <div id="metric-cards-container" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* MAE Card */}
      <SpotlightCard
        id="card-mae-metric"
        className="p-4.5 hover:border-blue-300"
      >
        <div className="flex items-center justify-between">
          <div className="group relative flex items-center gap-1 cursor-help">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Mean Absolute Error (MAE)
            </span>
            <Info className="w-3 h-3 text-slate-400" />
            <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 pointer-events-none">
              Measures the average magnitude of the forecast errors. Lower values indicate higher accuracy.
              <div className="absolute left-4 top-full -mt-1 w-2 h-2 bg-slate-800 rotate-45"></div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <TrendingDown className="w-3 h-3" /> -{maeReduction}% error
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 font-mono tracking-tight">
              {metrics.maeCorrected}
            </span>
            <span className="text-xs text-slate-500 font-medium">mm/day (AI)</span>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600">
              <TrendingDown className="w-3 h-3" />
              14%
            </span>
            <span className="text-[10px] text-slate-400 font-medium">vs prev season</span>
          </div>
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
      </SpotlightCard>

      {/* RMSE Card */}
      <SpotlightCard
        id="card-rmse-metric"
        className="p-4.5 hover:border-blue-300"
      >
        <div className="flex items-center justify-between">
          <div className="group relative flex items-center gap-1 cursor-help">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Root Mean Square (RMSE)
            </span>
            <Info className="w-3 h-3 text-slate-400" />
            <div className="absolute left-0 bottom-full mb-2 w-52 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 pointer-events-none">
              Measures error magnitude, giving higher weight to larger errors. Penalizes major misses heavily.
              <div className="absolute left-4 top-full -mt-1 w-2 h-2 bg-slate-800 rotate-45"></div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <TrendingDown className="w-3 h-3" /> -{rmseReduction}% error
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 font-mono tracking-tight">
              {metrics.rmseCorrected}
            </span>
            <span className="text-xs text-slate-500 font-medium">mm/day (AI)</span>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600">
              <TrendingDown className="w-3 h-3" />
              11%
            </span>
            <span className="text-[10px] text-slate-400 font-medium">vs prev season</span>
          </div>
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
      </SpotlightCard>

      {/* Mean Bias Card */}
      <SpotlightCard
        id="card-bias-metric"
        className="p-4.5 hover:border-blue-300"
      >
        <div className="flex items-center justify-between">
          <div className="group relative flex items-center gap-1 cursor-help">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Mean Systematic Bias
            </span>
            <Info className="w-3 h-3 text-slate-400" />
            <div className="absolute left-0 bottom-full mb-2 w-52 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 pointer-events-none">
              Shows if the model systematically over-predicts (positive) or under-predicts (negative) rainfall. Closer to 0 is better.
              <div className="absolute left-4 top-full -mt-1 w-2 h-2 bg-slate-800 rotate-45"></div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle className="w-3 h-3" /> Calibrated
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 font-mono tracking-tight">
              {metrics.biasCorrected > 0 ? `+${metrics.biasCorrected}` : metrics.biasCorrected}
            </span>
            <span className="text-xs text-slate-500 font-medium">mm/day</span>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600">
              <TrendingDown className="w-3 h-3" />
              25%
            </span>
            <span className="text-[10px] text-slate-400 font-medium">vs prev season</span>
          </div>
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
      </SpotlightCard>

      {/* Extreme Threat Score (CSI) Card */}
      <SpotlightCard
        id="card-threat-metric"
        className="p-4.5 hover:border-blue-300"
      >
        <div className="flex items-center justify-between">
          <div className="group relative flex items-center gap-1 cursor-help">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate max-w-[120px]" title="Heavy Rain Skill (CSI ≥ 64.5mm)">
              Heavy Rain Skill
            </span>
            <Info className="w-3 h-3 shrink-0 text-slate-400" />
            <div className="absolute left-0 bottom-full mb-2 w-56 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 pointer-events-none whitespace-normal">
              Critical Success Index (CSI). Measures accuracy of predicting extreme events (≥ 64.5mm). 1 is a perfect score.
              <div className="absolute left-4 top-full -mt-1 w-2 h-2 bg-slate-800 rotate-45"></div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
            <TrendingUp className="w-3 h-3" /> +{threatScoreGain}% skill
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-blue-700 font-mono tracking-tight">
              {metrics.threatScoreCorrected}
            </span>
            <span className="text-xs text-slate-500 font-medium">Critical Success Index</span>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600">
              <TrendingUp className="w-3 h-3" />
              18%
            </span>
            <span className="text-[10px] text-slate-400 font-medium">vs prev season</span>
          </div>
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
      </SpotlightCard>
    </div>
  );
};
