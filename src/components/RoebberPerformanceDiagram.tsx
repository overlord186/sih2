import React, { useMemo, useState } from 'react';
import { ModelVerificationComparison } from '../types';

interface RoebberPerformanceDiagramProps {
  comparisons: ModelVerificationComparison[];
  selectedThresholdIndex: number;
}

export const RoebberPerformanceDiagram: React.FC<RoebberPerformanceDiagramProps> = ({
  comparisons,
  selectedThresholdIndex,
}) => {
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const current = comparisons[selectedThresholdIndex] || comparisons[0];

  // Performance coordinates:
  // X = Success Ratio = 1 - FAR
  // Y = Probability of Detection = POD
  // Bias lines: Y = Bias * X => Bias = POD / (1 - FAR) = Y / X
  // CSI lines: CSI = (1/POD + 1/SR - 1)^-1 => Y = (1/CSI + 1 - 1/X)^-1

  const width = 480;
  const height = 420;
  const padLeft = 55;
  const padBottom = 55;
  const padTop = 30;
  const padRight = 35;

  const plotW = width - padLeft - padRight;
  const plotH = height - padBottom - padTop;

  const toX = (sr: number) => padLeft + Math.max(0, Math.min(1, sr)) * plotW;
  const toY = (pod: number) => height - padBottom - Math.max(0, Math.min(1, pod)) * plotH;

  // Generate CSI contours
  const csiValues = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
  const csiCurves = useMemo(() => {
    return csiValues.map((csi) => {
      const points: string[] = [];
      const steps = 40;
      for (let i = 0; i <= steps; i++) {
        const sr = csi + (1 - csi) * (i / steps);
        if (sr <= 0) continue;
        const denom = 1 / csi + 1 - 1 / sr;
        if (denom > 0) {
          const pod = 1 / denom;
          if (pod >= 0 && pod <= 1) {
            points.push(`${toX(sr)},${toY(pod)}`);
          }
        }
      }
      return { csi, d: points.length > 1 ? `M ${points.join(' L ')}` : '' };
    });
  }, [plotW, plotH]);

  // Generate Bias lines (from origin 0,0 to edges)
  const biasValues = [0.25, 0.5, 0.75, 1.0, 1.33, 2.0, 4.0];
  const biasLines = useMemo(() => {
    return biasValues.map((bias) => {
      let endSr = 1;
      let endPod = bias * endSr;
      if (endPod > 1) {
        endPod = 1;
        endSr = endPod / bias;
      }
      return {
        bias,
        x1: toX(0),
        y1: toY(0),
        x2: toX(endSr),
        y2: toY(endPod),
      };
    });
  }, [plotW, plotH]);

  const rawSR = Math.max(0, 1 - current.rawNwp.far);
  const rawPOD = current.rawNwp.pod;

  const baseSR = Math.max(0, 1 - current.linearBaseline.far);
  const basePOD = current.linearBaseline.pod;

  const aiSR = Math.max(0, 1 - current.aiCorrected.far);
  const aiPOD = current.aiCorrected.pod;

  const rawPt = { x: toX(rawSR), y: toY(rawPOD) };
  const basePt = { x: toX(baseSR), y: toY(basePOD) };
  const aiPt = { x: toX(aiSR), y: toY(aiPOD) };

  // Collision detection between Raw and Linear MOS
  const isClose = Math.abs(rawPt.x - basePt.x) < 70 && Math.abs(rawPt.y - basePt.y) < 45;

  const labelLayouts = useMemo(() => {
    let rawX = rawPt.x + 18;
    let rawY = rawPt.y - 18;
    let rawAnchor = 'start';
    let rawLeader = `M ${rawPt.x} ${rawPt.y} L ${rawX - 4} ${rawY}`;

    let baseX = basePt.x - 18;
    let baseY = basePt.y - 20;
    let baseAnchor = 'end';
    let baseLeader = `M ${basePt.x} ${basePt.y} L ${baseX + 4} ${baseY}`;

    if (isClose) {
      rawX = rawPt.x + 22;
      rawY = rawPt.y - 26;
      rawAnchor = 'start';
      rawLeader = `M ${rawPt.x} ${rawPt.y} L ${rawPt.x + 12} ${rawPt.y - 18} L ${rawX - 4} ${rawY}`;

      baseX = basePt.x - 22;
      baseY = basePt.y + 24;
      baseAnchor = 'end';
      baseLeader = `M ${basePt.x} ${basePt.y} L ${basePt.x - 12} ${basePt.y + 16} L ${baseX + 4} ${baseY}`;
    }

    let aiX = aiPt.x + 20;
    let aiY = aiPt.y - 16;
    let aiAnchor = 'start';
    if (aiX > width - 130) {
      aiX = aiPt.x - 20;
      aiAnchor = 'end';
    }
    const aiLeader = `M ${aiPt.x} ${aiPt.y} L ${aiAnchor === 'start' ? aiX - 4 : aiX + 4} ${aiY}`;

    return {
      raw: { x: rawX, y: rawY, anchor: rawAnchor, leader: rawLeader },
      base: { x: baseX, y: baseY, anchor: baseAnchor, leader: baseLeader },
      ai: { x: aiX, y: aiY, anchor: aiAnchor, leader: aiLeader },
    };
  }, [rawPt, basePt, aiPt, isClose, width]);

  const activeFocus = hoveredModel || selectedModel;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col items-center select-none">
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Roebber Performance Diagram</span>
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
              {current.thresholdLabel} ({current.imdCategory})
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
            Integrates POD, Success Ratio (1 - FAR), CSI curves, and Frequency Bias lines. The <strong className="text-emerald-400 font-semibold">upper-right corner (1.0, 1.0)</strong> represents perfect forecast skill.
          </p>
        </div>

        {/* Interactive Filter */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setSelectedModel(null)}
            className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
              selectedModel === null ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Models
          </button>
          <button
            onClick={() => setSelectedModel(selectedModel === 'ai' ? null : 'ai')}
            className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
              selectedModel === 'ai' ? 'bg-blue-600 text-white shadow-xs' : 'text-blue-400 hover:text-blue-300'
            }`}
          >
            AI Model
          </button>
          <button
            onClick={() => setSelectedModel(selectedModel === 'raw' ? null : 'raw')}
            className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
              selectedModel === 'raw' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-400 hover:text-rose-300'
            }`}
          >
            Raw NWP
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full max-w-[490px] overflow-hidden flex justify-center bg-slate-950/60 rounded-xl border border-slate-800/80 p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Background Grid */}
          <rect
            x={padLeft}
            y={padTop}
            width={plotW}
            height={plotH}
            fill="#090e1f"
            rx={6}
            stroke="#1e293b"
            strokeWidth="1.5"
          />

          {/* CSI Contours */}
          {csiCurves.map(({ csi, d }) => (
            d && (
              <g key={`csi-${csi}`}>
                <path d={d} fill="none" stroke="#334155" strokeWidth="1.2" strokeDasharray="3,3" />
                <text
                  x={toX(Math.min(0.92, csi + 0.14))}
                  y={toY(Math.min(0.92, csi + 0.14)) - 4}
                  fill="#64748b"
                  fontSize="8.5"
                  fontFamily="monospace"
                >
                  CSI={csi}
                </text>
              </g>
            )
          ))}

          {/* Bias Lines */}
          {biasLines.map(({ bias, x1, y1, x2, y2 }) => (
            <g key={`bias-${bias}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={bias === 1.0 ? '#38bdf8' : '#1e293b'}
                strokeWidth={bias === 1.0 ? '1.5' : '0.8'}
                strokeDasharray={bias === 1.0 ? 'none' : '4,4'}
                opacity={bias === 1.0 ? 0.8 : 0.4}
              />
              <text
                x={x2 - (bias > 1 ? 14 : -4)}
                y={y2 + (bias > 1 ? -4 : 10)}
                fill={bias === 1.0 ? '#38bdf8' : '#64748b'}
                fontSize="8"
                fontFamily="monospace"
              >
                B={bias}
              </text>
            </g>
          ))}

          {/* Perfect Forecast Indicator (1, 1) */}
          <circle cx={toX(1)} cy={toY(1)} r={7} fill="#10b981" fillOpacity="0.25" stroke="#10b981" strokeWidth="1.5" />
          <circle cx={toX(1)} cy={toY(1)} r={3} fill="#10b981" />
          <rect
            x={toX(1) - 78}
            y={toY(1) + 8}
            width={74}
            height={16}
            rx={4}
            fill="#064e3b"
            fillOpacity="0.85"
            stroke="#10b981"
            strokeWidth="0.8"
          />
          <text x={toX(1) - 41} y={toY(1) + 19} fill="#ecfdf5" fontSize="8.5" fontWeight="bold" textAnchor="middle">
            ★ Perfect (1,1)
          </text>

          {/* Axes */}
          <line x1={padLeft} y1={height - padBottom} x2={width - padRight} y2={height - padBottom} stroke="#94a3b8" strokeWidth="1.5" />
          <line x1={padLeft} y1={padTop} x2={padLeft} y2={height - padBottom} stroke="#94a3b8" strokeWidth="1.5" />

          {/* Axis Labels & Ticks */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((val) => (
            <g key={`tick-${val}`}>
              {/* X Tick */}
              <line x1={toX(val)} y1={height - padBottom} x2={toX(val)} y2={height - padBottom + 5} stroke="#94a3b8" strokeWidth="1" />
              <text x={toX(val)} y={height - padBottom + 16} fill="#94a3b8" fontSize="9.5" textAnchor="middle" fontFamily="monospace">
                {val.toFixed(1)}
              </text>

              {/* Y Tick */}
              <line x1={padLeft - 5} y1={toY(val)} x2={padLeft} y2={toY(val)} stroke="#94a3b8" strokeWidth="1" />
              <text x={padLeft - 8} y={toY(val) + 3.5} fill="#94a3b8" fontSize="9.5" textAnchor="end" fontFamily="monospace">
                {val.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Axis Titles */}
          <text x={width / 2} y={height - 10} fill="#e2e8f0" fontSize="10.5" fontWeight="bold" textAnchor="middle">
            Success Ratio (1 - FAR) →
          </text>
          <text
            x={-height / 2}
            y={16}
            fill="#e2e8f0"
            fontSize="10.5"
            fontWeight="bold"
            textAnchor="middle"
            transform="rotate(-90)"
          >
            Probability of Detection (POD) →
          </text>

          {/* Model Trajectory Line: Raw -> Linear -> AI */}
          <path
            d={`M ${rawPt.x} ${rawPt.y} L ${basePt.x} ${basePt.y} L ${aiPt.x} ${aiPt.y}`}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2"
            strokeDasharray="4,4"
            opacity="0.85"
          />

          {/* ========================================================================= */}
          {/* 1. RAW NWP POINT & BADGE                                                  */}
          {/* ========================================================================= */}
          <g
            className={`transition-opacity duration-200 cursor-pointer ${
              activeFocus && activeFocus !== 'raw' ? 'opacity-30' : 'opacity-100'
            }`}
            onMouseEnter={() => setHoveredModel('raw')}
            onMouseLeave={() => setHoveredModel(null)}
            onClick={() => setSelectedModel(selectedModel === 'raw' ? null : 'raw')}
          >
            {labelLayouts.raw.leader && (
              <path
                d={labelLayouts.raw.leader}
                fill="none"
                stroke="#ef4444"
                strokeWidth="1.2"
                strokeDasharray="2,2"
                opacity="0.8"
              />
            )}
            <circle cx={rawPt.x} cy={rawPt.y} r={6.5} fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
            <rect
              x={labelLayouts.raw.anchor === 'end' ? labelLayouts.raw.x - 76 : labelLayouts.raw.x - 6}
              y={labelLayouts.raw.y - 12}
              width={82}
              height={18}
              rx={5}
              fill="#1e131d"
              fillOpacity="0.95"
              stroke="#ef4444"
              strokeWidth="1"
            />
            <text
              x={labelLayouts.raw.x}
              y={labelLayouts.raw.y + 1}
              fill="#fca5a5"
              fontSize="9.5"
              fontWeight="bold"
              textAnchor={labelLayouts.raw.anchor as any}
            >
              ● Raw NWP
            </text>
          </g>

          {/* ========================================================================= */}
          {/* 2. LINEAR BASELINE POINT & BADGE                                          */}
          {/* ========================================================================= */}
          <g
            className={`transition-opacity duration-200 cursor-pointer ${
              activeFocus && activeFocus !== 'base' ? 'opacity-30' : 'opacity-100'
            }`}
            onMouseEnter={() => setHoveredModel('base')}
            onMouseLeave={() => setHoveredModel(null)}
            onClick={() => setSelectedModel(selectedModel === 'base' ? null : 'base')}
          >
            {labelLayouts.base.leader && (
              <path
                d={labelLayouts.base.leader}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.2"
                strokeDasharray="2,2"
                opacity="0.8"
              />
            )}
            <circle cx={basePt.x} cy={basePt.y} r={6.5} fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
            <rect
              x={labelLayouts.base.anchor === 'end' ? labelLayouts.base.x - 84 : labelLayouts.base.x - 6}
              y={labelLayouts.base.y - 12}
              width={90}
              height={18}
              rx={5}
              fill="#1f1a14"
              fillOpacity="0.95"
              stroke="#f59e0b"
              strokeWidth="1"
            />
            <text
              x={labelLayouts.base.x}
              y={labelLayouts.base.y + 1}
              fill="#fde68a"
              fontSize="9.5"
              fontWeight="bold"
              textAnchor={labelLayouts.base.anchor as any}
            >
              ● Linear MOS
            </text>
          </g>

          {/* ========================================================================= */}
          {/* 3. SAMVARTAKA AI POINT & GLOWING BADGE                                    */}
          {/* ========================================================================= */}
          <g
            className={`transition-opacity duration-200 cursor-pointer ${
              activeFocus && activeFocus !== 'ai' ? 'opacity-30' : 'opacity-100'
            }`}
            onMouseEnter={() => setHoveredModel('ai')}
            onMouseLeave={() => setHoveredModel(null)}
            onClick={() => setSelectedModel(selectedModel === 'ai' ? null : 'ai')}
          >
            <circle cx={aiPt.x} cy={aiPt.y} r={11} fill="#3b82f6" fillOpacity="0.25" className="animate-ping" />
            {labelLayouts.ai.leader && (
              <path
                d={labelLayouts.ai.leader}
                fill="none"
                stroke="#60a5fa"
                strokeWidth="1.4"
                strokeDasharray="2,2"
                opacity="0.9"
              />
            )}
            <circle cx={aiPt.x} cy={aiPt.y} r={8.5} fill="#2563eb" stroke="#93c5fd" strokeWidth="2.5" />
            <circle cx={aiPt.x} cy={aiPt.y} r={3} fill="#ffffff" />
            <rect
              x={labelLayouts.ai.anchor === 'end' ? labelLayouts.ai.x - 114 : labelLayouts.ai.x - 6}
              y={labelLayouts.ai.y - 12}
              width={120}
              height={18}
              rx={5}
              fill="#0f1f3d"
              fillOpacity="0.95"
              stroke="#60a5fa"
              strokeWidth="1.2"
            />
            <text
              x={labelLayouts.ai.x}
              y={labelLayouts.ai.y + 1}
              fill="#93c5fd"
              fontSize="9.5"
              fontWeight="extrabold"
              textAnchor={labelLayouts.ai.anchor as any}
            >
              ★ SAMVARTAKA AI
            </text>
          </g>
        </svg>
      </div>

      {/* Legend & Metrics Breakdown */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 pt-3 border-t border-slate-800 text-xs">
        <div
          onMouseEnter={() => setHoveredModel('raw')}
          onMouseLeave={() => setHoveredModel(null)}
          onClick={() => setSelectedModel(selectedModel === 'raw' ? null : 'raw')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            activeFocus === 'raw'
              ? 'bg-rose-950/60 border-rose-500/80 ring-2 ring-rose-500/40'
              : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-rose-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              Raw NWP
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Uncalibrated</span>
          </div>
          <div className="text-[11px] text-slate-300 font-mono space-y-1">
            <div className="flex justify-between"><span className="text-slate-400">POD:</span><strong className="text-white">{current.rawNwp.pod.toFixed(3)}</strong></div>
            <div className="flex justify-between"><span className="text-slate-400">FAR:</span><strong className="text-white">{current.rawNwp.far.toFixed(3)}</strong></div>
            <div className="flex justify-between"><span className="text-slate-400">CSI:</span><strong className="text-white">{current.rawNwp.csi.toFixed(3)}</strong></div>
            <div className="flex justify-between"><span className="text-slate-400">Bias:</span><strong className="text-white">{current.rawNwp.frequencyBias.toFixed(2)}</strong></div>
          </div>
        </div>

        <div
          onMouseEnter={() => setHoveredModel('base')}
          onMouseLeave={() => setHoveredModel(null)}
          onClick={() => setSelectedModel(selectedModel === 'base' ? null : 'base')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            activeFocus === 'base'
              ? 'bg-amber-950/60 border-amber-500/80 ring-2 ring-amber-500/40'
              : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              Linear MOS
            </div>
            <span className="text-[10px] text-slate-500 font-mono">1D Scaling</span>
          </div>
          <div className="text-[11px] text-slate-300 font-mono space-y-1">
            <div className="flex justify-between"><span className="text-slate-400">POD:</span><strong className="text-white">{current.linearBaseline.pod.toFixed(3)}</strong></div>
            <div className="flex justify-between"><span className="text-slate-400">FAR:</span><strong className="text-white">{current.linearBaseline.far.toFixed(3)}</strong></div>
            <div className="flex justify-between"><span className="text-slate-400">CSI:</span><strong className="text-white">{current.linearBaseline.csi.toFixed(3)}</strong></div>
            <div className="flex justify-between"><span className="text-slate-400">Bias:</span><strong className="text-white">{current.linearBaseline.frequencyBias.toFixed(2)}</strong></div>
          </div>
        </div>

        <div
          onMouseEnter={() => setHoveredModel('ai')}
          onMouseLeave={() => setHoveredModel(null)}
          onClick={() => setSelectedModel(selectedModel === 'ai' ? null : 'ai')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            activeFocus === 'ai'
              ? 'bg-blue-950/80 border-blue-400 ring-2 ring-blue-500/50'
              : 'bg-blue-950/40 hover:bg-blue-900/40 border-blue-500/40 ring-1 ring-blue-500/20'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-blue-300 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
              SAMVARTAKA AI
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">Regime-Aware</span>
          </div>
          <div className="text-[11px] text-slate-200 font-mono space-y-1">
            <div className="flex justify-between"><span className="text-slate-400">POD:</span><strong className="text-emerald-400">{current.aiCorrected.pod.toFixed(3)}</strong></div>
            <div className="flex justify-between"><span className="text-slate-400">FAR:</span><strong className="text-emerald-400">{current.aiCorrected.far.toFixed(3)}</strong></div>
            <div className="flex justify-between"><span className="text-slate-400">CSI:</span><strong className="text-cyan-300 font-bold">{current.aiCorrected.csi.toFixed(3)}</strong></div>
            <div className="flex justify-between"><span className="text-slate-400">Bias:</span><strong className="text-cyan-300 font-bold">{current.aiCorrected.frequencyBias.toFixed(2)}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
};
