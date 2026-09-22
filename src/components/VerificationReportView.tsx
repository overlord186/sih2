import React, { useState, useMemo } from 'react';
import { RainfallDataPoint, ModelVerificationComparison } from '../types';
import { calculateComprehensiveVerificationReport, calculateMetrics, calculateTaylorStatistics } from '../ml/postProcessor';
import { RoebberPerformanceDiagram } from './RoebberPerformanceDiagram';
import { TaylorDiagram } from './TaylorDiagram';
import {
  ShieldCheck,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertTriangle,
  Layers,
  BarChart2,
  Table,
  Sliders,
  HelpCircle,
  FileCheck,
  Flame,
  Zap,
  Compass,
  PieChart,
} from 'lucide-react';
import { motion } from 'motion/react';

interface VerificationReportViewProps {
  dataset: RainfallDataPoint[];
}

export const VerificationReportView: React.FC<VerificationReportViewProps> = ({ dataset }) => {
  const [selectedThresholdMm, setSelectedThresholdMm] = useState<number>(64.5);
  const [diagramMode, setDiagramMode] = useState<'both' | 'roebber' | 'taylor'>('both');

  // Calculate verification report across all 5 IMD operational thresholds
  const verificationReport = useMemo(() => {
    return calculateComprehensiveVerificationReport(dataset);
  }, [dataset]);

  const globalMetrics = useMemo(() => {
    return calculateMetrics(dataset);
  }, [dataset]);

  const taylorStats = useMemo(() => {
    return calculateTaylorStatistics(dataset);
  }, [dataset]);

  // Active selected threshold comparison item
  const activeComparisonIndex = useMemo(() => {
    const idx = verificationReport.findIndex((v) => v.thresholdMm === selectedThresholdMm);
    return idx >= 0 ? idx : 2;
  }, [verificationReport, selectedThresholdMm]);

  const activeComparison = verificationReport[activeComparisonIndex] || verificationReport[2];

  // Skill Score Glossary details
  const metricGlossary = [
    {
      abbr: 'ETS',
      fullName: 'Equitable Threat Score (Gilbert Skill Score)',
      perfectScore: '1.0 (Random = 0, Negative = Worse than random)',
      desc: 'Measures the fraction of observed and/or forecasted events that were correctly predicted, adjusted for hits associated purely with random chance. Essential for evaluating extreme convective events.',
    },
    {
      abbr: 'CSI',
      fullName: 'Critical Success Index (Threat Score)',
      perfectScore: '1.0 (Worst = 0)',
      desc: 'Hits divided by total number of events (Hits + Misses + False Alarms). Direct measure of accuracy when non-events (dry days) dominate the dataset.',
    },
    {
      abbr: 'POD',
      fullName: 'Probability of Detection (Hit Rate)',
      perfectScore: '1.0 (Worst = 0)',
      desc: 'Fraction of actual observed events that were correctly forecasted by the model (Hits / (Hits + Misses)).',
    },
    {
      abbr: 'FAR',
      fullName: 'False Alarm Ratio',
      perfectScore: '0.0 (Worst = 1.0)',
      desc: 'Fraction of forecasted events that failed to materialize (False Alarms / (Hits + False Alarms)). Lower is better.',
    },
    {
      abbr: 'FSS',
      fullName: 'Fractions Skill Score',
      perfectScore: '1.0 (Worst = 0)',
      desc: 'Evaluates spatial neighborhood forecast accuracy, rewarding models that predict rainfall close to the true location even if slightly displaced.',
    },
    {
      abbr: 'RMSE',
      fullName: 'Root Mean Square Error',
      perfectScore: '0.0 mm (Lower is better)',
      desc: 'Penalizes large outlier forecast errors heavily, crucial for flood warnings where severe underprediction causes catastrophe.',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
                Module 4: Verification & Skill Score Report
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-semibold">
                WMO & IMD Standard Metrics
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Rigorous Forecast Verification & Skill Evaluation
            </h2>
            <p className="text-slate-300 text-sm mt-2 max-w-3xl leading-relaxed">
              Comprehensive statistical validation benchmark comparing <strong>Raw NWP</strong>, <strong>Linear Bias Correction Baseline</strong>,
              and <strong>SAMVARTAKA AI Regime-Aware Model</strong> using official categorical contingency scores (ETS, CSI, POD, FAR, FSS)
              and continuous error statistics (RMSE, MAE, Pearson R) across {dataset.length.toLocaleString()} verified monsoonal observations.
            </p>
          </div>

          {/* Key Skill Highlights */}
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <div className="bg-slate-800/90 border border-emerald-500/30 rounded-xl p-3 text-left shadow-sm min-w-[130px]">
              <div className="text-[11px] text-emerald-400 font-semibold uppercase">Heavy Rain ETS</div>
              <div className="text-xl font-bold text-white font-mono mt-0.5">
                {globalMetrics.etsCorrected}{' '}
                <span className="text-xs text-emerald-400 font-normal">
                  (+{Math.round(((globalMetrics.etsCorrected - globalMetrics.etsRaw) / Math.max(0.01, globalMetrics.etsRaw)) * 100)}%)
                </span>
              </div>
            </div>

            <div className="bg-slate-800/90 border border-blue-500/30 rounded-xl p-3 text-left shadow-sm min-w-[130px]">
              <div className="text-[11px] text-blue-400 font-semibold uppercase">RMSE Error</div>
              <div className="text-xl font-bold text-white font-mono mt-0.5">
                {globalMetrics.rmseCorrected} mm{' '}
                <span className="text-xs text-emerald-400 font-normal">
                  (-{Math.round(((globalMetrics.rmseRaw - globalMetrics.rmseCorrected) / globalMetrics.rmseRaw) * 100)}%)
                </span>
              </div>
            </div>

            <div className="bg-slate-800/90 border border-amber-500/30 rounded-xl p-3 text-left shadow-sm min-w-[130px]">
              <div className="text-[11px] text-amber-400 font-semibold uppercase">False Alarms (FAR)</div>
              <div className="text-xl font-bold text-white font-mono mt-0.5">
                {globalMetrics.farCorrected}{' '}
                <span className="text-xs text-emerald-400 font-normal">
                  (-{Math.round(((globalMetrics.farRaw - globalMetrics.farCorrected) / Math.max(0.01, globalMetrics.farRaw)) * 100)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Threshold Selector Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto gap-1">
        {verificationReport.map((v) => (
          <button
            key={v.thresholdMm}
            onClick={() => setSelectedThresholdMm(v.thresholdMm)}
            className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center ${
              selectedThresholdMm === v.thresholdMm
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <div className="truncate">{v.thresholdLabel}</div>
            <div className={`text-[10px] font-mono mt-0.5 ${selectedThresholdMm === v.thresholdMm ? 'text-emerald-100' : 'text-slate-400'}`}>
              ETS Gain: +{v.improvementETS}%
            </div>
          </button>
        ))}
      </div>

      {/* Comparative Score Cards for Active Threshold */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Model 1: Raw NWP Output */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                Raw Baseline
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">Raw NWP Forecast</h3>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono">
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-[10px] text-slate-500 uppercase font-sans font-semibold">ETS Score</div>
              <div className="text-lg font-bold text-slate-800">{activeComparison.rawNwp.ets}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-[10px] text-slate-500 uppercase font-sans font-semibold">CSI Score</div>
              <div className="text-lg font-bold text-slate-800">{activeComparison.rawNwp.csi}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-[10px] text-slate-500 uppercase font-sans font-semibold">POD (Hit Rate)</div>
              <div className="text-lg font-bold text-slate-800">{activeComparison.rawNwp.pod}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-[10px] text-slate-500 uppercase font-sans font-semibold">FAR (False Alarm)</div>
              <div className="text-lg font-bold text-slate-800">{activeComparison.rawNwp.far}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-[10px] text-slate-500 uppercase font-sans font-semibold">FSS Score</div>
              <div className="text-lg font-bold text-slate-800">{activeComparison.rawNwp.fss}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-[10px] text-slate-500 uppercase font-sans font-semibold">RMSE Error</div>
              <div className="text-lg font-bold text-slate-800">{activeComparison.rawNwp.rmse} mm</div>
            </div>
          </div>
        </div>

        {/* Model 2: Global Linear Correction */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[10px] font-bold uppercase">
                Linear Calibration
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">Global Linear Baseline</h3>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono">
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-[10px] text-slate-500 uppercase font-sans font-semibold">ETS Score</div>
              <div className="text-lg font-bold text-slate-800">{activeComparison.linearBaseline.ets}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-[10px] text-slate-500 uppercase font-sans font-semibold">CSI Score</div>
              <div className="text-lg font-bold text-slate-800">{activeComparison.linearBaseline.csi}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-[10px] text-slate-500 uppercase font-sans font-semibold">POD (Hit Rate)</div>
              <div className="text-lg font-bold text-slate-800">{activeComparison.linearBaseline.pod}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-[10px] text-slate-500 uppercase font-sans font-semibold">FAR (False Alarm)</div>
              <div className="text-lg font-bold text-slate-800">{activeComparison.linearBaseline.far}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-[10px] text-slate-500 uppercase font-sans font-semibold">FSS Score</div>
              <div className="text-lg font-bold text-slate-800">{activeComparison.linearBaseline.fss}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <div className="text-[10px] text-slate-500 uppercase font-sans font-semibold">RMSE Error</div>
              <div className="text-lg font-bold text-slate-800">{activeComparison.linearBaseline.rmse} mm</div>
            </div>
          </div>
        </div>

        {/* Model 3: SAMVARTAKA AI Regime-Aware Post-Processor */}
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white rounded-2xl p-5 border-2 border-emerald-400 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-200/80 pb-3">
            <div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider">
                SAMVARTAKA AI System
              </span>
              <h3 className="text-base font-bold text-emerald-950 mt-1 flex items-center gap-1.5">
                Regime-Aware Post-Processor
                <Award className="w-4 h-4 text-emerald-600" />
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono">
            <div className="p-3 bg-white/90 border border-emerald-200 rounded-xl shadow-xs">
              <div className="text-[10px] text-emerald-800 uppercase font-sans font-bold flex justify-between">
                <span>ETS Score</span>
                <span className="text-emerald-600">+{activeComparison.improvementETS}%</span>
              </div>
              <div className="text-xl font-black text-emerald-700">{activeComparison.aiCorrected.ets}</div>
            </div>
            <div className="p-3 bg-white/90 border border-emerald-200 rounded-xl shadow-xs">
              <div className="text-[10px] text-emerald-800 uppercase font-sans font-bold flex justify-between">
                <span>CSI Score</span>
                <span className="text-emerald-600">+{activeComparison.improvementCSI}%</span>
              </div>
              <div className="text-xl font-black text-emerald-700">{activeComparison.aiCorrected.csi}</div>
            </div>
            <div className="p-3 bg-white/90 border border-emerald-200 rounded-xl shadow-xs">
              <div className="text-[10px] text-emerald-800 uppercase font-sans font-bold">POD (Hit Rate)</div>
              <div className="text-xl font-black text-emerald-700">{activeComparison.aiCorrected.pod}</div>
            </div>
            <div className="p-3 bg-white/90 border border-emerald-200 rounded-xl shadow-xs">
              <div className="text-[10px] text-emerald-800 uppercase font-sans font-bold flex justify-between">
                <span>FAR (False Alarm)</span>
                <span className="text-emerald-600">-{activeComparison.reductionFAR}%</span>
              </div>
              <div className="text-xl font-black text-emerald-700">{activeComparison.aiCorrected.far}</div>
            </div>
            <div className="p-3 bg-white/90 border border-emerald-200 rounded-xl shadow-xs">
              <div className="text-[10px] text-emerald-800 uppercase font-sans font-bold">FSS Score</div>
              <div className="text-xl font-black text-emerald-700">{activeComparison.aiCorrected.fss}</div>
            </div>
            <div className="p-3 bg-white/90 border border-emerald-200 rounded-xl shadow-xs">
              <div className="text-[10px] text-emerald-800 uppercase font-sans font-bold flex justify-between">
                <span>RMSE Error</span>
                <span className="text-emerald-600">-{activeComparison.improvementRMSE}%</span>
              </div>
              <div className="text-xl font-black text-emerald-700">{activeComparison.aiCorrected.rmse} mm</div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Graphical Verification Diagrams (Roebber Performance & Taylor Diagrams) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Meteorological Performance & Statistical Geometry Diagrams</h3>
              <p className="text-xs text-slate-400">
                Official WMO diagnostic plots confirming bias elimination, hit rate enhancement, and error field correlation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setDiagramMode('both')}
              className={`px-3 py-1 rounded font-semibold transition-colors cursor-pointer ${
                diagramMode === 'both' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Both Plots
            </button>
            <button
              onClick={() => setDiagramMode('roebber')}
              className={`px-3 py-1 rounded font-semibold transition-colors cursor-pointer ${
                diagramMode === 'roebber' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Roebber Plot
            </button>
            <button
              onClick={() => setDiagramMode('taylor')}
              className={`px-3 py-1 rounded font-semibold transition-colors cursor-pointer ${
                diagramMode === 'taylor' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Taylor Diagram
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {(diagramMode === 'both' || diagramMode === 'roebber') && (
            <RoebberPerformanceDiagram
              comparisons={verificationReport}
              selectedThresholdIndex={activeComparisonIndex}
            />
          )}
          {(diagramMode === 'both' || diagramMode === 'taylor') && (
            <TaylorDiagram stats={taylorStats} />
          )}
        </div>
      </div>

      {/* Contingency 2x2 Table Comparison */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              2x2 Contingency Matrix Comparison ({activeComparison.thresholdLabel})
            </h3>
            <p className="text-xs text-slate-500">
              Hits (A), Misses (C), False Alarms (B), and Correct Negatives (D)
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-600">
            Total Samples: {activeComparison.aiCorrected.totalSamples}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Raw NWP Table */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 text-sm mb-3">Raw NWP Contingency Table</h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-3 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-200">
                <div className="text-[10px] font-sans text-emerald-700 font-bold">Hits (True Positives)</div>
                <div className="text-lg font-bold">{activeComparison.rawNwp.hits}</div>
              </div>
              <div className="p-3 bg-amber-50 text-amber-900 rounded-lg border border-amber-200">
                <div className="text-[10px] font-sans text-amber-700 font-bold">False Alarms (Type I)</div>
                <div className="text-lg font-bold">{activeComparison.rawNwp.falseAlarms}</div>
              </div>
              <div className="p-3 bg-rose-50 text-rose-900 rounded-lg border border-rose-200">
                <div className="text-[10px] font-sans text-rose-700 font-bold">Misses (Type II)</div>
                <div className="text-lg font-bold">{activeComparison.rawNwp.misses}</div>
              </div>
              <div className="p-3 bg-slate-100 text-slate-800 rounded-lg border border-slate-200">
                <div className="text-[10px] font-sans text-slate-600 font-bold">Correct Negatives</div>
                <div className="text-lg font-bold">{activeComparison.rawNwp.correctNegatives}</div>
              </div>
            </div>
          </div>

          {/* AI Corrected Table */}
          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200">
            <h4 className="font-bold text-emerald-950 text-sm mb-3">SAMVARTAKA AI Corrected Table</h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-3 bg-emerald-100/80 text-emerald-950 rounded-lg border border-emerald-300">
                <div className="text-[10px] font-sans text-emerald-800 font-bold">Hits (True Positives)</div>
                <div className="text-lg font-black text-emerald-700">
                  {activeComparison.aiCorrected.hits} (+{activeComparison.aiCorrected.hits - activeComparison.rawNwp.hits})
                </div>
              </div>
              <div className="p-3 bg-amber-100/60 text-amber-950 rounded-lg border border-amber-300">
                <div className="text-[10px] font-sans text-amber-800 font-bold">False Alarms (Type I)</div>
                <div className="text-lg font-bold text-amber-900">
                  {activeComparison.aiCorrected.falseAlarms} ({activeComparison.aiCorrected.falseAlarms - activeComparison.rawNwp.falseAlarms})
                </div>
              </div>
              <div className="p-3 bg-rose-100/60 text-rose-950 rounded-lg border border-rose-300">
                <div className="text-[10px] font-sans text-rose-800 font-bold">Misses (Type II)</div>
                <div className="text-lg font-bold text-rose-900">
                  {activeComparison.aiCorrected.misses} ({activeComparison.aiCorrected.misses - activeComparison.rawNwp.misses})
                </div>
              </div>
              <div className="p-3 bg-slate-100 text-slate-800 rounded-lg border border-slate-200">
                <div className="text-[10px] font-sans text-slate-600 font-bold">Correct Negatives</div>
                <div className="text-lg font-bold">{activeComparison.aiCorrected.correctNegatives}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Full Thresholds Summary Matrix */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-900 text-sm">
            All-Threshold Verification Master Summary Table
          </h3>
          <p className="text-xs text-slate-500">
            Benchmarking raw NWP vs AI corrected post-processor across all 5 operational rainfall brackets
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-100 text-slate-600 font-sans font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Threshold</th>
                <th className="py-3 px-3">IMD Category</th>
                <th className="py-3 px-3 text-center">ETS (Raw → AI)</th>
                <th className="py-3 px-3 text-center">CSI (Raw → AI)</th>
                <th className="py-3 px-3 text-center">POD (Raw → AI)</th>
                <th className="py-3 px-3 text-center">FAR (Raw → AI)</th>
                <th className="py-3 px-3 text-center">RMSE (Raw → AI)</th>
                <th className="py-3 px-4 text-center">ETS Improvement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {verificationReport.map((row) => (
                <tr key={row.thresholdMm} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-sans font-bold text-slate-900">
                    {row.thresholdLabel}
                  </td>
                  <td className="py-3 px-3 font-sans text-slate-600">
                    {row.imdCategory}
                  </td>
                  <td className="py-3 px-3 text-center font-bold">
                    <span className="text-slate-400">{row.rawNwp.ets}</span> → <span className="text-emerald-700">{row.aiCorrected.ets}</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-slate-400">{row.rawNwp.csi}</span> → <span className="text-emerald-700">{row.aiCorrected.csi}</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-slate-400">{row.rawNwp.pod}</span> → <span className="text-emerald-700">{row.aiCorrected.pod}</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-slate-400">{row.rawNwp.far}</span> → <span className="text-emerald-700">{row.aiCorrected.far}</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-slate-400">{row.rawNwp.rmse}</span> → <span className="text-emerald-700">{row.aiCorrected.rmse} mm</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold font-sans">
                      +{row.improvementETS}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metric Explainer Glossary */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-white">Meteorological Metric Standards Glossary</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metricGlossary.map((m) => (
            <div key={m.abbr} className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 text-sm">{m.abbr}</span>
                <span className="text-[10px] text-slate-400 font-mono">{m.perfectScore}</span>
              </div>
              <div className="text-xs font-semibold text-slate-200">{m.fullName}</div>
              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
