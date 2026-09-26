import React from 'react';
import {
  Gauge,
  Compass,
  CloudRain,
  Layers,
  Sparkles,
  Activity,
  Upload,
  BrainCircuit,
  Sliders,
  Calendar,
  Flame,
  Award,
  BookOpen,
  Volume2,
  VolumeX,
  Printer,
  ChevronRight,
  ChevronLeft,
  Bot,
  Radar,
  X,
} from 'lucide-react';
import { NavigationTab } from './Header';
import { weatherSynth } from '../utils/audio';

interface WorkstationSidebarRailProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  isAudioMuted: boolean;
  onToggleAudio?: () => void;
  onOpenAchievements?: () => void;
  onOpenTrainingGuide?: (tab?: 'explore' | 'ml_guide' | 'ml_trainer' | 'ui_spec') => void;
  unlockedBadgesCount?: number;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

interface NavRailItem {
  id: NavigationTab;
  label: string;
  category: 'core' | 'tool' | 'guide';
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

export const WorkstationSidebarRail: React.FC<WorkstationSidebarRailProps> = ({
  activeTab,
  onTabChange,
  isAudioMuted,
  onToggleAudio,
  onOpenAchievements,
  onOpenTrainingGuide,
  unlockedBadgesCount = 0,
  isExpanded,
  onToggleExpanded,
}) => {
  const navItems: NavRailItem[] = [
    {
      id: 'dashboard',
      label: 'Main Dashboard',
      category: 'core',
      icon: Gauge,
      accentColor: 'text-blue-400 group-hover:text-blue-300',
      badge: 'Core',
    },
    {
      id: 'regimes',
      label: 'Synoptic Regimes',
      category: 'core',
      icon: Compass,
      accentColor: 'text-sky-400 group-hover:text-sky-300',
    },
    {
      id: 'probabilities',
      label: 'Rainfall Risks',
      category: 'core',
      icon: CloudRain,
      accentColor: 'text-amber-400 group-hover:text-amber-300',
      badge: 'Risk',
    },
    {
      id: 'districts',
      label: 'District Forecasts',
      category: 'core',
      icon: Layers,
      accentColor: 'text-sky-400 group-hover:text-sky-300',
    },
    {
      id: 'verification',
      label: 'Skill Verification',
      category: 'core',
      icon: Sparkles,
      accentColor: 'text-emerald-400 group-hover:text-emerald-300',
    },
    {
      id: 'diagnostics',
      label: 'ML Diagnostics',
      category: 'core',
      icon: Activity,
      accentColor: 'text-teal-400 group-hover:text-teal-300',
    },
    {
      id: 'predictor',
      label: 'Interactive QRF',
      category: 'tool',
      icon: BrainCircuit,
      accentColor: 'text-indigo-400 group-hover:text-indigo-300',
    },
    {
      id: 'sandbox',
      label: 'Physics Sandbox',
      category: 'tool',
      icon: Sliders,
      accentColor: 'text-fuchsia-400 group-hover:text-fuchsia-300',
    },
    {
      id: 'planner',
      label: 'Lead Planner',
      category: 'tool',
      icon: Calendar,
      accentColor: 'text-violet-400 group-hover:text-violet-300',
    },
    {
      id: 'challenge',
      label: 'Daily Challenge',
      category: 'guide',
      icon: Flame,
      accentColor: 'text-amber-500 group-hover:text-amber-400',
      badge: 'Daily',
    },
    {
      id: 'uploader',
      label: 'CSV Post-Process',
      category: 'tool',
      icon: Upload,
      accentColor: 'text-blue-300 group-hover:text-blue-200',
    },
    {
      id: 'methodology',
      label: 'Science Manual',
      category: 'guide',
      icon: BookOpen,
      accentColor: 'text-slate-300 group-hover:text-white',
    },
  ];

  const handleSelectTab = (tab: NavigationTab) => {
    if (!isAudioMuted) {
      weatherSynth.playRadarScanPing();
    }
    onTabChange(tab);
  };

  return (
    <>
      {/* Mobile Dimmed Backdrop Overlay (when sidebar expanded on small screens) */}
      {isExpanded && (
        <div
          onClick={onToggleExpanded}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-35 md:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      <aside
        id="workstation-sidebar-rail"
        className={`fixed top-0 bottom-0 left-0 z-40 bg-slate-950/95 backdrop-blur-xl border-r border-slate-800/90 text-white flex flex-col justify-between transition-all duration-300 ease-in-out select-none shadow-2xl ${
          isExpanded ? 'w-60' : 'w-16'
        }`}
      >
      {/* Top Header: Brand Glyph & Rail Toggle */}
      <div className={`h-16 border-b border-slate-800/80 bg-slate-950 flex items-center shrink-0 ${
        isExpanded ? 'px-3 justify-between' : 'justify-center px-1'
      }`}>
        {isExpanded ? (
          <>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div
                onClick={onToggleExpanded}
                className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-sky-400 shrink-0 cursor-pointer hover:bg-blue-600/30 transition-all shadow-xs"
                title="Collapse Sidebar"
              >
                <Radar className="w-4 h-4 animate-spin-slow" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black tracking-wider uppercase font-mono text-sky-300 truncate">
                  SAMVARTAKA
                </div>
                <div className="text-[10px] text-slate-400 font-mono">Workstation</div>
              </div>
            </div>

            <button
              onClick={onToggleExpanded}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Collapse Sidebar (push view left)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        ) : (
          /* Sleek Collapsed Toggle Button with Radar Glyph and Expand Arrow Indicator */
          <button
            onClick={onToggleExpanded}
            className="w-11 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/50 flex items-center justify-center text-slate-300 hover:text-sky-300 transition-all cursor-pointer relative group shadow-xs"
            title="Expand Workstation Sidebar (push view right)"
          >
            <Radar className="w-5 h-5 text-sky-400 group-hover:rotate-45 transition-transform duration-300" />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-[9px] text-sky-300 group-hover:scale-110 transition-transform">
              <ChevronRight className="w-3 h-3" />
            </span>
          </button>
        )}
      </div>

      {/* Main Workspace Navigation Items */}
      <div className={`flex-1 overflow-y-auto workstation-rail-scroll py-3 space-y-1.5 ${
        isExpanded ? 'px-2' : 'px-2 flex flex-col items-center'
      }`}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <div key={item.id} className="relative group w-full flex justify-center">
              <button
                onClick={() => handleSelectTab(item.id)}
                className={`transition-all duration-200 cursor-pointer flex items-center ${
                  isExpanded
                    ? `w-full gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/90'
                      }`
                    : `w-11 h-11 rounded-xl justify-center ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 ring-1 ring-sky-400/50'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900/90 border border-transparent hover:border-slate-800'
                      }`
                }`}
                title={!isExpanded ? item.label : undefined}
              >
                {/* Icon Container */}
                <div className="relative shrink-0 flex items-center justify-center">
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isActive ? 'text-white scale-110' : item.accentColor
                    }`}
                  />
                  {isActive && !isExpanded && (
                    <span className="absolute -left-3.5 w-1 h-4 bg-sky-300 rounded-r-full shadow-xs" />
                  )}
                </div>

                {/* Expanded Label & Pill Badge */}
                {isExpanded && (
                  <div className="flex-1 flex items-center justify-between min-w-0 text-left">
                    <span className="truncate text-xs font-semibold">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-bold shrink-0 ${
                          isActive
                            ? 'bg-blue-800 text-sky-200'
                            : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>

              {/* Floating Tooltip When Collapsed */}
              {!isExpanded && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-50 pointer-events-none">
                  <div className="bg-slate-900/95 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-2xl border border-slate-700 whitespace-nowrap flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.2 bg-blue-900/90 text-sky-300 rounded font-mono font-bold">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Utility Strip */}
      <div className={`p-2 border-t border-slate-800/80 bg-slate-950/90 shrink-0 space-y-1.5 ${
        !isExpanded ? 'flex flex-col items-center' : ''
      }`}>
        {/* Achievements Quick Action */}
        <div className="relative group w-full flex justify-center">
          <button
            onClick={() => {
              if (onOpenAchievements) onOpenAchievements();
              else onTabChange('achievements');
            }}
            className={`transition-colors cursor-pointer flex items-center ${
              isExpanded
                ? `w-full gap-3 px-3 py-2 rounded-xl text-xs ${
                    activeTab === 'achievements'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-amber-300 hover:bg-slate-900'
                  }`
                : `w-11 h-11 rounded-xl justify-center ${
                    activeTab === 'achievements'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-amber-300 hover:bg-slate-900'
                  }`
            }`}
            title={!isExpanded ? 'Meteorological Badges & Achievements' : undefined}
          >
            <div className="shrink-0 flex items-center justify-center">
              <Award className="w-5 h-5 text-amber-400" />
            </div>
            {isExpanded && (
              <div className="flex-1 flex items-center justify-between text-left min-w-0">
                <span className="text-xs font-medium truncate">Badges</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                  {unlockedBadgesCount}
                </span>
              </div>
            )}
          </button>
          {!isExpanded && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-50 pointer-events-none">
              <div className="bg-slate-900 text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-2xl border border-slate-700 whitespace-nowrap">
                Badges ({unlockedBadgesCount})
              </div>
            </div>
          )}
        </div>

        {/* AI Copilot Quick Assistant Trigger */}
        <div className="relative group w-full flex justify-center">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-chat-assistant'))}
            className={`transition-colors cursor-pointer flex items-center text-slate-400 hover:text-blue-300 hover:bg-blue-950/40 ${
              isExpanded
                ? 'w-full gap-3 px-3 py-2 rounded-xl text-xs'
                : 'w-11 h-11 rounded-xl justify-center'
            }`}
            title={!isExpanded ? 'Launch AI Meteorologist Copilot' : undefined}
          >
            <div className="shrink-0 flex items-center justify-center relative">
              <Bot className="w-5 h-5 text-blue-400 group-hover:text-blue-300" />
              <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-emerald-400 animate-pulse ring-2 ring-slate-950" />
            </div>
            {isExpanded && (
              <div className="flex-1 text-left min-w-0">
                <div className="text-xs font-medium text-slate-200 truncate">AI Copilot</div>
              </div>
            )}
          </button>
          {!isExpanded && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-50 pointer-events-none">
              <div className="bg-slate-900 text-sky-300 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-2xl border border-slate-700 whitespace-nowrap">
                AI Meteorologist Copilot
              </div>
            </div>
          )}
        </div>

        {/* Audio Mute/Unmute */}
        {onToggleAudio && (
          <div className="relative group w-full flex justify-center">
            <button
              onClick={onToggleAudio}
              className={`transition-colors cursor-pointer flex items-center text-slate-400 hover:text-white hover:bg-slate-900 ${
                isExpanded
                  ? 'w-full gap-3 px-3 py-2 rounded-xl text-xs'
                  : 'w-11 h-11 rounded-xl justify-center'
              }`}
              title={!isExpanded ? (isAudioMuted ? 'Unmute Audio' : 'Mute Audio') : undefined}
            >
              <div className="shrink-0 flex items-center justify-center">
                {isAudioMuted ? (
                  <VolumeX className="w-5 h-5 text-rose-400" />
                ) : (
                  <Volume2 className="w-5 h-5 text-sky-400" />
                )}
              </div>
              {isExpanded && (
                <span className="text-xs truncate">
                  {isAudioMuted ? 'Sound Muted' : 'Sound Enabled'}
                </span>
              )}
            </button>
            {!isExpanded && (
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-50 pointer-events-none">
                <div className="bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-2xl border border-slate-700 whitespace-nowrap">
                  {isAudioMuted ? 'Unmute Sound' : 'Mute Sound'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Print / Save Dossier */}
        <div className="relative group w-full flex justify-center">
          <button
            onClick={() => window.print()}
            className={`transition-colors cursor-pointer flex items-center text-slate-400 hover:text-white hover:bg-slate-900 ${
              isExpanded
                ? 'w-full gap-3 px-3 py-2 rounded-xl text-xs'
                : 'w-11 h-11 rounded-xl justify-center'
            }`}
            title={!isExpanded ? 'Print Meteorological Dossier' : undefined}
          >
            <div className="shrink-0 flex items-center justify-center">
              <Printer className="w-5 h-5 text-slate-400 group-hover:text-white" />
            </div>
            {isExpanded && <span className="text-xs truncate">Print Report</span>}
          </button>
          {!isExpanded && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-50 pointer-events-none">
              <div className="bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-2xl border border-slate-700 whitespace-nowrap">
                Print Report / Save PDF
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  </>
);
};
