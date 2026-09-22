import React, { useState, useEffect } from 'react';
import {
  Award,
  Trophy,
  Flame,
  Sparkles,
  Compass,
  Plane,
  Radio,
  Satellite,
  Mountain,
  ShieldCheck,
  CloudRain,
  Layers,
  CheckCircle2,
  Lock,
  X,
  RotateCcw,
  ChevronRight,
  Zap,
  Target,
  Filter
} from 'lucide-react';
import {
  loadUserEngagement,
  getAllBadges,
  getLevelInfo,
  resetUserEngagement,
  AchievementBadge,
  UserEngagementState
} from '../utils/achievements';

interface AchievementsProps {
  mode?: 'page' | 'drawer';
  isOpen?: boolean;
  onClose?: () => void;
  onNavigateToChallenge?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const Achievements: React.FC<AchievementsProps> = ({
  mode = 'page',
  isOpen = true,
  onClose,
  onNavigateToChallenge,
  onNavigateToTab,
}) => {
  const [userState, setUserState] = useState<UserEngagementState>(loadUserEngagement());
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  useEffect(() => {
    const handleUpdate = () => setUserState(loadUserEngagement());
    window.addEventListener('achievements-updated', handleUpdate);
    return () => window.removeEventListener('achievements-updated', handleUpdate);
  }, []);

  if (mode === 'drawer' && !isOpen) return null;

  const badges = getAllBadges(userState);
  const levelInfo = getLevelInfo(userState.xp);
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  const filteredBadges = badges.filter((b) => {
    if (filterCategory === 'ALL') return true;
    if (filterCategory === 'UNLOCKED') return b.unlocked;
    if (filterCategory === 'LOCKED') return !b.unlocked;
    return b.category === filterCategory;
  });

  const renderBadgeIcon = (iconName: string, unlocked: boolean) => {
    const iconClass = `w-5 h-5 ${unlocked ? 'text-amber-400' : 'text-slate-400'}`;
    switch (iconName) {
      case 'Award': return <Award className={iconClass} />;
      case 'Compass': return <Compass className={iconClass} />;
      case 'Trophy': return <Trophy className={iconClass} />;
      case 'Flame': return <Flame className={iconClass} />;
      case 'Plane': return <Plane className={iconClass} />;
      case 'Radio': return <Radio className={iconClass} />;
      case 'Satellite': return <Satellite className={iconClass} />;
      case 'Mountain': return <Mountain className={iconClass} />;
      case 'ShieldCheck': return <ShieldCheck className={iconClass} />;
      case 'Sparkles': return <Sparkles className={iconClass} />;
      case 'CloudRain': return <CloudRain className={iconClass} />;
      case 'Layers': return <Layers className={iconClass} />;
      default: return <Award className={iconClass} />;
    }
  };

  const getTierBadgeStyle = (tier: string, unlocked: boolean) => {
    if (!unlocked) return 'border-slate-300 bg-slate-100 text-slate-400';
    switch (tier) {
      case 'DIAMOND':
        return 'border-cyan-400/80 bg-gradient-to-r from-cyan-900/50 to-blue-900/50 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]';
      case 'GOLD':
        return 'border-amber-400/80 bg-gradient-to-r from-amber-900/40 to-yellow-900/40 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)]';
      case 'SILVER':
        return 'border-slate-400/80 bg-gradient-to-r from-slate-800/40 to-slate-700/40 text-slate-200';
      case 'BRONZE':
      default:
        return 'border-orange-500/80 bg-gradient-to-r from-orange-950/40 to-amber-950/40 text-orange-200';
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Level & Progression Hero Card */}
      <div className="rounded-2xl p-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 p-0.5 shadow-lg flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Trophy className="w-7 h-7 text-amber-400 animate-bounce-subtle" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                  Level {levelInfo.level}
                </span>
                <span className="text-xs text-amber-300 font-mono font-semibold">
                  {userState.xp} Total XP
                </span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight mt-0.5">
                {levelInfo.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 font-mono uppercase">Unlocked</div>
              <div className="text-base font-black text-emerald-400 font-mono">
                {unlockedCount} / {badges.length}
              </div>
            </div>

            <div className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 font-mono uppercase flex items-center justify-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                <span>Streak</span>
              </div>
              <div className="text-base font-black text-amber-300 font-mono">
                {userState.currentStreak} Days
              </div>
            </div>
          </div>
        </div>

        {/* Level XP Progress Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Progression to Next Rank</span>
            <span className="text-indigo-300 font-bold">
              {levelInfo.progressPercent}% ({userState.xp} / {levelInfo.nextLevelXp} XP)
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'ALL', label: 'All Badges' },
            { id: 'UNLOCKED', label: `Unlocked (${unlockedCount})` },
            { id: 'LOCKED', label: `Locked (${badges.length - unlockedCount})` },
            { id: 'MASTERY', label: 'Mastery' },
            { id: 'CHALLENGE', label: 'Challenge' },
            { id: 'ANALYSIS', label: 'Analysis' },
            { id: 'EXPLORATION', label: 'Exploration' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {onNavigateToChallenge && (
          <button
            onClick={onNavigateToChallenge}
            className="shrink-0 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-yellow-200" />
            <span>Play Daily Challenge</span>
          </button>
        )}
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBadges.map((badge) => {
          const isUnlocked = badge.unlocked;
          const progressPercent = Math.round((badge.progress / badge.maxProgress) * 100);

          return (
            <div
              key={badge.id}
              className={`rounded-2xl p-4 border transition-all relative overflow-hidden flex flex-col justify-between ${
                isUnlocked
                  ? 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300'
                  : 'bg-slate-50/80 border-slate-200/80 opacity-80'
              }`}
            >
              {/* Top Row: Icon + Tier Pill + XP */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div
                    className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${
                      isUnlocked
                        ? 'bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200 shadow-sm'
                        : 'bg-slate-200/60 border-slate-300'
                    }`}
                  >
                    {renderBadgeIcon(badge.icon, isUnlocked)}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${getTierBadgeStyle(
                        badge.tier,
                        isUnlocked
                      )}`}
                    >
                      {badge.tier}
                    </span>

                    <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-mono font-bold">
                      +{badge.xpReward} XP
                    </span>
                  </div>
                </div>

                {/* Badge Details */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black text-slate-900">{badge.name}</h3>
                    {isUnlocked && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">{badge.description}</p>
                </div>
              </div>

              {/* Bottom Progress & Unlock Status */}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500">
                    Progress: {badge.progress} / {badge.maxProgress}
                  </span>
                  {isUnlocked ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <span>UNLOCKED</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>{progressPercent}%</span>
                    </span>
                  )}
                </div>

                <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isUnlocked ? 'bg-emerald-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, progressPercent)}%` }}
                  />
                </div>

                {!isUnlocked && (
                  <p className="text-[10px] text-slate-500 italic mt-1">{badge.hint}</p>
                )}

                {isUnlocked && badge.unlockedAt && (
                  <p className="text-[9px] text-slate-400 font-mono">
                    Unlocked: {new Date(badge.unlockedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Engagement Quick-Actions & Reset */}
      <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div>
          <strong>Operational Engagement Tracker</strong>: Badges update automatically as you explore rainfall regimes, deploy dropsondes, inspect Doppler radar towers, and conquer Daily Monsoon Challenges.
        </div>

        <button
          onClick={() => {
            if (window.confirm('Reset all achievement badges, streaks, and XP points?')) {
              resetUserEngagement();
            }
          }}
          className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer text-[11px] flex items-center gap-1 shrink-0 self-end sm:self-auto"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Engagement Data</span>
        </button>
      </div>
    </div>
  );

  // If in Drawer / Sidebar Mode
  if (mode === 'drawer') {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden border-l border-slate-200 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black">Meteorological Achievements Dossier</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5">{content}</div>
          </div>
        </div>
      </div>
    );
  }

  // Regular Dedicated Page View
  return <div id="achievements-page-root">{content}</div>;
};
