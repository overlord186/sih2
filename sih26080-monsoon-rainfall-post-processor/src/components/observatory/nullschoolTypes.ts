/**
 * nullschoolTypes.ts
 * Data structures and types for the Earth Nullschool Meteorological Simulator & HUD.
 */

export type NullschoolMode = 'Air' | 'Ocean' | 'Chem' | 'Particulates' | 'Space' | 'Bio';

export type NullschoolAnimate = 'Wind' | 'Currents' | 'Waves';

export type NullschoolHeight = 'Sfc' | '1000' | '850' | '700' | '500' | '250' | '70' | '10';

export type NullschoolOverlay = 
  | 'Wind' 
  | 'Temp' 
  | 'RH' 
  | 'Dew' 
  | 'WBT' 
  | '3HPA' 
  | 'CAPE' 
  | 'TPW' 
  | 'TCW' 
  | 'MSLP' 
  | 'MI' 
  | 'UVI' 
  | 'WPD' 
  | 'None';

export type NullschoolProjection = 'A' | 'CE' | 'E' | 'EQ' | 'O' | 'P' | 'S' | 'WB' | 'W3';

export interface NullschoolProbeData {
  lat: number;
  lon: number;
  windBearingDeg: number;
  windSpeedKmh: number;
  tempC: number;
  rhPct: number;
  pressureHpa: number;
  capeJkg: number;
  overlayValue: number | string;
  overlayUnit: string;
}

export interface NullschoolScaleConfig {
  overlay: NullschoolOverlay;
  min: number;
  max: number;
  unit: string;
  gradientCss: string;
  label: string;
  ticks: number[];
}

export const NULLSCHOOL_SCALES: Record<NullschoolOverlay, NullschoolScaleConfig> = {
  Wind: {
    overlay: 'Wind',
    min: 0,
    max: 180,
    unit: 'km/h',
    gradientCss: 'linear-gradient(to right, #0044ff, #00ccff, #00ff66, #ffff00, #ff6600, #ff0055, #cc00ff, #ffffff)',
    label: 'Wind Speed Magnitude',
    ticks: [0, 30, 60, 90, 120, 150, 180],
  },
  Temp: {
    overlay: 'Temp',
    min: -50,
    max: 50,
    unit: '°C',
    gradientCss: 'linear-gradient(to right, #2c003e, #0012ff, #00ccff, #33ff33, #ffff00, #ff4400, #aa0000, #ffffff)',
    label: 'Air Temperature',
    ticks: [-50, -25, 0, 15, 25, 35, 50],
  },
  RH: {
    overlay: 'RH',
    min: 0,
    max: 100,
    unit: '%',
    gradientCss: 'linear-gradient(to right, #442200, #885500, #ddbb55, #66ddbb, #00aaee, #0033cc, #000088)',
    label: 'Relative Humidity',
    ticks: [0, 20, 40, 60, 80, 100],
  },
  Dew: {
    overlay: 'Dew',
    min: -40,
    max: 30,
    unit: '°C',
    gradientCss: 'linear-gradient(to right, #001155, #0066aa, #00ddaa, #88ff66, #ffcc00, #cc3300)',
    label: 'Dew Point Temperature',
    ticks: [-40, -20, 0, 10, 20, 30],
  },
  WBT: {
    overlay: 'WBT',
    min: -20,
    max: 36,
    unit: '°C',
    gradientCss: 'linear-gradient(to right, #003366, #0099cc, #66ffcc, #ffdd33, #ff6600, #cc0033, #660022)',
    label: 'Wet Bulb Temperature',
    ticks: [-20, 0, 15, 25, 30, 35],
  },
  '3HPA': {
    overlay: '3HPA',
    min: -15,
    max: 15,
    unit: 'hPa',
    gradientCss: 'linear-gradient(to right, #cc0000, #ff6600, #ffcc00, #222222, #00ccff, #0066ff, #0000cc)',
    label: '3-Hour Pressure Tendency',
    ticks: [-15, -10, -5, 0, 5, 10, 15],
  },
  CAPE: {
    overlay: 'CAPE',
    min: 0,
    max: 4500,
    unit: 'J/kg',
    gradientCss: 'linear-gradient(to right, #001133, #0055aa, #00ddbb, #aaff00, #ffcc00, #ff3300, #cc00ff, #ffffff)',
    label: 'Convective Available Potential Energy',
    ticks: [0, 500, 1000, 2000, 3000, 4000],
  },
  TPW: {
    overlay: 'TPW',
    min: 0,
    max: 85,
    unit: 'mm',
    gradientCss: 'linear-gradient(to right, #221100, #553300, #aa8822, #44ccaa, #0088dd, #0022aa, #6600cc)',
    label: 'Total Precipitable Water',
    ticks: [0, 15, 30, 45, 60, 75],
  },
  TCW: {
    overlay: 'TCW',
    min: 0,
    max: 12,
    unit: 'kg/m²',
    gradientCss: 'linear-gradient(to right, #050510, #223355, #5588cc, #99ccff, #ffffff)',
    label: 'Total Cloud Water',
    ticks: [0, 2, 4, 6, 8, 10, 12],
  },
  MSLP: {
    overlay: 'MSLP',
    min: 940,
    max: 1040,
    unit: 'hPa',
    gradientCss: 'linear-gradient(to right, #440066, #990033, #ff4400, #ffff33, #00cc66, #0099ff, #002288)',
    label: 'Mean Sea Level Pressure',
    ticks: [940, 960, 980, 1000, 1020, 1040],
  },
  MI: {
    overlay: 'MI',
    min: 20,
    max: 100,
    unit: 'Index',
    gradientCss: 'linear-gradient(to right, #0066cc, #00ccaa, #ffff00, #ff6600, #cc0000, #660033)',
    label: 'Misery Heat Index',
    ticks: [20, 35, 50, 65, 80, 100],
  },
  UVI: {
    overlay: 'UVI',
    min: 0,
    max: 14,
    unit: 'Index',
    gradientCss: 'linear-gradient(to right, #00aa00, #ffff00, #ff8800, #ff0000, #aa00aa, #660066)',
    label: 'Ultraviolet Index',
    ticks: [0, 2, 5, 7, 10, 12, 14],
  },
  WPD: {
    overlay: 'WPD',
    min: 0,
    max: 5000,
    unit: 'W/m²',
    gradientCss: 'linear-gradient(to right, #001133, #0055aa, #00ddaa, #ffff33, #ff5500, #cc0033, #ff00ff)',
    label: 'Wind Power Density',
    ticks: [0, 500, 1000, 2000, 3500, 5000],
  },
  None: {
    overlay: 'None',
    min: 0,
    max: 1,
    unit: '',
    gradientCss: 'linear-gradient(to right, #222222, #444444)',
    label: 'Realistic Earth Surface (No Overlay)',
    ticks: [],
  },
};
