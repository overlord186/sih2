import React, { useState, useEffect } from 'react';
import { Trophy, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { AchievementBadge } from '../utils/achievements';

export const AchievementToast: React.FC = () => {
  const [activeBadge, setActiveBadge] = useState<AchievementBadge | null>(null);

  useEffect(() => {
    const handleUnlock = (e: Event) => {
      const customEvent = e as CustomEvent<AchievementBadge>;
      if (customEvent.detail) {
        setActiveBadge(customEvent.detail);
        // Auto dismiss after 6 seconds
        const timer = setTimeout(() => {
          setActiveBadge(null);
        }, 6000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('achievement-unlocked', handleUnlock);
    return () => window.removeEventListener('achievement-unlocked', handleUnlock);
  }, []);

  if (!activeBadge) return null;

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 pointer-events-auto max-w-sm w-full animate-in slide-in-from-top-4 duration-300">
      <div className="rounded-2xl p-4 bg-slate-900/95 backdrop-blur-md border border-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.35)] text-white flex items-start gap-3 relative overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shrink-0 shadow-lg">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
          </div>
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Achievement Unlocked!</span>
          </div>
          <h4 className="text-sm font-black text-white truncate mt-0.5">{activeBadge.name}</h4>
          <p className="text-xs text-slate-300 leading-snug mt-0.5">{activeBadge.description}</p>
          <div className="mt-2 flex items-center gap-2 text-[10px] font-mono">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
              +{activeBadge.xpReward} XP
            </span>
            <span className="text-slate-400 font-semibold">{activeBadge.tier} TIER</span>
          </div>
        </div>

        <button
          onClick={() => setActiveBadge(null)}
          className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
