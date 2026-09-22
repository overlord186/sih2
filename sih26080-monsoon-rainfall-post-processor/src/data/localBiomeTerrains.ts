import { StationMetadata } from '../types';

export type BiomeArchetypeId = 
  | 'COASTAL_METROPOLIS'
  | 'OROGRAPHIC_CREST'
  | 'RAIN_SHADOW_PLATEAU'
  | 'HIMALAYAN_VALLEY'
  | 'HIGHLAND_CLOUD_FUNNEL'
  | 'ALLUVIAL_PLAINS_TROUGH'
  | 'ARID_STEPPE_MARGIN';

export interface LocalBiomeProfile {
  id: BiomeArchetypeId;
  name: string;
  subtitle: string;
  description: string;
  defaultElevationM: number;
  terrainColor: string;
  rockColor: string;
  waterColor: string;
  foliageType: 'PALM_COASTAL' | 'DENSE_RAINFOREST' | 'DECIDUOUS_PINE' | 'DRY_SCRUB' | 'ALLUVIAL_CROPS' | 'SAVANNA_GRASS';
  soilType: 'Alluvial Marine Silt' | 'Laterite Hardpan' | 'Black Cotton Regur' | 'Mountain Scree & Colluvium' | 'Limestone Karst' | 'Sandy Loam';
  
  // Hydrology parameters
  initialInfiltrationRateMmH: number; // Horton f_0
  steadyInfiltrationRateMmH: number;  // Horton f_c
  decayConstantK: number;             // Horton k in 1/hr
  drainageCapacityMmH: number;        // Capacity of stormwater drains or natural streams
  slopeGradientPct: number;           // Mean catchment slope (%)
  criticalLandslideThresholdMmH: number; // 0 if not prone
  criticalWaterloggingDepthCm: number;

  // Visual styling
  skyFogDistanceMin: number;
  skyFogDistanceMax: number;
  defaultCloudBaseM: number;
}

