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
 * Generate 2023 Monsoon Season (June 1 - Sept 30) paired records for all 4 stations
 */
function buildMonsoonDataset(): RainfallDataPoint[] {
  const points: RainfallDataPoint[] = [];
  const rng = seededRandom(26080); // Fixed seed for SIH26080 reproducibility

  const stationBaseClimate: Record<string, { rainScale: number; dryProb: number; heavyEvents: number[] }> = {
    BOM_SANTACRUZ: {
      rainScale: 32.0,
      dryProb: 0.22,
      heavyEvents: [24, 25, 26, 44, 52, 53, 54, 76, 77, 88], // Active July/August surges
    },
    PNQ_SHIVAJINAGAR: {
      rainScale: 9.5,
      dryProb: 0.45,
      heavyEvents: [25, 53, 77],
    },
    NAG_SONEGAON: {
      rainScale: 15.0,
      dryProb: 0.35,
      heavyEvents: [32, 48, 65, 82], // Low pressure depression events
    },
    DEL_SAFDARJUNG: {
      rainScale: 11.0,
      dryProb: 0.58,
      heavyEvents: [38, 39, 40, 71], // Severe July 2023 Yamuna flood surge
    },
  };

  MET_STATIONS.forEach((station) => {
    const climate = stationBaseClimate[station.id];
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
      const dateStr = `2023-${String(month).padStart(2, '0')}-${String(
        dayInMonth
      ).padStart(2, '0')}`;

      // Atmospheric state simulation based on synoptic monsoon cycle
      const isExtremeEventDay = climate.heavyEvents.includes(day);
      const isMonsoonSurge =
        (day >= 20 && day <= 30) || (day >= 50 && day <= 60) || (day >= 75 && day <= 85);

      // Surface Pressure (hPa): typically 998 - 1008 during monsoon
      let surfacePressure = 1006 - (isMonsoonSurge ? 5 : 0) - (isExtremeEventDay ? 8 : 0) + (rng() * 4 - 2);
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
        observed = 68.0 + rng() * 85.0;
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
          id: `${station.id}_D${day}_L${lead}`,
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

  return points;
}

export const MONSOON_DATASET = buildMonsoonDataset();
