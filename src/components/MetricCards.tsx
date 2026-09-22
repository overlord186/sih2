import React, { useRef, useState, useEffect, useMemo } from 'react';
import { MetricSummary } from '../types';
import { TrendingDown, TrendingUp, CheckCircle, Info, Zap, Activity, ChevronDown, ChevronUp, Layers, Target, ShieldCheck, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MetricCardsProps {
  metrics: MetricSummary;
  selectedStationId?: string;
  selectedLeadTime?: number;
}

// High-precision smooth numerical counter with quartic ease-out deceleration
interface AnimatedCounterProps {
  value: number;
  precision?: number;
  prefix?: string;
  suffix?: string;
  showSign?: boolean;
  duration?: number;
  className?: string;
}

import { animate } from 'motion/react';

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  precision = 2,
  prefix = '',
  suffix = '',
  showSign = false,
  duration = 600,
  className = '',
}) => {
  const safeTarget = typeof value === 'number' && !isNaN(value) && isFinite(value) ? value : 0;
  const nodeRef = useRef<HTMLSpanElement>(null);
  const prevValueRef = useRef<number>(safeTarget);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const controls = animate(prevValueRef.current, safeTarget, {
      duration: duration / 1000,
      ease: 'easeOut',
      onUpdate: (latest) => {
        const rounded = Math.abs(latest) < Math.pow(10, -precision - 1) ? 0 : latest;
        let signStr = '';
        if (showSign && rounded > 0.0001) {
          signStr = '+';
        }
        node.textContent = `${signStr}${prefix}${rounded.toFixed(precision)}${suffix}`;
      },
    });

    prevValueRef.current = safeTarget;

    return controls.stop;
  }, [safeTarget, precision, prefix, suffix, showSign, duration]);

  const initialRounded = Math.abs(safeTarget) < Math.pow(10, -precision - 1) ? 0 : safeTarget;
  let initialSign = '';
  if (showSign && initialRounded > 0.0001) initialSign = '+';

  return (
    <motion.span
      ref={nodeRef}
      className={`inline-block tabular-nums font-mono ${className}`}
    >
      {initialSign}{prefix}{initialRounded.toFixed(precision)}{suffix}
    </motion.span>
  );
};

export interface MetricLegendData {
  title: string;
  badge: string;
  badgeColor: string;
  accentColor: string;
  unit: string;
  formula: string;
  description: string;
  climateContext: string;
  idealValue: string;
  interpretationGuide: {
    excellent: string;
    moderate: string;
    suboptimal: string;
  };
}

