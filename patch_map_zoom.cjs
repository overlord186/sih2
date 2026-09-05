const fs = require('fs');

let content = fs.readFileSync('src/components/IndiaRegionMapSimulator.tsx', 'utf-8');

const oldState = `const [showStationTags, setShowStationTags] = useState<boolean>(true);`;
const newState = `const [showStationTags, setShowStationTags] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);`;

content = content.replace(oldState, newState);

const oldCanvas = `{/* Map Canvas with Authentic Base Image & Projected Meteorological Layers */}
              <div className="relative w-full max-w-[420px] aspect-[800/953] rounded-lg overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-900 group select-none">
                {/* India Map Image Base */}
                <img`;

const newCanvas = `{/* Map Canvas with Authentic Base Image & Projected Meteorological Layers */}
              <div className="relative w-full max-w-[420px] aspect-[800/953] rounded-lg overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-900 group select-none">
                
                {/* Map Zoom Controls */}
                <div className="absolute top-2 left-2 z-50 flex flex-col gap-1 bg-slate-800/80 rounded-md border border-slate-600/50 p-1 backdrop-blur-sm">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setZoomLevel(z => Math.min(z + 0.5, 4)); }}
                    className="w-8 h-8 flex items-center justify-center text-white bg-slate-700 hover:bg-blue-600 rounded cursor-pointer transition-colors"
                  >
                    +
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setZoomLevel(z => Math.max(z - 0.5, 1)); }}
                    className="w-8 h-8 flex items-center justify-center text-white bg-slate-700 hover:bg-blue-600 rounded cursor-pointer transition-colors"
                  >
                    -
                  </button>
                </div>

                <div 
                  className="absolute inset-0 w-full h-full transition-transform duration-300 ease-out origin-center" 
                  style={{ transform: \`scale(\${zoomLevel})\` }}
                >
                {/* India Map Image Base */}
                <img`;

content = content.replace(oldCanvas, newCanvas);

const oldSVGBottom = `</svg>
              </div>`;

const newSVGBottom = `</svg>
                </div>
              </div>`;

content = content.replace(oldSVGBottom, newSVGBottom);

fs.writeFileSync('src/components/IndiaRegionMapSimulator.tsx', content);
console.log('patched Map Canvas');
