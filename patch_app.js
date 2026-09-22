import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('import { SocioEconomicImpactView }')) {
    content = content.replace("import { ActionPlanner } from './components/ActionPlanner';", "import { ActionPlanner } from './components/ActionPlanner';\nimport { SocioEconomicImpactView } from './components/SocioEconomicImpactView';");
}

const impactView = `
        {activeTab === 'impact' && (
          <ErrorBoundary compact>
            <SocioEconomicImpactView 
              dataset={filteredData} 
              selectedStationId={selectedStationId} 
            />
          </ErrorBoundary>
        )}
`;

if (!content.includes("activeTab === 'impact'")) {
    const splitStr = `        {activeTab === 'planner' && (`
    const parts = content.split(splitStr);
    content = parts[0] + impactView + "        " + splitStr + parts[1];
}

fs.writeFileSync('src/App.tsx', content);
console.log('Patched App.tsx');
