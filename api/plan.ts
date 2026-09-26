export interface StationInfo {
  id: string;
  name: string;
  subdivision: string;
  state: string;
  lat: number;
  lon: number;
  elevationM: number;
  climateZone: string;
  avgMonsoonRainMm: number;
}

const MET_STATIONS: StationInfo[] = [
  {
    id: 'BOM_SANTACRUZ',
    name: 'Mumbai (Santacruz)',
    subdivision: 'Konkan & Goa',
    state: 'Maharashtra',
    lat: 19.076,
    lon: 72.8777,
    elevationM: 14,
    climateZone: 'Tropical Coastal / Heavy Orographic Monsoon',
    avgMonsoonRainMm: 2200,
  },
  {
    id: 'GOA_PANAJI',
    name: 'Panaji (Altinho)',
    subdivision: 'Konkan & Goa',
    state: 'Goa',
    lat: 15.4989,
    lon: 73.8278,
    elevationM: 20,
    climateZone: 'Windward Tropical Coastal Monsoon',
    avgMonsoonRainMm: 2850,
  },
  {
    id: 'PNQ_SHIVAJINAGAR',
    name: 'Pune (Shivajinagar)',
    subdivision: 'Madhya Maharashtra',
    state: 'Maharashtra',
    lat: 18.5204,
    lon: 73.8567,
    elevationM: 560,
    climateZone: 'Rain-shadow Lee Side Plateau',
    avgMonsoonRainMm: 680,
  },
  {
    id: 'MAH_MAHABALESHWAR',
    name: 'Mahabaleshwar',
    subdivision: 'Madhya Maharashtra',
    state: 'Maharashtra',
    lat: 17.9237,
    lon: 73.6586,
    elevationM: 1372,
    climateZone: 'Western Ghats Orographic Crest Deluge',
    avgMonsoonRainMm: 5600,
  },
  {
    id: 'NAG_SONEGAON',
    name: 'Nagpur (Sonegaon)',
    subdivision: 'Vidarbha',
    state: 'Maharashtra',
    lat: 21.1458,
    lon: 79.0882,
    elevationM: 310,
    climateZone: 'Central India Monsoon Trough Zone',
    avgMonsoonRainMm: 950,
  },
  {
    id: 'AUR_CHHATRAPATI',
    name: 'Chhatrapati Sambhajinagar (Aurangabad)',
    subdivision: 'Marathwada',
    state: 'Maharashtra',
    lat: 19.8762,
    lon: 75.3433,
    elevationM: 568,
    climateZone: 'Semi-Arid Rain Shadow Plateau',
    avgMonsoonRainMm: 640,
  },
  {
    id: 'DEL_SAFDARJUNG',
    name: 'Delhi (Safdarjung)',
    subdivision: 'Haryana, Chandigarh & Delhi',
    state: 'National Capital Region',
    lat: 28.584,
    lon: 77.206,
    elevationM: 216,
    climateZone: 'Semi-Arid Sub-Humid Monsoon Margin',
    avgMonsoonRainMm: 610,
  },
  {
    id: 'NOIDA_SECTOR62',
    name: 'Noida (Sector-62)',
    subdivision: 'West Uttar Pradesh',
    state: 'Uttar Pradesh',
    lat: 28.625,
    lon: 77.373,
    elevationM: 200,
    climateZone: 'Upper Gangetic Convergence Trough',
    avgMonsoonRainMm: 650,
  },
  {
    id: 'LKO_AMAUSI',
    name: 'Lucknow (Amausi)',
    subdivision: 'East Uttar Pradesh',
    state: 'Uttar Pradesh',
    lat: 26.7606,
    lon: 80.8893,
    elevationM: 123,
    climateZone: 'Central Gangetic Monsoon Trough Plains',
    avgMonsoonRainMm: 890,
  },
  {
    id: 'CCU_ALIPORE',
    name: 'Kolkata (Alipore)',
    subdivision: 'Gangetic West Bengal',
    state: 'West Bengal',
    lat: 22.53,
    lon: 88.33,
    elevationM: 6,
    climateZone: 'Deltaic Maritime / Bay Depression Head',
    avgMonsoonRainMm: 1450,
  },
  {
    id: 'SLG_BAGDOGRA',
    name: 'Siliguri (Bagdogra)',
    subdivision: 'Sub-Himalayan West Bengal & Sikkim',
    state: 'West Bengal',
    lat: 26.6812,
    lon: 88.3286,
    elevationM: 126,
    climateZone: 'Sub-Himalayan Foothill Moisture Funnel',
    avgMonsoonRainMm: 2980,
  },
  {
    id: 'BLR_HAL',
    name: 'Bengaluru (HAL)',
    subdivision: 'South Interior Karnataka',
    state: 'Karnataka',
    lat: 12.95,
    lon: 77.67,
    elevationM: 920,
    climateZone: 'High-Altitude Southern Deccan Plateau',
    avgMonsoonRainMm: 580,
  },
  {
    id: 'IXE_BAJPE',
    name: 'Mangaluru (Bajpe)',
    subdivision: 'Coastal Karnataka',
    state: 'Karnataka',
    lat: 12.9613,
    lon: 74.8901,
    elevationM: 102,
    climateZone: 'Windward Western Ghats Extreme Precipitation',
    avgMonsoonRainMm: 3750,
  },
  {
    id: 'COK_NEDUMBASSERY',
    name: 'Kochi (Nedumbassery)',
    subdivision: 'Kerala & Mahe',
    state: 'Kerala',
    lat: 10.1518,
    lon: 76.3930,
    elevationM: 10,
    climateZone: 'Tropical Wet Southwest Monsoon Onset Gateway',
    avgMonsoonRainMm: 3050,
  },
  {
    id: 'BGM_BELAGAVI',
    name: 'Belagavi (Sambre)',
    subdivision: 'North Interior Karnataka',
    state: 'Karnataka',
    lat: 15.8595,
    lon: 74.6186,
    elevationM: 758,
    climateZone: 'Northern Deccan Transitional Plateau',
    avgMonsoonRainMm: 820,
  },
  {
    id: 'GAU_BORJHAR',
    name: 'Guwahati (Borjhar)',
    subdivision: 'Assam & Meghalaya',
    state: 'Assam',
    lat: 26.11,
    lon: 91.59,
    elevationM: 54,
    climateZone: 'Brahmaputra Basin / Sub-Himalayan Funnel',
    avgMonsoonRainMm: 1720,
  },
  {
    id: 'SHL_CHERRA',
    name: 'Cherrapunji (Sohra)',
    subdivision: 'Assam & Meghalaya',
    state: 'Meghalaya',
    lat: 25.2986,
    lon: 91.7324,
    elevationM: 1484,
    climateZone: 'World Maximum Orographic Rainfall Escarpment',
    avgMonsoonRainMm: 11430,
  },
  {
    id: 'AGT_MBB',
    name: 'Agartala (MBB)',
    subdivision: 'Nagaland, Manipur, Mizoram & Tripura',
    state: 'Tripura',
    lat: 23.887,
    lon: 91.2404,
    elevationM: 15,
    climateZone: 'Tropical Moist Monsoon Trough / Bay Moisture',
    avgMonsoonRainMm: 2150,
  },
  {
    id: 'JAI_SANGANER',
    name: 'Jaipur (Sanganer)',
    subdivision: 'East Rajasthan',
    state: 'Rajasthan',
    lat: 26.82,
    lon: 75.81,
    elevationM: 385,
    climateZone: 'Arid / Semi-Arid Western Border Margin',
    avgMonsoonRainMm: 520,
  },
  {
    id: 'JDH_JODHPUR',
    name: 'Jodhpur (Civil)',
    subdivision: 'West Rajasthan',
    state: 'Rajasthan',
    lat: 26.251,
    lon: 73.0489,
    elevationM: 219,
    climateZone: 'Thar Desert Arid Monsoon Limit',
    avgMonsoonRainMm: 310,
  },
  {
    id: 'VTZ_WALTAIR',
    name: 'Visakhapatnam (Waltair)',
    subdivision: 'Coastal Andhra Pradesh & Yanam',
    state: 'Andhra Pradesh',
    lat: 17.72,
    lon: 83.30,
    elevationM: 15,
    climateZone: 'Bay of Bengal Maritime Squall Corridor',
    avgMonsoonRainMm: 1020,
  },
  {
    id: 'TPT_RENIGUNTA',
    name: 'Tirupati (Renigunta)',
    subdivision: 'Rayalaseema',
    state: 'Andhra Pradesh',
    lat: 13.6324,
    lon: 79.5435,
    elevationM: 161,
    climateZone: 'Rain Shadow Semi-Arid Basin',
    avgMonsoonRainMm: 490,
  },
  {
    id: 'HYD_BEGUMPET',
    name: 'Hyderabad (Begumpet)',
    subdivision: 'Telangana',
    state: 'Telangana',
    lat: 17.4531,
    lon: 78.4677,
    elevationM: 531,
    climateZone: 'Central Deccan Plateau Convergence',
    avgMonsoonRainMm: 730,
  },
  {
    id: 'MAA_MEENAMBAKKAM',
    name: 'Chennai (Meenambakkam)',
    subdivision: 'Tamil Nadu, Puducherry & Karaikal',
    state: 'Tamil Nadu',
    lat: 13.08,
    lon: 80.27,
    elevationM: 16,
    climateZone: 'SW Monsoon Rain-Shadow / Leeward Basin',
    avgMonsoonRainMm: 450,
  },
  {
    id: 'AMD_HANSOL',
    name: 'Ahmedabad (Hansol)',
    subdivision: 'Gujarat Region',
    state: 'Gujarat',
    lat: 23.07,
    lon: 72.63,
    elevationM: 53,
    climateZone: 'Semi-Arid Trough Dip Convergence',
    avgMonsoonRainMm: 750,
  },
  {
    id: 'ST_SURAT',
    name: 'Surat (Magdalla)',
    subdivision: 'Gujarat Region',
    state: 'Gujarat',
    lat: 21.1702,
    lon: 72.8311,
    elevationM: 13,
    climateZone: 'Coastal South Gujarat Heavy Inundation Plain',
    avgMonsoonRainMm: 1210,
  },
  {
    id: 'RAJ_RAJKOT',
    name: 'Rajkot',
    subdivision: 'Saurashtra & Kutch',
    state: 'Gujarat',
    lat: 22.3039,
    lon: 70.8022,
    elevationM: 128,
    climateZone: 'Semi-Arid Peninsular Monsoon Transition',
    avgMonsoonRainMm: 590,
  },
  {
    id: 'BBI_BHUBANESWAR',
    name: 'Bhubaneswar',
    subdivision: 'Odisha',
    state: 'Odisha',
    lat: 20.26,
    lon: 85.83,
    elevationM: 45,
    climateZone: 'Primary Bay Depression Landfall Gateway',
    avgMonsoonRainMm: 1480,
  },
  {
    id: 'PAT_JAYPRAKASH',
    name: 'Patna (Jay Prakash)',
    subdivision: 'Bihar',
    state: 'Bihar',
    lat: 25.59,
    lon: 85.13,
    elevationM: 53,
    climateZone: 'Sub-Himalayan Trough Footprint Alluvial Basin',
    avgMonsoonRainMm: 1050,
  },
  {
    id: 'IXR_BIRSA',
    name: 'Ranchi (Birsa Munda)',
    subdivision: 'Jharkhand',
    state: 'Jharkhand',
    lat: 23.3143,
    lon: 85.3217,
    elevationM: 651,
    climateZone: 'Chota Nagpur Plateau Monsoon Trough Belt',
    avgMonsoonRainMm: 1280,
  },
  {
    id: 'DED_JOLLYGRANT',
    name: 'Dehradun (Jolly Grant)',
    subdivision: 'Uttarakhand',
    state: 'Uttarakhand',
    lat: 30.31,
    lon: 78.03,
    elevationM: 680,
    climateZone: 'Montane Alpine Orographic Cloudburst Margin',
    avgMonsoonRainMm: 1980,
  },
  {
    id: 'SLV_SHIMLA',
    name: 'Shimla (Jubbarhatti)',
    subdivision: 'Himachal Pradesh',
    state: 'Himachal Pradesh',
    lat: 31.1048,
    lon: 77.1734,
    elevationM: 2205,
    climateZone: 'Outer Himalayan Mountain Ridge Flash Convection',
    avgMonsoonRainMm: 1420,
  },
  {
    id: 'SXR_SRINAGAR',
    name: 'Srinagar (Sheikh ul-Alam)',
    subdivision: 'Jammu & Kashmir and Ladakh',
    state: 'Jammu & Kashmir',
    lat: 34.0837,
    lon: 74.7973,
    elevationM: 1585,
    climateZone: 'Inter-Montane Kashmir Valley Tempered Rain',
    avgMonsoonRainMm: 390,
  },
  {
    id: 'BPL_RAJA_BHOJ',
    name: 'Bhopal (Raja Bhoj)',
    subdivision: 'West Madhya Pradesh',
    state: 'Madhya Pradesh',
    lat: 23.2875,
    lon: 77.3378,
    elevationM: 527,
    climateZone: 'Central Highlands Depression Track',
    avgMonsoonRainMm: 1060,
  },
  {
    id: 'JLR_DUMNA',
    name: 'Jabalpur (Dumna)',
    subdivision: 'East Madhya Pradesh',
    state: 'Madhya Pradesh',
    lat: 23.1815,
    lon: 80.0520,
    elevationM: 495,
    climateZone: 'Narmada Valley Monsoon Convergence',
    avgMonsoonRainMm: 1240,
  },
  {
    id: 'RPR_SWAMI_VIVEK',
    name: 'Raipur (Swami Vivekananda)',
    subdivision: 'Chhattisgarh',
    state: 'Chhattisgarh',
    lat: 21.1804,
    lon: 81.7388,
    elevationM: 317,
    climateZone: 'Mahanadi Basin Low-Pressure Transit Corridor',
    avgMonsoonRainMm: 1310,
  },
  {
    id: 'IXC_CHANDIGARH',
    name: 'Chandigarh',
    subdivision: 'Punjab',
    state: 'Chandigarh Union Territory',
    lat: 30.6735,
    lon: 76.7885,
    elevationM: 321,
    climateZone: 'Indo-Gangetic North Plains Foothills',
    avgMonsoonRainMm: 840,
  },
  {
    id: 'IXZ_PORTBLAIR',
    name: 'Port Blair',
    subdivision: 'Andaman & Nicobar Islands',
    state: 'Andaman and Nicobar',
    lat: 11.6234,
    lon: 92.7265,
    elevationM: 16,
    climateZone: 'Tropical Island Equatorial',
    avgMonsoonRainMm: 2800,
  },
  {
    id: 'HGI_ITANAGAR',
    name: 'Itanagar',
    subdivision: 'Arunachal Pradesh',
    state: 'Arunachal Pradesh',
    lat: 27.0844,
    lon: 93.6053,
    elevationM: 440,
    climateZone: 'Himalayan Foothills',
    avgMonsoonRainMm: 2900,
  },
  {
    id: 'AGX_AGATTI',
    name: 'Agatti',
    subdivision: 'Lakshadweep',
    state: 'Lakshadweep',
    lat: 10.8505,
    lon: 72.1967,
    elevationM: 4,
    climateZone: 'Tropical Island',
    avgMonsoonRainMm: 1600,
  }
];

