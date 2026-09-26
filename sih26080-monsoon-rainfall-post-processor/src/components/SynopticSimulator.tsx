import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, FastForward, CloudRain, AlertTriangle, ShieldAlert, Sparkles, Eye, Film, Box, BookOpen } from 'lucide-react';
import { MET_STATIONS } from '../data/monsoonDataset';
import { predictScenario } from '../ml/postProcessor';
import { PredictionScenarioInput, PredictionResult, RainfallRegime } from '../types';
import { KidVisualStage } from './KidVisualStage';
import { WeatherStage3D } from './WeatherStage3D';

export interface SimulationStep {
  hour: number;
  timeLabel: string;
  synopticPhase: string;
  stationId: string;
  leadTimeDays: number;
  rawForecastMm: number;
  relativeHumidity: number;
  temp2m: number;
  surfacePressure: number;
  windSpeed: number;
  prevDayRain: number;
  eventDescription: string;
}

export interface WeatherScenario {
  id: string;
  name: string;
  category: 'Extreme Surge' | 'False Drizzle' | 'Depression Corridor' | 'Active-Break Cycle';
  stationId: string;
  description: string;
  steps: SimulationStep[];
}

// 4 realistic meteorological synoptic scenarios (24-hour / multi-hour evolution)
export const SIMULATION_SCENARIOS: WeatherScenario[] = [
  {
    id: 'mumbai-monsoon-burst',
    name: 'Mumbai Convective Offshore Trough Surge',
    category: 'Extreme Surge',
    stationId: 'BOM_SANTACRUZ',
    description:
      'A deep Arabian Sea offshore vortex rapidly strengthens. Coarse NWP severely underpredicts rainfall rate due to smoothed convective parameterization.',
    steps: [
      {
        hour: 0,
        timeLabel: '00:00 IST',
        synopticPhase: 'Pre-Surge Calm',
        stationId: 'BOM_SANTACRUZ',
        leadTimeDays: 1,
        rawForecastMm: 12.0,
        relativeHumidity: 78,
        temp2m: 29.5,
        surfacePressure: 1005.0,
        windSpeed: 18,
        prevDayRain: 15.0,
        eventDescription: 'Moist southwesterly winds begin accelerating along the north Konkan coast.',
      },
      {
        hour: 6,
        timeLabel: '06:00 IST',
        synopticPhase: 'Low Pressure Deepening',
        stationId: 'BOM_SANTACRUZ',
        leadTimeDays: 1,
        rawForecastMm: 28.5,
        relativeHumidity: 88,
        temp2m: 28.0,
        surfacePressure: 1000.5,
        windSpeed: 28,
        prevDayRain: 22.0,
        eventDescription: 'Surface barometric pressure drops rapidly by 4.5 hPa; boundary layer reaches 88% RH.',
      },
      {
        hour: 12,
        timeLabel: '12:00 IST',
        synopticPhase: 'Peak Convective Deluge',
        stationId: 'BOM_SANTACRUZ',
        leadTimeDays: 1,
        rawForecastMm: 52.0,
        relativeHumidity: 96,
        temp2m: 26.2,
        surfacePressure: 995.0,
        windSpeed: 44,
        prevDayRain: 60.0,
        eventDescription: 'Massive mesoscale convective cloud clusters make landfall. NWP tops out at 52mm, while AI scales to peak convective deluge.',
      },
      {
        hour: 18,
        timeLabel: '18:00 IST',
        synopticPhase: 'Sustained Heavy Spells',
        stationId: 'BOM_SANTACRUZ',
        leadTimeDays: 1,
        rawForecastMm: 44.0,
        relativeHumidity: 93,
        temp2m: 26.8,
        surfacePressure: 997.5,
        windSpeed: 36,
        prevDayRain: 110.0,
        eventDescription: 'Intense rain bands continue as the trough slowly shifts northward towards Daman.',
      },
      {
        hour: 24,
        timeLabel: '24:00 IST',
        synopticPhase: 'Post-Vortex Relaxation',
        stationId: 'BOM_SANTACRUZ',
        leadTimeDays: 1,
        rawForecastMm: 22.0,
        relativeHumidity: 85,
        temp2m: 27.5,
        surfacePressure: 1002.0,
        windSpeed: 24,
        prevDayRain: 145.0,
        eventDescription: 'Vortex moves inland; squally winds decelerate to moderate monsoonal breeze.',
      },
    ],
  },
  {
    id: 'pune-drizzle-bias',
    name: 'Pune Rain-Shadow NWP False Drizzle Event',
    category: 'False Drizzle',
    stationId: 'PNQ_SHIVAJINAGAR',
    description:
      'Ghats intercept western moisture while lee-side plateau remains dry. NWP model grid creates persistent false drizzle alerts.',
    steps: [
      {
        hour: 0,
        timeLabel: '00:00 IST',
        synopticPhase: 'Night Boundary Moisture',
        stationId: 'PNQ_SHIVAJINAGAR',
        leadTimeDays: 1,
        rawForecastMm: 4.8,
        relativeHumidity: 68,
        temp2m: 25.0,
        surfacePressure: 1009.0,
        windSpeed: 12,
        prevDayRain: 0.0,
        eventDescription: 'NWP predicts 4.8mm drizzle due to moist boundary layer over Maharashtra.',
      },
      {
        hour: 6,
        timeLabel: '06:00 IST',
        synopticPhase: 'Morning Ghat Clouds',
        stationId: 'PNQ_SHIVAJINAGAR',
        leadTimeDays: 1,
        rawForecastMm: 5.5,
        relativeHumidity: 70,
        temp2m: 26.2,
        surfacePressure: 1009.5,
        windSpeed: 14,
        prevDayRain: 0.0,
        eventDescription: 'Low stratocumulus over Western Ghats crest. NWP continues false rain signals.',
      },
      {
        hour: 12,
        timeLabel: '12:00 IST',
        synopticPhase: 'Midday Adiabatic Desiccation',
        stationId: 'PNQ_SHIVAJINAGAR',
        leadTimeDays: 1,
        rawForecastMm: 4.2,
        relativeHumidity: 59,
        temp2m: 30.5,
        surfacePressure: 1008.0,
        windSpeed: 16,
        prevDayRain: 0.0,
        eventDescription: 'Dry descending foehn effect dries lower atmosphere; zero-rain gate safely suppresses NWP drizzle.',
      },
      {
        hour: 18,
        timeLabel: '18:00 IST',
        synopticPhase: 'Evening Plateau Clear',
        stationId: 'PNQ_SHIVAJINAGAR',
        leadTimeDays: 1,
        rawForecastMm: 3.1,
        relativeHumidity: 64,
        temp2m: 27.0,
        surfacePressure: 1009.0,
        windSpeed: 11,
        prevDayRain: 0.0,
        eventDescription: 'Completely dry overcast sky. AI suppresses false alarms preventing unwarranted civic alerts.',
      },
      {
        hour: 24,
        timeLabel: '24:00 IST',
        synopticPhase: 'Dry Plateau Night',
        stationId: 'PNQ_SHIVAJINAGAR',
        leadTimeDays: 1,
        rawForecastMm: 2.5,
        relativeHumidity: 66,
        temp2m: 24.5,
        surfacePressure: 1010.0,
        windSpeed: 9,
        prevDayRain: 0.0,
        eventDescription: 'Stable boundary layer confirmed; zero rain recorded across rain-gauge network.',
      },
    ],
  },
  {
    id: 'nagpur-bay-depression',
    name: 'Vidarbha Monsoon Low-Pressure Corridor Passage',
    category: 'Depression Corridor',
    stationId: 'NAG_SONEGAON',
    description:
      'A synoptic monsoon low-pressure system tracks from Odisha through Central India, producing extensive steady precipitation.',
    steps: [
      {
        hour: 0,
        timeLabel: '00:00 IST',
        synopticPhase: 'Trough Approach',
        stationId: 'NAG_SONEGAON',
        leadTimeDays: 2,
        rawForecastMm: 16.0,
        relativeHumidity: 80,
        temp2m: 28.0,
        surfacePressure: 1004.0,
        windSpeed: 20,
        prevDayRain: 12.0,
        eventDescription: 'Depression eye reaches Raipur; overcast skies deepen across eastern Vidarbha.',
      },
      {
        hour: 6,
        timeLabel: '06:00 IST',
        synopticPhase: 'Steady Rain Onset',
        stationId: 'NAG_SONEGAON',
        leadTimeDays: 2,
        rawForecastMm: 26.5,
        relativeHumidity: 86,
        temp2m: 26.5,
        surfacePressure: 1001.0,
        windSpeed: 26,
        prevDayRain: 18.0,
        eventDescription: 'Widespread moderate stratiform rainfall covers the Wainganga and Wardha river basins.',
      },
      {
        hour: 12,
        timeLabel: '12:00 IST',
        synopticPhase: 'Vortex Eye Transit',
        stationId: 'NAG_SONEGAON',
        leadTimeDays: 2,
        rawForecastMm: 39.0,
        relativeHumidity: 92,
        temp2m: 25.5,
        surfacePressure: 998.0,
        windSpeed: 32,
        prevDayRain: 35.0,
        eventDescription: 'Trough axis directly over Nagpur; cyclonic wind shear enhances localized convergence.',
      },
      {
        hour: 18,
        timeLabel: '18:00 IST',
        synopticPhase: 'Southwest Quadrant Rain',
        stationId: 'NAG_SONEGAON',
        leadTimeDays: 2,
        rawForecastMm: 32.0,
        relativeHumidity: 89,
        temp2m: 26.0,
        surfacePressure: 1000.5,
        windSpeed: 25,
        prevDayRain: 60.0,
        eventDescription: 'Trailing moisture convergence bands maintain steady rainfall.',
      },
      {
        hour: 24,
        timeLabel: '24:00 IST',
        synopticPhase: 'Depression Moving to MP',
        stationId: 'NAG_SONEGAON',
        leadTimeDays: 2,
        rawForecastMm: 18.0,
        relativeHumidity: 83,
        temp2m: 27.0,
        surfacePressure: 1003.0,
        windSpeed: 18,
        prevDayRain: 78.0,
        eventDescription: 'Depression moves west-northwest into Madhya Pradesh; rainfall tapers off.',
      },
    ],
  },
  {
    id: 'delhi-trough-interaction',
    name: 'Delhi Northern Trough & WD Interaction',
    category: 'Extreme Surge',
    stationId: 'DEL_SAFDARJUNG',
    description:
      'Monsoon axis shifts to foot of Himalayas while interacting with upper-air mid-latitude trough, triggering intense localized urban flooding.',
    steps: [
      {
        hour: 0,
        timeLabel: '00:00 IST',
        synopticPhase: 'Humid Heat Accumulation',
        stationId: 'DEL_SAFDARJUNG',
        leadTimeDays: 1,
        rawForecastMm: 10.0,
        relativeHumidity: 74,
        temp2m: 32.5,
        surfacePressure: 1003.0,
        windSpeed: 14,
        prevDayRain: 5.0,
        eventDescription: 'Extreme high precipitable water vapor pooling over Indo-Gangetic plains.',
      },
      {
        hour: 6,
        timeLabel: '06:00 IST',
        synopticPhase: 'Upper-Level Convergence',
        stationId: 'DEL_SAFDARJUNG',
        leadTimeDays: 1,
        rawForecastMm: 24.0,
        relativeHumidity: 85,
        temp2m: 29.0,
        surfacePressure: 999.0,
        windSpeed: 22,
        prevDayRain: 8.0,
        eventDescription: 'Westerly trough impinges upon moist easterlies, generating intense vertical ascent.',
      },
      {
        hour: 12,
        timeLabel: '12:00 IST',
        synopticPhase: 'Extreme Convective Cloudburst',
        stationId: 'DEL_SAFDARJUNG',
        leadTimeDays: 1,
        rawForecastMm: 48.0,
        relativeHumidity: 95,
        temp2m: 26.0,
        surfacePressure: 994.0,
        windSpeed: 40,
        prevDayRain: 25.0,
        eventDescription: 'Massive multi-cell storm complex dumps intense rain over NCR. Coarse NWP underestimates peak by over 70mm.',
      },
      {
        hour: 18,
        timeLabel: '18:00 IST',
        synopticPhase: 'Stratiform Tail',
        stationId: 'DEL_SAFDARJUNG',
        leadTimeDays: 1,
        rawForecastMm: 30.0,
        relativeHumidity: 91,
        temp2m: 27.0,
        surfacePressure: 997.5,
        windSpeed: 28,
        prevDayRain: 120.0,
        eventDescription: 'Heavy showers continue across Yamuna floodplains with high runoff warnings.',
      },
      {
        hour: 24,
        timeLabel: '24:00 IST',
        synopticPhase: 'Trough Dispersal',
        stationId: 'DEL_SAFDARJUNG',
        leadTimeDays: 1,
        rawForecastMm: 14.0,
        relativeHumidity: 82,
        temp2m: 28.5,
        surfacePressure: 1002.0,
        windSpeed: 16,
        prevDayRain: 155.0,
        eventDescription: 'System tracks east into Western UP; rain intensity reduces to light intermittent showers.',
      },
    ],
  },
  {
    id: 'kolkata-bay-depression',
    name: 'Kolkata Bay Depression Landfall Surge',
    category: 'Depression Corridor',
    stationId: 'CCU_ALIPORE',
    description:
      'A deep depression crosses the Gangetic delta with powerful maritime winds and spiraling squall bands. AI dynamically lifts NWP model limits.',
    steps: [
      {
        hour: 0,
        timeLabel: '00:00 IST',
        synopticPhase: 'Approaching Coastal Low',
        stationId: 'CCU_ALIPORE',
        leadTimeDays: 1,
        rawForecastMm: 16.0,
        relativeHumidity: 84,
        temp2m: 29.0,
        surfacePressure: 1003.0,
        windSpeed: 24,
        prevDayRain: 10.0,
        eventDescription: 'Outer convective bands from Bay of Bengal make landfall over Sundarbans.',
      },
      {
        hour: 6,
        timeLabel: '06:00 IST',
        synopticPhase: 'Gale Wind Strengthening',
        stationId: 'CCU_ALIPORE',
        leadTimeDays: 1,
        rawForecastMm: 32.0,
        relativeHumidity: 92,
        temp2m: 27.5,
        surfacePressure: 997.0,
        windSpeed: 38,
        prevDayRain: 25.0,
        eventDescription: 'Fierce squalls sweep over Hooghly river; pressure plummets as system center nears.',
      },
      {
        hour: 12,
        timeLabel: '12:00 IST',
        synopticPhase: 'Depression Eye & Landfall Core',
        stationId: 'CCU_ALIPORE',
        leadTimeDays: 1,
        rawForecastMm: 52.0,
        relativeHumidity: 98,
        temp2m: 25.0,
        surfacePressure: 991.5,
        windSpeed: 48,
        prevDayRain: 60.0,
        eventDescription: 'Landfall core passes overhead; intense deluge triggers widespread urban waterlogging.',
      },
      {
        hour: 18,
        timeLabel: '18:00 IST',
        synopticPhase: 'Inland Decay & Stratiform Sheet',
        stationId: 'CCU_ALIPORE',
        leadTimeDays: 1,
        rawForecastMm: 34.0,
        relativeHumidity: 94,
        temp2m: 26.5,
        surfacePressure: 996.0,
        windSpeed: 30,
        prevDayRain: 140.0,
        eventDescription: 'Depression moves into Jharkhand; persistent steady stratiform rain continues.',
      },
      {
        hour: 24,
        timeLabel: '24:00 IST',
        synopticPhase: 'Post-Depression Breeze',
        stationId: 'CCU_ALIPORE',
        leadTimeDays: 1,
        rawForecastMm: 12.0,
        relativeHumidity: 86,
        temp2m: 28.0,
        surfacePressure: 1001.0,
        windSpeed: 18,
        prevDayRain: 185.0,
        eventDescription: 'Winds moderate to steady southerlies with scattered passing showers.',
      },
    ],
  },
  {
    id: 'guwahati-orographic-funnel',
    name: 'Guwahati Brahmaputra Orographic Funnel',
    category: 'Extreme Surge',
    stationId: 'GAU_BORJHAR',
    description:
      'Monsoon moisture stream funnels through the Assam-Meghalaya valley corridor, forcing intense orographic lifting against the Shillong Plateau.',
    steps: [
      {
        hour: 0,
        timeLabel: '00:00 IST',
        synopticPhase: 'Valley Inversion Overcast',
        stationId: 'GAU_BORJHAR',
        leadTimeDays: 1,
        rawForecastMm: 18.0,
        relativeHumidity: 88,
        temp2m: 27.0,
        surfacePressure: 1003.5,
        windSpeed: 12,
        prevDayRain: 20.0,
        eventDescription: 'High moisture pooling in Brahmaputra valley under low cloud ceiling.',
      },
      {
        hour: 6,
        timeLabel: '06:00 IST',
        synopticPhase: 'Katabatic Nocturnal Confluence',
        stationId: 'GAU_BORJHAR',
        leadTimeDays: 1,
        rawForecastMm: 36.0,
        relativeHumidity: 95,
        temp2m: 25.5,
        surfacePressure: 999.0,
        windSpeed: 22,
        prevDayRain: 45.0,
        eventDescription: 'Downslope hill winds meet moist valley inflow, sparking intense morning rain.',
      },
      {
        hour: 12,
        timeLabel: '12:00 IST',
        synopticPhase: 'Sub-Himalayan Deluge',
        stationId: 'GAU_BORJHAR',
        leadTimeDays: 1,
        rawForecastMm: 62.0,
        relativeHumidity: 99,
        temp2m: 24.8,
        surfacePressure: 993.0,
        windSpeed: 34,
        prevDayRain: 95.0,
        eventDescription: 'Extreme orographic rain band locks over the foothills; massive riverine catchment runoff.',
      },
      {
        hour: 18,
        timeLabel: '18:00 IST',
        synopticPhase: 'Stratiform River Surge',
        stationId: 'GAU_BORJHAR',
        leadTimeDays: 1,
        rawForecastMm: 38.0,
        relativeHumidity: 94,
        temp2m: 26.0,
        surfacePressure: 998.0,
        windSpeed: 20,
        prevDayRain: 180.0,
        eventDescription: 'Steady rain continues; AI models sustain high alert levels unlike decaying NWP forecasts.',
      },
      {
        hour: 24,
        timeLabel: '24:00 IST',
        synopticPhase: 'Humid Valley Respite',
        stationId: 'GAU_BORJHAR',
        leadTimeDays: 1,
        rawForecastMm: 16.0,
        relativeHumidity: 90,
        temp2m: 26.8,
        surfacePressure: 1002.0,
        windSpeed: 10,
        prevDayRain: 225.0,
        eventDescription: 'Precipitation moderates to gentle valley drizzle; high humidity persists.',
      },
    ],
  },
];

