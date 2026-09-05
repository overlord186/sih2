const fs = require('fs');
const content = fs.readFileSync('src/components/IndiaRegionMapSimulator.tsx', 'utf-8');

const newCode = content.replace(
  `                      </g>\n                    );\n                  })}\n                </svg>`,
  `                      </g>\n                      {isExpanded && (\n                        <foreignObject\n                          x={node.mapX - 85}\n                          y={node.mapY + 15}\n                          width="170"\n                          height="120"\n                          className="overflow-visible z-50"\n                        >\n                          <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-600 shadow-2xl rounded-lg p-2 flex flex-col gap-1" style={{ pointerEvents: 'auto' }}>\n                            <span className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider px-1 text-center">{node.name}</span>\n                            {node.nodes.map((subNode: any) => (\n                              <button\n                                key={subNode.id}\n                                className={\`text-left text-xs px-2 py-1.5 rounded transition-colors \${selectedStationId === subNode.id ? 'bg-sky-500/20 text-sky-400 border border-sky-500/50' : 'hover:bg-slate-800 text-slate-200 border border-transparent'}\`}\n                                onClick={(e) => {\n                                  e.stopPropagation();\n                                  setSelectedStationId(subNode.id);\n                                  onSelectStationAndPreset({ stationId: subNode.id });\n                                  setExpandedMacro(null);\n                                }}\n                              >\n                                {subNode.name}\n                              </button>\n                            ))}\n                          </div>\n                        </foreignObject>\n                      )}\n                    </React.Fragment>\n                    );\n                  })}\n                </svg>`
).replace(
  `                    return (\n                      <g\n                        key={node.id}`,
  `                    return (\n                      <React.Fragment key={node.id}>\n                      <g`
);

fs.writeFileSync('src/components/IndiaRegionMapSimulator.tsx', newCode);
console.log('patched3');
