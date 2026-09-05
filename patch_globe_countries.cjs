const fs = require('fs');
let code = fs.readFileSync('src/components/InteractiveGlobe.tsx', 'utf8');

const replacement = `
const CountryBoundaries = () => {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  React.useEffect(() => {
    fetch('/countries.geojson')
      .then(res => res.json())
      .then(data => {
        const radius = 1.951; 
        const positions: number[] = [];

        const processPolygon = (coordinates: number[][]) => {
          for (let i = 0; i < coordinates.length - 1; i++) {
            const p1 = latLonToVector3(coordinates[i][1], coordinates[i][0], radius);
            const p2 = latLonToVector3(coordinates[i+1][1], coordinates[i+1][0], radius);
            positions.push(p1.x, p1.y, p1.z);
            positions.push(p2.x, p2.y, p2.z);
          }
        };

        data.features.forEach((feature: any) => {
          if (feature.geometry && feature.geometry.type === 'Polygon') {
            feature.geometry.coordinates.forEach((ring: number[][]) => processPolygon(ring));
          } else if (feature.geometry && feature.geometry.type === 'MultiPolygon') {
            feature.geometry.coordinates.forEach((polygon: number[][][]) => {
              polygon.forEach((ring: number[][]) => processPolygon(ring));
            });
          }
        });

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        setGeometry(geom);
      })
      .catch(console.error);
  }, []);

  if (!geometry) return null;

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.15} linewidth={1} />
    </lineSegments>
  );
};
`;

// Replace the old IndiaBoundary with CountryBoundaries
const startIdx = code.indexOf('const IndiaBoundary = () => {');
const endIdx = code.indexOf('const ParticleGlobe = ({ isRotating');

if (startIdx !== -1 && endIdx !== -1) {
    code = code.substring(0, startIdx) + replacement + '\n' + code.substring(endIdx);
}

// Enable the CountryBoundaries inside GlobeCore
code = code.replace('{/* <IndiaBoundary /> */}', '<CountryBoundaries />');

fs.writeFileSync('src/components/InteractiveGlobe.tsx', code);
