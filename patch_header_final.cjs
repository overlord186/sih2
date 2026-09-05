const fs = require('fs');

let headerContent = fs.readFileSync('src/components/Header.tsx', 'utf-8');

// Ensure Download is imported
if (!headerContent.includes('Download')) {
  headerContent = headerContent.replace(
    "import { CloudRain, Compass, Calendar, Gauge, Cpu, BookOpen, Layers, History, HelpCircle } from 'lucide-react';",
    "import { CloudRain, Compass, Calendar, Gauge, Cpu, BookOpen, Layers, History, HelpCircle, Download } from 'lucide-react';"
  );
}

// Ensure onDownloadReport is in the destructuring
if (headerContent.includes("totalSamples,")) {
  headerContent = headerContent.replace(
    "totalSamples,\n}) => {",
    "totalSamples,\n  onDownloadReport,\n}) => {"
  );
}

// Ensure we don't use 'props.' in the render
headerContent = headerContent.replace(/props\.onDownloadReport/g, "onDownloadReport");

fs.writeFileSync('src/components/Header.tsx', headerContent);
console.log('patched Header.tsx finally');
