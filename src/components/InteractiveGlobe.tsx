import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, PointMaterial, Points, Html } from '@react-three/drei';
import * as THREE from 'three';
import { MET_STATIONS } from '../data/monsoonDataset';
import { StationMetadata } from '../types';
import { 
  Play, 
  Pause, 
  CloudRain, 
  Layers, 
  Eye, 
  EyeOff, 
  Compass, 
  Info, 
  ThermometerSun, 
  X, 
  ChevronRight,
  Activity,
  MapPin
} from 'lucide-react';

interface Props {
  stationStats?: Record<string, { count: number, obs: number, fcst: number, ai: number }>;
  selectedStationId?: string;
}

export interface ClimateZone {
  id: string;
  name: string;
  code: string;
  lat: number;
  lon: number;
  category: string;
  color: string;
  annualMonsoonMm: string;
  intensityTendency: 'Extreme' | 'High' | 'Moderate' | 'Low';
  phenomenon: string;
  forecastImpact: string;
  representativeArea: string;
}

export const INDIAN_CLIMATE_ZONES: ClimateZone[] = [
  {
    id: 'CZ_WEST_COAST',
    name: 'Western Ghats & Coastal Belt',
    code: 'WG',
    lat: 15.8,
    lon: 74.2,
    category: 'Tropical Heavy Orographic',
    color: '#06b6d4', // Cyan
    annualMonsoonMm: '2,200 - 3,500 mm',
    intensityTendency: 'Extreme',
    phenomenon: 'Rapid orographic lifting of Arabian Sea maritime monsoon winds against the Sahyadri crest.',
    forecastImpact: 'High risk of acute localized cloudbursts and flash river surges exceeding 120mm/24h.',
    representativeArea: 'Konkan, Goa, Coastal Karnataka & Malabar'
  },
  {
    id: 'CZ_DECCAN_RAINSHADOW',
    name: 'Deccan Interior Rain-Shadow',
    code: 'DR',
    lat: 17.1,
    lon: 76.4,
    category: 'Semi-Arid Leeward Plateau',
    color: '#f59e0b', // Amber
    annualMonsoonMm: '500 - 750 mm',
    intensityTendency: 'Moderate',
    phenomenon: 'Leeward adiabatic warming and moisture depletion after cresting the Western Ghats.',
    forecastImpact: 'Patchy convective showers; models frequently overpredict light rainfall during breaks.',
    representativeArea: 'Madhya Maharashtra, North Interior Karnataka, Marathwada'
  },
  {
    id: 'CZ_CENTRAL_TROUGH',
    name: 'Central India Monsoon Trough',
    code: 'CT',
    lat: 23.2,
    lon: 80.8,
    category: 'Sub-Humid Depression Corridor',
    color: '#3b82f6', // Blue
    annualMonsoonMm: '950 - 1,350 mm',
    intensityTendency: 'High',
    phenomenon: 'Primary tracking path for Bay of Bengal monsoon low-pressure systems and deep depressions.',
    forecastImpact: 'Sustained wide-area heavy rainfall spells lasting 3-5 consecutive days during transit.',
    representativeArea: 'Vidarbha, Chhattisgarh, East Madhya Pradesh, Odisha interior'
  },
  {
    id: 'CZ_GANGETIC_PLAIN',
    name: 'Indo-Gangetic Alluvial Basin',
    code: 'GP',
    lat: 26.2,
    lon: 83.2,
    category: 'Subtropical Continental Valley',
    color: '#8b5cf6', // Violet
    annualMonsoonMm: '700 - 1,150 mm',
    intensityTendency: 'Moderate',
    phenomenon: 'Oscillations of the seasonal Monsoon Trough axis interacting with boundary layer humidity.',
    forecastImpact: 'Intense diurnal squall lines and localized river basin flooding along Ganga tributaries.',
    representativeArea: 'Uttar Pradesh, Bihar, Gangetic West Bengal'
  },
  {
    id: 'CZ_THAR_ARID',
    name: 'Thar Desert & Western Margin',
    code: 'TH',
    lat: 26.8,
    lon: 71.4,
    category: 'Arid / Desert Continental',
    color: '#eab308', // Yellow
    annualMonsoonMm: '150 - 450 mm',
    intensityTendency: 'Low',
    phenomenon: 'Intense thermal low formation overlaid by upper-tropospheric dry anti-cyclonic westerlies.',
    forecastImpact: 'Low seasonal rainfall punctuated by rare high-intensity cloudbursts during trough dips.',
    representativeArea: 'West Rajasthan, Kutch, Barmer, Jaisalmer'
  },
  {
    id: 'CZ_NORTHEAST_FUNNEL',
    name: 'Northeast Brahmaputra Basin',
    code: 'NE',
    lat: 25.8,
    lon: 92.6,
    category: 'Humid Subtropical Orographic',
    color: '#10b981', // Emerald
    annualMonsoonMm: '1,900 - 4,200+ mm',
    intensityTendency: 'Extreme',
    phenomenon: 'Funneling of southern Bay of Bengal moisture between Meghalaya plateau and Eastern Himalayas.',
    forecastImpact: 'Persistent multi-day torrential surges and widespread Brahmaputra riverine flooding.',
    representativeArea: 'Assam Valley, Meghalaya Hills, Arunachal foothills'
  },
  {
    id: 'CZ_WESTERN_HIMALAYAS',
    name: 'Western Himalayan Montane',
    code: 'HM',
    lat: 32.2,
    lon: 76.9,
    category: 'Montane Alpine / Orographic',
    color: '#a855f7', // Purple
    annualMonsoonMm: '850 - 1,600 mm',
    intensityTendency: 'High',
    phenomenon: 'Complex mountain terrain forcing combined with occasional Western Disturbance interactions.',
    forecastImpact: 'Severe risk of localized flash floods, slope failures, and orographic cloudbursts.',
    representativeArea: 'Himachal Pradesh, Uttarakhand, Jammu & Kashmir hills'
  },
  {
    id: 'CZ_COROMANDEL_COAST',
    name: 'Coromandel Coastal Margin',
    code: 'CC',
    lat: 13.2,
    lon: 80.2,
    category: 'Tropical Maritime / Rain Shadow',
    color: '#ec4899', // Pink
    annualMonsoonMm: '900 - 1,150 mm',
    intensityTendency: 'Low',
    phenomenon: 'Shielded by Western Ghats during SW monsoon; receives over 65% of precipitation in Oct-Dec NE monsoon.',
    forecastImpact: 'Generally dry during primary June-Sept season; occasional maritime convective showers.',
    representativeArea: 'Coastal Tamil Nadu, Coastal Andhra Pradesh'
  },
];

