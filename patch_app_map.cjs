const fs = require('fs');

let appContent = fs.readFileSync('src/App.tsx', 'utf-8');

appContent = appContent.replace(
  `import { MetricCards } from './components/MetricCards';`,
  `import { MetricCards } from './components/MetricCards';\nimport { LiveMap } from './components/LiveMap';`
);

appContent = appContent.replace(
  `{/* Time Series Visualizer */}`,
  `<LiveMap selectedStationId={selectedStationId} />
            {/* Time Series Visualizer */}`
);

fs.writeFileSync('src/App.tsx', appContent);
console.log('patched App.tsx with LiveMap');
