const fs = require('fs');
const content = fs.readFileSync('src/components/IndiaRegionMapSimulator.tsx', 'utf-8');

const newCode = content.replace(
  `          <div className="flex flex-wrap items-center gap-1.5">\n            {PROJECTED_STATIONS.map((node) => {\n              const isSelected = node.id === selectedStationId;`,
  `          <div className="flex flex-wrap items-center gap-1.5">\n            {renderNodes.map((node) => {\n              const isSelected = node.isGroup ? node.nodes.some((n: any) => n.id === selectedStationId) : node.id === selectedStationId;\n              const isExpanded = node.isGroup && expandedMacro === node.id;`
).replace(
  `                  onClick={() => {\n                    setSelectedStationId(node.id);\n                    onSelectStationAndPreset({ stationId: node.id });\n                  }}`,
  `                  onClick={() => {\n                    if (node.isGroup) {\n                      setExpandedMacro(isExpanded ? null : node.id);\n                    } else {\n                      setExpandedMacro(null);\n                      setSelectedStationId(node.id);\n                      onSelectStationAndPreset({ stationId: node.id });\n                    }\n                  }}`
);

fs.writeFileSync('src/components/IndiaRegionMapSimulator.tsx', newCode);
console.log('patched_topbar');
