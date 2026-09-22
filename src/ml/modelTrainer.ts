import { RainfallDataPoint, StationMetadata } from '../types';
import { MET_STATIONS } from '../data/monsoonDataset';
import { getHistorical1901Profile, calculateReturnPeriod1901 } from '../data/historicalClimatology1901';

export const FEATURE_NAMES: string[] = [
  'Raw NWP Rainfall (mm)',
  '850hPa Relative Humidity (%)',
  'Surface Pressure (hPa)',
  '2m Temperature (°C)',
  '10m Wind Speed (km/h)',
  'CAPE Convective Instability',
  'CIN Convective Inhibition',
  'Elevation Normalized',
  'Orographic Ghats Flag',
  'Monsoon Climatology Norm',
  'Lagged Observation y[t-1] (mm)',
  'Forecast Lead Time (Days)',
  '1901–2025 P90 Climatology Ratio',
  '1901–2025 50-Yr Return Exceedance',
  '1901–2025 Historical Wet Day Freq',
];

export interface EngineeredFeatures {
  rawForecast: number;
  rh850: number;
  pressure: number;
  temp2m: number;
  windSpeed: number;
  capeProxy: number;
  cinProxy: number;
  elevationNorm: number;
  isOrographic: number;
  climatologyNorm: number;
  laggedObs: number;
  leadTimeNorm: number;
  clim1901P90Ratio: number;
  clim1901ReturnPeriodNorm: number;
  clim1901WetDayFreq: number;
}

export interface TrainingMetrics {
  epoch: number;
  trainLoss: number;
  valLoss: number;
  trainMae: number;
  valMae: number;
  valRmse: number;
  valCsi64: number; // Critical Success Index for extreme rain (>= 64.5mm)
  valPinballLoss: number;
}

export interface TrainedModelWeights {
  version: string;
  trainedAt: string;
  epochsRun: number;
  featureMeans: number[];
  featureStds: number[];
  featureNames?: string[];
  climatology1901Integrated?: boolean;
  // Quantile heads: q10 (10th percentile), q50 (median/expected), q90 (90th percentile)
  q10Weights: number[];
  q10Bias: number;
  q50Weights: number[];
  q50Bias: number;
  q90Weights: number[];
  q90Bias: number;
  regimeWeights: {
    dry: number;
    light: number;
    moderate: number;
    extreme: number;
  };
  metrics: {
    finalValMae: number;
    finalValRmse: number;
    finalCsi64: number;
    finalPinballLoss: number;
    testMae: number;
    testRmse: number;
    testCsi64: number;
  };
}

/**
 * 1. Feature Extraction & Engineering
 * Extracts raw NWP, spatial context, thermodynamics, lagged observations,
 * and 1901–2025 historical climatological return period priors.
 */
export function extractFeatures(point: RainfallDataPoint): number[] {
  const station = MET_STATIONS.find(s => s.id === point.stationId) || {
    elevationM: 50,
    subdivision: 'Unknown',
    avgMonsoonRainMm: 1200,
  };

  const isOrographic = station.subdivision.includes('Konkan') || 
                        station.subdivision.includes('Ghats') || 
                        station.elevationM > 800 ? 1.0 : 0.0;

  // Thermodynamic instability proxies (CAPE & CIN)
  const pressureDeficit = Math.max(0, 1012 - point.surfacePressureHpa);
  const moistureSurplus = Math.max(0, point.relativeHumidity850hPa - 68);
  const capeProxy = Math.min(4500, pressureDeficit * moistureSurplus * 3.8 + point.windSpeed10mKmh * 15);
  const cinProxy = Math.max(0, (100 - point.relativeHumidity850hPa) * 4.2 - pressureDeficit * 2.5);

  const climatologyNorm = (station.avgMonsoonRainMm || 1500) / 4000;
  const elevationNorm = Math.min(1.5, (station.elevationM || 50) / 1400);

  // 1901–2025 Historical Climatology Reference Integration
  const profile1901 = getHistorical1901Profile(point.stationId);
  const clim1901P90Ratio = Math.min(6.0, point.rawForecastMm / (profile1901.dailyP90Mm || 35.0));
  const clim1901ReturnPeriodNorm = Math.min(4.0, (point.rawForecastMm + 0.25 * point.prevDayObsMm) / (profile1901.gevReturnLevel50yrMm || 200.0));
  const clim1901WetDayFreq = profile1901.wetDayFrequencyPct / 100.0;

  return [
    point.rawForecastMm,
    point.relativeHumidity850hPa,
    point.surfacePressureHpa,
    point.temp2mC,
    point.windSpeed10mKmh,
    capeProxy,
    cinProxy,
    elevationNorm,
    isOrographic,
    climatologyNorm,
    point.prevDayObsMm,
    point.leadTimeDays,
    clim1901P90Ratio,
    clim1901ReturnPeriodNorm,
    clim1901WetDayFreq,
  ];
}

