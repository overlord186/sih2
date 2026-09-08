import React, { useRef, useMemo, useState, Component, ReactNode, useEffect } from 'react';
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
  MapPin,
  Target,
  Sparkles,
  ShieldAlert,
  Wind
} from 'lucide-react';

class GlobeErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: any) {
    console.warn('InteractiveGlobe WebGL error caught:', err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-10 h-10 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-400 flex items-center justify-center mb-2">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <h4 className="text-xs font-bold text-slate-200">Interactive 3D Globe Visualizer</h4>
          <p className="text-[11px] text-slate-400 max-w-xs mt-1">Full meteorological station diagnostics are active in the live map view below.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

interface Props {
  stationStats?: Record<string, { count: number, obs: number, fcst: number, ai: number }>;
  selectedStationId?: string;
  onSelectStation?: (stationId: string) => void;
}

export interface MetSubdivision {
  id: string;
  subdivision: string;
  code: string;
  stationName: string;
  state: string;
  lat: number;
  lon: number;
  elevationM: number;
  climateRegime: string;
  regimeCategory: 'Deluge' | 'Moderate' | 'Light' | 'Break' | 'Dry';
  annualMonsoonMm: number;
  defaultAiForecastMm: number;
  defaultRawForecastMm: number;
  defaultObsMm: number;
  biasIssue: string;
  activeAlert: 'Red Alert' | 'Orange Warning' | 'Yellow Watch' | 'Normal';
  linkedStationId?: string;
}

export const MET_SUBDIVISIONS: MetSubdivision[] = [
  {
    id: 'SUB_KONKAN_GOA',
    subdivision: 'Konkan & Goa',
    code: 'KG',
    stationName: 'Mumbai (Santacruz)',
    state: 'Maharashtra',
    lat: 19.076,
    lon: 72.8777,
    elevationM: 14,
    climateRegime: 'Tropical Heavy Coastal & Orographic Surge',
    regimeCategory: 'Deluge',
    annualMonsoonMm: 2200,
    defaultAiForecastMm: 78.4,
    defaultRawForecastMm: 42.0,
    defaultObsMm: 82.5,
    biasIssue: 'Arabian Sea offshore vortex causes sudden 150+ mm torrential downpours that hydrostatic NWP grids systematically smooth out.',
    activeAlert: 'Red Alert',
    linkedStationId: 'BOM_SANTACRUZ'
  },
  {
    id: 'SUB_GOA_COASTAL',
    subdivision: 'Goa Coastal Belt',
    code: 'GOA',
    stationName: 'Panaji (Altinho)',
    state: 'Goa',
    lat: 15.4989,
    lon: 73.8278,
    elevationM: 20,
    climateRegime: 'Windward Tropical Coastal Monsoon',
    regimeCategory: 'Deluge',
    annualMonsoonMm: 2850,
    defaultAiForecastMm: 96.0,
    defaultRawForecastMm: 58.0,
    defaultObsMm: 98.4,
    biasIssue: 'High sea-surface temperature squalls drive sustained multi-hour coastal cloudbursts.',
    activeAlert: 'Red Alert',
    linkedStationId: 'GOA_PANAJI'
  },
  {
    id: 'SUB_MADHYA_MAHA',
    subdivision: 'Madhya Maharashtra',
    code: 'MM',
    stationName: 'Pune (Shivajinagar)',
    state: 'Maharashtra',
    lat: 18.5204,
    lon: 73.8567,
    elevationM: 560,
    climateRegime: 'Western Ghats Rain-Shadow Lee Plateau',
    regimeCategory: 'Moderate',
    annualMonsoonMm: 680,
    defaultAiForecastMm: 12.8,
    defaultRawForecastMm: 18.2,
    defaultObsMm: 11.5,
    biasIssue: 'Western Ghats crest blocks maritime moisture; descending lee winds dry the air while NWP generates persistent false drizzle.',
    activeAlert: 'Yellow Watch',
    linkedStationId: 'PNQ_SHIVAJINAGAR'
  },
  {
    id: 'SUB_MAHABALESHWAR',
    subdivision: 'Western Ghats Crest (Ghats)',
    code: 'GHT',
    stationName: 'Mahabaleshwar',
    state: 'Maharashtra',
    lat: 17.9237,
    lon: 73.6586,
    elevationM: 1372,
    climateRegime: 'Western Ghats Orographic Crest Deluge',
    regimeCategory: 'Deluge',
    annualMonsoonMm: 5600,
    defaultAiForecastMm: 148.0,
    defaultRawForecastMm: 72.0,
    defaultObsMm: 156.0,
    biasIssue: 'Extreme orographic forced condensation at the ridge wall; NWP underestimates rainfall by over 50%.',
    activeAlert: 'Red Alert',
    linkedStationId: 'MAH_MAHABALESHWAR'
  },
  {
    id: 'SUB_VIDARBHA',
    subdivision: 'Vidarbha Basin',
    code: 'VB',
    stationName: 'Nagpur (Sonegaon)',
    state: 'Maharashtra',
    lat: 21.1458,
    lon: 79.0882,
    elevationM: 310,
    climateRegime: 'Central India Monsoon Depression Corridor',
    regimeCategory: 'Deluge',
    annualMonsoonMm: 950,
    defaultAiForecastMm: 46.2,
    defaultRawForecastMm: 31.0,
    defaultObsMm: 48.0,
    biasIssue: 'Bay of Bengal low-pressure systems track along this corridor; AI corrects NWP underestimation of multi-day stratiform rain.',
    activeAlert: 'Orange Warning',
    linkedStationId: 'NAG_SONEGAON'
  },
  {
    id: 'SUB_MARATHWADA',
    subdivision: 'Marathwada',
    code: 'MRW',
    stationName: 'Chhatrapati Sambhajinagar',
    state: 'Maharashtra',
    lat: 19.8762,
    lon: 75.3433,
    elevationM: 568,
    climateRegime: 'Semi-Arid Rain Shadow Plateau',
    regimeCategory: 'Light',
    annualMonsoonMm: 640,
    defaultAiForecastMm: 9.4,
    defaultRawForecastMm: 15.6,
    defaultObsMm: 8.2,
    biasIssue: 'Intermittent breaks in monsoon; AI suppresses spurious drizzle forecasts during dry spells.',
    activeAlert: 'Normal',
    linkedStationId: 'AUR_CHHATRAPATI'
  },
  {
    id: 'SUB_NW_INDIA',
    subdivision: 'Northwest India Plains',
    code: 'NWI',
    stationName: 'Delhi (Safdarjung)',
    state: 'National Capital Region',
    lat: 28.584,
    lon: 77.206,
    elevationM: 216,
    climateRegime: 'Semi-Arid Sub-Humid Monsoon Terminus',
    regimeCategory: 'Moderate',
    annualMonsoonMm: 610,
    defaultAiForecastMm: 28.4,
    defaultRawForecastMm: 16.0,
    defaultObsMm: 29.5,
    biasIssue: 'Clash between moist easterly monsoon winds and dry mid-latitude westerlies creates intense localized urban flash-flood cells.',
    activeAlert: 'Yellow Watch',
    linkedStationId: 'DEL_SAFDARJUNG'
  },
  {
    id: 'SUB_WEST_UP',
    subdivision: 'West Uttar Pradesh',
    code: 'WUP',
    stationName: 'Noida (Sector-62)',
    state: 'Uttar Pradesh',
    lat: 28.625,
    lon: 77.373,
    elevationM: 200,
    climateRegime: 'Upper Gangetic Trough Oscillation',
    regimeCategory: 'Moderate',
    annualMonsoonMm: 650,
    defaultAiForecastMm: 22.0,
    defaultRawForecastMm: 14.5,
    defaultObsMm: 23.0,
    biasIssue: 'Nocturnal boundary-layer convergence generates sudden thunderstorm squalls that coarse hydrostatic models miss.',
    activeAlert: 'Yellow Watch',
    linkedStationId: 'NOIDA_SECTOR62'
  },
  {
    id: 'SUB_EAST_UP',
    subdivision: 'East Uttar Pradesh',
    code: 'EUP',
    stationName: 'Lucknow (Amausi)',
    state: 'Uttar Pradesh',
    lat: 26.7606,
    lon: 80.8893,
    elevationM: 123,
    climateRegime: 'Central Gangetic Monsoon Trough Plains',
    regimeCategory: 'Moderate',
    annualMonsoonMm: 890,
    defaultAiForecastMm: 34.0,
    defaultRawForecastMm: 22.0,
    defaultObsMm: 36.0,
    biasIssue: 'Monsoon low pressure depressions bring wide convective bands over the alluvial basin.',
    activeAlert: 'Orange Warning',
    linkedStationId: 'LKO_AMAUSI'
  },
  {
    id: 'SUB_GANGETIC_WB',
    subdivision: 'Gangetic West Bengal',
    code: 'GWB',
    stationName: 'Kolkata (Alipore)',
    state: 'West Bengal',
    lat: 22.53,
    lon: 88.33,
    elevationM: 6,
    climateRegime: 'Deltaic Maritime & Bay Depression Head',
    regimeCategory: 'Deluge',
    annualMonsoonMm: 1450,
    defaultAiForecastMm: 68.5,
    defaultRawForecastMm: 39.0,
    defaultObsMm: 71.0,
    biasIssue: 'Coastal delta squalls and cyclonic depression landfalls produce acute waterlogging; AI applies heavy regime bias lift.',
    activeAlert: 'Red Alert',
    linkedStationId: 'CCU_ALIPORE'
  },
  {
    id: 'SUB_SUB_HIMALAYAN_WB',
    subdivision: 'Sub-Himalayan West Bengal & Sikkim',
    code: 'SHWB',
    stationName: 'Siliguri (Bagdogra)',
    state: 'West Bengal',
    lat: 26.6812,
    lon: 88.3286,
    elevationM: 126,
    climateRegime: 'Sub-Himalayan Foothill Moisture Funnel',
    regimeCategory: 'Deluge',
    annualMonsoonMm: 2980,
    defaultAiForecastMm: 112.0,
    defaultRawForecastMm: 64.0,
    defaultObsMm: 118.0,
    biasIssue: 'Severe break-monsoon spells shift trough to the foothills triggering massive deluge events.',
    activeAlert: 'Red Alert',
    linkedStationId: 'SLG_BAGDOGRA'
  },
  {
    id: 'SUB_SOUTH_INT_KARNATAKA',
    subdivision: 'South Interior Karnataka',
    code: 'SIK',
    stationName: 'Bengaluru (HAL)',
    state: 'Karnataka',
    lat: 12.95,
    lon: 77.67,
    elevationM: 920,
    climateRegime: 'Southern Deccan High-Altitude Plateau',
    regimeCategory: 'Moderate',
    annualMonsoonMm: 580,
    defaultAiForecastMm: 16.4,
    defaultRawForecastMm: 21.5,
    defaultObsMm: 15.8,
    biasIssue: 'High altitude triggers evening convective showers; NWP over-spreads light drizzle across wide dry intervals.',
    activeAlert: 'Yellow Watch',
    linkedStationId: 'BLR_HAL'
  },
  {
    id: 'SUB_COASTAL_KARNATAKA',
    subdivision: 'Coastal Karnataka',
    code: 'CKM',
    stationName: 'Mangaluru (Bajpe)',
    state: 'Karnataka',
    lat: 12.9613,
    lon: 74.8901,
    elevationM: 102,
    climateRegime: 'Windward Sahyadri Tropical Super-Wet',
    regimeCategory: 'Deluge',
    annualMonsoonMm: 3750,
    defaultAiForecastMm: 124.0,
    defaultRawForecastMm: 68.0,
    defaultObsMm: 130.5,
    biasIssue: 'Continuous maritime squall lines dump >100mm/day during peak July surges; AI restores un-modeled orographic uplift.',
    activeAlert: 'Red Alert',
    linkedStationId: 'IXE_BAJPE'
  },
  {
    id: 'SUB_KERALA_MAHE',
    subdivision: 'Kerala & Mahe',
    code: 'KER',
    stationName: 'Kochi (Nedumbassery)',
    state: 'Kerala',
    lat: 10.1518,
    lon: 76.3930,
    elevationM: 10,
    climateRegime: 'Tropical Wet Southwest Monsoon Onset Gateway',
    regimeCategory: 'Deluge',
    annualMonsoonMm: 3050,
    defaultAiForecastMm: 108.0,
    defaultRawForecastMm: 59.0,
    defaultObsMm: 114.0,
    biasIssue: 'Low-level Somali jet impinging on southern Western Ghats causes massive sustained rainfall.',
    activeAlert: 'Red Alert',
    linkedStationId: 'COK_NEDUMBASSERY'
  },
  {
    id: 'SUB_NORTH_INT_KARNATAKA',
    subdivision: 'North Interior Karnataka',
    code: 'NIK',
    stationName: 'Belagavi (Sambre)',
    state: 'Karnataka',
    lat: 15.8595,
    lon: 74.6186,
    elevationM: 758,
    climateRegime: 'Northern Deccan Transitional Plateau',
    regimeCategory: 'Moderate',
    annualMonsoonMm: 820,
    defaultAiForecastMm: 24.5,
    defaultRawForecastMm: 19.0,
    defaultObsMm: 26.0,
    biasIssue: 'Ghats moisture spillover transitions rapidly into semi-arid plateau.',
    activeAlert: 'Yellow Watch',
    linkedStationId: 'BGM_BELAGAVI'
  },
  {
    id: 'SUB_ASSAM_MEGHALAYA',
    subdivision: 'Assam & Meghalaya',
    code: 'AM',
    stationName: 'Guwahati (Borjhar)',
    state: 'Assam',
    lat: 26.11,
    lon: 91.59,
    elevationM: 54,
    climateRegime: 'Brahmaputra Valley & Cherrapunji Funnel',
    regimeCategory: 'Deluge',
    annualMonsoonMm: 1720,
    defaultAiForecastMm: 92.0,
    defaultRawForecastMm: 55.4,
    defaultObsMm: 96.2,
    biasIssue: 'Extreme orographic lifting at Meghalaya scarp funnels moisture into river catchments, causing severe transboundary river floods.',
    activeAlert: 'Red Alert',
    linkedStationId: 'GAU_BORJHAR'
  },
  {
    id: 'SUB_MEGHALAYA_CHERRA',
    subdivision: 'Meghalaya Plateau (Cherrapunji)',
    code: 'CHRA',
    stationName: 'Cherrapunji (Sohra)',
    state: 'Meghalaya',
    lat: 25.2986,
    lon: 91.7324,
    elevationM: 1484,
    climateRegime: 'World Maximum Orographic Rainfall Escarpment',
    regimeCategory: 'Deluge',
    annualMonsoonMm: 11430,
    defaultAiForecastMm: 260.0,
    defaultRawForecastMm: 98.0,
    defaultObsMm: 285.0,
    biasIssue: 'Funneling into steep Khasi Hills creates unmatched world record rainfall rates; AI applies extreme regime multiplier.',
    activeAlert: 'Red Alert',
    linkedStationId: 'SHL_CHERRA'
  },
  {
    id: 'SUB_NMMT',
    subdivision: 'Nagaland, Manipur, Mizoram & Tripura',
    code: 'NMMT',
    stationName: 'Agartala (MBB)',
    state: 'Tripura',
    lat: 23.887,
    lon: 91.2404,
    elevationM: 15,
    climateRegime: 'Tropical Moist Monsoon Trough / Bay Moisture',
    regimeCategory: 'Deluge',
    annualMonsoonMm: 2150,
    defaultAiForecastMm: 72.0,
    defaultRawForecastMm: 44.0,
    defaultObsMm: 76.0,
    biasIssue: 'Sustained moisture feed from the Bay of Bengal into complex terrain.',
    activeAlert: 'Orange Warning',
    linkedStationId: 'AGT_MBB'
  },
  {
    id: 'SUB_EAST_RAJASTHAN',
    subdivision: 'East Rajasthan',
    code: 'ERJ',
    stationName: 'Jaipur (Sanganer)',
    state: 'Rajasthan',
    lat: 26.82,
    lon: 75.81,
    elevationM: 385,
    climateRegime: 'Arid / Semi-Arid Western Border Margin',
    regimeCategory: 'Light',
    annualMonsoonMm: 520,
    defaultAiForecastMm: 8.5,
    defaultRawForecastMm: 15.0,
    defaultObsMm: 7.2,
    biasIssue: 'Dry surface air causes raindrop evaporation (virga); NWP predicts false rainfall that AI Zero-Rain Gate suppresses.',
    activeAlert: 'Normal',
    linkedStationId: 'JAI_SANGANER'
  },
  {
    id: 'SUB_WEST_RAJASTHAN',
    subdivision: 'West Rajasthan (Thar Desert)',
    code: 'WRJ',
    stationName: 'Jodhpur (Civil)',
    state: 'Rajasthan',
    lat: 26.251,
    lon: 73.0489,
    elevationM: 219,
    climateRegime: 'Thar Desert Arid Monsoon Limit',
    regimeCategory: 'Dry',
    annualMonsoonMm: 310,
    defaultAiForecastMm: 3.2,
    defaultRawForecastMm: 9.8,
    defaultObsMm: 2.1,
    biasIssue: 'Extreme dry boundary layer; model drizzle bias heavily suppressed by AI.',
    activeAlert: 'Normal',
    linkedStationId: 'JDH_JODHPUR'
  },
  {
    id: 'SUB_COASTAL_AP',
    subdivision: 'Coastal Andhra Pradesh & Yanam',
    code: 'CAP',
    stationName: 'Visakhapatnam (Waltair)',
    state: 'Andhra Pradesh',
    lat: 17.72,
    lon: 83.30,
    elevationM: 15,
    climateRegime: 'Bay of Bengal Maritime Squall Corridor',
    regimeCategory: 'Moderate',
    annualMonsoonMm: 1020,
    defaultAiForecastMm: 32.5,
    defaultRawForecastMm: 24.0,
    defaultObsMm: 34.0,
    biasIssue: 'Deep offshore feeder bands make landfall rapidly; AI adjusts for localized coastal wind-stress confluence.',
    activeAlert: 'Orange Warning',
    linkedStationId: 'VTZ_WALTAIR'
  },
  {
    id: 'SUB_RAYALASEEMA',
    subdivision: 'Rayalaseema',
    code: 'RLS',
    stationName: 'Tirupati (Renigunta)',
    state: 'Andhra Pradesh',
    lat: 13.6324,
    lon: 79.5435,
    elevationM: 161,
    climateRegime: 'Rain Shadow Semi-Arid Basin',
    regimeCategory: 'Light',
    annualMonsoonMm: 490,
    defaultAiForecastMm: 7.8,
    defaultRawForecastMm: 13.2,
    defaultObsMm: 6.9,
    biasIssue: 'Leeward drying effect during southwest monsoon season.',
    activeAlert: 'Normal',
    linkedStationId: 'TPT_RENIGUNTA'
  },
  {
    id: 'SUB_TELANGANA',
    subdivision: 'Telangana',
    code: 'TS',
    stationName: 'Hyderabad (Begumpet)',
    state: 'Telangana',
    lat: 17.4531,
    lon: 78.4677,
    elevationM: 531,
    climateRegime: 'Central Deccan Plateau Convergence',
    regimeCategory: 'Moderate',
    annualMonsoonMm: 730,
    defaultAiForecastMm: 21.0,
    defaultRawForecastMm: 17.5,
    defaultObsMm: 22.0,
    biasIssue: 'Thunderstorm anvil outflows and shear zone cloud bursts.',
    activeAlert: 'Yellow Watch',
    linkedStationId: 'HYD_BEGUMPET'
  },
  {
    id: 'SUB_TAMILNADU',
    subdivision: 'Tamil Nadu, Puducherry & Karaikal',
    code: 'TNP',
    stationName: 'Chennai (Meenambakkam)',
    state: 'Tamil Nadu',
    lat: 13.08,
    lon: 80.27,
    elevationM: 16,
    climateRegime: 'SW Monsoon Rain-Shadow / Leeward Basin',
    regimeCategory: 'Light',
    annualMonsoonMm: 450,
    defaultAiForecastMm: 6.2,
    defaultRawForecastMm: 12.0,
    defaultObsMm: 5.8,
    biasIssue: 'Shielded by Western Ghats during SW monsoon; raw models frequently predict false rainfall during dry spells.',
    activeAlert: 'Normal',
    linkedStationId: 'MAA_MEENAMBAKKAM'
  },
  {
    id: 'SUB_GUJARAT_REGION',
    subdivision: 'Gujarat Region',
    code: 'GJR',
    stationName: 'Ahmedabad (Hansol)',
    state: 'Gujarat',
    lat: 23.07,
    lon: 72.63,
    elevationM: 53,
    climateRegime: 'Semi-Arid Trough Dip Convergence',
    regimeCategory: 'Moderate',
    annualMonsoonMm: 750,
    defaultAiForecastMm: 24.0,
    defaultRawForecastMm: 18.0,
    defaultObsMm: 25.5,
    biasIssue: 'Infrequent but intense pulses when monsoon lows dip south into Gulf of Khambhat.',
    activeAlert: 'Yellow Watch',
    linkedStationId: 'AMD_HANSOL'
  },
  {
    id: 'SUB_SOUTH_GUJARAT',
    subdivision: 'South Gujarat Coast',
    code: 'SGC',
    stationName: 'Surat (Magdalla)',
    state: 'Gujarat',
    lat: 21.1702,
    lon: 72.8311,
    elevationM: 13,
    climateRegime: 'Coastal South Gujarat Heavy Inundation Plain',
    regimeCategory: 'Deluge',
    annualMonsoonMm: 1210,
    defaultAiForecastMm: 54.0,
    defaultRawForecastMm: 32.0,
    defaultObsMm: 58.0,
    biasIssue: 'Arabian Sea convergence vortex surges produce acute urban flood events.',
    activeAlert: 'Orange Warning',
    linkedStationId: 'ST_SURAT'
  },
  {
    id: 'SUB_SAURASHTRA_KUTCH',
    subdivision: 'Saurashtra & Kutch',
    code: 'SK',
    stationName: 'Rajkot',
    state: 'Gujarat',
    lat: 22.3039,
    lon: 70.8022,
    elevationM: 128,
    climateRegime: 'Semi-Arid Peninsular Monsoon Transition',
    regimeCategory: 'Light',
    annualMonsoonMm: 590,
    defaultAiForecastMm: 14.0,
    defaultRawForecastMm: 18.5,
    defaultObsMm: 13.5,
    biasIssue: 'Depressions stalling over Kutch peninsula yield sudden multi-day cloudbursts.',
    activeAlert: 'Yellow Watch',
    linkedStationId: 'RAJ_RAJKOT'
  },
  {
    id: 'SUB_ODISHA',
    subdivision: 'Odisha Coastal & Interior',
    code: 'ODI',
    stationName: 'Bhubaneswar',
    state: 'Odisha',
    lat: 20.26,
    lon: 85.83,
    elevationM: 45,
    climateRegime: 'Primary Bay Depression Landfall Gateway',
    regimeCategory: 'Deluge',
    annualMonsoonMm: 1480,
    defaultAiForecastMm: 64.0,
    defaultRawForecastMm: 38.0,
    defaultObsMm: 66.5,
    biasIssue: 'Direct gateway for monsoon depressions entering from Bay head; causes widespread Mahanadi catchment overflow.',
    activeAlert: 'Red Alert',
    linkedStationId: 'BBI_BHUBANESWAR'
  },
  {
    id: 'SUB_BIHAR',
    subdivision: 'Bihar Alluvial Plain',
    code: 'BHR',
    stationName: 'Patna (Jay Prakash)',
    state: 'Bihar',
    lat: 25.59,
    lon: 85.13,
    elevationM: 53,
    climateRegime: 'Sub-Himalayan Trough Footprint Alluvial Basin',
    regimeCategory: 'Moderate',
    annualMonsoonMm: 1050,
    defaultAiForecastMm: 35.0,
    defaultRawForecastMm: 26.0,
    defaultObsMm: 36.5,
    biasIssue: 'Trough shifts northward to Himalayan foothills trigger intense localized downpours.',
    activeAlert: 'Orange Warning',
    linkedStationId: 'PAT_JAYPRAKASH'
  },
  {
    id: 'SUB_JHARKHAND',
    subdivision: 'Jharkhand (Chota Nagpur)',
    code: 'JHK',
    stationName: 'Ranchi (Birsa Munda)',
    state: 'Jharkhand',
    lat: 23.3143,
    lon: 85.3217,
    elevationM: 651,
    climateRegime: 'Chota Nagpur Plateau Monsoon Trough Belt',
    regimeCategory: 'Deluge',
    annualMonsoonMm: 1280,
    defaultAiForecastMm: 48.0,
    defaultRawForecastMm: 33.0,
    defaultObsMm: 50.5,
    biasIssue: 'Plateau orography enhances moisture from depressions traversing west-northwestward.',
    activeAlert: 'Orange Warning',
    linkedStationId: 'IXR_BIRSA'
  },
  {
    id: 'SUB_WEST_HIMALAYAS',
    subdivision: 'Western Himalayas / Uttarakhand',
    code: 'WHM',
    stationName: 'Dehradun (Jolly Grant)',
    state: 'Uttarakhand',
    lat: 30.31,
    lon: 78.03,
    elevationM: 680,
    climateRegime: 'Montane Alpine Orographic Cloudburst Margin',
    regimeCategory: 'Deluge',
    annualMonsoonMm: 1980,
    defaultAiForecastMm: 95.0,
    defaultRawForecastMm: 52.0,
    defaultObsMm: 102.0,
    biasIssue: 'Steep valleys cause extreme localized cloudbursts (>100mm/h); AI captures complex mountain uplift physics.',
    activeAlert: 'Red Alert',
    linkedStationId: 'DED_JOLLYGRANT'
  },
  {
    id: 'SUB_HIMACHAL',
    subdivision: 'Himachal Pradesh',
    code: 'HP',
    stationName: 'Shimla (Jubbarhatti)',
    state: 'Himachal Pradesh',
    lat: 31.1048,
    lon: 77.1734,
    elevationM: 2205,
    climateRegime: 'Outer Himalayan Mountain Ridge Flash Convection',
    regimeCategory: 'Deluge',
    annualMonsoonMm: 1420,
    defaultAiForecastMm: 74.0,
    defaultRawForecastMm: 40.0,
    defaultObsMm: 78.0,
    biasIssue: 'Monsoon surges encountering high mountain ridges generate rapid flash flood risks.',
    activeAlert: 'Orange Warning',
    linkedStationId: 'SLV_SHIMLA'
  },
  {
    id: 'SUB_KASHMIR',
    subdivision: 'Jammu & Kashmir and Ladakh',
    code: 'JK',
    stationName: 'Srinagar (Sheikh ul-Alam)',
    state: 'Jammu & Kashmir',
    lat: 34.0837,
    lon: 74.7973,
    elevationM: 1585,
    climateRegime: 'Inter-Montane Kashmir Valley Tempered Rain',
    regimeCategory: 'Light',
    annualMonsoonMm: 390,
    defaultAiForecastMm: 5.5,
    defaultRawForecastMm: 11.0,
    defaultObsMm: 4.8,
    biasIssue: 'Pir Panjal range shields valley from primary SW monsoon current.',
    activeAlert: 'Normal',
    linkedStationId: 'SXR_SRINAGAR'
  },
  {
    id: 'SUB_WEST_MP',
    subdivision: 'West Madhya Pradesh',
    code: 'WMP',
    stationName: 'Bhopal (Raja Bhoj)',
    state: 'Madhya Pradesh',
    lat: 23.2875,
    lon: 77.3378,
    elevationM: 527,
    climateRegime: 'Central Highlands Depression Track',
    regimeCategory: 'Moderate',
    annualMonsoonMm: 1060,
    defaultAiForecastMm: 38.0,
    defaultRawForecastMm: 26.0,
    defaultObsMm: 40.0,
    biasIssue: 'Low pressure systems crossing through central India produce extended wet spells.',
    activeAlert: 'Yellow Watch',
    linkedStationId: 'BPL_RAJA_BHOJ'
  },
  {
    id: 'SUB_EAST_MP',
    subdivision: 'East Madhya Pradesh',
    code: 'EMP',
    stationName: 'Jabalpur (Dumna)',
    state: 'Madhya Pradesh',
    lat: 23.1815,
    lon: 80.0520,
    elevationM: 495,
    climateRegime: 'Narmada Valley Monsoon Convergence',
    regimeCategory: 'Deluge',
    annualMonsoonMm: 1240,
    defaultAiForecastMm: 45.0,
    defaultRawForecastMm: 30.0,
    defaultObsMm: 47.0,
    biasIssue: 'Depressions moving up the Narmada rift basin concentrate heavy precipitation.',
    activeAlert: 'Orange Warning',
    linkedStationId: 'JLR_DUMNA'
  },
  {
    id: 'SUB_CHHATTISGARH',
    subdivision: 'Chhattisgarh',
    code: 'CHG',
    stationName: 'Raipur (Swami Vivekananda)',
    state: 'Chhattisgarh',
    lat: 21.1804,
    lon: 81.7388,
    elevationM: 317,
    climateRegime: 'Mahanadi Basin Low-Pressure Transit Corridor',
    regimeCategory: 'Deluge',
    annualMonsoonMm: 1310,
    defaultAiForecastMm: 52.0,
    defaultRawForecastMm: 34.0,
    defaultObsMm: 55.0,
    biasIssue: 'Direct passage of Bay depressions into central river basins.',
    activeAlert: 'Orange Warning',
    linkedStationId: 'RPR_SWAMI_VIVEK'
  },
  {
    id: 'SUB_PUNJAB_HARYANA',
    subdivision: 'Punjab & Haryana',
    code: 'PH',
    stationName: 'Chandigarh',
    state: 'Chandigarh Union Territory',
    lat: 30.6735,
    lon: 76.7885,
    elevationM: 321,
    climateRegime: 'Indo-Gangetic North Plains Foothills',
    regimeCategory: 'Moderate',
    annualMonsoonMm: 840,
    defaultAiForecastMm: 30.0,
    defaultRawForecastMm: 20.0,
    defaultObsMm: 31.5,
    biasIssue: 'Monsoon axis shifts towards Shivalik foothills creating severe localized storms.',
    activeAlert: 'Yellow Watch',
    linkedStationId: 'IXC_CHANDIGARH'
  }
];

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
    color: '#06b6d4',
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
    color: '#f59e0b',
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
    color: '#3b82f6',
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
    color: '#8b5cf6',
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
    color: '#eab308',
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
    color: '#10b981',
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
    color: '#a855f7',
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
    color: '#ec4899',
    annualMonsoonMm: '900 - 1,150 mm',
    intensityTendency: 'Low',
    phenomenon: 'Shielded by Western Ghats during SW monsoon; receives over 65% of precipitation in Oct-Dec NE monsoon.',
    forecastImpact: 'Generally dry during primary June-Sept season; occasional maritime convective showers.',
    representativeArea: 'Coastal Tamil Nadu, Coastal Andhra Pradesh'
  },
];

