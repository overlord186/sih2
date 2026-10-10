/**
 * MasterPlansModal.tsx
 * SAMVARTAKA AI — Architectural Master Plans & Multi-Round Design Comparison Studio
 * 
 * Provides an interactive in-app interface to review, compare, and execute
 * architectural evolution master plans across multiple rounds of rigorous evaluation.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  FileCode2,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Layers,
  Cpu,
  Gauge,
  Database,
  Sliders,
  Scale,
  Zap,
  Activity,
  Compass,
  Radio,
  SplitSquareHorizontal,
  Flame,
  Award,
  ChevronRight,
  ExternalLink,
  Code2,
  Eye,
  ShieldCheck,
  Check,
  Film,
  Mountain,
} from 'lucide-react';

export type PlanTabId =
  | 'round_comparison'
  | 'supreme_master_plan_1'
  | 'supreme_master_plan_2'
  | 'station_3d_plan'
  | 'synoptic_video_plan'
  | 'qrf_plan'
  | 'smoothness_plan'
  | 'real_data_plan';

interface MasterPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const MasterPlansModal: React.FC<MasterPlansModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [activeTab, setActiveTab] = useState<PlanTabId>('round_comparison');
  const [selectedRound, setSelectedRound] = useState<'round1' | 'round2' | 'final'>('round1');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-md">
              <FileCode2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Architectural Master Plans & Evolution Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 border border-cyan-800 text-cyan-300">
                  Dual Supreme Master Plans Integrated
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Multi-stage comparative planning, physical grounding blueprints, and system redesign architectures
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 border-b border-slate-800/80 bg-slate-950/40 overflow-x-auto text-xs font-medium no-scrollbar">
          <button
            onClick={() => setActiveTab('round_comparison')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
              activeTab === 'round_comparison'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-cyan-300" />
            <span>Rounds of Comparison</span>
          </button>

          <button
            onClick={() => setActiveTab('supreme_master_plan_1')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
              activeTab === 'supreme_master_plan_1'
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-300" />
            <span>Supreme Plan 1: Cockpit Redesign</span>
          </button>

          <button
            onClick={() => setActiveTab('supreme_master_plan_2')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
              activeTab === 'supreme_master_plan_2'
                ? 'bg-purple-600 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            <span>Supreme Plan 2: Digital Twin Engine</span>
          </button>

          <button
            onClick={() => setActiveTab('station_3d_plan')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
              activeTab === 'station_3d_plan'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Mountain className="w-3.5 h-3.5 text-emerald-300" />
            <span>3D Ground Sim Plan</span>
          </button>

          <button
            onClick={() => setActiveTab('synoptic_video_plan')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
              activeTab === 'synoptic_video_plan'
                ? 'bg-purple-600 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-purple-300" />
            <span>Ultra-Real Video Plan</span>
          </button>

          <button
            onClick={() => setActiveTab('qrf_plan')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
              activeTab === 'qrf_plan'
                ? 'bg-cyan-600 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-300" />
            <span>Interactive QRF Plan</span>
          </button>

          <button
            onClick={() => setActiveTab('smoothness_plan')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
              activeTab === 'smoothness_plan'
                ? 'bg-amber-600 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>120 FPS Smoothness Plan</span>
          </button>

          <button
            onClick={() => setActiveTab('real_data_plan')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
              activeTab === 'real_data_plan'
                ? 'bg-teal-600 text-white font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-teal-300" />
            <span>Real Data Ingestion Plan</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* TAB 1: ROUNDS OF COMPARISON */}
          {activeTab === 'round_comparison' && (
            <div className="space-y-6">
              {/* Round Switcher */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Scale className="w-4 h-4 text-cyan-400" />
                    Multi-Round Architectural Comparison & Synthesis
                  </h3>
                  <p className="text-xs text-slate-400">
                    Systematic evaluation of divergent plans across visual fidelity, physical rigor, performance, and operational feasibility
                  </p>
                </div>

                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    onClick={() => setSelectedRound('round1')}
                    className={`px-3 py-1 rounded-lg font-medium cursor-pointer transition-all ${
                      selectedRound === 'round1'
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Round 1: Initial Plans
                  </button>
                  <button
                    onClick={() => setSelectedRound('round2')}
                    className={`px-3 py-1 rounded-lg font-medium cursor-pointer transition-all ${
                      selectedRound === 'round2'
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Round 2: Iterated Plans
                  </button>
                  <button
                    onClick={() => setSelectedRound('final')}
                    className={`px-3 py-1 rounded-lg font-medium cursor-pointer transition-all ${
                      selectedRound === 'final'
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Final Synthesis
                  </button>
                </div>
              </div>

              {/* ROUND 1 VIEW */}
              {selectedRound === 'round1' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Plan A */}
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                            PLAN A
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">Tactical Enhancement</span>
                        </div>
                        <h4 className="font-bold text-white text-sm mb-1.5">
                          Surgical Component Upgrade
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Keeps the existing tab structure intact. Replaces low-poly meshes in-place with Three.js custom shaders, connects Open-Meteo live API, and optimizes frame rates via memoization.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-[11px]">
                        <div className="flex justify-between text-slate-400">
                          <span>Visual Impact:</span> <span className="text-amber-400 font-semibold">Moderate</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Risk / Regression:</span> <span className="text-emerald-400 font-semibold">Very Low</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Realism Level:</span> <span className="text-blue-300 font-semibold">Good</span>
                        </div>
                      </div>
                    </div>

                    {/* Plan B */}
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-indigo-500/40 flex flex-col justify-between ring-1 ring-indigo-500/30">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                            PLAN B
                          </span>
                          <span className="text-[10px] text-indigo-400 font-mono">Workstation Redesign</span>
                        </div>
                        <h4 className="font-bold text-white text-sm mb-1.5">
                          Unified Operational Cockpit
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Redesigns the fragmented tab layout into a multi-viewport WMO-standard operational console. Replaces simple 3D canvases with full-screen raymarched atmosphere and split comparison sliders.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-[11px]">
                        <div className="flex justify-between text-slate-400">
                          <span>Visual Impact:</span> <span className="text-emerald-400 font-semibold">High ("WOW")</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Risk / Regression:</span> <span className="text-amber-400 font-semibold">Medium</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Realism Level:</span> <span className="text-cyan-300 font-semibold">High</span>
                        </div>
                      </div>
                    </div>

                    {/* Plan C */}
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            PLAN C
                          </span>
                          <span className="text-[10px] text-emerald-400 font-mono">Deep Digital Twin</span>
                        </div>
                        <h4 className="font-bold text-white text-sm mb-1.5">
                          Physical Digital Twin & Raw Ingestion
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Prioritizes 100% genuine IMD 0.25° gridded NetCDF archives (1901-present) and full Eulerian-Lagrangian droplet fluid dynamics, offloading heavy St-GNN tensor math to Web Workers.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-[11px]">
                        <div className="flex justify-between text-slate-400">
                          <span>Visual Impact:</span> <span className="text-cyan-400 font-semibold">High</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Risk / Regression:</span> <span className="text-amber-400 font-semibold">Medium-High</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Realism Level:</span> <span className="text-emerald-300 font-semibold">Scientific Grade</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Comparative Matrix Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <h4 className="font-semibold text-xs text-slate-200 uppercase tracking-wider mb-3">
                      Round 1 Evaluation Matrix (Scored 1 - 10)
                    </h4>
                    <table className="w-full text-xs text-left text-slate-300">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="py-2 px-3 font-semibold">Evaluation Dimension</th>
                          <th className="py-2 px-3 font-semibold text-blue-400">Plan A: Surgical</th>
                          <th className="py-2 px-3 font-semibold text-indigo-400">Plan B: Cockpit Redesign</th>
                          <th className="py-2 px-3 font-semibold text-emerald-400">Plan C: Digital Twin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        <tr>
                          <td className="py-2 px-3 font-sans text-slate-300">Visual Wow Factor & Immersion</td>
                          <td className="py-2 px-3">6.5 / 10</td>
                          <td className="py-2 px-3 text-emerald-400 font-bold">9.4 / 10</td>
                          <td className="py-2 px-3 text-cyan-300">8.8 / 10</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-sans text-slate-300">Atmospheric Physical Grounding</td>
                          <td className="py-2 px-3">7.0 / 10</td>
                          <td className="py-2 px-3 text-cyan-300">8.5 / 10</td>
                          <td className="py-2 px-3 text-emerald-400 font-bold">9.8 / 10</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-sans text-slate-300">120 FPS Fluidity & Frame Budget</td>
                          <td className="py-2 px-3 text-emerald-400 font-bold">9.2 / 10</td>
                          <td className="py-2 px-3 text-cyan-300">8.9 / 10</td>
                          <td className="py-2 px-3">8.2 / 10</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-sans text-slate-300">Authentic Meteorological Data Integration</td>
                          <td className="py-2 px-3">7.5 / 10</td>
                          <td className="py-2 px-3 text-cyan-300">8.6 / 10</td>
                          <td className="py-2 px-3 text-emerald-400 font-bold">9.9 / 10</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-sans text-slate-300">Total Weighted Score</td>
                          <td className="py-2 px-3 text-slate-400">75.5%</td>
                          <td className="py-2 px-3 text-indigo-300 font-bold">88.5%</td>
                          <td className="py-2 px-3 text-emerald-300 font-bold">91.7%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ROUND 2 VIEW */}
              {selectedRound === 'round2' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-800/60">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <h4 className="font-bold text-white text-sm">
                        Round 2 Findings: Convergence from Round 1 Comparisons
                      </h4>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Round 1 demonstrated that while <strong>Plan B (Cockpit Redesign)</strong> delivered the highest visual ergonomic value, <strong>Plan C (Digital Twin)</strong> had the strongest scientific rigor. Round 2 synthesizes these findings into two new hyper-refined candidates:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Plan D */}
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-indigo-500/50 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                            PLAN D (SYNTHESIS)
                          </span>
                          <span className="text-[10px] text-indigo-400 font-mono">The Apex Cockpit</span>
                        </div>
                        <h4 className="font-bold text-white text-sm mb-1.5">
                          SAMVARTAKA 4.0 Apex Workstation Cockpit
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Combines Plan B's glassmorphic multi-pane workstation layout with Plan C's physical WebGPU volumetric raymarching. Introduces station-specific 3D procedural geography, 3D spatial Web Audio acoustics, and real-time ECMWF IFS 0.25° live pipeline.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-[11px]">
                        <div className="flex justify-between text-slate-400">
                          <span>Visual Immersion:</span> <span className="text-emerald-400 font-bold">9.8 / 10</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Physics & Data:</span> <span className="text-cyan-300 font-bold">9.7 / 10</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Recommendation:</span> <span className="text-amber-300 font-bold">WINNER (Adopted)</span>
                        </div>
                      </div>
                    </div>

                    {/* Plan E */}
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                            PLAN E (SPECIALIZED)
                          </span>
                          <span className="text-[10px] text-purple-400 font-mono">Pure Neural Simulator</span>
                        </div>
                        <h4 className="font-bold text-white text-sm mb-1.5">
                          Autonomous Neural-Atmospheric Twin
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Focuses exclusively on St-GNN surrogate models, running heavy neural Navier-Stokes partial differential equations in WebAssembly. Extremely powerful computationally, but higher barrier for casual browser operation.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-[11px]">
                        <div className="flex justify-between text-slate-400">
                          <span>Visual Immersion:</span> <span className="text-blue-300 font-bold">8.4 / 10</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Physics & Data:</span> <span className="text-emerald-400 font-bold">9.9 / 10</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Recommendation:</span> <span className="text-slate-400 font-semibold">Specialized Research</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* FINAL SYNTHESIS VIEW */}
              {selectedRound === 'final' && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/80 via-slate-950/90 to-cyan-950/80 border border-cyan-500/40 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">
                        Final Consensus: The Supreme Platform Redesign Master Plan
                      </h4>
                      <p className="text-xs text-cyan-300">
                        Result of 2 rounds of multi-dimensional architectural comparison
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    By synthesizing the ergonomic strengths of <strong>Plan B</strong> with the physical rigor of <strong>Plan C</strong> and the refined smoothness of <strong>Plan D</strong>, we have formulated the final <strong>Supreme Architectural Master Plan</strong>. It unifies:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-100 block">Unified Multi-Pane Cockpit:</strong>
                        <span className="text-slate-400 text-[11px]">Replaces fragmented tabs with a synchronized glassmorphic operational workstation.</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-100 block">Station-Specific Biomes:</strong>
                        <span className="text-slate-400 text-[11px]">Real 3D procedural geography (Mumbai ocean surf, Lucknow alluvial basin, Cherrapunji gorge).</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-100 block">60 FPS 1080p Video Generation:</strong>
                        <span className="text-slate-400 text-[11px]">Volumetric raymarched clouds with real-time MP4/WebM video recording and spatial acoustics.</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-slate-100 block">100% Grounded Real Telemetry:</strong>
                        <span className="text-slate-400 text-[11px]">IndexedDB multi-tier cache with operational ECMWF IFS 0.25° and IMD rain gauges.</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SUPREME MASTER PLAN 1 (COCKPIT REDESIGN) */}
          {activeTab === 'supreme_master_plan_1' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-indigo-400" />
                    Supreme Master Plan 1: SAMVARTAKA 4.0 Unified Operational Cockpit
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Platform-wide architectural redesign unifying GIS synoptic mapping, live AI downscaled telemetry deck, embedded 3D ground digital twin, and spring temporal scrubber into an enterprise console.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateTab?.('cockpit');
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg flex items-center gap-2 cursor-pointer shrink-0 transition-all hover:scale-105"
                >
                  <Gauge className="w-4 h-4 text-white" />
                  <span>Launch Live Cockpit 4.0</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider text-cyan-400">
                    Pillar 1: Multi-Pane Synchronous Console
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-400 list-disc pl-4">
                    <li>Single-screen operational view combining Synoptic GIS Map, Telemetry, and 3D Ground Twin.</li>
                    <li>No tab thrashing: forecasters view spatial radar composite alongside station-level flood depths.</li>
                    <li>Responsive multi-column glassmorphic grid with zero frame latency.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider text-indigo-400">
                    Pillar 2: Dual Viewport Split Swipe Comparison
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-400 list-disc pl-4">
                    <li>Interactive split swipe slider comparing AI Downscaled Plume vs Raw NWP GFS/ECMWF.</li>
                    <li>Synchronized Leaflet tile pan/zoom controllers with sub-pixel alignment.</li>
                    <li>Real-time skill improvement delta readout (RMSE -31.4%, Deluge POD +42%).</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider text-emerald-400">
                    Pillar 3: Perceptually Uniform Oklab Colormaps
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-400 list-disc pl-4">
                    <li>Oklab Deluge colormap eliminating Mach banding and artificial boundary illusions.</li>
                    <li>Toggleable Turbo, Viridis, and Plasma palettes adhering to WMO Color Guidelines.</li>
                    <li>Automatic high-contrast isolines at 64.5mm (Heavy) and 115.5mm (Very Heavy) thresholds.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider text-amber-400">
                    Pillar 4: Master Spring Temporal Progression Scrubber
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-400 list-disc pl-4">
                    <li>Continuous temporal scrubber animating monsoon onset through peak deluge and withdrawal.</li>
                    <li>Lead time jumps from T+24h to T+120h with synchronized model state reload.</li>
                    <li>Integrated audio synth soundscapes responsive to synoptic deluge intensity.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SUPREME MASTER PLAN 2 (DIGITAL TWIN & VIDEO ENGINE) */}
          {activeTab === 'supreme_master_plan_2' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-purple-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Supreme Master Plan 2: Ultra-Real Physics & Procedural Digital Twin Engine
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Procedural digital twins with station-specific biomes, Gunn-Kinzer raindrop aerodynamics, cantilever wind drag, Horton soil infiltration, and 1080p 60 FPS video recording.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    window.dispatchEvent(new CustomEvent('open-3d-simulator'));
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg flex items-center gap-2 cursor-pointer shrink-0 transition-all hover:scale-105"
                >
                  <Mountain className="w-4 h-4 text-white" />
                  <span>Launch 3D Ground Simulator</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider text-purple-400">
                    Pillar 1: 1080p 60 FPS Simulation Video Capture
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-400 list-disc pl-4">
                    <li>Direct canvas capture stream at locked 60 FPS via hardware-accelerated MediaRecorder.</li>
                    <li>Muxes Web Audio spatial acoustics (3D rain, wind resonance, distant thunder) into single video file.</li>
                    <li>One-click export producing crystal-clear WebM/MP4 briefings for disaster ops.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider text-emerald-400">
                    Pillar 2: Station-Specific Procedural Biomes
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-400 list-disc pl-4">
                    <li>Mumbai Santacruz: Coastal mangrove basin with dynamic Arabian Sea wave foam.</li>
                    <li>Cherrapunji: 1,300m vertical sandstone escarpment with sheer cliff runoff cascades.</li>
                    <li>Lucknow: Alluvial Gomti basin with Horton soil infiltration dynamic mud pools.</li>
                    <li>Leh Ladakh: High-altitude cold desert with alpine scree and zero tree canopy.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider text-cyan-400">
                    Pillar 3: Gunn-Kinzer Raindrop Terminal Velocity
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-400 list-disc pl-4">
                    <li>Droplet velocity calculated from diameter: v(D) = 9.58 * (1 - exp(-(D/1.77)^1.147)).</li>
                    <li>Wind-vector shear tilts precipitation trajectories dynamically based on km/h and bearing.</li>
                    <li>Dynamic surface splattering creating secondary spray mist particles.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider text-amber-400">
                    Pillar 4: Cantilever Wind Drag & Spatial Acoustics
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-400 list-disc pl-4">
                    <li>Bending moment M proportional to v^2 applied to foliage and antenna towers.</li>
                    <li>Web Audio PannerNode HRTF spatial acoustic positioning for lightning strikes.</li>
                    <li>Koschmieder atmospheric optical extinction formula for thick fog and deluge haze.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STATION 3D GROUND SIM PLAN */}
          {activeTab === 'station_3d_plan' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/40">
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
                  <Mountain className="w-4 h-4 text-emerald-400" />
                  Station-Specific 3D Ground Simulator Ultra-Real Master Plan
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Detailed blueprint for transforming the 3D ground station simulator into a physically accurate, biome-specific digital twin.
                </p>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <strong className="text-emerald-400 block mb-1">Gunn-Kinzer Terminal Velocity & Raindrop Physics:</strong>
                  <span>Drops fall with mass-dependent terminal velocity (4.5 to 9.2 m/s), angled with wind shear vectors and producing ground splash crowns based on Weber number.</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <strong className="text-cyan-400 block mb-1">Cantilever Aerodynamic Wind Drag:</strong>
                  <span>Tree branches and foliage deflect according to aerodynamic drag moments proportional to velocity squared, reacting to squalls with realistic turbulence.</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <strong className="text-indigo-400 block mb-1">Quaternion Camera Smoothing (Slerp):</strong>
                  <span>Zero-gimbal camera transitions between Observer Eye-Level, Drone Aerial, AWS Tower, and Runoff Channel viewpoints to eliminate motion sickness.</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SYNOPTIC VIDEO SIM PLAN */}
          {activeTab === 'synoptic_video_plan' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-purple-500/40">
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
                  <Film className="w-4 h-4 text-purple-400" />
                  Synoptic Weather Event Simulator: Ultra-Real Video Generation Plan
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Blueprint for photorealistic volumetric cumulonimbus formations, 24-hour diurnal lighting, and 60 FPS 1080p video recording.
                </p>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <strong className="text-purple-400 block mb-1">Volumetric Raymarching & Henyey-Greenstein Scattering:</strong>
                  <span>Light attenuation through cloud moisture droplets using Beer-Lambert extinction and forward phase scattering for luminous silver linings and dark squall bases.</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <strong className="text-amber-400 block mb-1">24-Hour Diurnal Meteorological Evolution:</strong>
                  <span>Simulates the diurnal cycle: 06:00 golden sunrise mist &rarr; 11:00 convective thermals &rarr; 15:30 squall gust front &rarr; 18:00 cloudburst sheets &rarr; 23:00 calm post-vortex drizzle.</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <strong className="text-cyan-400 block mb-1">MediaRecorder 1080p 60 FPS Export:</strong>
                  <span>Direct hardware canvas stream capture with synchronized Web Audio barometric audio (wind howl, thunderclaps, rain sheets).</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: QRF PLAN */}
          {activeTab === 'qrf_plan' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/40">
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  Interactive QRF (Quantile Regression Forests) Enhancement Plan
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Probabilistic rainfall forecasting with asymmetric pinball loss, non-crossing quantile sorting, and interactive risk threshold sliders.
                </p>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <strong className="text-cyan-400 block mb-1">Asymmetric Pinball Loss & Tail Sensitivity:</strong>
                  <span>Heavily penalizes underpredicting extreme deluges at q90/q95 while filtering out global NWP drizzle bias at q10.</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <strong className="text-emerald-400 block mb-1">Draggable CDF/PDF Threshold Explorer:</strong>
                  <span>Allows forecasters to drag an exceedance threshold slider to immediately calculate the probability of exceeding IMD warning gates (e.g. P(Rain &gt; 64.5mm)).</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SMOOTHNESS PLAN */}
          {activeTab === 'smoothness_plan' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/40">
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  120 FPS Fluidity & Animation Master Plan
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Rigorous 8.33ms per-frame budget, critically damped harmonic springs, and GPU compositing rules.
                </p>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <strong className="text-amber-400 block mb-1">Critically Damped Harmonic Oscillator:</strong>
                  <span>Second-order differential equation solver eliminating stutter and overshoot across all UI animations.</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <strong className="text-cyan-400 block mb-1">Dedicated Mathematical Web Worker:</strong>
                  <span>Offloads St-GNN Chebyshev spectral convolutions and Kriging interpolation off the main browser thread.</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: REAL DATA PLAN */}
          {activeTab === 'real_data_plan' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-teal-500/40">
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-teal-400" />
                  Real Meteorological Data Ingestion Master Plan
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Multi-tier data ingestion replacing synthetic datasets with authentic IMD 0.25° archives, operational ECMWF IFS 0.25°, and rain gauge telemetry.
                </p>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <strong className="text-teal-400 block mb-1">Tiered IndexedDB Client-Side Cache:</strong>
                  <span>Stores multi-megabyte station forecasts with 3-hour live TTL and 30-day historical archive TTL for instant offline performance.</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <strong className="text-emerald-400 block mb-1">Live Operational NWP Bridge:</strong>
                  <span>Queries ECMWF IFS 0.25° and Open-Meteo in-situ AWS rain gauges in parallel for all 30+ IMD stations.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Footer Actions */}
        <div className="flex flex-wrap items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/80 text-xs gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Interactive Master Plans Studio active on <strong className="text-slate-200">SAMVARTAKA AI</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                window.dispatchEvent(new CustomEvent('open-dual-swipe-modal'));
              }}
              className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 font-semibold cursor-pointer transition-all"
            >
              Launch NWP Split Swipe
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer transition-all shadow-md"
            >
              Close Studio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
