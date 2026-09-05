const fs = require('fs');
let content = fs.readFileSync('src/components/LiveMap.tsx', 'utf-8');

const oldLogic = `const avgObs = (isNaN(safeObs) || !isFinite(safeObs) || safeObs === null) ? 0 : safeObs;
            const avgAI = (isNaN(safeAI) || !isFinite(safeAI) || safeAI === null) ? 0 : safeAI;
            const avgRaw = (isNaN(safeRaw) || !isFinite(safeRaw) || safeRaw === null) ? 0 : safeRaw;`;

const newLogic = `const avgObs = (typeof safeObs !== 'number' || isNaN(safeObs) || !isFinite(safeObs)) ? 0 : safeObs;
            const avgAI = (typeof safeAI !== 'number' || isNaN(safeAI) || !isFinite(safeAI)) ? 0 : safeAI;
            const avgRaw = (typeof safeRaw !== 'number' || isNaN(safeRaw) || !isFinite(safeRaw)) ? 0 : safeRaw;`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('src/components/LiveMap.tsx', content);
console.log('patched LiveMap NaN bug 13');
