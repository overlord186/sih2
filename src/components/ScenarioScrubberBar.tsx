import React from 'react';
import { Sparkles, Calendar, CloudRain, Waves, Zap, Wind, Compass } from 'lucide-react';
import { ExploreBeacon } from './exploreTour/ExploreBeacon';

export interface CaseStudy {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  stationId: string;
  year: number;
  leadTime: number;
  highlightStat: string;
}

interface ScenarioScrubberBarProps {
  selectedStationId: string;
  onSelectStation: (stationId: string) => void;
  selectedYear: number;
  onSelectYear: (year: number) => void;
  selectedLeadTime: number;
  onSelectLeadTime: (lead: number) => void;
  selectedSeasonPhase?: number; // 1 to 4
  onSeasonPhaseChange?: (phase: number) => void;
  className?: string;
}

export const ScenarioScrubberBar: React.FC<ScenarioScrubberBarProps> = ({
  selectedStationId,
  onSelectStation,
  selectedYear,
  onSelectYear,
  selectedLeadTime,
  onSelectLeadTime,
  selectedSeasonPhase = 2,
  onSeasonPhaseChange,
  className = '',
}) => {
  const caseStudies: CaseStudy[] = [
    {
      id: 'mumbai-cloudburst',
      title: 'Mumbai Cloudburst Runoff',
      subtitle: 'Konkan Orographic Surge',
      badge: '94.2% Extreme Capture',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      icon: <CloudRain className="w-3.5 h-3.5 text-rose-400" />,
      stationId: 'BOM_SANTACRUZ',
      year: 2025,
      leadTime: 1,
      highlightStat: '+184 mm/day peak',
    },
    {
      id: 'pune-flash-flood',
      title: 'Pune Flash Floods (2019)',
      subtitle: 'Urban Catchment Inundation',
      badge: 'Rapid Onset Detected',
      badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      icon: <Waves className="w-3.5 h-3.5 text-orange-400" />,
      stationId: 'PNQ_SHIVAJINAGAR',
      year: 2019,
      leadTime: 1,
      highlightStat: '112 mm in 4 hours',
    },
    {
      id: 'brahmaputra-flood',
      title: 'Brahmaputra Basin Deluge',
      subtitle: 'Sub-Himalayan Funneling',
      badge: 'Hydrological Surge',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      icon: <Waves className="w-3.5 h-3.5 text-sky-400" />,
      stationId: 'GAU_BORJHAR',
      year: 2024,
      leadTime: 1,
      highlightStat: '1,720 mm Season',
    },
    {
      id: 'vidarbha-extremes',
      title: 'Vidarbha Monsoon Extremes',
      subtitle: 'Deep Depression Path',
      badge: 'Soil Moisture Saturated',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      icon: <Wind className="w-3.5 h-3.5 text-purple-400" />,
      stationId: 'NAG_SONEGAON',
      year: 2022,
      leadTime: 2,
      highlightStat: '250% Above Normal',
    },
    {
      id: 'yamuna-deluge',
      title: 'Yamuna Inundation Event',
      subtitle: 'Trough Axis Oscillation',
      badge: 'Day +2 Early Alert',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      icon: <Zap className="w-3.5 h-3.5 text-amber-400" />,
      stationId: 'DEL_SAFDARJUNG',
      year: 2023,
      leadTime: 2,
      highlightStat: 'Lead Reliability 91%',
    },
    {
      id: 'bengal-depression',
      title: 'Bay Depression Head',
      subtitle: 'Deltaic Maritime Surge',
      badge: 'Drizzle Bias Eradicated',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      icon: <Wind className="w-3.5 h-3.5 text-indigo-400" />,
      stationId: 'CCU_ALIPORE',
      year: 2024,
      leadTime: 1,
      highlightStat: '-38% RMSE Bias',
    },
  ];

  const seasonalPhases = [
    { phase: 1, label: 'June Onset', detail: 'Arabian Sea Surge' },
    { phase: 2, label: 'July Peak', detail: 'Synoptic Maximum' },
    { phase: 3, label: 'Aug Active / Break', detail: 'Trough Fluctuations' },
    { phase: 4, label: 'Sept Withdrawal', detail: 'Post-Monsoon Retreat' },
  ];

  const handleApplyCase = (cs: CaseStudy) => {
    onSelectStation(cs.stationId);
    onSelectYear(cs.year);
    onSelectLeadTime(cs.leadTime);
    // Smooth scroll to time series chart
    const chartEl = document.getElementById('forecast-chart-card');
    if (chartEl) {
      chartEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div 
      id="scenario-scrubber-bar"
      data-explore-id="scenario-scrubber-bar"
      className={`bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md backdrop-blur-md space-y-3 relative ${className}`}
    >
      {/* Top Row: Case Study Quick-Launch Badges */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-white tracking-wide uppercase">
            One-Click Synoptic Scenarios:
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Load historical benchmarks instantly
          </span>
          <ExploreBeacon id="scenario-scrubber-bar" size="sm" />
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5">
          {caseStudies.map((cs) => {
            const isCurrent =
              selectedStationId === cs.stationId &&
              selectedYear === cs.year &&
              selectedLeadTime === cs.leadTime;

            return (
              <button
                key={cs.id}
                type="button"
                onClick={() => handleApplyCase(cs)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer active:scale-95 ${
                  isCurrent
                    ? 'bg-purple-950/70 border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.3)] ring-1 ring-purple-400/40 text-white'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
                }`}
                title={`Click to load ${cs.title} (${cs.year})`}
              >
                {cs.icon}
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-semibold whitespace-nowrap">{cs.title}</span>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap font-mono">{cs.highlightStat}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Row: Seasonal Progression Timeline Scrubber */}
      <div className="pt-2.5 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-medium shrink-0">
          <Calendar className="w-3.5 h-3.5 text-blue-400" />
          <span>Seasonal Progression Scrubber:</span>
        </div>

        {/* Phase Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 flex-1 max-w-2xl">
          {seasonalPhases.map((sp) => {
            const isSelected = selectedSeasonPhase === sp.phase;
            return (
              <button
                key={sp.phase}
                type="button"
                onClick={() => onSeasonPhaseChange?.(sp.phase)}
                className={`px-2.5 py-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600/90 text-white border-blue-400 shadow-sm font-semibold'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border-slate-700/60 hover:bg-slate-800'
                }`}
              >
                <div className="text-[11px] font-bold tracking-tight">{sp.label}</div>
                <div className="text-[9px] opacity-75 font-mono">{sp.detail}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
