const fs = require('fs');
let code = fs.readFileSync('src/components/LiveMap.tsx', 'utf8');

if (!code.includes('InteractiveGlobe')) {
    code = code.replace(
      "import { CloudRain, Wind, AlertTriangle, Activity } from 'lucide-react';",
      "import { CloudRain, Wind, AlertTriangle, Activity, Globe, Map } from 'lucide-react';\nimport { InteractiveGlobe } from './InteractiveGlobe';"
    );
}

// Add state for 3D globe toggle
if (!code.includes('is3DMode')) {
    code = code.replace(
      "export const LiveMap: React.FC<Props> = ({ selectedStationId, data }) => {",
      "export const LiveMap: React.FC<Props> = ({ selectedStationId, data }) => {\n  const [is3DMode, setIs3DMode] = useState(false);"
    );
}

// Replace the header to add the toggle
code = code.replace(
  '<h3 className="font-semibold text-slate-800 flex items-center gap-2">\n          <Activity className="w-5 h-5 text-blue-600" />\n          Geospatial AI Rainfall Projection\n        </h3>',
  `<h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Geospatial AI Rainfall Projection
        </h3>
        <div className="flex items-center ml-4 bg-slate-100 rounded-lg p-0.5">
          <button 
            onClick={() => setIs3DMode(false)}
            className={\`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all \${!is3DMode ? 'bg-white text-blue-700 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700'}\`}
          >
            <Map className="w-3.5 h-3.5" /> 2D Map
          </button>
          <button 
            onClick={() => setIs3DMode(true)}
            className={\`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all \${is3DMode ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700'}\`}
          >
            <Globe className="w-3.5 h-3.5" /> 3D Volumetric
          </button>
        </div>`
);

// Conditionally render the globe
code = code.replace(
  '<div className="h-[450px] w-full">',
  '<div className="h-[450px] w-full relative overflow-hidden">\n        {is3DMode ? <InteractiveGlobe /> :'
);

code = code.replace(
  '</MapContainer>\n      </div>',
  '</MapContainer>}\n      </div>'
);

fs.writeFileSync('src/components/LiveMap.tsx', code);
console.log("LiveMap Patched!");
