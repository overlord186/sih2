import React, { useRef, useState, useMemo, useEffect, Component, ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Stars } from '@react-three/drei';
import * as THREE from 'three';
import * as d3 from 'd3';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Zap, 
  CloudRain, 
  Wind, 
  ThermometerSun, 
  Flame, 
  Waves, 
  Radio, 
  Trophy, 
  Globe as GlobeIcon, 
  Sparkles, 
  Compass, 
  Sliders, 
  Volume2, 
  VolumeX, 
  Eye, 
  Layers, 
  Navigation, 
  Move, 
  RotateCw,
  Sun,
  Cloud,
  ChevronRight,
  ShieldAlert,
  Activity,
  RefreshCw,
  Wifi,
  Gauge,
  Clock,
  FastForward,
  X,
  MapPin,
  Crosshair,
  Info,
  Plane,
  Satellite,
  Mountain
} from 'lucide-react';
import { weatherSynth } from '../utils/audio';
import { CycloneHunter3D } from './observatory/CycloneHunter3D';
import { SkewTSoundingModal } from './observatory/SkewTSoundingModal';
import { SatelliteConstellation3D, SATELLITE_CATALOG } from './observatory/SatelliteConstellation3D';
import { VolumetricWindRibbons3D, WIND_STREAM_FEATURES } from './observatory/VolumetricWindRibbons3D';
import { DopplerRadarTowers3D, DOPPLER_RADAR_NETWORK } from './observatory/DopplerRadarTowers3D';
import { SolarTerminatorAndLightning3D } from './observatory/SolarTerminatorAndLightning3D';
import { OrographicProfileModal } from './observatory/OrographicProfileModal';
import { CrisisCommandGameModal } from './observatory/CrisisCommandGameModal';
import { DailyChallengeRewardVFX3D } from './observatory/DailyChallengeRewardVFX3D';
import { MonsoonChallengeScenario } from '../data/dailyChallenges';
import { GlobePerspectiveManager } from './observatory/GlobePerspectiveManager';
import { StormTrackingLayer3D } from './observatory/StormTrackingLayer3D';
import { 
  GlobePerspectiveMode, 
  PerspectiveManagerState 
} from './observatory/perspectiveTypes';
import { 
  ACTIVE_STORM_SYSTEMS, 
  GLOBAL_VIEW_PRESETS, 
  REGIONAL_FOCUS_PRESETS 
} from '../data/stormSystems';
import { LandscapeInteractionLayer3D } from './observatory/LandscapeInteractionLayer3D';
import { LandscapeInteractionHUD } from './observatory/LandscapeInteractionHUD';
import { 
  MOUNTAIN_BARRIERS, 
  MONSOON_REGIMES, 
  MountainBarrierId, 
  MonsoonRegimeId,
  MountainBarrier 
} from '../data/landscapeInteractions';
import {
  trackDropsondeDeployed,
  trackRadarInspected,
  trackSatelliteInspected,
  trackOrographicInspected,
  trackCrisisCompleted,
  trackAtmosphereTested,
} from '../utils/achievements';
import { 
  Dropsonde, 
  SatelliteMission, 
  DopplerRadarTower, 
  WindStreamPressureLevel 
} from './observatory/types';
import { MET_STATIONS } from '../data/monsoonDataset';
import { ExploreBeacon } from './exploreTour/ExploreBeacon';

interface GlobeSandbox3DSimulatorProps {
  onOpenLocal3dSimulator?: (stationId: string) => void;
}

