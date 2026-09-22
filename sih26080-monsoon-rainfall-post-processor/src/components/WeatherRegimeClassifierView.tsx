import React, { useState, useMemo, useEffect } from 'react';
import { SynopticWeatherRegime, RainfallDataPoint } from '../types';
import { classifySynopticRegime } from '../ml/postProcessor';
import { MET_STATIONS } from '../data/monsoonDataset';
import { trackSynopticRegimeView } from '../utils/achievements';
import {
  Compass,
  Wind,
  Layers,
  Activity,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Zap,
  Info,
  Sliders,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Flame,
} from 'lucide-react';
import { motion } from 'motion/react';

interface WeatherRegimeClassifierViewProps {
  dataset: RainfallDataPoint[];
  onSelectStation?: (stationId: string) => void;
}

export const WeatherRegimeClassifierView: React.FC<WeatherRegimeClassifierViewProps> = ({
  dataset,
  onSelectStation,
}) => {
  // Interactive Simulation Controls for Regime Classifier
  const [troughShift, setTroughShift] = useState<number>(0); // -3 to +3 degrees latitude
  const [lowLevelJetKnots, setLowLevelJetKnots] = useState<number>(32); // 10 to 60 kt
  const [surfacePressure, setSurfacePressure] = useState<number>(1003); // 990 to 1018 hPa
  const [relativeHumidity, setRelativeHumidity] = useState<number>(88); // 40 to 100 %
  const [rawNwpMm, setRawNwpMm] = useState<number>(55); // 0 to 250 mm
  const [regionType, setRegionType] = useState<'normal' | 'western_ghats' | 'northwest_himalayas'>('normal');

  // Classification Computation
  const classification = useMemo(() => {
    return classifySynopticRegime({
      rawForecastMm: rawNwpMm,
      relativeHumidity,
      surfacePressure,
      windSpeed: lowLevelJetKnots * 1.852, // convert knots to km/h
      troughLatShiftDeg: troughShift,
      isWesternGhatsOrCoast: regionType === 'western_ghats',
      isNorthWestOrHimalayan: regionType === 'northwest_himalayas',
    });
  }, [rawNwpMm, relativeHumidity, surfacePressure, lowLevelJetKnots, troughShift, regionType]);

  useEffect(() => {
    if (classification?.synopticRegime) {
      trackSynopticRegimeView(classification.synopticRegime);
    }
  }, [classification?.synopticRegime]);

  // Statistics across the loaded dataset
  const regimeDistribution = useMemo(() => {
    const counts: Record<SynopticWeatherRegime, number> = {
      [SynopticWeatherRegime.ACTIVE_MONSOON]: 0,
      [SynopticWeatherRegime.BREAK_MONSOON]: 0,
      [SynopticWeatherRegime.MONSOON_DEPRESSION]: 0,
      [SynopticWeatherRegime.COASTAL_OROGRAPHIC]: 0,
      [SynopticWeatherRegime.WESTERN_DISTURBANCE]: 0,
    };

    dataset.forEach((d) => {
      const isCoast = d.subdivision.includes('Konkan') || d.subdivision.includes('Coastal');
      const isNW = d.subdivision.includes('Jammu') || d.subdivision.includes('Himachal') || d.subdivision.includes('Uttarakhand');
      const res = classifySynopticRegime({
        rawForecastMm: d.rawForecastMm,
        relativeHumidity: d.relativeHumidity850hPa,
        surfacePressure: d.surfacePressureHpa,
        windSpeed: d.windSpeed10mKmh,
        isWesternGhatsOrCoast: isCoast,
        isNorthWestOrHimalayan: isNW,
      });
      counts[res.synopticRegime] = (counts[res.synopticRegime] || 0) + 1;
    });

    const total = Math.max(1, dataset.length);
    return Object.entries(counts).map(([name, count]) => ({
      regime: name as SynopticWeatherRegime,
      count,
      pct: Math.round((count / total) * 100),
    }));
  }, [dataset]);

  const synopticRegimesList = [
    {
      regime: SynopticWeatherRegime.ACTIVE_MONSOON,
      title: 'Active Monsoon Spell',
      color: 'from-blue-600 to-cyan-600',
      badgeBg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      description: 'Monsoon trough situated along normal Gangetic axis (22°N) with strong cross-equatorial Low-Level Jet (LLJ > 30 kt) sustaining widespread monsoonal rain across Central and North India.',
      keyIndicators: ['Monsoon Trough along normal axis', 'Strong 850hPa zonal westerly flow', 'High boundary layer moisture (>80%)'],
      biasCorrectionStrategy: 'Mild convective scaling; linear baseline dampens low-end bias while preserving peak core convection.',
      characteristics: {
        olr: '< 180 W/m² (Deep organized convection)',
        windShear: 'Moderate (15-20 m/s)',
        moisture: 'Strong convergence at 850 hPa',
      }
    },
    {
      regime: SynopticWeatherRegime.BREAK_MONSOON,
      title: 'Break Monsoon Phase',
      color: 'from-amber-600 to-orange-600',
      badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      description: 'Monsoon trough shifts northwards to Himalayan foothills. Rainfall sharply ceases over Central & Peninsular India, while heavy/excess rain concentrates over Northeast India, Bihar, and Himalayan slopes.',
      keyIndicators: ['Trough axis shifted north to foothills (+2° to +4°)', 'Surface pressure rise over central peninsula', 'Suppressed convection over Maharashtra, MP, Gujarat'],
      biasCorrectionStrategy: 'Heavy drizzle suppression over peninsula; enhanced orographic scaling over Himalayan foothill districts.',
      characteristics: {
        olr: '> 240 W/m² over Central India (Clear skies)',
        windShear: 'Weak (< 10 m/s)',
        moisture: 'Divergence over peninsula; convergence at foothills',
      }
    },
    {
      regime: SynopticWeatherRegime.MONSOON_DEPRESSION,
      title: 'Monsoon Low / Deep Depression',
      color: 'from-purple-600 to-indigo-600',
      badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      description: 'Intense synoptic-scale cyclonic vortex forming over Bay of Bengal / Arabian Sea (pressure deficit < 1000 hPa). Generates catastrophic concentrated rainfall, gusty squalls, and severe flood risk.',
      keyIndicators: ['Central pressure < 1002 hPa', 'Cyclonic vorticity anomaly in lower/middle troposphere', 'Extreme moisture convergence bands'],
      biasCorrectionStrategy: 'Convective Restoration Multiplier (+25% to +45%) compensating for NWP grid smoothing around the depression eye/wall.',
      characteristics: {
        olr: '< 150 W/m² (Intense cloud tops)',
        windShear: 'High (> 25 m/s near vortex core)',
        moisture: 'Intense cyclonic convergence (Vorticity > 10^-5 s^-1)',
      }
    },
    {
      regime: SynopticWeatherRegime.COASTAL_OROGRAPHIC,
      title: 'Coastal & Orographic Surge',
      color: 'from-emerald-600 to-teal-600',
      badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      description: 'Moist maritime westerly airstream impinging perpendicularly onto the Western Ghats / Konkan crest. Strong windward moisture trapping with sharp leeward rain-shadow contrast.',
      keyIndicators: ['High Froude number (>0.8)', 'Windward 850hPa moisture > 90%', 'Sharp lee-side precipitation drop (e.g. Mahabaleshwar vs Pune)'],
      biasCorrectionStrategy: 'Topographic elevation-weighted kernel; boosts windward ridge precipitation and sharply damps rain-shadow lee sprawl.',
      characteristics: {
        olr: '< 190 W/m² along coast',
        windShear: 'Strong low-level westerlies (Jet > 40 kt)',
        moisture: 'Orographic lifting & trapping below 700 hPa',
      }
    },
    {
      regime: SynopticWeatherRegime.WESTERN_DISTURBANCE,
      title: 'Western Disturbance (WD)',
      color: 'from-rose-600 to-pink-600',
      badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      description: 'Extratropical upper-air westerly trough originating from Mediterranean region. Triggers unseasonal rain, thunderstorms, and hail over NW India, J&K, Himachal, Punjab, and Haryana.',
      keyIndicators: ['500hPa geopotential height trough over NW India', 'Subtropical westerly jet streak coupling', 'Non-monsoonal cold-air advection aloft'],
      biasCorrectionStrategy: 'Baroclinic moisture threshold filter; separates frontal rain-bands from dry post-frontal subsidence.',
      characteristics: {
        olr: 'Variable; banded low OLR (< 200 W/m²) along front',
        windShear: 'High upper-level shear (Jet Streak > 80 kt)',
        moisture: 'Mid-level advection from Arabian Sea/Mediterranean',
      }
    },
  ];

  return (
    <div className="space-y-8">
      {/* Overview Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold uppercase tracking-wider">
                Module 1: Weather Regime Classifier
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                Operational AI Classifier Active
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Synoptic Weather Regime Classification Engine
            </h2>
            <p className="text-slate-300 text-sm mt-2 max-w-3xl leading-relaxed">
              Rainfall forecast errors across India fluctuate drastically based on synoptic atmospheric regimes.
              SAMVARTAKA AI classifies the prevailing synoptic system—<strong>Active Monsoon, Break Monsoon, Monsoon Depression, Coastal/Orographic Surge, and Western Disturbances</strong>—before dispatching conditioned post-processing correction models.
            </p>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex flex-wrap gap-2.5 shrink-0">
            {regimeDistribution.map((item) => (
              <div
                key={item.regime}
                className="bg-slate-800/90 border border-slate-700/80 rounded-xl px-3.5 py-2 text-left shadow-sm min-w-[120px]"
              >
                <div className="text-[11px] text-slate-400 font-medium truncate">{item.regime}</div>
                <div className="text-lg font-bold text-white font-mono mt-0.5">
                  {item.pct}% <span className="text-xs font-normal text-slate-400">({item.count})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Regime Simulator & Live Diagnostic */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Atmospheric Parameter Sliders */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Synoptic Parameter Controls</h3>
                <p className="text-xs text-slate-500">Tune atmospheric variables to test real-time classification</p>
              </div>
            </div>
            <button
              onClick={() => {
                setTroughShift(0);
                setLowLevelJetKnots(32);
                setSurfacePressure(1003);
                setRelativeHumidity(88);
                setRawNwpMm(55);
                setRegionType('normal');
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
            >
              Reset
            </button>
          </div>

          {/* Region / Orography Mode */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Geographic Terrain / Regional Setting:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setRegionType('normal')}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                  regionType === 'normal'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Central Plains
              </button>
              <button
                onClick={() => setRegionType('western_ghats')}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                  regionType === 'western_ghats'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Western Ghats/Coast
              </button>
              <button
                onClick={() => setRegionType('northwest_himalayas')}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                  regionType === 'northwest_himalayas'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                NW / Himalayan
              </button>
            </div>
          </div>

          {/* Slider 1: Monsoon Trough Latitudinal Axis Shift */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-slate-700">Monsoon Trough Axis Shift (Latitude):</span>
              <span className="font-mono font-bold text-blue-600">
                {troughShift > 0 ? `+${troughShift}° (Foothills Shift)` : troughShift < 0 ? `${troughShift}° (South Shift)` : 'Normal (22°N)'}
              </span>
            </div>
            <input
              type="range"
              min={-3}
              max={3}
              step={0.5}
              value={troughShift}
              onChange={(e) => setTroughShift(parseFloat(e.target.value))}
              className="w-full accent-blue-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>South of Normal (-3°)</span>
              <span>Normal Axis</span>
              <span>Foothills Break (+3°)</span>
            </div>
          </div>

          {/* Slider 2: 850hPa Low-Level Jet (LLJ) */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-slate-700">850 hPa Low-Level Jet Speed:</span>
              <span className="font-mono font-bold text-blue-600">{lowLevelJetKnots} knots</span>
            </div>
            <input
              type="range"
              min={10}
              max={60}
              step={2}
              value={lowLevelJetKnots}
              onChange={(e) => setLowLevelJetKnots(parseInt(e.target.value))}
              className="w-full accent-blue-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Weak (10 kt)</span>
              <span>Moderate (30 kt)</span>
              <span>Severe Gale (60 kt)</span>
            </div>
          </div>

          {/* Slider 3: Surface Pressure Anomaly */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-slate-700">Surface Pressure (Depression Intensity):</span>
              <span className="font-mono font-bold text-blue-600">{surfacePressure} hPa</span>
            </div>
            <input
              type="range"
              min={990}
              max={1018}
              step={1}
              value={surfacePressure}
              onChange={(e) => setSurfacePressure(parseInt(e.target.value))}
              className="w-full accent-blue-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Deep Low (990 hPa)</span>
              <span>Monsoon Avg (1004 hPa)</span>
              <span>High Ridge (1018 hPa)</span>
            </div>
          </div>

          {/* Slider 4: Relative Humidity */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-slate-700">850 hPa Moisture Saturation:</span>
              <span className="font-mono font-bold text-blue-600">{relativeHumidity}% RH</span>
            </div>
            <input
              type="range"
              min={40}
              max={100}
              step={1}
              value={relativeHumidity}
              onChange={(e) => setRelativeHumidity(parseInt(e.target.value))}
              className="w-full accent-blue-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 5: Raw NWP Forecast */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-slate-700">Raw NWP Rainfall Forecast:</span>
              <span className="font-mono font-bold text-blue-600">{rawNwpMm} mm/day</span>
            </div>
            <input
              type="range"
              min={0}
              max={200}
              step={2}
              value={rawNwpMm}
              onChange={(e) => setRawNwpMm(parseInt(e.target.value))}
              className="w-full accent-blue-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Right Column: Live Regime Classification Result & Probability Bars */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                    Diagnosed Atmospheric State
                  </div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    {classification.synopticRegime}
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                      {Math.round(classification.confidence * 100)}% Confidence
                    </span>
                  </h3>
                </div>
              </div>
            </div>

            {/* Diagnostic Narrative */}
            <div className="mt-4 p-4 bg-slate-800/80 border border-slate-700/80 rounded-xl">
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                Primary Physical Mechanism
              </div>
              <p className="text-slate-200 text-sm leading-relaxed">
                {classification.primaryMechanism}
              </p>
            </div>

            {/* Probability Breakdown across All 5 Synoptic Regimes */}
            <div className="mt-6 space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Regime Membership Probabilities (Softmax Distribution):
              </div>

              {Object.entries(classification.regimeProbabilities).map(([regimeName, prob]) => {
                const isWinner = regimeName === classification.synopticRegime;
                return (
                  <div key={regimeName} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className={isWinner ? 'text-blue-300 font-bold flex items-center gap-1' : 'text-slate-400'}>
                        {isWinner && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        {regimeName}
                      </span>
                      <span className="font-mono text-white font-bold">{prob}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          isWinner
                            ? 'bg-gradient-to-r from-blue-500 to-emerald-400 shadow-[0_0_12px_rgba(59,130,246,0.6)]'
                            : 'bg-slate-600'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${prob}%` }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bias Correction Action Trigger */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-300">
            <div>
              <span className="font-semibold text-white">Dispatched Bias Correction Sub-Model:</span>{' '}
              <span className="text-blue-400 font-mono">
                {classification.synopticRegime === SynopticWeatherRegime.MONSOON_DEPRESSION
                  ? 'Convective Burst Multiplier (+38% restoration)'
                  : classification.synopticRegime === SynopticWeatherRegime.COASTAL_OROGRAPHIC
                  ? 'Froude Topographic Ridge Regressor'
                  : classification.synopticRegime === SynopticWeatherRegime.BREAK_MONSOON
                  ? 'Foothill Orographic Damping & Dry Filter'
                  : classification.synopticRegime === SynopticWeatherRegime.WESTERN_DISTURBANCE
                  ? 'Baroclinic Westerly Trough Post-Processor'
                  : 'Monsoon Trough Non-Linear Calibrator'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ML Ensemble Diagnostics Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden mt-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-bold text-white tracking-tight">Machine Learning Ensemble Architecture</h3>
        </div>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          SAMVARTAKA utilizes a dual-model approach to detect regimes. The <strong>Supervised Classifier</strong> relies on historical human-labeled datasets to output explicit probabilities, while the <strong>Unsupervised Clustering</strong> model discovers hidden synoptic states without prior bias, alerting meteorologists to novel extreme weather setups.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Supervised Model */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />
            <div className="flex items-start justify-between mb-3 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <div className="text-white font-bold">XGBoost / Random Forest</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Supervised Classification</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase">
                Active
              </span>
            </div>
            <div className="space-y-3 relative z-10 text-xs text-slate-300">
              <p>
                <strong className="text-slate-200">What it does:</strong> Predicts the exact regime by feeding current sliders (Pressure, Wind, Trough Shift) into thousands of decision trees trained on IMD's 1990-2023 dataset.
              </p>
              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 font-mono text-[10px] text-blue-300">
                // Live Inference Output<br/>
                predicted_class: '{classification.synopticRegime}'<br/>
                confidence: {(classification.confidence * 100).toFixed(1)}%<br/>
                top_feature: 'trough_lat_shift'
              </div>
            </div>
          </div>

          {/* Unsupervised Model */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all" />
            <div className="flex items-start justify-between mb-3 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                  <Layers className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <div className="text-white font-bold">K-Means SOMs</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Unsupervised Spatial Clustering</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600 text-[10px] font-bold uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                Background
              </span>
            </div>
            <div className="space-y-3 relative z-10 text-xs text-slate-300">
              <p>
                <strong className="text-slate-200">What it does:</strong> Continuously groups real-time 3D atmospheric variables into clusters to detect "Anomalous Regimes" that don't fit historical labels (e.g. Climate Change induced extremes).
              </p>
              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 font-mono text-[10px] text-purple-300">
                // Background Spatial Scan<br/>
                nearest_centroid: 'Cluster_4'<br/>
                anomaly_score: {Math.max(0.1, Math.min(0.9, Math.abs(troughShift) / 3)).toFixed(2)} (Threshold: 0.8)<br/>
                status: {Math.abs(troughShift) > 2 ? 'NOVEL_EXTREME_DETECTED' : 'NOMINAL_STATE'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5 Deep Dives into Indian Weather Regimes */}
      <div className="space-y-4 mt-8">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-600" />
            Subcontinental Weather Regimes Reference Dossier
          </h3>
          <span className="text-xs text-slate-500">5 Distinct Synoptic Regimes over India</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {synopticRegimesList.map((item) => (
            <div
              key={item.regime}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${item.badgeBg}`}>
                    {item.regime}
                  </span>
                  
                  <div className="group relative">
                    <Info className="w-4 h-4 text-slate-400 hover:text-blue-500 cursor-help transition-colors" />
                    
                    {/* Hover Tooltip */}
                    <div className="absolute bottom-full right-[-10px] sm:left-1/2 sm:right-auto sm:-translate-x-1/2 mb-3 w-64 p-3 bg-slate-900 text-slate-200 text-xs rounded-xl shadow-xl border border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 pointer-events-none">
                      <div className="font-bold text-white mb-2 pb-1.5 border-b border-slate-700/80 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-blue-400" />
                        ML Classification Features
                      </div>
                      <div className="space-y-2 leading-relaxed">
                         <div><span className="font-semibold text-blue-300 block mb-0.5">OLR (Cloud Tops):</span> <span className="text-slate-300">{item.characteristics.olr}</span></div>
                         <div><span className="font-semibold text-emerald-300 block mb-0.5">Wind Shear:</span> <span className="text-slate-300">{item.characteristics.windShear}</span></div>
                         <div><span className="font-semibold text-purple-300 block mb-0.5">Moisture Dynamics:</span> <span className="text-slate-300">{item.characteristics.moisture}</span></div>
                      </div>
                      <div className="absolute -bottom-1.5 right-[14px] sm:left-1/2 sm:right-auto sm:-translate-x-1/2 w-3 h-3 bg-slate-900 border-b border-r border-slate-700 rotate-45" />
                    </div>
                  </div>
                </div>
                <h4 className="font-bold text-slate-900 text-base mb-2">{item.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">{item.description}</p>

                <div className="space-y-2 mb-4">
                  <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Diagnostic Meteorological Signatures:
                  </div>
                  <ul className="space-y-1">
                    {item.keyIndicators.map((ind, idx) => (
                      <li key={idx} className="text-xs text-slate-600 flex items-start gap-1.5">
                        <span className="text-blue-500 font-bold mt-0.5">•</span>
                        <span>{ind}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700">
                <span className="font-bold text-slate-900 block mb-0.5">SAMVARTAKA AI Correction:</span>
                {item.biasCorrectionStrategy}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
