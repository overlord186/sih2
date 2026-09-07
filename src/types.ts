export enum RainfallRegime {
  DRY = 'Dry / No Rain',
  LIGHT = 'Light Rain',
  MODERATE = 'Moderate Rain',
  HEAVY_EXTREME = 'Heavy / Extreme Rain',
}

export enum SynopticWeatherRegime {
  ACTIVE_MONSOON = 'Active Monsoon',
  BREAK_MONSOON = 'Break Monsoon',
  MONSOON_DEPRESSION = 'Monsoon Low / Depression',
  COASTAL_OROGRAPHIC = 'Coastal / Orographic Surge',
  WESTERN_DISTURBANCE = 'Western Disturbance',
}

export interface RainfallDataPoint {
  id: string;
  year: number; // 2024 (recent operational benchmark), 2023, 2025
  date: string; // YYYY-MM-DD
  dayOfYear: number;
  stationId: string;
  stationName: string;
  subdivision: string;
  leadTimeDays: number; // 1, 2, 3
  rawForecastMm: number;
  observedMm: number;
  relativeHumidity850hPa: number; // %
  temp2mC: number; // °C
  surfacePressureHpa: number; // hPa
  windSpeed10mKmh: number; // km/h
  prevDayObsMm: number;
  detectedRegime: RainfallRegime;
  synopticRegime?: SynopticWeatherRegime;
  baselineLinearMm: number;
  correctedForecastMm: number;
}

export interface MetricSummary {
  sampleCount: number;
  maeRaw: number;
  maeBaseline: number;
  maeCorrected: number;
  rmseRaw: number;
  rmseBaseline: number;
  rmseCorrected: number;
  biasRaw: number;
  biasBaseline: number;
  biasCorrected: number;
  pearsonRaw: number;
  pearsonCorrected: number;
  // Categorical Skill Score for Heavy events (>= 64.5 mm)
  threatScoreRaw: number; // CSI
  threatScoreCorrected: number;
  // Advanced Verification Metrics
  etsRaw?: number; // Equitable Threat Score
  etsCorrected?: number;
  podRaw?: number; // Probability of Detection
  podCorrected?: number;
  farRaw?: number; // False Alarm Ratio
  farCorrected?: number;
  fssRaw?: number; // Fractions Skill Score
  fssCorrected?: number;
}

export interface ContingencyMetrics {
  thresholdMm: number;
  label: string;
  hits: number;
  misses: number;
  falseAlarms: number;
  correctNegatives: number;
  totalSamples: number;
  rmse: number;
  ets: number; // Equitable Threat Score
  csi: number; // Critical Success Index
  pod: number; // Probability of Detection (Hit Rate)
  far: number; // False Alarm Ratio
  fss: number; // Fractions Skill Score
  frequencyBias: number;
  hss: number; // Heidke Skill Score
}

export interface ModelVerificationComparison {
  thresholdMm: number;
  thresholdLabel: string;
  imdCategory: string;
  rawNwp: ContingencyMetrics;
  linearBaseline: ContingencyMetrics;
  aiCorrected: ContingencyMetrics;
  improvementETS: number; // % gain in ETS
  improvementCSI: number; // % gain in CSI
  reductionFAR: number; // % reduction in false alarms
  improvementRMSE: number; // % reduction in RMSE
}

export interface HeavyRainfallProbabilities {
  probModerate15: number; // >= 15.5 mm (%)
  probHeavy64: number; // >= 64.5 mm (%)
  probVeryHeavy115: number; // >= 115.5 mm (%)
  probExtremelyHeavy204: number; // >= 204.4 mm (%)
  dominantAlertLevel: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  warningMessage: string;
  ensembleVariance: number;
}

export interface DistrictForecastProduct {
  districtName: string;
  state: string;
  subdivision: string;
  stationId: string;
  lat: number;
  lon: number;
  rawNwpMm: number;
  baselineMm: number;
  aiCorrectedMm: number;
  observedMm?: number;
  biasDeltaMm: number;
  synopticRegime: SynopticWeatherRegime;
  alertLevel: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  heavyRainProbability: HeavyRainfallProbabilities;
  advisoryText: string;
  leadTimeDays: number;
}

export interface RegimeMetricBreakdown {
  regime: RainfallRegime;
  imdThreshold: string;
  sampleCount: number;
  maeRaw: number;
  maeBaseline: number;
  maeCorrected: number;
  improvementPct: number;
  biasRaw: number;
  biasCorrected: number;
}

export interface StationMetadata {
  id: string;
  name: string;
  subdivision: string;
  state: string;
  lat: number;
  lon: number;
  elevationM: number;
  climateZone: string;
  avgMonsoonRainMm: number;
}

export interface PredictionScenarioInput {
  stationId: string;
  leadTimeDays: number;
  rawForecastMm: number;
  relativeHumidity: number;
  temp2m: number;
  surfacePressure: number;
  windSpeed: number;
  prevDayRain: number;
}

