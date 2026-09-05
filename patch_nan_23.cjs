const fs = require('fs');
let content = fs.readFileSync('src/components/RegimeBreakdownView.tsx', 'utf-8');

const oldRegime = `maeRaw: r.maeRaw,
      maeBaseline: r.maeBaseline,
      maeCorrected: r.maeCorrected,
      improvementPct: r.improvementPct,
      biasRaw: r.biasRaw,
      biasCorrected: r.biasCorrected,`;

const newRegime = `maeRaw: typeof r.maeRaw === 'number' && !isNaN(r.maeRaw) ? r.maeRaw : 0,
      maeBaseline: typeof r.maeBaseline === 'number' && !isNaN(r.maeBaseline) ? r.maeBaseline : 0,
      maeCorrected: typeof r.maeCorrected === 'number' && !isNaN(r.maeCorrected) ? r.maeCorrected : 0,
      improvementPct: typeof r.improvementPct === 'number' && !isNaN(r.improvementPct) ? r.improvementPct : 0,
      biasRaw: typeof r.biasRaw === 'number' && !isNaN(r.biasRaw) ? r.biasRaw : 0,
      biasCorrected: typeof r.biasCorrected === 'number' && !isNaN(r.biasCorrected) ? r.biasCorrected : 0,`;

content = content.replace(oldRegime, newRegime);
fs.writeFileSync('src/components/RegimeBreakdownView.tsx', content);

console.log('Fixed RegimeBreakdownView!');
