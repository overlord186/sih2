import { RainfallRegime, SynopticWeatherRegime } from '../types';
import { weatherSynth } from './audio';

export type AchievementId =
  | 'CLIMATE_EXPERT'
  | 'METEOROLOGIST'
  | 'MONSOON_ORACLE'
  | 'STREAK_CHAMPION'
  | 'CYCLONE_HUNTER'
  | 'RADAR_SPECIALIST'
  | 'SATELLITE_SPOTTER'
  | 'OROGRAPHIC_ANALYST'
  | 'CRISIS_COMMANDER'
  | 'DATA_SCIENTIST'
  | 'ATMOSPHERE_MASTER'
  | 'SYNOPTIC_MASTER';

export interface AchievementBadge {
  id: AchievementId;
  name: string;
  description: string;
  category: 'CHALLENGE' | 'EXPLORATION' | 'ANALYSIS' | 'MASTERY';
  xpReward: number;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  icon: string;
  hint: string;
  maxProgress: number;
  progress: number;
  unlocked: boolean;
  unlockedAt?: number;
}

export interface UserEngagementState {
  xp: number;
  level: number;
  levelTitle: string;
  badges: Record<
    AchievementId,
    {
      unlocked: boolean;
      unlockedAt?: number;
      progress: number;
    }
  >;
  regimesViewed: string[];
  synopticRegimesViewed: string[];
  forecastCount: number;
  dailyChallengesSolved: number;
  currentStreak: number;
  bestStreak: number;
  lastChallengeDateSolved?: string;
  dropsondeCount: number;
  radarInspectedCount: number;
  satelliteInspectedCount: number;
  orographicInspected: boolean;
  crisesCompleted: number;
  reportsDownloaded: number;
  atmospheresTested: string[];
}

export const BADGE_DEFINITIONS: Record<
  AchievementId,
  Omit<AchievementBadge, 'progress' | 'unlocked' | 'unlockedAt'>
