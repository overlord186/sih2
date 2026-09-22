export type MountainBarrierId = 
  | 'WESTERN_GHATS' 
  | 'HIMALAYAN_ARC' 
  | 'MEGHALAYA_PLATEAU' 
  | 'EASTERN_GHATS' 
  | 'ARAVALLI_RANGE';

export type MonsoonRegimeId = 
  | 'ACTIVE_SOUTHWEST' 
  | 'BREAK_MONSOON' 
  | 'MONSOON_DEPRESSION' 
  | 'NORTHEAST_MONSOON' 
  | 'EL_NINO_WEAK';

export interface RidgePoint {
  lat: number;
  lon: number;
  heightM: number;
}

export interface BarrierStation {
  name: string;
  type: 'WINDWARD' | 'CREST' | 'LEEWARD';
  lat: number;
  lon: number;
  elevationM: number;
  regimeRainfallMmDay: number;
  notes: string;
}

export interface MountainBarrier {
  id: MountainBarrierId;
  name: string;
  localName: string;
  avgElevationM: number;
  maxPeakM: number;
  peakName: string;
  orientationDeg: number; // approximate strike angle
  ridgePoints: RidgePoint[];
  cameraFocus: {
    pitch: number;
    yaw: number;
    distance: number;
    lat: number;
    lon: number;
  };
  description: string;
  geologicalContext: string;
}

export interface BarrierInteractionDetail {
  froudeNumber: number; // Fr = U / (N * h). Fr < 1 => blocked / channeled; Fr >= 1 => forced over barrier
  isFlowBlocked: boolean;
  liftCondensationLevelM: number; // LCL
  windwardRainMmDay: number;
  leewardRainMmDay: number;
  rainShadowDeficitPct: number;
  foehnHeatingDeltaC: number;
  orographicEfficiencyPct: number;
  summary: string;
  keyStations: BarrierStation[];
}

export interface MonsoonRegime {
  id: MonsoonRegimeId;
  name: string;
  season: string;
  windHeadingDeg: number; // Direction flow travels TOWARD (0 = North, 90 = East, etc.)
  windSpeedKmh: number;
  moistureContentGKg: number;
  color: string;
  accentVfx: string;
  regimeOverview: string;
  synopticTrigger: string;
  barrierInteractions: Record<MountainBarrierId, BarrierInteractionDetail>;
}

