const fs = require('fs');
let content = fs.readFileSync('src/components/ForecastChart.tsx', 'utf-8');

const target = `  const chartData = data.slice(0, 60).map((d) => ({
    date: d.date.length >= 10 ? d.date.substring(5) : d.date, // MM-DD
    fullDate: d.date,
    year: d.year,
    observed: d.observedMm,
    rawForecast: d.rawForecastMm,
    baseline: d.baselineLinearMm,
    aiCorrected: d.correctedForecastMm,
    rawError: Math.round(Math.abs(d.rawForecastMm - d.observedMm) * 10) / 10,
    aiError: Math.round(Math.abs(d.correctedForecastMm - d.observedMm) * 10) / 10,
    regime: d.detectedRegime,
  }));`;

const replacement = `  const chartData = data.slice(0, 60).map((d) => {
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
      compareObserved: compObs,
      compareAiCorrected: compAi,
    };
  });`;

content = content.replace(target, replacement);

// And we need to fix the disabled year options. Let's find the select block
const selectTarget = `              {isComparing && onCompareYearChange && (
                <select
                  value={compareYear || ''}
                  onChange={(e) => onCompareYearChange(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-md px-1.5 py-1 text-xs text-slate-700 outline-none focus:border-indigo-500"
                >
                  <option value={2025} disabled={data[0]?.year === 2025}>2025</option>
                  <option value={2024} disabled={data[0]?.year === 2024}>2024</option>
                  <option value={2023} disabled={data[0]?.year === 2023}>2023</option>
                </select>
              )}`;

const selectReplacement = `              {isComparing && onCompareYearChange && (
                <select
                  value={compareYear || ''}
                  onChange={(e) => onCompareYearChange(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-md px-1.5 py-1 text-xs text-slate-700 outline-none focus:border-indigo-500"
                >
                  {/* Find the unique selected year from data or rely on a passed prop, for now don't disable so user can select anything */}
                  <option value={2025}>2025 Comparison</option>
                  <option value={2024}>2024 Comparison</option>
                  <option value={2023}>2023 Comparison</option>
                </select>
              )}`;

content = content.replace(selectTarget, selectReplacement);

fs.writeFileSync('src/components/ForecastChart.tsx', content);
console.log('patched_chartData');
