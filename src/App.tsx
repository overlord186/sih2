import { AnimatedSection } from './components/AnimatedSection';
import { ErrorBoundary } from './components/ErrorBoundary';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Header, NavigationTab } from './components/Header';
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
import { LiveSynopticMarquee } from './components/LiveSynopticMarquee';
import { ScenarioScrubberBar } from './components/ScenarioScrubberBar';
import { WeatherRegimeClassifierView } from './components/WeatherRegimeClassifierView';
import { HeavyRainfallProbabilityView } from './components/HeavyRainfallProbabilityView';
import { DistrictRainfallProductView } from './components/DistrictRainfallProductView';
import { VerificationReportView } from './components/VerificationReportView';
import { WeatherBulletinModal } from './components/WeatherBulletinModal';
import { GlassmorphicGuideModal } from './components/GlassmorphicGuideModal';
import { CustomDataUploader } from './components/CustomDataUploader';
import { MONSOON_DATASET, MET_STATIONS } from './data/monsoonDataset';
import { calculateMetrics, calculateRegimeBreakdown } from './ml/postProcessor';
import { ShieldCheck, CloudRain, Award, Activity, Sparkles } from 'lucide-react';
import { CinematicIntro } from './components/CinematicIntro';
import { ChatAssistant } from './components/ChatAssistant';
import { AtmosphericEdgeSmog } from './components/AtmosphericEdgeSmog';
import { AtmosphericEntranceTransition } from './components/AtmosphericEntranceTransition';

import { AtmosphereWidget, AtmosphereMode } from './components/AtmosphereWidget';
import { WeatherBackground3D } from './components/WeatherBackground3D';
import { DashboardEngineControls } from './components/DashboardEngineControls';
import { weatherSynth } from './utils/audio';

import { motion, AnimatePresence } from 'motion/react';
import { RainfallRegime } from './types';

