import {
  RainfallRegime,
  RainfallDataPoint,
  MetricSummary,
  RegimeMetricBreakdown,
  PredictionScenarioInput,
  PredictionResult,
} from '../types';

/**
 * IMD Rainfall Classifications:
 * - Dry / No Rain: < 2.5 mm
 * - Light Rain: 2.5 - 15.5 mm
 * - Moderate Rain: 15.6 - 64.4 mm
 * - Heavy / Very Heavy / Extreme: >= 64.5 mm
 */

export function classifyRegime(
  rawForecastMm: number,
  relativeHumidity: number,
  surfacePressure: number,
  windSpeed: number,
  prevDayRain: number
): { regime: RainfallRegime; confidence: number; rationale: string } {
  // Meteorological instability indicator (lower pressure + higher humidity = stronger convective trigger)
  const pressureAnomaly = 1010 - surfacePressure; // positive means low pressure trough
  const moistureIndex = (relativeHumidity / 100) * (1 + Math.max(0, pressureAnomaly) / 20);

  // Severe Convective / Heavy Regime criteria
  if (
    rawForecastMm >= 45 ||
    (rawForecastMm >= 30 && moistureIndex > 0.95 && windSpeed > 28) ||
    (rawForecastMm >= 25 && prevDayRain > 50 && relativeHumidity > 90)
  ) {
    return {
      regime: RainfallRegime.HEAVY_EXTREME,
      confidence: Math.min(0.96, 0.72 + (rawForecastMm / 120) * 0.24),
      rationale:
        'Synoptic low-pressure anomaly paired with saturated 850hPa moisture and active monsoonal flow triggers heavy/extreme convective precipitation regime.',
    };
  }

  // Moderate Regime criteria (15.6 - 64.4 mm)
  if (
    rawForecastMm >= 14 ||
    (rawForecastMm >= 8 && relativeHumidity >= 80 && moistureIndex > 0.8)
  ) {
    return {
      regime: RainfallRegime.MODERATE,
      confidence: 0.88,
      rationale:
        'Widespread stratiform-convective monsoonal spell with high relative humidity and steady surface convergence.',
    };
  }

  // Dry vs Light Regime discrimination (resolving NWP drizzle bias)
  // Standard NWP models produce 1-6 mm drizzle due to sub-grid parameterization even when dry
  const isLikelyDryDrizzle =
    rawForecastMm < 6.0 && (relativeHumidity < 72 || surfacePressure > 1008);

  if (rawForecastMm < 2.0 || isLikelyDryDrizzle) {
    return {
      regime: RainfallRegime.DRY,
      confidence: isLikelyDryDrizzle ? 0.91 : 0.95,
      rationale:
        'High surface pressure or boundary-layer moisture deficit indicates spurious NWP sub-grid drizzle; true physical state is dry.',
    };
  }

  return {
    regime: RainfallRegime.LIGHT,
    confidence: 0.85,
    rationale:
      'Isolated or passing monsoonal showers with moderate boundary layer humidity.',
  };
}

/**
 * Baseline 2: Standard Global Linear Bias Correction (No Regime Conditioning)
 * y_base = 0.86 * y_raw + 0.5
 */
export function applyGlobalBaseline(rawForecastMm: number): number {
  return Math.max(0, Math.round((rawForecastMm * 0.86 + 0.5) * 10) / 10);
}

/**
 * Regime-Aware Post-Processing Model
 * Dispatches specialized correction models based on diagnosed atmospheric regime.
 */
