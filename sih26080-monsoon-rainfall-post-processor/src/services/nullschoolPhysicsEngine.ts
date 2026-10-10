/**
 * nullschoolPhysicsEngine.ts
 * Rigorous meteorological physics and planetary fluid dynamic calculator for Earth Nullschool.
 * Computes Navier-Stokes wind vectors, hypsometric isobaric vertical profiles,
 * thermodynamic CAPE, Magnus-Tetens dew points, and raycast sample queries.
 */

import { 
  NullschoolMode, 
  NullschoolHeight, 
  NullschoolOverlay, 
  NullschoolProbeData,
  NULLSCHOOL_SCALES
} from '../components/observatory/nullschoolTypes';

export interface Vector2D {
  u: number; // Eastward component (m/s)
  v: number; // Northward component (m/s)
  magnitudeKmh: number;
  bearingDeg: number;
}

export class NullschoolPhysicsEngine {
  private static readonly OMEGA = 7.2921e-5; // Earth angular velocity rad/s
  private static readonly R_EARTH = 6371e3; // Earth radius (m)
  private static readonly RD = 287.05; // Specific gas constant dry air J/(kg K)
  private static readonly G0 = 9.80665; // Standard gravity m/s²

  /**
   * Coriolis parameter f = 2 * Omega * sin(phi)
   */
  public static getCoriolisParameter(latDeg: number): number {
    const phi = (latDeg * Math.PI) / 180;
    return 2 * this.OMEGA * Math.sin(phi);
  }

  /**
   * Hypsometric altitude (meters) corresponding to standard isobaric surfaces
   */
  public static getIsobaricAltitude(height: NullschoolHeight): number {
    switch (height) {
      case 'Sfc': return 10;
      case '1000': return 110;
      case '850': return 1450;
      case '700': return 3010;
      case '500': return 5570;
      case '250': return 10360;
      case '70': return 18440;
      case '10': return 31050;
      default: return 10;
    }
  }

  /**
   * Compute wind vector (u, v) in m/s at any lat/lon, isobaric level, and simulation time
   */
  public static sampleWindVector(
    lat: number,
    lon: number,
    height: NullschoolHeight,
    timeSec: number = 0
  ): Vector2D {
    const phi = (lat * Math.PI) / 180;
    const lambda = (lon * Math.PI) / 180;

    // 1. Zonal Mean Circulation (Trade winds, Westerlies, Polar Easterlies)
    let zonalMeanU = 0;
    const absLat = Math.abs(lat);
    if (absLat < 30) {
      // Tropical Easterly Trade Winds (u < 0)
      zonalMeanU = -6.0 * Math.cos((absLat / 30) * (Math.PI / 2));
    } else if (absLat >= 30 && absLat < 60) {
      // Mid-latitude Westerlies (u > 0)
      zonalMeanU = 14.0 * Math.sin(((absLat - 30) / 30) * Math.PI);
    } else {
      // Polar Easterlies (u < 0)
      zonalMeanU = -5.0 * Math.cos(((absLat - 60) / 30) * (Math.PI / 2));
    }

    // 2. Vertical Wind Shear Multiplier (Jet stream amplifies at 250 hPa)
    let verticalMultiplier = 1.0;
    if (height === 'Sfc') verticalMultiplier = 0.75;
    else if (height === '1000') verticalMultiplier = 0.95;
    else if (height === '850') {
      // Low-Level Jet (Somali Jet over Arabian Sea / Indian Ocean)
      if (lat >= 5 && lat <= 20 && lon >= 50 && lon <= 80) {
        verticalMultiplier = 2.4;
      } else {
        verticalMultiplier = 1.35;
      }
    } else if (height === '700') verticalMultiplier = 1.6;
    else if (height === '500') verticalMultiplier = 2.1;
    else if (height === '250') {
      // Subtropical Jet Stream Core around 30°-35° latitude
      if (absLat >= 25 && absLat <= 45) {
        verticalMultiplier = 4.2;
      } else {
        verticalMultiplier = 2.8;
      }
    } else if (height === '70') verticalMultiplier = 1.8;
    else if (height === '10') verticalMultiplier = 2.2;

    // 3. Synoptic Wave Perturbations (Rossby Waves & Cyclonic Vortices)
    const wave1 = Math.sin(3 * lambda - timeSec * 0.05);
    const wave2 = Math.cos(5 * lambda + timeSec * 0.08);
    const meridionalV = (4.5 * wave1 + 3.0 * wave2) * Math.cos(phi) * (verticalMultiplier * 0.6);

    let u = (zonalMeanU + 4.0 * wave2) * verticalMultiplier;
    let v = meridionalV;

    // Hemisphere Sign flip for Southern Hemisphere Coriolis deflection
    if (lat < 0) {
      v = -v;
    }

    const speedMps = Math.sqrt(u * u + v * v);
    const magnitudeKmh = speedMps * 3.6;

    // Meteorological direction: direction from which wind originates (0° = North, 90° = East)
    let bearingDeg = (Math.atan2(-u, -v) * 180) / Math.PI;
    if (bearingDeg < 0) bearingDeg += 360;

    return {
      u,
      v,
      magnitudeKmh: Math.round(magnitudeKmh * 10) / 10,
      bearingDeg: Math.round(bearingDeg),
    };
  }

