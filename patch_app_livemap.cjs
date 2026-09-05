const fs = require('fs');
let appContent = fs.readFileSync('src/App.tsx', 'utf-8');

appContent = appContent.replace(
  `<LiveMap selectedStationId={selectedStationId} />`,
  `<LiveMap selectedStationId={selectedStationId} data={filteredData} />`
);

fs.writeFileSync('src/App.tsx', appContent);
console.log('patched App.tsx LiveMap props');
