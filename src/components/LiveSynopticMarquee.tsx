import React, { useState } from 'react';
import { Radio, AlertTriangle, CloudRain, ShieldCheck, Zap, TrendingUp } from 'lucide-react';

interface MarqueeItem {
  id: string;
  icon: React.ReactNode;
  tag: string;
  tagColor: string;
  text: string;
  subtext?: string;
  stationId?: string;
}

interface LiveSynopticMarqueeProps {
  onSelectStation?: (stationId: string) => void;
  className?: string;
}

export const LiveSynopticMarquee: React.FC<LiveSynopticMarqueeProps> = ({
  onSelectStation,
  className = '',
}) => {
  const [isPaused, setIsPaused] = useState(false);

  const items: MarqueeItem[] = [
    {
      id: 'item-1',
      icon: <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />,
      tag: 'LIVE DOPPLER',
      tagColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      text: 'Convective cell cluster active over Konkan Coast (+46.5 mm/hr localized rainfall rate)',
      subtext: 'High flood runoff risk',
      stationId: 'MUMBAI',
    },
    {
      id: 'item-2',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
      tag: 'NEURAL CALIBRATION',
      tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      text: 'SAMVARTAKA AI Post-Processor reduced raw NWP RMSE by 34.2% across Western Ghats grid',
      subtext: 'Regime: Active Monsoon',
      stationId: 'WAYANAD',
    },
    {
      id: 'item-3',
      icon: <Zap className="w-3.5 h-3.5 text-amber-400" />,
      tag: 'OROGRAPHIC PEAK',
      tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      text: 'Cherrapunji Station: 24h precipitation accumulation 284.6 mm • GEV extreme quantile engaged',
      subtext: '94.2% Extreme Capture',
      stationId: 'CHERRAPUNJI',
    },
    {
      id: 'item-4',
      icon: <CloudRain className="w-3.5 h-3.5 text-blue-400" />,
      tag: 'MONSOON TROUGH',
      tagColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      text: 'Northern oscillation of trough axis sustaining deep moisture transport into Yamuna Basin',
      subtext: 'Day +2 Advisory',
      stationId: 'DELHI',
    },
    {
      id: 'item-5',
      icon: <TrendingUp className="w-3.5 h-3.5 text-purple-400" />,
      tag: 'LEAD TIME RELIABILITY',
      tagColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      text: 'Day +1 to Day +3 Continuous Ranked Probability Score (CRPS) stabilized at 3.12 mm',
      subtext: 'Temporal Split Verified',
    },
  ];

  return (
    <div
      className={`w-full bg-slate-950/90 border-y border-slate-800/80 backdrop-blur-md text-xs py-2 px-3 overflow-hidden select-none flex items-center gap-3 relative z-20 ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Live Badge Fixed Pill */}
      <div className="shrink-0 flex items-center gap-2 pl-1 pr-3 border-r border-slate-800">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
        </span>
        <span className="font-mono text-[11px] font-bold tracking-wider text-rose-400 uppercase">
          SYNOPTIC RADAR
        </span>
      </div>

      {/* Marquee Content Stream */}
      <div className="flex-1 overflow-hidden relative">
        <div
          className={`flex items-center gap-8 whitespace-nowrap will-change-transform ${
            isPaused ? '' : 'animate-[marquee_38s_linear_infinite]'
          }`}
          style={{
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        >
          {items.concat(items).map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              className="flex items-center gap-2.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
              onClick={() => item.stationId && onSelectStation?.(item.stationId)}
            >
              {item.icon}
              <span
                className={`px-1.5 py-0.5 text-[10px] font-bold rounded tracking-wider uppercase border ${item.tagColor}`}
              >
                {item.tag}
              </span>
              <span className="font-medium text-[11px] text-slate-200">{item.text}</span>
              {item.subtext && (
                <span className="text-[10px] text-slate-400 font-mono bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-800">
                  {item.subtext}
                </span>
              )}
              <span className="text-slate-600 font-bold ml-2">•</span>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Controls Hint */}
      <div className="shrink-0 hidden md:flex items-center text-[10px] text-slate-500 font-mono">
        <span>{isPaused ? 'Paused' : 'Hover to Pause'}</span>
      </div>
    </div>
  );
};
