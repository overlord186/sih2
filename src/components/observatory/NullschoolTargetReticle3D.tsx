import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface NullschoolTargetReticle3DProps {
  lat: number;
  lon: number;
  radius?: number;
}

export const NullschoolTargetReticle3D: React.FC<NullschoolTargetReticle3DProps> = ({
  lat,
  lon,
  radius = 2.008,
}) => {
  const meshRef = useRef<THREE.Group>(null);

  // Convert lat/lon to 3D position
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  const pos = new THREE.Vector3(x, y, z);
  const normal = pos.clone().normalize();

  useFrame(({ clock, camera }) => {
    if (!meshRef.current) return;
    // Horizon culling
    const camDir = camera.position.clone().normalize();
    const dot = normal.dot(camDir);
    meshRef.current.visible = dot > 0.05;

    // Pulse scale animation
    const scale = 1.0 + 0.15 * Math.sin(clock.getElapsedTime() * 4.0);
    meshRef.current.scale.set(scale, scale, scale);
  });

  // Create orientation matrix to align ring flat onto sphere surface
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

  return (
    <group ref={meshRef} position={pos} quaternion={quaternion}>
      {/* Outer green ring */}
      <mesh>
        <ringGeometry args={[0.038, 0.046, 32]} />
        <meshBasicMaterial color="#00ff66" transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      {/* Inner pinpoint dot */}
      <mesh>
        <circleGeometry args={[0.008, 16]} />
        <meshBasicMaterial color="#00ff66" transparent opacity={0.95} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