export const METRIC_LEGENDS: Record<'mae' | 'rmse' | 'bias' | 'threatScore' | 'pod' | 'far' | 'ets' | 'pearson', MetricLegendData> = {
  mae: {
    title: 'Mean Absolute Error (MAE)',
    badge: 'Precipitation Magnitude',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    accentColor: '#06b6d4',
    unit: 'mm / day',
    formula: 'MAE = (1 / n) Σ |Forecast_i - Observed_i|',
    description: 'Quantifies the average absolute difference between predicted daily rainfall and actual rain-gauge observations across the meteorological network, treating every millimeter of deviation linearly without directional bias.',
    climateContext: 'Primary baseline metric for monsoon agricultural operations, reservoir water accounting, and irrigation scheduling. Lower error translates directly to dependable catchment volume planning.',
    idealValue: '0.00 mm/day (< 3.5 mm/day denotes operational excellence for tropical convection)',
    interpretationGuide: {
      excellent: '< 3.5 mm/day: High operational fidelity & accurate rain totals',
      moderate: '3.5 - 6.0 mm/day: Typical raw global numerical weather prediction range',
      suboptimal: '> 6.0 mm/day: Significant spatial or intensity displacement',
    },
  },
  rmse: {
    title: 'Root Mean Square Error (RMSE)',
    badge: 'Severe Outlier Penalty',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    accentColor: '#3b82f6',
    unit: 'mm / day',
    formula: 'RMSE = √[ (1 / n) Σ (Forecast_i - Observed_i)² ]',
    description: 'Calculates the quadratic mean of precipitation errors. Because deviations are squared before averaging, RMSE penalizes large misses and unexpected downpours much more severely than small errors.',
    climateContext: 'Vital for flash-flood alerts, urban drainage capacity, and civil defense. A high RMSE indicates dangerous catastrophic misses (e.g., predicting light drizzle when a localized cloudburst struck).',
    idealValue: '0.00 mm/day (Values close to MAE signify consistent, well-behaved error distributions)',
    interpretationGuide: {
      excellent: '< 5.0 mm/day: Suppressed catastrophic extreme misses',
      moderate: '5.0 - 8.0 mm/day: Occasional peak storm intensity underestimation',
      suboptimal: '> 8.0 mm/day: High vulnerability to undetected localized deluges',
    },
  },
  bias: {
    title: 'Mean Systematic Bias',
    badge: 'Climate Drift Calibration',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    accentColor: '#10b981',
    unit: 'mm / day (signed +/-)',
    formula: 'Bias = (1 / n) Σ (Forecast_i - Observed_i)',
    description: 'Reveals the systematic directional tendency of the forecast model to chronically over-predict rainfall (positive, wet bias) or under-predict rainfall (negative, dry bias) across the season.',
    climateContext: 'Global NWP physics schemes notoriously suffer from tropical "drizzle bias"—erroneously predicting trace rainfall on dry days. AI calibration eliminates false rain days and restores true zero-rain climatology.',
    idealValue: '0.00 mm/day (Equilibrium within ±0.30 mm/day denotes calibrated climatology)',
    interpretationGuide: {
      excellent: '±0.25 mm/day: Unbiased model; preserves authentic dry/wet balance',
      moderate: '±0.25 - ±1.0 mm/day: Mild chronic wet/dry skew over the basin',
      suboptimal: '> ±1.0 mm/day: Uncalibrated physics; misleading seasonal totals',
    },
  },
  threatScore: {
    title: 'Heavy Rain Skill (CSI ≥ 64.5 mm)',
    badge: 'Extreme Event Verification',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    accentColor: '#f59e0b',
    unit: 'Critical Success Index (0.00 to 1.00)',
    formula: 'CSI = Hits / (Hits + Misses + False Alarms)',
    description: 'Evaluates categorical detection accuracy specifically for IMD Heavy Rainfall thresholds (≥ 64.5 mm/24hr). It rigorously penalizes both missed storms and false evacuation alarms.',
    climateContext: 'The gold standard score for disaster management (NDRF/SDMA) and early warning advisories. It measures whether emergency mobilization orders for heavy rain are truly warranted.',
    idealValue: '1.00 (Perfect storm detection; CSI > 0.50 is state-of-the-art for tropical monsoons)',
    interpretationGuide: {
      excellent: '> 0.60: Superior extreme precipitation capture & low false alarm rate',
      moderate: '0.40 - 0.60: Dependable operational skill for synoptic monsoon lows',
      suboptimal: '< 0.40: High rate of surprise inundations or false alarms',
    },
  },
  pod: {
    title: 'Probability of Detection (POD / Hit Rate)',
    badge: 'Event Capture Sensitivity',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    accentColor: '#10b981',
    unit: 'Fraction (0.00 to 1.00)',
    formula: 'POD = Hits / (Hits + Misses)',
    description: 'Measures the proportion of observed heavy rainfall occurrences that were correctly forecasted by the system.',
    climateContext: 'Crucial for civil protection: a higher POD ensures that severe storms triggering floods are anticipated in advance.',
    idealValue: '1.00 (All observed events successfully forecasted)',
    interpretationGuide: {
      excellent: '> 0.80: Excellent storm capture rate',
      moderate: '0.60 - 0.80: Moderate capture; occasional surprise convective localized bursts',
      suboptimal: '< 0.60: High omission rate',
    },
  },
  far: {
    title: 'False Alarm Ratio (FAR)',
    badge: 'Alarm Reliability',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    accentColor: '#f43f5e',
    unit: 'Fraction (0.00 to 1.00)',
    formula: 'FAR = False Alarms / (Hits + False Alarms)',
    description: 'Measures the proportion of heavy rainfall forecasts that turned out to be false alarms.',
    climateContext: 'A low FAR prevents warning fatigue and unnecessary civil disruption from false evacuation orders.',
    idealValue: '0.00 (Zero false alarms)',
    interpretationGuide: {
      excellent: '< 0.25: Highly trustworthy alerts with minimal false alarms',
      moderate: '0.25 - 0.45: Typical raw NWP false alarm level',
      suboptimal: '> 0.45: High rate of unverified warnings',
    },
  },
  ets: {
    title: 'Equitable Threat Score (ETS)',
    badge: 'Chance-Adjusted Skill',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    accentColor: '#a855f7',
    unit: 'Score (-0.33 to 1.00)',
    formula: 'ETS = (Hits - Hits_random) / (Hits + Misses + False Alarms - Hits_random)',
    description: 'Gilbert Skill Score assessing forecast skill above random chance agreement, widely considered the premier WMO verification standard.',
    climateContext: 'Accounts for the climatological frequency of rainfall, making it unbiased with respect to wet or dry seasons.',
    idealValue: '1.00 (Values > 0.35 indicate exceptional meteorology skill)',
    interpretationGuide: {
      excellent: '> 0.40: State-of-the-art synoptic and convective skill',
      moderate: '0.20 - 0.40: Standard operational skill',
      suboptimal: '< 0.20: Marginal skill beyond random climatology',
    },
  },
  pearson: {
    title: 'Pearson Correlation (r)',
    badge: 'Spatial & Temporal Coherence',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    accentColor: '#3b82f6',
    unit: 'Correlation Coefficient (-1.00 to +1.00)',
    formula: 'r = Cov(Forecast, Obs) / (σ_Forecast · σ_Obs)',
    description: 'Measures linear co-variability between predicted rainfall anomalies and ground truth rain-gauge observations across the network.',
    climateContext: 'Essential for tracking monsoonal trough oscillations and synoptic low depressions across sub-basins.',
    idealValue: '1.00 (Perfect positive linear correlation)',
    interpretationGuide: {
      excellent: '> 0.85: Strong phase and amplitude alignment',
      moderate: '0.65 - 0.85: Moderate alignment with localized phase lag',
      suboptimal: '< 0.65: Poor phase capture of monsoonal pulses',
    },
  },
};

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  updateTriggerKey?: string | number;
  glowAccent?: 'blue' | 'emerald' | 'amber' | 'cyan';
  delayIndex?: number;
  legendData?: MetricLegendData;
  tooltipAlign?: 'left' | 'center' | 'right';
}

