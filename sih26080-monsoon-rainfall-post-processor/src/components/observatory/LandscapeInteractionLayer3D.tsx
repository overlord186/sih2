import React, { useRef, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { 
  MOUNTAIN_BARRIERS, 
  MONSOON_REGIMES, 
  MountainBarrierId, 
  MonsoonRegimeId,
  MountainBarrier,
  MonsoonRegime,
  BarrierStation 
} from '../../data/landscapeInteractions';
import { 
  Mountain, 
  CloudRain, 
  Wind, 
  Sun, 
  ArrowUpRight, 
  ArrowDownRight, 
  Droplets, 
  TrendingDown, 
  Flame, 
  ShieldAlert,
  X
} from 'lucide-react';

interface LandscapeInteractionLayer3DProps {
  globeRadius: number;
  activeBarrierId: MountainBarrierId;
  activeRegimeId: MonsoonRegimeId;
  showRidgeElevation: boolean;
  showLiftStreamlines: boolean;
  showRainCurtains: boolean;
  showRainShadowSwath: boolean;
  showStationPins: boolean;
  elevationMultiplier?: number;
  timeSpeed?: number;
  isPaused?: boolean;
}

// Convert Lat/Lon to 3D Sphere Vector
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export const LandscapeInteractionLayer3D: React.FC<LandscapeInteractionLayer3DProps> = ({
  globeRadius,
  activeBarrierId,
  activeRegimeId,
  showRidgeElevation,
  showLiftStreamlines,
  showRainCurtains,
  showRainShadowSwath,
  showStationPins,
  elevationMultiplier = 2.5,
  timeSpeed = 1,
  isPaused = false,
}) => {
  const [selectedStation, setSelectedStation] = useState<BarrierStation | null>(null);
  const [hoveredStationName, setHoveredStationName] = useState<string | null>(null);

  const activeBarrier = useMemo(() => {
    return MOUNTAIN_BARRIERS.find((b) => b.id === activeBarrierId) || MOUNTAIN_BARRIERS[0];
  }, [activeBarrierId]);

  const activeRegime = useMemo(() => {
    return MONSOON_REGIMES.find((r) => r.id === activeRegimeId) || MONSOON_REGIMES[0];
  }, [activeRegimeId]);

  const interactionDetail = useMemo(() => {
    return activeRegime.barrierInteractions[activeBarrierId] || activeRegime.barrierInteractions.WESTERN_GHATS;
  }, [activeRegime, activeBarrierId]);

  const streamlinesGroupRef = useRef<THREE.Group>(null);
  const rainCurtainRef = useRef<THREE.Points>(null);
  const pulseRingRef = useRef<THREE.Mesh>(null);

  // 1. Build 3D Ridge Spines for all Mountain Barriers
  const ridgeMeshes = useMemo(() => {
    return MOUNTAIN_BARRIERS.map((barrier) => {
      const isSelected = barrier.id === activeBarrierId;
      const points = barrier.ridgePoints;
      if (points.length < 2) return null;

      const baseVectors: THREE.Vector3[] = [];
      const elevatedVectors: THREE.Vector3[] = [];
      const linePositions: number[] = [];

      points.forEach((pt) => {
        // Height exaggerated for 3D visibility on the planetary sphere
        const heightOffset = (pt.heightM / 10000) * 0.12 * (elevationMultiplier / 2.0);
        const base = latLonToVector3(pt.lat, pt.lon, globeRadius + 0.008);
        const peak = latLonToVector3(pt.lat, pt.lon, globeRadius + 0.02 + heightOffset);

        baseVectors.push(base);
        elevatedVectors.push(peak);
      });

      // Construct ribbon triangles connecting base to peak along the crest
      const vertices: number[] = [];
      const indices: number[] = [];

      for (let i = 0; i < points.length; i++) {
        const b = baseVectors[i];
        const p = elevatedVectors[i];
        vertices.push(b.x, b.y, b.z); // index 2*i
        vertices.push(p.x, p.y, p.z); // index 2*i + 1

        if (i > 0) {
          const prevBase = (i - 1) * 2;
          const prevPeak = prevBase + 1;
          const currBase = i * 2;
          const currPeak = currBase + 1;

          // Quad split into 2 triangles (double sided)
          indices.push(prevBase, prevPeak, currPeak);
          indices.push(prevBase, currPeak, currBase);
        }

        // Add line points for glowing crestline
        linePositions.push(p.x, p.y, p.z);
      }

      const ribbonGeom = new THREE.BufferGeometry();
      ribbonGeom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      ribbonGeom.setIndex(indices);
      ribbonGeom.computeVertexNormals();

      const lineGeom = new THREE.BufferGeometry();
      lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

      return {
        barrier,
        isSelected,
        ribbonGeom,
        lineGeom,
        peakPos: elevatedVectors[Math.floor(elevatedVectors.length / 2)],
      };
    }).filter(Boolean);
  }, [globeRadius, elevationMultiplier, activeBarrierId]);

  // 2. Build Orographic Lift Streamlines crossing the active barrier
  const streamlineCurves = useMemo(() => {
    if (!showLiftStreamlines) return [];

    const objects: THREE.Line[] = [];
    const points = activeBarrier.ridgePoints;
    const isSWMonsoon = activeRegime.windHeadingDeg < 180;

    // Create 7 streamline transects perpendicular to the ridge
    for (let i = 0; i < points.length; i += 2) {
      const ridgePt = points[i];
      const strikeAngleRad = (activeBarrier.orientationDeg * Math.PI) / 180;
      // Normal vector to the ridge (windward side)
      const normalAngleRad = strikeAngleRad + (isSWMonsoon ? Math.PI / 2 : -Math.PI / 2);

      const offsetDist = 1.6; // degrees away
      const windwardLat = ridgePt.lat - Math.cos(normalAngleRad) * offsetDist;
      const windwardLon = ridgePt.lon - Math.sin(normalAngleRad) * offsetDist;

      const leewardLat = ridgePt.lat + Math.cos(normalAngleRad) * offsetDist;
      const leewardLon = ridgePt.lon + Math.sin(normalAngleRad) * offsetDist;

      // 4-point cubic Bezier curve simulating orographic ascent & descent
      const p0 = latLonToVector3(windwardLat, windwardLon, globeRadius + 0.012); // Sea/plain level
      const p1 = latLonToVector3(
        (windwardLat + ridgePt.lat) / 2,
        (windwardLon + ridgePt.lon) / 2,
        globeRadius + 0.035 // Rising moisture ascent
      );
      const crestHeight = (ridgePt.heightM / 10000) * 0.12 * (elevationMultiplier / 2.0);
      const p2 = latLonToVector3(ridgePt.lat, ridgePt.lon, globeRadius + 0.045 + crestHeight); // Cloud top crest
      const p3 = latLonToVector3(leewardLat, leewardLon, globeRadius + 0.015); // Descending lee föhn

      const curve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);
      const geom = new THREE.BufferGeometry().setFromPoints(curve.getPoints(24));
      const mat = new THREE.LineBasicMaterial({
        color: activeRegime.accentVfx,
        linewidth: 2,
        transparent: true,
        opacity: 0.75,
      });
      objects.push(new THREE.Line(geom, mat));
    }

    return objects;
  }, [activeBarrier, activeRegime, globeRadius, elevationMultiplier, showLiftStreamlines]);

  // 3. Build Windward Precipitation Curtain Particles
  const { rainPositions, rainColors } = useMemo(() => {
    if (!showRainCurtains) return { rainPositions: new Float32Array(0), rainColors: new Float32Array(0) };

    const count = 450;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const rainIntensity = interactionDetail.windwardRainMmDay;
    const isIntense = rainIntensity > 200;
    const isModerate = rainIntensity > 80;

    const baseColor = isIntense
      ? new THREE.Color('#ec4899') // Extreme deluge (Pink/Magenta)
      : isModerate
      ? new THREE.Color('#06b6d4') // Moderate to heavy (Electric Cyan)
      : new THREE.Color('#38bdf8'); // Light orographic showers (Sky blue)

    const points = activeBarrier.ridgePoints;
    const strikeAngleRad = (activeBarrier.orientationDeg * Math.PI) / 180;
    const isSWMonsoon = activeRegime.windHeadingDeg < 180;
    const normalAngleRad = strikeAngleRad + (isSWMonsoon ? Math.PI / 2 : -Math.PI / 2);

    for (let i = 0; i < count; i++) {
      const ptIdx = Math.floor(Math.random() * points.length);
      const refPt = points[ptIdx];
      // Scatter on the windward slope
      const dist = Math.random() * 0.9;
      const lat = refPt.lat - Math.cos(normalAngleRad) * dist + (Math.random() - 0.5) * 0.4;
      const lon = refPt.lon - Math.sin(normalAngleRad) * dist + (Math.random() - 0.5) * 0.4;
      const altitude = globeRadius + 0.015 + Math.random() * 0.04;

      const v = latLonToVector3(lat, lon, altitude);
      pos[i * 3] = v.x;
      pos[i * 3 + 1] = v.y;
      pos[i * 3 + 2] = v.z;

      // Color variation
      col[i * 3] = baseColor.r;
      col[i * 3 + 1] = baseColor.g;
      col[i * 3 + 2] = baseColor.b;
    }

    return { rainPositions: pos, rainColors: col };
  }, [activeBarrier, activeRegime, interactionDetail, globeRadius, showRainCurtains]);

  // 4. Build Leeward Rain Shadow Dry Zone Ribbon
  const rainShadowMesh = useMemo(() => {
    if (!showRainShadowSwath) return null;

    const points = activeBarrier.ridgePoints;
    if (points.length < 2) return null;

    const strikeAngleRad = (activeBarrier.orientationDeg * Math.PI) / 180;
    const isSWMonsoon = activeRegime.windHeadingDeg < 180;
    const normalAngleRad = strikeAngleRad + (isSWMonsoon ? Math.PI / 2 : -Math.PI / 2);

    const vertices: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      // Near ridge edge
      const innerV = latLonToVector3(pt.lat, pt.lon, globeRadius + 0.012);
      // Inland rain shadow plateau edge (1.5 degrees leeward)
      const outerLat = pt.lat + Math.cos(normalAngleRad) * 1.5;
      const outerLon = pt.lon + Math.sin(normalAngleRad) * 1.5;
      const outerV = latLonToVector3(outerLat, outerLon, globeRadius + 0.012);

      vertices.push(innerV.x, innerV.y, innerV.z); // 2*i
      vertices.push(outerV.x, outerV.y, outerV.z); // 2*i + 1

      if (i > 0) {
        const base = (i - 1) * 2;
        indices.push(base, base + 1, base + 3);
        indices.push(base, base + 3, base + 2);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    return geom;
  }, [activeBarrier, activeRegime, globeRadius, showRainShadowSwath]);

  // Animate streamlines and pulse effect
  useFrame((_, delta) => {
    if (isPaused) return;

    if (pulseRingRef.current) {
      const s = 1.0 + Math.sin(Date.now() * 0.006) * 0.3;
      pulseRingRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group name="LandscapeInteractionLayer3D">
      {/* 1. Mountain Ridge Ribbons and Glowing Spines */}
      {showRidgeElevation &&
        ridgeMeshes.map((r) => {
          if (!r) return null;
          return (
            <group key={r.barrier.id}>
              {/* Solid 3D Terrain Escarpment Ribbon */}
              <mesh geometry={r.ribbonGeom}>
                <meshStandardMaterial
                  color={r.isSelected ? '#38bdf8' : '#64748b'}
                  emissive={r.isSelected ? '#0284c7' : '#1e293b'}
                  emissiveIntensity={r.isSelected ? 0.6 : 0.2}
                  side={THREE.DoubleSide}
                  roughness={0.7}
                  metalness={0.2}
                />
              </mesh>

              {/* Glowing High Crestline Spine */}
              <lineSegments geometry={r.lineGeom}>
                <lineBasicMaterial
                  color={r.isSelected ? '#f0fdf4' : '#94a3b8'}
                  linewidth={r.isSelected ? 2.5 : 1}
                  transparent
                  opacity={r.isSelected ? 0.9 : 0.4}
                />
              </lineSegments>

              {/* Active Barrier Crest Landmark Marker */}
              {r.isSelected && (
                <group position={[r.peakPos.x, r.peakPos.y, r.peakPos.z]}>
                  <mesh ref={pulseRingRef}>
                    <ringGeometry args={[0.02, 0.038, 24]} />
                    <meshBasicMaterial
                      color="#38bdf8"
                      transparent
                      opacity={0.65}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                  <mesh>
                    <sphereGeometry args={[0.022, 16, 16]} />
                    <meshStandardMaterial
                      color="#f59e0b"
                      emissive="#f59e0b"
                      emissiveIntensity={0.8}
                    />
                  </mesh>

                  {/* 3D Crest Label */}
                  <Html distanceFactor={8} position={[0, 0.06, 0]} zIndexRange={[100, 0]}>
                    <div className="bg-slate-950/95 backdrop-blur-md border border-amber-500/70 px-2 py-1 rounded-lg text-white font-mono text-[10px] whitespace-nowrap shadow-lg flex items-center gap-1.5 pointer-events-none transform -translate-x-1/2">
                      <Mountain className="w-3 h-3 text-amber-400" />
                      <span className="font-bold text-amber-300">{r.barrier.peakName}</span>
                      <span className="text-slate-400">({r.barrier.maxPeakM}m)</span>
                    </div>
                  </Html>
                </group>
              )}
            </group>
          );
        })}

      {/* 2. Orographic Lift Streamlines */}
      {showLiftStreamlines &&
        streamlineCurves.map((lineObj, idx) => (
          <primitive key={idx} object={lineObj} />
        ))}

      {/* 3. Windward Orographic Rain Curtain Particles */}
      {showRainCurtains && rainPositions.length > 0 && (
        <points ref={rainCurtainRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[rainPositions, 3]}
            />
            <bufferAttribute
              attach="attributes-color"
              args={[rainColors, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.016}
            vertexColors
            transparent
            opacity={0.8}
          />
        </points>
      )}

      {/* 4. Leeward Rain Shadow Dry Zone Ribbon */}
      {showRainShadowSwath && rainShadowMesh && (
        <mesh geometry={rainShadowMesh}>
          <meshBasicMaterial
            color="#f97316" // Warm amber / foehn dry zone
            transparent
            opacity={0.22}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 5. Key Observation Stations along the Barrier */}
      {showStationPins &&
        interactionDetail.keyStations.map((station) => {
          const isWindward = station.type === 'WINDWARD';
          const isCrest = station.type === 'CREST';
          const pos = latLonToVector3(station.lat, station.lon, globeRadius + 0.025);
          const isSelected = selectedStation?.name === station.name;
          const isHovered = hoveredStationName === station.name;
          const themeColor = isCrest ? '#f59e0b' : isWindward ? '#06b6d4' : '#ef4444';

          return (
            <group key={station.name} position={[pos.x, pos.y, pos.z]}>
              {/* Outer Indicator Ring */}
              <mesh>
                <ringGeometry args={[0.022, 0.038, 24]} />
                <meshBasicMaterial
                  color={themeColor}
                  side={THREE.DoubleSide}
                  transparent
                  opacity={isSelected || isHovered ? 0.9 : 0.45}
                />
              </mesh>

              {/* Core Station Sphere */}
              <mesh
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStation(isSelected ? null : station);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHoveredStationName(station.name);
                  document.body.style.cursor = 'pointer';
                }}
                onPointerOut={() => {
                  setHoveredStationName(null);
                  document.body.style.cursor = 'auto';
                }}
              >
                <sphereGeometry args={[isSelected ? 0.028 : isHovered ? 0.024 : 0.019, 16, 16]} />
                <meshStandardMaterial
                  color={themeColor}
                  emissive={isSelected ? '#ffffff' : isHovered ? '#ffffff' : themeColor}
                  emissiveIntensity={isSelected ? 0.9 : isHovered ? 0.8 : 0.5}
                />
              </mesh>

              {/* Compact 3D Label Badge */}
              <Html distanceFactor={8} position={[0, 0.045, 0]} zIndexRange={[90, 0]}>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStation(isSelected ? null : station);
                  }}
                  className={`font-mono transition-all transform -translate-x-1/2 cursor-pointer select-none ${
                    isHovered || isSelected ? 'scale-105 z-40' : 'opacity-85 hover:opacity-100 scale-90'
                  }`}
                >
                  <div
                    className={`px-1.5 py-0.5 rounded flex items-center gap-1 text-[8px] border backdrop-blur-md shadow-md ${
                      isCrest
                        ? 'bg-amber-950/90 text-amber-300 border-amber-500/80'
                        : isWindward
                        ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/80'
                        : 'bg-rose-950/90 text-rose-300 border-rose-500/80'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isCrest ? 'bg-amber-400' : isWindward ? 'bg-cyan-400' : 'bg-rose-400'}`} />
                    <span className="font-bold whitespace-nowrap">{station.name}</span>
                    <span className="text-[7px] text-slate-300 opacity-80">
                      {isCrest ? `${station.elevationM}m` : isWindward ? 'Windward' : 'Leeward'}
                    </span>
                  </div>
                </div>
              </Html>

              {/* Station Label & Telemetry Popup */}
              {isSelected && (
                <Html distanceFactor={7} position={[0, 0.08, 0]} zIndexRange={[120, 0]}>
                  <div className="bg-slate-950/95 backdrop-blur-xl border border-cyan-500/80 p-2.5 rounded-xl text-white font-mono text-[10px] whitespace-nowrap shadow-2xl min-w-[200px] transform -translate-x-1/2 select-none z-50">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isCrest
                              ? 'bg-amber-400'
                              : isWindward
                              ? 'bg-cyan-400'
                              : 'bg-rose-400'
                          }`}
                        />
                        <span className="font-bold text-white truncate">{station.name}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                        {station.type}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 mb-1.5 text-[9px]">
                      <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-400 block">Elevation:</span>
                        <span className="font-bold text-amber-300">{station.elevationM}m</span>
                      </div>
                      <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                        <span className="text-slate-400 block">Regime Rainfall:</span>
                        <span className="font-bold text-cyan-300">{station.regimeRainfallMmDay} mm/day</span>
                      </div>
                    </div>

                    <div className="text-[9px] text-slate-300 font-sans leading-tight bg-slate-900/50 p-1 rounded border border-slate-800">
                      {station.notes}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStation(null);
                      }}
                      className="mt-1.5 text-[8px] w-full py-0.5 text-center text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded cursor-pointer"
                    >
                      Close Station Card
                    </button>
                  </div>
                </Html>
              )}
            </group>
          );
        })}
    </group>
  );
};