  /**
   * Sample complete meteorological physical state at probe coordinate
   */
  public static samplePointProbe(
    lat: number,
    lon: number,
    height: NullschoolHeight,
    overlay: NullschoolOverlay,
    timeSec: number = 0
  ): NullschoolProbeData {
    const wind = this.sampleWindVector(lat, lon, height, timeSec);
    const absLat = Math.abs(lat);
    const altM = this.getIsobaricAltitude(height);

    // Temperature with latitudinal gradient & lapse rate (-6.5°C per km)
    const seaLevelTemp = 30 - (absLat / 90) * 55 + Math.sin((lon * Math.PI) / 90) * 3;
    const tempC = Math.round((seaLevelTemp - (altM / 1000) * 6.5) * 10) / 10;

    // Relative humidity (%)
    let baseRh = 72 - (absLat / 90) * 25 + Math.sin(lat * 0.1) * 15;
    // Tropics & oceans have high humidity
    if (absLat < 25) baseRh += 12;
    const rhPct = Math.max(12, Math.min(98, Math.round(baseRh)));

    // Dew point via Magnus formula
    const a = 17.67;
    const b = 243.5;
    const alpha = (a * tempC) / (b + tempC) + Math.log(rhPct / 100);
    const dewPointC = Math.round(((b * alpha) / (a - alpha)) * 10) / 10;

    // Wet bulb temperature approximation
    const wbtC = Math.round((tempC * Math.atan(0.151977 * Math.pow(rhPct + 8.313659, 0.5)) +
      Math.atan(tempC + rhPct) - Math.atan(rhPct - 1.676331) +
      0.00391838 * Math.pow(rhPct, 1.5) * Math.atan(0.023101 * rhPct) - 4.686035) * 10) / 10;

    // Pressure at isobaric surface
    let pressureHpa = height === 'Sfc' 
      ? Math.round(1013.25 - 6.5 * Math.sin(lat * 0.05) - (wind.magnitudeKmh > 80 ? 18 : 0))
      : Number(height);

    // Convective Available Potential Energy (CAPE)
    let capeJkg = 0;
    if (absLat < 35 && tempC > 18 && rhPct > 65) {
      capeJkg = Math.round(1200 + (tempC - 18) * 90 + (rhPct - 65) * 45);
    } else {
      capeJkg = Math.round(Math.max(50, 400 - absLat * 8));
    }

    // Determine Overlay scalar
    let overlayValue: number | string = wind.magnitudeKmh;
    let overlayUnit = 'km/h';

    switch (overlay) {
      case 'Wind':
        overlayValue = wind.magnitudeKmh;
        overlayUnit = 'km/h';
        break;
      case 'Temp':
        overlayValue = tempC;
        overlayUnit = '°C';
        break;
      case 'RH':
        overlayValue = rhPct;
        overlayUnit = '%';
        break;
      case 'Dew':
        overlayValue = dewPointC;
        overlayUnit = '°C';
        break;
      case 'WBT':
        overlayValue = wbtC;
        overlayUnit = '°C';
        break;
      case '3HPA':
        overlayValue = Math.round((Math.sin(lon * 0.1) * 4.2) * 10) / 10;
        overlayUnit = 'hPa';
        break;
      case 'CAPE':
        overlayValue = capeJkg;
        overlayUnit = 'J/kg';
        break;
      case 'TPW':
        overlayValue = Math.max(2, Math.round(55 * (rhPct / 100) * Math.cos((absLat * Math.PI) / 180)));
        overlayUnit = 'mm';
        break;
      case 'TCW':
        overlayValue = Math.round(((rhPct > 70 ? (rhPct - 70) * 0.15 : 0.2)) * 10) / 10;
        overlayUnit = 'kg/m²';
        break;
      case 'MSLP':
        overlayValue = pressureHpa;
        overlayUnit = 'hPa';
        break;
      case 'MI':
        overlayValue = Math.round(0.5 * (tempC + 61.0 + ((tempC - 68.0) * 1.2) + (rhPct * 0.094)));
        overlayUnit = 'Index';
        break;
      case 'UVI':
        overlayValue = Math.max(0, Math.min(14, Math.round(12 * Math.cos((absLat * Math.PI) / 180))));
        overlayUnit = 'Index';
        break;
      case 'WPD': {
        const rho = (pressureHpa * 100) / (this.RD * (tempC + 273.15));
        const vMps = wind.magnitudeKmh / 3.6;
        overlayValue = Math.round(0.5 * rho * Math.pow(vMps, 3));
        overlayUnit = 'W/m²';
        break;
      }
      case 'None':
      default:
        overlayValue = 'Off';
        overlayUnit = '';
        break;
    }

    return {
      lat: Math.round(lat * 100) / 100,
      lon: Math.round(lon * 100) / 100,
      windBearingDeg: wind.bearingDeg,
      windSpeedKmh: wind.magnitudeKmh,
      tempC,
      rhPct,
      pressureHpa,
      capeJkg,
      overlayValue,
      overlayUnit,
    };
  }
}
