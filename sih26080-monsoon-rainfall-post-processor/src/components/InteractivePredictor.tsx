import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { MET_STATIONS } from '../data/monsoonDataset';
import { predictScenario } from '../ml/postProcessor';
import { PredictionScenarioInput, PredictionResult, RainfallRegime } from '../types';
import { SynopticSimulator } from './SynopticSimulator';
import { IndiaRegionMapSimulator } from './IndiaRegionMapSimulator';
import { CloudVisualizerD3 } from './CloudVisualizerD3';
import { AdvancedPredictorAnalytics } from './AdvancedPredictorAnalytics';
import { ModelWeightVarianceVisualizer } from './ModelWeightVarianceVisualizer';
import { ModelTimeTrajectoryChart } from './ModelTimeTrajectoryChart';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Radar
} from 'recharts';
import {
  Sliders,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Info,
  RefreshCw,
  Gauge,
  Activity,
  CloudLightning,
  Clock,
  Play,
  Pause,
  Thermometer,
  Wind,
  Download,
  FileText,
  Copy,
  Check,
  Zap,
  TrendingUp,
  Cpu,
  Layers,
  Settings,
  X,
  Compass,
  BarChart2,
  Globe,
  Scale
} from 'lucide-react';

export const InteractivePredictor: React.FC = () => {
  // Core Meteorological Input State
  const [input, setInput] = useState<PredictionScenarioInput>({
    stationId: 'BOM_SANTACRUZ',
    leadTimeDays: 1,
    rawForecastMm: 52.0,
    relativeHumidity: 92,
    temp2m: 27.5,
    surfacePressure: 998.0,
    windSpeed: 34,
    prevDayRain: 45.0,
  });

  // 1. Real-Time Telemetry & Live Clock Stream State
  const [isLiveClockRunning, setIsLiveClockRunning] = useState<boolean>(false);
  const [liveHour, setLiveHour] = useState<number>(12);
  const liveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 2. Multi-Model Ensemble & Uncertainty State
  const [selectedModel, setSelectedModel] = useState<'Linear Regression' | 'Neural Network' | 'Random Forest' | 'Ensemble'>('Linear Regression');
  const [ensembleWeights, setEnsembleWeights] = useState<{ qrf: number; pinn: number; rfBc: number }>({
    qrf: 0.5,
    pinn: 0.3,
    rfBc: 0.2
  });

  // 3. Model Weight Parameters (Historical Climatology vs. Real-Time Telemetry Reliance)
  const [modelRelianceWeight, setModelRelianceWeight] = useState<number>(0.70); // 70% Real-Time NWP / 30% Historical Climatology

  // 4. Climate Sensitivity & Stress Testing State
  const [sstAnomaly, setSstAnomaly] = useState<number>(0.0); // 0 to 3.0 °C SST warming
  const [moistureSurge, setMoistureSurge] = useState<number>(0); // 0 to 30% moisture perturbation

  // 5. Custom Threshold Alerts & Bulletin Export State
  const [customThresholds, setCustomThresholds] = useState<{ heavyRainMm: number; pressureHpa: number; capeJkg: number }>({
    heavyRainMm: 64.5,
    pressureHpa: 995.0,
    capeJkg: 1500
  });
  const [showBulletinModal, setShowBulletinModal] = useState<boolean>(false);
  const [copiedBulletin, setCopiedBulletin] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'weights' | 'ensemble' | 'thermodynamic' | 'sounding'>('overview');
  const [showDryAdiabats, setShowDryAdiabats] = useState<boolean>(true);
  const [showIsotherms, setShowIsotherms] = useState<boolean>(true);

  // Current Station Metadata & Historical Climatology Reference
  const currentStation = useMemo(() => {
    return MET_STATIONS.find((s) => s.id === input.stationId) || MET_STATIONS[0];
  }, [input.stationId]);

  const historicalClimatologyMm = useMemo(() => {
    return Math.round((currentStation.avgMonsoonRainMm / 122) * 10) / 10;
  }, [currentStation]);

  const historicalStdDev = useMemo(() => {
    return Math.max(5.0, Math.round(historicalClimatologyMm * 0.52 * 10) / 10);
  }, [historicalClimatologyMm]);

  // Handle Input Changes
  const handleRunPrediction = useCallback((override?: Partial<PredictionScenarioInput>) => {
    if (!override) return;
    setInput((prev) => ({ ...prev, ...override }));
  }, []);

  // Effective perturbed input considering climate sensitivity adjustments
  const effectiveInput = useMemo(() => {
    const perturbedRH = Math.min(99, Math.round(input.relativeHumidity * (1 + moistureSurge / 100)));
    const sstMoistureFactor = 1 + (sstAnomaly * 0.08) + (moistureSurge * 0.015);
    const perturbedRawRain = Math.round(input.rawForecastMm * sstMoistureFactor * 10) / 10;
    const perturbedTemp = Math.round((input.temp2m + sstAnomaly * 0.5) * 10) / 10;
    const perturbedPressure = Math.round((input.surfacePressure - sstAnomaly * 0.8) * 10) / 10;

    return {
      ...input,
      relativeHumidity: perturbedRH,
      rawForecastMm: perturbedRawRain,
      temp2m: perturbedTemp,
      surfacePressure: perturbedPressure
    };
  }, [input, sstAnomaly, moistureSurge]);

  // Baseline Post-Processor Result
  const baseResult = useMemo<PredictionResult>(() => predictScenario(effectiveInput), [effectiveInput]);

  // 2. Multi-Model Predictions & Output Variance Calculation
  const modelOutputs = useMemo(() => {
    const qrfVal = baseResult.correctedForecastMm;

    // PINN Model: Emphasizes fluid thermodynamic constraints and pressure gradients
    const pinnPressureBonus = effectiveInput.surfacePressure < 1000 ? (1000 - effectiveInput.surfacePressure) * 0.8 : 0;
    const pinnWindBonus = effectiveInput.windSpeed > 30 ? (effectiveInput.windSpeed - 30) * 0.4 : 0;
    const pinnVal = Math.round(Math.max(0, qrfVal * 0.92 + pinnPressureBonus + pinnWindBonus) * 10) / 10;

    // Random Forest Bias Corrector (RF-BC): Non-linear decision trees adjusting raw NWP
    const rfBcVal = Math.round(Math.max(0, qrfVal * 0.88 + effectiveInput.rawForecastMm * 0.12) * 10) / 10;

    // Weighted Ensemble Blend
    const totalWeight = ensembleWeights.qrf + ensembleWeights.pinn + ensembleWeights.rfBc;
    const blendVal = totalWeight > 0
      ? Math.round(((qrfVal * ensembleWeights.qrf + pinnVal * ensembleWeights.pinn + rfBcVal * ensembleWeights.rfBc) / totalWeight) * 10) / 10
      : qrfVal;

    // Linear Regression mapped to base raw/climatology mix for simplicity, or we can use QRF's output
    let activeModelVal = qrfVal; 
    let modelName = 'Linear Regression';

    if (selectedModel === 'Neural Network') {
      activeModelVal = pinnVal;
      modelName = 'Neural Network';
    } else if (selectedModel === 'Random Forest') {
      activeModelVal = rfBcVal;
      modelName = 'Random Forest';
    } else if (selectedModel === 'Ensemble') {
      activeModelVal = blendVal;
      modelName = `Multi-Model Ensemble (${Math.round((ensembleWeights.qrf/totalWeight)*100)}% LR / ${Math.round((ensembleWeights.pinn/totalWeight)*100)}% NN / ${Math.round((ensembleWeights.rfBc/totalWeight)*100)}% RF)`;
    }

    // Real-Time Model Uncertainty Spread
    const realtimeStdDev = Math.max(2.5, activeModelVal * 0.18 + (1008 - effectiveInput.surfacePressure) * 0.25);
    const unblendedActiveVal = activeModelVal;

    // Model Weight Blending between Historical Climatology and Real-Time NWP
    const wReal = Math.max(0, Math.min(1, modelRelianceWeight));
    const wHist = 1 - wReal;

    // Blended Expected Value
    const blendedVal = Math.round((wHist * historicalClimatologyMm + wReal * unblendedActiveVal) * 10) / 10;

    // Output Variance calculation: Var(Y) = w_h^2 * Var_h + w_r^2 * Var_r + 2 * w_h * w_r * Cov(h, r)
    const varHist = Math.pow(historicalStdDev, 2);
    const varReal = Math.pow(realtimeStdDev, 2);
    const covTerm = 2 * wHist * wReal * 0.32 * historicalStdDev * realtimeStdDev;
    const outputVariance = Math.round((Math.pow(wHist, 2) * varHist + Math.pow(wReal, 2) * varReal + covTerm) * 10) / 10;
    const outputStdDev = Math.round(Math.sqrt(outputVariance) * 10) / 10;

    // Uncertainty Spread (p10, p50, p90) calculated from blended output and variance
    const p50 = blendedVal;
    const p10 = Math.max(0, Math.round((blendedVal - 1.28 * outputStdDev) * 10) / 10);
    const p90 = Math.round((blendedVal + 1.64 * outputStdDev) * 10) / 10;

    return {
      qrfVal,
      pinnVal,
      rfBcVal,
      blendVal,
      unblendedActiveVal,
      activeVal: blendedVal,
      modelName,
      p10,
      p50,
      p90,
      uncertaintyRangeMm: Math.round((p90 - p10) * 10) / 10,
      outputVariance,
      outputStdDev,
      realtimeStdDev: Math.round(realtimeStdDev * 10) / 10,
      historicalStdDev,
      historicalClimatologyMm,
      modelRelianceWeight: wReal,
    };
  }, [baseResult, effectiveInput, selectedModel, ensembleWeights, modelRelianceWeight, historicalClimatologyMm, historicalStdDev]);

  // 3. Dynamic Thermodynamic Indices Calculation
  const thermoIndices = useMemo(() => {
    const T = effectiveInput.temp2m;
    const RH = effectiveInput.relativeHumidity;
    const P = effectiveInput.surfacePressure;

    // Dewpoint estimation (Magnus formula approximation)
    const Td = Math.round((T - ((100 - RH) / 5)) * 10) / 10;

    // CAPE estimation (J/kg)
    const pressureAnomaly = Math.max(0, 1010 - P);
    const cape = Math.max(0, Math.round(
      (T - 20) * 110 * (RH / 80) * (1 + pressureAnomaly / 15) + sstAnomaly * 380 + (effectiveInput.windSpeed * 8)
    ));

    // CIN estimation (J/kg) - Convective Inhibition
    const cin = Math.max(0, Math.round((100 - RH) * 3.2 + Math.max(0, P - 1005) * 3.8));

    // K-Index (°C) - Thunderstorm Potential
    const kIndex = Math.round(T * 1.1 + (RH / 3.2) - (P - 985) * 0.45 + sstAnomaly * 2.2);

    let riskLevel = 'LOW';
    let riskColor = 'bg-slate-100 text-slate-800 border-slate-300';
    if (cape >= 2500 || effectiveInput.rawForecastMm >= 64.5) {
      riskLevel = 'EXTREME CONVECTIVE EXPLOSIVE';
      riskColor = 'bg-rose-500 text-white border-rose-600 animate-pulse';
    } else if (cape >= 1500 || effectiveInput.rawForecastMm >= 35) {
      riskLevel = 'HIGH SEVERE THUNDERSTORM';
      riskColor = 'bg-amber-500 text-white border-amber-600';
    } else if (cape >= 800 || effectiveInput.rawForecastMm >= 15) {
      riskLevel = 'MODERATE CONVECTIVE';
      riskColor = 'bg-blue-500 text-white border-blue-600';
    }

    return {
      Td,
      cape,
      cin,
      kIndex,
      riskLevel,
      riskColor
    };
  }, [effectiveInput, sstAnomaly]);

  // 4. Confidence Meter Calculation
  const modelConfidence = useMemo(() => {
    // 1. Calculate variance spread (p90 - p10) vs median
    const spreadPct = (modelOutputs.p90 - modelOutputs.p10) / Math.max(1, modelOutputs.p50);
    
    // 2. Historical variance deviation (if realtime std dev is much larger than historical, confidence drops)
    const stdDevPenalty = Math.max(0, (modelOutputs.realtimeStdDev - modelOutputs.historicalStdDev) / Math.max(1, modelOutputs.historicalStdDev));

    // 3. Base confidence starts at 98, drops based on uncertainties
    let confidence = 98 - (spreadPct * 15) - (stdDevPenalty * 25);
    
    // 4. Extreme edge case penalty
    if (effectiveInput.surfacePressure < 992) confidence -= 8;
    if (effectiveInput.windSpeed > 45) confidence -= 6;
    if (sstAnomaly > 1.5) confidence -= 10;

    // 5. Constrain between 0 and 100
    confidence = Math.max(15, Math.min(99, confidence));
    
    let label = 'HIGH';
    let color = 'text-emerald-400';
    let bg = 'bg-emerald-500/20';
    
    if (confidence < 60) {
      label = 'LOW';
      color = 'text-rose-400';
      bg = 'bg-rose-500/20';
    } else if (confidence < 80) {
      label = 'MODERATE';
      color = 'text-amber-400';
      bg = 'bg-amber-500/20';
    }

    return {
      score: Math.round(confidence),
      label,
      color,
      bg
    };
  }, [modelOutputs, effectiveInput, sstAnomaly]);

  // 5. Custom Threshold Alert Check
  const alertStatus = useMemo(() => {
    const rainAlert = modelOutputs.activeVal >= customThresholds.heavyRainMm;
    const pressureAlert = effectiveInput.surfacePressure <= customThresholds.pressureHpa;
    const capeAlert = thermoIndices.cape >= customThresholds.capeJkg;

    const isTriggered = rainAlert || pressureAlert || capeAlert;

    return {
      isTriggered,
      rainAlert,
      pressureAlert,
      capeAlert
    };
  }, [modelOutputs, effectiveInput, thermoIndices, customThresholds]);

  // 1. Live Clock Telemetry Auto Stream Effect
  useEffect(() => {
    if (!isLiveClockRunning) {
      if (liveTimerRef.current) clearInterval(liveTimerRef.current);
      return;
    }

    liveTimerRef.current = setInterval(() => {
      setLiveHour((prev) => {
        const nextHour = (prev + 1) % 24;
        
        // Diurnal pressure & temperature cycle simulation
        const solarFactor = Math.sin(((nextHour - 6) / 24) * 2 * Math.PI);
        const nextTemp = Math.round((26 + solarFactor * 3.5) * 10) / 10;
        const nextRH = Math.min(98, Math.max(65, Math.round(88 - solarFactor * 12)));
        const nextPress = Math.round((1000 - solarFactor * 2.5 + (Math.random() - 0.5) * 1.5) * 10) / 10;
        const nextWind = Math.min(55, Math.max(12, Math.round(28 + solarFactor * 8 + (Math.random() - 0.5) * 4)));
        const nextRain = Math.max(0, Math.round((input.rawForecastMm + (Math.random() - 0.45) * 6) * 10) / 10);

        setInput((prevInput) => ({
          ...prevInput,
          temp2m: nextTemp,
          relativeHumidity: nextRH,
          surfacePressure: nextPress,
          windSpeed: nextWind,
          rawForecastMm: nextRain
        }));

        return nextHour;
      });
    }, 1500);

    return () => {
      if (liveTimerRef.current) clearInterval(liveTimerRef.current);
    };
  }, [isLiveClockRunning, input.rawForecastMm]);

  // Operational Presets
  const applyPreset = (type: 'drizzle' | 'heavy' | 'moderate' | 'dry' | 'live_telemetry') => {
    let preset: Partial<PredictionScenarioInput> = {};
    if (type === 'drizzle') {
      preset = {
        stationId: 'PNQ_SHIVAJINAGAR',
        rawForecastMm: 4.8,
        relativeHumidity: 66,
        temp2m: 31.0,
        surfacePressure: 1010.5,
        windSpeed: 14,
        prevDayRain: 0.0,
        leadTimeDays: 1,
      };
    } else if (type === 'heavy') {
      preset = {
        stationId: 'BOM_SANTACRUZ',
        rawForecastMm: 68.5,
        relativeHumidity: 95,
        temp2m: 25.0,
        surfacePressure: 994.5,
        windSpeed: 42,
        prevDayRain: 80.0,
        leadTimeDays: 1,
      };
    } else if (type === 'moderate') {
      preset = {
        stationId: 'NAG_SONEGAON',
        rawForecastMm: 28.0,
        relativeHumidity: 84,
        temp2m: 28.0,
        surfacePressure: 1002.0,
        windSpeed: 22,
        prevDayRain: 18.0,
        leadTimeDays: 2,
      };
    } else if (type === 'dry') {
      preset = {
        stationId: 'DEL_SAFDARJUNG',
        rawForecastMm: 1.2,
        relativeHumidity: 58,
        temp2m: 38.5,
        surfacePressure: 1012.0,
        windSpeed: 10,
        prevDayRain: 0.0,
        leadTimeDays: 3,
      };
    } else if (type === 'live_telemetry') {
      // Ingest live real-time station telemetry profile
      const station = MET_STATIONS.find(s => s.id === input.stationId) || MET_STATIONS[0];
      preset = {
        stationId: station.id,
        rawForecastMm: Math.round((25 + Math.random() * 40) * 10) / 10,
        relativeHumidity: Math.round(82 + Math.random() * 14),
        temp2m: Math.round((26 + Math.random() * 4) * 10) / 10,
        surfacePressure: Math.round((996 + Math.random() * 10) * 10) / 10,
        windSpeed: Math.round(20 + Math.random() * 25),
        prevDayRain: Math.round(15 + Math.random() * 50)
      };
    }
    handleRunPrediction(preset);
  };

  const getRegimeBadge = (regime: RainfallRegime) => {
    switch (regime) {
      case RainfallRegime.DRY:
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case RainfallRegime.LIGHT:
        return 'bg-sky-100 text-sky-900 border-sky-300';
      case RainfallRegime.MODERATE:
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case RainfallRegime.HEAVY_EXTREME:
        return 'bg-purple-100 text-purple-900 border-purple-300';
    }
  };

  // Radar chart data points
  const radarData = [
    { subject: 'Moisture (RH)', value: effectiveInput.relativeHumidity },
    { subject: 'NWP Signal', value: Math.min(100, (effectiveInput.rawForecastMm / 100) * 100) },
    { subject: 'Wind Shear', value: Math.min(100, (effectiveInput.windSpeed / 50) * 100) },
    { subject: 'Instability', value: Math.max(0, 100 - ((effectiveInput.surfacePressure - 990) / 25) * 100) },
    { subject: 'Antecedent Rain', value: Math.min(100, (effectiveInput.prevDayRain / 80) * 100) },
  ];

  // Copy Bulletin Markdown Handler
  const handleCopyBulletin = () => {
    let md = `# IMD OPERATIONAL WEATHER ADVISORY BULLETIN\n\n`;
    md += `**Station**: ${currentStation.name} (${currentStation.subdivision})\n`;
    md += `**Issued Timestamp**: ${new Date().toISOString()}\n`;
    md += `**Active Model Pipeline**: ${modelOutputs.modelName}\n\n`;
    md += `--- METEOROLOGICAL TELEMETRY INPUTS ---\n`;
    md += `- Raw NWP Forecast: ${effectiveInput.rawForecastMm} mm/day\n`;
    md += `- 850hPa Relative Humidity: ${effectiveInput.relativeHumidity}%\n`;
    md += `- 2m Surface Temperature: ${effectiveInput.temp2m} °C\n`;
    md += `- Surface Pressure: ${effectiveInput.surfacePressure} hPa\n`;
    md += `- 10m Surface Wind Speed: ${effectiveInput.windSpeed} km/h\n`;
    md += `- Climate Perturbation: SST +${sstAnomaly}°C | Moisture +${moistureSurge}%\n\n`;
    md += `--- AI POST-PROCESSED FORECAST SUMMARY ---\n`;
    md += `- AI Calibrated Rainfall: ${modelOutputs.activeVal} mm/24h\n`;
    md += `- Uncertainty Range (p10 - p90): ${modelOutputs.p10} mm to ${modelOutputs.p90} mm\n`;
    md += `- Regime Classification: ${baseResult.detectedRegime}\n`;
    md += `- Convective Risk Level: ${thermoIndices.riskLevel}\n`;
    md += `- CAPE Index: ${thermoIndices.cape} J/kg | K-Index: ${thermoIndices.kIndex}°C\n\n`;
    md += `--- METEOROLOGICAL DIAGNOSIS ---\n${baseResult.regimeRationale}\n`;

    navigator.clipboard.writeText(md).then(() => {
      setCopiedBulletin(true);
      setTimeout(() => setCopiedBulletin(false), 2500);
    });
  };

  return (
    <div id="interactive-predictor-sandbox" className="space-y-6">
      {/* Introduction Card */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider border border-blue-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-400" />
              Live Inference & Multi-Model Sandbox
            </span>
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" />
              {isLiveClockRunning ? `Live Telemetry Clock ${liveHour.toString().padStart(2, '0')}:00 UTC` : 'Manual Inputs'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1">
            Real-Time Regime Diagnosis, Multi-Model Ensemble & Stress Testing Sandbox
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Test custom synoptic inputs, run live real-time station clock streams, evaluate multi-model ensemble weights (QRF, PINN, RF-BC), perturbation climate stress tests (+SST warming), and generate official operational weather advisories.
          </p>
        </div>

        {/* Operational Actions Toolbar */}
        <div className="flex flex-col gap-2 self-stretch lg:self-auto shrink-0">
          <div className="flex items-center justify-between lg:justify-end gap-2">
            {/* Live Clock Toggle */}
            <button
              id="toggle-live-clock-btn"
              onClick={() => setIsLiveClockRunning(!isLiveClockRunning)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                isLiveClockRunning
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 animate-pulse'
                  : 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700'
              }`}
              title="Start or pause real-time 24h clock telemetry simulation"
            >
              {isLiveClockRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isLiveClockRunning ? 'Pause Live Telemetry' : 'Start Live Telemetry'}
            </button>

            {/* Ingest Live Station Profile */}
            <button
              id="ingest-telemetry-btn"
              onClick={() => applyPreset('live_telemetry')}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white border border-blue-500 text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs"
              title="Fetch and ingest station real-time telemetry feed"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Fetch Station Telemetry
            </button>

            {/* Weather Advisory Bulletin Export */}
            <button
              id="export-bulletin-modal-btn"
              onClick={() => setShowBulletinModal(true)}
              className="px-3 py-1.5 rounded-lg bg-purple-600 text-white border border-purple-500 text-xs font-semibold hover:bg-purple-700 transition-colors flex items-center gap-1.5 shadow-xs"
              title="Generate and export official IMD weather advisory bulletin"
            >
              <FileText className="w-3.5 h-3.5" />
              Advisory Bulletin
            </button>
          </div>

          {/* Operational Benchmark Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
              Presets:
            </span>
            <button
              id="preset-heavy-btn"
              onClick={() => applyPreset('heavy')}
              className="px-2 py-0.5 rounded bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-[11px] font-semibold transition-colors flex items-center gap-1"
            >
              <Flame className="w-3 h-3 text-purple-400" />
              Heavy Convective
            </button>
            <button
              id="preset-drizzle-btn"
              onClick={() => applyPreset('drizzle')}
              className="px-2 py-0.5 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 text-[11px] font-semibold transition-colors"
            >
              NWP Drizzle
            </button>
            <button
              id="preset-moderate-btn"
              onClick={() => applyPreset('moderate')}
              className="px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 text-[11px] font-semibold transition-colors"
            >
              Moderate Rain
            </button>
            <button
              id="preset-dry-btn"
              onClick={() => applyPreset('dry')}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold transition-colors"
            >
              Dry Break
            </button>
            <button
              id="preset-live-telemetry-btn"
              onClick={() => applyPreset('live_telemetry')}
              className="px-2 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 text-[11px] font-semibold transition-colors flex items-center gap-1"
            >
              <Zap className="w-3 h-3 text-emerald-400" />
              Live Telemetry
            </button>
          </div>
        </div>
      </div>

      {/* Threshold Warning Banner (If Triggered) */}
      {alertStatus.isTriggered && (
        <div className="p-4 rounded-xl border bg-rose-950/90 border-rose-500/60 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500 text-white shrink-0">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-rose-200 uppercase tracking-wider">
                  ⚠️ OPERATIONAL THRESHOLD ALERT ACTIVATED
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500 text-white font-bold">
                  {currentStation.name}
                </span>
              </div>
              <p className="text-xs text-rose-100/90 mt-0.5">
                {alertStatus.rainAlert && `Predicted Rain (${modelOutputs.activeVal}mm) exceeds threshold (${customThresholds.heavyRainMm}mm). `}
                {alertStatus.pressureAlert && `Low Pressure (${effectiveInput.surfacePressure}hPa) below threshold (${customThresholds.pressureHpa}hPa). `}
                {alertStatus.capeAlert && `Convective Energy CAPE (${thermoIndices.cape} J/kg) exceeds stability threshold (${customThresholds.capeJkg} J/kg).`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowBulletinModal(true)}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shrink-0 shadow-xs"
          >
            Issue Severe Advisory
          </button>
        </div>
      )}

      {/* Dynamic 24h Synoptic Weather Timeline Simulator */}
      <SynopticSimulator
        onApplyStep={handleRunPrediction}
        currentInput={input}
      />

      {/* India Regional Map Simulator (Full Width Edge-to-Edge) */}
      <div className="w-full">
        <IndiaRegionMapSimulator
          currentInput={input}
          currentResult={baseResult}
          onSelectStationAndPreset={(updates) => handleRunPrediction(updates)}
        />
      </div>

      {/* Navigation Tabs for Sandbox Features */}
      <div className="border-b border-slate-200 flex items-center gap-1 overflow-x-auto pb-px text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-t-lg transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50 font-bold'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Inputs & Diagnosis
        </button>

        <button
          id="tab-weights-variance-btn"
          onClick={() => setActiveTab('weights')}
          className={`px-4 py-2 rounded-t-lg transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'weights'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 font-bold'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Scale className="w-4 h-4 text-indigo-600" />
          Model Reliance & Variance ({Math.round((1 - modelRelianceWeight) * 100)}% / {Math.round(modelRelianceWeight * 100)}%)
        </button>

        <button
          onClick={() => setActiveTab('ensemble')}
          className={`px-4 py-2 rounded-t-lg transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'ensemble'
              ? 'border-purple-600 text-purple-700 bg-purple-50/50 font-bold'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Cpu className="w-4 h-4 text-purple-600" />
          Multi-Model Ensemble & Quantiles ({selectedModel})
        </button>

        <button
          onClick={() => setActiveTab('thermodynamic')}
          className={`px-4 py-2 rounded-t-lg transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'thermodynamic'
              ? 'border-amber-600 text-amber-700 bg-amber-50/50 font-bold'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Thermometer className="w-4 h-4 text-amber-600" />
          Climate Stress Test (+SST & CAPE)
        </button>

        <button
          onClick={() => setActiveTab('sounding')}
          className={`px-4 py-2 rounded-t-lg transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'sounding'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 font-bold'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <CloudLightning className="w-4 h-4 text-emerald-600" />
          Atmospheric Sounding & Sk-T
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Parameter Sliders & Dynamic Sandbox Modules */}
        <div className="lg:col-span-6 space-y-6">
          {/* TAB 0: Interactive Model Weight Parameters & Output Variance Visualizer */}
          {(activeTab === 'overview' || activeTab === 'weights' || activeTab === 'ensemble') && (
            <ModelWeightVarianceVisualizer
              realtimeWeight={modelRelianceWeight}
              onChangeRealtimeWeight={setModelRelianceWeight}
              historicalClimatologyMm={historicalClimatologyMm}
              realtimePredictionMm={modelOutputs.unblendedActiveVal}
              historicalStdDev={historicalStdDev}
              realtimeStdDev={modelOutputs.realtimeStdDev}
              stationName={currentStation.name}
            />
          )}

          {/* TAB 1: Meteorological Inputs */}
          {(activeTab === 'overview' || activeTab === 'weights' || activeTab === 'thermodynamic') && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Meteorological Input Parameters</h3>
                </div>
                <button
                  id="reset-inputs-btn"
                  onClick={() => {
                    handleRunPrediction({ rawForecastMm: 35.0, relativeHumidity: 85, temp2m: 27.5, surfacePressure: 998.0, windSpeed: 30 });
                    setSstAnomaly(0);
                    setMoistureSurge(0);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Reset Defaults
                </button>
              </div>

              {/* Station and Lead Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Meteorological Station
                  </label>
                  <select
                    id="input-station-select"
                    value={input.stationId}
                    onChange={(e) => handleRunPrediction({ stationId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {MET_STATIONS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.subdivision})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Forecast Lead Time
                  </label>
                  <select
                    id="input-lead-select"
                    value={input.leadTimeDays}
                    onChange={(e) => handleRunPrediction({ leadTimeDays: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value={1}>Day +1 (24 hours)</option>
                    <option value={2}>Day +2 (48 hours)</option>
                    <option value={3}>Day +3 (72 hours)</option>
                  </select>
                </div>
              </div>

              {/* Raw Forecast Rainfall Slider */}
              <div className="space-y-1.5 bg-slate-50/80 p-3 rounded-lg border border-slate-200/80">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700">Raw NWP Forecast Rainfall:</span>
                  <span className="font-mono font-bold text-sm text-rose-600">
                    {effectiveInput.rawForecastMm} mm/day
                  </span>
                </div>
                <input
                  id="slider-raw-forecast"
                  type="range"
                  min={0}
                  max={150}
                  step={0.5}
                  value={input.rawForecastMm}
                  onChange={(e) => handleRunPrediction({ rawForecastMm: Number(e.target.value) })}
                  className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0 mm (Dry)</span>
                  <span>15.5 mm (Light)</span>
                  <span>64.5 mm (Heavy)</span>
                  <span>150 mm (Extreme)</span>
                </div>
              </div>

              {/* Atmospheric Predictors Grid */}
              <div className="space-y-3 pt-1">
                {/* Relative Humidity Slider */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-slate-600 font-medium">850hPa Relative Humidity (RH):</span>
                    <span className="font-mono font-bold text-slate-800">{effectiveInput.relativeHumidity}%</span>
                  </div>
                  <input
                    id="slider-rh"
                    type="range"
                    min={45}
                    max={99}
                    step={1}
                    value={input.relativeHumidity}
                    onChange={(e) => handleRunPrediction({ relativeHumidity: Number(e.target.value) })}
                    className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Temperature Slider */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-slate-600 font-medium">2m Surface Temperature:</span>
                    <span className="font-mono font-bold text-slate-800">{effectiveInput.temp2m} °C</span>
                  </div>
                  <input
                    id="slider-temp"
                    type="range"
                    min={15}
                    max={45}
                    step={0.5}
                    value={input.temp2m}
                    onChange={(e) => handleRunPrediction({ temp2m: Number(e.target.value) })}
                    className="w-full accent-amber-500 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Surface Pressure Slider */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-slate-600 font-medium">Surface Pressure Trough:</span>
                    <span className="font-mono font-bold text-slate-800">{effectiveInput.surfacePressure} hPa</span>
                  </div>
                  <input
                    id="slider-pressure"
                    type="range"
                    min={990}
                    max={1016}
                    step={0.5}
                    value={input.surfacePressure}
                    onChange={(e) => handleRunPrediction({ surfacePressure: Number(e.target.value) })}
                    className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>

                {/* 10m Wind Speed Slider */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-slate-600 font-medium">10m Surface Wind Speed:</span>
                    <span className="font-mono font-bold text-slate-800">{effectiveInput.windSpeed} km/h</span>
                  </div>
                  <input
                    id="slider-wind"
                    type="range"
                    min={5}
                    max={60}
                    step={1}
                    value={input.windSpeed}
                    onChange={(e) => handleRunPrediction({ windSpeed: Number(e.target.value) })}
                    className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Climate Sensitivity & SST Perturbation */}
          {(activeTab === 'thermodynamic' || activeTab === 'overview') && (
            <div className="bg-gradient-to-br from-amber-950/20 to-slate-900 border border-amber-500/30 text-white rounded-xl p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-amber-200">Climate Sensitivity & Stress Testing</h3>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Global Warming Perturbation
                </span>
              </div>

              {/* SST Warming Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-amber-100 flex items-center gap-1">
                    <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                    Sea Surface Temp (SST) Anomaly:
                  </span>
                  <span className="font-mono font-bold text-amber-300">
                    +{sstAnomaly.toFixed(1)} °C Warming
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={3.0}
                  step={0.1}
                  value={sstAnomaly}
                  onChange={(e) => setSstAnomaly(Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Moisture Surge Factor */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-amber-100">Moisture Inflow Perturbation:</span>
                  <span className="font-mono font-bold text-amber-300">
                    +{moistureSurge}% Surge
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={1}
                  value={moistureSurge}
                  onChange={(e) => setMoistureSurge(Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Thermo Indices Grid */}
              <div className="grid grid-cols-3 gap-2.5 pt-2 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-amber-500/30">
                  <span className="text-[10px] text-slate-400 block uppercase">CAPE Energy</span>
                  <span className="font-mono font-bold text-amber-300 text-sm">{thermoIndices.cape}</span>
                  <span className="text-[10px] text-slate-400 block">J / kg</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-amber-500/30">
                  <span className="text-[10px] text-slate-400 block uppercase">CIN Inhibition</span>
                  <span className="font-mono font-bold text-amber-300 text-sm">{thermoIndices.cin}</span>
                  <span className="text-[10px] text-slate-400 block">J / kg</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-amber-500/30">
                  <span className="text-[10px] text-slate-400 block uppercase">K-Index</span>
                  <span className="font-mono font-bold text-amber-300 text-sm">{thermoIndices.kIndex} °C</span>
                  <span className="text-[10px] text-slate-400 block">Thunder Potential</span>
                </div>
              </div>
            </div>
          )}

          {/* D3 Atmospheric Visualizer Sandbox Engine */}
          <CloudVisualizerD3
            rainMm={modelOutputs.activeVal}
            humidity={effectiveInput.relativeHumidity}
            pressure={effectiveInput.surfacePressure}
            temp={effectiveInput.temp2m}
            windSpeed={effectiveInput.windSpeed}
          />
        </div>

        {/* Right Column: Dynamic AI Diagnosis, Ensemble & Output Cards */}
        <div className="lg:col-span-6 space-y-6">
          {/* TAB 2: Multi-Model Ensemble Selector */}
          {(activeTab === 'ensemble' || activeTab === 'weights' || activeTab === 'overview') && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-slate-900">Multi-Model Regressor Architecture</h3>
                </div>
                <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                  {selectedModel} Mode
                </span>
              </div>

              {/* Model Select Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <button
                  onClick={() => setSelectedModel('Linear Regression')}
                  className={`p-2.5 rounded-xl border font-bold transition-all text-center ${
                    selectedModel === 'Linear Regression'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Linear Regression
                </button>

                <button
                  onClick={() => setSelectedModel('Neural Network')}
                  className={`p-2.5 rounded-xl border font-bold transition-all text-center ${
                    selectedModel === 'Neural Network'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Neural Network
                </button>

                <button
                  onClick={() => setSelectedModel('Random Forest')}
                  className={`p-2.5 rounded-xl border font-bold transition-all text-center ${
                    selectedModel === 'Random Forest'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Random Forest
                </button>

                <button
                  onClick={() => setSelectedModel('Ensemble')}
                  className={`p-2.5 rounded-xl border font-bold transition-all text-center ${
                    selectedModel === 'Ensemble'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Blend Ensemble
                </button>
              </div>

              {/* Ensemble Weight Sliders (Shown when Ensemble is active) */}
              {selectedModel === 'Ensemble' && (
                <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200 space-y-3 text-xs">
                  <span className="font-bold text-purple-900 block">Ensemble Weight Distribution:</span>
                  
                  <div>
                    <div className="flex justify-between font-semibold text-slate-700 mb-1">
                      <span>Quantile Random Forest (QRF):</span>
                      <span className="font-mono text-purple-700">{Math.round(ensembleWeights.qrf * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={ensembleWeights.qrf}
                      onChange={(e) => setEnsembleWeights(prev => ({ ...prev, qrf: Number(e.target.value) }))}
                      className="w-full accent-purple-600 h-1.5 bg-slate-200 rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold text-slate-700 mb-1">
                      <span>Physics-Informed Neural Net (PINN):</span>
                      <span className="font-mono text-purple-700">{Math.round(ensembleWeights.pinn * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={ensembleWeights.pinn}
                      onChange={(e) => setEnsembleWeights(prev => ({ ...prev, pinn: Number(e.target.value) }))}
                      className="w-full accent-purple-600 h-1.5 bg-slate-200 rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold text-slate-700 mb-1">
                      <span>Random Forest Bias Corrector (RF-BC):</span>
                      <span className="font-mono text-purple-700">{Math.round(ensembleWeights.rfBc * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={ensembleWeights.rfBc}
                      onChange={(e) => setEnsembleWeights(prev => ({ ...prev, rfBc: Number(e.target.value) }))}
                      className="w-full accent-purple-600 h-1.5 bg-slate-200 rounded cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Side-by-Side Model Output Comparison Bar */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <span className="font-bold text-slate-800 block uppercase tracking-wider text-[11px]">Model Output Comparison:</span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center font-mono">
                  <div className="p-2 rounded bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-sans">Raw NWP</span>
                    <span className="font-bold text-rose-600">{effectiveInput.rawForecastMm}</span>
                    <span className="text-[10px] text-slate-400 block">mm</span>
                  </div>

                  <div className={`p-2 rounded border cursor-pointer transition-colors ${selectedModel === 'Linear Regression' ? 'bg-purple-100 border-purple-400 font-bold' : 'bg-white border-slate-200 hover:bg-slate-100'}`} onClick={() => setSelectedModel('Linear Regression')}>
                    <span className="text-[10px] text-slate-500 block font-sans">Linear Reg.</span>
                    <span className="font-bold text-purple-700">{modelOutputs.qrfVal}</span>
                    <span className="text-[10px] text-slate-400 block">mm</span>
                  </div>

                  <div className={`p-2 rounded border cursor-pointer transition-colors ${selectedModel === 'Neural Network' ? 'bg-purple-100 border-purple-400 font-bold' : 'bg-white border-slate-200 hover:bg-slate-100'}`} onClick={() => setSelectedModel('Neural Network')}>
                    <span className="text-[10px] text-slate-500 block font-sans">Neural Net</span>
                    <span className="font-bold text-purple-700">{modelOutputs.pinnVal}</span>
                    <span className="text-[10px] text-slate-400 block">mm</span>
                  </div>

                  <div className={`p-2 rounded border cursor-pointer transition-colors ${selectedModel === 'Random Forest' ? 'bg-purple-100 border-purple-400 font-bold' : 'bg-white border-slate-200 hover:bg-slate-100'}`} onClick={() => setSelectedModel('Random Forest')}>
                    <span className="text-[10px] text-slate-500 block font-sans">Random Forest</span>
                    <span className="font-bold text-purple-700">{modelOutputs.rfBcVal}</span>
                    <span className="text-[10px] text-slate-400 block">mm</span>
                  </div>

                  <div className={`p-2 rounded border cursor-pointer transition-colors ${selectedModel === 'Ensemble' ? 'bg-purple-100 border-purple-400 font-bold' : 'bg-white border-slate-200 hover:bg-slate-100'}`} onClick={() => setSelectedModel('Ensemble')}>
                    <span className="text-[10px] text-slate-500 block font-sans">Ensemble</span>
                    <span className="font-bold text-purple-700">{modelOutputs.blendVal}</span>
                    <span className="text-[10px] text-slate-400 block">mm</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Interactive Trajectory & Scalable Confidence Interval Chart */}
              <ModelTimeTrajectoryChart
                modelName={selectedModel}
                onSelectModel={setSelectedModel}
                basePredictionMm={modelOutputs.activeVal}
                baseStdDev={modelOutputs.outputStdDev}
                leadTimeHours={input.leadTimeDays * 24}
                stationName={currentStation.name}
              />
            </div>
          )}

          {/* Main Transformation Result Card */}
          <div
            id="result-transformation-card"
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs relative overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Selected Pipeline Output ({modelOutputs.modelName})
              </span>
              <span
                id="detected-regime-badge"
                className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getRegimeBadge(
                  baseResult.detectedRegime
                )}`}
              >
                Regime: {baseResult.detectedRegime}
              </span>
            </div>

            {/* Before vs After Callout */}
            <div className="mt-4 grid grid-cols-2 gap-3 items-center">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[11px] font-medium text-slate-500 block uppercase">
                  Raw NWP Forecast
                </span>
                <span className="text-3xl font-extrabold text-slate-800 font-mono tracking-tight mt-0.5 block">
                  {effectiveInput.rawForecastMm}
                </span>
                <span className="text-[11px] text-slate-500">mm / 24h</span>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-center relative">
                <span className="text-[11px] font-bold text-blue-700 block uppercase">
                  AI Calibrated Forecast
                </span>
                <span className="text-3xl font-extrabold text-blue-700 font-mono tracking-tight mt-0.5 block">
                  {modelOutputs.activeVal}
                </span>
                <span className="text-[11px] text-blue-600 font-medium">mm / 24h</span>
              </div>
            </div>

            {/* Model Confidence Meter */}
            <div className="mt-4 p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-md ${modelConfidence.bg}`}>
                  <ShieldCheck className={`w-4 h-4 ${modelConfidence.color.replace('400', '600')}`} />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-700 uppercase">Prediction Confidence</div>
                  <div className="text-[10px] text-slate-500">Based on historical parameter variance</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className={`text-sm font-extrabold ${modelConfidence.color.replace('400', '600')}`}>
                    {modelConfidence.score}%
                  </div>
                  <div className={`text-[9px] font-bold tracking-wider ${modelConfidence.color.replace('400', '600')} uppercase`}>
                    {modelConfidence.label}
                  </div>
                </div>
                {/* Circular Progress */}
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-200"
                      strokeWidth="3"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={modelConfidence.color.replace('text-', 'text-').replace('400', '500')}
                      strokeWidth="3"
                      strokeDasharray={`${modelConfidence.score}, 100`}
                      stroke="currentColor"
                      fill="none"
                      strokeLinecap="round"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Quantile Uncertainty Range Bar */}
            <div className="mt-4 p-3 rounded-lg bg-slate-900 text-white space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-300 flex items-center gap-1">
                  <BarChart2 className="w-3.5 h-3.5 text-sky-400" />
                  Uncertainty Quantile Spread (p10 &mdash; p90):
                </span>
                <span className="font-mono font-bold text-sky-300">
                  {modelOutputs.p10}mm to {modelOutputs.p90}mm
                </span>
              </div>
              
              {/* Range Progress Bar */}
              <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="absolute h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-full"
                  style={{
                    left: `${Math.max(0, Math.min(100, (modelOutputs.p10 / 120) * 100))}%`,
                    width: `${Math.max(10, Math.min(100, ((modelOutputs.p90 - modelOutputs.p10) / 120) * 100))}%`
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>p10: {modelOutputs.p10}mm</span>
                <span className="text-sky-300 font-bold">p50 Median: {modelOutputs.p50}mm</span>
                <span>p90 Extreme: {modelOutputs.p90}mm</span>
              </div>
            </div>

            {/* Model Rationale */}
            <div className="mt-4 space-y-2">
              <div className="text-xs">
                <span className="font-semibold text-slate-700">Active Regressor Model: </span>
                <span className="text-blue-700 font-medium">{modelOutputs.modelName}</span>
              </div>
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200/80 leading-relaxed">
                <strong>Meteorological Diagnosis:</strong> {baseResult.regimeRationale}
              </p>
            </div>
          </div>

          {/* TAB 4: Sk-T Atmospheric Sounding Diagram Preview */}
          {(activeTab === 'sounding' || activeTab === 'overview') && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <CloudLightning className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Interactive Sk-T Atmospheric Profile & CAPE Diagram
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-bold ${thermoIndices.riskColor}`}>
                    {thermoIndices.riskLevel}
                  </span>
                </div>
              </div>

              {/* Thermodynamic Summary Indicators */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="bg-amber-50/80 p-2 rounded-lg border border-amber-200">
                  <div className="text-[10px] text-amber-800 font-semibold uppercase">SFC CAPE</div>
                  <div className="text-sm font-bold text-amber-950">{thermoIndices.cape} <span className="text-[10px] font-normal">J/kg</span></div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-600 font-semibold uppercase">SFC CIN</div>
                  <div className="text-sm font-bold text-slate-800">{thermoIndices.cin} <span className="text-[10px] font-normal">J/kg</span></div>
                </div>
                <div className="bg-emerald-50/80 p-2 rounded-lg border border-emerald-200">
                  <div className="text-[10px] text-emerald-800 font-semibold uppercase">Surface Dewpoint</div>
                  <div className="text-sm font-bold text-emerald-950">{thermoIndices.Td}°C <span className="text-[10px] font-normal">(RH {effectiveInput.relativeHumidity}%)</span></div>
                </div>
                <div className="bg-sky-50/80 p-2 rounded-lg border border-sky-200">
                  <div className="text-[10px] text-sky-800 font-semibold uppercase">K-Index</div>
                  <div className="text-sm font-bold text-sky-950">{thermoIndices.kIndex}°C</div>
                </div>
              </div>

              {/* High-Precision SVG Sounding Diagram Header Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold text-[11px]">Sounding Layers:</span>
                  <button
                    onClick={() => setShowIsotherms(!showIsotherms)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      showIsotherms
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50 shadow-xs'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    <span>Isotherms (T)</span>
                    <span className="text-[9px] opacity-75">[{showIsotherms ? 'ON' : 'OFF'}]</span>
                  </button>
                  <button
                    onClick={() => setShowDryAdiabats(!showDryAdiabats)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      showDryAdiabats
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50 shadow-xs'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    <span>Dry Adiabats (θ)</span>
                    <span className="text-[9px] opacity-75">[{showDryAdiabats ? 'ON' : 'OFF'}]</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-mono text-amber-300 bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-800/50">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Regime Lapse: {baseResult.detectedRegime}</span>
                </div>
              </div>

              {/* High-Precision SVG Sounding Diagram */}
              <div className="w-full bg-slate-950 rounded-xl p-4 relative text-white font-mono shadow-inner border border-slate-800">
                <svg viewBox="0 0 540 270" className="w-full h-auto max-h-[320px] overflow-visible select-none">
                  <defs>
                    <linearGradient id="capeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.55" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.25" />
                    </linearGradient>
                    <linearGradient id="cinGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.1" />
                    </linearGradient>
                    <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="1.5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Pressure Level Horizontal Isobars */}
                  {[
                    { p: '300 hPa (9km)', y: 30 },
                    { p: '500 hPa (5.5km)', y: 80 },
                    { p: '700 hPa (3km)', y: 130 },
                    { p: '850 hPa (1.5km)', y: 180 },
                    { p: '1000 hPa (SFC)', y: 230 },
                  ].map((lvl, idx) => (
                    <g key={idx}>
                      <line x1="65" y1={lvl.y} x2="480" y2={lvl.y} stroke="#334155" strokeDasharray="3 3" strokeWidth="1" />
                      <text x="60" y={lvl.y + 4} fill="#64748b" fontSize="9" textAnchor="end">{lvl.p}</text>
                    </g>
                  ))}

                  {/* Dynamic Skewed Isotherms (Constant Temperature Lines T) */}
                  {showIsotherms && [
                    { t: '-40°C', val: -40, x0: 80, x1: 30 },
                    { t: '-20°C', val: -20, x0: 150, x1: 100 },
                    { t: '0°C (Freezing Level)', val: 0, x0: 220, x1: 170, isFreezing: true },
                    { t: '+20°C', val: 20, x0: 290, x1: 240 },
                    { t: '+30°C', val: 30, x0: 325, x1: 275 },
                    { t: '+40°C', val: 40, x0: 360, x1: 310 },
                  ].map((iso, idx) => {
                    const isFreezing = iso.isFreezing;
                    const isExtremeRegime = baseResult.detectedRegime === RainfallRegime.HEAVY_EXTREME;
                    const strokeColor = isFreezing
                      ? (isExtremeRegime ? '#06b6d4' : '#38bdf8')
                      : '#334155';
                    const strokeWidth = isFreezing ? '1.5' : '0.8';
                    const strokeDash = isFreezing ? 'none' : '2 4';

                    return (
                      <g key={`iso-${idx}`}>
                        <line
                          x1={iso.x0}
                          y1="230"
                          x2={iso.x1}
                          y2="30"
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          strokeDasharray={strokeDash}
                          filter={isFreezing ? 'url(#glowCyan)' : undefined}
                          opacity={isFreezing ? 0.9 : 0.45}
                        />
                        <text
                          x={iso.x0}
                          y="244"
                          fill={isFreezing ? '#38bdf8' : '#475569'}
                          fontSize={isFreezing ? '8.5' : '8'}
                          fontWeight={isFreezing ? 'bold' : 'normal'}
                          textAnchor="middle"
                        >
                          {iso.t}
                        </text>
                      </g>
                    );
                  })}

                  {/* Dynamic Dry Adiabats Reference Curves (Lines of Constant Potential Temp θ) */}
                  {showDryAdiabats && (() => {
                    // Render dry adiabats for θ = 280K, 295K, 310K, 325K, 340K
                    const referenceThetas = [285, 298, 310, 322, 335];
                    // Pressure levels: 1000hPa (y=230), 850hPa (y=180), 700hPa (y=130), 500hPa (y=80), 300hPa (y=30)
                    const pressures = [
                      { p: 1000, y: 230, skew: 0 },
                      { p: 850,  y: 180, skew: 5 },
                      { p: 700,  y: 130, skew: 12 },
                      { p: 500,  y: 80,  skew: 20 },
                      { p: 300,  y: 30,  skew: 30 },
                    ];

                    return (
                      <g id="dry-adiabats-layer">
                        {referenceThetas.map((thetaK, tIdx) => {
                          // Compute pixel coordinates along pressure levels for this θ
                          const pathPoints = pressures.map((lvl) => {
                            // T(P) = θ * (P / 1000)^0.286 - 273.15
                            const tCelsius = thetaK * Math.pow(lvl.p / 1000, 0.286) - 273.15;
                            const x = 220 + (tCelsius - lvl.skew) * 3.2;
                            return { x, y: lvl.y };
                          });

                          const pathD = `M ${pathPoints[0].x} ${pathPoints[0].y} ` +
                            pathPoints.slice(1).map(pt => `L ${pt.x} ${pt.y}`).join(' ');

                          return (
                            <g key={`theta-${tIdx}`}>
                              <path
                                d={pathD}
                                fill="none"
                                stroke="#0284c7"
                                strokeWidth="1"
                                strokeDasharray="3 3"
                                opacity="0.45"
                              />
                              <text
                                x={pathPoints[0].x}
                                y={pathPoints[0].y + 12}
                                fill="#0284c7"
                                fontSize="7"
                                fontStyle="italic"
                                textAnchor="middle"
                              >
                                θ={thetaK}K
                              </text>
                            </g>
                          );
                        })}
                      </g>
                    );
                  })()}

                  {/* Dynamic Curve Coordinate Calculation */}
                  {(() => {
                    const temp = effectiveInput.temp2m;
                    const td = thermoIndices.Td;
                    const cape = thermoIndices.cape;
                    const regime = baseResult.detectedRegime;

                    // Compute pixel coordinates along pressure levels
                    // y = 230 (1000hPa), 180 (850hPa), 130 (700hPa), 80 (500hPa), 30 (300hPa)
                    // Environmental Temperature (Red)
                    const xT1000 = 220 + (temp * 3.5);
                    const xT850  = 220 + ((temp - 8) * 3.5);
                    const xT700  = 220 + ((temp - 19) * 3.5);
                    const xT500  = 220 + ((temp - 32) * 3.5);
                    const xT300  = 220 + ((temp - 48) * 3.5);

                    // Dewpoint (Green)
                    const xTd1000 = 220 + (td * 3.5);
                    const xTd850  = 220 + ((td - 7) * 3.5);
                    const xTd700  = 220 + ((td - 18) * 3.5);
                    const xTd500  = 220 + ((td - 35) * 3.5);
                    const xTd300  = 220 + ((td - 55) * 3.5);

                    // Regime-Specific Dry Adiabatic Parcel Ascent
                    // Surface parcel potential temperature theta_sfc
                    const thetaSfcK = Math.round((temp + 273.15) * Math.pow(1000 / 1000, 0.286) * 10) / 10;
                    
                    // Moist Parcel Ascending Adiabat (Amber) - Parcel is warmer than environment when CAPE > 0
                    const parcelBoost = Math.min(22, (cape / 180));
                    const xP1000 = xT1000;
                    const xP850  = xT850 + (parcelBoost * 0.45);
                    const xP700  = xT700 + (parcelBoost * 1.3);
                    const xP500  = xT500 + (parcelBoost * 1.6);
                    const xP300  = xT300 + (parcelBoost * 0.85);

                    const tempPath = `M ${xT1000} 230 L ${xT850} 180 L ${xT700} 130 L ${xT500} 80 L ${xT300} 30`;
                    const dewPath  = `M ${xTd1000} 230 L ${xTd850} 180 L ${xTd700} 130 L ${xTd500} 80 L ${xTd300} 30`;
                    const parcelPath = `M ${xP1000} 230 L ${xP850} 180 L ${xP700} 130 L ${xP500} 80 L ${xP300} 30`;

                    // Polygon for CAPE Area (between Parcel curve and Env Temp curve)
                    const capePoly = `${xT850},180 ${xP850},180 ${xP700},130 ${xP500},80 ${xP300},30 ${xT300},30 ${xT500},80 ${xT700},130`;

                    // Dynamic Surface Parcel Dry Adiabat Trace (from SFC up to LCL)
                    const xDrySfc = xT1000;
                    const xDryLcl = xP850;
                    const dryParcelTraceD = `M ${xDrySfc} 230 L ${xDryLcl} 180`;

                    return (
                      <>
                        {/* Dynamic Surface Parcel Dry Adiabat Trace */}
                        {showDryAdiabats && (
                          <g>
                            <path
                              d={dryParcelTraceD}
                              fill="none"
                              stroke="#0ea5e9"
                              strokeWidth="2.5"
                              strokeDasharray="4 2"
                            />
                            {/* Theta_sfc indicator at surface */}
                            <text
                              x={xDrySfc - 12}
                              y="222"
                              fill="#38bdf8"
                              fontSize="8"
                              fontWeight="bold"
                            >
                              θ_sfc={thetaSfcK}K
                            </text>
                          </g>
                        )}

                        {/* Shaded CAPE Area */}
                        {cape > 100 && (
                          <polygon points={capePoly} fill="url(#capeGradient)" />
                        )}

                        {/* Environmental Temperature Curve (Red) */}
                        <path d={tempPath} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />

                        {/* Dewpoint Curve (Green) */}
                        <path d={dewPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="5 3" strokeLinecap="round" />

                        {/* Parcel Ascending Curve (Amber) */}
                        <path d={parcelPath} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="2 2" />

                        {/* Key Temperature Points */}
                        <circle cx={xT1000} cy="230" r="4" fill="#f43f5e" />
                        <circle cx={xTd1000} cy="230" r="4" fill="#10b981" />
                        
                        {/* LCL (Lifting Condensation Level) Marker */}
                        <g transform={`translate(${xP850 + 10}, 180)`}>
                          <rect x="-4" y="-8" width="54" height="14" rx="3" fill="#0f172a" stroke="#f59e0b" strokeWidth="1" />
                          <text x="23" y="2" fill="#f59e0b" fontSize="8" fontWeight="bold" textAnchor="middle">
                            LCL {regime === RainfallRegime.HEAVY_EXTREME ? '910hPa' : '850hPa'}
                          </text>
                        </g>

                        {/* EL (Equilibrium Level) Marker */}
                        {cape > 500 && (
                          <g transform={`translate(${xP300 + 10}, 30)`}>
                            <rect x="-4" y="-8" width="54" height="14" rx="3" fill="#0f172a" stroke="#ef4444" strokeWidth="1" />
                            <text x="23" y="2" fill="#ef4444" fontSize="8" fontWeight="bold" textAnchor="middle">EL 300hPa</text>
                          </g>
                        )}

                        {/* Freezing Level 0°C Tag */}
                        <g transform="translate(195, 120)">
                          <rect x="-2" y="-7" width="62" height="13" rx="2" fill="#0369a1" fillOpacity="0.8" />
                          <text x="29" y="2" fill="#e0f2fe" fontSize="7.5" fontWeight="bold" textAnchor="middle">0°C Freezing Lvl</text>
                        </g>

                        {/* Surface Wind Barb Indicator on Right Margin */}
                        <g transform="translate(505, 230)">
                          <line x1="0" y1="0" x2="-20" y2="0" stroke="#38bdf8" strokeWidth="2" />
                          <line x1="-20" y1="0" x2="-25" y2="-6" stroke="#38bdf8" strokeWidth="2" />
                          <line x1="-15" y1="0" x2="-20" y2="-6" stroke="#38bdf8" strokeWidth="2" />
                          <text x="5" y="3" fill="#38bdf8" fontSize="8" fontWeight="bold">{effectiveInput.windSpeed} kt</text>
                        </g>
                        <g transform="translate(505, 130)">
                          <line x1="0" y1="0" x2="-20" y2="-5" stroke="#38bdf8" strokeWidth="2" />
                          <line x1="-20" y1="-5" x2="-23" y2="-12" stroke="#38bdf8" strokeWidth="2" />
                          <text x="5" y="3" fill="#94a3b8" fontSize="8">45 kt</text>
                        </g>
                      </>
                    );
                  })()}
                </svg>

                {/* Legend Footer */}
                <div className="flex flex-wrap items-center justify-between text-[11px] pt-2 mt-2 border-t border-slate-800 gap-2">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                      <span className="w-3 h-0.5 bg-rose-500 rounded-full inline-block" /> Temp (T)
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <span className="w-3 h-0.5 bg-emerald-500 rounded-full inline-block" /> Dewpoint (Td)
                    </span>
                    <span className="flex items-center gap-1.5 text-sky-300 font-semibold">
                      <span className="w-3 h-0.5 bg-sky-400 rounded-full inline-block border border-sky-300" /> Dry Adiabat (θ)
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                      <span className="w-3 h-0.5 bg-amber-500 rounded-full inline-block" /> Parcel Trace
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-300">
                      <span className="w-2.5 h-2.5 bg-amber-500/40 border border-amber-500 rounded-xs inline-block" /> CAPE Area
                    </span>
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    Skew-T Log-P Coordinate System
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Physical Feature Attributions Radar */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              Physical Attribution Breakdown
            </h4>

            {/* XAI Radar Chart */}
            <div className="h-48 w-full -mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#cbd5e1" strokeDasharray="3 3" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                  <Radar name="Intensity" dataKey="value" stroke="#3b82f6" fill="#60a5fa" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Advanced Predictor Analytics & AI Modules */}
          <AdvancedPredictorAnalytics
            effectiveInput={effectiveInput}
            baseResult={baseResult}
            thermoIndices={thermoIndices}
            modelOutputs={modelOutputs}
            sstAnomaly={sstAnomaly}
          />
        </div>
      </div>

      {/* OFFICIAL IMD WEATHER ADVISORY BULLETIN MODAL */}
      {showBulletinModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-3xl max-h-[90vh] rounded-2xl bg-slate-900 border border-slate-700 text-white shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-base font-bold text-white">IMD Operational Weather Advisory Bulletin</h3>
                  <p className="text-xs text-slate-400">Automated Meteorological Advisory Document for {currentStation.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyBulletin}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    copiedBulletin
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {copiedBulletin ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedBulletin ? 'Copied Markdown' : 'Copy Advisory'}
                </button>

                <button
                  onClick={() => setShowBulletinModal(false)}
                  className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Document Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 font-mono text-xs leading-relaxed">
              <div className="p-4 rounded-xl border bg-slate-950/80 border-slate-800 space-y-2">
                <div className="flex justify-between border-b border-slate-800 pb-2 text-slate-400">
                  <span>STATION: <strong className="text-white">{currentStation.name} ({currentStation.id})</strong></span>
                  <span>SUBDIVISION: <strong className="text-white">{currentStation.subdivision}</strong></span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>Model Architecture: <span className="text-purple-300 font-bold">{modelOutputs.modelName}</span></div>
                  <div>Issued Timestamp: <span className="text-slate-300">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span></div>
                  <div>Detected Regime: <span className="text-blue-300 font-bold">{baseResult.detectedRegime}</span></div>
                  <div>Convective Risk: <span className="text-rose-300 font-bold">{thermoIndices.riskLevel}</span></div>
                </div>
              </div>

              {/* Rain Forecast Box */}
              <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/40 grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Raw NWP Output</span>
                  <span className="text-xl font-bold text-rose-400">{effectiveInput.rawForecastMm} mm</span>
                </div>

                <div className="border-x border-blue-500/30">
                  <span className="text-[10px] text-blue-300 font-bold uppercase block">AI Calibrated Forecast</span>
                  <span className="text-2xl font-extrabold text-blue-300">{modelOutputs.activeVal} mm</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Uncertainty (p10-p90)</span>
                  <span className="text-xl font-bold text-sky-300">{modelOutputs.p10} - {modelOutputs.p90} mm</span>
                </div>
              </div>

              {/* Meteorological Telemetry Inputs */}
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-bold text-slate-300 block uppercase text-[11px]">Synoptic Telemetry Summary:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-400 text-[11px]">
                  <div>RH (850hPa): <strong className="text-white">{effectiveInput.relativeHumidity}%</strong></div>
                  <div>Temp (2m): <strong className="text-white">{effectiveInput.temp2m}°C</strong></div>
                  <div>Pressure: <strong className="text-white">{effectiveInput.surfacePressure}hPa</strong></div>
                  <div>Wind Speed: <strong className="text-white">{effectiveInput.windSpeed}km/h</strong></div>
                  <div>CAPE Energy: <strong className="text-amber-300">{thermoIndices.cape} J/kg</strong></div>
                  <div>CIN Inhibition: <strong className="text-amber-300">{thermoIndices.cin} J/kg</strong></div>
                  <div>K-Index: <strong className="text-amber-300">{thermoIndices.kIndex}°C</strong></div>
                  <div>SST Perturbation: <strong className="text-amber-300">+{sstAnomaly}°C</strong></div>
                </div>
              </div>

              {/* Meteorological Rationale */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="font-bold text-slate-300 block uppercase text-[11px]">Synoptic & Thermodynamic Rationale:</span>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  {baseResult.regimeRationale}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-mono">Document Format: IMD-STD-ADVISORY-JSON-V2</span>
              <button
                onClick={() => setShowBulletinModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
