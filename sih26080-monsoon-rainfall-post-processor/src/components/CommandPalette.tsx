import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MET_STATIONS } from '../data/monsoonDataset';
import {
  Search,
  Command,
  MapPin,
  Wind,
  Layers,
  Radio,
  Eye,
  ShieldCheck,
  FileText,
  Activity,
  Zap,
  Globe,
  Sliders,
  Sparkles,
  ArrowLeftRight,
  X,
  CornerDownLeft,
  FileCode2,
} from 'lucide-react';

export interface CommandItem {
  id: string;
  category: 'STATIONS' | 'LAYERS' | 'DIAGNOSTICS' | 'SCENARIOS' | 'EXPORT';
  title: string;
  subtitle?: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStation?: (stationId: string) => void;
  onTriggerAction?: (actionId: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectStation,
  onTriggerAction,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Focus input whenever opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Master Command Registry
  const commands: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [];

    // 1. Meteorological Stations
    for (const station of MET_STATIONS) {
      items.push({
        id: `station-${station.id}`,
        category: 'STATIONS',
        title: station.name,
        subtitle: `${station.subdivision}, ${station.state} (${station.elevationM}m) — ${station.climateZone}`,
        icon: <MapPin className="w-4 h-4 text-cyan-400" />,
        action: () => {
          if (onSelectStation) onSelectStation(station.id);
          onClose();
        },
      });
    }

    // 2. Geospatial Layers
    items.push(
      {
        id: 'toggle-wind-streamlines',
        category: 'LAYERS',
        title: 'Toggle RK2 Wind Streamlines',
        subtitle: 'Lagrangian 2D particle vector advection field',
        shortcut: 'W',
        icon: <Wind className="w-4 h-4 text-cyan-400" />,
        action: () => {
          if (onTriggerAction) onTriggerAction('toggle-wind-streamlines');
          onClose();
        },
      },
      {
        id: 'layer-kriging',
        category: 'LAYERS',
        title: 'Switch to Continuous Kriging Surface',
        subtitle: 'Matérn 3/2 Gaussian Process with DEM elevation drift',
        shortcut: 'K',
        icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
        action: () => {
          if (onTriggerAction) onTriggerAction('layer-kriging');
          onClose();
        },
      },
      {
        id: 'layer-radar',
        category: 'LAYERS',
        title: 'Switch to Doppler Radar Reflectivity',
        subtitle: 'S-band Doppler sweep (dBZ) and storm motion',
        shortcut: 'D',
        icon: <Radio className="w-4 h-4 text-rose-400" />,
        action: () => {
          if (onTriggerAction) onTriggerAction('layer-radar');
          onClose();
        },
      },
      {
        id: 'layer-satellite',
        category: 'LAYERS',
        title: 'Switch to INSAT-3DR Satellite Infrared',
        subtitle: 'Thermal IR & Water Vapor WV 6.7µm multispectral channels',
        shortcut: 'S',
        icon: <Eye className="w-4 h-4 text-purple-400" />,
        action: () => {
          if (onTriggerAction) onTriggerAction('layer-satellite');
          onClose();
        },
      }
    );

    // 3. Diagnostics & Quality Control
    items.push(
      {
        id: 'open-master-plans',
        category: 'DIAGNOSTICS',
        title: 'Open Architectural Master Plans & Evolution Studio',
        subtitle: 'Multi-round comparative planning, physical grounding, and redesign roadmaps',
        shortcut: 'M',
        icon: <FileCode2 className="w-4 h-4 text-indigo-400" />,
        action: () => {
          window.dispatchEvent(new CustomEvent('open-master-plans-modal'));
          onClose();
        },
      },
      {
        id: 'open-dual-swipe',
        category: 'DIAGNOSTICS',
        title: 'Open Dual-Viewport Split-Screen Swipe (UI-MP 3)',
        subtitle: 'Pixel-level NWP vs AI comparative inspection with draggable clip-path',
        shortcut: 'V',
        icon: <ArrowLeftRight className="w-4 h-4 text-cyan-400" />,
        action: () => {
          if (onTriggerAction) onTriggerAction('open-dual-swipe');
          onClose();
        },
      },
      {
        id: 'open-sensor-qc',
        category: 'DIAGNOSTICS',
        title: 'Inspect Sensor QC & Buddy Check Panel',
        subtitle: 'Mahalanobis distance outlier gate & hardware anomaly detection',
        shortcut: 'Q',
        icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
        action: () => {
          if (onTriggerAction) onTriggerAction('open-sensor-qc');
          onClose();
        },
      },
      {
        id: 'open-model-stacking',
        category: 'DIAGNOSTICS',
        title: 'Open Multi-Model NWP Stacking Visualizer',
        subtitle: 'ECMWF IFS, NCMRWF NCUM, and IMD GFS Bayesian Model Averaging',
        shortcut: 'M',
        icon: <Layers className="w-4 h-4 text-blue-400" />,
        action: () => {
          if (onTriggerAction) onTriggerAction('open-model-stacking');
          onClose();
        },
      },
      {
        id: 'open-hydrology-routing',
        category: 'DIAGNOSTICS',
        title: 'Inspect Catchment Hydrological Inundation',
        subtitle: 'Nash IUH unit hydrograph & street ponding matrix',
        shortcut: 'H',
        icon: <Activity className="w-4 h-4 text-amber-400" />,
        action: () => {
          if (onTriggerAction) onTriggerAction('open-hydrology-routing');
          onClose();
        },
      }
    );

    // 4. Operational Scenarios
    items.push(
      {
        id: 'scenario-heavy-convective',
        category: 'SCENARIOS',
        title: 'Simulate Torrential Monsoon Deluge (>64.5mm)',
        subtitle: 'Active trough trigger with 998 hPa and 94% moisture saturation',
        icon: <Zap className="w-4 h-4 text-rose-400" />,
        action: () => {
          if (onTriggerAction) onTriggerAction('scenario-heavy-convective');
          onClose();
        },
      },
      {
        id: 'scenario-dry-break',
        category: 'SCENARIOS',
        title: 'Simulate Monsoon Break Spell (<2.5mm)',
        subtitle: 'Ridge subsidence with 1012 hPa and reduced moisture flux',
        icon: <Sliders className="w-4 h-4 text-amber-400" />,
        action: () => {
          if (onTriggerAction) onTriggerAction('scenario-dry-break');
          onClose();
        },
      }
    );

    // 5. Bulletin Export
    items.push({
      id: 'export-imd-bulletin',
      category: 'EXPORT',
      title: 'Generate Official IMD Weather Advisory Bulletin',
      subtitle: 'CAP-compliant dissemination payload with threshold alerts',
      shortcut: 'E',
      icon: <FileText className="w-4 h-4 text-purple-400" />,
      action: () => {
        if (onTriggerAction) onTriggerAction('export-imd-bulletin');
        onClose();
      },
    });

    return items;
  }, [onSelectStation, onTriggerAction, onClose]);

  // Filter commands by search term
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const lower = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(lower) ||
        (cmd.subtitle && cmd.subtitle.toLowerCase().includes(lower)) ||
        cmd.category.toLowerCase().includes(lower)
    );
  }, [commands, query]);

  // Keyboard navigation within palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? Math.max(0, filteredCommands.length - 1) : prev - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

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
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 sm:pt-28 px-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/50 overflow-hidden text-slate-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-900/90 gap-3">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search stations, river basins, NWP layers, or operational commands..."
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder-slate-400 outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Command List */}
        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto p-2 space-y-1 divide-y divide-slate-800/40"
        >
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No matching meteorological stations or commands found for "{query}"
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-950/50 border border-cyan-500/50 text-white shadow-md'
                      : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {cmd.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white truncate">
                          {cmd.title}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-mono uppercase bg-slate-800 text-slate-400 border border-slate-700">
                          {cmd.category}
                        </span>
                      </div>
                      {cmd.subtitle && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {cmd.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-3">
                    {cmd.shortcut && (
                      <kbd className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-mono border border-slate-700">
                        {cmd.shortcut}
                      </kbd>
                    )}
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Hotkey Cheatsheet */}
        <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Use <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">↑</kbd>{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">↵</kbd> to select
            </span>
          </div>
          <div>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">ESC</kbd> to exit
          </div>
        </div>
      </div>
    </div>
  );
};
