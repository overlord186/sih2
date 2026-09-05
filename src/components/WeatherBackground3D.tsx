import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { AtmosphereMode } from './AtmosphereWidget';

interface Props {
  mode: AtmosphereMode;
}

const Particles = ({ mode }: { mode: AtmosphereMode }) => {
  const ref = useRef<THREE.Points>(null!);
  const count = 5000;
  
  const [positions, speeds] = useMemo(() => {
    const p = new Float32Array(count * 3);
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 50; // x
      p[i * 3 + 1] = Math.random() * 50;     // y (start high)
      p[i * 3 + 2] = (Math.random() - 0.5) * 50; // z
      s[i] = Math.random() * 0.2 + 0.1;
    }
    return [p, s];
  }, [count]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    const positions = ref.current.geometry.attributes.position.array as Float32Array;
    
    // Animate based on mode
    let fallSpeed = 0;
    let windSpeedX = 0;
    let swirlSpeed = 0;

    switch (mode) {
      case 'clear':
      case 'auto':
        fallSpeed = 0.5;
        break;
      case 'drizzle':
        fallSpeed = 15;
        windSpeedX = 2;
        break;
      case 'heavy':
        fallSpeed = 40;
        windSpeedX = 10;
        break;
      case 'cyclone':
        fallSpeed = 50;
        swirlSpeed = 5;
        break;
    }

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // y (falling)
      positions[i3 + 1] -= speeds[i] * fallSpeed * delta * 50;
      
      if (positions[i3 + 1] < -10) {
        positions[i3 + 1] = 40; // reset to top
      }

      // Wind (x)
      if (windSpeedX > 0) {
         positions[i3] -= speeds[i] * windSpeedX * delta * 10;
         if (positions[i3] < -25) {
            positions[i3] = 25;
         }
      }

      // Cyclone (swirl)
      if (swirlSpeed > 0) {
        const x = positions[i3];
        const z = positions[i3 + 2];
        const angle = swirlSpeed * delta;
        positions[i3] = x * Math.cos(angle) - z * Math.sin(angle);
        positions[i3 + 2] = x * Math.sin(angle) + z * Math.cos(angle);
        
        // Pull inwards slightly
        positions[i3] *= 0.999;
        positions[i3 + 2] *= 0.999;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  // Size and color based on mode
  const size = mode === 'heavy' || mode === 'cyclone' ? 0.15 : (mode === 'drizzle' ? 0.08 : 0.05);
  const color = mode === 'clear' || mode === 'auto' ? '#fde047' : '#93c5fd';
  const opacity = mode === 'clear' || mode === 'auto' ? 0.2 : (mode === 'heavy' ? 0.6 : 0.4);

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={color}
        size={size}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={opacity}
      />
    </Points>
  );
};

export const WeatherBackground3D: React.FC<Props> = ({ mode }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <Canvas camera={{ position: [0, 5, 20], fov: 75 }}>
        <Particles mode={mode} />
      </Canvas>
    </div>
  );
};
