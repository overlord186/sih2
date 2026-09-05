const fs = require('fs');
let code = fs.readFileSync('src/components/LiveMap.tsx', 'utf8');
code = code.replace(
  '{is3DMode ? <InteractiveGlobe /> :',
  '{is3DMode ? <InteractiveGlobe stationStats={stationStats} selectedStationId={selectedStationId} /> :'
);
fs.writeFileSync('src/components/LiveMap.tsx', code);