export const MOUNTAIN_BARRIERS: MountainBarrier[] = [
  {
    id: 'WESTERN_GHATS',
    name: 'Western Ghats (Sahyadri)',
    localName: 'सह्याद्री पर्वतरांग',
    avgElevationM: 1200,
    maxPeakM: 2695,
    peakName: 'Anamudi Peak (Kerala)',
    orientationDeg: 340, // NNW-SSE strike along the Arabian Sea
    ridgePoints: [
      { lat: 21.1, lon: 73.5, heightM: 950 },  // Dang / Satpura transition
      { lat: 19.8, lon: 73.6, heightM: 1250 }, // Igatpuri / Kalsubai (1646m)
      { lat: 18.7, lon: 73.4, heightM: 1100 }, // Lonavala / Khandala
      { lat: 17.9, lon: 73.6, heightM: 1438 }, // Mahabaleshwar
      { lat: 16.0, lon: 74.1, heightM: 1020 }, // Amboli Ghat
      { lat: 14.5, lon: 74.8, heightM: 850 },  // Uttara Kannada
      { lat: 13.2, lon: 75.2, heightM: 1892 }, // Kudremukh / Agumbe
      { lat: 11.5, lon: 76.5, heightM: 2637 }, // Nilgiri Hills (Doddabetta)
      { lat: 10.2, lon: 77.0, heightM: 2695 }, // Anamalai / Anamudi
      { lat: 8.7,  lon: 77.2, heightM: 1868 }, // Agasthyamalai
    ],
    cameraFocus: {
      pitch: 28,
      yaw: 74.0,
      distance: 3.45,
      lat: 16.0,
      lon: 74.5,
    },
    description: 'A 1,600 km continuous orographic wall rising precipitously from the Konkan coast. Forces moist Arabian Sea monsoonal flow upward, triggering colossal windward rainstorms before desiccating into the semi-arid Deccan rain shadow.',
    geologicalContext: 'Fault-scarp escarpment formed during the breakup of the Gondwana supercontinent, capped by Cretaceous Deccan Trap basalt flows.',
  },
  {
    id: 'HIMALAYAN_ARC',
    name: 'Himalayan Foothills & Wall',
    localName: 'हिमालय गिरिमाला',
    avgElevationM: 3500,
    maxPeakM: 8848,
    peakName: 'Mount Everest / Kangchenjunga',
    orientationDeg: 295, // WNW-ESE sweeping arc
    ridgePoints: [
      { lat: 31.5, lon: 77.2, heightM: 3200 }, // Himachal Pradesh / Shimla
      { lat: 30.3, lon: 78.5, heightM: 3600 }, // Garhwal / Dehradun foothills
      { lat: 29.4, lon: 80.2, heightM: 4100 }, // Kumaon / Nainital
      { lat: 28.2, lon: 84.0, heightM: 5500 }, // Central Nepal / Annapurna
      { lat: 27.7, lon: 86.8, heightM: 6800 }, // Eastern Nepal / Everest flank
      { lat: 27.3, lon: 88.5, heightM: 5200 }, // Sikkim / Darjeeling crest
      { lat: 27.2, lon: 91.5, heightM: 4200 }, // Bhutan frontier
      { lat: 28.1, lon: 94.5, heightM: 4600 }, // Arunachal Eastern Syntaxis
    ],
    cameraFocus: {
      pitch: 26,
      yaw: 84.0,
      distance: 3.8,
      lat: 28.5,
      lon: 84.0,
    },
    description: 'The highest mountain barrier on Earth. In Break Monsoon regimes, the Monsoon Trough shifts to the Himalayan foothills, funneling humid low-level easterlies straight into the Shiwaliks and triggering massive cloudbursts, debris flows, and Terai flooding.',
    geologicalContext: 'Active continent-continent collisional orogen resulting from the ongoing northward penetration of the Indian Tectonic Plate into Eurasia (~45 mm/yr).',
  },
  {
    id: 'MEGHALAYA_PLATEAU',
    name: 'Meghalaya Plateau (Khasi Hills)',
    localName: 'মেঘালয় মালভূমি',
    avgElevationM: 1350,
    maxPeakM: 1961,
    peakName: 'Shillong Peak (Khasi Hills)',
    orientationDeg: 270, // East-West horst block
    ridgePoints: [
      { lat: 25.4, lon: 90.2, heightM: 950 },  // Garo Hills / Tura
      { lat: 25.3, lon: 91.2, heightM: 1320 }, // Mawsynram
      { lat: 25.28, lon: 91.73, heightM: 1313 }, // Cherrapunji (Sohra)
      { lat: 25.5, lon: 92.1, heightM: 1450 }, // Jaintia Hills
      { lat: 25.6, lon: 93.0, heightM: 1100 }, // Mikir Hills transition
    ],
    cameraFocus: {
      pitch: 24,
      yaw: 91.5,
      distance: 3.3,
      lat: 25.4,
      lon: 91.7,
    },
    description: 'A raised horst plateau dropping vertically into the Bengal plains. Acts as a giant concave trap that captures maritime southerly monsoon surges from the Bay of Bengal, producing the wettest place on the planet (Mawsynram: ~11,872 mm/yr).',
    geologicalContext: 'Detached block of ancient Precambrian Indian shield rock thrust upward along the Dauki and Brahmaputra fault lines.',
  },
  {
    id: 'EASTERN_GHATS',
    name: 'Eastern Ghats & Coromandel',
    localName: 'తూర్పు కనుమలు',
    avgElevationM: 700,
    maxPeakM: 1680,
    peakName: 'Arma Konda (Andhra Pradesh)',
    orientationDeg: 215, // SW-NE broken chain
    ridgePoints: [
      { lat: 18.8, lon: 83.0, heightM: 1680 }, // Northern Circars / Arma Konda
      { lat: 17.5, lon: 82.2, heightM: 1200 }, // Visakhapatnam hinterland
      { lat: 16.0, lon: 79.5, heightM: 800 },  // Nallamala Hills
      { lat: 14.2, lon: 79.0, heightM: 900 },  // Seshachalam Hills (Tirupati)
      { lat: 12.0, lon: 78.5, heightM: 1150 }, // Shevaroy / Javadi Hills
    ],
    cameraFocus: {
      pitch: 25,
      yaw: 80.5,
      distance: 3.5,
      lat: 16.0,
      lon: 81.0,
    },
    description: 'Discontinuous relict mountain chain along eastern peninsular India. While largely in the rain shadow during the Southwest Monsoon, it acts as the primary orographic barrier during the Northeast Monsoon (Oct-Dec), capturing easterly Bay of Bengal surges.',
    geologicalContext: 'Ancient Proterozoic mobile belt eroded into discontinuous massifs dissected by the Godavari, Krishna, and Kaveri river systems.',
  },
  {
    id: 'ARAVALLI_RANGE',
    name: 'Aravalli Range & Thar Boundary',
    localName: 'अरावली पर्वतमाला',
    avgElevationM: 600,
    maxPeakM: 1722,
    peakName: 'Guru Shikhar (Mount Abu)',
    orientationDeg: 220, // SW-NE strike across Rajasthan
    ridgePoints: [
      { lat: 24.5, lon: 72.8, heightM: 1722 }, // Mount Abu / Sirohi
      { lat: 25.2, lon: 73.5, heightM: 950 },  // Kumbhalgarh
      { lat: 26.1, lon: 74.5, heightM: 750 },  // Ajmer / Pushkar
      { lat: 27.3, lon: 75.8, heightM: 600 },  // Jaipur / Khetri
      { lat: 28.4, lon: 77.1, heightM: 320 },  // Delhi Ridge terminus
    ],
    cameraFocus: {
      pitch: 26,
      yaw: 74.0,
      distance: 3.5,
      lat: 25.5,
      lon: 74.0,
    },
    description: 'The oldest fold mountain chain in India, running parallel to the Southwest monsoon moisture corridor. Because winds blow parallel to the ridge rather than across it, the range fails to provide orographic lift, contributing directly to the Thar Desert.',
    geologicalContext: 'Precambrian fold belt formed by the collision of ancient Archean cratonic blocks, now eroded to its metamorphic roots.',
  },
];

