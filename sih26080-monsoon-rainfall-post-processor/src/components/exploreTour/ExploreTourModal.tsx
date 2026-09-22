import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Compass, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  RotateCcw, 
  Globe, 
  Calendar, 
  Mountain, 
  CloudRain, 
  Layers, 
  Cpu, 
  Gauge, 
  Radar, 
  Info,
  BookOpen,
  Play
} from 'lucide-react';
import { EXPLORE_TOUR_ITEMS, ExploreTourItem } from './exploreTourData';
import { useExploreTour } from './ExploreTourContext';

export const ExploreTourModal: React.FC<{
  onTabChange?: (tab: string) => void;
}> = ({ onTabChange }) => {
  const {
    isTourModalOpen,
    closeTourModal,
    seenIds,
    resetTour,
    inspectItem,
    startWalkthrough,
    isExploreMode,
    toggleExploreMode,
  } = useExploreTour();

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  if (!isTourModalOpen) return null;

  const categories = [
    'ALL',
    'Planetary & Synoptic',
    'Temporal Dynamics',
    'Microscale & Ground',
    'Regional Networks',
    'Machine Learning & Verification',
  ];

  const filteredItems = selectedCategory === 'ALL'
    ? EXPLORE_TOUR_ITEMS
    : EXPLORE_TOUR_ITEMS.filter((item) => item.category === selectedCategory);

  const exploredCount = seenIds.size;
  const totalCount = EXPLORE_TOUR_ITEMS.length;
  const percentComplete = Math.round((exploredCount / totalCount) * 100);

  const getIcon = (name: string) => {
    switch (name) {
      case 'Globe': return Globe;
      case 'Calendar': return Calendar;
      case 'Mountain': return Mountain;
      case 'Compass': return Compass;
      case 'CloudRain': return CloudRain;
      case 'Layers': return Layers;
      case 'Cpu': return Cpu;
      case 'Gauge': return Gauge;
      case 'Radar': return Radar;
      default: return Info;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 text-slate-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Top Banner Header */}
          <div className="p-6 bg-gradient-to-r from-slate-900 via-blue-950/60 to-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/25 shrink-0">
                <Compass className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold uppercase font-mono tracking-wider">
                    Interactive Meteorological Guide
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {exploredCount}/{totalCount} Discovered ({percentComplete}%)
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                  Explore UI: Synoptic Tour System
                </h2>
                <p className="text-xs text-slate-400">
                  Hover over key interactive elements or teleport directly to understand their atmospheric physics & meteorological significance.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => startWalkthrough(onTabChange)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs transition-all shadow-md shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Walkthrough</span>
              </button>
              <button
                type="button"
                onClick={closeTourModal}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close guide"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Progress Bar & Preferences Bar */}
          <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <span className="font-mono text-[11px] text-slate-400 whitespace-nowrap">
                Tour Progress:
              </span>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentComplete}%` }}
                />
              </div>
              <span className="font-mono text-[11px] font-bold text-cyan-300">
                {percentComplete}%
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={toggleExploreMode}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isExploreMode
                    ? 'bg-cyan-950/50 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Explore Hover Mode: {isExploreMode ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={resetTour}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                title="Reset all explored markers to experience first hover tooltips again"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                <span>Reset Tour</span>
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="px-6 py-2.5 bg-slate-900 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Items List */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map((item) => {
                const isSeen = seenIds.has(item.id);
                const ItemIcon = getIcon(item.iconName);

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 transition-all flex flex-col justify-between gap-3 text-left ${
                      isSeen
                        ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        : 'bg-gradient-to-br from-slate-900 via-blue-950/20 to-slate-900 border-cyan-500/30 hover:border-cyan-500/60 shadow-sm'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            isSeen
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          }`}>
                            <ItemIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                              {item.category}
                            </span>
                            <h4 className="font-bold text-sm text-white leading-tight">
                              {item.title}
                            </h4>
                          </div>
                        </div>

                        {isSeen ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Explored</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold flex items-center gap-1 shrink-0 animate-pulse">
                            <Sparkles className="w-3 h-3 text-cyan-300" />
                            <span>Discover</span>
                          </span>
                        )}
                      </div>

                      {/* Meteorological Concept */}
                      <div className="text-xs text-cyan-300/90 font-mono font-medium mb-1.5">
                        {item.meteorologicalSignificance.primaryAtmosphericLaw}
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-3 mb-2 leading-relaxed">
                        {item.meteorologicalSignificance.physicalDynamics}
                      </p>

                      <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-400 leading-snug">
                        <span className="font-bold text-slate-300">Key Law: </span>
                        {item.keyTakeaway}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-500 font-mono">
                        Scale: {item.scale}
                      </span>
                      <button
                        type="button"
                        onClick={() => inspectItem(item.id, onTabChange)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <span>Teleport & Inspect</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Note */}
          <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>SAMVARTAKA AI Synoptic Post-Processor • Rigorous IMD Meteorological Physics</span>
            </span>
            <span className="font-mono text-slate-500">
              Hover over highlighted elements anytime
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
