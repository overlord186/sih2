import { AnimatedSection } from './components/AnimatedSection';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { LiveMap } from './components/LiveMap';
import { ForecastChart } from './components/ForecastChart';
import { RainOverlay } from './components/RainOverlay';
import { LightningFlashOverlay } from './components/LightningFlashOverlay';
import { generateForecastReport } from './utils/report';
import { RegimeBreakdownView } from './components/RegimeBreakdownView';
import { InteractivePredictor } from './components/InteractivePredictor';
import { ActionPlanner } from './components/ActionPlanner';
import { MethodologyView } from './components/MethodologyView';
import { HelpGuideView } from './components/HelpGuideView';
import { StationOverview } from './components/StationOverview';
import { MONSOON_DATASET, MET_STATIONS } from './data/monsoonDataset';
import { calculateMetrics, calculateRegimeBreakdown } from './ml/postProcessor';
import { ShieldCheck, CloudRain, Award, Activity } from 'lucide-react';
import { CinematicIntro } from './components/CinematicIntro';
import { ChatAssistant } from './components/ChatAssistant';

import { AtmosphereWidget, AtmosphereMode } from './components/AtmosphereWidget';
import { WeatherBackground3D } from './components/WeatherBackground3D';
import { weatherSynth } from './utils/audio';

import { motion, AnimatePresence } from 'motion/react';
import { RainfallRegime } from './types';

