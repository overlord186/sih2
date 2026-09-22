import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { CycloneHunterAircraft, Dropsonde } from './types';
import { Plane, Radio } from 'lucide-react';

interface CycloneHunter3DProps {
  aircraft?: CycloneHunterAircraft;
  activeDropsondes?: Dropsonde[];
  globeRadius: number;
  timeSpeed: number;
  isPaused: boolean;
  onSelectDropsonde: (sonde: Dropsonde) => void;
  onEjectDropsonde?: () => void;
  onDeployDropsonde?: (sonde: Dropsonde) => void;
  showAircraftLabel?: boolean;
  targetLat?: number;
  targetLon?: number;
  isSoundMuted?: boolean;
}

// Coordinate conversion helper
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export const CycloneHunter3D: React.FC<CycloneHunter3DProps> = ({
  aircraft,
  activeDropsondes = [],
  globeRadius,
  timeSpeed,
  isPaused,
  onSelectDropsonde,
  onEjectDropsonde,
  onDeployDropsonde,
  showAircraftLabel = true,
  targetLat,
  targetLon,
  isSoundMuted,
}) => {
  const aircraftGroupRef = useRef<THREE.Group>(null);
  const leftPropRef = useRef<THREE.Mesh>(null);
  const rightPropRef = useRef<THREE.Mesh>(null);
  const strobeLightRef = useRef<THREE.PointLight>(null);

  const currentAircraft: CycloneHunterAircraft = useMemo(() => {
    if (aircraft) return aircraft;
    const lat = targetLat ?? 18.9;
    const lon = targetLon ?? 72.8;
    return {
      lat: lat + 1.2,
      lon: lon + 1.5,
      altitudeKm: 10.5,
      headingDeg: 285,
      iasKnots: 340,
      mach: 0.58,
      ambientTempC: -46.2,
      baroPressureHpa: 260,
      targetEyeLat: lat,
      targetEyeLon: lon,
      callsign: 'TEAL-71 RECON',
      agency: 'IMD Recon Alpha',
    };
  }, [aircraft, targetLat, targetLon]);

  // Flight altitude above globe
  const flightRadius = globeRadius + 0.32; // Scaled altitude in 3D

  // Compute 3D position of aircraft
  const aircraftPos = useMemo(() => {
    return latLonToVector3(currentAircraft.lat, currentAircraft.lon, flightRadius);
  }, [currentAircraft.lat, currentAircraft.lon, flightRadius]);

  // Compute orientation tangent to the sphere facing flight direction
  const rotationQuaternion = useMemo(() => {
    const normal = aircraftPos.clone().normalize();
    // Tangent vector according to heading
    const northPole = new THREE.Vector3(0, 1, 0);
    const east = northPole.clone().cross(normal).normalize();
    const north = normal.clone().cross(east).normalize();

    const headingRad = (currentAircraft.headingDeg * Math.PI) / 180;
    const forward = north.clone().multiplyScalar(Math.cos(headingRad)).add(east.clone().multiplyScalar(Math.sin(headingRad))).normalize();

    const matrix = new THREE.Matrix4();
    const right = normal.clone().cross(forward).normalize();
    matrix.makeBasis(right, normal, forward.negate());

    const q = new THREE.Quaternion();
    q.setFromRotationMatrix(matrix);
    return q;
  }, [aircraftPos, currentAircraft.headingDeg]);

  // Orbit path trail ring
  const orbitPathPoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const baseLat = currentAircraft.targetEyeLat;
    const baseLon = currentAircraft.targetEyeLon;
    const radiusDeg = 5.2; // 5.2 degrees patrol orbit radius around storm center
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      const lat = baseLat + Math.sin(angle) * (radiusDeg * 0.75);
      const lon = baseLon + Math.cos(angle) * radiusDeg;
      points.push(latLonToVector3(lat, lon, flightRadius));
    }
    return points;
  }, [currentAircraft.targetEyeLat, currentAircraft.targetEyeLon, flightRadius]);

  const orbitPathGeom = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(orbitPathPoints);
    return geom;
  }, [orbitPathPoints]);

  const orbitLine = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.35 });
    return new THREE.Line(orbitPathGeom, mat);
  }, [orbitPathGeom]);

  useFrame((state, delta) => {
    // Spin turboprops
    if (!isPaused) {
      const spinSpeed = 28 * delta * (timeSpeed / 2);
      if (leftPropRef.current) leftPropRef.current.rotation.z += spinSpeed;
      if (rightPropRef.current) rightPropRef.current.rotation.z += spinSpeed;
    }

    // Strobe navigation light
    if (strobeLightRef.current) {
      const time = state.clock.getElapsedTime();
      strobeLightRef.current.intensity = Math.sin(time * 6) > 0.85 ? 1.5 : 0.05;
    }
  });

  return (
    <group>
      {/* Recon Flight Patrol Orbit Path Trail */}
      <primitive object={orbitLine} />

      {/* Aircraft 3D Group */}
      <group
        ref={aircraftGroupRef}
        position={[aircraftPos.x, aircraftPos.y, aircraftPos.z]}
        quaternion={rotationQuaternion}
      >
        {/* Fuselage */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.022, 0.026, 0.22, 16]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.3} metalness={0.7} />
        </mesh>

        {/* Nose Radome */}
        <mesh position={[0, 0.12, 0]}>
          <sphereGeometry args={[0.021, 16, 16]} />
          <meshStandardMaterial color="#1e293b" roughness={0.6} />
        </mesh>

        {/* Cockpit Canopy */}
        <mesh position={[0, 0.06, 0.018]} rotation={[0.4, 0, 0]}>
          <boxGeometry args={[0.024, 0.04, 0.015]} />
          <meshStandardMaterial color="#0284c7" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Main Swept Wings */}
        <mesh position={[0, 0.01, 0]}>
          <boxGeometry args={[0.34, 0.005, 0.045]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.6} roughness={0.3} />
        </mesh>

        {/* Wing Tip Fuel Tanks / Pods */}
        <mesh position={[-0.17, 0.01, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.06, 8]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>
        <mesh position={[0.17, 0.01, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.06, 8]} />
          <meshStandardMaterial color="#f59e0b" />
        </mesh>

        {/* Wingtip Navigation Lights: Red on Port (Left), Green on Starboard (Right) */}
        <mesh position={[-0.175, 0.015, -0.01]}>
          <sphereGeometry args={[0.005, 8, 8]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <mesh position={[0.175, 0.015, -0.01]}>
          <sphereGeometry args={[0.005, 8, 8]} />
          <meshBasicMaterial color="#10b981" />
        </mesh>

        {/* Turboprop Engines */}
        {/* Left Engine */}
        <group position={[-0.08, 0.01, 0.02]}>
          <mesh>
            <cylinderGeometry args={[0.012, 0.014, 0.07, 12]} />
            <meshStandardMaterial color="#475569" metalness={0.8} />
          </mesh>
          <mesh ref={leftPropRef} position={[0, 0.04, 0]}>
            <boxGeometry args={[0.08, 0.002, 0.008]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>

        {/* Right Engine */}
        <group position={[0.08, 0.01, 0.02]}>
          <mesh>
            <cylinderGeometry args={[0.012, 0.014, 0.07, 12]} />
            <meshStandardMaterial color="#475569" metalness={0.8} />
          </mesh>
          <mesh ref={rightPropRef} position={[0, 0.04, 0]}>
            <boxGeometry args={[0.08, 0.002, 0.008]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>

        {/* Vertical Tail Fin & Rudder */}
        <mesh position={[0, -0.09, 0.03]} rotation={[0.4, 0, 0]}>
          <boxGeometry args={[0.004, 0.06, 0.045]} />
          <meshStandardMaterial color="#0284c7" />
        </mesh>

        {/* Horizontal Tail Stabilizer */}
        <mesh position={[0, -0.09, 0.015]}>
          <boxGeometry args={[0.11, 0.004, 0.025]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>

        {/* Anti-Collision Flashing Strobe Beacon */}
        <pointLight ref={strobeLightRef} position={[0, -0.08, 0.05]} color="#ffffff" distance={0.6} intensity={0.5} />

        {/* Floating Callout Label */}
        {showAircraftLabel && (
          <Html occlude distanceFactor={10} position={[0, 0.16, 0]}>
            <div 
              onClick={(e) => {
                e.stopPropagation();
                if (onEjectDropsonde) onEjectDropsonde();
              }}
              className="bg-slate-950/90 backdrop-blur-md px-2 py-1 rounded-md border border-cyan-400/80 shadow-lg text-[9px] font-mono text-cyan-300 flex items-center gap-1.5 whitespace-nowrap cursor-pointer hover:border-cyan-300 hover:scale-105 transition-all select-none"
              title="Click to deploy dropsonde atmospheric sounder"
            >
              <Plane className="w-3 h-3 text-cyan-400" />
              <span className="font-bold">{currentAircraft.callsign}</span>
              <span className="text-slate-400">FL{Math.round(currentAircraft.altitudeKm * 32.8)}</span>
              <span className="px-1 py-0.2 bg-cyan-900/60 rounded text-[8px] text-cyan-200 border border-cyan-700/60">
                EJECT SONDE
              </span>
            </div>
          </Html>
        )}
      </group>

      {/* Active Descending Dropsondes */}
      {activeDropsondes.map((sonde) => {
        // Sonde current height scaled
        const sondeAltRatio = Math.max(0.01, sonde.currentAltKm / 10.0);
        const sondeRadius = globeRadius + 0.02 + sondeAltRatio * 0.30;
        const sondePos = latLonToVector3(sonde.lat, sonde.lon, sondeRadius);

        const isSplashed = sonde.status === 'SPLASHED';

        return (
          <group
            key={sonde.id}
            position={[sondePos.x, sondePos.y, sondePos.z]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectDropsonde(sonde);
            }}
          >
            {/* Parachute Mesh (Only while falling) */}
            {!isSplashed && (
              <group position={[0, 0.04, 0]}>
                <mesh>
                  <coneGeometry args={[0.025, 0.02, 12, 1, true]} />
                  <meshStandardMaterial color="#f97316" side={THREE.DoubleSide} />
                </mesh>
                {/* Parachute suspension cord lines */}
                <lineSegments>
                  <edgesGeometry args={[new THREE.ConeGeometry(0.025, 0.02, 4)]} />
                  <lineBasicMaterial color="#ffffff" transparent opacity={0.6} />
                </lineSegments>
              </group>
            )}

            {/* Dropsonde Instrument Cylinder Body */}
            <mesh>
              <cylinderGeometry args={[0.006, 0.006, 0.025, 8]} />
              <meshStandardMaterial color={isSplashed ? '#10b981' : '#38bdf8'} metalness={0.9} />
            </mesh>

            {/* Sensor Telemetry Pulse Ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.015, 0.025, 16]} />
              <meshBasicMaterial color={isSplashed ? '#10b981' : '#38bdf8'} transparent opacity={0.7} side={THREE.DoubleSide} />
            </mesh>

            {/* Clickable Hover Tag */}
            <Html occlude distanceFactor={10} position={[0, 0.06, 0]}>
              <div
                className={`px-1.5 py-0.5 rounded border text-[8px] font-mono cursor-pointer transition-transform hover:scale-110 flex items-center gap-1 whitespace-nowrap shadow-md ${
                  isSplashed
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60'
                    : 'bg-sky-950/90 text-sky-300 border-sky-400/60 animate-pulse'
                }`}
              >
                <Radio className="w-2.5 h-2.5" />
                <span>SONDE {sonde.id.slice(-4)}</span>
                <span className="text-slate-400">{Math.round(sonde.currentAltKm * 10) / 10}km</span>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
};
