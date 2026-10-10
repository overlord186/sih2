import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { NullschoolHeight, NullschoolAnimate, NullschoolOverlay } from './nullschoolTypes';
import { NullschoolPhysicsEngine } from '../../services/nullschoolPhysicsEngine';

interface NullschoolVectorField3DProps {
  height: NullschoolHeight;
  animate: NullschoolAnimate;
  overlay: NullschoolOverlay;
  isPlaying: boolean;
  isHd: boolean;
  radius?: number;
}

export const NullschoolVectorField3D: React.FC<NullschoolVectorField3DProps> = ({
  height,
  animate,
  overlay,
  isPlaying,
  isHd,
  radius = 2.018,
}) => {
  const pointsRef = useRef<THREE.Points>(null);

  // Number of particles: 8,000 for standard, 16,000 for HD
  const count = isHd ? 14000 : 7000;

  // Particle state arrays: lat, lon, age, maxLife
  const particles = useMemo(() => {
    const lat = new Float32Array(count);
    const lon = new Float32Array(count);
    const age = new Float32Array(count);
    const maxLife = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Area-preserving spherical distribution: arcsin(uniform[-1, 1])
      lat[i] = Math.asin(Math.random() * 2 - 1) * (180 / Math.PI);
      lon[i] = Math.random() * 360 - 180;
      maxLife[i] = 60 + Math.random() * 80;
      age[i] = Math.random() * maxLife[i];
    }

    return { lat, lon, age, maxLife };
  }, [count]);

  // Buffer geometries for 3D coordinates and RGB colors
  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const phi = (90 - particles.lat[i]) * (Math.PI / 180);
      const theta = (particles.lon[i] + 180) * (Math.PI / 180);
      pos[i * 3] = -(radius * Math.sin(phi) * Math.cos(theta));
      pos[i * 3 + 1] = radius * Math.cos(phi);
      pos[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      // Default streamline color: Cyan / Green
      col[i * 3] = 0.2;
      col[i * 3 + 1] = 0.85;
      col[i * 3 + 2] = 0.95;
    }

    return { positions: pos, colors: col };
  }, [count, radius, particles]);

  useFrame(({ clock }) => {
    if (!pointsRef.current || !isPlaying) return;

    const timeSec = clock.getElapsedTime();
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = pointsRef.current.geometry.attributes.color as THREE.BufferAttribute;

    const speedScale = animate === 'Currents' ? 0.35 : animate === 'Waves' ? 0.6 : 1.0;
    const dt = 0.22 * speedScale;

    for (let i = 0; i < count; i++) {
      particles.age[i] += 1;

      // Respawn particle if age exceeded
      if (particles.age[i] >= particles.maxLife[i]) {
        particles.lat[i] = Math.asin(Math.random() * 2 - 1) * (180 / Math.PI);
        particles.lon[i] = Math.random() * 360 - 180;
        particles.age[i] = 0;
        particles.maxLife[i] = 60 + Math.random() * 80;
      }

      // Advect along wind vector field from physics engine
      const curLat = particles.lat[i];
      const curLon = particles.lon[i];
      const wind = NullschoolPhysicsEngine.sampleWindVector(curLat, curLon, height, timeSec);

      // Convert m/s to degrees displacement
      // 1 deg lat ~ 111 km = 111,000 m
      const dLat = (wind.v * dt) / 1110.0;
      const cosLat = Math.max(0.08, Math.cos((curLat * Math.PI) / 180));
      const dLon = (wind.u * dt) / (1110.0 * cosLat);

      particles.lat[i] = Math.max(-89.5, Math.min(89.5, curLat + dLat));
      particles.lon[i] = ((curLon + dLon + 180) % 360 + 360) % 360 - 180;

      // Update 3D sphere coordinate
      const phi = (90 - particles.lat[i]) * (Math.PI / 180);
      const theta = (particles.lon[i] + 180) * (Math.PI / 180);

      posAttr.array[i * 3] = -(radius * Math.sin(phi) * Math.cos(theta));
      posAttr.array[i * 3 + 1] = radius * Math.cos(phi);
      posAttr.array[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      // Fade alpha with life
      const lifeRatio = particles.age[i] / particles.maxLife[i];
      const intensity = Math.sin(lifeRatio * Math.PI); // Smooth fade in and fade out

      // Color mapping based on wind speed
      const spd = wind.magnitudeKmh;
      let r = 0.1, g = 0.6, b = 0.9;
      if (spd < 20) {
        r = 0.1; g = 0.4; b = 0.8;
      } else if (spd < 50) {
        r = 0.1; g = 0.85; b = 0.7;
      } else if (spd < 85) {
        r = 0.3; g = 0.95; b = 0.3;
      } else if (spd < 120) {
        r = 0.95; g = 0.85; b = 0.1;
      } else if (spd < 160) {
        r = 0.95; g = 0.35; b = 0.1;
      } else {
        r = 0.95; g = 0.1; b = 0.5; // Jet stream or tropical cyclone core
      }

      colAttr.array[i * 3] = r * intensity;
      colAttr.array[i * 3 + 1] = g * intensity;
      colAttr.array[i * 3 + 2] = b * intensity;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={isHd ? 0.016 : 0.022}
        vertexColors
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
