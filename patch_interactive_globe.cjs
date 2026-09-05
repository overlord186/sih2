const fs = require('fs');
let code = fs.readFileSync('src/components/InteractiveGlobe.tsx', 'utf8');

// 1. Add Play, Pause to imports if not exist
if (!code.includes('import { Play, Pause } from "lucide-react";')) {
  code = code.replace(
    "import { MET_STATIONS } from '../data/monsoonDataset';",
    "import { MET_STATIONS } from '../data/monsoonDataset';\nimport { Play, Pause } from 'lucide-react';"
  );
}

// 2. Add isRotating prop to GlobeCore and ParticleGlobe
code = code.replace(
  'const ParticleGlobe = () => {',
  'const ParticleGlobe = ({ isRotating }: { isRotating: boolean }) => {'
);
code = code.replace(
  'if (pointsRef.current) {',
  'if (pointsRef.current && isRotating) {'
);

code = code.replace(
  'const GlobeCore = ({ stationStats, selectedStationId }: Props) => {',
  'const GlobeCore = ({ stationStats, selectedStationId, isRotating }: Props & { isRotating: boolean }) => {'
);
code = code.replace(
  'if(globeGroupRef.current) {',
  'if(globeGroupRef.current && isRotating) {'
);

code = code.replace(
  '<GlobeCore stationStats={stationStats} selectedStationId={selectedStationId} />',
  '<GlobeCore stationStats={stationStats} selectedStationId={selectedStationId} isRotating={isRotating} />'
);
code = code.replace(
  '<ParticleGlobe />',
  '<ParticleGlobe isRotating={isRotating} />'
);

// 3. Add state and UI toggle in InteractiveGlobe
code = code.replace(
  'export const InteractiveGlobe = ({ stationStats, selectedStationId }: Props) => {',
  'export const InteractiveGlobe = ({ stationStats, selectedStationId }: Props) => {\n  const [isRotating, setIsRotating] = useState(true);'
);

code = code.replace(
  'Live AI Stations • Drag to rotate\n      </div>',
  `Live AI Stations • Drag to rotate
      </div>
      
      <div className="absolute top-10 right-4">
        <button
          onClick={() => setIsRotating(!isRotating)}
          className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 rounded-md text-slate-200 text-xs transition-colors"
        >
          {isRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {isRotating ? 'Pause Rotation' : 'Resume Rotation'}
        </button>
      </div>`
);

// 4. Fix zooming issues
// Limit OrbitControls zoom
code = code.replace(
  '<OrbitControls enableZoom={true} enablePan={false} enableDamping dampingFactor={0.05} />',
  '<OrbitControls enableZoom={true} enablePan={false} enableDamping dampingFactor={0.05} minDistance={2.5} maxDistance={10} />'
);

// Fix Html distanceFactor - remove it so it's a constant screen size
code = code.replace(
  '<Html distanceFactor={10} zIndexRange={[100, 0]}>',
  '<Html zIndexRange={[100, 0]}>'
);

// Reduce marker size so they don't look huge when zoomed
code = code.replace(
  '<sphereGeometry args={[isActive ? 0.05 : 0.02, 16, 16]} />',
  '<sphereGeometry args={[isActive ? 0.03 : 0.015, 16, 16]} />'
);
code = code.replace(
  '<sphereGeometry args={[isActive ? 0.08 : 0.04, 16, 16]} />',
  '<sphereGeometry args={[isActive ? 0.05 : 0.025, 16, 16]} />'
);

fs.writeFileSync('src/components/InteractiveGlobe.tsx', code);
