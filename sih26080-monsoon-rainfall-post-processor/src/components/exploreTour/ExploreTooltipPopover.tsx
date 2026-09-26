import React, { useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, 
  Calendar, 
  Mountain, 
  Compass, 
  CloudRain, 
  Layers, 
  Cpu, 
  Gauge, 
  Radar, 
  X, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  BookOpen,
  Info,
  ExternalLink
} from 'lucide-react';
import { useExploreTour } from './ExploreTourContext';

export const ExploreTooltipPopover: React.FC<{
  onTabChange?: (tab: string) => void;
}> = ({ onTabChange }) => {
  const {
    activeItem,
    activeAnchorRect,
    isFirstHover,
    seenIds,
    markAsSeen,
    unhoverItem,
    isMouseInsideTooltipRef,
    isWalkthroughActive,
    walkthroughIndex,
    totalCount,
    nextWalkthroughStep,
    prevWalkthroughStep,
    stopWalkthrough,
    openTourModal,
  } = useExploreTour();

  const popoverRef = useRef<HTMLDivElement>(null);

  // Compute icon
  const IconComponent = useMemo(() => {
    if (!activeItem) return Info;
    switch (activeItem.iconName) {
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
  }, [activeItem]);

  // Compute position relative to viewport
  const positionStyles = useMemo(() => {
    if (!activeAnchorRect) {
      // Centered fallback
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed' as const,
      };
    }

    const margin = 12;
    const tooltipWidth = Math.min(460, window.innerWidth - 32);
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Prefer positioning below unless too close to bottom
    const spaceBelow = viewportHeight - activeAnchorRect.bottom;
    const spaceAbove = activeAnchorRect.top;
    const placeAbove = spaceBelow < 320 && spaceAbove > spaceBelow;

    let top: number;
    if (placeAbove) {
      top = Math.max(16, activeAnchorRect.top - margin - 380);
    } else {
      top = Math.min(viewportHeight - 380, activeAnchorRect.bottom + margin);
    }

    // Horizontal centering relative to element, clamped to viewport
    const elementCenter = activeAnchorRect.left + activeAnchorRect.width / 2;
    let left = elementCenter - tooltipWidth / 2;
    left = Math.max(16, Math.min(viewportWidth - tooltipWidth - 16, left));

    return {
      top: `${Math.max(12, top)}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      position: 'fixed' as const,
    };
  }, [activeAnchorRect]);

  if (!activeItem) return null;

  const isExplored = seenIds.has(activeItem.id);

  const handleDismiss = () => {
    markAsSeen(activeItem.id);
    if (isWalkthroughActive) {
      stopWalkthrough();
    } else {
      unhoverItem(true, true);
    }
  };

  const handleMarkSeenAndNext = () => {
    markAsSeen(activeItem.id);
    if (isWalkthroughActive) {
      if (walkthroughIndex === totalCount - 1) {
        stopWalkthrough();
      } else {
        nextWalkthroughStep(onTabChange);
      }
    } else {
      unhoverItem(true, true);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 pointer-events-none z-[9999]"
        style={{ overflow: 'visible' }}
      >
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={positionStyles}
          onMouseEnter={() => {
            isMouseInsideTooltipRef.current = true;
          }}
          onMouseLeave={() => {
            isMouseInsideTooltipRef.current = false;
            unhoverItem();
          }}
          className="pointer-events-auto bg-slate-900/95 border border-sky-500/40 text-slate-100 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_25px_rgba(6,182,212,0.25)] backdrop-blur-xl p-4 sm:p-5 flex flex-col gap-3.5 max-h-[85vh] overflow-y-auto select-text font-sans"
        >
          {/* Header Bar */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-gradient-to-r from-blue-600/30 to-cyan-500/30 border border-sky-500/40 text-sky-300 font-bold text-[10px] uppercase font-mono tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-sky-400 animate-pulse" />
                <span>Explore UI • Synoptic Tour</span>
              </span>

              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                {activeItem.scale}
              </span>

              {isFirstHover && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold animate-bounce">
                  ✨ First Discovery!
                </span>
              )}
            </div>

            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Close contextual guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Title and Icon */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-600/30 to-indigo-600/20 border border-sky-500/30 flex items-center justify-center text-sky-300 shrink-0 shadow-sm">
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight leading-snug">
                {activeItem.title}
              </h3>
              <p className="text-xs text-sky-300/90 font-mono mt-0.5">
                {activeItem.meteorologicalSignificance.primaryAtmosphericLaw}
              </p>
            </div>
          </div>

          {/* Core Concept Banner */}
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-200 leading-relaxed font-medium">
            {activeItem.meteorologicalSignificance.coreConcept}
          </div>

          {/* Meteorological Significance Section */}
          <div className="space-y-2 text-xs">
            <div>
              <h4 className="font-bold text-sky-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5 mb-1 font-mono">
                <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                <span>Atmospheric Physics & Dynamics:</span>
              </h4>
              <p className="text-slate-300 text-[12px] leading-relaxed">
                {activeItem.meteorologicalSignificance.physicalDynamics}
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/30 text-rose-200">
              <div className="font-bold text-[10px] uppercase font-mono tracking-wider text-rose-300 mb-0.5">
                Why Standard NWP Fails Here:
              </div>
              <p className="text-[11px] text-slate-300 leading-normal">
                {activeItem.meteorologicalSignificance.whyNwpFails}
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-200">
              <div className="font-bold text-[10px] uppercase font-mono tracking-wider text-emerald-300 mb-0.5">
                Operational Forecaster Impact:
              </div>
              <p className="text-[11px] text-slate-300 leading-normal">
                {activeItem.meteorologicalSignificance.operationalImpact}
              </p>
            </div>
          </div>

          {/* Interaction Tip */}
          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-1.5">
            <span className="font-bold text-sky-400 uppercase tracking-wider text-[10px] font-mono shrink-0">Tip:</span>
            <span>{activeItem.interactionHint}</span>
          </div>

          {/* Footer Controls & Progress */}
          <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openTourModal}
                className="text-[11px] text-sky-400 hover:text-sky-300 underline font-medium cursor-pointer flex items-center gap-1"
              >
                <span>Tour Directory</span>
                <ExternalLink className="w-3 h-3" />
              </button>

              <span className="text-slate-600 text-xs">•</span>

              <span className="text-[10px] text-slate-400 font-mono">
                {seenIds.size} of {totalCount} Explored
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {isWalkthroughActive && (
                <>
                  <button
                    type="button"
                    onClick={() => prevWalkthroughStep(onTabChange)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                    title="Previous tour item"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => nextWalkthroughStep(onTabChange)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                    title="Next tour item"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              <button
                id="btn-explore-got-it"
                type="button"
                onClick={handleMarkSeenAndNext}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 ${
                  isExplored
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black shadow-sky-500/20'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isWalkthroughActive ? (walkthroughIndex === totalCount - 1 ? 'Finish Tour' : 'Next Step') : isExplored ? 'Got it' : 'Mark Explored'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
