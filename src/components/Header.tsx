import React, { useState, useEffect } from 'react';
import { CloudRain, Compass, Calendar, Gauge, Cpu, BookOpen, Layers, History, HelpCircle, Download, Briefcase, Sparkles, Volume2, VolumeX, ArrowUpRight, Bot, MessageSquare, Moon, Printer, FileText, Upload } from 'lucide-react';
import { MET_STATIONS } from '../data/monsoonDataset';

export type NavigationTab =
  | 'dashboard'
  | 'regimes'
  | 'probabilities'
  | 'districts'
  | 'verification'
  | 'uploader'
  | 'predictor'
  | 'planner'
  | 'methodology'
  | 'help';

interface HeaderProps {
  selectedStationId: string;
  onStationChange: (id: string) => void;
  selectedLeadTime: number; // 0 = all, 1, 2, 3
  onLeadTimeChange: (lead: number) => void;
  selectedYear: number; // 0 = all, 2024, 2023
  onYearChange: (year: number) => void;
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  totalSamples: number;
  onDownloadReport?: () => void;
  onOpenBulletin?: () => void;
  onReplayIntro?: () => void;
  isAudioMuted?: boolean;
  onToggleAudio?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedStationId,
  onStationChange,
  selectedLeadTime,
  onLeadTimeChange,
  selectedYear,
  onYearChange,
  activeTab,
  onTabChange,
  totalSamples,
  onDownloadReport,
  onOpenBulletin,
  onReplayIntro,
  isAudioMuted,
  onToggleAudio,
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isNightMode, setIsNightMode] = useState(() => document.body.classList.contains('dark-black-font-mode'));

  const toggleNightMode = () => {
    const next = !isNightMode;
    setIsNightMode(next);
    if (next) {
      document.body.classList.add('dark-black-font-mode');
    } else {
      document.body.classList.remove('dark-black-font-mode');
    }
  };

  useEffect(() => {
    const handleChatState = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.isOpen === 'boolean') {
        setIsChatOpen(customEvent.detail.isOpen);
      }
    };
    window.addEventListener('chat-assistant-state', handleChatState);
    return () => window.removeEventListener('chat-assistant-state', handleChatState);
  }, []);

  return (
    <header id="app-header" className="bg-slate-900 border-b border-slate-800 text-white">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mt-1">
              <CloudRain className="w-7 h-7" />
            </div>
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
                    ? 'Multi-Season Benchmark (2023 - 2025)'
                    : selectedYear === 2025
                    ? '2025 Operational Season (June - Sept)'
                    : selectedYear === 2024
                    ? '2024 Season (June - Sept)'
                    : '2023 Historical Benchmark (June - Sept)'}
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

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <div className="flex items-center bg-slate-800/80 p-1 rounded-lg border border-slate-700/80 flex-wrap gap-1">
            <button
              id="tab-dashboard-btn"
              onClick={() => onTabChange('dashboard')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
            <button
              id="tab-regimes-btn"
              onClick={() => onTabChange('regimes')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'regimes'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Regime Classifier</span>
            </button>
            <button
              id="tab-probabilities-btn"
              onClick={() => onTabChange('probabilities')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'probabilities'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <CloudRain className="w-3.5 h-3.5 text-amber-400" />
              <span>Heavy Rain Probability</span>
            </button>
            <button
              id="tab-districts-btn"
              onClick={() => onTabChange('districts')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'districts'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>District Products</span>
            </button>
            <button
              id="tab-verification-btn"
              onClick={() => onTabChange('verification')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'verification'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verification Report</span>
            </button>
            <button
              id="tab-uploader-btn"
              onClick={() => onTabChange('uploader')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'uploader'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-purple-300" />
              <span>Batch NWP Pipeline</span>
            </button>
            <button
              id="tab-predictor-btn"
              onClick={() => onTabChange('predictor')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'predictor'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Live Predictor</span>
            </button>
            <button
              id="tab-planner-btn"
              onClick={() => onTabChange('planner')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'planner'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>AI Planner</span>
            </button>
            <button
              id="tab-help-btn"
              onClick={() => onTabChange('help')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'help'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Methodology</span>
            </button>

            <button
              id="header-open-chat-btn"
              onClick={() => window.dispatchEvent(new CustomEvent('toggle-chat-assistant'))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all border cursor-pointer ${
                isChatOpen
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)] ring-2 ring-blue-400/40'
                  : 'bg-slate-700/60 hover:bg-slate-700 border-slate-600/60 text-blue-300 hover:text-white'
              }`}
              title="Open SAMVARTAKA AI Meteorological Assistant Chat"
            >
              <Bot className="w-3.5 h-3.5 text-blue-400" />
              <span>AI Meteorologist</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>
          </div>
          {onToggleAudio && (
            <button
               onClick={onToggleAudio}
               className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm border transition-all cursor-pointer ${
                 isAudioMuted
                   ? 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-400'
                   : 'bg-emerald-950/60 hover:bg-emerald-900/60 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
               }`}
               title={isAudioMuted ? "Enable Ambient Weather Audio" : "Mute Ambient Weather Audio"}
            >
               {isAudioMuted ? (
                 <VolumeX className="w-3.5 h-3.5 text-slate-400" />
               ) : (
                 <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
               )}
               <span className="hidden sm:inline">{isAudioMuted ? 'Sound Off' : 'Sound On'}</span>
            </button>
          )}
          <button
             onClick={toggleNightMode}
             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm border transition-all cursor-pointer ${
               isNightMode
                 ? 'bg-purple-950/80 hover:bg-purple-900 border-purple-500 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.4)] ring-2 ring-purple-500/40'
                 : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300'
             }`}
             title="Toggle Webpage Night Mode"
          >
             <Moon className={`w-3.5 h-3.5 ${isNightMode ? 'text-purple-300' : 'text-slate-400'}`} />
             <span className="hidden sm:inline">{isNightMode ? 'Night Active' : 'Night Mode'}</span>
          </button>
          {onOpenBulletin && (
            <button
               onClick={onOpenBulletin}
               className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700/80 hover:bg-blue-600 border border-blue-500/80 text-white rounded-md text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
               title="Generate Official IMD National Weather Bulletin Text"
            >
               <FileText className="w-3.5 h-3.5 text-blue-200" />
               <span className="hidden sm:inline">IMD Bulletin</span>
            </button>
          )}
          {activeTab === 'dashboard' && (
            <div className="flex items-center gap-1.5">
              <button
                 onClick={() => {
                   window.print();
                 }}
                 className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 hover:text-white rounded-md text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95"
                 title="Open Browser Print Dialog to Print Page or Save as PDF"
              >
                 <Printer className="w-3.5 h-3.5 text-cyan-400" />
                 <span className="hidden sm:inline">Print / Save PDF</span>
              </button>
              {onDownloadReport && (
                <button
                   onClick={onDownloadReport}
                   className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white rounded-md text-xs font-semibold shadow-sm transition-colors cursor-pointer active:scale-95"
                   title="Generate and Download Official PDF Forecast Dossier"
                >
                   <Download className="w-3.5 h-3.5 text-indigo-200" />
                   <span className="hidden sm:inline">Download Dossier</span>
                </button>
              )}
            </div>
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

            {/* Station Filter */}
            <div className="flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400 font-medium">Met Station:</span>
              <select
                id="station-filter-select"
                value={selectedStationId}
                onChange={(e) => onStationChange(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value="ALL">All Stations ({MET_STATIONS.length} Meteorological Subdivisions)</option>
                {MET_STATIONS.map((stn) => (
                  <option key={stn.id} value={stn.id}>
                    {stn.name} — {stn.subdivision}
                  </option>
                ))}
              </select>
            </div>

            {/* Lead Time Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400 font-medium">Lead Time:</span>
              <div className="inline-flex rounded-md shadow-xs bg-slate-800 p-0.5 border border-slate-700">
                <button
                  id="lead-all-btn"
                  onClick={() => onLeadTimeChange(0)}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                    selectedLeadTime === 0
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Leads
                </button>
                <button
                  id="lead-d1-btn"
                  onClick={() => onLeadTimeChange(1)}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                    selectedLeadTime === 1
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Day +1
                </button>
                <button
                  id="lead-d2-btn"
                  onClick={() => onLeadTimeChange(2)}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                    selectedLeadTime === 2
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Day +2
                </button>
                <button
                  id="lead-d3-btn"
                  onClick={() => onLeadTimeChange(3)}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                    selectedLeadTime === 3
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Day +3
                </button>
              </div>
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
