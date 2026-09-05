const fs = require('fs');

let mainContent = fs.readFileSync('src/main.tsx', 'utf-8');

if (!mainContent.includes('THREE.Clock')) {
  mainContent = `const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('THREE.Clock')) return;
  originalWarn(...args);
};
` + mainContent;
  
  fs.writeFileSync('src/main.tsx', mainContent);
  console.log('Patched main.tsx');
}
