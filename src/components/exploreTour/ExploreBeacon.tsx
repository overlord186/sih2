import React from 'react';
import { Compass, Sparkles, Check } from 'lucide-react';
import { useExploreTour } from './ExploreTourContext';

interface ExploreBeaconProps {
  id: string;
  className?: string;
  size?: 'sm' | 'md';
  hideIfExplored?: boolean;
}

export const ExploreBeacon: React.FC<ExploreBeaconProps> = ({
  id,
  className = '',
  size = 'sm',
  hideIfExplored = false,
}) => {
  const { isExploreMode, seenIds, hoverItem, inspectItem } = useExploreTour();

  if (!isExploreMode) return null;

  const isSeen = seenIds.has(id);
  if (hideIfExplored && isSeen) return null;

  const isSmall = size === 'sm';

  return (
    <button
      type="button"
      data-explore-id={id}
      onClick={(e) => {
        e.stopPropagation();
        inspectItem(id);
      }}
      onMouseEnter={(e) => {
        hoverItem(id, e.currentTarget);
      }}
      className={`inline-flex items-center gap-1 rounded-full transition-all cursor-pointer select-none font-mono ${
        isSeen
          ? 'bg-slate-800/80 hover:bg-slate-700/80 text-emerald-400 border border-emerald-500/30'
          : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.3)] animate-pulse'
      } ${isSmall ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.8 text-[10px]'} ${className}`}
      title={isSeen ? 'Meteorological Significance (Explored)' : 'Discover Meteorological Significance'}
    >
      {isSeen ? (
        <Check className={isSmall ? 'w-2.5 h-2.5 text-emerald-400' : 'w-3 h-3 text-emerald-400'} />
      ) : (
        <Sparkles className={isSmall ? 'w-2.5 h-2.5 text-cyan-300' : 'w-3 h-3 text-cyan-300'} />
      )}
      <span className="font-bold tracking-tight">
        {isSeen ? 'Explored' : 'Tour'}
      </span>
    </button>
  );
};
