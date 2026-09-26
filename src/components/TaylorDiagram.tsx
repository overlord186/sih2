import React, { useState, useMemo } from 'react';

interface TaylorDiagramProps {
  stats: {
    observed: { std: number; correlation: number; crmse: number };
    rawNwp: { std: number; correlation: number; crmse: number; label: string };
    linearBaseline: { std: number; correlation: number; crmse: number; label: string };
    aiCorrected: { std: number; correlation: number; crmse: number; label: string };
  };
}

export const TaylorDiagram: React.FC<TaylorDiagramProps> = ({ stats }) => {
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // Polar coordinate mapping in Taylor diagram:
  // r = normalized standard deviation (radial distance from origin)
  // theta = arccos(correlation) (angular angle from x-axis in radians)
  // Origin is at bottom-left: (padLeft, height - padBottom)

  const width = 480;
  const height = 420;
  const padLeft = 55;
  const padBottom = 55;
  const padTop = 30;
  const padRight = 35;

  const maxR = 1.6; // normalized std max
  const scale = (height - padBottom - padTop) / maxR;

  const originX = padLeft;
  const originY = height - padBottom;

  // Convert (std, correlation) to (x, y) on canvas
  const polarToXY = (stdNorm: number, correlation: number) => {
    const clampedCorr = Math.max(-1, Math.min(1, correlation));
    const theta = Math.acos(clampedCorr); // in radians (0 at corr=1, pi/2 at corr=0)
    const r = Math.min(maxR, Math.max(0, stdNorm)) * scale;
    const x = originX + r * Math.cos(theta);
    const y = originY - r * Math.sin(theta);
    return { x, y, theta, r };
  };

  // Correlation ticks & radial rays
  const corrTicks = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.99, 1.0];

  // Radial STD arcs (circles centered at origin)
  const stdArcs = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5];

  // Concentric RMSE arcs centered at Reference Point (std=1.0, corr=1.0 => x = originX + 1.0*scale, y = originY)
  const refX = originX + 1.0 * scale;
  const refY = originY;
  const rmseRings = [0.25, 0.5, 0.75, 1.0, 1.25];

  const safeStats = {
    observed: { std: 1.0, correlation: 1.0, crmse: 0.0, ...(stats?.observed || {}) },
    rawNwp: { std: 1.25, correlation: 0.62, crmse: 0.88, label: 'Raw NWP', ...(stats?.rawNwp || {}) },
    linearBaseline: { std: 1.15, correlation: 0.71, crmse: 0.74, label: 'Linear MOS', ...(stats?.linearBaseline || {}) },
    aiCorrected: { std: 1.03, correlation: 0.91, crmse: 0.38, label: 'AI Post-Processed', ...(stats?.aiCorrected || {}) },
  };

  const rawPoint = polarToXY(safeStats.rawNwp.std, safeStats.rawNwp.correlation);
  const basePoint = polarToXY(safeStats.linearBaseline.std, safeStats.linearBaseline.correlation);
  const aiPoint = polarToXY(safeStats.aiCorrected.std, safeStats.aiCorrected.correlation);

  // Smart Collision-Free Label Offset Calculation
  // Detect proximity between Raw NWP and Linear MOS
  const dxRawBase = Math.abs(rawPoint.x - basePoint.x);
  const dyRawBase = Math.abs(rawPoint.y - basePoint.y);
  const isRawBaseClose = dxRawBase < 65 && dyRawBase < 45;

  // Compute non-overlapping label layout positions with leader paths
  const labelLayouts = useMemo(() => {
    // 1. Raw NWP label
    let rawLabelX = rawPoint.x + 16;
    let rawLabelY = rawPoint.y - 18;
    let rawAnchor = 'start';
    let rawLeader = '';

    // 2. Linear MOS label
    let baseLabelX = basePoint.x - 16;
    let baseLabelY = basePoint.y - 22;
    let baseAnchor = 'end';
    let baseLeader = '';

    // 3. AI Corrected label
    let aiLabelX = aiPoint.x + 18;
    let aiLabelY = aiPoint.y - 16;
    let aiAnchor = 'start';
    let aiLeader = '';

    if (isRawBaseClose) {
      // Offset Raw NWP upward-right
      rawLabelX = rawPoint.x + 22;
      rawLabelY = rawPoint.y - 28;
      rawAnchor = 'start';
      rawLeader = `M ${rawPoint.x} ${rawPoint.y} L ${rawPoint.x + 12} ${rawPoint.y - 20} L ${rawLabelX - 4} ${rawLabelY}`;

      // Offset Linear MOS downward-left
      baseLabelX = basePoint.x - 22;
      baseLabelY = basePoint.y + 24;
      baseAnchor = 'end';
      baseLeader = `M ${basePoint.x} ${basePoint.y} L ${basePoint.x - 12} ${basePoint.y + 16} L ${baseLabelX + 4} ${baseLabelY}`;
    } else {
      rawLeader = `M ${rawPoint.x} ${rawPoint.y} L ${rawLabelX - 4} ${rawLabelY}`;
      baseLeader = `M ${basePoint.x} ${basePoint.y} L ${baseLabelX + 4} ${baseLabelY}`;
    }

    // Keep AI label comfortably spaced
    if (Math.abs(aiPoint.x - rawLabelX) < 50 && Math.abs(aiPoint.y - rawLabelY) < 30) {
      aiLabelY = aiPoint.y - 32;
      aiLabelX = aiPoint.x + 18;
    }
    aiLeader = `M ${aiPoint.x} ${aiPoint.y} L ${aiPoint.x + 8} ${aiPoint.y - 10} L ${aiLabelX - 4} ${aiLabelY}`;

    // Ensure labels stay within SVG boundary
    if (rawLabelX > width - 110) {
      rawLabelX = width - 110;
    }
    if (aiLabelX > width - 130) {
      aiLabelX = width - 130;
    }

    return {
      raw: { x: rawLabelX, y: rawLabelY, anchor: rawAnchor, leader: rawLeader },
      base: { x: baseLabelX, y: baseLabelY, anchor: baseAnchor, leader: baseLeader },
      ai: { x: aiLabelX, y: aiLabelY, anchor: aiAnchor, leader: aiLeader },
    };
  }, [rawPoint, basePoint, aiPoint, isRawBaseClose, width]);

  const activeFocus = hoveredModel || selectedModel;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col items-center select-none">
      {/* Header Info */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Taylor Diagram</span>
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
              Polar Statistical Skill Space
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
            Co-plots spatial correlation (r), normalized variability (σ_f / σ_o), and centered RMS error (E'). Closer to the <strong className="text-emerald-400 font-semibold">Observed Reference Point</strong> indicates superior pattern matching.
          </p>
        </div>

        {/* Interactive Highlight Filter */}
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
          <defs>
            {/* Sector clip path to keep concentric RMSE arcs within the 1st quadrant arc */}
            <clipPath id="taylor-quadrant">
              <path
                d={`M ${originX} ${originY} L ${originX + maxR * scale} ${originY} A ${maxR * scale} ${maxR * scale} 0 0 0 ${originX} ${originY - maxR * scale} Z`}
              />
            </clipPath>

            {/* Glowing filter for AI Model */}
            <filter id="glow-ai" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background fill */}
          <rect x={0} y={0} width={width} height={height} fill="#090e1f" rx={10} />

          {/* Sector Fill Backdrop */}
          <path
            d={`M ${originX} ${originY} L ${originX + maxR * scale} ${originY} A ${maxR * scale} ${maxR * scale} 0 0 0 ${originX} ${originY - maxR * scale} Z`}
            fill="#0c142b"
            stroke="none"
          />

          {/* Group clipped to sector: Concentric Centered RMSE Arcs (centered at Reference Point) */}
          <g clipPath="url(#taylor-quadrant)">
            {rmseRings.map((rmse) => (
              <g key={`rmse-${rmse}`}>
                <circle
                  cx={refX}
                  cy={refY}
                  r={rmse * scale}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth={rmse === 0.5 ? '1.2' : '0.9'}
                  strokeDasharray="3,3"
                  opacity={activeFocus === 'obs' ? 0.8 : 0.35}
                />
                {/* RMSE arc label positioned near upper curve */}
                <text
                  x={refX - rmse * scale * 0.707}
                  y={refY - rmse * scale * 0.707}
                  fill="#4ade80"
                  fontSize="8"
                  fontFamily="monospace"
                  opacity="0.6"
                  textAnchor="middle"
                >
                  E&apos;={rmse.toFixed(2)}
                </text>
              </g>
            ))}
          </g>

          {/* Standard Deviation Radial Arcs (centered at Origin) */}
          {stdArcs.map((stdVal) => {
            const r = stdVal * scale;
            const isRefStd = stdVal === 1.0;
            return (
              <g key={`std-${stdVal}`}>
                <path
                  d={`M ${originX + r} ${originY} A ${r} ${r} 0 0 0 ${originX} ${originY - r}`}
                  fill="none"
                  stroke={isRefStd ? '#10b981' : '#334155'}
                  strokeWidth={isRefStd ? '1.8' : '0.8'}
                  strokeDasharray={isRefStd ? 'none' : '3,3'}
                  opacity={isRefStd ? 0.9 : 0.5}
                />
                {/* X-axis tick label */}
                <text
                  x={originX + r}
                  y={originY + 14}
                  fill={isRefStd ? '#34d399' : '#64748b'}
                  fontSize="9"
                  fontWeight={isRefStd ? 'bold' : 'normal'}
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {stdVal.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Correlation Radial Rays & Perimeter Ticks */}
          {corrTicks.map((corr) => {
            const { x, y } = polarToXY(maxR, corr);
            const isHigh = corr >= 0.9;
            return (
              <g key={`corr-${corr}`}>
                <line
                  x1={originX}
                  y1={originY}
                  x2={x}
                  y2={y}
                  stroke={isHigh ? '#475569' : '#334155'}
                  strokeWidth={corr === 1.0 ? '1.5' : '0.8'}
                  strokeDasharray={corr === 1.0 ? 'none' : '2,3'}
                  opacity={isHigh ? 0.8 : 0.4}
                />
                {/* Tick label on outer perimeter */}
                <text
                  x={x + (corr === 1.0 ? 8 : corr > 0.8 ? 6 : 4)}
                  y={y + (corr === 1.0 ? 3 : corr < 0.2 ? -5 : -2)}
                  fill={corr === 1.0 ? '#34d399' : isHigh ? '#cbd5e1' : '#94a3b8'}
                  fontSize="8.5"
                  fontWeight={isHigh ? 'bold' : 'normal'}
                  fontFamily="monospace"
                  textAnchor={corr < 0.2 ? 'middle' : 'start'}
                >
                  {corr === 1.0 ? '1.0' : corr}
                </text>
              </g>
            );
          })}

          {/* Outer Perimeter Arc Border */}
          <path
            d={`M ${originX + maxR * scale} ${originY} A ${maxR * scale} ${maxR * scale} 0 0 0 ${originX} ${originY - maxR * scale}`}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.6"
          />

          {/* Coordinate Axes */}
          <line
            x1={originX}
            y1={originY}
            x2={originX + maxR * scale + 6}
            y2={originY}
            stroke="#94a3b8"
            strokeWidth="1.6"
          />
          <line
            x1={originX}
            y1={originY}
            x2={originX}
            y2={originY - maxR * scale - 6}
            stroke="#94a3b8"
            strokeWidth="1.6"
          />

          {/* Origin Marker */}
          <circle cx={originX} cy={originY} r={3} fill="#94a3b8" />
          <text x={originX - 8} y={originY + 12} fill="#64748b" fontSize="9" fontFamily="monospace">
            0.0
          </text>

          {/* Distance vectors from Observed Reference to Model Points when focused */}
          {activeFocus === 'ai' && (
            <line
              x1={refX}
              y1={refY}
              x2={aiPoint.x}
              y2={aiPoint.y}
              stroke="#60a5fa"
              strokeWidth="1.8"
              strokeDasharray="3,3"
            />
          )}
          {activeFocus === 'raw' && (
            <line
              x1={refX}
              y1={refY}
              x2={rawPoint.x}
              y2={rawPoint.y}
              stroke="#f87171"
              strokeWidth="1.8"
              strokeDasharray="3,3"
            />
          )}
          {activeFocus === 'base' && (
            <line
              x1={refX}
              y1={refY}
              x2={basePoint.x}
              y2={basePoint.y}
              stroke="#fbbf24"
              strokeWidth="1.8"
              strokeDasharray="3,3"
            />
          )}

          {/* ========================================================================= */}
          {/* 1. OBSERVED REFERENCE POINT (σ = 1.0, r = 1.0)                            */}
          {/* ========================================================================= */}
          <g
            className="cursor-pointer transition-transform"
            onMouseEnter={() => setHoveredModel('obs')}
            onMouseLeave={() => setHoveredModel(null)}
          >
            {/* Bullseye rings */}
            <circle cx={refX} cy={refY} r={10} fill="#10b981" fillOpacity="0.2" />
            <circle cx={refX} cy={refY} r={6} fill="#10b981" stroke="#ffffff" strokeWidth="2" />
            <circle cx={refX} cy={refY} r={2} fill="#ffffff" />

            {/* Non-overlapping Anchor Label with Background Badge Pill positioned cleanly below axis */}
            <rect
              x={refX - 44}
              y={refY + 18}
              width={88}
              height={18}
              rx={5}
              fill="#064e3b"
              fillOpacity="0.9"
              stroke="#10b981"
              strokeWidth="1"
            />
            <text
              x={refX}
              y={refY + 31}
              fill="#ecfdf5"
              fontSize="9"
              fontWeight="bold"
              textAnchor="middle"
              fontFamily="sans-serif"
            >
              ★ OBSERVED (Ref)
            </text>
          </g>

          {/* ========================================================================= */}
          {/* 2. RAW NWP POINT & ANTI-COLLISION LEADER BADGE                            */}
          {/* ========================================================================= */}
          <g
            className={`transition-opacity duration-200 cursor-pointer ${
              activeFocus && activeFocus !== 'raw' ? 'opacity-30' : 'opacity-100'
            }`}
            onMouseEnter={() => setHoveredModel('raw')}
            onMouseLeave={() => setHoveredModel(null)}
            onClick={() => setSelectedModel(selectedModel === 'raw' ? null : 'raw')}
          >
            {/* Leader Line */}
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

            {/* Data Point Dot */}
            <circle cx={rawPoint.x} cy={rawPoint.y} r={6.5} fill="#ef4444" stroke="#ffffff" strokeWidth="2" />

            {/* Non-overlapping Badge Pill */}
            <rect
              x={labelLayouts.raw.anchor === 'end' ? labelLayouts.raw.x - 110 : labelLayouts.raw.x - 6}
              y={labelLayouts.raw.y - 12}
              width={116}
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
              fontFamily="sans-serif"
            >
              ● Raw NWP (r={stats.rawNwp.correlation.toFixed(2)})
            </text>
          </g>

          {/* ========================================================================= */}
          {/* 3. LINEAR BASELINE POINT & ANTI-COLLISION LEADER BADGE                    */}
          {/* ========================================================================= */}
          <g
            className={`transition-opacity duration-200 cursor-pointer ${
              activeFocus && activeFocus !== 'base' ? 'opacity-30' : 'opacity-100'
            }`}
            onMouseEnter={() => setHoveredModel('base')}
            onMouseLeave={() => setHoveredModel(null)}
            onClick={() => setSelectedModel(selectedModel === 'base' ? null : 'base')}
          >
            {/* Leader Line */}
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

            {/* Data Point Dot */}
            <circle cx={basePoint.x} cy={basePoint.y} r={6.5} fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />

            {/* Non-overlapping Badge Pill */}
            <rect
              x={labelLayouts.base.anchor === 'end' ? labelLayouts.base.x - 120 : labelLayouts.base.x - 6}
              y={labelLayouts.base.y - 12}
              width={124}
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
              fontFamily="sans-serif"
            >
              ● Linear MOS (r={stats.linearBaseline.correlation.toFixed(2)})
            </text>
          </g>

          {/* ========================================================================= */}
          {/* 4. SAMVARTAKA AI POINT & GLOWING ACCENT BADGE                             */}
          {/* ========================================================================= */}
          <g
            className={`transition-opacity duration-200 cursor-pointer ${
              activeFocus && activeFocus !== 'ai' ? 'opacity-30' : 'opacity-100'
            }`}
            onMouseEnter={() => setHoveredModel('ai')}
            onMouseLeave={() => setHoveredModel(null)}
            onClick={() => setSelectedModel(selectedModel === 'ai' ? null : 'ai')}
          >
            {/* Pulsing Outer Ring */}
            <circle
              cx={aiPoint.x}
              cy={aiPoint.y}
              r={12}
              fill="#3b82f6"
              fillOpacity="0.25"
              className="animate-ping"
            />

            {/* Leader Line */}
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

            {/* Data Point Dot */}
            <circle
              cx={aiPoint.x}
              cy={aiPoint.y}
              r={8.5}
              fill="#2563eb"
              stroke="#93c5fd"
              strokeWidth="2.5"
              filter="url(#glow-ai)"
            />
            <circle cx={aiPoint.x} cy={aiPoint.y} r={3} fill="#ffffff" />

            {/* Accent Badge Pill */}
            <rect
              x={labelLayouts.ai.anchor === 'end' ? labelLayouts.ai.x - 146 : labelLayouts.ai.x - 6}
              y={labelLayouts.ai.y - 13}
              width={152}
              height={20}
              rx={6}
              fill="#0f1f3d"
              fillOpacity="0.95"
              stroke="#60a5fa"
              strokeWidth="1.4"
            />
            <text
              x={labelLayouts.ai.x}
              y={labelLayouts.ai.y + 1}
              fill="#93c5fd"
              fontSize="10"
              fontWeight="800"
              textAnchor={labelLayouts.ai.anchor as any}
              fontFamily="sans-serif"
            >
              ★ SAMVARTAKA AI (r={safeStats.aiCorrected.correlation.toFixed(2)})
            </text>
          </g>

          {/* Axis Titles */}
          <text
            x={originX + (maxR * scale) / 2}
            y={height - 8}
            fill="#e2e8f0"
            fontSize="10.5"
            fontWeight="bold"
            textAnchor="middle"
          >
            Normalized Standard Deviation (σ_f / σ_o) →
          </text>
          <text
            x={-originY + (maxR * scale) / 2}
            y={16}
            fill="#e2e8f0"
            fontSize="10.5"
            fontWeight="bold"
            textAnchor="middle"
            transform="rotate(-90)"
          >
            Correlation Arc Angle cos⁻¹(r)
          </text>
        </svg>
      </div>

      {/* Interactive Verification Cards Below */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-4 pt-3 border-t border-slate-800 text-xs">
        {/* Raw NWP */}
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
              <span>Raw NWP</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Uncalibrated</span>
          </div>
          <div className="text-[11px] text-slate-300 font-mono space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Corr (r):</span>
              <strong className="text-white">{safeStats.rawNwp.correlation.toFixed(3)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Norm σ:</span>
              <strong className="text-white">{safeStats.rawNwp.std.toFixed(2)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cent-RMSE (E&apos;):</span>
              <strong className="text-rose-300">{safeStats.rawNwp.crmse.toFixed(1)} mm</strong>
            </div>
          </div>
        </div>

        {/* Linear MOS */}
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
              <span>Linear MOS</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">1D Scaling</span>
          </div>
          <div className="text-[11px] text-slate-300 font-mono space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Corr (r):</span>
              <strong className="text-white">{safeStats.linearBaseline.correlation.toFixed(3)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Norm σ:</span>
              <strong className="text-white">{safeStats.linearBaseline.std.toFixed(2)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cent-RMSE (E&apos;):</span>
              <strong className="text-amber-300">{safeStats.linearBaseline.crmse.toFixed(1)} mm</strong>
            </div>
          </div>
        </div>

        {/* SAMVARTAKA AI */}
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
              <span>SAMVARTAKA AI</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">Regime-Aware</span>
          </div>
          <div className="text-[11px] text-slate-200 font-mono space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Corr (r):</span>
              <strong className="text-emerald-400">{safeStats.aiCorrected.correlation.toFixed(3)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Norm σ:</span>
              <strong className="text-emerald-400">{safeStats.aiCorrected.std.toFixed(2)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cent-RMSE (E&apos;):</span>
              <strong className="text-sky-300 font-bold">{safeStats.aiCorrected.crmse.toFixed(1)} mm</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
