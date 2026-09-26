import React, { useRef, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { 
  ActiveStormSystem, 
  StormSystemTrackPoint 
} from './perspectiveTypes';
import { 
  Wind, 
  Gauge, 
  Navigation, 
  Activity, 
  AlertTriangle,
  Radio,
  Eye
} from 'lucide-react';

interface StormTrackingLayer3DProps {
  storm: ActiveStormSystem;
  globeRadius: number;
  showConeOfUncertainty: boolean;
  showWindRadii: boolean;
  showPastWaypoints: boolean;
  activeTrackStep: number | null;
  onSelectTrackStep: (step: number | null) => void;
  timeSpeed: number;
  isPaused: boolean;
}

// Convert Lat/Lon coordinates to 3D Sphere Vector
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Compute normal rotation quaternion so an object faces radially outward from sphere center
function getRadialOrientation(position: THREE.Vector3): THREE.Quaternion {
  const up = new THREE.Vector3(0, 1, 0);
  const normal = position.clone().normalize();
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(up, normal);
  return quaternion;
}

export const StormTrackingLayer3D: React.FC<StormTrackingLayer3DProps> = ({
  storm,
  globeRadius,
  showConeOfUncertainty,
  showWindRadii,
  showPastWaypoints,
  activeTrackStep,
  onSelectTrackStep,
  timeSpeed,
  isPaused,
}) => {
  const vortexGroupRef = useRef<THREE.Group>(null);
  const pulseRingRef = useRef<THREE.Mesh>(null);
  const spiralParticlesRef = useRef<THREE.Points>(null);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  // Active position: either currently scrubbed track step or real-time latest step
  const activePoint = useMemo(() => {
    if (activeTrackStep !== null) {
      const found = storm.track.find((p) => p.step === activeTrackStep);
      if (found) return found;
    }
    return {
      step: 0,
      timeLabel: 'Real-Time',
      lat: storm.currentLat,
      lon: storm.currentLon,
      windKmh: storm.maxWindKmh,
      windKnots: storm.maxWindKnots,
      pressureHpa: storm.currentPressureHpa,
      category: storm.name,
      isForecast: false,
    };
  }, [storm, activeTrackStep]);

  const eyePosition = useMemo(() => {
    return latLonToVector3(activePoint.lat, activePoint.lon, globeRadius + 0.04);
  }, [activePoint.lat, activePoint.lon, globeRadius]);

  const eyeOrientation = useMemo(() => {
    return getRadialOrientation(eyePosition);
  }, [eyePosition]);

  // Split track into historical points and forecast points
  const { pastPoints, forecastPoints } = useMemo(() => {
    const past: StormSystemTrackPoint[] = [];
    const future: StormSystemTrackPoint[] = [];
    storm.track.forEach((pt) => {
      if (pt.isForecast) future.push(pt);
      else past.push(pt);
    });
    return { pastPoints: past, forecastPoints: future };
  }, [storm.track]);

  // Construct continuous 3D line geometry for historical path
  const pastPathGeometry = useMemo(() => {
    if (pastPoints.length < 2) return null;
    const vectors = pastPoints.map((pt) => 
      latLonToVector3(pt.lat, pt.lon, globeRadius + 0.02)
    );
    return new THREE.BufferGeometry().setFromPoints(vectors);
  }, [pastPoints, globeRadius]);

  // Construct continuous 3D line geometry for forecast path
  const forecastPathGeometry = useMemo(() => {
    if (forecastPoints.length === 0) return null;
    const lastPast = pastPoints[pastPoints.length - 1];
    const forecastWithOrigin = lastPast ? [lastPast, ...forecastPoints] : forecastPoints;
    const vectors = forecastWithOrigin.map((pt) => 
      latLonToVector3(pt.lat, pt.lon, globeRadius + 0.02)
    );
    return new THREE.BufferGeometry().setFromPoints(vectors);
  }, [pastPoints, forecastPoints, globeRadius]);

  // Construct Cone of Uncertainty boundary mesh across forecast points
  const coneGeometry = useMemo(() => {
    if (!showConeOfUncertainty || forecastPoints.length < 2) return null;
    const lastPast = pastPoints[pastPoints.length - 1];
    const chain = lastPast ? [lastPast, ...forecastPoints] : forecastPoints;

    const vertices: number[] = [];
    const indices: number[] = [];

    // For each point, compute left and right perpendicular vectors along sphere surface
    for (let i = 0; i < chain.length; i++) {
      const pt = chain[i];
      const uncertaintyRadiusDeg = 0.4 + i * 0.45; // Expands with forecast horizon
      const centerVec = latLonToVector3(pt.lat, pt.lon, globeRadius + 0.015);

      // Tangent vector along sphere
      const leftVec = latLonToVector3(pt.lat - uncertaintyRadiusDeg * 0.4, pt.lon - uncertaintyRadiusDeg, globeRadius + 0.015);
      const rightVec = latLonToVector3(pt.lat + uncertaintyRadiusDeg * 0.4, pt.lon + uncertaintyRadiusDeg, globeRadius + 0.015);

      vertices.push(leftVec.x, leftVec.y, leftVec.z);
      vertices.push(rightVec.x, rightVec.y, rightVec.z);

      if (i > 0) {
        const base = (i - 1) * 2;
        // Two triangles for the quad segment
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }, [showConeOfUncertainty, pastPoints, forecastPoints, globeRadius]);

  // Spiral Rainband Particles geometry
  const spiralParticlePositions = useMemo(() => {
    const count = 180;
    const positions = new Float32Array(count * 3);
    const arms = 3;

    for (let i = 0; i < count; i++) {
      const armIndex = i % arms;
      const t = (i / count);
      const angle = armIndex * ((2 * Math.PI) / arms) + t * Math.PI * 3.5;
      const radius = 0.04 + t * 0.28;

      // Planar spiral coordinates
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 0.01 + Math.sin(t * Math.PI) * 0.03;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    return positions;
  }, []);

  // Animate eye rotation, pulse beacon, and rainbands
  useFrame((_, delta) => {
    if (isPaused) return;

    const rotSpeed = 0.7 * timeSpeed * delta;
    if (vortexGroupRef.current) {
      // Invert direction for Southern Hemisphere cyclones
      const sign = activePoint.lat >= 0 ? 1 : -1;
      vortexGroupRef.current.rotation.y += rotSpeed * sign;
    }

    if (pulseRingRef.current) {
      const s = 1.0 + Math.sin(Date.now() * 0.005) * 0.25;
      pulseRingRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group name="StormTracking3DLayer">
      {/* 1. Historical Past Track Line */}
      {pastPathGeometry && (
        <lineSegments geometry={pastPathGeometry}>
          <lineBasicMaterial 
            color="#38bdf8" 
            linewidth={2.5} 
            transparent 
            opacity={0.85} 
          />
        </lineSegments>
      )}

      {/* 2. Forecast Trajectory Line */}
      {forecastPathGeometry && (
        <lineSegments geometry={forecastPathGeometry}>
          <lineDashedMaterial 
            color={storm.vfxColor || '#ec4899'} 
            dashSize={0.06} 
            gapSize={0.03} 
            linewidth={2} 
            transparent 
            opacity={0.9} 
          />
        </lineSegments>
      )}

      {/* 3. Cone of Uncertainty Mesh */}
      {coneGeometry && (
        <mesh geometry={coneGeometry}>
          <meshBasicMaterial 
            color={storm.vfxColor || '#ec4899'} 
            transparent 
            opacity={0.16} 
            side={THREE.DoubleSide} 
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 4. Track Waypoints Beads */}
      {storm.track.map((pt) => {
        if (!showPastWaypoints && !pt.isForecast && pt.step !== 4) return null;
        const pos = latLonToVector3(pt.lat, pt.lon, globeRadius + 0.035);
        const isSelected = activeTrackStep === pt.step;
        const isCurrent = !pt.isForecast && (pt.timeLabel.includes('Current') || pt.step === 4);
        const isHovered = hoveredStep === pt.step;

        const isYellowForecast = pt.isForecast;
        const beadColor = isYellowForecast 
          ? '#f59e0b' 
          : pt.windKmh > 220 
          ? '#ec4899' 
          : pt.windKmh > 140 
          ? '#ef4444' 
          : '#06b6d4';

        return (
          <group key={pt.step} position={[pos.x, pos.y, pos.z]}>
            {/* Outer Concentric Indicator Ring */}
            <mesh>
              <ringGeometry args={[0.028, 0.046, 24]} />
              <meshBasicMaterial 
                color={isYellowForecast ? '#f59e0b' : '#06b6d4'} 
                side={THREE.DoubleSide} 
                transparent 
                opacity={isSelected || isHovered ? 0.9 : 0.45} 
              />
            </mesh>

            {/* Core 3D Waypoint Sphere */}
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                onSelectTrackStep(pt.step);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredStep(pt.step);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                setHoveredStep(null);
                document.body.style.cursor = 'auto';
              }}
            >
              <sphereGeometry args={[isSelected ? 0.038 : isHovered ? 0.034 : isCurrent ? 0.03 : 0.022, 16, 16]} />
              <meshStandardMaterial
                color={beadColor}
                emissive={isSelected ? '#ffffff' : isHovered ? (isYellowForecast ? '#f59e0b' : '#38bdf8') : isCurrent ? '#38bdf8' : beadColor}
                emissiveIntensity={isSelected ? 0.9 : isHovered ? 0.8 : isCurrent ? 0.6 : 0.35}
              />
            </mesh>

            {/* Pulsing selection indicator on active scrubbed waypoint */}
            {isSelected && (
              <mesh>
                <ringGeometry args={[0.048, 0.075, 24]} />
                <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.85} />
              </mesh>
            )}

            {/* 3D Waypoint Callout Chip & Hover Telemetry */}
            <Html distanceFactor={10} position={[0, 0.065, 0]} zIndexRange={[120, 0]}>
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTrackStep(pt.step);
                }}
                className={`font-mono transition-all transform -translate-x-1/2 cursor-pointer select-none ${
                  isHovered || isSelected ? 'scale-110 z-50' : 'opacity-85 hover:opacity-100 scale-95'
                }`}
              >
                {/* Compact Permanent Badge */}
                <div className={`px-1.5 py-0.5 rounded flex items-center gap-1 text-[9px] border backdrop-blur-md shadow-lg ${
                  isYellowForecast
                    ? 'bg-amber-950/90 text-amber-300 border-amber-500/80 shadow-amber-950/50'
                    : 'bg-cyan-950/90 text-cyan-300 border-cyan-500/80 shadow-cyan-950/50'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isYellowForecast ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                  <span className="font-bold whitespace-nowrap">
                    {pt.timeLabel}
                  </span>
                  <span className="text-[8px] text-slate-300 opacity-80">
                    {pt.windKmh}km/h
                  </span>
                </div>

                {/* Expanded Tooltip Card on Hover */}
                {isHovered && !isSelected && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 p-2 rounded-lg bg-slate-950/95 border border-slate-700 text-white text-[9px] whitespace-nowrap shadow-2xl min-w-[190px]">
                    <div className="font-bold flex items-center justify-between border-b border-slate-800 pb-1 mb-1">
                      <span className={isYellowForecast ? 'text-amber-400' : 'text-cyan-400'}>
                        {isYellowForecast ? '🟡 Forecast Model Track' : '🔵 Observed Doppler Fix'}
                      </span>
                      <span className="text-slate-400">{pt.timeLabel}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-slate-300">
                      <div>Wind: <strong className="text-white">{pt.windKmh} km/h</strong></div>
                      <div>Baro: <strong className="text-rose-400">{pt.pressureHpa} hPa</strong></div>
                    </div>
                    <div className="mt-1 text-[8px] text-slate-400 italic">
                      {isYellowForecast 
                        ? 'Projected numerical ensemble trajectory' 
                        : 'Verified satellite & radar observation fix'}
                    </div>
                  </div>
                )}
              </div>
            </Html>
          </group>
        );
      })}

      {/* 5. Storm Core Eyewall & Vortex Assembly at Active Location */}
      <group position={[eyePosition.x, eyePosition.y, eyePosition.z]} quaternion={eyeOrientation}>
        {/* Rotating Eyewall & Rainband Group */}
        <group ref={vortexGroupRef}>
          {/* Eyewall Torus / Core */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.035, 0.012, 16, 32]} />
            <meshStandardMaterial 
              color={storm.vfxColor || '#ec4899'} 
              emissive={storm.vfxColor || '#ec4899'} 
              emissiveIntensity={0.6}
            />
          </mesh>

          {/* Secondary Eyewall Ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.06, 0.09, 32]} />
            <meshBasicMaterial 
              color={storm.vfxColor || '#06b6d4'} 
              transparent 
              opacity={0.35} 
              side={THREE.DoubleSide} 
            />
          </mesh>

          {/* Outer Spiral Rainband Convective Cloud Particles */}
          <points ref={spiralParticlesRef}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[spiralParticlePositions, 3]}
              />
            </bufferGeometry>
            <pointsMaterial
              size={0.018}
              color={storm.vfxColor || '#ffffff'}
              transparent
              opacity={0.75}
            />
          </points>

          {/* Wind Radii Isotach Disks (34kt Tropical Storm & 64kt Hurricane Force) */}
          {showWindRadii && (
            <>
              {/* 34-Knot Gale Radius Ring */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.22, 0.23, 48]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.4} side={THREE.DoubleSide} />
              </mesh>

              {/* 50-Knot Storm Radius Ring */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.14, 0.15, 36]} />
                <meshBasicMaterial color="#f59e0b" transparent opacity={0.45} side={THREE.DoubleSide} />
              </mesh>

              {/* 64-Knot Violent Core Radius Ring */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.08, 0.09, 32]} />
                <meshBasicMaterial color="#ef4444" transparent opacity={0.55} side={THREE.DoubleSide} />
              </mesh>
            </>
          )}
        </group>

        {/* Pulsing Outer Shockwave Beacon */}
        <mesh ref={pulseRingRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.10, 0.13, 32]} />
          <meshBasicMaterial 
            color={storm.vfxColor || '#ec4899'} 
            transparent 
            opacity={0.5} 
            side={THREE.DoubleSide} 
          />
        </mesh>

        {/* 6. Floating 3D Storm Telemetry HUD Card */}
        <Html distanceFactor={10} position={[0, 0.24, 0]} zIndexRange={[120, 0]}>
          <div className="bg-slate-950/95 backdrop-blur-xl border border-cyan-500/70 p-2.5 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.9),0_0_20px_rgba(6,182,212,0.3)] text-white select-none whitespace-nowrap min-w-[210px] transform -translate-x-1/2 pointer-events-none font-mono">
            {/* Header Line */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-[11px] font-black uppercase text-cyan-300 truncate max-w-[140px]">
                  {storm.name}
                </span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-rose-950/90 text-rose-300 border border-rose-700/60">
                {storm.type}
              </span>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px] mb-1.5">
              <div className="bg-slate-900/80 px-2 py-1 rounded border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-cyan-400" /> Min Baro:
                </span>
                <span className="font-bold text-rose-400 font-mono">
                  {activePoint.pressureHpa} hPa
                </span>
              </div>
              <div className="bg-slate-900/80 px-2 py-1 rounded border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1">
                  <Wind className="w-3 h-3 text-sky-400" /> Max Sust:
                </span>
                <span className="font-bold text-amber-300 font-mono">
                  {activePoint.windKmh} km/h
                </span>
              </div>
            </div>

            {/* Coordinates and Heading */}
            <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-800/70 pt-1">
              <span className="flex items-center gap-1">
                <Navigation className="w-2.5 h-2.5 text-cyan-400" />
                {Math.abs(activePoint.lat).toFixed(1)}°{activePoint.lat >= 0 ? 'N' : 'S'}, {Math.abs(activePoint.lon).toFixed(1)}°{activePoint.lon >= 0 ? 'E' : 'W'}
              </span>
              <span className="text-cyan-300 font-bold">
                {storm.movementHeading} @ {storm.forwardSpeedKmh} km/h
              </span>
            </div>

            {/* Time label badge */}
            <div className="mt-1 text-center">
              <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">
                Track Point: <span className="text-amber-300">{activePoint.timeLabel}</span>
              </span>
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
};
