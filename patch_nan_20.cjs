const fs = require('fs');
let content = fs.readFileSync('src/components/LiveMap.tsx', 'utf-8');

// I've been using observedRainfall instead of observedMm and forecastRainfall instead of rawForecastMm! The keys are wrong!
// Let's fix LiveMap.tsx
const oldLiveMap = `        stats[d.stationId].obs += d.observedRainfall;
        stats[d.stationId].fcst += d.forecastRainfall;
        stats[d.stationId].ai += d.aiCorrectedRainfall;`;

const newLiveMap = `        stats[d.stationId].obs += d.observedMm;
        stats[d.stationId].fcst += d.rawForecastMm;
        stats[d.stationId].ai += d.correctedForecastMm;`;

content = content.replace(oldLiveMap, newLiveMap);
fs.writeFileSync('src/components/LiveMap.tsx', content);

let ppContent = fs.readFileSync('src/ml/postProcessor.ts', 'utf-8');

const oldPP = `if (typeof d.observedRainfall !== 'number' || isNaN(d.observedRainfall) ||
        typeof d.forecastRainfall !== 'number' || isNaN(d.forecastRainfall) ||
        typeof d.aiCorrectedRainfall !== 'number' || isNaN(d.aiCorrectedRainfall)) {
      return;
    }
    
    // 1. Raw NWP
    const hitRaw = d.observedRainfall >= heavyThreshold && d.forecastRainfall >= heavyThreshold;
    const missRaw = d.observedRainfall >= heavyThreshold && d.forecastRainfall < heavyThreshold;
    const faRaw = d.observedRainfall < heavyThreshold && d.forecastRainfall >= heavyThreshold;
    
    // 2. Corrected
    const hitCor = d.observedRainfall >= heavyThreshold && d.aiCorrectedRainfall >= heavyThreshold;
    const missCor = d.observedRainfall >= heavyThreshold && d.aiCorrectedRainfall < heavyThreshold;
    const faCor = d.observedRainfall < heavyThreshold && d.aiCorrectedRainfall >= heavyThreshold;`;

const newPP = `if (typeof d.observedMm !== 'number' || isNaN(d.observedMm) ||
        typeof d.rawForecastMm !== 'number' || isNaN(d.rawForecastMm) ||
        typeof d.correctedForecastMm !== 'number' || isNaN(d.correctedForecastMm)) {
      return;
    }
    
    // 1. Raw NWP
    const hitRaw = d.observedMm >= heavyThreshold && d.rawForecastMm >= heavyThreshold;
    const missRaw = d.observedMm >= heavyThreshold && d.rawForecastMm < heavyThreshold;
    const faRaw = d.observedMm < heavyThreshold && d.rawForecastMm >= heavyThreshold;
    
    // 2. Corrected
    const hitCor = d.observedMm >= heavyThreshold && d.correctedForecastMm >= heavyThreshold;
    const missCor = d.observedMm >= heavyThreshold && d.correctedForecastMm < heavyThreshold;
    const faCor = d.observedMm < heavyThreshold && d.correctedForecastMm >= heavyThreshold;`;

ppContent = ppContent.replace(oldPP, newPP);

const oldPPLoop = `if (typeof d.observedRainfall !== 'number' || isNaN(d.observedRainfall) ||
        typeof d.forecastRainfall !== 'number' || isNaN(d.forecastRainfall) ||
        typeof d.aiCorrectedRainfall !== 'number' || isNaN(d.aiCorrectedRainfall)) {
      return;
    }
    
    validCount++;
    absErrRaw += Math.abs(d.forecastRainfall - d.observedRainfall);
    absErrCorrected += Math.abs(d.aiCorrectedRainfall - d.observedRainfall);

    sqErrRaw += Math.pow(d.forecastRainfall - d.observedRainfall, 2);
    sqErrCorrected += Math.pow(d.aiCorrectedRainfall - d.observedRainfall, 2);`;

const newPPLoop = `if (typeof d.observedMm !== 'number' || isNaN(d.observedMm) ||
        typeof d.rawForecastMm !== 'number' || isNaN(d.rawForecastMm) ||
        typeof d.correctedForecastMm !== 'number' || isNaN(d.correctedForecastMm)) {
      return;
    }
    
    validCount++;
    absErrRaw += Math.abs(d.rawForecastMm - d.observedMm);
    absErrCorrected += Math.abs(d.correctedForecastMm - d.observedMm);
    absErrBaseline += Math.abs(d.baselineLinearMm - d.observedMm);

    sqErrRaw += Math.pow(d.rawForecastMm - d.observedMm, 2);
    sqErrCorrected += Math.pow(d.correctedForecastMm - d.observedMm, 2);
    sqErrBaseline += Math.pow(d.baselineLinearMm - d.observedMm, 2);
    
    biasRawSum += (d.rawForecastMm - d.observedMm);
    biasCorrectedSum += (d.correctedForecastMm - d.observedMm);
    biasBaselineSum += (d.baselineLinearMm - d.observedMm);
    `;
    
ppContent = ppContent.replace(oldPPLoop, newPPLoop);

fs.writeFileSync('src/ml/postProcessor.ts', ppContent);

let fcContent = fs.readFileSync('src/components/ForecastChart.tsx', 'utf-8');
const oldFC = `data[0].observedRainfall`;
const oldFC2 = `data[0].aiCorrectedRainfall`;
fcContent = fcContent.replace(new RegExp(oldFC, 'g'), 'data[0].observedMm');
fcContent = fcContent.replace(new RegExp(oldFC2, 'g'), 'data[0].correctedForecastMm');
fs.writeFileSync('src/components/ForecastChart.tsx', fcContent);

console.log('Fixed properties!');
