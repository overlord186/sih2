import { RainfallDataPoint, StationMetadata, RainfallRegime } from '../types';
import {
  classifyRegime,
  applyGlobalBaseline,
  applyRegimeAwareCorrection,
} from '../ml/postProcessor';

export const MET_STATIONS: StationMetadata[] = [
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
  },
];

/**
 * Deterministic pseudo-random number generator for reproducible meteorological physics
 */
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Generate Multi-Year Monsoon Seasons:
 * - 2025 Operational Benchmark Season (June 1 - Sept 30, 2025)
 * - 2024 Recent Operational Benchmark (June 1 - Sept 30, 2024)
 * - 2023 Historical Benchmark (June 1 - Sept 30, 2023)
 */
function buildMonsoonDataset(): RainfallDataPoint[] {
  const points: RainfallDataPoint[] = [];
  const rng = seededRandom(26080); // Deterministic seed for scientific reproducibility

  const stationBaseClimate: Record<string, { rainScale: number; dryProb: number; heavyEvents2023: number[]; heavyEvents2024: number[]; heavyEvents2025: number[] }> = {
    BOM_SANTACRUZ: {
      rainScale: 32.0,
      dryProb: 0.22,
      heavyEvents2023: [24, 25, 26, 44, 52, 53, 54, 76, 77, 88], // Active July/August surges
      heavyEvents2024: [22, 23, 38, 48, 49, 56, 72, 73, 84, 114], // 2024 Mumbai extreme July deluge & late Sept surge
      heavyEvents2025: [21, 22, 27, 42, 43, 58, 64, 75, 89, 102], // 2025 High-intensity coastal orographic monsoon surges
    },
    GOA_PANAJI: {
      rainScale: 38.0,
      dryProb: 0.18,
      heavyEvents2023: [22, 23, 40, 51, 68, 75, 89],
      heavyEvents2024: [20, 36, 46, 54, 71, 82, 104],
      heavyEvents2025: [19, 25, 41, 57, 63, 74, 91],
    },
    PNQ_SHIVAJINAGAR: {
      rainScale: 9.5,
      dryProb: 0.45,
      heavyEvents2023: [25, 53, 77],
      heavyEvents2024: [54, 55, 78], // July 25, 2024 Pune Shivajinagar record cloudburst event (114mm)
      heavyEvents2025: [26, 52, 79, 86], // 2025 Western Ghats spillover convective episodes
    },
    MAH_MAHABALESHWAR: {
      rainScale: 58.0,
      dryProb: 0.08,
      heavyEvents2023: [15, 24, 35, 44, 52, 53, 62, 74, 88, 98],
      heavyEvents2024: [18, 22, 38, 48, 49, 56, 70, 72, 85, 102],
      heavyEvents2025: [16, 21, 28, 42, 59, 65, 75, 89, 105, 112],
    },
    NAG_SONEGAON: {
      rainScale: 15.0,
      dryProb: 0.35,
      heavyEvents2023: [32, 48, 65, 82], // Low pressure depression events
      heavyEvents2024: [28, 46, 68, 83, 91], // 2024 deep depression passages
      heavyEvents2025: [30, 31, 49, 66, 84, 98], // 2025 Bay of Bengal monsoon low-pressure corridor depressions
    },
    AUR_CHHATRAPATI: {
      rainScale: 9.0,
      dryProb: 0.48,
      heavyEvents2023: [28, 56, 80],
      heavyEvents2024: [32, 60, 84],
      heavyEvents2025: [27, 54, 81],
    },
    DEL_SAFDARJUNG: {
      rainScale: 11.0,
      dryProb: 0.58,
      heavyEvents2023: [38, 39, 40, 71], // Severe July 2023 Yamuna flood surge
      heavyEvents2024: [28, 62, 74, 90], // June 28, 2024 Delhi all-time 228mm deluge + Aug rain spells
      heavyEvents2025: [34, 45, 69, 70, 88], // 2025 Monsoon trough & Western Disturbance interaction episodes
    },
    NOIDA_SECTOR62: {
      rainScale: 11.0,
      dryProb: 0.58,
      heavyEvents2023: [38, 40, 72],
      heavyEvents2024: [28, 63, 75],
      heavyEvents2025: [34, 45, 70],
    },
    LKO_AMAUSI: {
      rainScale: 14.5,
      dryProb: 0.42,
      heavyEvents2023: [35, 48, 67, 85],
      heavyEvents2024: [31, 52, 70, 89],
      heavyEvents2025: [29, 46, 68, 84],
    },
    CCU_ALIPORE: {
      rainScale: 22.0,
      dryProb: 0.28,
      heavyEvents2023: [33, 49, 70, 86, 104], // Bay depression coastal inundation
      heavyEvents2024: [29, 47, 65, 82, 101], // 2024 Bay cyclonic circulation & deltaic rain bands
      heavyEvents2025: [25, 41, 62, 85, 96, 110], // 2025 deep depression landfall surges
    },
    SLG_BAGDOGRA: {
      rainScale: 36.0,
      dryProb: 0.16,
      heavyEvents2023: [19, 32, 47, 61, 79, 95],
      heavyEvents2024: [16, 30, 45, 59, 76, 91, 108],
      heavyEvents2025: [18, 28, 43, 62, 77, 93, 105],
    },
    BLR_HAL: {
      rainScale: 8.5,
      dryProb: 0.52,
      heavyEvents2023: [30, 60, 92], // Peninsular convergence line storms
      heavyEvents2024: [35, 71, 95, 108], // 2024 Bengaluru urban flash convective downpours
      heavyEvents2025: [28, 59, 87, 105], // 2025 Southern shear zone episodes
    },
    IXE_BAJPE: {
      rainScale: 46.0,
      dryProb: 0.12,
      heavyEvents2023: [18, 26, 39, 48, 56, 68, 79, 92],
      heavyEvents2024: [16, 24, 37, 45, 54, 69, 81, 100],
      heavyEvents2025: [15, 22, 36, 44, 58, 66, 78, 95],
    },
    COK_NEDUMBASSERY: {
      rainScale: 42.0,
      dryProb: 0.14,
      heavyEvents2023: [1, 2, 15, 28, 42, 55, 69, 82],
      heavyEvents2024: [1, 3, 18, 31, 44, 57, 72, 86],
      heavyEvents2025: [1, 2, 16, 29, 43, 58, 70, 85],
    },
    BGM_BELAGAVI: {
      rainScale: 12.0,
      dryProb: 0.40,
      heavyEvents2023: [24, 45, 68, 86],
      heavyEvents2024: [22, 48, 71, 90],
      heavyEvents2025: [20, 44, 69, 87],
    },
    GAU_BORJHAR: {
      rainScale: 26.0,
      dryProb: 0.20,
      heavyEvents2023: [18, 19, 36, 50, 64, 80], // Northeast funneling heavy monsoonal spells
      heavyEvents2024: [15, 32, 44, 60, 78, 92], // 2024 Brahmaputra basin riverine flood surges
      heavyEvents2025: [16, 28, 48, 63, 76, 94, 106], // 2025 Sub-Himalayan orographic & riverine deluge
    },
    SHL_CHERRA: {
      rainScale: 85.0,
      dryProb: 0.04,
      heavyEvents2023: [10, 18, 25, 34, 42, 51, 60, 72, 81, 90, 102],
      heavyEvents2024: [12, 19, 28, 36, 45, 54, 63, 75, 84, 94, 105],
      heavyEvents2025: [11, 20, 29, 38, 47, 56, 65, 77, 86, 96, 108],
    },
    AGT_MBB: {
      rainScale: 28.0,
      dryProb: 0.24,
      heavyEvents2023: [20, 38, 54, 72, 89],
      heavyEvents2024: [18, 35, 52, 70, 87],
      heavyEvents2025: [19, 34, 50, 69, 86],
    },
    JAI_SANGANER: {
      rainScale: 9.0,
      dryProb: 0.64,
      heavyEvents2023: [42, 68], // Western semi-arid episodic monsoon surges
      heavyEvents2024: [39, 64, 85], // 2024 intense isolated desert cloudbursts
      heavyEvents2025: [36, 61, 82], // 2025 Aravalli ridge convective triggers
    },
    JDH_JODHPUR: {
      rainScale: 5.5,
      dryProb: 0.76,
      heavyEvents2023: [45, 72],
      heavyEvents2024: [41, 69],
      heavyEvents2025: [38, 66],
    },
    VTZ_WALTAIR: {
      rainScale: 16.0,
      dryProb: 0.38,
      heavyEvents2023: [36, 58, 76, 94],
      heavyEvents2024: [32, 54, 73, 91],
      heavyEvents2025: [30, 52, 71, 90],
    },
    TPT_RENIGUNTA: {
      rainScale: 7.5,
      dryProb: 0.58,
      heavyEvents2023: [40, 68],
      heavyEvents2024: [38, 66],
      heavyEvents2025: [35, 64],
    },
    HYD_BEGUMPET: {
      rainScale: 11.5,
      dryProb: 0.44,
      heavyEvents2023: [32, 55, 78, 96],
      heavyEvents2024: [29, 52, 75, 93],
      heavyEvents2025: [28, 50, 74, 91],
    },
    MAA_MEENAMBAKKAM: {
      rainScale: 7.0,
      dryProb: 0.62,
      heavyEvents2023: [38, 66, 98],
      heavyEvents2024: [34, 62, 95],
      heavyEvents2025: [32, 60, 92],
    },
    AMD_HANSOL: {
      rainScale: 12.0,
      dryProb: 0.50,
      heavyEvents2023: [34, 58, 80],
      heavyEvents2024: [30, 55, 78],
      heavyEvents2025: [29, 53, 76],
    },
    ST_SURAT: {
      rainScale: 20.0,
      dryProb: 0.32,
      heavyEvents2023: [26, 44, 62, 81],
      heavyEvents2024: [24, 42, 60, 79],
      heavyEvents2025: [22, 40, 58, 77],
    },
    RAJ_RAJKOT: {
      rainScale: 9.5,
      dryProb: 0.58,
      heavyEvents2023: [35, 60, 82],
      heavyEvents2024: [32, 57, 79],
      heavyEvents2025: [31, 55, 77],
    },
    BBI_BHUBANESWAR: {
      rainScale: 24.0,
      dryProb: 0.24,
      heavyEvents2023: [28, 42, 59, 74, 91, 106],
      heavyEvents2024: [25, 39, 56, 71, 88, 103],
      heavyEvents2025: [24, 38, 55, 70, 87, 101],
    },
    PAT_JAYPRAKASH: {
      rainScale: 16.5,
      dryProb: 0.36,
      heavyEvents2023: [31, 48, 66, 84],
      heavyEvents2024: [28, 45, 63, 81],
      heavyEvents2025: [27, 44, 62, 80],
    },
    IXR_BIRSA: {
      rainScale: 19.0,
      dryProb: 0.30,
      heavyEvents2023: [30, 46, 64, 82, 98],
      heavyEvents2024: [27, 43, 61, 79, 95],
      heavyEvents2025: [26, 42, 60, 78, 94],
    },
    DED_JOLLYGRANT: {
      rainScale: 30.0,
      dryProb: 0.22,
      heavyEvents2023: [22, 38, 54, 70, 86, 102],
      heavyEvents2024: [20, 36, 52, 68, 84, 100],
      heavyEvents2025: [19, 35, 51, 67, 83, 99],
    },
    SLV_SHIMLA: {
      rainScale: 22.0,
      dryProb: 0.28,
      heavyEvents2023: [24, 40, 56, 72, 88],
      heavyEvents2024: [21, 37, 53, 69, 85],
      heavyEvents2025: [20, 36, 52, 68, 84],
    },
    SXR_SRINAGAR: {
      rainScale: 6.0,
      dryProb: 0.65,
      heavyEvents2023: [36, 64],
      heavyEvents2024: [32, 61],
      heavyEvents2025: [30, 59],
    },
    BPL_RAJA_BHOJ: {
      rainScale: 16.5,
      dryProb: 0.35,
      heavyEvents2023: [29, 47, 65, 83],
      heavyEvents2024: [26, 44, 62, 80],
      heavyEvents2025: [25, 43, 61, 79],
    },
    JLR_DUMNA: {
      rainScale: 19.5,
      dryProb: 0.30,
      heavyEvents2023: [30, 48, 66, 84, 98],
      heavyEvents2024: [27, 45, 63, 81, 95],
      heavyEvents2025: [26, 44, 62, 80, 94],
    },
    RPR_SWAMI_VIVEK: {
      rainScale: 20.5,
      dryProb: 0.28,
      heavyEvents2023: [31, 49, 67, 85, 99],
      heavyEvents2024: [28, 46, 64, 82, 96],
      heavyEvents2025: [27, 45, 63, 81, 95],
    },
    IXC_CHANDIGARH: {
      rainScale: 13.0,
      dryProb: 0.52,
      heavyEvents2023: [35, 52, 71, 89],
      heavyEvents2024: [31, 48, 67, 85],
      heavyEvents2025: [30, 47, 66, 84],
    },
  };

  const years = [2025, 2024, 2023];

  years.forEach((year) => {
    MET_STATIONS.forEach((station) => {
      const climate = stationBaseClimate[station.id] || {
        rainScale: 15.0,
        dryProb: 0.35,
        heavyEvents2023: [25, 48, 70],
        heavyEvents2024: [28, 52, 74],
        heavyEvents2025: [26, 50, 72],
      };
      const heavyEvents =
        year === 2025
          ? climate.heavyEvents2025
          : year === 2024
          ? climate.heavyEvents2024
          : climate.heavyEvents2023;
      let prevDayObs = 0;

      // 122 days of monsoon: June 1 (day 1) to Sept 30 (day 122)
      for (let day = 1; day <= 122; day++) {
        // Date string
        const month = day <= 30 ? 6 : day <= 61 ? 7 : day <= 92 ? 8 : 9;
        const dayInMonth =
          day <= 30
            ? day
            : day <= 61
            ? day - 30
            : day <= 92
            ? day - 61
            : day - 92;
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(
          dayInMonth
        ).padStart(2, '0')}`;

        // Atmospheric state simulation based on synoptic monsoon cycle
        const isExtremeEventDay = heavyEvents.includes(day);
        const isMonsoonSurge =
          (day >= 20 && day <= 32) || (day >= 48 && day <= 62) || (day >= 72 && day <= 86);

        // Surface Pressure (hPa): typically 997 - 1008 during monsoon
        let surfacePressure = 1006 - (isMonsoonSurge ? 5 : 0) - (isExtremeEventDay ? 8.5 : 0) + (rng() * 4 - 2);
        surfacePressure = Math.round(surfacePressure * 10) / 10;

        // 850hPa Relative Humidity: 65% - 98%
        let relativeHumidity =
          70 +
          (isMonsoonSurge ? 18 : 0) +
          (isExtremeEventDay ? 22 : 0) +
          Math.floor(rng() * 12);
        relativeHumidity = Math.min(99, Math.max(55, relativeHumidity));

        // 2m Temperature (°C)
        let temp2m = 32 - (relativeHumidity - 70) * 0.15 + (rng() * 3 - 1.5);
        temp2m = Math.round(temp2m * 10) / 10;

        // 10m Wind Speed (km/h)
        let windSpeed = 16 + (isMonsoonSurge ? 14 : 0) + (isExtremeEventDay ? 18 : 0) + Math.floor(rng() * 8);

        // True Observed Rainfall generation
        let observed = 0;
        if (isExtremeEventDay) {
          // Heavy/Extreme event (IMD: >= 64.5mm)
          observed = 72.0 + rng() * 92.0;
          // Special milestones: 2025 extreme downpours, Pune July 25, 2024 or Delhi June 28, 2024
          if (year === 2025 && station.id === 'BOM_SANTACRUZ' && day === 43) {
            observed = 188.4; // 2025 Mumbai active monsoon surge peak
          } else if (year === 2025 && station.id === 'DEL_SAFDARJUNG' && day === 70) {
            observed = 142.6; // 2025 Northern trough confluence event
          } else if (year === 2024 && station.id === 'DEL_SAFDARJUNG' && day === 28) {
            observed = 228.1; // Recorded historical high
          } else if (year === 2024 && station.id === 'PNQ_SHIVAJINAGAR' && day === 55) {
            observed = 114.2; // Recorded 2024 Shivajinagar heavy rain
          }
        } else if (rng() < climate.dryProb) {
          // True dry day (0.0 to 1.8mm)
          observed = rng() < 0.8 ? 0.0 : Math.round(rng() * 1.5 * 10) / 10;
        } else {
          // Light to moderate rain (exponential distribution)
          const expVal = -Math.log(1 - rng()) * climate.rainScale * (isMonsoonSurge ? 1.6 : 0.8);
          observed = Math.round(expVal * 10) / 10;
        }
        observed = Math.round(observed * 10) / 10;

        // Raw NWP Forecast generation with documented physical biases:
        // 1. Drizzle Bias: If observed is 0, NWP frequently predicts 2.5 - 6.5 mm due to moist boundary layer
        // 2. Extreme Underestimation: If observed >= 64.5mm, coarse NWP predicts only 30 - 55 mm
        // 3. Lead time Day 1 vs Day 2 vs Day 3
        const leadTimes = [1, 2, 3];
        for (const lead of leadTimes) {
          let rawForecast = 0;
          const leadNoise = 1 + (lead - 1) * (rng() * 0.18 - 0.05);

          if (observed < 2.5) {
            // NWP drizzle bias artifact
            const hasDrizzleBias = rng() < 0.65;
            rawForecast = hasDrizzleBias
              ? Math.round((2.0 + rng() * 4.5) * leadNoise * 10) / 10
              : Math.round(observed * leadNoise * 10) / 10;
          } else if (observed >= 64.5) {
            // NWP grid smoothing underestimation
            const underestimationRatio = 0.52 + rng() * 0.18; // captures only 52% to 70% of peak
            rawForecast = Math.round(observed * underestimationRatio * leadNoise * 10) / 10;
          } else {
            // Moderate rain: moderate variance (+/- 25%)
            const variance = 0.85 + rng() * 0.35;
            rawForecast = Math.round(observed * variance * leadNoise * 10) / 10;
          }

          // Apply our ML pipeline on this record
          const { regime } = classifyRegime(
            rawForecast,
            relativeHumidity,
            surfacePressure,
            windSpeed,
            prevDayObs
          );

          const baselineLinear = applyGlobalBaseline(rawForecast);
          const { correctedMm } = applyRegimeAwareCorrection(
            rawForecast,
            regime,
            relativeHumidity,
            surfacePressure,
            windSpeed,
            lead
          );

          points.push({
            id: `${station.id}_Y${year}_D${day}_L${lead}`,
            year,
            date: dateStr,
            dayOfYear: 152 + day,
            stationId: station.id,
            stationName: station.name,
            subdivision: station.subdivision,
            leadTimeDays: lead,
            rawForecastMm: rawForecast,
            observedMm: observed,
            relativeHumidity850hPa: relativeHumidity,
            temp2mC: temp2m,
            surfacePressureHpa: surfacePressure,
            windSpeed10mKmh: windSpeed,
            prevDayObsMm: prevDayObs,
            detectedRegime: regime,
            baselineLinearMm: baselineLinear,
            correctedForecastMm: correctedMm,
          });
        }

        prevDayObs = observed;
      }
    });
  });

  return points;
}

export const MONSOON_DATASET = buildMonsoonDataset();
