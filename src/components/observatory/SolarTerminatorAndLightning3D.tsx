import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { weatherSynth } from '../../utils/audio';

interface SolarTerminatorAndLightning3DProps {
  globeRadius: number;
  hourUtc: number; // 0 to 24
  enableLightning: boolean;
  isSoundMuted: boolean;
  isPaused: boolean;
  timeSpeed: number;
}

function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Active thunderstorm convective cells for lightning discharges
const THUNDERSTORM_CLUSTERS = [
  { id: 'BAY_BENGAL_STORM', lat: 18.5, lon: 89.0 },
  { id: 'ARABIAN_SEA_VORTEX', lat: 15.2, lon: 71.0 },
  { id: 'EQUATORIAL_ITCZ', lat: 2.0, lon: 82.0 },
  { id: 'ASSAM_CONVECTION', lat: 26.2, lon: 92.5 },
  { id: 'WESTERN_GHATS_CELL', lat: 14.0, lon: 74.5 },
];

export const SolarTerminatorAndLightning3D: React.FC<SolarTerminatorAndLightning3DProps> = ({
  globeRadius,
  hourUtc,
  enableLightning,
  isSoundMuted,
  isPaused,
  timeSpeed,
}) => {
  const sunLightRef = useRef<THREE.DirectionalLight>(null);
  const [activeFlashes, setActiveFlashes] = useState<
    Array<{ id: number; pos: THREE.Vector3; intensity: number; birthTime: number }>
  >([]);

  // Calculate dynamic Sun directional vector from hourUtc
  const sunPos = useMemo(() => {
    // 12 UTC = Sun directly over Prime Meridian (0° lon)
    // Subsolar longitude: lon = (12 - hourUtc) * 15 degrees
    const subsolarLon = (12 - hourUtc) * 15;
    const subsolarLat = 15; // Monsoon summer declination ~15°N
    const dist = 14.0;
    return latLonToVector3(subsolarLat, subsolarLon, dist);
  }, [hourUtc]);

  const lastLightningTimeRef = useRef<number>(0);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // Trigger randomized realistic thunderstorm lightning flashes
    if (enableLightning && !isPaused && time - lastLightningTimeRef.current > 1.2 / (timeSpeed * 0.8)) {
      if (Math.random() < 0.65) {
        lastLightningTimeRef.current = time;

        // Pick a random convective storm cluster
        const cluster = THUNDERSTORM_CLUSTERS[Math.floor(Math.random() * THUNDERSTORM_CLUSTERS.length)];
        // Add random scatter within 1.5 degrees
        const flashLat = cluster.lat + (Math.random() - 0.5) * 2.5;
        const flashLon = cluster.lon + (Math.random() - 0.5) * 2.5;
        const flashPos = latLonToVector3(flashLat, flashLon, globeRadius + 0.05);

        const newFlash = {
          id: Date.now() + Math.random(),
          pos: flashPos,
          intensity: 2.4 + Math.random() * 2.2,
          birthTime: time,
        };

        setActiveFlashes((prev) => [...prev.slice(-3), newFlash]);

        // Trigger realistic thunder crackle audio
        if (!isSoundMuted && Math.random() < 0.7) {
          weatherSynth.playLightningThunderCrack();
        }
      }
    }

    // Decay and clean up expired flashes (active for ~250ms)
    setActiveFlashes((prev) =>
      prev.filter((f) => time - f.birthTime < 0.28)
    );
  });

  return (
    <group>
      {/* Dynamic Astronomical Sun Directional Light */}
      <directionalLight
        ref={sunLightRef}
        position={[sunPos.x, sunPos.y, sunPos.z]}
        intensity={1.4}
        color="#fffbf0"
      />

      {/* Night-Side Ambient Light Glow */}
      <ambientLight intensity={0.28} color="#0c192c" />

      {/* Sun Light Source Visualization Sprite in Space */}
      <group position={[sunPos.x * 1.8, sunPos.y * 1.8, sunPos.z * 1.8]}>
        <mesh>
          <sphereGeometry args={[0.35, 16, 16]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
        <pointLight color="#fef08a" intensity={2.0} distance={12} />
      </group>

      {/* Active Volumetric Lightning Flashes */}
      {enableLightning &&
        activeFlashes.map((flash) => {
          return (
            <group key={flash.id} position={[flash.pos.x, flash.pos.y, flash.pos.z]}>
              {/* Lightning Core Discharge Point Light */}
              <pointLight
                color="#cffafe"
                intensity={flash.intensity * 2.5}
                distance={0.85}
                decay={1.5}
              />

              {/* Ionized Plasma Flash Glow Sphere */}
              <mesh>
                <sphereGeometry args={[0.045, 12, 12]} />
                <meshBasicMaterial color="#a5f3fc" transparent opacity={0.85} />
              </mesh>

              {/* Electrostatic Corona Ring */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.03, 0.09, 16]} />
                <meshBasicMaterial
                  color="#38bdf8"
                  side={THREE.DoubleSide}
                  transparent
                  opacity={0.7}
                />
              </mesh>
            </group>
          );
        })}
    </group>
  );
};
