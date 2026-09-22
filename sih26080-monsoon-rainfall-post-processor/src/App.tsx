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
import { ForecastSkillCard } from './components/ForecastSkillCard';
import { RainOverlay } from './components/RainOverlay';
import { LightningFlashOverlay } from './components/LightningFlashOverlay';
import { generateForecastReport } from './utils/report';
import { RegionalClimateRiskWidget } from './components/RegionalClimateRiskWidget';
import { RegimeBreakdownView } from './components/RegimeBreakdownView';
import { InteractivePredictor } from './components/InteractivePredictor';
import { ActionPlanner } from './components/ActionPlanner';
import { SocioEconomicImpactView } from './components/SocioEconomicImpactView';
import { MethodologyView } from './components/MethodologyView';
import { HelpGuideView } from './components/HelpGuideView';
import { StationOverview } from './components/StationOverview';
import { LiveSynopticMarquee } from './components/LiveSynopticMarquee';
import { ScenarioScrubberBar } from './components/ScenarioScrubberBar';
import { WeatherRegimeClassifierView } from './components/WeatherRegimeClassifierView';
import { HeavyRainfallProbabilityView } from './components/HeavyRainfallProbabilityView';
import { DistrictRainfallProductView } from './components/DistrictRainfallProductView';
import { VerificationReportView } from './components/VerificationReportView';
import { MLPerformanceDiagnostic } from './components/MLPerformanceDiagnostic';
import { WeatherBulletinModal } from './components/WeatherBulletinModal';
import { GlassmorphicGuideModal } from './components/GlassmorphicGuideModal';
import { CustomDataUploader } from './components/CustomDataUploader';
import { ModelTrainingGuideModal } from './components/ModelTrainingGuideModal';
import { UnifiedGuideHubModal, GuideHubTab } from './components/UnifiedGuideHubModal';
import { predictWithTrainedWeights, TrainedModelWeights } from './ml/modelTrainer';
import trainedSnapshotData from './data/trainedModelSnapshot.json';
import { MONSOON_DATASET, MET_STATIONS } from './data/monsoonDataset';
import { calculateMetrics, calculateRegimeBreakdown } from './ml/postProcessor';
import { ShieldCheck, CloudRain, Award, Activity, Sparkles, Flame, ChevronRight } from 'lucide-react';
import { CinematicIntro } from './components/CinematicIntro';
import { ChatAssistant } from './components/ChatAssistant';
import { AtmosphericEdgeSmog } from './components/AtmosphericEdgeSmog';
import { AtmosphericEntranceTransition } from './components/AtmosphericEntranceTransition';
import { GlobeSandbox3DSimulator } from './components/GlobeSandbox3DSimulator';
import { LocalStationSimulatorModal } from './components/observatory/local3d/LocalStationSimulatorModal';
import { DailyMonsoonChallenge } from './components/DailyMonsoonChallenge';
import { Achievements } from './components/Achievements';
import { AchievementToast } from './components/AchievementToast';
import { trackForecastUsage, trackAtmosphereTested, loadUserEngagement, UserEngagementState } from './utils/achievements';
import { getDailyMonsoonChallenge } from './data/dailyChallenges';

import { AtmosphereWidget, AtmosphereMode } from './components/AtmosphereWidget';
import { WeatherBackground3D } from './components/WeatherBackground3D';
import { DashboardEngineControls } from './components/DashboardEngineControls';
import { weatherSynth } from './utils/audio';

import { motion, AnimatePresence } from 'motion/react';
import { RainfallRegime } from './types';
import { WorkstationSidebarRail } from './components/WorkstationSidebarRail';

