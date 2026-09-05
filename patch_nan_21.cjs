const fs = require('fs');

let fcContent = fs.readFileSync('src/components/ForecastChart.tsx', 'utf-8');
const oldFC = `dataKey="forecastRainfall"`;
const oldFC2 = `d.forecastRainfall`;
fcContent = fcContent.replace(new RegExp(oldFC, 'g'), 'dataKey="rawForecastMm"');
fcContent = fcContent.replace(new RegExp(oldFC2, 'g'), 'd.rawForecastMm');
fs.writeFileSync('src/components/ForecastChart.tsx', fcContent);

console.log('Fixed more properties!');
