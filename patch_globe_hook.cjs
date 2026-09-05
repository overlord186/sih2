const fs = require('fs');
let code = fs.readFileSync('src/components/InteractiveGlobe.tsx', 'utf8');

// The globe component uses useFrame outside of a Canvas context.
// In R3F, useFrame can only be called in components inside a <Canvas>.
// Let's create an inner component for the rotating group.

code = code.replace(
  'export const InteractiveGlobe = ({ stationStats, selectedStationId }: Props) => {',
  `const GlobeCore = ({ stationStats, selectedStationId }: Props) => {
  const globeGroupRef = useRef<THREE.Group>(null!);

  useFrame((state, delta) => {
     if(globeGroupRef.current) {
        globeGroupRef.current.rotation.y += delta * 0.1;
     }
  });

  return (
    <>
      <group ref={globeGroupRef} rotation={[0, -Math.PI / 2, 0]}>
        <Sphere args={[1.95, 64, 64]}>
          <meshPhongMaterial color="#0f172a" emissive="#1e293b" shininess={50} />
        </Sphere>
        <StationMarkers stationStats={stationStats} selectedStationId={selectedStationId} />
      </group>
      <ParticleGlobe />
    </>
  );
};

export const InteractiveGlobe = ({ stationStats, selectedStationId }: Props) => {`
);

code = code.replace(
  `useFrame((state, delta) => {
     if(globeGroupRef.current) {
        globeGroupRef.current.rotation.y += delta * 0.1;
     }
  });`,
  ``
);

code = code.replace(
  `const globeGroupRef = useRef<THREE.Group>(null!);

  // Initial rotation to make India visible initially
  // India is approx Lat 20, Lon 80
  // In our spherical conversion: 
  // phi = 70 degrees, theta = 260 degrees
  // Let's just adjust the group rotation directly in useFrame or set it initially`,
  ``
);

code = code.replace(
  /<group ref=\{globeGroupRef\} rotation=\{\[0, -Math.PI \/ 2, 0\]\}>[\s\S]*<ParticleGlobe \/>/m,
  '<GlobeCore stationStats={stationStats} selectedStationId={selectedStationId} />'
);

fs.writeFileSync('src/components/InteractiveGlobe.tsx', code);
