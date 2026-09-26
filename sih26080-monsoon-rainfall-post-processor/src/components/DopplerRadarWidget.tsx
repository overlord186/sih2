import React, { useState, useEffect, useRef } from 'react';
import { Radio, Crosshair, RefreshCw, Zap, ShieldAlert, Compass, Activity, Volume2, Sparkles, Layers, Eye, Info, X, ChevronRight, Wind, CloudRain, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DopplerRadarWidgetProps {
  className?: string;
  onRadarPing?: () => void;
  isAudioMuted?: boolean;
}

interface RadarEcho {
  id: string;
  dist: number; // 0 to 1 normalized
  angle: number; // 0 to 360 deg
  intensity: number; // dBZ
  label: string;
  size: number;
  type: 'cyclonic' | 'convective' | 'stratiform' | 'microburst';
  altitude: string;
  speed: string;
  trend: 'intensifying' | 'steady' | 'decaying';
  rainRate: string; // mm/hr
  hazardLevel: 'LOW' | 'MODERATE' | 'SEVERE' | 'EXTREME';
  description: string;
}

// IMD / WSR-88D Marshall-Palmer conversion: R = (10^(dBZ/10) / 200)^(1/1.6)
const getRainfallRateDescription = (dbz: number): { rate: string; level: 'LOW' | 'MODERATE' | 'SEVERE' | 'EXTREME'; text: string; color: string } => {
  if (dbz >= 65) return { rate: '> 125 mm/hr', level: 'EXTREME', text: 'Violent Cloudburst / Hail Core', color: 'text-fuchsia-400' };
  if (dbz >= 55) return { rate: '65 - 120 mm/hr', level: 'SEVERE', text: 'Torrential Tropical Downpour', color: 'text-rose-400' };
  if (dbz >= 45) return { rate: '20 - 55 mm/hr', level: 'MODERATE', text: 'Heavy Convective Monsoon Rain', color: 'text-amber-400' };
  if (dbz >= 30) return { rate: '4 - 18 mm/hr', level: 'LOW', text: 'Moderate Steady Rain', color: 'text-yellow-300' };
  return { rate: '< 3 mm/hr', level: 'LOW', text: 'Light Drizzle / Mist', color: 'text-emerald-400' };
};

const SAMPLE_ECHOES: RadarEcho[] = [
  { 
    id: 'cell-1', 
    dist: 0.38, 
    angle: 38, 
    intensity: 62, 
    label: 'SAMVARTAKA Vortex Supercell', 
    size: 26, 
    type: 'cyclonic', 
    altitude: '14.2 km', 
    speed: '58 km/h NE', 
    trend: 'intensifying',
    rainRate: '115 mm/hr',
    hazardLevel: 'EXTREME',
    description: 'Rotating mesocyclone core with extreme precipitation reflectivities (>60 dBZ) and rapid cloudburst potential over the mountain crest.'
  },
  { 
    id: 'cell-2', 
    dist: 0.65, 
    angle: 130, 
    intensity: 54, 
    label: 'Coastal Convective Front', 
    size: 18, 
    type: 'convective', 
    altitude: '9.8 km', 
    speed: '34 km/h E', 
    trend: 'steady',
    rainRate: '48 mm/hr',
    hazardLevel: 'SEVERE',
    description: 'High-density convective rainband generating intense squall lines and localized flash flood runoffs.'
  },
  { 
    id: 'cell-3', 
    dist: 0.76, 
    angle: 220, 
    intensity: 68, 
    label: 'Offshore Mesocyclone Core', 
    size: 30, 
    type: 'cyclonic', 
    altitude: '16.5 km', 
    speed: '72 km/h N', 
    trend: 'intensifying',
    rainRate: '140 mm/hr',
    hazardLevel: 'EXTREME',
    description: 'Giant reflectivity core with deep convective updrafts and severe cyclonic wind shears.'
  },
  { 
    id: 'cell-4', 
    dist: 0.46, 
    angle: 305, 
    intensity: 42, 
    label: 'Orographic Inflow Band', 
    size: 16, 
    type: 'stratiform', 
    altitude: '6.4 km', 
    speed: '22 km/h SE', 
    trend: 'decaying',
    rainRate: '16 mm/hr',
    hazardLevel: 'MODERATE',
    description: 'Moisture-laden monsoon cloud deck lifted along the Western Ghats slopes, producing persistent steady rainfall.'
  },
  { 
    id: 'cell-5', 
    dist: 0.24, 
    angle: 275, 
    intensity: 58, 
    label: 'Alpine Microburst Sector', 
    size: 14, 
    type: 'microburst', 
    altitude: '8.1 km', 
    speed: '45 km/h ENE', 
    trend: 'steady',
    rainRate: '75 mm/hr',
    hazardLevel: 'SEVERE',
    description: 'Localized localized downburst cell delivering sudden high-velocity rain curtains and summit waterfall flooding.'
  },
];

export const DopplerRadarWidget: React.FC<DopplerRadarWidgetProps> = ({
  className = '',
  onRadarPing,
  isAudioMuted = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const azimuthRef = useRef<HTMLSpanElement>(null);
  const [selectedEcho, setSelectedEcho] = useState<RadarEcho>(SAMPLE_ECHOES[0]);
  const [radarMode, setRadarMode] = useState<'reflectivity' | 'velocity'>('reflectivity');
  const [rangeMode, setRangeMode] = useState<number>(150);
  const [showRadarLegendModal, setShowRadarLegendModal] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Sonar chirp sound synthesizer
  const playSonarPing = () => {
    if (isAudioMuted) return;
    try {
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(1620, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.35);

      osc2.frequency.setValueAtTime(810, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(390, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.38);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.38);
      osc2.stop(ctx.currentTime + 0.38);
    } catch {}
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle = 0;
    const size = 180;
    canvas.width = size;
    canvas.height = size;
    const center = size / 2;
    const maxRadius = center - 8;

    const render = () => {
      angle = (angle + 1.6) % 360;
      if (azimuthRef.current) {
        azimuthRef.current.textContent = `${Math.round(angle).toString().padStart(3, '0')}° AZ`;
      }

      ctx.clearRect(0, 0, size, size);

      // 1. Radar Base Scope Glass
      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, maxRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#020617';
      ctx.fill();

      // Deep Phosphor Gradient with Vignette
      const bgGrad = ctx.createRadialGradient(center, center, 0, center, center, maxRadius);
      bgGrad.addColorStop(0, 'rgba(16, 185, 129, 0.08)');
      bgGrad.addColorStop(0.5, 'rgba(6, 78, 59, 0.25)');
      bgGrad.addColorStop(0.85, 'rgba(2, 6, 23, 0.95)');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fill();

      // Hexagonal Radar Outer Ring
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.65)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 2. Concentric Range Rings (50km, 100km, 150km)
      [0.33, 0.66, 1.0].forEach((step, idx) => {
        ctx.beginPath();
        ctx.arc(center, center, maxRadius * step, 0, Math.PI * 2);
        ctx.strokeStyle = idx === 2 ? 'rgba(52, 211, 153, 0.45)' : 'rgba(52, 211, 153, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // 3. Precision Cardinal & Intercardinal Crosshairs
      for (let spoke = 0; spoke < 12; spoke++) {
        const spokeRad = (spoke * 30 * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.lineTo(center + Math.cos(spokeRad) * maxRadius, center + Math.sin(spokeRad) * maxRadius);
        ctx.strokeStyle = spoke % 3 === 0 ? 'rgba(52, 211, 153, 0.35)' : 'rgba(52, 211, 153, 0.12)';
        ctx.lineWidth = spoke % 3 === 0 ? 1.2 : 0.8;
        ctx.stroke();
      }

      // 4. Sweeping Dual-Phosphor Beam (Emerald Green + Cyan glow)
      const rad = (angle * Math.PI) / 180;
      const trailAngle = (Math.PI / 180) * 60; // 60 degree wide phosphor persistence

      const sweepGrad = ctx.createRadialGradient(center, center, 0, center, center, maxRadius);
      sweepGrad.addColorStop(0, 'rgba(52, 211, 153, 0.55)');
      sweepGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.28)');
      sweepGrad.addColorStop(1, 'rgba(6, 182, 212, 0.05)');

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, maxRadius, rad - trailAngle, rad, false);
      ctx.closePath();
      ctx.fillStyle = sweepGrad;
      ctx.fill();

      // Sharp Leading Radar Beam Line
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center + Math.cos(rad) * maxRadius, center + Math.sin(rad) * maxRadius);
      ctx.strokeStyle = 'rgba(167, 243, 208, 1)';
      ctx.lineWidth = 2.0;
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 5. Render Precipitation Echo Hotspots & Spiral Vortex Bands
      SAMPLE_ECHOES.forEach((echo) => {
        const echoRad = (echo.angle * Math.PI) / 180;
        const ex = center + Math.cos(echoRad) * (echo.dist * maxRadius);
        const ey = center + Math.sin(echoRad) * (echo.dist * maxRadius);

        let diff = (angle - echo.angle + 360) % 360;
        let brightness = 0.25;
        if (diff < 75) {
          brightness = 1.0 - (diff / 75) * 0.75;
        }

        // Color coding by Doppler reflectivity dBZ
        let color = 'rgba(52, 211, 153, '; // Green <45 dBZ
        if (echo.intensity >= 65) color = 'rgba(236, 72, 153, '; // Pink/Magenta extreme >65 dBZ
        else if (echo.intensity >= 55) color = 'rgba(239, 68, 68, '; // Red severe >55 dBZ
        else if (echo.intensity >= 45) color = 'rgba(245, 158, 11, '; // Amber high 45-55 dBZ

        // Draw multi-layered reflectivity gradient
        ctx.beginPath();
        const radSize = echo.size / 2;
        const grad = ctx.createRadialGradient(ex, ey, 0, ex, ey, radSize);
        grad.addColorStop(0, `${color}${0.95 * brightness})`);
        grad.addColorStop(0.5, `${color}${0.6 * brightness})`);
        grad.addColorStop(1, `${color}0)`);
        ctx.arc(ex, ey, radSize, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Selected Cell Targeting Bracket
        if (selectedEcho?.id === echo.id) {
          ctx.beginPath();
          ctx.arc(ex, ey, radSize + 3.5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * brightness})`;
          ctx.lineWidth = 1.4;
          ctx.setLineDash([2, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Intense Hotspot Core
        ctx.beginPath();
        ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${1.0 * brightness})`;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 6. Central Base Station Beacon
      ctx.beginPath();
      ctx.arc(center, center, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#34d399';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [selectedEcho, radarMode]);

  const handleCycleEcho = () => {
    playSonarPing();
    onRadarPing?.();
    const nextIdx = (SAMPLE_ECHOES.findIndex((e) => e.id === selectedEcho.id) + 1) % SAMPLE_ECHOES.length;
    setSelectedEcho(SAMPLE_ECHOES[nextIdx]);
  };

  const rainInfo = getRainfallRateDescription(selectedEcho.intensity);

  return (
    <>
      <div
        id="doppler-radar-bottom-left-hud"
        className={`pointer-events-auto select-none transition-all duration-300 ${className}`}
      >
        <div 
          onClick={handleCycleEcho}
          className="group relative hud-glass-panel hud-reticle-box bg-slate-950/90 border border-emerald-500/40 hover:border-emerald-400/80 rounded-2xl p-2.5 sm:p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.15)] flex items-center gap-3.5 cursor-pointer active:scale-95 transition-all"
          title="Click to ping Doppler radar & cycle storm cells. Click [i] for radar data guide."
        >
          {/* Radar Scope Canvas Container with Neon Bezel */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden border border-emerald-500/50 bg-slate-950 flex items-center justify-center shadow-[inset_0_0_12px_rgba(16,185,129,0.3)]">
            <canvas ref={canvasRef} className="w-full h-full block" />
            
            {/* Compass Azimuth Marks */}
            <span className="absolute top-0.5 text-[8px] font-mono text-emerald-400/90 font-bold tracking-tighter">N</span>
            <span className="absolute bottom-0.5 text-[8px] font-mono text-emerald-400/90 font-bold tracking-tighter">S</span>
            <span className="absolute left-1 text-[8px] font-mono text-emerald-400/90 font-bold tracking-tighter">W</span>
            <span className="absolute right-1 text-[8px] font-mono text-emerald-400/90 font-bold tracking-tighter">E</span>
          </div>

          {/* Dynamic Storm Telemetry Data Block */}
          <div className="flex flex-col gap-1 pr-1 min-w-[155px] sm:min-w-[185px]">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-300 tracking-wider">
                  DOPPLER RADAR
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <span ref={azimuthRef} className="text-[9.5px] font-mono font-feature-tabular-nums text-emerald-200/90 font-bold tracking-tight">
                  000° AZ
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRadarLegendModal(true);
                  }}
                  className="p-1 rounded-full bg-emerald-950/60 hover:bg-emerald-800/80 text-emerald-300 transition-colors border border-emerald-500/30"
                  title="What is the radar telling? Click to open full radar guide"
                >
                  <Info size={11} />
                </button>
              </div>
            </div>

            <div className="text-[11px] sm:text-xs text-slate-100 font-bold tracking-tight truncate max-w-[180px]">
              {selectedEcho.label}
            </div>

            {/* Clear human-readable precipitation translation */}
            <div className="flex items-center gap-1.5 text-[9px] font-mono">
              <span className={`font-bold px-1.5 py-0.5 rounded ${
                selectedEcho.intensity >= 60 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.3)]' : 
                selectedEcho.intensity >= 50 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.3)]' : 
                'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
              }`}>
                {selectedEcho.intensity} dBZ ({selectedEcho.rainRate})
              </span>
              <span className="text-sky-300 font-semibold">{rangeMode}km</span>
            </div>

            <div className="text-[8.5px] font-mono text-slate-400 truncate max-w-[180px]">
              {rainInfo.text}
            </div>
          </div>

          {/* Outer Glow Halo on Hover */}
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-emerald-500/0 via-emerald-400/20 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WHAT THE RADAR TELLS: INTERACTIVE EXPLANATION & DECIBEL GUIDE MODAL        */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showRadarLegendModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={() => setShowRadarLegendModal(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              className="relative w-full max-w-xl bg-slate-950/95 border border-emerald-500/50 rounded-3xl p-6 shadow-[0_0_60px_rgba(16,185,129,0.25)] text-slate-100 flex flex-col gap-5 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                    <Radio size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-mono font-bold text-base text-emerald-200 uppercase tracking-wide">
                      What Doppler Radar Tells You
                    </h3>
                    <p className="text-[11px] text-slate-400 font-sans">
                      IMD / WSR-88D Precipitation Reflectivity (dBZ) & Storm Telemetry
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRadarLegendModal(false)}
                  className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-700 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Active Selected Storm Cell Telemetry */}
              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Activity size={13} /> Active Tracked Cell: {selectedEcho.label}
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    selectedEcho.hazardLevel === 'EXTREME' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                    selectedEcho.hazardLevel === 'SEVERE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                    'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {selectedEcho.hazardLevel} HAZARD
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedEcho.description}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-[9px] font-mono text-slate-400">Reflectivity (dBZ)</div>
                    <div className="text-sm font-mono font-bold text-emerald-300">{selectedEcho.intensity} dBZ</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-[9px] font-mono text-slate-400">Rainfall Rate</div>
                    <div className="text-sm font-mono font-bold text-sky-300">{selectedEcho.rainRate}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-[9px] font-mono text-slate-400">Storm Speed</div>
                    <div className="text-sm font-mono font-bold text-amber-300">{selectedEcho.speed}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-[9px] font-mono text-slate-400">Cloud Top Height</div>
                    <div className="text-sm font-mono font-bold text-purple-300">{selectedEcho.altitude}</div>
                  </div>
                </div>
              </div>

              {/* Doppler dBZ Color Decibel Scale Table */}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-sky-400" /> dBZ Decibel Reflectivity Color Scale
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-emerald-500/20">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded bg-emerald-500 shrink-0" />
                      <span className="text-slate-200 font-bold">20 – 35 dBZ</span>
                    </div>
                    <span className="text-emerald-300 font-medium">1 – 5 mm/hr (Light/Moderate)</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded bg-amber-500 shrink-0" />
                      <span className="text-slate-200 font-bold">35 – 50 dBZ</span>
                    </div>
                    <span className="text-amber-300 font-medium">5 – 25 mm/hr (Heavy Rain)</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-rose-500/20">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded bg-rose-600 shrink-0" />
                      <span className="text-slate-200 font-bold">50 – 62 dBZ</span>
                    </div>
                    <span className="text-rose-300 font-medium">25 – 80 mm/hr (Severe Cloudburst)</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-fuchsia-500/20">
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 rounded bg-fuchsia-500 shrink-0" />
                      <span className="text-slate-200 font-bold">62+ dBZ</span>
                    </div>
                    <span className="text-fuchsia-300 font-medium">&gt; 100 mm/hr (Extreme Hail/Microburst)</span>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowRadarLegendModal(false)}
                className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close Radar Guide
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

