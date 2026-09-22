import fs from 'fs';

// Fix App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf8');
appContent = appContent.replace(/onTabChange={setActiveTab}/g, "onTabChange={(tab: any) => setActiveTab(tab as NavigationTab)}");
fs.writeFileSync('src/App.tsx', appContent);

// Fix ExploreTourContext.tsx
let ctxContent = fs.readFileSync('src/components/exploreTour/ExploreTourContext.tsx', 'utf8');
ctxContent = ctxContent.replace(/weatherSynth\.playChime\('radar'\);/g, "weatherSynth.playRadarScanPing();");
ctxContent = ctxContent.replace(/weatherSynth\.playClick\('radar'\);/g, "weatherSynth.playConfirmationTone();");
fs.writeFileSync('src/components/exploreTour/ExploreTourContext.tsx', ctxContent);

console.log('Lint errors patched');
