const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Remove the broken part inside JSX
content = content.replace(`          {/* App Header & Navigation */}
          const handleDownloadReport = () => {
    generateForecastReport(
      activeStationName,
      selectedYear,
      selectedLeadTime,
      metrics,
      regimeBreakdowns
    );
  };

  <Header`, `          {/* App Header & Navigation */}
          <Header`);

// Add it before the return
content = content.replace(`return (
    <>
      <RainOverlay`, `const handleDownloadReport = () => {
    generateForecastReport(
      activeStationName,
      selectedYear,
      selectedLeadTime,
      metrics,
      regimeBreakdowns
    );
  };

  return (
    <>
      <RainOverlay`);

// Update Header to use the handler again (since we replaced <Header above without the prop)
content = content.replace(`<Header
        selectedStationId`, `<Header
        onDownloadReport={handleDownloadReport}
        selectedStationId`);

fs.writeFileSync('src/App.tsx', content);
console.log('fixed App.tsx JSX');
