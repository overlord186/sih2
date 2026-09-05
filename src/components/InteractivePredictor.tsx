import React, { useState, useMemo, useCallback } from 'react';
import { MET_STATIONS } from '../data/monsoonDataset';
import { predictScenario } from '../ml/postProcessor';
import { PredictionScenarioInput, PredictionResult, RainfallRegime } from '../types';
import { SynopticSimulator } from './SynopticSimulator';
import { IndiaRegionMapSimulator } from './IndiaRegionMapSimulator';
import { CloudVisualizerD3 } from './CloudVisualizerD3';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
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
  CloudLightning
} from 'lucide-react';

export const InteractivePredictor: React.FC = () => {
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

  // Purely derived result guaranteed to remain in sync without dual-state race conditions
  const result = useMemo<PredictionResult>(() => predictScenario(input), [input]);

  const handleRunPrediction = useCallback((override?: Partial<PredictionScenarioInput>) => {
    if (!override) return;
    setInput((prev) => ({ ...prev, ...override }));
  }, []);

  // Quick preset test cases tailored for operational meteorological testing
  const applyPreset = (type: 'drizzle' | 'heavy' | 'moderate' | 'dry') => {
    let preset: Partial<PredictionScenarioInput> = {};
    if (type === 'drizzle') {
      // Classic NWP false alarm drizzle
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
      // Classic NWP extreme smoothing failure
      preset = {
        stationId: 'BOM_SANTACRUZ',
        rawForecastMm: 46.0,
        relativeHumidity: 94,
        temp2m: 25.5,
        surfacePressure: 996.0,
        windSpeed: 38,
        prevDayRain: 65.0,
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
    } else {
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

  // Convert current parameters to standardized 0-100 values for the Radar Chart
  const radarData = [
    { subject: 'Moisture (RH)', value: input.relativeHumidity },
    { subject: 'NWP Signal', value: Math.min(100, (input.rawForecastMm / 100) * 100) },
    { subject: 'Wind Shear', value: Math.min(100, (input.windSpeed / 50) * 100) },
    { subject: 'Instability (Press)', value: Math.max(0, 100 - ((input.surfacePressure - 990) / 25) * 100) },
    { subject: 'Antecedent Rain', value: Math.min(100, (input.prevDayRain / 80) * 100) },
  ];

  return (
    <div id="interactive-predictor-sandbox" className="space-y-6">
      {/* Introduction Card */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider border border-blue-500/30">
              Live Inference Sandbox
            </span>
            <span className="text-xs text-slate-400 font-mono">Real-Time Model Pipeline</span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1">
            Real-Time Regime Diagnosis & AI Post-Processing Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Input arbitrary raw Numerical Weather Prediction outputs alongside key synoptic atmospheric variables or run dynamic weather timeline simulations below. Watch how the regime classifier dynamically determines physical state and applies the appropriate post-processing model.
          </p>
        </div>

        {/* Operational Presets */}
        <div className="flex flex-col gap-1.5 self-stretch sm:self-auto shrink-0">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Operational Benchmarks:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              id="preset-heavy-btn"
              onClick={() => applyPreset('heavy')}
              className="px-2.5 py-1 rounded bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <Flame className="w-3 h-3 text-purple-400" />
              Heavy Convective Surge
            </button>
            <button
              id="preset-drizzle-btn"
              onClick={() => applyPreset('drizzle')}
              className="px-2.5 py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 text-xs font-semibold transition-colors"
            >
              NWP False Drizzle
            </button>
            <button
              id="preset-moderate-btn"
              onClick={() => applyPreset('moderate')}
              className="px-2.5 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 text-xs font-semibold transition-colors"
            >
              Trough Moderate Rain
            </button>
            <button
              id="preset-dry-btn"
              onClick={() => applyPreset('dry')}
              className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 text-xs font-semibold transition-colors"
            >
              Dry Break Spell
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic 24h Synoptic Weather Timeline Simulator */}
      <SynopticSimulator
        onApplyStep={handleRunPrediction}
        currentInput={input}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Parameter Sliders */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Meteorological Input Parameters</h3>
            </div>
            <button
              id="reset-inputs-btn"
              onClick={() => handleRunPrediction({ rawForecastMm: 35.0, relativeHumidity: 85 })}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Reset
            </button>
          </div>

          {/* India Regional Map Simulator Component */}
          <IndiaRegionMapSimulator
            currentInput={input}
            currentResult={result}
            onSelectStationAndPreset={(updates) => handleRunPrediction(updates)}
          />

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
                {input.rawForecastMm} mm/day
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
              <span>64.5 mm (Heavy Threshold)</span>
              <span>150 mm (Extreme)</span>
            </div>
          </div>

          {/* Atmospheric Predictors Grid */}
          <div className="space-y-3 pt-1">
            {/* Relative Humidity Slider */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-600 font-medium">850hPa Relative Humidity (RH):</span>
                <span className="font-mono font-bold text-slate-800">{input.relativeHumidity}%</span>
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
                <span className="font-mono font-bold text-slate-800">{input.temp2m} °C</span>
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
                <span className="text-slate-600 font-medium">Surface Pressure (Depression Trough):</span>
                <span className="font-mono font-bold text-slate-800">{input.surfacePressure} hPa</span>
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
                <span className="font-mono font-bold text-slate-800">{input.windSpeed} km/h</span>
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

            {/* Previous Day Observed Rainfall */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-600 font-medium">Antecedent Rainfall (Prev Day Obs):</span>
                <span className="font-mono font-bold text-slate-800">{input.prevDayRain} mm</span>
              </div>
              <input
                id="slider-prev-rain"
                type="range"
                min={0}
                max={100}
                step={1}
                value={input.prevDayRain}
                onChange={(e) => handleRunPrediction({ prevDayRain: Number(e.target.value) })}
                className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic AI Diagnosis & Calibration Output */}
        <div className="lg:col-span-6 space-y-4">
          
          {/* D3 Atmospheric Visualizer Sandbox */}
          <CloudVisualizerD3 
            rainMm={result.correctedForecastMm} 
            humidity={input.relativeHumidity}
            pressure={input.surfacePressure}
            temp={input.temp2m}
            windSpeed={input.windSpeed}
          />

          {/* Main Transformation Result Card */}
          <div
            id="result-transformation-card"
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs relative overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Pipeline Output
              </span>
              <span
                id="detected-regime-badge"
                className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getRegimeBadge(
                  result.detectedRegime
                )}`}
              >
                Regime: {result.detectedRegime}
              </span>
            </div>

            {/* Before vs After Big Callout */}
            <div className="mt-4 grid grid-cols-2 gap-3 items-center">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[11px] font-medium text-slate-500 block uppercase">
                  Raw NWP Forecast
                </span>
                <span className="text-3xl font-extrabold text-slate-800 font-mono tracking-tight mt-0.5 block">
                  {result.rawForecastMm}
                </span>
                <span className="text-[11px] text-slate-500">mm / 24h</span>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-center relative">
                <span className="text-[11px] font-bold text-blue-700 block uppercase">
                  AI Calibrated Forecast
                </span>
                <span className="text-3xl font-extrabold text-blue-700 font-mono tracking-tight mt-0.5 block">
                  {result.correctedForecastMm}
                </span>
                <span className="text-[11px] text-blue-600 font-medium">mm / 24h</span>
              </div>
            </div>

            {/* Adjustment Metric Bar */}
            <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Calibration Delta:</span>
              <span className="font-mono font-bold">
                {result.adjustmentDeltaMm >= 0 ? (
                  <span className="text-purple-700">+{result.adjustmentDeltaMm} mm ({result.adjustmentPct > 0 ? `+${result.adjustmentPct}%` : '0%'})</span>
                ) : (
                  <span className="text-emerald-700">{result.adjustmentDeltaMm} mm ({result.adjustmentPct}%)</span>
                )}
              </span>
              <span className="text-slate-500">
                Baseline 2 (Global): <strong className="font-mono text-slate-700">{result.baselineLinearMm} mm</strong>
              </span>
            </div>

            {/* Model & Rationale */}
            <div className="mt-4 space-y-2">
              <div className="text-xs">
                <span className="font-semibold text-slate-700">Active Regressor Model: </span>
                <span className="text-blue-700 font-medium">{result.appliedModel}</span>
              </div>
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200/80 leading-relaxed">
                <strong>Meteorological Diagnosis:</strong> {result.regimeRationale}
              </p>
            </div>
          </div>

          {/* Physical Feature Attributions */}
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

            <div className="space-y-2 pt-2 border-t border-slate-100">
              {result.physicalFactors.map((pf, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800 block">{pf.factor}</span>
                    <span className="text-slate-500 text-[11px] leading-relaxed">{pf.description}</span>
                  </div>
                  <span
                    className={`shrink-0 font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                      pf.impact === 'Enhancing'
                        ? 'bg-purple-100 text-purple-800'
                        : pf.impact === 'Suppressive'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {pf.impact}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
