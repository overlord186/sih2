const fs = require('fs');

let reportContent = fs.readFileSync('src/utils/report.ts', 'utf-8');

// Replace html2canvas with html-to-image
reportContent = reportContent.replace(
  `import html2canvas from 'html2canvas';`,
  `import { toPng } from 'html-to-image';`
);

reportContent = reportContent.replace(
  `const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#f8fafc' // slate-50
    });
    
    const imgData = canvas.toDataURL('image/jpeg', 0.9);`,
  `const imgData = await toPng(element, {
      backgroundColor: '#f8fafc',
      pixelRatio: 2,
      filter: (node) => {
        // Filter out map tiles to prevent CORS "Failed to fetch" errors during PDF generation
        if (node.classList && typeof node.classList.contains === 'function') {
          if (node.classList.contains('leaflet-container')) {
            return false;
          }
        }
        return true;
      }
    });`
);

fs.writeFileSync('src/utils/report.ts', reportContent);
console.log('patched report.ts');
