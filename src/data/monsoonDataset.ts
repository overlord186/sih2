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
    id: 'DEL_SAFDARJUNG',
    name: 'Delhi (Safdarjung)',
    subdivision: 'Northwest India',
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
    climateZone: 'Semi-Arid Sub-Humid Monsoon Margin',
    avgMonsoonRainMm: 650,
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
    PNQ_SHIVAJINAGAR: {
      rainScale: 9.5,
      dryProb: 0.45,
      heavyEvents2023: [25, 53, 77],
      heavyEvents2024: [54, 55, 78], // July 25, 2024 Pune Shivajinagar record cloudburst event (114mm)
      heavyEvents2025: [26, 52, 79, 86], // 2025 Western Ghats spillover convective episodes
    },
    NAG_SONEGAON: {
      rainScale: 15.0,
      dryProb: 0.35,
      heavyEvents2023: [32, 48, 65, 82], // Low pressure depression events
      heavyEvents2024: [28, 46, 68, 83, 91], // 2024 deep depression passages
      heavyEvents2025: [30, 31, 49, 66, 84, 98], // 2025 Bay of Bengal monsoon low-pressure corridor depressions
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
    CCU_ALIPORE: {
      rainScale: 22.0,
      dryProb: 0.28,
      heavyEvents2023: [33, 49, 70, 86, 104], // Bay depression coastal inundation
      heavyEvents2024: [29, 47, 65, 82, 101], // 2024 Bay cyclonic circulation & deltaic rain bands
      heavyEvents2025: [25, 41, 62, 85, 96, 110], // 2025 deep depression landfall surges
    },
    BLR_HAL: {
      rainScale: 8.5,
      dryProb: 0.52,
      heavyEvents2023: [30, 60, 92], // Peninsular convergence line storms
      heavyEvents2024: [35, 71, 95, 108], // 2024 Bengaluru urban flash convective downpours
      heavyEvents2025: [28, 59, 87, 105], // 2025 Southern shear zone episodes
    },
    GAU_BORJHAR: {
      rainScale: 26.0,
      dryProb: 0.20,
      heavyEvents2023: [18, 19, 36, 50, 64, 80], // Northeast funneling heavy monsoonal spells
      heavyEvents2024: [15, 32, 44, 60, 78, 92], // 2024 Brahmaputra basin riverine flood surges
      heavyEvents2025: [16, 28, 48, 63, 76, 94, 106], // 2025 Sub-Himalayan orographic & riverine deluge
    },
    JAI_SANGANER: {
      rainScale: 9.0,
      dryProb: 0.64,
      heavyEvents2023: [42, 68], // Western semi-arid episodic monsoon surges
      heavyEvents2024: [39, 64, 85], // 2024 intense isolated desert cloudbursts
      heavyEvents2025: [36, 61, 82], // 2025 Aravalli ridge convective triggers
    },
  };

  const years = [2025, 2024, 2023];

  years.forEach((year) => {
    MET_STATIONS.forEach((station) => {
      const climate = stationBaseClimate[station.id];
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
