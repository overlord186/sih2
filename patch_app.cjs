const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Add import
content = content.replace(
  "import { RainOverlay } from './components/RainOverlay';",
  "import { RainOverlay } from './components/RainOverlay';\nimport { LightningFlashOverlay } from './components/LightningFlashOverlay';"
);

// Add component
content = content.replace(
  "<RainOverlay intensity={effectiveIntensity} />",
  "<RainOverlay intensity={effectiveIntensity} />\n      <LightningFlashOverlay intensity={effectiveIntensity} />"
);

fs.writeFileSync('src/App.tsx', content);
console.log('patched App.tsx');