type InspectedTarget = 
  | { type: 'station'; station: StationMetadata; stats?: { count: number, obs: number, fcst: number, ai: number } }
  | { type: 'climate'; zone: ClimateZone }
  | { type: 'subcontinent' }
  | null;

const latLonToVector3 = (lat: number, lon: number, radius: number) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  
  return new THREE.Vector3(x, y, z);
};

// Global Country Boundaries with BufferGeometry (Optimized single draw call)
const CountryBoundaries = () => {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  React.useEffect(() => {
    fetch('/countries.geojson')
      .then(res => res.json())
      .then(data => {
        const radius = 1.951; 
        const positions: number[] = [];

        const processPolygon = (coordinates: number[][]) => {
          for (let i = 0; i < coordinates.length - 1; i++) {
            const p1 = latLonToVector3(coordinates[i][1], coordinates[i][0], radius);
            const p2 = latLonToVector3(coordinates[i+1][1], coordinates[i+1][0], radius);
            positions.push(p1.x, p1.y, p1.z);
            positions.push(p2.x, p2.y, p2.z);
          }
        };

        data.features.forEach((feature: any) => {
          if (feature.geometry && feature.geometry.type === 'Polygon') {
            feature.geometry.coordinates.forEach((ring: number[][]) => processPolygon(ring));
          } else if (feature.geometry && feature.geometry.type === 'MultiPolygon') {
            feature.geometry.coordinates.forEach((polygon: number[][][]) => {
              polygon.forEach((ring: number[][]) => processPolygon(ring));
            });
          }
        });

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        setGeometry(geom);
      })
      .catch(console.error);
  }, []);

  if (!geometry) return null;

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.16} linewidth={1} />
    </lineSegments>
  );
};

