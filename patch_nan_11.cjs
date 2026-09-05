const fs = require('fs');
let content = fs.readFileSync('src/components/LiveMap.tsx', 'utf-8');

const oldLogic = `// Calculate averages from dataset, safely defaulting to 0 to prevent NaN
            const safeObs = (stats && stats.count > 0) ? (stats.obs / stats.count) : 0;
            const safeAI = (stats && stats.count > 0) ? (stats.ai / stats.count) : 0;
            const safeRaw = (stats && stats.count > 0) ? (stats.fcst / stats.count) : 0;
            
            const avgObs = (isNaN(safeObs) || !isFinite(safeObs)) ? 0 : safeObs;
            const avgAI = (isNaN(safeAI) || !isFinite(safeAI)) ? 0 : safeAI;
            const avgRaw = (isNaN(safeRaw) || !isFinite(safeRaw)) ? 0 : safeRaw;`;

const newLogic = `// Calculate averages from dataset, safely defaulting to 0 to prevent NaN
            const safeObs = (stats && stats.count > 0) ? (stats.obs / stats.count) : 0;
            const safeAI = (stats && stats.count > 0) ? (stats.ai / stats.count) : 0;
            const safeRaw = (stats && stats.count > 0) ? (stats.fcst / stats.count) : 0;
            
            const avgObs = (isNaN(safeObs) || !isFinite(safeObs) || safeObs === null) ? 0 : safeObs;
            const avgAI = (isNaN(safeAI) || !isFinite(safeAI) || safeAI === null) ? 0 : safeAI;
            const avgRaw = (isNaN(safeRaw) || !isFinite(safeRaw) || safeRaw === null) ? 0 : safeRaw;`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('src/components/LiveMap.tsx', content);
console.log('patched LiveMap NaN bug 11');