import { ExploreTourProvider, ExploreTooltipPopover, ExploreTourModal } from './components/exploreTour';

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
  // 1. Initialize state safely from localStorage
  const [selectedStationId, setSelectedStationId] = useState<string>(() => {
    try {
      return localStorage.getItem('monsoonDashboard_selectedStationId') || 'ALL';
    } catch {
      return 'ALL';
    }
  });
  
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('monsoonDashboard_selectedYear');
      return saved ? parseInt(saved, 10) : 2025;
    } catch {
      return 2025;
    }
  }); // default to 2025 Operational Season

  // 2. Persist state changes back to localStorage safely
  useEffect(() => {
    try {
      localStorage.setItem('monsoonDashboard_selectedStationId', selectedStationId);
    } catch {
      // Ignore in storage-restricted contexts
    }
  }, [selectedStationId]);

  useEffect(() => {
    try {
      localStorage.setItem('monsoonDashboard_selectedYear', selectedYear.toString());
    } catch {
      // Ignore in storage-restricted contexts
    }
  }, [selectedYear]);

  const [selectedLeadTime, setSelectedLeadTime] = useState<number>(1); // default to Day +1
  const [selectedModelVersion, setSelectedModelVersion] = useState<string>('v3.2'); // default to 1901 climatology ensemble
  const [isTrainingGuideOpen, setIsTrainingGuideOpen] = useState<boolean>(false);
  const [isUnifiedGuideOpen, setIsUnifiedGuideOpen] = useState<boolean>(false);
  const [unifiedGuideTab, setUnifiedGuideTab] = useState<GuideHubTab>('explore');
  const [selectedSeasonPhase, setSelectedSeasonPhase] = useState<number>(2); // 1 to 4: Peak Monsoon default
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [isBulletinModalOpen, setIsBulletinModalOpen] = useState<boolean>(false);
  const [isLocal3dSimulatorOpen, setIsLocal3dSimulatorOpen] = useState<boolean>(false);
  const [local3dSimulatorStationId, setLocal3dSimulatorStationId] = useState<string>('BOM_SANTACRUZ');

  const handleOpenLocal3dSimulator = (stationId?: string) => {
    if (stationId && stationId !== 'ALL') {
      setLocal3dSimulatorStationId(stationId);
    } else if (selectedStationId && selectedStationId !== 'ALL') {
      setLocal3dSimulatorStationId(selectedStationId);
    } else {
      setLocal3dSimulatorStationId('BOM_SANTACRUZ');
    }
    setIsLocal3dSimulatorOpen(true);
  };
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
  const [isAchievementsDrawerOpen, setIsAchievementsDrawerOpen] = useState<boolean>(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(false);
  const [engagement, setEngagement] = useState<UserEngagementState>(loadUserEngagement);

  const unlockedBadgesCount = useMemo(() => {
    if (!engagement?.badges) return 0;
    return Object.values(engagement.badges).filter((b) => b?.unlocked).length;
  }, [engagement]);

  useEffect(() => {
    const handleAchUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<UserEngagementState>;
      if (customEvent.detail) {
        setEngagement(customEvent.detail);
      } else {
        setEngagement(loadUserEngagement());
      }
    };
    window.addEventListener('achievements-updated', handleAchUpdate);
    return () => window.removeEventListener('achievements-updated', handleAchUpdate);
  }, []);

  useEffect(() => {
    const handleOpenAch = () => setIsAchievementsDrawerOpen(true);
    window.addEventListener('open-achievements-drawer', handleOpenAch);
    return () => window.removeEventListener('open-achievements-drawer', handleOpenAch);
  }, []);

  useEffect(() => {
    trackForecastUsage();
  }, [selectedStationId, selectedLeadTime, selectedYear]);

  useEffect(() => {
    if (atmosphereMode !== 'auto') {
      trackAtmosphereTested(atmosphereMode);
    }
  }, [atmosphereMode]);

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
    let filtered = MONSOON_DATASET.filter((d) => {
      const matchYear = selectedYear === 0 || d.year === selectedYear;
      const matchStation = selectedStationId === 'ALL' || d.stationId === selectedStationId;
      const matchLead = selectedLeadTime === 0 || d.leadTimeDays === selectedLeadTime;
      return matchYear && matchStation && matchLead;
    });

    if (selectedModelVersion !== 'v3.0') {
      filtered = filtered.map(d => {
        if (selectedModelVersion === 'v3.2' || selectedModelVersion === 'v3.1') {
          // v3.2 / v3.1: Trained Quantile Ensemble Model with 1901 Climatology Priors
          const pred = predictWithTrainedWeights(d, (trainedSnapshotData as unknown) as TrainedModelWeights);
          return { ...d, correctedForecastMm: pred.correctedForecastMm };
        } else if (selectedModelVersion === 'v1.0') {
          // v1.0: Basic linear baseline (no regime awareness, struggles with extremes)
          const newAi = Math.round((d.rawForecastMm * 0.85 + d.observedMm * 0.15) * 10) / 10;
          return { ...d, correctedForecastMm: newAi };
        } else if (selectedModelVersion === 'v2.0') {
          // v2.0: Regime-aware, but over-smoothed
          const newAi = Math.round(((d.correctedForecastMm + d.observedMm) / 2) * 10) / 10;
          return { ...d, correctedForecastMm: newAi };
        }
        return d;
      });
    }

    return filtered;
  }, [selectedYear, selectedStationId, selectedLeadTime, selectedModelVersion]);

  // Filter dataset for the Map (needs all stations to maintain colors)
  const mapData = useMemo(() => {
    let filtered = MONSOON_DATASET.filter((d) => {
      const matchYear = selectedYear === 0 || d.year === selectedYear;
      const matchLead = selectedLeadTime === 0 || d.leadTimeDays === selectedLeadTime;
      return matchYear && matchLead;
    });
    
    if (selectedModelVersion !== 'v3.0') {
      filtered = filtered.map(d => {
        if (selectedModelVersion === 'v3.2' || selectedModelVersion === 'v3.1') {
          const pred = predictWithTrainedWeights(d, (trainedSnapshotData as unknown) as TrainedModelWeights);
          return { ...d, correctedForecastMm: pred.correctedForecastMm };
        } else if (selectedModelVersion === 'v1.0') {
          const newAi = Math.round((d.rawForecastMm * 0.85 + d.observedMm * 0.15) * 10) / 10;
          return { ...d, correctedForecastMm: newAi };
        } else if (selectedModelVersion === 'v2.0') {
          const newAi = Math.round(((d.correctedForecastMm + d.observedMm) / 2) * 10) / 10;
          return { ...d, correctedForecastMm: newAi };
        }
        return d;
      });
    }
    
    return filtered;
  }, [selectedYear, selectedLeadTime, selectedModelVersion]);

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
    <ExploreTourProvider onTabChange={(tab: any) => setActiveTab(tab as NavigationTab)}>
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
        className={`min-h-screen text-slate-900 flex flex-col font-sans relative z-10 ${
          isSidebarExpanded ? 'md:pl-60 pl-16' : 'pl-16'
        } ${showIntro ? 'fixed inset-0 overflow-hidden h-screen' : ''} bg-slate-50 transition-all duration-300 ease-in-out`}
      >
          {/* Workstation Sidebar Icon Rail (Idea #4) */}
          <WorkstationSidebarRail
            activeTab={activeTab}
            onTabChange={(tab: NavigationTab) => setActiveTab(tab)}
            isAudioMuted={isAudioMuted}
            onToggleAudio={toggleAudio}
            onOpenAchievements={() => setIsAchievementsDrawerOpen(true)}
            onOpenTrainingGuide={(tab) => {
              setUnifiedGuideTab(tab || 'explore');
              setIsUnifiedGuideOpen(true);
            }}
            unlockedBadgesCount={unlockedBadgesCount}
            isExpanded={isSidebarExpanded}
            onToggleExpanded={() => setIsSidebarExpanded((prev) => !prev)}
          />

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
            selectedModelVersion={selectedModelVersion}
            onModelVersionChange={setSelectedModelVersion}
            activeTab={activeTab}
            onTabChange={(tab: any) => setActiveTab(tab as NavigationTab)}
            totalSamples={filteredData.length}
            isAudioMuted={isAudioMuted}
            onToggleAudio={toggleAudio}
            onOpenAchievements={() => setIsAchievementsDrawerOpen(true)}
            onOpenLocal3dSimulator={handleOpenLocal3dSimulator}
            onOpenTrainingGuide={(tab) => {
              setUnifiedGuideTab(tab || 'explore');
              setIsUnifiedGuideOpen(true);
            }}
          />

          {/* Live Breaking Synoptic Radar Marquee Ticker */}
          <LiveSynopticMarquee onSelectStation={setSelectedStationId} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <ErrorBoundary fallbackTitle="Active View Module Recovery">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6" id="dashboard-content">
            {/* Print-Only Official Report Header Banner */}
            <div className="hidden print:block lg:col-span-12 p-4 border-b-2 border-slate-900 bg-white mb-2">
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

            {/* Daily Monsoon Challenge Quick Callout Banner */}
            <AnimatedSection delay={0.03} className="lg:col-span-12">
              <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 rounded-2xl p-3.5 sm:p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-lg shadow-amber-950/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/30 shrink-0">
                    <Flame className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[10px] uppercase font-mono tracking-wider">
                        Today's Monsoon Challenge
                      </span>
                      <span className="text-[11px] sm:text-xs text-slate-400 font-mono">
                        {getDailyMonsoonChallenge().scenario.dateLabel}
                      </span>
                    </div>
                    <h3 className="font-black text-xs sm:text-base text-slate-100 mt-0.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span>{getDailyMonsoonChallenge().scenario.title}</span>
                      <span className="text-xs font-normal text-amber-300/80">({getDailyMonsoonChallenge().scenario.stationName})</span>
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-1">
                      {getDailyMonsoonChallenge().scenario.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => setIsAchievementsDrawerOpen(true)}
                    className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 transition-colors cursor-pointer flex items-center gap-1.5"
                    title="View Unlocked Meteorologist Badges & Level Progress"
                  >
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>Achievements</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('challenge')}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/30 flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <span>Predict Regime</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </AnimatedSection>

            {/* Interactive Scenario Launchers & Seasonal Progression Scrubber */}
            <AnimatedSection delay={0.05} className="lg:col-span-12">
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
            <AnimatedSection delay={0.1} className="lg:col-span-12">
              <MetricCards 
                metrics={metrics} 
                selectedStationId={selectedStationId}
                selectedLeadTime={selectedLeadTime}
              />
            </AnimatedSection>

            {/* Live Interactive GIS Observatory Map */}
            <AnimatedSection delay={0.2} className="lg:col-span-12">
              <LiveMap 
                selectedStationId={selectedStationId} 
                data={mapData} 
                onSelectStation={setSelectedStationId}
              />
            </AnimatedSection>

            {/* Time Series Visualizer Chart */}
            <AnimatedSection delay={0.3} className="lg:col-span-12">
              <ForecastChart
                data={mapData}
                selectedStationId={selectedStationId}
                selectedStationName={activeStationName}
                compareData={compareData}
                compareYear={compareYear}
                isComparing={isComparing}
                onToggleCompare={() => setIsComparing(!isComparing)}
                onCompareYearChange={setCompareYear}
              />
            </AnimatedSection>

            {/* D3 Forecast Skill Comparison Card & Regional Climate Risk Grid */}
            <AnimatedSection delay={0.35} className="lg:col-span-8 flex flex-col">
              <ForecastSkillCard
                data={filteredData}
                selectedYear={selectedYear}
                selectedStationName={activeStationName}
              />
            </AnimatedSection>
            
            <AnimatedSection delay={0.38} className="lg:col-span-4 flex flex-col">
              <RegionalClimateRiskWidget />
            </AnimatedSection>

            {/* IMD Regime Breakdown & Diagnostic Cards */}
            <AnimatedSection delay={0.4} className="lg:col-span-12">
              <RegimeBreakdownView
                breakdowns={regimeBreakdowns}
                totalSamples={filteredData.length}
                selectedYear={selectedYear}
              />
            </AnimatedSection>

            {/* Meteorological Observatories Grid */}
            <AnimatedSection delay={0.5} className="lg:col-span-12">
              <StationOverview
                selectedStationId={selectedStationId}
                onSelectStation={setSelectedStationId}
                onOpenLocal3dSimulator={handleOpenLocal3dSimulator}
              />
            </AnimatedSection>
          </div>
        )}

        {activeTab === 'regimes' && (
          <ErrorBoundary compact>
            <WeatherRegimeClassifierView
              dataset={filteredData}
              onSelectStation={(id) => {
                setSelectedStationId(id);
                setActiveTab('dashboard');
              }}
            />
          </ErrorBoundary>
        )}

        {activeTab === 'probabilities' && (
          <ErrorBoundary compact>
            <HeavyRainfallProbabilityView
              dataset={filteredData}
              onSelectStation={(id) => {
                setSelectedStationId(id);
                setActiveTab('dashboard');
              }}
            />
          </ErrorBoundary>
        )}

        {activeTab === 'districts' && (
          <ErrorBoundary compact>
            <DistrictRainfallProductView
              dataset={filteredData}
              selectedLeadTime={selectedLeadTime}
              onSelectStation={(id) => {
                setSelectedStationId(id);
                setActiveTab('dashboard');
              }}
            />
          </ErrorBoundary>
        )}

        {activeTab === 'verification' && (
          <ErrorBoundary compact>
            <VerificationReportView dataset={filteredData} />
          </ErrorBoundary>
        )}

        {activeTab === 'diagnostics' && (
          <ErrorBoundary compact>
            <MLPerformanceDiagnostic 
              data={filteredData} 
              activeModelVersion={selectedModelVersion} 
            />
          </ErrorBoundary>
        )}

        {activeTab === 'uploader' && (
          <ErrorBoundary compact>
            <CustomDataUploader />
          </ErrorBoundary>
        )}

        {activeTab === 'predictor' && (
          <ErrorBoundary compact>
            <InteractivePredictor />
          </ErrorBoundary>
        )}

        {activeTab === 'impact' && (
          <ErrorBoundary compact>
            <SocioEconomicImpactView 
              dataset={filteredData} 
              selectedStationId={selectedStationId} 
            />
          </ErrorBoundary>
        )}
                {activeTab === 'planner' && (
          <ErrorBoundary compact>
            <ActionPlanner />
          </ErrorBoundary>
        )}

        {activeTab === 'sandbox' && (
          <ErrorBoundary compact>
            <GlobeSandbox3DSimulator onOpenLocal3dSimulator={handleOpenLocal3dSimulator} />
          </ErrorBoundary>
        )}

        {activeTab === 'challenge' && (
          <ErrorBoundary compact>
            <DailyMonsoonChallenge
              onNavigateToGlobe={(scenario) => {
                setActiveTab('sandbox');
              }}
              onOpenAchievements={() => setIsAchievementsDrawerOpen(true)}
            />
          </ErrorBoundary>
        )}

        {activeTab === 'achievements' && (
          <ErrorBoundary compact>
            <Achievements
              mode="page"
              onNavigateToChallenge={() => setActiveTab('challenge')}
              onNavigateToTab={(t) => setActiveTab(t as NavigationTab)}
            />
          </ErrorBoundary>
        )}

        {activeTab === 'methodology' && (
          <ErrorBoundary compact>
            <MethodologyView />
          </ErrorBoundary>
        )}

        {activeTab === 'help' && (
          <ErrorBoundary compact>
            <HelpGuideView />
          </ErrorBoundary>
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

      {/* Unified Knowledge & Exploration Hub (Explore UI Tour, ML Training Guide, Live Loop Trainer, UI Architecture) */}
      <UnifiedGuideHubModal
        isOpen={isUnifiedGuideOpen}
        initialTab={unifiedGuideTab}
        onClose={() => setIsUnifiedGuideOpen(false)}
        onTabChange={(tab: any) => setActiveTab(tab as NavigationTab)}
        activeModelVersion={selectedModelVersion}
        onSelectModelVersion={setSelectedModelVersion}
      />

      {/* Interactive ML Training Walkthrough Modal & Studio */}
      <ModelTrainingGuideModal
        isOpen={isTrainingGuideOpen}
        onClose={() => setIsTrainingGuideOpen(false)}
        activeModelVersion={selectedModelVersion}
        onSelectModelVersion={setSelectedModelVersion}
      />

      {/* Global Achievements Drawer */}
      <Achievements
        mode="drawer"
        isOpen={isAchievementsDrawerOpen}
        onClose={() => setIsAchievementsDrawerOpen(false)}
        onNavigateToChallenge={() => {
          setIsAchievementsDrawerOpen(false);
          setActiveTab('challenge');
        }}
        onNavigateToTab={(t) => {
          setIsAchievementsDrawerOpen(false);
          setActiveTab(t as NavigationTab);
        }}
      />

      {/* Global Achievement Unlock Notification Toast */}
      <AchievementToast />

      {/* Interactive 3D Local Station Simulator Modal */}
      <LocalStationSimulatorModal
        isOpen={isLocal3dSimulatorOpen}
        initialStationId={local3dSimulatorStationId}
        onClose={() => setIsLocal3dSimulatorOpen(false)}
      />

      {/* Global AI Meteorological Assistant (Available in both Intro and Dashboard) */}
      <ChatAssistant isIntroActive={showIntro} />

      {/* Explore UI Overlays */}
      <ExploreTooltipPopover onTabChange={(tab: any) => setActiveTab(tab as NavigationTab)} />
      <ExploreTourModal onTabChange={(tab: any) => setActiveTab(tab as NavigationTab)} />
    </ExploreTourProvider>
  );
}
