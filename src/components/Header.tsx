import React, { useState, useEffect, useMemo } from 'react';
import {
  CloudRain,
  Compass,
  Calendar,
  Gauge,
  Cpu,
  BookOpen,
  Layers,
  History,
  HelpCircle,
  Download,
  Briefcase,
  Sparkles,
  Volume2,
  VolumeX,
  ArrowUpRight,
  Bot,
  MessageSquare,
  Moon,
  Printer,
  FileText,
  Upload,
  Gamepad2,
  Globe,
  Trophy,
  Award,
  Flame,
  Search,
  X,
  Mountain,
  BrainCircuit,
  Activity,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { MET_STATIONS } from '../data/monsoonDataset';
import { DashboardEngineControls } from './DashboardEngineControls';
import { loadUserEngagement, UserEngagementState } from '../utils/achievements';
import { useExploreTour } from './exploreTour/ExploreTourContext';
import { ExploreBeacon } from './exploreTour/ExploreBeacon';

export type NavigationTab =
  | 'dashboard'
  | 'regimes'
  | 'probabilities'
  | 'districts'
  | 'verification'
  | 'diagnostics'
  | 'uploader'
  | 'predictor'
  | 'planner'
  | 'sandbox'
  | 'challenge'
  | 'achievements'
  | 'methodology'
  | 'help'
  | 'impact';

interface HeaderProps {
  selectedStationId: string;
  onStationChange: (id: string) => void;
  selectedLeadTime: number; // 0 = all, 1, 2, 3
  onLeadTimeChange: (lead: number) => void;
  selectedYear: number; // 0 = all, 2024, 2023
  onYearChange: (year: number) => void;
  selectedModelVersion: string;
  onModelVersionChange: (version: string) => void;
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  totalSamples: number;
  onDownloadReport?: () => void;
  onOpenBulletin?: () => void;
  onReplayIntro?: () => void;
  isAudioMuted?: boolean;
  onToggleAudio?: () => void;
  onOpenAchievements?: () => void;
  onOpenLocal3dSimulator?: (stationId: string) => void;
  onOpenTrainingGuide?: (tab?: 'explore' | 'ml_guide' | 'ml_trainer' | 'ui_spec') => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedStationId,
  onStationChange,
  selectedLeadTime,
  onLeadTimeChange,
  selectedYear,
  onYearChange,
  selectedModelVersion,
  onModelVersionChange,
  activeTab,
  onTabChange,
  totalSamples,
  onDownloadReport,
  onOpenBulletin,
  onReplayIntro,
  isAudioMuted,
  onToggleAudio,
  onOpenAchievements,
  onOpenLocal3dSimulator,
  onOpenTrainingGuide,
}) => {
  const [isNightMode, setIsNightMode] = useState(() => document.body.classList.contains('dark-black-font-mode'));
  const [stationSearchQuery, setStationSearchQuery] = useState<string>('');
  const { openTourModal, seenIds, totalCount } = useExploreTour();

  const filteredHeaderStations = useMemo(() => {
    const q = stationSearchQuery.trim().toLowerCase();
    const digitsOnly = q.replace(/[^0-9]/g, '');
    const parsedIndex = digitsOnly ? parseInt(digitsOnly, 10) : null;

    return MET_STATIONS.map((stn, idx) => ({
      ...stn,
      idx,
      regionIndex: idx + 1,
      paddedIndex: String(idx + 1).padStart(2, '0'),
    })).filter((stn) => {
      if (!q) return true;
      if (parsedIndex !== null && stn.regionIndex === parsedIndex) return true;
      const idxStr = String(stn.regionIndex);
      if (
        q === idxStr || 
        q === stn.paddedIndex || 
        q === `#${idxStr}` || 
        q === `#${stn.paddedIndex}` ||
        `#${stn.regionIndex}`.includes(q)
      ) {
        return true;
      }
      if (stn.name.toLowerCase().includes(q)) return true;
      if (stn.subdivision.toLowerCase().includes(q)) return true;
      if (stn.state.toLowerCase().includes(q)) return true;
      if (stn.id.toLowerCase().includes(q)) return true;
      if (stn.climateZone.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [stationSearchQuery]);

  return (
    <header id="app-header" className="bg-slate-900 border-b border-slate-800 text-white relative">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 text-xs font-bold tracking-wide rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  SAMVARTAKA AI
                </span>
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Verified ML Pipeline Active
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {selectedYear === 0
                    ? "Multi-Season Benchmark (2023 - 2025)"
                    : selectedYear === 2025
                    ? "2025 Operational Season (June - Sept)"
                    : selectedYear === 2024
                    ? "2024 Season (June - Sept)"
                    : "2023 Historical Benchmark (June - Sept)"}
                </span>

                {onReplayIntro && (
                  <button
                    id="replay-intro-showcase-btn"
                    onClick={onReplayIntro}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-900/80 via-fuchsia-900/70 to-indigo-900/80 hover:from-purple-800 hover:to-indigo-800 border border-purple-400/50 text-purple-200 text-xs font-bold shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-all hover:scale-105 active:scale-95 cursor-pointer ml-auto sm:ml-2"
                    title="Watch SAMVARTAKA AI Cinematic Intro (Twin Peaks & Cascading Waterfall)"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-300 animate-spin" />
                    <span>Intro Showcase</span>
                    <ArrowUpRight className="w-3 h-3 text-purple-300" />
                  </button>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1 flex flex-wrap items-center gap-2">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 font-black tracking-tight">
                  SAMVARTAKA AI
                </span>
                <span className="text-slate-500 font-normal hidden sm:inline">|</span>
                <span>Regime-Aware Rainfall Post-Processor</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Physics-informed machine learning post-processor eliminating NWP drizzle bias and resolving smoothed convective extremes
              </p>
            </div>
          </div>

          {/* Quick Header Status & Actions on the Right */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              id="header-ai-chat-btn"
              onClick={() => window.dispatchEvent(new CustomEvent('toggle-chat-assistant'))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600/30 via-indigo-600/30 to-purple-600/30 hover:from-blue-600/50 hover:to-indigo-600/50 border border-blue-500/40 hover:border-blue-400 text-blue-200 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
              title="Launch AI Meteorologist Assistant"
            >
              <Bot className="w-3.5 h-3.5 text-sky-400" />
              <span>AI Meteorologist</span>
            </button>
            {onOpenBulletin && (
              <button
                id="header-bulletin-quick-btn"
                onClick={onOpenBulletin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900/70 border border-blue-800/60 text-blue-200 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
                title="View Operational Weather Advisory Bulletin"
              >
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Advisory Bulletin</span>
              </button>
            )}
            {onDownloadReport && (
              <button
                id="header-dossier-quick-btn"
                onClick={onDownloadReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                title="Download IMD Meteorological Evaluation Dossier"
              >
                <Download className="w-3.5 h-3.5 text-indigo-300" />
                <span className="hidden sm:inline">Export Dossier</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Monsoon Season Year Filter (Recent vs Multi-Year) */}
            <div className="flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400 font-medium">Monsoon Season:</span>
              <div className="inline-flex rounded-md shadow-xs bg-slate-800 p-0.5 border border-slate-700">
                <button
                  id="year-2025-btn"
                  onClick={() => onYearChange(2025)}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-colors flex items-center gap-1 ${
                    selectedYear === 2025
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  2025 Season
                </button>
                <button
                  id="year-2024-btn"
                  onClick={() => onYearChange(2024)}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                    selectedYear === 2024
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  2024 Season
                </button>
                <button
                  id="year-2023-btn"
                  onClick={() => onYearChange(2023)}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                    selectedYear === 2023
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  2023 Season
                </button>
                <button
                  id="year-all-btn"
                  onClick={() => onYearChange(0)}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                    selectedYear === 0
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Combined (2023-2025)
                </button>
              </div>
            </div>

            {/* Station Filter with Quick Search & Command Palette Trigger */}
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-slate-400 font-medium whitespace-nowrap">Met Station:</span>

              {/* Station Search Input */}
              <div className="relative flex items-center">
                <Search className="w-3 h-3 text-slate-400 absolute left-2 pointer-events-none" />
                <input
                  id="header-station-search-input"
                  type="text"
                  value={stationSearchQuery}
                  onChange={(e) => setStationSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filteredHeaderStations.length > 0) {
                      onStationChange(filteredHeaderStations[0].id);
                    }
                  }}
                  placeholder="Filter name or #idx..."
                  className="w-24 sm:w-32 bg-slate-800 border border-slate-700 rounded-md pl-6 pr-5 py-1 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-medium transition-all"
                  title="Quickly search meteorological stations by name or region index (e.g. 'Mumbai', '#04', 'Konkan')"
                />
                {stationSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setStationSearchQuery('')}
                    className="absolute right-1 text-slate-400 hover:text-white cursor-pointer"
                    title="Clear filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Omnipresent Command Palette Jump Button */}
              <button
                type="button"
                id="header-station-palette-btn"
                onClick={() => window.dispatchEvent(new CustomEvent('open-station-search'))}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono font-medium transition-all cursor-pointer shrink-0"
                title="Press / or Ctrl+K to open Station Command Palette"
              >
                <Search className="w-3 h-3 text-sky-400" />
                <span className="hidden xl:inline text-[11px]">Jump</span>
                <kbd className="px-1 py-0.2 bg-slate-900 border border-slate-700 rounded text-[9px] text-slate-400 font-mono">/</kbd>
              </button>

              <select
                id="station-filter-select"
                value={selectedStationId}
                onChange={(e) => onStationChange(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-medium max-w-[150px] sm:max-w-[220px] truncate"
              >
                <option value="ALL">
                  All Stations {stationSearchQuery ? `(${filteredHeaderStations.length} of ${MET_STATIONS.length})` : `(${MET_STATIONS.length} Subdivisions)`}
                </option>
                {filteredHeaderStations.map((stn) => (
                  <option key={stn.id} value={stn.id}>
                    #{stn.paddedIndex} {stn.name} — {stn.subdivision}
                  </option>
                ))}
              </select>

              {onOpenLocal3dSimulator && (
                <button
                  type="button"
                  onClick={() => onOpenLocal3dSimulator(selectedStationId !== 'ALL' ? selectedStationId : 'BOM_SANTACRUZ')}
                  className="px-2 py-1 rounded bg-blue-600/30 hover:bg-blue-600 border border-blue-500/50 hover:border-blue-500 text-blue-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                  title="Experience selected station in 3D ground simulator"
                >
                  <Mountain className="w-3 h-3 text-sky-300" />
                  <span className="hidden xl:inline">3D Sim</span>
                </button>
              )}
            </div>

            {/* Lead Time Timeline Scrubber */}
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-slate-400 font-medium whitespace-nowrap">Timeline Scrubber:</span>
              
              <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700 shadow-inner">
                <button
                  type="button"
                  id="lead-prev-step-btn"
                  onClick={() => onLeadTimeChange(Math.max(0, selectedLeadTime - 1))}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  disabled={selectedLeadTime === 0}
                  title="Previous Lead Time Horizon"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>

                {[
                  { value: 0, label: 'All', horizon: 'Aggregate Climatology Horizon' },
                  { value: 1, label: 'Day +1', horizon: 'T+24h • Convective Extreme Resolution' },
                  { value: 2, label: 'Day +2', horizon: 'T+48h • Synoptic Moisture Shear Tracking' },
                  { value: 3, label: 'Day +3', horizon: 'T+72h • Monsoon Trough Lobe Evolution' },
                ].map((item) => {
                  const isActive = selectedLeadTime === item.value;
                  return (
                    <button
                      key={item.value}
                      id={`lead-step-${item.value}-btn`}
                      onClick={() => onLeadTimeChange(item.value)}
                      className={`relative px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white font-bold shadow-xs'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                      }`}
                      title={item.horizon}
                    >
                      <span>{item.label}</span>
                      {isActive && (
                        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-sky-300 shadow-xs shadow-sky-400" />
                      )}
                    </button>
                  );
                })}

                <button
                  type="button"
                  id="lead-next-step-btn"
                  onClick={() => onLeadTimeChange(Math.min(3, selectedLeadTime === 0 ? 1 : selectedLeadTime + 1))}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  disabled={selectedLeadTime === 3}
                  title="Next Lead Time Horizon"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* Dynamic Atmospheric Scale Indicator */}
              <span className="hidden xl:inline-block text-[10px] font-mono text-sky-300 bg-sky-950/40 border border-sky-800/40 px-2.5 py-0.5 rounded-full shadow-xs">
                {selectedLeadTime === 0 && 'Aggregate Horizon'}
                {selectedLeadTime === 1 && 'T+24h • Deep Convective'}
                {selectedLeadTime === 2 && 'T+48h • Moisture Flow'}
                {selectedLeadTime === 3 && 'T+72h • Trough Dynamics'}
              </span>
            </div>

            {/* Model Version Dropdown */}
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400 font-medium">Model:</span>
              <select
                value={selectedModelVersion}
                onChange={(e) => onModelVersionChange(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium max-w-[260px]"
              >
                <option value="v3.2">v3.2 (1901–2025 Climatology Ensemble - Active)</option>
                <option value="v3.1">v3.1 (Trained Quantile Model - 2023/24)</option>
                <option value="v3.0">v3.0 (Ensemble - Heuristic Baseline)</option>
                <option value="v2.0">v2.0 (Regime-Aware QRF)</option>
                <option value="v1.0">v1.0 (Linear Baseline)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Active Evaluation Sample: <strong className="text-white font-mono">{totalSamples}</strong> paired daily records
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
