import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { SatelliteMission } from './types';
import { Radio, Satellite, Eye, Zap } from 'lucide-react';

interface SatelliteConstellation3DProps {
  satellites: SatelliteMission[];
  globeRadius: number;
  timeSpeed: number;
  isPaused: boolean;
  selectedSatId?: string;
  onSelectSatellite: (sat: SatelliteMission) => void;
  showSwaths: boolean;
}

function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export const SATELLITE_CATALOG: SatelliteMission[] = [
  {
    id: 'INSAT_3DR',
    name: 'INSAT-3DR Met-Sounder',
    code: 'INSAT-3DR',
    altitudeKm: 35786, // Geostationary scaled
    orbitPeriodMin: 1436,
    inclinationDeg: 0,
    sensorType: 'Multispectral Optical/IR Imager & 19-Channel Sounder',
    spectralBand: 'Thermal IR (10.8 µm), Water Vapor (6.8 µm)',
    swathWidthKm: 4200,
    color: '#fbbf24',
    trailColor: '#f59e0b',
    description: 'ISRO meteorological workhorse tracking Indian Monsoon depressions and cloudburst systems over the Arabian Sea and Bay of Bengal in continuous 15-minute cycles.',
    currentLat: 0.0,
    currentLon: 74.0,
    scanActive: true,
  },
  {
    id: 'GPM_CORE',
    name: 'GPM Core Observatory',
    code: 'GPM Core',
    altitudeKm: 407, // LEO
    orbitPeriodMin: 93,
    inclinationDeg: 65,
    sensorType: 'DPR (Dual-frequency Precip Radar) & GMI Microwave',
    spectralBand: 'Ku/Ka-band (13.6 / 35.5 GHz) + 10-183 GHz passive',
    swathWidthKm: 245,
    color: '#38bdf8',
    trailColor: '#0284c7',
    description: 'NASA/JAXA flagship precipitation radar penetrating deep storm clouds to map rainfall droplet size distribution and 3D rain rate columns.',
    currentLat: 18.5,
    currentLon: 78.0,
    scanActive: true,
  },
  {
    id: 'SENTINEL_5P',
    name: 'Sentinel-5P Tropomi',
    code: 'Sentinel-5P',
    altitudeKm: 824, // Polar Sun-Sync
    orbitPeriodMin: 101,
    inclinationDeg: 98.7,
    sensorType: 'TROPOMI UV-VIS-NIR-SWIR Spectrometer',
    spectralBand: 'Aerosol Index, Water Vapor, Tropospheric Nitrogen & Ozone',
    swathWidthKm: 2600,
    color: '#a855f7',
    trailColor: '#9333ea',
    description: 'ESA Copernicus atmospheric sounder monitoring boundary-layer aerosol optical depth and moisture transport across the Indian subcontinent.',
    currentLat: 28.0,
    currentLon: 72.0,
    scanActive: true,
  },
];