export function applyRegimeAwareCorrection(
  rawForecastMm: number,
  regime: RainfallRegime,
  relativeHumidity: number,
  surfacePressure: number,
  windSpeed: number,
  leadTimeDays: number
): { correctedMm: number; appliedModel: string; physicalFactors: PredictionResult['physicalFactors'] } {
  let corrected = rawForecastMm;
  let appliedModel = '';
  const physicalFactors: PredictionResult['physicalFactors'] = [];

  // Lead time error decay penalty
  const leadTimeFactor = 1 + (leadTimeDays - 1) * 0.05;

  switch (regime) {
    case RainfallRegime.DRY: {
      appliedModel = 'Zero-Rain Thresholding & Drizzle Suppression Filter';
      if (rawForecastMm < 4.0 && relativeHumidity < 75) {
        corrected = 0.0;
        physicalFactors.push({
          factor: 'Sub-Grid Drizzle Filter',
          impact: 'Suppressive',
          description: 'Suppressed spurious NWP precipitation artifact below 4.0mm.',
        });
      } else {
        corrected = Math.max(0, rawForecastMm * 0.18 - 0.2);
        physicalFactors.push({
          factor: 'Dry Boundary Damping',
          impact: 'Suppressive',
          description: 'Heavy linear shrinkage for dry regime margins.',
        });
      }
      break;
    }

    case RainfallRegime.LIGHT: {
      appliedModel = 'Light Stratiform Calibrated Regressor';
      // Light rain tends to be slightly overpredicted by NWP
      const rhBonus = (relativeHumidity - 75) * 0.04;
      corrected = Math.max(0.5, rawForecastMm * 0.78 + rhBonus);
      physicalFactors.push({
        factor: 'Stratiform Scale Factor',
        impact: 'Suppressive',
        description: 'Compensates for typical +22% NWP overestimation in light rain.',
      });
      break;
    }

    case RainfallRegime.MODERATE: {
      appliedModel = 'Monsoon Trough Non-Linear Calibrator';
      // Moderate rain has moderate bias, depends on pressure depression
      const depressionMultiplier = surfacePressure < 1004 ? 1.08 : 0.94;
      corrected = rawForecastMm * 0.92 * depressionMultiplier;
      physicalFactors.push({
        factor: 'Pressure Depression Coupling',
        impact: surfacePressure < 1004 ? 'Enhancing' : 'Suppressive',
        description:
          surfacePressure < 1004
            ? 'Deep trough enhances precipitation accumulation.'
            : 'Weak trough dampens forecast.',
      });
      break;
    }

    case RainfallRegime.HEAVY_EXTREME: {
      appliedModel = 'Convective Burst Multiplier & Extremes Restorer';
      // Raw NWP models notoriously smooth out localized heavy downpours (grid resolution limit)
      // When humidity > 88% and winds are gusty, the extreme event is amplified back to true intensity
      const moistureEnhancement = relativeHumidity > 88 ? 1.15 : 1.05;
      const windShearFactor = windSpeed > 30 ? 1.12 : 1.0;
      corrected = (rawForecastMm * 1.22 + 9.5) * moistureEnhancement * windShearFactor * leadTimeFactor;
      
      physicalFactors.push({
        factor: 'Extreme Convective Restoration',
        impact: 'Enhancing',
        description: 'Restores smoothed peak intensities missing from coarse NWP grid resolution.',
      });
      physicalFactors.push({
        factor: 'Moisture Convergence Surge',
        impact: 'Enhancing',
        description: `850hPa RH (${relativeHumidity}%) indicates deep atmospheric saturation.`,
      });
      break;
    }
  }

  // Ensure non-negative
  const finalCorrected = Math.max(0, Math.round(corrected * 10) / 10);
  return {
    correctedMm: finalCorrected,
    appliedModel,
    physicalFactors,
  };
}

/**
 * Predict on custom scenario input
 */
