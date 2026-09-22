export interface DropsondeSoundingLevel {
  altKm: number;
  pressureHpa: number;
  tempC: number;
  dewPointC: number;
  windSpeedKmH: number;
  windDirDeg: number;
  rhPct: number;
}

export interface Dropsonde {
  id: string;
  lat: number;
  lon: number;
  currentAltKm: number;
  fallSpeedKmH: number;
  status: 'FALLING' | 'SPLASHED';
  deployedAt: number;
  soundingData: DropsondeSoundingLevel[];
  capeJoulesPerKg: number;
  liftedIndex: number;
  verificationConfidenceBoost: number;
}

export interface CycloneHunterAircraft {
  lat: number;
  lon: number;
  altitudeKm: number;
  headingDeg: number;
  iasKnots: number;
  mach: number;
  ambientTempC: number;
  baroPressureHpa: number;
  targetEyeLat: number;
  targetEyeLon: number;
  callsign: string;
  agency: 'IMD Recon Alpha' | 'NOAA Hurricane Hunter' | 'IAF Met-Bird';
}

export interface SatelliteMission {
  id: string;
  name: string;
  code: string;
  altitudeKm: number;
  orbitPeriodMin: number;
  inclinationDeg: number;
  sensorType: string;
  spectralBand: string;
  swathWidthKm: number;
  color: string;
  trailColor: string;
  description: string;
  currentLat: number;
  currentLon: number;
  scanActive: boolean;
}

export type WindStreamPressureLevel = '850hpa' | '500hpa' | '200hpa';

export interface WindStreamFeature {
  id: 'SOMALI_JET' | 'MONSOON_TROUGH' | 'TEJ' | 'WESTERLY_TROUGH';
  name: string;
  pressureLevel: WindStreamPressureLevel;
  speedRangeKnots: string;
  color: string;
  description: string;
  pathWaypoints: Array<{ lat: number; lon: number; altOffset: number }>;
}

export interface DopplerRadarTower {
  id: string;
  stationName: string;
  code: string;
  state: string;
  lat: number;
  lon: number;
  echoTopKm: number;
  maxDbz: number;
  vilKgM2: number;
  radialVelocityMps: number;
  convectiveThreat: 'Extreme' | 'High' | 'Moderate' | 'Marginal';
  rainRateMmH: number;
  color: string;
  tiers: Array<{ heightKm: number; radiusKm: number; dbz: number; color: string }>;
}

export interface OrographicWaypoint {
  name: string;
  lat: number;
  lon: number;
  elevM: number;
  baseRainMm: number;
  orographicRainMm: number;
  terrainType: 'Coastal Ocean' | 'Windward Ghats Crest' | 'Leeward Plateau' | 'Valley Trench' | 'Himalayan Ridge';
  moistureCondensationPct: number;
}

export interface OrographicTransect {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  totalDistanceKm: number;
  maxElevationM: number;
  peakRainMm: number;
  windwardStation: string;
  leewardStation: string;
  rainShadowReductionPct: number;
  waypoints: OrographicWaypoint[];
}

export interface CrisisMissionActionState {
  xBandRadarDeployed: boolean;
  aiBiasModel: 'GEV_EXTREME' | 'PINN_PHYSICS' | 'QRF_PERCENTILE' | 'RAW_BASELINE';
  subdivisionAlerts: {
    konkanRed: boolean;
    ghatsOrange: boolean;
    bayBengalRed: boolean;
    vidarbhaYellow: boolean;
  };
  rapidDrainageDispatched: boolean;
  cloudburstEvacuationIssued: boolean;
}

export interface CrisisMissionDefinition {
  id: string;
  title: string;
  region: string;
  timeLimitSec: number;
  briefing: string;
  targetLat: number;
  targetLon: number;
  disasterType: 'CLOUDBURST' | 'SUPER_TYPHOON' | 'HEATWAVE_DROUGHT' | 'OROGRAPHIC_DELUGE';
  initialThreatPct: number;
  populationThreatenedM: number;
  optimalActions: {
    radarNeeded: boolean;
    preferredModel: 'GEV_EXTREME' | 'PINN_PHYSICS' | 'QRF_PERCENTILE';
    requiresRedAlert: boolean;
    requiresDrainage: boolean;
    requiresEvacuation: boolean;
  };
}
