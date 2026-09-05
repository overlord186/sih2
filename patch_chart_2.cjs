const fs = require('fs');
let content = fs.readFileSync('src/components/ForecastChart.tsx', 'utf-8');

// In CustomTooltip we need to add compObs and compAi rendering
// Let's check CustomTooltip first
