const fs = require('fs');
let content = fs.readFileSync('src/ml/postProcessor.ts', 'utf-8');

const oldLogic = `export const calculateMetrics = (data: RainfallDataPoint[]): MetricSummary => {
  if (data.length === 0) {
    return {
      maeRaw: 0,
      maeCorrected: 0,
      rmseRaw: 0,
      rmseCorrected: 0,
      threatScoreRaw: 0,
      threatScoreCorrected: 0,
    };
  }

  let absErrRaw = 0;
  let absErrCorrected = 0;
  let sqErrRaw = 0;
  let sqErrCorrected = 0;`;

const newLogic = `export const calculateMetrics = (data: RainfallDataPoint[]): MetricSummary => {
  if (!data || data.length === 0) {
    return {
      maeRaw: 0,
      maeCorrected: 0,
      rmseRaw: 0,
      rmseCorrected: 0,
      threatScoreRaw: 0,
      threatScoreCorrected: 0,
    };
  }

  let validCount = 0;
  let absErrRaw = 0;
  let absErrCorrected = 0;
  let sqErrRaw = 0;
  let sqErrCorrected = 0;`;

content = content.replace(oldLogic, newLogic);

const oldLoop = `data.forEach((d) => {
    absErrRaw += Math.abs(d.forecastRainfall - d.observedRainfall);
    absErrCorrected += Math.abs(d.aiCorrectedRainfall - d.observedRainfall);

    sqErrRaw += Math.pow(d.forecastRainfall - d.observedRainfall, 2);
    sqErrCorrected += Math.pow(d.aiCorrectedRainfall - d.observedRainfall, 2);`;

const newLoop = `data.forEach((d) => {
    // Prevent NaN aggregation by skipping invalid records
    if (typeof d.observedRainfall !== 'number' || isNaN(d.observedRainfall) ||
        typeof d.forecastRainfall !== 'number' || isNaN(d.forecastRainfall) ||
        typeof d.aiCorrectedRainfall !== 'number' || isNaN(d.aiCorrectedRainfall)) {
      return;
    }
    
    validCount++;
    absErrRaw += Math.abs(d.forecastRainfall - d.observedRainfall);
    absErrCorrected += Math.abs(d.aiCorrectedRainfall - d.observedRainfall);

    sqErrRaw += Math.pow(d.forecastRainfall - d.observedRainfall, 2);
    sqErrCorrected += Math.pow(d.aiCorrectedRainfall - d.observedRainfall, 2);`;

content = content.replace(oldLoop, newLoop);

const oldDiv = `const n = data.length;
  const maeRaw = absErrRaw / n;
  const maeCorrected = absErrCorrected / n;
  const rmseRaw = Math.sqrt(sqErrRaw / n);
  const rmseCorrected = Math.sqrt(sqErrCorrected / n);`;

const newDiv = `const n = validCount > 0 ? validCount : 1;
  const maeRaw = absErrRaw / n;
  const maeCorrected = absErrCorrected / n;
  const rmseRaw = Math.sqrt(sqErrRaw / n);
  const rmseCorrected = Math.sqrt(sqErrCorrected / n);`;

content = content.replace(oldDiv, newDiv);

fs.writeFileSync('src/ml/postProcessor.ts', content);
console.log('patched calculateMetrics NaN');
