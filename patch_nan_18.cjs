const fs = require('fs');
let content = fs.readFileSync('src/ml/postProcessor.ts', 'utf-8');

const oldLogic = `export function calculateMetrics(data: RainfallDataPoint[]): MetricSummary {
  if (data.length === 0) {`;

const newLogic = `export function calculateMetrics(data: RainfallDataPoint[]): MetricSummary {
  if (!data || data.length === 0) {`;

content = content.replace(oldLogic, newLogic);

const oldLoop = `data.forEach((d) => {
    // 1. Raw NWP`;

const newLoop = `data.forEach((d) => {
    // Prevent NaN
    if (typeof d.observedRainfall !== 'number' || isNaN(d.observedRainfall) ||
        typeof d.forecastRainfall !== 'number' || isNaN(d.forecastRainfall) ||
        typeof d.aiCorrectedRainfall !== 'number' || isNaN(d.aiCorrectedRainfall)) {
      return;
    }
    
    // 1. Raw NWP`;

content = content.replace(oldLoop, newLoop);

fs.writeFileSync('src/ml/postProcessor.ts', content);
console.log('patched calculateMetrics NaN properly');
