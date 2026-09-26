import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { DopplerRadarTower } from './types';
import { Radio, Activity, Zap, ChevronRight, X } from 'lucide-react';

interface DopplerRadarTowers3DProps {
  globeRadius: number;
  selectedRadarId?: string;
  onSelectRadar: (radar: DopplerRadarTower) => void;
  showRadarColumns: boolean;
  timeSpeed: number;
  isPaused: boolean;
}

function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export const DOPPLER_RADAR_NETWORK: DopplerRadarTower[] = [
  {
    id: 'DWR_MUMBAI',
    stationName: 'Mumbai (Santacruz/Colaba DWR)',
    code: 'BOM-DWR',
    state: 'Maharashtra',
    lat: 19.076,
    lon: 72.8777,
    echoTopKm: 15.8,
    maxDbz: 58.4,
    vilKgM2: 52.1,
    radialVelocityMps: 28.5,
    convectiveThreat: 'Extreme',
    rainRateMmH: 84.5,
    color: '#d946ef', // Magenta/purple
    tiers: [
      { heightKm: 3.5, radiusKm: 45, dbz: 38, color: '#22c55e' },
      { heightKm: 7.0, radiusKm: 35, dbz: 48, color: '#eab308' },
      { heightKm: 11.5, radiusKm: 25, dbz: 54, color: '#ef4444' },
      { heightKm: 15.8, radiusKm: 15, dbz: 58.4, color: '#d946ef' },
    ],
  },
  {
    id: 'DWR_GOA',
    stationName: 'Goa (Altinho DWR)',
    code: 'GOA-DWR',
    state: 'Goa',
    lat: 15.4989,
    lon: 73.8278,
    echoTopKm: 14.2,
    maxDbz: 54.0,
    vilKgM2: 44.8,
    radialVelocityMps: 22.0,
    convectiveThreat: 'High',
    rainRateMmH: 62.0,
    color: '#ef4444',
    tiers: [
      { heightKm: 3.0, radiusKm: 40, dbz: 35, color: '#22c55e' },
      { heightKm: 6.8, radiusKm: 30, dbz: 44, color: '#eab308' },
      { heightKm: 10.5, radiusKm: 20, dbz: 51, color: '#ef4444' },
      { heightKm: 14.2, radiusKm: 12, dbz: 54.0, color: '#ef4444' },
    ],
  },
  {
    id: 'DWR_KOLKATA',
    stationName: 'Kolkata (Alipore DWR)',
    code: 'CCU-DWR',
    state: 'West Bengal',
    lat: 22.5726,
    lon: 88.3639,
    echoTopKm: 16.4,
    maxDbz: 61.2,
    vilKgM2: 58.6,
    radialVelocityMps: 34.2,
    convectiveThreat: 'Extreme',
    rainRateMmH: 96.0,
    color: '#a855f7',
    tiers: [
      { heightKm: 4.0, radiusKm: 50, dbz: 40, color: '#22c55e' },
      { heightKm: 8.0, radiusKm: 38, dbz: 50, color: '#ef4444' },
      { heightKm: 12.5, radiusKm: 26, dbz: 57, color: '#d946ef' },
      { heightKm: 16.4, radiusKm: 16, dbz: 61.2, color: '#a855f7' },
    ],
  },
  {
    id: 'DWR_CHERRAPUNJI',
    stationName: 'Cherrapunji (Sohra Plateau DWR)',
    code: 'SHR-DWR',
    state: 'Meghalaya',
    lat: 25.27,
    lon: 91.73,
    echoTopKm: 13.8,
    maxDbz: 56.5,
    vilKgM2: 49.0,
    radialVelocityMps: 26.5,
    convectiveThreat: 'Extreme',
    rainRateMmH: 78.0,
    color: '#ec4899',
    tiers: [
      { heightKm: 3.2, radiusKm: 35, dbz: 36, color: '#22c55e' },
      { heightKm: 7.0, radiusKm: 28, dbz: 46, color: '#eab308' },
      { heightKm: 10.8, radiusKm: 20, dbz: 52, color: '#ef4444' },
      { heightKm: 13.8, radiusKm: 14, dbz: 56.5, color: '#ec4899' },
    ],
  },
  {
    id: 'DWR_CHENNAI',
    stationName: 'Chennai (Port / Sriharikota DWR)',
    code: 'MAA-DWR',
    state: 'Tamil Nadu',
    lat: 13.0827,
    lon: 80.2707,
    echoTopKm: 12.0,
    maxDbz: 46.2,
    vilKgM2: 32.0,
    radialVelocityMps: 18.0,
    convectiveThreat: 'Moderate',
    rainRateMmH: 34.0,
    color: '#eab308',
    tiers: [
      { heightKm: 3.0, radiusKm: 40, dbz: 32, color: '#22c55e' },
      { heightKm: 6.5, radiusKm: 30, dbz: 40, color: '#eab308' },
      { heightKm: 9.5, radiusKm: 22, dbz: 44, color: '#eab308' },
      { heightKm: 12.0, radiusKm: 14, dbz: 46.2, color: '#eab308' },
    ],
  },
];

