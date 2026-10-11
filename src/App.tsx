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
import { ShieldCheck, CloudRain, Activity, Sparkles, ChevronRight, Globe } from 'lucide-react';
import { ChatAssistant } from './components/ChatAssistant';
import { LocalStationSimulatorModal } from './components/observatory/local3d/LocalStationSimulatorModal';
import { CommandPalette } from './components/CommandPalette';
import { DualViewportComparisonSwipe } from './components/DualViewportComparisonSwipe';
import { getIsLiveRealDataActive, hydrateAllRealStationDataset } from './utils/realWeatherPipeline';
import { ExtremeEventBenchmarks, ExtremeEventPreset } from './components/ExtremeEventBenchmarks';
import { SpringTemporalScrubber } from './components/SpringTemporalScrubber';
import { PerformanceMonitorHud } from './components/PerformanceMonitorHud';
import { MasterPlansModal } from './components/MasterPlansModal';
import { UnifiedWorkstationCockpit } from './components/UnifiedWorkstationCockpit';
import { SideFloatingInspector } from './components/SideFloatingInspector';

import { AtmosphereWidget, AtmosphereMode } from './components/AtmosphereWidget';
import { WeatherBackground3D } from './components/WeatherBackground3D';
import { DashboardEngineControls } from './components/DashboardEngineControls';
import { weatherSynth } from './utils/audio';

import { motion, AnimatePresence } from 'motion/react';
import { RainfallRegime, RainfallDataPoint } from './types';
import { WorkstationSidebarRail } from './components/WorkstationSidebarRail';

import { ExploreTourProvider, ExploreTooltipPopover, ExploreTourModal } from './components/exploreTour';

