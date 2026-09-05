const fs = require('fs');

let appContent = fs.readFileSync('src/App.tsx', 'utf-8');

appContent = appContent.replace(
  `import { AtmosphereWidget, AtmosphereMode } from './components/AtmosphereWidget';`,
  `import { AtmosphereWidget, AtmosphereMode } from './components/AtmosphereWidget';
import { WeatherBackground3D } from './components/WeatherBackground3D';`
);

appContent = appContent.replace(
  `<AtmosphereWidget mode={atmosphereMode} onChange={setAtmosphereMode} />`,
  `<WeatherBackground3D mode={atmosphereMode} />
      <AtmosphereWidget mode={atmosphereMode} onChange={setAtmosphereMode} />`
);

// Add z-index to main app root
appContent = appContent.replace(
  `id="monsoon-ai-app-root"
          className={\`min-h-screen text-slate-900 flex flex-col font-sans relative \${effectiveRegime ? 'bg-transparent' : 'bg-slate-50 transition-colors duration-1000'}\`}`,
  `id="monsoon-ai-app-root"
          className={\`min-h-screen text-slate-900 flex flex-col font-sans relative z-10 \${effectiveRegime ? 'bg-transparent' : 'bg-slate-50 transition-colors duration-1000'}\`}`
);

fs.writeFileSync('src/App.tsx', appContent);
console.log('patched App.tsx with 3D background');
