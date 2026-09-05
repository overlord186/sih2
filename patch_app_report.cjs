const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Add import
content = content.replace(
  "import { LightningFlashOverlay } from './components/LightningFlashOverlay';",
  "import { LightningFlashOverlay } from './components/LightningFlashOverlay';\nimport { generateForecastReport } from './utils/report';"
);

// Add download handler
const searchHeader = `<Header
        selectedStationId={selectedStationId}
        onStationChange={setSelectedStationId}`;

const newHeader = `const handleDownloadReport = () => {
    generateForecastReport(
      activeStationName,
      selectedYear,
      selectedLeadTime,
      metrics,
      regimeBreakdowns
    );
  };

  <Header
        onDownloadReport={handleDownloadReport}
        selectedStationId={selectedStationId}
        onStationChange={setSelectedStationId}`;

content = content.replace(searchHeader, newHeader);

fs.writeFileSync('src/App.tsx', content);
console.log('patched App.tsx for report');
