const fs = require('fs');
let content = fs.readFileSync('src/components/ForecastChart.tsx', 'utf-8');

// Find the entire chartData block
const blockRegex = /const chartData = data\.slice\(0, 60\)\.map\(\(d\) => \(\{[\s\S]*?\}\)\);/;

const replacement = `const chartData = data.slice(0, 60).map((d) => {
    const mmdd = d.date.length >= 10 ? d.date.substring(5) : d.date; // MM-DD
    
    let compObs = undefined;
    let compAi = undefined;
    
    if (isComparing && compareData.length > 0) {
      const compMatch = compareData.find(cd => (cd.date.length >= 10 ? cd.date.substring(5) : cd.date) === mmdd);
      if (compMatch) {
        compObs = compMatch.observedMm;
        compAi = compMatch.correctedForecastMm;
      }
    }

    return {
      date: mmdd,
      fullDate: d.date,
      year: d.year,
      observed: d.observedMm,
      rawForecast: d.rawForecastMm,
      baseline: d.baselineLinearMm,
      aiCorrected: d.correctedForecastMm,
      rawError: Math.round(Math.abs(d.rawForecastMm - d.observedMm) * 10) / 10,
      aiError: Math.round(Math.abs(d.correctedForecastMm - d.observedMm) * 10) / 10,
      regime: d.detectedRegime,
      humidity: d.relativeHumidity850hPa,
      pressure: d.surfacePressureHpa,
      compareObserved: compObs,
      compareAiCorrected: compAi,
    };
  });`;

content = content.replace(blockRegex, replacement);
fs.writeFileSync('src/components/ForecastChart.tsx', content);
console.log('fixed chartData');
