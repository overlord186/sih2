const fs = require('fs');
let content = fs.readFileSync('src/utils/report.ts', 'utf-8');

// Wait! App.tsx passes:
// generateForecastReport(activeStationName, selectedYear, selectedLeadTime, metrics, regimeBreakdowns);
// Where regimeBreakdowns is of type: RegimeMetricBreakdown[]
// But in report.ts, I typed it as:
/*
  regimeBreakdowns: Array<{
    name: string;
    count: number;
    accuracy: number;
    avgError: number;
  }>
*/

const oldRegimeParams = `  regimeBreakdowns: Array<{
    name: string;
    count: number;
    accuracy: number;
    avgError: number;
  }>`;

const newRegimeParams = `  regimeBreakdowns: Array<{
    regime: string;
    imdThreshold: string;
    sampleCount: number;
    maeRaw: number;
    maeBaseline: number;
    maeCorrected: number;
    improvementPct: number;
    biasRaw: number;
    biasCorrected: number;
  }>`;

content = content.replace(oldRegimeParams, newRegimeParams);

// And update the mapping:
const oldRegimeMapping = `  const regimeData = regimeBreakdowns.map(r => [
    r.name,
    \`\${r.count} samples\`,
    \`\${r.accuracy.toFixed(1)}%\`,
    \`\${r.avgError.toFixed(2)} mm\`
  ]);`;

const newRegimeMapping = `  const regimeData = regimeBreakdowns.map(r => [
    r.regime,
    \`\${r.sampleCount} samples\`,
    \`+\${r.improvementPct.toFixed(1)}%\`,
    \`\${r.biasCorrected.toFixed(2)} mm\`
  ]);`;

content = content.replace(oldRegimeMapping, newRegimeMapping);

const oldRegimeHead = `    head: [['Regime', 'Frequency', 'Accuracy', 'Avg Error (Bias)']],`;
const newRegimeHead = `    head: [['Regime', 'Frequency', 'Correction Imprv.', 'Post-Bias']],`;

content = content.replace(oldRegimeHead, newRegimeHead);

fs.writeFileSync('src/utils/report.ts', content);
console.log('patched report.ts regime types');