// Atmospheric Particle Field
const ParticleGlobe = ({ isRotating }: { isRotating: boolean }) => {
  const pointsRef = useRef<THREE.Points>(null!);
  const count = 2800;

  const [positions, phases, speeds] = useMemo(() => {
    const p = new Float32Array(count * 3);
    const ph = new Float32Array(count);
    const sp = new Float32Array(count);
    const radius = 2.0;

    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;

      p[i * 3] = radius * Math.cos(theta) * Math.sin(phi);
      p[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
      p[i * 3 + 2] = radius * Math.cos(phi);

      const isAtmosphere = Math.random() > 0.85;
      if (isAtmosphere) {
        const extraRadius = radius + Math.random() * 0.45;
        p[i * 3] = extraRadius * Math.cos(theta) * Math.sin(phi);
        p[i * 3 + 1] = extraRadius * Math.sin(theta) * Math.sin(phi);
        p[i * 3 + 2] = extraRadius * Math.cos(phi);
      }

      ph[i] = Math.random() * Math.PI * 2;
      sp[i] = Math.random() * 0.2 + 0.1;
    }

    return [p, ph, sp];
  }, [count]);

  useFrame((state, delta) => {
    if (pointsRef.current && isRotating) {
      pointsRef.current.rotation.y += delta * 0.05;
      pointsRef.current.rotation.x += delta * 0.02;
    }
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#38bdf8"
        size={0.02}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.35}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
};

// Subcontinent Region Area (Non-colliding interactive disc)
const SubcontinentDisc = ({ 
  isHighlighted, 
  onHover, 
  onClick 
}: { 
  isHighlighted: boolean;
  onHover: (hovering: boolean) => void;
  onClick: () => void;
}) => {
  const centerPos = useMemo(() => latLonToVector3(22.0, 78.96, 1.954), []);

  const orientation = useMemo(() => {
    const normal = centerPos.clone().normalize();
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    return q;
  }, [centerPos]);

  return (
    <group position={centerPos} quaternion={orientation}>
      {/* Interactive Subcontinent Base Ring */}
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(false);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <circleGeometry args={[0.48, 36]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={isHighlighted ? 0.18 : 0.04}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Subcontinent Boundary Rings */}
      <mesh>
        <ringGeometry args={[0.46, 0.49, 48]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={isHighlighted ? 0.65 : 0.22}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

// Climate Zone Markers Component
const ClimateZoneMarkers = ({ 
  visible = true,
  activeZoneId,
  onHoverZone,
  onSelectZone
}: { 
  visible: boolean;
  activeZoneId?: string;
  onHoverZone: (zone: ClimateZone | null) => void;
  onSelectZone: (zone: ClimateZone) => void;
}) => {
  if (!visible) return null;

  return (
    <group>
      {INDIAN_CLIMATE_ZONES.map((zone) => {
        const pos = latLonToVector3(zone.lat, zone.lon, 1.968);
        const isActive = activeZoneId === zone.id;

        return (
          <group key={zone.id} position={pos}>
            {/* 3D Octahedron Gem Marker */}
            <mesh
              onPointerOver={(e) => {
                e.stopPropagation();
                onHoverZone(zone);
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                onHoverZone(null);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectZone(zone);
              }}
            >
              <octahedronGeometry args={[isActive ? 0.038 : 0.024, 0]} />
              <meshStandardMaterial
                color={zone.color}
                emissive={zone.color}
                emissiveIntensity={isActive ? 0.95 : 0.4}
                roughness={0.2}
                metalness={0.8}
              />
            </mesh>

            {/* Ground Halo Ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[isActive ? 0.032 : 0.022, isActive ? 0.048 : 0.034, 16]} />
              <meshBasicMaterial
                color={zone.color}
                transparent
                opacity={isActive ? 0.8 : 0.35}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>

            {/* Concise On-Marker Pill Label (Only when active) */}
            {isActive && (
              <Html distanceFactor={12} zIndexRange={[120, 0]} style={{ pointerEvents: 'none' }}>
                <div className="bg-slate-950/95 backdrop-blur-md px-2 py-1 rounded-md text-[11px] font-semibold text-white border border-sky-400/80 shadow-xl whitespace-nowrap transform -translate-x-1/2 -translate-y-[135%]">
                  <span className="w-1.5 h-1.5 rounded-full inline-block mr-1.5" style={{ backgroundColor: zone.color }}></span>
                  {zone.name}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
};

// Station Markers Component
const StationMarkers = ({ 
  stationStats, 
  selectedStationId,
  activeStationId,
  onHoverStation,
  onSelectStation
}: Props & {
  activeStationId?: string;
  onHoverStation: (st: StationMetadata | null, stats?: any) => void;
  onSelectStation: (st: StationMetadata) => void;
}) => {
  if (!stationStats) return null;

  return (
    <group>
      {MET_STATIONS.map((station) => {
        const stats = stationStats[station.id];
        if (!stats) return null;

        const pos = latLonToVector3(station.lat, station.lon, 1.96);
        const safeAI = (stats && stats.count > 0) ? (stats.ai / stats.count) : 0;
        const avgAI = (typeof safeAI !== 'number' || isNaN(safeAI) || !isFinite(safeAI)) ? 0 : safeAI;
        
        const isHeavy = avgAI > 64.5;
        const isModerate = avgAI > 15.5;
        
        let color = '#3b82f6'; // blue
        if (isHeavy) color = '#ef4444'; // red
        else if (isModerate) color = '#f59e0b'; // amber
        
        const isSelected = selectedStationId === station.id;
        const isActive = activeStationId === station.id || isSelected;

        return (
          <group key={station.id} position={pos}>
            <mesh 
              onPointerOver={(e) => {
                e.stopPropagation();
                onHoverStation(station, stats);
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                onHoverStation(null);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectStation(station);
              }}
            >
              <sphereGeometry args={[isActive ? 0.034 : 0.018, 16, 16]} />
              <meshBasicMaterial color={color} />
            </mesh>
            
            {/* Outer halo */}
            {(isHeavy || isActive) && (
              <mesh>
                <sphereGeometry args={[isActive ? 0.055 : 0.028, 16, 16]} />
                <meshBasicMaterial color={color} transparent opacity={0.4} blending={THREE.AdditiveBlending} />
              </mesh>
            )}

            {/* Concise On-Marker Pill Label */}
            {isActive && (
              <Html distanceFactor={12} zIndexRange={[120, 0]} style={{ pointerEvents: 'none' }}>
                <div className="bg-slate-950/95 backdrop-blur-md px-2 py-1 rounded-md text-[11px] font-semibold text-white border border-slate-700 shadow-xl whitespace-nowrap transform -translate-x-1/2 -translate-y-[135%]">
                  <span className="font-bold text-slate-100 mr-1.5">{station.name.split(' ')[0]}</span>
                  <span className="text-sky-400 font-mono">{avgAI.toFixed(1)} mm</span>
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
};

// 3D Core Globe
const GlobeCore = ({ 
  stationStats, 
  selectedStationId, 
  isRotating,
  showClimateZones,
  activeTarget,
  onHoverStation,
  onHoverZone,
  onHoverSubcontinent,
  onSelectStation,
  onSelectZone,
  onSelectSubcontinent,
}: Props & { 
  isRotating: boolean;
  showClimateZones: boolean;
  activeTarget: InspectedTarget;
  onHoverStation: (st: StationMetadata | null, stats?: any) => void;
  onHoverZone: (zone: ClimateZone | null) => void;
  onHoverSubcontinent: (hovering: boolean) => void;
  onSelectStation: (st: StationMetadata) => void;
  onSelectZone: (zone: ClimateZone) => void;
  onSelectSubcontinent: () => void;
}) => {
  const globeGroupRef = useRef<THREE.Group>(null!);

  useFrame((state, delta) => {
    if (globeGroupRef.current && isRotating) {
      globeGroupRef.current.rotation.y += delta * 0.1;
    }
  });

  const activeStationId = activeTarget?.type === 'station' ? activeTarget.station.id : undefined;
  const activeZoneId = activeTarget?.type === 'climate' ? activeTarget.zone.id : undefined;
  const isSubcontinentActive = activeTarget?.type === 'subcontinent';

  return (
    <>
      <group ref={globeGroupRef} rotation={[0, -Math.PI / 2, 0]}>
        <Sphere args={[1.95, 64, 64]}>
          <meshPhongMaterial color="#0b1329" emissive="#111c3a" shininess={45} />
        </Sphere>
        <CountryBoundaries />
        
        {/* Interactive Subcontinent Base Region */}
        <SubcontinentDisc 
          isHighlighted={isSubcontinentActive} 
          onHover={onHoverSubcontinent}
          onClick={onSelectSubcontinent}
        />

        {/* Major Indian Climate Zones Contextual Markers */}
        <ClimateZoneMarkers 
          visible={showClimateZones} 
          activeZoneId={activeZoneId}
          onHoverZone={onHoverZone}
          onSelectZone={onSelectZone}
        />

        {/* Met Stations */}
        <StationMarkers 
          stationStats={stationStats} 
          selectedStationId={selectedStationId} 
          activeStationId={activeStationId}
          onHoverStation={onHoverStation}
          onSelectStation={onSelectStation}
        />
      </group>
      <ParticleGlobe isRotating={isRotating} />
    </>
  );
};

export const InteractiveGlobe = ({ stationStats, selectedStationId }: Props) => {
  const [isRotating, setIsRotating] = useState(true);
  const [showClimateZones, setShowClimateZones] = useState(true);
  
  // Unified single active inspector target to eliminate all tooltip overlapping
  const [hoverTarget, setHoverTarget] = useState<InspectedTarget>(null);
  const [pinnedTarget, setPinnedTarget] = useState<InspectedTarget>(null);

  // Active target is either pinned or currently hovered
  const activeTarget: InspectedTarget = pinnedTarget || hoverTarget;

  // Aggregate stats across Indian Subcontinent stations
  const subcontinentMetrics = useMemo(() => {
    if (!stationStats) {
      return {
        avgAI: 27.6,
        avgObs: 26.2,
        avgFcst: 32.8,
        biasCorrection: -5.2,
        extremeCount: 2,
        moderateCount: 4,
        lightCount: 3,
        peakStation: { name: 'Mumbai (Santacruz)', value: 78.4 },
        regime: 'Active Orographic & Trough Surges',
      };
    }

    let totalAI = 0;
    let totalObs = 0;
    let totalFcst = 0;
    let totalCount = 0;
    let extremeCount = 0;
    let moderateCount = 0;
    let lightCount = 0;
    let peakStation = { name: 'N/A', value: 0 };

    MET_STATIONS.forEach((st) => {
      const s = stationStats[st.id];
      if (s && s.count > 0) {
        const meanAI = s.ai / s.count;
        const meanObs = s.obs / s.count;
        const meanFcst = s.fcst / s.count;

        totalAI += meanAI;
        totalObs += meanObs;
        totalFcst += meanFcst;
        totalCount++;

        if (meanAI > 64.5) extremeCount++;
        else if (meanAI > 15.5) moderateCount++;
        else lightCount++;

        if (meanAI > peakStation.value) {
          peakStation = { name: st.name, value: meanAI };
        }
      }
    });

    const safeCount = totalCount > 0 ? totalCount : 1;
    const avgAI = totalAI / safeCount;
    const avgObs = totalObs / safeCount;
    const avgFcst = totalFcst / safeCount;
    const biasCorrection = avgAI - avgFcst;

    let regime = 'Normal Monsoonal Regime';
    if (avgAI > 45) regime = 'Extreme Deluge & Active Surge';
    else if (avgAI > 24) regime = 'Active Orographic & Trough Surges';
    else if (avgAI > 12) regime = 'Moderate Monsoonal Convection';
    else regime = 'Subdued Monsoonal Activity';

    return {
      avgAI,
      avgObs,
      avgFcst,
      biasCorrection,
      extremeCount,
      moderateCount,
      lightCount,
      peakStation,
      regime,
    };
  }, [stationStats]);

  const handleHoverStation = (station: StationMetadata | null, stats?: any) => {
    if (!station) {
      if (hoverTarget?.type === 'station') setHoverTarget(null);
    } else {
      setHoverTarget({ type: 'station', station, stats });
    }
  };

  const handleHoverZone = (zone: ClimateZone | null) => {
    if (!zone) {
      if (hoverTarget?.type === 'climate') setHoverTarget(null);
    } else {
      setHoverTarget({ type: 'climate', zone });
    }
  };

  const handleHoverSubcontinent = (hovering: boolean) => {
    if (hovering) {
      // Only trigger subcontinent if not currently hovering a station or zone
      if (!hoverTarget || hoverTarget.type === 'subcontinent') {
        setHoverTarget({ type: 'subcontinent' });
      }
    } else {
      if (hoverTarget?.type === 'subcontinent') {
        setHoverTarget(null);
      }
    }
  };

  const toggleSubcontinentPinned = () => {
    if (pinnedTarget?.type === 'subcontinent') {
      setPinnedTarget(null);
    } else {
      setPinnedTarget({ type: 'subcontinent' });
    }
  };

  return (
    <div className="w-full h-full bg-slate-950 absolute inset-0 select-none overflow-hidden">
      <Canvas camera={{ position: [0, 0, 5.2], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1.1} />
        <directionalLight position={[-10, -5, -5]} intensity={0.35} color="#38bdf8" />
        <GlobeCore 
          stationStats={stationStats} 
          selectedStationId={selectedStationId} 
          isRotating={isRotating}
          showClimateZones={showClimateZones}
          activeTarget={activeTarget}
          onHoverStation={handleHoverStation}
          onHoverZone={handleHoverZone}
          onHoverSubcontinent={handleHoverSubcontinent}
          onSelectStation={(st) => setPinnedTarget({ type: 'station', station: st, stats: stationStats?.[st.id] })}
          onSelectZone={(zn) => setPinnedTarget({ type: 'climate', zone: zn })}
          onSelectSubcontinent={() => setPinnedTarget({ type: 'subcontinent' })}
        />
        <OrbitControls 
          enableZoom={true} 
          enablePan={false} 
          enableDamping 
          dampingFactor={0.05} 
          minDistance={2.6} 
          maxDistance={9.5} 
        />
      </Canvas>

      {/* Top Header Bar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 shadow-lg pointer-events-auto">
            <Compass className="w-4 h-4 text-sky-400 animate-spin-slow" />
            <span className="font-semibold text-xs tracking-wider text-slate-200">
              3D Synoptic Monsoon Globe
            </span>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Subcontinent Inspection Trigger */}
          <button
            onClick={toggleSubcontinentPinned}
            title="Inspect Indian Subcontinent Rainfall Intensity"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-md border ${
              activeTarget?.type === 'subcontinent'
                ? 'bg-sky-500/25 text-sky-300 border-sky-400'
                : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Subcontinent Stats</span>
            <span className="sm:hidden">Stats</span>
          </button>

          {/* Climate Zones Layer Toggle */}
          <button
            onClick={() => setShowClimateZones(!showClimateZones)}
            title="Toggle Climate Zones markers"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-md border ${
              showClimateZones
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/60'
                : 'bg-slate-900/90 text-slate-400 border-slate-700 hover:bg-slate-800'
            }`}
          >
            {showClimateZones ? <Eye className="w-3.5 h-3.5 text-indigo-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
            <span className="hidden sm:inline">Zones (8)</span>
          </button>

          {/* Pause / Resume Spin */}
          <button
            onClick={() => setIsRotating(!isRotating)}
            title={isRotating ? 'Pause Globe Rotation' : 'Resume Globe Rotation'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs font-medium transition-colors shadow-md"
          >
            {isRotating ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="hidden sm:inline">{isRotating ? 'Pause' : 'Spin'}</span>
          </button>
        </div>
      </div>

      {/* Floating HUD Synoptic Inspector Panel (Always completely visible, no overlap with 3D objects) */}
      {activeTarget && (
        <div className="absolute top-14 left-3 z-30 pointer-events-auto max-w-xs sm:max-w-sm w-full animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-slate-950/95 backdrop-blur-xl border border-slate-700/90 rounded-xl p-3.5 shadow-2xl text-white">
            {/* Header with Close / Unpin Button */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                {activeTarget.type === 'subcontinent' && <CloudRain className="w-4 h-4 text-sky-400" />}
                {activeTarget.type === 'climate' && <ThermometerSun className="w-4 h-4 text-amber-400" />}
                {activeTarget.type === 'station' && <MapPin className="w-4 h-4 text-blue-400" />}
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  {activeTarget.type === 'subcontinent' && 'Regional Intensity Overview'}
                  {activeTarget.type === 'climate' && `Climate Zone • ${activeTarget.zone.code}`}
                  {activeTarget.type === 'station' && 'Meteorological Station AI Data'}
                </span>
              </div>
              <button 
                onClick={() => { setHoverTarget(null); setPinnedTarget(null); }}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800/80 transition-colors"
                title="Dismiss panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* SUBCONTINENT CONTENT */}
            {activeTarget.type === 'subcontinent' && (
              <div className="space-y-2.5">
                <div>
                  <div className="text-sm font-bold text-slate-100">Indian Subcontinent Basin</div>
                  <div className="text-[11px] text-sky-400 font-medium">{subcontinentMetrics.regime}</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Mean AI Forecast</div>
                    <div className="text-base font-bold text-sky-400 leading-tight mt-0.5">
                      {subcontinentMetrics.avgAI.toFixed(1)} <span className="text-xs font-normal text-slate-400">mm/d</span>
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      Obs: {subcontinentMetrics.avgObs.toFixed(1)} mm
                    </div>
                  </div>

                  <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Peak Station</div>
                    <div className="text-base font-bold text-rose-400 leading-tight mt-0.5 truncate">
                      {subcontinentMetrics.peakStation.value.toFixed(1)} <span className="text-xs font-normal text-slate-400">mm</span>
                    </div>
                    <div className="text-[9px] text-slate-400 truncate mt-0.5">
                      {subcontinentMetrics.peakStation.name}
                    </div>
                  </div>
                </div>

                {/* Intensity breakdown */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>9 IMD Stations Spectrum:</span>
                    <span>{subcontinentMetrics.extremeCount} Ext / {subcontinentMetrics.moderateCount} Mod</span>
                  </div>
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-800">
                    <div 
                      className="bg-rose-500" 
                      style={{ width: `${(subcontinentMetrics.extremeCount / 9) * 100}%` }} 
                    />
                    <div 
                      className="bg-amber-500" 
                      style={{ width: `${(subcontinentMetrics.moderateCount / 9) * 100}%` }} 
                    />
                    <div 
                      className="bg-sky-500" 
                      style={{ width: `${(subcontinentMetrics.lightCount / 9) * 100}%` }} 
                    />
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 leading-relaxed pt-1 border-t border-slate-800/80">
                  <span className="text-slate-300 font-medium">Climatology: </span>
                  Arabian Sea westerly winds force orographic lifting at Western Ghats; Bay of Bengal depression axis fuels central plains.
                </div>
              </div>
            )}

            {/* CLIMATE ZONE CONTENT */}
            {activeTarget.type === 'climate' && (
              <div className="space-y-2">
                <div>
                  <div className="text-sm font-bold text-slate-100 flex items-center justify-between">
                    <span>{activeTarget.zone.name}</span>
                    <span 
                      className="text-[9px] px-1.5 py-0.5 rounded font-bold text-slate-950"
                      style={{ backgroundColor: activeTarget.zone.color }}
                    >
                      {activeTarget.zone.intensityTendency}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">{activeTarget.zone.category}</div>
                </div>

                <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800 flex items-center justify-between">
                  <div className="text-[10px] text-slate-400">Annual Monsoon Range</div>
                  <div className="text-xs font-bold text-slate-200 font-mono">{activeTarget.zone.annualMonsoonMm}</div>
                </div>

                <div className="text-[10px] text-slate-300 space-y-1">
                  <div>
                    <span className="text-slate-400 font-medium">Synoptic Driver: </span>
                    {activeTarget.zone.phenomenon}
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Forecast Impact: </span>
                    {activeTarget.zone.forecastImpact}
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-800/80 flex justify-between text-[9px] text-slate-400">
                  <span className="truncate max-w-[190px]">{activeTarget.zone.representativeArea}</span>
                  <span className="text-sky-400 font-mono">Lat {activeTarget.zone.lat}° N</span>
                </div>
              </div>
            )}

            {/* STATION CONTENT */}
            {activeTarget.type === 'station' && (() => {
              const st = activeTarget.station;
              const s = activeTarget.stats;
              const safeAI = (s && s.count > 0) ? (s.ai / s.count) : 0;
              const safeObs = (s && s.count > 0) ? (s.obs / s.count) : 0;
              const safeFcst = (s && s.count > 0) ? (s.fcst / s.count) : 0;
              const isHeavy = safeAI > 64.5;
              const isModerate = safeAI > 15.5;

              return (
                <div className="space-y-2">
                  <div>
                    <div className="text-sm font-bold text-slate-100 flex items-center justify-between">
                      <span>{st.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        isHeavy ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                        isModerate ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      }`}>
                        {isHeavy ? 'Extreme' : isModerate ? 'Moderate' : 'Light'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">{st.subdivision}, {st.state}</div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 bg-slate-900/90 rounded-lg p-2 border border-slate-800 text-center">
                    <div>
                      <div className="text-[9px] text-slate-400">Observed</div>
                      <div className="text-xs font-bold text-slate-200 mt-0.5">{safeObs.toFixed(1)} <span className="text-[8px] font-normal">mm</span></div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-400">Raw Model</div>
                      <div className="text-xs font-bold text-slate-400 mt-0.5">{safeFcst.toFixed(1)} <span className="text-[8px] font-normal">mm</span></div>
                    </div>
                    <div>
                      <div className="text-[9px] text-sky-400 font-semibold">AI Corrected</div>
                      <div className="text-xs font-bold text-sky-400 mt-0.5">{safeAI.toFixed(1)} <span className="text-[8px] font-normal">mm</span></div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span>Elevation: {st.elevationM}m</span>
                    <span className="text-slate-300">{st.climateZone.split('/')[0]}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Sleek, Non-Overlapping Bottom Legend Bar */}
      <div className="absolute bottom-3 left-3 right-3 sm:right-auto pointer-events-none z-20">
        <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800/90 rounded-lg px-3 py-1.5 shadow-xl flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5 font-medium text-slate-400 text-[10px] uppercase tracking-wider">
            <Layers className="w-3 h-3 text-sky-400" />
            Legend:
          </div>

          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]"></span>
            <span>&gt; 64.5mm</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]"></span>
            <span>15.5-64.5mm</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]"></span>
            <span>&lt; 15.5mm</span>
          </div>

          <div className="flex items-center gap-1 border-l border-slate-800 pl-3">
            <span className="w-2 h-2 rotate-45 bg-cyan-400 inline-block shadow-[0_0_6px_rgba(6,182,212,0.8)]"></span>
            <span>8 Climate Zones</span>
          </div>

          <div className="hidden md:flex items-center gap-1 text-[10px] text-slate-400 pl-1">
            <span>• Click marker to pin details</span>
          </div>
        </div>
      </div>
    </div>
  );
};