type InspectedTarget = 
  | { type: 'subdivision'; subdivision: MetSubdivision; stats?: any }
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

// In-memory cache for countries.geojson
let cachedGeoJsonData: any = null;
let geoJsonFetchPromise: Promise<any> | null = null;

// Global Country Boundaries using 177 sovereign countries GeoJSON
const CountryBoundaries = () => {
  const [worldGeometry, setWorldGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [indiaGeometry, setIndiaGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [graticuleGeometry, setGraticuleGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadGeoJson = async () => {
      if (cachedGeoJsonData) return cachedGeoJsonData;
      if (!geoJsonFetchPromise) {
        geoJsonFetchPromise = fetch('/countries.geojson')
          .then(res => {
            if (!res.ok) throw new Error('File not found');
            return res.json();
          })
          .then(data => {
            cachedGeoJsonData = data;
            return data;
          })
          .catch(err => {
            console.warn('Country boundaries fetch error:', err);
            // Cache failure so we never spam the server in an infinite retry loop
            cachedGeoJsonData = null;
            geoJsonFetchPromise = Promise.resolve(null);
            return null;
          });
      }
      return geoJsonFetchPromise;
    };

    loadGeoJson().then(data => {
      if (!isMounted || !data || !Array.isArray(data.features)) return;
      const radius = 1.956;
      const worldPos: number[] = [];
      const indiaPos: number[] = [];

        const processPolygon = (coordinates: number[][], targetArr: number[]) => {
          if (!Array.isArray(coordinates)) return;
          for (let i = 0; i < coordinates.length - 1; i++) {
            const pA = coordinates[i];
            const pB = coordinates[i + 1];
            if (!pA || !pB) continue;
            // Skip antimeridian wrapping line cuts
            if (Math.abs(pA[0] - pB[0]) > 180) continue;

            const v1 = latLonToVector3(pA[1], pA[0], radius);
            const v2 = latLonToVector3(pB[1], pB[0], radius);
            targetArr.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
          }
        };

        data.features.forEach((feature: any) => {
          const name = feature.properties?.NAME || feature.properties?.ADMIN || '';
          const isIndia = name === 'India';
          const target = isIndia ? indiaPos : worldPos;

          if (feature.geometry?.type === 'Polygon' && Array.isArray(feature.geometry.coordinates)) {
            feature.geometry.coordinates.forEach((ring: number[][]) => processPolygon(ring, target));
          } else if (feature.geometry?.type === 'MultiPolygon' && Array.isArray(feature.geometry.coordinates)) {
            feature.geometry.coordinates.forEach((poly: number[][][]) => {
              if (Array.isArray(poly)) {
                poly.forEach((ring: number[][]) => processPolygon(ring, target));
              }
            });
          }
        });

        if (worldPos.length > 0) {
          const geom = new THREE.BufferGeometry();
          geom.setAttribute('position', new THREE.Float32BufferAttribute(worldPos, 3));
          setWorldGeometry(geom);
        }

        if (indiaPos.length > 0) {
          const geomInd = new THREE.BufferGeometry();
          geomInd.setAttribute('position', new THREE.Float32BufferAttribute(indiaPos, 3));
          setIndiaGeometry(geomInd);
        }
      })
      .catch((err) => {
        console.warn('Country boundaries fetch error:', err);
      });

    // Generate Synoptic Meteorological Graticules (Equator, Tropics, Meridians)
    const graticulePos: number[] = [];
    const gratRadius = 1.954;
    const lats = [-23.5, 0, 23.5, 45, -45];
    lats.forEach(lat => {
      for (let lon = -180; lon < 180; lon += 5) {
        const v1 = latLonToVector3(lat, lon, gratRadius);
        const v2 = latLonToVector3(lat, lon + 5, gratRadius);
        graticulePos.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
      }
    });
    for (let lon = -180; lon < 180; lon += 30) {
      for (let lat = -80; lat < 80; lat += 5) {
        const v1 = latLonToVector3(lat, lon, gratRadius);
        const v2 = latLonToVector3(lat + 5, lon, gratRadius);
        graticulePos.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
      }
    }
    const gratGeom = new THREE.BufferGeometry();
    gratGeom.setAttribute('position', new THREE.Float32BufferAttribute(graticulePos, 3));
    setGraticuleGeometry(gratGeom);
  }, []);

  return (
    <group>
      {/* Synoptic Meteorological Graticule Grid */}
      {graticuleGeometry && (
        <lineSegments geometry={graticuleGeometry}>
          <lineBasicMaterial color="#0284c7" transparent opacity={0.18} />
        </lineSegments>
      )}

      {/* Global World Country Boundaries */}
      {worldGeometry && (
        <lineSegments geometry={worldGeometry}>
          <lineBasicMaterial color="#38bdf8" transparent opacity={0.52} linewidth={1.2} />
        </lineSegments>
      )}

      {/* Highlighted Sovereign Indian Subcontinent Borders */}
      {indiaGeometry && (
        <lineSegments geometry={indiaGeometry}>
          <lineBasicMaterial color="#67e8f9" transparent opacity={0.95} linewidth={2} />
        </lineSegments>
      )}
    </group>
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
      const posAttr = pointsRef.current.geometry.attributes.position;
      const arr = posAttr.array as Float32Array;

      for (let i = 0; i < count; i++) {
        phases[i] += delta * speeds[i];
        const pulse = Math.sin(phases[i]) * 0.008;
        arr[i * 3] += pulse * arr[i * 3];
        arr[i * 3 + 1] += pulse * arr[i * 3 + 1];
        arr[i * 3 + 2] += pulse * arr[i * 3 + 2];
      }
      posAttr.needsUpdate = true;
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
          opacity={isHighlighted ? 0.22 : 0.05}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <mesh>
        <ringGeometry args={[0.46, 0.49, 48]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={isHighlighted ? 0.75 : 0.28}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

// Major Indian Climate Zones Markers
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
        const pos = latLonToVector3(zone.lat, zone.lon, 1.962);
        const isActive = activeZoneId === zone.id;

        return (
          <group key={zone.id} position={pos}>
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
              <meshBasicMaterial 
                color={zone.color} 
                wireframe={!isActive}
                transparent 
                opacity={isActive ? 0.95 : 0.65} 
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// Meteorological Subdivision Node Component with Concentric Pulsing Beacons & Hover Details

const SubdivisionNode = ({
  sub,
  stats,
  isActive,
  isHovered,
  onHover,
  onSelect,
}: {
  sub: MetSubdivision;
  stats?: { count: number; obs: number; fcst: number; ai: number };
  isActive: boolean;
  isHovered: boolean;
  onHover: (sub: MetSubdivision | null) => void;
  onSelect: (sub: MetSubdivision) => void;
}) => {
  const pulseRingRef = useRef<THREE.Mesh>(null!);
  const pos = useMemo(() => latLonToVector3(sub.lat, sub.lon, 1.975), [sub.lat, sub.lon]);
  const basePos = useMemo(() => latLonToVector3(sub.lat, sub.lon, 1.962), [sub.lat, sub.lon]);

  // Compute live or benchmark values
  const safeAI = (stats && stats.count > 0) ? (stats.ai / stats.count) : sub.defaultAiForecastMm;
  const safeRaw = (stats && stats.count > 0) ? (stats.fcst / stats.count) : sub.defaultRawForecastMm;
  const safeObs = (stats && stats.count > 0) ? (stats.obs / stats.count) : sub.defaultObsMm;
  const biasDelta = safeAI - safeRaw;

  const isDeluge = safeAI > 64.5 || sub.regimeCategory === 'Deluge';
  const isModerate = safeAI > 15.5 || sub.regimeCategory === 'Moderate';

  let themeColor = '#06b6d4'; // cyan
  if (isDeluge) themeColor = '#ef4444'; // red
  else if (isModerate) themeColor = '#f59e0b'; // amber

  // Concentric radar beacon animation
  useFrame(({ clock }) => {
    if (pulseRingRef.current) {
      const t = (clock.getElapsedTime() * 1.5 + (sub.lat * 0.1)) % 1;
      pulseRingRef.current.scale.set(1 + t * 2.2, 1 + t * 2.2, 1 + t * 2.2);
      const mat = pulseRingRef.current.material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = (1 - t) * (isActive || isHovered ? 0.8 : 0.4);
    }
  });

  return (
    <group position={pos}>
      {/* 3D Geodesic Subdivision Core Node */}
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(sub);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(sub);
        }}
      >
        <sphereGeometry args={[isActive || isHovered ? 0.08 : 0.055, 16, 16]} />
        <meshBasicMaterial color={themeColor} />
      </mesh>

      {/* Pulsing Concentric Radar Beacon Ring */}
      <mesh ref={pulseRingRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.06, 0.09, 24]} />
        <meshBasicMaterial 
          color={themeColor} 
          transparent 
          opacity={0.5} 
          side={THREE.DoubleSide} 
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Permanent Halo on Extreme / Active */}
      {(isDeluge || isActive || isHovered) && (
        <mesh>
          <sphereGeometry args={[isActive || isHovered ? 0.13 : 0.08, 16, 16]} />
          <meshBasicMaterial 
            color={themeColor} 
            transparent 
            opacity={0.35} 
            blending={THREE.AdditiveBlending} 
          />
        </mesh>
      )}

      {/* Compact On-Node Code Tag (Standard 1:1 scale, perfectly sharp & non-intrusive) */}
      <Html center zIndexRange={[120, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-tight shadow-md whitespace-nowrap transform -translate-x-1/2 -translate-y-6 absolute left-1/2 bottom-full mb-1 border transition-all select-none ${
          isActive || isHovered 
            ? 'bg-slate-950/95 text-white border-sky-400 scale-105 shadow-[0_0_12px_rgba(56,189,248,0.5)]' 
            : 'bg-slate-950/85 text-slate-300 border-slate-700/70 scale-95 hover:border-slate-500'
        }`}>
          {sub.code}
        </div>
      </Html>

      {/* EXPANDED RICH DETAILS FLOATING POPOVER (Crisp, perfectly readable 1:1 scale) */}
      {(isHovered || isActive) && (
        <Html center zIndexRange={[170, 0]} style={{ pointerEvents: 'auto' }}>
          <div 
            onClick={(e) => {
              e.stopPropagation();
              onSelect(sub);
            }}
            
className="w-64 sm:w-72 bg-slate-950/95 backdrop-blur-xl border border-sky-500/70 rounded-xl p-3 shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_20px_rgba(56,189,248,0.25)] text-white absolute left-1/2 top-1/2 -translate-y-1/2 ml-4 animate-in fade-in zoom-in-95 duration-150 select-none cursor-pointer globe-tooltip-snap"

          >
            {/* Header with Title & Alert Badge */}
            <div className="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-100 truncate">{sub.subdivision}</span>
                  <span className="text-[9px] font-mono px-1 py-0.5 bg-slate-800 text-sky-300 rounded font-semibold shrink-0">
                    [{sub.code}]
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 truncate">
                  <MapPin className="w-2.5 h-2.5 text-sky-400 shrink-0" />
                  <span className="truncate">{sub.stationName} • {sub.state}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap ${
                  sub.activeAlert === 'Red Alert' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50' :
                  sub.activeAlert === 'Orange Warning' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50' :
                  'bg-sky-500/20 text-sky-300 border border-sky-500/50'
                }`}>
                  {sub.activeAlert}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onHover(null);
                  }}
                  className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800/80 transition-colors ml-0.5"
                  title="Close popover"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* 3-Column Comparative Forecast Metrics */}
            <div className="grid grid-cols-3 gap-1.5 bg-slate-900/90 rounded-lg p-2 border border-slate-800 text-center mb-2">
              <div>
                <div className="text-[8px] uppercase tracking-wider text-slate-400">Observed</div>
                <div className="text-xs font-bold text-slate-200 mt-0.5 font-mono">
                  {safeObs.toFixed(1)} <span className="text-[8px] font-normal">mm</span>
                </div>
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-wider text-slate-400">Raw NWP</div>
                <div className="text-xs font-bold text-slate-400 mt-0.5 font-mono">
                  {safeRaw.toFixed(1)} <span className="text-[8px] font-normal">mm</span>
                </div>
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-wider text-sky-400 font-semibold">AI Corrected</div>
                <div className={`text-xs font-bold mt-0.5 font-mono ${
                  isDeluge ? 'text-rose-400' : isModerate ? 'text-amber-400' : 'text-sky-400'
                }`}>
                  {safeAI.toFixed(1)} <span className="text-[8px] font-normal">mm</span>
                </div>
              </div>
            </div>

            {/* Bias Lift / Suppression Note */}
            <div className="flex items-center justify-between text-[10px] bg-slate-900/60 px-2 py-1 rounded border border-slate-800/80 mb-2">
              <span className="text-slate-400">AI Bias Correction:</span>
              <span className={`font-mono font-bold ${biasDelta > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {biasDelta >= 0 ? `+${biasDelta.toFixed(1)}` : biasDelta.toFixed(1)} mm
                <span className="text-[9px] font-normal text-slate-400 ml-1">
                  ({biasDelta > 0 ? 'Lift' : 'Reduction'})
                </span>
              </span>
            </div>

            {/* Synoptic Monsoon Physics & NWP Bias Issue */}
            <div className="text-[10px] text-slate-300 leading-relaxed mb-2 bg-slate-900/40 p-1.5 rounded border border-slate-800/60 line-clamp-2">
              <span className="text-sky-400 font-semibold">Synoptic Physics: </span>
              {sub.biasIssue}
            </div>

            {/* Climatology & Elevation Footer */}
            <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1.5 border-t border-slate-800/80">
              <span>Norm: <strong className="text-slate-200">{sub.annualMonsoonMm}mm</strong></span>
              <span>Elev: <strong className="text-slate-200">{sub.elevationM}m</strong></span>
              <span className="text-sky-400 font-medium hover:underline">Select & Inspect →</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

// All Subdivision Markers Group
const SubdivisionMarkers = ({ 
  visible = true,
  activeSubdivisionId,
  hoveredSubdivisionId,
  stationStats,
  onHoverSubdivision,
  onSelectSubdivision
}: { 
  visible: boolean;
  activeSubdivisionId?: string;
  hoveredSubdivisionId?: string;
  stationStats?: Record<string, { count: number, obs: number, fcst: number, ai: number }>;
  onHoverSubdivision: (sub: MetSubdivision | null) => void;
  onSelectSubdivision: (sub: MetSubdivision) => void;
}) => {
  if (!visible) return null;

  return (
    <group>
      {MET_SUBDIVISIONS.map((sub) => {
        const stats = sub.linkedStationId ? stationStats?.[sub.linkedStationId] : undefined;
        const isActive = activeSubdivisionId === sub.id;
        const isHovered = hoveredSubdivisionId === sub.id;

        return (
          <SubdivisionNode
            key={sub.id}
            sub={sub}
            stats={stats}
            isActive={isActive}
            isHovered={isHovered}
            onHover={onHoverSubdivision}
            onSelect={onSelectSubdivision}
          />
        );
      })}
    </group>
  );
};

// High-resolution procedural Earth Map Texture
const useEarthTexture = () => {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Deep Oceanic Space Navy Background
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    oceanGrad.addColorStop(0, '#040d21');
    oceanGrad.addColorStop(0.5, '#061330');
    oceanGrad.addColorStop(1, '#040d21');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Graticules Grid Lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;

    // Latitudes (Every 15 degrees)
    for (let lat = -75; lat <= 75; lat += 15) {
      const y = ((90 - lat) / 180) * canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Longitudes (Every 15 degrees)
    for (let lon = -180; lon <= 180; lon += 15) {
      const x = ((lon + 180) / 360) * canvas.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // High-contrast Equator line
    const eqY = 0.5 * canvas.height;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, eqY);
    ctx.lineTo(canvas.width, eqY);
    ctx.stroke();

    // Helper to map lon/lat to canvas coordinates
    const toX = (lon: number) => ((lon + 180) / 360) * canvas.width;
    const toY = (lat: number) => ((90 - lat) / 180) * canvas.height;

    // Landmass Continent polygons
    ctx.fillStyle = '#0a1936';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1.5;

    const drawPoly = (coords: [number, number][], fill = true) => {
      ctx.beginPath();
      coords.forEach(([lon, lat], i) => {
        const x = toX(lon);
        const y = toY(lat);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      if (fill) ctx.fill();
      ctx.stroke();
    };

    // Indian Subcontinent (With vibrant monsoonal cyan-glow)
    ctx.fillStyle = '#122c54';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    drawPoly([
      [68, 24], [72, 31], [74, 34], [77, 36], [80, 31], [88, 27], [90, 26],
      [92, 28], [96, 28], [94, 24], [92, 21], [88, 21.5], [86, 20], [82, 16],
      [80, 13], [79.8, 9.8], [77.5, 8.1], [76.5, 9.5], [74.8, 13], [73.5, 16],
      [72.8, 19], [70, 21], [68.5, 23]
    ]);

    // Sri Lanka
    drawPoly([[79.8, 9.8], [81.8, 8.5], [81.8, 6.8], [80.2, 5.9], [79.6, 7.5]]);

    // Eurasia
    ctx.fillStyle = '#0a1936';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1.5;
    drawPoly([
      [-10, 36], [0, 42], [10, 45], [30, 42], [40, 40], [50, 30], [60, 25],
      [68, 24], [72, 31], [80, 31], [88, 27], [100, 20], [110, 22], [120, 30],
      [130, 40], [140, 50], [170, 65], [180, 70], [-180, 70], [-170, 70],
      [60, 75], [20, 70], [10, 60], [-5, 55], [-10, 45]
    ]);

    // Africa
    drawPoly([
      [-18, 15], [-5, 36], [10, 37], [25, 32], [32, 31], [43, 12], [51, 10],
      [40, -5], [35, -20], [30, -32], [20, -35], [18, -34], [12, -18],
      [9, 4], [0, 6], [-15, 10]
    ]);

    // Australia
    drawPoly([
      [114, -22], [120, -14], [130, -12], [138, -12], [145, -15], [153, -28],
      [150, -38], [140, -38], [130, -32], [115, -34]
    ]);

    // North America
    drawPoly([
      [-165, 65], [-140, 70], [-100, 75], [-60, 70], [-55, 50], [-70, 42],
      [-80, 25], [-95, 20], [-105, 22], [-115, 30], [-125, 48], [-140, 60]
    ]);

    // South America
    drawPoly([
      [-80, 10], [-60, 10], [-35, -5], [-40, -22], [-50, -30], [-55, -45],
      [-70, -55], [-75, -45], [-70, -20], [-80, -5]
    ]);

    // Atmospheric Synoptic Monsoon Jetstream arrows (Arabian Sea -> India -> Bay of Bengal)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(toX(55), toY(8));
    ctx.bezierCurveTo(toX(65), toY(12), toX(70), toY(16), toX(78), toY(20));
    ctx.bezierCurveTo(toX(84), toY(22), toX(88), toY(24), toX(95), toY(22));
    ctx.stroke();
    ctx.setLineDash([]);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, []);
};

// 3D Core Globe Scene
const GlobeCore = ({ 
  stationStats, 
  selectedStationId, 
  isRotating,
  showSubdivisions,
  showClimateZones,
  activeTarget,
  hoveredSubdivisionId,
  onHoverSubdivision,
  onHoverZone,
  onHoverSubcontinent,
  onSelectSubdivision,
  onSelectZone,
  onSelectSubcontinent,
  globeGroupRef,
}: Props & { 
  isRotating: boolean;
  showSubdivisions: boolean;
  showClimateZones: boolean;
  activeTarget: InspectedTarget;
  hoveredSubdivisionId?: string;
  onHoverSubdivision: (sub: MetSubdivision | null) => void;
  onHoverZone: (zone: ClimateZone | null) => void;
  onHoverSubcontinent: (hovering: boolean) => void;
  onSelectSubdivision: (sub: MetSubdivision) => void;
  onSelectZone: (zone: ClimateZone) => void;
  onSelectSubcontinent: () => void;
  globeGroupRef: React.RefObject<THREE.Group>;
}) => {
  const earthTexture = useEarthTexture();

  useFrame((state, delta) => {
    if (globeGroupRef.current && isRotating) {
      globeGroupRef.current.rotation.y += delta * 0.08;
    }
  });

  const activeSubdivisionId = activeTarget?.type === 'subdivision' ? activeTarget.subdivision.id : undefined;
  const activeZoneId = activeTarget?.type === 'climate' ? activeTarget.zone.id : undefined;
  const isSubcontinentActive = activeTarget?.type === 'subcontinent';

  return (
    <>
      <group ref={globeGroupRef} rotation={[0, -Math.PI / 2, 0]}>
        {/* Core Earth Sphere */}
        <Sphere args={[1.95, 64, 64]}>
          <meshPhongMaterial 
            map={earthTexture || undefined} 
            emissiveMap={earthTexture || undefined}
            emissive="#0284c7"
            emissiveIntensity={0.25}
            shininess={35} 
          />
        </Sphere>

        {/* Real World Country Boundaries from Natural Earth */}
        <CountryBoundaries />
        
        {/* Interactive Subcontinent Base Region Disc */}
        <SubcontinentDisc 
          isHighlighted={isSubcontinentActive} 
          onHover={onHoverSubcontinent}
          onClick={onSelectSubcontinent}
        />

        {/* IMD Meteorological Subdivision Nodes Layer */}
        <SubdivisionMarkers 
          visible={showSubdivisions} 
          activeSubdivisionId={activeSubdivisionId}
          hoveredSubdivisionId={hoveredSubdivisionId}
          stationStats={stationStats}
          onHoverSubdivision={onHoverSubdivision}
          onSelectSubdivision={onSelectSubdivision}
        />

        {/* Major Indian Climate Zones Layer */}
        <ClimateZoneMarkers 
          visible={showClimateZones} 
          activeZoneId={activeZoneId}
          onHoverZone={onHoverZone}
          onSelectZone={onSelectZone}
        />
      </group>
      <ParticleGlobe isRotating={isRotating} />
    </>
  );
};

export const InteractiveGlobe = ({ stationStats, selectedStationId, onSelectStation }: Props) => {
  const [isRotating, setIsRotating] = useState(true);
  const [showSubdivisions, setShowSubdivisions] = useState(true);
  const [showClimateZones, setShowClimateZones] = useState(false);
  const globeGroupRef = useRef<THREE.Group>(null);
  
  // Unified active inspector target
  const [hoverTarget, setHoverTarget] = useState<InspectedTarget>(null);
  const [pinnedTarget, setPinnedTarget] = useState<InspectedTarget>(null);

  const activeTarget: InspectedTarget = pinnedTarget || hoverTarget;

  // Subcontinent Aggregate Metrics
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

  const handleHoverSubdivision = (sub: MetSubdivision | null) => {
    if (!sub) {
      if (hoverTarget?.type === 'subdivision') setHoverTarget(null);
    } else {
      const stats = sub.linkedStationId ? stationStats?.[sub.linkedStationId] : undefined;
      setHoverTarget({ type: 'subdivision', subdivision: sub, stats });
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
      if (!hoverTarget || hoverTarget.type === 'subcontinent') {
        setHoverTarget({ type: 'subcontinent' });
      }
    } else {
      if (hoverTarget?.type === 'subcontinent') {
        setHoverTarget(null);
      }
    }
  };

  const handleSelectSubdivision = (sub: MetSubdivision) => {
    const stats = sub.linkedStationId ? stationStats?.[sub.linkedStationId] : undefined;
    setPinnedTarget({ type: 'subdivision', subdivision: sub, stats });
    if (sub.linkedStationId && onSelectStation) {
      onSelectStation(sub.linkedStationId);
    }
  };

  const handleFocusIndia = () => {
    if (globeGroupRef.current) {
      // Center Indian Subcontinent (lon ~79°E, lat ~22°N) towards camera
      globeGroupRef.current.rotation.y = -Math.PI * 0.44;
      globeGroupRef.current.rotation.x = 0.38;
      setIsRotating(false);
    }
  };

  return (
    <div className="w-full h-full relative bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
      <GlobeErrorBoundary>
        <Canvas camera={{ position: [0, 0, 4.3], fov: 45 }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 3, 5]} intensity={1.4} color="#e0f2fe" />
          <directionalLight position={[-5, -2, -3]} intensity={0.4} color="#0284c7" />
          <pointLight position={[0, 4, 3]} intensity={0.8} color="#38bdf8" />
          
          <GlobeCore 
            stationStats={stationStats}
            selectedStationId={selectedStationId}
            isRotating={isRotating}
            showSubdivisions={showSubdivisions}
            showClimateZones={showClimateZones}
            activeTarget={activeTarget}
            hoveredSubdivisionId={hoverTarget?.type === 'subdivision' ? hoverTarget.subdivision.id : undefined}
            onHoverSubdivision={handleHoverSubdivision}
            onHoverZone={handleHoverZone}
            onHoverSubcontinent={handleHoverSubcontinent}
            onSelectSubdivision={handleSelectSubdivision}
            onSelectZone={(zone) => setPinnedTarget({ type: 'climate', zone })}
            onSelectSubcontinent={() => setPinnedTarget({ type: 'subcontinent' })}
            globeGroupRef={globeGroupRef}
          />
          
          <OrbitControls 
            enableZoom={true} 
            enablePan={false} 
            enableDamping 
            dampingFactor={0.05} 
            minDistance={2.4} 
            maxDistance={9.5} 
          />
        </Canvas>
      </GlobeErrorBoundary>

      {/* Top Glassmorphic Interactive Toolbar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-semibold text-slate-200 shadow-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>3D Synoptic Monsoon Globe</span>
            <span className="text-[10px] text-sky-400 font-mono pl-1 border-l border-slate-800">
              {MET_SUBDIVISIONS.length} IMD Subdivisions Active
            </span>
          </div>
        </div>

        {/* Controls: Focus India, Layers, Pause/Play */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-950/90 backdrop-blur-md p-1 rounded-lg border border-slate-800 shadow-xl">
          <button 
            onClick={handleFocusIndia}
            className="px-2.5 py-1 text-xs font-medium rounded-md text-sky-300 hover:text-white hover:bg-slate-800/80 transition-all flex items-center gap-1.5 border border-sky-500/30"
            title="Orient globe to center Indian Subcontinent"
          >
            <Target className="w-3.5 h-3.5 text-sky-400" />
            <span>Focus India</span>
          </button>

          <button 
            onClick={() => setShowSubdivisions(!showSubdivisions)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              showSubdivisions ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle IMD Meteorological Subdivisions"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Subdivisions</span>
          </button>

          <button 
            onClick={() => setShowClimateZones(!showClimateZones)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              showClimateZones ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Climate Zones"
          >
            <ThermometerSun className="w-3.5 h-3.5" />
            <span>Zones</span>
          </button>

          <button 
            onClick={() => setIsRotating(!isRotating)}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800/80 transition-colors"
            title={isRotating ? 'Pause Globe Rotation' : 'Resume Globe Rotation'}
          >
            {isRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Floating HUD Synoptic Inspector Panel (Top Left) */}
      {activeTarget && (
        <div className="absolute top-14 left-3 z-30 pointer-events-auto max-w-xs sm:max-w-sm w-full animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-slate-950/95 backdrop-blur-xl border border-sky-500/50 rounded-xl p-3.5 shadow-2xl text-white">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                {activeTarget.type === 'subdivision' && <MapPin className="w-4 h-4 text-sky-400" />}
                {activeTarget.type === 'climate' && <ThermometerSun className="w-4 h-4 text-amber-400" />}
                {activeTarget.type === 'subcontinent' && <CloudRain className="w-4 h-4 text-sky-400" />}
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  {activeTarget.type === 'subdivision' && `IMD Subdivision • ${activeTarget.subdivision.code}`}
                  {activeTarget.type === 'climate' && `Climate Zone • ${activeTarget.zone.code}`}
                  {activeTarget.type === 'subcontinent' && 'Regional Intensity Overview'}
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

            {/* SUBDIVISION CONTENT */}
            {activeTarget.type === 'subdivision' && (() => {
              const sub = activeTarget.subdivision;
              const s = activeTarget.stats;
              const safeAI = (s && s.count > 0) ? (s.ai / s.count) : sub.defaultAiForecastMm;
              const safeObs = (s && s.count > 0) ? (s.obs / s.count) : sub.defaultObsMm;
              const safeFcst = (s && s.count > 0) ? (s.fcst / s.count) : sub.defaultRawForecastMm;
              const delta = safeAI - safeFcst;
              const isHeavy = safeAI > 64.5;
              const isModerate = safeAI > 15.5;

              return (
                <div className="space-y-2.5">
                  <div>
                    <div className="text-sm font-bold text-slate-100 flex items-center justify-between">
                      <span>{sub.subdivision}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        isHeavy ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                        isModerate ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      }`}>
                        {sub.activeAlert}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Observatory: <strong className="text-slate-200">{sub.stationName}</strong> ({sub.state})
                    </div>
                  </div>

                  {/* 3 Metrics comparison */}
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-900/90 rounded-lg p-2 border border-slate-800 text-center">
                    <div>
                      <div className="text-[9px] text-slate-400">Observed</div>
                      <div className="text-xs font-bold text-slate-200 mt-0.5 font-mono">{safeObs.toFixed(1)} mm</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-400">Raw Model</div>
                      <div className="text-xs font-bold text-slate-400 mt-0.5 font-mono">{safeFcst.toFixed(1)} mm</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-sky-400 font-semibold">AI Forecast</div>
                      <div className="text-xs font-bold text-sky-400 mt-0.5 font-mono">{safeAI.toFixed(1)} mm</div>
                    </div>
                  </div>

                  {/* AI Bias Correction */}
                  <div className="flex items-center justify-between text-[11px] bg-slate-900/60 px-2 py-1 rounded border border-slate-800">
                    <span className="text-slate-400">Bias Correction Delta:</span>
                    <span className={`font-mono font-bold ${delta >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)} mm
                    </span>
                  </div>

                  {/* Synoptic Monsoon Teleconnection */}
                  <div className="text-[10px] text-slate-300 leading-relaxed bg-slate-900/40 p-2 rounded border border-slate-800/80">
                    <span className="text-sky-400 font-medium">Synoptic Driver & Bias: </span>
                    {sub.biasIssue}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <span>Norm: {sub.annualMonsoonMm}mm</span>
                    <span>Elev: {sub.elevationM}m</span>
                    {sub.linkedStationId && onSelectStation && (
                      <button
                        onClick={() => onSelectStation(sub.linkedStationId!)}
                        className="text-sky-400 hover:text-sky-300 font-medium flex items-center gap-0.5"
                      >
                        Inspect Station <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

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

            {/* SUBCONTINENT OVERVIEW */}
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

                <div className="text-[10px] text-slate-400 leading-relaxed pt-1 border-t border-slate-800/80">
                  <span className="text-slate-300 font-medium">Climatology: </span>
                  Arabian Sea westerly winds force orographic lifting at Western Ghats; Bay of Bengal depression axis fuels central plains.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sleek Bottom Legend Bar */}
      <div className="absolute bottom-3 left-3 right-3 sm:right-auto pointer-events-none z-20">
        <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800/90 rounded-lg px-3 py-1.5 shadow-xl flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-300 pointer-events-auto">
          <div className="flex items-center gap-1.5 font-medium text-slate-400 text-[10px] uppercase tracking-wider">
            <Layers className="w-3 h-3 text-sky-400" />
            Legend:
          </div>

          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]"></span>
            <span>&gt; 64.5mm (Deluge)</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]"></span>
            <span>15.5-64.5mm (Moderate)</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]"></span>
            <span>&lt; 15.5mm (Light)</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[10px] text-sky-400 pl-1 border-l border-slate-800">
            <span>Hover any subdivision node for details</span>
          </div>
        </div>
      </div>
    </div>
  );
};