export default function App() {
  const [showIntro, setShowIntro] = useState<boolean>(true);
  const [selectedStationId, setSelectedStationId] = useState<string>('ALL');
  const [selectedLeadTime, setSelectedLeadTime] = useState<number>(1); // default to Day +1
  const [selectedYear, setSelectedYear] = useState<number>(2025); // default to 2025 Operational Season
  const [activeTab, setActiveTab] = useState<'dashboard' | 'predictor' | 'methodology' | 'help' | 'planner'>('dashboard');
const [ambientRegime, setAmbientRegime] = useState<RainfallRegime | null>(null);
  const [hoverIntensity, setHoverIntensity] = useState<number>(0);
  const [atmosphereMode, setAtmosphereMode] = useState<AtmosphereMode>('auto');
  
  const effectiveIntensity = useMemo(() => {
    switch (atmosphereMode) {
      case 'clear': return 0;
      case 'drizzle': return 25;
      case 'heavy': return 85;
      case 'cyclone': return 150;
      case 'auto':
      default:
        return hoverIntensity;
    }
  }, [atmosphereMode, hoverIntensity]);

  const effectiveRegime = useMemo(() => {
    if (atmosphereMode !== 'auto') {
      if (atmosphereMode === 'clear') return null;
      if (atmosphereMode === 'drizzle') return RainfallRegime.LIGHT;
      if (atmosphereMode === 'heavy') return RainfallRegime.HEAVY_EXTREME;
      if (atmosphereMode === 'cyclone') return RainfallRegime.HEAVY_EXTREME;
    }
    return ambientRegime;
  }, [atmosphereMode, ambientRegime]);

  useEffect(() => {
    weatherSynth.setIntensity(effectiveIntensity);
  }, [effectiveIntensity]);
  
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [compareYear, setCompareYear] = useState<number>(2024);

  useEffect(() => {
    const handleAmbientUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      setAmbientRegime(customEvent.detail.regime);
      setHoverIntensity(customEvent.detail.intensity || 0);
    };
    window.addEventListener('app-ambient-update', handleAmbientUpdate);
    return () => window.removeEventListener('app-ambient-update', handleAmbientUpdate);
  }, []);

  // Filter dataset based on selected station, lead time, and season year
  const filteredData = useMemo(() => {
    return MONSOON_DATASET.filter((d) => {
      const matchYear = selectedYear === 0 || d.year === selectedYear;
      const matchStation = selectedStationId === 'ALL' || d.stationId === selectedStationId;
      const matchLead = selectedLeadTime === 0 || d.leadTimeDays === selectedLeadTime;
      return matchYear && matchStation && matchLead;
    });
  }, [selectedYear, selectedStationId, selectedLeadTime]);

  // Compute compare data for overlay
  const compareData = useMemo(() => {
    if (!isComparing) return [];
    return MONSOON_DATASET.filter((d) => {
      const matchYear = d.year === compareYear;
      const matchStation = selectedStationId === 'ALL' || d.stationId === selectedStationId;
      const matchLead = selectedLeadTime === 0 || d.leadTimeDays === selectedLeadTime;
      return matchYear && matchStation && matchLead;
    });
  }, [isComparing, compareYear, selectedStationId, selectedLeadTime]);

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

  // Dynamic Background based on Ambient Regime
  const getAmbientBackground = () => {
    switch (effectiveRegime) {
      case RainfallRegime.HEAVY_EXTREME:
        return 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900';
      case RainfallRegime.MODERATE:
        return 'bg-gradient-to-br from-slate-200 via-blue-200 to-slate-200';
      case RainfallRegime.LIGHT:
        return 'bg-gradient-to-br from-slate-100 via-sky-100 to-slate-100';
      case RainfallRegime.DRY:
        return 'bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50';
      default:
        return 'bg-slate-50';
    }
  };

  const handleDownloadReport = () => {
    generateForecastReport(
      activeStationName,
      selectedYear,
      selectedLeadTime,
      metrics,
      regimeBreakdowns
    );
  };

  return (
    <>
      <RainOverlay intensity={effectiveIntensity} />
      <LightningFlashOverlay intensity={effectiveIntensity} />
      <WeatherBackground3D mode={atmosphereMode} />
      <AtmosphereWidget mode={atmosphereMode} onChange={setAtmosphereMode} />
      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="intro-wrapper"
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            className="fixed inset-0 z-[100]"
          >
            <CinematicIntro onComplete={() => setShowIntro(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient Overlay Layer */}
      <AnimatePresence>
        {effectiveRegime && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             transition={{ duration: 0.5 }}
             className={`fixed inset-0 pointer-events-none z-[-1] transition-colors duration-700 ${getAmbientBackground()}`}
           />
        )}
      </AnimatePresence>

      {!showIntro && (
        <motion.div
          key="main-app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          id="monsoon-ai-app-root"
          className={`min-h-screen text-slate-900 flex flex-col font-sans relative z-10 ${effectiveRegime ? 'bg-transparent' : 'bg-slate-50 transition-colors duration-1000'}`}
        >
          {/* App Header & Navigation */}
          <Header
        onDownloadReport={handleDownloadReport}
        selectedStationId={selectedStationId}
        onStationChange={setSelectedStationId}
        selectedLeadTime={selectedLeadTime}
        onLeadTimeChange={setSelectedLeadTime}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        totalSamples={filteredData.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6" id="dashboard-content">
            {/* Real-time Metric Overview Scorecards */}
            <AnimatedSection delay={0.1}>
              <MetricCards metrics={metrics} />
            </AnimatedSection>

            <AnimatedSection delay={0.2}>
              <LiveMap selectedStationId={selectedStationId} data={filteredData} />
            </AnimatedSection>
            {/* Time Series Visualizer */}
            <AnimatedSection delay={0.3}>
              <ForecastChart
              data={filteredData}
              selectedStationName={activeStationName}
              compareData={compareData}
              compareYear={compareYear}
              isComparing={isComparing}
              onToggleCompare={() => setIsComparing(!isComparing)}
              onCompareYearChange={setCompareYear}
            />
            </AnimatedSection>

            {/* IMD Regime Breakdown & Diagnostic Cards */}
            <AnimatedSection delay={0.4}>
              <RegimeBreakdownView
              breakdowns={regimeBreakdowns}
              totalSamples={filteredData.length}
              selectedYear={selectedYear}
            />
            </AnimatedSection>

            {/* Meteorological Observatories Grid */}
            <AnimatedSection delay={0.5}>
              <StationOverview
              selectedStationId={selectedStationId}
              onSelectStation={setSelectedStationId}
            />
            </AnimatedSection>
          </div>
        )}

        {activeTab === 'predictor' && (
          <InteractivePredictor />
        )}
        {activeTab === 'planner' && (
          <ActionPlanner />
        )}

        {activeTab === 'methodology' && (
          <MethodologyView />
        )}

        {activeTab === 'help' && (
          <HelpGuideView />
        )}
      </main>

      {/* Scientific Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-blue-600" />
            <span>
              <strong>Operational AI Platform</strong>: Regime-Aware Post-Processing of Monsoon Rainfall Forecasts
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <button
              onClick={() => setActiveTab('help')}
              className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
            >
              Terms & Glossary Help
            </button>
            <span>•</span>
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
      
      <ChatAssistant />
        </motion.div>
      )}
    </>
  );
}
