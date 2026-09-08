import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getTerrainHeight } from './WeatherBackground3D';

export interface WaterfallPhysicsProps {
  /** Waterfall flow intensity multiplier (0 to 2) */
  intensity?: number;
  /** Summit emission center [x, y, z] */
  summitPosition?: [number, number, number];
  /** Base impact pool center [x, y, z] */
  basePosition?: [number, number, number];
  /** Gorge cleft width */
  cleftWidth?: number;
  /** Number of physics stream particles */
  particleCount?: number;
}

/**
 * Custom High-Performance Waterfall Ribbon Shader Material
 * Features:
 * - Downward flowing UV advection with dual-layer procedural foam waves
 * - Analytical transparency gradient: soft fade at the summit crest and base pool (NO sky clipping)
 * - Refractive fresnel edge highlights and dynamic aerated froth bursts
 */
const createWaterfallShaderMaterial = () => {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFlowSpeed: { value: 2.8 },
      uIntensity: { value: 1.0 },
      uDeepColor: { value: new THREE.Color(0x0284c7) },   // Alpine azure blue
      uShallowColor: { value: new THREE.Color(0x38bdf8) },// Electric sky cyan
      uFoamColor: { value: new THREE.Color(0xf0f9ff) },   // Pure aerated whitewater foam
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying float vDisplacement;
      uniform float uTime;
      uniform float uFlowSpeed;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        
        // Fluid wave displacement along the falling torrent
        float wave = sin(uv.y * 18.0 - uTime * uFlowSpeed * 4.0) * cos(uv.x * 12.0) * 0.08;
        vDisplacement = wave;
        
        vec3 displacedPos = position + normal * wave;
        vec4 mvPosition = modelViewMatrix * vec4(displacedPos, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uFlowSpeed;
      uniform float uIntensity;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform vec3 uFoamColor;

      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying float vDisplacement;

      // Fast procedural pseudo-noise
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      void main() {
        // Multi-frequency advecting flow UVs
        vec2 flowUv1 = vec2(vUv.x * 3.0, vUv.y * 6.0 - uTime * uFlowSpeed);
        vec2 flowUv2 = vec2(vUv.x * 5.0 + 0.3, vUv.y * 10.0 - uTime * uFlowSpeed * 1.35);

        float n1 = noise(flowUv1);
        float n2 = noise(flowUv2);
        float turbulence = (n1 * 0.6 + n2 * 0.4);

        // Calculate foam crest lines along the plunge
        float foamPattern = smoothstep(0.48, 0.72, turbulence + vDisplacement * 2.0);
        
        // Base water color gradient from shallow cyan to deep alpine azure
        vec3 waterColor = mix(uDeepColor, uShallowColor, vUv.x * (1.0 - vUv.x) * 4.0);
        vec3 finalColor = mix(waterColor, uFoamColor, foamPattern * 0.85);

        // Fresnel edge glow for crystalline water refraction
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 2.5);
        finalColor += uShallowColor * fresnel * 0.45;

        // Smooth transparency gradient:
        // - Soft fade-in at top summit crest (vUv.y ~ 0.0 to 0.15) to prevent sharp cutoff
        // - High opacity in the main plunge (vUv.y ~ 0.15 to 0.85)
        // - Soft fade-out into the base pool (vUv.y ~ 0.85 to 1.0)
        float topFade = smoothstep(0.0, 0.12, vUv.y);
        float bottomFade = smoothstep(1.0, 0.88, vUv.y);
        float sideFade = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
        
        float alpha = (0.75 + foamPattern * 0.22) * topFade * bottomFade * sideFade * uIntensity;
        
        gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 0.92));
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
};

/**
 * Dedicated Custom Soft Particle Shader for Waterfall Droplets & Spray
 * Prevents square particle artifacts and sky floating
 */
