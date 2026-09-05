const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  'return (\n    <>',
  'return (\n    <>\n      <RainOverlay intensity={hoverIntensity} />'
);

fs.writeFileSync('src/App.tsx', content);
console.log('patched app again');