export const BIOME_ARCHETYPES: Record<BiomeArchetypeId, LocalBiomeProfile> = {
  COASTAL_METROPOLIS: {
    id: 'COASTAL_METROPOLIS',
    name: 'Tropical Coastal Plain & Metropolis',
    subtitle: 'Tidal Mangrove & Urban Stormwater Catchment',
    description: 'Low-lying coastal alluvium near sea level. Narrow gravity drainage gradients make this terrain vulnerable to severe waterlogging when intense downpours coincide with high tide.',
    defaultElevationM: 14,
    terrainColor: '#1e293b', // Dark wet asphalt & reclaimed land
    rockColor: '#475569',
    waterColor: '#0369a1',
    foliageType: 'PALM_COASTAL',
    soilType: 'Alluvial Marine Silt',
    initialInfiltrationRateMmH: 25,
    steadyInfiltrationRateMmH: 5,
    decayConstantK: 1.8,
    drainageCapacityMmH: 25, // Standard Mumbai stormwater pipe capacity
    slopeGradientPct: 1.2,   // Very flat coastal shelf
    criticalLandslideThresholdMmH: 150, // Hillsides (e.g. Ghatkopar)
    criticalWaterloggingDepthCm: 15,
    skyFogDistanceMin: 15,
    skyFogDistanceMax: 90,
    defaultCloudBaseM: 450,
  },
  OROGRAPHIC_CREST: {
    id: 'OROGRAPHIC_CREST',
    name: 'Western Ghats Escarpment & Crest',
    subtitle: 'Steep Basalt Ridge with Extreme Condensation Deluge',
    description: 'Towering volcanic trap escarpment directly facing the Arabian Sea westerly Somali Jet. Forced adiabatic ascent produces violent, sustained cloudbursts, surging waterfalls, and rapid overland torrents.',
    defaultElevationM: 1372,
    terrainColor: '#14532d', // Lush deep emerald mossy basalt
    rockColor: '#334155',
    waterColor: '#0284c7',
    foliageType: 'DENSE_RAINFOREST',
    soilType: 'Laterite Hardpan',
    initialInfiltrationRateMmH: 60,
    steadyInfiltrationRateMmH: 18,
    decayConstantK: 0.9,
    drainageCapacityMmH: 90, // Steep natural mountain gullies
    slopeGradientPct: 38.0,  // Very steep mountain cliffs
    criticalLandslideThresholdMmH: 65, // High debris flow vulnerability
    criticalWaterloggingDepthCm: 8,
    skyFogDistanceMin: 8,
    skyFogDistanceMax: 55,
    defaultCloudBaseM: 250, // Low-hanging mountain stratus touching ridge
  },
  RAIN_SHADOW_PLATEAU: {
    id: 'RAIN_SHADOW_PLATEAU',
    name: 'Leeward Rain-Shadow Tableland',
    subtitle: 'Descending Adiabatic Föhn Heating & Dry Desiccation',
    description: 'Located immediately east of the Western Ghats crest. Descending air undergoes adiabatic compression warming (föhn effect), dissipating clouds and creating a severe moisture deficit.',
    defaultElevationM: 560,
    terrainColor: '#451a03', // Warm dry basaltic clay/black cotton soil
    rockColor: '#78350f',
    waterColor: '#0284c7',
    foliageType: 'DRY_SCRUB',
    soilType: 'Black Cotton Regur',
    initialInfiltrationRateMmH: 40,
    steadyInfiltrationRateMmH: 4, // Swells and becomes impermeable when wet
    decayConstantK: 2.2,
    drainageCapacityMmH: 45,
    slopeGradientPct: 4.5,
    criticalLandslideThresholdMmH: 200, // Very low landslide risk
    criticalWaterloggingDepthCm: 20,
    skyFogDistanceMin: 35,
    skyFogDistanceMax: 160,
    defaultCloudBaseM: 1200, // High cloud base
  },
  HIMALAYAN_VALLEY: {
    id: 'HIMALAYAN_VALLEY',
    name: 'Himalayan Foothills & Alpine Valley',
    subtitle: 'Steep Shiwalik Gorge & Mountain Cloudburst Funnel',
    description: 'Folded mountain ridges and deep river gorges. When the monsoon trough shifts north during break periods, intense orographic cloudbursts trigger flash floods, scree avalanches, and river surges.',
    defaultElevationM: 2205,
    terrainColor: '#064e3b', // Pine forest and alpine rock
    rockColor: '#64748b',
    waterColor: '#38bdf8', // Glacial silt turquoise
    foliageType: 'DECIDUOUS_PINE',
    soilType: 'Mountain Scree & Colluvium',
    initialInfiltrationRateMmH: 55,
    steadyInfiltrationRateMmH: 15,
    decayConstantK: 1.2,
    drainageCapacityMmH: 75,
    slopeGradientPct: 45.0, // Extreme mountain slope
    criticalLandslideThresholdMmH: 50, // Extremely high landslide vulnerability
    criticalWaterloggingDepthCm: 5,
    skyFogDistanceMin: 10,
    skyFogDistanceMax: 70,
    defaultCloudBaseM: 350,
  },
  HIGHLAND_CLOUD_FUNNEL: {
    id: 'HIGHLAND_CLOUD_FUNNEL',
    name: 'Shillong Plateau & Khasi Gorge',
    subtitle: 'Funneled Bay of Bengal Moisture Trap',
    description: 'Horst block rising abruptly 1,300 meters above the flat floodplains of Bangladesh. Deep south-facing canyons funnel oceanic moisture into the wettest places on Earth (Cherrapunji & Mawsynram).',
    defaultElevationM: 1313,
    terrainColor: '#065f46', // Emerald jungle karst
    rockColor: '#475569',
    waterColor: '#0ea5e9',
    foliageType: 'DENSE_RAINFOREST',
    soilType: 'Limestone Karst',
    initialInfiltrationRateMmH: 80,
    steadyInfiltrationRateMmH: 30,
    decayConstantK: 0.6,
    drainageCapacityMmH: 140, // Massive canyon gorges drain rapidly into plains
    slopeGradientPct: 52.0,
    criticalLandslideThresholdMmH: 70,
    criticalWaterloggingDepthCm: 10,
    skyFogDistanceMin: 5,
    skyFogDistanceMax: 40,
    defaultCloudBaseM: 150, // Cloud base routinely touches the ground
  },
  ALLUVIAL_PLAINS_TROUGH: {
    id: 'ALLUVIAL_PLAINS_TROUGH',
    name: 'Indo-Gangetic Alluvial Trough',
    subtitle: 'Expansive River Basin & Squall Line Convergence',
    description: 'Vast flat alluvial floodplains between the Himalayas and the central Indian highlands. Convective squall lines and monsoon depressions bring widespread steady inundation across agricultural heartlands.',
    defaultElevationM: 180,
    terrainColor: '#334155', // Rich dark loam & silt
    rockColor: '#64748b',
    waterColor: '#0284c7',
    foliageType: 'ALLUVIAL_CROPS',
    soilType: 'Sandy Loam',
    initialInfiltrationRateMmH: 35,
    steadyInfiltrationRateMmH: 8,
    decayConstantK: 1.4,
    drainageCapacityMmH: 30,
    slopeGradientPct: 0.8, // Extremely flat gradient
    criticalLandslideThresholdMmH: 250,
    criticalWaterloggingDepthCm: 12,
    skyFogDistanceMin: 20,
    skyFogDistanceMax: 120,
    defaultCloudBaseM: 700,
  },
  ARID_STEPPE_MARGIN: {
    id: 'ARID_STEPPE_MARGIN',
    name: 'Semi-Arid Steppe & Thar Margin',
    subtitle: 'Dry Desert Washout & Sudden Flash Inundation',
    description: 'High evaporation rates and dry sandy terrain. While normal rainfall is scarce, sudden monsoon depression incursions can overwhelm unconditioned desert soil, leading to flash washouts.',
    defaultElevationM: 390,
    terrainColor: '#78350f', // Desert ochre sand & dry clay
    rockColor: '#92400e',
    waterColor: '#0284c7',
    foliageType: 'SAVANNA_GRASS',
    soilType: 'Sandy Loam',
    initialInfiltrationRateMmH: 70,
    steadyInfiltrationRateMmH: 12,
    decayConstantK: 2.8,
    drainageCapacityMmH: 20, // Poorly defined natural channels
    slopeGradientPct: 2.1,
    criticalLandslideThresholdMmH: 180,
    criticalWaterloggingDepthCm: 10,
    skyFogDistanceMin: 40,
    skyFogDistanceMax: 200,
    defaultCloudBaseM: 1800,
  },
};