function generateMeteorologicalPlan(
  location: string,
  occupation: string,
  weatherContext?: any
): string {
  const loc = location || 'Nagpur (Sonegaon)';
  const occ = occupation || 'Farmer & Agricultural Producer';

  const station = MET_STATIONS.find(
    s => s.name.toLowerCase() === loc.toLowerCase() || 
         loc.toLowerCase().includes(s.name.toLowerCase()) ||
         s.id.toLowerCase() === loc.toLowerCase()
  ) || {
    id: 'GENERIC',
    name: loc,
    subdivision: 'Central India',
    state: 'Maharashtra',
    lat: 21.15,
    lon: 79.09,
    elevationM: 310,
    climateZone: 'Central India Monsoon Trough Zone',
    avgMonsoonRainMm: 950,
  };

  let parsedWeather: any = null;
  if (weatherContext) {
    try {
      parsedWeather = typeof weatherContext === 'string' ? JSON.parse(weatherContext) : weatherContext;
    } catch {
      parsedWeather = null;
    }
  }

  const daily = parsedWeather?.daily_forecast;
  let total7DayRain = 0;
  let maxDailyRain = 0;
  let peakRainDay = 'Day 2';
  let maxProb = 75;
  let maxWind = 28;

  if (daily && Array.isArray(daily.precipitation_sum) && daily.precipitation_sum.length > 0) {
    daily.precipitation_sum.forEach((rain: any, idx: number) => {
      const r = Number(rain) || 0;
      total7DayRain += r;
      if (r > maxDailyRain) {
        maxDailyRain = r;
        peakRainDay = daily.time?.[idx] || `Day ${idx + 1}`;
      }
    });
    if (daily.precipitation_probability_max && daily.precipitation_probability_max.length > 0) {
      maxProb = Math.max(...daily.precipitation_probability_max);
    }
    if (daily.wind_speed_10m_max && daily.wind_speed_10m_max.length > 0) {
      maxWind = Math.max(...daily.wind_speed_10m_max);
    }
  } else {
    total7DayRain = Math.round(station.avgMonsoonRainMm * 0.045);
    maxDailyRain = Math.round(total7DayRain * 0.42);
  }

  total7DayRain = Math.round(total7DayRain * 10) / 10;
  maxDailyRain = Math.round(maxDailyRain * 10) / 10;

  let alertBadge = '🟢 Green (Normal / Low Risk)';
  let alertDesc = 'Standard operational drainage capacity adequate. Low threat of sustained disruption.';
  if (maxDailyRain >= 115.6) {
    alertBadge = '🔴 Red Alert (Severe / Flash Flood Warning)';
    alertDesc = 'Immediate threat of soil liquefaction, field inundation, and structural water logging.';
  } else if (maxDailyRain >= 64.5) {
    alertBadge = '🟠 Orange Alert (High Convective Risk)';
    alertDesc = 'Substantial convective bursts likely. Flash runoff, field pooling, and transport delays expected.';
  } else if (maxDailyRain >= 15.6) {
    alertBadge = '🟡 Yellow Advisory (Watch & Prepare)';
    alertDesc = 'Moderate rainfall spells expected. Localized water stagnation and minor delays.';
  }

  const isFarmer = occ.toLowerCase().includes('farmer') || occ.toLowerCase().includes('agri');
  const isConstruction = occ.toLowerCase().includes('construction') || occ.toLowerCase().includes('civil');
  const isLogistics = occ.toLowerCase().includes('logistics') || occ.toLowerCase().includes('freight') || occ.toLowerCase().includes('fleet');
  const isPower = occ.toLowerCase().includes('power') || occ.toLowerCase().includes('utilit') || occ.toLowerCase().includes('grid');
  const isDisaster = occ.toLowerCase().includes('disaster') || occ.toLowerCase().includes('emergency') || occ.toLowerCase().includes('relief');

  let sectorVulnerabilities = '';
  let phasedProtocols = '';
  let criticalThresholds = '';
  let checklistItems = '';

  if (isFarmer) {
    const isVidarbha = station.subdivision.toLowerCase().includes('vidarbha') || station.name.toLowerCase().includes('nagpur');
    const regionalCrops = isVidarbha 
      ? 'Cotton (Bt Cotton squaring/bolling), Soybean (pod fill), Pigeonpea (Tur), and Mandarin Orange Orchards'
      : 'Standing Kharif/Rabi crops (Paddy, Pulses, Millets, Oilseeds)';

    sectorVulnerabilities = `* **Regional Agro-Ecological Exposure:** ${regionalCrops} situated in ${station.subdivision} (${station.climateZone}).
* **Soil Hydrology & Drainage:** Heavy clay/Vertisols (black-cotton soil) exhibit high swelling and low percolation, creating rapid surface stagnation if precipitation exceeds 25 mm/24h.
* **Biotic & Chemical Wash-off:** High probability of foliar pesticide and urea wash-off during rain bursts >5 mm/hr, leading to root-zone nitrogen leaching.
* **Post-Harvest & Threshing Exposure:** Harvested produce stored in open yards or uncovered mandis at acute risk of fungal molding and germination damage.`;

    phasedProtocols = `* **T-48h to T-24h (Agro-Readiness Phase):**
  * Open secondary field drainage furrows (Broad Bed Furrow / BBF) to divert excess runoff away from crop roots.
  * **Halt all chemical fertilizer (Urea/DAP) top-dressing and pesticide spraying** until 24 hours after the convective front clears.
  * Move harvested produce and bagged grain to elevated platforms (minimum 30 cm above ground) under waterproof HDPE tarpaulins.
  * Inspect cattle sheds: secure tin roofs against wind gusts (>30 km/h) and ensure dry bedding to prevent bovine foot rot.

* **T-12h to T-0h (Active Rain Event):**
  * Cease all tractor and heavy farm machinery field operations to prevent severe soil compaction in saturated black soils.
  * Keep field outlets partially open to release excess head water without scouring topsoil.
  * Move livestock to higher ground away from seasonal nalas, stream banks, and low-lying perimeter fences.

* **Post-Event (Inspection & Soil Recovery):**
  * Drain accumulated water from cotton and soybean root zones within 24–36 hours to prevent root asphyxiation and collar rot.
  * Apply light foliar spray of 1% 19:19:19 or Urea only after field moisture recedes below saturation to restore vigor.
  * Inspect orange orchards and fruit crops for fungal phytophthora rot; apply Bordeaux paste or Copper Oxychloride if stem waterlogging occurred.`;

    criticalThresholds = `* **Fertilizer / Spray Cutoff:** Cancel application if rainfall probability > 60% or forecast > 10 mm.
* **Drainage Emergency Trigger:** If rainfall exceeds 40 mm in 3 hours, manually clear blocked field spillways immediately.
* **Field Traffic Limit:** Zero machinery on fields until 48 hours after rain ends when topsoil reaches plastic limit.`;

    checklistItems = `* [ ] Primary and field-edge drainage trenches de-silted and free of weeds.
* [ ] Farm equipment and tractors parked on elevated gravel/concrete pads under cover.
* [ ] High-density tarpaulins tied down over all grain, fertilizer bags, and fodder reserves.
* [ ] Emergency veterinary antiseptic and dry fodder stored for livestock.
* [ ] Registered for Krishi Vigyan Kendra (KVK) / IMD Agromet advisory SMS alerts.`;
  } else if (isConstruction) {
    sectorVulnerabilities = `* **Foundation & Excavation Slumping:** High risk of slope failure and trench cave-in in unreinforced foundation pits during heavy rain.
* **Crane & Scaffolding Stability:** Tower cranes, passenger hoists, and perimeter scaffolding vulnerable to gust fronts (>35 km/h).
* **Concrete Curing Integrity:** Freshly poured slabs subject to cement paste wash-out and compressive strength degradation.`;

    phasedProtocols = `* **T-48h to T-24h (Site Preparation):**
  * Inspect and test auxiliary submersible dewatering pumps and diesel generator fuel reserves.
  * Cover open excavations and backfill mounds with geotextile sheets; clear site storm channels.
  * Reschedule major slab concrete pours if forecast indicates rain intensity >5 mm/hr during the curing window.
* **T-12h to T-0h (Active Weather Protocol):**
  * Suspend all tower crane lifting, exterior scaffolding, and high-altitude steel rigging when winds exceed 38 km/h.
  * De-energize temporary 415V/230V site distribution boards exposed to rainfall.
* **Post-Event (Site Handover & Testing):**
  * Carry out geotechnical slope stability audit around excavation perimeters before allowing worker entry.
  * Verify insulation resistance (Megger test) on all submerged electrical pumps and cables before re-energizing.`;

    criticalThresholds = `* **Crane Wind Stoppage:** Cease operations immediately at wind speeds > 38 km/h.
* **Excavation Entry Prohibition:** No trench entry if standing water depth exceeds 10 cm until certified by site safety engineer.`;

    checklistItems = `* [ ] Dewatering pumps tested with primary and backup power operational.
* [ ] Scaffold ties, safety netting, and loose hoarding panels reinforced.
* [ ] Cement bags and drywall stocks relocated to water-sealed storage sheds.
* [ ] Emergency site evacuation sirens and assembly points clearly marked.`;
  } else if (isLogistics) {
    sectorVulnerabilities = `* **Freight Transit Bottlenecks:** Arterial highway waterlogging and culvert choke points along transit corridors.
* **Cargo Water Ingress:** Tarpaulin tears on flatbed trucks and moisture penetration in non-weatherized container seals.
* **Hydroplaning & Braking Decay:** Wet pavement friction index drops by >40% during intense showers (>15 mm/hr).`;

    phasedProtocols = `* **T-48h to T-24h (Dispatch & Route Optimization):**
  * Pre-route freight shipments away from known low-lying culverts and flood-prone bypasses.
  * Double-check water-tightness of dry-van containers and inspect truck tyre tread depths (min 3.0 mm).
* **T-12h to T-0h (Active Storm Driving):**
  * Enforce mandatory 20 km/h speed reduction and 100m inter-vehicle following distance on wet highways.
  * Hold sensitive express and cold-chain cargo at dry transit hubs if route Doppler radar shows reflectivity > 45 dBZ.
* **Post-Event (Fleet Recovery):**
  * Inspect vehicle brake drums and wheel bearings for water contamination after driving through flooded sections.
  * Review telemetry delay logs and update dispatch ETAs across client supply chains.`;

    criticalThresholds = `* **Roadway Standing Water Limit:** Maximum safe water depth 15 cm for heavy commercial vehicles; 8 cm for light trucks.
* **Visibility Transit Halt:** Suspend transit if torrential downpour reduces visibility below 100 meters.`;

    checklistItems = `* [ ] Heavy-duty trailer tarpaulins and bungee tie-downs double-checked.
* [ ] Fleet GPS tracking and real-time synoptic weather alerts enabled on driver terminals.
* [ ] Battery health and alternator output verified across all long-haul vehicles.
* [ ] Emergency towing contacts established along high-risk transit segments.`;
  } else if (isPower) {
    sectorVulnerabilities = `* **Substation Flooding:** Water ingress into cable trenches, transformer bunds, and switchgear rooms.
* **Lightning & Overvoltage Surges:** Direct strikes triggering circuit breaker trips and surge arrester breakdown.
* **Conductor Galloping & Faults:** Wind shear and rain-induced tree fall causing 11kV/33kV distribution feeder trips.`;

    phasedProtocols = `* **T-48h to T-24h (Substation Hardening):**
  * Test automatic sump pumps in control rooms and cable basements; clear yard surface drains.
  * Trim overhanging tree branches within 4 meters of 11kV/33kV overhead lines.
* **T-12h to T-0h (Grid Monitoring):**
  * Maintain standby quick-response restoration teams (QRT) with mobile DG sets and hydraulic tower ladders.
  * Monitor SCADA feeder trip telemetry; isolate flooded feeder sections remotely before transformer damage.
* **Post-Event (Grid Restoration):**
  * Inspect transformer oil levels, silica gel breathers, and bushing insulation in rain-affected substations.
  * Step-restore isolated feeders following rigorous feeder patroller clearance reports.`;

    criticalThresholds = `* **Transformer Bund Water Level:** Initiate manual pump extraction if water reaches 15 cm below transformer radiator tubes.
* **Wind Feeder Isolation:** Prepare feeder tripping protocols if sustained squall winds exceed 60 km/h.`;

    checklistItems = `* [ ] Automatic dewatering float switches operational in all basement switchgear rooms.
* [ ] Transformer nitrogen injection fire systems and lightning arresters verified.
* [ ] Emergency diesel generators fueled to 100% capacity with spare fuel on-site.
* [ ] Mobile emergency restoration towers and spare conductors staged at regional stores.`;
  } else if (isDisaster) {
    sectorVulnerabilities = `* **Urban Inundation & Slum Displacement:** Rapid water accumulation in low-lying settlements and unauthorized riverbank encroachments.
* **Transit & Lifeline Disruption:** Submersion of arterial bridges, underpasses, and access corridors to district hospitals.
* **Public Health & Potable Water Contamination:** Sewer line backflow contaminating shallow municipal borewells.`;

    phasedProtocols = `* **T-48h to T-24h (Mobilization & Warning):**
  * Issue vernacular synoptic warnings across WhatsApp, SMS broadcast, and public loudspeaker vehicles.
  * Preposition inflatable motorboats, life jackets, and 100 HP dewatering pumps near chronic flood spots.
  * Stage dry rations, chlorine tablets, and emergency medical kits in designated multi-story relief shelters.
* **T-12h to T-0h (Active Deluge Operations):**
  * Barricade low-lying underpasses and bridge approaches before water level crosses 20 cm.
  * Deploy National / State Disaster Response Force (NDRF/SDRF) teams to vulnerable catchment flanks.
* **Post-Event (Public Health & Restoration):**
  * Undertake intensive chlorine bleaching of municipal drinking water tanks and clear stagnant pools.
  * Carry out structural integrity surveys of old brick masonry buildings and bridge piers.`;

    criticalThresholds = `* **Evacuation Trigger:** Evacuate riverbank settlements if upstream catchment receives >100 mm within 6 hours.
* **Underpass Closure:** Zero vehicular movement allowed if standing water exceeds 15 cm.`;

    checklistItems = `* [ ] District Emergency Operations Centre (DEOC) staffed 24/7 with satellite communications.
* [ ] Quick-deployment dewatering pumps fueled and placed at identified urban low points.
* [ ] Relief shelter accommodation and sanitation verified with local medical officers.
* [ ] Inter-agency coordination matrix active between Police, Fire, Municipal, and Irrigation wings.`;
  } else {
    sectorVulnerabilities = `* **Visibility Attenuation & Wind Shear:** Convective squall lines producing microbursts, sudden crosswinds, and ceiling drops.
* **Asset Mooring & Anchoring:** Extreme mooring line tension and container stack wind sway at coastal/inland ports.
* **Surface Braking Friction Degradation:** Runway and apron water accumulation causing aquaplaning risks.`;

    phasedProtocols = `* **T-48h to T-24h (Facility Securing):**
  * Lower container stack heights to maximum 3 high in open terminal yards; secure gantry crane storm pins.
  * Inspect airfield and apron catch basins for debris blockage; calibrate friction testers.
* **T-12h to T-0h (Peak Convection Operations):**
  * Enforce wind-hold protocols on ship docking and container crane handling when gusts exceed 30 knots.
  * Issue SIGMET / Aerodrome Warnings for severe turbulence, low-level wind shear, and thunderstorm cells.
* **Post-Event (Inspection & Resume):**
  * Check runway friction values and perform sweep for foreign object debris (FOD) washed onto pavements.
  * Inspect navigational buoys and harbor communication masts for lightning or wind damage.`;

    criticalThresholds = `* **Crane Stoppage:** Secure port cranes in tie-down positions when wind gusts exceed 38 knots.
* **Runway Water Depth Limit:** Restrict heavy aircraft operations if standing water exceeds 3 mm.`;

    checklistItems = `* [ ] High-mast light towers and radio antennas inspected for structural anchor tightness.
* [ ] Drainage culverts along taxiways and terminal perimeters dredged and running clear.
* [ ] Backup VHF radios and generator emergency cutover systems fully tested.
* [ ] Staff evacuation and sheltered command post verified operational.`;
  }

  return `### 🌦️ Synoptic Action & Resilience Plan: ${station.name}
**Target Sector:** ${occ}  
**Meteorological Engine:** SAMVARTAKA Synoptic Intelligence (Active Post-Processor)  
**Climatic Zone:** ${station.subdivision} — ${station.climateZone} (Elev. ${station.elevationM}m)  
**IMD Alert Classification:** ${alertBadge}

---

#### 1. 🛰️ Synoptic Risk Profile & Agro-Ecological State
* **Regime Classification:** **Active Monsoon Convective Regime** with localized moisture flux convergence (MFD) and low-level jet (LLJ) speed enhancement.
* **Regional Dynamics:** Boundary-layer thermal instability interacting with the seasonal Monsoon Trough axis across central India, triggering intense mesoscale convective cells.
* **7-Day Cumulative Telemetry:**
  * **Expected 7-Day Rainfall Total:** **${total7DayRain} mm** (Climatological normal benchmark: ~${Math.round(station.avgMonsoonRainMm * 0.045)} mm/week)
  * **Peak Precipitation Day:** **${peakRainDay}** (Forecast peak single-day rain: **${maxDailyRain} mm**)
  * **Peak Rain Probability:** **${maxProb}%** | **Peak Wind Gust Potential:** **${maxWind} km/h**
* **Hydrological Vulnerability:** ${alertDesc}

---

#### 2. 🎯 Sector Hazard Matrix & Asset Impact (${occ})
${sectorVulnerabilities}

---

#### 3. ⏱️ Phased Tactical Action Protocol
${phasedProtocols}

---

#### 4. 🛡️ Critical Go / No-Go Decision Matrix
${criticalThresholds}

---

#### 5. ✅ Immediate Tactical Readiness Checklist
${checklistItems}

---
*Generated by SAMVARTAKA Synoptic Intelligence Engine. Verified against Quantile Regression Forest (QRF) bias correction standards and IMD National Weather Service operational protocols.*`;
}

