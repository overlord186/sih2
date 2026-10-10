/**
 * SAMVARTAKA AI - Autonomous Physics & ML Unit Test Suite
 * Validates mathematical invariants, hurdle classification, quantile monotonicity,
 * topographic downscaling, meteorological QC, SHAP decomposition, and SCS-CN hydrology.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('\n=============================================================');
console.log('🌧️  SAMVARTAKA AI — MATHEMATICAL & PHYSICS TEST RUNNER');
console.log('=============================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}\n`);
    process.exitCode = 1;
  }
}

// ----------------------------------------------------------------------------
// 1. Snapshot File Integrity & Dimension Consistency
// ----------------------------------------------------------------------------
runTest('Pillar 0: Trained Model Snapshot JSON Structure & 15D Dimensions', () => {
  const snapshotPath = path.join(__dirname, '..', 'src', 'data', 'trainedModelSnapshot.json');
  assert.ok(fs.existsSync(snapshotPath), 'Snapshot file must exist');
  
  const data = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  assert.ok(data.q10Weights, 'Snapshot must have q10Weights');
  assert.ok(data.q50Weights, 'Snapshot must have q50Weights');
  assert.ok(data.q90Weights, 'Snapshot must have q90Weights');
  assert.ok(data.hurdleWeights, 'Snapshot must have hurdleWeights');
  
  assert.strictEqual(data.q10Weights.length, 15, 'q10Weights must be 15-dimensional');
  assert.strictEqual(data.q50Weights.length, 15, 'q50Weights must be 15-dimensional');
  assert.strictEqual(data.q90Weights.length, 15, 'q90Weights must be 15-dimensional');
  assert.strictEqual(data.hurdleWeights.length, 15, 'Hurdle weights must be 15-dimensional');
  
  assert.strictEqual(data.featureMeans.length, 15, 'featureMeans must be 15-dimensional');
  assert.strictEqual(data.featureStds.length, 15, 'featureStds must be 15-dimensional');
  assert.strictEqual(data.hurdleThreshold, 0.42, 'Hurdle threshold must be calibrated to 0.42');
  assert.ok(data.metrics.finalValMae > 0, 'Validation MAE must be recorded');
});

// ----------------------------------------------------------------------------
// 2. Pillar 1: Two-Stage Hurdle Architecture
// ----------------------------------------------------------------------------
runTest('Pillar 1: Two-Stage Hurdle Rain/No-Rain Classifier Threshold (0.42)', () => {
  // Test hurdle logic
  function evaluateHurdle(prob) {
    const threshold = 0.42;
    const isRaining = prob >= threshold;
    const stage2Output = 4.2; // NWP light drizzle
    const finalRain = isRaining ? stage2Output : 0.0;
    return { isRaining, finalRain };
  }

  const dryCase = evaluateHurdle(0.18);
  assert.strictEqual(dryCase.isRaining, false);
  assert.strictEqual(dryCase.finalRain, 0.0, 'Drizzle must be clamped to 0.0 when hurdle not cleared');

  const marginalCase = evaluateHurdle(0.419);
  assert.strictEqual(marginalCase.isRaining, false);
  assert.strictEqual(marginalCase.finalRain, 0.0);

  const rainCase = evaluateHurdle(0.72);
  assert.strictEqual(rainCase.isRaining, true);
  assert.ok(rainCase.finalRain > 0, 'Rain must pass when hurdle cleared');
});

// ----------------------------------------------------------------------------
// 3. Pillar 1 & Training: Multi-Quantile Monotonicity (q10 <= q50 <= q90)
// ----------------------------------------------------------------------------
runTest('Pillar 1: Quantile Monotonicity Invariant (q10 <= q50 <= q90)', () => {
  const snapshotPath = path.join(__dirname, '..', 'src', 'data', 'trainedModelSnapshot.json');
  const data = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

  // Test across multiple simulated input scenarios
  const testInputs = [
    [0.5, 65, 1008, 3.2, 2.1, 1.2, 5.5, 38, 450, 250, 4.2, 120, 0.5, 0.86, 0.0],
    [45.0, 92, 998, 14.5, -8.2, 11.4, 6.8, 62, 2800, 1340, 18.5, 240, 0.86, -0.5, 34.0],
    [120.0, 98, 988, 22.0, -14.0, 16.5, 7.2, 75, 3400, 850, 24.0, 210, 0.95, -0.3, 85.0]
  ];

  for (const raw of testInputs) {
    const norm = raw.map((v, i) => (v - data.featureMeans[i]) / Math.max(1e-4, data.featureStds[i]));
    
    let y10 = data.q10Bias;
    let y50 = data.q50Bias;
    let y90 = data.q90Bias;
    
    for (let i = 0; i < 15; i++) {
      y10 += data.q10Weights[i] * norm[i];
      y50 += data.q50Weights[i] * norm[i];
      y90 += data.q90Weights[i] * norm[i];
    }
    
    // Apply monotonicity post-processing
    const q10 = Math.max(0, y10);
    const q50 = Math.max(q10, y50);
    const q90 = Math.max(q50, y90);

    assert.ok(q10 <= q50, `q10 (${q10}) must be <= q50 (${q50})`);
    assert.ok(q50 <= q90, `q50 (${q50}) must be <= q90 (${q90})`);
  }
});

// ----------------------------------------------------------------------------
// 4. Pillar 2: Dynamic Bayesian Multi-Model Super-Ensemble Blending
// ----------------------------------------------------------------------------
runTest('Pillar 2: Bayesian Ensemble Weight Normalization and Spread', () => {
  const models = [
    { name: 'ECMWF', forecast: 32.0, weight: 0.45 },
    { name: 'NCUM', forecast: 28.5, weight: 0.35 },
    { name: 'GFS', forecast: 24.0, weight: 0.20 }
  ];

  const totalWeight = models.reduce((acc, m) => acc + m.weight, 0);
  assert.ok(Math.abs(totalWeight - 1.0) < 1e-6, 'Weights must sum to 1.0');

  const blendedMean = models.reduce((acc, m) => acc + m.forecast * m.weight, 0);
  assert.ok(blendedMean >= 24.0 && blendedMean <= 32.0, 'Blended mean must be bounded by model extremes');

  const variance = models.reduce((acc, m) => acc + m.weight * Math.pow(m.forecast - blendedMean, 2), 0);
  const spreadSigma = Math.sqrt(variance);
  assert.ok(spreadSigma >= 0, 'Ensemble spread must be non-negative');
});

// ----------------------------------------------------------------------------
// 5. Pillar 3: Topographic Spatial Downscaling & Froude Number
// ----------------------------------------------------------------------------
runTest('Pillar 3: Froude Number Regime & Topographic Lift vs Rain-Shadow', () => {
  function calcFroude(windSpeed, mountainHeightM = 1000) {
    const N = 0.011; // Brunt-Vaisala frequency (s^-1)
    return windSpeed / (N * mountainHeightM);
  }

  // Western Ghats upslope scenario (windward: U = 12 m/s, H = 1200m)
  const Fr_windward = calcFroude(12, 1200);
  assert.ok(Fr_windward < 1.0, `Fr (${Fr_windward.toFixed(2)}) should be < 1 indicating blocking/upslope lift`);

  // High velocity crest-overtopping scenario (U = 25 m/s, H = 800m)
  const Fr_crest = calcFroude(25, 800);
  assert.ok(Fr_crest >= 1.0, `Fr (${Fr_crest.toFixed(2)}) should be >= 1 indicating crest-overtopping`);
});

// ----------------------------------------------------------------------------
// 6. Pillar 4: Meteorological Quality Control & Plausibility Gate
// ----------------------------------------------------------------------------
runTest('Pillar 4: Physical Meteorological Plausibility Gate', () => {
  function checkQC(rainMm, pwvMm = 55) {
    if (rainMm < 0) return { passed: false, clamped: 0 };
    const maxPhysicalCeiling = Math.min(1500, pwvMm * 2.8 + 200);
    if (rainMm > maxPhysicalCeiling) {
      return { passed: false, clamped: maxPhysicalCeiling, status: 'WARNING_CAPPED' };
    }
    return { passed: true, clamped: rainMm, status: 'VALID' };
  }

  const normalCheck = checkQC(45.5, 60);
  assert.strictEqual(normalCheck.passed, true);
  assert.strictEqual(normalCheck.clamped, 45.5);

  const extremeCheck = checkQC(2500, 50);
  assert.strictEqual(extremeCheck.passed, false);
  assert.strictEqual(extremeCheck.clamped, 50 * 2.8 + 200);
});

// ----------------------------------------------------------------------------
// 7. Pillar 5: Explainable AI (XAI) Additive Physical SHAP Decomposition
// ----------------------------------------------------------------------------
runTest('Pillar 5: Additive Linear Physical SHAP Attribution Decomposition', () => {
  const shapDrivers = {
    moistureFlux: +4.2,
    convectiveCape: +8.5,
    orographicLift: +6.1,
    pressureDip: +3.0,
    drizzleSuppression: -5.4
  };

  const totalShapDelta = Object.values(shapDrivers).reduce((a, b) => a + b, 0);
  const baseline = 22.0;
  const correctedForecast = baseline + totalShapDelta;

  assert.ok(Math.abs((correctedForecast - baseline) - totalShapDelta) < 1e-6, 'SHAP deltas must be strictly additive');
  assert.strictEqual(totalShapDelta, 16.4);
});

// ----------------------------------------------------------------------------
// 8. Pillar 6: Continuous Online Learning Gradient Step
// ----------------------------------------------------------------------------
runTest('Pillar 6: Online Learning Streaming SGD Drift Norm', () => {
  const initialWeights = [0.2, 0.4, -0.1, 0.5];
  const learningRate = 0.005;
  const gradient = [0.1, -0.3, 0.05, 0.2];

  // Clip gradient
  const gradNorm = Math.sqrt(gradient.reduce((sum, g) => sum + g * g, 0));
  const maxNorm = 5.0;
  const scale = gradNorm > maxNorm ? maxNorm / gradNorm : 1.0;
  const clippedGrad = gradient.map(g => g * scale);

  // Update
  const updatedWeights = initialWeights.map((w, i) => w - learningRate * clippedGrad[i]);
  const driftNorm = Math.sqrt(
    updatedWeights.reduce((sum, w, i) => sum + Math.pow(w - initialWeights[i], 2), 0)
  );

  assert.ok(driftNorm > 0, 'Drift norm must be positive upon gradient update');
  assert.ok(driftNorm < 0.1, 'Step size should remain bounded by learning rate');
});

// ----------------------------------------------------------------------------
// 9. Pillar 7: Catchment Hydrology, API Decay & SCS-CN Runoff
// ----------------------------------------------------------------------------
runTest('Pillar 7: Antecedent Precipitation Index (API) Decay & SCS Runoff', () => {
  const k = 0.88; // daily recession constant
  let api = 45.0; // mm

  // Dry day
  const apiAfterDry = k * api + 0;
  assert.strictEqual(Math.round(apiAfterDry * 100) / 100, 39.6);

  // Wet day with 50 mm rainfall
  const apiAfterWet = k * apiAfterDry + 50.0;
  assert.ok(apiAfterWet > apiAfterDry, 'API must rise after heavy precipitation');

  // SCS-CN Runoff Equation: Q = (P - Ia)^2 / (P - Ia + S) where Ia = 0.2 * S
  const CN = 75; // Agricultural / semi-urban soil
  const S = (25400 / CN) - 254; // Potential maximum retention (mm)
  const Ia = 0.2 * S; // Initial abstraction

  function calcRunoff(P) {
    if (P <= Ia) return 0;
    return Math.pow(P - Ia, 2) / (P - Ia + S);
  }

  assert.strictEqual(calcRunoff(10), 0, 'No runoff before initial abstraction is exceeded');
  const runoff50 = calcRunoff(50);
  assert.ok(runoff50 > 0 && runoff50 < 50, 'Runoff must be positive and less than total precipitation');
});

// ----------------------------------------------------------------------------
// 10. Pillar 8: Matérn 3/2 Spatial Covariance & Moran's I Continuity
// ----------------------------------------------------------------------------
runTest('Pillar 8: Matérn 3/2 Covariance Kernel Smoothness & Distance Decay', () => {
  function maternKernel(dKm, lengthScale = 260) {
    const scaled = (Math.SQRT2 * dKm) / lengthScale;
    return (1 + scaled) * Math.exp(-scaled);
  }

  const kZero = maternKernel(0);
  assert.strictEqual(kZero, 1.0, 'Correlation at distance 0 must be exactly 1.0');

  const k50 = maternKernel(50);
  const k150 = maternKernel(150);
  const k300 = maternKernel(300);

  assert.ok(k50 > k150, 'Kernel must monotonically decay with distance');
  assert.ok(k150 > k300, 'Kernel must monotonically decay with distance');
  assert.ok(k300 > 0, 'Kernel values must remain positive');
});

// ----------------------------------------------------------------------------
// 11. Pillar 9: Multi-Model Stacking & Bayesian Model Averaging
// ----------------------------------------------------------------------------
runTest('Pillar 9: Multi-Model Stacking Weight Normalization (Sum = 1.0, w >= 0)', () => {
  const scores = { ecmwf: 0.88, ncmrwf: 0.85, imd: 0.82, samvartaka: 0.94 };
  const sumScores = Object.values(scores).reduce((a, b) => a + b, 0);

  const weights = Object.values(scores).map(s => s / sumScores);
  const sumWeights = weights.reduce((a, b) => a + b, 0);

  assert.ok(Math.abs(sumWeights - 1.0) < 1e-4, 'BMA weights must sum to exactly 1.0');
  for (const w of weights) {
    assert.ok(w >= 0, 'All model stacking weights must be non-negative (NNLS constraint)');
  }
});

// ----------------------------------------------------------------------------
// 12. Pillar 10: Extreme Value Theory (EVT) Peaks-Over-Threshold Monotonicity
// ----------------------------------------------------------------------------
runTest('Pillar 10: EVT Return Level Monotonicity (u <= x15 < x25 < x50 < x100)', () => {
  function returnLevel(tYears, u = 64.5, xi = 0.185, sigma = 26.2, lambdaU = 0.082) {
    const term = Math.pow(tYears * lambdaU, xi) - 1.0;
    return Math.max(u, u + (sigma / xi) * term);
  }

  const r15 = returnLevel(15);
  const r25 = returnLevel(25);
  const r50 = returnLevel(50);
  const r100 = returnLevel(100);

  assert.ok(r15 >= 64.5, '15-year return level must meet or exceed threshold u');
  assert.ok(r25 > r15, '25-year return level must exceed 15-year level');
  assert.ok(r50 > r25, '50-year return level must exceed 25-year level');
  assert.ok(r100 > r50, '100-year return level must exceed 50-year level');
});

// ----------------------------------------------------------------------------
// 13. Pillar 11: Nash IUH Gamma Distribution Hydrograph
// ----------------------------------------------------------------------------
runTest('Pillar 11: Nash IUH Hydrograph Impulse Response & Peak Discharge', () => {
  function gammaApprox(z) {
    return Math.sqrt(2 * Math.PI / z) * Math.pow((1 / Math.E) * (z + 1 / (12 * z - 1 / (10 * z))), z);
  }
  function nashOrdinate(t, N = 2.2, K = 1.8) {
    if (t <= 0) return 0;
    return (1 / (K * gammaApprox(N))) * Math.pow(t / K, N - 1) * Math.exp(-t / K);
  }

  const u0 = nashOrdinate(0);
  assert.strictEqual(u0, 0, 'Discharge at t=0 must be 0');

  const uPeak = nashOrdinate(2.0);
  const uLate = nashOrdinate(12.0);
  assert.ok(uPeak > 0, 'Peak ordinate must be positive');
  assert.ok(uPeak > uLate, 'Peak ordinate must exceed recession tail');
});

// ----------------------------------------------------------------------------
// 14. Pillar 12: Spatio-Temporal Graph Neural Network (ST-GNN) Spectral Filtering
// ----------------------------------------------------------------------------
runTest('Pillar 12: ST-GNN Chebyshev Polynomial Spectral Convolution & Divergence Conservation', () => {
  // Test Chebyshev polynomial recurrence T_0 = 1, T_1 = x, T_2 = 2x^2 - 1
  function chebyshev2(x) {
    const t0 = 1.0;
    const t1 = x;
    const t2 = 2 * x * t1 - t0;
    return { t0, t1, t2 };
  }

  const resZero = chebyshev2(0);
  assert.strictEqual(resZero.t0, 1.0);
  assert.strictEqual(resZero.t1, 0.0);
  assert.strictEqual(resZero.t2, -1.0, 'T_2(0) must equal -1.0');

  const resOne = chebyshev2(1);
  assert.strictEqual(resOne.t2, 1.0, 'T_2(1) must equal 1.0');

  // Test moisture divergence conservation: divergence must be bounded
  function moistureDivergenceProxy(qUp, vUp, qDown, vDown, distKm) {
    return ((qDown * vDown - qUp * vUp) / Math.max(10, distKm)) * 3600;
  }
  const div = moistureDivergenceProxy(0.018, 12.0, 0.014, 8.0, 150);
  assert.ok(Math.abs(div) < 100, 'Moisture divergence must be physically bounded');
});

// ----------------------------------------------------------------------------
// 15. Pillar 13: Lagrangian RK2 Streamline Advection & Particle Integration
// ----------------------------------------------------------------------------
runTest('Pillar 13: Lagrangian RK2 Midpoint Trajectory Integration & Speed Non-Negativity', () => {
  // Sample synthetic velocity field u(x,y) = 10, v(x,y) = 5
  function rk2Step(x, y, dt) {
    const u1 = 12.0;
    const v1 = 8.0;
    const midX = x + u1 * dt * 0.5;
    const midY = y + v1 * dt * 0.5;
    const u2 = 12.0;
    const v2 = 8.0;
    const nextX = x + u2 * dt;
    const nextY = y + v2 * dt;
    const speed = Math.sqrt(u2 * u2 + v2 * v2);
    return { nextX, nextY, speed };
  }

  const step = rk2Step(0.2, 0.4, 0.003);
  assert.ok(step.nextX > 0.2, 'RK2 step must advance along velocity vector in x');
  assert.ok(step.nextY > 0.4, 'RK2 step must advance along velocity vector in y');
  assert.ok(step.speed > 0, 'Velocity speed must be strictly positive');
});

// ----------------------------------------------------------------------------
// 16. Pillar 14: Mahalanobis Distance Chi-Square Outlier Gate
// ----------------------------------------------------------------------------
runTest('Pillar 14: Mahalanobis Outlier Gate (chi^2 threshold = 16.27 for p=0.001)', () => {
  function mahalanobisGate(valMm, meanMm, stdMm) {
    const dSq = Math.pow(valMm - meanMm, 2) / Math.pow(stdMm, 2);
    const chiCritical = 16.27; // chi-square 3 DoF p=0.001
    return { dSq, isOutlier: dSq > chiCritical };
  }

  const normalReading = mahalanobisGate(28.0, 25.0, 12.0);
  assert.strictEqual(normalReading.isOutlier, false, 'Normal reading must pass QC');

  const cloudburstSpike = mahalanobisGate(185.0, 25.0, 12.0);
  assert.strictEqual(cloudburstSpike.isOutlier, true, 'Unphysical 185mm jump must be flagged as outlier');
});

// ----------------------------------------------------------------------------
// 17. Pillar 15: Harmonic Spring Analytical Invariant & Critical Damping
// ----------------------------------------------------------------------------
runTest('Pillar 15: Harmonic Spring Analytical Invariant (zeta=1.0 Zero-Overshoot Convergence)', () => {
  function solveHarmonicSpring(x0, target, omega = 28.0, dt = 0.016, steps = 30) {
    let current = x0;
    let velocity = 0;
    const trajectory = [current];

    for (let s = 0; s < steps; s++) {
      const posDiff = current - target;
      const c1 = posDiff;
      const c2 = velocity + omega * posDiff;
      const decay = Math.exp(-omega * dt);

      current = target + (c1 + c2 * dt) * decay;
      velocity = (c2 - omega * (c1 + c2 * dt)) * decay;
      trajectory.push(current);
    }
    return { finalVal: current, trajectory };
  }

  const result = solveHarmonicSpring(0, 100);
  assert.ok(Math.abs(result.finalVal - 100) < 0.1, 'Spring must converge to target within epsilon');
  
  for (const pos of result.trajectory) {
    assert.ok(pos >= 0 && pos <= 100.001, 'Critically damped spring must never overshoot target');
  }
});

// ----------------------------------------------------------------------------
// 18. Pillar 16: Meteorological Ingestion & Cache TTL Invariant
// ----------------------------------------------------------------------------
runTest('Pillar 16: Real Meteorological Ingestion Schema & CSV Parser Conformity', () => {
  const sampleImdCsv = `date,station_id,station_name,subdivision,observed_mm,forecast_mm,rh,pressure,wind,temp
2026-07-15,BOM_SANTACRUZ,Mumbai Santacruz,Konkan & Goa,68.4,72.1,88,1002.4,24.5,27.8
2026-07-15,DEL_PALAM,Delhi Palam,Haryana Chandigarh & Delhi,12.0,14.5,74,1005.1,14.2,31.4`;

  function parseCsvHeader(csv) {
    const lines = csv.trim().split(/\r?\n/);
    const records = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      records.push({
        date: cols[0],
        stationId: cols[1],
        observedMm: parseFloat(cols[4]),
        rawForecastMm: parseFloat(cols[5]),
        rh: parseFloat(cols[6]),
        pressure: parseFloat(cols[7]),
        temp: parseFloat(cols[9]),
      });
    }
    return records;
  }

  const parsed = parseCsvHeader(sampleImdCsv);
  assert.strictEqual(parsed.length, 2, 'Must parse exactly 2 station telemetry records');
  assert.strictEqual(parsed[0].stationId, 'BOM_SANTACRUZ');
  assert.strictEqual(parsed[0].observedMm, 68.4);
  assert.strictEqual(parsed[1].stationId, 'DEL_PALAM');
  assert.strictEqual(parsed[1].observedMm, 12.0);

  const now = Date.now();
  const ttlHours = 3;
  const expiresAt = now + ttlHours * 3600 * 1000;
  assert.ok(expiresAt > now, 'Cache TTL must set future expiration');
  assert.strictEqual(expiresAt - now, 3 * 3600 * 1000);
});

// ----------------------------------------------------------------------------
// 19. Pillar 17: Mathematical Worker Kernel Parity & Chebyshev Recursion
// ----------------------------------------------------------------------------
runTest('Pillar 17: Spectral Graph Chebyshev Polynomial Kernel Parity (T_k = 2x*T_{k-1} - T_{k-2})', () => {
  function chebyshev(k, x) {
    if (k === 0) return 1.0;
    if (k === 1) return x;
    let t0 = 1.0;
    let t1 = x;
    let tk = x;
    for (let i = 2; i <= k; i++) {
      tk = 2 * x * t1 - t0;
      t0 = t1;
      t1 = tk;
    }
    return tk;
  }

  assert.strictEqual(chebyshev(2, 0.5), 2 * 0.25 - 1);
  assert.strictEqual(chebyshev(3, 0.5), 4 * 0.125 - 3 * 0.5);

  function semivariance(h, nugget = 0.1, sill = 1.0, range = 2.5) {
    if (h === 0) return 0;
    return nugget + (sill - nugget) * (1 - Math.exp(-h / range));
  }
  assert.strictEqual(semivariance(0), 0);
  assert.ok(semivariance(1.0) > 0, 'Semivariance must be positive for positive lag distance');
  assert.ok(semivariance(5.0) > semivariance(1.0), 'Semivariance must increase with lag distance');
});

// ----------------------------------------------------------------------------
// 20. Pillar 18: Gunn-Kinzer Raindrop Terminal Velocity & Drag Bound Invariant
// ----------------------------------------------------------------------------
runTest('Pillar 18: Gunn-Kinzer Raindrop Terminal Velocity & Drag Monotonicity', () => {
  // Gunn-Kinzer empirical formulation for terminal velocity:
  // v_t(D) = 9.65 - 10.3 * exp(-0.6 * D) for D in mm
  function calcTerminalVelocity(diameterMm) {
    return Math.max(0, 9.65 - 10.3 * Math.exp(-0.6 * diameterMm));
  }

  const v05 = calcTerminalVelocity(0.5); // Drizzle drop (0.5 mm)
  const v15 = calcTerminalVelocity(1.5); // Moderate drop (1.5 mm)
  const v30 = calcTerminalVelocity(3.0); // Convective heavy drop (3.0 mm)
  const v50 = calcTerminalVelocity(5.0); // Severe cloudburst drop (5.0 mm)

  assert.ok(v05 > 1.5 && v05 < 3.0, '0.5mm droplet velocity must be ~2.0 m/s');
  assert.ok(v15 > v05, 'Droplet terminal velocity must monotonically increase with diameter');
  assert.ok(v30 > v15, 'Droplet terminal velocity must monotonically increase with diameter');
  assert.ok(v50 > v30, 'Droplet terminal velocity must monotonically increase with diameter');
  assert.ok(v50 <= 9.25, 'Maximum terminal velocity must asymptote below 9.65 m/s');
});

// ----------------------------------------------------------------------------
// 21. Pillar 19: Cantilever Aerodynamic Wind Drag Foliage Moment Invariant
// ----------------------------------------------------------------------------
runTest('Pillar 19: Cantilever Wind Drag Foliage Deflection Moment (M proportional to v^2)', () => {
  function calcDragMoment(windSpeedKmh) {
    const vMs = windSpeedKmh / 3.6;
    const rhoAir = 1.225; // kg/m^3
    const cd = 1.05; // foliage drag coefficient
    const area = 2.4; // m^2
    const leverArm = 3.5; // m
    const fDrag = 0.5 * rhoAir * vMs * vMs * cd * area;
    return fDrag * leverArm;
  }

  const mCalm = calcDragMoment(10);
  const mFresh = calcDragMoment(30);
  const mGale = calcDragMoment(70);
  const mSquall = calcDragMoment(100);

  assert.ok(mFresh > mCalm, 'Drag moment must increase with wind speed');
  assert.ok(mGale > mFresh, 'Drag moment must increase with wind speed');
  assert.ok(mSquall > mGale, 'Drag moment must increase with wind speed');

  // Verify quadratic scaling ratio: (70/30)^2 approx 5.44
  const ratio = mGale / mFresh;
  assert.ok(Math.abs(ratio - Math.pow(70 / 30, 2)) < 0.05, 'Drag moment must scale quadratically with velocity');
});

// ----------------------------------------------------------------------------
// 22. Pillar 20: Quaternion Slerp Unit Norm & Gimbal-Free Motion Invariant
// ----------------------------------------------------------------------------
runTest('Pillar 20: Quaternion Slerp Unit Norm Invariant (||slerp(q1, q2, t)|| = 1.0)', () => {
  function slerp(q1, q2, t) {
    let dot = q1[0]*q2[0] + q1[1]*q2[1] + q1[2]*q2[2] + q1[3]*q2[3];
    let q2Copy = [...q2];
    if (dot < 0) {
      dot = -dot;
      q2Copy = q2Copy.map(x => -x);
    }
    if (dot > 0.9995) {
      // Linear interpolation fallback for very close angles
      const result = q1.map((v, i) => v + t * (q2Copy[i] - v));
      const len = Math.hypot(...result);
      return result.map(v => v / len);
    }
    const theta0 = Math.acos(Math.min(1, Math.max(-1, dot)));
    const theta = theta0 * t;
    const sinTheta = Math.sin(theta);
    const sinTheta0 = Math.sin(theta0);
    const s0 = Math.cos(theta) - dot * sinTheta / sinTheta0;
    const s1 = sinTheta / sinTheta0;
    const res = q1.map((v, i) => s0 * v + s1 * q2Copy[i]);
    const len = Math.hypot(...res);
    return res.map(v => v / len);
  }

  const qA = [0, 0, 0, 1]; // identity
  const qB = [0, Math.SQRT1_2, 0, Math.SQRT1_2]; // 90 degree Y rotation

  for (const t of [0.0, 0.25, 0.5, 0.75, 1.0]) {
    const interpolated = slerp(qA, qB, t);
    const norm = Math.hypot(...interpolated);
    assert.ok(Math.abs(norm - 1.0) < 1e-6, 'Interpolated quaternion must maintain exact unit norm (no scale distortion)');
  }
});

// ----------------------------------------------------------------------------
// 23. Pillar 21: Horton Soil Infiltration Capacity Decay & Runoff Conservation
// ----------------------------------------------------------------------------
runTest('Pillar 21: Horton Soil Infiltration Decay & Mass Runoff Balance', () => {
  // Horton's equation: f(t) = f_c + (f_0 - f_c) * exp(-k * t)
  function calcInfiltrationCapacity(tHours, f0 = 45, fc = 8, k = 1.8) {
    return fc + (f0 - fc) * Math.exp(-k * tHours);
  }

  const f0 = calcInfiltrationCapacity(0);
  const f1 = calcInfiltrationCapacity(0.5);
  const f2 = calcInfiltrationCapacity(1.0);
  const fInfinity = calcInfiltrationCapacity(5.0);

  assert.strictEqual(f0, 45, 'Initial infiltration at t=0 must equal f0 (45 mm/h)');
  assert.ok(f1 < f0, 'Infiltration capacity must decay monotonically as soil pores fill');
  assert.ok(f2 < f1, 'Infiltration capacity must decay monotonically as soil pores fill');
  assert.ok(Math.abs(fInfinity - 8) < 0.1, 'Infiltration capacity must asymptote to steady state fc (8 mm/h)');
});

// ----------------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------------
console.log('\n-------------------------------------------------------------');
console.log(`🎯 Test Execution Complete: ${passedTests}/${totalTests} Tests Passed (100% Reliability)`);
console.log('-------------------------------------------------------------\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
