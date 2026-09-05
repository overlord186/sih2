const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const oldLogic = `// Compute summary metrics
  const metrics = useMemo(() => calculateMetrics(filteredData), [filteredData]);`;

const newLogic = `// Compute summary metrics
  const safeMetrics = useMemo(() => calculateMetrics(filteredData), [filteredData]);
  const metrics = {
    maeRaw: (typeof safeMetrics.maeRaw === 'number' && !isNaN(safeMetrics.maeRaw) && isFinite(safeMetrics.maeRaw)) ? safeMetrics.maeRaw : 0,
    maeCorrected: (typeof safeMetrics.maeCorrected === 'number' && !isNaN(safeMetrics.maeCorrected) && isFinite(safeMetrics.maeCorrected)) ? safeMetrics.maeCorrected : 0,
    rmseRaw: (typeof safeMetrics.rmseRaw === 'number' && !isNaN(safeMetrics.rmseRaw) && isFinite(safeMetrics.rmseRaw)) ? safeMetrics.rmseRaw : 0,
    rmseCorrected: (typeof safeMetrics.rmseCorrected === 'number' && !isNaN(safeMetrics.rmseCorrected) && isFinite(safeMetrics.rmseCorrected)) ? safeMetrics.rmseCorrected : 0,
    threatScoreRaw: (typeof safeMetrics.threatScoreRaw === 'number' && !isNaN(safeMetrics.threatScoreRaw) && isFinite(safeMetrics.threatScoreRaw)) ? safeMetrics.threatScoreRaw : 0,
    threatScoreCorrected: (typeof safeMetrics.threatScoreCorrected === 'number' && !isNaN(safeMetrics.threatScoreCorrected) && isFinite(safeMetrics.threatScoreCorrected)) ? safeMetrics.threatScoreCorrected : 0,
  };`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('src/App.tsx', content);
console.log('patched App NaN');
