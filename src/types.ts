export enum RainfallRegime {
  DRY = 'Dry / No Rain',
  LIGHT = 'Light Rain',
  MODERATE = 'Moderate Rain',
  HEAVY_EXTREME = 'Heavy / Extreme Rain',
}

export interface RainfallDataPoint {
  id: string;
  year: number; // 2024 (recent operational benchmark), 2023
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
  regimeConfidence: number;
  regimeRationale: string;
  rawForecastMm: number;
  baselineLinearMm: number;
  correctedForecastMm: number;
  adjustmentDeltaMm: number;
  adjustmentPct: number;
  appliedModel: string;
  physicalFactors: {
    factor: string;
    impact: 'Suppressive' | 'Enhancing' | 'Neutral';
    description: string;
  }[];
}