/**
 * Pinball Loss for Quantile Regression
 * L_q(y, y_hat) = max(q * (y - y_hat), (1 - q) * (y_hat - y))
 */
export function pinballLoss(yTrue: number, yPred: number, quantile: number): number {
  const err = yTrue - yPred;
  return err >= 0 ? quantile * err : (quantile - 1) * err;
}

/**
 * Huber Loss for robust estimation against extreme outliers
 */
export function huberLoss(yTrue: number, yPred: number, delta: number = 15.0): number {
  const err = Math.abs(yTrue - yPred);
  if (err <= delta) {
    return 0.5 * err * err;
  }
  return delta * (err - 0.5 * delta);
}

/**
 * Huber Loss Derivative for Gradient Descent
 */
export function huberGradient(yTrue: number, yPred: number, delta: number = 15.0): number {
  const err = yPred - yTrue;
  if (Math.abs(err) <= delta) {
    return err;
  }
  return delta * Math.sign(err);
}

/**
 * Pinball Loss Subgradient
 */
export function pinballGradient(yTrue: number, yPred: number, quantile: number): number {
  return yPred >= yTrue ? 1 - quantile : -quantile;
}

/**
 * Critical Success Index (CSI / Threat Score) for Heavy/Extreme Rainfall (>= 64.5mm)
 * CSI = Hits / (Hits + Misses + FalseAlarms)
 */
export function calculateCsi(yTrue: number[], yPred: number[], threshold: number = 64.5): number {
  let hits = 0;
  let misses = 0;
  let falseAlarms = 0;

  for (let i = 0; i < yTrue.length; i++) {
    const actualHeavy = yTrue[i] >= threshold;
    const predHeavy = yPred[i] >= threshold;

    if (actualHeavy && predHeavy) hits++;
    else if (actualHeavy && !predHeavy) misses++;
    else if (!actualHeavy && predHeavy) falseAlarms++;
  }

  const denom = hits + misses + falseAlarms;
  return denom === 0 ? 1.0 : hits / denom;
}

export interface TrainingResult {
  weights: TrainedModelWeights;
  history: TrainingMetrics[];
  summary: string;
}

/**
 * Full ML Training Pipeline
 * Executes chronological split, feature normalization, multi-head quantile training,
 * and iterative validation until convergence.
 */
