import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CheckCircle2, Sparkles, Trophy, X, Zap } from 'lucide-react';
import { MonsoonChallengeScenario } from '../../data/dailyChallenges';

interface DailyChallengeRewardVFX3DProps {
  scenario: MonsoonChallengeScenario;
  globeRadius: number;
  onDismiss?: () => void;
}

// Convert lat/lon to 3D Cartesian coordinates
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export const DailyChallengeRewardVFX3D: React.FC<DailyChallengeRewardVFX3DProps> = ({
  scenario,
  globeRadius,
  onDismiss,
}) => {
  const ringGroupRef = useRef<THREE.Group>(null);
  const beaconMeshRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  // Position on globe surface
  const surfacePos = useMemo(() => {
    return latLonToVector3(scenario.lat, scenario.lon, globeRadius + 0.03);
  }, [scenario.lat, scenario.lon, globeRadius]);

  // Direction normal from center
  const normal = useMemo(() => surfacePos.clone().normalize(), [surfacePos]);

  // Calculate orientation quaternion to align objects perpendicular to sphere surface
  const surfaceQuaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    q.setFromUnitVectors(up, normal);
    return q;
  }, [normal]);

  // Cylinder Beacon Geometry
  const beaconHeight = 1.4;
  const beaconGeometry = useMemo(() => {
    const geom = new THREE.CylinderGeometry(0.06, 0.015, beaconHeight, 16, 1, true);
    geom.translate(0, beaconHeight / 2, 0);
    return geom;
  }, [beaconHeight]);

  // Confetti / Celebration Sparkle Particles
  const particleCount = 120;
  const [particlePositions, particleVelocities] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      // Random spread around surface position
      pos[i * 3] = surfacePos.x;
      pos[i * 3 + 1] = surfacePos.y;
      pos[i * 3 + 2] = surfacePos.z;

      // Random velocity vector oriented predominantly outwards
      const rndVec = new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8
      );
      rndVec.add(normal.clone().multiplyScalar(1.2 + Math.random() * 1.5));
      rndVec.normalize().multiplyScalar(0.008 + Math.random() * 0.018);

      vel[i * 3] = rndVec.x;
      vel[i * 3 + 1] = rndVec.y;
      vel[i * 3 + 2] = rndVec.z;
    }
    return [pos, vel];
  }, [surfacePos, normal]);

  const particleGeom = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    return geom;
  }, [particlePositions]);

  // Animation loop
  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime();

    // 1. Beacon pulse
    if (beaconMeshRef.current) {
      const scaleY = 1 + 0.15 * Math.sin(elapsed * 4);
      beaconMeshRef.current.scale.set(1, scaleY, 1);
      const mat = beaconMeshRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.55 + 0.25 * Math.sin(elapsed * 5);
      }
    }

    // 2. Concentric Shockwave Rings
    if (ringGroupRef.current) {
      ringGroupRef.current.children.forEach((child, idx) => {
        const ring = child as THREE.Mesh;
        const progress = ((elapsed * 0.8 + idx * 0.33) % 1);
        const scale = 0.3 + progress * 2.5;
        ring.scale.set(scale, scale, scale);
        const ringMat = ring.material as THREE.MeshBasicMaterial;
        if (ringMat) {
          ringMat.opacity = Math.max(0, (1 - progress) * 0.75);
        }
      });
    }

    // 3. Particle fountain motion
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] += particleVelocities[i * 3];
        positions[i * 3 + 1] += particleVelocities[i * 3 + 1];
        positions[i * 3 + 2] += particleVelocities[i * 3 + 2];

        // Check if particle travelled too far, recycle to base
        const currentP = new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
        if (currentP.distanceTo(surfacePos) > 1.8) {
          positions[i * 3] = surfacePos.x + (Math.random() - 0.5) * 0.05;
          positions[i * 3 + 1] = surfacePos.y + (Math.random() - 0.5) * 0.05;
          positions[i * 3 + 2] = surfacePos.z + (Math.random() - 0.5) * 0.05;
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const themeColor = scenario.vfxThemeColor || '#38bdf8';

  return (
    <group>
      {/* 1. Concentric Surface Ground Rings */}
      <group position={surfacePos} quaternion={surfaceQuaternion} ref={ringGroupRef}>
        {[0, 1, 2].map((idx) => (
          <mesh key={idx} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.08, 0.12, 32]} />
            <meshBasicMaterial color={themeColor} transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>

      {/* 2. Vertical Light Column Beacon */}
      <mesh
        ref={beaconMeshRef}
        position={surfacePos}
        quaternion={surfaceQuaternion}
        geometry={beaconGeometry}
      >
        <meshBasicMaterial
          color={themeColor}
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. Ascending Sparkle Particles */}
      <points ref={particlesRef} geometry={particleGeom}>
        <pointsMaterial
          size={0.06}
          color="#fef08a" // warm gold
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 4. 3D Floating Holographic Telemetry Card */}
      <group position={surfacePos.clone().add(normal.clone().multiplyScalar(0.75))}>
        <Html center distanceFactor={14} zIndexRange={[100, 0]}>
          <div className="w-72 bg-slate-950/90 backdrop-blur-md border border-sky-400/80 rounded-xl p-3 shadow-[0_0_30px_rgba(56,189,248,0.45)] text-white font-sans pointer-events-auto transform -translate-y-2 select-none animate-in fade-in zoom-in duration-300">
            {/* Header pill */}
            <div className="flex items-center justify-between border-b border-sky-500/30 pb-2 mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center">
                  <Trophy className="w-3 h-3 text-emerald-400" />
                </div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-300">
                  Daily Challenge Victory
                </span>
              </div>
              {onDismiss && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss();
                  }}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800/80 transition-colors"
                  title="Dismiss Reward Effect"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Station & Regime Details */}
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{scenario.stationName}</span>
              </div>
              <p className="text-[10px] text-slate-300 font-mono">
                Verified: <strong className="text-sky-300">{scenario.targetRainfallRegime}</strong>
              </p>
              <p className="text-[9px] text-slate-400 leading-tight">
                Synoptic: {scenario.targetSynopticRegime}
              </p>
            </div>

            {/* Reward XP Banner */}
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
              <div className="flex items-center gap-1 text-amber-300 font-bold">
                <Sparkles className="w-3 h-3" />
                <span>+150 XP AWARDED</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-400/40 text-blue-300 text-[9px] font-bold">
                AURA ACTIVE
              </span>
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
};