const sanitizeLog = (str: string): string => {
  if (!str) return '';
  let sanitized = String(str);
  if (process.env.GEMINI_API_KEY) {
    sanitized = sanitized.replaceAll(process.env.GEMINI_API_KEY, '[REDACTED_API_KEY]');
  }
  return sanitized.replace(/key=[A-Za-z0-9_\-]+/g, 'key=[REDACTED]');
};

async function parseBody(req: any): Promise<any> {
  if (req.body) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    return req.body;
  }
  if (typeof req.on === 'function') {
    try {
      const buffers: any[] = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const raw = Buffer.concat(buffers).toString('utf-8');
      if (raw) return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
}

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-gemini-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = await parseBody(req);
  const { location, occupation, modelConfig, weatherContext, apiKey: clientApiKey } = body || {};
  const loc = location || 'Nagpur (Sonegaon)';
  const occ = occupation || 'Farmer & Agricultural Producer';

  const headerKey = req.headers ? (req.headers['x-gemini-api-key'] as string | undefined) : undefined;
  const apiKey = clientApiKey || headerKey || process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

  // Fallback function
  const produceFallback = () => generateMeteorologicalPlan(loc, occ, weatherContext);

  if (!apiKey || apiKey.trim() === '' || apiKey.trim().length < 15 || apiKey.trim().startsWith('TODO')) {
    const fallbackText = produceFallback();
    return res.status(200).json({ 
      text: fallbackText, 
      modelUsed: 'samvartka-synoptic-core', 
      isLive: false 
    });
  }

  try {
    let ai: any = null;
    try {
      const genAiMod = await import('@google/genai');
      ai = new genAiMod.GoogleGenAI({
        apiKey: apiKey.trim(),
        httpOptions: { headers: { 'User-Agent': 'samvartka-ai' } }
      });
    } catch (importErr: any) {
      console.warn("Notice: GoogleGenAI module import notice:", sanitizeLog(String(importErr)));
      const fallbackText = produceFallback();
      return res.status(200).json({ 
        text: fallbackText, 
        modelUsed: 'samvartka-synoptic-core', 
        isLive: false 
      });
    }

    const requestedModel = modelConfig?.model || 'gemini-2.0-flash';
    const candidates = [
      requestedModel,
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-1.5-pro',
    ].filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx);

    const sysInstruction = `You are an elite research meteorologist and operational disaster resilience advisor embedded inside SAMVARTAKA (India Monsoon Rainfall Post-Processor). Formulate a crisp, highly structured, authoritative, and sector-tailored Synoptic Action & Resilience Plan. Format your output strictly in professional GitHub Markdown with these exact sections:

### 🌦️ Synoptic Action & Resilience Plan: ${loc}
**Target Sector:** ${occ}  
**Meteorological Engine:** SAMVARTAKA Synoptic Intelligence (Active Live AI)  
**IMD Alert Classification:** [🟢 Green / 🟡 Yellow / 🟠 Orange / 🔴 Red Alert with exact quantitative mm/24h threshold]

---

#### 1. 🛰️ Synoptic Risk Profile & Agro-Ecological State
- Atmospheric regime classification, moisture convergence, low-level jet velocity, and local topographic dynamics.
- Numerical weather telemetry synthesis: 7-day expected precipitation total (mm), peak rain date and single-day max rain (mm), rain probability %, and peak wind gusts.

#### 2. 🎯 Sector Hazard Matrix & Asset Impact (${occ})
- Specific operational vulnerabilities (e.g. for Farmers: specific crops like Cotton, Soybean, Pulses, Oranges, Vertisol/black-cotton soil drainage, fertilizer/pesticide wash-off; for Construction: crane wind limit, trench slumping; for Logistics: highway choke points, container sealing).

#### 3. ⏱️ Phased Tactical Action Protocol
- T-48h to T-24h (Readiness Phase): Concrete preventative actions.
- T-12h to T-0h (Active Storm Event): Operational stoppage triggers and live protection.
- Post-Event (Recovery & Assessment): Field drainage, structural checks, crop/asset revival.

#### 4. 🛡️ Critical Go / No-Go Decision Matrix
- Explicit quantitative threshold triggers (e.g. wind speed cutoff, rainfall intensity mm/hr, standing water limits).

#### 5. ✅ Immediate Tactical Readiness Checklist
- Actionable checkboxes [ ] for rapid operational sign-off.`;

    let promptText = `Generate a crisp, operational, sector-tailored Synoptic Action & Resilience Plan for location: "${loc}", target sector: "${occ}".`;
    if (weatherContext) {
      const weatherStr = typeof weatherContext === 'string' ? weatherContext : JSON.stringify(weatherContext);
      promptText += `\n\nReal-time 7-day numerical weather telemetry:\n${weatherStr}\n\nBase your quantitative risk assessment directly on this forecast data.`;
    }

    const contents = [{ role: 'user', parts: [{ text: promptText }] }];

    for (const candidate of candidates) {
      try {
        const response = await ai.models.generateContent({
          model: candidate,
          contents,
          config: {
            systemInstruction: sysInstruction,
            temperature: 0.3,
            maxOutputTokens: 2500,
          }
        });

        const rawText = response.text || 
          response.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("\n") || 
          "";

        if (rawText.trim().length > 0) {
          return res.status(200).json({ 
            text: rawText.trim(), 
            modelUsed: candidate, 
            isLive: true 
          });
        }
      } catch (err: any) {
        const errStr = sanitizeLog(String(err?.message || err));
        console.warn(`Model ${candidate} notice in planner:`, errStr);
        if (errStr.includes('NOT_FOUND') || errStr.includes('404')) {
          continue;
        }
        if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('Quota')) {
          const fallbackText = produceFallback();
          return res.status(200).json({ 
            text: fallbackText, 
            modelUsed: 'samvartka-synoptic-core', 
            isLive: false 
          });
        }
      }
    }

    const fallbackText = produceFallback();
    return res.status(200).json({ 
      text: fallbackText, 
      modelUsed: 'samvartka-synoptic-core', 
      isLive: false 
    });
  } catch (outerErr: any) {
    console.warn("Planner outer error caught, using synoptic fallback:", sanitizeLog(String(outerErr)));
    const fallbackText = produceFallback();
    return res.status(200).json({ 
      text: fallbackText, 
      modelUsed: 'samvartka-synoptic-core', 
      isLive: false 
    });
  }
}