interface SynopticSimulatorProps {
  onApplyStep: (stepInput: PredictionScenarioInput) => void;
  currentInput: PredictionScenarioInput;
}

export const SynopticSimulator: React.FC<SynopticSimulatorProps> = ({ onApplyStep, currentInput }) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(SIMULATION_SCENARIOS[0].id);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(4500); // Relaxed default playback speed (4.5s per step)
  const [visualMode, setVisualMode] = useState<'3d' | '2d' | 'meteorological'>('3d'); // default to 3D WebGL world

  const scenario = SIMULATION_SCENARIOS.find((s) => s.id === selectedScenarioId) || SIMULATION_SCENARIOS[0];
  const step = scenario.steps[currentStepIdx] || scenario.steps[0];

  // Up-to-date refs for stable access in asynchronous interval callback
  const currentStepIdxRef = useRef(currentStepIdx);
  currentStepIdxRef.current = currentStepIdx;

  const scenarioRef = useRef(scenario);
  scenarioRef.current = scenario;

  const onApplyStepRef = useRef(onApplyStep);
  onApplyStepRef.current = onApplyStep;

  // Compute prediction result for current simulated step
  const currentStepPrediction = predictScenario({
    stationId: step.stationId,
    leadTimeDays: step.leadTimeDays,
    rawForecastMm: step.rawForecastMm,
    relativeHumidity: step.relativeHumidity,
    temp2m: step.temp2m,
    surfacePressure: step.surfacePressure,
    windSpeed: step.windSpeed,
    prevDayRain: step.prevDayRain,
  });

  // Handle scenario switch
  const handleSelectScenario = (id: string) => {
    setIsPlaying(false);
    setSelectedScenarioId(id);
    setCurrentStepIdx(0);
    const targetScen = SIMULATION_SCENARIOS.find((s) => s.id === id) || SIMULATION_SCENARIOS[0];
    const initialStep = targetScen.steps[0];
    onApplyStep({
      stationId: initialStep.stationId,
      leadTimeDays: initialStep.leadTimeDays,
      rawForecastMm: initialStep.rawForecastMm,
      relativeHumidity: initialStep.relativeHumidity,
      temp2m: initialStep.temp2m,
      surfacePressure: initialStep.surfacePressure,
      windSpeed: initialStep.windSpeed,
      prevDayRain: initialStep.prevDayRain,
    });
  };

  // Step changes propagate to input
  const applyStepAt = (idx: number) => {
    const s = scenario.steps[idx];
    setCurrentStepIdx(idx);
    onApplyStep({
      stationId: s.stationId,
      leadTimeDays: s.leadTimeDays,
      rawForecastMm: s.rawForecastMm,
      relativeHumidity: s.relativeHumidity,
      temp2m: s.temp2m,
      surfacePressure: s.surfacePressure,
      windSpeed: s.windSpeed,
      prevDayRain: s.prevDayRain,
    });
  };

  // Playback timer effect - safely advances timeline and triggers onApplyStep outside any React state updater
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const timer = window.setInterval(() => {
      const currentIdx = currentStepIdxRef.current;
      const currentScenario = scenarioRef.current;
      const nextIdx = currentIdx + 1;

      if (nextIdx >= currentScenario.steps.length) {
        setIsPlaying(false);
        return;
      }

      const nextStep = currentScenario.steps[nextIdx];
      setCurrentStepIdx(nextIdx);

      // Call parent update callback in timer tick outside of any setState updater
      onApplyStepRef.current?.({
        stationId: nextStep.stationId,
        leadTimeDays: nextStep.leadTimeDays,
        rawForecastMm: nextStep.rawForecastMm,
        relativeHumidity: nextStep.relativeHumidity,
        temp2m: nextStep.temp2m,
        surfacePressure: nextStep.surfacePressure,
        windSpeed: nextStep.windSpeed,
        prevDayRain: nextStep.prevDayRain,
      });
    }, playbackSpeed);

    return () => {
      window.clearInterval(timer);
    };
  }, [isPlaying, playbackSpeed]);

  const getStationObj = (stnId: string) => MET_STATIONS.find((s) => s.id === stnId);
  const stationInfo = getStationObj(step.stationId);

  return (
    <div id="synoptic-weather-simulator" className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
            <CloudRain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Synoptic Weather Event Simulator</h3>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                Dynamic 24h Timeline
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Simulate atmospheric transitions over a 24-hour meteorological event to test regime adaptation in real time.
            </p>
          </div>
        </div>

        {/* Playback Controls & View Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Visual Mode Switcher (3D World vs 2D Canvas vs Science Dashboard) */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs shadow-2xs">
            <button
              id="view-mode-3d-btn"
              onClick={() => setVisualMode('3d')}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-semibold transition-all ${
                visualMode === '3d'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-sky-300" />
              <span>3D World</span>
            </button>
            <button
              id="view-mode-2d-btn"
              onClick={() => setVisualMode('2d')}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-semibold transition-all ${
                visualMode === '2d'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Film className="w-3.5 h-3.5 text-amber-400" />
              <span>2D Canvas</span>
            </button>
            <button
              id="view-mode-meteo-btn"
              onClick={() => setVisualMode('meteorological')}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-semibold transition-all ${
                visualMode === 'meteorological'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Science Dashboard</span>
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />

          <button
            id="sim-play-pause-btn"
            onClick={() => {
              if (currentStepIdx >= scenario.steps.length - 1 && !isPlaying) {
                applyStepAt(0);
              }
              setIsPlaying(!isPlaying);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Run Timeline
              </>
            )}
          </button>

          <button
            id="sim-reset-btn"
            onClick={() => {
              setIsPlaying(false);
              applyStepAt(0);
            }}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition-colors"
            title="Reset to 00:00"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Slowed-down playback speed selector */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-[11px] font-medium text-slate-600 border border-slate-200">
            <button
              onClick={() => setPlaybackSpeed(6000)}
              className={`px-2 py-1 rounded transition-all ${
                playbackSpeed === 6000 ? 'bg-white font-bold text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
              title="Slow pace (6.0 seconds per step)"
            >
              0.5x Slow
            </button>
            <button
              onClick={() => setPlaybackSpeed(4500)}
              className={`px-2 py-1 rounded transition-all ${
                playbackSpeed === 4500 ? 'bg-white font-bold text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
              title="Normal relaxed pace (4.5 seconds per step)"
            >
              1x
            </button>
            <button
              onClick={() => setPlaybackSpeed(2500)}
              className={`px-2 py-1 rounded transition-all ${
                playbackSpeed === 2500 ? 'bg-white font-bold text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
              title="Brisk pace (2.5 seconds per step)"
            >
              1.5x
            </button>
          </div>
        </div>
      </div>

      {/* Primary Visual 3D WebGL World */}
      {visualMode === '3d' && (
        <WeatherStage3D
          timeLabel={step.timeLabel}
          hour={step.hour}
          synopticPhase={step.synopticPhase}
          stationName={stationInfo?.name || 'Met Observatory'}
          rawForecastMm={step.rawForecastMm}
          aiForecastMm={currentStepPrediction.correctedForecastMm}
          detectedRegime={currentStepPrediction.detectedRegime}
          windSpeed={step.windSpeed}
          humidity={step.relativeHumidity}
          pressure={step.surfacePressure}
          narrative={step.eventDescription}
          onToggle2D={() => setVisualMode('2d')}
        />
      )}

      {/* 2D Canvas Physics Animation Stage */}
      {visualMode === '2d' && (
        <KidVisualStage
          timeLabel={step.timeLabel}
          hour={step.hour}
          synopticPhase={step.synopticPhase}
          stationName={stationInfo?.name || 'Met Observatory'}
          rawForecastMm={step.rawForecastMm}
          aiForecastMm={currentStepPrediction.correctedForecastMm}
          detectedRegime={currentStepPrediction.detectedRegime}
          windSpeed={step.windSpeed}
          humidity={step.relativeHumidity}
          pressure={step.surfacePressure}
          narrative={step.eventDescription}
          onToggle3D={() => setVisualMode('3d')}
        />
      )}

      {/* Scenario Selector Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-600">Synoptic Events:</span>
        {SIMULATION_SCENARIOS.map((scen) => (
          <button
            key={scen.id}
            onClick={() => handleSelectScenario(scen.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all text-left ${
              selectedScenarioId === scen.id
                ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold shadow-xs ring-1 ring-blue-400'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span className="block text-[11px] text-slate-500 font-normal">{scen.category}</span>
            <span>{scen.name}</span>
          </button>
        ))}
      </div>

      {/* Timeline Step Progression Bar */}
      <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 font-mono">{step.timeLabel}</span>
            <span className="text-slate-400">•</span>
            <span className="font-semibold text-blue-700">{step.synopticPhase}</span>
          </div>
          <span className="text-slate-500 font-mono text-[11px]">
            Step {currentStepIdx + 1} of {scenario.steps.length} • {stationInfo?.name}
          </span>
        </div>

        {/* Interactive Step Track */}
        <div className="grid grid-cols-5 gap-2 pt-1">
          {scenario.steps.map((s, idx) => {
            const isCurrent = idx === currentStepIdx;
            const isPast = idx < currentStepIdx;
            return (
              <button
                key={idx}
                onClick={() => {
                  setIsPlaying(false);
                  applyStepAt(idx);
                }}
                className={`p-2 rounded-lg border text-left transition-all ${
                  isCurrent
                    ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-300'
                    : isPast
                    ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-mono text-[11px] font-bold ${isCurrent ? 'text-blue-100' : 'text-slate-700'}`}>
                    {s.timeLabel}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCurrent
                        ? 'bg-white animate-pulse'
                        : isPast
                        ? 'bg-blue-500'
                        : 'bg-slate-300'
                    }`}
                  />
                </div>
                <span className={`block text-[10px] truncate mt-0.5 ${isCurrent ? 'text-white' : 'text-slate-500'}`}>
                  {s.synopticPhase}
                </span>
                <span className={`block text-[10px] font-mono mt-0.5 ${isCurrent ? 'text-white font-bold' : 'text-slate-800'}`}>
                  NWP: {s.rawForecastMm} mm
                </span>
              </button>
            );
          })}
        </div>

        {/* Narrative Description of Current Phase */}
        <div className="mt-2 text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/80 leading-relaxed flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-900 font-semibold">{step.synopticPhase}: </strong>
            <span>{step.eventDescription}</span>
          </div>
        </div>
      </div>

      {/* Real-time Comparison Preview Strip inside Simulator */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Simulated NWP</span>
          <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">
            {step.rawForecastMm} mm
          </span>
          <span className="text-[10px] text-slate-500">Unprocessed grid output</span>
        </div>

        <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200">
          <span className="text-[10px] text-blue-700 uppercase font-semibold block">AI Calibrated</span>
          <span className="text-base font-bold font-mono text-blue-700 mt-0.5 block">
            {currentStepPrediction.correctedForecastMm} mm
          </span>
          <span className="text-[10px] text-blue-600 font-medium">
            {currentStepPrediction.adjustmentDeltaMm >= 0 ? '+' : ''}
            {currentStepPrediction.adjustmentDeltaMm} mm adjustment
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-purple-50/70 border border-purple-200">
          <span className="text-[10px] text-purple-700 uppercase font-semibold block">Detected Regime</span>
          <span className="text-xs font-bold text-purple-900 mt-1 block truncate">
            {currentStepPrediction.detectedRegime}
          </span>
          <span className="text-[10px] text-purple-600 font-mono">
            {(currentStepPrediction.regimeConfidence * 100).toFixed(0)}% Confidence
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Synoptic Pressure / RH</span>
          <span className="text-xs font-bold font-mono text-slate-800 mt-1 block">
            {step.surfacePressure} hPa • {step.relativeHumidity}%
          </span>
          <span className="text-[10px] text-slate-500">
            Wind: {step.windSpeed} km/h
          </span>
        </div>
      </div>
    </div>
  );
};