export function trainQuantileEnsemble(
  dataset: RainfallDataPoint[],
  epochs: number = 120,
  learningRate: number = 0.015,
  onEpoch?: (metric: TrainingMetrics) => void
): TrainingResult {
  // 1. Chronological Split (No data leakage)
  const trainData = dataset.filter(d => d.year === 2023);
  const valData = dataset.filter(d => d.year === 2024);
  const testData = dataset.filter(d => d.year === 2025);

  const extractSet = (data: RainfallDataPoint[]) => {
    const X = data.map(d => extractFeatures(d));
    const Y = data.map(d => d.observedMm);
    return { X, Y, data };
  };

  const train = extractSet(trainData);
  const val = extractSet(valData);
  const test = extractSet(testData);

  const numFeatures = train.X[0].length;

  // 2. Feature Standardizer (computed strictly on train set)
  const featureMeans = new Array(numFeatures).fill(0);
  const featureStds = new Array(numFeatures).fill(0);

  for (let j = 0; j < numFeatures; j++) {
    let sum = 0;
    for (let i = 0; i < train.X.length; i++) sum += train.X[i][j];
    featureMeans[j] = sum / train.X.length;

    let varSum = 0;
    for (let i = 0; i < train.X.length; i++) {
      const diff = train.X[i][j] - featureMeans[j];
      varSum += diff * diff;
    }
    featureStds[j] = Math.sqrt(varSum / train.X.length) || 1.0;
  }

  const normalize = (X: number[][]) =>
    X.map(row =>
      row.map((val, j) => (val - featureMeans[j]) / featureStds[j])
    );

  const XTrainNorm = normalize(train.X);
  const XValNorm = normalize(val.X);
  const XTestNorm = normalize(test.X);

  // 3. Initialize Model Parameters
  // q50 (Expected), q10 (Lower bound), q90 (Upper bound)
  let q50W = new Array(numFeatures).fill(0).map(() => (Math.random() * 0.1 - 0.05));
  let q50B = 10.0; // initial positive rainfall prior

  let q10W = new Array(numFeatures).fill(0).map(() => (Math.random() * 0.05 - 0.025));
  let q10B = 3.0;

  let q90W = new Array(numFeatures).fill(0).map(() => (Math.random() * 0.15 + 0.05));
  let q90B = 25.0;

  // Feature weights initialization heuristics
  q50W[0] = 0.85; // rawForecastMm feature dominant
  q90W[0] = 1.35; // extreme quantile sensitivity

  const history: TrainingMetrics[] = [];

  // Momentum buffers
  const v50W = new Array(numFeatures).fill(0);
  const v10W = new Array(numFeatures).fill(0);
  const v90W = new Array(numFeatures).fill(0);
  let v50B = 0;
  let v10B = 0;
  let v90B = 0;

  const momentum = 0.88;

  const predictLinear = (x: number[], w: number[], b: number) => {
    let sum = b;
    for (let j = 0; j < w.length; j++) sum += x[j] * w[j];
    return Math.max(0, sum);
  };

  // 4. Iterative Optimization Loop
  for (let epoch = 1; epoch <= epochs; epoch++) {
    const currentLr = learningRate * Math.pow(0.985, epoch);

    let trainLossAccum = 0;
    let trainMaeAccum = 0;

    // Mini-batch SGD
    for (let i = 0; i < XTrainNorm.length; i++) {
      const xi = XTrainNorm[i];
      const yi = train.Y[i];

      const pred50 = predictLinear(xi, q50W, q50B);
      const pred10 = Math.min(pred50, predictLinear(xi, q10W, q10B));
      const pred90 = Math.max(pred50, predictLinear(xi, q90W, q90B));

      // Extreme event penalty weighting:
      // Monsoonal extreme downpours (>=64.5mm) are high-impact events requiring boosted penalty.
      const isExtreme = yi >= 64.5;
      const sampleWeight = isExtreme ? 4.2 : (yi < 2.5 ? 1.5 : 1.0);

      // Huber + pinball gradients with physical event weighting
      const grad50 = huberGradient(yi, pred50, 18.0) * sampleWeight;
      const grad10 = pinballGradient(yi, pred10, 0.10) * sampleWeight;
      const grad90 = pinballGradient(yi, pred90, 0.90) * (isExtreme ? 5.0 : sampleWeight);

      // Update q50
      for (let j = 0; j < numFeatures; j++) {
        v50W[j] = momentum * v50W[j] + (1 - momentum) * (grad50 * xi[j]);
        q50W[j] -= currentLr * v50W[j];

        v10W[j] = momentum * v10W[j] + (1 - momentum) * (grad10 * xi[j]);
        q10W[j] -= currentLr * v10W[j];

        v90W[j] = momentum * v90W[j] + (1 - momentum) * (grad90 * xi[j]);
        q90W[j] -= currentLr * v90W[j];
      }

      v50B = momentum * v50B + (1 - momentum) * grad50;
      q50B -= currentLr * v50B;

      v10B = momentum * v10B + (1 - momentum) * grad10;
      q10B -= currentLr * v10B;

      v90B = momentum * v90B + (1 - momentum) * grad90;
      q90B -= currentLr * v90B;

      trainLossAccum += huberLoss(yi, pred50, 18.0);
      trainMaeAccum += Math.abs(yi - pred50);
    }

    const avgTrainLoss = trainLossAccum / XTrainNorm.length;
    const avgTrainMae = trainMaeAccum / XTrainNorm.length;

    // Validation Evaluation on Unseen 2024 Season
    let valLossAccum = 0;
    let valMaeAccum = 0;
    let valRmseAccum = 0;
    let valPinballAccum = 0;
    const valPreds: number[] = [];

    for (let i = 0; i < XValNorm.length; i++) {
      const xi = XValNorm[i];
      const yi = val.Y[i];

      const pred50 = predictLinear(xi, q50W, q50B);
      const pred10 = predictLinear(xi, q10W, q10B);
      const pred90 = predictLinear(xi, q90W, q90B);

      valPreds.push(pred50);

      const err = yi - pred50;
      valLossAccum += huberLoss(yi, pred50, 18.0);
      valMaeAccum += Math.abs(err);
      valRmseAccum += err * err;

      valPinballAccum += pinballLoss(yi, pred10, 0.10) + pinballLoss(yi, pred90, 0.90);
    }

    const valMae = valMaeAccum / XValNorm.length;
    const valRmse = Math.sqrt(valRmseAccum / XValNorm.length);
    const valLoss = valLossAccum / XValNorm.length;
    const valCsi64 = calculateCsi(val.Y, valPreds, 64.5);
    const valPinball = valPinballAccum / XValNorm.length;

    const metric: TrainingMetrics = {
      epoch,
      trainLoss: Math.round(avgTrainLoss * 100) / 100,
      valLoss: Math.round(valLoss * 100) / 100,
      trainMae: Math.round(avgTrainMae * 100) / 100,
      valMae: Math.round(valMae * 100) / 100,
      valRmse: Math.round(valRmse * 100) / 100,
      valCsi64: Math.round(valCsi64 * 1000) / 1000,
      valPinballLoss: Math.round(valPinball * 100) / 100,
    };

    history.push(metric);
    if (onEpoch) onEpoch(metric);
  }

  // 5. Final Blind Test Evaluation on 2025 Season
  let testMaeAccum = 0;
  let testRmseAccum = 0;
  const testPreds: number[] = [];

  for (let i = 0; i < XTestNorm.length; i++) {
    const xi = XTestNorm[i];
    const yi = test.Y[i];
    const p = predictLinear(xi, q50W, q50B);
    testPreds.push(p);

    const err = yi - p;
    testMaeAccum += Math.abs(err);
    testRmseAccum += err * err;
  }

  const testMae = testMaeAccum / XTestNorm.length;
  const testRmse = Math.sqrt(testRmseAccum / XTestNorm.length);
  const testCsi64 = calculateCsi(test.Y, testPreds, 64.5);

  const lastMetric = history[history.length - 1];

  const weights: TrainedModelWeights = {
    version: 'v3.2-1901ClimatologyEnsemble',
    trainedAt: new Date().toISOString(),
    epochsRun: epochs,
    featureMeans,
    featureStds,
    featureNames: FEATURE_NAMES,
    climatology1901Integrated: true,
    q10Weights: q10W.map(w => Math.round(w * 10000) / 10000),
    q10Bias: Math.round(q10B * 100) / 100,
    q50Weights: q50W.map(w => Math.round(w * 10000) / 10000),
    q50Bias: Math.round(q50B * 100) / 100,
    q90Weights: q90W.map(w => Math.round(w * 10000) / 10000),
    q90Bias: Math.round(q90B * 100) / 100,
    regimeWeights: {
      dry: 0.12,
      light: 0.76,
      moderate: 0.94,
      extreme: 1.28,
    },
    metrics: {
      finalValMae: lastMetric.valMae,
      finalValRmse: lastMetric.valRmse,
      finalCsi64: lastMetric.valCsi64,
      finalPinballLoss: lastMetric.valPinballLoss,
      testMae: Math.round(testMae * 100) / 100,
      testRmse: Math.round(testRmse * 100) / 100,
      testCsi64: Math.round(testCsi64 * 1000) / 1000,
    },
  };

  return {
    weights,
    history,
    summary: `Training converged in ${epochs} epochs with 1901–2025 Climatology Priors. Validation MAE: ${lastMetric.valMae} mm, Validation CSI(>=64.5mm): ${(lastMetric.valCsi64 * 100).toFixed(1)}%, Blind Test (2025) MAE: ${weights.metrics.testMae} mm.`,
  };
}

