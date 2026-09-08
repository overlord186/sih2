import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { RainfallDataPoint } from '../types';
import { BarChart3, TrendingDown, Info, ShieldAlert, AlertTriangle } from 'lucide-react';
import { weatherSynth } from '../utils/audio';

interface ForecastChartProps {
  data: RainfallDataPoint[];
  selectedStationName: string;
  compareData?: RainfallDataPoint[];
  compareYear?: number | null;
  isComparing?: boolean;
  onToggleCompare?: () => void;
  onCompareYearChange?: (year: number) => void;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({
  data,
  selectedStationName,
  compareData = [],
  compareYear,
  isComparing = false,
  onToggleCompare,
  onCompareYearChange,
}) => {
  const [viewMode, setViewMode] = useState<'rainfall' | 'residual'>('rainfall');
  const [showImdLine, setShowImdLine] = useState<boolean>(true);
  const [showSevereAlerts, setShowSevereAlerts] = useState<boolean>(true);
  const [showAnomalyTracker, setShowAnomalyTracker] = useState<boolean>(false);

  // Take up to 60 daily data points for crisp rendering
  const chartData = data.slice(0, 60).map((d) => {
    const mmdd = d.date.length >= 10 ? d.date.substring(5) : d.date; // MM-DD
    
    let compObs = undefined;
    let compAi = undefined;
    
    if (isComparing && compareData.length > 0) {
      const compMatch = compareData.find(cd => (cd.date.length >= 10 ? cd.date.substring(5) : cd.date) === mmdd);
      if (compMatch) {
        compObs = compMatch.observedMm;
        compAi = compMatch.correctedForecastMm;
      }
    }

    const res = {
      date: mmdd,
      fullDate: d.date,
      year: d.year,
      observed: d.observedMm,
      rawForecast: d.rawForecastMm,
      baseline: d.baselineLinearMm,
      aiCorrected: d.correctedForecastMm,
      rawError: Math.round(Math.abs(d.rawForecastMm - d.observedMm) * 10) / 10,
      aiError: Math.round(Math.abs(d.correctedForecastMm - d.observedMm) * 10) / 10,
      regime: d.detectedRegime,
      humidity: d.relativeHumidity850hPa,
      pressure: d.surfacePressureHpa,
      compareObserved: compObs,
      compareAiCorrected: compAi,
      historicalAvg: d.historical10YearAvgMm || (d.observedMm * 0.7 + Math.sin(d.dayOfYear * 0.1) * 15 + 10), // mock 10yr avg if missing
      variance: 0, // placeholder
      variancePct: 0
    };
    
    // Compute variance
    res.variance = Math.round((res.aiCorrected - res.historicalAvg) * 10) / 10;
    res.variancePct = res.historicalAvg > 0 ? Math.round(((res.aiCorrected - res.historicalAvg) / res.historicalAvg) * 1000) / 10 : 0;
    return res;
  });

  const CustomTooltip = ({ active, payload }: any) => {
    // Sonification Effect on Hover without triggering App state loops
    useEffect(() => {
      if (active && payload && payload.length) {
        const item = payload[0].payload;
        weatherSynth.init();
        weatherSynth.playRainSound(item.aiCorrected);
      } else {
        weatherSynth.playRainSound(0);
      }
    }, [active, payload ? payload[0]?.payload?.fullDate : null]);

    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 text-white p-3 rounded-lg shadow-xl text-xs space-y-1.5 font-sans min-w-[210px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-mono">
            <span className="font-semibold text-slate-300">{item.fullDate}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-sans">
              {item.regime}
            </span>
          </div>
          {showAnomalyTracker && (
            <div className="pt-1 pb-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-amber-400">10-Year Avg:</span>
                <span className="font-mono text-amber-300">{item.historicalAvg?.toFixed(1)} mm</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className={item.variance > 0 ? "text-rose-400" : "text-sky-400"}>Anomaly Variance:</span>
                <span className={`font-mono ${item.variance > 0 ? "text-rose-300" : "text-sky-300"}`}>
                  {item.variance > 0 ? '+' : ''}{item.variance?.toFixed(1)} mm ({item.variancePct > 0 ? '+' : ''}{item.variancePct?.toFixed(1)}%)
                </span>
              </div>
            </div>
          )}
          {item.compareAiCorrected !== undefined && isComparing && (
            <div className="pt-1 pb-1 mb-1 border-b border-slate-800 text-[10px] text-slate-400">
              <span className="block mb-1">{compareYear} Comparison:</span>
              <div className="flex justify-between items-center text-slate-300">
                <span>Observed:</span>
                <span className="font-mono">{item.compareObserved} mm</span>
              </div>
              <div className="flex justify-between items-center text-indigo-300">
                <span>AI Corrected:</span>
                <span className="font-mono font-bold">{item.compareAiCorrected} mm</span>
              </div>
            </div>
          )}

          <div className="space-y-1 pt-1">
            <div className="flex justify-between items-center text-emerald-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Ground Obs:
              </span>
              <span className="font-mono font-bold text-sm">{item.observed} mm</span>
            </div>

            <div className="flex justify-between items-center text-rose-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> Raw NWP:
              </span>
              <span className="font-mono font-bold text-sm">{item.rawForecast} mm</span>
            </div>

            <div className="flex justify-between items-center text-blue-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> AI Corrected:
              </span>
              <span className="font-mono font-bold text-sm">{item.aiCorrected} mm</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex justify-between text-[11px] text-slate-400">
            <span>RH: <strong className="text-white">{item.humidity}%</strong></span>
            <span>Pressure: <strong className="text-white">{item.pressure} hPa</strong></span>
          </div>

          <div className="pt-1 flex justify-between text-[11px]">
            <span className="text-slate-400">Absolute Error:</span>
            <span>
              <span className="text-rose-400 font-mono">Raw: {item.rawError}mm</span> |{' '}
              <span className="text-emerald-400 font-mono">AI: {item.aiError}mm</span>
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="forecast-chart-card" className="bg-white/90 backdrop-blur-md rounded-xl border border-slate-200 p-5 shadow-xs transition-colors duration-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Monsoon Rainfall Time-Series: Ground Truth vs NWP vs AI
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              {selectedStationName}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Demonstrating active suppression of false drizzle spells and convective recovery of heavy monsoon peaks.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Toggle IMD Heavy line */}
          {viewMode === 'rainfall' && (
            <button
              id="toggle-imd-line-btn"
              onClick={() => setShowImdLine(!showImdLine)}
              className={`px-2.5 py-1 text-xs rounded-md border font-medium transition-colors flex items-center gap-1 ${
                showImdLine
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              IMD Heavy Alert (64.5mm)
            </button>
          )}

          {/* Compare Toggle */}
          {onToggleCompare && data.length > 0 && data[0].year !== 0 && (
            <div className="flex items-center gap-1.5 mr-2">
              <button
                onClick={onToggleCompare}
                className={`px-2.5 py-1 text-xs rounded-md border font-medium transition-colors ${
                  isComparing
                    ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                VS Compare
              </button>
              {isComparing && onCompareYearChange && (
                <select
                  value={compareYear || ''}
                  onChange={(e) => onCompareYearChange(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-md px-1.5 py-1 text-xs text-slate-700 outline-none focus:border-indigo-500"
                >
                  {/* Find the unique selected year from data or rely on a passed prop, for now don't disable so user can select anything */}
                  <option value={2025}>2025 Comparison</option>
                  <option value={2024}>2024 Comparison</option>
                  <option value={2023}>2023 Comparison</option>
                </select>
              )}
            </div>
          )}
          {/* Toggle Severe Alerts */}
          <button
            id="toggle-severe-alerts-btn"
            onClick={() => setShowSevereAlerts(!showSevereAlerts)}
            className={`px-2.5 py-1 text-xs rounded-md border font-medium transition-colors flex items-center gap-1 ${
              showSevereAlerts
                ? 'bg-rose-50 text-rose-800 border-rose-300'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Highlight Severe Days
          </button>

          {/* Mode switch */}
          <div className="inline-flex rounded-md p-0.5 bg-slate-100 border border-slate-200">
            <button
              id="view-rainfall-btn"
              onClick={() => setViewMode('rainfall')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                viewMode === 'rainfall'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Rainfall Amount (mm)
            </button>
            <button
              id="view-residual-btn"
              onClick={() => setViewMode('residual')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                viewMode === 'residual'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Forecast Residual Error
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[360px] w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'rainfall' ? (
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              
              {showSevereAlerts && chartData.map((d, i) => (
                d.aiCorrected >= 64.5 ? (
                  <ReferenceLine
                    key={`severe-alert-${i}`}
                    x={d.date}
                    stroke="#ffe4e6" /* rose-100 */
                    strokeWidth={20}
                    strokeOpacity={0.6}
                  />
                ) : null
              ))}

              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                unit="mm"
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '4 4' }} 
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                formatter={(val) => {
                  if (val === 'observed') return <span className="text-slate-700 font-semibold">Observed Ground Truth (IMD)</span>;
                  if (val === 'rawForecast') return <span className="text-slate-700">Raw NWP Model Forecast</span>;
                  if (val === 'aiCorrected') return <span className="text-blue-700 font-bold">Regime-Aware AI Corrected</span>;
                  if (val === 'compareObserved') return <span className="text-slate-400 font-semibold">{compareYear} Observed (IMD)</span>;
                  if (val === 'compareAiCorrected') return <span className="text-indigo-400 font-bold">{compareYear} AI Corrected</span>;
                  return val;
                }}
              />

              {showImdLine && (
                <ReferenceLine
                  y={64.5}
                  stroke="#d97706"
                  strokeDasharray="4 4"
                  label={{
                    value: 'IMD Heavy Rainfall (≥64.5 mm)',
                    fill: '#d97706',
                    fontSize: 10,
                    position: 'top',
                  }}
                />
              )}

              {/* Observed line (Ground Truth) */}
              <Line
                type="monotone"
                dataKey="observed"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 2, fill: '#10b981' }}
                activeDot={{ r: 5 }}
              />

              {/* Raw Forecast (Red dashed, showing biases) */}
              <Line
                type="monotone"
                dataKey="rawForecast"
                stroke="#f43f5e"
                strokeWidth={1.8}
                strokeDasharray="4 3"
                dot={{ r: 2, fill: '#f43f5e' }}
                activeDot={{ r: 5 }}
              />

              {/* AI Corrected (Blue bold, high fidelity) */}
              <Line
                type="monotone"
                dataKey="aiCorrected"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={{ r: 2.5, fill: '#2563eb' }}
                activeDot={{ r: 6 }}
              />
              
              {/* Compare Data Lines */}
              {isComparing && (
                  <Line
                    type="monotone"
                    dataKey="compareObserved"
                    stroke="#94a3b8"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={{ r: 1.5, fill: '#94a3b8' }}
                  />
              )}
              {isComparing && (
                  <Line
                    type="monotone"
                    dataKey="compareAiCorrected"
                    stroke="#818cf8"
                    strokeWidth={2}
                    dot={{ r: 2, fill: '#818cf8' }}
                  />
              )}
            </LineChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              
              {showSevereAlerts && chartData.map((d, i) => (
                d.aiCorrected >= 64.5 ? (
                  <ReferenceLine
                    key={`severe-alert-residual-${i}`}
                    x={d.date}
                    stroke="#ffe4e6" /* rose-100 */
                    strokeWidth={20}
                    strokeOpacity={0.6}
                  />
                ) : null
              ))}

              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                unit="mm"
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '4 4' }} 
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                formatter={(val) => {
                  if (val === 'rawError') return <span className="text-rose-600 font-medium">Raw NWP Absolute Error (|Raw - Obs|)</span>;
                  if (val === 'aiError') return <span className="text-emerald-700 font-bold">AI Corrected Error (|AI - Obs|)</span>;
                  return val;
                }}
              />
              <Line
                type="monotone"
                dataKey="rawError"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="aiError"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Narrative Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>
            Notice how the Raw NWP line (red) chronically drifts above zero on dry days (drizzle bias) and flattens extreme peaks, while the AI model (blue) closely hugs ground truth observations.
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-400">
          Showing 60 active monsoonal timesteps
        </span>
      </div>
    </div>
  );
};
