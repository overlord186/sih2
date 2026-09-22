import React, { useState, useMemo } from 'react';
import { RainfallDataPoint, SynopticWeatherRegime } from '../types';
import { calculateHeavyRainProbabilities, classifySynopticRegime } from '../ml/postProcessor';
import { MET_STATIONS } from '../data/monsoonDataset';
import {
  CloudRain,
  AlertTriangle,
  ShieldAlert,
  Gauge,
  Sliders,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  MapPin,
  Flame,
  Info,
  Layers,
  Sparkles,
  BarChart3,
  Search,
  Building2,
  Wheat,
  Droplets,
  Users,
  CheckCircle2,
  ArrowUpRight,
  Waves,
  Radio,
  RotateCcw,
  Activity,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeavyRainfallProbabilityViewProps {
  dataset: RainfallDataPoint[];
  onSelectStation?: (stationId: string) => void;
}

// Estimated metropolitan and district population exposure in millions
const STATION_POPULATION_MAP: Record<string, number> = {
  BOM_SANTACRUZ: 21.3,
  GOA_PANAJI: 1.5,
  PNQ_SHIVAJINAGAR: 7.4,
  MAH_MAHABALESHWAR: 0.4,
  NAG_SONEGAON: 3.1,
  AUR_CHHATRAPATI: 1.8,
  DEL_SAFDARJUNG: 32.9,
  NOIDA_SECTOR62: 2.3,
  LKO_AMAUSI: 3.9,
  CCU_ALIPORE: 15.1,
  SLG_BAGDOGRA: 1.3,
  BLR_HAL: 13.8,
  IXE_BAJPE: 1.8,
  COK_NEDUMBASSERY: 3.1,
  BGM_BELAGAVI: 1.4,
  GAU_BORJHAR: 1.6,
};

// Calibrated logistic exceedance function for arbitrary threshold
const calcCustomExceedanceProb = (
  forecastMm: number,
  thresholdMm: number,
  humidity: number,
  pressure: number,
  regime: SynopticWeatherRegime
): number => {
  const pressureFactor = Math.max(0.5, (1012 - pressure) / 10);
  const moistureFactor = Math.pow(humidity / 100, 2.5);
  const regimeMultiplier =
    regime === SynopticWeatherRegime.MONSOON_DEPRESSION
      ? 1.45
      : regime === SynopticWeatherRegime.COASTAL_OROGRAPHIC
      ? 1.35
      : regime === SynopticWeatherRegime.ACTIVE_MONSOON
      ? 1.15
      : regime === SynopticWeatherRegime.BREAK_MONSOON
      ? 0.4
      : 1.0;

  const scale = Math.max(4, thresholdMm * 0.38);
  const effectiveValue = forecastMm * moistureFactor * pressureFactor * regimeMultiplier;
  const z = (effectiveValue - thresholdMm) / scale;
  const prob = 1 / (1 + Math.exp(-1.7 * z));
  return Math.min(99, Math.max(1, Math.round(prob * 100)));
};

export const HeavyRainfallProbabilityView: React.FC<HeavyRainfallProbabilityViewProps> = ({
  dataset,
  onSelectStation,
}) => {
  const [testRainMm, setTestRainMm] = useState<number>(78);
  const [testHumidity, setTestHumidity] = useState<number>(92);
  const [testPressure, setTestPressure] = useState<number>(999);
  const [testRegime, setTestRegime] = useState<SynopticWeatherRegime>(SynopticWeatherRegime.MONSOON_DEPRESSION);
  const [stationSearch, setStationSearch] = useState<string>('');

  // Dynamic Heavy Rainfall Threshold state (default to IMD Standard 64.5 mm)
  const [heavyThresholdMm, setHeavyThresholdMm] = useState<number>(64.5);
  const [showOnlyExceeding, setShowOnlyExceeding] = useState<boolean>(false);

  // Live Probability Calculation for Standard IMD Thresholds
  const liveProbabilities = useMemo(() => {
    return calculateHeavyRainProbabilities(testRainMm, testHumidity, testPressure, testRegime);
  }, [testRainMm, testHumidity, testPressure, testRegime]);

  // Operational IMD Threshold definitions
  const thresholds = useMemo(() => [
    {
      id: 'moderate',
      thresholdMm: 15.5,
      name: 'Moderate Rainfall',
      prob: liveProbabilities.probModerate15,
      color: 'from-yellow-500 to-amber-500',
      textColor: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      alertBadge: 'bg-yellow-400/20 text-yellow-800 border-yellow-400/40',
      desc: '15.6 to 64.4 mm in 24h. Steady stratiform rains with localized drainage slowdowns.',
      action: 'Advisory for farmers and transport. Maintain normal municipal stormwater flow.',
    },
    {
      id: 'heavy',
      thresholdMm: 64.5,
      name: 'Heavy Rainfall (IMD Baseline)',
      prob: liveProbabilities.probHeavy64,
      color: 'from-orange-500 to-amber-600',
      textColor: 'text-orange-700',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      alertBadge: 'bg-orange-500/20 text-orange-800 border-orange-500/40',
      desc: '64.5 to 115.5 mm in 24h. Convective bursts causing waterlogging and river swell.',
      action: 'Issue Yellow/Orange alert. Prepare SDRF teams and deploy mobile de-watering pumps.',
    },
    {
      id: 'very_heavy',
      thresholdMm: 115.5,
      name: 'Very Heavy Rainfall',
      prob: liveProbabilities.probVeryHeavy115,
      color: 'from-red-500 to-rose-600',
      textColor: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      alertBadge: 'bg-red-500/20 text-red-800 border-red-500/40',
      desc: '115.6 to 204.4 mm in 24h. Widespread severe flooding, mudslides in ghats, power disruptions.',
      action: 'Issue Orange/Red alert. Restrict traffic on ghat roads, evacuate low-lying riverbeds.',
    },
    {
      id: 'extremely_heavy',
      thresholdMm: 204.4,
      name: 'Extremely Heavy Deluge',
      prob: liveProbabilities.probExtremelyHeavy204,
      color: 'from-purple-600 to-fuchsia-700',
      textColor: 'text-purple-700',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      alertBadge: 'bg-purple-500/20 text-purple-800 border-purple-500/40',
      desc: '≥ 204.5 mm in 24h. Catastrophic extreme precipitation, flash floods, dam spillway release necessity.',
      action: 'IMD RED ALERT. Full disaster mobilization, school/college closures, NDRF deployment.',
    },
  ], [liveProbabilities]);

  // Station Exceedance Risk Rankings across the active dataset
  const stationRiskRankings = useMemo(() => {
    return MET_STATIONS.map((stn) => {
      // Find matching samples from dataset
      const stnSamples = dataset.filter((d) => d.stationId === stn.id);
      const avgCorrected = stnSamples.length > 0
        ? stnSamples.reduce((acc, curr) => acc + curr.correctedForecastMm, 0) / stnSamples.length
        : 35;
      const maxCorrected = stnSamples.length > 0
        ? Math.max(...stnSamples.map((d) => d.correctedForecastMm))
        : 65;

      const isCoast = stn.subdivision.includes('Konkan') || stn.subdivision.includes('Coastal');
      const isNW = stn.subdivision.includes('Jammu') || stn.subdivision.includes('Himachal') || stn.subdivision.includes('Uttarakhand');
      const synoptic = classifySynopticRegime({
        rawForecastMm: maxCorrected,
        relativeHumidity: 90,
        surfacePressure: 1002,
        windSpeed: 30,
        isWesternGhatsOrCoast: isCoast,
        isNorthWestOrHimalayan: isNW,
      });

      const probs = calculateHeavyRainProbabilities(maxCorrected, 90, 1002, synoptic.synopticRegime);

      // Custom threshold calculation for this station
      const customProb = calcCustomExceedanceProb(
        maxCorrected,
        heavyThresholdMm,
        90,
        1002,
        synoptic.synopticRegime
      );

      const exceedsCustom = maxCorrected >= heavyThresholdMm;
      const customDelta = Math.round((maxCorrected - heavyThresholdMm) * 10) / 10;

      return {
        ...stn,
        avgRain: Math.round(avgCorrected * 10) / 10,
        maxRain: Math.round(maxCorrected * 10) / 10,
        synopticRegime: synoptic.synopticRegime,
        probs,
        customProb,
        exceedsCustom,
        customDelta,
      };
    })
    .sort((a, b) => b.customProb - a.customProb)
    .filter((stn) => {
      if (!stationSearch) return true;
      const q = stationSearch.toLowerCase();
      return stn.name.toLowerCase().includes(q) || stn.subdivision.toLowerCase().includes(q) || stn.state.toLowerCase().includes(q);
    });
  }, [dataset, stationSearch, heavyThresholdMm]);

  // Real-time Impact Analysis Derived Metrics based on heavyThresholdMm
  const impactAnalysis = useMemo(() => {
    // 1. Live custom exceedance probability for the simulation sandbox
    const simExceedanceProb = calcCustomExceedanceProb(
      testRainMm,
      heavyThresholdMm,
      testHumidity,
      testPressure,
      testRegime
    );

    // 2. Network-wide stations breaching the custom threshold
    const exceedingStations = stationRiskRankings.filter((stn) => stn.exceedsCustom);
    const totalStations = stationRiskRankings.length;
    const exceedanceRatio = totalStations > 0 ? (exceedingStations.length / totalStations) : 0;
    const exceedancePercentage = Math.round(exceedanceRatio * 100);

    // 3. Estimated population exposed across exceeding districts
    const exposedPopulationM = Math.round(
      exceedingStations.reduce((sum, stn) => sum + (STATION_POPULATION_MAP[stn.id] || 1.5), 0) * 10
    ) / 10;

    // 4. Catchment drainage area under alert
    const exposedCatchmentKm2 = exceedingStations.length * 8500;

    // 5. Delta between simulated rain and threshold
    const deltaSimMm = Math.round((testRainMm - heavyThresholdMm) * 10) / 10;
    const percentDiff = Math.round(((testRainMm - heavyThresholdMm) / heavyThresholdMm) * 100);

    // 6. Dynamic Alert Level and Severity Classification
    let alertTier: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' = 'GREEN';
    let severityLabel = 'Low Flood Threat';
    let themeColor = 'emerald';

    if (heavyThresholdMm >= 115 || simExceedanceProb >= 75 || exceedingStations.length >= 8) {
      alertTier = 'RED';
      severityLabel = 'Extreme Deluge & Disaster Action Alert';
      themeColor = 'rose';
    } else if (heavyThresholdMm >= 64.5 || simExceedanceProb >= 45 || exceedingStations.length >= 4) {
      alertTier = 'ORANGE';
      severityLabel = 'Significant Heavy Rainfall & Inundation Warning';
      themeColor = 'orange';
    } else if (simExceedanceProb >= 25 || exceedingStations.length >= 2) {
      alertTier = 'YELLOW';
      severityLabel = 'Moderate Rainfall Advisory & Drainage Watch';
      themeColor = 'amber';
    }

    // 7. Sectoral Operational Impacts
    let urbanDrainage: { status: string; capacityPercent: number; detail: string };
    let agriculture: { status: string; riskLevel: string; detail: string };
    let hydrology: { status: string; inflowMultiplier: string; detail: string };
    let civilDefense: { status: string; action: string; deployment: string };

    if (heavyThresholdMm < 40) {
      urbanDrainage = {
        status: 'Nominal Operations',
        capacityPercent: 65,
        detail: 'Municipal stormwater canals operate with 35% freeboard buffer. Minor localized puddling on uneven secondary asphalt.',
      };
      agriculture = {
        status: 'Favorable Agrarian Moisture',
        riskLevel: 'Low',
        detail: 'Beneficial percolation for standing Kharif crops (paddy, sugarcane, cotton) without root waterlogging or nutrient loss.',
      };
      hydrology = {
        status: 'Controlled Baseflow Replenishment',
        inflowMultiplier: '+20% over dry weather',
        detail: 'Steady basin runoff filling medium reservoirs without needing preemptive spillway discharge or gate operations.',
      };
      civilDefense = {
        status: 'Standard Routine Monitoring',
        action: 'Regular meteorological bulletin broadcast to farmers and local transport authorities.',
        deployment: 'Normal district administration duty roster. No emergency pumping required.',
      };
    } else if (heavyThresholdMm < 64.5) {
      urbanDrainage = {
        status: 'Drainage Approaching Design Limit',
        capacityPercent: 95,
        detail: 'Urban underpasses and low-lying railway culverts experience 15–30 cm waterlogging during peak bursts. Slow traffic corridors.',
      };
      agriculture = {
        status: 'Moderate Field Surcharge',
        riskLevel: 'Moderate',
        detail: 'Optimal ponding for transplanted paddy. Pulse and cotton farmers advised to clear field boundary drainage furrows.',
      };
      hydrology = {
        status: 'Moderate Inflow Acceleration',
        inflowMultiplier: '+55% surge',
        detail: 'Catchment runoff accelerates into Western Ghats dams (Koyna, Bhatsa, Vaitarna). Sluice gates kept on standby.',
      };
      civilDefense = {
        status: 'YELLOW ADVISORY Issued',
        action: 'Activate municipal monsoon control rooms. Pre-position dewatering pumps at known chronic waterlogging junctions.',
        deployment: 'Municipal flood squads and traffic police alerted for immediate water-clearing operations.',
      };
    } else if (heavyThresholdMm < 100) {
      urbanDrainage = {
        status: 'Drainage Severely Surcharged',
        capacityPercent: 145,
        detail: 'Stormwater drains overwhelmed (145% of peak design flow). Extensive waterlogging across arterial avenues, bus diversions required.',
      };
      agriculture = {
        status: 'Crop Inundation Threat',
        riskLevel: 'High',
        detail: 'Standing water hazard for cotton, groundnut, and soybean. Soil saturation reaches 100% with sheet erosion on sloped ghat farms.',
      };
      hydrology = {
        status: 'Heavy Reservoir Inflow Surge',
        inflowMultiplier: '+140% peak inflow',
        detail: 'Rapid reservoir fill rates. Dam safety engineers mandate controlled spillway discharge to preserve flood cushion.',
      };
      civilDefense = {
        status: 'ORANGE ALERT (Be Prepared)',
        action: 'Issue high-priority advisories against unnecessary travel. Sound warnings to settlements along riverbanks and nullahs.',
        deployment: 'SDRF platoons deployed on 1-hour standby. High-capacity diesel pumps operational across urban bottlenecks.',
      };
    } else if (heavyThresholdMm < 140) {
      urbanDrainage = {
        status: 'Widespread Inundation & Street Flooding',
        capacityPercent: 210,
        detail: 'Catastrophic stormwater backup. Basements and electrical sub-stations submerged. Metro/rail speed restrictions and airport apron delays.',
      };
      agriculture = {
        status: 'Severe Crop Submergence',
        riskLevel: 'Severe',
        detail: 'Extensive crop submergence exceeding 48h tolerance threshold. Complete loss of unharvested pulses and severe damage to standing paddy.',
      };
      hydrology = {
        status: 'Critical Catchment Runoff Wave',
        inflowMultiplier: '+220% flood wave',
        detail: 'Dam crest radial gates opened for emergency high-volume discharge. Downstream flood warning sirens triggered in river basins.',
      };
      civilDefense = {
        status: 'IMD RED ALERT (Take Action)',
        action: 'Order closures of schools and non-essential institutions. Precautionary evacuation of river floodplain dwellings.',
        deployment: 'NDRF teams mobilized with inflatable motorboats. Round-the-clock district emergency operations center activated.',
      };
    } else {
      urbanDrainage = {
        status: 'Catastrophic Extreme Flash Flooding',
        capacityPercent: 320,
        detail: 'Total collapse of municipal drainage conduits. Extensive structural inundation, washed-out bridge approaches, and power grid blackouts.',
      };
      agriculture = {
        status: 'Catastrophic Farmland Devastation',
        riskLevel: 'Critical',
        detail: 'Massive topsoil scour, mudslides across Western Ghats and Himalayan tracts, and irreversible destruction of agricultural acreage.',
      };
      hydrology = {
        status: 'Peak Flood Spillway Discharge',
        inflowMultiplier: '+350% catastrophic surge',
        detail: 'All dam floodgates fully raised. Unprecedented river swell exceeding Danger Mark (HFL) across major river courses.',
      };
      civilDefense = {
        status: 'MAXIMUM RED DISASTER EMERGENCY',
        action: 'Full evacuation protocols enforced. Military and coast guard disaster relief columns mobilized for air/boat rescue.',
        deployment: 'State and national disaster relief task forces fully deployed with airborne rescue helicopters on active standby.',
      };
    }

    return {
      simExceedanceProb,
      deltaSimMm,
      percentDiff,
      exceedingStations,
      totalStations,
      exceedancePercentage,
      exposedPopulationM,
      exposedCatchmentKm2,
      alertTier,
      severityLabel,
      themeColor,
      urbanDrainage,
      agriculture,
      hydrology,
      civilDefense,
    };
  }, [testRainMm, heavyThresholdMm, testHumidity, testPressure, testRegime, stationRiskRankings]);

  // Threshold quick presets
  const thresholdPresets = [
    { label: 'Advisory Level', value: 35.0, tag: 'IMD Advisory', color: 'border-yellow-300 text-amber-800 bg-amber-50 hover:bg-amber-100' },
    { label: 'Urban Drainage Limit', value: 50.0, tag: 'Drainage Surcharge', color: 'border-orange-300 text-orange-800 bg-orange-50 hover:bg-orange-100' },
    { label: 'IMD Heavy Baseline', value: 64.5, tag: 'Official Standard', color: 'border-blue-400 text-blue-900 bg-blue-50 font-bold hover:bg-blue-100 ring-1 ring-blue-300' },
    { label: 'Orographic Surge', value: 85.0, tag: 'Ghats Flash Flood', color: 'border-rose-300 text-rose-800 bg-rose-50 hover:bg-rose-100' },
    { label: 'Very Heavy Warning', value: 115.5, tag: 'IMD Very Heavy', color: 'border-red-300 text-red-800 bg-red-50 hover:bg-red-100' },
    { label: 'Extreme Deluge', value: 150.0, tag: 'Severe Dam Inflow', color: 'border-purple-300 text-purple-800 bg-purple-50 hover:bg-purple-100' },
  ];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
                Module 2: Heavy Rainfall Probability Engine
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                Operational IMD Threshold Calibration
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Threshold Exceedance Probability & Hazard Alerting
            </h2>
            <p className="text-slate-300 text-sm mt-2 max-w-3xl leading-relaxed">
              Deterministic single-value forecasts cannot convey convective uncertainty. SAMVARTAKA AI calculates
              calibrated <strong>exceedance probabilities across all operational IMD categories</strong> and custom thresholds,
              empowering disaster management authorities with risk-quantified decision support and dynamic impact analysis.
            </p>
          </div>
        </div>
      </div>

      {/* DYNAMIC HEAVY RAINFALL THRESHOLD SLIDER & REAL-TIME IMPACT ANALYSIS CONTROLLER */}
      <div 
        id="dynamic-heavy-rain-threshold-controller"
        className="bg-white rounded-2xl border-2 border-indigo-100 shadow-md p-6 relative overflow-hidden space-y-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  Dynamic 'Heavy Rainfall' Threshold Slider & Impact Analysis
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Interactive Calibrator
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Dynamically adjust the precipitation threshold below to simulate bespoke disaster hazard criteria,
                municipal stormwater limits, and catchment flood trigger points. The real-time impact analysis will update instantaneously.
              </p>
            </div>
          </div>

          {/* Current Threshold Badge & Direct Reset */}
          <div className="flex items-center gap-2 self-start lg:self-center">
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block font-medium">Selected Threshold</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black font-mono text-indigo-700">
                  {heavyThresholdMm.toFixed(1)}
                </span>
                <span className="text-xs font-semibold text-slate-600">mm / 24h</span>
              </div>
            </div>

            {heavyThresholdMm !== 64.5 && (
              <button
                onClick={() => setHeavyThresholdMm(64.5)}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg border border-indigo-200 transition-colors font-semibold"
                title="Reset to official IMD 64.5 mm baseline"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset (64.5mm)
              </button>
            )}
          </div>
        </div>

        {/* Range Slider & Quick Adjustment Controls */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-indigo-600" />
                Adjust 'Heavy Rainfall' Threshold Parameter:
              </span>
              <div className="flex items-center gap-1 font-mono text-xs">
                <button
                  onClick={() => setHeavyThresholdMm((v) => Math.max(20, Math.round((v - 5) * 2) / 2))}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                  title="Decrease by 5 mm"
                >
                  -5
                </button>
                <button
                  onClick={() => setHeavyThresholdMm((v) => Math.max(20, Math.round((v - 1) * 2) / 2))}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                  title="Decrease by 1 mm"
                >
                  -1
                </button>
                <span className="px-2.5 py-0.5 rounded bg-indigo-50 font-black text-indigo-700 border border-indigo-200">
                  {heavyThresholdMm.toFixed(1)} mm
                </span>
                <button
                  onClick={() => setHeavyThresholdMm((v) => Math.min(180, Math.round((v + 1) * 2) / 2))}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                  title="Increase by 1 mm"
                >
                  +1
                </button>
                <button
                  onClick={() => setHeavyThresholdMm((v) => Math.min(180, Math.round((v + 5) * 2) / 2))}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                  title="Increase by 5 mm"
                >
                  +5
                </button>
              </div>
            </div>

            {/* Tactile Range Slider */}
            <div className="relative pt-1 pb-2">
              <input
                id="heavy-rainfall-threshold-slider"
                type="range"
                min={20}
                max={180}
                step={0.5}
                value={heavyThresholdMm}
                onChange={(e) => setHeavyThresholdMm(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 h-3.5 bg-slate-200 rounded-lg cursor-pointer transition-all"
              />

              {/* Slider Scale Ticks and Official Baseline Marker */}
              <div className="flex justify-between text-[10.5px] text-slate-500 font-medium px-0.5 mt-1.5">
                <span>20 mm (Light/Mod)</span>
                <span>35.5 mm (Advisory)</span>
                <span className="font-bold text-indigo-700 flex items-center gap-0.5">
                  ★ 64.5 mm (IMD Heavy)
                </span>
                <span>115.5 mm (Very Heavy)</span>
                <span>180 mm (Extreme Deluge)</span>
              </div>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Operational Hazard Threshold Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              {thresholdPresets.map((preset) => {
                const isSelected = Math.abs(heavyThresholdMm - preset.value) < 0.1;
                return (
                  <button
                    key={preset.value}
                    onClick={() => setHeavyThresholdMm(preset.value)}
                    className={`text-xs px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm font-bold ring-2 ring-indigo-300'
                        : `${preset.color}`
                    }`}
                  >
                    <span>{preset.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/60 text-slate-700'
                    }`}>
                      {preset.value} mm
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* REAL-TIME IMPACT ANALYSIS DASHBOARD */}
        <div className="pt-5 border-t border-slate-200/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              <h4 className="font-bold text-slate-900 text-base">
                Real-Time Impact Analysis at {heavyThresholdMm.toFixed(1)} mm/day
              </h4>
            </div>

            {/* Severity Status Badge */}
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${
                impactAnalysis.alertTier === 'RED'
                  ? 'bg-red-50 text-red-700 border-red-300'
                  : impactAnalysis.alertTier === 'ORANGE'
                  ? 'bg-orange-50 text-orange-700 border-orange-300'
                  : impactAnalysis.alertTier === 'YELLOW'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-300'
              }`}>
                {impactAnalysis.alertTier} ALERT: {impactAnalysis.severityLabel}
              </span>
            </div>
          </div>

          {/* 4 Primary Quantitative Impact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Custom Exceedance Probability in Active Sandbox */}
            <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Exceedance Probability
                  </span>
                  <Radio className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono text-indigo-900">
                    {impactAnalysis.simExceedanceProb}%
                  </span>
                  <span className="text-xs text-indigo-700 font-medium">calibrated</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Odds of exceeding {heavyThresholdMm.toFixed(1)} mm under {testRainMm} mm simulation.
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-indigo-200/70 rounded-full h-2 mt-3 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-indigo-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${impactAnalysis.simExceedanceProb}%` }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* 2. Network Stations Exceeding Custom Threshold */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Network Stations Breached
                  </span>
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono text-slate-900">
                    {impactAnalysis.exceedingStations.length}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    / {impactAnalysis.totalStations} ({impactAnalysis.exceedancePercentage}%)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Active IMD subdivisions with forecast ≥ {heavyThresholdMm.toFixed(1)} mm.
                </p>
              </div>

              <div className="w-full bg-slate-200 rounded-full h-2 mt-3 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-orange-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${impactAnalysis.exceedancePercentage}%` }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* 3. Exposed Population at Risk */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Exposed Population
                  </span>
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono text-blue-900">
                    {impactAnalysis.exposedPopulationM}
                  </span>
                  <span className="text-xs text-slate-600 font-medium">Million</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Estimated residents in metropolitan & district hazard footprints.
                </p>
              </div>

              <div className="text-[11px] font-semibold text-blue-700 mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <span>Catchment Area:</span>
                <span className="font-mono">{impactAnalysis.exposedCatchmentKm2.toLocaleString()} km²</span>
              </div>
            </div>

            {/* 4. Forecast vs Threshold Delta Margin */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Threshold Safety Margin
                  </span>
                  {impactAnalysis.deltaSimMm >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-3xl font-black font-mono ${
                    impactAnalysis.deltaSimMm >= 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    {impactAnalysis.deltaSimMm >= 0 ? `+${impactAnalysis.deltaSimMm}` : impactAnalysis.deltaSimMm}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">mm breach</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {impactAnalysis.deltaSimMm >= 0
                    ? `Simulation is ${impactAnalysis.percentDiff}% above the threshold.`
                    : `Simulation has ${Math.abs(impactAnalysis.deltaSimMm)} mm buffer below threshold.`}
                </p>
              </div>

              <div className="text-[11px] font-semibold text-slate-700 mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <span>Runoff Multiplier:</span>
                <span className="font-mono font-bold text-indigo-700">{impactAnalysis.hydrology.inflowMultiplier}</span>
              </div>
            </div>
          </div>

          {/* Detailed Sectoral Real-Time Impact Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {/* Sector 1: Urban Drainage */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Building2 className="w-4 h-4 text-cyan-600" />
                Urban Drainage & Infrastructure
              </div>
              <div className="text-xs font-bold text-cyan-800 bg-cyan-50 px-2 py-1 rounded border border-cyan-200 inline-block">
                {impactAnalysis.urbanDrainage.status} ({impactAnalysis.urbanDrainage.capacityPercent}%)
              </div>
              <p className="text-[11.5px] text-slate-600 leading-relaxed">
                {impactAnalysis.urbanDrainage.detail}
              </p>
            </div>

            {/* Sector 2: Agriculture */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Wheat className="w-4 h-4 text-amber-600" />
                Agriculture & Kharif Crops
              </div>
              <div className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200 inline-block">
                {impactAnalysis.agriculture.status}
              </div>
              <p className="text-[11.5px] text-slate-600 leading-relaxed">
                {impactAnalysis.agriculture.detail}
              </p>
            </div>

            {/* Sector 3: Dam Hydrology */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <Waves className="w-4 h-4 text-blue-600" />
                Reservoir & Dam Hydrology
              </div>
              <div className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-1 rounded border border-blue-200 inline-block">
                {impactAnalysis.hydrology.status}
              </div>
              <p className="text-[11.5px] text-slate-600 leading-relaxed">
                {impactAnalysis.hydrology.detail}
              </p>
            </div>

            {/* Sector 4: Civil Defense & SDRF */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Civil Protection & SDRF Protocol
              </div>
              <div className="text-xs font-bold text-rose-800 bg-rose-50 px-2 py-1 rounded border border-rose-200 inline-block">
                {impactAnalysis.civilDefense.status}
              </div>
              <p className="text-[11.5px] text-slate-600 leading-relaxed">
                {impactAnalysis.civilDefense.action}
              </p>
            </div>
          </div>

          {/* Dynamic Station Breaching Roster */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                Stations Exceeding Custom Threshold ({impactAnalysis.exceedingStations.length} of {impactAnalysis.totalStations}):
              </span>
              <span className="text-[11px] text-slate-500">
                Click any station tag to focus on its meteorological records
              </span>
            </div>

            {impactAnalysis.exceedingStations.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {impactAnalysis.exceedingStations.map((stn) => (
                  <button
                    key={stn.id}
                    onClick={() => onSelectStation?.(stn.id)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all text-xs group text-left"
                  >
                    <span className="font-bold text-slate-800 group-hover:text-indigo-600">
                      {stn.name}
                    </span>
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">
                      {stn.maxRain} mm
                    </span>
                    <span className="text-[10px] font-semibold text-rose-600 font-mono">
                      +{stn.customDelta} mm
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic py-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                All {impactAnalysis.totalStations} monitored stations are currently operating safely below the {heavyThresholdMm.toFixed(1)} mm threshold.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Probability Tester & Exceedance Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls Column */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Exceedance Scenario Sandbox</h3>
                <p className="text-xs text-slate-500">Simulate rainfall intensity to test threshold probabilities</p>
              </div>
            </div>
          </div>

          {/* Test Rain Slider */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-slate-700">AI Corrected Precipitation Intensity:</span>
              <span className="font-mono font-bold text-indigo-600 text-sm">{testRainMm} mm/day</span>
            </div>
            <input
              type="range"
              min={0}
              max={250}
              step={2}
              value={testRainMm}
              onChange={(e) => setTestRainMm(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Dry (0 mm)</span>
              <span>Heavy (64.5 mm)</span>
              <span>Extreme (204+ mm)</span>
            </div>
          </div>

          {/* Test Moisture */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-slate-700">850 hPa Relative Humidity:</span>
              <span className="font-mono font-bold text-indigo-600">{testHumidity}% RH</span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={1}
              value={testHumidity}
              onChange={(e) => setTestHumidity(parseInt(e.target.value))}
              className="w-full accent-indigo-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
            />
          </div>

          {/* Test Surface Pressure */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-slate-700">Surface Pressure (Depression Intensity):</span>
              <span className="font-mono font-bold text-indigo-600">{testPressure} hPa</span>
            </div>
            <input
              type="range"
              min={990}
              max={1015}
              step={1}
              value={testPressure}
              onChange={(e) => setTestPressure(parseInt(e.target.value))}
              className="w-full accent-indigo-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
            />
          </div>

          {/* Test Synoptic Regime Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Synoptic Context Regime:
            </label>
            <select
              value={testRegime}
              onChange={(e) => setTestRegime(e.target.value as SynopticWeatherRegime)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              {Object.values(SynopticWeatherRegime).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Live Alert Status Card */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              liveProbabilities.dominantAlertLevel === 'RED'
                ? 'bg-red-50 border-red-200 text-red-900'
                : liveProbabilities.dominantAlertLevel === 'ORANGE'
                ? 'bg-orange-50 border-orange-200 text-orange-900'
                : liveProbabilities.dominantAlertLevel === 'YELLOW'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-xs uppercase tracking-wide">
                Operational Alert Level: {liveProbabilities.dominantAlertLevel}
              </div>
              <p className="text-xs mt-1 leading-snug">{liveProbabilities.warningMessage}</p>
            </div>
          </div>
        </div>

        {/* Right Column: 4 Standard Operational Exceedance Cards */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {thresholds.map((t) => (
            <div
              key={t.id}
              className={`p-5 rounded-2xl border ${t.borderColor} ${t.bgColor} shadow-xs flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${t.alertBadge}`}>
                    ≥ {t.thresholdMm} mm/day
                  </span>
                  <span className="text-2xl font-black font-mono text-slate-900">
                    {t.prob}%
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 text-base">{t.name}</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{t.desc}</p>

                {/* Progress Bar */}
                <div className="w-full bg-slate-200/80 rounded-full h-2.5 mt-4 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${t.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${t.prob}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11px] text-slate-600">
                <span className="font-bold text-slate-800 block mb-0.5">Disaster Protocol:</span>
                {t.action}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* District / Station Heavy Rainfall Risk Table with Dynamic Threshold Exceedance Column */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Station & District Exceedance Risk Matrix ({stationRiskRankings.length} Subdivisions)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked dynamically by probability of exceeding the custom <strong className="text-indigo-700">≥ {heavyThresholdMm.toFixed(1)} mm</strong> threshold & IMD categories
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Filter exceeding only toggle */}
            <button
              onClick={() => setShowOnlyExceeding((v) => !v)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                showOnlyExceeding
                  ? 'bg-indigo-600 text-white border-indigo-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>Breached Only (≥ {heavyThresholdMm.toFixed(1)}mm)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                showOnlyExceeding ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {impactAnalysis.exceedingStations.length}
              </span>
            </button>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search station, district, state..."
                value={stationSearch}
                onChange={(e) => setStationSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Station & Subdivision</th>
                <th className="py-3 px-3">Synoptic Regime</th>
                <th className="py-3 px-3">Corrected Forecast</th>
                <th className="py-3 px-3 text-center bg-indigo-50/60 text-indigo-900 border-x border-indigo-100">
                  ≥ {heavyThresholdMm.toFixed(1)}mm (Custom)
                </th>
                <th className="py-3 px-3 text-center">&gt;15.5mm (Mod)</th>
                <th className="py-3 px-3 text-center">&gt;64.5mm (Heavy)</th>
                <th className="py-3 px-3 text-center">&gt;115.5mm (Very Hvy)</th>
                <th className="py-3 px-3 text-center">&gt;204.4mm (Ext)</th>
                <th className="py-3 px-6 text-center min-w-[120px]">Alert Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {stationRiskRankings
                .filter((stn) => !showOnlyExceeding || stn.exceedsCustom)
                .slice(0, 16)
                .map((stn) => {
                  const p = stn.probs;
                  return (
                    <tr 
                      key={stn.id} 
                      onClick={() => onSelectStation?.(stn.id)}
                      className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                        stn.exceedsCustom ? 'bg-indigo-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {stn.name}
                          {stn.exceedsCustom && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" title="Exceeds current threshold" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">{stn.subdivision}, {stn.state}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                          {stn.synopticRegime}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                        {stn.maxRain} mm
                      </td>

                      {/* Custom Threshold Dynamic Column */}
                      <td className="py-3 px-3 text-center font-mono bg-indigo-50/30 border-x border-indigo-100">
                        <span
                          className={`px-2.5 py-1 rounded-md font-bold text-xs ${
                            stn.customProb > 50
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : stn.customProb > 25
                              ? 'bg-orange-100 text-orange-800 border border-orange-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {stn.customProb}%
                        </span>
                        {stn.exceedsCustom && (
                          <span className="block text-[10px] text-rose-600 font-bold mt-0.5">
                            +{stn.customDelta} mm
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded font-bold ${p.probModerate15 > 60 ? 'bg-amber-100 text-amber-800' : 'text-slate-600'}`}>
                          {p.probModerate15}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded font-bold ${p.probHeavy64 > 40 ? 'bg-orange-100 text-orange-800' : 'text-slate-600'}`}>
                          {p.probHeavy64}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded font-bold ${p.probVeryHeavy115 > 25 ? 'bg-red-100 text-red-800' : 'text-slate-600'}`}>
                          {p.probVeryHeavy115}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded font-bold ${p.probExtremelyHeavy204 > 15 ? 'bg-purple-100 text-purple-800' : 'text-slate-500'}`}>
                          {p.probExtremelyHeavy204}%
                        </span>
                      </td>
                      <td className="py-3 px-6 text-center min-w-[120px]">
                        <span
                          className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            p.dominantAlertLevel === 'RED'
                              ? 'bg-red-500/15 text-red-700 border-red-300'
                              : p.dominantAlertLevel === 'ORANGE'
                              ? 'bg-orange-500/15 text-orange-700 border-orange-300'
                              : p.dominantAlertLevel === 'YELLOW'
                              ? 'bg-amber-500/15 text-amber-700 border-amber-300'
                              : 'bg-emerald-500/15 text-emerald-700 border-emerald-300'
                          }`}
                        >
                          {p.dominantAlertLevel} ALERT
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

