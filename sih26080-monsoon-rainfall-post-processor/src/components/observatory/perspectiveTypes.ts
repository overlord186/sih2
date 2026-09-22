import * as THREE from 'three';

export type GlobePerspectiveMode = 'GLOBAL' | 'REGIONAL' | 'STORM_TRACKING';

export type GlobalPresetId = 
  | 'PLANETARY_EQUATOR' 
  | 'NORTH_POLAR_VORTEX' 
  | 'SOUTH_CIRCUMPOLAR' 
  | 'TWILIGHT_TERMINATOR' 
  | 'DEEP_SPACE';

export interface GlobalViewPreset {
  id: GlobalPresetId;
  label: string;
  icon: string;
  pitch: number;
  yaw: number;
  distance: number;
  description: string;
  synopticFocus: string;
}

export type RegionalPresetId = 
  | 'INDIAN_PENINSULA' 
  | 'EAST_ASIA_PACIFIC' 
  | 'NORTH_ATLANTIC_EUROPE' 
  | 'NORTH_AMERICA_GULF' 
  | 'MEDITERRANEAN_MIDEAST' 
  | 'MARITIME_CONTINENT' 
  | 'AMAZON_SOUTH_AMERICA';

export interface RegionalFocusPreset {
  id: RegionalPresetId;
  label: string;
  flag: string;
  subdivision: string;
  lat: number;
  lon: number;
  pitch: number;
  yaw: number;
  zoomDistance: number;
  description: string;
  dominantWeatherFeature: string;
  orographicBarrier: string;
}

export interface StormSystemTrackPoint {
  step: number;
  timeLabel: string;
  lat: number;
  lon: number;
  windKmh: number;
  windKnots: number;
  pressureHpa: number;
  category: string;
  isForecast?: boolean;
  radius34ktKm?: number;
  radius50ktKm?: number;
  radius64ktKm?: number;
}

export interface ActiveStormSystem {
  id: string;
  name: string;
  type: 'CYCLONE' | 'TYPHOON' | 'HURRICANE' | 'MONSOON_LOW' | 'BOMB_CYCLONE';
  basin: string;
  currentLat: number;
  currentLon: number;
  currentPressureHpa: number;
  maxWindKmh: number;
  maxWindKnots: number;
  dvorakRating: string;
  eyeDiameterKm: number;
  movementHeading: string;
  forwardSpeedKmh: number;
  intensityStage: 'DEVELOPING' | 'RAPID_INTENSIFICATION' | 'PEAK_MATURE' | 'LANDFALL_APPROACH' | 'WEAKENING';
  severity: 'TROPICAL_STORM' | 'CAT_2' | 'CAT_3' | 'CAT_4' | 'CAT_5_SUPER';
  vfxColor: string;
  synopticOverview: string;
  satelliteSignature: string;
  track: StormSystemTrackPoint[];
}

export type StormCameraTrackingMode = 'EYE_LOCK' | 'CHASE_CAM' | 'FREE_ORBIT';

export interface PerspectiveManagerState {
  mode: GlobePerspectiveMode;
  globalPreset: GlobalPresetId;
  regionalPreset: RegionalPresetId;
  activeStormId: string;
  stormCameraMode: StormCameraTrackingMode;
  showStormConeOfUncertainty: boolean;
  showWindRadii: boolean;
  showPastTrackWaypoints: boolean;
  activeTrackScrubStep: number | null; // null = latest real-time position
  autoRotatePlanetary: boolean;
}
