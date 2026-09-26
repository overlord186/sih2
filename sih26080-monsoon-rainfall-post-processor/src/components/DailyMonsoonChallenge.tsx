import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Flame,
  Calendar,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Globe,
  Wind,
  Droplets,
  Gauge,
  Thermometer,
  Zap,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Award,
  ChevronDown,
  ChevronUp,
  Radio,
  Satellite,
  Compass,
  AlertTriangle
} from 'lucide-react';
import { RainfallRegime, SynopticWeatherRegime } from '../types';
import {
  MonsoonChallengeScenario,
  MONSOON_CHALLENGES_CATALOG,
  getDailyMonsoonChallenge,
} from '../data/dailyChallenges';
import {
  loadUserEngagement,
  trackDailyChallengeSolved,
  trackRegimeView,
  trackSynopticRegimeView,
} from '../utils/achievements';
import { weatherSynth } from '../utils/audio';

interface DailyMonsoonChallengeProps {
  onNavigateToGlobe?: (scenario: MonsoonChallengeScenario) => void;
  onOpenAchievements?: () => void;
}

export const DailyMonsoonChallenge: React.FC<DailyMonsoonChallengeProps> = ({
  onNavigateToGlobe,
  onOpenAchievements,
}) => {
  const [userState, setUserState] = useState(loadUserEngagement());
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(() => {
    return getDailyMonsoonChallenge().dayIndex;
  });
  const [isArchiveMode, setIsArchiveMode] = useState<boolean>(false);
  const [selectedRainfallRegime, setSelectedRainfallRegime] = useState<RainfallRegime | null>(null);
  const [selectedSynopticRegime, setSelectedSynopticRegime] = useState<SynopticWeatherRegime | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [showClues, setShowClues] = useState<boolean>(false);

  // Sync user state on update events
  useEffect(() => {
    const handleUpdate = () => setUserState(loadUserEngagement());
    window.addEventListener('achievements-updated', handleUpdate);
    return () => window.removeEventListener('achievements-updated', handleUpdate);
  }, []);

  const dailyInfo = useMemo(() => getDailyMonsoonChallenge(), []);
  const activeScenario = MONSOON_CHALLENGES_CATALOG[selectedScenarioIndex];

  // Track if current active scenario is today's official challenge
  const isTodaysScenario = selectedScenarioIndex === dailyInfo.dayIndex;
  const isTodayAlreadySolved = userState.lastChallengeDateSolved === dailyInfo.dateKey;

  // Handle regime selection
  const handleSelectRainfall = (regime: RainfallRegime) => {
    if (hasSubmitted) return;
    setSelectedRainfallRegime(regime);
    trackRegimeView(regime);
  };

  const handleSelectSynoptic = (regime: SynopticWeatherRegime) => {
    if (hasSubmitted) return;
    setSelectedSynopticRegime(regime);
    trackSynopticRegimeView(regime);
  };

  const isRainfallCorrect = selectedRainfallRegime === activeScenario.targetRainfallRegime;
  const isSynopticCorrect = !selectedSynopticRegime || selectedSynopticRegime === activeScenario.targetSynopticRegime;
  const isFullyCorrect = isRainfallCorrect && (selectedSynopticRegime ? isSynopticCorrect : true);

  const handleSubmit = () => {
    if (!selectedRainfallRegime) return;
    setHasSubmitted(true);

    if (isRainfallCorrect) {
      weatherSynth.playChallengeCorrectSound();
      if (isTodaysScenario) {
        trackDailyChallengeSolved(dailyInfo.dateKey, 150);
      }
      // Broadcast reward event for 3D Globe
      window.dispatchEvent(
        new CustomEvent('monsoon-challenge-reward', {
          detail: { scenario: activeScenario },
        })
      );
    } else {
      weatherSynth.playChallengeWrongSound();
    }
  };

  const handleResetForNext = (idx: number) => {
    setSelectedScenarioIndex(idx);
    setSelectedRainfallRegime(null);
    setSelectedSynopticRegime(null);
    setHasSubmitted(false);
    setShowClues(false);
  };

  return (
    <div id="daily-monsoon-challenge-root" className="space-y-6">
      {/* Top Banner & Gamification Status */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 border border-indigo-500/30 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Daily Monsoon Challenge
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-mono flex items-center gap-1">
              <Calendar className="w-3 h-3 text-sky-400" />
              UTC {dailyInfo.dateKey}
            </span>
            {isTodayAlreadySolved && (
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Today's Challenge Completed
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Predict The Rainfall Regime
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Analyze historical and simulated synoptic observations. Infer the prevailing atmospheric regime and unlock unique 3D visual illumination on the Earth Observatory.
          </p>
        </div>

        {/* Engagement Stats Strip */}
        <div className="flex items-center gap-3 self-start md:self-auto shrink-0 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
            <div>
              <div className="text-[10px] text-amber-300 uppercase font-mono font-bold">Streak</div>
              <div className="text-sm font-black text-white">{userState.currentStreak} Days</div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <div>
              <div className="text-[10px] text-indigo-300 uppercase font-mono font-bold">Level {userState.level}</div>
              <div className="text-sm font-black text-white">{userState.xp} XP</div>
            </div>
          </div>

          {onOpenAchievements && (
            <button
              onClick={onOpenAchievements}
              className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              title="Open Achievements Dossier"
            >
              <Award className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Badges</span>
            </button>
          )}
        </div>
      </div>

      {/* Scenario Selector Tabs: Today's Seed vs Historical Archive */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsArchiveMode(false);
              handleResetForNext(dailyInfo.dayIndex);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              !isArchiveMode
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Today's Official Challenge</span>
          </button>

          <button
            onClick={() => setIsArchiveMode(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              isArchiveMode
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Historical Scenarios Archive ({MONSOON_CHALLENGES_CATALOG.length})</span>
          </button>
        </div>

        {isArchiveMode && (
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
            {MONSOON_CHALLENGES_CATALOG.map((scen, idx) => (
              <button
                key={scen.id}
                onClick={() => handleResetForNext(idx)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                  selectedScenarioIndex === idx
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Case #{idx + 1}: {scen.stationName.split(' ')[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Meteorological Scenario Briefing Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Scenario Header */}
        <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold">
                {activeScenario.dateLabel}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  activeScenario.difficulty === 'EXTREME'
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : activeScenario.difficulty === 'ADVANCED'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}
              >
                {activeScenario.difficulty} COMPLEXITY
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Lat: {activeScenario.lat}°N, Lon: {activeScenario.lon}°E
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
              {activeScenario.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              {activeScenario.subtitle} • <strong>{activeScenario.stationName}</strong> ({activeScenario.subdivision})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowClues(!showClues)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span>{showClues ? 'Hide Clues' : 'Atmospheric Clues'}</span>
              {showClues ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Atmospheric Indicators Grid */}
        <div className="p-5 space-y-5">
          {/* Synoptic Description Banner */}
          <div className="bg-slate-900 rounded-xl p-4 text-slate-200 text-xs sm:text-sm leading-relaxed border border-slate-800">
            <div className="flex items-center gap-2 text-sky-400 font-mono font-bold text-xs uppercase mb-1">
              <Compass className="w-3.5 h-3.5" />
              <span>Synoptic Environmental Setting</span>
            </div>
            <p className="text-slate-300">{activeScenario.atmosphericIndicators.synopticSetting}</p>
            <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5 font-mono">
              <Satellite className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>Satellite Sounding: {activeScenario.atmosphericIndicators.satelliteFeatureDescription}</span>
            </div>
          </div>

          {/* Meteorological Observations Matrix */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-blue-600" />
              Physical Atmospheric Parameters & Model Guidance
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Raw NWP */}
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80">
                <div className="text-[10px] font-mono font-bold text-blue-700 uppercase">Raw NWP Forecast</div>
                <div className="text-lg font-black text-blue-900 mt-0.5">
                  {activeScenario.atmosphericIndicators.rawNwpMm} <span className="text-xs font-normal">mm / 24h</span>
                </div>
                <div className="text-[10px] text-blue-600 mt-0.5">Numerical model output</div>
              </div>

              {/* 850hPa RH */}
              <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200/80">
                <div className="text-[10px] font-mono font-bold text-sky-700 uppercase">850 hPa Humidity</div>
                <div className="text-lg font-black text-sky-900 mt-0.5">
                  {activeScenario.atmosphericIndicators.relativeHumidity850hPa}%
                </div>
                <div className="text-[10px] text-sky-600 mt-0.5">Low-level moisture flux</div>
              </div>

              {/* Surface Pressure */}
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200">
                <div className="text-[10px] font-mono font-bold text-slate-700 uppercase">Baro Pressure</div>
                <div className="text-lg font-black text-slate-900 mt-0.5">
                  {activeScenario.atmosphericIndicators.surfacePressureHpa} <span className="text-xs font-normal">hPa</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Surface barometric field</div>
              </div>

              {/* Surface Wind */}
              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/80">
                <div className="text-[10px] font-mono font-bold text-indigo-700 uppercase">10m Surface Wind</div>
                <div className="text-lg font-black text-indigo-900 mt-0.5">
                  {activeScenario.atmosphericIndicators.windSpeed10mKmh} <span className="text-xs font-normal">km/h</span>
                </div>
                <div className="text-[10px] text-indigo-600 mt-0.5">Boundary layer velocity</div>
              </div>

              {/* Surface CAPE */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
                <div className="text-[10px] font-mono font-bold text-amber-700 uppercase">Surface CAPE</div>
                <div className="text-lg font-black text-amber-900 mt-0.5">
                  {activeScenario.atmosphericIndicators.capeJkg} <span className="text-xs font-normal">J/kg</span>
                </div>
                <div className="text-[10px] text-amber-600 mt-0.5">Convective energy available</div>
              </div>

              {/* Lifted Index */}
              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200/80">
                <div className="text-[10px] font-mono font-bold text-purple-700 uppercase">Lifted Index (LI)</div>
                <div className="text-lg font-black text-purple-900 mt-0.5">
                  {activeScenario.atmosphericIndicators.liftedIndexC > 0 ? `+${activeScenario.atmosphericIndicators.liftedIndexC}` : activeScenario.atmosphericIndicators.liftedIndexC}°C
                </div>
                <div className="text-[10px] text-purple-600 mt-0.5">Thermodynamic lapse rate</div>
              </div>

              {/* Precipitable Water */}
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                <div className="text-[10px] font-mono font-bold text-emerald-700 uppercase">Precipitable Water</div>
                <div className="text-lg font-black text-emerald-900 mt-0.5">
                  {activeScenario.atmosphericIndicators.precipitableWaterMm} <span className="text-xs font-normal">mm</span>
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">Total column vapor</div>
              </div>

              {/* Radar Echo Top */}
              <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/80">
                <div className="text-[10px] font-mono font-bold text-rose-700 uppercase">Doppler Echo Top</div>
                <div className="text-lg font-black text-rose-900 mt-0.5">
                  {activeScenario.atmosphericIndicators.dopplerEchoTopKm} <span className="text-xs font-normal">km</span>
                </div>
                <div className="text-[10px] text-rose-600 mt-0.5">Convective plume ceiling</div>
              </div>
            </div>
          </div>

          {/* Expandable Clues Accordion */}
          {showClues && (
            <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs space-y-2 animate-in fade-in duration-200">
              <div className="font-bold text-indigo-900 uppercase font-mono flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                Diagnostic Meteorological Clues
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                {activeScenario.clues.map((clue, i) => (
                  <li key={i}>{clue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* PREDICTION WORKFLOW */}
          <div className="border-t border-slate-200 pt-5 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-mono">
                    1
                  </span>
                  Predict The IMD Rainfall Category
                </h4>
                <span className="text-xs text-slate-500 font-mono">Primary Evaluation Factor</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    regime: RainfallRegime.DRY,
                    label: 'Dry / No Rain',
                    range: '< 2.5 mm',
                    color: 'amber',
                    desc: 'High pressure subsidence, dry continental air, or cap inversion',
                  },
                  {
                    regime: RainfallRegime.LIGHT,
                    label: 'Light Rain',
                    range: '2.5 – 15.5 mm',
                    color: 'blue',
                    desc: 'Isolated stratocumulus showers, shallow coastal trade plumes',
                  },
                  {
                    regime: RainfallRegime.MODERATE,
                    label: 'Moderate Rain',
                    range: '15.6 – 64.4 mm',
                    color: 'indigo',
                    desc: 'Steady monsoon cloud shields, organized multi-cellular rainbands',
                  },
                  {
                    regime: RainfallRegime.HEAVY_EXTREME,
                    label: 'Heavy / Extreme Rain',
                    range: '≥ 64.5 mm',
                    color: 'rose',
                    desc: 'Deep orographic lift, cyclonic vorticity cores, cloudburst cascades',
                  },
                ].map((item) => {
                  const isSelected = selectedRainfallRegime === item.regime;
                  const isCorrectAnswer = activeScenario.targetRainfallRegime === item.regime;

                  let borderStyle = 'border-slate-200 hover:border-blue-400 bg-white';
                  if (isSelected && !hasSubmitted) {
                    borderStyle = 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/30';
                  } else if (hasSubmitted) {
                    if (isCorrectAnswer) {
                      borderStyle = 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/40';
                    } else if (isSelected && !isCorrectAnswer) {
                      borderStyle = 'border-rose-400 bg-rose-50';
                    } else {
                      borderStyle = 'opacity-40 border-slate-200 bg-white';
                    }
                  }

                  return (
                    <button
                      key={item.regime}
                      disabled={hasSubmitted}
                      onClick={() => handleSelectRainfall(item.regime)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${borderStyle}`}
                    >
                      {hasSubmitted && isCorrectAnswer && (
                        <div className="absolute top-2.5 right-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                      )}
                      {hasSubmitted && isSelected && !isCorrectAnswer && (
                        <div className="absolute top-2.5 right-2.5">
                          <XCircle className="w-4 h-4 text-rose-500" />
                        </div>
                      )}
                      <div className="text-xs font-bold text-slate-900">{item.label}</div>
                      <div className="text-xs font-mono font-black text-indigo-700 mt-0.5">{item.range}</div>
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Synoptic Regime Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-white text-xs flex items-center justify-center font-mono">
                    2
                  </span>
                  Synoptic Weather Regime (Optional Precision Bonus)
                </h4>
                <span className="text-xs text-slate-500 font-mono">+50 Bonus XP</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {[
                  SynopticWeatherRegime.ACTIVE_MONSOON,
                  SynopticWeatherRegime.BREAK_MONSOON,
                  SynopticWeatherRegime.MONSOON_DEPRESSION,
                  SynopticWeatherRegime.COASTAL_OROGRAPHIC,
                  SynopticWeatherRegime.WESTERN_DISTURBANCE,
                ].map((synRegime) => {
                  const isSelected = selectedSynopticRegime === synRegime;
                  const isCorrect = activeScenario.targetSynopticRegime === synRegime;

                  let style = 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100';
                  if (isSelected && !hasSubmitted) {
                    style = 'bg-indigo-50 border-indigo-500 text-indigo-900 font-bold ring-2 ring-indigo-400/30';
                  } else if (hasSubmitted) {
                    if (isCorrect) {
                      style = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold';
                    } else if (isSelected) {
                      style = 'bg-rose-50 border-rose-300 text-rose-800';
                    } else {
                      style = 'opacity-40 bg-slate-50 border-slate-200';
                    }
                  }

                  return (
                    <button
                      key={synRegime}
                      disabled={hasSubmitted}
                      onClick={() => handleSelectSynoptic(synRegime)}
                      className={`p-2 rounded-lg border text-xs text-center transition-all cursor-pointer ${style}`}
                    >
                      {synRegime}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submission Action Bar */}
            {!hasSubmitted ? (
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  disabled={!selectedRainfallRegime}
                  onClick={handleSubmit}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 ${
                    selectedRainfallRegime
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white hover:scale-102 active:scale-98 cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Verify Atmospheric Prediction</span>
                </button>
              </div>
            ) : (
              /* Debrief & Resolution Panel */
              <div
                className={`p-5 rounded-xl border space-y-4 animate-in fade-in zoom-in-95 duration-300 ${
                  isRainfallCorrect
                    ? 'bg-gradient-to-br from-emerald-50 via-teal-50/40 to-slate-50 border-emerald-300'
                    : 'bg-gradient-to-br from-rose-50 via-amber-50/30 to-slate-50 border-rose-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {isRainfallCorrect ? (
                      <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                        <XCircle className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-base font-black text-slate-900">
                        {isRainfallCorrect
                          ? 'Meteorological Prediction Verified!'
                          : 'Prediction Anomaly Detected'}
                      </h4>
                      <p className="text-xs text-slate-600">
                        Target Regime: <strong className="text-slate-900">{activeScenario.targetRainfallRegime}</strong> (Synoptic: {activeScenario.targetSynopticRegime})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isRainfallCorrect && (
                      <div className="px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-800 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>+150 XP EARNED</span>
                      </div>
                    )}

                    {onNavigateToGlobe && (
                      <button
                        onClick={() => onNavigateToGlobe(activeScenario)}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                        title="View Illuminated 3D Earth Globe Visual Effect"
                      >
                        <Globe className="w-4 h-4 text-sky-200 animate-spin-slow" />
                        <span>Inspect 3D Globe Aura</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Ground Truth vs NWP Comparison Box */}
                <div className="p-3 bg-white/90 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 font-mono">Actual Ground Station Observation:</span>
                    <div className="text-base font-black text-emerald-700 mt-0.5">
                      {activeScenario.atmosphericIndicators.observedMm} mm / 24h
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-mono">Raw NWP Numerical Guidance:</span>
                    <div className="text-base font-black text-blue-700 mt-0.5">
                      {activeScenario.atmosphericIndicators.rawNwpMm} mm / 24h
                    </div>
                  </div>
                </div>

                {/* Detailed Scientific Explanations */}
                <div className="space-y-2 text-xs sm:text-sm text-slate-700 leading-relaxed bg-white/80 p-4 rounded-xl border border-slate-200">
                  <div>
                    <strong className="text-slate-900 font-bold block mb-0.5">
                      Meteorological Mechanism:
                    </strong>
                    {activeScenario.meteorologicalExplanation}
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <strong className="text-slate-900 font-bold block mb-0.5 text-blue-800">
                      Why NWP Stumbled (The Physics Diagnosis):
                    </strong>
                    {activeScenario.nwpBiasDiagnosis}
                  </div>
                </div>

                {/* Replay or Next Challenge button */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500">
                    {isArchiveMode ? `Viewing Scenario ${selectedScenarioIndex + 1} of ${MONSOON_CHALLENGES_CATALOG.length}` : 'Come back tomorrow for the next seeded scenario!'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const nextIdx = (selectedScenarioIndex + 1) % MONSOON_CHALLENGES_CATALOG.length;
                        handleResetForNext(nextIdx);
                      }}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Try Next Historical Case</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