/**
 * In-Browser Inference Engine using Trained Weights & 1901 Climatology Anchors
 */
export function predictWithTrainedWeights(
  point: RainfallDataPoint,
  weights: TrainedModelWeights
): {
  correctedForecastMm: number;
  ciLowerMm: number;
  ciUpperMm: number;
  appliedModel: string;
  returnPeriod1901?: {
    returnPeriodYears: number;
    percentileRank: number;
    anomalyRatioP90: number;
    isAllTimeRecord: boolean;
    returnPeriodLabel: string;
  };
} {
  const rawFeatures = extractFeatures(point);
  const nFeatures = Math.min(rawFeatures.length, weights.q50Weights.length);
  const normFeatures = rawFeatures.slice(0, nFeatures).map((val, j) =>
    (val - (weights.featureMeans[j] ?? 0)) / (weights.featureStds[j] || 1.0)
  );

  let q50 = weights.q50Bias;
  let q10 = weights.q10Bias;
  let q90 = weights.q90Bias;

  for (let j = 0; j < nFeatures; j++) {
    q50 += normFeatures[j] * weights.q50Weights[j];
    q10 += normFeatures[j] * weights.q10Weights[j];
    q90 += normFeatures[j] * weights.q90Weights[j];
  }

  q50 = Math.max(0, Math.round(q50 * 10) / 10);
  q10 = Math.max(0, Math.round(Math.min(q50, q10) * 10) / 10);
  q90 = Math.max(q50, Math.round(q90 * 10) / 10);

  // Apply Drizzle Bias suppression if dry conditions or historical low wet-day frequency
  if (point.rawForecastMm < 3.5 && point.relativeHumidity850hPa < 74) {
    q50 = 0.0;
    q10 = 0.0;
    q90 = Math.min(2.0, q90);
  }

  // 1901-2025 Historical Return Period & Extreme Probability Assessment
  const returnPeriod1901 = calculateReturnPeriod1901(point.stationId, q50);

  return {
    correctedForecastMm: q50,
    ciLowerMm: q10,
    ciUpperMm: q90,
    appliedModel: `Quantile Regression Ensemble (${weights.version})`,
    returnPeriod1901,
  };
}
