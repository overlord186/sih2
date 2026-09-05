const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
  '<MetricCards metrics={metrics} />',
  '<AnimatedSection delay={0.1}>\n              <MetricCards metrics={metrics} />\n            </AnimatedSection>'
);
code = code.replace(
  '<LiveMap selectedStationId={selectedStationId} data={filteredData} />',
  '<AnimatedSection delay={0.2}>\n              <LiveMap selectedStationId={selectedStationId} data={filteredData} />\n            </AnimatedSection>'
);
code = code.replace(
  '<ForecastChart',
  '<AnimatedSection delay={0.3}>\n              <ForecastChart'
);
code = code.replace(
  'onCompareYearChange={setCompareYear}\n            />',
  'onCompareYearChange={setCompareYear}\n            />\n            </AnimatedSection>'
);
code = code.replace(
  '<RegimeBreakdownView',
  '<AnimatedSection delay={0.4}>\n              <RegimeBreakdownView'
);
code = code.replace(
  'selectedYear={selectedYear}\n            />',
  'selectedYear={selectedYear}\n            />\n            </AnimatedSection>'
);
code = code.replace(
  '<StationOverview',
  '<AnimatedSection delay={0.5}>\n              <StationOverview'
);
code = code.replace(
  'onSelectStation={setSelectedStationId}\n            />',
  'onSelectStation={setSelectedStationId}\n            />\n            </AnimatedSection>'
);
fs.writeFileSync('src/App.tsx', code);
console.log("Patched!");