export function predictScenario(input: PredictionScenarioInput): PredictionResult {
  const { regime, confidence, rationale } = classifyRegime(
    input.rawForecastMm,
    input.relativeHumidity,
    input.surfacePressure,
    input.windSpeed,
    input.prevDayRain
  );

  const baselineLinearMm = applyGlobalBaseline(input.rawForecastMm);
  const { correctedMm, appliedModel, physicalFactors } = applyRegimeAwareCorrection(
    input.rawForecastMm,
    regime,
    input.relativeHumidity,
    input.surfacePressure,
    input.windSpeed,
    input.leadTimeDays
  );

  const delta = Math.round((correctedMm - input.rawForecastMm) * 10) / 10;
  const pct =
    input.rawForecastMm > 0
      ? Math.round((delta / input.rawForecastMm) * 100)
      : delta > 0
      ? 100
      : 0;

  return {
    detectedRegime: regime,
    regimeConfidence: confidence,
    regimeRationale: rationale,
    rawForecastMm: input.rawForecastMm,
    baselineLinearMm,
    correctedForecastMm: correctedMm,
    adjustmentDeltaMm: delta,
    adjustmentPct: pct,
    appliedModel,
    physicalFactors,
  };
}

/**
 * Mathematically calculate genuine error metrics
 */
export function calculateMetrics(data: RainfallDataPoint[]): MetricSummary {
  if (!data || data.length === 0) {
    return {
      sampleCount: 0,
      maeRaw: 0,
      maeBaseline: 0,
      maeCorrected: 0,
      rmseRaw: 0,
      rmseBaseline: 0,
      rmseCorrected: 0,
      biasRaw: 0,
      biasBaseline: 0,
      biasCorrected: 0,
      pearsonRaw: 0,
      pearsonCorrected: 0,
      threatScoreRaw: 0,
      threatScoreCorrected: 0,
    };
  }

  const n = data.length;
  let sumAbsErrRaw = 0;
  let sumAbsErrBase = 0;
  let sumAbsErrCorr = 0;

  let sumSqErrRaw = 0;
  let sumSqErrBase = 0;
  let sumSqErrCorr = 0;

  let sumErrRaw = 0;
  let sumErrBase = 0;
  let sumErrCorr = 0;

  // Correlation helpers
  let sumObs = 0;
  let sumRaw = 0;
  let sumCorr = 0;

  // Threat Score for Heavy events (>= 64.5 mm)
  let hitsRaw = 0;
  let missesRaw = 0;
  let falseAlarmsRaw = 0;

  let hitsCorr = 0;
  let missesCorr = 0;
  let falseAlarmsCorr = 0;

  for (const d of data) {
    const errRaw = d.rawForecastMm - d.observedMm;
    const errBase = d.baselineLinearMm - d.observedMm;
    const errCorr = d.correctedForecastMm - d.observedMm;

    sumAbsErrRaw += Math.abs(errRaw);
    sumAbsErrBase += Math.abs(errBase);
    sumAbsErrCorr += Math.abs(errCorr);

    sumSqErrRaw += errRaw * errRaw;
    sumSqErrBase += errBase * errBase;
    sumSqErrCorr += errCorr * errCorr;

    sumErrRaw += errRaw;
    sumErrBase += errBase;
    sumErrCorr += errCorr;

    sumObs += d.observedMm;
    sumRaw += d.rawForecastMm;
    sumCorr += d.correctedForecastMm;

    // Heavy threshold check (IMD: >= 64.5mm)
    const isObsHeavy = d.observedMm >= 64.5;
    const isRawHeavy = d.rawForecastMm >= 64.5;
    const isCorrHeavy = d.correctedForecastMm >= 64.5;

    if (isObsHeavy && isRawHeavy) hitsRaw++;
    if (isObsHeavy && !isRawHeavy) missesRaw++;
    if (!isObsHeavy && isRawHeavy) falseAlarmsRaw++;

    if (isObsHeavy && isCorrHeavy) hitsCorr++;
    if (isObsHeavy && !isCorrHeavy) missesCorr++;
    if (!isObsHeavy && isCorrHeavy) falseAlarmsCorr++;
  }

  const meanObs = sumObs / n;
  const meanRaw = sumRaw / n;
  const meanCorr = sumCorr / n;

  let covRaw = 0;
  let varObs = 0;
  let varRaw = 0;
  let covCorr = 0;
  let varCorr = 0;

  for (const d of data) {
    const diffObs = d.observedMm - meanObs;
    const diffRaw = d.rawForecastMm - meanRaw;
    const diffCorr = d.correctedForecastMm - meanCorr;

    covRaw += diffObs * diffRaw;
    varObs += diffObs * diffObs;
    varRaw += diffRaw * diffRaw;

    covCorr += diffObs * diffCorr;
    varCorr += diffCorr * diffCorr;
  }

  const denomRaw = Math.sqrt(varObs * varRaw);
  const pearsonRaw = denomRaw > 0 ? covRaw / denomRaw : 0;

  const denomCorr = Math.sqrt(varObs * varCorr);
  const pearsonCorrected = denomCorr > 0 ? covCorr / denomCorr : 0;

  const denomCsiRaw = hitsRaw + missesRaw + falseAlarmsRaw;
  const threatScoreRaw = denomCsiRaw > 0 ? hitsRaw / denomCsiRaw : 0;

  const denomCsiCorr = hitsCorr + missesCorr + falseAlarmsCorr;
  const threatScoreCorrected = denomCsiCorr > 0 ? hitsCorr / denomCsiCorr : 0;

  return {
    sampleCount: n,
    maeRaw: Math.round((sumAbsErrRaw / n) * 100) / 100,
    maeBaseline: Math.round((sumAbsErrBase / n) * 100) / 100,
    maeCorrected: Math.round((sumAbsErrCorr / n) * 100) / 100,
    rmseRaw: Math.round(Math.sqrt(sumSqErrRaw / n) * 100) / 100,
    rmseBaseline: Math.round(Math.sqrt(sumSqErrBase / n) * 100) / 100,
    rmseCorrected: Math.round(Math.sqrt(sumSqErrCorr / n) * 100) / 100,
    biasRaw: Math.round((sumErrRaw / n) * 100) / 100,
    biasBaseline: Math.round((sumErrBase / n) * 100) / 100,
    biasCorrected: Math.round((sumErrCorr / n) * 100) / 100,
    pearsonRaw: Math.round(pearsonRaw * 1000) / 1000,
    pearsonCorrected: Math.round(pearsonCorrected * 1000) / 1000,
    threatScoreRaw: Math.round(threatScoreRaw * 1000) / 1000,
    threatScoreCorrected: Math.round(threatScoreCorrected * 1000) / 1000,
  };
}

