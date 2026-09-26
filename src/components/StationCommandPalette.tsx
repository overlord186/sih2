import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MET_STATIONS } from '../data/monsoonDataset';
import { Search, MapPin, Compass, ArrowRight, CornerDownLeft, X, Layers } from 'lucide-react';

interface StationCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStationId: string;
  onSelectStation: (id: string) => void;
}

export const StationCommandPalette: React.FC<StationCommandPaletteProps> = ({
  isOpen,
  onClose,
  selectedStationId,
  onSelectStation,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter stations based on query
  const filteredStations = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      return [
        { id: 'ALL', name: 'All Stations (National Climatological Mosaic)', subdivision: 'Pan-India (40 Subdivisions)', state: 'India', climateZone: 'All Synoptic Regimes', elevationM: 0 },
        ...MET_STATIONS
      ];
    }

    const matches = MET_STATIONS.filter(stn => {
      return (
        stn.name.toLowerCase().includes(q) ||
        stn.subdivision.toLowerCase().includes(q) ||
        stn.state.toLowerCase().includes(q) ||
        stn.id.toLowerCase().includes(q) ||
        (stn.climateZone && stn.climateZone.toLowerCase().includes(q))
      );
    });

    if ('all stations'.includes(q) || 'national'.includes(q) || 'pan-india'.includes(q)) {
      return [
        { id: 'ALL', name: 'All Stations (National Climatological Mosaic)', subdivision: 'Pan-India (40 Subdivisions)', state: 'India', climateZone: 'All Synoptic Regimes', elevationM: 0 },
        ...matches
      ];
    }

    return matches;
  }, [query]);

  // Clamp selected index
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredStations]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredStations.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredStations.length) % Math.max(1, filteredStations.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredStations[selectedIndex]) {
          onSelectStation(filteredStations[selectedIndex].id);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredStations, selectedIndex, onSelectStation, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-150 ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-950/50">
          <Search className="w-5 h-5 text-indigo-400 absolute left-4 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to Met Station... (e.g. 'Mumbai', 'Cherrapunji', 'Konkan', 'Kerala')"
            className="w-full bg-transparent pl-8 pr-10 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none"
          />
          {query ? (
            <button 
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-slate-800 border border-slate-700 rounded shadow-xs">
              ESC
            </kbd>
          )}
        </div>

        {/* Quick Highlights / Shortcuts */}
        <div className="px-4 py-2 bg-slate-950/30 border-b border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5 font-medium">
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            {filteredStations.length} Meteorological Observatories
          </span>
          <div className="hidden sm:flex items-center gap-2 text-slate-500 font-mono text-[10px]">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
        </div>

        {/* Results List */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-800/40 custom-scrollbar"
        >
          {filteredStations.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Compass className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-sm font-medium">No stations match "{query}"</p>
              <p className="text-xs text-slate-600 mt-1">Try searching by state (e.g. 'Maharashtra') or subdivision (e.g. 'Konkan')</p>
            </div>
          ) : (
            filteredStations.map((stn, idx) => {
              const isSelected = idx === selectedIndex;
              const isCurrent = stn.id === selectedStationId;

              return (
                <div
                  key={stn.id}
                  onClick={() => {
                    onSelectStation(stn.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-indigo-600/20 border border-indigo-500/40 text-white' 
                      : 'hover:bg-slate-800/50 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                      isSelected ? 'bg-indigo-500/30 text-indigo-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {stn.id === 'ALL' ? (
                        <Layers className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <MapPin className="w-4 h-4 text-sky-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white truncate">
                          {stn.name}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400 mt-0.5">
                        <span className="text-slate-300 font-medium">{stn.subdivision}</span>
                        {stn.state && stn.state !== 'India' && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span>{stn.state}</span>
                          </>
                        )}
                        {stn.elevationM !== undefined && stn.elevationM > 0 && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="font-mono text-slate-400">{stn.elevationM}m elev</span>
                          </>
                        )}
                      </div>
                      {stn.climateZone && stn.climateZone !== 'All Synoptic Regimes' && (
                        <p className="text-[11px] text-sky-400/80 italic mt-0.5 truncate max-w-md">
                          {stn.climateZone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2 pl-3">
                    {isSelected && (
                      <span className="flex items-center gap-1 text-xs text-indigo-400 font-semibold">
                        <CornerDownLeft className="w-3.5 h-3.5" />
                        Select
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-950/70 border-t border-slate-800 text-center text-xs text-slate-400 flex items-center justify-between">
          <span>SAMVARTAKA AI Synoptic Network</span>
          <span className="text-slate-500 text-[11px]">Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 font-mono">/</kbd> anytime to search</span>
        </div>
      </div>
    </div>
  );
};
