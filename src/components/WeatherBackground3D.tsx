import React, { useRef, useMemo, useEffect, useState, Component, ReactNode, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { AtmosphereMode } from './AtmosphereWidget';
import { WaterfallPhysics } from './WaterfallPhysics';
import { Lock, Unlock, Compass, Move } from 'lucide-react';

interface Props {
  mode: AtmosphereMode;
  selectedSeasonPhase?: number; // 1: June Onset, 2: July Peak, 3: Aug Active/Break, 4: Sept Withdrawal
}

class ThreeErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: any) {
    console.warn('3D Canvas rendering bypassed due to WebGL availability:', err);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// Procedural 3D Terrain Surface Elevation Model with Ridge & Canyon Profiles
export const getTerrainHeight = (x: number, z: number): number => {
  const d = Math.sqrt(x * x + z * z);
  const islandMask = Math.max(0.08, 1.0 - Math.pow(Math.min(1.0, d / 32), 2.2));
  
  // Western Ghats mountain ridge & gorge valley
  const ridge = Math.exp(-Math.pow((x + 2.2) / 6.5, 2)) * 11.8 * Math.exp(-Math.pow((z + 4.0) / 13.5, 2));
  const gorgeCut = Math.exp(-Math.pow(x / 2.5, 2)) * Math.exp(-Math.pow((z + 2.0) / 7.5, 2)) * 6.4;
  const peaks = Math.sin(x * 0.22) * Math.cos(z * 0.22) * 2.8 + Math.sin(x * 0.5 + z * 0.35) * 1.3;
  const plateaus = Math.sin(x * 0.10 - z * 0.12) * 2.0;
  
  return -5.5 + (ridge - gorgeCut + peaks + plateaus) * islandMask;
};

// High-Performance Analytical Terrain Elevation + Gradient in a single pass
const getTerrainHeightAndGrad = (x: number, z: number): { h: number; gx: number; gz: number } => {
  const delta = 0.2;
  const h = getTerrainHeight(x, z);
  const hx = getTerrainHeight(x + delta, z);
  const hz = getTerrainHeight(x, z + delta);
  return {
    h,
    gx: (hx - h) / delta,
    gz: (hz - h) / delta,
  };
};

/**
 * SEASONAL TERRAIN ALBEDO COLOR PROFILES
 */
interface SeasonAlbedoConfig {
  lowlandColor: THREE.Color;
  midlandColor: THREE.Color;
  highlandColor: THREE.Color;
  waterloggedColor: THREE.Color;
  wireframeColor: string;
  roughness: number;
  metalness: number;
  albedoLabel: string;
  albedoFactor: number;
  lightTint: THREE.Color;
}

const getSeasonAlbedo = (phase: number = 2, mode: AtmosphereMode = 'auto'): SeasonAlbedoConfig => {
  if (mode === 'dark_mode') {
    return {
      lowlandColor: new THREE.Color('#030712'),
      midlandColor: new THREE.Color('#1e1b4b'),
      highlandColor: new THREE.Color('#4c1d95'),
      waterloggedColor: new THREE.Color('#06b6d4'),
      wireframeColor: '#a855f7',
      roughness: 0.6,
      metalness: 0.3,
      albedoLabel: 'Infrared Planetary Albedo (Night mode)',
      albedoFactor: 0.08,
      lightTint: new THREE.Color('#c084fc'),
    };
  }

  switch (phase) {
    case 1: // June Onset
      return {
        lowlandColor: new THREE.Color('#6c4a2a'),
        midlandColor: new THREE.Color('#4d7c0f'),
        highlandColor: new THREE.Color('#a16207'),
        waterloggedColor: new THREE.Color('#0284c7'),
        wireframeColor: '#d97706',
        roughness: 0.78,
        metalness: 0.05,
        albedoLabel: 'Early Onset Soil Albedo (α ≈ 0.22)',
        albedoFactor: 0.22,
        lightTint: new THREE.Color('#fed7aa'),
      };
    case 2: // July Peak
      return {
        lowlandColor: new THREE.Color('#022c22'),
        midlandColor: new THREE.Color('#065f46'),
        highlandColor: new THREE.Color('#059669'),
        waterloggedColor: new THREE.Color('#0369a1'),
        wireframeColor: '#06b6d4',
        roughness: 0.35,
        metalness: 0.15,
        albedoLabel: 'Peak Monsoon Saturated Albedo (α ≈ 0.12)',
        albedoFactor: 0.12,
        lightTint: new THREE.Color('#a7f3d0'),
      };
    case 3: // August Active/Break
      return {
        lowlandColor: new THREE.Color('#064e3b'),
        midlandColor: new THREE.Color('#15803d'),
        highlandColor: new THREE.Color('#65a30d'),
        waterloggedColor: new THREE.Color('#0284c7'),
        wireframeColor: '#3b82f6',
        roughness: 0.52,
        metalness: 0.08,
        albedoLabel: 'Mature Canopy Albedo (α ≈ 0.16)',
        albedoFactor: 0.16,
        lightTint: new THREE.Color('#bae6fd'),
      };
    case 4: // September Withdrawal
      return {
        lowlandColor: new THREE.Color('#78350f'),
        midlandColor: new THREE.Color('#ca8a04'),
        highlandColor: new THREE.Color('#eab308'),
        waterloggedColor: new THREE.Color('#0ea5e9'),
        wireframeColor: '#f59e0b',
        roughness: 0.88,
        metalness: 0.02,
        albedoLabel: 'Post-Monsoon Retreat Albedo (α ≈ 0.28)',
        albedoFactor: 0.28,
        lightTint: new THREE.Color('#fef08a'),
      };
    default:
      return {
        lowlandColor: new THREE.Color('#022c22'),
        midlandColor: new THREE.Color('#065f46'),
        highlandColor: new THREE.Color('#059669'),
        waterloggedColor: new THREE.Color('#0284c7'),
        wireframeColor: '#06b6d4',
        roughness: 0.45,
        metalness: 0.1,
        albedoLabel: 'Standard Monsoonal Albedo',
        albedoFactor: 0.15,
        lightTint: new THREE.Color('#e0f2fe'),
      };
  }
};

/**
 * 3D Solid Shaded Terrain Mesh with Optimized Height-Map Updates & Cached SSAO
 */
const ShadedTerrainSurface = ({ phase, mode }: { phase: number; mode: AtmosphereMode }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  const isTransitioningRef = useRef<boolean>(true);
  const targetAlbedo = useMemo(() => getSeasonAlbedo(phase, mode), [phase, mode]);

  const gridResolution = 60;
  const gridSize = 64;

  const waterLevel = useMemo(() => {
    switch (mode) {
      case 'cyclone': return -2.2;
      case 'heavy': return -3.0;
      case 'drizzle': return -4.2;
      case 'dark_mode': return -3.2;
      case 'clear':
      default: return -5.2;
    }
  }, [mode]);

  // Precomputed & Cached Geometry to completely bypass CPU lag
  const { geometry, targetColors } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(gridSize, gridSize, gridResolution, gridResolution);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const target = new Float32Array(pos.count * 3);

    const tempCol = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = getTerrainHeight(x, z);
      pos.setY(i, y);

      const hNorm = Math.min(1.0, Math.max(0.0, (y + 8) / 12));
      
      if (y < waterLevel) {
        const submersionDepth = Math.min(1.0, (waterLevel - y) / 2.5);
        tempCol.lerpColors(targetAlbedo.lowlandColor, targetAlbedo.waterloggedColor, 0.45 + submersionDepth * 0.55);
      } else if (hNorm < 0.45) {
        tempCol.lerpColors(targetAlbedo.lowlandColor, targetAlbedo.midlandColor, hNorm / 0.45);
      } else {
        tempCol.lerpColors(targetAlbedo.midlandColor, targetAlbedo.highlandColor, (hNorm - 0.45) / 0.55);
      }

      // Cached Ambient Occlusion
      const shorelineDelta = y - waterLevel;
      const aoShoreline = shorelineDelta > -0.6 && shorelineDelta < 1.4
        ? Math.max(0.48, 1.0 - Math.exp(-Math.pow(shorelineDelta / 0.65, 2)) * 0.52)
        : 1.0;

      const isGorge = Math.abs(x) < 3.8 && z > -8.5 && z < 3.0;
      const aoGorge = isGorge 
        ? Math.max(0.55, 1.0 - Math.exp(-Math.pow(x / 2.8, 2)) * Math.exp(-Math.pow((z + 2.5) / 5.5, 2)) * 0.45)
        : 1.0;

      const totalSSAO = Math.min(1.0, Math.max(0.40, aoShoreline * aoGorge));

      tempCol.r *= totalSSAO;
      tempCol.g *= totalSSAO;
      tempCol.b *= totalSSAO;

      colors[i * 3] = tempCol.r;
      colors[i * 3 + 1] = tempCol.g;
      colors[i * 3 + 2] = tempCol.b;

      target[i * 3] = tempCol.r;
      target[i * 3 + 1] = tempCol.g;
      target[i * 3 + 2] = tempCol.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return { geometry: geo, targetColors: target };
  }, [gridSize, gridResolution, targetAlbedo, waterLevel]);

  useEffect(() => {
    isTransitioningRef.current = true;
  }, [phase, mode, waterLevel]);

  useFrame((state, delta) => {
    if (!geometry || !meshRef.current) return;
    const colAttr = geometry.attributes.color;
    if (!colAttr) return;

    if (isTransitioningRef.current) {
      const colors = colAttr.array as Float32Array;
      const lerpRate = Math.min(delta * 5.0, 0.25);
      let maxDiff = 0;

      for (let i = 0; i < colors.length; i++) {
        const diff = Math.abs(colors[i] - targetColors[i]);
        if (diff > maxDiff) maxDiff = diff;
        colors[i] += (targetColors[i] - colors[i]) * lerpRate;
      }
      colAttr.needsUpdate = true;

      if (maxDiff < 0.003) {
        isTransitioningRef.current = false;
      }
    }

    if (matRef.current) {
      const isWet = mode === 'heavy' || mode === 'cyclone' || mode === 'drizzle';
      const targetRoughness = isWet ? 0.22 : targetAlbedo.roughness;
      const targetMetalness = isWet ? 0.35 : targetAlbedo.metalness;
      const lerpRate = Math.min(delta * 3.2, 0.15);
      matRef.current.roughness = THREE.MathUtils.lerp(matRef.current.roughness, targetRoughness, lerpRate);
      matRef.current.metalness = THREE.MathUtils.lerp(matRef.current.metalness, targetMetalness, lerpRate);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, -0.6, 0]} receiveShadow>
      <meshStandardMaterial
        ref={matRef}
        vertexColors
        roughness={targetAlbedo.roughness}
        metalness={targetAlbedo.metalness}
        transparent
        opacity={0.88}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

/**
 * Dynamic Reflective Water Basin Surface
 */
const DynamicWaterBasin = ({ mode }: { mode: AtmosphereMode }) => {
  const meshRef = useRef<THREE.Mesh>(null!);

  const targetHeight = useMemo(() => {
    switch (mode) {
      case 'cyclone': return -2.4;
      case 'heavy': return -3.2;
      case 'drizzle': return -4.5;
      case 'dark_mode': return -3.5;
      case 'clear':
      default: return -5.6;
    }
  }, [mode]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);

    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetHeight, dt * 2.5);
    meshRef.current.rotation.z = Math.sin(time * 0.8) * 0.005;
  });

  if (mode === 'clear') return null;

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, targetHeight, 0]}>
      <planeGeometry args={[45, 45, 24, 24]} />
      <meshStandardMaterial
        color={mode === 'cyclone' ? 0x0369a1 : 0x0284c7}
        emissive={mode === 'cyclone' ? 0x075985 : 0x03496b}
        emissiveIntensity={0.35}
        roughness={0.04}
        metalness={0.85}
        transparent
        opacity={0.82}
      />
    </mesh>
  );
};

