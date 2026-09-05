const fs = require('fs');
let code = fs.readFileSync('src/components/InteractiveGlobe.tsx', 'utf8');

// Insert the IndiaBoundary component definition
const boundaryCode = `
const IndiaBoundary = () => {
  const [lineSegments, setLineSegments] = useState<THREE.Vector3[][]>([]);

  React.useEffect(() => {
    fetch('/india.geojson')
      .then(res => res.json())
      .then(data => {
        const segments: THREE.Vector3[][] = [];
        const radius = 1.951; // slightly above sphere

        const processPolygon = (coordinates: number[][]) => {
          const points = [];
          for (const [lon, lat] of coordinates) {
            points.push(latLonToVector3(lat, lon, radius));
          }
          if (points.length > 0) {
             segments.push(points);
          }
        };

        if (data.geometry.type === 'Polygon') {
          data.geometry.coordinates.forEach((ring: number[][]) => processPolygon(ring));
        } else if (data.geometry.type === 'MultiPolygon') {
          data.geometry.coordinates.forEach((polygon: number[][][]) => {
            polygon.forEach((ring: number[][]) => processPolygon(ring));
          });
        }
        
        setLineSegments(segments);
      })
      .catch(console.error);
  }, []);

  return (
    <group>
      {lineSegments.map((points, idx) => (
        <Line key={idx} points={points} color="#ffffff" lineWidth={1} transparent opacity={0.3} />
      ))}
    </group>
  );
};
`;

if(!code.includes('Line')) {
  code = code.replace(
    "import { OrbitControls, Sphere, PointMaterial, Points, Html } from '@react-three/drei';",
    "import { OrbitControls, Sphere, PointMaterial, Points, Html, Line } from '@react-three/drei';"
  );
}

if (!code.includes('IndiaBoundary')) {
  code = code.replace(
    'const ParticleGlobe = () => {',
    boundaryCode + '\nconst ParticleGlobe = () => {'
  );

  code = code.replace(
    '<StationMarkers stationStats={stationStats} selectedStationId={selectedStationId} />',
    '<IndiaBoundary />\n        <StationMarkers stationStats={stationStats} selectedStationId={selectedStationId} />'
  );
}

fs.writeFileSync('src/components/InteractiveGlobe.tsx', code);
console.log("Boundary component added!");
