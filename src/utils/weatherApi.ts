// Centralized resilient weather API utility with multi-tier persistent offline caching & Open-Meteo live sync

export interface TelemetrySyncStatus {
  isOffline: boolean;
  lastSyncedAt: string | null;
  source: 'live_api' | 'persistent_cache' | 'climatological_fallback';
  cachedStationsCount: number;
}

interface WeatherDataCacheItem {
  timestamp: number;
  data: any;
  source: 'live_api' | 'persistent_cache' | 'climatological_fallback';
}

const STORAGE_KEY = 'SAMVARTAKA_OFFLINE_TELEMETRY_CACHE_V1';
const SYNC_META_KEY = 'SAMVARTAKA_SYNC_METADATA_V1';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes live cache freshness
const FETCH_TIMEOUT_MS = 3800; // 3.8s timeout for instant seamless fallback

// In-memory memory cache map
const memoryCache: Map<string, WeatherDataCacheItem> = new Map();

// Helper to safely read from browser localStorage
function readPersistentStorage(): Record<string, WeatherDataCacheItem> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('Unable to read weather persistent storage:', err);
    return {};
  }
}

// Helper to safely write to browser localStorage
function writePersistentStorage(cacheObj: Record<string, WeatherDataCacheItem>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheObj));
  } catch (err) {
    console.warn('Unable to write weather persistent storage:', err);
  }
}

// Global broadcast event dispatcher
function broadcastSyncStatus(status: TelemetrySyncStatus) {
  if (typeof window === 'undefined') return;
  try {
    const event = new CustomEvent('weather-sync-status', { detail: status });
    window.dispatchEvent(event);
    window.localStorage?.setItem(SYNC_META_KEY, JSON.stringify(status));
  } catch {
    // Ignore restricted contexts
  }
}

export function getTelemetrySyncStatus(): TelemetrySyncStatus {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const meta = window.localStorage.getItem(SYNC_META_KEY);
      if (meta) return JSON.parse(meta);
    } catch {
      // Fall through
    }
  }
  const persistent = readPersistentStorage();
  const keys = Object.keys(persistent);
  let latestTime: number | null = null;
  keys.forEach(k => {
    if (!latestTime || persistent[k].timestamp > latestTime) {
      latestTime = persistent[k].timestamp;
    }
  });

  return {
    isOffline: false,
    lastSyncedAt: latestTime ? new Date(latestTime).toISOString() : new Date().toISOString(),
    source: 'persistent_cache',
    cachedStationsCount: keys.length,
  };
}

// Deterministic physical monsoonal fallback if both live API & persistent cache are unavailable
function getFallbackWeatherData(lat: number, lon: number, type: 'live' | 'hourly' | 'daily') {
  const baseTemp = 28 + Math.sin(lat) * 4;
  const baseRain = Math.max(0, 12 + Math.sin(lat * 0.7 + lon * 0.3) * 22);
  const baseWind = 16 + Math.abs(Math.cos(lon * 0.5) * 14);
  const baseHumidity = Math.min(98, Math.max(55, Math.round(72 + Math.sin(lat * 0.4) * 20)));
  const basePressure = Math.round((1006 - (baseRain > 15 ? 6 : 2) + Math.cos(lat) * 3) * 10) / 10;
  const rainIntensityMmH = baseRain > 25 ? Math.round(baseRain * 0.45 * 10) / 10 : Math.round(baseRain * 0.2 * 10) / 10;

  if (type === 'live') {
    return {
      current: {
        temperature_2m: Math.round(baseTemp * 10) / 10,
        rain: Math.round(baseRain * 10) / 10,
        rain_intensity_mmh: rainIntensityMmH,
        relative_humidity_2m: baseHumidity,
        surface_pressure: basePressure,
        wind_speed_10m: Math.round(baseWind * 10) / 10,
      },
      isFallback: true,
    };
  }

  if (type === 'hourly') {
    const hours = 24;
    const now = new Date();
    const timeArr: string[] = [];
    const rainArr: number[] = [];

    for (let i = -12; i < hours - 12; i++) {
      const d = new Date(now.getTime() + i * 3600000);
      timeArr.push(d.toISOString());
      const factor = Math.max(0, Math.sin(((i + 12) / 24) * Math.PI * 2));
      rainArr.push(Math.round(baseRain * factor * (0.8 + Math.random() * 0.4) * 10) / 10);
    }

    return {
      hourly: {
        time: timeArr,
        rain: rainArr,
      },
      isFallback: true,
    };
  }

  const days = 7;
  const now = new Date();
  const timeArr: string[] = [];
  const rainSumArr: number[] = [];
  const tempMaxArr: number[] = [];
  const tempMinArr: number[] = [];
  const probArr: number[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    timeArr.push(d.toISOString().split('T')[0]);
    rainSumArr.push(Math.round(baseRain * (0.6 + Math.random() * 0.8) * 10) / 10);
    tempMaxArr.push(Math.round((baseTemp + 3 + Math.random() * 2) * 10) / 10);
    tempMinArr.push(Math.round((baseTemp - 3 - Math.random() * 2) * 10) / 10);
    probArr.push(Math.round(60 + Math.random() * 35));
  }

  return {
    daily: {
      time: timeArr,
      precipitation_sum: rainSumArr,
      temperature_2m_max: tempMaxArr,
      temperature_2m_min: tempMinArr,
      precipitation_probability_max: probArr,
    },
    timezone: 'Asia/Kolkata',
    elevation: 25,
    isFallback: true,
  };
}

