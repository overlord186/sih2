import React, { useId } from 'react';
import {
  CloudRain,
  Sun,
  CloudLightning,
  Wind,
  Droplets,
  CheckCircle,
  Gauge,
  Compass,
  Sparkles,
  ShieldAlert,
  Info,
  TrendingDown,
  TrendingUp,
  Box,
} from 'lucide-react';
import { RainfallRegime } from '../types';

export interface KidVisualStageProps {
  timeLabel: string;
  hour: number;
  synopticPhase: string;
  stationName: string;
  rawForecastMm: number;
  aiForecastMm: number;
  detectedRegime: RainfallRegime;
  windSpeed: number;
  humidity: number;
  pressure: number;
  narrative: string;
  onToggle3D?: () => void;
}

export const KidVisualStage: React.FC<KidVisualStageProps> = ({
  timeLabel,
  hour,
  synopticPhase,
  stationName,
  rawForecastMm,
  aiForecastMm,
  detectedRegime,
  windSpeed,
  humidity,
  pressure,
  narrative,
  onToggle3D,
}) => {
  const uniqueId = useId();

  // Regime classification
  const isExtreme = detectedRegime === RainfallRegime.HEAVY_EXTREME || aiForecastMm >= 64.5;
  const isModerate = detectedRegime === RainfallRegime.MODERATE || (aiForecastMm >= 15.6 && aiForecastMm < 64.5);
  const isLight = detectedRegime === RainfallRegime.LIGHT || (aiForecastMm >= 2.5 && aiForecastMm < 15.6);
  const isDry = detectedRegime === RainfallRegime.DRY || aiForecastMm < 2.5;

  // Time of day determination
  const isNight = hour === 0 || hour >= 20 || hour <= 4;
  const isDawn = hour > 4 && hour <= 8;
  const isDusk = hour >= 17 && hour < 20;
  const isMidday = !isNight && !isDawn && !isDusk;

  // Anemometer spinning speed (seconds per full rotation based on windSpeed)
  // Higher wind = lower duration = faster spinning
  const anemometerDuration = Math.max(0.16, 8.5 / Math.max(windSpeed, 4));

  // Tree sway angle based on wind speed
  const treeSwayDegrees = Math.min(Math.max(windSpeed * 0.35, 2), 22);

  // Rain slant angle based on wind speed
  const rainSlant = Math.min(Math.round(windSpeed * 0.45), 25);

  // Beaufort wind description
  const getBeaufortDescription = (spd: number) => {
    if (spd < 12) return 'Light Breeze';
    if (spd < 20) return 'Moderate Breeze';
    if (spd < 30) return 'Fresh Breeze';
    if (spd < 40) return 'Strong Wind';
    return 'Gale Squall';
  };

  // Dynamic sky background gradient
  const getSkyGradient = () => {
    if (isExtreme) {
      // Dark, turbulent convective thunderstorm sky
      return 'from-slate-950 via-[#0c1322] to-[#1e1b4b]';
    }
    if (isModerate) {
      if (isNight) return 'from-[#030712] via-[#0f172a] to-[#1e293b]';
      if (isDusk) return 'from-[#1e1b4b] via-[#312e81] to-[#4338ca]';
      return 'from-slate-700 via-slate-800 to-indigo-950';
    }
    if (isLight) {
      if (isNight) return 'from-slate-900 via-indigo-950 to-slate-800';
      if (isDawn) return 'from-slate-800 via-amber-900/40 to-sky-900';
      if (isDusk) return 'from-purple-950 via-slate-800 to-amber-950/60';
      return 'from-sky-700 via-slate-600 to-blue-800';
    }
    // Dry / Clear sky
    if (isNight) return 'from-[#020617] via-[#090d16] to-[#0f172a]';
    if (isDawn) return 'from-sky-900 via-amber-700/60 to-orange-400/80';
    if (isDusk) return 'from-indigo-950 via-purple-900/80 to-amber-600/70';
    return 'from-sky-500 via-sky-400 to-sky-200';
  };

  // Actionable advisory and gear
  const getAdvisory = () => {
    if (isExtreme) {
      return {
        alertBadge: 'Red Warning: Torrential Deluge',
        badgeClass: 'bg-rose-600 text-white shadow-rose-900/30',
        icon: '⚠️🌧️',
        summary: 'Massive convective cloudburst! Severe urban runoff, rapid drainage overflow, and hazardous visibility.',
        action: 'Stay indoors, keep electrical gear off ground floors, avoid underpasses, and monitor emergency civic alerts.',
        aiImpact: `Coarse NWP forecast capped out at only ${rawForecastMm} mm. Machine learning corrected for sub-grid convective physics to predict ${aiForecastMm} mm.`,
      };
    }
    if (isModerate) {
      return {
        alertBadge: 'Orange Advisory: Heavy Monsoon Spells',
        badgeClass: 'bg-amber-600 text-white shadow-amber-900/30',
        icon: '🌧️☔',
        summary: 'Steady, persistent monsoonal rain bands with sustained squally winds across the station catchment.',
        action: 'Carry sturdy rainwear, waterproof transit covers, and allow extra travel buffer for waterlogged roads.',
        aiImpact: `AI calibrated model grid bias from ${rawForecastMm} mm to an accurate ${aiForecastMm} mm catchment accumulation.`,
      };
    }
    if (isLight) {
      return {
        alertBadge: 'Green Watch: Light Monsoon Showers',
        badgeClass: 'bg-teal-600 text-white shadow-teal-900/30',
        icon: '🌦️🌂',
        summary: 'Scattered intermittent drizzle and passing light shower cells beneath broken stratocumulus decks.',
        action: 'A compact folding umbrella or water-resistant light jacket is recommended for outdoor transit.',
        aiImpact: `AI fine-tuned the precipitation intensity from ${rawForecastMm} mm to an observed realistic rate of ${aiForecastMm} mm.`,
      };
    }
    return {
      alertBadge: 'Normal: Dry Break Spell',
      badgeClass: 'bg-emerald-600 text-white shadow-emerald-900/30',
      icon: '☀️🕶️',
      summary: 'Moisture trough shifted away from station. Sub-saturated boundary layer prevents surface rain.',
      action: 'Safe for sports, outdoor construction, civic utility maintenance, and rapid road transit.',
      aiImpact:
        rawForecastMm > 0
          ? `Zero-Rain Gate activated: Raw model predicted ${rawForecastMm} mm false drizzle, but AI recognized high evaporation and suppressed it to 0.0 mm.`
          : `Station dry conditions confirmed (${aiForecastMm} mm). Accurate verification against surface barometry.`,
    };
  };

  const advisory = getAdvisory();

  // Raindrop particle counts
  const rainStreakCount = isExtreme ? 48 : isModerate ? 28 : isLight ? 12 : 0;
  const rainStreaks = Array.from({ length: rainStreakCount });

  // Splash particle counts on ground
  const splashCount = isExtreme ? 14 : isModerate ? 8 : isLight ? 3 : 0;
  const splashes = Array.from({ length: splashCount });

  return (
    <div id="synoptic-animation-stage" className="rounded-2xl overflow-hidden border border-slate-700/80 shadow-md bg-slate-900 text-slate-100">
      {/* Visual Canvas Stage */}
      <div
        className={`relative h-72 sm:h-80 w-full bg-gradient-to-b ${getSkyGradient()} overflow-hidden transition-all duration-1000 select-none`}
        style={{
          // Custom CSS variable for dynamic tree sway
          ['--sway-deg' as string]: `${treeSwayDegrees}deg`,
        }}
      >
        {/* Night Sky: Starfield and Crescent Moon */}
        {isNight && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Stars */}
            <svg className="w-full h-40 opacity-75" xmlns="http://www.w3.org/2000/svg">
              <circle cx="8%" cy="18%" r="1" fill="#fff" opacity="0.8" className="animate-pulse" />
              <circle cx="15%" cy="32%" r="1.5" fill="#e0e7ff" opacity="0.9" />
              <circle cx="28%" cy="12%" r="1" fill="#fff" opacity="0.7" className="animate-pulse" />
              <circle cx="42%" cy="25%" r="1.5" fill="#fef08a" opacity="0.8" />
              <circle cx="58%" cy="15%" r="1" fill="#fff" opacity="0.9" className="animate-pulse" />
              <circle cx="72%" cy="28%" r="1.2" fill="#e0e7ff" opacity="0.85" />
              <circle cx="85%" cy="14%" r="1.5" fill="#fff" opacity="0.9" />
              <circle cx="93%" cy="22%" r="1" fill="#fef08a" opacity="0.75" className="animate-pulse" />
            </svg>

            {/* Glowing Moon */}
            {!isExtreme && (
              <div className="absolute top-4 right-10 flex flex-col items-center pointer-events-none">
                <div className="relative w-12 h-12 rounded-full bg-slate-100/90 shadow-[0_0_30px_rgba(255,255,255,0.4)] flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-indigo-950/80 transform translate-x-2 -translate-y-0.5" />
                </div>
                <span className="text-[10px] font-mono text-slate-300 mt-1.5 bg-slate-950/60 px-2 py-0.5 rounded-full border border-slate-700/50 backdrop-blur-xs">
                  {hour === 0 ? 'Midnight 00:00' : `${hour}:00 IST`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Daytime / Dawn Sun */}
        {!isNight && isDry && (
          <div className="absolute top-5 right-12 flex flex-col items-center pointer-events-none">
            <div className="relative w-16 h-16 rounded-full bg-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.85)] flex items-center justify-center animate-pulse">
              <Sun className="w-10 h-10 text-amber-100" />
            </div>
            {/* Solar lens flare rays */}
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-200/60 to-transparent -mt-8 rotate-45 pointer-events-none" />
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-200/60 to-transparent -mt-0.5 -rotate-45 pointer-events-none" />
            <span className="text-[10px] font-bold text-amber-950 mt-2 bg-amber-200/95 px-2.5 py-0.5 rounded-full shadow-xs border border-amber-300">
              Clear Insolation
            </span>
          </div>
        )}

        {/* Daytime Rainbow Arc during easing light rain */}
        {(isLight || (isModerate && isMidday)) && (
          <div className="absolute top-2 right-12 opacity-60 pointer-events-none transition-opacity duration-1000">
            <svg width="220" height="110" viewBox="0 0 220 110">
              <path d="M 15 110 A 95 95 0 0 1 205 110" fill="none" stroke="#ef4444" strokeWidth="3" opacity="0.65" />
              <path d="M 21 110 A 89 89 0 0 1 199 110" fill="none" stroke="#f97316" strokeWidth="3" opacity="0.65" />
              <path d="M 27 110 A 83 83 0 0 1 193 110" fill="none" stroke="#eab308" strokeWidth="3" opacity="0.65" />
              <path d="M 33 110 A 77 77 0 0 1 187 110" fill="none" stroke="#22c55e" strokeWidth="3" opacity="0.65" />
              <path d="M 39 110 A 71 71 0 0 1 181 110" fill="none" stroke="#3b82f6" strokeWidth="3" opacity="0.65" />
              <path d="M 45 110 A 65 65 0 0 1 175 110" fill="none" stroke="#a855f7" strokeWidth="3" opacity="0.65" />
            </svg>
          </div>
        )}

        {/* Ambient Sheet Lightning & Branching Forked Lightning */}
        {isExtreme && (
          <>
            {/* Sheet Lightning Flash */}
            <div
              className="absolute inset-0 bg-blue-100 pointer-events-none z-10"
              style={{ animation: 'lightningFlash 3.2s infinite' }}
            />

            {/* Forked Lightning Bolt SVG */}
            <div className="absolute top-3 right-16 sm:right-28 pointer-events-none z-10">
              <svg width="90" height="130" viewBox="0 0 90 130" className="animate-pulse">
                <path
                  d="M 50 0 L 32 45 L 48 48 L 18 95 L 34 92 L 5 130"
                  fill="none"
                  stroke="#fef08a"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="drop-shadow-[0_0_15px_rgba(254,240,138,0.95)]"
                />
                <path
                  d="M 48 48 L 68 75 L 56 82 L 72 105"
                  fill="none"
                  stroke="#e0e7ff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_10px_rgba(224,231,255,0.85)]"
                />
              </svg>
            </div>
          </>
        )}

        {/* Atmospheric Cloud Canopy with Multi-Layer Parallax Drift */}
        <div className="absolute top-0 left-0 right-0 h-36 pointer-events-none overflow-hidden">
          {/* Back Cloud Layer (Slow Float) */}
          <div
            className="absolute top-1 -left-12 -right-12 flex justify-around opacity-60"
            style={{ animation: 'cloudFloatSlow 18s ease-in-out infinite' }}
          >
            <div
              className={`w-64 h-24 rounded-full blur-xs ${
                isExtreme ? 'bg-slate-900' : isModerate ? 'bg-slate-800' : isLight ? 'bg-slate-500' : 'bg-white/70'
              }`}
            />
            <div
              className={`w-80 h-28 rounded-full blur-xs ${
                isExtreme ? 'bg-slate-950' : isModerate ? 'bg-slate-800' : isLight ? 'bg-slate-600' : 'bg-white/80'
              }`}
            />
            <div
              className={`hidden sm:block w-72 h-24 rounded-full blur-xs ${
                isExtreme ? 'bg-slate-900' : isModerate ? 'bg-slate-700' : isLight ? 'bg-slate-400' : 'bg-white/60'
              }`}
            />
          </div>

          {/* Front Sculpted Cloud Deck (Active Storm / Overcast) */}
          <div
            className="absolute top-4 -left-8 -right-8 flex justify-between opacity-90"
            style={{ animation: 'cloudFloatSlow 12s ease-in-out infinite reverse' }}
          >
            <div
              className={`w-48 h-20 rounded-full blur-[0.5px] ${
                isExtreme ? 'bg-[#0b1120]' : isModerate ? 'bg-slate-900' : isLight ? 'bg-slate-700' : 'bg-white/90'
              }`}
            />
            <div
              className={`w-96 h-28 rounded-full blur-[0.5px] ${
                isExtreme ? 'bg-[#030712]' : isModerate ? 'bg-slate-950' : isLight ? 'bg-slate-800' : 'bg-white/95'
              }`}
            />
            <div
              className={`hidden sm:block w-56 h-22 rounded-full blur-[0.5px] ${
                isExtreme ? 'bg-[#0f172a]' : isModerate ? 'bg-slate-900' : isLight ? 'bg-slate-600' : 'bg-white/80'
              }`}
            />
          </div>
        </div>

        {/* Animated Falling Rain Streaks */}
        {rainStreakCount > 0 && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
            {rainStreaks.map((_, i) => {
              const leftPercent = (i * 2.1 + (i % 5) * 4) % 100;
              const duration = isExtreme
                ? 0.28 + (i % 6) * 0.05
                : isModerate
                ? 0.45 + (i % 6) * 0.08
                : 0.75 + (i % 6) * 0.15;
              const delay = (i % 12) * 0.07;
              const height = isExtreme ? 28 : isModerate ? 18 : 11;
              const opacity = isExtreme ? 0.9 : isModerate ? 0.75 : 0.55;

              return (
                <span
                  key={i}
                  className="absolute w-[2px] bg-gradient-to-b from-transparent via-sky-300 to-sky-100 rounded-full"
                  style={{
                    left: `${leftPercent}%`,
                    top: '-30px',
                    height: `${height}px`,
                    opacity,
                    animation: `fall ${duration}s linear ${delay}s infinite`,
                    transform: `rotate(${rainSlant}deg)`,
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Rain Splashes Bouncing on Ground / Roof */}
        {splashCount > 0 && (
          <div className="absolute bottom-6 sm:bottom-8 left-0 right-0 h-10 pointer-events-none z-20 overflow-hidden">
            {splashes.map((_, i) => {
              const leftPercent = 8 + (i * 12 + (i % 3) * 7) % 84;
              const delay = (i % 5) * 0.18;
              const duration = 0.5 + (i % 4) * 0.1;

              return (
                <div
                  key={i}
                  className="absolute bottom-1"
                  style={{
                    left: `${leftPercent}%`,
                    animation: `splashBounce ${duration}s ease-out ${delay}s infinite`,
                  }}
                >
                  <svg width="18" height="12" viewBox="0 0 18 12">
                    <circle cx="9" cy="9" r="2" fill="#7dd3fc" opacity="0.9" />
                    <circle cx="5" cy="4" r="1.2" fill="#bae6fd" opacity="0.8" />
                    <circle cx="13" cy="3" r="1.2" fill="#bae6fd" opacity="0.8" />
                  </svg>
                </div>
              );
            })}
          </div>
        )}

        {/* Floating Top-Left Station & Regime Badge */}
        <div className="absolute top-3 left-3 sm:left-4 z-30 flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-700/80 shadow-lg text-white flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg">
                {isExtreme ? '⛈️' : isModerate ? '🌧️' : isLight ? '🌦️' : '☀️'}
              </span>
              <div>
                <span className="text-xs font-bold block leading-tight text-white drop-shadow-xs">
                  {stationName}
                </span>
                <span className="text-[10px] text-slate-300 font-mono flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  {timeLabel} • {synopticPhase}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Top-Right Live Atmospheric Telemetry HUD */}
        <div className="absolute top-3 right-3 sm:right-4 z-30 hidden sm:flex items-center gap-2">
          {/* Wind Telemetry Pill */}
          <div className="px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-700/80 text-[11px] font-mono flex items-center gap-1.5 text-slate-200 shadow-md">
            <Wind className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold text-white">{windSpeed} km/h</span>
            <span className="text-[9px] text-slate-400">({getBeaufortDescription(windSpeed)})</span>
          </div>

          {/* Barometric Pressure Pill */}
          <div className="px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-700/80 text-[11px] font-mono flex items-center gap-1.5 text-slate-200 shadow-md">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            <span className={`font-semibold ${pressure < 998 ? 'text-rose-400 font-bold' : 'text-white'}`}>
              {pressure.toFixed(1)} hPa
            </span>
            {pressure < 1000 ? (
              <TrendingDown className="w-3 h-3 text-rose-400" />
            ) : (
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            )}
          </div>

          {/* Relative Humidity Pill */}
          <div className="px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-700/80 text-[11px] font-mono flex items-center gap-1.5 text-slate-200 shadow-md">
            <Droplets className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold text-white">{humidity}% RH</span>
          </div>

          {/* Switch to 3D Button */}
          {onToggle3D && (
            <button
              onClick={onToggle3D}
              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              title="Switch to Interactive 3D WebGL World"
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D World</span>
            </button>
          )}
        </div>

        {/* Landscape Ground & Vector Observatory Environment */}
        <div className="absolute bottom-0 left-0 right-0 h-36 pointer-events-none z-10">
          {/* Distant Mountain Ridges Layer */}
          <svg viewBox="0 0 1000 120" preserveAspectRatio="none" className="w-full h-24 absolute bottom-12 left-0 right-0 opacity-40">
            <path
              d="M0,70 Q180,20 340,65 T700,45 T1000,60 L1000,120 L0,120 Z"
              fill={isExtreme ? '#020617' : isModerate ? '#0f172a' : isLight ? '#1e293b' : '#334155'}
            />
          </svg>

          {/* Mid-ground Rolling Hill with Valley Fog */}
          <svg viewBox="0 0 1000 120" preserveAspectRatio="none" className="w-full h-20 absolute bottom-6 left-0 right-0 opacity-70">
            <path
              d="M0,50 Q220,10 460,45 T850,25 T1000,40 L1000,120 L0,120 Z"
              fill={isExtreme ? '#090d16' : isModerate ? '#0f172a' : isLight ? '#1e293b' : '#14532d'}
            />
          </svg>

          {/* Ground Base Pavement & Soil Layer */}
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-slate-950 via-slate-900 to-slate-800/90 border-t border-slate-700/60" />

          {/* Dynamic Water Canal / Puddle Level */}
          {aiForecastMm > 0 && (
            <div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-900/90 via-sky-800/80 to-sky-600/60 transition-all duration-1000 border-t border-sky-400/50"
              style={{
                height: `${Math.min(6 + Math.round(aiForecastMm * 0.22), 24)}px`,
                animation: 'waterRipples 3s ease-in-out infinite',
              }}
            >
              {/* Water surface reflection shimmer */}
              <div className="w-full h-[1px] bg-sky-200/70 shadow-[0_0_8px_#38bdf8]" />
            </div>
          )}

          {/* VECTOR SCENE: Meteorological Observatory + Spinning Anemometer + Trees */}
          <div className="absolute bottom-2 left-4 sm:left-12 flex items-end gap-3 sm:gap-6">
            {/* Swaying Tree 1 (Palm) */}
            <div
              className="transform origin-bottom transition-transform duration-700"
              style={{
                transform: `rotate(${treeSwayDegrees}deg)`,
                animation: `treeSway ${Math.max(1.8, 4.5 - windSpeed * 0.08)}s ease-in-out infinite`,
              }}
            >
              <svg width="46" height="78" viewBox="0 0 46 78">
                {/* Trunk */}
                <path d="M 23 78 Q 21 45 23 25" stroke="#78350f" strokeWidth="4.5" strokeLinecap="round" fill="none" />
                {/* Palm Fronds */}
                <path d="M 23 25 Q 10 15 2 26" stroke="#15803d" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M 23 25 Q 12 6 20 0" stroke="#16a34a" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M 23 25 Q 34 8 42 16" stroke="#22c55e" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M 23 25 Q 38 22 45 32" stroke="#15803d" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M 23 25 Q 8 28 0 38" stroke="#166534" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </svg>
            </div>

            {/* Vector Meteorological Observatory Station Building */}
            <div className="relative flex flex-col items-center">
              {/* Rooftop Meteorological Equipment Mast */}
              <div className="relative w-28 h-20 flex justify-center items-end">
                {/* Doppler Radar Dome on Left Pillar */}
                <div className="absolute bottom-0 left-2 flex flex-col items-center">
                  {/* Spherical Radome */}
                  <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-slate-400 shadow-md flex items-center justify-center overflow-hidden">
                    {/* Rotating Radar Sweep beam inside dome */}
                    <div
                      className="w-full h-full bg-gradient-to-tr from-transparent via-cyan-400/40 to-cyan-500/80 rounded-full"
                      style={{ animation: 'radarSweep 2.5s linear infinite' }}
                    />
                  </div>
                  {/* Radome Pedestal */}
                  <div className="w-3 h-3 bg-slate-600 border border-slate-500" />
                </div>

                {/* Central Anemometer Tower (Cup Wind Sensor) */}
                <div className="absolute bottom-0 left-12 flex flex-col items-center z-10">
                  {/* SPINNING ANEMOMETER CUPS */}
                  <div
                    className="relative w-8 h-8 flex items-center justify-center"
                    style={{
                      animation: `anemometerSpin ${anemometerDuration}s linear infinite`,
                      transformOrigin: 'center center',
                    }}
                    title={`Wind Sensor: ${windSpeed} km/h`}
                  >
                    {/* Horizontal 3-Arm Spindle */}
                    <div className="absolute w-7 h-[2px] bg-slate-300" />
                    <div className="absolute w-[2px] h-7 bg-slate-300" />
                    {/* Cups */}
                    <div className="absolute -top-1 left-2 w-2.5 h-2.5 rounded-full bg-red-500 shadow-xs border border-red-700" />
                    <div className="absolute top-2 -right-1 w-2.5 h-2.5 rounded-full bg-slate-100 shadow-xs border border-slate-400" />
                    <div className="absolute -bottom-1 left-3 w-2.5 h-2.5 rounded-full bg-slate-100 shadow-xs border border-slate-400" />
                    <div className="absolute top-3 -left-1 w-2.5 h-2.5 rounded-full bg-slate-100 shadow-xs border border-slate-400" />
                  </div>

                  {/* Wind Direction Arrow (Vane) */}
                  <div
                    className="w-6 h-1 bg-amber-400 -mt-1 rounded-full shadow-xs flex items-center justify-end"
                    style={{
                      transform: `rotate(${Math.min(windSpeed * 1.5, 45)}deg)`,
                      transition: 'transform 0.5s ease-out',
                    }}
                  >
                    <div className="w-1.5 h-1.5 bg-amber-300 rotate-45 transform translate-x-0.5" />
                  </div>

                  {/* Vertical Steel Mast */}
                  <div className="w-1.5 h-8 bg-gradient-to-b from-slate-400 to-slate-600 shadow-xs" />
                </div>

                {/* Rain Gauge Funnel on Right Roof */}
                <div className="absolute bottom-0 right-2 flex flex-col items-center">
                  <div className="w-4 h-3 bg-teal-500 rounded-t-sm border border-teal-400 flex items-center justify-center">
                    <span className="text-[7px] text-white font-mono">RG</span>
                  </div>
                  <div className="w-2 h-2 bg-slate-600" />
                </div>
              </div>

              {/* Main Observatory Building */}
              <div className="w-32 h-16 bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-600 rounded-t-lg shadow-xl p-1.5 flex flex-col justify-between">
                {/* Station Callsign LED Strip */}
                <div className="flex items-center justify-between px-1 bg-slate-950/90 rounded border border-slate-700 py-0.5">
                  <span className="text-[8px] font-mono font-bold text-sky-400 truncate">
                    IMD-{stationName.split(' ')[0]}
                  </span>
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                </div>

                {/* Observatory Glass Windows with Interior Warm Light */}
                <div className="flex items-center justify-around gap-1 px-1">
                  <div className="w-5 h-6 rounded-sm bg-gradient-to-b from-amber-200/90 to-amber-500/80 border border-amber-600/50 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  <div className="w-5 h-6 rounded-sm bg-gradient-to-b from-amber-200/90 to-amber-500/80 border border-amber-600/50 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  <div className="w-5 h-6 rounded-sm bg-gradient-to-b from-amber-200/90 to-amber-500/80 border border-amber-600/50 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  <div className="w-5 h-6 rounded-sm bg-slate-950 border border-slate-700 flex items-center justify-center">
                    <div className="w-2 h-4 bg-slate-800 rounded-xs" />
                  </div>
                </div>
              </div>
            </div>

            {/* Swaying Banyan / Deciduous Tree 2 */}
            <div
              className="transform origin-bottom transition-transform duration-700"
              style={{
                transform: `rotate(${Math.round(treeSwayDegrees * 0.75)}deg)`,
                animation: `treeSway ${Math.max(2.2, 5.0 - windSpeed * 0.07)}s ease-in-out infinite`,
              }}
            >
              <svg width="56" height="84" viewBox="0 0 56 84">
                <path d="M 28 84 Q 26 50 28 32" stroke="#451a03" strokeWidth="5.5" strokeLinecap="round" fill="none" />
                {/* Volumetric Foliage */}
                <circle cx="28" cy="26" r="16" fill="#15803d" opacity="0.95" />
                <circle cx="18" cy="20" r="12" fill="#16a34a" opacity="0.9" />
                <circle cx="38" cy="20" r="12" fill="#166534" opacity="0.9" />
                <circle cx="28" cy="14" r="13" fill="#22c55e" opacity="0.85" />
              </svg>
            </div>
          </div>

          {/* Floating Accumulation Gauge in Bottom-Right */}
          <div className="absolute bottom-2 right-4 sm:right-8 z-30 flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/80 text-white text-xs shadow-xl">
            {rainStreakCount > 0 && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500" />
              </span>
            )}
            <Droplets className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-slate-300 font-medium">Accumulation:</span>
            <span className="font-bold font-mono text-sky-300 text-sm">
              {aiForecastMm} mm
            </span>
          </div>
        </div>
      </div>

      {/* Atmospheric Context & AI Calibration Guidance Bar */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
        {/* Top Badges & Operational Advisory Header */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm flex items-center gap-1.5 ${advisory.badgeClass}`}>
              <ShieldAlert className="w-3.5 h-3.5" />
              {advisory.alertBadge}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Wind: <strong className="text-slate-200">{windSpeed} km/h</strong> • Pressure: <strong className="text-slate-200">{pressure.toFixed(1)} hPa</strong> • Moisture: <strong className="text-slate-200">{humidity}%</strong>
            </span>
          </div>

          {/* Model Comparison Pill */}
          <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1 rounded-lg border border-slate-700 text-xs font-mono">
            <span className="text-slate-400">NWP: <strong className="text-slate-200">{rawForecastMm} mm</strong></span>
            <span className="text-slate-500">→</span>
            <span className="text-sky-400 font-bold">AI: <strong>{aiForecastMm} mm</strong></span>
          </div>
        </div>

        {/* Dual Information Cards: Synoptic Condition vs AI Physical Correction */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
          {/* Atmospheric Condition & Safety Action */}
          <div className="md:col-span-7 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 shadow-2xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-200 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Synoptic Evolution & Public Safety
            </div>
            <p className="text-slate-300 leading-relaxed font-medium">
              {advisory.summary}
            </p>
            <p className="text-amber-300/90 leading-relaxed font-medium">
              <strong>Action:</strong> {advisory.action}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 italic border-t border-slate-800/80 pt-1">
              &ldquo;{narrative}&rdquo;
            </p>
          </div>

          {/* Machine Learning Bias Calibration Explanation */}
          <div className="md:col-span-5 bg-gradient-to-br from-blue-950/60 to-slate-950/80 p-3.5 rounded-xl border border-blue-900/60 shadow-2xs space-y-2 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-sky-300 text-xs">
                <CheckCircle className="w-3.5 h-3.5 text-sky-400" />
                Physical Model Bias Correction
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {advisory.aiImpact}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-blue-900/40 text-[11px] font-mono">
              <span className="text-slate-400">Regime: <strong className="text-slate-200">{detectedRegime}</strong></span>
              <span className="px-2 py-0.5 rounded bg-blue-950 text-sky-300 border border-blue-800 text-[10px]">
                {aiForecastMm > rawForecastMm
                  ? `+${(aiForecastMm - rawForecastMm).toFixed(1)} mm Boost`
                  : aiForecastMm < rawForecastMm
                  ? `${(aiForecastMm - rawForecastMm).toFixed(1)} mm Suppressed`
                  : 'Calibrated'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