export const SatelliteConstellation3D: React.FC<SatelliteConstellation3DProps> = ({
  satellites,
  globeRadius,
  timeSpeed,
  isPaused,
  selectedSatId,
  onSelectSatellite,
  showSwaths,
}) => {
  const satRefs = useRef<{ [id: string]: THREE.Group | null }>({});
  const [hoveredSatId, setHoveredSatId] = useState<string | null>(null);

  // Compute orbital spline paths for each satellite
  const orbitSplines = useMemo(() => {
    return satellites.map((sat) => {
      const points: THREE.Vector3[] = [];
      const numPoints = 100;
      // Scaled 3D orbital radius
      const r = sat.id === 'INSAT_3DR' ? globeRadius + 1.6 : sat.id === 'SENTINEL_5P' ? globeRadius + 0.95 : globeRadius + 0.65;

      const incRad = (sat.inclinationDeg * Math.PI) / 180;

      for (let i = 0; i <= numPoints; i++) {
        const u = (i / numPoints) * Math.PI * 2;
        // Orbital inclination rotation
        const x = r * Math.cos(u);
        const y = r * Math.sin(u) * Math.sin(incRad);
        const z = r * Math.sin(u) * Math.cos(incRad);
        points.push(new THREE.Vector3(x, y, z));
      }
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      return { id: sat.id, geom, color: sat.trailColor, r, incRad };
    });
  }, [satellites, globeRadius]);

  const orbitLines = useMemo(() => {
    return orbitSplines.map((orb) => {
      const mat = new THREE.LineBasicMaterial({ color: orb.color, transparent: true, opacity: 0.35 });
      const line = new THREE.Line(orb.geom, mat);
      return { id: orb.id, line };
    });
  }, [orbitSplines]);

  useFrame((state, delta) => {
    if (isPaused) return;
    const time = state.clock.getElapsedTime();

    satellites.forEach((sat) => {
      const group = satRefs.current[sat.id];
      if (!group) return;

      const r = sat.id === 'INSAT_3DR' ? globeRadius + 1.6 : sat.id === 'SENTINEL_5P' ? globeRadius + 0.95 : globeRadius + 0.65;
      const incRad = (sat.inclinationDeg * Math.PI) / 180;
      const speedMult = (sat.id === 'INSAT_3DR' ? 0.08 : sat.id === 'SENTINEL_5P' ? 0.35 : 0.52) * (timeSpeed / 2);

      const u = time * speedMult;
      const x = r * Math.cos(u);
      const y = r * Math.sin(u) * Math.sin(incRad);
      const z = r * Math.sin(u) * Math.cos(incRad);

      group.position.set(x, y, z);
      // Point satellite toward Earth center
      group.lookAt(0, 0, 0);
    });
  });

  return (
    <group>
      {/* Orbital Trails */}
      {orbitLines.map((orb) => (
        <primitive key={orb.id} object={orb.line} />
      ))}

      {/* Satellites */}
      {satellites.map((sat) => {
        const isSelected = selectedSatId === sat.id;

        return (
          <group
            key={sat.id}
            ref={(el) => {
              satRefs.current[sat.id] = el;
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectSatellite(sat);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredSatId(sat.id);
            }}
            onPointerOut={() => {
              setHoveredSatId(null);
            }}
          >
            {/* Satellite Body: Gold/Thermal Foil Cube Bus */}
            <mesh>
              <boxGeometry args={[0.07, 0.07, 0.07]} />
              <meshStandardMaterial
                color={sat.id === 'INSAT_3DR' ? '#d97706' : '#94a3b8'}
                metalness={0.9}
                roughness={0.2}
              />
            </mesh>

            {/* Solar Panel Wing Arrays */}
            <group position={[0.09, 0, 0]}>
              <mesh>
                <boxGeometry args={[0.16, 0.005, 0.06]} />
                <meshStandardMaterial color="#1e3a8a" metalness={0.8} roughness={0.2} />
              </mesh>
            </group>
            <group position={[-0.09, 0, 0]}>
              <mesh>
                <boxGeometry args={[0.16, 0.005, 0.06]} />
                <meshStandardMaterial color="#1e3a8a" metalness={0.8} roughness={0.2} />
              </mesh>
            </group>

            {/* Earth-Facing Parabolic Dish / Radar Aperture */}
            <mesh position={[0, 0, 0.045]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.03, 0.015, 0.02, 16]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
            </mesh>

            {/* Transponder Beacon Light */}
            <pointLight color={sat.color} distance={0.5} intensity={1.2} />

            {/* Volumetric Projected Ground Sensor Swath (Cone of Light towards Earth) */}
            {showSwaths && (
              <group position={[0, 0, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
                <mesh>
                  {/* Cylinder or Cone representing scanner beam */}
                  <coneGeometry
                    args={[
                      sat.id === 'INSAT_3DR' ? 0.65 : sat.id === 'SENTINEL_5P' ? 0.45 : 0.28,
                      sat.id === 'INSAT_3DR' ? 1.5 : sat.id === 'SENTINEL_5P' ? 0.9 : 0.6,
                      24,
                      1,
                      true,
                    ]}
                  />
                  <meshBasicMaterial
                    color={sat.color}
                    transparent
                    opacity={isSelected ? 0.22 : 0.10}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                  />
                </mesh>
              </group>
            )}

            {/* Callout Label Tag - occluded and visible on hover or selection */}
            {(isSelected || hoveredSatId === sat.id) && (
              <Html occlude distanceFactor={11} position={[0, 0.12, 0]}>
                <div
                  className={`px-2 py-0.5 rounded-md border text-[9px] font-mono cursor-pointer transition-all hover:scale-105 flex items-center gap-1 whitespace-nowrap shadow-lg select-none ${
                    isSelected
                      ? 'bg-amber-950/90 text-amber-300 border-amber-400 font-bold scale-110'
                      : 'bg-slate-950/90 text-slate-300 border-slate-700/80 hover:border-slate-500'
                  }`}
                >
                  <Satellite className="w-2.5 h-2.5 text-cyan-400" />
                  <span>{sat.code}</span>
                  <span className="text-[8px] text-slate-400">({sat.sensorType.slice(0, 12)}...)</span>
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
};
