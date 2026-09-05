const fs = require('fs');
let content = fs.readFileSync('src/components/MetricCards.tsx', 'utf-8');

const oldLogic = `export const MetricCards: React.FC<MetricCardsProps> = ({ metrics }) => {
  const maeReduction =
    metrics.maeRaw > 0
      ? Math.round(((metrics.maeRaw - metrics.maeCorrected) / metrics.maeRaw) * 100)
      : 0;

  const rmseReduction =
    metrics.rmseRaw > 0
      ? Math.round(((metrics.rmseRaw - metrics.rmseCorrected) / metrics.rmseRaw) * 100)
      : 0;

  const threatScoreGain =
    metrics.threatScoreRaw > 0
      ? Math.round(
          ((metrics.threatScoreCorrected - metrics.threatScoreRaw) /
            metrics.threatScoreRaw) *
            100
        )
      : 0;`;

const newLogic = `export const MetricCards: React.FC<MetricCardsProps> = ({ metrics }) => {
  const safeNumber = (num) => (typeof num === 'number' && !isNaN(num) && isFinite(num) ? num : 0);
  
  const maeRaw = safeNumber(metrics.maeRaw);
  const maeCorrected = safeNumber(metrics.maeCorrected);
  const rmseRaw = safeNumber(metrics.rmseRaw);
  const rmseCorrected = safeNumber(metrics.rmseCorrected);
  const threatScoreRaw = safeNumber(metrics.threatScoreRaw);
  const threatScoreCorrected = safeNumber(metrics.threatScoreCorrected);

  const maeReduction =
    maeRaw > 0
      ? Math.round(((maeRaw - maeCorrected) / maeRaw) * 100)
      : 0;

  const rmseReduction =
    rmseRaw > 0
      ? Math.round(((rmseRaw - rmseCorrected) / rmseRaw) * 100)
      : 0;

  const threatScoreGain =
    threatScoreRaw > 0
      ? Math.round(
          ((threatScoreCorrected - threatScoreRaw) /
            threatScoreRaw) *
            100
        )
      : 0;`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('src/components/MetricCards.tsx', content);
console.log('patched MetricCards NaN');