export interface PredictionResult {
  detectedRegime: RainfallRegime;
  synopticRegime?: SynopticWeatherRegime;
  regimeConfidence: number;
  regimeRationale: string;
  rawForecastMm: number;
  baselineLinearMm: number;
  correctedForecastMm: number;
  adjustmentDeltaMm: number;
  adjustmentPct: number;
  appliedModel: string;
  heavyRainProbabilities?: HeavyRainfallProbabilities;
  physicalFactors: {
    factor: string;
    impact: 'Suppressive' | 'Enhancing' | 'Neutral';
    description: string;
  }[];
}

// Spatial Reliability & Sub-Basin Types
export interface SubBasinReliability {
  basinId: string;
  basinName: string;
  majorRiver: string;
  areaSqKm: number;
  sampleCount: number;
  brierScoreRaw: number;
  brierScoreAI: number;
  reliabilityTermRaw: number;
  reliabilityTermAI: number;
  resolutionTermRaw: number;
  resolutionTermAI: number;
  uncertaintyTerm: number;
  calibrationPoints: {
    binCenter: number; // e.g., 0.05, 0.15, ... 0.95
    forecastProb: number; // % (5, 15, ... 95)
    sampleCountRaw: number;
    sampleCountAI: number;
    observedFreqRaw: number; // %
    observedFreqAI: number; // %
  }[];
}

// Hydrological & Catchment Inundation Types (SCS-CN Method)
export interface RiverBasinModel {
  id: string;
  name: string;
  state: string;
  drainageAreaSqKm: number;
  mainRiver: string;
  gaugeStation: string;
  curveNumberAMC2: number; // CN under AMC II
  timeOfConcentrationHours: number;
  dangerDischargeCusecs: number; // m3/s or cusecs
  dangerWaterLevelM: number;
  currentWaterLevelM: number;
  upstreamRainfallMm: number;
  projectedPeakDischargeM3s: number;
  runoffVolumeMm: number;
  inundationRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  estimatedTimeToPeakHours: number;
  hydrograph: {
    hour: number;
    dischargeM3s: number;
    precipitationMm: number;
    stageM: number;
  }[];
}

// Urban Flood Choke-Point Vulnerability Matrix
export interface UrbanChokePoint {
  id: string;
  metroCity: string;
  locationName: string;
  lat: number;
  lon: number;
  imperviousRatioPct: number; // e.g. 85%
  slopeGradientDeg: number; // e.g. 0.4°
  drainageCapacityMmHr: number; // e.g. 25 mm/h
  criticalThresholdMm: number; // 24h rain causing knee-deep water
  vulnerabilityIndex: number; // 0 - 100
  recentRainfallMm: number;
  projectedWaterloggingCm: number;
  evacuationStatus: 'NORMAL' | 'STANDBY' | 'PUMPING_ACTIVE' | 'TRAFFIC_DIVERTED';
  keyImpact: string;
  mitigationPumpsDeployed: number;
}

// Remote Sensing Satellite & Radar Types
export type SatelliteChannel = 'TIR1_10_8' | 'WV_6_7' | 'VIS_RGB' | 'CLOUD_TOP_TEMP';
export type RadarSiteId = 'MUMBAI' | 'CHENNAI' | 'KOLKATA' | 'DELHI' | 'KOCHI';

export interface DopplerRadarFrame {
  timestamp: string;
  sweepMinutesAgo: number;
  maxReflectivityDbz: number;
  dominantEchoType: string;
  stormVelocityKmh: number;
  stormDirectionDeg: number;
  echoTopsKm: number;
}

// Operational Dispatch & Alert Configuration
export interface WebhookAlertConfig {
  id: string;
  name: string;
  endpointUrl: string;
  targetAgencies: string[];
  triggerProbabilityThreshold: number; // % e.g. 60
  triggerRainfallThresholdMm: number; // e.g. 64.5
  subdivisionFilter: string[];
  leadTimeHours: number; // 24, 48, 72
  enabled: boolean;
  smsNotification: boolean;
  smsRecipients: string[];
  lastTriggered?: string;
  lastStatus?: 'SUCCESS' | 'FAILED' | 'PENDING';
}

export interface GriddedExportConfig {
  format: 'NETCDF4' | 'GEOTIFF' | 'GRIDDED_CSV' | 'GEOJSON';
  gridResolutionDeg: 0.25 | 0.5 | 0.1;
  leadTimeDays: number;
  includeVariables: {
    rawForecast: boolean;
    aiCorrected: boolean;
    biasDelta: boolean;
    heavyRainProb: boolean;
    synopticRegime: boolean;
    uncertaintySpread: boolean;
  };
  boundingLatMin: number;
  boundingLatMax: number;
  boundingLonMin: number;
  boundingLonMax: number;
}

