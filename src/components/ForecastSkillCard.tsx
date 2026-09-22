import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { RainfallDataPoint, RainfallRegime } from '../types';
import { Award, BarChart2, CheckCircle2, Info, Sparkles, TrendingUp, Target, ShieldCheck, ArrowDownRight, RefreshCw } from 'lucide-react';

interface ForecastSkillCardProps {
  data: RainfallDataPoint[];
  selectedYear: number;
  selectedStationName: string;
}

type GroupingMode = 'monthly' | 'dekadal' | 'regime';

interface GroupedBarData {
  key: string;
  label: string;
  sublabel?: string;
  observedTotal: number;
  observedAvg: number;
  rawTotal: number;
  rawAvg: number;
  aiTotal: number;
  aiAvg: number;
  sampleCount: number;
  rawError: number;
  aiError: number;
  skillScorePct: number; // % error reduction
}

export const ForecastSkillCard: React.FC<ForecastSkillCardProps> = ({
  data,
  selectedYear,
  selectedStationName,
}) => {
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('monthly');
  const [metricMode, setMetricMode] = useState<'total' | 'average'>('total');
  const [activeHoverBar, setActiveHoverBar] = useState<GroupedBarData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [chartWidth, setChartWidth] = useState<number>(600);

  // ResizeObserver for responsive SVG dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries[0]) return;
      const w = entries[0].contentRect.width;
      if (w > 0) setChartWidth(Math.max(320, w));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Aggregated data for seasonal skill comparison
  const groupedChartData = useMemo<GroupedBarData[]>(() => {
    if (!data || data.length === 0) return [];

    if (groupingMode === 'monthly') {
      const monthMap = new Map<string, RainfallDataPoint[]>();
      const monthOrder = ['June', 'July', 'August', 'September'];

      data.forEach((d) => {
        const dateObj = new Date(d.date);
        const mName = dateObj.toLocaleString('en-US', { month: 'long' });
        if (!monthMap.has(mName)) {
          monthMap.set(mName, []);
        }
        monthMap.get(mName)!.push(d);
      });

      return monthOrder
        .filter((m) => monthMap.has(m))
        .map((m) => {
          const points = monthMap.get(m)!;
          const obsSum = d3.sum(points, (p) => p.observedMm);
          const rawSum = d3.sum(points, (p) => p.rawForecastMm);
          const aiSum = d3.sum(points, (p) => p.correctedForecastMm);
          const count = points.length;

          const rawErr = d3.mean(points, (p) => Math.abs(p.rawForecastMm - p.observedMm)) || 0;
          const aiErr = d3.mean(points, (p) => Math.abs(p.correctedForecastMm - p.observedMm)) || 0;
          const skillScorePct = rawErr > 0 ? Math.max(0, Math.round(((rawErr - aiErr) / rawErr) * 100)) : 0;

          return {
            key: m,
            label: m,
            sublabel: `${count} days`,
            observedTotal: Math.round(obsSum * 10) / 10,
            observedAvg: Math.round((obsSum / count) * 10) / 10,
            rawTotal: Math.round(rawSum * 10) / 10,
            rawAvg: Math.round((rawSum / count) * 10) / 10,
            aiTotal: Math.round(aiSum * 10) / 10,
            aiAvg: Math.round((aiSum / count) * 10) / 10,
            sampleCount: count,
            rawError: Math.round(rawErr * 10) / 10,
            aiError: Math.round(aiErr * 10) / 10,
            skillScorePct,
          };
        });
    }

    if (groupingMode === 'dekadal') {
      // 10-day Dekads across the 60-day season (D1 to D6)
      const dekadMap = new Map<number, RainfallDataPoint[]>();
      data.forEach((d) => {
        // Assume dayOfYear or index in 60-day sequence
        const dayIdx = d.dayOfYear ? (d.dayOfYear % 60) : 0;
        const dekadNum = Math.min(6, Math.floor(dayIdx / 10) + 1);
        if (!dekadMap.has(dekadNum)) {
          dekadMap.set(dekadNum, []);
        }
        dekadMap.get(dekadNum)!.push(d);
      });

      const dekadLabels: Record<number, { name: string; dates: string }> = {
        1: { name: 'Dekad 1', dates: 'Jun 01-10' },
        2: { name: 'Dekad 2', dates: 'Jun 11-20' },
        3: { name: 'Dekad 3', dates: 'Jun 21-30' },
        4: { name: 'Dekad 4', dates: 'Jul 01-10' },
        5: { name: 'Dekad 5', dates: 'Jul 11-20' },
        6: { name: 'Dekad 6', dates: 'Jul 21-31' },
      };

      return [1, 2, 3, 4, 5, 6]
        .filter((k) => dekadMap.has(k))
        .map((k) => {
          const points = dekadMap.get(k)!;
          const obsSum = d3.sum(points, (p) => p.observedMm);
          const rawSum = d3.sum(points, (p) => p.rawForecastMm);
          const aiSum = d3.sum(points, (p) => p.correctedForecastMm);
          const count = points.length;

          const rawErr = d3.mean(points, (p) => Math.abs(p.rawForecastMm - p.observedMm)) || 0;
          const aiErr = d3.mean(points, (p) => Math.abs(p.correctedForecastMm - p.observedMm)) || 0;
          const skillScorePct = rawErr > 0 ? Math.max(0, Math.round(((rawErr - aiErr) / rawErr) * 100)) : 0;

          return {
            key: `dekad-${k}`,
            label: dekadLabels[k]?.name || `Dekad ${k}`,
            sublabel: dekadLabels[k]?.dates || '',
            observedTotal: Math.round(obsSum * 10) / 10,
            observedAvg: Math.round((obsSum / count) * 10) / 10,
            rawTotal: Math.round(rawSum * 10) / 10,
            rawAvg: Math.round((rawSum / count) * 10) / 10,
            aiTotal: Math.round(aiSum * 10) / 10,
            aiAvg: Math.round((aiSum / count) * 10) / 10,
            sampleCount: count,
            rawError: Math.round(rawErr * 10) / 10,
            aiError: Math.round(aiErr * 10) / 10,
            skillScorePct,
          };
        });
    }

    // Regime grouping (Dry, Light, Moderate, Heavy)
    const regimeOrder = [
      RainfallRegime.DRY,
      RainfallRegime.LIGHT,
      RainfallRegime.MODERATE,
      RainfallRegime.HEAVY_EXTREME,
    ];

    const regimeMap = new Map<RainfallRegime, RainfallDataPoint[]>();
    data.forEach((d) => {
      const reg = d.detectedRegime || RainfallRegime.LIGHT;
      if (!regimeMap.has(reg)) {
        regimeMap.set(reg, []);
      }
      regimeMap.get(reg)!.push(d);
    });

    return regimeOrder
      .filter((r) => regimeMap.has(r))
      .map((r) => {
        const points = regimeMap.get(r)!;
        const obsSum = d3.sum(points, (p) => p.observedMm);
        const rawSum = d3.sum(points, (p) => p.rawForecastMm);
        const aiSum = d3.sum(points, (p) => p.correctedForecastMm);
        const count = points.length;

        const rawErr = d3.mean(points, (p) => Math.abs(p.rawForecastMm - p.observedMm)) || 0;
        const aiErr = d3.mean(points, (p) => Math.abs(p.correctedForecastMm - p.observedMm)) || 0;
        const skillScorePct = rawErr > 0 ? Math.max(0, Math.round(((rawErr - aiErr) / rawErr) * 100)) : 0;

        return {
          key: r,
          label: r,
          sublabel: `${count} events`,
          observedTotal: Math.round(obsSum * 10) / 10,
          observedAvg: Math.round((obsSum / count) * 10) / 10,
          rawTotal: Math.round(rawSum * 10) / 10,
          rawAvg: Math.round((rawSum / count) * 10) / 10,
          aiTotal: Math.round(aiSum * 10) / 10,
          aiAvg: Math.round((aiSum / count) * 10) / 10,
          sampleCount: count,
          rawError: Math.round(rawErr * 10) / 10,
          aiError: Math.round(aiErr * 10) / 10,
          skillScorePct,
        };
      });
  }, [data, groupingMode]);

  // Overall Seasonal Summary Stats
  const seasonalStats = useMemo(() => {
    if (!data || data.length === 0) {
      return { totalObs: 0, totalRaw: 0, totalAi: 0, rawMae: 0, aiMae: 0, skillGainPct: 0, biasCorrectionPct: 0 };
    }
    const totalObs = d3.sum(data, (d) => d.observedMm);
    const totalRaw = d3.sum(data, (d) => d.rawForecastMm);
    const totalAi = d3.sum(data, (d) => d.correctedForecastMm);

    const rawMae = d3.mean(data, (d) => Math.abs(d.rawForecastMm - d.observedMm)) || 0;
    const aiMae = d3.mean(data, (d) => Math.abs(d.correctedForecastMm - d.observedMm)) || 0;

    const skillGainPct = rawMae > 0 ? Math.round(((rawMae - aiMae) / rawMae) * 100) : 0;
    const rawBias = totalObs > 0 ? ((totalRaw - totalObs) / totalObs) * 100 : 0;
    const aiBias = totalObs > 0 ? ((totalAi - totalObs) / totalObs) * 100 : 0;

    return {
      totalObs: Math.round(totalObs * 10) / 10,
      totalRaw: Math.round(totalRaw * 10) / 10,
      totalAi: Math.round(totalAi * 10) / 10,
      rawMae: Math.round(rawMae * 10) / 10,
      aiMae: Math.round(aiMae * 10) / 10,
      skillGainPct,
      rawBias: Math.round(rawBias * 10) / 10,
      aiBias: Math.round(aiBias * 10) / 10,
    };
  }, [data]);

  // Dimensions & Scales for D3 Chart
  const height = 280;
  const margin = { top: 30, right: 20, bottom: 45, left: 50 };
  const innerWidth = Math.max(200, chartWidth - margin.left - margin.right);
  const innerHeight = height - margin.top - margin.bottom;

  // D3 Scales calculation
  const { xScale, xSubScale, yScale, maxValue } = useMemo(() => {
    const keys = groupedChartData.map((d) => d.key);
    
    const x = d3.scaleBand<string>()
      .domain(keys)
      .range([0, innerWidth])
      .paddingInner(0.25)
      .paddingOuter(0.1);

    const seriesKeys = ['observed', 'raw', 'ai'];
    const xSub = d3.scaleBand<string>()
      .domain(seriesKeys)
      .range([0, x.bandwidth()])
      .padding(0.08);

    const maxVal = d3.max(groupedChartData, (d) => {
      const v1 = metricMode === 'total' ? d.observedTotal : d.observedAvg;
      const v2 = metricMode === 'total' ? d.rawTotal : d.rawAvg;
      const v3 = metricMode === 'total' ? d.aiTotal : d.aiAvg;
      return Math.max(v1, v2, v3);
    }) || 100;

    const y = d3.scaleLinear()
      .domain([0, maxVal * 1.15])
      .nice()
      .range([innerHeight, 0]);

    return { xScale: x, xSubScale: xSub, yScale: y, maxValue: maxVal };
  }, [groupedChartData, innerWidth, innerHeight, metricMode]);

  // Generate Y-Axis Ticks
  const yTicks = useMemo(() => {
    return yScale.ticks(5);
  }, [yScale]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-5 h-full flex flex-col" id="forecast-skill-card">
      {/* Card Header & Seasonal Context */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/80 shadow-2xs">
            <Award className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Forecast Skill & Rainfall Volume Comparison
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-blue-100/80 text-blue-800 text-[11px] font-mono font-bold">
                {selectedYear === 0 ? 'All Seasons' : `${selectedYear} Season`}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
              <span>Comparing NWP Raw Forecast vs. AI-Corrected vs. IMD Observed Ground Truth</span>
              <span className="text-slate-300">&bull;</span>
              <span className="font-mono text-slate-600">{selectedStationName}</span>
            </p>
          </div>
        </div>

        {/* Header Controls: Grouping Mode & Metric Toggle */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Metric Mode Toggle (Total mm vs Daily Average mm) */}
          <div className="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setMetricMode('total')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all text-xs ${
                metricMode === 'total'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Total Volume (mm)
            </button>
            <button
              onClick={() => setMetricMode('average')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all text-xs ${
                metricMode === 'average'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily Mean (mm)
            </button>
          </div>

          {/* Grouping Mode Dropdown */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <BarChart2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium text-[11px]">Group:</span>
            <select
              value={groupingMode}
              onChange={(e) => setGroupingMode(e.target.value as GroupingMode)}
              className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer"
            >
              <option value="monthly">By Season Month</option>
              <option value="dekadal">By 10-Day Dekads</option>
              <option value="regime">By Intensity Regime</option>
            </select>
          </div>
        </div>
      </div>

      {/* Top Key Seasonal Skill Highlights Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Skill Improvement % */}
        <div className="bg-emerald-50/70 rounded-xl border border-emerald-200/80 p-3 space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              AI Error Reduction
            </span>
            <span className="px-1.5 py-0.2 rounded bg-emerald-200/70 text-emerald-900 font-mono text-[10px] font-bold">
              +{seasonalStats.skillGainPct}%
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-emerald-950 font-mono">
              {seasonalStats.aiMae} <span className="text-xs font-normal text-emerald-700">mm MAE</span>
            </span>
            <span className="text-xs text-slate-400 line-through font-mono">
              {seasonalStats.rawMae} mm
            </span>
          </div>
          <p className="text-[10px] text-emerald-700/90 font-medium">
            AI post-processor improved skill accuracy over raw NWP
          </p>
        </div>

        {/* 2. Observed Ground Truth Total */}
        <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-3 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-700 font-semibold">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              IMD Observed Total
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {seasonalStats.totalObs} <span className="text-xs font-normal text-slate-500">mm</span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">
            Verified ground truth rainfall sum
          </p>
        </div>

        {/* 3. Raw NWP Forecast Total & Bias */}
        <div className="bg-rose-50/50 rounded-xl border border-rose-200/70 p-3 space-y-1">
          <div className="flex items-center justify-between text-xs text-rose-800 font-semibold">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
              Raw NWP Forecast
            </span>
            <span className={`text-[10px] font-mono font-bold px-1 rounded ${
              seasonalStats.rawBias > 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {seasonalStats.rawBias > 0 ? `+${seasonalStats.rawBias}% Bias` : `${seasonalStats.rawBias}% Bias`}
            </span>
          </div>
          <div className="text-xl font-black text-rose-950 font-mono">
            {seasonalStats.totalRaw} <span className="text-xs font-normal text-rose-700">mm</span>
          </div>
          <p className="text-[10px] text-rose-700/80 font-medium">
            Uncorrected physics model output
          </p>
        </div>

        {/* 4. AI-Corrected Forecast Total & Calibrated Bias */}
        <div className="bg-blue-50/60 rounded-xl border border-blue-200/80 p-3 space-y-1">
          <div className="flex items-center justify-between text-xs text-blue-900 font-semibold">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              AI Calibrated Forecast
            </span>
            <span className="text-[10px] font-mono font-bold px-1 rounded bg-blue-100 text-blue-800">
              {seasonalStats.aiBias > 0 ? `+${seasonalStats.aiBias}% Bias` : `${seasonalStats.aiBias}% Bias`}
            </span>
          </div>
          <div className="text-xl font-black text-blue-950 font-mono">
            {seasonalStats.totalAi} <span className="text-xs font-normal text-blue-700">mm</span>
          </div>
          <p className="text-[10px] text-blue-700/80 font-medium">
            Regime-aware post-processed output
          </p>
        </div>
      </div>

      {/* D3 BAR CHART CANVAS */}
      <div className="relative w-full overflow-hidden" ref={containerRef}>
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
          <span className="flex items-center gap-1.5">
            <Target className="w-4 h-4 text-blue-600" />
            Seasonal Distribution Comparison ({metricMode === 'total' ? 'Total Volume in mm' : 'Daily Mean Rainfall in mm/day'})
          </span>
          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block"></span>
              <span className="text-slate-700">IMD Observed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-rose-500 inline-block"></span>
              <span className="text-slate-700">Raw NWP Model</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block"></span>
              <span className="text-slate-800 font-bold">AI-Corrected</span>
            </div>
          </div>
        </div>

        <svg
          ref={svgRef}
          width={chartWidth}
          height={height}
          className="overflow-visible select-none"
        >
          <g transform={`translate(${margin.left},${margin.top})`}>
            {/* Horizontal Gridlines */}
            {yTicks.map((tick, i) => (
              <g key={`y-grid-${i}`} transform={`translate(0, ${yScale(tick)})`}>
                <line
                  x1={0}
                  x2={innerWidth}
                  y1={0}
                  y2={0}
                  stroke="#f1f5f9"
                  strokeDasharray="3 3"
                />
                <text
                  x={-8}
                  y={4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  {tick}
                </text>
              </g>
            ))}

            {/* Render Grouped D3 Bars */}
            {groupedChartData.map((d) => {
              const groupX = xScale(d.key) ?? 0;
              const bw = xScale.bandwidth();

              const obsVal = metricMode === 'total' ? d.observedTotal : d.observedAvg;
              const rawVal = metricMode === 'total' ? d.rawTotal : d.rawAvg;
              const aiVal = metricMode === 'total' ? d.aiTotal : d.aiAvg;

              const barW = xSubScale.bandwidth();

              const obsX = groupX + (xSubScale('observed') ?? 0);
              const rawX = groupX + (xSubScale('raw') ?? 0);
              const aiX = groupX + (xSubScale('ai') ?? 0);

              const obsY = yScale(obsVal);
              const rawY = yScale(rawVal);
              const aiY = yScale(aiVal);

              const obsH = innerHeight - obsY;
              const rawH = innerHeight - rawY;
              const aiH = innerHeight - aiY;

              const isHovered = activeHoverBar?.key === d.key;

              return (
                <g
                  key={`group-bar-${d.key}`}
                  className="cursor-pointer transition-opacity duration-200"
                  onMouseEnter={(e) => {
                    setActiveHoverBar(d);
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                      setTooltipPos({
                        x: e.clientX - rect.left,
                        y: Math.min(e.clientY - rect.top, height - 100),
                      });
                    }
                  }}
                  onMouseMove={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                      setTooltipPos({
                        x: e.clientX - rect.left,
                        y: Math.min(e.clientY - rect.top, height - 100),
                      });
                    }
                  }}
                  onMouseLeave={() => {
                    setActiveHoverBar(null);
                    setTooltipPos(null);
                  }}
                >
                  {/* Group background highlight on hover */}
                  {isHovered && (
                    <rect
                      x={groupX - 4}
                      y={0}
                      width={bw + 8}
                      height={innerHeight}
                      fill="#f8fafc"
                      rx={6}
                    />
                  )}

                  {/* 1. Observed Bar (Emerald) */}
                  <rect
                    x={obsX}
                    y={obsY}
                    width={barW}
                    height={Math.max(2, obsH)}
                    fill="#10b981"
                    rx={3}
                    className="transition-all duration-300 hover:brightness-110"
                  />

                  {/* 2. Raw Forecast Bar (Rose) */}
                  <rect
                    x={rawX}
                    y={rawY}
                    width={barW}
                    height={Math.max(2, rawH)}
                    fill="#f43f5e"
                    rx={3}
                    className="transition-all duration-300 hover:brightness-110"
                  />

                  {/* 3. AI-Corrected Bar (Blue/Cyan) */}
                  <rect
                    x={aiX}
                    y={aiY}
                    width={barW}
                    height={Math.max(2, aiH)}
                    fill="#2563eb"
                    rx={3}
                    className="transition-all duration-300 hover:brightness-110"
                  />

                  {/* Skill Badge above AI bar if improvement exists */}
                  {d.skillScorePct > 0 && (
                    <g transform={`translate(${aiX + barW / 2}, ${Math.min(obsY, aiY) - 10})`}>
                      <rect
                        x={-14}
                        y={-10}
                        width={28}
                        height={14}
                        fill="#dcfce7"
                        stroke="#86efac"
                        rx={4}
                      />
                      <text
                        x={0}
                        y={0}
                        textAnchor="middle"
                        className="fill-emerald-800 text-[9px] font-mono font-bold"
                      >
                        +{d.skillScorePct}%
                      </text>
                    </g>
                  )}

                  {/* X-Axis Label */}
                  <text
                    x={groupX + bw / 2}
                    y={innerHeight + 18}
                    textAnchor="middle"
                    className="fill-slate-800 text-[11px] font-semibold"
                  >
                    {d.label}
                  </text>
                  {d.sublabel && (
                    <text
                      x={groupX + bw / 2}
                      y={innerHeight + 30}
                      textAnchor="middle"
                      className="fill-slate-400 text-[9px] font-mono"
                    >
                      {d.sublabel}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Baseline Axis Line */}
            <line
              x1={0}
              x2={innerWidth}
              y1={innerHeight}
              y2={innerHeight}
              stroke="#cbd5e1"
              strokeWidth={1.5}
            />
          </g>
        </svg>

        {/* Hover Tooltip Overlay */}
        {activeHoverBar && tooltipPos && (
          <div
            className="absolute z-30 pointer-events-none bg-slate-950 text-white rounded-xl p-3 shadow-xl border border-slate-800 text-xs space-y-2 w-64 transform -translate-x-1/2"
            style={{
              left: Math.max(130, Math.min(chartWidth - 130, tooltipPos.x)),
              top: Math.max(10, tooltipPos.y - 120),
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-slate-100 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
                {activeHoverBar.label} ({activeHoverBar.sublabel})
              </span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                +{activeHoverBar.skillScorePct}% Skill Gain
              </span>
            </div>

            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex justify-between items-center text-emerald-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  IMD Observed:
                </span>
                <span className="font-bold">
                  {metricMode === 'total' ? `${activeHoverBar.observedTotal} mm` : `${activeHoverBar.observedAvg} mm/day`}
                </span>
              </div>

              <div className="flex justify-between items-center text-rose-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Raw NWP Forecast:
                </span>
                <span className="font-bold">
                  {metricMode === 'total' ? `${activeHoverBar.rawTotal} mm` : `${activeHoverBar.rawAvg} mm/day`}
                </span>
              </div>

              <div className="flex justify-between items-center text-blue-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  AI-Corrected:
                </span>
                <span className="font-bold">
                  {metricMode === 'total' ? `${activeHoverBar.aiTotal} mm` : `${activeHoverBar.aiAvg} mm/day`}
                </span>
              </div>
            </div>

            <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span>Raw MAE: <strong className="text-rose-300">{activeHoverBar.rawError} mm</strong></span>
              <span>AI MAE: <strong className="text-emerald-300">{activeHoverBar.aiError} mm</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Analytical Takeaway Footer */}
      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>D3 Skill Diagnostics</strong>: AI Post-Processing systematically compensates for NWP model physics spin-up errors and wet-bias overestimation across all monsoon phases.
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
          <span>Sample size: {data.length} days</span>
        </div>
      </div>
    </div>
  );
};
