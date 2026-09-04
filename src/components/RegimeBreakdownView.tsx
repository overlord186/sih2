import React from 'react';
import { RegimeMetricBreakdown, RainfallRegime } from '../types';
import { Cloud, CloudDrizzle, CloudRain, CloudLightning, ArrowRight, ShieldCheck } from 'lucide-react';

interface RegimeBreakdownViewProps {
  breakdowns: RegimeMetricBreakdown[];
  totalSamples: number;
}

export const RegimeBreakdownView: React.FC<RegimeBreakdownViewProps> = ({
  breakdowns,
  totalSamples,
}) => {
  const getRegimeIcon = (regime: RainfallRegime) => {
    switch (regime) {
      case RainfallRegime.DRY:
        return <Cloud className="w-5 h-5 text-amber-500" />;
      case RainfallRegime.LIGHT:
        return <CloudDrizzle className="w-5 h-5 text-sky-500" />;
      case RainfallRegime.MODERATE:
        return <CloudRain className="w-5 h-5 text-blue-600" />;
      case RainfallRegime.HEAVY_EXTREME:
        return <CloudLightning className="w-5 h-5 text-purple-600" />;
    }
  };

  const getRegimeColorStyle = (regime: RainfallRegime) => {
    switch (regime) {
      case RainfallRegime.DRY:
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          badge: 'bg-amber-100 text-amber-800',
          text: 'text-amber-900',
        };
      case RainfallRegime.LIGHT:
        return {
          bg: 'bg-sky-50',
          border: 'border-sky-200',
          badge: 'bg-sky-100 text-sky-800',
          text: 'text-sky-900',
        };
      case RainfallRegime.MODERATE:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          badge: 'bg-blue-100 text-blue-800',
          text: 'text-blue-900',
        };
      case RainfallRegime.HEAVY_EXTREME:
        return {
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          badge: 'bg-purple-100 text-purple-800',
          text: 'text-purple-900',
        };
    }
  };

  const getRegimeMechanism = (regime: RainfallRegime) => {
    switch (regime) {
      case RainfallRegime.DRY:
        return 'Zero-rain thresholding filter quenches spurious NWP sub-grid drizzle artifacts when boundary-layer moisture is insufficient.';
      case RainfallRegime.LIGHT:
        return 'Calibrated linear shrinkage factor scales back the typical +22% NWP over-prediction in isolated or stratiform monsoon showers.';
      case RainfallRegime.MODERATE:
        return 'Dynamic pressure-trough coupling adjusts precipitation accumulation based on local barometric depression anomalies.';
      case RainfallRegime.HEAVY_EXTREME:
        return 'Convective restoration multiplier reconstructs extreme localized rainfall peaks typically smoothed out by coarse NWP grid cells.';
    }
  };

  return (
    <div id="regime-breakdown-container" className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            IMD Rainfall Regime Diagnostics & Specialized Performance
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Demonstrating why a single global bias correction fails: error mechanisms are completely distinct across regimes.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Standard:</span>
          <span className="font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
            Official IMD Meteorological Criteria
          </span>
        </div>
      </div>

      {/* Distribution visual bar */}
      <div className="mt-4 pt-1">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-medium">
          <span>Sample Distribution Across 2023 Monsoon Season</span>
          <span className="font-mono text-slate-700">{totalSamples} Total Paired Days</span>
        </div>
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 p-0.5 gap-0.5">
          {breakdowns.map((b) => {
            const pct = totalSamples > 0 ? (b.sampleCount / totalSamples) * 100 : 0;
            let barColor = 'bg-slate-300';
            if (b.regime === RainfallRegime.DRY) barColor = 'bg-amber-400';
            if (b.regime === RainfallRegime.LIGHT) barColor = 'bg-sky-400';
            if (b.regime === RainfallRegime.MODERATE) barColor = 'bg-blue-500';
            if (b.regime === RainfallRegime.HEAVY_EXTREME) barColor = 'bg-purple-600';

            return (
              <div
                key={b.regime}
                style={{ width: `${Math.max(3, pct)}%` }}
                className={`${barColor} h-full rounded-xs transition-all duration-500`}
                title={`${b.regime}: ${b.sampleCount} samples (${Math.round(pct)}%)`}
              />
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
          {breakdowns.map((b) => (
            <div key={b.regime} className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  b.regime === RainfallRegime.DRY
                    ? 'bg-amber-400'
                    : b.regime === RainfallRegime.LIGHT
                    ? 'bg-sky-400'
                    : b.regime === RainfallRegime.MODERATE
                    ? 'bg-blue-500'
                    : 'bg-purple-600'
                }`}
              />
              <span>
                {b.regime}: <strong className="font-mono text-slate-700">{b.sampleCount}</strong> (
                {Math.round((b.sampleCount / (totalSamples || 1)) * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Regime Cards */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {breakdowns.map((item) => {
          const style = getRegimeColorStyle(item.regime);
          return (
            <div
              key={item.regime}
              id={`regime-card-${item.regime.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              className={`rounded-xl border ${style.border} ${style.bg} p-4 flex flex-col justify-between transition-transform hover:-translate-y-0.5`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2 rounded-lg bg-white/90 border border-slate-200/60 shadow-2xs">
                    {getRegimeIcon(item.regime)}
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                    {item.imdThreshold}
                  </span>
                </div>

                <h3 className={`mt-3 text-sm font-bold ${style.text}`}>{item.regime}</h3>

                <p className="mt-1.5 text-[11px] text-slate-600 leading-relaxed">
                  {getRegimeMechanism(item.regime)}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Raw NWP MAE:</span>
                  <span className="font-mono font-semibold text-rose-700">{item.maeRaw} mm</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">AI Corrected MAE:</span>
                  <span className="font-mono font-bold text-emerald-700">{item.maeCorrected} mm</span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/50">
                  <span className="font-semibold text-slate-700">Error Reduction:</span>
                  <span className="font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    -{item.improvementPct}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
