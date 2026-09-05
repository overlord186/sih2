const fs = require('fs');
let content = fs.readFileSync('src/components/ForecastChart.tsx', 'utf-8');

content = content.replace(
  `  const chartData = data.slice(0, 60).map((d) => {`,
  `  console.log('ForecastChart rendering. isComparing:', isComparing, 'compareData length:', compareData.length);
  const chartData = data.slice(0, 60).map((d) => {`
);

fs.writeFileSync('src/components/ForecastChart.tsx', content);
console.log('patched log');