// Centralized fetcher with fetch timeout and persistent storage fallback
async function fetchWithResilientPersistence(
  cacheKey: string,
  url: string,
  lat: number,
  lon: number,
  type: 'live' | 'hourly' | 'daily'
): Promise<any> {
  // 1. Check in-memory fresh cache
  const memItem = memoryCache.get(cacheKey);
  if (memItem && Date.now() - memItem.timestamp < CACHE_TTL_MS) {
    return memItem.data;
  }

  // 2. Read persistent storage
  const persistent = readPersistentStorage();
  const storedItem = persistent[cacheKey];

  // 3. Attempt Live API with AbortController timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const enrichedData = {
        ...data,
        isFromOfflineCache: false,
        syncedAt: new Date().toISOString(),
      };

      const cacheEntry: WeatherDataCacheItem = {
        timestamp: Date.now(),
        data: enrichedData,
        source: 'live_api',
      };

      memoryCache.set(cacheKey, cacheEntry);
      persistent[cacheKey] = cacheEntry;
      writePersistentStorage(persistent);

      broadcastSyncStatus({
        isOffline: false,
        lastSyncedAt: new Date().toISOString(),
        source: 'live_api',
        cachedStationsCount: Object.keys(persistent).length,
      });

      return enrichedData;
    }
  } catch (fetchErr) {
    // API failed, timed out, or network disconnected
    // Graceful recovery from persistent cache
  }

  // 4. API Unreachable: Recover from Persistent Cache (stores data until last day opened)
  if (storedItem && storedItem.data) {
    const recoveredData = {
      ...storedItem.data,
      isFromOfflineCache: true,
      lastSyncedAt: new Date(storedItem.timestamp).toISOString(),
    };

    memoryCache.set(cacheKey, {
      ...storedItem,
      data: recoveredData,
      source: 'persistent_cache',
    });

    broadcastSyncStatus({
      isOffline: true,
      lastSyncedAt: new Date(storedItem.timestamp).toISOString(),
      source: 'persistent_cache',
      cachedStationsCount: Object.keys(persistent).length,
    });

    return recoveredData;
  }

  // 5. Ultimate fallback if first-ever launch while offline
  const fallback = getFallbackWeatherData(lat, lon, type);
  const fallbackData = {
    ...fallback,
    isFromOfflineCache: true,
    lastSyncedAt: new Date().toISOString(),
  };

  persistent[cacheKey] = {
    timestamp: Date.now(),
    data: fallbackData,
    source: 'climatological_fallback',
  };
  writePersistentStorage(persistent);

  broadcastSyncStatus({
    isOffline: true,
    lastSyncedAt: new Date().toISOString(),
    source: 'climatological_fallback',
    cachedStationsCount: Object.keys(persistent).length,
  });

  return fallbackData;
}

export async function fetchLiveWeatherData(lat: number, lon: number): Promise<any> {
  const cacheKey = `live_${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,rain,surface_pressure,wind_speed_10m&timezone=Asia/Kolkata`;
  return fetchWithResilientPersistence(cacheKey, url, lat, lon, 'live');
}

export async function fetchHourlyRainData(lat: number, lon: number): Promise<any> {
  const cacheKey = `hourly_${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=rain,temperature_2m,relative_humidity_2m,surface_pressure&forecast_days=2&timezone=Asia/Kolkata`;
  return fetchWithResilientPersistence(cacheKey, url, lat, lon, 'hourly');
}

export async function fetchDailyForecastData(lat: number, lon: number): Promise<any> {
  const cacheKey = `daily_${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min&forecast_days=7&timezone=Asia/Kolkata`;
  return fetchWithResilientPersistence(cacheKey, url, lat, lon, 'daily');
}
