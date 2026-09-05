const fs = require('fs');
let content = fs.readFileSync('src/data/monsoonDataset.ts', 'utf-8');

// There must be a string or undefined slipping through the raw data generation.
// Let's patch the raw data array export to ensure all generated numbers are safe floats.
const oldExport = `export const MONSOON_DATASET = rawData;`;

const newExport = `export const MONSOON_DATASET = rawData.map(d => ({
  ...d,
  observedRainfall: (typeof d.observedRainfall === 'number' && !isNaN(d.observedRainfall)) ? d.observedRainfall : 0,
  forecastRainfall: (typeof d.forecastRainfall === 'number' && !isNaN(d.forecastRainfall)) ? d.forecastRainfall : 0,
  baselineCorrectedRainfall: (typeof d.baselineCorrectedRainfall === 'number' && !isNaN(d.baselineCorrectedRainfall)) ? d.baselineCorrectedRainfall : 0,
  aiCorrectedRainfall: (typeof d.aiCorrectedRainfall === 'number' && !isNaN(d.aiCorrectedRainfall)) ? d.aiCorrectedRainfall : 0,
}));`;

content = content.replace(oldLogic, newLogic); // WAIT let's check the file first.
