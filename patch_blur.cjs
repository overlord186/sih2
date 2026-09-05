const fs = require('fs');
let content = fs.readFileSync('src/components/IndiaRegionMapSimulator.tsx', 'utf-8');

// Remove foreignObject
content = content.replace(
  /                      \{isExpanded && \([\s\S]*?<\/foreignObject>\n                      \}\)/,
  ''
);

// Add absolute HTML popover layer
const replacementHtml = `                </svg>

                {/* HTML Overlay for Popovers (Avoids SVG foreignObject scaling blur) */}
                {renderNodes.map((node) => {
                  const isExpanded = node.isGroup && expandedMacro === node.id;
                  if (!isExpanded) return null;
                  return (
                    <div
                      key={\`popover-\${node.id}\`}
                      className="absolute z-50 transform -translate-x-1/2 pointer-events-auto"
                      style={{ 
                        left: \`\${(node.mapX / 800) * 100}%\`, 
                        top: \`\${(node.mapY / 953) * 100}%\`,
                        marginTop: '15px',
                        width: '170px'
                      }}
                    >
                      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-600 shadow-2xl rounded-lg p-2 flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider px-1 text-center">{node.name}</span>
                        {node.nodes.map((subNode: any) => (
                          <button
                            key={subNode.id}
                            className={\`text-left text-xs px-2 py-1.5 rounded transition-colors \${selectedStationId === subNode.id ? 'bg-sky-500/20 text-sky-400 border border-sky-500/50' : 'hover:bg-slate-800 text-slate-200 border border-transparent'}\`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStationId(subNode.id);
                              onSelectStationAndPreset({ stationId: subNode.id });
                              setExpandedMacro(null);
                            }}
                          >
                            {subNode.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>`;

content = content.replace(
  `                </svg>\n              </div>`,
  replacementHtml
);

fs.writeFileSync('src/components/IndiaRegionMapSimulator.tsx', content);
console.log('patched_blur');