/**
 * Maps each station ID in MET_STATIONS to its representative 3D biome
 */
export function getStationBiome(station: StationMetadata): LocalBiomeProfile {
  const id = station.id;
  const sub = station.subdivision.toLowerCase();
  const elev = station.elevationM;
  const name = station.name.toLowerCase();

  // 1. Highland Cloud Funnel (Meghalaya)
  if (name.includes('cherrapunji') || name.includes('mawsynram') || sub.includes('meghalaya')) {
    return BIOME_ARCHETYPES.HIGHLAND_CLOUD_FUNNEL;
  }

  // 2. Extreme Orographic Crest (Western Ghats crests)
  if (
    name.includes('mahabaleshwar') || 
    name.includes('agumbe') || 
    name.includes('valparai') || 
    (sub.includes('konkan') && elev > 600) ||
    (sub.includes('karnataka') && elev > 600 && station.avgMonsoonRainMm > 2500)
  ) {
    return BIOME_ARCHETYPES.OROGRAPHIC_CREST;
  }

  // 3. Himalayan Foothills & Alpine Valleys
  if (
    sub.includes('himachal') || 
    sub.includes('uttarakhand') || 
    sub.includes('jammu') || 
    sub.includes('sikkim') || 
    name.includes('shimla') || 
    name.includes('dehradun') || 
    name.includes('srinagar') ||
    name.includes('bagdogra')
  ) {
    return BIOME_ARCHETYPES.HIMALAYAN_VALLEY;
  }

  // 4. Coastal Metropolis & Plain
  if (
    (elev <= 60 && (sub.includes('coastal') || sub.includes('konkan') || sub.includes('goa') || sub.includes('kerala') || sub.includes('tamil nadu') || sub.includes('west bengal') || sub.includes('odisha') || sub.includes('gujarat'))) ||
    name.includes('mumbai') || 
    name.includes('panaji') || 
    name.includes('mangaluru') || 
    name.includes('kochi') || 
    name.includes('kolkata') || 
    name.includes('chennai')
  ) {
    return BIOME_ARCHETYPES.COASTAL_METROPOLIS;
  }

  // 5. Rain Shadow Plateau
  if (
    sub.includes('madhya maharashtra') || 
    sub.includes('marathwada') || 
    sub.includes('telangana') || 
    sub.includes('rayalaseema') || 
    sub.includes('interior karnataka') ||
    name.includes('pune') || 
    name.includes('bengaluru') || 
    name.includes('aurangabad') || 
    name.includes('hyderabad')
  ) {
    return BIOME_ARCHETYPES.RAIN_SHADOW_PLATEAU;
  }

  // 6. Arid Steppe Margin (Rajasthan / West Gujarat)
  if (sub.includes('rajasthan') || name.includes('jaipur') || name.includes('jodhpur')) {
    return BIOME_ARCHETYPES.ARID_STEPPE_MARGIN;
  }

  // 7. Default: Alluvial Plains Trough (Gangetic, Vidarbha, etc.)
  return BIOME_ARCHETYPES.ALLUVIAL_PLAINS_TROUGH;
}

