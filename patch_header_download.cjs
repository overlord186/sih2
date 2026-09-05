const fs = require('fs');

let headerContent = fs.readFileSync('src/components/Header.tsx', 'utf-8');

headerContent = headerContent.replace(
  "import { CloudRain, Compass, Calendar, Gauge, Cpu, BookOpen, Layers, History, HelpCircle } from 'lucide-react';",
  "import { CloudRain, Compass, Calendar, Gauge, Cpu, BookOpen, Layers, History, HelpCircle, Download } from 'lucide-react';"
);

fs.writeFileSync('src/components/Header.tsx', headerContent);
console.log('patched Header.tsx download import');