> = {
  CLIMATE_EXPERT: {
    id: 'CLIMATE_EXPERT',
    name: 'Climate Expert',
    description: 'Inspect all 4 IMD rainfall regimes (Dry, Light, Moderate, Heavy/Extreme)',
    category: 'MASTERY',
    xpReward: 200,
    tier: 'GOLD',
    icon: 'Award',
    hint: 'Explore different rainfall regimes in the Regime Classifier or Dashboard.',
    maxProgress: 4,
  },
  METEOROLOGIST: {
    id: 'METEOROLOGIST',
    name: 'Meteorologist',
    description: 'Perform 5+ forecast diagnostic simulations across lead times or stations',
    category: 'ANALYSIS',
    xpReward: 150,
    tier: 'SILVER',
    icon: 'Compass',
    hint: 'Adjust forecast lead times, switch stations, or test seasonal progression.',
    maxProgress: 5,
  },
  MONSOON_ORACLE: {
    id: 'MONSOON_ORACLE',
    name: 'Monsoon Oracle',
    description: 'Accurately predict the weather regime in the Daily Monsoon Challenge',
    category: 'CHALLENGE',
    xpReward: 250,
    tier: 'GOLD',
    icon: 'Trophy',
    hint: 'Solve today’s Daily Challenge scenario by identifying the correct rainfall regime.',
    maxProgress: 1,
  },
  STREAK_CHAMPION: {
    id: 'STREAK_CHAMPION',
    name: 'Streak Champion',
    description: 'Achieve a 3-day consecutive streak in the Daily Monsoon Challenge',
    category: 'CHALLENGE',
    xpReward: 350,
    tier: 'DIAMOND',
    icon: 'Flame',
    hint: 'Complete the Daily Challenge on 3 consecutive days.',
    maxProgress: 3,
  },
  CYCLONE_HUNTER: {
    id: 'CYCLONE_HUNTER',
    name: 'Cyclone Hunter',
    description: 'Deploy an atmospheric dropsonde or inspect a Skew-T sounding profile',
    category: 'EXPLORATION',
    xpReward: 120,
    tier: 'BRONZE',
    icon: 'Plane',
    hint: 'Launch a dropsonde from the reconnaissance aircraft in the 3D Earth Observatory.',
    maxProgress: 1,
  },
  RADAR_SPECIALIST: {
    id: 'RADAR_SPECIALIST',
    name: 'Radar Specialist',
    description: 'Inspect 3 Doppler Weather Radar towers or examine 3D echo top columns',
    category: 'ANALYSIS',
    xpReward: 140,
    tier: 'BRONZE',
    icon: 'Radio',
    hint: 'Click Doppler radar stations on the 3D globe to view reflectivity and beam angles.',
    maxProgress: 3,
  },
  SATELLITE_SPOTTER: {
    id: 'SATELLITE_SPOTTER',
    name: 'Constellation Spotter',
    description: 'Track Earth observation satellite sensor swaths (INSAT-3DR, GPM Core, Sentinel-5P)',
    category: 'EXPLORATION',
    xpReward: 140,
    tier: 'BRONZE',
    icon: 'Satellite',
    hint: 'Click satellites in orbit around the 3D globe to view their sensor footprint.',
    maxProgress: 3,
  },
  OROGRAPHIC_ANALYST: {
    id: 'OROGRAPHIC_ANALYST',
    name: 'Orographic Analyst',
    description: 'Analyze mountain elevation transects and the Western Ghats rain shadow',
    category: 'ANALYSIS',
    xpReward: 120,
    tier: 'BRONZE',
    icon: 'Mountain',
    hint: 'Open the Orographic Transect cross-section tool in the 3D Observatory.',
    maxProgress: 1,
  },
  CRISIS_COMMANDER: {
    id: 'CRISIS_COMMANDER',
    name: 'Crisis Commander',
    description: 'Complete a planetary crisis management mission in Crisis Command',
    category: 'CHALLENGE',
    xpReward: 300,
    tier: 'GOLD',
    icon: 'ShieldCheck',
    hint: 'Take command in Crisis Command and successfully mitigate an extreme cyclone or cloudburst.',
    maxProgress: 1,
  },
  DATA_SCIENTIST: {
    id: 'DATA_SCIENTIST',
    name: 'Verification Scientist',
    description: 'Download an official meteorological dossier or examine ETS / CSI skill scores',
    category: 'ANALYSIS',
    xpReward: 160,
    tier: 'SILVER',
    icon: 'Sparkles',
    hint: 'Download the forecast evaluation report or inspect verification contingency matrices.',
    maxProgress: 2,
  },
  ATMOSPHERE_MASTER: {
    id: 'ATMOSPHERE_MASTER',
    name: 'Atmosphere Explorer',
    description: 'Experience 4 different atmospheric weather modes (Clear, Drizzle, Heavy, Cyclone, Dark)',
    category: 'EXPLORATION',
    xpReward: 130,
    tier: 'BRONZE',
    icon: 'CloudRain',
    hint: 'Switch weather atmosphere modes using the bottom-right atmosphere control widget.',
    maxProgress: 4,
  },
  SYNOPTIC_MASTER: {
    id: 'SYNOPTIC_MASTER',
    name: 'Master Synoptician',
    description: 'Identify and analyze all 5 Synoptic Weather Regimes across the monsoon system',
    category: 'MASTERY',
    xpReward: 250,
    tier: 'GOLD',
    icon: 'Layers',
    hint: 'Examine events featuring Active, Break, Depression, Coastal Surge, and Western Disturbance regimes.',
    maxProgress: 5,
  },
};

const STORAGE_KEY = 'samvartaka_user_engagement_v1';

export function getLevelInfo(xp: number): { level: number; title: string; nextLevelXp: number; progressPercent: number } {
  if (xp < 150) {
    return { level: 1, title: 'Apprentice Observer', nextLevelXp: 150, progressPercent: Math.round((xp / 150) * 100) };
  } else if (xp < 400) {
    return { level: 2, title: 'Junior Synoptician', nextLevelXp: 400, progressPercent: Math.round(((xp - 150) / 250) * 100) };
  } else if (xp < 850) {
    return { level: 3, title: 'Lead Meteorologist', nextLevelXp: 850, progressPercent: Math.round(((xp - 400) / 450) * 100) };
  } else if (xp < 1500) {
    return { level: 4, title: 'Chief Climate Director', nextLevelXp: 1500, progressPercent: Math.round(((xp - 850) / 650) * 100) };
  } else {
    return { level: 5, title: 'Atmospheric Maestro', nextLevelXp: 2500, progressPercent: 100 };
  }
}