/**
 * Calculate metrics grouped by each IMD regime
 */
export function calculateRegimeBreakdown(data: RainfallDataPoint[]): RegimeMetricBreakdown[] {
  const regimes = [
    { regime: RainfallRegime.DRY, imdThreshold: '< 2.5 mm/day' },
    { regime: RainfallRegime.LIGHT, imdThreshold: '2.5 - 15.5 mm/day' },
    { regime: RainfallRegime.MODERATE, imdThreshold: '15.6 - 64.4 mm/day' },
    { regime: RainfallRegime.HEAVY_EXTREME, imdThreshold: '≥ 64.5 mm/day' },
  ];

  return regimes.map((r) => {
    const subset = data.filter((d) => d.detectedRegime === r.regime);
    if (subset.length === 0) {
      return {
        regime: r.regime,
        imdThreshold: r.imdThreshold,
        sampleCount: 0,
        maeRaw: 0,
        maeBaseline: 0,
        maeCorrected: 0,
        improvementPct: 0,
        biasRaw: 0,
        biasCorrected: 0,
      };
    }

    const summary = calculateMetrics(subset);
    const improvement =
      summary.maeRaw > 0
        ? Math.round(((summary.maeRaw - summary.maeCorrected) / summary.maeRaw) * 100)
        : 0;

    return {
      regime: r.regime,
      imdThreshold: r.imdThreshold,
      sampleCount: subset.length,
      maeRaw: summary.maeRaw,
      maeBaseline: summary.maeBaseline,
      maeCorrected: summary.maeCorrected,
      improvementPct: improvement,
      biasRaw: summary.biasRaw,
      biasCorrected: summary.biasCorrected,
    };
  });
}
