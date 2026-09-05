const fs = require('fs');

let mapContent = fs.readFileSync('src/components/LiveMap.tsx', 'utf-8');

// Fix the map tile URL
mapContent = mapContent.replace(
  `url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"`,
  `url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"`
);

// Silence Open-Meteo fetch errors from bubbling up to the UI if blocked
mapContent = mapContent.replace(
  `.catch(console.error);`,
  `.catch(() => { /* silently ignore fetch errors if adblocked */ });`
);

fs.writeFileSync('src/components/LiveMap.tsx', mapContent);
console.log('patched LiveMap.tsx');
