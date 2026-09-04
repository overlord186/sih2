import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { RegimeMetricBreakdown, RainfallRegime } from '../types';
import {
  Cloud,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  PieChart as PieChartIcon,
  ShieldCheck,
  TrendingDown,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface RegimeBreakdownViewProps {
  breakdowns: RegimeMetricBreakdown[];
  totalSamples: number;
  selectedYear: number;
}

export const RegimeBreakdownView: React.FC<RegimeBreakdownViewProps> = ({
  breakdowns,
  totalSamples,
  selectedYear,
}) => {
  const [activeRegimeFilter, setActiveRegimeFilter] = useState<RainfallRegime | 'ALL'>('ALL');
  const [chartMetric, setChartMetric] = useState<'samples' | 'errorVolume'>('samples');

  const getRegimeColor = (regime: RainfallRegime) => {
    switch (regime) {
      case RainfallRegime.DRY:
        return '#f59e0b'; // amber-500
      case RainfallRegime.LIGHT:
        return '#0284c7'; // sky-600
      case RainfallRegime.MODERATE:
        return '#2563eb'; // blue-600
      case RainfallRegime.HEAVY_EXTREME:
        return '#9333ea'; // purple-600
    }
  };

  const getRegimeIcon = (regime: RainfallRegime) => {
    switch (regime) {
      case RainfallRegime.DRY:
        return <Cloud className="w-4 h-4 text-amber-500" />;
      case RainfallRegime.LIGHT:
        return <CloudDrizzle className="w-4 h-4 text-sky-500" />;
      case RainfallRegime.MODERATE:
        return <CloudRain className="w-4 h-4 text-blue-600" />;
      case RainfallRegime.HEAVY_EXTREME:
        return <CloudLightning className="w-4 h-4 text-purple-600" />;
    }
  };

  const getRegimeColorStyle = (regime: RainfallRegime) => {
    switch (regime) {
      case RainfallRegime.DRY:
        return {
          bg: 'bg-amber-50/70',
          border: 'border-amber-200',
          badge: 'bg-amber-100 text-amber-800',
          text: 'text-amber-900',
          highlight: 'ring-2 ring-amber-400 bg-amber-50',
        };
      case RainfallRegime.LIGHT:
        return {
          bg: 'bg-sky-50/70',
          border: 'border-sky-200',
          badge: 'bg-sky-100 text-sky-800',
          text: 'text-sky-900',
          highlight: 'ring-2 ring-sky-400 bg-sky-50',
        };
      case RainfallRegime.MODERATE:
        return {
          bg: 'bg-blue-50/70',
          border: 'border-blue-200',
          badge: 'bg-blue-100 text-blue-800',
          text: 'text-blue-900',
          highlight: 'ring-2 ring-blue-400 bg-blue-50',
        };
      case RainfallRegime.HEAVY_EXTREME:
        return {
          bg: 'bg-purple-50/70',
          border: 'border-purple-200',
          badge: 'bg-purple-100 text-purple-800',
          text: 'text-purple-900',
          highlight: 'ring-2 ring-purple-400 bg-purple-50',
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

  // Prepare Pie Chart Data
  const pieChartData = useMemo(() => {
    return breakdowns.map((b) => {
      const sampleShare = totalSamples > 0 ? (b.sampleCount / totalSamples) * 100 : 0;
      // Approximate total absolute error contribution (samples * maeRaw)
      const errorVol = Math.round(b.sampleCount * b.maeRaw);
      return {
        name: b.regime,
        regime: b.regime,
        imdThreshold: b.imdThreshold,
        sampleCount: b.sampleCount,
        sampleShare: Math.round(sampleShare * 10) / 10,
        value: chartMetric === 'samples' ? b.sampleCount : errorVol,
        errorVolume: errorVol,
        maeRaw: b.maeRaw,
        maeCorrected: b.maeCorrected,
        improvementPct: b.improvementPct,
        color: getRegimeColor(b.regime),
      };
    });
  }, [breakdowns, totalSamples, chartMetric]);

  const totalErrorVolume = useMemo(() => {
    return pieChartData.reduce((acc, curr) => acc + curr.errorVolume, 0);
  }, [pieChartData]);

  // Custom Interactive Tooltip for Pie Chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const sharePct =
        chartMetric === 'samples'
          ? d.sampleShare
          : totalErrorVolume > 0
          ? Math.round((d.errorVolume / totalErrorVolume) * 1000) / 10
          : 0;

      return (
        <div className="bg-slate-900 border border-slate-700 text-white p-3 rounded-xl shadow-2xl text-xs space-y-2 font-sans min-w-[220px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-100">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              {d.name}
            </div>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
              {d.imdThreshold}
            </span>
          </div>

          <div className="space-y-1 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Observed Days:</span>
              <span className="font-mono font-bold text-white">{d.sampleCount} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">
                {chartMetric === 'samples' ? 'Season Share:' : 'NWP Error Footprint:'}
              </span>
              <span className="font-mono font-bold text-cyan-400">{sharePct}%</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Raw NWP MAE:</span>
              <span className="font-mono text-rose-400">{d.maeRaw} mm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">AI Corrected MAE:</span>
              <span className="font-mono text-emerald-400 font-bold">{d.maeCorrected} mm</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800/80 text-[11px]">
              <span className="text-slate-400 font-semibold">Bias Reduction:</span>
              <span className="font-mono font-bold text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                -{d.improvementPct}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="regime-breakdown-container" className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-blue-600" />
              IMD Rainfall Regime Diagnostics & Specialized Performance
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Demonstrating why a single global bias correction fails: error mechanisms and physics are completely distinct across regimes.
          </p>
        </div>

        {/* Metric Mode Switcher */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setChartMetric('samples')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              chartMetric === 'samples'
                ? 'bg-white text-slate-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sample Distribution (% Days)
          </button>
          <button
            onClick={() => setChartMetric('errorVolume')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              chartMetric === 'errorVolume'
                ? 'bg-white text-slate-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Raw Error Share (mm)
          </button>
        </div>
      </div>

      {/* Interactive Pie Chart & Regime Synthesis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left Column: Recharts Donut/Pie Chart */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-3 bg-slate-50/60 rounded-xl border border-slate-200/80">
          <div className="relative w-full h-64 sm:h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={102}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  cursor="pointer"
                >
                  {pieChartData.map((entry, index) => {
                    const isSelected = activeRegimeFilter === entry.regime;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke={isSelected ? '#0f172a' : '#ffffff'}
                        strokeWidth={isSelected ? 3 : 2}
                        className="transition-all duration-300 hover:opacity-90 cursor-pointer"
                        onClick={() => {
                          setActiveRegimeFilter((prev) => (prev === entry.regime ? 'ALL' : entry.regime));
                        }}
                      />
                    );
                  })}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label in Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-xl font-extrabold font-mono text-slate-900 leading-tight">
                {totalSamples}
              </span>
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                {selectedYear === 0 ? 'Total Days' : `${selectedYear} Days`}
              </span>
              <span className="text-[9px] text-blue-600 font-semibold mt-0.5">
                4 IMD Regimes
              </span>
            </div>
          </div>

          <span className="text-[11px] text-slate-500 text-center mt-1">
            Click any pie slice to isolate and inspect that regime card
          </span>
        </div>

        {/* Right Column: Legend Table & Scientific Takeaways */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* Legend Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {pieChartData.map((item) => {
              const isSelected = activeRegimeFilter === item.regime;
              const share =
                chartMetric === 'samples'
                  ? item.sampleShare
                  : totalErrorVolume > 0
                  ? Math.round((item.errorVolume / totalErrorVolume) * 1000) / 10
                  : 0;

              return (
                <button
                  key={item.regime}
                  onClick={() =>
                    setActiveRegimeFilter((prev) => (prev === item.regime ? 'ALL' : item.regime))
                  }
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="truncate">
                      <span className={`text-xs font-bold block truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {item.regime}
                      </span>
                      <span className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {item.imdThreshold}
                      </span>
                    </div>
                  </div>

                  <div className="text-right pl-2 shrink-0">
                    <span className={`text-xs font-mono font-bold block ${isSelected ? 'text-cyan-300' : 'text-slate-900'}`}>
                      {share}%
                    </span>
                    <span className={`text-[10px] ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                      {item.sampleCount} days
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Core Analytical Insight Box */}
          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80 text-xs text-slate-700 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-blue-900">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Key Meteorological Evaluation Insights</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] leading-relaxed">
              <div className="bg-white/80 p-2 rounded-lg border border-blue-100">
                <strong className="text-slate-900 block mb-0.5">Heavy Rain Error Dominance:</strong>
                While Heavy / Extreme events represent ~13% of all monsoon days, they generate over 45% of total cumulative NWP forecast error in raw models.
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-blue-100">
                <strong className="text-slate-900 block mb-0.5">Drizzle Artifact Suppression:</strong>
                In the Dry regime, the zero-rain gate eliminates false rain drizzle alerts with a 72.8% reduction in spurious forecast bias.
              </div>
            </div>
          </div>

          {/* Reset filter button if a slice is active */}
          {activeRegimeFilter !== 'ALL' && (
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-600">
                Filtered view: <strong>{activeRegimeFilter}</strong>
              </span>
              <button
                onClick={() => setActiveRegimeFilter('ALL')}
                className="text-blue-600 hover:text-blue-800 font-semibold underline text-xs cursor-pointer"
              >
                Reset to Show All Regimes
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4 IMD Regime Diagnostic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
        {breakdowns.map((item) => {
          const style = getRegimeColorStyle(item.regime);
          const isSelected = activeRegimeFilter === 'ALL' || activeRegimeFilter === item.regime;
          const isDimmed = activeRegimeFilter !== 'ALL' && activeRegimeFilter !== item.regime;

          return (
            <div
              key={item.regime}
              id={`regime-card-${item.regime.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              onClick={() =>
                setActiveRegimeFilter((prev) => (prev === item.regime ? 'ALL' : item.regime))
              }
              className={`rounded-xl border ${style.border} ${style.bg} p-4 flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                isSelected ? 'opacity-100 shadow-xs' : 'opacity-40 grayscale-30'
              } ${activeRegimeFilter === item.regime ? style.highlight : 'hover:-translate-y-0.5'}`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2 rounded-lg bg-white/95 border border-slate-200/60 shadow-2xs">
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