export default function App() {
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.location) {
        const params = new URLSearchParams(window.location.search);
        if (params.get('intro') === '1' || params.get('playIntro') === 'true') {
          return true;
        }
      }
    } catch {
      // Fallback
    }
    return false;
  });
  const [isFogClearing, setIsFogClearing] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true); // Default to muted until user opts in
  const [selectedStationId, setSelectedStationId] = useState<string>('ALL');
  const [selectedLeadTime, setSelectedLeadTime] = useState<number>(1); // default to Day +1
  const [selectedYear, setSelectedYear] = useState<number>(2025); // default to 2025 Operational Season
  const [selectedSeasonPhase, setSelectedSeasonPhase] = useState<number>(2); // 1 to 4: Peak Monsoon default
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [isBulletinModalOpen, setIsBulletinModalOpen] = useState<boolean>(false);
  const [ambientRegime, setAmbientRegime] = useState<RainfallRegime | null>(null);
  const [hoverIntensity, setHoverIntensity] = useState<number>(0);
  const [atmosphereMode, setAtmosphereMode] = useState<AtmosphereMode>('auto');
  
  const effectiveIntensity = useMemo(() => {
    switch (atmosphereMode) {
      case 'clear': return 0;
      case 'drizzle': return 25;
      case 'heavy': return 85;
      case 'cyclone': return 150;
      case 'dark_mode': return 140;
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
      if (atmosphereMode === 'dark_mode') return RainfallRegime.HEAVY_EXTREME;
    }
    return ambientRegime;
  }, [atmosphereMode, ambientRegime]);

  useEffect(() => {
    if (atmosphereMode === 'dark_mode') {
      document.body.classList.add('dark-black-font-mode');
    } else {
      document.body.classList.remove('dark-black-font-mode');
    }
    return () => {
      document.body.classList.remove('dark-black-font-mode');
    };
  }, [atmosphereMode]);

  useEffect(() => {
    weatherSynth.setIntensity(effectiveIntensity);
  }, [effectiveIntensity]);

  const toggleAudio = () => {
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);
    weatherSynth.setMuted(nextMuted);
  };

  const handleIntroComplete = () => {
    // Automatically stop audio by itself when landing on the interactive screen
    setIsAudioMuted(true);
    weatherSynth.setMuted(true);
    
    // Defer heavy DOM mounting to prevent synchronous thread lock
    requestAnimationFrame(() => {
      setIsFogClearing(true);
      setTimeout(() => {
        setShowIntro(false);
      }, 50);
    });
  };

  // Fail-safe to ensure transition layer clears cleanly
  useEffect(() => {
    if (isFogClearing) {
      const timer = setTimeout(() => {
        setIsFogClearing(false);
      }, 1100);
      return () => clearTimeout(timer);
    }
  }, [isFogClearing]);

  // Fail-safe to ensure cinematic intro never traps the application on a black screen
  useEffect(() => {
    if (showIntro) {
      const timer = setTimeout(() => {
        handleIntroComplete();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [showIntro]);

  const handleReplayIntro = () => {
    setIsFogClearing(false);
    setShowIntro(true);
  };
  
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [compareYear, setCompareYear] = useState<number>(2024);
  const [isGlassGuideOpen, setIsGlassGuideOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleOpenGlassGuide = () => setIsGlassGuideOpen(true);
    window.addEventListener('open-glassmorphic-guide', handleOpenGlassGuide);
    return () => window.removeEventListener('open-glassmorphic-guide', handleOpenGlassGuide);
  }, []);

  useEffect(() => {
    const handleAmbientUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail) return;
      const { regime, intensity } = customEvent.detail;
      setAmbientRegime(prev => (prev === regime ? prev : regime));
      setHoverIntensity(prev => (prev === (intensity || 0) ? prev : (intensity || 0)));
    };
    window.addEventListener('app-ambient-update', handleAmbientUpdate);
    return () => window.removeEventListener('app-ambient-update', handleAmbientUpdate);
  }, []);

  // Filter dataset based on selected station, lead time, and season year (for charts)
  const filteredData = useMemo(() => {
    return MONSOON_DATASET.filter((d) => {
      const matchYear = selectedYear === 0 || d.year === selectedYear;
      const matchStation = selectedStationId === 'ALL' || d.stationId === selectedStationId;
      const matchLead = selectedLeadTime === 0 || d.leadTimeDays === selectedLeadTime;
      return matchYear && matchStation && matchLead;
    });
  }, [selectedYear, selectedStationId, selectedLeadTime]);

  // Filter dataset for the Map (needs all stations to maintain colors)
  const mapData = useMemo(() => {
    return MONSOON_DATASET.filter((d) => {
      const matchYear = selectedYear === 0 || d.year === selectedYear;
      const matchLead = selectedLeadTime === 0 || d.leadTimeDays === selectedLeadTime;
      return matchYear && matchLead;
    });
  }, [selectedYear, selectedLeadTime]);

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
      <LightningFlashOverlay intensity={effectiveIntensity} isDarkModeActive={atmosphereMode === 'dark_mode'} />
      {/* 3D Real-time Ambient Weather Simulation Background */}
      {(!showIntro || isFogClearing) && (
        <div className={`transition-opacity duration-1000 ${showIntro ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <WeatherBackground3D mode={atmosphereMode} selectedSeasonPhase={selectedSeasonPhase} />
        </div>
      )}
      {!showIntro && (
        <div className="md:hidden fixed top-20 right-4 z-30 pointer-events-auto">
          <DashboardEngineControls compact />
        </div>
      )}
      <AtmosphereWidget mode={atmosphereMode} onChange={setAtmosphereMode} />
      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="intro-wrapper"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[100]"
          >
            <ErrorBoundary 
              fallbackTitle="Cinematic Sequence Recovery"
              onBypass={handleIntroComplete}
              bypassLabel="Skip Directly to Dashboard"
            >
              <CinematicIntro 
                onComplete={handleIntroComplete}
                isAudioMuted={isAudioMuted}
                onToggleAudio={toggleAudio}
              />
            </ErrorBoundary>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ultra-High-Fidelity Atmospheric Cloud Piercing & Interface Entry Transition */}
      <AnimatePresence>
        {isFogClearing && (
          <ErrorBoundary onBypass={() => setIsFogClearing(false)} fallbackTitle="Transition Layer Recovery">
            <AtmosphericEntranceTransition onComplete={() => setIsFogClearing(false)} />
          </ErrorBoundary>
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

      <motion.div
        key="main-app"
        initial={false}
        animate={{ 
          opacity: 1, 
          y: showIntro ? 14 : 0, 
          scale: showIntro ? 0.99 : 1
        }}
        style={{ pointerEvents: showIntro ? 'none' : 'auto' }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        id="monsoon-ai-app-root"
        className={`min-h-screen text-slate-900 flex flex-col font-sans relative z-10 ${showIntro ? 'fixed inset-0 overflow-hidden h-screen' : ''} bg-slate-50`}
      >
          {/* App Header & Navigation */}
          <Header
            onDownloadReport={handleDownloadReport}
            onOpenBulletin={() => setIsBulletinModalOpen(true)}
            onReplayIntro={handleReplayIntro}
            selectedStationId={selectedStationId}
            onStationChange={setSelectedStationId}
            selectedLeadTime={selectedLeadTime}
            onLeadTimeChange={setSelectedLeadTime}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            totalSamples={filteredData.length}
            isAudioMuted={isAudioMuted}
            onToggleAudio={toggleAudio}
          />

          {/* Live Breaking Synoptic Radar Marquee Ticker */}
          <LiveSynopticMarquee onSelectStation={setSelectedStationId} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <ErrorBoundary fallbackTitle="Active View Module Recovery">
        {activeTab === 'dashboard' && (
          <div className="space-y-6" id="dashboard-content">
            {/* Print-Only Official Report Header Banner */}
            <div className="hidden print:block p-4 border-b-2 border-slate-900 bg-white mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    SAMVARTAKA AI — Meteorological Forecast Evaluation Dossier
                  </h1>
                  <p className="text-xs text-slate-700 font-mono mt-0.5">
                    Operational AI Post-Processing System • IMD Regime Analysis & Model Diagnostics
                  </p>
                </div>
                <div className="text-right text-xs text-slate-800 font-mono">
                  <div><strong>Observatory:</strong> {activeStationName}</div>
                  <div><strong>Season Filter:</strong> {selectedYear === 0 ? 'All Seasons (2023-2025)' : `Season ${selectedYear}`}</div>
                  <div><strong>Lead Time:</strong> {selectedLeadTime === 0 ? 'All Lead Times' : `Day +${selectedLeadTime}`}</div>
                  <div><strong>Dossier Date:</strong> {new Date().toLocaleDateString()}</div>
                </div>
              </div>
            </div>

            {/* Interactive Scenario Launchers & Seasonal Progression Scrubber */}
            <AnimatedSection delay={0.05}>
              <ScenarioScrubberBar
                selectedStationId={selectedStationId}
                onSelectStation={setSelectedStationId}
                selectedYear={selectedYear}
                onSelectYear={setSelectedYear}
                selectedLeadTime={selectedLeadTime}
                onSelectLeadTime={setSelectedLeadTime}
                selectedSeasonPhase={selectedSeasonPhase}
                onSeasonPhaseChange={(phase) => {
                  setSelectedSeasonPhase(phase);
                  // Update atmosphere intensity based on selected phase
                  const intensityMap: Record<number, number> = { 1: 30, 2: 95, 3: 55, 4: 15 };
                  setHoverIntensity(intensityMap[phase] || 45);
                }}
              />
            </AnimatedSection>

            {/* Real-time Metric Overview Scorecards */}
            <AnimatedSection delay={0.1}>
              <MetricCards metrics={metrics} />
            </AnimatedSection>

            <AnimatedSection delay={0.2}>
              <LiveMap 
                selectedStationId={selectedStationId} 
                data={mapData} 
                onSelectStation={setSelectedStationId}
              />
            </AnimatedSection>
            {/* Time Series Visualizer */}
            <AnimatedSection delay={0.3}>
              <ForecastChart
              data={mapData}
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

        {activeTab === 'regimes' && (
          <WeatherRegimeClassifierView
            dataset={filteredData}
            onSelectStation={(id) => {
              setSelectedStationId(id);
              setActiveTab('dashboard');
            }}
          />
        )}

        {activeTab === 'probabilities' && (
          <HeavyRainfallProbabilityView
            dataset={filteredData}
            onSelectStation={(id) => {
              setSelectedStationId(id);
              setActiveTab('dashboard');
            }}
          />
        )}

        {activeTab === 'districts' && (
          <DistrictRainfallProductView
            dataset={filteredData}
            selectedLeadTime={selectedLeadTime}
            onSelectStation={(id) => {
              setSelectedStationId(id);
              setActiveTab('dashboard');
            }}
          />
        )}

        {activeTab === 'verification' && (
          <VerificationReportView dataset={filteredData} />
        )}

        {activeTab === 'uploader' && (
          <CustomDataUploader />
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
        </ErrorBoundary>
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
            <button
              onClick={() => setIsGlassGuideOpen(true)}
              className="text-sky-600 hover:text-sky-800 font-semibold underline underline-offset-2 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-cyan-500" />
              Glassmorphic UI Architecture
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
      </motion.div>

      {/* Weather Bulletin Modal */}
      <WeatherBulletinModal
        isOpen={isBulletinModalOpen}
        onClose={() => setIsBulletinModalOpen(false)}
        dataset={filteredData}
      />

      {/* Glassmorphic UI Design Architecture Modal */}
      <GlassmorphicGuideModal
        isOpen={isGlassGuideOpen}
        onClose={() => setIsGlassGuideOpen(false)}
      />

      {/* Global AI Meteorological Assistant (Available in both Intro and Dashboard) */}
      <ChatAssistant isIntroActive={showIntro} />
    </>
  );
}