export interface WeatherScenarioPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  rainRateMmH: number;
  windSpeedKmH: number;
  windDirDeg: number;
  cloudBaseM: number;
  tempC: number;
  rhPct: number;
}

export const WEATHER_SCENARIO_PRESETS: WeatherScenarioPreset[] = [
  {
    id: 'ACTIVE_SOMALI_SURGE',
    name: 'Active Southwest Jet Surge',
    badge: 'Monsoon Torrent',
    description: 'Vigorous cross-equatorial Somali Jet carrying heavy moisture directly off the Arabian Sea. Dense rain curtains and low cloud decks.',
    rainRateMmH: 65,
    windSpeedKmH: 52,
    windDirDeg: 240, // WSW
    cloudBaseM: 320,
    tempC: 26.5,
    rhPct: 96,
  },
  {
    id: 'MONSOON_DEPRESSION_SQUALL',
    name: 'Depression Squall & Vortex',
    badge: 'Cyclonic Gale',
    description: 'Deep Bay of Bengal depression moving inland with gale-force shifting winds, barometric drop, and violent convective rain bands.',
    rainRateMmH: 95,
    windSpeedKmH: 78,
    windDirDeg: 110, // ESE
    cloudBaseM: 220,
    tempC: 24.8,
    rhPct: 98,
  },
  {
    id: 'CLOUDBURST_DELUGE',
    name: 'Extreme Convective Cloudburst',
    badge: 'Severe Alert',
    description: 'Localized meso-beta scale convective cloudburst (>100 mm/h) overwhelming surface infiltration and triggering severe waterlogging.',
    rainRateMmH: 145,
    windSpeedKmH: 65,
    windDirDeg: 270, // W
    cloudBaseM: 180,
    tempC: 23.2,
    rhPct: 99,
  },
  {
    id: 'BREAK_MONSOON_FOHN',
    name: 'Break Monsoon Föhn Dry',
    badge: 'Rain Shadow',
    description: 'Descending föhn winds east of the Ghats. Adiabatic compression raises temperature, dissolves low clouds, and halts rainfall.',
    rainRateMmH: 0.5,
    windSpeedKmH: 22,
    windDirDeg: 285, // WNW
    cloudBaseM: 1650,
    tempC: 32.4,
    rhPct: 48,
  },
  {
    id: 'CALM_SUNNY_BREAK',
    name: 'Calm Monsoon Break',
    badge: 'Clear Sky',
    description: 'Light gentle breeze, high cumulus clouds, pleasant humidity, and puddles steadily percolating into the soil.',
    rainRateMmH: 0,
    windSpeedKmH: 12,
    windDirDeg: 220, // SW
    cloudBaseM: 2100,
    tempC: 29.0,
    rhPct: 62,
  },
];
