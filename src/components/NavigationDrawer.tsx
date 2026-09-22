import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Gauge,
  Compass,
  CloudRain,
  Layers,
  Sparkles,
  Activity,
  Upload,
  Cpu,
  Briefcase,
  Globe,
  Flame,
  Award,
  HelpCircle,
  Bot,
  FileText,
  Mountain,
  BrainCircuit,
  Volume2,
  VolumeX,
  Moon,
  Printer,
  Download,
  Trophy,
  SlidersHorizontal,
  ChevronRight,
  ArrowUpRight,
  CheckCircle2,
  Search,
  LayoutGrid,
} from 'lucide-react';
import { NavigationTab } from './Header';
import { DashboardEngineControls } from './DashboardEngineControls';
import { UserEngagementState } from '../utils/achievements';
import { weatherSynth } from '../utils/audio';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  isAudioMuted?: boolean;
  onToggleAudio?: () => void;
  isNightMode?: boolean;
  onToggleNightMode?: () => void;
  onDownloadReport?: () => void;
  onOpenBulletin?: () => void;
  onReplayIntro?: () => void;
  onOpenAchievements?: () => void;
  onOpenLocal3dSimulator?: (stationId: string) => void;
  onOpenTrainingGuide?: (tab?: 'explore' | 'ml_guide' | 'ml_trainer' | 'ui_spec') => void;
  selectedStationId: string;
  engagement: UserEngagementState;
  unlockedBadgesCount: number;
  seenTourCount?: number;
  totalTourCount?: number;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  isAudioMuted,
  onToggleAudio,
  isNightMode,
  onToggleNightMode,
  onDownloadReport,
  onOpenBulletin,
  onReplayIntro,
  onOpenAchievements,
  onOpenLocal3dSimulator,
  onOpenTrainingGuide,
  selectedStationId,
  engagement,
  unlockedBadgesCount,
  seenTourCount = 0,
  totalTourCount = 12,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'views' | 'tools' | 'learning'>('all');

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSelectTab = (tab: NavigationTab) => {
    onTabChange(tab);
    if (!isAudioMuted) {
      weatherSynth.playRadarScanPing();
    }
    onClose();
  };

  const primaryViews: Array<{
    id: NavigationTab;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    badge?: string;
  }> = [
    {
      id: 'dashboard',
      label: 'Main Dashboard',
      description: 'Executive overview, real-time maps & forecast metrics',
      icon: Gauge,
      accentColor: 'text-blue-400',
      badge: 'Core View',
    },
    {
      id: 'regimes',
      label: 'Regime Classifier',
      description: 'IMD synoptic regime classification & rainfall regimes',
      icon: Compass,
      accentColor: 'text-sky-400',
    },
    {
      id: 'probabilities',
      label: 'Heavy Rain Probability',
      description: 'Extreme convective threshold probability engine',
      icon: CloudRain,
      accentColor: 'text-amber-400',
    },
    {
      id: 'districts',
      label: 'District Products',
      description: 'Sub-division & district level rainfall projections',
      icon: Layers,
      accentColor: 'text-cyan-400',
    },
    {
      id: 'verification',
      label: 'Verification Report',
      description: 'Skill scores, Brier score metrics & Taylor diagrams',
      icon: Sparkles,
      accentColor: 'text-emerald-400',
    },
    {
      id: 'diagnostics',
      label: 'ML Diagnostics',
      description: 'Model persistence skill, loss curves & quantile diagnostics',
      icon: Activity,
      accentColor: 'text-teal-400',
    },
  ];

  const interactiveTools: Array<{
    id: NavigationTab | '3d-ground';
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    action?: () => void;
    badge?: string;
  }> = [
    {
      id: 'sandbox',
      label: '3D Earth Observatory',
      description: 'Global 3D Earth, cyclone tracks & live station telemetry',
      icon: Globe,
      accentColor: 'text-cyan-300',
      badge: '3D WebGL',
    },
    {
      id: '3d-ground',
      label: '3D Ground Station Sim',
      description: 'Physical station environment with rain & micro-climate physics',
      icon: Mountain,
      accentColor: 'text-indigo-400',
      action: () => {
        if (onOpenLocal3dSimulator) {
          onOpenLocal3dSimulator(selectedStationId !== 'ALL' ? selectedStationId : 'BOM_SANTACRUZ');
        }
        onClose();
      },
      badge: 'Interactive',
    },
    {
      id: 'predictor',
      label: 'Live Predictor',
      description: 'Interactive NWP parameter sandbox & what-if simulator',
      icon: Cpu,
      accentColor: 'text-blue-400',
    },
    {
      id: 'uploader',
      label: 'Batch NWP Pipeline',
      description: 'Upload custom CSV datasets for automated ML post-processing',
      icon: Upload,
      accentColor: 'text-purple-400',
    },
    {
      id: 'impact',
      label: 'Socio-Economic Impact',
      description: 'Vulnerability mapping, crop alerts & infrastructure risks',
      icon: Briefcase,
      accentColor: 'text-amber-300',
    },
    {
      id: 'planner',
      label: 'AI Action Planner',
      description: 'Automated disaster response, evacuation & logistics protocols',
      icon: Briefcase,
      accentColor: 'text-emerald-300',
    },
  ];

  const learningGamification: Array<{
    id: NavigationTab | 'tour' | 'ui-spec' | 'ml-guide' | 'intro';
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    action?: () => void;
    badge?: string;
  }> = [
    {
      id: 'challenge',
      label: 'Daily Monsoon Challenge',
      description: 'Daily gamified forecast scenario with regime betting',
      icon: Flame,
      accentColor: 'text-orange-400',
      badge: `${engagement.currentStreak > 0 ? `${engagement.currentStreak}🔥 Streak` : 'Daily'}`,
    },
    {
      id: 'achievements',
      label: 'Achievements & Badges',
      description: `Meteorologist Rank (Lvl ${engagement.level}) • ${unlockedBadgesCount} unlocked`,
      icon: Trophy,
      accentColor: 'text-amber-400',
      action: onOpenAchievements,
      badge: `Lvl ${engagement.level}`,
    },
    {
      id: 'tour',
      label: 'Interactive UI Tour',
      description: 'Guided walkthrough of key meteorological visualizations',
      icon: Compass,
      accentColor: 'text-cyan-400',
      action: () => {
        if (onOpenTrainingGuide) onOpenTrainingGuide('explore');
        onClose();
      },
      badge: `${seenTourCount}/${totalTourCount}`,
    },
    {
      id: 'methodology',
      label: 'Scientific Methodology',
      description: 'Loss formulation, quantile physics & mathematical architecture',
      icon: HelpCircle,
      accentColor: 'text-slate-300',
    },
    {
      id: 'ml-guide',
      label: 'ML Training Guide',
      description: 'Neural weights visualizer and interactive training loop',
      icon: BrainCircuit,
      accentColor: 'text-emerald-400',
      action: () => {
        if (onOpenTrainingGuide) onOpenTrainingGuide('ml_guide');
        onClose();
      },
    },
    {
      id: 'ui-spec',
      label: 'Glassmorphic UI Spec',
      description: 'Architecture specifications and styling blueprints',
      icon: Sparkles,
      accentColor: 'text-cyan-300',
      action: () => {
        if (onOpenTrainingGuide) onOpenTrainingGuide('ui_spec');
        onClose();
      },
    },
    {
      id: 'intro',
      label: 'Replay Cinematic Intro',
      description: 'Twin Peaks 3D waterfall and atmospheric opening sequence',
      icon: Sparkles,
      accentColor: 'text-purple-400',
      action: () => {
        if (onReplayIntro) onReplayIntro();
        onClose();
      },
    },
  ];

  // Filtering based on search
  const q = filterQuery.trim().toLowerCase();
  const filterItem = (item: { label: string; description: string }) => {
    if (!q) return true;
    return (
      item.label.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    );
  };

  const filteredPrimary = primaryViews.filter(filterItem);
  const filteredTools = interactiveTools.filter(filterItem);
  const filteredLearning = learningGamification.filter(filterItem);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 pointer-events-auto"
          />

          {/* Left Slide-out Pop-up Panel */}
          <motion.div
            key="drawer-panel"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-y-0 left-0 w-[350px] sm:w-[410px] max-w-[92vw] bg-slate-900 border-r border-slate-700/80 shadow-[0_0_50px_rgba(0,0,0,0.8)] z-50 flex flex-col pointer-events-auto text-white overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
                  <SlidersHorizontal className="w-5 h-5 text-cyan-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-white tracking-tight uppercase font-mono">
                      Dashboard & Options
                    </h3>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      POP-UP
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Active: <strong className="text-cyan-300 font-mono capitalize">{activeTab}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded shadow-xs">
                  Esc
                </kbd>
                <button
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Close Navigation Drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Search & Category Filter Pills */}
            <div className="p-3 border-b border-slate-800/80 bg-slate-900/60 shrink-0 space-y-2">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Quick search dashboard views & tools..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                {filterQuery && (
                  <button
                    onClick={() => setFilterQuery('')}
                    className="absolute right-2.5 text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
                {[
                  { id: 'all', label: 'All', count: primaryViews.length + interactiveTools.length + learningGamification.length },
                  { id: 'views', label: 'Views', count: primaryViews.length },
                  { id: 'tools', label: 'Tools', count: interactiveTools.length },
                  { id: 'learning', label: 'Guides', count: learningGamification.length },
                ].map((pill) => {
                  const isSelected = activeCategory === pill.id;
                  return (
                    <button
                      key={pill.id}
                      onClick={() => setActiveCategory(pill.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60'
                      }`}
                    >
                      <span>{pill.label}</span>
                      <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                        isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-900/80 text-slate-400'
                      }`}>
                        {pill.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
              {/* SECTION 1: PRIMARY DASHBOARD & FORECASTS */}
              {(activeCategory === 'all' || activeCategory === 'views') && filteredPrimary.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800">
                    <span>Dashboards & Forecasts</span>
                    <span className="text-slate-400 font-normal">Primary Views</span>
                  </div>
                  <div className="space-y-1">
                    {filteredPrimary.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelectTab(item.id)}
                          className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-3 cursor-pointer group ${
                            isActive
                              ? 'bg-blue-600/20 border-blue-500/70 text-white shadow-md shadow-blue-500/10'
                              : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/70 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div
                            className={`p-2 rounded-lg shrink-0 mt-0.5 transition-colors ${
                              isActive
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700 group-hover:text-white'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.accentColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-xs text-white truncate">
                                {item.label}
                              </span>
                              {isActive ? (
                                <span className="flex items-center gap-1 text-[10px] text-cyan-300 font-mono font-semibold">
                                  <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                                  Active
                                </span>
                              ) : (
                                item.badge && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                                    {item.badge}
                                  </span>
                                )
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 2: INTERACTIVE SIMULATORS & ADVANCED TOOLS */}
              {(activeCategory === 'all' || activeCategory === 'tools') && filteredTools.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800">
                    <span>Interactive Simulators & AI Tools</span>
                    <span className="text-slate-400 font-normal">Engines</span>
                  </div>
                  <div className="space-y-1">
                    {filteredTools.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.action) {
                              item.action();
                            } else {
                              handleSelectTab(item.id as NavigationTab);
                            }
                          }}
                          className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-3 cursor-pointer group ${
                            isActive
                              ? 'bg-indigo-600/20 border-indigo-500/70 text-white shadow-md shadow-indigo-500/10'
                              : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/70 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div
                            className={`p-2 rounded-lg shrink-0 mt-0.5 transition-colors ${
                              isActive
                                ? 'bg-indigo-500 text-white'
                                : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700 group-hover:text-white'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.accentColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-xs text-white truncate">
                                {item.label}
                              </span>
                              {isActive ? (
                                <span className="flex items-center gap-1 text-[10px] text-cyan-300 font-mono font-semibold">
                                  <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                                  Active
                                </span>
                              ) : (
                                item.badge && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 font-mono">
                                    {item.badge}
                                  </span>
                                )
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 3: GAMIFICATION & METHODOLOGY */}
              {(activeCategory === 'all' || activeCategory === 'learning') && filteredLearning.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800">
                    <span>Gamification & Guides</span>
                    <span className="text-slate-400 font-normal">Training</span>
                  </div>
                  <div className="space-y-1">
                    {filteredLearning.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.action) {
                              item.action();
                            } else {
                              handleSelectTab(item.id as NavigationTab);
                            }
                          }}
                          className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-3 cursor-pointer group ${
                            isActive
                              ? 'bg-amber-600/20 border-amber-500/70 text-white shadow-md shadow-amber-500/10'
                              : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/70 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div
                            className={`p-2 rounded-lg shrink-0 mt-0.5 transition-colors ${
                              isActive
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700 group-hover:text-white'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : item.accentColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-xs text-white truncate">
                                {item.label}
                              </span>
                              {item.badge && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-bold">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Atmospheric Status Card */}
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-slate-950 via-blue-950/30 to-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[11px] text-slate-300 font-medium">Radar Station:</span>
                  <span className="text-[11px] font-mono text-cyan-300 font-bold uppercase">{selectedStationId || 'VVPZ'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded text-blue-300">
                  <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
                  <span>LIVE 250KM</span>
                </div>
              </div>

              {/* SECTION 4: SYSTEM OPTIONS & QUICK ACTIONS */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="px-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  System Options & Actions
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {/* AI Assistant Chat Button (Meteorologist Copilot) */}
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('toggle-chat-assistant'));
                      onClose();
                    }}
                    className="p-2 rounded-xl bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/60 hover:border-blue-600 text-left transition-all cursor-pointer flex items-center gap-2 group shadow-xs"
                    title="Launch AI Meteorologist Copilot Assistant"
                  >
                    <div className="relative p-1 rounded-lg bg-blue-600/30 text-blue-400 group-hover:text-blue-300 shrink-0">
                      <Bot className="w-4 h-4" />
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse ring-2 ring-slate-900" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                        <span>AI Meteorologist</span>
                      </div>
                      <div className="text-[10px] text-blue-300 font-mono">Copilot Chat</div>
                    </div>
                  </button>

                  {/* IMD Bulletin */}
                  {onOpenBulletin && (
                    <button
                      onClick={() => {
                        onOpenBulletin();
                        onClose();
                      }}
                      className="p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer flex items-center gap-2 group"
                    >
                      <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">IMD Bulletin</div>
                        <div className="text-[10px] text-slate-400">Official Text</div>
                      </div>
                    </button>
                  )}

                  {/* Audio Toggle */}
                  {onToggleAudio && (
                    <button
                      onClick={onToggleAudio}
                      className="p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer flex items-center gap-2 group"
                    >
                      {isAudioMuted ? (
                        <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {isAudioMuted ? 'Sound Muted' : 'Sound Active'}
                        </div>
                        <div className="text-[10px] text-slate-400">Toggle Weather Audio</div>
                      </div>
                    </button>
                  )}

                  {/* Night Mode Toggle */}
                  {onToggleNightMode && (
                    <button
                      onClick={onToggleNightMode}
                      className="p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer flex items-center gap-2 group"
                    >
                      <Moon className={`w-4 h-4 shrink-0 ${isNightMode ? 'text-purple-300' : 'text-slate-400'}`} />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {isNightMode ? 'Night Active' : 'Night Mode'}
                        </div>
                        <div className="text-[10px] text-slate-400">High-Contrast</div>
                      </div>
                    </button>
                  )}

                  {/* Print / Save PDF */}
                  <button
                    onClick={() => {
                      window.print();
                      onClose();
                    }}
                    className="p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer flex items-center gap-2 group"
                  >
                    <Printer className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">Print Report</div>
                      <div className="text-[10px] text-slate-400">Save PDF / Print</div>
                    </div>
                  </button>

                  {/* Download Dossier */}
                  {onDownloadReport && (
                    <button
                      onClick={() => {
                        onDownloadReport();
                        onClose();
                      }}
                      className="p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 text-left transition-all cursor-pointer flex items-center gap-2 group"
                    >
                      <Download className="w-4 h-4 text-indigo-300 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">Download</div>
                        <div className="text-[10px] text-slate-400">Official Dossier</div>
                      </div>
                    </button>
                  )}
                </div>

                {/* Dashboard Engine Runtime Controls in Drawer */}
                <div className="pt-2">
                  <div className="text-[10px] text-slate-400 font-mono mb-1.5 px-1">
                    ENGINE RUNTIME SWITCHES:
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <DashboardEngineControls />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/90 shrink-0 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>SAMVARTAKA AI v3.2</span>
              </span>
              <span className="text-slate-400">Operational Ensemble</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
