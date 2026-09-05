const fs = require('fs');
let content = fs.readFileSync('src/components/LiveMap.tsx', 'utf-8');

// The issue might be that stats is undefined for some stations, or d.observedRainfall etc are undefined/NaN.
const oldLogic = `// Calculate averages from dataset, ensuring no NaN
            const avgObs = (stats && stats.count > 0) ? stats.obs / stats.count : 0;
            const avgAI = (stats && stats.count > 0) ? stats.ai / stats.count : 0;
            const avgRaw = (stats && stats.count > 0) ? stats.fcst / stats.count : 0;`;

const newLogic = `// Calculate averages from dataset, ensuring no NaN and defaults to 0
            const avgObs = (stats && stats.count > 0 && !isNaN(stats.obs)) ? stats.obs / stats.count : 0;
            const avgAI = (stats && stats.count > 0 && !isNaN(stats.ai)) ? stats.ai / stats.count : 0;
            const avgRaw = (stats && stats.count > 0 && !isNaN(stats.fcst)) ? stats.fcst / stats.count : 0;`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('src/components/LiveMap.tsx', content);
console.log('patched LiveMap NaN bug 2');