const DEFAULT_STATE: UserEngagementState = {
  xp: 0,
  level: 1,
  levelTitle: 'Apprentice Observer',
  badges: {
    CLIMATE_EXPERT: { unlocked: false, progress: 0 },
    METEOROLOGIST: { unlocked: false, progress: 0 },
    MONSOON_ORACLE: { unlocked: false, progress: 0 },
    STREAK_CHAMPION: { unlocked: false, progress: 0 },
    CYCLONE_HUNTER: { unlocked: false, progress: 0 },
    RADAR_SPECIALIST: { unlocked: false, progress: 0 },
    SATELLITE_SPOTTER: { unlocked: false, progress: 0 },
    OROGRAPHIC_ANALYST: { unlocked: false, progress: 0 },
    CRISIS_COMMANDER: { unlocked: false, progress: 0 },
    DATA_SCIENTIST: { unlocked: false, progress: 0 },
    ATMOSPHERE_MASTER: { unlocked: false, progress: 0 },
    SYNOPTIC_MASTER: { unlocked: false, progress: 0 },
  },
  regimesViewed: [],
  synopticRegimesViewed: [],
  forecastCount: 0,
  dailyChallengesSolved: 0,
  currentStreak: 0,
  bestStreak: 0,
  dropsondeCount: 0,
  radarInspectedCount: 0,
  satelliteInspectedCount: 0,
  orographicInspected: false,
  crisesCompleted: 0,
  reportsDownloaded: 0,
  atmospheresTested: [],
};

export function loadUserEngagement(): UserEngagementState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    const badges = { ...DEFAULT_STATE.badges, ...(parsed.badges || {}) };
    return {
      ...DEFAULT_STATE,
      ...parsed,
      badges,
    };
  } catch (err) {
    console.warn('Could not load user engagement state:', err);
    return DEFAULT_STATE;
  }
}

export function saveUserEngagement(state: UserEngagementState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('achievements-updated', { detail: state }));
  } catch (err) {
    console.warn('Could not save user engagement state:', err);
  }
}

export function getAllBadges(state: UserEngagementState): AchievementBadge[] {
  return (Object.keys(BADGE_DEFINITIONS) as AchievementId[]).map((id) => {
    const def = BADGE_DEFINITIONS[id];
    const userBadge = state.badges[id] || { unlocked: false, progress: 0 };
    return {
      ...def,
      progress: Math.min(userBadge.progress, def.maxProgress),
      unlocked: userBadge.unlocked,
      unlockedAt: userBadge.unlockedAt,
    };
  });
}

function checkAndUnlockBadge(
  state: UserEngagementState,
  badgeId: AchievementId,
  progress: number
): boolean {
  const def = BADGE_DEFINITIONS[badgeId];
  const userBadge = state.badges[badgeId] || { unlocked: false, progress: 0 };
  const currentProgress = Math.max(userBadge.progress, progress);
  const isNowUnlocked = currentProgress >= def.maxProgress;

  state.badges[badgeId] = {
    progress: currentProgress,
    unlocked: userBadge.unlocked || isNowUnlocked,
    unlockedAt: userBadge.unlocked ? userBadge.unlockedAt : isNowUnlocked ? Date.now() : undefined,
  };

  if (!userBadge.unlocked && isNowUnlocked) {
    state.xp += def.xpReward;
    const lvl = getLevelInfo(state.xp);
    state.level = lvl.level;
    state.levelTitle = lvl.title;

    // Trigger celebration sound
    weatherSynth.playBadgeUnlockSound();

    // Dispatch unlock notification event
    window.dispatchEvent(
      new CustomEvent('achievement-unlocked', {
        detail: {
          ...def,
          progress: currentProgress,
          unlocked: true,
          unlockedAt: Date.now(),
        },
      })
    );
    return true;
  }
  return false;
}

// -----------------------------------------------------------------------------
// EVENT TRACKERS
// -----------------------------------------------------------------------------

