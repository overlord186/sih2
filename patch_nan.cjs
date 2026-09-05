const fs = require('fs');
let content = fs.readFileSync('src/components/LiveMap.tsx', 'utf-8');

const oldLogic = `// Calculate averages from dataset
            const avgObs = stats.count > 0 ? stats.obs / stats.count : 0;
            const avgAI = stats.count > 0 ? stats.ai / stats.count : 0;
            const avgRaw = stats.count > 0 ? stats.fcst / stats.count : 0;`;

const newLogic = `// Calculate averages from dataset, ensuring no NaN
            const avgObs = (stats && stats.count > 0) ? stats.obs / stats.count : 0;
            const avgAI = (stats && stats.count > 0) ? stats.ai / stats.count : 0;
            const avgRaw = (stats && stats.count > 0) ? stats.fcst / stats.count : 0;`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('src/components/LiveMap.tsx', content);
console.log('patched LiveMap NaN bug');