const createParticleShaderMaterial = (isMist: boolean = false) => {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(isMist ? 0xdbeafe : 0xffffff) },
      uOpacity: { value: isMist ? 0.60 : 0.85 },
      uSize: { value: isMist ? 32.0 : 24.0 },
    },
    vertexShader: `
      attribute vec3 color;
      varying vec3 vColor;
      varying float vDepth;
      uniform float uSize;

      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vDepth = -mvPosition.z;
        gl_PointSize = uSize * (30.0 / vDepth);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec3 vColor;

      void main() {
        // Soft gaussian circular falloff
        vec2 coord = gl_PointCoord - vec2(0.5);
        float distSq = dot(coord, coord);
        if (distSq > 0.25) discard;

        float alpha = exp(-distSq * 10.0) * uOpacity;
        gl_FragColor = vec4(vColor * uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
};

/**
 * WaterfallPhysics
 * 
 * Accurately models the mountain waterfall cascade:
 * 1. Summit Constrained: Spawn positions strictly anchor to the mountain bedrock terrain height.
 * 2. Cleft Chute: Channel constriction down the rock notch.
 * 3. Parabolic Cascade: Acceleration over the gorge lip.
 * 4. Custom Fragment Shader: Realistic transparency gradient, flow velocity advection, and foam froth.
 * 5. Impact Splash & Mist: Collision-tested recycling preventing any void or sky artifacts.
 */
export const WaterfallPhysics: React.FC<WaterfallPhysicsProps> = ({
  intensity = 1.0,
  summitPosition = [-8.5, 4.2, -12.0],
  basePosition = [-4.0, -3.5, -2.0],
  cleftWidth = 3.8,
  particleCount = 1000,
}) => {
  const pointsRef = useRef<THREE.Points>(null!);
  const sprayPointsRef = useRef<THREE.Points>(null!);
  const ribbonMeshRef = useRef<THREE.Mesh>(null!);
  const shaderMatRef = useRef<THREE.ShaderMaterial | null>(null);

  const [sx, rawSy, sz] = summitPosition;
  const [bx, by, bz] = basePosition;

  // Mountain-top bedrock elevation constraint:
  // Summit Y is strictly anchored to the top of the mountain terrain model at (sx, sz)
  const summitTerrainHeight = useMemo(() => {
    return Math.max(rawSy, getTerrainHeight(sx, sz) + 0.1);
  }, [sx, rawSy, sz]);

  const sy = summitTerrainHeight;
  const fallDistance = sy - by;

  // Custom Ribbon & Particle Shader Materials
  const waterfallRibbonMaterial = useMemo(() => {
    const mat = createWaterfallShaderMaterial();
    shaderMatRef.current = mat;
    return mat;
  }, []);

  const streamParticleMaterial = useMemo(() => createParticleShaderMaterial(false), []);
  const sprayParticleMaterial = useMemo(() => createParticleShaderMaterial(true), []);

  // Geometry for the continuous fluid waterfall ribbon mesh
  const ribbonGeometry = useMemo(() => {
    const ribbonSegmentsY = 36;
    const ribbonSegmentsX = 12;
    const geo = new THREE.PlaneGeometry(cleftWidth * 1.4, fallDistance, ribbonSegmentsX, ribbonSegmentsY);
    
    // Deform the ribbon along the natural curved rock gorge profile
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = (pos.getX(i) / (cleftWidth * 1.4)) + 0.5; // 0 to 1 across width
      const v = (pos.getY(i) / fallDistance) + 0.5;       // 0 at top, 1 at bottom
      
      const fallT = 1.0 - v; // 0 at summit lip, 1 at base pool
      const streamW = cleftWidth * (0.8 + Math.sin(fallT * Math.PI) * 0.35 + fallT * 0.25);
      
      const curX = THREE.MathUtils.lerp(sx, bx, fallT) + (u - 0.5) * streamW;
      const curZ = THREE.MathUtils.lerp(sz, bz, fallT) + Math.sin(fallT * Math.PI * 0.75) * 1.4;
      const curY = sy - Math.pow(fallT, 1.4) * fallDistance;

      pos.setXYZ(i, curX, curY, curZ);
    }
    geo.computeVertexNormals();
    return geo;
  }, [cleftWidth, fallDistance, sx, sy, sz, bx, bz]);

  // Particle simulation state
  const { positions, colors, physicsData, sprayPositions, sprayData } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    const data: {
      phase: number; // 0: accumulating on summit plateau, 1: plunging down gorge
      t: number;     // 0.0 to 1.0 progress along cascade
      accumTime: number;
      maxAccumTime: number;
      laneU: number; // -0.5 to 0.5 across cleft
      speed: number;
      turbSeed: number;
    }[] = [];

    const sprayCount = Math.floor(particleCount * 0.4);
    const sPos = new Float32Array(sprayCount * 3);
    const sData: {
      vx: number;
      vy: number;
      vz: number;
      life: number;
      maxLife: number;
    }[] = [];

    const tempCol = new THREE.Color();

    for (let i = 0; i < particleCount; i++) {
      const laneU = (Math.random() - 0.5);
      const phase = Math.random() < 0.25 ? 0 : 1;
      const t = Math.random();
      const turbSeed = Math.random() * 100;
      const speed = 0.85 + Math.random() * 0.45;
      const maxAccum = 0.4 + Math.random() * 0.8;

      // Summit spawn strictly anchored to mountain bedrock face
      const spawnX = sx + laneU * cleftWidth * 1.6;
      const spawnZ = sz - 0.5 - Math.random() * 2.2;
      const spawnGroundY = getTerrainHeight(spawnX, spawnZ);
      const spawnY = Math.max(sy, spawnGroundY) + 0.04;

      let px = spawnX;
      let py = spawnY;
      let pz = spawnZ;

      if (phase === 1) {
        // Mid-stream plunge trajectory
        const fallT = t;
        const widthAtT = cleftWidth * (0.8 + Math.sin(fallT * Math.PI) * 0.35);
        px = THREE.MathUtils.lerp(sx, bx, fallT) + laneU * widthAtT;
        py = sy - Math.pow(fallT, 1.4) * fallDistance;
        pz = THREE.MathUtils.lerp(sz, bz, fallT) + Math.sin(fallT * Math.PI * 0.75) * 1.4;
      }

      pos[i * 3] = px;
      pos[i * 3 + 1] = py;
      pos[i * 3 + 2] = pz;

      // Color variation: aerated white foam vs crystalline azure
      if (Math.random() > 0.30) {
        tempCol.setHex(0xffffff);
      } else {
        tempCol.setHex(0x38bdf8);
      }
      col[i * 3] = tempCol.r;
      col[i * 3 + 1] = tempCol.g;
      col[i * 3 + 2] = tempCol.b;

      data.push({
        phase,
        t,
        accumTime: Math.random() * maxAccum,
        maxAccumTime: maxAccum,
        laneU,
        speed,
        turbSeed,
      });
    }

    // Base mist and spray particles
    for (let i = 0; i < sprayCount; i++) {
      sPos[i * 3] = bx + (Math.random() - 0.5) * (cleftWidth * 2.0);
      sPos[i * 3 + 1] = by + 0.1 + Math.random() * 1.2;
      sPos[i * 3 + 2] = bz + (Math.random() - 0.5) * 2.8;

      sData.push({
        vx: (Math.random() - 0.5) * 1.6,
        vy: 1.0 + Math.random() * 2.2,
        vz: (Math.random() - 0.5) * 1.6 + 0.6,
        life: Math.random(),
        maxLife: 0.8 + Math.random() * 0.7,
      });
    }

    return { positions: pos, colors: col, physicsData: data, sprayPositions: sPos, sprayData: sData };
  }, [particleCount, sx, sy, sz, bx, by, bz, cleftWidth, fallDistance]);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const dt = Math.min(delta, 0.05) * intensity;

    // Update Waterfall Ribbon Shader Uniforms
    if (shaderMatRef.current) {
      shaderMatRef.current.uniforms.uTime.value = time;
      shaderMatRef.current.uniforms.uIntensity.value = intensity;
    }

    // Animate Stream Particles
    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.attributes.position;
      const pos = posAttr.array as Float32Array;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const d = physicsData[i];

        if (d.phase === 0) {
          // PHASE 1: Bedrock Surface Flow on Mountain Plateau
          d.accumTime += dt;
          const creep = (d.accumTime / d.maxAccumTime);
          const curX = sx + d.laneU * cleftWidth * (1.6 - creep * 0.7) + Math.sin(time * 3.5 + d.turbSeed) * 0.12;
          const curZ = sz - (1.0 - creep) * 2.4;
          const bedrockY = getTerrainHeight(curX, curZ);
          const curY = Math.max(sy, bedrockY) + 0.04;

          pos[i3] = curX;
          pos[i3 + 1] = curY;
          pos[i3 + 2] = curZ;

          // Transition to vertical plunge upon reaching crest lip
          if (d.accumTime >= d.maxAccumTime) {
            d.phase = 1;
            d.t = 0.0;
          }
        } else {
          // PHASE 2: Directed Plunge Downward through Canyon
          d.t += dt * (1.2 * d.speed);
          const fallT = Math.min(1.0, d.t);

          const streamWidth = cleftWidth * (0.75 + Math.sin(fallT * Math.PI) * 0.35);
          const lateralTurb = Math.sin(time * 8.0 + fallT * 10.0 + d.turbSeed) * (0.10 + fallT * 0.22);

          const trajX = THREE.MathUtils.lerp(sx, bx, fallT) + d.laneU * streamWidth + lateralTurb;
          const trajZ = THREE.MathUtils.lerp(sz, bz, fallT) + Math.sin(fallT * Math.PI * 0.75) * 1.4;
          const trajY = sy - Math.pow(fallT, 1.4) * fallDistance;

          // Collision test with canyon floor / base lake
          const groundHeight = getTerrainHeight(trajX, trajZ);
          const hasImpacted = trajY <= (groundHeight + 0.12) || trajY <= (by + 0.08) || d.t >= 1.0;

          if (hasImpacted) {
            // Recycle particle back to summit plateau
            d.phase = 0;
            d.t = 0.0;
            d.accumTime = 0.0;
            d.maxAccumTime = 0.35 + Math.random() * 0.75;
            d.laneU = (Math.random() - 0.5);

            const spawnX = sx + d.laneU * cleftWidth * 1.6;
            const spawnZ = sz - 2.4;
            pos[i3] = spawnX;
            pos[i3 + 1] = Math.max(sy, getTerrainHeight(spawnX, spawnZ)) + 0.04;
            pos[i3 + 2] = spawnZ;
          } else {
            pos[i3] = trajX;
            pos[i3 + 1] = trajY;
            pos[i3 + 2] = trajZ;
          }
        }
      }
      posAttr.needsUpdate = true;
    }

    // Animate Base Mist & Spray Particles
    if (sprayPointsRef.current) {
      const sPosAttr = sprayPointsRef.current.geometry.attributes.position;
      const sPos = sPosAttr.array as Float32Array;
      const sprayCount = sprayData.length;

      for (let j = 0; j < sprayCount; j++) {
        const j3 = j * 3;
        const sd = sprayData[j];

        sd.life += dt;
        sPos[j3] += sd.vx * dt * 1.8;
        sPos[j3 + 1] += sd.vy * dt * 1.8;
        sPos[j3 + 2] += sd.vz * dt * 1.8;
        
        // Buoyancy vs Gravity
        sd.vy -= 1.6 * dt;

        if (sd.life >= sd.maxLife || sPos[j3 + 1] < by - 0.3) {
          sd.life = 0;
          sPos[j3] = bx + (Math.random() - 0.5) * (cleftWidth * 2.0);
          sPos[j3 + 1] = by + 0.1 + Math.random() * 0.3;
          sPos[j3 + 2] = bz + (Math.random() - 0.5) * 2.6;
          sd.vx = (Math.random() - 0.5) * 1.8;
          sd.vy = 1.2 + Math.random() * 2.2;
          sd.vz = (Math.random() - 0.5) * 1.6 + 0.5;
        }
      }
      sPosAttr.needsUpdate = true;
    }
  });

  return (
    <group name="WaterfallPhysicsSystem">
      {/* Dynamic Fluid Flow Waterfall Ribbon with Custom Gradient Shader */}
      <mesh
        ref={ribbonMeshRef}
        geometry={ribbonGeometry}
        material={waterfallRibbonMaterial}
      />

      {/* Directed Falling Water Stream & Mountain-Top Constrained Particles */}
      <points ref={pointsRef} material={streamParticleMaterial}>
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
      </points>

      {/* Base Impact Spray & Rising Convective Mist */}
      <points ref={sprayPointsRef} material={sprayParticleMaterial}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[sprayPositions, 3]}
          />
        </bufferGeometry>
      </points>
    </group>
  );
};