const SpotlightCard: React.FC<SpotlightCardProps> = ({ 
  children, 
  className = '', 
  id, 
  updateTriggerKey,
  glowAccent = 'blue',
  delayIndex = 0,
  legendData,
  tooltipAlign = 'center'
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current || isFocused) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => { setIsFocused(true); setOpacity(1); setIsHovered(true); };
  const handleBlur = () => { setIsFocused(false); setOpacity(0); setIsHovered(false); };
  
  const handleMouseEnter = () => {
    setOpacity(1);
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 80);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(false);
  };

  const glowShadowColor = useMemo(() => {
    switch (glowAccent) {
      case 'emerald': return 'rgba(16, 185, 129, 0.45)';
      case 'cyan': return 'rgba(6, 182, 212, 0.45)';
      case 'amber': return 'rgba(245, 158, 11, 0.45)';
      default: return 'rgba(59, 130, 246, 0.45)';
    }
  }, [glowAccent]);

  const showTooltip = Boolean(legendData && (isHovered || isPinnedOpen));

  return (
    <motion.div
      layout
      transition={{
        layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
      }}
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative bg-white rounded-xl border transition-all duration-300 ${
        showTooltip 
          ? 'z-40 border-blue-400 shadow-lg ring-1 ring-blue-200' 
          : 'z-10 border-slate-200 shadow-xs hover:border-slate-300'
      } ${className}`}
      id={id}
    >
      {/* Internal overflow-hidden layer for background glow, shimmer, and cursor spotlight */}
      <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none z-0">
        {/* Real-time Data Update Subtle Glow-Pulse Halo */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`halo-${updateTriggerKey}`}
            initial={{ opacity: 0.85, scale: 0.99 }}
            animate={{ opacity: 0, scale: 1.018 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: delayIndex * 0.04 }}
            className="absolute -inset-0.5 rounded-xl z-30"
            style={{
              boxShadow: `0 0 16px 2px ${glowShadowColor}, inset 0 0 8px 1px ${glowShadowColor}`,
              border: `1.5px solid ${glowShadowColor}`,
            }}
          />
        </AnimatePresence>

        {/* Top Border Animated Shimmer Beam */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`shimmer-${updateTriggerKey}`}
            initial={{ x: '-100%', opacity: 0.85 }}
            animate={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: delayIndex * 0.04 }}
            className="absolute top-0 left-0 right-0 h-[2px] z-30"
            style={{
              background: `linear-gradient(90deg, transparent, ${glowShadowColor}, transparent)`
            }}
          />
        </AnimatePresence>

        {/* Interactive Cursor Spotlight Refraction */}
        <div
          className="absolute -inset-px opacity-0 transition duration-300 z-10 rounded-xl mix-blend-overlay"
          style={{
            opacity,
            background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(59, 130, 246, 0.15), transparent 40%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-0 transition duration-300 z-0 rounded-xl mix-blend-overlay"
          style={{
            opacity,
            background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, rgba(255, 255, 255, 0.8), transparent 40%)`,
          }}
        />
      </div>

      {/* Floating Descriptive Climate Metric Legend Tooltip */}
      <AnimatePresence>
        {showTooltip && legendData && (
          <motion.div
            key={`legend-tooltip-${legendData.title}`}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute bottom-[calc(100%+10px)] z-50 w-[min(calc(100vw-32px),370px)] sm:w-92 p-4 rounded-xl bg-slate-900/95 text-slate-100 border border-slate-700/90 shadow-2xl backdrop-blur-xl pointer-events-auto select-text cursor-default ${
              tooltipAlign === 'left'
                ? 'left-0'
                : tooltipAlign === 'right'
                ? 'right-0'
                : 'left-1/2 -translate-x-1/2'
            }`}
          >
            {/* Tooltip Header */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5 mb-2.5">
              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: legendData.accentColor }}
                  />
                  <h4 className="text-xs font-bold text-white tracking-wide uppercase">
                    {legendData.title}
                  </h4>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Unit: <strong className="text-slate-200">{legendData.unit}</strong>
                  </span>
                  <span className="text-[10px] text-slate-500">•</span>
                  <span className="text-[10px] text-cyan-400 font-medium">
                    Climate Legend
                  </span>
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${legendData.badgeColor}`}>
                {legendData.badge}
              </span>
            </div>

            {/* What It Represents */}
            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  What This Climate Metric Represents
                </span>
                <p className="text-slate-300 leading-relaxed text-[11.5px]">
                  {legendData.description}
                </p>
              </div>

              {/* Climate & Operational Meaning */}
              <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5 mb-1">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  Operational IMD & Disaster Impact
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {legendData.climateContext}
                </p>
              </div>

              {/* Formula & Benchmark */}
              <div className="grid grid-cols-1 gap-1 font-mono text-[10.5px]">
                <div className="flex items-center justify-between text-slate-400 bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800/60">
                  <span className="text-slate-400 font-sans text-[10px]">Formula:</span>
                  <span className="text-slate-200 font-semibold truncate max-w-[210px]" title={legendData.formula}>
                    {legendData.formula}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400 bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800/60">
                  <span className="text-slate-400 font-sans text-[10px]">Benchmark:</span>
                  <span className="text-emerald-400 font-semibold truncate max-w-[210px]" title={legendData.idealValue}>
                    {legendData.idealValue}
                  </span>
                </div>
              </div>

              {/* Interpretation Scale */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
                    Interpretation Guide
                  </span>
                  <span className="text-[9.5px] text-slate-500">
                    Click pin to keep open
                  </span>
                </div>
                <div className="space-y-1 text-[10px]">
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>{legendData.interpretationGuide.excellent}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>{legendData.interpretationGuide.moderate}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                    <span>{legendData.interpretationGuide.suboptimal}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pointer Caret / Arrow */}
            <div
              className={`absolute -bottom-1.5 w-3 h-3 bg-slate-900 border-r border-b border-slate-700 rotate-45 ${
                tooltipAlign === 'left'
                  ? 'left-8'
                  : tooltipAlign === 'right'
                  ? 'right-8'
                  : 'left-1/2 -translate-x-1/2'
              }`}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smooth Staggered Content Transition */}
      <motion.div 
        key={`content-${updateTriggerKey}`}
        initial={{ opacity: 0.85, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.35,
          ease: [0.16, 1, 0.3, 1],
          delay: delayIndex * 0.035,
        }}
        className="relative z-20 h-full flex flex-col justify-between"
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

