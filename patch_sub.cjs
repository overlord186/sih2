const fs = require('fs');
const content = fs.readFileSync('src/components/IndiaRegionMapSimulator.tsx', 'utf-8');

const newCode = content.replace(
  `                  <span className="text-[9px] opacity-70 hidden sm:inline">({node.subdivision})</span>`,
  `                  <span className="text-[9px] opacity-70 hidden sm:inline">({node.subdivision || 'Subdivisions'})</span>`
);

fs.writeFileSync('src/components/IndiaRegionMapSimulator.tsx', newCode);
console.log('patched_sub');