/**
 * GPU-ACCELERATED NEON WIND VECTORS PARTICLE SYSTEM
 */
const NeonWindVectors = ({ mode }: { mode: AtmosphereMode }) => {
  const ref = useRef<THREE.Points>(null!);
  const frameCountRef = useRef<number>(0);

  const count = useMemo(() => {
    if (typeof window === 'undefined') return 2000;
    return window.devicePixelRatio > 1.5 ? 1600 : 2200;
  }, []);

  const [positions, colors, particleData] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const data: {
      speedFactor: number;
      hoverOffset: number;
      streamlineLane: number;
      phase: number;
    }[] = [];

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 60;
      const z = (Math.random() - 0.5) * 60;
      const hover = 0.3 + Math.random() * 2.2;
      const y = getTerrainHeight(x, z) + hover;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      col[i * 3] = 0.0;
      col[i * 3 + 1] = 0.94;
      col[i * 3 + 2] = 1.0;

      data.push({
        speedFactor: 0.6 + Math.random() * 0.8,
        hoverOffset: hover,
        streamlineLane: (Math.random() - 0.5) * 10,
        phase: Math.random() * Math.PI * 2,
      });
    }

    return [pos, col, data];
  }, [count]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    const posAttr = ref.current.geometry.attributes.position;
    const colAttr = ref.current.geometry.attributes.color;
    const pos = posAttr.array as Float32Array;
    const col = colAttr.array as Float32Array;

    const time = state.clock.getElapsedTime();
    const dt = Math.min(delta, 0.05);
    frameCountRef.current++;
    const updateColors = frameCountRef.current % 4 === 0;

    let baseSpeed = 1.2;
    let windDirX = 1.0;
    let windDirZ = 0.35;
    let swirlStrength = 0.0;
    let updraft = 0.0;
    let rBase = 0.0, gBase = 0.94, bBase = 1.0;

    switch (mode) {
      case 'clear':
      case 'auto':
        baseSpeed = 1.0;
        windDirX = 0.8;
        windDirZ = 0.2;
        rBase = 0.98; gBase = 0.78; bBase = 0.22;
        break;
      case 'drizzle':
        baseSpeed = 2.4;
        windDirX = 1.2;
        windDirZ = 0.4;
        rBase = 0.22; gBase = 0.74; bBase = 0.98;
        break;
      case 'heavy':
        baseSpeed = 5.5;
        windDirX = 1.8;
        windDirZ = 0.7;
        updraft = 1.2;
        rBase = 0.06; gBase = 0.95; bBase = 0.75;
        break;
      case 'cyclone':
        baseSpeed = 12.5;
        windDirX = 0.4;
        windDirZ = 0.2;
        swirlStrength = 4.2;
        updraft = 3.5;
        rBase = 0.95; gBase = 0.24; bBase = 0.45;
        break;
      case 'dark_mode':
        baseSpeed = 3.5;
        windDirX = 1.4;
        windDirZ = 0.5;
        updraft = 0.8;
        rBase = 0.75; gBase = 0.35; bBase = 0.98;
        break;
    }

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const d = particleData[i];
      let x = pos[i3];
      let z = pos[i3 + 2];

      const speed = baseSpeed * d.speedFactor;
      let terrainY = 0;

      if (swirlStrength > 0) {
        const r = Math.sqrt(x * x + z * z) + 0.1;
        const theta = Math.atan2(z, x);
        const angularV = (swirlStrength / (Math.pow(r, 0.45) + 0.2)) * speed * dt;
        const newTheta = theta + angularV;
        const radialInflow = 0.992;

        x = Math.cos(newTheta) * r * radialInflow;
        z = Math.sin(newTheta) * r * radialInflow;

        if (r < 1.5 || r > 35) {
          const spawnAngle = Math.random() * Math.PI * 2;
          const spawnR = 26 + Math.random() * 8;
          x = Math.cos(spawnAngle) * spawnR;
          z = Math.sin(spawnAngle) * spawnR;
        }
        terrainY = getTerrainHeight(x, z);
      } else {
        const { h, gx, gz } = getTerrainHeightAndGrad(x, z);
        terrainY = h;

        const deflX = windDirX - gx * 0.45;
        const deflZ = windDirZ - gz * 0.45;

        x += deflX * speed * dt * 3.5;
        z += deflZ * speed * dt * 3.5;

        if (x > 30) x = -30;
        if (x < -30) x = 30;
        if (z > 30) z = -30;
        if (z < -30) z = 30;
      }

      const waveHover = Math.sin(time * 3.0 + d.phase) * 0.4;
      const updraftY = updraft > 0 ? (Math.sin(time * 4.0 + x * 0.2) * updraft) : 0;
      const targetY = terrainY + d.hoverOffset + waveHover + updraftY;

      pos[i3] = x;
      pos[i3 + 1] = THREE.MathUtils.lerp(pos[i3 + 1], targetY, 0.15);
      pos[i3 + 2] = z;

      if (updateColors) {
        const elevationNorm = Math.min(1.0, Math.max(0.0, (targetY + 4) / 8.0));
        const pulse = Math.sin(time * 4.0 + d.phase) * 0.2 + 0.8;

        if (mode === 'cyclone') {
          const rNorm = Math.min(1.0, Math.sqrt(x * x + z * z) / 25);
          col[i3] = THREE.MathUtils.lerp(1.0, 0.05, rNorm) * pulse;
          col[i3 + 1] = THREE.MathUtils.lerp(0.2, 0.95, rNorm) * pulse;
          col[i3 + 2] = THREE.MathUtils.lerp(0.5, 1.0, rNorm) * pulse;
        } else {
          col[i3] = rBase * pulse * (0.8 + elevationNorm * 0.4);
          col[i3 + 1] = gBase * pulse;
          col[i3 + 2] = bBase * pulse;
        }
      }
    }

    posAttr.needsUpdate = true;
    if (updateColors && colAttr) colAttr.needsUpdate = true;
  });

  const pointSize = useMemo(() => {
    switch (mode) {
      case 'cyclone': return 0.22;
      case 'heavy': return 0.16;
      case 'drizzle': return 0.11;
      case 'dark_mode': return 0.18;
      default: return 0.08;
    }
  }, [mode]);

  const opacity = useMemo(() => {
    switch (mode) {
      case 'cyclone': return 0.92;
      case 'heavy': return 0.78;
      case 'drizzle': return 0.58;
      case 'dark_mode': return 0.82;
      default: return 0.38;
    }
  }, [mode]);

  return (
    <Points ref={ref} positions={positions} colors={colors} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        vertexColors
        size={pointSize}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={opacity}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
};

