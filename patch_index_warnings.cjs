const fs = require('fs');
let indexHtml = fs.readFileSync('index.html', 'utf-8');

// Add THREE.Clock to suppression
indexHtml = indexHtml.replace(
  `const originalConsoleError = console.error;`,
  `const originalConsoleError = console.error;
      const originalConsoleWarn = console.warn;
      console.warn = function(...args) {
        if (typeof args[0] === 'string' && args[0].includes('THREE.Clock: This module has been deprecated')) return;
        originalConsoleWarn.apply(console, args);
      };`
);

fs.writeFileSync('index.html', indexHtml);
console.log('patched index.html');
