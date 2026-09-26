import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import { motion } from 'motion/react';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
  ReferenceLine,
} from 'recharts';
import { RainfallDataPoint } from '../types';
import { 
  BarChart3, 
  TrendingUp, 
  Info, 
  ShieldAlert, 
  AlertTriangle, 
  Calculator, 
  Activity,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Zap,
  Sliders,
  Maximize2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  CheckCircle2,
  Sun,
  Moon,
  Palette,
  Crosshair,
  Download,
  FileText,
  FileSpreadsheet,
  FileJson,
  Table,
  X,
  Search,
  Filter,
  Check,
  ChevronDown,
  Copy
} from 'lucide-react';
import { weatherSynth } from '../utils/audio';
import { MET_STATIONS } from '../data/monsoonDataset';

interface ForecastChartProps {
  selectedStationId?: string;
  data: RainfallDataPoint[];
  selectedStationName: string;
  compareData?: RainfallDataPoint[];
  compareYear?: number | null;
  isComparing?: boolean;
  onToggleCompare?: () => void;
  onCompareYearChange?: (year: number) => void;
  initialDataRepresentation?: 'rawDaily' | 'weeklyMA';
  onDataRepresentationChange?: (representation: 'rawDaily' | 'weeklyMA') => void;
}

// D3 moving average calculation function using d3.mean over sliding windows
export const computeD3MovingAverage = (values: number[], windowSize: number): number[] => {
  if (values.length === 0) return [];
  const halfWindow = Math.floor(windowSize / 2);
  return values.map((_, i) => {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(values.length, i + halfWindow + 1);
    const slice = values.slice(start, end);
    const avg = d3.mean(slice);
    return avg !== undefined ? Math.round(avg * 10) / 10 : 0;
  });
};

// D3 linear regression trend line calculation using d3.mean and d3.sum
export const computeD3LinearTrend = (values: number[]): number[] => {
  if (values.length === 0) return [];
  const n = values.length;
  const indices = d3.range(n);
  const xMean = d3.mean(indices) ?? 0;
  const yMean = d3.mean(values) ?? 0;

  const num = d3.sum(indices, (i) => (i - xMean) * (values[i] - yMean)) ?? 0;
  const den = d3.sum(indices, (i) => Math.pow(i - xMean, 2)) ?? 1;

  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;

  return indices.map((i) => Math.round((slope * i + intercept) * 10) / 10);
};

