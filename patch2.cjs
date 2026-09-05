const fs = require('fs');
const content = fs.readFileSync('src/components/IndiaRegionMapSimulator.tsx', 'utf-8');

const newCode = content.replace(
  `                    const isSelected = node.isGroup ? node.nodes.some((n: any) => n.id === selectedStationId) : node.id === selectedStationId;\n                    const isExpanded = node.isGroup && expandedMacro === node.id;\n                    const isSelected = node.id === selectedStationId;`,
  `                    const isSelected = node.isGroup ? node.nodes.some((n: any) => n.id === selectedStationId) : node.id === selectedStationId;\n                    const isExpanded = node.isGroup && expandedMacro === node.id;`
);

fs.writeFileSync('src/components/IndiaRegionMapSimulator.tsx', newCode);
console.log('patched2');
