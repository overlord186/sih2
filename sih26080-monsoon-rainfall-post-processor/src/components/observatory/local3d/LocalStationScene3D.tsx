import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';
import { LocalBiomeProfile, BiomeArchetypeId } from '../../../data/localBiomeTerrains';

interface LocalStationScene3DProps {
  biome: LocalBiomeProfile;
  rainRateMmH: number;
  windSpeedKmH: number;
  windDirDeg: number;
  cloudBaseM: number;
  tempC: number;
  rhPct: number;
  surfaceWaterDepthCm: number;
  cameraPreset: 'TOP_DOWN' | 'OBSERVER' | 'AERIAL' | 'TOWER' | 'RUNOFF';
  isLightningActive: boolean;
  showTopoHeatmap?: boolean;
  rainDensityMultiplier?: number;
  timeOfDayHours?: number;
  isAutoOrbit?: boolean;
}

// 1. Procedural 3D Terrain Mesh
function BiomeTerrain({
  biome,
  surfaceWaterDepthCm,
  showTopoHeatmap,
}: {
  biome: LocalBiomeProfile;
  surfaceWaterDepthCm: number;
  showTopoHeatmap?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  const { geometry, waterGeometry } = useMemo(() => {
    const size = 120;
    const segments = 90;
    const geom = new THREE.PlaneGeometry(size, size, segments, segments);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    const archetype = biome.id;
    const colors = new Float32Array(pos.count * 3);
    const colorObj = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      let y = 0;

      if (archetype === 'OROGRAPHIC_CREST') {
        // Steep Western Ghats scarp to the west, sloping east
        const ridge = Math.sin(x * 0.05) * 4 + Math.cos(z * 0.04) * 3;
        const cliff = -x * 0.35 + Math.sin(z * 0.08) * 5;
        y = Math.max(-12, cliff + ridge);
      } else if (archetype === 'HIMALAYAN_VALLEY') {
        // Deep V-shaped mountain valley
        const valley = Math.abs(x) * 0.32 + Math.sin(z * 0.06) * 4;
        const crags = Math.sin(x * 0.15) * Math.cos(z * 0.15) * 2;
        y = valley + crags - 4;
      } else if (archetype === 'HIGHLAND_CLOUD_FUNNEL') {
        // Dramatic gorge cliff
        const gorge = x < 0 ? -15 + Math.sin(z * 0.1) * 3 : Math.sin(x * 0.05) * 3 + Math.cos(z * 0.05) * 2;
        y = gorge;
      } else if (archetype === 'COASTAL_METROPOLIS') {
        // Flat coastal urban shelf with a drainage canal cutting through center
        const isCanal = Math.abs(x) < 5;
        const canalBed = isCanal ? -2.2 : 0;
        const microRelief = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.4;
        y = canalBed + microRelief;
      } else if (archetype === 'RAIN_SHADOW_PLATEAU') {
        // Gently undulating dry Deccan basalt tableland
        const rolling = Math.sin(x * 0.04) * 1.8 + Math.cos(z * 0.03) * 1.5;
        const gully = Math.abs(x - 12) < 4 ? -1.5 : 0;
        y = rolling + gully;
      } else {
        // Alluvial plains & arid steppe: very gentle flood basin
        const basin = Math.sin(x * 0.03) * Math.cos(z * 0.03) * 1.2;
        const river = Math.abs(x - 8) < 6 ? -2.0 : 0;
        y = basin + river;
      }

      pos.setY(i, y);

      if (showTopoHeatmap) {
        // Topo Heatmap: Red (high) -> Yellow -> Green -> Blue (low)
        // Y mostly varies from -15 to +10
        const normalizedY = Math.max(0, Math.min(1, (y + 5) / 15)); // 0 to 1
        // Hue mapping: Blue (0.65) to Red (0.0)
        colorObj.setHSL(0.65 - normalizedY * 0.65, 1.0, 0.4);
      } else {
        colorObj.set(biome.terrainColor);
      }
      colors[i * 3] = colorObj.r;
      colors[i * 3 + 1] = colorObj.g;
      colors[i * 3 + 2] = colorObj.b;
    }

    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    // Water surface plane for depressions / canals
    const waterGeom = new THREE.PlaneGeometry(size, size, 40, 40);
    waterGeom.rotateX(-Math.PI / 2);

    return { geometry: geom, waterGeometry: waterGeom };
  }, [biome.id, showTopoHeatmap]);

  // Dynamic water plane Y-offset based on surface accumulation
  const waterLevelY = useMemo(() => {
    const baseLevel = biome.id === 'COASTAL_METROPOLIS' ? -1.0 : -1.8;
    // Each 10 cm of water elevates water plane by 0.35 3D world units
    const addOffset = (surfaceWaterDepthCm / 10) * 0.35;
    return baseLevel + addOffset;
  }, [biome.id, surfaceWaterDepthCm]);

  return (
    <group>
      {/* Solid Ground Mesh */}
      <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
        <meshStandardMaterial
          color={0xffffff}
          vertexColors={true}
          roughness={showTopoHeatmap ? 1.0 : 0.88}
          metalness={0.12}
          flatShading={false}
        />
      </mesh>

      {/* Dynamic Water Plane in Catchment Basins / Streets */}
      <mesh
        geometry={waterGeometry}
        position={[0, waterLevelY, 0]}
        receiveShadow
      >
        <meshStandardMaterial
          color={biome.waterColor}
          roughness={0.15}
          metalness={0.65}
          transparent={true}
          opacity={Math.min(0.85, 0.45 + (surfaceWaterDepthCm / 30) * 0.4)}
        />
      </mesh>

      {/* Paved Observation Platform for AWS Station */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <cylinderGeometry args={[6, 6.4, 0.25, 32]} />
        <meshStandardMaterial color="#334155" roughness={0.7} metalness={0.2} />
      </mesh>
    </group>
  );
}

// 2. Volumetric 3D Rain Particle System
function RainAndSplashParticles({
  rainRateMmH,
  windSpeedKmH,
  windDirDeg,
  rainDensityMultiplier = 1.0,
}: {
  rainRateMmH: number;
  windSpeedKmH: number;
  windDirDeg: number;
  rainDensityMultiplier?: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const splashRef = useRef<THREE.Points>(null);

  // Density scales with rain rate
  const count = useMemo(() => {
    if (rainRateMmH <= 0.5) return 0;
    const base = Math.min(6000, Math.floor(600 + (rainRateMmH / 150) * 5400));
    return Math.floor(base * rainDensityMultiplier);
  }, [rainRateMmH, rainDensityMultiplier]);

  const splashCount = useMemo(() => {
    if (rainRateMmH <= 1.0) return 0;
    const base = Math.min(1200, Math.floor(150 + (rainRateMmH / 150) * 1050));
    return Math.floor(base * rainDensityMultiplier);
  }, [rainRateMmH, rainDensityMultiplier]);

  // Rain particle buffers
  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);

    const rad = (windDirDeg * Math.PI) / 180;
    const windTiltX = Math.sin(rad) * (windSpeedKmH / 60) * 8.0;
    const windTiltZ = Math.cos(rad) * (windSpeedKmH / 60) * 8.0;

    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = Math.random() * 45;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80;

      // Vertical terminal velocity + wind shear
      vel[i * 3 + 0] = windTiltX + (Math.random() - 0.5) * 0.8;
      vel[i * 3 + 1] = -(22 + Math.random() * 12);
      vel[i * 3 + 2] = windTiltZ + (Math.random() - 0.5) * 0.8;
    }

    return { positions: pos, velocities: vel };
  }, [count, windSpeedKmH, windDirDeg]);

  // Splash particle buffers
  const splashPositions = useMemo(() => {
    const pos = new Float32Array(splashCount * 3);
    for (let i = 0; i < splashCount; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = 0.1 + Math.random() * 0.3;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    return pos;
  }, [splashCount]);

  useFrame((_, delta) => {
    if (!pointsRef.current || count === 0) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      array[idx + 0] += velocities[idx + 0] * delta;
      array[idx + 1] += velocities[idx + 1] * delta;
      array[idx + 2] += velocities[idx + 2] * delta;

      // Reset droplet when it hits ground plane
      if (array[idx + 1] <= -2) {
        array[idx + 0] = (Math.random() - 0.5) * 80;
        array[idx + 1] = 40 + Math.random() * 5;
        array[idx + 2] = (Math.random() - 0.5) * 80;
      }
    }
    posAttr.needsUpdate = true;

    // Animate splash bouncing
    if (splashRef.current && splashCount > 0) {
      const splashAttr = splashRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const sArr = splashAttr.array as Float32Array;
      for (let i = 0; i < splashCount; i++) {
        const sIdx = i * 3;
        sArr[sIdx + 1] += (Math.random() - 0.5) * 0.4 * delta;
        if (sArr[sIdx + 1] > 1.2 || sArr[sIdx + 1] < 0.05) {
          sArr[sIdx + 1] = 0.08 + Math.random() * 0.2;
        }
      }
      splashAttr.needsUpdate = true;
    }
  });

  if (count === 0) return null;

  return (
    <group>
      {/* Rain Streaks */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#93c5fd"
          size={0.22}
          transparent={true}
          opacity={Math.min(0.9, 0.4 + (rainRateMmH / 120) * 0.5)}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Surface Splash Mist */}
      {splashCount > 0 && (
        <points ref={splashRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[splashPositions, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            color="#bae6fd"
            size={0.35}
            transparent={true}
            opacity={0.65}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}
    </group>
  );
}

// 3. Automated Weather Station (AWS) Tower with Spinning Anemometer & Wind Vane
function AutomatedWeatherStation({
  windSpeedKmH,
  windDirDeg,
  rainRateMmH,
  surfaceWaterDepthCm,
}: {
  windSpeedKmH: number;
  windDirDeg: number;
  rainRateMmH: number;
  surfaceWaterDepthCm: number;
}) {
  const anemometerRef = useRef<THREE.Group>(null);
  const windVaneRef = useRef<THREE.Group>(null);
  const statusLedRef = useRef<THREE.PointLight>(null);

  useFrame((_, delta) => {
    // Spin anemometer at speed proportional to wind velocity
    if (anemometerRef.current) {
      const rotationSpeed = (windSpeedKmH / 20) * 8.5; // rad/s
      anemometerRef.current.rotation.y += rotationSpeed * delta;
    }

    // Pivot wind vane toward wind direction
    if (windVaneRef.current) {
      const targetRad = (windDirDeg * Math.PI) / 180;
      windVaneRef.current.rotation.y = THREE.MathUtils.lerp(
        windVaneRef.current.rotation.y,
        targetRad,
        0.05
      );
    }
  });

  // Severity alert indicator on AWS mast
  const alertColor = useMemo(() => {
    if (rainRateMmH > 90 || surfaceWaterDepthCm > 20 || windSpeedKmH > 80) return '#ef4444'; // Red alert
    if (rainRateMmH > 40 || surfaceWaterDepthCm > 10 || windSpeedKmH > 50) return '#f59e0b'; // Amber warning
    return '#10b981'; // Green normal
  }, [rainRateMmH, surfaceWaterDepthCm, windSpeedKmH]);

  return (
    <group position={[0, 0.25, 0]}>
      {/* Central Galvanized Steel Lattice Mast */}
      <mesh position={[0, 5, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.25, 10, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Guy wires */}
      <lineSegments>
        <edgesGeometry args={[new THREE.ConeGeometry(3.5, 9.5, 4)]} />
        <lineBasicMaterial color="#64748b" transparent opacity={0.6} />
      </lineSegments>

      {/* Solar Panel Power Unit */}
      <group position={[0.6, 6.5, 0]} rotation={[0.4, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.9, 0.05, 0.6]} />
          <meshStandardMaterial color="#1e3a8a" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Stevenson Radiation Shield (Temp & RH Sensor) */}
      <mesh position={[-0.45, 4.5, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.7, 16]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>

      {/* Tipping Bucket Rain Gauge */}
      <group position={[0.8, 1.8, 0.8]}>
        <mesh position={[0, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.18, 0.8, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.85, 0]}>
          <coneGeometry args={[0.22, 0.25, 16]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} />
        </mesh>
      </group>

      {/* Crossarm Cross-bar at 9.8m */}
      <mesh position={[0, 9.8, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 1.8, 8]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.7} />
      </mesh>

      {/* 3-Cup Spinning Anemometer (Left side of crossarm) */}
      <group position={[-0.8, 10.1, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.5, 8]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        <group ref={anemometerRef} position={[0, 0.3, 0]}>
          <mesh position={[0.25, 0, 0]}>
            <sphereGeometry args={[0.09, 8, 8, 0, Math.PI]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.5} roughness={0.2} />
          </mesh>
          <mesh position={[-0.12, 0, 0.22]} rotation={[0, (Math.PI * 2) / 3, 0]}>
            <sphereGeometry args={[0.09, 8, 8, 0, Math.PI]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.5} roughness={0.2} />
          </mesh>
          <mesh position={[-0.12, 0, -0.22]} rotation={[0, -(Math.PI * 2) / 3, 0]}>
            <sphereGeometry args={[0.09, 8, 8, 0, Math.PI]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.5} roughness={0.2} />
          </mesh>
        </group>
      </group>

      {/* Wind Vane (Right side of crossarm) */}
      <group position={[0.8, 10.1, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.5, 8]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        <group ref={windVaneRef} position={[0, 0.3, 0]}>
          <mesh position={[0, 0, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.08, 0.25, 6]} />
            <meshStandardMaterial color="#f97316" />
          </mesh>
          <mesh position={[0, 0, -0.25]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.02, 0.25, 0.35]} />
            <meshStandardMaterial color="#f97316" />
          </mesh>
        </group>
      </group>

      {/* Telemetry Status Beacon LED */}
      <mesh position={[0, 10.5, 0]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshBasicMaterial color={alertColor} />
      </mesh>
      <pointLight
        ref={statusLedRef}
        position={[0, 10.6, 0]}
        color={alertColor}
        intensity={3.5}
        distance={15}
      />
    </group>
  );
}

// 4. Biome Vegetation (Swaying Trees / Shrubs)
function BiomeFoliage({
  biome,
  windSpeedKmH,
  windDirDeg,
}: {
  biome: LocalBiomeProfile;
  windSpeedKmH: number;
  windDirDeg: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // Generate tree coordinates based on biome
  const treePositions = useMemo(() => {
    const pts: Array<{ x: number; z: number; scale: number }> = [];
    const count = biome.id === 'OROGRAPHIC_CREST' || biome.id === 'HIGHLAND_CLOUD_FUNNEL' ? 24 : 12;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = 9 + (i % 5) * 4 + Math.random() * 6;
      pts.push({
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        scale: 0.75 + Math.random() * 0.5,
      });
    }
    return pts;
  }, [biome.id]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.getElapsedTime();
    const windForce = (windSpeedKmH / 80) * 0.35;
    const sway = Math.sin(time * 3 + (windSpeedKmH * 0.1)) * windForce;

    const rad = (windDirDeg * Math.PI) / 180;
    groupRef.current.children.forEach((child, idx) => {
      child.rotation.x = Math.sin(rad) * (windForce + sway * 0.5);
      child.rotation.z = Math.cos(rad) * (windForce + Math.sin(time * 2.5 + idx) * 0.1);
    });
  });

  const foliageColor = biome.id === 'RAIN_SHADOW_PLATEAU' || biome.id === 'ARID_STEPPE_MARGIN' 
    ? '#854d0e' 
    : biome.id === 'HIMALAYAN_VALLEY' 
    ? '#064e3b' 
    : '#15803d';

  return (
    <group ref={groupRef}>
      {treePositions.map((pt, idx) => (
        <group key={idx} position={[pt.x, 0, pt.z]} scale={pt.scale}>
          {/* Trunk */}
          <mesh position={[0, 2.2, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.35, 4.5, 8]} />
            <meshStandardMaterial color="#5c3d2e" roughness={0.9} />
          </mesh>
          {/* Foliage Canopy */}
          <mesh position={[0, 4.8, 0]} castShadow>
            {biome.id === 'HIMALAYAN_VALLEY' ? (
              <coneGeometry args={[1.6, 4.2, 8]} />
            ) : biome.id === 'COASTAL_METROPOLIS' ? (
              <sphereGeometry args={[1.8, 8, 8]} />
            ) : (
              <dodecahedronGeometry args={[2.1]} />
            )}
            <meshStandardMaterial color={foliageColor} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// 5. Dynamic Sky & Lighting with Lightning
function DynamicAtmosphereAndLightning({
  rainRateMmH,
  cloudBaseM,
  isLightningActive,
  timeOfDayHours = 12,
}: {
  rainRateMmH: number;
  cloudBaseM: number;
  isLightningActive: boolean;
  timeOfDayHours?: number;
}) {
  const { scene } = useThree();

  // Dynamic sky & fog color based on rain intensity
  const { skyColor, fogDensity } = useMemo(() => {
    let baseColor = '#38bdf8';
    let density = 0.006;
    if (rainRateMmH <= 2) {
      baseColor = '#38bdf8'; density = 0.006;
    } else if (rainRateMmH <= 35) {
      baseColor = '#64748b'; density = 0.015;
    } else if (rainRateMmH <= 90) {
      baseColor = '#334155'; density = 0.032;
    } else {
      // Severe cloudburst deluge
      baseColor = '#0f172a'; density = 0.065;
    }

    // Apply night time darkening if clear/light
    if (timeOfDayHours < 6 || timeOfDayHours > 18) {
      if (rainRateMmH <= 35) {
        baseColor = '#020617'; 
      }
    }

    return { skyColor: baseColor, fogDensity: density };
  }, [rainRateMmH, timeOfDayHours]);

  // Set scene background & fog
  React.useEffect(() => {
    scene.background = new THREE.Color(skyColor);
    scene.fog = new THREE.FogExp2(skyColor, fogDensity);
  }, [scene, skyColor, fogDensity]);

  const cloudDeckY = Math.min(38, Math.max(12, (cloudBaseM / 100) * 3));

  // Compute Sun Position based on timeOfDayHours (0 to 24)
  const sunPosition = useMemo(() => {
    // 6 = sunrise (0 rad), 12 = noon (pi/2 rad), 18 = sunset (pi rad)
    const hour = Math.max(0, Math.min(24, timeOfDayHours));
    const angle = ((hour - 6) / 12) * Math.PI; 
    const radius = 50;
    const x = -Math.cos(angle) * radius; // rises east (neg x)
    const y = Math.sin(angle) * radius;  // height
    const z = 20; // slight offset
    return [x, y, z] as [number, number, number];
  }, [timeOfDayHours]);

  const timeLightMult = useMemo(() => {
    // peaks at noon (1.0), 0 before 5 and after 19
    const hour = Math.max(0, Math.min(24, timeOfDayHours));
    if (hour < 5 || hour > 19) return 0.05; // moonlight/ambient
    const peak = 1 - Math.pow((hour - 12) / 7, 2); 
    return Math.max(0, peak);
  }, [timeOfDayHours]);

  return (
    <group>
      {/* Ambient & Directional Sun/Sky Light */}
      <ambientLight intensity={isLightningActive ? 2.5 : Math.max(0.15, (0.85 - (rainRateMmH / 120) * 0.65) * Math.max(0.2, timeLightMult))} />
      <directionalLight
        position={sunPosition}
        intensity={isLightningActive ? 4.5 : Math.max(0.0, (1.2 - (rainRateMmH / 100) * 0.9) * timeLightMult * 1.5)}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {/* Lightning Flash Burst */}
      {isLightningActive && (
        <pointLight
          position={[10, 35, 10]}
          color="#e0f2fe"
          intensity={14}
          distance={150}
        />
      )}

      {/* Volumetric Cloud Ceiling Deck */}
      <mesh position={[0, cloudDeckY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial
          color={rainRateMmH > 50 ? '#1e293b' : '#94a3b8'}
          roughness={0.95}
          transparent={true}
          opacity={0.88}
        />
      </mesh>
    </group>
  );
}

// 6. Camera Controller for Smooth Transitions between Viewpoints
function CameraRig({
  preset,
  isAutoOrbit,
}: {
  preset: 'TOP_DOWN' | 'OBSERVER' | 'AERIAL' | 'TOWER' | 'RUNOFF';
  isAutoOrbit?: boolean;
}) {
  const { camera } = useThree();

  useFrame((state) => {
    let targetPos = new THREE.Vector3(0, 1.8, 9);
    let targetLook = new THREE.Vector3(0, 2.5, 0);

    if (isAutoOrbit && preset === 'TOP_DOWN') {
      const time = state.clock.getElapsedTime();
      const radius = 25;
      const speed = 0.2;
      targetPos.set(Math.cos(time * speed) * radius, 22, Math.sin(time * speed) * radius);
      targetLook.set(0, 0, 0);
    } else if (preset === 'TOP_DOWN') {
      // Closer top-down orthographic/perspective simulation view
      targetPos.set(0, 18, 0.1);
      targetLook.set(0, 0, 0);
    } else if (preset === 'OBSERVER') {
      // Ground pedestrian level
      targetPos.set(0, 1.9, 11);
      targetLook.set(0, 4.5, 0);
    } else if (preset === 'AERIAL') {
      // High drone catchment survey
      targetPos.set(22, 28, 28);
      targetLook.set(0, 0, 0);
    } else if (preset === 'TOWER') {
      // Close up of AWS anemometer and rain gauge
      targetPos.set(2.4, 9.8, 3.2);
      targetLook.set(0, 9.5, 0);
    } else if (preset === 'RUNOFF') {
      // Focus on surface water accumulation & canal channel
      targetPos.set(7, 3.5, 12);
      targetLook.set(0, -0.5, 0);
    }

    camera.position.lerp(targetPos, 0.05);
  });

  return null;
}

export const LocalStationScene3D: React.FC<LocalStationScene3DProps> = ({
  biome,
  rainRateMmH,
  windSpeedKmH,
  windDirDeg,
  cloudBaseM,
  tempC,
  rhPct,
  surfaceWaterDepthCm,
  cameraPreset,
  isLightningActive,
  showTopoHeatmap,
  rainDensityMultiplier,
  timeOfDayHours,
  isAutoOrbit,
}) => {
  return (
    <>
      <DynamicAtmosphereAndLightning
        rainRateMmH={rainRateMmH}
        cloudBaseM={cloudBaseM}
        isLightningActive={isLightningActive}
        timeOfDayHours={timeOfDayHours}
      />

      <BiomeTerrain
        biome={biome}
        surfaceWaterDepthCm={surfaceWaterDepthCm}
        showTopoHeatmap={showTopoHeatmap}
      />

      <AutomatedWeatherStation
        windSpeedKmH={windSpeedKmH}
        windDirDeg={windDirDeg}
        rainRateMmH={rainRateMmH}
        surfaceWaterDepthCm={surfaceWaterDepthCm}
      />

      <BiomeFoliage
        biome={biome}
        windSpeedKmH={windSpeedKmH}
        windDirDeg={windDirDeg}
      />

      <RainAndSplashParticles
        rainRateMmH={rainRateMmH}
        windSpeedKmH={windSpeedKmH}
        windDirDeg={windDirDeg}
        rainDensityMultiplier={rainDensityMultiplier}
      />

      <CameraRig preset={cameraPreset} isAutoOrbit={isAutoOrbit} />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxPolarAngle={Math.PI / 2 - 0.02} // Prevent going below ground
        minDistance={3}
        maxDistance={70}
      />
    </>
  );
};