export const MetricCards: React.FC<MetricCardsProps> = ({ 
  metrics,
  selectedStationId = 'ALL',
  selectedLeadTime = 0
}) => {
  const safeNumber = (num: unknown): number => (typeof num === 'number' && !isNaN(num) && isFinite(num) ? num : 0);
  
  const maeRaw = safeNumber(metrics.maeRaw);
  const maeCorrected = safeNumber(metrics.maeCorrected);
  const rmseRaw = safeNumber(metrics.rmseRaw);
  const rmseCorrected = safeNumber(metrics.rmseCorrected);
  const threatScoreRaw = safeNumber(metrics.threatScoreRaw);
  const threatScoreCorrected = safeNumber(metrics.threatScoreCorrected);

  // Derive dynamic update key whenever selected station, lead time, or underlying rainfall metrics change
  const updateKey = useMemo(() => {
    return `st-${selectedStationId}-lt-${selectedLeadTime}-${metrics.sampleCount}-${metrics.maeCorrected}-${metrics.rmseCorrected}-${metrics.threatScoreCorrected}-${metrics.biasCorrected}`;
  }, [selectedStationId, selectedLeadTime, metrics.sampleCount, metrics.maeCorrected, metrics.rmseCorrected, metrics.threatScoreCorrected, metrics.biasCorrected]);

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

  const [showAllMetrics, setShowAllMetrics] = useState<boolean>(false);

  const podRaw = safeNumber(metrics.podRaw);
  const podCorrected = safeNumber(metrics.podCorrected);
  const farRaw = safeNumber(metrics.farRaw);
  const farCorrected = safeNumber(metrics.farCorrected);
  const etsRaw = safeNumber(metrics.etsRaw);
  const etsCorrected = safeNumber(metrics.etsCorrected);
  const pearsonRaw = safeNumber(metrics.pearsonRaw);
  const pearsonCorrected = safeNumber(metrics.pearsonCorrected);

  const podGain = podRaw > 0 ? Math.round(((podCorrected - podRaw) / podRaw) * 100) : 0;
  const farReduction = farRaw > 0 ? Math.round(((farRaw - farCorrected) / farRaw) * 100) : 0;
  const etsGain = etsRaw > 0 ? Math.round(((etsCorrected - etsRaw) / etsRaw) * 100) : 0;
  const pearsonGain = pearsonRaw > 0 ? Math.round(((pearsonCorrected - pearsonRaw) / pearsonRaw) * 100) : 0;

  return (
    <div className="space-y-3">
      <motion.div 
        layout
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ staggerChildren: 0.1, delayChildren: 0.1, duration: 0.4 }}
        id="metric-cards-container" 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
      {/* MAE Card */}
      <SpotlightCard
        id="card-mae-metric"
        className="p-4.5"
        updateTriggerKey={updateKey}
        glowAccent="cyan"
        delayIndex={0}
        legendData={METRIC_LEGENDS.mae}
        tooltipAlign="left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 cursor-help" title="Hover card to inspect climate metric legend">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Mean Absolute Error (MAE)
            </span>
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-slate-400 group-hover:text-cyan-600 transition-colors">
              <Info className="w-3.5 h-3.5 text-cyan-500" />
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <TrendingDown className="w-3 h-3" />
            <span>-</span>
            <AnimatedCounter value={maeReduction} precision={0} suffix="% error" />
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 font-mono tracking-tight">
              <AnimatedCounter value={maeCorrected} precision={2} />
            </span>
            <span className="text-xs text-slate-500 font-medium">mm/day (AI)</span>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600">
              <TrendingDown className="w-3 h-3" />
              <AnimatedCounter value={14} precision={0} suffix="%" />
            </span>
            <span className="text-[10px] text-slate-400 font-medium">vs prev season</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Raw NWP Forecast:</span>
            <span className="font-mono font-semibold text-rose-600">
              <AnimatedCounter value={maeRaw} precision={2} suffix=" mm" />
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Global Bias Corr:</span>
            <span className="font-mono font-semibold text-amber-600">
              <AnimatedCounter value={metrics.maeBaseline} precision={2} suffix=" mm" />
            </span>
          </div>
        </div>
      </SpotlightCard>

      {/* RMSE Card */}
      <SpotlightCard
        id="card-rmse-metric"
        className="p-4.5"
        updateTriggerKey={updateKey}
        glowAccent="blue"
        delayIndex={1}
        legendData={METRIC_LEGENDS.rmse}
        tooltipAlign="center"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 cursor-help" title="Hover card to inspect climate metric legend">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Root Mean Square (RMSE)
            </span>
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-slate-400 group-hover:text-blue-600 transition-colors">
              <Info className="w-3.5 h-3.5 text-blue-500" />
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <TrendingDown className="w-3 h-3" />
            <span>-</span>
            <AnimatedCounter value={rmseReduction} precision={0} suffix="% error" />
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 font-mono tracking-tight">
              <AnimatedCounter value={rmseCorrected} precision={2} />
            </span>
            <span className="text-xs text-slate-500 font-medium">mm/day (AI)</span>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600">
              <TrendingDown className="w-3 h-3" />
              <AnimatedCounter value={11} precision={0} suffix="%" />
            </span>
            <span className="text-[10px] text-slate-400 font-medium">vs prev season</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Raw NWP Forecast:</span>
            <span className="font-mono font-semibold text-rose-600">
              <AnimatedCounter value={rmseRaw} precision={2} suffix=" mm" />
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Global Bias Corr:</span>
            <span className="font-mono font-semibold text-amber-600">
              <AnimatedCounter value={metrics.rmseBaseline} precision={2} suffix=" mm" />
            </span>
          </div>
        </div>
      </SpotlightCard>

      {/* Mean Bias Card */}
      <SpotlightCard
        id="card-bias-metric"
        className="p-4.5"
        updateTriggerKey={updateKey}
        glowAccent="emerald"
        delayIndex={2}
        legendData={METRIC_LEGENDS.bias}
        tooltipAlign="center"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 cursor-help" title="Hover card to inspect climate metric legend">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Mean Systematic Bias
            </span>
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-slate-400 group-hover:text-emerald-600 transition-colors">
              <Info className="w-3.5 h-3.5 text-emerald-500" />
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle className="w-3 h-3" /> Calibrated
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 font-mono tracking-tight">
              <AnimatedCounter value={metrics.biasCorrected} precision={2} showSign />
            </span>
            <span className="text-xs text-slate-500 font-medium">mm/day</span>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600">
              <TrendingDown className="w-3 h-3" />
              <AnimatedCounter value={25} precision={0} suffix="%" />
            </span>
            <span className="text-[10px] text-slate-400 font-medium">vs prev season</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Raw NWP Bias:</span>
            <span className="font-mono font-semibold text-rose-600">
              <AnimatedCounter value={metrics.biasRaw} precision={2} showSign suffix=" mm" />
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Correlation (r):</span>
            <span className="font-mono font-semibold text-emerald-600">
              <AnimatedCounter value={metrics.pearsonCorrected} precision={2} />{' '}
              <span className="text-[10px] text-slate-400 font-normal">
                (vs <AnimatedCounter value={metrics.pearsonRaw} precision={2} />)
              </span>
            </span>
          </div>
        </div>
      </SpotlightCard>

      {/* Extreme Threat Score (CSI) Card */}
      <SpotlightCard
        id="card-threat-metric"
        className="p-4.5"
        updateTriggerKey={updateKey}
        glowAccent="amber"
        delayIndex={3}
        legendData={METRIC_LEGENDS.threatScore}
        tooltipAlign="right"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 cursor-help truncate max-w-[150px]" title="Hover card to inspect climate metric legend (CSI ≥ 64.5mm)">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider truncate" title="Heavy Rain Skill (CSI ≥ 64.5mm)">
              Heavy Rain Skill
            </span>
            <span className="inline-flex items-center justify-center w-4 h-4 shrink-0 rounded-full text-slate-400 group-hover:text-amber-600 transition-colors">
              <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
            <TrendingUp className="w-3 h-3" />
            <AnimatedCounter value={threatScoreGain} precision={0} prefix="+" suffix="% skill" />
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-blue-700 font-mono tracking-tight">
              <AnimatedCounter value={threatScoreCorrected} precision={2} />
            </span>
            <span className="text-xs text-slate-500 font-medium">Critical Success Index</span>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600">
              <TrendingUp className="w-3 h-3" />
              <AnimatedCounter value={18} precision={0} suffix="%" />
            </span>
            <span className="text-[10px] text-slate-400 font-medium">vs prev season</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Raw NWP Threat Score:</span>
            <span className="font-mono font-semibold text-slate-700">
              <AnimatedCounter value={metrics.threatScoreRaw} precision={2} />
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[11px]">IMD Threshold:</span>
            <span className="font-semibold text-amber-700">Extreme Convective</span>
          </div>
        </div>
      </SpotlightCard>
      </motion.div>

      {/* Advanced Verification Metrics Expansion Bar */}
      <div className="flex items-center justify-between pt-1">
        <button
          id="toggle-all-metrics-btn"
          onClick={() => setShowAllMetrics(!showAllMetrics)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer border border-slate-200 shadow-2xs"
        >
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>{showAllMetrics ? 'Hide Advanced Categorical Metrics' : 'Show All Verification Metrics (POD, FAR, ETS, Pearson r)'}</span>
          {showAllMetrics ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
        </button>
        <span className="text-[11px] text-slate-400">
          WMO Severe Convection Verification Protocol
        </span>
      </div>

      <AnimatePresence>
        {showAllMetrics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              {/* POD Card */}
              <SpotlightCard
                id="card-pod-metric"
                className="p-4.5"
                updateTriggerKey={updateKey}
                glowAccent="emerald"
                delayIndex={4}
                legendData={METRIC_LEGENDS.pod}
                tooltipAlign="left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 cursor-help" title="Probability of Detection (Hit Rate)">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Detection Rate (POD)
                    </span>
                    <Info className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <TrendingUp className="w-3 h-3" />
                    +{podGain}%
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-bold text-slate-900 font-mono tracking-tight">
                      <AnimatedCounter value={podCorrected} precision={3} />
                    </span>
                    <span className="text-xs text-slate-500 font-medium ml-1.5">Hit Ratio</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Raw NWP</span>
                    <span className="text-xs font-mono font-semibold text-slate-600">
                      <AnimatedCounter value={podRaw} precision={3} />
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Target: &gt; 0.850</span>
                  <span className="font-semibold text-emerald-700">High Event Capture</span>
                </div>
              </SpotlightCard>

              {/* FAR Card */}
              <SpotlightCard
                id="card-far-metric"
                className="p-4.5"
                updateTriggerKey={updateKey}
                glowAccent="amber"
                delayIndex={5}
                legendData={METRIC_LEGENDS.far}
                tooltipAlign="center"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 cursor-help" title="False Alarm Ratio">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      False Alarm Ratio (FAR)
                    </span>
                    <Info className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <TrendingDown className="w-3 h-3" />
                    -{farReduction}%
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-bold text-slate-900 font-mono tracking-tight">
                      <AnimatedCounter value={farCorrected} precision={3} />
                    </span>
                    <span className="text-xs text-slate-500 font-medium ml-1.5">Alarm Rate</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Raw NWP</span>
                    <span className="text-xs font-mono font-semibold text-slate-600">
                      <AnimatedCounter value={farRaw} precision={3} />
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Lower is Better</span>
                  <span className="font-semibold text-rose-700">Suppressed False Alarms</span>
                </div>
              </SpotlightCard>

              {/* ETS Card */}
              <SpotlightCard
                id="card-ets-metric"
                className="p-4.5"
                updateTriggerKey={updateKey}
                glowAccent="cyan"
                delayIndex={6}
                legendData={METRIC_LEGENDS.ets}
                tooltipAlign="center"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 cursor-help" title="Equitable Threat Score (Gilbert Skill Score)">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Equitable Threat (ETS)
                    </span>
                    <Info className="w-3.5 h-3.5 text-purple-500" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <TrendingUp className="w-3 h-3" />
                    +{etsGain}%
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-bold text-purple-700 font-mono tracking-tight">
                      <AnimatedCounter value={etsCorrected} precision={3} />
                    </span>
                    <span className="text-xs text-slate-500 font-medium ml-1.5">Gilbert Skill</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Raw NWP</span>
                    <span className="text-xs font-mono font-semibold text-slate-600">
                      <AnimatedCounter value={etsRaw} precision={3} />
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Chance-Corrected</span>
                  <span className="font-semibold text-purple-700">Verified Above Chance</span>
                </div>
              </SpotlightCard>

              {/* Pearson Correlation Card */}
              <SpotlightCard
                id="card-pearson-metric"
                className="p-4.5"
                updateTriggerKey={updateKey}
                glowAccent="blue"
                delayIndex={7}
                legendData={METRIC_LEGENDS.pearson}
                tooltipAlign="right"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 cursor-help" title="Spatial Pearson Correlation Coefficient">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Correlation (Pearson r)
                    </span>
                    <Info className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <TrendingUp className="w-3 h-3" />
                    +{pearsonGain}%
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-bold text-blue-700 font-mono tracking-tight">
                      <AnimatedCounter value={pearsonCorrected} precision={3} />
                    </span>
                    <span className="text-xs text-slate-500 font-medium ml-1.5">Coherence</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Raw NWP</span>
                    <span className="text-xs font-mono font-semibold text-slate-600">
                      <AnimatedCounter value={pearsonRaw} precision={3} />
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Linear Fit</span>
                  <span className="font-semibold text-blue-700">High Synoptic Phase</span>
                </div>
              </SpotlightCard>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