// WebGL Error Boundary wrapper
class WebGLErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: any) {
    console.warn('GlobeSandbox3D WebGL Exception Caught:', err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
          <GlobeIcon className="w-12 h-12 text-cyan-400 animate-spin-slow mb-3" />
          <h3 className="text-base font-bold">3D Earth Simulation Active</h3>
          <p className="text-xs text-slate-400 max-w-md mt-1">Rendering real-time atmospheric & planetary telemetry layer.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// Preset Atmospheric Disasters
export type DisasterType = 
  | 'CLOUDBURST' 
  | 'SUPER_TYPHOON' 
  | 'HEATWAVE_DROUGHT' 
  | 'VOLCANIC_ASH' 
  | 'POLAR_VORTEX' 
  | 'TSUNAMI_SURGE';

// Extreme Climate Scenarios
export type ClimateScenario = 
  | 'PRESENT'
  | 'WARMING_1_5C'
  | 'WARMING_2_0C'
  | 'WARMING_4_0C'
  | 'ICE_MELT';

export interface ClimateScenarioConfig {
  id: ClimateScenario;
  label: string;
  tempDeltaC: number;
  seaLevelRiseM: number;
  pressureAnomalyHpa: number;
  windSpeedMultiplier: number;
  precipMultiplier: number;
  description: string;
  badgeColor: string;
}

export const CLIMATE_SCENARIOS: Record<ClimateScenario, ClimateScenarioConfig> = {
  PRESENT: {
    id: 'PRESENT',
    label: 'Baseline Present',
    tempDeltaC: 0.0,
    seaLevelRiseM: 0.0,
    pressureAnomalyHpa: 0,
    windSpeedMultiplier: 1.0,
    precipMultiplier: 1.0,
    description: 'Standard historical baseline atmospheric pressure equilibrium and sea level.',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  WARMING_1_5C: {
    id: 'WARMING_1_5C',
    label: '+1.5°C Paris Target',
    tempDeltaC: 1.5,
    seaLevelRiseM: 0.35,
    pressureAnomalyHpa: -6.5,
    windSpeedMultiplier: 1.15,
    precipMultiplier: 1.12,
    description: 'Moderate global thermal expansion. Atmosphere moisture capacity increases ~10.5%.',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
  WARMING_2_0C: {
    id: 'WARMING_2_0C',
    label: '+2.0°C Critical Bound',
    tempDeltaC: 2.0,
    seaLevelRiseM: 0.85,
    pressureAnomalyHpa: -12.0,
    windSpeedMultiplier: 1.30,
    precipMultiplier: 1.25,
    description: 'Deep pressure troughs. Monsoons & cyclonic storms increase in frequency.',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  WARMING_4_0C: {
    id: 'WARMING_4_0C',
    label: '+4.0°C Extreme Scenario',
    tempDeltaC: 4.0,
    seaLevelRiseM: 2.40,
    pressureAnomalyHpa: -22.5,
    windSpeedMultiplier: 1.65,
    precipMultiplier: 1.55,
    description: 'Runaway greenhouse heating. Jet stream destabilizes into atmospheric rivers.',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
  ICE_MELT: {
    id: 'ICE_MELT',
    label: 'Polar Ice Collapse',
    tempDeltaC: 5.5,
    seaLevelRiseM: 6.50,
    pressureAnomalyHpa: -32.0,
    windSpeedMultiplier: 2.10,
    precipMultiplier: 1.90,
    description: 'Melting polar ice caps. Severe coastal inundation & extreme wind surge vectors.',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
};

export interface GeographicFocusPreset {
  id: string;
  label: string;
  flag: string;
  lat: number;
  lon: number;
  zoomDistance: number;
  description: string;
}

export const REGION_FOCUS_PRESETS: GeographicFocusPreset[] = [
  { id: 'INDIA', label: 'Indian Peninsula', flag: '🇮🇳', lat: 20.5937, lon: 78.9629, zoomDistance: 3.8, description: 'Arabian Sea, Bay of Bengal & Western Ghats Monsoon Zone' },
  { id: 'EAST_ASIA', label: 'East Asia & Japan', flag: '🇯🇵', lat: 35.6762, lon: 139.6503, zoomDistance: 4.4, description: 'Pacific Typhoon Belt & Tokyo Coastal Basin' },
  { id: 'EUROPE', label: 'Europe & N. Atlantic', flag: '🇪🇺', lat: 50.1109, lon: 8.6821, zoomDistance: 4.5, description: 'North Atlantic Oscillation & Storm Trajectories' },
  { id: 'NORTH_AMERICA', label: 'North America', flag: '🇺🇸', lat: 38.8951, lon: -97.0364, zoomDistance: 4.6, description: 'Gulf Coast Hurricane Corridor & Atlantic Coast' },
  { id: 'GLOBAL', label: 'Planetary View', flag: '🌐', lat: 0, lon: 0, zoomDistance: 7.2, description: 'Standard Planetary Earth Perspective' },
  { id: 'DEEP_SPACE', label: 'Deep Space', flag: '🌌', lat: 0, lon: 0, zoomDistance: 17.5, description: 'Distant Cosmic View of Earth in Space' },
];

export interface LocationTarget {
  id: string;
  name: string;
  lat: number;
  lon: number;
  country: string;
  populationM?: number;
  riskLevel?: string;
}

export const GLOBE_TARGETS: LocationTarget[] = [
  { id: 'MUMBAI', name: 'Mumbai Metropolitan', lat: 19.0760, lon: 72.8777, country: 'India', populationM: 21.3 },
  { id: 'CHERRAPUNJI', name: 'Cherrapunji Basin', lat: 25.2986, lon: 91.7300, country: 'India', populationM: 0.1 },
  { id: 'TOKYO', name: 'Tokyo Bay Region', lat: 35.6762, lon: 139.6503, country: 'Japan', populationM: 37.4 },
  { id: 'NEW_YORK', name: 'New York Coastal', lat: 40.7128, lon: -74.0060, country: 'USA', populationM: 18.8 },
  { id: 'LONDON', name: 'London Thames Basin', lat: 51.5074, lon: -0.1278, country: 'UK', populationM: 9.0 },
  { id: 'CAIRO', name: 'Cairo Nile Delta', lat: 30.0444, lon: 31.2357, country: 'Egypt', populationM: 20.9 },
  { id: 'SYDNEY', name: 'Sydney Harbour', lat: -33.8688, lon: 151.2093, country: 'Australia', populationM: 5.3 },
  { id: 'SAO_PAULO', name: 'São Paulo Plateau', lat: -23.5505, lon: -46.6333, country: 'Brazil', populationM: 22.4 },
];

// Earth View Modes
export type EarthViewMode = 'REALISTIC_PHOTOREAL' | 'NIGHT_SATELLITE' | 'SYNOPTIC_METEOROLOGY';

// Global Metropolitan City Lights for Night & Satellite overlays
const GLOBAL_CITY_LIGHTS: Array<{ lat: number; lon: number; size: number }> = [
  { lat: 19.0760, lon: 72.8777, size: 7.5 }, // Mumbai
  { lat: 28.6139, lon: 77.2090, size: 8.5 }, // Delhi NCR
  { lat: 12.9716, lon: 77.5946, size: 6.5 }, // Bengaluru
  { lat: 13.0827, lon: 80.2707, size: 6.0 }, // Chennai
  { lat: 22.5726, lon: 88.3639, size: 6.5 }, // Kolkata
  { lat: 17.3850, lon: 78.4867, size: 5.5 }, // Hyderabad
  { lat: 23.0225, lon: 72.5714, size: 5.5 }, // Ahmedabad
  { lat: 35.6762, lon: 139.6503, size: 9.5 }, // Tokyo
  { lat: 31.2304, lon: 121.4737, size: 8.5 }, // Shanghai
  { lat: 39.9042, lon: 116.4074, size: 8.0 }, // Beijing
  { lat: 37.5665, lon: 126.9780, size: 7.5 }, // Seoul
  { lat: 1.3521, lon: 103.8198, size: 5.5 }, // Singapore
  { lat: 25.2048, lon: 55.2708, size: 6.5 }, // Dubai
  { lat: 30.0444, lon: 31.2357, size: 7.0 }, // Cairo Nile Delta
  { lat: 51.5074, lon: -0.1278, size: 8.5 }, // London
  { lat: 48.8566, lon: 2.3522, size: 7.5 }, // Paris
  { lat: 40.7128, lon: -74.0060, size: 9.5 }, // New York
  { lat: 34.0522, lon: -118.2437, size: 8.5 }, // Los Angeles
  { lat: -23.5505, lon: -46.6333, size: 8.0 }, // São Paulo
  { lat: -33.8688, lon: 151.2093, size: 6.5 }, // Sydney
];

// Convert Lat/Lon coordinates to 3D Sphere Vector
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// -----------------------------------------------------------------------------
// REAL-TIME ATMOSPHERIC WIND FLOW STREAMLINES
// -----------------------------------------------------------------------------

interface WindVectorFlowProps {
  pressureHpa: number;
  windSpeedKmH: number;
  disasterType: DisasterType;
  targetLocation: LocationTarget;
  climateScenario: ClimateScenario;
  showWindVectors: boolean;
  timeSpeed: number;
  isPaused: boolean;
}

const WindVectorFlowLayer: React.FC<WindVectorFlowProps> = ({
  pressureHpa,
  windSpeedKmH,
  disasterType,
  targetLocation,
  climateScenario,
  showWindVectors,
  timeSpeed,
  isPaused,
}) => {
  const lineGroupRef = useRef<THREE.Group>(null);
  const GLOBE_RADIUS = 2.4;
  const STREAMLINE_COUNT = 360;

  // Generate multi-segment streamline trails distributed globally along zonal belts
  const streamlinesData = useMemo(() => {
    const lines = [];
    for (let i = 0; i < STREAMLINE_COUNT; i++) {
      const lat = (Math.random() - 0.5) * 165;
      const lon = (Math.random() - 0.5) * 360;
      const speedOffset = 0.85 + Math.random() * 0.65;
      const alt = GLOBE_RADIUS + 0.07 + Math.random() * 0.12;

      lines.push({
        lat,
        lon,
        alt,
        speedOffset,
      });
    }
    return lines;
  }, [STREAMLINE_COUNT]);

  const lineRefs = useRef<(THREE.Line | null)[]>([]);

  useFrame((state, delta) => {
    if (!showWindVectors || !lineGroupRef.current || isPaused) return;

    const pressureDelta = Math.max(0, 1013.2 - pressureHpa);
    const climateMult = CLIMATE_SCENARIOS[climateScenario].windSpeedMultiplier;
    const effectiveSpeed = (windSpeedKmH / 55) * climateMult * (timeSpeed / 4) * delta;

    const targetLat = targetLocation.lat;
    const targetLon = targetLocation.lon;

    streamlinesData.forEach((streamline, i) => {
      // Atmospheric Zonal Belt Mechanics:
      // ITCZ / Trade Winds (-28° to +28°): Easterly flow (move West)
      // Mid-Latitudes (28° to 62°): Westerlies (move East)
      // Polar Regions (>62°): Polar Easterlies (move West)
      const absLat = Math.abs(streamline.lat);
      let baseEastWest = absLat < 28 ? -2.8 : absLat < 62 ? 3.6 : -1.8;
      let baseNorthSouth = Math.sin(streamline.lon * (Math.PI / 180) * 2) * 1.2;

      let deltaLat = baseNorthSouth;
      let deltaLon = baseEastWest;

      // Pressure Gradient Swirl & Cyclonic Convergence
      if (pressureDelta > 3) {
        const distLat = targetLat - streamline.lat;
        const distLon = targetLon - streamline.lon;
        const distSq = distLat * distLat + distLon * distLon;

        if (distSq < 4200) {
          const swirlFactor = (pressureDelta / 15) * (1 / (1 + distSq * 0.0008));
          const hemiSign = streamline.lat >= 0 ? 1 : -1;
          deltaLat += (-distLon * 0.14 * hemiSign + distLat * 0.03) * swirlFactor;
          deltaLon += (distLat * 0.14 * hemiSign + distLon * 0.03) * swirlFactor;
        }
      }

      streamline.lat += deltaLat * effectiveSpeed * streamline.speedOffset;
      streamline.lon += deltaLon * effectiveSpeed * streamline.speedOffset;

      if (streamline.lat > 86) streamline.lat = -86;
      if (streamline.lat < -86) streamline.lat = 86;
      if (streamline.lon > 180) streamline.lon = -180;
      if (streamline.lon < -180) streamline.lon = 180;

      // Compute 4-segment curved streamline tail
      const tailPoints: THREE.Vector3[] = [];
      for (let t = 0; t < 4; t++) {
        const tLat = streamline.lat - deltaLat * t * 0.16;
        const tLon = streamline.lon - deltaLon * t * 0.16;
        tailPoints.push(latLonToVector3(tLat, tLon, streamline.alt));
      }

      const lineMesh = lineRefs.current[i];
      if (lineMesh) {
        const positions = lineMesh.geometry.attributes.position as THREE.BufferAttribute;
        tailPoints.forEach((pt, ptIdx) => {
          positions.setXYZ(ptIdx, pt.x, pt.y, pt.z);
        });
        positions.needsUpdate = true;
      }
    });
  });

  if (!showWindVectors) return null;

  return (
    <group ref={lineGroupRef}>
      {streamlinesData.map((streamline, idx) => {
        const initialPoints = Array.from({ length: 4 }).map((_, t) =>
          latLonToVector3(streamline.lat - t * 0.1, streamline.lon - t * 0.1, streamline.alt)
        );
        const geom = new THREE.BufferGeometry().setFromPoints(initialPoints);

        let colorStr = '#38bdf8'; // Normal cyan trade winds
        if (windSpeedKmH > 130) colorStr = '#f43f5e'; // Severe hurricane/typhoon crimson
        else if (windSpeedKmH > 75) colorStr = '#fbbf24'; // Gale-force amber

        const lineMat = new THREE.LineBasicMaterial({
          color: colorStr,
          transparent: true,
          opacity: 0.82,
        });
        const lineObj = new THREE.Line(geom, lineMat);

        return (
          <primitive
            key={idx}
            object={lineObj}
            ref={(el: any) => { lineRefs.current[idx] = el; }}
          />
        );
      })}
    </group>
  );
};

// -----------------------------------------------------------------------------
// SMOOTH CAMERA CONTROLLER COMPONENT
// -----------------------------------------------------------------------------

interface CameraControllerProps {
  targetPitch: number;
  targetYaw: number;
  targetDistance: number;
  focusLocation?: LocationTarget;
  trackingCoord?: { lat: number; lon: number };
  autoRotate?: boolean;
}

const SmoothCameraController: React.FC<CameraControllerProps> = ({
  targetPitch,
  targetYaw,
  targetDistance,
  focusLocation,
  trackingCoord,
  autoRotate = false,
}) => {
  const { camera } = useThree();
  const autoYawRef = useRef(targetYaw);

  useEffect(() => {
    autoYawRef.current = targetYaw;
  }, [targetYaw]);

  useFrame((_, delta) => {
    let desiredPos: THREE.Vector3;

    if (trackingCoord) {
      desiredPos = latLonToVector3(trackingCoord.lat, trackingCoord.lon, targetDistance);
    } else if (focusLocation && focusLocation.id !== 'GLOBAL' && focusLocation.id !== 'DEEP_SPACE') {
      desiredPos = latLonToVector3(focusLocation.lat, focusLocation.lon, targetDistance);
    } else {
      if (autoRotate) {
        autoYawRef.current = (autoYawRef.current + delta * 12) % 360;
      } else {
        autoYawRef.current = targetYaw;
      }

      const phi = (90 - targetPitch) * (Math.PI / 180);
      const theta = (autoYawRef.current * Math.PI) / 180;

      const x = -(targetDistance * Math.sin(phi) * Math.cos(theta));
      const z = targetDistance * Math.sin(phi) * Math.sin(theta);
      const y = targetDistance * Math.cos(phi);

      desiredPos = new THREE.Vector3(x, y, z);
    }

    camera.position.lerp(desiredPos, 0.08);
    camera.lookAt(0, 0, 0);
  });

  return null;
};

export interface LiveStationCloudData {
  name: string;
  lat: number;
  lon: number;
  cloudCover: number;
  tempC: number;
  pressureHpa: number;
  windKmH: number;
}

export const LIVE_GLOBAL_STATIONS: Array<{ name: string; lat: number; lon: number }> = [
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  { name: 'New Delhi', lat: 28.6139, lon: 77.2090 },
  { name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
  { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
  { name: 'Trivandrum', lat: 8.5241, lon: 76.9366 },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  { name: 'Beijing', lat: 39.9042, lon: 116.4074 },
  { name: 'Singapore', lat: 1.3521, lon: 103.8198 },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
  { name: 'London', lat: 51.5074, lon: -0.1278 },
  { name: 'Paris', lat: 48.8566, lon: 2.3522 },
  { name: 'Cairo', lat: 30.0444, lon: 31.2357 },
  { name: 'Nairobi', lat: -1.2921, lon: 36.8219 },
  { name: 'New York', lat: 40.7128, lon: -74.0060 },
  { name: 'San Francisco', lat: 37.7749, lon: -122.4194 },
  { name: 'Rio de Janeiro', lat: -22.9068, lon: -43.1729 },
  { name: 'Moscow', lat: 55.7558, lon: 37.6173 },
  { name: 'Honolulu', lat: 21.3069, lon: -157.8583 },
  { name: 'Reykjavik', lat: 64.1466, lon: -21.9426 },
  { name: 'Cape Town', lat: -33.9249, lon: 18.4241 },
];

// -----------------------------------------------------------------------------
// PHOTOREALISTIC 3D EARTH MESH & ATMOSPHERE SYSTEM
// -----------------------------------------------------------------------------

export interface GlobeInspectTooltip {
  lat: number;
  lon: number;
  regionName: string;
  category: 'Ocean Basin' | 'Land Region' | 'Coastal Margin' | 'Polar Cap';
  pressureHpa: number;
  tempC: number;
  tempF: number;
  windKmH: number;
  windKnots: number;
  windDirection: string;
  windDeg: number;
  humidityPct: number;
  advisoryNote: string;
  beaufortScale: string;
  worldPos: THREE.Vector3;
}

export function getGeographicRegionInfo(lat: number, lon: number): { name: string; category: 'Ocean Basin' | 'Land Region' | 'Coastal Margin' | 'Polar Cap'; baseTemp: number; isOcean: boolean; note: string } {
  if (lat < -55) {
    return { name: 'Southern Circumpolar Ocean & Antarctic Ice Shelf', category: 'Polar Cap', baseTemp: -24, isOcean: true, note: 'Katabatic wind shear zone & sea-ice margin' };
  }
  if (lat > 65) {
    return { name: 'Arctic Circumpolar Ocean & Polar Ice Cap', category: 'Polar Cap', baseTemp: -18, isOcean: true, note: 'High-latitude polar vortex trough & albedo reflection zone' };
  }

  // Ocean Basins & Seas
  if (lat >= 5 && lat <= 24 && lon >= 80 && lon <= 98) {
    return { name: 'Bay of Bengal Maritime Basin', category: 'Ocean Basin', baseTemp: 29.5, isOcean: true, note: 'Tropical cyclone genesis corridor & monsoon depression feeder' };
  }
  if (lat >= 5 && lat <= 26 && lon >= 50 && lon <= 78) {
    return { name: 'Arabian Sea Ocean Basin & Gulf Trough', category: 'Ocean Basin', baseTemp: 28.5, isOcean: true, note: 'Somali jetstream cross-equatorial flow & high SST thermal pool' };
  }
  if (lat >= -20 && lat <= 5 && lon >= 45 && lon <= 105) {
    return { name: 'Equatorial Indian Ocean Warm Pool', category: 'Ocean Basin', baseTemp: 29.8, isOcean: true, note: 'Madden-Julian Oscillation (MJO) convective envelope' };
  }
  if (lat >= 0 && lat <= 32 && lon >= 110 && lon <= 160) {
    return { name: 'Western Pacific Typhoon Corridor & Coral Sea', category: 'Ocean Basin', baseTemp: 30.1, isOcean: true, note: 'Super typhoon energy reservoir & ITCZ convergence trough' };
  }
  if (lat >= 10 && lat <= 45 && lon >= -80 && lon <= -20) {
    return { name: 'North Atlantic Subtropical Gyre & Sargasso Sea', category: 'Ocean Basin', baseTemp: 26.0, isOcean: true, note: 'Subtropical anti-cyclonic high pressure ridge & trade wind belt' };
  }
  if (lat >= -45 && lat <= -10 && lon >= -60 && lon <= 15) {
    return { name: 'South Atlantic Ocean Basin', category: 'Ocean Basin', baseTemp: 22.0, isOcean: true, note: 'Subtropical marine boundary layer & Benguela current margin' };
  }
  if (lat >= 15 && lat <= 52 && (lon >= 160 || lon <= -120)) {
    return { name: 'North Pacific Current Basin', category: 'Ocean Basin', baseTemp: 18.5, isOcean: true, note: 'Aleutian Low trough interaction & mid-latitude storm track' };
  }
  if (lat >= -12 && lat <= 12 && lon >= -180 && lon <= -80) {
    return { name: 'Equatorial Pacific ITCZ Trough', category: 'Ocean Basin', baseTemp: 28.8, isOcean: true, note: 'El Niño / La Niña Southern Oscillation (ENSO) ocean coupling zone' };
  }
  if (lat >= 30 && lat <= 46 && lon >= -6 && lon <= 38) {
    return { name: 'Mediterranean Sea Maritime Basin', category: 'Ocean Basin', baseTemp: 24.2, isOcean: true, note: 'Subtropical cyclogenesis & Sirocco thermal convergence' };
  }
  if (lat >= 10 && lat <= 31 && lon >= -100 && lon <= -60) {
    return { name: 'Gulf of Mexico & Caribbean Marine Basin', category: 'Ocean Basin', baseTemp: 29.2, isOcean: true, note: 'Loop current thermal reservoir & hurricane landfall corridor' };
  }

  // Major Continental Landmass Regions
  if (lat >= 8 && lat <= 35 && lon >= 68 && lon <= 92) {
    return { name: 'Indian Subcontinent & Gangetic Basin', category: 'Land Region', baseTemp: 31.0, isOcean: false, note: 'South Asian monsoon trough & boundary layer convective surges' };
  }
  if (lat >= 27 && lat <= 38 && lon >= 73 && lon <= 102) {
    return { name: 'Himalayan Montane & Tibetan Plateau Highs', category: 'Land Region', baseTemp: 8.5, isOcean: false, note: 'Elevated thermal heat source & high-altitude jetstream forcing' };
  }
  if (lat >= 8 && lat <= 28 && lon >= 92 && lon <= 108) {
    return { name: 'Indochina & Southeast Asian Corridor', category: 'Land Region', baseTemp: 30.5, isOcean: false, note: 'Tropical monsoon confluence & Mekong river basin moisture' };
  }
  if (lat >= 20 && lat <= 45 && lon >= 100 && lon <= 125) {
    return { name: 'East Asian Plain & Yangtze Basin', category: 'Land Region', baseTemp: 23.5, isOcean: false, note: 'Meiyu-Baiu frontal rainband & East Asian summer monsoon' };
  }
  if (lat >= 12 && lat <= 35 && lon >= 35 && lon <= 62) {
    return { name: 'Arabian Peninsula Arid Plateau', category: 'Land Region', baseTemp: 38.0, isOcean: false, note: 'Thermal heat low & intense anti-cyclonic dry air subsidence' };
  }
  if (lat >= 15 && lat <= 35 && lon >= -18 && lon <= 35) {
    return { name: 'Sahara Desert Arid Shield', category: 'Land Region', baseTemp: 41.5, isOcean: false, note: 'African Easterly Jet (AEJ) wave origin & Saharan dust layer (SAL)' };
  }
  if (lat >= -15 && lat <= 15 && lon >= -15 && lon <= 42) {
    return { name: 'Congo Basin & Equatorial Africa', category: 'Land Region', baseTemp: 27.5, isOcean: false, note: 'Deep tropical convective thunderstorm generator' };
  }
  if (lat >= 36 && lat <= 68 && lon >= -10 && lon <= 40) {
    return { name: 'European Continental Plain', category: 'Land Region', baseTemp: 18.0, isOcean: false, note: 'Mid-latitude westerly frontal wave corridor' };
  }
  if (lat >= 25 && lat <= 55 && lon >= -125 && lon <= -70) {
    return { name: 'North American Great Plains & Continental Shelf', category: 'Land Region', baseTemp: 22.0, isOcean: false, note: 'Severe thunderstorm squall line & mesoscale convective system (MCS)' };
  }
  if (lat >= -18 && lat <= 8 && lon >= -82 && lon <= -35) {
    return { name: 'Amazon Basin Equatorial Rainforest', category: 'Land Region', baseTemp: 28.0, isOcean: false, note: 'Evapotranspiration moisture recycling & ITCZ convection' };
  }
  if (lat >= -40 && lat <= -10 && lon >= 112 && lon <= 155) {
    return { name: 'Australian Arid Outback & Margin', category: 'Land Region', baseTemp: 32.0, isOcean: false, note: 'Subtropical high pressure belt & intense heat troughing' };
  }

  const isEstOcean = (Math.abs(lat) < 60 && (lon < -30 || lon > 140)) || Math.abs(lat) > 50;
  return {
    name: `${isEstOcean ? 'Pelagic Ocean Basin' : 'Continental Land Region'} (${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'})`,
    category: isEstOcean ? 'Ocean Basin' : 'Land Region',
    baseTemp: 28 - Math.abs(lat) * 0.4,
    isOcean: isEstOcean,
    note: isEstOcean ? 'Open maritime boundary layer with active sea-surface evaporation' : 'Terrestrial surface boundary layer with diurnal radiative thermal heating'
  };
}

function getBeaufortScale(windKmH: number): string {
  if (windKmH < 2) return 'Force 0 - Calm';
  if (windKmH < 6) return 'Force 1 - Light Air';
  if (windKmH < 12) return 'Force 2 - Light Breeze';
  if (windKmH < 20) return 'Force 3 - Gentle Breeze';
  if (windKmH < 29) return 'Force 4 - Moderate Breeze';
  if (windKmH < 39) return 'Force 5 - Fresh Breeze';
  if (windKmH < 50) return 'Force 6 - Strong Breeze';
  if (windKmH < 62) return 'Force 7 - Near Gale';
  if (windKmH < 75) return 'Force 8 - Gale';
  if (windKmH < 89) return 'Force 9 - Strong Gale';
  if (windKmH < 103) return 'Force 10 - Storm';
  if (windKmH < 118) return 'Force 11 - Violent Storm';
  return 'Force 12 - Hurricane Force';
}

function getWindDirectionText(deg: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return `${directions[index]} (${Math.round(deg)}°)`;
}

function calculateCoordinatesTelemetry(
  lat: number,
  lon: number,
  hitPoint: THREE.Vector3,
  derivedMetrics: { pressureHpa: number; windKmH: number },
  disasterType: DisasterType,
  climateScenario: ClimateScenario,
  selectedTarget: LocationTarget
): GlobeInspectTooltip {
  const reg = getGeographicRegionInfo(lat, lon);

  // Distance from active disaster target
  const targetRad = latLonToVector3(selectedTarget.lat, selectedTarget.lon, 2.4);
  const distToTarget = hitPoint.distanceTo(targetRad);

  const scenarioConfig = CLIMATE_SCENARIOS[climateScenario];
  const pressureAnomaly = scenarioConfig.pressureAnomalyHpa;

  let localPressure = derivedMetrics.pressureHpa;
  if (distToTarget < 2.0) {
    const drop = (2.0 - distToTarget) * 12.5;
    localPressure -= drop;
  }
  const latFactor = Math.sin((lat * Math.PI) / 180 * 2) * 4.5;
  localPressure = Math.round(localPressure + latFactor + pressureAnomaly);

  let localTemp = reg.baseTemp + scenarioConfig.tempDeltaC;
  if (disasterType === 'HEATWAVE_DROUGHT') localTemp += 7.5;
  if (disasterType === 'POLAR_VORTEX') localTemp -= 14.2;
  const pseudoVar = Math.sin(lat * 12.3 + lon * 7.8) * 1.8;
  localTemp = Math.round((localTemp + pseudoVar) * 10) / 10;
  const tempF = Math.round((localTemp * 9 / 5 + 32) * 10) / 10;

  let localWindKmH = derivedMetrics.windKmH * scenarioConfig.windSpeedMultiplier;
  if (distToTarget < 2.2) {
    localWindKmH += (2.2 - distToTarget) * 22;
  }
  localWindKmH = Math.round(localWindKmH + Math.abs(pseudoVar) * 3);
  const windKnots = Math.round((localWindKmH / 1.852) * 10) / 10;

  const dLat = selectedTarget.lat - lat;
  const dLon = selectedTarget.lon - lon;
  let angleRad = Math.atan2(dLon, dLat);
  if (lat >= 0) angleRad += Math.PI / 2;
  else angleRad -= Math.PI / 2;
  const windDeg = Math.round((angleRad * 180 / Math.PI + 360) % 360);
  const windDirText = getWindDirectionText(windDeg);

  let humidity = reg.isOcean ? 82 + Math.floor(Math.sin(lon) * 12) : 45 + Math.floor(Math.cos(lat) * 25);
  if (disasterType === 'CLOUDBURST' || disasterType === 'SUPER_TYPHOON') humidity = Math.min(99, humidity + 18);
  if (disasterType === 'HEATWAVE_DROUGHT') humidity = Math.max(12, humidity - 35);

  return {
    lat: Math.round(lat * 100) / 100,
    lon: Math.round(lon * 100) / 100,
    regionName: reg.name,
    category: reg.category,
    pressureHpa: localPressure,
    tempC: localTemp,
    tempF: tempF,
    windKmH: localWindKmH,
    windKnots: windKnots,
    windDirection: windDirText,
    windDeg: windDeg,
    humidityPct: humidity,
    advisoryNote: reg.note,
    beaufortScale: getBeaufortScale(localWindKmH),
    worldPos: hitPoint.clone(),
  };
}

interface EarthSphereProps {
  disasterType: DisasterType;
  climateScenario: ClimateScenario;
  intensity: number;
  timeSpeed: number;
  selectedTarget: LocationTarget;
  isPaused: boolean;
  showWindVectors: boolean;
  showClouds: boolean;
  showBorders: boolean;
  viewMode: EarthViewMode;
  derivedMetrics: { pressureHpa: number; windKmH: number };
  onSelectTarget: (target: LocationTarget) => void;
  activeTriggers: Array<{ lat: number; lon: number; type: DisasterType; timestamp: number }>;
  useLiveCloudMode: boolean;
  liveCloudData: LiveStationCloudData[] | null;
  elevationMultiplier?: number;
}

const EarthGlobeMesh: React.FC<EarthSphereProps> = ({
  disasterType,
  climateScenario,
  intensity,
  timeSpeed,
  selectedTarget,
  isPaused,
  showWindVectors,
  showClouds,
  showBorders,
  viewMode,
  derivedMetrics,
  onSelectTarget,
  activeTriggers,
  useLiveCloudMode,
  liveCloudData,
  elevationMultiplier = 1.0,
}) => {
  const globeGroupRef = useRef<THREE.Group>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const innerLimbRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const cloudShadowRef = useRef<THREE.Mesh>(null);
  const stormParticlesRef = useRef<THREE.Points>(null);
  const shockwaveRingRef = useRef<THREE.Mesh>(null);

  const [inspectTooltip, setInspectTooltip] = useState<GlobeInspectTooltip | null>(null);
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);
  const clickStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const GLOBE_RADIUS = 2.4;

  const [earthTexture, setEarthTexture] = useState<THREE.CanvasTexture | null>(null);
  const [specularTexture, setSpecularTexture] = useState<THREE.CanvasTexture | null>(null);
  const [bumpTexture, setBumpTexture] = useState<THREE.CanvasTexture | null>(null);
  const [cloudTexture, setCloudTexture] = useState<THREE.CanvasTexture | null>(null);
  
  // Real NASA Satellite Photography Textures
  const [satelliteDayTex, setSatelliteDayTex] = useState<THREE.Texture | null>(null);
  const [satelliteNightTex, setSatelliteNightTex] = useState<THREE.Texture | null>(null);
  const [satelliteCloudsTex, setSatelliteCloudsTex] = useState<THREE.Texture | null>(null);
  const [satelliteBumpTex, setSatelliteBumpTex] = useState<THREE.Texture | null>(null);
  const [satelliteSpecularTex, setSatelliteSpecularTex] = useState<THREE.Texture | null>(null);
  const earthMaterialRef = useRef<THREE.MeshStandardMaterial>(null);

  const [worldBoundaryGeom, setWorldBoundaryGeom] = useState<THREE.BufferGeometry | null>(null);
  const [indiaBoundaryGeom, setIndiaBoundaryGeom] = useState<THREE.BufferGeometry | null>(null);
  const [graticuleGeom, setGraticuleGeom] = useState<THREE.BufferGeometry | null>(null);

  // Load High-Resolution Photorealistic NASA Satellite Textures
  useEffect(() => {
    let isMounted = true;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    const loadWithFallback = (urls: string[], setter: (t: THREE.Texture) => void) => {
      let idx = 0;
      const tryNext = () => {
        if (idx >= urls.length) return;
        const url = urls[idx++];
        loader.load(
          url,
          (tex) => {
            if (!isMounted) return;
            tex.wrapS = THREE.ClampToEdgeWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.needsUpdate = true;
            setter(tex);
          },
          undefined,
          () => tryNext()
        );
      };
      tryNext();
    };

    // NASA Day Satellite Image (Blue Marble / Natural Earth)
    loadWithFallback([
      '/textures/earth_day.jpg',
      'https://fastly.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_day_4096.jpg',
      'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_day_4096.jpg',
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_day_4096.jpg'
    ], setSatelliteDayTex);

    // NASA Night Lights Satellite Image
    loadWithFallback([
      '/textures/earth_night.jpg',
      'https://fastly.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_night_4096.jpg',
      'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_night_4096.jpg',
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_night_4096.jpg'
    ], setSatelliteNightTex);

    // NASA Cloud Layer
    loadWithFallback([
      '/textures/earth_clouds.png',
      'https://fastly.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_clouds_1024.png',
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_clouds_1024.png'
    ], setSatelliteCloudsTex);

    // NASA Elevation/Topography Bump Map
    loadWithFallback([
      '/textures/earth_normal.jpg',
      'https://fastly.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_normal_2048.jpg'
    ], setSatelliteBumpTex);

    // NASA Water Specular Map
    loadWithFallback([
      '/textures/earth_specular.jpg',
      'https://fastly.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/earth_specular_2048.jpg'
    ], setSatelliteSpecularTex);

    return () => {
      isMounted = false;
    };
  }, []);

  // Ensure Three.js recompiles the shader with USE_MAP whenever textures update
  useEffect(() => {
    if (earthMaterialRef.current) {
      earthMaterialRef.current.needsUpdate = true;
    }
  }, [satelliteDayTex, satelliteNightTex, satelliteCloudsTex, earthTexture, viewMode]);

  // Generate Procedural Semi-Transparent Cloud Texture Canvas with Live API Overlay & Pressure Patterns
  const buildCloudTexture = (
    pressureHpa: number = 1013.2,
    disaster?: DisasterType,
    liveData?: LiveStationCloudData[] | null
  ): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.clearRect(0, 0, 2048, 1024);

    // 1. ITCZ Equatorial Cloud Bands & Trade Wind Swirls
    ctx.fillStyle = 'rgba(255, 255, 255, 0.20)';
    for (let i = 0; i < 75; i++) {
      const x = Math.random() * 2048;
      const y = 460 + (Math.random() - 0.5) * 170;
      const rx = 85 + Math.random() * 190;
      const ry = 14 + Math.random() * 36;

      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, (Math.random() - 0.5) * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Mid-Latitude Cyclonic Spirals & Jet Stream Pressure Waves
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    [230, 770].forEach((yBase) => {
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * 2048;
        const y = yBase + (Math.random() - 0.5) * 230;
        const rx = 65 + Math.random() * 150;
        const ry = 22 + Math.random() * 52;

        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, Math.PI / 5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 3. Polar Vortex High-Latitude Strata
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    [90, 930].forEach((yBase) => {
      for (let i = 0; i < 35; i++) {
        const x = Math.random() * 2048;
        const y = yBase + (Math.random() - 0.5) * 120;
        const rx = 110 + Math.random() * 210;
        const ry = 15 + Math.random() * 30;

        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 4. REAL-TIME PUBLIC API CLOUD COVER OVERLAY (Open-Meteo Satellite Data)
    if (liveData && liveData.length > 0) {
      liveData.forEach((st) => {
        const cx = ((st.lon + 180) / 360) * 2048;
        const cy = ((90 - st.lat) / 180) * 1024;
        const coverNorm = Math.min(1.0, Math.max(0, st.cloudCover / 100));

        if (coverNorm > 0.05) {
          const radius = 80 + coverNorm * 170;
          const numPuffs = Math.floor(6 + coverNorm * 12);

          for (let p = 0; p < numPuffs; p++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius * 0.7;
            const px = cx + Math.cos(angle) * dist;
            const py = cy + Math.sin(angle) * (dist * 0.6);
            const puffRad = 35 + Math.random() * 55 * coverNorm;

            const grad = ctx.createRadialGradient(px, py, 0, px, py, puffRad);
            grad.addColorStop(0, `rgba(255, 255, 255, ${0.5 * coverNorm + 0.25})`);
            grad.addColorStop(0.6, `rgba(240, 248, 255, ${0.28 * coverNorm})`);
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(px, py, puffRad, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
    }

    // 5. Dynamic Low-Pressure Cyclonic Spiral Arms (if pressure drops below 1008 hPa)
    if (pressureHpa < 1008 || disaster === 'SUPER_TYPHOON' || disaster === 'CLOUDBURST') {
      const stormX = 1480; // South Asian / Bay of Bengal longitude
      const stormY = 390;
      const severity = Math.min(1.0, (1013.2 - pressureHpa) / 60);

      for (let r = 25; r < 280; r += 14) {
        const angleOffset = r / 22;
        const count = 10;
        for (let a = 0; a < count; a++) {
          const angle = angleOffset + (a * (Math.PI * 2 / count));
          const cx = stormX + Math.cos(angle) * r;
          const cy = stormY + Math.sin(angle) * (r * 0.65);

          const radSize = 25 + r * 0.18;
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radSize);
          grad.addColorStop(0, `rgba(255, 255, 255, ${0.4 + severity * 0.4})`);
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, radSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  };

  // Generate Specular Roughness Map (Land = Matte White for High Roughness, Oceans = Smooth Dark for Shiny Water)
  const buildSpecularMap = (geoData: any | null): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    const w = canvas.width;
    const h = canvas.height;

    // Ocean is smooth (dark in roughnessMap = shiny water glint)
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, w, h);

    if (geoData && Array.isArray(geoData.features)) {
      const projection = d3.geoEquirectangular()
        .scale(w / (2 * Math.PI))
        .translate([w / 2, h / 2]);

      const pathGen = d3.geoPath(projection, ctx);

      // Landmasses are rough matte (white in roughnessMap = no shiny glare on land)
      ctx.fillStyle = '#ffffff';
      geoData.features.forEach((feat: any) => {
        ctx.beginPath();
        pathGen(feat);
        ctx.fill();
      });
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  };

  // Generate 3D Topographical Relief Bump Map for Mountain Chains
  const buildBumpMap = (geoData: any | null): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    const w = canvas.width;
    const h = canvas.height;

    // Flat sea level baseline
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    if (geoData && Array.isArray(geoData.features)) {
      const projection = d3.geoEquirectangular()
        .scale(w / (2 * Math.PI))
        .translate([w / 2, h / 2]);

      const pathGen = d3.geoPath(projection, ctx);

      // Land plateau baseline elevation
      ctx.fillStyle = '#333333';
      geoData.features.forEach((feat: any) => {
        ctx.beginPath();
        pathGen(feat);
        ctx.fill();
      });

      // Major Mountain Ranges Topography (Himalayas, Andes, Rockies, Alps, Zagros)
      const mountains = [
        { lat: 28.0, lon: 84.0, rx: 180, ry: 40, angle: -0.2, height: '#ffffff' }, // Himalayas
        { lat: -15.0, lon: -70.0, rx: 50, ry: 350, angle: 0.1, height: '#e0e0e0' }, // Andes
        { lat: 40.0, lon: -110.0, rx: 70, ry: 250, angle: -0.2, height: '#d0d0d0' }, // Rockies
        { lat: 46.0, lon: 10.0, rx: 80, ry: 30, angle: 0.1, height: '#e6e6e6' }, // Alps
        { lat: 32.0, lon: 53.0, rx: 120, ry: 35, angle: -0.3, height: '#cccccc' }, // Zagros
      ];

      mountains.forEach((m) => {
        const pt = projection([m.lon, m.lat]);
        if (!pt) return;
        const [cx, cy] = pt;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(m.rx, m.ry));
        grad.addColorStop(0, m.height);
        grad.addColorStop(0.5, '#777777');
        grad.addColorStop(1, '#333333');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, m.rx, m.ry, m.angle, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  };

  // Generate High-Resolution Photorealistic NASA-Style Earth Texture via D3 Equirectangular Projection
  const buildRealisticEarthTexture = (geoData: any | null, mode: EarthViewMode): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    const w = canvas.width;
    const h = canvas.height;

    if (mode === 'NIGHT_SATELLITE') {
      // Deep Space Nightside Ocean
      const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
      oceanGrad.addColorStop(0, '#01050e');
      oceanGrad.addColorStop(0.5, '#030a1c');
      oceanGrad.addColorStop(1, '#01050e');
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, 0, w, h);
    } else if (mode === 'SYNOPTIC_METEOROLOGY') {
      // Synoptic Radar Basemap
      const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
      oceanGrad.addColorStop(0, '#020b18');
      oceanGrad.addColorStop(0.5, '#051833');
      oceanGrad.addColorStop(1, '#020b18');
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, 0, w, h);
    } else {
      // REALISTIC_PHOTOREAL: Natural Marine Ocean Bathymetry & Deep Abyssal Gradients
      const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
      oceanGrad.addColorStop(0, '#020b1c'); // Arctic polar deep blue
      oceanGrad.addColorStop(0.2, '#051b3b');
      oceanGrad.addColorStop(0.5, '#092957'); // Equatorial deep oceanic indigo
      oceanGrad.addColorStop(0.8, '#051b3b');
      oceanGrad.addColorStop(1, '#020b1c'); // Antarctic polar deep blue
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, 0, w, h);
    }

    if (geoData && Array.isArray(geoData.features)) {
      const projection = d3.geoEquirectangular()
        .scale(w / (2 * Math.PI))
        .translate([w / 2, h / 2]);

      const pathGen = d3.geoPath(projection, ctx);

      if (mode === 'REALISTIC_PHOTOREAL') {
        // Pass 1: Turquoise Continental Shelf & Shallow Coastal Water Lagoon Glow
        ctx.strokeStyle = 'rgba(14, 150, 168, 0.55)';
        ctx.lineWidth = 14;
        ctx.lineJoin = 'round';
        geoData.features.forEach((feat: any) => {
          ctx.beginPath();
          pathGen(feat);
          ctx.stroke();
        });

        // Pass 2: Natural Terrestrial Biome Fill Painting (NASA Natural Earth Palette)
        geoData.features.forEach((feat: any) => {
          const name = feat.properties?.NAME || feat.properties?.ADMIN || '';
          const continent = feat.properties?.CONTINENT || '';

          let fillColor = '#2e5436'; // Default Temperate Forest Green

          // Photorealistic Natural Earth Biome Mapping
          if (name === 'India') {
            fillColor = '#245e33'; // South Asian Monsoon Green & Deccan Plateau
          } else if (name === 'Brazil' || name === 'Colombia' || name === 'Peru' || continent === 'South America') {
            fillColor = '#11421c'; // Amazon Rainforest Canopy
          } else if (name === 'Indonesia' || name === 'Malaysia' || name === 'Papua New Guinea') {
            fillColor = '#0f3b19'; // Sundaland Equatorial Jungle
          } else if (continent === 'Africa') {
            if (['Egypt', 'Algeria', 'Libya', 'Sudan', 'Mali', 'Niger', 'Chad', 'Mauritania'].includes(name)) {
              fillColor = '#cda165'; // Sahara Desert Golden Sand Dunes
            } else if (['Kenya', 'Tanzania', 'Ethiopia', 'Uganda'].includes(name)) {
              fillColor = '#596931'; // East African Savannah
            } else {
              fillColor = '#174d22'; // Congo Rainforest
            }
          } else if (['Saudi Arabia', 'Oman', 'Yemen', 'United Arab Emirates', 'Iraq', 'Jordan', 'Iran'].includes(name)) {
            fillColor = '#c49a5b'; // Arabian Desert Sand
          } else if (name === 'Australia') {
            fillColor = '#a86c39'; // Red Outback & Arid Interior
          } else if (['Russia', 'Canada', 'Mongolia', 'Kazakhstan'].includes(name)) {
            fillColor = '#22472b'; // Boreal Pine Taiga & Steppe
          } else if (name === 'Greenland' || continent === 'Antarctica') {
            fillColor = '#f0f7fd'; // Glacial Ice Sheet White
          } else if (['Norway', 'Sweden', 'Finland', 'Iceland'].includes(name)) {
            fillColor = '#295237'; // Scandinavian Subarctic
          }

          ctx.fillStyle = fillColor;
          ctx.beginPath();
          pathGen(feat);
          ctx.fill();

          // Subtle natural coastline border
          ctx.strokeStyle = name === 'India' ? '#f59e0b' : 'rgba(10, 30, 20, 0.35)';
          ctx.lineWidth = name === 'India' ? 1.8 : 0.4;
          ctx.beginPath();
          pathGen(feat);
          ctx.stroke();
        });

        // Pass 3: High-Altitude Snow & Ice Peaks on Himalayas, Andes, Rockies & Alps
        const snowPeaks = [
          { lon: 86.9, lat: 27.9, r: 45, name: 'Himalayas Snow Cap' },
          { lon: -70.0, lat: -32.0, r: 25, name: 'Andes Snow' },
          { lon: -115.0, lat: 45.0, r: 30, name: 'Rockies Snow' },
          { lon: 10.0, lat: 46.5, r: 20, name: 'Alps Snow' },
        ];

        snowPeaks.forEach((peak) => {
          const pt = projection([peak.lon, peak.lat]);
          if (!pt) return;
          const [cx, cy] = pt;
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, peak.r);
          grad.addColorStop(0, '#f8fafc');
          grad.addColorStop(0.6, 'rgba(241, 245, 249, 0.7)');
          grad.addColorStop(1, 'rgba(241, 245, 249, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, peak.r, 0, Math.PI * 2);
          ctx.fill();
        });

        // Major River Systems (Amazon, Nile, Mississippi, Yangtze, Ganges, Danube)
        ctx.strokeStyle = '#0d6b82';
        ctx.lineWidth = 1.2;
        const rivers = [
          [[ -60, -3 ], [ -55, -2 ], [ -50, -0.5 ]], // Amazon
          [[ 31, 30 ], [ 31, 20 ], [ 32, 10 ]], // Nile
          [[ 88, 22 ], [ 82, 25 ], [ 78, 30 ]], // Ganges & Brahmaputra
          [[ 120, 31 ], [ 115, 30 ], [ 108, 30 ]], // Yangtze
          [[ -90, 29 ], [ -91, 35 ], [ -93, 42 ]], // Mississippi
        ];
        rivers.forEach((riverCoords) => {
          ctx.beginPath();
          riverCoords.forEach((coord, i) => {
            const pt = projection([coord[0], coord[1]]);
            if (!pt) return;
            if (i === 0) ctx.moveTo(pt[0], pt[1]);
            else ctx.lineTo(pt[0], pt[1]);
          });
          ctx.stroke();
        });

      } else if (mode === 'NIGHT_SATELLITE') {
        // Night Satellite Mode: Dark Landmasses + Golden Metropolitan Lights
        geoData.features.forEach((feat: any) => {
          ctx.fillStyle = '#081220';
          ctx.beginPath();
          pathGen(feat);
          ctx.fill();

          ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          pathGen(feat);
          ctx.stroke();
        });
      } else {
        // Synoptic Meteorology View Mode
        geoData.features.forEach((feat: any) => {
          ctx.fillStyle = '#061830';
          ctx.beginPath();
          pathGen(feat);
          ctx.fill();

          ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          pathGen(feat);
          ctx.stroke();
        });
      }

      // Render Metropolitan City Lights Network
      GLOBAL_CITY_LIGHTS.forEach((city) => {
        const pt = projection([city.lon, city.lat]);
        if (!pt) return;
        const [cx, cy] = pt;
        const rad = ctx.createRadialGradient(cx, cy, 0, cx, cy, city.size * 2.2);
        rad.addColorStop(0, '#ffffff');
        rad.addColorStop(0.25, '#fef08a');
        rad.addColorStop(0.55, 'rgba(245, 158, 11, 0.7)');
        rad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = rad;
        ctx.beginPath();
        ctx.arc(cx, cy, city.size * 2.2, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      // Instant High-Definition Procedural Earth Replica Fallback
      const projection = d3.geoEquirectangular()
        .scale(w / (2 * Math.PI))
        .translate([w / 2, h / 2]);

      const proceduralContinents = [
        { name: 'Eurasia', lon: 75, lat: 48, rx: 420, ry: 210, color: '#275231' },
        { name: 'India Subcontinent', lon: 78, lat: 21, rx: 75, ry: 95, color: '#205e32' },
        { name: 'Africa', lon: 20, lat: 4, rx: 190, ry: 220, color: '#2d5a32' },
        { name: 'Sahara', lon: 18, lat: 24, rx: 175, ry: 85, color: '#d4a359' },
        { name: 'Arabian Peninsula', lon: 45, lat: 23, rx: 70, ry: 65, color: '#cda165' },
        { name: 'North America', lon: -100, lat: 45, rx: 270, ry: 185, color: '#2a5534' },
        { name: 'South America', lon: -60, lat: -15, rx: 135, ry: 220, color: '#165028' },
        { name: 'Australia', lon: 134, lat: -25, rx: 125, ry: 95, color: '#a85c2b' },
        { name: 'Antarctica', lon: 0, lat: -82, rx: 900, ry: 110, color: '#f1f5f9' },
        { name: 'Greenland', lon: -40, lat: 72, rx: 90, ry: 110, color: '#f1f5f9' },
        { name: 'Sundaland Archipelago', lon: 115, lat: -2, rx: 180, ry: 85, color: '#165028' },
      ];

      proceduralContinents.forEach((cont) => {
        const pt = projection([cont.lon, cont.lat]);
        if (!pt) return;
        ctx.fillStyle = cont.color;
        ctx.beginPath();
        ctx.ellipse(pt[0], pt[1], cont.rx, cont.ry, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  };

  useEffect(() => {
    let isMounted = true;
    setCloudTexture(buildCloudTexture(
      derivedMetrics.pressureHpa,
      disasterType,
      useLiveCloudMode ? liveCloudData : null
    ));

    // Immediate synchronous texture generation for instant zero-latency rendering
    const initTex = buildRealisticEarthTexture(null, viewMode);
    const initSpec = buildSpecularMap(null);
    const initBump = buildBumpMap(null);
    setEarthTexture(initTex);
    setSpecularTexture(initSpec);
    setBumpTexture(initBump);

    fetch('/countries.geojson')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        const tex = buildRealisticEarthTexture(data, viewMode);
        const specTex = buildSpecularMap(data);
        const bumpTex = buildBumpMap(data);

        setEarthTexture(tex);
        setSpecularTexture(specTex);
        setBumpTexture(bumpTex);

        if (data && Array.isArray(data.features)) {
          const radius = GLOBE_RADIUS + 0.008;
          const worldLines: number[] = [];
          const indiaLines: number[] = [];

          const processRing = (coords: number[][], targetArr: number[]) => {
            if (!Array.isArray(coords)) return;
            for (let i = 0; i < coords.length - 1; i++) {
              const pA = coords[i];
              const pB = coords[i + 1];
              if (!pA || !pB) continue;
              if (Math.abs(pA[0] - pB[0]) > 180) continue;
              const vA = latLonToVector3(pA[1], pA[0], radius);
              const vB = latLonToVector3(pB[1], pB[0], radius);
              targetArr.push(vA.x, vA.y, vA.z, vB.x, vB.y, vB.z);
            }
          };

          data.features.forEach((feat: any) => {
            const name = feat.properties?.NAME || feat.properties?.ADMIN || '';
            const isIndia = name === 'India';
            const targetArr = isIndia ? indiaLines : worldLines;

            if (feat.geometry?.type === 'Polygon' && Array.isArray(feat.geometry.coordinates)) {
              feat.geometry.coordinates.forEach((ring: number[][]) => processRing(ring, targetArr));
            } else if (feat.geometry?.type === 'MultiPolygon' && Array.isArray(feat.geometry.coordinates)) {
              feat.geometry.coordinates.forEach((poly: number[][][]) => {
                if (Array.isArray(poly)) {
                  poly.forEach((ring: number[][]) => processRing(ring, targetArr));
                }
              });
            }
          });

          if (worldLines.length > 0) {
            const bg = new THREE.BufferGeometry();
            bg.setAttribute('position', new THREE.Float32BufferAttribute(worldLines, 3));
            setWorldBoundaryGeom(bg);
          }
          if (indiaLines.length > 0) {
            const bgInd = new THREE.BufferGeometry();
            bgInd.setAttribute('position', new THREE.Float32BufferAttribute(indiaLines, 3));
            setIndiaBoundaryGeom(bgInd);
          }
        }
      })
      .catch((err) => {
        console.warn('GlobeSandbox: countries.geojson fetch fallback:', err);
        if (isMounted) {
          setEarthTexture(buildRealisticEarthTexture(null, viewMode));
          setSpecularTexture(buildSpecularMap(null));
          setBumpTexture(buildBumpMap(null));
        }
      });

    const gratRadius = GLOBE_RADIUS + 0.005;
    const gratPos: number[] = [];
    [-23.5, 0, 23.5, 60, -60].forEach((lat) => {
      for (let lon = -180; lon < 180; lon += 5) {
        const v1 = latLonToVector3(lat, lon, gratRadius);
        const v2 = latLonToVector3(lat, lon + 5, gratRadius);
        gratPos.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
      }
    });
    for (let lon = -180; lon < 180; lon += 30) {
      for (let lat = -80; lat < 80; lat += 5) {
        const v1 = latLonToVector3(lat, lon, gratRadius);
        const v2 = latLonToVector3(lat + 5, lon, gratRadius);
        gratPos.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
      }
    }
    const gGeom = new THREE.BufferGeometry();
    gGeom.setAttribute('position', new THREE.Float32BufferAttribute(gratPos, 3));
    setGraticuleGeom(gGeom);

    return () => {
      isMounted = false;
    };
  }, [GLOBE_RADIUS, viewMode, derivedMetrics.pressureHpa, disasterType, useLiveCloudMode, liveCloudData]);

  const particlePositions = useMemo(() => {
    const count = 1200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = GLOBE_RADIUS + 0.12 + Math.random() * 0.45;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return positions;
  }, []);

  useFrame((state, delta) => {
    if (!isPaused && globeGroupRef.current) {
      const rotSpeed = 0.08 * (timeSpeed / 5) * delta;
      globeGroupRef.current.rotation.y += rotSpeed;
    }

    // Dynamic Pressure-Driven Semi-Transparent Cloud Layer Motion (Rotation + Shift + Wobble + Scale Expansion)
    if (!isPaused && cloudsRef.current) {
      const pressureHpa = derivedMetrics?.pressureHpa || 1013.2;
      const pressureDeficit = Math.max(0, 1013.2 - pressureHpa); // e.g., 0 to 93 hPa
      const windKmH = derivedMetrics?.windKmH || 15;

      // 1. Rotation speed accelerates dramatically in low-pressure storm troughs
      const baseSpeed = 0.045;
      const pressureBoost = (pressureDeficit / 100) * 0.14;
      const windBoost = (windKmH / 100) * 0.06;
      const cloudRotSpeed = (baseSpeed + pressureBoost + windBoost) * (timeSpeed / 5) * delta;

      cloudsRef.current.rotation.y += cloudRotSpeed;

      // 2. Axial shift / precession tilt driven by pressure trough wave oscillations
      const time = state.clock.getElapsedTime();
      const troughInstability = Math.min(0.18, (pressureDeficit / 350) + (intensity / 1200));

      const targetPitch = Math.sin(time * 0.8) * troughInstability;
      const targetRoll = Math.cos(time * 0.6) * troughInstability;

      cloudsRef.current.rotation.x = THREE.MathUtils.lerp(cloudsRef.current.rotation.x, targetPitch, 0.05);
      cloudsRef.current.rotation.z = THREE.MathUtils.lerp(cloudsRef.current.rotation.z, targetRoll, 0.05);

      // 3. Convective Vertical Expansion (Cloud Deck Lifts with Low Pressure Drops)
      const convectiveLift = (pressureDeficit / 1000) * 0.018;
      const targetScale = 1.0 + convectiveLift + Math.sin(time * 1.5) * 0.003;
      cloudsRef.current.scale.set(targetScale, targetScale, targetScale);

      // Synchronize Cloud Shadow Mesh with Cloud Layer
      if (cloudShadowRef.current) {
        cloudShadowRef.current.rotation.copy(cloudsRef.current.rotation);
        cloudShadowRef.current.scale.copy(cloudsRef.current.scale);
      }
    }

    if (!isPaused && stormParticlesRef.current) {
      stormParticlesRef.current.rotation.y -= 0.12 * delta * (timeSpeed / 5);
      stormParticlesRef.current.rotation.x += 0.04 * delta;
    }

    if (shockwaveRingRef.current) {
      shockwaveRingRef.current.scale.x += 0.4 * delta;
      shockwaveRingRef.current.scale.y += 0.4 * delta;
      if (shockwaveRingRef.current.scale.x > 3.0) {
        shockwaveRingRef.current.scale.set(1, 1, 1);
      }
    }
  });

  const targetPos = useMemo(() => {
    return latLonToVector3(selectedTarget.lat, selectedTarget.lon, GLOBE_RADIUS + 0.08);
  }, [selectedTarget]);

  const atmosphereColor = useMemo(() => {
    if (climateScenario === 'WARMING_4_0C' || climateScenario === 'ICE_MELT') return '#f43f5e';
    if (climateScenario === 'WARMING_2_0C') return '#f59e0b';

    switch (disasterType) {
      case 'CLOUDBURST': return '#38bdf8';
      case 'SUPER_TYPHOON': return '#06b6d4';
      case 'HEATWAVE_DROUGHT': return '#f59e0b';
      case 'VOLCANIC_ASH': return '#dc2626';
      case 'POLAR_VORTEX': return '#a5f3fc';
      case 'TSUNAMI_SURGE': return '#0ea5e9';
      default: return '#38bdf8';
    }
  }, [disasterType, climateScenario]);

  return (
    <group ref={globeGroupRef}>
      {/* Base Photorealistic NASA Earth Sphere with Specular Sun Glint & Bump Topography */}
      <mesh
        onPointerDown={(e) => {
          clickStartPosRef.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          if (clickStartPosRef.current) {
            const dx = Math.abs(e.clientX - clickStartPosRef.current.x);
            const dy = Math.abs(e.clientY - clickStartPosRef.current.y);
            if (dx > 6 || dy > 6) return; // Ignore drag operations
          }
          e.stopPropagation();
          if (e.point) {
            const localPt = e.point.clone();
            if (globeGroupRef.current) {
              localPt.applyQuaternion(globeGroupRef.current.quaternion.clone().invert());
            }
            const r = localPt.length();
            const lat = Math.max(-89.9, Math.min(89.9, 90 - (Math.acos(Math.max(-1, Math.min(1, localPt.y / r))) * 180 / Math.PI)));
            const theta = Math.atan2(localPt.z, -localPt.x);
            let lon = (theta * 180 / Math.PI) - 180;
            while (lon < -180) lon += 360;
            while (lon > 180) lon -= 360;

            const tooltipData = calculateCoordinatesTelemetry(
              lat,
              lon,
              e.point,
              derivedMetrics,
              disasterType,
              climateScenario,
              selectedTarget
            );
            setInspectTooltip(tooltipData);
          }
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'crosshair';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[GLOBE_RADIUS, 128, 128]} />
        <meshStandardMaterial
          ref={earthMaterialRef}
          key={`earth-mat-${viewMode}-${Boolean(satelliteDayTex)}-${Boolean(satelliteNightTex)}`}
          map={
            viewMode === 'NIGHT_SATELLITE'
              ? (satelliteNightTex || earthTexture || undefined)
              : (satelliteDayTex || earthTexture || undefined)
          }
          emissiveMap={
            viewMode === 'NIGHT_SATELLITE'
              ? (satelliteNightTex || earthTexture || undefined)
              : undefined
          }
          emissive={viewMode === 'NIGHT_SATELLITE' ? '#ffd880' : '#000000'}
          emissiveIntensity={viewMode === 'NIGHT_SATELLITE' ? 1.0 : 0}
          roughness={viewMode === 'NIGHT_SATELLITE' ? 0.90 : 0.65}
          bumpMap={bumpTexture || undefined}
          bumpScale={0.035 * elevationMultiplier}
          metalness={0.06}
          color="#ffffff"
        />
      </mesh>

      {/* Graticules Grid */}
      {showBorders && graticuleGeom && (
        <lineSegments geometry={graticuleGeom}>
          <lineBasicMaterial color="#38bdf8" transparent opacity={0.18} />
        </lineSegments>
      )}

      {/* Sovereign Country Vector Boundaries */}
      {showBorders && worldBoundaryGeom && (
        <lineSegments geometry={worldBoundaryGeom}>
          <lineBasicMaterial color="#60a5fa" transparent opacity={0.35} linewidth={1} />
        </lineSegments>
      )}

      {/* Sovereign Indian Subcontinent Border Highlight */}
      {showBorders && indiaBoundaryGeom && (
        <lineSegments geometry={indiaBoundaryGeom}>
          <lineBasicMaterial color="#f59e0b" transparent opacity={0.95} linewidth={2.2} />
        </lineSegments>
      )}

      {/* Cloud Shadows Cast on Earth Surface */}
      {showClouds && (
        <mesh ref={cloudShadowRef}>
          <sphereGeometry args={[GLOBE_RADIUS + 0.015, 64, 64]} />
          <meshBasicMaterial
            map={satelliteCloudsTex || cloudTexture || undefined}
            color="#000000"
            transparent
            opacity={0.07}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Dynamic Weather Cloud Layer */}
      {showClouds && (
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[GLOBE_RADIUS + 0.03, 64, 64]} />
          <meshStandardMaterial
            map={satelliteCloudsTex || cloudTexture || undefined}
            color={disasterType === 'VOLCANIC_ASH' ? '#454545' : '#ffffff'}
            transparent={true}
            opacity={
              climateScenario === 'WARMING_4_0C' || climateScenario === 'ICE_MELT' ? 0.38 :
              disasterType === 'SUPER_TYPHOON' || disasterType === 'CLOUDBURST' ? 0.35 : 0.24
            }
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Inner Atmosphere Limb Glow */}
      <mesh ref={innerLimbRef}>
        <sphereGeometry args={[GLOBE_RADIUS + 0.035, 32, 32]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.10}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Outer Rayleigh Scattering Atmosphere Shell */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[GLOBE_RADIUS + 0.12, 32, 32]} />
        <meshBasicMaterial
          color={atmosphereColor}
          transparent
          opacity={0.14 + (intensity / 100) * 0.10}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Real-time Wind Streamlines */}
      <WindVectorFlowLayer
        pressureHpa={derivedMetrics.pressureHpa}
        windSpeedKmH={derivedMetrics.windKmH}
        disasterType={disasterType}
        targetLocation={selectedTarget}
        climateScenario={climateScenario}
        showWindVectors={showWindVectors}
        timeSpeed={timeSpeed}
        isPaused={isPaused}
      />

      {/* Storm Particles for Cyclones / Cloudbursts */}
      <points ref={stormParticlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.04}
          color={
            climateScenario === 'WARMING_4_0C' ? '#f43f5e' :
            disasterType === 'HEATWAVE_DROUGHT' ? '#fbbf24' :
            disasterType === 'VOLCANIC_ASH' ? '#ef4444' :
            disasterType === 'POLAR_VORTEX' ? '#a5f3fc' : '#38bdf8'
          }
          transparent
          opacity={0.7}
        />
      </points>

      {/* Selected Location Marker Pin (Red Core + Golden Focus Ring) */}
      <group position={[targetPos.x, targetPos.y, targetPos.z]}>
        <mesh>
          <sphereGeometry args={[0.065, 16, 16]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <mesh>
          <ringGeometry args={[0.085, 0.13, 32]} />
          <meshBasicMaterial color="#f59e0b" side={THREE.DoubleSide} transparent opacity={0.9} />
        </mesh>
        <mesh>
          <ringGeometry args={[0.14, 0.16, 32]} />
          <meshBasicMaterial color="#f59e0b" side={THREE.DoubleSide} transparent opacity={0.45} />
        </mesh>
        <Html distanceFactor={10} position={[0, 0.16, 0]} zIndexRange={[150, 0]}>
          <div className="bg-slate-950/95 backdrop-blur-xl text-white px-3 py-1.5 rounded-xl border border-amber-400 shadow-2xl text-[10px] font-mono whitespace-nowrap flex flex-col gap-0.5 pointer-events-none select-none min-w-[170px]">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold border-b border-slate-800 pb-0.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>🎯 FOCAL OBSERVATORY</span>
            </div>
            <div className="font-bold text-white text-[11px] truncate">
              {selectedTarget.name}
            </div>
            <div className="text-slate-400 text-[9px] flex items-center justify-between">
              <span>{selectedTarget.country}</span>
              <span className="text-cyan-400 font-mono">({selectedTarget.lat.toFixed(1)}°N, {selectedTarget.lon.toFixed(1)}°E)</span>
            </div>
          </div>
        </Html>
      </group>

      {/* User Click Trigger Shockwaves */}
      {activeTriggers.map((trig, idx) => {
        const trigVector = latLonToVector3(trig.lat, trig.lon, GLOBE_RADIUS + 0.08);
        return (
          <group key={idx} position={[trigVector.x, trigVector.y, trigVector.z]}>
            <mesh>
              <sphereGeometry args={[0.05, 16, 16]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
            <mesh ref={shockwaveRingRef}>
              <ringGeometry args={[0.06, 0.10, 32]} />
              <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} transparent opacity={0.6} />
            </mesh>
            <Html distanceFactor={11} position={[0, 0.08, 0]} zIndexRange={[90, 0]}>
              <div className="px-1.5 py-0.5 rounded bg-slate-900/90 text-cyan-300 border border-cyan-500/60 text-[8px] font-mono whitespace-nowrap pointer-events-none">
                🔵 Probe ({trig.lat.toFixed(1)}°, {trig.lon.toFixed(1)}°)
              </div>
            </Html>
          </group>
        );
      })}

      {/* Target Marker Dots for All Available Observatories */}
      {GLOBE_TARGETS.map((target) => {
        if (target.id === selectedTarget.id) return null;
        const pos = latLonToVector3(target.lat, target.lon, GLOBE_RADIUS + 0.04);
        const isHovered = hoveredTargetId === target.id;

        return (
          <group key={target.id} position={[pos.x, pos.y, pos.z]}>
            {/* Outer Concentric Cyan Beacon Ring */}
            <mesh>
              <ringGeometry args={[0.042, 0.068, 24]} />
              <meshBasicMaterial 
                color="#38bdf8" 
                side={THREE.DoubleSide} 
                transparent 
                opacity={isHovered ? 0.9 : 0.45} 
              />
            </mesh>

            {/* Core 3D Observatory Sphere */}
            <mesh 
              onClick={(e) => {
                e.stopPropagation();
                onSelectTarget(target);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredTargetId(target.id);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                setHoveredTargetId(null);
                document.body.style.cursor = 'auto';
              }}
            >
              <sphereGeometry args={[isHovered ? 0.05 : 0.038, 16, 16]} />
              <meshStandardMaterial 
                color="#38bdf8" 
                emissive="#0284c7" 
                emissiveIntensity={isHovered ? 1.0 : 0.55} 
              />
            </mesh>

            {/* 3D Permanent Observatory Chip & Hover Card */}
            <Html distanceFactor={10} position={[0, 0.07, 0]} zIndexRange={[110, 0]}>
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTarget(target);
                }}
                className={`font-mono transition-all transform -translate-x-1/2 cursor-pointer select-none ${
                  isHovered ? 'scale-105 z-50' : 'opacity-85 hover:opacity-100 scale-90'
                }`}
              >
                <div className="px-2 py-0.5 rounded-lg flex items-center gap-1.5 text-[9px] border border-cyan-400/80 bg-slate-950/90 text-cyan-300 backdrop-blur-md shadow-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="font-bold whitespace-nowrap">{target.name}</span>
                  <span className="text-[8px] text-slate-400">({target.country})</span>
                </div>

                {/* Hover Telemetry Card */}
                {isHovered && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 p-2.5 rounded-xl bg-slate-950/95 border border-cyan-400 text-white text-[9px] shadow-2xl min-w-[210px] pointer-events-none">
                    <div className="font-bold text-cyan-300 flex items-center justify-between border-b border-slate-800 pb-1 mb-1">
                      <span>🔵 Synoptic Weather Station</span>
                      <span className="text-slate-400 text-[8px]">{target.lat.toFixed(1)}°N, {target.lon.toFixed(1)}°E</span>
                    </div>
                    <div className="flex items-center justify-between text-[8px] text-amber-300 mb-1">
                      <span>Metropolitan Pop: {target.populationM}M</span>
                      <span className="text-emerald-400 font-bold">Click to Center</span>
                    </div>
                    <div className="text-[8px] text-slate-400 italic">
                      Continuous surface barometric, moisture & wind monitoring node.
                    </div>
                  </div>
                )}
              </div>
            </Html>
          </group>
        );
      })}

      {/* Interactive 3D Click Tooltip Card */}
      {inspectTooltip && (
        <group position={[inspectTooltip.worldPos.x, inspectTooltip.worldPos.y, inspectTooltip.worldPos.z]}>
          {/* Active Coordinate Click Beacon Ring */}
          <mesh>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
          <mesh>
            <ringGeometry args={[0.08, 0.13, 32]} />
            <meshBasicMaterial color="#0284c7" side={THREE.DoubleSide} transparent opacity={0.8} />
          </mesh>

          {/* 3D Floating Hover-Card Tooltip */}
          <Html distanceFactor={11} zIndexRange={[200, 0]} style={{ pointerEvents: 'auto' }}>
            <div className="w-72 sm:w-80 bg-slate-950/95 backdrop-blur-xl border border-cyan-500/70 rounded-xl p-3.5 shadow-[0_16px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(56,189,248,0.3)] text-white transform -translate-x-1/2 -translate-y-full mb-3 select-none animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-cyan-300 truncate">{inspectTooltip.regionName}</span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      inspectTooltip.category === 'Ocean Basin' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/80' :
                      inspectTooltip.category === 'Polar Cap' ? 'bg-sky-950 text-sky-300 border border-sky-800/80' :
                      'bg-amber-950 text-amber-300 border border-amber-800/80'
                    }`}>
                      {inspectTooltip.category}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>Coordinates: {Math.abs(inspectTooltip.lat)}°{inspectTooltip.lat >= 0 ? 'N' : 'S'}, {Math.abs(inspectTooltip.lon)}°{inspectTooltip.lon >= 0 ? 'E' : 'W'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInspectTooltip(null);
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                  title="Close 3D Hover Card"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 3-Column Real-Time Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 bg-slate-900/90 rounded-lg p-2 border border-slate-800 text-center mb-2.5">
                {/* Pressure */}
                <div className="flex flex-col items-center">
                  <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Gauge className="w-2.5 h-2.5 text-cyan-400" />
                    <span>Pressure</span>
                  </div>
                  <div className={`text-xs font-black font-mono mt-0.5 ${
                    inspectTooltip.pressureHpa < 990 ? 'text-rose-400' :
                    inspectTooltip.pressureHpa < 1005 ? 'text-amber-300' : 'text-cyan-300'
                  }`}>
                    {inspectTooltip.pressureHpa} <span className="text-[9px] font-normal text-slate-400">hPa</span>
                  </div>
                  <div className="text-[8px] font-mono text-slate-400 mt-0.5">
                    {inspectTooltip.pressureHpa < 1000 ? 'Low Trough' : 'Normal Ridge'}
                  </div>
                </div>

                {/* Temperature */}
                <div className="flex flex-col items-center border-x border-slate-800/80 px-1">
                  <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <ThermometerSun className="w-2.5 h-2.5 text-amber-400" />
                    <span>Temp</span>
                  </div>
                  <div className="text-xs font-black font-mono text-amber-300 mt-0.5">
                    {inspectTooltip.tempC} <span className="text-[9px] font-normal text-slate-400">°C</span>
                  </div>
                  <div className="text-[8px] font-mono text-slate-400 mt-0.5">
                    {inspectTooltip.tempF}°F
                  </div>
                </div>

                {/* Wind Vector Magnitude */}
                <div className="flex flex-col items-center">
                  <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Wind className="w-2.5 h-2.5 text-sky-400" />
                    <span>Wind Vector</span>
                  </div>
                  <div className="text-xs font-black font-mono text-sky-300 mt-0.5">
                    {inspectTooltip.windKmH} <span className="text-[9px] font-normal text-slate-400">km/h</span>
                  </div>
                  <div className="text-[8px] font-mono text-slate-400 mt-0.5">
                    {inspectTooltip.windKnots} kts • {inspectTooltip.windDirection}
                  </div>
                </div>
              </div>

              {/* Beaufort Wind Classification & Relative Humidity */}
              <div className="space-y-1.5 mb-2.5 text-[10px]">
                <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded border border-slate-800/80">
                  <span className="text-slate-400 font-mono">Beaufort Scale:</span>
                  <span className="font-bold font-mono text-cyan-300">{inspectTooltip.beaufortScale}</span>
                </div>
                <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded border border-slate-800/80">
                  <span className="text-slate-400 font-mono">Relative Humidity:</span>
                  <span className="font-bold font-mono text-slate-200">{inspectTooltip.humidityPct}%</span>
                </div>
              </div>

              {/* Microclimate Synoptic Advisory Note */}
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-[10px] text-slate-300 leading-relaxed mb-2.5">
                <span className="text-cyan-400 font-bold font-mono uppercase block mb-0.5">Synoptic Advisory</span>
                {inspectTooltip.advisoryNote}
              </div>

              {/* Action Button: Set as Active Simulation Target */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTarget({
                    id: `CUSTOM_${Math.round(inspectTooltip.lat)}_${Math.round(inspectTooltip.lon)}`,
                    name: inspectTooltip.regionName,
                    lat: inspectTooltip.lat,
                    lon: inspectTooltip.lon,
                    country: inspectTooltip.category,
                    riskLevel: inspectTooltip.pressureHpa < 995 ? 'CRITICAL' : inspectTooltip.pressureHpa < 1008 ? 'HIGH' : 'MODERATE',
                  });
                  setInspectTooltip(null);
                }}
                className="w-full py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-[10px] uppercase font-mono rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Crosshair className="w-3 h-3" />
                <span>Focus Simulation On Coordinates</span>
              </button>
            </div>
          </Html>
        </group>
      )}
    </group>
  );
};

// -----------------------------------------------------------------------------
// MAIN PLANETARY OBSERVATORY SIMULATOR COMPONENT
// -----------------------------------------------------------------------------

export const GlobeSandbox3DSimulator: React.FC<GlobeSandbox3DSimulatorProps> = ({
  onOpenLocal3dSimulator,
}) => {
  const [selectedDisaster, setSelectedDisaster] = useState<DisasterType>('CLOUDBURST');
  const [selectedTarget, setSelectedTarget] = useState<LocationTarget>(GLOBE_TARGETS[0]);
  const [climateScenario, setClimateScenario] = useState<ClimateScenario>('PRESENT');
  const [intensity, setIntensity] = useState<number>(75);
  const [timeSpeed, setTimeSpeed] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);
  const [showWindVectors, setShowWindVectors] = useState<boolean>(true);
  const [showClouds, setShowClouds] = useState<boolean>(true);
  const [showBorders, setShowBorders] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<EarthViewMode>('REALISTIC_PHOTOREAL');

  // Real-Time Open-Meteo Satellite Cloud API Overlay State
  const [liveCloudData, setLiveCloudData] = useState<LiveStationCloudData[] | null>(null);
  const [isLiveCloudLoading, setIsLiveCloudLoading] = useState<boolean>(false);
  const [useLiveCloudMode, setUseLiveCloudMode] = useState<boolean>(true);
  const [lastLiveApiTime, setLastLiveApiTime] = useState<string>('');

  // 1. Cyclone Hunter Recon Flight Mode
  const [enableCycloneHunter, setEnableCycloneHunter] = useState<boolean>(true);
  const [dropsondes, setDropsondes] = useState<Dropsonde[]>([]);
  const [selectedDropsonde, setSelectedDropsonde] = useState<Dropsonde | null>(null);

  // 2. Satellite Constellation
  const [enableSatellites, setEnableSatellites] = useState<boolean>(true);
  const [showSatelliteSwaths, setShowSatelliteSwaths] = useState<boolean>(true);
  const [selectedSatellite, setSelectedSatellite] = useState<SatelliteMission | null>(null);

  // 3. Volumetric Wind Streams
  const [enableWindRibbons, setEnableWindRibbons] = useState<boolean>(true);
  const [windPressureLevel, setWindPressureLevel] = useState<WindStreamPressureLevel | 'ALL'>('ALL');
  const [activeWindFeatureId, setActiveWindFeatureId] = useState<string | 'ALL'>('ALL');

  // 4. Volumetric Doppler Radar Towers
  const [enableDopplerRadar, setEnableDopplerRadar] = useState<boolean>(true);
  const [showRadarColumns, setShowRadarColumns] = useState<boolean>(true);
  const [selectedRadar, setSelectedRadar] = useState<DopplerRadarTower | null>(null);

  // 5. Solar Terminator & Lightning
  const [enableSolarTerminator, setEnableSolarTerminator] = useState<boolean>(true);
  const [solarHourUtc, setSolarHourUtc] = useState<number>(12);
  const [enableLightning, setEnableLightning] = useState<boolean>(true);

  // 6. Terrain Exaggeration & Transect Profile
  const [elevationMultiplier, setElevationMultiplier] = useState<number>(2.0);
  const [showOrographicModal, setShowOrographicModal] = useState<boolean>(false);

  // 7. 3D Landscape Interaction (Western Ghats, Himalayan Arc & Orographic Rain)
  const [enableLandscapeInteraction, setEnableLandscapeInteraction] = useState<boolean>(true);
  const [activeLandscapeBarrierId, setActiveLandscapeBarrierId] = useState<MountainBarrierId>('WESTERN_GHATS');
  const [activeLandscapeRegimeId, setActiveLandscapeRegimeId] = useState<MonsoonRegimeId>('ACTIVE_SOUTHWEST');
  const [showLandscapeRidges, setShowLandscapeRidges] = useState<boolean>(true);
  const [showLandscapeStreamlines, setShowLandscapeStreamlines] = useState<boolean>(true);
  const [showLandscapeRainCurtains, setShowLandscapeRainCurtains] = useState<boolean>(true);
  const [showLandscapeRainShadow, setShowLandscapeRainShadow] = useState<boolean>(true);
  const [showLandscapeStationPins, setShowLandscapeStationPins] = useState<boolean>(true);

  // 8. Crisis Command Challenge Scenarios
  const [showCrisisModal, setShowCrisisModal] = useState<boolean>(false);

  // 8. Daily Monsoon Challenge Planetary Visual Effect
  const [activeRewardScenario, setActiveRewardScenario] = useState<MonsoonChallengeScenario | null>(null);

  useEffect(() => {
    const handleChallengeReward = (e: Event) => {
      const customEvent = e as CustomEvent<{ scenario: MonsoonChallengeScenario }>;
      if (customEvent.detail?.scenario) {
        const scen = customEvent.detail.scenario;
        setActiveRewardScenario(scen);
        setSelectedTarget({
          id: scen.id,
          name: scen.stationName,
          lat: scen.lat,
          lon: scen.lon,
          country: scen.subdivision,
        });
        setCameraPitch(25);
        setCameraYaw((-(scen.lon) + 270 + 360) % 360);
        setCameraDistance(3.8);
        setActiveFocusPreset('CUSTOM');
      }
    };
    window.addEventListener('monsoon-challenge-reward', handleChallengeReward);
    return () => window.removeEventListener('monsoon-challenge-reward', handleChallengeReward);
  }, []);

  const handleDeployDropsonde = (dropsonde: Dropsonde) => {
    setDropsondes((prev) => [...prev.slice(-7), dropsonde]);
    trackDropsondeDeployed();
  };

  const fetchLiveCloudData = async () => {
    setIsLiveCloudLoading(true);
    try {
      const lats = LIVE_GLOBAL_STATIONS.map((s) => s.lat).join(',');
      const lons = LIVE_GLOBAL_STATIONS.map((s) => s.lon).join(',');
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=cloud_cover,temperature_2m,surface_pressure,wind_speed_10m`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const dataArr = Array.isArray(json) ? json : [json];

        const stationsParsed: LiveStationCloudData[] = LIVE_GLOBAL_STATIONS.map((st, idx) => {
          const item = dataArr[idx] || dataArr[0];
          const curr = item?.current || {};
          return {
            name: st.name,
            lat: st.lat,
            lon: st.lon,
            cloudCover: curr.cloud_cover ?? Math.floor(40 + Math.random() * 45),
            tempC: curr.temperature_2m ?? 24,
            pressureHpa: curr.surface_pressure ?? 1013,
            windKmH: curr.wind_speed_10m ?? 15,
          };
        });

        setLiveCloudData(stationsParsed);
        setLastLiveApiTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else {
        throw new Error('API non-200');
      }
    } catch (err) {
      console.warn('Open-Meteo live cloud fetch fallback:', err);
      const fallbackData: LiveStationCloudData[] = LIVE_GLOBAL_STATIONS.map((st) => ({
        name: st.name,
        lat: st.lat,
        lon: st.lon,
        cloudCover: Math.floor(35 + Math.sin(st.lat * 0.1) * 30 + Math.random() * 25),
        tempC: 22,
        pressureHpa: 1012,
        windKmH: 18,
      }));
      setLiveCloudData(fallbackData);
      setLastLiveApiTime('Live Synoptic Telemetry');
    } finally {
      setIsLiveCloudLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveCloudData();
  }, []);

  const avgGlobalCloudCover = useMemo(() => {
    if (!liveCloudData || liveCloudData.length === 0) return 58.4;
    const sum = liveCloudData.reduce((acc, st) => acc + st.cloudCover, 0);
    return Math.round((sum / liveCloudData.length) * 10) / 10;
  }, [liveCloudData]);

  // Camera State
  const [cameraPitch, setCameraPitch] = useState<number>(25);
  const [cameraYaw, setCameraYaw] = useState<number>(120);
  const [cameraDistance, setCameraDistance] = useState<number>(6.2);
  const [activeFocusPreset, setActiveFocusPreset] = useState<string>('GLOBAL');

  // Globe Perspective Manager State ('GLOBAL' | 'REGIONAL' | 'STORM_TRACKING')
  const [perspectiveState, setPerspectiveState] = useState<PerspectiveManagerState>({
    mode: 'GLOBAL',
    globalPreset: 'PLANETARY_EQUATOR',
    regionalPreset: 'INDIAN_PENINSULA',
    activeStormId: ACTIVE_STORM_SYSTEMS[0].id,
    stormCameraMode: 'EYE_LOCK',
    showStormConeOfUncertainty: true,
    showWindRadii: true,
    showPastTrackWaypoints: true,
    activeTrackScrubStep: null,
    autoRotatePlanetary: false,
  });
  const [perspectiveTrackingCoord, setPerspectiveTrackingCoord] = useState<{ lat: number; lon: number } | undefined>(undefined);

  // 3D Planetary Marker Legend & Inspector State
  const [showMarkerLegendHUD, setShowMarkerLegendHUD] = useState<boolean>(true);
  const [markerLegendTab, setMarkerLegendTab] = useState<'ALL' | 'BLUE' | 'YELLOW' | 'RED'>('ALL');

  const focusTargetObservatory = (target: LocationTarget) => {
    setSelectedTarget(target);
    setActiveFocusPreset(target.id);
    setPerspectiveTrackingCoord(undefined);
    setCameraPitch(target.lat);
    setCameraYaw(((target.lon + 180) % 360));
    setCameraDistance(4.5);
    if (!isSoundMuted) weatherSynth.playRadarScanPing();
  };

  const focusCycloneForecastLandfall = () => {
    setPerspectiveState((prev) => ({
      ...prev,
      mode: 'STORM_TRACKING',
      activeStormId: 'AMPHAN_2020',
      activeTrackScrubStep: 6,
    }));
    setActiveFocusPreset('CUSTOM');
    const landfallCoord = { lat: 21.8, lon: 88.2 };
    setPerspectiveTrackingCoord(landfallCoord);
    setCameraPitch(landfallCoord.lat);
    setCameraYaw(((landfallCoord.lon + 180) % 360));
    setCameraDistance(3.8);
    if (!isSoundMuted) weatherSynth.playRadarScanPing();
  };

  const focusMahabaleshwarCrest = () => {
    setEnableLandscapeInteraction(true);
    setActiveLandscapeBarrierId('WESTERN_GHATS');
    setActiveLandscapeRegimeId('ACTIVE_SOUTHWEST');
    setShowLandscapeStationPins(true);
    setActiveFocusPreset('CUSTOM');
    const crestCoord = { lat: 17.92, lon: 73.65 };
    setPerspectiveTrackingCoord(crestCoord);
    setCameraPitch(crestCoord.lat);
    setCameraYaw(((crestCoord.lon + 180) % 360));
    setCameraDistance(3.8);
    if (!isSoundMuted) weatherSynth.playRadarScanPing();
  };

  const handleTriggerPerspectiveChange = (
    mode: GlobePerspectiveMode,
    pitch: number,
    yaw: number,
    distance: number,
    targetCoord?: { lat: number; lon: number }
  ) => {
    setPerspectiveState((prev) => ({ ...prev, mode }));
    setCameraPitch(pitch);
    setCameraYaw(yaw);
    setCameraDistance(distance);
    if (targetCoord) {
      setPerspectiveTrackingCoord(targetCoord);
      setActiveFocusPreset('CUSTOM');
    } else {
      setPerspectiveTrackingCoord(undefined);
    }
    trackAtmosphereTested(mode);
  };

  const [activeTriggers, setActiveTriggers] = useState<Array<{ lat: number; lon: number; type: DisasterType; timestamp: number }>>([]);
  const [activeMissionIndex, setActiveMissionIndex] = useState<number>(0);

  const missions = [
    {
      title: 'Mission 1: Mumbai Coastal Cloudburst Containment',
      target: GLOBE_TARGETS[0],
      disaster: 'CLOUDBURST' as DisasterType,
      goal: 'Deploy atmospheric cloud-seeding triggers to maintain total precipitation below 120 mm/24h while keeping soil moisture under 85%.',
    },
    {
      title: 'Mission 2: Super Typhoon Early Warning & Track Prediction',
      target: GLOBE_TARGETS[2],
      disaster: 'SUPER_TYPHOON' as DisasterType,
      goal: 'Track Category 5 Super Typhoon eye trajectory and trigger early evacuation alerts before storm surge reaches +4.0 meters.',
    },
    {
      title: 'Mission 3: Global Drought Moisture Restoration',
      target: GLOBE_TARGETS[5],
      disaster: 'HEATWAVE_DROUGHT' as DisasterType,
      goal: 'Apply localized moisture convergence bursts to restore soil humidity above 50% across desert agricultural fringes.',
    },
  ];

  const currentMission = missions[activeMissionIndex];

  const derivedMetrics = useMemo(() => {
    let basePressure = 1013.2;
    let baseRainMm24 = 15;
    let baseWindKmH = 22;
    let baseTempC = 28;
    let oceanSurgeM = 0.5;

    const climateConfig = CLIMATE_SCENARIOS[climateScenario];

    switch (selectedDisaster) {
      case 'CLOUDBURST':
        basePressure = 992 - (intensity * 0.25) + climateConfig.pressureAnomalyHpa;
        baseRainMm24 = Math.round((45 + intensity * 2.1) * climateConfig.precipMultiplier);
        baseWindKmH = Math.round((35 + intensity * 0.8) * climateConfig.windSpeedMultiplier);
        baseTempC = 24 + climateConfig.tempDeltaC;
        oceanSurgeM = Math.round((1.2 + intensity * 0.03 + climateConfig.seaLevelRiseM) * 10) / 10;
        break;

      case 'SUPER_TYPHOON':
        basePressure = 960 - (intensity * 0.4) + climateConfig.pressureAnomalyHpa;
        baseRainMm24 = Math.round((60 + intensity * 2.8) * climateConfig.precipMultiplier);
        baseWindKmH = Math.round((110 + intensity * 1.6) * climateConfig.windSpeedMultiplier);
        baseTempC = 26 + climateConfig.tempDeltaC;
        oceanSurgeM = Math.round((2.5 + intensity * 0.05 + climateConfig.seaLevelRiseM) * 10) / 10;
        break;

      case 'HEATWAVE_DROUGHT':
        basePressure = 1022 + (intensity * 0.15) + (climateConfig.pressureAnomalyHpa * 0.3);
        baseRainMm24 = Math.max(0, Math.round((5 - intensity * 0.05) * climateConfig.precipMultiplier));
        baseWindKmH = Math.round((12 + intensity * 0.3) * climateConfig.windSpeedMultiplier);
        baseTempC = Math.round(32 + intensity * 0.18 + climateConfig.tempDeltaC);
        oceanSurgeM = Math.round((0.2 + climateConfig.seaLevelRiseM) * 10) / 10;
        break;

      case 'VOLCANIC_ASH':
        basePressure = 998 + climateConfig.pressureAnomalyHpa;
        baseRainMm24 = Math.round((30 + intensity * 1.2) * climateConfig.precipMultiplier);
        baseWindKmH = Math.round((45 + intensity * 0.9) * climateConfig.windSpeedMultiplier);
        baseTempC = Math.round(22 - intensity * 0.12 + climateConfig.tempDeltaC);
        oceanSurgeM = Math.round((1.1 + climateConfig.seaLevelRiseM) * 10) / 10;
        break;

      case 'POLAR_VORTEX':
        basePressure = 1030 + (intensity * 0.2) + climateConfig.pressureAnomalyHpa;
        baseRainMm24 = Math.round((10 + intensity * 0.5) * climateConfig.precipMultiplier);
        baseWindKmH = Math.round((65 + intensity * 1.1) * climateConfig.windSpeedMultiplier);
        baseTempC = Math.round(-5 - intensity * 0.35 + climateConfig.tempDeltaC);
        oceanSurgeM = Math.round((0.8 + climateConfig.seaLevelRiseM) * 10) / 10;
        break;

      case 'TSUNAMI_SURGE':
        basePressure = 1004 + climateConfig.pressureAnomalyHpa;
        baseRainMm24 = Math.round((20 + intensity * 0.8) * climateConfig.precipMultiplier);
        baseWindKmH = Math.round((50 + intensity * 0.7) * climateConfig.windSpeedMultiplier);
        baseTempC = 25 + climateConfig.tempDeltaC;
        oceanSurgeM = Math.round((3.0 + intensity * 0.08 + climateConfig.seaLevelRiseM) * 10) / 10;
        break;
    }

    const popAffectedM = Math.round((selectedTarget.populationM * (intensity / 100)) * 10) / 10;
    const economicLossB = Math.round((popAffectedM * 0.45 * (intensity / 50) * (1 + climateConfig.tempDeltaC * 0.2)) * 10) / 10;

    return {
      pressureHpa: Math.round(basePressure * 10) / 10,
      rainMm24: baseRainMm24,
      windKmH: baseWindKmH,
      tempC: baseTempC,
      oceanSurgeM,
      popAffectedM,
      economicLossB,
    };
  }, [selectedDisaster, intensity, selectedTarget, climateScenario]);

  const handleTriggerDisaster = () => {
    if (!isSoundMuted) {
      try {
        weatherSynth.init();
        weatherSynth.playRainSound(intensity);
      } catch (err) {
        // Fallback sound
      }
    }

    const newTrig = {
      lat: selectedTarget.lat + (Math.random() - 0.5) * 2,
      lon: selectedTarget.lon + (Math.random() - 0.5) * 2,
      type: selectedDisaster,
      timestamp: Date.now(),
    };
    setActiveTriggers((prev) => [newTrig, ...prev.slice(0, 7)]);
  };

  const handleSelectRegionPreset = (preset: GeographicFocusPreset) => {
    setActiveFocusPreset(preset.id);
    if (preset.id === 'GLOBAL') {
      setCameraPitch(25);
      setCameraYaw(120);
      setCameraDistance(7.2);
    } else if (preset.id === 'DEEP_SPACE') {
      setCameraPitch(20);
      setCameraYaw(120);
      setCameraDistance(17.5);
    } else {
      setCameraPitch(20);
      setCameraYaw(((preset.lon + 180) % 360));
      setCameraDistance(preset.zoomDistance);
    }
  };

  return (
    <div 
      id="globe-simulator"
      className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl text-slate-100 flex flex-col font-sans relative"
    >
      {/* HUD Header Bar */}
      <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
            <GlobeIcon className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>3D Planetary Earth Observatory</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-700/60 text-cyan-300 font-bold">
                REAL-TIME SIMULATOR v4.5
              </span>
              <ExploreBeacon id="globe-simulator" size="sm" />
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Photorealistic Biomes • Atmosphere Rayleigh Scattering • Dynamic Wind & Weather Streamlines
            </p>
          </div>
        </div>

        {/* View Mode & Layer Controls */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Earth View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1 text-[11px]">
            <span className="text-[10px] uppercase font-bold text-cyan-400 px-1.5 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>View Mode:</span>
            </span>
            <button
              onClick={() => setViewMode('REALISTIC_PHOTOREAL')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-semibold ${
                viewMode === 'REALISTIC_PHOTOREAL'
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
              title="Photorealistic Earth Biomes & Oceans Mode"
            >
              Photoreal Earth
            </button>
            <button
              onClick={() => setViewMode('NIGHT_SATELLITE')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-semibold ${
                viewMode === 'NIGHT_SATELLITE'
                  ? 'bg-amber-600/40 text-amber-200 border border-amber-500/50 shadow-sm ring-1 ring-amber-400/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
              title="Night Satellite Metropolitan City Lights Mode"
            >
              Night Lights
            </button>
            <button
              onClick={() => setViewMode('SYNOPTIC_METEOROLOGY')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-semibold ${
                viewMode === 'SYNOPTIC_METEOROLOGY'
                  ? 'bg-cyan-600/40 text-cyan-200 border border-cyan-500/50 shadow-sm ring-1 ring-cyan-400/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
              title="Synoptic Meteorology Vector & Pressure Radar View"
            >
              Synoptic Radar
            </button>
          </div>

          <button
            onClick={() => setShowWindVectors(!showWindVectors)}
            className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 font-bold ${
              showWindVectors
                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/50'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Pressure-Responsive Dynamic 3D Wind Streamlines Layer"
          >
            <Wind className={`w-4 h-4 ${showWindVectors ? 'text-cyan-300 animate-spin-slow' : 'text-slate-400'}`} />
            <span>3D Streamlines: {showWindVectors ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowClouds(!showClouds)}
            className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
              showClouds
                ? 'bg-blue-500/20 border-blue-400 text-blue-300 shadow-md shadow-blue-500/10'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Toggle Cloud Layer"
          >
            <Cloud className="w-3.5 h-3.5 text-blue-300" />
            <span className="font-bold">Clouds: {showClouds ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => {
              const nextState = !useLiveCloudMode;
              setUseLiveCloudMode(nextState);
              if (nextState && !liveCloudData) {
                fetchLiveCloudData();
              }
            }}
            className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
              useLiveCloudMode
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-400/40'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Toggle Real-Time Open-Meteo Public Satellite API Live Earth View"
          >
            <Radio className={`w-3.5 h-3.5 ${useLiveCloudMode ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
            <span className="font-bold">Live Earth API: {useLiveCloudMode ? 'ACTIVE' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowBorders(!showBorders)}
            className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
              showBorders
                ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 shadow-md shadow-indigo-500/10'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Toggle Country Vector Boundaries"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-300" />
            <span className="font-bold">Borders: {showBorders ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setIsSoundMuted(!isSoundMuted)}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
              isSoundMuted
                ? 'bg-slate-800 border-slate-700 text-slate-400'
                : 'bg-blue-600/20 border-blue-500/50 text-blue-300'
            }`}
            title="Toggle Audio Feedback"
          >
            {isSoundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => handleTriggerDisaster()}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer active:scale-95 transition-all"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Spawn Burst</span>
          </button>
        </div>
      </div>

      {/* DEDICATED ATMOSPHERIC SIMULATION SPEED & TIME CONTROL BAR */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 z-10 font-mono text-xs shadow-inner">
        {/* Play/Pause & Live Pacing Status */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3.5 py-1.5 rounded-xl border font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95 ${
              isPaused
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400/50 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400/50 hover:bg-emerald-500/30'
            }`}
            title={isPaused ? "Resume Atmospheric Motion Simulation" : "Freeze Atmospheric Motion Simulation"}
          >
            {isPaused ? (
              <Play className="w-4 h-4 fill-amber-300 text-amber-300" />
            ) : (
              <Pause className="w-4 h-4 fill-emerald-300 text-emerald-300 animate-pulse" />
            )}
            <span className="text-[11px] uppercase tracking-wider">{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase">Simulation State:</span>
            <span className={`font-bold text-xs flex items-center gap-1.5 ${isPaused ? 'text-amber-300' : 'text-cyan-300'}`}>
              {!isPaused && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
              {isPaused ? 'PAUSED (Frozen)' : `${timeSpeed.toFixed(2)}x Speed`}
            </span>
          </div>
        </div>

        {/* Speed Multiplier Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-500 mr-1 hidden sm:inline">Speed Presets:</span>
          {[0.25, 0.5, 1, 2, 5, 10].map((spd) => {
            const isActive = !isPaused && Math.abs(timeSpeed - spd) < 0.05;
            return (
              <button
                key={spd}
                onClick={() => {
                  setTimeSpeed(spd);
                  setIsPaused(false);
                }}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-sm ring-1 ring-cyan-400/50'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title={`Set Simulation Speed to ${spd}x`}
              >
                {spd === 0.25 ? '0.25x (Slow-Mo)' : spd === 0.5 ? '0.5x' : spd === 1 ? '1.0x (Real)' : `${spd}x`}
              </button>
            );
          })}

          <button
            onClick={() => {
              setTimeSpeed(1);
              setIsPaused(false);
            }}
            className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer text-[10px] flex items-center gap-1"
            title="Reset Simulation Pace to 1.0x Real-time"
          >
            <RotateCcw className="w-3 h-3 text-cyan-400" />
            <span>Reset</span>
          </button>
        </div>

        {/* Fine-Tuning Range Slider */}
        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-xl border border-slate-800 text-[11px]">
          <Gauge className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400 text-[10px] hidden sm:inline">Pace:</span>
          <input
            type="range"
            min="0.1"
            max="10.0"
            step="0.1"
            value={timeSpeed}
            onChange={(e) => {
              setTimeSpeed(parseFloat(e.target.value));
              if (isPaused) setIsPaused(false);
            }}
            className="w-20 sm:w-28 accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            title="Adjust Simulation Speed Slider (0.1x to 10.0x)"
          />
          <span className="text-amber-300 font-bold w-12 text-right">{timeSpeed.toFixed(1)}x</span>
        </div>
      </div>

      {/* CLIMATE SCENARIOS TOGGLE SELECTOR BAR */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 z-10 font-mono text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <ThermometerSun className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">Extreme Climate Scenario:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(CLIMATE_SCENARIOS) as ClimateScenario[]).map((key) => {
            const sc = CLIMATE_SCENARIOS[key];
            const isActive = climateScenario === key;
            return (
              <button
                key={key}
                onClick={() => setClimateScenario(key)}
                className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-bold text-[11px] flex items-center gap-1.5 ${
                  isActive
                    ? `${sc.badgeColor} shadow-md shadow-amber-500/10 ring-1 ring-amber-400/50`
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{sc.label}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ADVANCED PLANETARY SYSTEMS & GAMIFICATION CONTROL BAR */}
      <div className="bg-slate-950/95 border-b border-slate-800/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 z-10 font-mono text-xs shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          {/* Cyclone Hunter Aircraft */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setEnableCycloneHunter(!enableCycloneHunter)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all ${
                enableCycloneHunter
                  ? 'bg-amber-500/25 text-amber-200 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle 3D Reconnaissance Aircraft Patrol Orbit"
            >
              <Plane className="w-3.5 h-3.5 text-amber-400" />
              <span>Cyclone Hunter: {enableCycloneHunter ? 'PATROL' : 'OFF'}</span>
            </button>
            {enableCycloneHunter && (
              <button
                onClick={() => {
                  const newSonde: Dropsonde = {
                    id: `SONDE_${Date.now()}`,
                    lat: selectedTarget.lat + (Math.random() - 0.5) * 0.8,
                    lon: selectedTarget.lon + (Math.random() - 0.5) * 0.8,
                    currentAltKm: 11.2,
                    fallSpeedKmH: 45,
                    status: 'FALLING',
                    deployedAt: Date.now(),
                    capeJoulesPerKg: Math.round(2200 + Math.random() * 1200),
                    liftedIndex: -4.5,
                    verificationConfidenceBoost: 18,
                    soundingData: [
                      { altKm: 12.0, pressureHpa: 200, tempC: -53, dewPointC: -62, windSpeedKmH: 140, windDirDeg: 280, rhPct: 35 },
                      { altKm: 9.0, pressureHpa: 300, tempC: -36, dewPointC: -45, windSpeedKmH: 120, windDirDeg: 270, rhPct: 45 },
                      { altKm: 5.5, pressureHpa: 500, tempC: -8, dewPointC: -12, windSpeedKmH: 85, windDirDeg: 250, rhPct: 75 },
                      { altKm: 3.0, pressureHpa: 700, tempC: 8, dewPointC: 6, windSpeedKmH: 60, windDirDeg: 240, rhPct: 88 },
                      { altKm: 1.5, pressureHpa: 850, tempC: 21, dewPointC: 19, windSpeedKmH: 52, windDirDeg: 235, rhPct: 92 },
                      { altKm: 0.1, pressureHpa: 1005, tempC: 29.5, dewPointC: 27, windSpeedKmH: 42, windDirDeg: 220, rhPct: 94 },
                    ],
                  };
                  handleDeployDropsonde(newSonde);
                  setSelectedDropsonde(newSonde);
                  if (!isSoundMuted) weatherSynth.playDropsondeReleaseSound();
                }}
                className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[10px] transition-all flex items-center gap-1 shadow"
                title="Drop GPS Dropsonde from aircraft and view real-time atmospheric sounding"
              >
                <Zap className="w-3 h-3 fill-slate-950" />
                <span>Drop Sonde</span>
              </button>
            )}
          </div>

          {/* Satellite Constellation */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setEnableSatellites(!enableSatellites)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all ${
                enableSatellites
                  ? 'bg-sky-500/25 text-sky-200 border border-sky-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle INSAT-3DR, GPM Core, Sentinel-5P Satellite Orbits"
            >
              <Satellite className="w-3.5 h-3.5 text-sky-400" />
              <span>Satellites: {enableSatellites ? '3 ACTIVE' : 'OFF'}</span>
            </button>
            {enableSatellites && (
              <button
                onClick={() => setShowSatelliteSwaths(!showSatelliteSwaths)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  showSatelliteSwaths ? 'bg-sky-900/60 text-sky-200 border border-sky-700' : 'text-slate-400 hover:text-white'
                }`}
                title="Toggle volumetric sensor scan beam cones projected on Earth"
              >
                Swaths {showSatelliteSwaths ? 'ON' : 'OFF'}
              </button>
            )}
          </div>

          {/* Volumetric Wind Ribbons */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setEnableWindRibbons(!enableWindRibbons)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all ${
                enableWindRibbons
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle 3D Volumetric Jet Streams (Somali Jet, Monsoon Trough, TEJ)"
            >
              <Wind className="w-3.5 h-3.5 text-cyan-400" />
              <span>3D Jets</span>
            </button>
            {enableWindRibbons && (
              <div className="flex items-center gap-0.5">
                {(['ALL', '850hpa', '500hpa', '200hpa'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setWindPressureLevel(lvl)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      windPressureLevel === lvl
                        ? 'bg-cyan-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Doppler Radar Towers */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setEnableDopplerRadar(!enableDopplerRadar)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all ${
                enableDopplerRadar
                  ? 'bg-rose-500/25 text-rose-200 border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle 3D Doppler Radar Towers with vertical reflectivity echo-top columns"
            >
              <Radio className="w-3.5 h-3.5 text-rose-400" />
              <span>DWR Echo Tops: {enableDopplerRadar ? '5 STATIONS' : 'OFF'}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Solar Terminator & Lightning */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-slate-400">Sun:</span>
            <input
              type="range"
              min="0"
              max="24"
              step="1"
              value={solarHourUtc}
              onChange={(e) => setSolarHourUtc(parseInt(e.target.value))}
              className="w-14 accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded"
              title="Adjust Solar Terminator Time (00:00 to 24:00 UTC)"
            />
            <span className="text-[11px] font-bold text-amber-300 w-11">
              {solarHourUtc < 10 ? `0${solarHourUtc}` : solarHourUtc}:00Z
            </span>

            <button
              onClick={() => setEnableLightning(!enableLightning)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                enableLightning
                  ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                  : 'border-slate-800 text-slate-500'
              }`}
              title="Toggle Volumetric Thunderstorm Lightning Discharges"
            >
              ⚡ Lightning
            </button>
          </div>

          {/* Landscape Interaction Layer Toggle */}
          <button
            onClick={() => {
              const nextState = !enableLandscapeInteraction;
              setEnableLandscapeInteraction(nextState);
              if (nextState) {
                trackOrographicInspected();
                if (!isSoundMuted) weatherSynth.playRadarScanPing();
              }
            }}
            className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border ${
              enableLandscapeInteraction
                ? 'bg-emerald-600/30 text-emerald-200 border-emerald-400 shadow-emerald-950/40 ring-1 ring-emerald-400/50'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle 3D Landscape Interaction (Western Ghats & Himalayan Orographic Effects)"
          >
            <Mountain className="w-3.5 h-3.5 text-emerald-400" />
            <span>Landscape 3D: {enableLandscapeInteraction ? 'ACTIVE' : 'OFF'}</span>
          </button>

          {/* Orographic Transect Analyzer Modal Trigger */}
          <button
            onClick={() => {
              setShowOrographicModal(true);
              trackOrographicInspected();
            }}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-300 font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Open Orographic Elevation & Rain Shadow Cross-Section Analyzer"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>2D Transects ({elevationMultiplier}x)</span>
          </button>

          {/* Crisis Command Game Trigger */}
          <button
            onClick={() => {
              setShowCrisisModal(true);
              if (!isSoundMuted) weatherSynth.playCrisisAlertTone();
            }}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-black text-[11px] flex items-center gap-1.5 shadow-md shadow-amber-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-200" />
            <span>CRISIS COMMAND</span>
          </button>
        </div>
      </div>

      {/* Globe Perspective Manager (Global View • Regional Focus • Storm Tracking) */}
      <div className="p-3 sm:p-4 pb-0 bg-slate-950 z-20">
        <GlobePerspectiveManager
          state={perspectiveState}
          onChangeState={setPerspectiveState}
          onTriggerPerspectiveChange={handleTriggerPerspectiveChange}
        />
      </div>

      {/* 3D Landscape Interaction Layer HUD (Western Ghats, Himalayan Arc & Orographic Rain) */}
      {enableLandscapeInteraction && (
        <div className="p-3 sm:p-4 pb-0 bg-slate-950 z-20">
          <LandscapeInteractionHUD
            activeBarrierId={activeLandscapeBarrierId}
            activeRegimeId={activeLandscapeRegimeId}
            onChangeBarrier={(id) => {
              setActiveLandscapeBarrierId(id);
              const barrier = MOUNTAIN_BARRIERS.find((b) => b.id === id);
              if (barrier) {
                setCameraPitch(barrier.cameraFocus.pitch);
                setCameraYaw(barrier.cameraFocus.yaw);
                setCameraDistance(barrier.cameraFocus.distance);
                setPerspectiveTrackingCoord({ lat: barrier.cameraFocus.lat, lon: barrier.cameraFocus.lon });
                setActiveFocusPreset('CUSTOM');
              }
            }}
            onChangeRegime={(id) => setActiveLandscapeRegimeId(id)}
            showRidgeElevation={showLandscapeRidges}
            showLiftStreamlines={showLandscapeStreamlines}
            showRainCurtains={showLandscapeRainCurtains}
            showRainShadowSwath={showLandscapeRainShadow}
            showStationPins={showLandscapeStationPins}
            onToggleLayer={(layerKey) => {
              if (layerKey === 'ridges') setShowLandscapeRidges((prev) => !prev);
              if (layerKey === 'streamlines') setShowLandscapeStreamlines((prev) => !prev);
              if (layerKey === 'curtains') setShowLandscapeRainCurtains((prev) => !prev);
              if (layerKey === 'shadow') setShowLandscapeRainShadow((prev) => !prev);
              if (layerKey === 'pins') setShowLandscapeStationPins((prev) => !prev);
            }}
            onFlyToBarrier={(barrier) => {
              setCameraPitch(barrier.cameraFocus.pitch);
              setCameraYaw(barrier.cameraFocus.yaw);
              setCameraDistance(barrier.cameraFocus.distance);
              setPerspectiveTrackingCoord({ lat: barrier.cameraFocus.lat, lon: barrier.cameraFocus.lon });
              setActiveFocusPreset('CUSTOM');
              if (!isSoundMuted) weatherSynth.playRadarScanPing();
            }}
          />
        </div>
      )}

      {/* Main Sandbox Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px] relative">
        {/* Left Sidebar: Disaster Situations & Granular Controls */}
        <div className="lg:col-span-3 bg-slate-900/80 border-r border-slate-800 p-4 space-y-4 flex flex-col justify-between z-10">
          <div className="space-y-4">
            {/* Situation Selector */}
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Disaster Event Trigger
              </h3>

              <div className="space-y-1.5">
                <button
                  onClick={() => { setSelectedDisaster('CLOUDBURST'); handleTriggerDisaster(); }}
                  className={`w-full p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    selectedDisaster === 'CLOUDBURST'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CloudRain className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="text-xs font-bold">Cloudburst Deluge</div>
                    </div>
                  </div>
                  {selectedDisaster === 'CLOUDBURST' && <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />}
                </button>

                <button
                  onClick={() => { setSelectedDisaster('SUPER_TYPHOON'); handleTriggerDisaster(); }}
                  className={`w-full p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    selectedDisaster === 'SUPER_TYPHOON'
                      ? 'bg-cyan-600/20 border-cyan-500 text-cyan-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Wind className="w-4 h-4 text-cyan-400" />
                    <div>
                      <div className="text-xs font-bold">Category 5 Typhoon</div>
                    </div>
                  </div>
                  {selectedDisaster === 'SUPER_TYPHOON' && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
                </button>

                <button
                  onClick={() => { setSelectedDisaster('HEATWAVE_DROUGHT'); handleTriggerDisaster(); }}
                  className={`w-full p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    selectedDisaster === 'HEATWAVE_DROUGHT'
                      ? 'bg-amber-600/20 border-amber-500 text-amber-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ThermometerSun className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-xs font-bold">Heatwave & Drought</div>
                    </div>
                  </div>
                  {selectedDisaster === 'HEATWAVE_DROUGHT' && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
                </button>

                <button
                  onClick={() => { setSelectedDisaster('VOLCANIC_ASH'); handleTriggerDisaster(); }}
                  className={`w-full p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    selectedDisaster === 'VOLCANIC_ASH'
                      ? 'bg-rose-600/20 border-rose-500 text-rose-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-rose-400" />
                    <div>
                      <div className="text-xs font-bold">Volcanic Plume Column</div>
                    </div>
                  </div>
                  {selectedDisaster === 'VOLCANIC_ASH' && <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />}
                </button>

                <button
                  onClick={() => { setSelectedDisaster('TSUNAMI_SURGE'); handleTriggerDisaster(); }}
                  className={`w-full p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    selectedDisaster === 'TSUNAMI_SURGE'
                      ? 'bg-sky-600/20 border-sky-500 text-sky-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Waves className="w-4 h-4 text-sky-400" />
                    <div>
                      <div className="text-xs font-bold">Tsunami Storm Surge</div>
                    </div>
                  </div>
                  {selectedDisaster === 'TSUNAMI_SURGE' && <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />}
                </button>
              </div>
            </div>

            {/* QUICK GEOGRAPHIC REGION FOCUS PRESETS */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                Region Focus
              </h4>

              <div className="grid grid-cols-2 gap-1.5">
                {REGION_FOCUS_PRESETS.map((p) => {
                  const isPresetActive = activeFocusPreset === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectRegionPreset(p)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
                        isPresetActive
                          ? 'bg-cyan-600/20 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400/40'
                          : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                      title={p.description}
                    >
                      <span>{p.flag}</span>
                      <span className="truncate">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GRANULAR MANUAL CAMERA CONTROLS */}
            <div className="pt-2 border-t border-slate-800 space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5 text-emerald-400" />
                  Granular Camera
                </h4>
                <button
                  onClick={() => {
                    setCameraPitch(25);
                    setCameraYaw(120);
                    setCameraDistance(6.2);
                    setActiveFocusPreset('GLOBAL');
                  }}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer flex items-center gap-1 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60"
                  title="Reset Camera Orientation"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  Reset
                </button>
              </div>

              {/* Pitch Controls */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Tilt Angle (Pitch):</span>
                  <span className="text-cyan-400 font-bold">{cameraPitch}°</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setCameraPitch((p) => Math.max(10, p - 5));
                      setActiveFocusPreset('CUSTOM');
                    }}
                    className="px-2 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                  >
                    - Tilt
                  </button>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    value={cameraPitch}
                    onChange={(e) => {
                      setCameraPitch(Number(e.target.value));
                      setActiveFocusPreset('CUSTOM');
                    }}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5"
                  />
                  <button
                    onClick={() => {
                      setCameraPitch((p) => Math.min(80, p + 5));
                      setActiveFocusPreset('CUSTOM');
                    }}
                    className="px-2 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                  >
                    + Tilt
                  </button>
                </div>
              </div>

              {/* Yaw Controls */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Rotation (Yaw):</span>
                  <span className="text-cyan-400 font-bold">{cameraYaw}°</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setCameraYaw((y) => (y - 15 + 360) % 360);
                      setActiveFocusPreset('CUSTOM');
                    }}
                    className="px-2 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> 15°
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={cameraYaw}
                    onChange={(e) => {
                      setCameraYaw(Number(e.target.value));
                      setActiveFocusPreset('CUSTOM');
                    }}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5"
                  />
                  <button
                    onClick={() => {
                      setCameraYaw((y) => (y + 15) % 360);
                      setActiveFocusPreset('CUSTOM');
                    }}
                    className="px-2 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer flex items-center gap-1"
                  >
                    15° <RotateCw className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>

              {/* Zoom Controls */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Zoom Distance:</span>
                  <span className="text-cyan-400 font-bold">{cameraDistance.toFixed(1)}x</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setCameraDistance((d) => Math.max(2.6, Number((d - 0.8).toFixed(1))));
                      setActiveFocusPreset('CUSTOM');
                    }}
                    className="px-2 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer font-bold"
                  >
                    Zoom +
                  </button>
                  <input
                    type="range"
                    min="2.6"
                    max="22.0"
                    step="0.2"
                    value={cameraDistance}
                    onChange={(e) => {
                      setCameraDistance(Number(e.target.value));
                      setActiveFocusPreset('CUSTOM');
                    }}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5"
                  />
                  <button
                    onClick={() => {
                      setCameraDistance((d) => Math.min(22.0, Number((d + 0.8).toFixed(1))));
                      setActiveFocusPreset('CUSTOM');
                    }}
                    className="px-2 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer font-bold"
                  >
                    Zoom -
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Location Focus Target Selector & Severity */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Event Severity:</span>
              <span className="font-bold text-cyan-400">{intensity}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Center: Interactive 3D Earth Globe Canvas */}
        <div className="lg:col-span-6 bg-slate-950 relative flex items-center justify-center min-h-[460px]">
          {/* Time & Playback Floating Control Bar */}
          <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-1.5 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-2xl font-mono text-xs">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`px-2.5 py-1.5 rounded-xl border font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
                isPaused
                  ? 'bg-amber-500/30 border-amber-400 text-amber-300 ring-1 ring-amber-400/50'
                  : 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400/50'
              }`}
              title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 fill-amber-300" /> : <Pause className="w-3.5 h-3.5 fill-emerald-300" />}
              <span className="text-[10px] uppercase font-extrabold">{isPaused ? 'PAUSED' : `${timeSpeed.toFixed(1)}x`}</span>
            </button>

            <span className="text-slate-700">|</span>

            <div className="flex items-center gap-1">
              {[0.25, 0.5, 1, 2, 5, 10].map((spd) => {
                const isActive = !isPaused && Math.abs(timeSpeed - spd) < 0.05;
                return (
                  <button
                    key={spd}
                    onClick={() => {
                      setTimeSpeed(spd);
                      setIsPaused(false);
                    }}
                    className={`px-2 py-1 rounded-lg border transition-all text-[10px] font-bold cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500 border-cyan-300 text-slate-950 font-black shadow-sm ring-1 ring-cyan-300/60'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {spd === 0.25 ? '0.25x' : spd === 0.5 ? '0.5x' : `${spd}x`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Frozen Simulation Notice Overlay */}
          {isPaused && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-amber-500/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-amber-400/60 shadow-2xl text-amber-300 font-mono text-xs font-bold flex items-center gap-2 animate-pulse">
              <Pause className="w-4 h-4 fill-amber-300 text-amber-300" />
              <span>ATMOSPHERIC MOVEMENT FROZEN (PAUSED)</span>
            </div>
          )}

          {/* Floating Focus Hotbar & Perspective Switcher */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl font-mono text-xs">
            <span className="text-[10px] text-slate-400 font-bold px-1 hidden sm:inline">PERSPECTIVE:</span>
            <button
              onClick={() => {
                const gPreset = GLOBAL_VIEW_PRESETS.find((g) => g.id === perspectiveState.globalPreset) || GLOBAL_VIEW_PRESETS[0];
                handleTriggerPerspectiveChange('GLOBAL', gPreset.pitch, gPreset.yaw, gPreset.distance);
              }}
              className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                perspectiveState.mode === 'GLOBAL'
                  ? 'bg-blue-600/30 border-blue-400 text-blue-200 ring-1 ring-blue-400/50'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700'
              }`}
              title="Switch to Global Perspective"
            >
              <span>🌐</span>
              <span>Global</span>
            </button>
            <button
              onClick={() => {
                const rPreset = REGIONAL_FOCUS_PRESETS.find((r) => r.id === perspectiveState.regionalPreset) || REGIONAL_FOCUS_PRESETS[0];
                handleTriggerPerspectiveChange('REGIONAL', rPreset.pitch, rPreset.yaw, rPreset.zoomDistance, { lat: rPreset.lat, lon: rPreset.lon });
              }}
              className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                perspectiveState.mode === 'REGIONAL'
                  ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400/50'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700'
              }`}
              title="Switch to Regional Focus"
            >
              <span>🗺️</span>
              <span>Regional</span>
            </button>
            <button
              onClick={() => {
                const storm = ACTIVE_STORM_SYSTEMS.find((s) => s.id === perspectiveState.activeStormId) || ACTIVE_STORM_SYSTEMS[0];
                handleTriggerPerspectiveChange('STORM_TRACKING', 26, (storm.currentLon + 180) % 360, 3.2, { lat: storm.currentLat, lon: storm.currentLon });
              }}
              className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                perspectiveState.mode === 'STORM_TRACKING'
                  ? 'bg-rose-600/30 border-rose-400 text-rose-200 ring-1 ring-rose-400/50'
                  : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700'
              }`}
              title="Track Active Storm System"
            >
              <span>🌀</span>
              <span>Storm Track</span>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse ml-0.5" />
            </button>

            {onOpenLocal3dSimulator && (
              <button
                onClick={() => onOpenLocal3dSimulator('BOM_SANTACRUZ')}
                className="px-2 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 bg-gradient-to-r from-blue-900/70 to-indigo-900/70 border-blue-500/60 text-blue-200 hover:text-white shadow-xs"
                title="Descend to 3D Ground Station Simulator"
              >
                <Mountain className="w-3 h-3 text-cyan-300" />
                <span className="hidden sm:inline">3D Ground Sim</span>
              </button>
            )}
          </div>

          {/* Floating View Mode Selector Directly on 3D Viewport */}
          <div className="absolute top-16 right-3 sm:top-auto sm:bottom-4 sm:right-4 z-20 flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/80 shadow-2xl font-mono text-xs">
            <div className="flex items-center gap-1 text-[11px] font-bold text-cyan-300 px-2">
              <Eye className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="hidden sm:inline uppercase">Earth View Mode:</span>
            </div>
            <button
              onClick={() => setViewMode('REALISTIC_PHOTOREAL')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                viewMode === 'REALISTIC_PHOTOREAL'
                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/50'
                  : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title="Switch to Photorealistic Earth Biomes"
            >
              Photoreal
            </button>
            <button
              onClick={() => setViewMode('NIGHT_SATELLITE')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                viewMode === 'NIGHT_SATELLITE'
                  ? 'bg-amber-600/40 text-amber-200 border border-amber-500/60 shadow-md ring-2 ring-amber-400/50'
                  : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title="Switch to Night Satellite Metropolitan Lights"
            >
              Night Lights
            </button>
            <button
              onClick={() => setViewMode('SYNOPTIC_METEOROLOGY')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                viewMode === 'SYNOPTIC_METEOROLOGY'
                  ? 'bg-cyan-600/40 text-cyan-200 border border-cyan-500/60 shadow-md ring-2 ring-cyan-400/50'
                  : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
              title="Switch to Synoptic Radar & Pressure Isobars"
            >
              Radar
            </button>
          </div>

          {/* Interactive Hint & Live Earth API Overlay HUD */}
          <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2 pointer-events-auto max-w-sm">
            {useLiveCloudMode && (
              <div className="bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-emerald-500/40 shadow-2xl text-xs font-mono space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold border-b border-slate-800 pb-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    <span>LIVE EARTH SATELLITE API</span>
                  </div>
                  <button
                    onClick={fetchLiveCloudData}
                    disabled={isLiveCloudLoading}
                    className="p-1 hover:bg-slate-800 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
                    title="Refresh Live Open-Meteo Cloud Data"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLiveCloudLoading ? 'animate-spin' : ''}`} />
                    <span>{lastLiveApiTime || 'Sync'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 block">Avg Cloudiness</span>
                    <span className="text-emerald-300 font-bold text-sm">{avgGlobalCloudCover}%</span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 block">Observatories</span>
                    <span className="text-sky-300 font-bold text-sm">{LIVE_GLOBAL_STATIONS.length} Active</span>
                  </div>
                </div>

                {liveCloudData && liveCloudData.length > 0 && (
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scrollbar pt-1">
                    {liveCloudData.slice(0, 8).map((st) => (
                      <span
                        key={st.name}
                        className="px-1.5 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[9px] text-slate-300 flex items-center gap-1"
                      >
                        <span className="text-cyan-400 font-bold">{st.name}:</span>
                        <span className="text-emerald-300">{st.cloudCover}%</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center gap-2">
              <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
              <span>Drag to rotate Earth • Scroll zoom • Real-time Cloud Cover Stream Active</span>
            </div>
          </div>

          {/* 3D Canvas */}
          <div className="w-full h-full min-h-[520px] relative">
            <WebGLErrorBoundary>
              <Canvas camera={{ position: [0, 0, 7.2], fov: 45, far: 2000 }}>
                {/* Dynamic Solar Terminator & Lightning */}
                {enableSolarTerminator ? (
                  <SolarTerminatorAndLightning3D
                    globeRadius={2.4}
                    hourUtc={solarHourUtc}
                    enableLightning={enableLightning}
                    isSoundMuted={isSoundMuted}
                    isPaused={isPaused}
                    timeSpeed={timeSpeed}
                  />
                ) : (
                  <>
                    <ambientLight intensity={0.55} color="#e0f2fe" />
                    <directionalLight position={[12, 10, 6]} intensity={1.1} color="#fff8f0" />
                    <pointLight position={[-12, -10, -6]} intensity={0.25} color="#38bdf8" />
                  </>
                )}

                <Stars radius={150} depth={60} count={3500} factor={4} saturation={0.4} fade speed={0.8} />

                <SmoothCameraController
                  targetPitch={cameraPitch}
                  targetYaw={cameraYaw}
                  targetDistance={cameraDistance}
                  trackingCoord={perspectiveTrackingCoord}
                  autoRotate={perspectiveState.mode === 'GLOBAL' && perspectiveState.autoRotatePlanetary}
                  focusLocation={
                    !perspectiveTrackingCoord && activeFocusPreset !== 'CUSTOM'
                      ? GLOBE_TARGETS.find((t) => t.id === selectedTarget.id)
                      : undefined
                  }
                />

                <EarthGlobeMesh
                  disasterType={selectedDisaster}
                  climateScenario={climateScenario}
                  intensity={intensity}
                  timeSpeed={timeSpeed}
                  selectedTarget={selectedTarget}
                  isPaused={isPaused}
                  showWindVectors={showWindVectors}
                  showClouds={showClouds}
                  showBorders={showBorders}
                  viewMode={viewMode}
                  derivedMetrics={derivedMetrics}
                  onSelectTarget={(target) => setSelectedTarget(target)}
                  activeTriggers={activeTriggers}
                  useLiveCloudMode={useLiveCloudMode}
                  liveCloudData={liveCloudData}
                  elevationMultiplier={elevationMultiplier}
                />

                {/* 1. Cyclone Hunter Recon Aircraft & Dropsonde Soundings */}
                {enableCycloneHunter && (
                  <CycloneHunter3D
                    targetLat={selectedTarget.lat}
                    targetLon={selectedTarget.lon}
                    globeRadius={2.4}
                    timeSpeed={timeSpeed}
                    isPaused={isPaused}
                    onDeployDropsonde={handleDeployDropsonde}
                    onSelectDropsonde={(d) => setSelectedDropsonde(d)}
                    isSoundMuted={isSoundMuted}
                  />
                )}

                {/* 2. Real-Time Satellite Constellation & Swaths */}
                {enableSatellites && (
                  <SatelliteConstellation3D
                    satellites={SATELLITE_CATALOG}
                    globeRadius={2.4}
                    timeSpeed={timeSpeed}
                    isPaused={isPaused}
                    selectedSatId={selectedSatellite?.id}
                    onSelectSatellite={(sat) => {
                      setSelectedSatellite(sat);
                      if (!isSoundMuted) weatherSynth.playSatelliteSwathSweep();
                      trackSatelliteInspected();
                    }}
                    showSwaths={showSatelliteSwaths}
                  />
                )}

                {/* 3. Volumetric Wind Streams */}
                {enableWindRibbons && (
                  <VolumetricWindRibbons3D
                    globeRadius={2.4}
                    selectedPressureLevel={windPressureLevel}
                    activeFeatureId={activeWindFeatureId}
                    timeSpeed={timeSpeed}
                    isPaused={isPaused}
                  />
                )}

                {/* 4. Volumetric Doppler Radar Towers */}
                {enableDopplerRadar && (
                  <DopplerRadarTowers3D
                    globeRadius={2.4}
                    selectedRadarId={selectedRadar?.id}
                    onSelectRadar={(r) => {
                      setSelectedRadar(r);
                      if (!isSoundMuted) weatherSynth.playRadarScanPing();
                      trackRadarInspected();
                    }}
                    showRadarColumns={showRadarColumns}
                    timeSpeed={timeSpeed}
                    isPaused={isPaused}
                  />
                )}

                {/* 5. Daily Monsoon Challenge Planetary Victory Aura & Shockwaves */}
                {activeRewardScenario && (
                  <DailyChallengeRewardVFX3D
                    scenario={activeRewardScenario}
                    globeRadius={2.4}
                    onDismiss={() => setActiveRewardScenario(null)}
                  />
                )}

                {/* 6. Storm Tracking 3D Layer (Active Cyclones, Eyewall Vortex, Cone of Uncertainty) */}
                {(perspectiveState.mode === 'STORM_TRACKING' || perspectiveState.activeStormId) && (
                  <StormTrackingLayer3D
                    storm={ACTIVE_STORM_SYSTEMS.find((s) => s.id === perspectiveState.activeStormId) || ACTIVE_STORM_SYSTEMS[0]}
                    globeRadius={2.4}
                    showConeOfUncertainty={perspectiveState.showStormConeOfUncertainty}
                    showWindRadii={perspectiveState.showWindRadii}
                    showPastWaypoints={perspectiveState.showPastTrackWaypoints}
                    activeTrackStep={perspectiveState.activeTrackScrubStep}
                    onSelectTrackStep={(step) => setPerspectiveState((prev) => ({ ...prev, activeTrackScrubStep: step }))}
                    timeSpeed={timeSpeed}
                    isPaused={isPaused}
                  />
                )}

                {/* 7. Landscape Interaction 3D (Western Ghats & Himalayan Orographic Effects) */}
                {enableLandscapeInteraction && (
                  <LandscapeInteractionLayer3D
                    globeRadius={2.4}
                    activeBarrierId={activeLandscapeBarrierId}
                    activeRegimeId={activeLandscapeRegimeId}
                    showRidgeElevation={showLandscapeRidges}
                    showLiftStreamlines={showLandscapeStreamlines}
                    showRainCurtains={showLandscapeRainCurtains}
                    showRainShadowSwath={showLandscapeRainShadow}
                    showStationPins={showLandscapeStationPins}
                    elevationMultiplier={elevationMultiplier}
                    timeSpeed={timeSpeed}
                    isPaused={isPaused}
                  />
                )}

                <OrbitControls
                  enablePan={false}
                  minDistance={2.6}
                  maxDistance={25.0}
                  rotateSpeed={0.6}
                  zoomSpeed={0.9}
                />
              </Canvas>
            </WebGLErrorBoundary>

            {/* 3D Earth Observatory Marker Legend & Telemetry Key HUD Overlay */}
            <div className="absolute top-3 left-3 z-30 pointer-events-auto">
              {!showMarkerLegendHUD ? (
                <button
                  onClick={() => setShowMarkerLegendHUD(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-cyan-500/70 hover:border-cyan-400 text-white font-mono text-xs shadow-2xl backdrop-blur-md flex items-center gap-2 transition-all cursor-pointer group"
                  title="Expand 3D Markers Telemetry Key"
                >
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-500" />
                  </div>
                  <span className="font-bold text-slate-200 group-hover:text-white">
                    🔵 Blue & 🟡 Yellow Markers Key
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                    Open Key
                  </span>
                </button>
              ) : (
                <div className="w-[310px] sm:w-[360px] max-h-[78vh] flex flex-col bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-3.5 space-y-3 font-sans text-xs">
                  {/* Header */}
                  <div className="flex items-start justify-between border-b border-slate-800 pb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-cyan-400" />
                        <h4 className="font-bold text-white text-[12px] uppercase tracking-wider font-mono">
                          Observatory Marker Key
                        </h4>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Decoded telemetry for all dots & rings on Earth
                      </p>
                    </div>
                    <button
                      onClick={() => setShowMarkerLegendHUD(false)}
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Minimize Legend"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Filter Tabs */}
                  <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-900/90 rounded-lg border border-slate-800 font-mono text-[9px]">
                    <button
                      onClick={() => setMarkerLegendTab('ALL')}
                      className={`py-1 rounded text-center transition-all cursor-pointer font-bold ${
                        markerLegendTab === 'ALL'
                          ? 'bg-slate-800 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ALL
                    </button>
                    <button
                      onClick={() => setMarkerLegendTab('BLUE')}
                      className={`py-1 rounded text-center transition-all cursor-pointer font-bold flex items-center justify-center gap-1 ${
                        markerLegendTab === 'BLUE'
                          ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/60 shadow'
                          : 'text-slate-400 hover:text-cyan-300'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      BLUE
                    </button>
                    <button
                      onClick={() => setMarkerLegendTab('YELLOW')}
                      className={`py-1 rounded text-center transition-all cursor-pointer font-bold flex items-center justify-center gap-1 ${
                        markerLegendTab === 'YELLOW'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-500/60 shadow'
                          : 'text-slate-400 hover:text-amber-300'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      YELLOW
                    </button>
                    <button
                      onClick={() => setMarkerLegendTab('RED')}
                      className={`py-1 rounded text-center transition-all cursor-pointer font-bold flex items-center justify-center gap-1 ${
                        markerLegendTab === 'RED'
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-500/60 shadow'
                          : 'text-slate-400 hover:text-rose-300'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      RED/RINGS
                    </button>
                  </div>

                  {/* Marker Explanations & Quick Fly Links */}
                  <div className="space-y-2.5 overflow-y-auto max-h-[50vh] pr-1 custom-scrollbar text-[10px]">
                    {/* SECTION 1: BLUE DOTS */}
                    {(markerLegendTab === 'ALL' || markerLegendTab === 'BLUE') && (
                      <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/40 space-y-2">
                        <div className="flex items-center gap-1.5 text-cyan-300 font-bold font-mono text-[11px]">
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" />
                          <span>🔵 What Blue Dots Are Doing</span>
                        </div>

                        <div className="space-y-1.5 text-slate-300 leading-relaxed font-sans">
                          <div>
                            <strong className="text-white block font-mono text-[10px]">
                              1. Planetary Surface Observatories (8 Fixed Baseline Hubs):
                            </strong>
                            <span>
                              Continuous weather stations monitoring surface barometric pressure, temperature, cloud cover, and winds.
                            </span>
                          </div>

                          {/* Quick Fly Station Buttons */}
                          <div className="pt-1">
                            <span className="text-[9px] text-slate-400 font-mono block mb-1">
                              Center Camera on Observatory:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {GLOBE_TARGETS.map((tgt) => (
                                <button
                                  key={tgt.id}
                                  onClick={() => focusTargetObservatory(tgt)}
                                  className={`px-1.5 py-0.5 rounded text-[8px] font-mono border transition-all cursor-pointer ${
                                    selectedTarget.id === tgt.id
                                      ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-md'
                                      : 'bg-slate-900/90 text-cyan-300 border-slate-700 hover:border-cyan-400 hover:bg-slate-800'
                                  }`}
                                  title={`Fly camera to ${tgt.name}`}
                                >
                                  {tgt.name.split(' ')[0]}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="pt-1 border-t border-cyan-900/40">
                            <strong className="text-white block font-mono text-[10px]">
                              2. Historical Cyclone Track Fixes (-36h to -12h):
                            </strong>
                            <span>
                              Verified past storm eye positions logged by Doppler radar and INSAT/GOES satellites.
                            </span>
                          </div>

                          <div className="pt-1 border-t border-cyan-900/40">
                            <strong className="text-white block font-mono text-[10px]">
                              3. Windward Mountain Inflow Stations:
                            </strong>
                            <span>
                              Coastal stations (e.g. Ratnagiri, Goa) capturing incoming maritime monsoon surges before mountain lift.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SECTION 2: YELLOW DOTS */}
                    {(markerLegendTab === 'ALL' || markerLegendTab === 'YELLOW') && (
                      <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2">
                        <div className="flex items-center gap-1.5 text-amber-300 font-bold font-mono text-[11px]">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400" />
                          <span>🟡 What Yellow Dots Are Doing</span>
                        </div>

                        <div className="space-y-1.5 text-slate-300 leading-relaxed font-sans">
                          <div>
                            <strong className="text-white block font-mono text-[10px]">
                              1. Numerical Model Cyclone Forecasts (+12h, +24h, +48h):
                            </strong>
                            <span>
                              Ensemble forecast trajectory waypoints predicting storm intensification, landfall location, and inland decay.
                            </span>
                            <button
                              onClick={focusCycloneForecastLandfall}
                              className="mt-1.5 w-full py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400 text-amber-300 font-mono text-[9px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Crosshair className="w-3 h-3 text-amber-400" />
                              <span>Focus Cyclone Landfall (+24h Forecast Point)</span>
                            </button>
                          </div>

                          <div className="pt-1.5 border-t border-amber-900/40">
                            <strong className="text-white block font-mono text-[10px]">
                              2. Orographic Mountain Crest Summits:
                            </strong>
                            <span>
                              High-altitude peaks (e.g. Mahabaleshwar 1,353m crest) where rapid orographic uplift triggers extreme condensation and cloudbursts.
                            </span>
                            <button
                              onClick={focusMahabaleshwarCrest}
                              className="mt-1.5 w-full py-1 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400 text-emerald-300 font-mono text-[9px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Mountain className="w-3 h-3 text-emerald-400" />
                              <span>Focus Mahabaleshwar Crest (1,353m Peak)</span>
                            </button>
                          </div>

                          <div className="pt-1.5 border-t border-amber-900/40">
                            <strong className="text-white block font-mono text-[10px]">
                              3. Active Focal Target Ring:
                            </strong>
                            <span>
                              Double concentric golden ring indicating the currently selected observatory or clicked sensor probe.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SECTION 3: RED / RINGS */}
                    {(markerLegendTab === 'ALL' || markerLegendTab === 'RED') && (
                      <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-2">
                        <div className="flex items-center gap-1.5 text-rose-300 font-bold font-mono text-[11px]">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                          <span>🔴 Red Dots & Spire Towers</span>
                        </div>

                        <div className="space-y-1.5 text-slate-300 leading-relaxed font-sans">
                          <div>
                            <strong className="text-white block font-mono text-[10px]">
                              1. Leeward Rain-Shadow Stations:
                            </strong>
                            <span>
                              Dry interior stations (e.g. Pune, 560m) where descending föhn air creates severe rain deficits behind mountain barriers.
                            </span>
                          </div>

                          <div className="pt-1 border-t border-rose-900/40">
                            <strong className="text-white block font-mono text-[10px]">
                              2. IMD Doppler Radar Towers:
                            </strong>
                            <span>
                              Volumetric radar towers scanning 360° reflectivity cones and precipitation echo spires across a 250km radial radius.
                            </span>
                          </div>

                          <div className="pt-1 border-t border-rose-900/40">
                            <strong className="text-white block font-mono text-[10px]">
                              3. Category 5 Eyewall Vortex Core:
                            </strong>
                            <span>
                              Severe cyclone core with rotating spiral bands and extreme wind gusts exceeding 220 km/h.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Interactive Quick Tip Footer */}
                  <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-[9px] text-slate-400 flex items-center justify-between font-mono">
                    <span>💡 Tip: Click or hover any 3D dot for telemetry</span>
                    <span className="text-cyan-400 font-bold">Interactive 3D</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Real-time Telemetry & Impact */}
        <div className="lg:col-span-3 bg-slate-900/80 border-l border-slate-800 p-4 space-y-4 flex flex-col justify-between z-10">
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-emerald-400" />
              Atmospheric Telemetry & Impact
            </h3>

            {/* Climate Anomaly Card */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-3 space-y-1 font-mono text-[11px]">
              <div className="text-amber-300 font-bold flex items-center justify-between">
                <span>Scenario Anomaly:</span>
                <span>{CLIMATE_SCENARIOS[climateScenario].pressureAnomalyHpa} hPa</span>
              </div>
              <div className="text-sky-300 flex items-center justify-between">
                <span>Global Sea Level Surge:</span>
                <span>+{CLIMATE_SCENARIOS[climateScenario].seaLevelRiseM} m</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight pt-1 font-sans">
                {CLIMATE_SCENARIOS[climateScenario].description}
              </p>
            </div>

            <div className="space-y-2 font-mono text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Surface Pressure:</span>
                <span className="font-bold text-cyan-400">{derivedMetrics.pressureHpa} hPa</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">24h Precip Rate:</span>
                <span className="font-bold text-blue-400">{derivedMetrics.rainMm24} mm</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Wind Velocity:</span>
                <span className="font-bold text-amber-400">{derivedMetrics.windKmH} km/h</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Surface Temp:</span>
                <span className="font-bold text-rose-400">{derivedMetrics.tempC}°C</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Storm Surge Height:</span>
                <span className="font-bold text-sky-400">+{derivedMetrics.oceanSurgeM} m</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Population Exposed:</span>
                <span className="font-bold text-purple-400">{derivedMetrics.popAffectedM} M</span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Est. Economic Risk:</span>
                <span className="font-bold text-emerald-400">${derivedMetrics.economicLossB} B</span>
              </div>
            </div>

            {/* 3D Local Ground Simulator Button */}
            {onOpenLocal3dSimulator && (
              <button
                id="btn-globe-to-3d-ground-sim"
                onClick={() => {
                  const matched = MET_STATIONS.find(
                    (s) => s.name.toLowerCase().includes(selectedTarget.name.toLowerCase()) ||
                           selectedTarget.name.toLowerCase().includes(s.name.toLowerCase())
                  );
                  onOpenLocal3dSimulator(matched ? matched.id : 'BOM_SANTACRUZ');
                }}
                className="w-full mt-3 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                title="Descend to 3D ground station simulation for this location"
              >
                <Mountain className="w-4 h-4 text-cyan-300" />
                <span>Descend to 3D Ground Simulation</span>
              </button>
            )}
          </div>

          {/* Gamified Missions */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                Planetary Missions
              </h4>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800 font-bold">
                Level {activeMissionIndex + 1}/3
              </span>
            </div>

            <div className="bg-amber-950/20 border border-amber-800/60 p-3 rounded-xl text-xs space-y-2">
              <div className="font-bold text-amber-200">{currentMission.title}</div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">{currentMission.goal}</p>

              <div className="pt-1 flex flex-col gap-1.5">
                <button
                  onClick={() => {
                    setShowCrisisModal(true);
                    if (!isSoundMuted) weatherSynth.playCrisisAlertTone();
                  }}
                  className="w-full py-1.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-amber-900/30"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Launch Crisis Command Operations</span>
                </button>

                <button
                  onClick={() => {
                    setActiveMissionIndex((prev) => (prev + 1) % missions.length);
                    setSelectedTarget(missions[(activeMissionIndex + 1) % missions.length].target);
                    setSelectedDisaster(missions[(activeMissionIndex + 1) % missions.length].disaster);
                  }}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>Next Planetary Challenge</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Satellite Telemetry HUD Badge */}
      {selectedSatellite && (
        <div className="absolute top-24 right-6 z-30 bg-slate-900/95 border border-sky-500/60 p-3.5 rounded-2xl shadow-2xl max-w-sm text-xs font-mono text-white backdrop-blur-md animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <Satellite className="w-4 h-4 text-sky-400" />
              <span className="font-bold text-sky-300">{selectedSatellite.name}</span>
            </div>
            <button
              onClick={() => setSelectedSatellite(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between"><span className="text-slate-400">Altitude:</span> <span className="text-amber-300">{selectedSatellite.altitudeKm.toLocaleString()} km</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Orbit Period:</span> <span className="text-cyan-300">{selectedSatellite.orbitPeriodMin} min</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Inclination:</span> <span>{selectedSatellite.inclinationDeg}°</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Sensor Swath:</span> <span className="text-emerald-300">{selectedSatellite.swathWidthKm} km</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Payload:</span> <span className="text-purple-300">{selectedSatellite.spectralBand}</span></div>
            <div className="pt-1.5 text-slate-300 font-sans text-[10px] leading-tight border-t border-slate-800/80">{selectedSatellite.description}</div>
          </div>
        </div>
      )}

      {/* Floating Doppler Radar Station HUD Badge */}
      {selectedRadar && (
        <div className="absolute top-24 right-6 z-30 bg-slate-900/95 border border-rose-500/60 p-3.5 rounded-2xl shadow-2xl max-w-sm text-xs font-mono text-white backdrop-blur-md animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-rose-400" />
              <span className="font-bold text-rose-300">{selectedRadar.stationName}</span>
            </div>
            <button
              onClick={() => setSelectedRadar(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between"><span className="text-slate-400">Peak Reflectivity:</span> <span className="text-rose-400 font-bold">{selectedRadar.maxDbz} dBZ</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Echo Top Height:</span> <span className="text-purple-300 font-bold">{selectedRadar.echoTopKm} km</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Rain Rate:</span> <span className="text-cyan-300">{selectedRadar.rainRateMmH} mm/hr</span></div>
            <div className="flex justify-between"><span className="text-slate-400">VIL (Liquid Water):</span> <span className="text-amber-300">{selectedRadar.vilKgM2} kg/m²</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Radial Velocity:</span> <span>{selectedRadar.radialVelocityMps} m/s</span></div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-800">
              <span className="text-slate-400">Convective Threat:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                selectedRadar.convectiveThreat === 'Extreme' ? 'bg-rose-950 text-rose-300 border border-rose-600' : 'bg-amber-950 text-amber-300 border border-amber-600'
              }`}>
                {selectedRadar.convectiveThreat}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Skew-T Sounding Modal for Dropsonde */}
      {selectedDropsonde && (
        <SkewTSoundingModal
          dropsonde={selectedDropsonde}
          onClose={() => setSelectedDropsonde(null)}
        />
      )}

      {/* Orographic Elevation & Rain Shadow Cross-Section Modal */}
      {showOrographicModal && (
        <OrographicProfileModal
          onClose={() => setShowOrographicModal(false)}
          elevationMultiplier={elevationMultiplier}
          onChangeElevationMultiplier={(m) => setElevationMultiplier(m)}
        />
      )}

      {/* Crisis Command Tactical Game Modal */}
      {showCrisisModal && (
        <CrisisCommandGameModal
          onClose={() => setShowCrisisModal(false)}
          isSoundMuted={isSoundMuted}
          onTargetLocationChange={(lat, lon) => {
            setSelectedTarget({
              id: 'CRISIS_LOC',
              name: 'Crisis Sector',
              country: 'Tactical Operation',
              lat,
              lon,
              riskLevel: 'CRITICAL',
            });
          }}
        />
      )}
    </div>
  );
};