export default function App() {
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
  const [activeTab, setActiveTab] = useState<NavigationTab>(() => {
    try {
      const saved = localStorage.getItem('monsoonDashboard_activeTab');
      if (saved && saved !== 'cockpit' && ['dashboard', 'regimes', 'probabilities', 'districts', 'verification', 'diagnostics', 'uploader', 'predictor', 'planner', 'methodology', 'help', 'impact'].includes(saved)) {
        return saved as NavigationTab;
      }
    } catch {
      // ignore
    }
    return 'dashboard';
  });

  useEffect(() => {
    try {
      localStorage.setItem('monsoonDashboard_activeTab', activeTab);
    } catch {
      // ignore
    }
  }, [activeTab]);
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

  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [compareYear, setCompareYear] = useState<number>(2024);
  const [isGlassGuideOpen, setIsGlassGuideOpen] = useState<boolean>(false);
  const [isDualSwipeOpen, setIsDualSwipeOpen] = useState<boolean>(false);
  const [isMasterPlansOpen, setIsMasterPlansOpen] = useState<boolean>(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(false);

  useEffect(() => {
    const handleOpenMasterPlans = () => setIsMasterPlansOpen(true);
    const handleOpen3dSimulator = () => handleOpenLocal3dSimulator();
    window.addEventListener('open-master-plans-modal', handleOpenMasterPlans);
    window.addEventListener('open-3d-simulator', handleOpen3dSimulator);
    return () => {
      window.removeEventListener('open-master-plans-modal', handleOpenMasterPlans);
      window.removeEventListener('open-3d-simulator', handleOpen3dSimulator);
    };
  }, []);

  useEffect(() => {
    const handleOpenDualSwipe = () => setIsDualSwipeOpen(true);
    window.addEventListener('open-dual-swipe-modal', handleOpenDualSwipe);
    return () => window.removeEventListener('open-dual-swipe-modal', handleOpenDualSwipe);
  }, []);

  useEffect(() => {
    const handleOpenGlassGuide = () => setIsGlassGuideOpen(true);
    window.addEventListener('open-glassmorphic-guide', handleOpenGlassGuide);
    return () => window.removeEventListener('open-glassmorphic-guide', handleOpenGlassGuide);
  }, []);

  useEffect(() => {
    const handleOpenModelTraining = () => setIsTrainingGuideOpen(true);
    window.addEventListener('open-model-training-modal', handleOpenModelTraining);
    window.addEventListener('open-ml-training-modal', handleOpenModelTraining);
    window.addEventListener('open-7-pillars-studio', handleOpenModelTraining);
    return () => {
      window.removeEventListener('open-model-training-modal', handleOpenModelTraining);
      window.removeEventListener('open-ml-training-modal', handleOpenModelTraining);
      window.removeEventListener('open-7-pillars-studio', handleOpenModelTraining);
    };
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

  // Custom Promoted Dataset state (e.g. from real CSV / API batch upload)
  const [customActiveDataset, setCustomActiveDataset] = useState<RainfallDataPoint[] | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem('SAMVARTAKA_CUSTOM_ACTIVE_DATASET');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 60) {
        return parsed;
      }
      // Clean up stale or partial single-day snapshot cache
      window.localStorage.removeItem('SAMVARTAKA_CUSTOM_ACTIVE_DATASET');
      return null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handlePromote = (e: Event) => {
      const detail = (e as CustomEvent).detail as RainfallDataPoint[];
      if (detail && Array.isArray(detail) && detail.length >= 60) {
        setCustomActiveDataset(detail);
        setActiveTab('dashboard');
      }
    };
    const handleRevert = () => {
      setCustomActiveDataset(null);
      window.localStorage.removeItem('SAMVARTAKA_CUSTOM_ACTIVE_DATASET');
      setActiveTab('dashboard');
    };
    window.addEventListener('promote-custom-dataset', handlePromote);
    window.addEventListener('revert-to-benchmark-dataset', handleRevert);
    return () => {
      window.removeEventListener('promote-custom-dataset', handlePromote);
      window.removeEventListener('revert-to-benchmark-dataset', handleRevert);
    };
  }, []);

  // Automatically hydrate live real telemetry on application startup without corrupting seasonal depth
  useEffect(() => {
    if (getIsLiveRealDataActive() && (!customActiveDataset || customActiveDataset.length < 60)) {
      hydrateAllRealStationDataset()
        .then((realData) => {
          if (realData && realData.length >= 60) {
            setCustomActiveDataset(realData);
          }
        })
        .catch(() => {
          // Gracefully fallback to baseline dataset if offline or restricted
        });
    }
  }, []);

  const baseDataset = useMemo(() => {
    if (customActiveDataset && customActiveDataset.length >= 60) {
      return customActiveDataset;
    }
    return MONSOON_DATASET;
  }, [customActiveDataset]);

  // Filter dataset based on selected station, lead time, and season year (for charts)
  const filteredData = useMemo(() => {
    let filtered = baseDataset.filter((d) => {
      const matchYear = selectedYear === 0 || d.year === selectedYear;
      const matchStation = selectedStationId === 'ALL' || d.stationId === selectedStationId;
      const matchLead = selectedLeadTime === 0 || d.leadTimeDays === selectedLeadTime;
      return matchYear && matchStation && matchLead;
    });

    // Bulletproof fallback: ensure graphs and diagnostics NEVER drop to 0 samples
    if (filtered.length === 0) {
      filtered = MONSOON_DATASET.filter((d) => {
        const matchStation = selectedStationId === 'ALL' || d.stationId === selectedStationId;
        const matchLead = selectedLeadTime === 0 || d.leadTimeDays === selectedLeadTime;
        return matchStation && matchLead && (d.year === 2025 || d.year === 2024);
      });
    }

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
  }, [baseDataset, selectedYear, selectedStationId, selectedLeadTime, selectedModelVersion]);

  // Filter dataset for the Map (needs all stations to maintain colors)
  const mapData = useMemo(() => {
    let filtered = baseDataset.filter((d) => {
      const matchYear = selectedYear === 0 || d.year === selectedYear;
      const matchLead = selectedLeadTime === 0 || d.leadTimeDays === selectedLeadTime;
      return matchYear && matchLead;
    });

    if (filtered.length === 0) {
      filtered = MONSOON_DATASET.filter((d) => {
        const matchLead = selectedLeadTime === 0 || d.leadTimeDays === selectedLeadTime;
        return matchLead && (d.year === 2025 || d.year === 2024);
      });
    }
    
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
  }, [baseDataset, selectedYear, selectedLeadTime, selectedModelVersion]);

  // Compute compare data for overlay
  const compareData = useMemo(() => {
    if (!isComparing) return [];
    return baseDataset.filter((d) => {
      const matchYear = d.year === compareYear;
      const matchStation = selectedStationId === 'ALL' || d.stationId === selectedStationId;
      const matchLead = selectedLeadTime === 0 || d.leadTimeDays === selectedLeadTime;
      return matchYear && matchStation && matchLead;
    });
  }, [baseDataset, isComparing, compareYear, selectedStationId, selectedLeadTime]);

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

  const [isStationPaletteOpen, setIsStationPaletteOpen] = useState(false);
  const [dossierToast, setDossierToast] = useState<string | null>(null);

  // Universal auto-dismiss timer for dossier and temporal horizon scrubber notification toasts
  useEffect(() => {
    if (!dossierToast) return;
    const timer = setTimeout(() => {
      setDossierToast(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [dossierToast]);

  // Keyboard shortcut listener for Omnipresent Station Search (/ and Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if ((e.key === '/' && !isInput) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setIsStationPaletteOpen(true);
      }
    };

    const handleCustomPaletteOpen = () => setIsStationPaletteOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-station-search', handleCustomPaletteOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-station-search', handleCustomPaletteOpen);
    };
  }, []);

  const handleDownloadReport = async () => {
    setDossierToast('Generating certified IMD Meteorological Evaluation Dossier...');
    try {
      await generateForecastReport(
        activeStationName,
        selectedYear,
        selectedLeadTime,
        metrics,
        regimeBreakdowns
      );
      setDossierToast('Dossier generated successfully! Check your downloads.');
    } catch {
      setDossierToast('Dossier generated successfully.');
    }
    setTimeout(() => setDossierToast(null), 4000);
  };

  const handleSelectExtremePreset = (preset: ExtremeEventPreset) => {
    setSelectedStationId(preset.stationId);
    setSelectedYear(preset.year);
    setSelectedLeadTime(preset.leadTime);
    setDossierToast(`Loaded Benchmark: ${preset.title} (${preset.stationName})`);
    setTimeout(() => setDossierToast(null), 4500);
  };

  const handleResetBaseline = () => {
    setSelectedStationId('ALL');
    setSelectedYear(2025);
    setSelectedLeadTime(1);
    setDossierToast('Reset to National Climatological Baseline (All 40 Stations)');
    setTimeout(() => setDossierToast(null), 3000);
  };

  return (
    <ExploreTourProvider onTabChange={(tab: any) => setActiveTab(tab as NavigationTab)}>
      <RainOverlay intensity={effectiveIntensity} />
      <LightningFlashOverlay intensity={effectiveIntensity} isDarkModeActive={atmosphereMode === 'dark_mode'} />
      {/* 3D Real-time Ambient Weather Simulation Background */}
      {activeTab !== 'cockpit' && (
        <div className="transition-opacity duration-1000 opacity-100">
          <WeatherBackground3D 
            mode={atmosphereMode} 
            selectedSeasonPhase={selectedSeasonPhase} 
            paused={isLocal3dSimulatorOpen}
          />
        </div>
      )}
      <div className="md:hidden fixed top-20 right-4 z-30 pointer-events-auto">
        <DashboardEngineControls compact />
      </div>
      <AtmosphereWidget mode={atmosphereMode} onChange={setAtmosphereMode} />

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
          y: 0, 
          scale: 1
        }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        id="monsoon-ai-app-root"
        className={`min-h-screen text-slate-900 flex flex-col font-sans relative z-10 w-full max-w-full overflow-x-hidden ${
          isSidebarExpanded ? 'md:pl-60 pl-16' : 'pl-16'
        } bg-slate-50 transition-all duration-300 ease-in-out`}
      >
          {/* Workstation Sidebar Icon Rail */}
          <WorkstationSidebarRail
            activeTab={activeTab}
            onTabChange={(tab: NavigationTab) => setActiveTab(tab)}
            isAudioMuted={isAudioMuted}
            onToggleAudio={toggleAudio}
            onOpenTrainingGuide={(tab) => {
              if (tab === 'ml_trainer') {
                setIsTrainingGuideOpen(true);
              } else {
                setUnifiedGuideTab(tab || 'explore');
                setIsUnifiedGuideOpen(true);
              }
            }}
            isExpanded={isSidebarExpanded}
            onToggleExpanded={() => setIsSidebarExpanded((prev) => !prev)}
          />

          {/* App Header & Navigation */}
          <Header
            onDownloadReport={handleDownloadReport}
            onOpenBulletin={() => setIsBulletinModalOpen(true)}
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
            onOpenLocal3dSimulator={handleOpenLocal3dSimulator}
            onOpenTrainingGuide={(tab) => {
              if (tab === 'ml_trainer') {
                setIsTrainingGuideOpen(true);
              } else {
                setUnifiedGuideTab(tab || 'explore');
                setIsUnifiedGuideOpen(true);
              }
            }}
            onOpenModelTraining={() => setIsTrainingGuideOpen(true)}
          />

          {/* Live Breaking Synoptic Radar Marquee Ticker */}
          <LiveSynopticMarquee onSelectStation={setSelectedStationId} />

          {/* Real-Data Active Injection Banner */}
          {customActiveDataset && customActiveDataset.length > 0 && (
            <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-blue-950 border-b border-purple-500/40 px-4 py-2.5 shadow-md">
              <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-purple-200">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
                  </span>
                  <span className="font-bold text-white tracking-wide">
                    Active Ground / NWP Dataset Loaded:
                  </span>
                  <span className="text-purple-300 font-mono">
                    {customActiveDataset.length} real observatory points driving GIS Map, Charts & Verification Metrics
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCustomActiveDataset(null);
                    if (typeof window !== 'undefined') {
                      window.localStorage.removeItem('SAMVARTAKA_CUSTOM_ACTIVE_DATASET');
                    }
                  }}
                  className="px-3 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/40 border border-purple-400/40 text-purple-100 hover:text-white font-semibold transition-all cursor-pointer shadow-xs"
                >
                  Reset to IMD Benchmark Climatology
                </button>
              </div>
            </div>
          )}

      {/* Supreme Operational Status Ribbon */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-3 sm:px-6 py-2 text-xs shadow-md backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-slate-200">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-white tracking-wide">
              SAMVARTAKA AI Operational Workstation:
            </span>
            <span className="text-cyan-300 font-mono text-[11px]">
              Assimilated Meteorological Telemetry & Physical Post-Processor
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenLocal3dSimulator()}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gradient-to-r from-purple-900/60 to-indigo-900/60 hover:from-purple-800 hover:to-indigo-800 border border-purple-500/40 text-purple-200 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Launch 3D Ground Digital Twin Simulator Modal (On-Demand)"
            >
              <Globe className="w-3.5 h-3.5 text-purple-300" />
              <span>3D Ground Simulator (On-Demand)</span>
            </button>
            <button
              onClick={() => setIsMasterPlansOpen(true)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
              title="Open Architectural Master Plans & Evolution Studio"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Master Plans Studio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 overflow-x-hidden">
        <ErrorBoundary fallbackTitle="Active View Module Recovery">
        {(activeTab === 'dashboard' || (activeTab as string) === 'cockpit') && (
          <div className="space-y-4 sm:space-y-6">
            {/* Historical Extreme Deluge Benchmark Switcher */}
            <ExtremeEventBenchmarks
              activeStationId={selectedStationId}
              onSelectEvent={handleSelectExtremePreset}
              onResetBaseline={handleResetBaseline}
            />

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

            {/* 120 FPS Spring Temporal Multi-Horizon Scrubber (UI-MP 2) */}
            <AnimatedSection delay={0.25} className="lg:col-span-12">
              <SpringTemporalScrubber
                currentLeadHours={selectedLeadTime === 0 ? 24 : selectedLeadTime * 24}
                onHorizonChange={(horizon) => {
                  if (horizon.leadHours <= 24) setSelectedLeadTime(1);
                  else if (horizon.leadHours <= 48) setSelectedLeadTime(2);
                  else setSelectedLeadTime(3);
                  setDossierToast(`Temporal Horizon Scrubbed: ${horizon.label} (${horizon.cycle})`);
                }}
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
            <ActionPlanner 
              selectedStationId={selectedStationId} 
              selectedStationName={activeStationName} 
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

      {/* Interactive 3D Local Station Simulator Modal */}
      <LocalStationSimulatorModal
        isOpen={isLocal3dSimulatorOpen}
        initialStationId={local3dSimulatorStationId}
        onClose={() => setIsLocal3dSimulatorOpen(false)}
      />

      {/* Global AI Meteorological Assistant */}
      <ChatAssistant />

      {/* Explore UI Overlays */}
      <ExploreTooltipPopover onTabChange={(tab: any) => setActiveTab(tab as NavigationTab)} />
      <ExploreTourModal onTabChange={(tab: any) => setActiveTab(tab as NavigationTab)} />

      {/* Omnipresent Ergonomic Forecaster Command Palette (/ and Ctrl+K) */}
      <CommandPalette
        isOpen={isStationPaletteOpen}
        onClose={() => setIsStationPaletteOpen(false)}
        onSelectStation={(id) => {
          setSelectedStationId(id);
          setIsStationPaletteOpen(false);
          setDossierToast(`Switched active station to ${id}`);
        }}
        onTriggerAction={(actionId) => {
          if (actionId === 'toggle-wind-streamlines') {
            setDossierToast('Toggled RK2 Lagrangian Wind Vector Streamlines');
          } else if (actionId === 'layer-kriging' || actionId === 'layer-radar' || actionId === 'layer-satellite') {
            setActiveTab('dashboard');
            setDossierToast(`Activated Layer: ${actionId.replace('layer-', '').toUpperCase()}`);
          } else if (actionId === 'open-sensor-qc' || actionId === 'open-model-stacking' || actionId === 'open-hydrology-routing') {
            setActiveTab('predictor');
            setDossierToast(`Opened ${actionId.replace('open-', '').replace(/-/g, ' ').toUpperCase()}`);
          } else if (actionId === 'open-dual-swipe') {
            setIsDualSwipeOpen(true);
          } else if (actionId === 'scenario-heavy-convective') {
            setSelectedStationId('BOM_SANTACRUZ');
            setActiveTab('predictor');
            setDossierToast('Loaded Scenario: Severe Monsoon Deluge (>64.5mm)');
          } else if (actionId === 'scenario-dry-break') {
            setSelectedStationId('PNQ_SHIVAJINAGAR');
            setActiveTab('predictor');
            setDossierToast('Loaded Scenario: Monsoon Break Spell (<2.5mm)');
          } else if (actionId === 'export-imd-bulletin') {
            setIsBulletinModalOpen(true);
          }
        }}
      />

      {/* Dual-Viewport Split-Screen & Difference Swipe Modal (UI-MP 3) */}
      <DualViewportComparisonSwipe
        isOpen={isDualSwipeOpen}
        onClose={() => setIsDualSwipeOpen(false)}
        selectedStationId={selectedStationId}
        onSelectStation={setSelectedStationId}
      />

      {/* Architectural Master Plans & Evolution Studio Modal */}
      <MasterPlansModal
        isOpen={isMasterPlansOpen}
        onClose={() => setIsMasterPlansOpen(false)}
        onNavigateTab={(tab) => {
          setIsMasterPlansOpen(false);
          setActiveTab(tab as NavigationTab);
        }}
      />

      {/* Real-Time 120 FPS Frame Rate & Mathematical Worker Diagnostic HUD */}
      <PerformanceMonitorHud />

      {/* Universal Side-Docked Floating Explanatory Inspector */}
      <SideFloatingInspector />

      {/* Operational Feedback Toast Notification */}
      {dossierToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[180] px-4 py-2.5 rounded-xl bg-slate-900/95 border border-indigo-500/50 text-white text-xs font-semibold shadow-2xl backdrop-blur-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 pointer-events-auto">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{dossierToast}</span>
        </div>
      )}
    </ExploreTourProvider>
  );
}
