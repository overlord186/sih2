import React from 'react';
import { CloudRain, Compass, Calendar, Gauge, Cpu, BookOpen, Layers } from 'lucide-react';
import { MET_STATIONS } from '../data/monsoonDataset';

interface HeaderProps {
  selectedStationId: string;
  onStationChange: (id: string) => void;
  selectedLeadTime: number; // 0 = all, 1, 2, 3
  onLeadTimeChange: (lead: number) => void;
  activeTab: 'dashboard' | 'predictor' | 'methodology';
  onTabChange: (tab: 'dashboard' | 'predictor' | 'methodology') => void;
  totalSamples: number;
}

export const Header: React.FC<HeaderProps> = ({
  selectedStationId,
  onStationChange,
  selectedLeadTime,
  onLeadTimeChange,
  activeTab,
  onTabChange,
  totalSamples,
}) => {
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
                  SIH26080
                </span>
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Verified ML Pipeline Active
                </span>
                <span className="text-xs text-slate-400 font-mono">IMD Monsoon 2023 Benchmark</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
                Regime-Aware AI Post-Processing of Monsoon Rainfall Forecasts
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Physics-informed machine learning post-processor eliminating NWP drizzle bias and resolving smoothed convective extremes
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-lg border border-slate-700/80 self-start md:self-auto">
            <button
              id="tab-dashboard-btn"
              onClick={() => onTabChange('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              Evaluation Dashboard
            </button>
            <button
              id="tab-predictor-btn"
              onClick={() => onTabChange('predictor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'predictor'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Live Predictor Sandbox
            </button>
            <button
              id="tab-methodology-btn"
              onClick={() => onTabChange('methodology')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'methodology'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              ML Methodology & PS
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
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
                <option value="ALL">All Stations (4 Meteorological Subdivisions)</option>
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
              <span className="text-slate-400 font-medium">Forecast Lead Time:</span>
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
                  All (D+1 to D+3)
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