export const ForecastChart: React.FC<ForecastChartProps> = ({
  selectedStationId = "BOM_SANTACRUZ",
  data,
  selectedStationName,
  compareData = [],
  compareYear,
  isComparing = false,
  onToggleCompare,
  onCompareYearChange,
  initialDataRepresentation = 'rawDaily',
  onDataRepresentationChange,
}) => {
  const [viewMode, setViewMode] = useState<'rainfall' | 'residual'>('rainfall');
  // Data Representation toggle: 'rawDaily' vs 'weeklyMA' (Weekly Moving Average for climate signal trends)
  const [dataRepresentation, setDataRepresentation] = useState<'rawDaily' | 'weeklyMA'>(initialDataRepresentation);
  const [showImdLine, setShowImdLine] = useState<boolean>(true);
  const [showSevereAlerts, setShowSevereAlerts] = useState<boolean>(true);
  const [showD3MovingAvg, setShowD3MovingAvg] = useState<boolean>(true);
  const [showD3TrendLine, setShowD3TrendLine] = useState<boolean>(true);

  const handleSetDataRepresentation = (mode: 'rawDaily' | 'weeklyMA') => {
    setDataRepresentation(mode);
    if (onDataRepresentationChange) {
      onDataRepresentationChange(mode);
    }
  };
  
  // Theme selector state ('standard' | 'scientificDark')
  const [chartTheme, setChartTheme] = useState<'standard' | 'scientificDark'>('standard');
  const isDark = chartTheme === 'scientificDark';

  const themeStyles = useMemo(() => {
    return {
      isDark,
      // Main outer container style
      container: isDark
        ? 'bg-slate-950/95 backdrop-blur-md rounded-xl border border-sky-500/40 p-5 shadow-2xl shadow-sky-950/50 text-sky-50 transition-all duration-500'
        : 'bg-white/90 backdrop-blur-md rounded-xl border border-slate-200 p-5 shadow-xs transition-all duration-500 text-slate-900',
      
      headerTitle: isDark ? 'text-sky-200 font-mono tracking-wider' : 'text-slate-900 tracking-tight',
      headerSubtitle: isDark ? 'text-slate-400 font-mono text-xs mt-0.5' : 'text-slate-500 text-xs mt-0.5',
      
      // Controls & toolbar wrappers
      toolbarBg: isDark
        ? 'bg-slate-900/90 border-sky-500/30 text-sky-100'
        : 'bg-slate-50/80 border-slate-200/90 text-slate-700',
      
      subToolbarBg: isDark
        ? 'bg-slate-900/80 border-sky-500/20 text-sky-200'
        : 'bg-slate-100/80 border-slate-200/80 text-slate-700',

      // Recharts Canvas stroke properties
      gridStroke: isDark ? '#1e293b' : '#f1f5f9',
      axisStroke: isDark ? '#64748b' : '#94a3b8',
      tooltipCursor: isDark ? '#38bdf8' : '#94a3b8',
      
      // Line colors
      colors: {
        aiCorrected: isDark ? '#38bdf8' : '#2563eb',
        observed: isDark ? '#34d399' : '#10b981',
        rawForecast: isDark ? '#fb7185' : '#f43f5e',
        d3MovingAvg: isDark ? '#fbbf24' : '#f59e0b',
        d3TrendLine: isDark ? '#c084fc' : '#9333ea',
        compareObserved: isDark ? '#64748b' : '#94a3b8',
        compareAiCorrected: isDark ? '#818cf8' : '#818cf8',
        severeAlert: isDark ? '#881337' : '#ffe4e6',
        imdLine: isDark ? '#fbbf24' : '#d97706',
        rawError: isDark ? '#fb7185' : '#f43f5e',
        aiError: isDark ? '#34d399' : '#10b981',
        dotNorm: isDark ? '#38bdf8' : '#2563eb',
        surgeAnomaly: isDark ? '#f43f5e' : '#f43f5e',
        deficitAnomaly: isDark ? '#38bdf8' : '#3b82f6',
      },

      // Legend panel style
      legendContainer: isDark
        ? 'bg-slate-900/90 border-sky-500/30 text-sky-100'
        : 'bg-slate-50/90 border-slate-200/90 text-slate-700',
      legendSubCard: isDark
        ? 'bg-slate-950/80 border-sky-900/50 text-sky-100'
        : 'bg-white border-slate-200/80 text-slate-700',

      // Summary Box style
      summaryBoxBg: isDark
        ? 'bg-black/90 border-sky-500/40 text-sky-50 shadow-xl shadow-sky-950'
        : 'bg-slate-900 border-slate-800 text-white',
    };
  }, [isDark]);
  
  // Moving Average Window Selector state (7-day, 14-day, 30-day default options)
  const [movingAvgWindow, setMovingAvgWindow] = useState<number>(7);
  
  // Anomaly Detection States
  const [showAnomalies, setShowAnomalies] = useState<boolean>(true);
  const [anomalySensitivity, setAnomalySensitivity] = useState<number>(1.5); // Standard deviation multiplier

  // Confidence Interval, Threshold Alert & Global Crosshair Layer States
  const [showConfidenceInterval, setShowConfidenceInterval] = useState<boolean>(true);
  const [showQuartileAlerts, setShowQuartileAlerts] = useState<boolean>(true);
  const [showGlobalCrosshair, setShowGlobalCrosshair] = useState<boolean>(true);

  // D3 Smooth Transition Interpolation States & Refs
  const [animatedMovingAvg, setAnimatedMovingAvg] = useState<number[]>([]);
  const [animatedTrendLine, setAnimatedTrendLine] = useState<number[]>([]);
  const [isD3Interpolating, setIsD3Interpolating] = useState<boolean>(false);
  const [interpolationCause, setInterpolationCause] = useState<string>('');

  const currentMARef = useRef<number[]>([]);
  const currentTrendRef = useRef<number[]>([]);
  const prevStationRef = useRef<string>(selectedStationName);
  const prevWindowRef = useRef<number>(movingAvgWindow);
  const d3TimerRef = useRef<d3.Timer | null>(null);

  // Data Export & Day-by-Day Detailed Report States
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [showDayByDayReport, setShowDayByDayReport] = useState<boolean>(false);
  const [reportSearchQuery, setReportSearchQuery] = useState<string>('');
  const [reportRegimeFilter, setReportRegimeFilter] = useState<string>('All');
  const [reportAnomalyOnly, setReportAnomalyOnly] = useState<boolean>(false);
  const [reportScope, setReportScope] = useState<'full' | 'visible'>('full');
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // Zoom / Pan State
  const [zoomRange, setZoomRange] = useState<[number, number]>([0, 60]);
  const chartWrapperRef = useRef<HTMLDivElement>(null);

  // Multi-Station Comparison State
  const [activeStations, setActiveStations] = useState<string[]>([selectedStationId && selectedStationId !== 'ALL' ? selectedStationId : 'BOM_SANTACRUZ']);
  const [isStationSelectorOpen, setIsStationSelectorOpen] = useState(false);

  useEffect(() => {
    if (selectedStationId && selectedStationId !== 'ALL') {
      setActiveStations([selectedStationId]);
    } else if (selectedStationId === 'ALL' && activeStations.length === 0) {
      setActiveStations(['BOM_SANTACRUZ']);
    }
  }, [selectedStationId]);

  const primaryStationId = activeStations[0] || 'BOM_SANTACRUZ';
  
  // Isolate primary station for baseline metrics to not break legacy functionality
  const primaryData = useMemo(() => {
    const filtered = data.filter(d => d.stationId === primaryStationId);
    return filtered.slice(0, 60);
  }, [data, primaryStationId]);

  const slicedData = primaryData;

  // Keep zoomRange bounded whenever data changes
  useEffect(() => {
    setZoomRange([0, Math.min(60, slicedData.length)]);
  }, [slicedData.length]);

  const aiCorrectedValues = useMemo(() => slicedData.map((d) => d.correctedForecastMm), [slicedData]);
  const observedValues = useMemo(() => slicedData.map((d) => d.observedMm), [slicedData]);
  const rawForecastValues = useMemo(() => slicedData.map((d) => d.rawForecastMm), [slicedData]);

  // Moving Average calculations across primary series for climate signal trends using active movingAvgWindow
  const weeklyMaObserved = useMemo(
    () => computeD3MovingAverage(observedValues, movingAvgWindow),
    [observedValues, movingAvgWindow]
  );
  const weeklyMaRawForecast = useMemo(
    () => computeD3MovingAverage(rawForecastValues, movingAvgWindow),
    [rawForecastValues, movingAvgWindow]
  );
  const weeklyMaAiCorrected = useMemo(
    () => computeD3MovingAverage(aiCorrectedValues, movingAvgWindow),
    [aiCorrectedValues, movingAvgWindow]
  );

  // Moving Average calculations for error residuals using active movingAvgWindow
  const weeklyMaRawError = useMemo(
    () => computeD3MovingAverage(slicedData.map((d) => Math.abs(d.rawForecastMm - d.observedMm)), movingAvgWindow),
    [slicedData, movingAvgWindow]
  );
  const weeklyMaAiError = useMemo(
    () => computeD3MovingAverage(slicedData.map((d) => Math.abs(d.correctedForecastMm - d.observedMm)), movingAvgWindow),
    [slicedData, movingAvgWindow]
  );

  // Comparison series Moving Averages
  const weeklyMaCompareObserved = useMemo(() => {
    if (!isComparing || !compareData || compareData.length === 0) return [];
    const values = slicedData.map((d) => {
      const mmdd = d.date.length >= 10 ? d.date.substring(5) : d.date;
      const match = compareData.find((cd) => (cd.date.length >= 10 ? cd.date.substring(5) : cd.date) === mmdd);
      return match ? match.observedMm : 0;
    });
    return computeD3MovingAverage(values, movingAvgWindow);
  }, [slicedData, isComparing, compareData, movingAvgWindow]);

  const weeklyMaCompareAi = useMemo(() => {
    if (!isComparing || !compareData || compareData.length === 0) return [];
    const values = slicedData.map((d) => {
      const mmdd = d.date.length >= 10 ? d.date.substring(5) : d.date;
      const match = compareData.find((cd) => (cd.date.length >= 10 ? cd.date.substring(5) : cd.date) === mmdd);
      return match ? match.correctedForecastMm : 0;
    });
    return computeD3MovingAverage(values, movingAvgWindow);
  }, [slicedData, isComparing, compareData, movingAvgWindow]);

  // Compute D3-based moving average
  const d3AiMovingAvg = useMemo(
    () => computeD3MovingAverage(aiCorrectedValues, movingAvgWindow),
    [aiCorrectedValues, movingAvgWindow]
  );

  // Compute D3-based linear trend line
  const d3AiTrendLine = useMemo(
    () => computeD3LinearTrend(aiCorrectedValues),
    [aiCorrectedValues]
  );

  // D3 Transition Interpolation Engine: Smoothly morphs path data when movingAvgWindow or selectedStationName changes
  useEffect(() => {
    const stationChanged = prevStationRef.current !== selectedStationName;
    const windowChanged = prevWindowRef.current !== movingAvgWindow;

    let cause = '';
    if (stationChanged && windowChanged) {
      cause = `${selectedStationName} & ${movingAvgWindow}d Window`;
    } else if (stationChanged) {
      cause = `Station: ${selectedStationName}`;
    } else if (windowChanged) {
      cause = `Window: ${movingAvgWindow}-Day`;
    } else {
      cause = 'Recalibration';
    }

    prevStationRef.current = selectedStationName;
    prevWindowRef.current = movingAvgWindow;

    const targetMA = d3AiMovingAvg;
    const targetTrend = d3AiTrendLine;

    // First initialization without animation delay
    if (currentMARef.current.length === 0 || currentTrendRef.current.length === 0) {
      setAnimatedMovingAvg(targetMA);
      setAnimatedTrendLine(targetTrend);
      currentMARef.current = [...targetMA];
      currentTrendRef.current = [...targetTrend];
      return;
    }

    const startMA = currentMARef.current.length === targetMA.length ? [...currentMARef.current] : [...targetMA];
    const startTrend = currentTrendRef.current.length === targetTrend.length ? [...currentTrendRef.current] : [...targetTrend];

    // Check if there is actual value difference to interpolate
    const maDiffers = startMA.some((v, i) => Math.abs(v - (targetMA[i] ?? v)) > 0.05);
    const trendDiffers = startTrend.some((v, i) => Math.abs(v - (targetTrend[i] ?? v)) > 0.05);

    if (!maDiffers && !trendDiffers) {
      setAnimatedMovingAvg(targetMA);
      setAnimatedTrendLine(targetTrend);
      currentMARef.current = [...targetMA];
      currentTrendRef.current = [...targetTrend];
      return;
    }

    // Stop active D3 timer if running
    if (d3TimerRef.current) {
      d3TimerRef.current.stop();
      d3TimerRef.current = null;
    }

    setIsD3Interpolating(true);
    setInterpolationCause(cause);

    const interpolatorMA = d3.interpolateArray(startMA, targetMA);
    const interpolatorTrend = d3.interpolateArray(startTrend, targetTrend);

    const duration = 650; // ms cubic transition duration
    const timer = d3.timer((elapsed) => {
      const progress = Math.min(1, elapsed / duration);
      const easeT = d3.easeCubicOut(progress);

      const nextMA = interpolatorMA(easeT).map((val) => Math.round(val * 10) / 10);
      const nextTrend = interpolatorTrend(easeT).map((val) => Math.round(val * 10) / 10);

      setAnimatedMovingAvg(nextMA);
      setAnimatedTrendLine(nextTrend);
      currentMARef.current = nextMA;
      currentTrendRef.current = nextTrend;

      if (progress >= 1) {
        timer.stop();
        d3TimerRef.current = null;
        setIsD3Interpolating(false);
      }
    });

    d3TimerRef.current = timer;

    return () => {
      if (d3TimerRef.current) {
        d3TimerRef.current.stop();
        d3TimerRef.current = null;
      }
    };
  }, [d3AiMovingAvg, d3AiTrendLine, selectedStationName, movingAvgWindow]);

  // D3 Confidence Interval around Trend Line based on residual standard error
  const trendConfidenceAnalysis = useMemo(() => {
    if (aiCorrectedValues.length === 0) return { stdError: 0, margin: 0 };
    const trendResiduals = aiCorrectedValues.map((val, idx) => Math.abs(val - (d3AiTrendLine[idx] ?? val)));
    const stdError = d3.deviation(trendResiduals) || 8.5;
    const margin = Math.round((1.645 * stdError) * 10) / 10; // 90% confidence interval band

    return { stdError: Math.round(stdError * 10) / 10, margin };
  }, [aiCorrectedValues, d3AiTrendLine]);

  // D3 Quartiles & Extreme Thresholds calculation (Q25, Q50/Median, Q75 Heavy, Q90 Extreme)
  const d3Quartiles = useMemo(() => {
    if (aiCorrectedValues.length === 0) return { q25: 15, q50: 30, q75: 58, q90: 78 };
    const sorted = [...aiCorrectedValues].sort(d3.ascending);
    const q25 = d3.quantile(sorted, 0.25) ?? 15;
    const q50 = d3.quantile(sorted, 0.50) ?? 30;
    const q75 = d3.quantile(sorted, 0.75) ?? 58;
    const q90 = d3.quantile(sorted, 0.90) ?? 78;

    return {
      q25: Math.round(q25 * 10) / 10,
      q50: Math.round(q50 * 10) / 10,
      q75: Math.round(q75 * 10) / 10,
      q90: Math.round(q90 * 10) / 10,
    };
  }, [aiCorrectedValues]);

  // D3 Anomaly Detection: Compute residual standard deviation from moving average
  const anomalyAnalysis = useMemo(() => {
    if (aiCorrectedValues.length === 0) return { stdDev: 0, anomalies: [] };

    const residuals = aiCorrectedValues.map((val, idx) => Math.abs(val - d3AiMovingAvg[idx]));
    const stdDev = d3.deviation(residuals) || 12; // fallback std dev if 0
    const threshold = anomalySensitivity * stdDev;

    const anomalies = aiCorrectedValues.map((val, idx) => {
      const ma = d3AiMovingAvg[idx];
      const diff = val - ma;
      const absDiff = Math.abs(diff);
      const isAnomaly = absDiff >= threshold;
      const type = diff >= 0 ? ('surge' as const) : ('deficit' as const);
      const zScore = stdDev > 0 ? Math.round((absDiff / stdDev) * 10) / 10 : 0;

      return {
        isAnomaly,
        type,
        absDiff: Math.round(absDiff * 10) / 10,
        zScore,
        threshold: Math.round(threshold * 10) / 10
      };
    });

    return { stdDev: Math.round(stdDev * 10) / 10, anomalies };
  }, [aiCorrectedValues, d3AiMovingAvg, anomalySensitivity]);

  // Combine full chart data points
  const fullChartData = useMemo(() => {
    return slicedData.map((d, idx) => {
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

      const historicalAvg = d.historical10YearAvgMm || (d.observedMm * 0.7 + Math.sin(d.dayOfYear * 0.1) * 15 + 10);
      const variance = Math.round((d.correctedForecastMm - historicalAvg) * 10) / 10;
      const variancePct = historicalAvg > 0 ? Math.round(((d.correctedForecastMm - historicalAvg) / historicalAvg) * 1000) / 10 : 0;

      // Calculate percentage differences between selected year and comparison year
      let compAiPctDiff: number | null = null;
      let compObsPctDiff: number | null = null;

      if (compAi !== undefined && compAi !== null) {
        compAiPctDiff = compAi > 0
          ? Math.round(((d.correctedForecastMm - compAi) / compAi) * 1000) / 10
          : (d.correctedForecastMm > 0 ? 100 : 0);
      }

      if (compObs !== undefined && compObs !== null) {
        compObsPctDiff = compObs > 0
          ? Math.round(((d.observedMm - compObs) / compObs) * 1000) / 10
          : (d.observedMm > 0 ? 100 : 0);
      }

      const anomalyMeta = anomalyAnalysis.anomalies[idx] || {
        isAnomaly: false,
        type: 'surge' as const,
        absDiff: 0,
        zScore: 0,
        threshold: 0
      };

      const trendVal = (animatedTrendLine.length > 0 ? animatedTrendLine[idx] : d3AiTrendLine[idx]) ?? 0;
      const movingAvgVal = (animatedMovingAvg.length > 0 ? animatedMovingAvg[idx] : d3AiMovingAvg[idx]) ?? 0;
      const trendLower = Math.max(0, Math.round((trendVal - trendConfidenceAnalysis.margin) * 10) / 10);
      const trendUpper = Math.round((trendVal + trendConfidenceAnalysis.margin) * 10) / 10;

      const exceedsQ75 = trendVal >= d3Quartiles.q75 || d.correctedForecastMm >= d3Quartiles.q75;
      const exceedsQ90 = trendVal >= d3Quartiles.q90 || d.correctedForecastMm >= d3Quartiles.q90;

      const isWeeklyMA = dataRepresentation === 'weeklyMA';

      const rawDailyObs = d.observedMm;
      const rawDailyRaw = d.rawForecastMm;
      const rawDailyAi = d.correctedForecastMm;

      const weeklyMaObs = weeklyMaObserved[idx] ?? d.observedMm;
      const weeklyMaRaw = weeklyMaRawForecast[idx] ?? d.rawForecastMm;
      const weeklyMaAi = weeklyMaAiCorrected[idx] ?? d.correctedForecastMm;

      const rawDailyRawErr = Math.round(Math.abs(d.rawForecastMm - d.observedMm) * 10) / 10;
      const rawDailyAiErr = Math.round(Math.abs(d.correctedForecastMm - d.observedMm) * 10) / 10;

      const weeklyMaRawErr = weeklyMaRawError[idx] ?? rawDailyRawErr;
      const weeklyMaAiErr = weeklyMaAiError[idx] ?? rawDailyAiErr;

      const weeklyCompObs = compObs !== undefined && weeklyMaCompareObserved[idx] !== undefined ? weeklyMaCompareObserved[idx] : compObs;
      const weeklyCompAi = compAi !== undefined && weeklyMaCompareAi[idx] !== undefined ? weeklyMaCompareAi[idx] : compAi;

      const baseObj = {
        date: mmdd,
        fullDate: d.date,
        year: d.year,
        // Active series plotted in Recharts (dynamically toggled between Raw Daily and Weekly Moving Average)
        observed: isWeeklyMA ? weeklyMaObs : rawDailyObs,
        rawForecast: isWeeklyMA ? weeklyMaRaw : rawDailyRaw,
        baseline: d.baselineLinearMm,
        aiCorrected: isWeeklyMA ? weeklyMaAi : rawDailyAi,
        rawError: isWeeklyMA ? weeklyMaRawErr : rawDailyRawErr,
        aiError: isWeeklyMA ? weeklyMaAiErr : rawDailyAiErr,
        // Raw daily baseline metrics (always preserved for high-precision analytical tooltip display)
        rawDailyObserved: rawDailyObs,
        rawDailyRawForecast: rawDailyRaw,
        rawDailyAiCorrected: rawDailyAi,
        rawDailyRawError: rawDailyRawErr,
        rawDailyAiError: rawDailyAiErr,
        // 7-day Weekly Moving Average values (preserved for dual inspection in both modes)
        weeklyMaObs,
        weeklyMaRaw,
        weeklyMaAi,
        weeklyMaRawError: weeklyMaRawErr,
        weeklyMaAiError: weeklyMaAiErr,
        isWeeklyMA,
        dataRepresentation,
        regime: d.detectedRegime,
        humidity: d.relativeHumidity850hPa,
        pressure: d.surfacePressureHpa,
        compareObserved: isWeeklyMA ? weeklyCompObs : compObs,
        compareAiCorrected: isWeeklyMA ? weeklyCompAi : compAi,
        compAiPctDiff,
        compObsPctDiff,
        d3AiMovingAvg: movingAvgVal,
        d3AiTrendLine: trendVal,
        d3TrendLower: trendLower,
        d3TrendUpper: trendUpper,
        d3TrendBand: [trendLower, trendUpper],
        exceedsQ75,
        exceedsQ90,
        historicalAvg,
        variance,
        variancePct,
        // D3 Anomaly properties
        isAnomaly: anomalyMeta.isAnomaly,
        anomalyType: anomalyMeta.type,
        anomalyDiff: anomalyMeta.absDiff,
        anomalyZScore: anomalyMeta.zScore,
      };
      
      // Inject comparison stations
      activeStations.slice(1).forEach((stId) => {
        const compRow = data.find(x => x.stationId === stId && x.date === d.date);
        if (compRow) {
          baseObj[`${stId}_observed`] = compRow.observedMm;
          baseObj[`${stId}_aiCorrected`] = compRow.correctedForecastMm;
        }
      });
      
      return baseObj;
    });
  }, [
    activeStations,
    data,
    slicedData,
    isComparing,
    compareData,
    d3AiMovingAvg,
    d3AiTrendLine,
    animatedMovingAvg,
    animatedTrendLine,
    anomalyAnalysis,
    dataRepresentation,
    weeklyMaObserved,
    weeklyMaRawForecast,
    weeklyMaAiCorrected,
    weeklyMaRawError,
    weeklyMaAiError,
    weeklyMaCompareObserved,
    weeklyMaCompareAi,
  ]);

  // Apply Zoom Slice
  const chartData = useMemo(() => {
    const [start, end] = zoomRange;
    return fullChartData.slice(Math.max(0, start), Math.min(fullChartData.length, end));
  }, [fullChartData, zoomRange]);

  // Global Y-Axis Max Value for precise D3 crosshair vertical positioning
  const maxYValue = useMemo(() => {
    let maxVal = 64.5;
    chartData.forEach((d) => {
      if (d.observed > maxVal) maxVal = d.observed;
      if (d.rawForecast > maxVal) maxVal = d.rawForecast;
      if (d.aiCorrected > maxVal) maxVal = d.aiCorrected;
      if (d.compareObserved && d.compareObserved > maxVal) maxVal = d.compareObserved;
      if (d.compareAiCorrected && d.compareAiCorrected > maxVal) maxVal = d.compareAiCorrected;
    });
    return Math.max(80, Math.ceil(maxVal * 1.12));
  }, [chartData]);

  // Total detected anomalies count in currently visible interval
  const totalAnomaliesCount = useMemo(() => {
    return fullChartData.filter((d) => d.isAnomaly).length;
  }, [fullChartData]);

  // Detected anomalies in currently visible zoom window
  const visibleAnomalies = useMemo(() => {
    return chartData.filter((d) => d.isAnomaly);
  }, [chartData]);

  // Automated Day-by-Day Meteorological Narrative Generator
  const generateDailyNarrative = (item: any) => {
    const { observed, rawForecast, aiCorrected, rawError, aiError, isAnomaly, anomalyType, anomalyDiff, regime } = item;
    const aiImproved = aiError < rawError;
    const diffSaved = Math.abs(rawError - aiError).toFixed(1);

    if (isAnomaly) {
      if (anomalyType === 'surge') {
        return `⚠️ D3 Trend Anomaly (Surge): Recorded ${observed}mm (${regime}), exceeding ${movingAvgWindow}-day moving avg by +${anomalyDiff}mm. AI calibration predicted ${aiCorrected}mm, reducing raw NWP bias error by ${diffSaved}mm.`;
      } else if (anomalyType === 'deficit') {
        return `📉 D3 Trend Anomaly (Deficit / Dry Spell): Rainfall dropped -${Math.abs(anomalyDiff)}mm below expected trend. Ground truth recorded ${observed}mm vs raw NWP ${rawForecast}mm.`;
      }
    }

    if (observed >= 64.5) {
      return `🌧️ Heavy Monsoon Event: High precipitation of ${observed}mm recorded. Raw NWP forecasted ${rawForecast}mm (Error: ${rawError}mm), while AI model calibrated to ${aiCorrected}mm (Error: ${aiError}mm). ${aiImproved ? `Saved ${diffSaved}mm error.` : 'Upper quartile extreme captured.'}`;
    }

    if (observed <= 2.5) {
      return `☀️ Clear / Dry Day: Minimal rainfall recorded (${observed}mm). Both raw NWP and AI model maintained low moisture baseline (${aiCorrected}mm).`;
    }

    if (aiImproved) {
      return `✅ AI Skill Gain: Ground truth recorded ${observed}mm. AI model corrected raw NWP (${rawForecast}mm) to ${aiCorrected}mm, eliminating ${diffSaved}mm of NWP forecast bias.`;
    }

    return `📊 Standard Monsoonal Day: Ground observed ${observed}mm (${regime}). AI corrected forecast aligned at ${aiCorrected}mm (Error: ${aiError}mm).`;
  };

  // CSV Export Handler
  const handleDownloadCSV = (exportScope: 'full' | 'visible' = 'full') => {
    const dataset = exportScope === 'visible' ? chartData : fullChartData;
    if (!dataset || dataset.length === 0) return;

    const headers = [
      'Station',
      'Date',
      'Full Date',
      'Year',
      'Observed Rainfall (mm)',
      'Raw NWP Forecast (mm)',
      'AI Corrected Forecast (mm)',
      'Raw Model Error (mm)',
      'AI Model Error (mm)',
      'D3 Trend Line (mm)',
      'D3 Trend Lower 90% (mm)',
      'D3 Trend Upper 90% (mm)',
      `D3 ${movingAvgWindow}-Day Moving Avg (mm)`,
      'Is Anomaly',
      'Anomaly Type',
      'Anomaly Z-Score',
      'Anomaly Deviation (mm)',
      'Relative Humidity (%)',
      'Atmospheric Pressure (hPa)',
      'Rainfall Regime',
      'Exceeds Q75 (>=48mm)',
      'Exceeds Q90 (>=64.5mm)',
      'Comparison Year',
      'Comparison Observed (mm)',
      'Comparison AI Corrected (mm)',
      'Comparison AI Delta (%)'
    ];

    const csvRows = [headers.join(',')];

    dataset.forEach((row) => {
      const line = [
        `"${selectedStationName}"`,
        `"${row.date}"`,
        `"${row.fullDate}"`,
        row.year || '',
        row.observed ?? 0,
        row.rawForecast ?? 0,
        row.aiCorrected ?? 0,
        row.rawError ?? 0,
        row.aiError ?? 0,
        row.d3AiTrendLine ?? 0,
        row.d3TrendLower ?? 0,
        row.d3TrendUpper ?? 0,
        row.d3AiMovingAvg ?? 0,
        row.isAnomaly ? 'TRUE' : 'FALSE',
        `"${row.anomalyType || 'normal'}"`,
        row.anomalyZScore || 0,
        row.anomalyDiff || 0,
        row.humidity || 0,
        row.pressure || 0,
        `"${row.regime || ''}"`,
        row.exceedsQ75 ? 'TRUE' : 'FALSE',
        row.exceedsQ90 ? 'TRUE' : 'FALSE',
        isComparing ? (compareYear || '') : '',
        isComparing ? (row.compareObserved ?? '') : '',
        isComparing ? (row.compareAiCorrected ?? '') : '',
        isComparing ? (row.compAiPctDiff ?? '') : ''
      ];
      csvRows.push(line.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timeStamp = new Date().toISOString().split('T')[0];
    const safeStation = selectedStationName.replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('download', `${safeStation}_Rainfall_${exportScope}_${timeStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // JSON Export Handler
  const handleDownloadJSON = (exportScope: 'full' | 'visible' = 'full') => {
    const dataset = exportScope === 'visible' ? chartData : fullChartData;
    if (!dataset || dataset.length === 0) return;

    const totalObserved = Number(dataset.reduce((acc, d) => acc + (d.observed || 0), 0).toFixed(1));
    const totalAi = Number(dataset.reduce((acc, d) => acc + (d.aiCorrected || 0), 0).toFixed(1));
    const totalRaw = Number(dataset.reduce((acc, d) => acc + (d.rawForecast || 0), 0).toFixed(1));
    const avgRawErr = Number((dataset.reduce((acc, d) => acc + (d.rawError || 0), 0) / dataset.length).toFixed(2));
    const avgAiErr = Number((dataset.reduce((acc, d) => acc + (d.aiError || 0), 0) / dataset.length).toFixed(2));
    const skillGainPct = avgRawErr > 0 ? Number((((avgRawErr - avgAiErr) / avgRawErr) * 100).toFixed(1)) : 0;
    const anomaliesCount = dataset.filter((d) => d.isAnomaly).length;

    const payload = {
      reportMetadata: {
        stationName: selectedStationName,
        exportScope,
        exportTimestamp: new Date().toISOString(),
        totalDays: dataset.length,
        movingAverageWindowDays: movingAvgWindow,
        totalObservedMm: totalObserved,
        totalAiForecastMm: totalAi,
        totalRawForecastMm: totalRaw,
        avgRawErrorMm: avgRawErr,
        avgAiErrorMm: avgAiErr,
        aiSkillImprovementPct: skillGainPct,
        anomalyDaysCount: anomaliesCount,
        comparisonYearActive: isComparing ? (compareYear || null) : null
      },
      dailyDataPoints: dataset.map((d) => ({
        date: d.date,
        fullDate: d.fullDate,
        year: d.year,
        observedMm: d.observed,
        rawForecastMm: d.rawForecast,
        aiCorrectedMm: d.aiCorrected,
        rawErrorMm: d.rawError,
        aiErrorMm: d.aiError,
        d3TrendLineMm: d.d3AiTrendLine,
        d3TrendLowerMm: d.d3TrendLower,
        d3TrendUpperMm: d.d3TrendUpper,
        d3MovingAvgMm: d.d3AiMovingAvg,
        isAnomaly: d.isAnomaly,
        anomalyType: d.anomalyType,
        anomalyZScore: d.anomalyZScore,
        anomalyDiffMm: d.anomalyDiff,
        humidityPct: d.humidity,
        pressureHpa: d.pressure,
        regime: d.regime,
        exceedsQ75: d.exceedsQ75,
        exceedsQ90: d.exceedsQ90,
        dailyNarrative: generateDailyNarrative(d),
        ...(isComparing ? {
          compareObservedMm: d.compareObserved,
          compareAiCorrectedMm: d.compareAiCorrected,
          compareAiPctDiff: d.compAiPctDiff
        } : {})
      }))
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timeStamp = new Date().toISOString().split('T')[0];
    const safeStation = selectedStationName.replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('download', `${safeStation}_Rainfall_${exportScope}_${timeStamp}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // Filtered dataset for Day-by-Day Report Modal
  const reportDataset = useMemo(() => {
    let source = reportScope === 'visible' ? chartData : fullChartData;

    if (reportAnomalyOnly) {
      source = source.filter((d) => d.isAnomaly);
    }

    if (reportRegimeFilter !== 'All') {
      source = source.filter((d) => d.regime && d.regime.toLowerCase().includes(reportRegimeFilter.toLowerCase()));
    }

    if (reportSearchQuery.trim()) {
      const q = reportSearchQuery.toLowerCase().trim();
      source = source.filter((d) => 
        (d.date && d.date.toLowerCase().includes(q)) ||
        (d.fullDate && d.fullDate.toLowerCase().includes(q)) ||
        (d.regime && d.regime.toLowerCase().includes(q)) ||
        (d.anomalyType && d.anomalyType.toLowerCase().includes(q))
      );
    }

    return source;
  }, [fullChartData, chartData, reportScope, reportAnomalyOnly, reportRegimeFilter, reportSearchQuery]);

  // Aggregated Report Metrics
  const reportStats = useMemo(() => {
    const dataset = reportScope === 'visible' ? chartData : fullChartData;
    const totalObserved = Number(dataset.reduce((acc, d) => acc + (d.observed || 0), 0).toFixed(1));
    const totalAi = Number(dataset.reduce((acc, d) => acc + (d.aiCorrected || 0), 0).toFixed(1));
    const totalRaw = Number(dataset.reduce((acc, d) => acc + (d.rawForecast || 0), 0).toFixed(1));
    const avgRawErr = dataset.length ? Number((dataset.reduce((acc, d) => acc + (d.rawError || 0), 0) / dataset.length).toFixed(2)) : 0;
    const avgAiErr = dataset.length ? Number((dataset.reduce((acc, d) => acc + (d.aiError || 0), 0) / dataset.length).toFixed(2)) : 0;
    const skillGain = avgRawErr > 0 ? Number((((avgRawErr - avgAiErr) / avgRawErr) * 100).toFixed(1)) : 0;
    const anomaliesCount = dataset.filter((d) => d.isAnomaly).length;

    return {
      totalDays: dataset.length,
      totalObserved,
      totalAi,
      totalRaw,
      avgRawErr,
      avgAiErr,
      skillGain,
      anomaliesCount
    };
  }, [fullChartData, chartData, reportScope]);

  // Copy Markdown table summary
  const handleCopyReportTable = (dataset: any[]) => {
    let markdown = `# Day-by-Day Rainfall Report: ${selectedStationName}\n\n`;
    markdown += `| Date | Observed (mm) | Raw NWP (mm) | AI Corrected (mm) | AI Error (mm) | D3 Trend (mm) | Anomaly | Daily Meteorological Assessment |\n`;
    markdown += `|---|---|---|---|---|---|---|---|\n`;

    dataset.forEach((item) => {
      const narrative = generateDailyNarrative(item);
      markdown += `| ${item.fullDate || item.date} | ${item.observed} | ${item.rawForecast} | ${item.aiCorrected} | ${item.aiError} | ${item.d3AiTrendLine} | ${item.isAnomaly ? `YES (${item.anomalyType})` : 'NO'} | ${narrative} |\n`;
    });

    navigator.clipboard.writeText(markdown).then(() => {
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
    });
  };

  // Attach D3-Zoom interaction to chart container ref
  useEffect(() => {
    if (!chartWrapperRef.current) return;

    const wrapper = d3.select(chartWrapperRef.current);

    const zoomBehavior = d3
      .zoom<HTMLDivElement, unknown>()
      .scaleExtent([1, 4])
      .on('zoom', (event) => {
        const k = event.transform.k;
        const total = fullChartData.length || 60;
        const visibleCount = Math.max(10, Math.round(total / k));

        // Calculate offset based on horizontal translation
        const tx = event.transform.x;
        const maxOffset = total - visibleCount;
        const rawOffset = Math.round((-tx / 200) * (total / visibleCount));
        const start = Math.max(0, Math.min(maxOffset, rawOffset));
        const end = Math.min(total, start + visibleCount);

        setZoomRange([start, end]);
      });

    wrapper.call(zoomBehavior as any);

    return () => {
      wrapper.on('.zoom', null);
    };
  }, [fullChartData.length]);

  // Zoom control handlers
  const handleZoomIn = () => {
    const [start, end] = zoomRange;
    const currentSpan = end - start;
    if (currentSpan <= 10) return; // Min span 10 points
    const step = Math.max(2, Math.floor(currentSpan * 0.2));
    setZoomRange([start + step, end - step]);
  };

  const handleZoomOut = () => {
    const [start, end] = zoomRange;
    const total = fullChartData.length;
    const step = Math.max(2, Math.floor((end - start) * 0.2));
    setZoomRange([Math.max(0, start - step), Math.min(total, end + step)]);
  };

  const handleResetZoom = () => {
    setZoomRange([0, fullChartData.length]);
  };

  const handlePresetZoom = (type: 'all' | 'onset' | 'peak' | 'withdrawal') => {
    const total = fullChartData.length;
    if (type === 'all') setZoomRange([0, total]);
    else if (type === 'onset') setZoomRange([0, Math.min(total, 20)]);
    else if (type === 'peak') setZoomRange([Math.max(0, Math.floor(total * 0.25)), Math.min(total, Math.floor(total * 0.75))]);
    else if (type === 'withdrawal') setZoomRange([Math.max(0, Math.floor(total * 0.65)), total]);
  };

  // Custom Dot Renderer to highlight D3 Anomaly points with distinct animated SVG markers
  const renderAiDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined || !payload) return null;

    if (showAnomalies && payload.isAnomaly) {
      const isSurge = payload.anomalyType === 'surge';
      const color = isSurge ? themeStyles.colors.surgeAnomaly : themeStyles.colors.deficitAnomaly;

      return (
        <g key={`dot-anomaly-${payload.fullDate}`}>
          {/* Pulsing ring animation */}
          <circle
            cx={cx}
            cy={cy}
            r={10}
            fill={color}
            fillOpacity={0.3}
            className="animate-ping"
          />
          {/* Warning Halo */}
          <circle
            cx={cx}
            cy={cy}
            r={8}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeDasharray="2 2"
          />
          {/* Inner core */}
          <circle
            cx={cx}
            cy={cy}
            r={4.5}
            fill={color}
            stroke={isDark ? '#020617' : '#ffffff'}
            strokeWidth={1.5}
          />
        </g>
      );
    }

    return (
      <circle
        key={`dot-norm-${payload.fullDate}`}
        cx={cx}
        cy={cy}
        r={2.5}
        fill={themeStyles.colors.dotNorm}
      />
    );
  };

  // D3 Global Surface Crosshair Component
  const CustomCrosshair = (props: any) => {
    const { x, width, height, top, left, payload } = props;
    if (!payload || !payload.length || x === undefined || x === null) return null;

    const item = payload[0]?.payload;
    if (!item) return null;

    const plotHeight = height || 300;
    const plotTop = top || 10;
    const plotLeft = left || 40;
    const plotWidth = width || 600;

    const clampY = (v: number) => Math.min(plotTop + plotHeight, Math.max(plotTop, v));

    // Primary AI Rainfall
    const primaryAiMm = item.aiCorrected ?? 0;
    const yPrimaryAi = clampY(plotTop + plotHeight - (primaryAiMm / maxYValue) * plotHeight);

    // Primary Observed Ground Truth
    const primaryObsMm = item.observed ?? 0;
    const yPrimaryObs = clampY(plotTop + plotHeight - (primaryObsMm / maxYValue) * plotHeight);

    // Comparison AI Rainfall (if active)
    const compAiMm = item.compareAiCorrected;
    const hasCompAi = isComparing && compAiMm !== undefined && compAiMm !== null;
    const yCompAi = hasCompAi ? clampY(plotTop + plotHeight - (compAiMm / maxYValue) * plotHeight) : null;

    // Comparison Observed Ground Truth (if active)
    const compObsMm = item.compareObserved;
    const hasCompObs = isComparing && compObsMm !== undefined && compObsMm !== null;
    const yCompObs = hasCompObs ? clampY(plotTop + plotHeight - (compObsMm / maxYValue) * plotHeight) : null;

    const compYrLabel = compareYear || 'Comp';

    return (
      <g className="pointer-events-none select-none">
        {/* 1. Global Vertical Crosshair Line (X-Axis Date) */}
        <line
          x1={x}
          y1={plotTop}
          x2={x}
          y2={plotTop + plotHeight}
          stroke={isDark ? '#38bdf8' : '#2563eb'}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          strokeOpacity={0.85}
        />

        {/* Vertical Crosshair Date Badge on X-Axis */}
        <g transform={`translate(${x}, ${plotTop + plotHeight + 3})`}>
          <rect
            x={-32}
            y={0}
            width={64}
            height={18}
            rx={4}
            fill={isDark ? '#020617' : '#0f172a'}
            stroke={isDark ? '#38bdf8' : '#2563eb'}
            strokeWidth={1}
          />
          <text
            x={0}
            y={12}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={10}
            fontWeight="bold"
            fontFamily="monospace"
          >
            {item.date}
          </text>
        </g>

        {/* 2. Primary AI Corrected Horizontal Crosshair Line */}
        <line
          x1={plotLeft}
          y1={yPrimaryAi}
          x2={plotLeft + plotWidth}
          y2={yPrimaryAi}
          stroke={isDark ? '#22d3ee' : '#2563eb'}
          strokeWidth={1.2}
          strokeDasharray="3 3"
          strokeOpacity={0.85}
        />
        {/* Primary AI Intersection Point */}
        <circle
          cx={x}
          cy={yPrimaryAi}
          r={5}
          fill={isDark ? '#06b6d4' : '#2563eb'}
          stroke="#ffffff"
          strokeWidth={2}
        />
        {/* Primary AI Y-Axis Value Badge */}
        <g transform={`translate(${plotLeft - 4}, ${yPrimaryAi})`}>
          <rect
            x={-68}
            y={-10}
            width={65}
            height={20}
            rx={4}
            fill={isDark ? '#083344' : '#eff6ff'}
            stroke={isDark ? '#06b6d4' : '#2563eb'}
            strokeWidth={1.2}
          />
          <text
            x={-35}
            y={3}
            textAnchor="middle"
            fill={isDark ? '#67e8f9' : '#1d4ed8'}
            fontSize={10}
            fontWeight="bold"
            fontFamily="monospace"
          >
            {primaryAiMm} mm
          </text>
        </g>

        {/* 3. Comparison Series Crosshair (when comparison mode is active) */}
        {hasCompAi && yCompAi !== null && (
          <g>
            {/* Comparison AI Horizontal Crosshair Line */}
            <line
              x1={plotLeft}
              y1={yCompAi}
              x2={plotLeft + plotWidth}
              y2={yCompAi}
              stroke="#818cf8"
              strokeWidth={1.2}
              strokeDasharray="3 3"
              strokeOpacity={0.9}
            />
            {/* Comparison AI Intersection Point */}
            <circle
              cx={x}
              cy={yCompAi}
              r={5}
              fill="#6366f1"
              stroke="#ffffff"
              strokeWidth={2}
            />
            {/* Comparison Y-Axis Value Badge on Right Axis */}
            <g transform={`translate(${plotLeft + plotWidth + 4}, ${yCompAi})`}>
              <rect
                x={2}
                y={-10}
                width={78}
                height={20}
                rx={4}
                fill={isDark ? '#1e1b4b' : '#e0e7ff'}
                stroke="#6366f1"
                strokeWidth={1.2}
              />
              <text
                x={41}
                y={3}
                textAnchor="middle"
                fill={isDark ? '#a5b4fc' : '#4338ca'}
                fontSize={10}
                fontWeight="bold"
                fontFamily="monospace"
              >
                {compYrLabel}: {compAiMm}m
              </text>
            </g>

            {/* Interpolated Difference Crosshair Connector Pill */}
            {item.compAiPctDiff !== null && Math.abs(yPrimaryAi - yCompAi) > 12 && (
              <g transform={`translate(${Math.min(plotLeft + plotWidth - 70, Math.max(plotLeft + 70, x + 8))}, ${(yPrimaryAi + yCompAi) / 2})`}>
                <rect
                  x={-35}
                  y={-9}
                  width={70}
                  height={18}
                  rx={4}
                  fill={isDark ? '#020617' : '#0f172a'}
                  stroke="#818cf8"
                  strokeWidth={1}
                />
                <text
                  x={0}
                  y={3}
                  textAnchor="middle"
                  fill="#a5b4fc"
                  fontSize={9}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  Δ {item.compAiPctDiff > 0 ? `+${item.compAiPctDiff}%` : `${item.compAiPctDiff}%`}
                </text>
              </g>
            )}
          </g>
        )}

        {/* Primary Ground Observed Point */}
        <circle
          cx={x}
          cy={yPrimaryObs}
          r={3.5}
          fill="#10b981"
          stroke="#ffffff"
          strokeWidth={1.5}
        />

        {/* Comparison Ground Observed Point if present */}
        {hasCompObs && yCompObs !== null && (
          <circle
            cx={x}
            cy={yCompObs}
            r={3.5}
            fill="#34d399"
            stroke="#0f172a"
            strokeWidth={1.5}
          />
        )}
      </g>
    );
  };

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
      const hasComparison = isComparing && (item.compareAiCorrected !== undefined || item.compareObserved !== undefined);
      const compYrLabel = compareYear || (item.year ? item.year - 1 : 'Comparison Year');
      const currentYrLabel = item.year || 'Selected Year';

      return (
        <div className="bg-slate-900/95 border border-slate-700 text-white p-2.5 rounded-xl shadow-2xl backdrop-blur-xl text-xs space-y-1.5 font-sans min-w-[270px] max-w-[340px] max-h-[380px] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-200">{item.fullDate}</span>
              {item.year && <span className="text-[10px] text-slate-400">({item.year})</span>}
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-sans font-medium border border-blue-500/30">
              {item.regime}
            </span>
          </div>

          {/* D3 Trend Anomaly Badge */}
          {showAnomalies && item.isAnomaly && (
            <div className={`p-2 rounded-lg border text-[11px] space-y-0.5 ${
              item.anomalyType === 'surge'
                ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                : 'bg-sky-950/80 border-sky-500/50 text-sky-200'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                  D3 Trend Anomaly Detected!
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-black/40">
                  {item.anomalyZScore}σ Deviation
                </span>
              </div>
              <p className="text-[10px] opacity-90">
                Rainfall ({item.aiCorrected}mm) deviates by <strong>+{item.anomalyDiff}mm</strong> from the D3 {movingAvgWindow}-day moving avg ({item.d3AiMovingAvg}mm).
              </p>
            </div>
          )}

          {/* Interactive Percentage Difference Comparison Card */}
          {hasComparison ? (
            <div className="bg-indigo-950/70 border border-indigo-500/40 rounded-lg p-2.5 space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-200 border-b border-indigo-800/60 pb-1">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                  {currentYrLabel} vs {compYrLabel} % Diff
                </span>
              </div>

              {/* AI Corrected Comparison */}
              {item.compareAiCorrected !== undefined && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-medium">AI Forecast:</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-slate-400 text-[10px]">{item.compareAiCorrected}mm &rarr;</span>
                      <strong className="text-blue-300">{item.aiCorrected}mm</strong>
                      {item.compAiPctDiff !== null && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 ${
                          item.compAiPctDiff > 0 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : item.compAiPctDiff < 0 
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {item.compAiPctDiff > 0 ? '▲ +' : item.compAiPctDiff < 0 ? '▼ ' : ''}
                          {item.compAiPctDiff}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Ground Observed Comparison */}
              {item.compareObserved !== undefined && (
                <div className="space-y-1 pt-0.5 border-t border-indigo-900/50">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-medium">Observed Rain:</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-slate-400 text-[10px]">{item.compareObserved}mm &rarr;</span>
                      <strong className="text-emerald-300">{item.observed}mm</strong>
                      {item.compObsPctDiff !== null && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 ${
                          item.compObsPctDiff > 0 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : item.compObsPctDiff < 0 
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {item.compObsPctDiff > 0 ? '▲ +' : item.compObsPctDiff < 0 ? '▼ ' : ''}
                          {item.compObsPctDiff}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Variance vs 10-Year Historical Avg when comparison mode is inactive */
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-lg p-2 flex justify-between items-center text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Activity className="w-3 h-3 text-amber-400" />
                vs 10-Yr Avg ({item.historicalAvg?.toFixed(1)}mm):
              </span>
              <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                item.variance > 0 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                  : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              }`}>
                {item.variance > 0 ? '▲ +' : ''}{item.variance?.toFixed(1)}mm ({item.variancePct > 0 ? '+' : ''}{item.variancePct?.toFixed(1)}%)
              </span>
            </div>
          )}

          {/* D3 Moving Average & Trend Line Summary */}
          {(showD3MovingAvg || showD3TrendLine || showQuartileAlerts) && (
            <div className="bg-slate-950/80 border border-amber-500/30 rounded-lg p-2 space-y-1 text-[11px]">
              <div className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Calculator className="w-3 h-3 text-amber-400" />
                  D3 Statistical Moving Metrics
                </span>
                <span className="font-mono text-[9px] text-amber-400/80">D3 Engine</span>
              </div>
              {showD3MovingAvg && (
                <div className="flex justify-between items-center text-slate-300">
                  <span>D3 {movingAvgWindow}-Day Moving Avg:</span>
                  <span className="font-mono font-bold text-amber-300">{item.d3AiMovingAvg} mm</span>
                </div>
              )}
              {showD3TrendLine && (
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>D3 Linear Regression Trend:</span>
                    <span className="font-mono font-bold text-purple-300">{item.d3AiTrendLine} mm</span>
                  </div>
                  {showConfidenceInterval && (
                    <div className="flex justify-between items-center text-[10px] text-purple-300/80 pl-2">
                      <span>90% Confidence Interval:</span>
                      <span className="font-mono">[{item.d3TrendLower} &ndash; {item.d3TrendUpper} mm]</span>
                    </div>
                  )}
                </div>
              )}
              {showQuartileAlerts && (
                <div className="pt-1 border-t border-slate-800 space-y-0.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-amber-300/90 font-medium">Historical Quartiles:</span>
                    <span className="font-mono text-[10px] text-slate-400">Q75: {d3Quartiles.q75}mm | Q90: {d3Quartiles.q90}mm</span>
                  </div>
                  {(item.aiCorrected >= d3Quartiles.q75 || item.d3AiTrendLine >= d3Quartiles.q75) && (
                    <div className={`p-1 rounded text-[10px] font-bold flex items-center justify-between ${
                      item.aiCorrected >= d3Quartiles.q90 || item.d3AiTrendLine >= d3Quartiles.q90
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}>
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {item.aiCorrected >= d3Quartiles.q90 || item.d3AiTrendLine >= d3Quartiles.q90
                          ? 'Threshold Alert: Exceeds Q90 Extreme'
                          : 'Threshold Alert: Exceeds Q75 Heavy'}
                      </span>
                      <span className="font-mono">
                        {item.aiCorrected >= d3Quartiles.q90 || item.d3AiTrendLine >= d3Quartiles.q90
                          ? `≥${d3Quartiles.q90}mm`
                          : `≥${d3Quartiles.q75}mm`}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Core Values 3-Box Grid */}
          <div className="space-y-1 pt-1.5 border-t border-slate-800">
            {dataRepresentation === 'weeklyMA' && (
              <div className="text-[10px] text-amber-300 font-semibold flex items-center justify-between pb-0.5">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-amber-400" />
                  Weekly Moving Average (7-Day Rolling Mean)
                </span>
                <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-500/40 text-amber-200">
                  Climate Signal
                </span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-1.5 text-center">
                <span className="block text-[9px] uppercase font-bold text-emerald-400">Ground Obs</span>
                <span className="font-mono font-bold text-xs text-emerald-300">
                  {item.observed} <span className="text-[9px] font-normal">mm</span>
                </span>
                <span className="block text-[9px] text-slate-400 font-mono mt-0.5">
                  {dataRepresentation === 'weeklyMA' ? `Raw: ${item.rawDailyObserved}mm` : `7d: ${item.weeklyMaObs}mm`}
                </span>
              </div>

              <div className="bg-rose-950/40 border border-rose-500/30 rounded-lg p-1.5 text-center">
                <span className="block text-[9px] uppercase font-bold text-rose-400">Raw NWP</span>
                <span className="font-mono font-bold text-xs text-rose-300">
                  {item.rawForecast} <span className="text-[9px] font-normal">mm</span>
                </span>
                <span className="block text-[9px] text-slate-400 font-mono mt-0.5">
                  {dataRepresentation === 'weeklyMA' ? `Raw: ${item.rawDailyRawForecast}mm` : `7d: ${item.weeklyMaRaw}mm`}
                </span>
              </div>

              <div className="bg-blue-950/40 border border-blue-500/30 rounded-lg p-1.5 text-center">
                <span className="block text-[9px] uppercase font-bold text-sky-400">AI Corrected</span>
                <span className="font-mono font-bold text-xs text-sky-200">
                  {item.aiCorrected} <span className="text-[9px] font-normal">mm</span>
                </span>
                <span className="block text-[9px] text-sky-300 font-mono mt-0.5">
                  {dataRepresentation === 'weeklyMA' ? `Raw: ${item.rawDailyAiCorrected}mm` : `7d: ${item.weeklyMaAi}mm`}
                </span>
              </div>
            </div>
            
            {payload.filter((p: any) => p.dataKey && p.dataKey.includes('_aiCorrected')).length > 0 && (
              <div className="pt-1.5 mt-1 border-t border-slate-700/50 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">Compared Stations</div>
                {payload.filter((p: any) => p.dataKey && p.dataKey.includes('_aiCorrected')).map((p: any) => {
                  const stId = p.dataKey.split('_')[0];
                  const obsData = payload.find((x: any) => x.dataKey === `${stId}_observed`);
                  return (
                    <div key={stId} className="flex justify-between items-center text-[10px]" style={{ color: p.color }}>
                      <span className="font-semibold">{stId}</span>
                      <div className="flex items-center gap-1.5">
                        {obsData && <span className="opacity-70">Obs: {obsData.value}mm</span>}
                        <span className="font-bold">AI: {p.value}mm</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span>RH: <strong className="text-white">{item.humidity}%</strong></span>
            <span>Pressure: <strong className="text-white">{item.pressure} hPa</strong></span>
            <span>
              Err: <span className="text-rose-400 font-mono">Raw {item.rawError}</span> | <span className="text-emerald-400 font-mono font-bold">AI {item.aiError}mm</span>
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="forecast-chart-card" className={themeStyles.container}>
      {/* Primary Header & Top Action Bar */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b ${isDark ? 'border-sky-500/20' : 'border-slate-100'}`}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className={`text-base font-bold ${themeStyles.headerTitle}`}>
              Monsoon Rainfall Time-Series: Ground Truth vs NWP vs AI
            </h2>
            <div className="relative">
              <button
                onClick={() => setIsStationSelectorOpen(!isStationSelectorOpen)}
                className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  isDark ? 'bg-sky-950 text-sky-300 border border-sky-800/80 hover:bg-sky-900 font-mono' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                {activeStations.length === 1 ? selectedStationName : `${activeStations.length} Stations Compared`}
                <ChevronDown className="w-3 h-3" />
              </button>

              {isStationSelectorOpen && (
                <div className={`absolute top-full left-0 mt-1 w-64 rounded-xl border shadow-2xl z-50 p-2 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  <div className="text-[10px] uppercase font-bold text-slate-500 mb-2 px-1">Compare Stations</div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {MET_STATIONS.map(st => {
                      const isActive = activeStations.includes(st.id);
                      return (
                        <div
                          key={st.id}
                          onClick={() => {
                            if (isActive && activeStations.length > 1) {
                              setActiveStations(activeStations.filter(id => id !== st.id));
                            } else if (!isActive && activeStations.length < 5) {
                              setActiveStations([...activeStations, st.id]);
                            }
                          }}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs transition-colors ${
                            isActive 
                              ? (isDark ? 'bg-sky-500/20 text-sky-300' : 'bg-blue-50 text-blue-700 font-semibold')
                              : (isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600')
                          }`}
                        >
                          <div className={`w-3 h-3 rounded flex items-center justify-center border ${isActive ? 'bg-sky-500 border-sky-500' : 'border-slate-500'}`}>
                            {isActive && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className="truncate">{st.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className={themeStyles.headerSubtitle}>
            Real-time D3 moving average calculations, trend line anomaly detection, and interactive time-series zoom/pan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {/* THEME SELECTOR BUTTON GROUP */}
          <div className={`inline-flex rounded-lg p-0.5 border text-xs font-medium transition-all ${
            isDark ? 'bg-slate-900 border-sky-500/40 shadow-inner' : 'bg-slate-100 border-slate-200 shadow-2xs'
          }`}>
            <button
              id="theme-standard-report-btn"
              onClick={() => setChartTheme('standard')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                chartTheme === 'standard'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : isDark ? 'text-sky-300/70 hover:text-sky-100' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Standard Report Mode (High-contrast White/Black styling)"
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              Standard Report
            </button>
            <button
              id="theme-scientific-dark-btn"
              onClick={() => setChartTheme('scientificDark')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                chartTheme === 'scientificDark'
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/30'
                  : isDark ? 'text-sky-300/70 hover:text-sky-100' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Scientific Dark Mode (High-contrast Neon styling)"
            >
              <Moon className="w-3.5 h-3.5 text-sky-900" />
              Scientific Dark
            </button>
          </div>

          {/* DAY-BY-DAY DETAILED REPORT BUTTON */}
          <button
            id="open-day-by-day-report-btn"
            onClick={() => setShowDayByDayReport(true)}
            className={`px-2.5 py-1 text-xs rounded-md border font-bold transition-all flex items-center gap-1.5 shadow-xs ${
              isDark
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/90'
                : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
            }`}
            title="Open thorough day-by-day station report and meteorological analysis"
          >
            <FileText className="w-3.5 h-3.5" />
            Day-by-Day Report
          </button>

          {/* DOWNLOAD / EXPORT DATA DROPDOWN */}
          <div className="relative">
            <button
              id="download-data-menu-btn"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className={`px-2.5 py-1 text-xs rounded-md border font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                isDark
                  ? 'bg-sky-950/90 text-sky-200 border-sky-500/50 hover:bg-sky-900/90'
                  : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
              }`}
              title="Download station rainfall data as JSON or CSV"
            >
              <Download className="w-3.5 h-3.5" />
              Export Data
              <ChevronDown className={`w-3 h-3 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>

            {showExportMenu && (
              <div className={`absolute right-0 mt-1.5 w-56 rounded-xl border shadow-2xl z-50 p-1 space-y-1 backdrop-blur-xl ${
                isDark ? 'bg-slate-900/95 border-sky-500/40 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-700/50">
                  Download Options ({selectedStationName})
                </div>
                
                {/* CSV Section */}
                <div className="space-y-0.5">
                  <button
                    id="export-csv-full-btn"
                    onClick={() => handleDownloadCSV('full')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                      isDark ? 'hover:bg-sky-950/80 text-sky-300' : 'hover:bg-blue-50 text-blue-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      Download Full CSV
                    </span>
                    <span className="text-[10px] font-mono opacity-70">60 Days</span>
                  </button>

                  <button
                    id="export-csv-visible-btn"
                    onClick={() => handleDownloadCSV('visible')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                      isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500/70" />
                      Download Visible CSV
                    </span>
                    <span className="text-[10px] font-mono opacity-70">{chartData.length} Days</span>
                  </button>
                </div>

                <div className="border-t border-slate-700/50 my-1"></div>

                {/* JSON Section */}
                <div className="space-y-0.5">
                  <button
                    id="export-json-full-btn"
                    onClick={() => handleDownloadJSON('full')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                      isDark ? 'hover:bg-sky-950/80 text-sky-300' : 'hover:bg-blue-50 text-blue-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <FileJson className="w-4 h-4 text-amber-400" />
                      Download Full JSON
                    </span>
                    <span className="text-[10px] font-mono opacity-70">Full Report</span>
                  </button>

                  <button
                    id="export-json-visible-btn"
                    onClick={() => handleDownloadJSON('visible')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                      isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <FileJson className="w-4 h-4 text-amber-500/70" />
                      Download Visible JSON
                    </span>
                    <span className="text-[10px] font-mono opacity-70">{chartData.length} Days</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Toggle IMD Heavy line */}
          {viewMode === 'rainfall' && (
            <button
              id="toggle-imd-line-btn"
              onClick={() => setShowImdLine(!showImdLine)}
              className={`px-2.5 py-1 text-xs rounded-md border font-medium transition-colors flex items-center gap-1 ${
                showImdLine
                  ? isDark ? 'bg-amber-950/80 text-amber-300 border-amber-500/50' : 'bg-amber-50 text-amber-800 border-amber-300'
                  : isDark ? 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              IMD Heavy (≥64.5mm)
            </button>
          )}

          {/* Compare Toggle */}
          {onToggleCompare && data.length > 0 && data[0].year !== 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={onToggleCompare}
                className={`px-2.5 py-1 text-xs rounded-md border font-medium transition-colors ${
                  isComparing
                    ? isDark ? 'bg-indigo-950 text-indigo-300 border-indigo-500/50' : 'bg-indigo-50 text-indigo-800 border-indigo-300'
                    : isDark ? 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                VS Compare Year
              </button>
              {isComparing && onCompareYearChange && (
                <select
                  value={compareYear || ''}
                  onChange={(e) => onCompareYearChange(Number(e.target.value))}
                  className={`border rounded-md px-1.5 py-1 text-xs outline-none ${
                    isDark ? 'bg-slate-900 border-sky-500/40 text-sky-200' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                  <option value={2023}>2023</option>
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
                ? isDark ? 'bg-rose-950/80 text-rose-300 border-rose-500/50' : 'bg-rose-50 text-rose-800 border-rose-300'
                : isDark ? 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Severe Spells
          </button>

          {/* Data Representation Toggle: 'Raw Daily' vs 'Weekly Moving Average' */}
          <div className={`inline-flex rounded-md p-0.5 border shadow-2xs ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              id="data-rep-raw-daily-btn"
              onClick={() => handleSetDataRepresentation('rawDaily')}
              className={`px-2.5 py-1 text-xs rounded font-semibold transition-all flex items-center gap-1.5 ${
                dataRepresentation === 'rawDaily'
                  ? isDark ? 'bg-sky-500 text-slate-950 font-bold shadow-xs' : 'bg-white text-slate-900 shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Raw Daily: Display unfiltered daily station recordings and timestep forecasts"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Raw Daily
            </button>
            <button
              id="data-rep-weekly-ma-btn"
              onClick={() => handleSetDataRepresentation('weeklyMA')}
              className={`px-2.5 py-1 text-xs rounded font-semibold transition-all flex items-center gap-1.5 ${
                dataRepresentation === 'weeklyMA'
                  ? isDark ? 'bg-amber-400 text-slate-950 font-bold shadow-xs' : 'bg-white text-amber-900 shadow-xs font-bold'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Weekly Moving Average: Filter high-frequency synoptic noise to reveal sub-seasonal climate signal trends"
            >
              <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
              Weekly Moving Average
            </button>
          </div>

          {/* Mode switch */}
          <div className={`inline-flex rounded-md p-0.5 border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              id="view-rainfall-btn"
              onClick={() => setViewMode('rainfall')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                viewMode === 'rainfall'
                  ? isDark ? 'bg-sky-500 text-slate-950 font-bold' : 'bg-white text-slate-900 shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Rainfall (mm)
            </button>
            <button
              id="view-residual-btn"
              onClick={() => setViewMode('residual')}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                viewMode === 'residual'
                  ? isDark ? 'bg-sky-500 text-slate-950 font-bold' : 'bg-white text-slate-900 shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Error Residual
            </button>
          </div>
        </div>
      </div>

      {/* Climate Signal Trend Representation Active Banner */}
      {dataRepresentation === 'weeklyMA' && (
        <div className={`flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-xs transition-all ${
          isDark 
            ? 'bg-amber-950/40 border-amber-500/50 text-amber-100 shadow-lg shadow-amber-950/30' 
            : 'bg-amber-50/90 border-amber-300/90 text-amber-950 shadow-2xs'
        }`}>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <div>
              <span className="font-bold tracking-tight">Climate Signal Trend Representation Active:</span>{' '}
              <span className="opacity-90">
                Displaying <strong>{movingAvgWindow}-Day Moving Average</strong> across Ground Truth (IMD), Raw NWP, and AI-corrected series to eliminate high-frequency convective noise and isolate sub-seasonal monsoonal active/break signals.
              </span>
            </div>
          </div>
          <button
            onClick={() => handleSetDataRepresentation('rawDaily')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors shrink-0 ${
              isDark 
                ? 'bg-amber-900/60 border-amber-600/60 text-amber-200 hover:bg-amber-800' 
                : 'bg-white border-amber-300 text-amber-900 hover:bg-amber-100'
            }`}
          >
            Switch to Raw Daily
          </button>
        </div>
      )}

      {/* D3 MOVING AVERAGE & ANOMALY DETECTOR CONTROLS (Dedicated Toolbar directly above Chart) */}
      {viewMode === 'rainfall' && (
        <div className={`rounded-xl border p-3 flex flex-wrap items-center justify-between gap-3 text-xs ${themeStyles.toolbarBg}`}>
          {/* Moving Average Window Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-semibold flex items-center gap-1.5 ${isDark ? 'text-sky-200 font-mono' : 'text-slate-700'}`}>
              <Calculator className="w-4 h-4 text-amber-500" />
              D3 Moving Average Window:
            </span>
            <div className={`inline-flex items-center gap-1 p-0.5 rounded-lg border shadow-2xs ${
              isDark ? 'bg-slate-950 border-sky-500/30' : 'bg-white border-slate-200'
            }`}>
              {[7, 14, 30].map((w) => (
                <button
                  key={`ma-win-${w}`}
                  id={`ma-window-${w}d-btn`}
                  onClick={() => {
                    setMovingAvgWindow(w);
                    setShowD3MovingAvg(true);
                  }}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all text-xs ${
                    showD3MovingAvg && movingAvgWindow === w
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                      : isDark ? 'text-sky-300/80 hover:bg-slate-900' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {w}-Day
                </button>
              ))}
            </div>

            {/* Custom Window Dropdown */}
            <select
              value={movingAvgWindow}
              onChange={(e) => {
                setMovingAvgWindow(Number(e.target.value));
                setShowD3MovingAvg(true);
              }}
              className={`border rounded-lg px-2 py-1 text-xs font-mono outline-none ${
                isDark ? 'bg-slate-950 border-sky-500/30 text-amber-300' : 'bg-white border-slate-200 text-slate-700'
              }`}
              title="Select custom window size"
            >
              <option value={5}>Custom: 5d</option>
              <option value={7}>Custom: 7d</option>
              <option value={10}>Custom: 10d</option>
              <option value={14}>Custom: 14d</option>
              <option value={21}>Custom: 21d</option>
              <option value={30}>Custom: 30d</option>
            </select>

            {/* Toggle D3 Trend Line */}
            <button
              id="toolbar-d3-trend-btn"
              onClick={() => setShowD3TrendLine(!showD3TrendLine)}
              className={`px-2.5 py-1 rounded-lg border font-medium transition-colors flex items-center gap-1 ${
                showD3TrendLine
                  ? isDark ? 'bg-purple-950/80 text-purple-300 border-purple-500/50' : 'bg-purple-50 text-purple-800 border-purple-300'
                  : isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              D3 Trend Line
            </button>

            {/* Toggle Trend Confidence Band */}
            {showD3TrendLine && (
              <button
                id="toggle-confidence-interval-btn"
                onClick={() => setShowConfidenceInterval(!showConfidenceInterval)}
                className={`px-2 py-1 rounded-lg border font-medium transition-colors flex items-center gap-1 ${
                  showConfidenceInterval
                    ? isDark ? 'bg-purple-900/60 text-purple-200 border-purple-500/40' : 'bg-purple-100/80 text-purple-900 border-purple-300'
                    : isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
                title="Toggle Shaded Confidence Interval around D3 Trend Line"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                Confidence Band
              </button>
            )}

            {/* Live D3 Path Transition Indicator */}
            {isD3Interpolating && (
              <div 
                className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                  isDark
                    ? 'bg-purple-950/90 text-purple-200 border-purple-500/60 shadow-purple-900/40'
                    : 'bg-purple-100 text-purple-900 border-purple-300'
                }`}
                title="D3 Cubic Path Interpolation active"
              >
                <Activity className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                <span>D3 Morphing ({interpolationCause})</span>
              </div>
            )}
          </div>

          {/* D3 Anomaly Detection & Quartile Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Global Surface Crosshair Toggle */}
            <button
              id="toggle-global-crosshair-btn"
              onClick={() => setShowGlobalCrosshair(!showGlobalCrosshair)}
              className={`px-2.5 py-1 rounded-lg border font-semibold transition-colors flex items-center gap-1.5 ${
                showGlobalCrosshair
                  ? isDark ? 'bg-sky-950/80 text-sky-300 border-sky-500/50' : 'bg-blue-50 text-blue-800 border-blue-300 shadow-2xs'
                  : isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
              title="Toggle D3 Global Surface Crosshair for precise interpolated date/rainfall alignment"
            >
              <Crosshair className={`w-3.5 h-3.5 ${showGlobalCrosshair ? (isDark ? 'text-sky-400' : 'text-blue-600') : 'text-slate-400'}`} />
              Crosshairs
            </button>

            {/* Toggle Quartile Threshold Alerts Layer */}
            <button
              id="toggle-quartile-alerts-btn"
              onClick={() => setShowQuartileAlerts(!showQuartileAlerts)}
              className={`px-2.5 py-1 rounded-lg border font-semibold transition-colors flex items-center gap-1.5 ${
                showQuartileAlerts
                  ? isDark ? 'bg-amber-950/80 text-amber-300 border-amber-500/50' : 'bg-amber-50 text-amber-900 border-amber-300 shadow-2xs'
                  : isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
              title="Highlight D3 Extreme Rainfall Quartiles (Q75 & Q90)"
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${showQuartileAlerts ? 'text-amber-500' : 'text-slate-400'}`} />
              Threshold Alerts
            </button>

            <button
              id="toggle-d3-anomalies-btn"
              onClick={() => setShowAnomalies(!showAnomalies)}
              className={`px-2.5 py-1 rounded-lg border font-semibold transition-colors flex items-center gap-1.5 ${
                showAnomalies
                  ? isDark ? 'bg-rose-950/80 text-rose-300 border-rose-500/50' : 'bg-rose-50 text-rose-800 border-rose-300 shadow-2xs'
                  : isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${showAnomalies ? 'text-rose-500 fill-rose-500/40' : 'text-slate-400'}`} />
              D3 Anomaly Markers
              {totalAnomaliesCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono text-[10px] font-bold">
                  {totalAnomaliesCount}
                </span>
              )}
            </button>

            {/* Sensitivity Threshold dropdown */}
            {showAnomalies && (
              <div className={`flex items-center gap-1 border rounded-lg px-2 py-0.5 ${
                isDark ? 'bg-slate-950 border-sky-500/30 text-sky-200' : 'bg-white border-slate-200 text-slate-700'
              }`}>
                <Sliders className="w-3 h-3 text-slate-400" />
                <span className="text-[11px] opacity-80">Threshold:</span>
                <select
                  value={anomalySensitivity}
                  onChange={(e) => setAnomalySensitivity(Number(e.target.value))}
                  className="bg-transparent text-xs font-mono font-medium outline-none"
                  title="Anomaly Threshold Sensitivity"
                >
                  <option value={1.0} className={isDark ? 'bg-slate-900 text-white' : ''}>1.0σ (High)</option>
                  <option value={1.5} className={isDark ? 'bg-slate-900 text-white' : ''}>1.5σ (Standard)</option>
                  <option value={2.0} className={isDark ? 'bg-slate-900 text-white' : ''}>2.0σ (Extreme)</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* D3 ZOOM & PAN TOOLBAR CONTROL BAR */}
      <div className={`flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-xs ${themeStyles.subToolbarBg}`}>
        <div className="flex items-center gap-2">
          <span className={`font-semibold flex items-center gap-1 ${isDark ? 'text-sky-200' : 'text-slate-700'}`}>
            <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
            D3 Zoom & Pan:
          </span>
          <span className="font-mono text-[11px] opacity-80">
            Showing timesteps {zoomRange[0] + 1} &ndash; {zoomRange[1]} ({zoomRange[1] - zoomRange[0]} days visible)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Quick Presets */}
          <div className={`inline-flex items-center gap-1 p-0.5 rounded border text-[11px] ${
            isDark ? 'bg-slate-950 border-sky-500/30' : 'bg-white border-slate-200'
          }`}>
            <button
              onClick={() => handlePresetZoom('all')}
              className={`px-1.5 py-0.5 rounded ${zoomRange[0] === 0 && zoomRange[1] >= fullChartData.length ? 'bg-blue-600 text-white font-bold' : isDark ? 'text-sky-300 hover:bg-slate-900' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              All (60d)
            </button>
            <button
              onClick={() => handlePresetZoom('onset')}
              className={`px-1.5 py-0.5 rounded ${isDark ? 'text-sky-300 hover:bg-slate-900' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Onset (0-20)
            </button>
            <button
              onClick={() => handlePresetZoom('peak')}
              className={`px-1.5 py-0.5 rounded ${isDark ? 'text-sky-300 hover:bg-slate-900' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Peak (15-45)
            </button>
            <button
              onClick={() => handlePresetZoom('withdrawal')}
              className={`px-1.5 py-0.5 rounded ${isDark ? 'text-sky-300 hover:bg-slate-900' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Late (40-60)
            </button>
          </div>

          {/* Zoom Buttons */}
          <button
            onClick={handleZoomIn}
            className={`p-1 rounded border ${isDark ? 'bg-slate-950 border-sky-500/30 text-sky-200 hover:bg-slate-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className={`p-1 rounded border ${isDark ? 'bg-slate-950 border-sky-500/30 text-sky-200 hover:bg-slate-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            className={`p-1 rounded border flex items-center gap-1 px-1.5 text-[11px] ${isDark ? 'bg-slate-950 border-sky-500/30 text-sky-200 hover:bg-slate-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            title="Reset Zoom"
          >
            <RotateCcw className="w-3 h-3 opacity-70" />
            Reset
          </button>
        </div>
      </div>

      {/* Chart Canvas with D3 Zoom Listener Ref */}
      <div 
        ref={chartWrapperRef} 
        className="h-[420px] w-full pt-1 cursor-grab active:cursor-grabbing select-none relative overflow-visible"
        title="Scroll or Drag to Pan/Zoom using D3 Zoom"
      >
        
        <motion.div 
          key={`${selectedStationName}-${data.length > 0 ? data[0].leadTimeDays : 'all'}-${dataRepresentation}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", staggerChildren: 0.1 }}
          className="w-full h-full"
        >
          <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'rainfall' ? (
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={themeStyles.gridStroke} vertical={false} />
              
              {/* Shaded Confidence Interval around D3 Linear Trend Line */}
              {showD3TrendLine && showConfidenceInterval && (
                <Area
                  type="monotone"
                  dataKey="d3TrendBand"
                  stroke="none"
                  fill={themeStyles.colors.d3TrendLine}
                  fillOpacity={isDark ? 0.25 : 0.15}
                  isAnimationActive={false}
                  
                />
              )}

              {showSevereAlerts && chartData.map((d, i) => (
                d.aiCorrected >= 64.5 ? (
                  <ReferenceLine
                    key={`severe-alert-${i}`}
                    x={d.date}
                    stroke={themeStyles.colors.severeAlert}
                    strokeWidth={20}
                    strokeOpacity={0.6}
                  />
                ) : null
              ))}

              {/* D3 Threshold Alert Layer: Dynamic Quartile Reference Lines */}
              {showQuartileAlerts && (
                <>
                  <ReferenceLine
                    y={d3Quartiles.q75}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Q3 75% Quartile (${d3Quartiles.q75} mm)`,
                      fill: isDark ? '#fcd34d' : '#d97706',
                      fontSize: 10,
                      position: 'insideTopRight',
                    }}
                  />
                  <ReferenceLine
                    y={d3Quartiles.q90}
                    stroke="#ef4444"
                    strokeDasharray="5 3"
                    strokeWidth={1.8}
                    label={{
                      value: `Q90 Extreme Threshold (${d3Quartiles.q90} mm)`,
                      fill: isDark ? '#fca5a5' : '#dc2626',
                      fontSize: 10,
                      position: 'insideTopRight',
                    }}
                  />
                </>
              )}

              <Brush 
                dataKey="date" 
                height={30} 
                stroke={isDark ? '#475569' : '#cbd5e1'} 
                fill={isDark ? '#0f172a' : '#f8fafc'}
                tickFormatter={(val) => val}
                className="text-xs"
              />
              <XAxis
                dataKey="date"
                stroke={themeStyles.axisStroke}
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: themeStyles.axisStroke }}
              />
              <YAxis
                stroke={themeStyles.axisStroke}
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: themeStyles.axisStroke }}
                unit="mm"
              />
              <Tooltip 
                content={<CustomTooltip />} 
                allowEscapeViewBox={{ x: true, y: true }}
                wrapperStyle={{ zIndex: 1000, pointerEvents: 'none' }}
                cursor={showGlobalCrosshair ? <CustomCrosshair /> : { stroke: themeStyles.tooltipCursor, strokeWidth: 1.5, strokeDasharray: '4 4' }} 
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                formatter={(val) => {
                  const suffix = dataRepresentation === 'weeklyMA' ? ' (7d Weekly MA)' : '';
                  if (val === 'observed') return <span className={isDark ? 'text-emerald-300 font-semibold' : 'text-slate-700 font-semibold'}>Observed Ground Truth (IMD){suffix}</span>;
                  if (val === 'rawForecast') return <span className={isDark ? 'text-rose-300' : 'text-slate-700'}>Raw NWP Model Forecast{suffix}</span>;
                  if (val === 'aiCorrected') return <span className={isDark ? 'text-sky-300 font-bold' : 'text-blue-700 font-bold'}>Regime-Aware AI Corrected{suffix}</span>;
                  if (val === 'compareObserved') return <span className="text-slate-400 font-semibold">{compareYear} Observed (IMD){suffix}</span>;
                  if (val === 'compareAiCorrected') return <span className="text-indigo-400 font-bold">{compareYear} AI Corrected{suffix}</span>;
                  if (val === 'd3AiMovingAvg') return <span className={isDark ? 'text-amber-300 font-semibold' : 'text-amber-700 font-semibold'}>D3 {movingAvgWindow}-Day Reference MA</span>;
                  if (val === 'd3AiTrendLine') return <span className={isDark ? 'text-purple-300 font-semibold' : 'text-purple-700 font-semibold'}>D3 Linear Trend Line</span>;
                  return val;
                }}
              />

              {showImdLine && (
                <ReferenceLine
                  y={64.5}
                  stroke={themeStyles.colors.imdLine}
                  strokeDasharray="4 4"
                  label={{
                    value: 'IMD Heavy Rainfall (≥64.5 mm)',
                    fill: themeStyles.colors.imdLine,
                    fontSize: 10,
                    position: 'top',
                  }}
                />
              )}

              {/* Observed line (Ground Truth) */}
              <Line
                type="monotone"
                dataKey="observed"
                stroke={themeStyles.colors.observed}
                strokeWidth={2.5}
                dot={{ r: 2, fill: themeStyles.colors.observed }}
                activeDot={{ r: 5 }}
              />

              {/* Raw Forecast (Bars, showing biases) */}
              <Bar
                dataKey="rawForecast"
                fill={themeStyles.colors.rawForecast}
                fillOpacity={0.6}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
                
              />

              {/* Comparison Stations dynamically rendered */}
              {activeStations.slice(1).map((stId, idx) => {
                const color = ['#f43f5e', '#a855f7', '#10b981', '#f59e0b', '#3b82f6'][idx % 5];
                return (
                  <React.Fragment key={stId}>
                    <Line
                      type="monotone"
                      dataKey={`${stId}_observed`}
                      stroke={color}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      dot={false}
                      isAnimationActive={true}
                    />
                    <Line
                      type="monotone"
                      dataKey={`${stId}_aiCorrected`}
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={true}
                    />
                  </React.Fragment>
                );
              })}
              
              {/* AI Corrected (Blue/Cyan bold, high fidelity, with custom D3 Anomaly Dot Renderer) */}
              <Line
                type="monotone"
                dataKey="aiCorrected"
                stroke={themeStyles.colors.aiCorrected}
                strokeWidth={2.5}
                dot={(props) => renderAiDot(props)}
                activeDot={{ r: 6 }}
              />

              {/* D3 Moving Average Line */}
              {showD3MovingAvg && (
                <Line
                  type="monotone"
                  dataKey="d3AiMovingAvg"
                  stroke={themeStyles.colors.d3MovingAvg}
                  strokeWidth={2.2}
                  strokeDasharray="5 3"
                  dot={false}
                  activeDot={{ r: 4, fill: themeStyles.colors.d3MovingAvg }}
                />
              )}

              {/* D3 Linear Regression Trend Line */}
              {showD3TrendLine && (
                <Line
                  type="monotone"
                  dataKey="d3AiTrendLine"
                  stroke={themeStyles.colors.d3TrendLine}
                  strokeWidth={2.2}
                  dot={false}
                  activeDot={{ r: 4, fill: themeStyles.colors.d3TrendLine }}
                />
              )}
              
              {/* Compare Data Lines */}
              {isComparing && (
                <Line
                  type="monotone"
                  dataKey="compareObserved"
                  stroke={themeStyles.colors.compareObserved}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={{ r: 1.5, fill: themeStyles.colors.compareObserved }}
                />
              )}
              {isComparing && (
                <Line
                  type="monotone"
                  dataKey="compareAiCorrected"
                  stroke={themeStyles.colors.compareAiCorrected}
                  strokeWidth={2}
                  dot={{ r: 2, fill: themeStyles.colors.compareAiCorrected }}
                />
              )}
            </ComposedChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={themeStyles.gridStroke} vertical={false} />
              
              {showSevereAlerts && chartData.map((d, i) => (
                d.aiCorrected >= 64.5 ? (
                  <ReferenceLine
                    key={`severe-alert-residual-${i}`}
                    x={d.date}
                    stroke={themeStyles.colors.severeAlert}
                    strokeWidth={20}
                    strokeOpacity={0.6}
                  />
                ) : null
              ))}

              <XAxis
                dataKey="date"
                stroke={themeStyles.axisStroke}
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: themeStyles.axisStroke }}
              />
              <YAxis
                stroke={themeStyles.axisStroke}
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: themeStyles.axisStroke }}
                unit="mm"
              />
              <Tooltip 
                content={<CustomTooltip />} 
                allowEscapeViewBox={{ x: true, y: true }}
                wrapperStyle={{ zIndex: 1000, pointerEvents: 'none' }}
                cursor={showGlobalCrosshair ? <CustomCrosshair /> : { stroke: themeStyles.tooltipCursor, strokeWidth: 1.5, strokeDasharray: '4 4' }} 
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                formatter={(val) => {
                  const suffix = dataRepresentation === 'weeklyMA' ? ' (7d Weekly MA)' : '';
                  if (val === 'rawError') return <span className="text-rose-400 font-medium">Raw NWP Absolute Error (|Raw - Obs|){suffix}</span>;
                  if (val === 'aiError') return <span className="text-emerald-400 font-bold">AI Corrected Error (|AI - Obs|){suffix}</span>;
                  return val;
                }}
              />
              <Line
                type="monotone"
                dataKey="rawError"
                stroke={themeStyles.colors.rawError}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="aiError"
                stroke={themeStyles.colors.aiError}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          )}
        
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* DESCRIPTIVE LEGEND PANEL */}
      <div className={`rounded-xl border p-3.5 space-y-2 text-xs ${themeStyles.legendContainer}`}>
        <div className={`flex items-center justify-between border-b pb-1.5 ${isDark ? 'border-sky-500/20' : 'border-slate-200/80'}`}>
          <div className="flex items-center gap-2">
            <span className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-sky-200' : 'text-slate-800'}`}>
              <Layers className="w-4 h-4 text-sky-500" />
              Descriptive Series & Visual Legend
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border flex items-center gap-1 ${
              dataRepresentation === 'weeklyMA'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
            }`}>
              {dataRepresentation === 'weeklyMA' ? <TrendingUp className="w-3 h-3" /> : <BarChart3 className="w-3 h-3" />}
              {dataRepresentation === 'weeklyMA' ? 'Active: 7-Day Weekly Moving Average' : 'Active: Raw Daily Observations'}
            </span>
          </div>
          <span className="text-[11px] opacity-70 font-mono">
            {isDark ? 'Scientific Dark Neon Palette' : 'Standard Report Palette'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* 1. Primary Rainfall Data Series */}
          <div className={`space-y-1.5 p-2.5 rounded-lg border ${themeStyles.legendSubCard}`}>
            <span className="font-bold text-[10px] uppercase tracking-wider block border-b border-white/10 pb-1 opacity-80">
              {dataRepresentation === 'weeklyMA' ? 'Primary Series (7d Weekly MA)' : 'Primary Rainfall Series (Raw Daily)'}
            </span>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-5 h-0.5 inline-block rounded-full" style={{ backgroundColor: themeStyles.colors.aiCorrected }}></span>
                <span className="font-medium">Regime-Aware AI Corrected {dataRepresentation === 'weeklyMA' ? '(7d WMA)' : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-0.5 inline-block rounded-full" style={{ backgroundColor: themeStyles.colors.observed }}></span>
                <span>Ground Truth Observed {dataRepresentation === 'weeklyMA' ? '(7d WMA)' : '(IMD)'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-0.5 inline-block border-b border-dashed" style={{ borderColor: themeStyles.colors.rawForecast }}></span>
                <span>Raw NWP Model Forecast {dataRepresentation === 'weeklyMA' ? '(7d WMA)' : ''}</span>
              </div>
            </div>
          </div>

          {/* 2. D3 Statistical Trend Lines */}
          <div className={`space-y-1.5 p-2.5 rounded-lg border ${themeStyles.legendSubCard}`}>
            <span className="font-bold text-[10px] uppercase tracking-wider block border-b border-white/10 pb-1 opacity-80">
              D3 Trend & Confidence
            </span>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-5 h-0.5 inline-block rounded-full" style={{ backgroundColor: themeStyles.colors.d3TrendLine }}></span>
                <span className="font-medium">D3 Linear Trend Line</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-2.5 rounded-xs inline-block opacity-40" style={{ backgroundColor: themeStyles.colors.d3TrendLine }}></span>
                <span className="font-medium">90% Confidence Band (±1.65σ)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-0.5 inline-block border-b-2 border-dashed" style={{ borderColor: themeStyles.colors.d3MovingAvg }}></span>
                <span className="font-medium">D3 {movingAvgWindow}-Day Moving Avg</span>
              </div>
            </div>
          </div>

          {/* 3. Anomaly Markers */}
          <div className={`space-y-1.5 p-2.5 rounded-lg border ${themeStyles.legendSubCard}`}>
            <span className="font-bold text-[10px] uppercase tracking-wider block border-b border-white/10 pb-1 opacity-80">
              D3 Anomaly Markers
            </span>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: themeStyles.colors.surgeAnomaly }}></span>
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: themeStyles.colors.surgeAnomaly }}></span>
                </span>
                <span className="font-medium">Precipitation Surge Anomaly</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: themeStyles.colors.deficitAnomaly }}></span>
                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: themeStyles.colors.deficitAnomaly }}></span>
                </span>
                <span className="font-medium">Precipitation Deficit Dip</span>
              </div>
            </div>
          </div>

          {/* 4. Environmental Alert Levels */}
          <div className={`space-y-1.5 p-2.5 rounded-lg border ${themeStyles.legendSubCard}`}>
            <span className="font-bold text-[10px] uppercase tracking-wider block border-b border-white/10 pb-1 opacity-80">
              Alert & Threshold Layers
            </span>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-5 h-0 border-b-2 border-amber-500 border-dashed"></span>
                <span className="font-mono">Q75 ({d3Quartiles.q75}mm) Heavy</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-0 border-b-2 border-rose-500 border-dashed"></span>
                <span className="font-mono">Q90 ({d3Quartiles.q90}mm) Extreme</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-0 border-b border-dashed" style={{ borderColor: themeStyles.colors.imdLine }}></span>
                <span className="font-mono">≥64.5 mm IMD Heavy</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DETECTED RAINFALL ANOMALIES SUMMARY BOX */}
      <div className={`rounded-xl border p-4 space-y-3 transition-colors ${themeStyles.summaryBoxBg}`}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Zap className="w-4 h-4 fill-rose-500/30 text-rose-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 tracking-tight flex items-center gap-2">
                Detected Rainfall Anomalies
                <span className="px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-300 font-mono text-xs border border-rose-500/40">
                  {visibleAnomalies.length} in Selected Window
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Time-series dates exceeding {anomalySensitivity}σ standard deviation ({anomalyAnalysis.stdDev} mm) from the D3 {movingAvgWindow}-day moving average.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700">
              Window: Timesteps {zoomRange[0] + 1} &ndash; {zoomRange[1]}
            </span>
          </div>
        </div>

        {/* Anomaly Cards List / Grid */}
        {visibleAnomalies.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
            {visibleAnomalies.map((item, idx) => {
              const isSurge = item.anomalyType === 'surge';
              return (
                <div
                  key={`anomaly-summary-${item.fullDate}-${idx}`}
                  className={`p-3 rounded-xl border transition-all text-xs space-y-2 hover:scale-[1.01] ${
                    isSurge
                      ? 'bg-rose-950/40 border-rose-500/40 hover:border-rose-400 text-rose-100'
                      : 'bg-sky-950/40 border-sky-500/40 hover:border-sky-400 text-sky-100'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between font-mono border-b border-white/10 pb-1.5">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {item.fullDate}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                      isSurge ? 'bg-rose-500 text-white' : 'bg-sky-500 text-white'
                    }`}>
                      {isSurge ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {isSurge ? 'Surge Peak' : 'Deficit Dip'}
                    </span>
                  </div>

                  {/* Metrics Breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-400 block text-[10px]">AI Rainfall</span>
                      <span className="text-sm font-bold text-white">{item.aiCorrected} <span className="text-[10px] font-normal text-slate-400">mm</span></span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">D3 {movingAvgWindow}d Moving Avg</span>
                      <span className="text-sm font-semibold text-amber-300">{item.d3AiMovingAvg} <span className="text-[10px] font-normal text-slate-400">mm</span></span>
                    </div>
                  </div>

                  {/* Deviation & Z-Score Footer */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[11px]">
                    <span className="text-slate-300 flex items-center gap-1 font-semibold">
                      Deviation:
                      <strong className={isSurge ? 'text-rose-400' : 'text-sky-300'}>
                        {isSurge ? `+${item.anomalyDiff}` : `-${item.anomalyDiff}`} mm
                      </strong>
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/50 text-amber-200 border border-amber-500/30">
                      Z-Score: {item.anomalyZScore}σ
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-6 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-200">No Trend Anomalies Detected</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Rainfall remains within standard expectation boundaries ({anomalySensitivity}σ threshold) for the currently visible window (Timesteps {zoomRange[0] + 1} &ndash; {zoomRange[1]}).
            </p>
          </div>
        )}
      </div>

      {/* Narrative & Range Scrubber Footer */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>
            Use the D3 toolbar above to select 7-day, 14-day, or 30-day moving average windows. D3 Anomaly Detection highlights trend deviations with pulsing markers.
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-400">
          D3 Zoom active &bull; Scroll or Drag to inspect interval
        </span>
      </div>

      {/* DAY-BY-DAY STATION RAINFALL REPORT MODAL */}
      {showDayByDayReport && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className={`w-full max-w-6xl max-h-[92vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-slate-900 border-sky-500/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className={`p-4 sm:p-5 border-b flex items-start justify-between gap-4 shrink-0 ${
              isDark ? 'bg-slate-950/90 border-sky-500/30' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-500" />
                    Day-by-Day Rainfall Analysis Report
                  </h3>
                  <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                    isDark ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {selectedStationName}
                  </span>
                </div>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Thorough day-by-day station breakdown including ground truth observed rainfall, raw NWP forecasts, AI calibrations, D3 moving averages ({movingAvgWindow}-day), and meteorological assessment narratives.
                </p>
              </div>

              {/* Action Buttons & Close */}
              <div className="flex items-center gap-2">
                <button
                  id="modal-copy-markdown-btn"
                  onClick={() => handleCopyReportTable(reportDataset)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    copiedReport
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                      : isDark ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Copy formatted markdown report table to clipboard"
                >
                  {copiedReport ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedReport ? 'Copied!' : 'Copy Summary'}
                </button>

                <button
                  id="modal-export-csv-btn"
                  onClick={() => handleDownloadCSV(reportScope)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1.5 shadow-xs transition-colors"
                  title="Download report data as CSV file"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  CSV
                </button>

                <button
                  id="modal-export-json-btn"
                  onClick={() => handleDownloadJSON(reportScope)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5 shadow-xs transition-colors"
                  title="Download report data as JSON file"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  JSON
                </button>

                <button
                  id="modal-close-btn"
                  onClick={() => setShowDayByDayReport(false)}
                  className={`p-1.5 rounded-lg border hover:text-white transition-colors ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                  title="Close report modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Aggregated KPI Metrics Header */}
            <div className={`p-4 border-b grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs shrink-0 ${
              isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50/80 border-slate-200'
            }`}>
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-white border-slate-200 shadow-xs'}`}>
                <span className={`block text-[10px] uppercase font-mono tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600 font-semibold'}`}>Days Analyzed</span>
                <span className={`text-base font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{reportStats.totalDays} <span className={`text-xs font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Days</span></span>
              </div>

              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200 shadow-xs'}`}>
                <span className={`block text-[10px] uppercase font-mono tracking-wider ${isDark ? 'text-emerald-300' : 'text-emerald-700 font-semibold'}`}>Observed Ground Truth</span>
                <span className={`text-base font-bold font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-800 font-black'}`}>{reportStats.totalObserved} <span className={`text-xs font-normal ${isDark ? 'text-emerald-200' : 'text-emerald-600'}`}>mm</span></span>
              </div>

              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-blue-950/30 border-blue-500/30' : 'bg-blue-50 border-blue-200 shadow-xs'}`}>
                <span className={`block text-[10px] uppercase font-mono tracking-wider ${isDark ? 'text-blue-300' : 'text-blue-700 font-semibold'}`}>AI Forecast Volume</span>
                <span className={`text-base font-bold font-mono ${isDark ? 'text-blue-400' : 'text-blue-800 font-black'}`}>{reportStats.totalAi} <span className={`text-xs font-normal ${isDark ? 'text-blue-200' : 'text-blue-600'}`}>mm</span></span>
              </div>

              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-rose-950/30 border-rose-500/30' : 'bg-rose-50 border-rose-200 shadow-xs'}`}>
                <span className={`block text-[10px] uppercase font-mono tracking-wider ${isDark ? 'text-rose-300' : 'text-rose-700 font-semibold'}`}>Raw NWP Forecast</span>
                <span className={`text-base font-bold font-mono ${isDark ? 'text-rose-400' : 'text-rose-800 font-black'}`}>{reportStats.totalRaw} <span className={`text-xs font-normal ${isDark ? 'text-rose-200' : 'text-rose-600'}`}>mm</span></span>
              </div>

              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-purple-950/30 border-purple-500/30' : 'bg-purple-50 border-purple-200 shadow-xs'}`}>
                <span className={`block text-[10px] uppercase font-mono tracking-wider ${isDark ? 'text-purple-300' : 'text-purple-700 font-semibold'}`}>AI Skill Gain</span>
                <span className={`text-base font-bold font-mono ${isDark ? 'text-purple-300' : 'text-purple-800 font-black'}`}>+{reportStats.skillGain}% <span className={`text-xs font-normal ${isDark ? 'text-purple-200' : 'text-purple-600'}`}>MAE Reduction</span></span>
              </div>

              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-amber-950/30 border-amber-500/30' : 'bg-amber-50 border-amber-200 shadow-xs'}`}>
                <span className={`block text-[10px] uppercase font-mono tracking-wider ${isDark ? 'text-amber-300' : 'text-amber-700 font-semibold'}`}>D3 Anomalies</span>
                <span className={`text-base font-bold font-mono ${isDark ? 'text-amber-400' : 'text-amber-800 font-black'}`}>{reportStats.anomaliesCount} <span className={`text-xs font-normal ${isDark ? 'text-amber-200' : 'text-amber-600'}`}>Days</span></span>
              </div>
            </div>

            {/* Modal Controls Toolbar */}
            <div className={`p-3.5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by date, month, regime..."
                  value={reportSearchQuery}
                  onChange={(e) => setReportSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs outline-none transition-colors ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white focus:border-sky-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                  }`}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Scope Selection */}
                <div className={`inline-flex rounded-lg p-0.5 border ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                }`}>
                  <button
                    onClick={() => setReportScope('full')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                      reportScope === 'full'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Full Season (60 Days)
                  </button>
                  <button
                    onClick={() => setReportScope('visible')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                      reportScope === 'visible'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Zoomed ({chartData.length} Days)
                  </button>
                </div>

                {/* Regime Filter Dropdown */}
                <select
                  value={reportRegimeFilter}
                  onChange={(e) => setReportRegimeFilter(e.target.value)}
                  className={`border rounded-lg px-2.5 py-1.5 text-xs outline-none font-semibold ${
                    isDark ? 'bg-slate-950 border-slate-700 text-sky-300' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="All">All Regimes</option>
                  <option value="Dry">Dry (&lt;2.5mm)</option>
                  <option value="Light">Light (2.5-15.5mm)</option>
                  <option value="Moderate">Moderate (15.5-64.5mm)</option>
                  <option value="Heavy">Heavy (&ge;64.5mm)</option>
                </select>

                {/* Anomalies Only Toggle */}
                <label className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer font-medium select-none ${
                  reportAnomalyOnly
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                    : isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <input
                    type="checkbox"
                    checked={reportAnomalyOnly}
                    onChange={(e) => setReportAnomalyOnly(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-0"
                  />
                  <span>Anomalies Only</span>
                </label>
              </div>
            </div>

            {/* Day-by-Day Detailed Table */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {reportDataset.length > 0 ? (
                <div className="border rounded-xl overflow-hidden shadow-inner">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className={`font-mono text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b ${
                      isDark ? 'bg-slate-950 text-sky-300 border-slate-800' : 'bg-slate-100 text-slate-800 font-bold border-slate-300'
                    }`}>
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3 min-w-[130px] whitespace-nowrap">Regime</th>
                        <th className="p-3 text-right">Ground Obs</th>
                        <th className="p-3 text-right">Raw NWP</th>
                        <th className="p-3 text-right">AI Corrected</th>
                        <th className="p-3 text-right">D3 Trend</th>
                        <th className="p-3 text-right">D3 {movingAvgWindow}d MA</th>
                        <th className="p-3 text-center">Anomaly</th>
                        <th className="p-3 min-w-[280px]">Meteorological Assessment Narrative</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y font-sans ${
                      isDark ? 'divide-slate-800/60 bg-slate-900/80' : 'divide-slate-100 bg-white'
                    }`}>
                      {reportDataset.map((row, idx) => {
                        const narrative = generateDailyNarrative(row);
                        const aiImproved = row.aiError < row.rawError;

                        return (
                          <tr
                            key={`report-row-${row.date}-${idx}`}
                            className={`transition-colors ${
                              row.isAnomaly
                                ? isDark ? 'bg-amber-950/20 hover:bg-amber-950/40' : 'bg-amber-50/60 hover:bg-amber-100/60'
                                : isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                            }`}
                          >
                            {/* Date */}
                            <td className={`p-3 font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                              <div>{row.fullDate || row.date}</div>
                              <span className={`text-[10px] font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Day {idx + 1}</span>
                            </td>

                            {/* Regime */}
                            <td className="p-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap leading-none ${
                                row.observed >= 64.5
                                  ? (isDark ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-rose-100 text-rose-800 border border-rose-200')
                                  : row.observed >= 15.5
                                  ? (isDark ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-blue-100 text-blue-800 border border-blue-200')
                                  : row.observed >= 2.5
                                  ? (isDark ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-sky-100 text-sky-800 border border-sky-200')
                                  : (isDark ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30' : 'bg-slate-100 text-slate-700 border border-slate-200')
                              }`}>
                                {row.regime}
                              </span>
                            </td>

                            {/* Ground Obs */}
                            <td className={`p-3 text-right font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                              {row.observed} <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>mm</span>
                            </td>

                            {/* Raw NWP */}
                            <td className={`p-3 text-right font-mono ${isDark ? 'text-rose-400' : 'text-rose-700 font-semibold'}`}>
                              {row.rawForecast} <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>mm</span>
                              <div className={`text-[10px] ${isDark ? 'opacity-75' : 'text-rose-600 font-normal'}`}>Err: {row.rawError}mm</div>
                            </td>

                            {/* AI Corrected */}
                            <td className={`p-3 text-right font-mono font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                              {row.aiCorrected} <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>mm</span>
                              <div className={`text-[10px] font-semibold ${aiImproved ? (isDark ? 'text-emerald-400' : 'text-emerald-700') : (isDark ? 'text-amber-400' : 'text-amber-700')}`}>
                                Err: {row.aiError}mm
                              </div>
                            </td>

                            {/* D3 Trend Line */}
                            <td className={`p-3 text-right font-mono ${isDark ? 'text-purple-300' : 'text-purple-700 font-semibold'}`}>
                              {row.d3AiTrendLine} <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>mm</span>
                            </td>

                            {/* D3 Moving Avg */}
                            <td className={`p-3 text-right font-mono ${isDark ? 'text-amber-300' : 'text-amber-700 font-semibold'}`}>
                              {row.d3AiMovingAvg} <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>mm</span>
                            </td>

                            {/* Anomaly Badge */}
                            <td className="p-3 text-center">
                              {row.isAnomaly ? (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono inline-flex items-center gap-1 ${
                                  row.anomalyType === 'surge'
                                    ? 'bg-rose-500 text-white'
                                    : 'bg-sky-500 text-white'
                                }`}>
                                  <Zap className="w-3 h-3" />
                                  {row.anomalyZScore}σ
                                </span>
                              ) : (
                                <span className={`${isDark ? 'text-slate-500' : 'text-slate-400'} font-mono text-[10px]`}>&mdash;</span>
                              )}
                            </td>

                            {/* Narrative */}
                            <td className={`p-3 text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700 font-medium'}`}>
                              {narrative}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed rounded-xl space-y-2">
                  <Search className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">No matching daily records found</p>
                  <p className="text-xs text-slate-500">Try adjusting your search query, regime filters, or anomaly toggles.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t flex flex-wrap items-center justify-between text-xs shrink-0 ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <div className="flex items-center gap-2 font-mono">
                <span>Showing <strong>{reportDataset.length}</strong> of <strong>{reportStats.totalDays}</strong> station days</span>
                {isComparing && (
                  <span className="text-indigo-400 text-[11px] font-normal border-l border-slate-700 pl-2">
                    Comparative overlay active vs {compareYear}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadCSV(reportScope)}
                  className="px-3 py-1 rounded bg-slate-800 text-emerald-300 border border-emerald-500/40 hover:bg-slate-700 font-semibold"
                >
                  Download CSV
                </button>
                <button
                  onClick={() => handleDownloadJSON(reportScope)}
                  className="px-3 py-1 rounded bg-slate-800 text-blue-300 border border-blue-500/40 hover:bg-slate-700 font-semibold"
                >
                  Download JSON
                </button>
                <button
                  onClick={() => setShowDayByDayReport(false)}
                  className="px-3 py-1 rounded bg-slate-700 text-white hover:bg-slate-600 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

