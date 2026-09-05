const fs = require('fs');
let content = fs.readFileSync('src/components/ForecastChart.tsx', 'utf-8');

content = content.replace(
  `{data && data.length > 0 && data[0].observedRainfall.toFixed(1)} mm`,
  `{data && data.length > 0 ? (!isNaN(data[0].observedRainfall) && isFinite(data[0].observedRainfall) ? data[0].observedRainfall.toFixed(1) : '0.0') : '0.0'} mm`
);

content = content.replace(
  `{data && data.length > 0 && data[0].aiCorrectedRainfall.toFixed(1)} mm`,
  `{data && data.length > 0 ? (!isNaN(data[0].aiCorrectedRainfall) && isFinite(data[0].aiCorrectedRainfall) ? data[0].aiCorrectedRainfall.toFixed(1) : '0.0') : '0.0'} mm`
);

fs.writeFileSync('src/components/ForecastChart.tsx', content);
console.log('patched ForecastChart NaN');
