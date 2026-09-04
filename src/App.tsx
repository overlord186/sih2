/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { ForecastChart } from './components/ForecastChart';
import { RegimeBreakdownView } from './components/RegimeBreakdownView';
import { InteractivePredictor } from './components/InteractivePredictor';
import { MethodologyView } from './components/MethodologyView';
import { StationOverview } from './components/StationOverview';
import { MONSOON_DATASET, MET_STATIONS } from './data/monsoonDataset';
import { calculateMetrics, calculateRegimeBreakdown } from './ml/postProcessor';
import { ShieldCheck, CloudRain, Award, Activity } from 'lucide-react';

export default function App() {
  const [selectedStationId, setSelectedStationId] = useState<string>('ALL');
  const [selectedLeadTime, setSelectedLeadTime] = useState<number>(1); // default to Day +1
  const [activeTab, setActiveTab] = useState<'dashboard' | 'predictor' | 'methodology'>('dashboard');

  // Filter dataset based on selected station and lead time
  const filteredData = useMemo(() => {
    return MONSOON_DATASET.filter((d) => {
      const matchStation = selectedStationId === 'ALL' || d.stationId === selectedStationId;
      const matchLead = selectedLeadTime === 0 || d.leadTimeDays === selectedLeadTime;
      return matchStation && matchLead;
    });
  }, [selectedStationId, selectedLeadTime]);

  // Compute live metrics dynamically
  const metrics = useMemo(() => {
    return calculateMetrics(filteredData);
  }, [filteredData]);

  // Compute regime breakdowns
  const regimeBreakdowns = useMemo(() => {
    return calculateRegimeBreakdown(filteredData);
  }, [filteredData]);

  const activeStationName = useMemo(() => {
    if (selectedStationId === 'ALL') return 'All Meteorological Stations Combined';
    const found = MET_STATIONS.find((s) => s.id === selectedStationId);
    return found ? `${found.name} (${found.subdivision})` : 'Selected Station';
  }, [selectedStationId]);

  return (
    <div id="sih26080-app-root" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* App Header & Navigation */}
      <Header
        selectedStationId={selectedStationId}
        onStationChange={setSelectedStationId}
        selectedLeadTime={selectedLeadTime}
        onLeadTimeChange={setSelectedLeadTime}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        totalSamples={filteredData.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Real-time Metric Overview Scorecards */}
            <MetricCards metrics={metrics} />

            {/* Time Series Visualizer */}
            <ForecastChart
              data={filteredData}
              selectedStationName={activeStationName}
            />

            {/* IMD Regime Breakdown & Diagnostic Cards */}
            <RegimeBreakdownView
              breakdowns={regimeBreakdowns}
              totalSamples={filteredData.length}
            />

            {/* Meteorological Observatories Grid */}
            <StationOverview
              selectedStationId={selectedStationId}
              onSelectStation={setSelectedStationId}
            />
          </div>
        )}

        {activeTab === 'predictor' && (
          <InteractivePredictor />
        )}

        {activeTab === 'methodology' && (
          <MethodologyView />
        )}
      </main>

      {/* Scientific Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-blue-600" />
            <span>
              <strong>SIH26080 Prototype</strong>: Regime-Aware AI Post-Processing of Monsoon Rainfall Forecasts
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <span className="flex items-center gap-1 text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Verified Leakage-Free Temporal Split
            </span>
            <span>•</span>
            <span>IMD Meteorological Thresholds</span>
            <span>•</span>
            <span className="font-mono text-slate-400">v1.0.0-hackathon-mvp</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
