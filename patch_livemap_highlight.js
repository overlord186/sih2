import fs from 'fs';
let content = fs.readFileSync('src/components/LiveMap.tsx', 'utf8');

// Replace the filteredStations.filter logic with just map, but determine if we need to highlight
const mapLineOld = `{filteredStations.filter((station) => {
            if (selectedRegimeFilter === 'ALL') return true;
            const stats = stationStats[station.id];
            const safeAI = (stats && stats.count > 0) ? (stats.ai / stats.count) : 0;
            const avgAI = (typeof safeAI !== 'number' || isNaN(safeAI) || !isFinite(safeAI)) ? 0 : safeAI;
            const isDeluge = avgAI >= 64.5;
            const isModerate = avgAI >= 15.5 && avgAI < 64.5;
            const isLight = avgAI >= 2.5 && avgAI < 15.5;
            const isDry = avgAI < 2.5;
            if (selectedRegimeFilter === 'DELUGE') return isDeluge;
            if (selectedRegimeFilter === 'MODERATE') return isModerate;
            if (selectedRegimeFilter === 'LIGHT') return isLight;
            if (selectedRegimeFilter === 'DRY') return isDry;
            return true;
          }).map((station) => {`;

const mapLineNew = `{filteredStations.map((station) => {`;

if (content.includes(mapLineOld)) {
    content = content.replace(mapLineOld, mapLineNew);
} else {
    console.log("Could not find the old .filter block.");
}

// Now we need to update the HTML generation inside the map loop.
// Let's replace the html generation block.
const htmlBlockOld = `const html = \`<div class="relative flex items-center justify-center cursor-pointer group" style="width: \${sizeBase}px; height: \${sizeBase}px;">
              \${(isDeluge || isModerate) ? \`<div class="absolute inset-0 \${colorClass} rounded-full \${pulseClass} opacity-60"></div>\` : ''}
              <div class="relative w-full h-full \${colorClass} \${shapeClass} border-2 \${isActive ? 'border-white ring-2 ring-blue-500 shadow-xl z-20 scale-110' : 'border-white/80 opacity-90 shadow-sm'} transition-transform duration-300 group-hover:scale-125"></div>
            </div>\`;`;

const htmlBlockNew = `
            let isHighlighted = true;
            if (selectedRegimeFilter !== 'ALL') {
              if (selectedRegimeFilter === 'DELUGE' && !isDeluge) isHighlighted = false;
              if (selectedRegimeFilter === 'MODERATE' && !isModerate) isHighlighted = false;
              if (selectedRegimeFilter === 'LIGHT' && !isLight) isHighlighted = false;
              if (selectedRegimeFilter === 'DRY' && !isDry) isHighlighted = false;
            }

            const opacityClass = isHighlighted ? 'opacity-100' : 'opacity-20 grayscale';
            const html = \`<div class="relative flex items-center justify-center cursor-pointer group transition-all duration-300 \${opacityClass}" style="width: \${sizeBase}px; height: \${sizeBase}px;">
              \${(isDeluge || isModerate) && isHighlighted ? \`<div class="absolute inset-0 \${colorClass} rounded-full \${pulseClass} opacity-60"></div>\` : ''}
              <div class="relative w-full h-full \${colorClass} \${shapeClass} border-2 \${isActive ? 'border-white ring-2 ring-blue-500 shadow-xl z-20 scale-110' : 'border-white/80 shadow-sm'} transition-transform duration-300 \${isHighlighted ? 'group-hover:scale-125' : ''}"></div>
            </div>\`;`;

if (content.includes(htmlBlockOld)) {
    content = content.replace(htmlBlockOld, htmlBlockNew);
    console.log("Patched HTML block successfully.");
} else {
    // If exact match fails, use regex or manual replace
    console.log("Could not find the exact old HTML block.");
}

fs.writeFileSync('src/components/LiveMap.tsx', content);
