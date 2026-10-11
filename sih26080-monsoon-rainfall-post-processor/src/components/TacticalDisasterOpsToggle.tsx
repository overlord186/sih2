import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Radio, Download, Zap, Eye, CheckCircle2 } from 'lucide-react';

interface TacticalDisasterOpsToggleProps {
  onToggleMode?: (isTactical: boolean) => void;
  className?: string;
}

export const TacticalDisasterOpsToggle: React.FC<TacticalDisasterOpsToggleProps> = ({
  onToggleMode,
  className = '',
}) => {
  const [isTacticalOps, setIsTacticalOps] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('SAMVARTAKA_TACTICAL_OPS') === 'true';
    }
    return false;
  });

  const [isStrobeActive, setIsStrobeActive] = useState<boolean>(true);

  useEffect(() => {
    if (isTacticalOps) {
      document.documentElement.classList.add('tactical-ops-mode');
    } else {
      document.documentElement.classList.remove('tactical-ops-mode');
    }
    localStorage.setItem('SAMVARTAKA_TACTICAL_OPS', String(isTacticalOps));
    if (onToggleMode) onToggleMode(isTacticalOps);
  }, [isTacticalOps, onToggleMode]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={() => setIsTacticalOps(!isTacticalOps)}
        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 shadow-md cursor-pointer ${
          isTacticalOps
            ? 'bg-rose-600 text-white border-rose-400 shadow-rose-900/40 ring-2 ring-rose-500/50'
            : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white'
        }`}
        aria-label="Toggle High-Contrast Tactical Disaster Operations Mode (WCAG AAA 7:1 Contrast)"
        data-explain-title="Tactical Ops Mode"
        data-explain-cat="TOGGLE"
        data-explain-desc="Toggles high-contrast WCAG AAA 7:1 incident operations mode for Emergency Operations Centers (EOC)."
        data-explain-context="Modulates UI palette into emergency warning colorways and highlights high-risk hydrological deluges."
        data-explain-hint="Click to toggle tactical disaster mode on or off."
      >
        <ShieldAlert className={`w-4 h-4 ${isTacticalOps ? 'animate-bounce text-white' : 'text-rose-400'}`} />
        <span>{isTacticalOps ? 'Tactical Ops: ACTIVE' : 'Tactical Ops Mode'}</span>
        {isTacticalOps && (
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
        )}
      </button>

      {/* When Tactical Mode is on, show compact banner */}
      {isTacticalOps && (
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-xl bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs font-mono">
          <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          <span>EOC Incident Mode • WCAG AAA (7:1)</span>
        </div>
      )}
    </div>
  );
};
