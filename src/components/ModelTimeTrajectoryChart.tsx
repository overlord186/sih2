import React, { useMemo, useState, useRef } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import {
  Clock,
  AlertTriangle,
  RotateCcw,
  ZoomIn,
  Sparkles,
  Layers,
  ChevronDown,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type ModelType = 'Linear Regression' | 'Neural Network' | 'Random Forest' | 'Ensemble';

interface ModelTimeTrajectoryChartProps {
  modelName: ModelType | string;
  onSelectModel?: (model: ModelType) => void;
  basePredictionMm: number;
  baseStdDev: number;
  leadTimeHours: number; // e.g. 24, 48
  stationName?: string;
}

export const ModelTimeTrajectoryChart: React.FC<ModelTimeTrajectoryChartProps> = ({
  modelName,
  onSelectModel,
  basePredictionMm,
  baseStdDev,
  leadTimeHours = 24,
  stationName = 'Station'
}) => {
  const [showAnomalies, setShowAnomalies] = useState(true);

  // Zoom & Drag Selection State
  const [refAreaLeft, setRefAreaLeft] = useState<string | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<string | null>(null);
  const [zoomRange, setZoomRange] = useState<{ startIdx: number; endIdx: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const chartWrapperRef = useRef<HTMLDivElement>(null);

  // Build high-resolution trajectory timeline from -12h (historical) to +leadTimeHours
  const trajectoryData = useMemo(() => {
    const data = [];
    const baseDate = new Date('2026-08-01T08:00:00Z'); // Fixed operational reference point

    // Determine model-specific calibration multipliers
    let modelFactor = 1.0;
    let uncertaintyFactor = 1.0;
    if (modelName.includes('Linear Regression')) {
      modelFactor = 0.94;
      uncertaintyFactor = 1.25; // Wider confidence spread
    } else if (modelName.includes('Neural Network')) {
      modelFactor = 1.06;
      uncertaintyFactor = 0.88; // Non-linear convective peak response
    } else if (modelName.includes('Random Forest')) {
      modelFactor = 1.0;
      uncertaintyFactor = 1.02; // Quantile split variance
    } else if (modelName.includes('Ensemble')) {
      modelFactor = 1.02;
      uncertaintyFactor = 0.75; // Tightest, balanced confidence interval
    }

    for (let i = -12; i <= leadTimeHours; i++) {
      const forecastTime = new Date(baseDate.getTime() + i * 3600000);
      const hours = forecastTime.getUTCHours().toString().padStart(2, '0');
      const mins = forecastTime.getUTCMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${mins}`;

      // Diurnal cycle and lead-time propagation
      const diurnal = Math.sin((forecastTime.getUTCHours() / 24) * Math.PI * 2) * 2.8;
      const progressRatio = Math.max(0, i / leadTimeHours);
      const isHistorical = i < 0;

      let mean = Math.max(0, (basePredictionMm * modelFactor) + diurnal);

      // Known historical anomaly spikes detected in monsoon telemetry (-8h and -2h)
      const isAnomaly = isHistorical && (i === -8 || i === -2);
      if (isAnomaly) {
        mean += (baseStdDev * 2.6); // Monsoon cloudburst outlier
      }

      // Historical observations have narrow instrument error; forecast uncertainty widens over lead time
      const effStdDev = baseStdDev * uncertaintyFactor;
      const stdDevAtTime = isHistorical
        ? effStdDev * 0.18
        : effStdDev * (0.75 + progressRatio * 0.48);

      const ciLower = Math.max(0, Math.round((mean - 1.96 * stdDevAtTime) * 10) / 10);
      const ciUpper = Math.round((mean + 1.96 * stdDevAtTime) * 10) / 10;

      data.push({
        timeId: `t_${i >= 0 ? 'p' : 'm'}${Math.abs(i)}`,
        hourOffset: i,
        timeStr,
        displayLabel: i === 0 ? 'NOW (08:00)' : `${i > 0 ? '+' : ''}${i}h (${timeStr})`,
        shortLabel: i === 0 ? 'NOW' : `${i > 0 ? '+' : ''}${i}h`,
        isHistorical,
        isAnomaly,
        mean: Math.round(mean * 10) / 10,
        stdDev: Math.round(stdDevAtTime * 10) / 10,
        ciLower,
        ciUpper,
        ciRange: [ciLower, ciUpper] as [number, number],
      });
    }
    return data;
  }, [basePredictionMm, baseStdDev, leadTimeHours, modelName]);

  // Sliced data based on active zoom range
  const visibleData = useMemo(() => {
    if (!zoomRange) return trajectoryData;
    return trajectoryData.slice(zoomRange.startIdx, zoomRange.endIdx + 1);
  }, [trajectoryData, zoomRange]);

  // Automatically recalculate and re-scale the confidence interval and Y-axis to focus strictly on the zoomed timeframe
  const { yMin, yMax, zoomedStats } = useMemo(() => {
    if (visibleData.length === 0) return { yMin: 0, yMax: 100, zoomedStats: null };

    let minVal = Infinity;
    let maxVal = -Infinity;
    let sumMean = 0;
    let sumCiWidth = 0;

    for (const d of visibleData) {
      if (d.ciLower < minVal) minVal = d.ciLower;
      if (d.ciUpper > maxVal) maxVal = d.ciUpper;
      if (d.mean < minVal) minVal = d.mean;
      if (d.mean > maxVal) maxVal = d.mean;

      sumMean += d.mean;
      sumCiWidth += (d.ciUpper - d.ciLower);
    }

    // Dynamic padding so the confidence area fills the vertical view without clipping
    const span = Math.max(4, maxVal - minVal);
    const paddedMin = Math.max(0, Math.floor(minVal - span * 0.08));
    const paddedMax = Math.ceil(maxVal + span * 0.1);

    const startItem = visibleData[0];
    const endItem = visibleData[visibleData.length - 1];
    const hoursSpan = Math.abs(endItem.hourOffset - startItem.hourOffset);

    return {
      yMin: paddedMin,
      yMax: paddedMax,
      zoomedStats: {
        isZoomed: zoomRange !== null,
        startTime: startItem.displayLabel,
        endTime: endItem.displayLabel,
        startHour: startItem.hourOffset,
        endHour: endItem.hourOffset,
        hoursSpan,
        avgMean: Math.round((sumMean / visibleData.length) * 10) / 10,
        avgCiWidth: Math.round((sumCiWidth / visibleData.length) * 10) / 10,
        ciLowerBound: Math.round(minVal * 10) / 10,
        ciUpperBound: Math.round(maxVal * 10) / 10
      }
    };
  }, [visibleData, zoomRange]);

  // Click & Drag Zoom Handlers
  const handleMouseDown = (e: any) => {
    if (e && e.activeLabel) {
      setIsDragging(true);
      setRefAreaLeft(e.activeLabel);
      setRefAreaRight(e.activeLabel);
    }
  };

  const handleMouseMove = (e: any) => {
    if (isDragging && e && e.activeLabel) {
      setRefAreaRight(e.activeLabel);
    }
  };

  const handleMouseUp = () => {
    if (isDragging && refAreaLeft && refAreaRight && refAreaLeft !== refAreaRight) {
      const idx1 = trajectoryData.findIndex(d => d.timeId === refAreaLeft);
      const idx2 = trajectoryData.findIndex(d => d.timeId === refAreaRight);

      if (idx1 !== -1 && idx2 !== -1) {
        const start = Math.min(idx1, idx2);
        const end = Math.max(idx1, idx2);

        // Require at least 2 points for a meaningful zoom
        if (end - start >= 1) {
          setZoomRange({ startIdx: start, endIdx: end });
        }
      }
    }
    setIsDragging(false);
    setRefAreaLeft(null);
    setRefAreaRight(null);
  };

  const handleResetZoom = () => {
    setZoomRange(null);
    setIsDragging(false);
    setRefAreaLeft(null);
    setRefAreaRight(null);
  };

  // Quick Zoom Presets
  const applyPreset = (type: 'all' | 'observed' | 'next6' | 'next12' | 'next24') => {
    if (type === 'all') {
      handleResetZoom();
      return;
    }

    let targetStartHour = -12;
    let targetEndHour = 24;

    if (type === 'observed') {
      targetStartHour = -12;
      targetEndHour = 0;
    } else if (type === 'next6') {
      targetStartHour = 0;
      targetEndHour = Math.min(6, leadTimeHours);
    } else if (type === 'next12') {
      targetStartHour = 0;
      targetEndHour = Math.min(12, leadTimeHours);
    } else if (type === 'next24') {
      targetStartHour = 0;
      targetEndHour = Math.min(24, leadTimeHours);
    }

    const startIdx = trajectoryData.findIndex(d => d.hourOffset === targetStartHour);
    const endIdx = trajectoryData.findIndex(d => d.hourOffset === targetEndHour);

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      setZoomRange({ startIdx, endIdx });
    }
  };

  const nowPoint = visibleData.find(d => d.hourOffset === 0);

  // Custom dot renderer for historical outlier anomalies
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (showAnomalies && payload.isAnomaly) {
      return (
        <g key={`dot-${payload.timeId}`} transform={`translate(${cx},${cy})`}>
          <circle r={5} fill="#ef4444" stroke="#ffffff" strokeWidth={2} />
          <circle r={9} fill="none" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="2 2" className="animate-pulse" />
        </g>
      );
    }
    return <circle key={`dot-${payload.timeId}`} cx={cx} cy={cy} r={0} fill="none" />;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 overflow-hidden select-none">
      {/* Header Bar: Model Selector, Anomaly Switch, and Zoom Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Trajectory & Uncertainty Dynamics
              </h3>
              {zoomedStats?.isZoomed && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <ZoomIn className="w-3 h-3" />
                  Zoomed: {zoomedStats.hoursSpan}h Window
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {stationName} • Drag to zoom timeframe • Dynamic confidence interval auto-scaling
            </p>
          </div>
        </div>

        {/* Controls: Model Selector, Anomaly Toggle, and Reset Zoom */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onSelectModel && (
            <div className="relative inline-flex items-center">
              <select
                aria-label="Select AI Model"
                value={modelName}
                onChange={(e) => onSelectModel(e.target.value as ModelType)}
                className="appearance-none text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg pl-3 pr-7 py-1.5 text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="Linear Regression">Linear Regression</option>
                <option value="Neural Network">Neural Network</option>
                <option value="Random Forest">Random Forest</option>
                <option value="Ensemble">Multi-Model Ensemble</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
            </div>
          )}

          {/* Historical Anomaly Toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <input
              type="checkbox"
              checked={showAnomalies}
              onChange={(e) => setShowAnomalies(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
            />
            <AlertTriangle className={`w-3.5 h-3.5 ${showAnomalies ? 'text-rose-500' : 'text-slate-400'}`} />
            <span>Monsoon Anomalies</span>
          </label>

          {/* Reset Zoom Button */}
          {zoomedStats?.isZoomed && (
            <button
              onClick={handleResetZoom}
              className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors shadow-xs"
              title="Reset Zoom to Full Timeline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Zoom
            </button>
          )}
        </div>
      </div>

      {/* Re-scaling Banner & Quick Presets Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50/80 border border-slate-200 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          {zoomedStats?.isZoomed ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold text-slate-900">
                Focusing on {zoomedStats.startTime} → {zoomedStats.endTime}
              </span>
              <span className="text-slate-400">•</span>
              <span className="font-mono text-indigo-700 font-medium">
                Re-scaled CI: [{yMin} - {yMax} mm]
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500">
                Mean: <strong className="text-slate-800">{zoomedStats.avgMean} mm</strong> (±{(zoomedStats.avgCiWidth / 2).toFixed(1)} mm spread)
              </span>
            </div>
          ) : (
            <span className="text-slate-500">
              <strong className="text-slate-700">Interactive Zoom:</strong> Click and drag horizontally across any timeframe to zoom in and re-scale the confidence interval.
            </span>
          )}
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
          <span className="text-[10px] text-slate-400 font-sans uppercase">Presets:</span>
          <button
            onClick={() => applyPreset('all')}
            className={`px-2 py-0.5 rounded border transition-colors ${
              !zoomedStats?.isZoomed ? 'bg-indigo-100 border-indigo-300 text-indigo-800 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            All
          </button>
          <button
            onClick={() => applyPreset('observed')}
            className="px-2 py-0.5 rounded border bg-white border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            -12h
          </button>
          <button
            onClick={() => applyPreset('next6')}
            className="px-2 py-0.5 rounded border bg-white border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            +6h
          </button>
          <button
            onClick={() => applyPreset('next12')}
            className="px-2 py-0.5 rounded border bg-white border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            +12h
          </button>
          <button
            onClick={() => applyPreset('next24')}
            className="px-2 py-0.5 rounded border bg-white border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            +24h
          </button>
        </div>
      </div>

      {/* Main Interactive Chart Canvas */}
      <div 
        ref={chartWrapperRef}
        className="h-72 w-full relative cursor-crosshair"
      >
        <motion.div
          key={`${modelName}-${zoomRange ? `${zoomRange.startIdx}-${zoomRange.endIdx}` : 'full'}`}
          initial={{ opacity: 0, y: 10, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full h-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={visibleData}
              margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <defs>
                <linearGradient id="ciGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#c7d2fe" stopOpacity={0.15} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

              <XAxis
                dataKey="timeId"
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
                minTickGap={18}
                tickFormatter={(timeId) => {
                  const item = visibleData.find(d => d.timeId === timeId);
                  return item ? item.displayLabel : timeId;
                }}
              />

              <YAxis
                domain={[yMin, yMax]}
                allowDataOverflow={true}
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
                unit="mm"
              />

              {/* Precise Custom Hover Tooltip */}
              <Tooltip
                isAnimationActive={false}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3.5 text-xs text-white shadow-2xl space-y-2 min-w-[230px]">
                        <div className="font-bold text-slate-200 border-b border-slate-700/80 pb-1.5 flex justify-between items-center gap-3">
                          <span className="flex items-center gap-1.5 text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-blue-400" />
                            {data.displayLabel}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              data.isHistorical
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            }`}
                          >
                            {data.isHistorical ? 'HISTORICAL' : 'FORECAST'}
                          </span>
                        </div>

                        {showAnomalies && data.isAnomaly && (
                          <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[11px] font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span>Monsoon Outlier Spurt ({data.mean} mm)</span>
                          </div>
                        )}

                        <div className="space-y-1 pt-0.5 font-mono">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-sans">
                              {data.isHistorical ? 'Observed Rainfall:' : 'Mean Prediction:'}
                            </span>
                            <span className="font-bold text-blue-400 text-sm">{data.mean.toFixed(1)} mm</span>
                          </div>

                          <div className="flex justify-between items-center text-indigo-300">
                            <span className="text-slate-400 font-sans">95% Confidence Interval:</span>
                            <span className="font-bold">
                              [{data.ciLower.toFixed(1)} - {data.ciUpper.toFixed(1)}] mm
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-slate-400 text-[11px] pt-1 border-t border-slate-800">
                            <span className="font-sans">Spread (±1.96σ):</span>
                            <span className="text-slate-300">±{(1.96 * data.stdDev).toFixed(1)} mm</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Reference Line for Current Analysis Time (NOW) */}
              {nowPoint && (
                <ReferenceLine
                  x={nowPoint.timeId}
                  stroke="#6366f1"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  label={{
                    value: 'NOW (08:00)',
                    position: 'insideTopLeft',
                    fill: '#4f46e5',
                    fontSize: 10,
                    fontWeight: 700
                  }}
                />
              )}

              {/* Drag Selection Rectangle */}
              {refAreaLeft && refAreaRight && (
                <ReferenceArea
                  x1={refAreaLeft}
                  x2={refAreaRight}
                  stroke="#4f46e5"
                  strokeOpacity={0.6}
                  strokeDasharray="3 3"
                  fill="#6366f1"
                  fillOpacity={0.25}
                />
              )}

              {/* Shaded Confidence Interval Area (Auto Re-scaled) */}
              <Area
                type="monotone"
                dataKey="ciRange"
                stroke="none"
                fill="url(#ciGradient)"
                name="95% Confidence Interval"
                isAnimationActive={false}
              />

              {/* Mean Prediction / Calibrated Line */}
              <Line
                type="monotone"
                dataKey="mean"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={renderCustomDot}
                activeDot={{ r: 5, fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 2 }}
                name="Mean Prediction"
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Bottom Summary Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-600 inline-block rounded-full"></span>
            <span>Mean Forecast</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 bg-indigo-200 inline-block rounded-xs"></span>
            <span>95% Confidence Interval (±1.96σ)</span>
          </div>
          {showAnomalies && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-white inline-block"></span>
              <span>Monsoon Outlier</span>
            </div>
          )}
        </div>

        <span className="text-[11px] font-mono text-slate-400">
          Showing {visibleData.length} data points
        </span>
      </div>
    </div>
  );
};
