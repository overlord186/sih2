import React, { useMemo } from 'react';
import * as THREE from 'three';

interface NullschoolLatLonGrid3DProps {
  radius?: number;
  visible?: boolean;
}

export const NullschoolLatLonGrid3D: React.FC<NullschoolLatLonGrid3DProps> = ({
  radius = 2.012,
  visible = true,
}) => {
  const lineGeometries = useMemo(() => {
    if (!visible) return [];
    const geoms: THREE.BufferGeometry[] = [];

    // 1. Parallels of Latitude every 15 degrees (-75 to +75)
    for (let lat = -75; lat <= 75; lat += 15) {
      const phi = (90 - lat) * (Math.PI / 180);
      const y = radius * Math.cos(phi);
      const ringRadius = radius * Math.sin(phi);

      const points: THREE.Vector3[] = [];
      const segments = 64;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = ringRadius * Math.cos(theta);
        const z = ringRadius * Math.sin(theta);
        points.push(new THREE.Vector3(x, y, z));
      }

      const geom = new THREE.BufferGeometry().setFromPoints(points);
      geoms.push(geom);
    }

    // 2. Meridians of Longitude every 30 degrees (-180 to 180)
    for (let lon = -180; lon < 180; lon += 30) {
      const theta = (lon + 180) * (Math.PI / 180);
      const points: THREE.Vector3[] = [];
      const segments = 64;
      for (let i = 0; i <= segments; i++) {
        const lat = -90 + (i / segments) * 180;
        const phi = (90 - lat) * (Math.PI / 180);
        const x = -(radius * Math.sin(phi) * Math.cos(theta));
        const z = radius * Math.sin(phi) * Math.sin(theta);
        const y = radius * Math.cos(phi);
        points.push(new THREE.Vector3(x, y, z));
      }

      const geom = new THREE.BufferGeometry().setFromPoints(points);
      geoms.push(geom);
    }

    return geoms;
  }, [radius, visible]);

  if (!visible) return null;

  return (
    <group>
      {lineGeometries.map((geom, idx) => (
        <lineLoop key={idx} geometry={geom}>
          <lineBasicMaterial
            color="#38bdf8"
            transparent
            opacity={idx === 5 ? 0.45 : 0.18} // Equator is brighter
            depthWrite={false}
          />
        </lineLoop>
      ))}
    </group>
  );
};