export const DopplerRadarTowers3D: React.FC<DopplerRadarTowers3DProps> = ({
  globeRadius,
  selectedRadarId,
  onSelectRadar,
  showRadarColumns,
  timeSpeed,
  isPaused,
}) => {
  const sweepBeamsRef = useRef<{ [id: string]: THREE.Mesh | null }>({});
  const [hoveredRadarId, setHoveredRadarId] = useState<string | null>(null);

  useFrame((state, delta) => {
    if (isPaused) return;
    const sweepSpeed = 3.5 * delta * (timeSpeed / 2);
    DOPPLER_RADAR_NETWORK.forEach((radar) => {
      const beam = sweepBeamsRef.current[radar.id];
      if (beam) {
        beam.rotation.z += sweepSpeed;
      }
    });
  });

  return (
    <group>
      {DOPPLER_RADAR_NETWORK.map((radar) => {
        const surfacePos = latLonToVector3(radar.lat, radar.lon, globeRadius + 0.005);
        const normal = surfacePos.clone().normalize();

        // Rotation to align vertical cylinder along sphere surface normal
        const alignQuat = new THREE.Quaternion();
        alignQuat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

        const isSelected = selectedRadarId === radar.id;
        const isHovered = hoveredRadarId === radar.id;

        // Total vertical column height scaled in 3D (0.28 units ~ 16km)
        const colHeight = (radar.echoTopKm / 16) * 0.26;
        const halfCol = colHeight / 2;

        return (
          <group
            key={radar.id}
            position={[surfacePos.x, surfacePos.y, surfacePos.z]}
            quaternion={alignQuat}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredRadarId(radar.id);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              setHoveredRadarId(null);
              document.body.style.cursor = 'auto';
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectRadar(radar);
            }}
          >
            {/* Ground Radar Pedestal Dome */}
            <mesh position={[0, 0.012, 0]}>
              <sphereGeometry args={[0.018, 16, 16]} />
              <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.6} />
            </mesh>
            <mesh position={[0, 0.004, 0]}>
              <cylinderGeometry args={[0.02, 0.022, 0.008, 16]} />
              <meshStandardMaterial color="#334155" />
            </mesh>

            {/* Rotating Radar Antenna Scan Sweep Disc */}
            <mesh
              ref={(el) => {
                sweepBeamsRef.current[radar.id] = el;
              }}
              position={[0, 0.018, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <circleGeometry args={[0.045, 16, 0, Math.PI / 3]} />
              <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} side={THREE.DoubleSide} />
            </mesh>

            {/* 3D Volumetric Radar Reflectivity Column (Echo Top Tower) */}
            {showRadarColumns && (
              <group position={[0, halfCol, 0]}>
                {/* Outer Volumetric Reflectivity Column Shell */}
                <mesh>
                  <cylinderGeometry args={[0.04, 0.055, colHeight, 24, 1, true]} />
                  <meshStandardMaterial
                    color={radar.color}
                    transparent
                    opacity={isSelected ? 0.45 : 0.28}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                  />
                </mesh>

                {/* Concentric Severe Core Tier Rings */}
                {radar.tiers.map((tier, idx) => {
                  const yTier = ((tier.heightKm / radar.echoTopKm) - 0.5) * colHeight;
                  return (
                    <mesh key={idx} position={[0, yTier, 0]} rotation={[Math.PI / 2, 0, 0]}>
                      <ringGeometry args={[0.01, 0.042 - idx * 0.006, 24]} />
                      <meshBasicMaterial
                        color={tier.color}
                        transparent
                        opacity={0.55}
                        side={THREE.DoubleSide}
                      />
                    </mesh>
                  );
                })}

                {/* Echo Top Spire Cap */}
                <mesh position={[0, halfCol, 0]}>
                  <sphereGeometry args={[0.015, 12, 12]} />
                  <meshBasicMaterial color={radar.color} />
                </mesh>
              </group>
            )}

            {/* Station Callout Tag (Only visible when hovered or selected to prevent canvas clutter) */}
            {(isSelected || isHovered) && (
              <Html distanceFactor={10} position={[0, colHeight + 0.04, 0]}>
                <div
                  className={`px-2 py-0.5 rounded-full border text-[9px] font-sans cursor-pointer transition-all hover:scale-105 flex items-center gap-1.5 whitespace-nowrap shadow-xl select-none backdrop-blur-md ${
                    isSelected
                      ? 'bg-slate-900/95 text-rose-300 border-rose-500/80 font-semibold scale-105 shadow-black/80'
                      : 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:border-slate-500'
                  }`}
                >
                  <Radio className="w-2.5 h-2.5 text-rose-400" />
                  <span className="font-semibold text-white">{radar.code}</span>
                  <span className={`text-[8px] font-mono px-1 rounded-full ${radar.maxDbz > 55 ? 'bg-rose-950 text-rose-300 border border-rose-800/60' : 'bg-amber-950 text-amber-300 border border-amber-800/60'}`}>
                    {radar.maxDbz} dBZ
                  </span>
                  <span className="text-[8px] text-slate-400 font-mono">ET {radar.echoTopKm}km</span>
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
};