/**
 * 3D Topographic Wireframe Surface Contours
 */
const TopographyGrid = ({ mode, phase }: { mode: AtmosphereMode; phase: number }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const gridResolution = 48;
  const gridSize = 64;
  const albedoConfig = useMemo(() => getSeasonAlbedo(phase, mode), [phase, mode]);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(gridSize, gridSize, gridResolution, gridResolution);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, getTerrainHeight(x, z));
    }
    geo.computeVertexNormals();
    return geo;
  }, [gridSize, gridResolution]);

  const wireColor = albedoConfig.wireframeColor;
  const wireOpacity = mode === 'cyclone' ? 0.24 : mode === 'heavy' ? 0.20 : 0.12;

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, -0.5, 0]}>
      <meshBasicMaterial
        wireframe
        color={wireColor}
        transparent
        opacity={wireOpacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
};

/**
 * HIGH-PERFORMANCE INSTANCED RENDERING FOR RAIN DROPLETS
 * 
 * Uses THREE.InstancedMesh with low-overhead dynamic matrix buffers:
 * - Eliminates CPU-bound point iteration lag
 * - Streamlined 3D rain droplet geometry with aerodynamic slant
 * - Zero-garbage frame execution
 */
const InstancedRainPrecipitation = ({ mode }: { mode: AtmosphereMode }) => {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null!);
  const count = mode === 'cyclone' ? 1400 : mode === 'heavy' ? 1000 : mode === 'drizzle' ? 600 : 150;

  // Streamlined 3D droplet geometry: slender elongated cylinder
  const dropGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.02, 0.04, 1.2, 4);
    geo.rotateX(Math.PI / 2); // Orient along fall vector
    return geo;
  }, []);

  const dropMaterial = useMemo(() => {
    const color = mode === 'cyclone' ? 0xfb7185 : mode === 'heavy' ? 0x67e8f9 : 0x93c5fd;
    const opacity = mode === 'cyclone' ? 0.85 : mode === 'heavy' ? 0.70 : mode === 'drizzle' ? 0.45 : 0.20;
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [mode]);

  // Rain drop physics state in a compact TypedArray: [x, y, z, vx, vy, vz, scale]
  const dropsData = useMemo(() => {
    const data: {
      x: number;
      y: number;
      z: number;
      speed: number;
      length: number;
      sway: number;
    }[] = [];

    for (let i = 0; i < count; i++) {
      data.push({
        x: (Math.random() - 0.5) * 55,
        y: Math.random() * 40 - 2,
        z: (Math.random() - 0.5) * 55,
        speed: 0.85 + Math.random() * 0.4,
        length: 0.6 + Math.random() * 0.7,
        sway: Math.random() * Math.PI * 2,
      });
    }
    return data;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    const mesh = instancedMeshRef.current;
    if (!mesh) return;

    const dt = Math.min(delta, 0.05);
    const fallSpeed = (mode === 'cyclone' ? 44 : mode === 'heavy' ? 34 : mode === 'drizzle' ? 18 : 6) * dt;
    const windSlantX = (mode === 'cyclone' ? 14 : mode === 'heavy' ? 9 : mode === 'drizzle' ? 3 : 0.8) * dt;
    const windSlantZ = (mode === 'cyclone' ? 6 : mode === 'heavy' ? 4 : mode === 'drizzle' ? 1.2 : 0.4) * dt;

    for (let i = 0; i < count; i++) {
      const d = dropsData[i];

      d.y -= fallSpeed * d.speed;
      d.x += windSlantX * d.speed;
      d.z += windSlantZ * d.speed;

      // Ground collision & wrap-around
      const terrainHeight = getTerrainHeight(d.x, d.z);
      if (d.y < terrainHeight || d.y < -12.0 || d.x > 32 || d.x < -32 || d.z > 32 || d.z < -32) {
        d.y = 32 + Math.random() * 8;
        d.x = (Math.random() - 0.5) * 55;
        d.z = (Math.random() - 0.5) * 55;
      }

      dummy.position.set(d.x, d.y, d.z);
      
      // Orient droplet with aerodynamic velocity trajectory
      dummy.rotation.x = Math.atan2(windSlantZ, fallSpeed);
      dummy.rotation.z = -Math.atan2(windSlantX, fallSpeed);
      dummy.scale.set(1.0, 1.0, d.length * (mode === 'cyclone' ? 1.6 : 1.2));
      dummy.updateMatrix();

      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[dropGeometry, dropMaterial, count]}
      frustumCulled={false}
    />
  );
};

/**
 * Refined OrbitControls with Smooth-Scroll WASD Panning & Island Focus Clamping
 */
interface CameraControllerProps {
  isLocked: boolean;
  onToggleLock: () => void;
}

const CameraController: React.FC<CameraControllerProps> = ({ isLocked, onToggleLock }) => {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const panVelocityRef = useRef<THREE.Vector3>(new THREE.Vector3());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.code === 'KeyL') {
        e.preventDefault();
        onToggleLock();
        return;
      }

      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyE'].includes(e.code)) {
        if (!isLocked) {
          keysRef.current[e.code] = true;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (keysRef.current[e.code]) {
        keysRef.current[e.code] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isLocked, onToggleLock]);

  useFrame((state, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const dt = Math.min(delta, 0.05);

    if (isLocked) {
      // Cinematic autonomous orbit around the island
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.55;
      controls.enablePan = false;
      controls.enableZoom = false;
      controls.enableRotate = false;
      controls.update();
    } else {
      // Interactive Mode: Smooth WASD + Wheel Panning & strict Island focus clamping
      controls.autoRotate = false;
      controls.enablePan = true;
      controls.enableZoom = true;
      controls.enableRotate = true;

      const keys = keysRef.current;
      const accel = 28.0;

      // Local camera orientation vectors
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3();
      right.crossVectors(camera.up, forward).negate().normalize();

      const inputVector = new THREE.Vector3();

      if (keys['KeyW'] || keys['ArrowUp']) inputVector.add(forward);
      if (keys['KeyS'] || keys['ArrowDown']) inputVector.sub(forward);
      if (keys['KeyD'] || keys['ArrowRight']) inputVector.add(right);
      if (keys['KeyA'] || keys['ArrowLeft']) inputVector.sub(right);
      if (keys['KeyE']) inputVector.y += 0.8;
      if (keys['KeyQ']) inputVector.y -= 0.8;

      if (inputVector.lengthSq() > 0) {
        inputVector.normalize().multiplyScalar(accel * dt);
        panVelocityRef.current.add(inputVector);
      }

      // Smooth Velocity Damping (Inertial deceleration)
      const currentVel = panVelocityRef.current;
      if (currentVel.lengthSq() > 0.0001) {
        camera.position.addScaledVector(currentVel, dt);
        controls.target.addScaledVector(currentVel, dt);
        currentVel.multiplyScalar(Math.max(0, 1.0 - 6.5 * dt));
      }

      // Strict Focus Clamping to 3D Island Bounding Cylinder
      // Guarantees camera target remains locked to the island regardless of zoom level
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, -11.0, 11.0);
      controls.target.z = THREE.MathUtils.clamp(controls.target.z, -11.0, 11.0);
      controls.target.y = THREE.MathUtils.clamp(controls.target.y, -1.8, 5.2);

      // Clamp camera minimum altitude to avoid sinking beneath the water surface
      if (camera.position.y < -3.0) {
        camera.position.y = -3.0;
      }

      controls.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      minPolarAngle={Math.PI / 6.0}
      maxPolarAngle={Math.PI / 2 - 0.05}
      minDistance={8}
      maxDistance={44}
      target={[0, 1.8, 0]}
      zoomSpeed={1.1}
    />
  );
};

export const WeatherBackground3D: React.FC<Props> = ({ mode, selectedSeasonPhase = 2 }) => {
  const [isCameraLocked, setIsCameraLocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('samvartaka_engine_wasd') !== 'true';
    } catch {
      return true;
    }
  });

  const toggleCameraLock = useCallback(() => {
    setIsCameraLocked(prev => {
      const nextLocked = !prev;
      try {
        window.dispatchEvent(new CustomEvent('engine-wasd-external', { detail: { active: !nextLocked } }));
      } catch (err) {
        console.error('[WeatherBackground3D] Error dispatching wasd-external:', err);
      }
      return nextLocked;
    });
  }, []);

  useEffect(() => {
    const handleEngineWasd = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail;
        if (detail && typeof detail.active === 'boolean') {
          setIsCameraLocked(!detail.active);
        }
      } catch (err) {
        console.error('[WeatherBackground3D] Error handling engine-wasd-toggle:', err);
      }
    };

    window.addEventListener('engine-wasd-toggle', handleEngineWasd);
    return () => window.removeEventListener('engine-wasd-toggle', handleEngineWasd);
  }, []);

  const isWebGLAvailable = useMemo(() => {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch {
      return false;
    }
  }, []);

  if (!isWebGLAvailable) return null;

  const albedoConfig = getSeasonAlbedo(selectedSeasonPhase, mode);

  return (
    <div className={`fixed inset-0 z-0 ${isCameraLocked ? 'pointer-events-none' : 'pointer-events-auto'}`}>
      <ThreeErrorBoundary>
        <Canvas
          dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.25)]}
          camera={{ position: [0, 8, 26], fov: 60 }}
          gl={{ powerPreference: 'high-performance', antialias: true }}
          onCreated={({ gl }) => {
            try {
              gl.setClearColor(0x000000, 0);
            } catch {
              // ignore
            }
          }}
        >
          {/* Dynamic Seasonal Sunlight & Ambient Illumination */}
          <ambientLight intensity={0.45} color={albedoConfig.lightTint} />
          <directionalLight position={[10, 22, 15]} intensity={0.85} color={albedoConfig.lightTint} />
          <directionalLight position={[-15, 12, -10]} intensity={0.35} color="#38bdf8" />

          {/* Shaded 3D Terrain Mesh with Optimized Height-Map Updates */}
          <ShadedTerrainSurface phase={selectedSeasonPhase} mode={mode} />

          {/* Reflective Low-Lying Valley Water Basin */}
          <DynamicWaterBasin mode={mode} />

          {/* Dedicated Mountain Waterfall Physics Stream with Mountain-Top Bedrock Clamping */}
          <WaterfallPhysics
            intensity={mode === 'cyclone' ? 1.8 : mode === 'heavy' ? 1.4 : mode === 'drizzle' ? 0.9 : 0.6}
            summitPosition={[-8.5, 4.2, -12.0]}
            basePosition={[-4.0, -3.5, -2.0]}
            cleftWidth={3.8}
            particleCount={1000}
          />

          {/* 3D Topographic Contour Grid */}
          <TopographyGrid mode={mode} phase={selectedSeasonPhase} />

          {/* GPU-Accelerated Neon Wind Vectors */}
          <NeonWindVectors mode={mode} />

          {/* Optimized Instanced Rain Precipitation Rendering */}
          <InstancedRainPrecipitation mode={mode} />

          {/* Refined OrbitControls with Smooth WASD Pan & Island Focus Clamping */}
          <CameraController isLocked={isCameraLocked} onToggleLock={toggleCameraLock} />
        </Canvas>
      </ThreeErrorBoundary>

      {/* Floating Interactive 3D Camera Telemetry & Lock Controller Pill */}
      <div className="fixed bottom-4 left-4 z-20 pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          onClick={toggleCameraLock}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider backdrop-blur-xl border transition-all duration-300 shadow-xl cursor-pointer ${
            isCameraLocked
              ? 'bg-slate-950/80 text-slate-300 border-white/10 hover:border-sky-400/50 hover:text-white'
              : 'bg-sky-950/90 text-sky-200 border-sky-400/80 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
          }`}
          title="Toggle camera mode (Keyboard shortcut: [L])"
        >
          {isCameraLocked ? (
            <>
              <Lock size={12} className="text-amber-400" />
              <span>[L] CAMERA: CINEMATIC</span>
            </>
          ) : (
            <>
              <Unlock size={12} className="text-sky-400 animate-pulse" />
              <span>[L] CAMERA: FREE (WASD/SCROLL)</span>
            </>
          )}
        </button>

        {!isCameraLocked && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 backdrop-blur-xl border border-white/10 text-[10px] font-mono text-slate-400 shadow-lg">
            <Move size={11} className="text-sky-400" />
            <span>WASD: Pan • Wheel: Zoom • Drag: Orbit</span>
          </div>
        )}
      </div>
    </div>
  );
};