export function trackRegimeView(regime: RainfallRegime): void {
  const state = loadUserEngagement();
  if (!state.regimesViewed.includes(regime)) {
    state.regimesViewed.push(regime);
    checkAndUnlockBadge(state, 'CLIMATE_EXPERT', state.regimesViewed.length);
    saveUserEngagement(state);
  }
}

export function trackSynopticRegimeView(regime: SynopticWeatherRegime): void {
  const state = loadUserEngagement();
  if (!state.synopticRegimesViewed.includes(regime)) {
    state.synopticRegimesViewed.push(regime);
    checkAndUnlockBadge(state, 'SYNOPTIC_MASTER', state.synopticRegimesViewed.length);
    saveUserEngagement(state);
  }
}

export function trackForecastUsage(): void {
  const state = loadUserEngagement();
  state.forecastCount += 1;
  checkAndUnlockBadge(state, 'METEOROLOGIST', state.forecastCount);
  saveUserEngagement(state);
}

export function trackDailyChallengeSolved(dateKey: string, pointsAwarded = 150): void {
  const state = loadUserEngagement();
  const today = dateKey;

  if (state.lastChallengeDateSolved !== today) {
    // Check if consecutive
    const lastDate = state.lastChallengeDateSolved ? new Date(state.lastChallengeDateSolved) : null;
    const currentDate = new Date(today);
    let isConsecutive = false;
    if (lastDate) {
      const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
      if (diffDays === 1) {
        isConsecutive = true;
      }
    }

    state.currentStreak = isConsecutive ? state.currentStreak + 1 : 1;
    state.bestStreak = Math.max(state.bestStreak, state.currentStreak);
    state.dailyChallengesSolved += 1;
    state.lastChallengeDateSolved = today;
    state.xp += pointsAwarded;

    const lvl = getLevelInfo(state.xp);
    state.level = lvl.level;
    state.levelTitle = lvl.title;

    checkAndUnlockBadge(state, 'MONSOON_ORACLE', 1);
    checkAndUnlockBadge(state, 'STREAK_CHAMPION', state.currentStreak);
    saveUserEngagement(state);
  }
}

export function trackDropsondeDeployed(): void {
  const state = loadUserEngagement();
  state.dropsondeCount += 1;
  checkAndUnlockBadge(state, 'CYCLONE_HUNTER', state.dropsondeCount);
  saveUserEngagement(state);
}

export function trackRadarInspected(): void {
  const state = loadUserEngagement();
  state.radarInspectedCount += 1;
  checkAndUnlockBadge(state, 'RADAR_SPECIALIST', state.radarInspectedCount);
  saveUserEngagement(state);
}

export function trackSatelliteInspected(): void {
  const state = loadUserEngagement();
  state.satelliteInspectedCount += 1;
  checkAndUnlockBadge(state, 'SATELLITE_SPOTTER', state.satelliteInspectedCount);
  saveUserEngagement(state);
}

export function trackOrographicInspected(): void {
  const state = loadUserEngagement();
  state.orographicInspected = true;
  checkAndUnlockBadge(state, 'OROGRAPHIC_ANALYST', 1);
  saveUserEngagement(state);
}

export function trackCrisisCompleted(): void {
  const state = loadUserEngagement();
  state.crisesCompleted += 1;
  checkAndUnlockBadge(state, 'CRISIS_COMMANDER', state.crisesCompleted);
  saveUserEngagement(state);
}

export function trackReportDownloaded(): void {
  const state = loadUserEngagement();
  state.reportsDownloaded += 1;
  checkAndUnlockBadge(state, 'DATA_SCIENTIST', state.reportsDownloaded);
  saveUserEngagement(state);
}

export function trackAtmosphereTested(mode: string): void {
  const state = loadUserEngagement();
  if (!state.atmospheresTested.includes(mode)) {
    state.atmospheresTested.push(mode);
    checkAndUnlockBadge(state, 'ATMOSPHERE_MASTER', state.atmospheresTested.length);
    saveUserEngagement(state);
  }
}

export function resetUserEngagement(): UserEngagementState {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  const fresh = { ...DEFAULT_STATE };
  window.dispatchEvent(new CustomEvent('achievements-updated', { detail: fresh }));
  return fresh;
}