export const MONSOON_REGIMES: MonsoonRegime[] = [
  {
    id: 'ACTIVE_SOUTHWEST',
    name: 'Active Southwest Monsoon (Somali Jet Peak)',
    season: 'Core Summer Monsoon (July - August)',
    windHeadingDeg: 55, // Inflow from 235° (SW to NE)
    windSpeedKmh: 58,
    moistureContentGKg: 21.5,
    color: '#0284c7', // Sky blue
    accentVfx: '#38bdf8',
    regimeOverview: 'Intense cross-equatorial Somali Jet accelerates across the Arabian Sea, carrying deep tropical vapor. Perpendicular impact on the Western Ghats produces catastrophic orographic lift, while the leeward Deccan plateau suffers severe rain shadow drying.',
    synopticTrigger: 'Strong Monsoon Trough centered over Central India, coupled with Mascarene High pressure ridge pumping high-momentum southwesterlies.',
    barrierInteractions: {
      WESTERN_GHATS: {
        froudeNumber: 1.35,
        isFlowBlocked: false,
        liftCondensationLevelM: 420,
        windwardRainMmDay: 245,
        leewardRainMmDay: 18,
        rainShadowDeficitPct: 92.6,
        foehnHeatingDeltaC: 3.8,
        orographicEfficiencyPct: 88,
        summary: 'Massive windward forced ascent with cloud tops reaching 14km. Violent convective cloudbursts at Mahabaleshwar and Agumbe; severe föhn warming and dissipation over Pune and Solapur.',
        keyStations: [
          { name: 'Mumbai Coast', type: 'WINDWARD', lat: 19.07, lon: 72.87, elevationM: 14, regimeRainfallMmDay: 140, notes: 'Coastal maritime feeder inflow' },
          { name: 'Mahabaleshwar Crest', type: 'WINDWARD', lat: 17.92, lon: 73.65, elevationM: 1353, regimeRainfallMmDay: 260, notes: 'Maximum orographic condensation peak' },
          { name: 'Agumbe (Cherrapunji of South)', type: 'CREST', lat: 13.51, lon: 75.09, elevationM: 645, regimeRainfallMmDay: 280, notes: 'Extreme forced ascent deluge' },
          { name: 'Pune Shivajinagar', type: 'LEEWARD', lat: 18.52, lon: 73.85, elevationM: 560, regimeRainfallMmDay: 22, notes: 'Deep leeward rain shadow deficit (-91%)' },
          { name: 'Solapur Plains', type: 'LEEWARD', lat: 17.65, lon: 75.90, elevationM: 458, regimeRainfallMmDay: 8, notes: 'Adiabatic descent clearing' },
        ],
      },
      HIMALAYAN_ARC: {
        froudeNumber: 0.72,
        isFlowBlocked: true,
        liftCondensationLevelM: 850,
        windwardRainMmDay: 65,
        leewardRainMmDay: 8,
        rainShadowDeficitPct: 87.7,
        foehnHeatingDeltaC: 2.1,
        orographicEfficiencyPct: 45,
        summary: 'Monsoon trough remains over central India, so flow reaching the Himalayas is moderate and partially blocked, deflecting northwestward along the Gangetic plain.',
        keyStations: [
          { name: 'Dehradun Foothills', type: 'WINDWARD', lat: 30.31, lon: 78.03, elevationM: 640, regimeRainfallMmDay: 75, notes: 'Moderate foothill showers' },
          { name: 'Nainital Hills', type: 'CREST', lat: 29.38, lon: 79.46, elevationM: 2084, regimeRainfallMmDay: 90, notes: 'Mid-level cloud immersion' },
          { name: 'Leh Ladakh', type: 'LEEWARD', lat: 34.15, lon: 77.57, elevationM: 3500, regimeRainfallMmDay: 1.5, notes: 'Extreme trans-Himalayan rain shadow desert' },
        ],
      },
      MEGHALAYA_PLATEAU: {
        froudeNumber: 1.55,
        isFlowBlocked: false,
        liftCondensationLevelM: 320,
        windwardRainMmDay: 320,
        leewardRainMmDay: 35,
        rainShadowDeficitPct: 89.1,
        foehnHeatingDeltaC: 3.2,
        orographicEfficiencyPct: 94,
        summary: 'Bay of Bengal branch surges directly into the Khasi funnel; vertical cliff face forces instant saturation and world-record downpours at Cherrapunji and Mawsynram.',
        keyStations: [
          { name: 'Sylhet Plains', type: 'WINDWARD', lat: 24.89, lon: 91.86, elevationM: 25, regimeRainfallMmDay: 85, notes: 'Humid upstream feeder marsh' },
          { name: 'Cherrapunji Sohra', type: 'CREST', lat: 25.27, lon: 91.73, elevationM: 1313, regimeRainfallMmDay: 340, notes: 'Hyper-intense orographic deluge' },
          { name: 'Guwahati Valley', type: 'LEEWARD', lat: 26.18, lon: 91.74, elevationM: 54, regimeRainfallMmDay: 38, notes: 'Leeward valley rain reduction' },
        ],
      },
      EASTERN_GHATS: {
        froudeNumber: 0.95,
        isFlowBlocked: true,
        liftCondensationLevelM: 1100,
        windwardRainMmDay: 18,
        leewardRainMmDay: 12,
        rainShadowDeficitPct: 33.3,
        foehnHeatingDeltaC: 1.2,
        orographicEfficiencyPct: 25,
        summary: 'Located on the lee side of peninsular India; air arriving here has already shed moisture over the Western Ghats, leaving rainfall subdued.',
        keyStations: [
          { name: 'Visakhapatnam', type: 'WINDWARD', lat: 17.68, lon: 83.21, elevationM: 45, regimeRainfallMmDay: 20, notes: 'Subdued coastal rainfall' },
          { name: 'Arma Konda Peak', type: 'CREST', lat: 18.80, lon: 83.00, elevationM: 1680, regimeRainfallMmDay: 28, notes: 'Minor orographic enhancement' },
        ],
      },
      ARAVALLI_RANGE: {
        froudeNumber: 2.1,
        isFlowBlocked: false,
        liftCondensationLevelM: 1450,
        windwardRainMmDay: 22,
        leewardRainMmDay: 10,
        rainShadowDeficitPct: 54.5,
        foehnHeatingDeltaC: 2.8,
        orographicEfficiencyPct: 15,
        summary: 'SW winds blow nearly parallel to the ridge line. Insufficient cross-barrier angle prevents mechanical lift, channeling dry continental air into western Rajasthan.',
        keyStations: [
          { name: 'Mount Abu Peak', type: 'CREST', lat: 24.59, lon: 72.71, elevationM: 1220, regimeRainfallMmDay: 65, notes: 'Isolated high-altitude oasis' },
          { name: 'Jodhpur (Thar Gateway)', type: 'LEEWARD', lat: 26.23, lon: 73.02, elevationM: 231, regimeRainfallMmDay: 8, notes: 'Arid Thar desert fringe' },
        ],
      },
    },
  },
  {
    id: 'BREAK_MONSOON',
    name: 'Break Monsoon Regime (Foothill Deluge)',
    season: 'Active Intra-Seasonal Break (August)',
    windHeadingDeg: 285, // Shifted to WNW with easterly/southeasterly foothill jet
    windSpeedKmh: 42,
    moistureContentGKg: 19.8,
    color: '#8b5cf6', // Purple / Indigo
    accentVfx: '#a855f7',
    regimeOverview: 'The Monsoon Trough migrates northward to the foothills of the Himalayas. Peninsular India enters a severe dry spell, while moisture is funneled directly into the Himalayan arc and Brahmaputra basin, creating catastrophic flash floods and landslides.',
    synopticTrigger: 'Northward shift of the Subtropical Jet and axis of the monsoon trough hugging the Himalayan front.',
    barrierInteractions: {
      WESTERN_GHATS: {
        froudeNumber: 0.45,
        isFlowBlocked: true,
        liftCondensationLevelM: 980,
        windwardRainMmDay: 18,
        leewardRainMmDay: 4,
        rainShadowDeficitPct: 77.8,
        foehnHeatingDeltaC: 1.1,
        orographicEfficiencyPct: 20,
        summary: 'Somali jet collapses; Western Ghats experience dry, sunny spells with weak sea breezes and virtually no orographic condensation.',
        keyStations: [
          { name: 'Mumbai Coast', type: 'WINDWARD', lat: 19.07, lon: 72.87, elevationM: 14, regimeRainfallMmDay: 12, notes: 'Weak coastal showers only' },
          { name: 'Mahabaleshwar Crest', type: 'WINDWARD', lat: 17.92, lon: 73.65, elevationM: 1353, regimeRainfallMmDay: 25, notes: 'Sharp 90% drop from active regime' },
          { name: 'Pune Shivajinagar', type: 'LEEWARD', lat: 18.52, lon: 73.85, elevationM: 560, regimeRainfallMmDay: 3, notes: 'Clear skies, drought conditions' },
        ],
      },
      HIMALAYAN_ARC: {
        froudeNumber: 1.65,
        isFlowBlocked: false,
        liftCondensationLevelM: 380,
        windwardRainMmDay: 275,
        leewardRainMmDay: 14,
        rainShadowDeficitPct: 94.9,
        foehnHeatingDeltaC: 4.2,
        orographicEfficiencyPct: 92,
        summary: 'Maximum forced ascent! Low-level easterly jet slams into the Shiwalik wall; violent cloudbursts, severe landslides along Kedarnath/Badrinath routes, and devastating floods in the Terai and Bihar.',
        keyStations: [
          { name: 'Dehradun Foothills', type: 'WINDWARD', lat: 30.31, lon: 78.03, elevationM: 640, regimeRainfallMmDay: 260, notes: 'Severe cloudburst hazard zone' },
          { name: 'Nainital / Pantnagar', type: 'CREST', lat: 29.38, lon: 79.46, elevationM: 2084, regimeRainfallMmDay: 290, notes: 'Relentless multi-day orographic deluge' },
          { name: 'Darbhanga / Terai', type: 'WINDWARD', lat: 26.15, lon: 85.89, elevationM: 52, regimeRainfallMmDay: 180, notes: 'Major riverine inundation' },
          { name: 'Leh Ladakh', type: 'LEEWARD', lat: 34.15, lon: 77.57, elevationM: 3500, regimeRainfallMmDay: 2, notes: 'Rain shadow unchanged' },
        ],
      },
      MEGHALAYA_PLATEAU: {
        froudeNumber: 1.8,
        isFlowBlocked: false,
        liftCondensationLevelM: 290,
        windwardRainMmDay: 360,
        leewardRainMmDay: 48,
        rainShadowDeficitPct: 86.7,
        foehnHeatingDeltaC: 3.5,
        orographicEfficiencyPct: 96,
        summary: 'Intense convergence between Gangetic easterlies and Bay of Bengal southerlies pumps maximum precipitation into the Khasi Hills and southern Brahmaputra valley.',
        keyStations: [
          { name: 'Cherrapunji Sohra', type: 'CREST', lat: 25.27, lon: 91.73, elevationM: 1313, regimeRainfallMmDay: 380, notes: 'Record multi-day cloudburst clusters' },
          { name: 'Guwahati Plains', type: 'LEEWARD', lat: 26.18, lon: 91.74, elevationM: 54, regimeRainfallMmDay: 65, notes: 'Substantial foothill spillover' },
        ],
      },
      EASTERN_GHATS: {
        froudeNumber: 0.4,
        isFlowBlocked: true,
        liftCondensationLevelM: 1250,
        windwardRainMmDay: 8,
        leewardRainMmDay: 4,
        rainShadowDeficitPct: 50.0,
        foehnHeatingDeltaC: 0.8,
        orographicEfficiencyPct: 15,
        summary: 'Suppressed convective activity; dry spell dominates Andhra and Odisha coasts.',
        keyStations: [
          { name: 'Visakhapatnam', type: 'WINDWARD', lat: 17.68, lon: 83.21, elevationM: 45, regimeRainfallMmDay: 6, notes: 'Dry monsoon break spell' },
        ],
      },
      ARAVALLI_RANGE: {
        froudeNumber: 0.6,
        isFlowBlocked: true,
        liftCondensationLevelM: 1600,
        windwardRainMmDay: 5,
        leewardRainMmDay: 2,
        rainShadowDeficitPct: 60.0,
        foehnHeatingDeltaC: 1.5,
        orographicEfficiencyPct: 10,
        summary: 'Hot, dry continental subsidence takes over; temperatures climb above 38°C in western Rajasthan.',
        keyStations: [
          { name: 'Mount Abu Peak', type: 'CREST', lat: 24.59, lon: 72.71, elevationM: 1220, regimeRainfallMmDay: 12, notes: 'Subdued activity' },
          { name: 'Jodhpur', type: 'LEEWARD', lat: 26.23, lon: 73.02, elevationM: 231, regimeRainfallMmDay: 2, notes: 'Intense dry heat' },
        ],
      },
    },
  },
  {
    id: 'MONSOON_DEPRESSION',
    name: 'Monsoon Depression Incursion',
    season: 'Synoptic Peak (July - September)',
    windHeadingDeg: 300, // Cyclonic cyclostrophic convergence moving WNW
    windSpeedKmh: 65,
    moistureContentGKg: 22.8,
    color: '#059669', // Emerald green
    accentVfx: '#10b981',
    regimeOverview: 'A vigorous synoptic low from the Bay of Bengal tracks West-Northwestward across Odisha, Chhattisgarh, and the Vindhya-Satpura divide. Intense moisture convergence interacts with central Indian plateaus and the northern Western Ghats.',
    synopticTrigger: 'Warm-core low-pressure vortex with deep cyclonic circulation from surface to 500 hPa.',
    barrierInteractions: {
      WESTERN_GHATS: {
        froudeNumber: 1.45,
        isFlowBlocked: false,
        liftCondensationLevelM: 380,
        windwardRainMmDay: 280,
        leewardRainMmDay: 45,
        rainShadowDeficitPct: 83.9,
        foehnHeatingDeltaC: 2.8,
        orographicEfficiencyPct: 90,
        summary: 'Depression draws deep Arabian Sea southwesterlies, triggering widespread flooding in Mumbai, Konkan, and northern Ghats (Trimbakeshwar/Nashik).',
        keyStations: [
          { name: 'Mumbai Santacruz', type: 'WINDWARD', lat: 19.07, lon: 72.87, elevationM: 14, regimeRainfallMmDay: 230, notes: 'Severe urban flash flood warning' },
          { name: 'Mahabaleshwar Crest', type: 'CREST', lat: 17.92, lon: 73.65, elevationM: 1353, regimeRainfallMmDay: 310, notes: 'Extreme orographic compounding' },
          { name: 'Nashik Foothills', type: 'LEEWARD', lat: 19.99, lon: 73.78, elevationM: 584, regimeRainfallMmDay: 58, notes: 'Godavari river surge' },
        ],
      },
      HIMALAYAN_ARC: {
        froudeNumber: 0.9,
        isFlowBlocked: true,
        liftCondensationLevelM: 750,
        windwardRainMmDay: 85,
        leewardRainMmDay: 12,
        rainShadowDeficitPct: 85.9,
        foehnHeatingDeltaC: 1.8,
        orographicEfficiencyPct: 55,
        summary: 'Interaction between the depression circulation and Himalayan foothills triggers heavy rainfall over Uttarakhand and western Nepal.',
        keyStations: [
          { name: 'Dehradun', type: 'WINDWARD', lat: 30.31, lon: 78.03, elevationM: 640, regimeRainfallMmDay: 95, notes: 'Peripheral frontal showers' },
        ],
      },
      MEGHALAYA_PLATEAU: {
        froudeNumber: 1.1,
        isFlowBlocked: false,
        liftCondensationLevelM: 450,
        windwardRainMmDay: 140,
        leewardRainMmDay: 25,
        rainShadowDeficitPct: 82.1,
        foehnHeatingDeltaC: 2.2,
        orographicEfficiencyPct: 75,
        summary: 'Southeastern quadrant feeder winds bring moderate to heavy rain to the Khasi Hills.',
        keyStations: [
          { name: 'Cherrapunji', type: 'CREST', lat: 25.27, lon: 91.73, elevationM: 1313, regimeRainfallMmDay: 165, notes: 'Persistent monsoon downpour' },
        ],
      },
      EASTERN_GHATS: {
        froudeNumber: 1.25,
        isFlowBlocked: false,
        liftCondensationLevelM: 420,
        windwardRainMmDay: 185,
        leewardRainMmDay: 30,
        rainShadowDeficitPct: 83.8,
        foehnHeatingDeltaC: 2.4,
        orographicEfficiencyPct: 82,
        summary: 'Direct impact zone! Depression landfall slams the Northern Circars of the Eastern Ghats, triggering dangerous flash floods in Odisha and northern Andhra.',
        keyStations: [
          { name: 'Gopalpur Coast', type: 'WINDWARD', lat: 19.26, lon: 84.91, elevationM: 8, regimeRainfallMmDay: 190, notes: 'Depression landfall core' },
          { name: 'Koraput Ghats Crest', type: 'CREST', lat: 18.81, lon: 82.71, elevationM: 870, regimeRainfallMmDay: 220, notes: 'Severe orographic runoff into rivers' },
        ],
      },
      ARAVALLI_RANGE: {
        froudeNumber: 1.3,
        isFlowBlocked: false,
        liftCondensationLevelM: 680,
        windwardRainMmDay: 80,
        leewardRainMmDay: 25,
        rainShadowDeficitPct: 68.8,
        foehnHeatingDeltaC: 2.1,
        orographicEfficiencyPct: 60,
        summary: 'As the depression moves inland to Rajasthan, winds hit the Aravalli hills from the east/southeast, providing rare orographic deluge to Udaipur and Mount Abu.',
        keyStations: [
          { name: 'Udaipur Valleys', type: 'WINDWARD', lat: 24.58, lon: 73.68, elevationM: 598, regimeRainfallMmDay: 95, notes: 'Lake basin replenishment' },
          { name: 'Mount Abu Peak', type: 'CREST', lat: 24.59, lon: 72.71, elevationM: 1220, regimeRainfallMmDay: 140, notes: 'Rare western Ghats-like cloudburst' },
        ],
      },
    },
  },
  {
    id: 'NORTHEAST_MONSOON',
    name: 'Northeast Monsoon (Winter Monsoon / Post-Monsoon)',
    season: 'Retreating Monsoon (October - December)',
    windHeadingDeg: 225, // Reversed! Inflow from 045° (NE to SW)
    windSpeedKmh: 36,
    moistureContentGKg: 17.2,
    color: '#ea580c', // Amber / Orange
    accentVfx: '#f97316',
    regimeOverview: 'Winds reverse entirely. Dry continental northeasterlies travel over the warm Bay of Bengal, absorbing abundant moisture, and strike the Eastern Ghats and Coromandel Coast of Tamil Nadu & Andhra Pradesh. The Western Ghats now act as the leeward rain shadow!',
    synopticTrigger: 'Siberian high pressure ridge pushing northeasterly trade winds across the Bay of Bengal.',
    barrierInteractions: {
      WESTERN_GHATS: {
        froudeNumber: 0.8,
        isFlowBlocked: true,
        liftCondensationLevelM: 950,
        windwardRainMmDay: 15,
        leewardRainMmDay: 8,
        rainShadowDeficitPct: 46.7,
        foehnHeatingDeltaC: 1.5,
        orographicEfficiencyPct: 35,
        summary: 'Role reversal! The Western Ghats act as the leeward barrier to northeasterly flow, with only Palakkad Gap and high southern peaks receiving spillover rain.',
        keyStations: [
          { name: 'Palakkad Gap', type: 'CREST', lat: 10.78, lon: 76.65, elevationM: 140, regimeRainfallMmDay: 35, notes: 'Orographically funneled spillover pass' },
          { name: 'Mumbai Coast', type: 'LEEWARD', lat: 19.07, lon: 72.87, elevationM: 14, regimeRainfallMmDay: 2, notes: 'Clear, dry winter skies' },
        ],
      },
      HIMALAYAN_ARC: {
        froudeNumber: 0.3,
        isFlowBlocked: true,
        liftCondensationLevelM: 1800,
        windwardRainMmDay: 4,
        leewardRainMmDay: 1,
        rainShadowDeficitPct: 75.0,
        foehnHeatingDeltaC: 1.0,
        orographicEfficiencyPct: 10,
        summary: 'Dry katabatic down-valley drainage from Tibet; cold, dry weather prevails with occasional Western Disturbance snowfall.',
        keyStations: [
          { name: 'Shimla Ridge', type: 'CREST', lat: 31.10, lon: 77.17, elevationM: 2276, regimeRainfallMmDay: 4, notes: 'Dry, crisp winter atmosphere' },
        ],
      },
      MEGHALAYA_PLATEAU: {
        froudeNumber: 0.5,
        isFlowBlocked: true,
        liftCondensationLevelM: 1400,
        windwardRainMmDay: 12,
        leewardRainMmDay: 6,
        rainShadowDeficitPct: 50.0,
        foehnHeatingDeltaC: 1.2,
        orographicEfficiencyPct: 20,
        summary: 'Dry season begins; Cherrapunji sees clear blue skies and sharp decrease in streamflow.',
        keyStations: [
          { name: 'Cherrapunji Sohra', type: 'CREST', lat: 25.27, lon: 91.73, elevationM: 1313, regimeRainfallMmDay: 15, notes: 'Drying waterfall cascades' },
        ],
      },
      EASTERN_GHATS: {
        froudeNumber: 1.5,
        isFlowBlocked: false,
        liftCondensationLevelM: 350,
        windwardRainMmDay: 165,
        leewardRainMmDay: 22,
        rainShadowDeficitPct: 86.7,
        foehnHeatingDeltaC: 2.9,
        orographicEfficiencyPct: 88,
        summary: 'Peak annual rainfall season for the Coromandel coast! Moisture-laden northeasterlies hit the Eastern Ghats, triggering intense orographic deluge across Chennai, Cuddalore, and Tirupati.',
        keyStations: [
          { name: 'Chennai Meenambakkam', type: 'WINDWARD', lat: 13.08, lon: 80.27, elevationM: 16, regimeRainfallMmDay: 175, notes: 'Primary annual monsoon season' },
          { name: 'Tirupati Seshachalam Hills', type: 'CREST', lat: 13.62, lon: 79.41, elevationM: 910, regimeRainfallMmDay: 210, notes: 'Severe orographic uplift storms' },
          { name: 'Coimbatore Plateau', type: 'LEEWARD', lat: 11.01, lon: 76.95, elevationM: 411, regimeRainfallMmDay: 30, notes: 'Sheltered western rain shadow' },
        ],
      },
      ARAVALLI_RANGE: {
        froudeNumber: 0.2,
        isFlowBlocked: true,
        liftCondensationLevelM: 2200,
        windwardRainMmDay: 1,
        leewardRainMmDay: 0.5,
        rainShadowDeficitPct: 50.0,
        foehnHeatingDeltaC: 0.5,
        orographicEfficiencyPct: 5,
        summary: 'Dry, crisp continental post-monsoon weather across all of northwestern India.',
        keyStations: [
          { name: 'Mount Abu', type: 'CREST', lat: 24.59, lon: 72.71, elevationM: 1220, regimeRainfallMmDay: 2, notes: 'Winter tourist season' },
        ],
      },
    },
  },
  {
    id: 'EL_NINO_WEAK',
    name: 'El Niño Weakened Monsoon',
    season: 'Suppressed Summer Monsoon (Drought Year)',
    windHeadingDeg: 65, // Slackened southwesterlies
    windSpeedKmh: 28,
    moistureContentGKg: 15.4,
    color: '#e11d48', // Crimson / Rose
    accentVfx: '#f43f5e',
    regimeOverview: 'Warm Central/Eastern Pacific SST anomalies disrupt the Walker Circulation, driving anomalous upper-tropospheric subsidence over India. Somali Jet winds weaken drastically (sub-30 km/h), failing to overcome the Western Ghats orographic barrier, leading to widespread agricultural drought.',
    synopticTrigger: 'Positive ENSO phase inducing anomalous sinking motion and capping convective growth with dry mid-level inversions.',
    barrierInteractions: {
      WESTERN_GHATS: {
        froudeNumber: 0.65,
        isFlowBlocked: true,
        liftCondensationLevelM: 820,
        windwardRainMmDay: 75,
        leewardRainMmDay: 6,
        rainShadowDeficitPct: 92.0,
        foehnHeatingDeltaC: 4.5,
        orographicEfficiencyPct: 45,
        summary: 'Sluggish cross-barrier kinetic energy; air parcels deflect around rather than ascending over the crest. Rainfall at Mahabaleshwar drops by >65%, while interior Maharashtra faces severe agrarian distress.',
        keyStations: [
          { name: 'Mahabaleshwar Crest', type: 'CREST', lat: 17.92, lon: 73.65, elevationM: 1353, regimeRainfallMmDay: 85, notes: 'Severe 65% deficit from normal' },
          { name: 'Pune Shivajinagar', type: 'LEEWARD', lat: 18.52, lon: 73.85, elevationM: 560, regimeRainfallMmDay: 6, notes: 'Extreme drought stress' },
        ],
      },
      HIMALAYAN_ARC: {
        froudeNumber: 0.5,
        isFlowBlocked: true,
        liftCondensationLevelM: 1100,
        windwardRainMmDay: 35,
        leewardRainMmDay: 4,
        rainShadowDeficitPct: 88.6,
        foehnHeatingDeltaC: 1.6,
        orographicEfficiencyPct: 30,
        summary: 'Suppressed foothill moisture transport; sub-par monsoon showers across Uttarakhand and Himachal.',
        keyStations: [
          { name: 'Dehradun', type: 'WINDWARD', lat: 30.31, lon: 78.03, elevationM: 640, regimeRainfallMmDay: 42, notes: 'Subdued precipitation' },
        ],
      },
      MEGHALAYA_PLATEAU: {
        froudeNumber: 0.9,
        isFlowBlocked: true,
        liftCondensationLevelM: 650,
        windwardRainMmDay: 130,
        leewardRainMmDay: 18,
        rainShadowDeficitPct: 86.2,
        foehnHeatingDeltaC: 2.1,
        orographicEfficiencyPct: 60,
        summary: 'Even the wettest place on Earth experiences anomalous dry intervals, with rainfall down 55% below long-period averages.',
        keyStations: [
          { name: 'Cherrapunji Sohra', type: 'CREST', lat: 25.27, lon: 91.73, elevationM: 1313, regimeRainfallMmDay: 145, notes: 'Anomalously suppressed' },
        ],
      },
      EASTERN_GHATS: {
        froudeNumber: 0.4,
        isFlowBlocked: true,
        liftCondensationLevelM: 1400,
        windwardRainMmDay: 8,
        leewardRainMmDay: 3,
        rainShadowDeficitPct: 62.5,
        foehnHeatingDeltaC: 1.1,
        orographicEfficiencyPct: 15,
        summary: 'Negligible convective activity; parched soils across the Deccan hinterland.',
        keyStations: [
          { name: 'Arma Konda', type: 'CREST', lat: 18.80, lon: 83.00, elevationM: 1680, regimeRainfallMmDay: 10, notes: 'Dry spell conditions' },
        ],
      },
      ARAVALLI_RANGE: {
        froudeNumber: 0.8,
        isFlowBlocked: true,
        liftCondensationLevelM: 1800,
        windwardRainMmDay: 6,
        leewardRainMmDay: 1,
        rainShadowDeficitPct: 83.3,
        foehnHeatingDeltaC: 2.2,
        orographicEfficiencyPct: 8,
        summary: 'Desert conditions expand eastward; extreme soil moisture deficit and heatwave episodes.',
        keyStations: [
          { name: 'Mount Abu', type: 'CREST', lat: 24.59, lon: 72.71, elevationM: 1220, regimeRainfallMmDay: 8, notes: 'Dry reservoir levels' },
        ],
      },
    },
  },
];
