import { RainfallRegime, SynopticWeatherRegime } from '../types';

export interface MonsoonChallengeScenario {
  id: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  stationName: string;
  subdivision: string;
  lat: number;
  lon: number;
  difficulty: 'STANDARD' | 'ADVANCED' | 'EXTREME';
  atmosphericIndicators: {
    rawNwpMm: number;
    observedMm: number; // Revealed on resolution
    relativeHumidity850hPa: number; // %
    surfacePressureHpa: number; // hPa
    temp2mC: number; // °C
    windSpeed10mKmh: number; // km/h
    capeJkg: number; // J/kg
    liftedIndexC: number; // °C
    precipitableWaterMm: number;
    dopplerEchoTopKm: number;
    synopticSetting: string;
    satelliteFeatureDescription: string;
  };
  clues: string[];
  targetRainfallRegime: RainfallRegime;
  targetSynopticRegime: SynopticWeatherRegime;
  meteorologicalExplanation: string;
  nwpBiasDiagnosis: string;
  vfxThemeColor: string; // Hex color for 3D Globe celebration VFX
}

export const MONSOON_CHALLENGES_CATALOG: MonsoonChallengeScenario[] = [
  {
    id: 'challenge_mumbai_deluge',
    title: 'The Great Konkan Coastal Surge',
    subtitle: 'Extreme Convective & Orographic Deluge at Santacruz / Colaba',
    dateLabel: 'Historical Landmark: 26 July Extreme Event',
    stationName: 'Mumbai (Santacruz)',
    subdivision: 'Konkan & Goa',
    lat: 19.076,
    lon: 72.877,
    difficulty: 'EXTREME',
    atmosphericIndicators: {
      rawNwpMm: 42.5,
      observedMm: 284.6,
      relativeHumidity850hPa: 98,
      surfacePressureHpa: 996.2,
      temp2mC: 26.8,
      windSpeed10mKmh: 54,
      capeJkg: 3150,
      liftedIndexC: -5.6,
      precipitableWaterMm: 72,
      dopplerEchoTopKm: 16.4,
      synopticSetting: 'Deep off-shore trough extending from South Gujarat to Kerala coast with vigorous cross-equatorial Somali jet impinging perpendicular to Western Ghats escarpment.',
      satelliteFeatureDescription: 'Cold dense Cloud Top Brightness Temperatures (< -78°C) persistent over Konkan coast with continuous mesoscale convective re-generation.',
    },
    clues: [
      'Low-level moisture convergence at 850 hPa exceeds 98% with southwesterly jet at 54 km/h.',
      'Surface CAPE exceeds 3,100 J/kg indicating profound thermodynamic instability.',
      'Doppler radar reflectivity reveals continuous convective tower echoes punching into 16+ km altitude.',
      'Notice the NWP raw model predicted only 42.5 mm due to grid-smoothing of orographic lifting.',
    ],
    targetRainfallRegime: RainfallRegime.HEAVY_EXTREME,
    targetSynopticRegime: SynopticWeatherRegime.COASTAL_OROGRAPHIC,
    meteorologicalExplanation:
      'A catastrophic convergence of strong Arabian Sea moisture flux and steep orographic ascent against the Western Ghats triggered continuous back-building Mesoscale Convective Systems (MCS). The actual rainfall surpassed 280 mm in 24 hours.',
    nwpBiasDiagnosis:
      'Standard NWP models severely smooth topography and dilute narrow convective corridors, underpredicting localized extreme downpours by more than 200 mm.',
    vfxThemeColor: '#38bdf8', // Electric Cyan
  },
  {
    id: 'challenge_monsoon_depression_odisha',
    title: 'Bay of Bengal Deep Depression',
    subtitle: 'Vigorous Cyclonic Shear Vortex Tracking Inland across Odisha',
    dateLabel: 'Operational Peak: August Mid-Monsoon Depression',
    stationName: 'Bhubaneswar',
    subdivision: 'Odisha',
    lat: 20.296,
    lon: 85.824,
    difficulty: 'ADVANCED',
    atmosphericIndicators: {
      rawNwpMm: 68.0,
      observedMm: 168.4,
      relativeHumidity850hPa: 94,
      surfacePressureHpa: 993.8,
      temp2mC: 27.2,
      windSpeed10mKmh: 46,
      capeJkg: 2400,
      liftedIndexC: -4.2,
      precipitableWaterMm: 68,
      dopplerEchoTopKm: 14.8,
      synopticSetting: 'Well-marked monsoon depression centered over Northwest Bay of Bengal, moving west-northwestward with strong cyclonic vorticity maximum in the southwest sector.',
      satelliteFeatureDescription: 'Asymmetric spiral convective bands wrapping into the low-pressure center, predominantly concentrated in the southern quadrant.',
    },
    clues: [
      'Central barometric pressure drops down to 993.8 hPa with gusting surface winds.',
      'Highest moisture convergence and rainbands are situated in the southwest quadrant of the vortex.',
      'Relative humidity aloft remains saturated (>94%) up to 500 hPa.',
      'Widespread heavy to very heavy rainfall expected across central river basins.',
    ],
    targetRainfallRegime: RainfallRegime.HEAVY_EXTREME,
    targetSynopticRegime: SynopticWeatherRegime.MONSOON_DEPRESSION,
    meteorologicalExplanation:
      'Monsoon depressions produce their heaviest deluge in the forward-left (southwest) sector due to the superposition of cyclonic shear and the low-level monsoon westerlies, driving sustained heavy to extreme precipitation.',
    nwpBiasDiagnosis:
      'NWP tracks the depression center well, but under-resolves the localized spiral feeder rainbands, requiring AI quantile calibration to restore extreme probabilities.',
    vfxThemeColor: '#a855f7', // Purple Iris
  },
  {
    id: 'challenge_break_monsoon_central_plains',
    title: 'The Great Trough Shift: Break Phase',
    subtitle: 'Suppressed Convection & Dry Air Advection over Central Plains',
    dateLabel: 'Seasonal Anomaly: July Monsoon Break Spell',
    stationName: 'Nagpur',
    subdivision: 'Vidarbha (Maharashtra)',
    lat: 21.145,
    lon: 79.088,
    difficulty: 'STANDARD',
    atmosphericIndicators: {
      rawNwpMm: 16.4,
      observedMm: 0.0,
      relativeHumidity850hPa: 38,
      surfacePressureHpa: 1008.4,
      temp2mC: 37.2,
      windSpeed10mKmh: 12,
      capeJkg: 420,
      liftedIndexC: 1.8,
      precipitableWaterMm: 28,
      dopplerEchoTopKm: 3.2,
      synopticSetting: 'Monsoon trough axis displaced to the foothills of the Himalayas. Dry continental north-westerlies dominant over Central India with intense daytime insolation.',
      satelliteFeatureDescription: 'Substantial clearing over Central and Peninsular India with cloud cover confined strictly to the sub-Himalayan belt.',
    },
    clues: [
      '850 hPa relative humidity drops precipitously to 38% with high surface temperature (37.2°C).',
      'Atmosphere exhibits positive lifted index (+1.8°C) and strong mid-tropospheric subsidence.',
      'Surface pressure is elevated (1008.4 hPa) indicating suppressed cyclonic activity.',
      'Raw NWP model erroneously predicts 16.4 mm of drizzle/rain due to convective parameterization artifacts.',
    ],
    targetRainfallRegime: RainfallRegime.DRY,
    targetSynopticRegime: SynopticWeatherRegime.BREAK_MONSOON,
    meteorologicalExplanation:
      'During a Break Monsoon phase, the monsoon trough migrates north against the Himalayas. Central India experiences intense dry air advection and high-pressure subsidence, resulting in complete cessation of rain.',
    nwpBiasDiagnosis:
      'Classic NWP "drizzle bias" — models trigger convective schemes on residual moisture even when mid-level dryness and cap inversion prohibit actual rain from reaching the ground.',
    vfxThemeColor: '#f59e0b', // Amber Sun
  },
  {
    id: 'challenge_cherrapunji_orographic_funnel',
    title: 'Meghalaya Khasi Plateau Funneling Deluge',
    subtitle: 'Hyper-Orographic Ascent over Cherrapunji / Mawsynram',
    dateLabel: 'Topographic Apex: June Peak Monsoon Inflow',
    stationName: 'Cherrapunji (Sohra)',
    subdivision: 'Assam & Meghalaya',
    lat: 25.274,
    lon: 91.732,
    difficulty: 'EXTREME',
    atmosphericIndicators: {
      rawNwpMm: 92.0,
      observedMm: 394.0,
      relativeHumidity850hPa: 99,
      surfacePressureHpa: 995.5,
      temp2mC: 22.4,
      windSpeed10mKmh: 38,
      capeJkg: 2750,
      liftedIndexC: -4.8,
      precipitableWaterMm: 76,
      dopplerEchoTopKm: 17.1,
      synopticSetting: 'Vigorous southerly low-level jet rushing across the low-lying Bangladesh floodplains, forced into an abrupt 1,400-meter vertical rise up the Khasi Hills cliff face.',
      satelliteFeatureDescription: 'Continuous stationary anvil clouds locked over the southern Meghalaya rim, feeding warm-rain coalescence cascades.',
    },
    clues: [
      'Precipitable water of 76 mm and saturated boundary layer (99% RH).',
      'Southerly low-level jet funneling through the Sylhet gorge directly into vertical cliffs.',
      'Continuous warm-rain microphysics yielding torrential downpours exceeding 30 mm/hour.',
      'Raw NWP estimates 92 mm, completely underestimating the catastrophic orographic intensification.',
    ],
    targetRainfallRegime: RainfallRegime.HEAVY_EXTREME,
    targetSynopticRegime: SynopticWeatherRegime.COASTAL_OROGRAPHIC,
    meteorologicalExplanation:
      'The unique funneling geometry of the Meghalaya plateau forces warm, saturated tropical air upwards with zero lateral escape, causing record-setting extreme precipitation rates that easily breach 350 mm/day.',
    nwpBiasDiagnosis:
      'Sub-grid topography cannot resolve the vertical cliff face in coarse NWP meshes, underestimating rain rates by a factor of 4x.',
    vfxThemeColor: '#10b981', // Emerald Forest
  },
  {
    id: 'challenge_western_disturbance_shimla',
    title: 'Mid-Latitude Westerly Wave Encounter',
    subtitle: 'Upper-Tropospheric Trough Sweeping Northern Highlands',
    dateLabel: 'Synoptic Front: February Pre-Monsoon Transition',
    stationName: 'Shimla',
    subdivision: 'Himachal Pradesh',
    lat: 31.104,
    lon: 77.173,
    difficulty: 'STANDARD',
    atmosphericIndicators: {
      rawNwpMm: 24.5,
      observedMm: 44.8,
      relativeHumidity850hPa: 84,
      surfacePressureHpa: 1002.0,
      temp2mC: 6.5,
      windSpeed10mKmh: 32,
      capeJkg: 750,
      liftedIndexC: -1.2,
      precipitableWaterMm: 34,
      dopplerEchoTopKm: 8.5,
      synopticSetting: 'Deep trough in mid-latitude westerlies dipping across North Pakistan into Jammu & Kashmir, interacting with Arabian Sea moisture surge.',
      satelliteFeatureDescription: 'Extensive multi-layered frontal cloud shield streaming from Southwest to Northeast across Northwest India.',
    },
    clues: [
      'Upper-level subtropical westerly jet core (200 hPa) exceeds 130 knots overhead.',
      'Cold frontal advection with low 2m temperature (6.5°C) and widespread moderate snowfall/rain.',
      'Orographic enhancement over the Pir Panjal and Shivalik mountain ranges.',
      'Rainfall category expected between 15.6 mm and 64.4 mm.',
    ],
    targetRainfallRegime: RainfallRegime.MODERATE,
    targetSynopticRegime: SynopticWeatherRegime.WESTERN_DISTURBANCE,
    meteorologicalExplanation:
      'Western Disturbances are non-monsoonal extratropical storms originating in the Mediterranean region. Their arrival brings vital winter/spring moisture to North India with steady, moderate orographic rainfall.',
    nwpBiasDiagnosis:
      'Global NWP captures the synoptic wave well, but underestimates moisture interception on windward slopes by ~20 mm.',
    vfxThemeColor: '#06b6d4', // Cyan Glacial
  },
  {
    id: 'challenge_coromandel_northeast_shower',
    title: 'Coromandel Coastal Convective Plume',
    subtitle: 'Trade-Wind Convergence & Diurnal Sea-Breeze Showers',
    dateLabel: 'Post-Monsoon Flow: October Coastal Regime',
    stationName: 'Chennai (Meenambakkam)',
    subdivision: 'Tamil Nadu & Puducherry',
    lat: 13.082,
    lon: 80.27,
    difficulty: 'STANDARD',
    atmosphericIndicators: {
      rawNwpMm: 3.8,
      observedMm: 9.4,
      relativeHumidity850hPa: 74,
      surfacePressureHpa: 1012.8,
      temp2mC: 29.5,
      windSpeed10mKmh: 18,
      capeJkg: 1400,
      liftedIndexC: -2.8,
      precipitableWaterMm: 44,
      dopplerEchoTopKm: 7.2,
      synopticSetting: 'Northeasterly trade wind flow over the Bay of Bengal meeting localized daytime coastal sea-breeze convergence line.',
      satelliteFeatureDescription: 'Isolated cellular cumulus and small cumulonimbus lines drifting onshore along the Tamil Nadu coastline.',
    },
    clues: [
      'Moderate 850 hPa relative humidity (74%) with moderate surface pressure (1012.8 hPa).',
      'Isolated convective cells forming in late afternoon along the thermal sea-breeze boundary.',
      'Rainfall accumulation remains below the 15.5 mm threshold.',
      'Characteristic light, passing maritime tropical showers.',
    ],
    targetRainfallRegime: RainfallRegime.LIGHT,
    targetSynopticRegime: SynopticWeatherRegime.ACTIVE_MONSOON,
    meteorologicalExplanation:
      'Shallow convective plumes generated by friction convergence as maritime easterlies encounter coastal landmass produce localized light showers with accumulations between 2.5 mm and 15.5 mm.',
    nwpBiasDiagnosis:
      'NWP frequently smears localized 10 mm convective cells over entire grid squares, producing low false alarms.',
    vfxThemeColor: '#3b82f6', // Cobalt Blue
  },
];

// Seeded Daily Challenge Selector based on YYYY-MM-DD
export function getDailyMonsoonChallenge(targetDateStr?: string): {
  scenario: MonsoonChallengeScenario;
  dayIndex: number;
  dateKey: string;
} {
  const now = targetDateStr ? new Date(targetDateStr) : new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const dateKey = `${year}-${month}-${day}`;

  // Deterministic daily hash
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash << 5) - hash + dateKey.charCodeAt(i);
    hash |= 0;
  }
  const dayIndex = Math.abs(hash) % MONSOON_CHALLENGES_CATALOG.length;
  return {
    scenario: MONSOON_CHALLENGES_CATALOG[dayIndex],
    dayIndex,
    dateKey,
  };
}
