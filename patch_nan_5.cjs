const fs = require('fs');
let content = fs.readFileSync('src/components/LiveMap.tsx', 'utf-8');

// The issue might be that stats is undefined for some stations, or d.observedRainfall etc are undefined/NaN.
const oldLogic = `// Calculate averages from dataset, safely defaulting to 0 to prevent NaN
            const avgObs = (stats && stats.count > 0 && typeof stats.obs === 'number' && !isNaN(stats.obs)) ? (stats.obs / stats.count) : 0;
            const avgAI = (stats && stats.count > 0 && typeof stats.ai === 'number' && !isNaN(stats.ai)) ? (stats.ai / stats.count) : 0;
            const avgRaw = (stats && stats.count > 0 && typeof stats.fcst === 'number' && !isNaN(stats.fcst)) ? (stats.fcst / stats.count) : 0;`;

const newLogic = `// Calculate averages from dataset, safely defaulting to 0 to prevent NaN
            const safeObs = (stats && stats.count > 0 && typeof stats.obs === 'number' && !isNaN(stats.obs)) ? (stats.obs / stats.count) : 0;
            const safeAI = (stats && stats.count > 0 && typeof stats.ai === 'number' && !isNaN(stats.ai)) ? (stats.ai / stats.count) : 0;
            const safeRaw = (stats && stats.count > 0 && typeof stats.fcst === 'number' && !isNaN(stats.fcst)) ? (stats.fcst / stats.count) : 0;
            
            const avgObs = isNaN(safeObs) ? 0 : safeObs;
            const avgAI = isNaN(safeAI) ? 0 : safeAI;
            const avgRaw = isNaN(safeRaw) ? 0 : safeRaw;`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('src/components/LiveMap.tsx', content);
console.log('patched LiveMap NaN bug 5');
