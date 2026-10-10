import React, { useEffect, useRef, useState } from 'react';
import { VectorAdvectionEngine } from '../ml/vectorAdvectionEngine';
import { Wind, Play, Pause, Zap, Activity } from 'lucide-react';

interface WindVectorAdvectionOverlayProps {
  isVisible: boolean;
  onToggleVisible?: () => void;
  className?: string;
}

export const WindVectorAdvectionOverlay: React.FC<WindVectorAdvectionOverlayProps> = ({
  isVisible,
  onToggleVisible,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<VectorAdvectionEngine | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const [particleDensity, setParticleDensity] = useState<number>(850);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.2);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [activeVectorType, setActiveVectorType] = useState<'streamline' | 'moisture_flux' | 'surface_jet'>('streamline');

  // Initialize engine
  useEffect(() => {
    engineRef.current = new VectorAdvectionEngine(particleDensity);
  }, [particleDensity]);

  // Update speed multiplier when changed
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateWindIntensity(speedMultiplier);
    }
  }, [speedMultiplier]);

  // Main rendering loop with high DPI support
  useEffect(() => {
    if (!isVisible) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const render = () => {
      if (!engineRef.current || !isRunning) {
        animFrameIdRef.current = requestAnimationFrame(render);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Clear canvas on every frame so map remains 100% crisp and transparent
      ctx.clearRect(0, 0, width, height);

      // Step particles
      const particles = engineRef.current.step(0.0024 * speedMultiplier);

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.4;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.age <= 1) continue;

        const x0 = p.prevX * width;
        const y0 = p.prevY * height;
        const x1 = p.x * width;
        const y1 = p.y * height;

        // Skip wrap-around line segments
        const segDist = Math.hypot(x1 - x0, y1 - y0);
        if (segDist > width * 0.15) continue;

        // Opacity based on particle life curve (fade in, peak, fade out)
        const lifeFraction = p.age / p.maxAge;
        const alpha = Math.sin(lifeFraction * Math.PI) * 0.85;

        // Color based on velocity magnitude or vector type
        let strokeColor = `rgba(56, 189, 248, ${alpha})`; // sky cyan (calm)
        if (activeVectorType === 'moisture_flux') {
          // Moisture flux: deep green to tropical amber
          strokeColor =
            p.speedMs > 18
              ? `rgba(245, 158, 11, ${alpha})`
              : p.speedMs > 10
              ? `rgba(16, 185, 129, ${alpha})`
              : `rgba(45, 212, 191, ${alpha})`;
        } else if (activeVectorType === 'surface_jet') {
          // Monsoonal Jet core: vibrant electric purple to amber
          strokeColor =
            p.speedMs > 20
              ? `rgba(244, 63, 94, ${alpha})`
              : p.speedMs > 13
              ? `rgba(251, 146, 60, ${alpha})`
              : `rgba(168, 85, 247, ${alpha})`;
        } else {
          // Standard Atmospheric Streamlines
          if (p.speedMs > 22) {
            strokeColor = `rgba(244, 63, 94, ${alpha})`; // crimson gale
          } else if (p.speedMs > 14) {
            strokeColor = `rgba(251, 191, 36, ${alpha})`; // amber fresh
          } else if (p.speedMs > 7) {
            strokeColor = `rgba(52, 211, 153, ${alpha})`; // emerald moderate
          }
        }

        ctx.strokeStyle = strokeColor;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }

      ctx.restore();

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isVisible, isRunning, speedMultiplier, activeVectorType]);

  if (!isVisible) return null;

  return (
    <div className={`relative pointer-events-none w-full h-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* Floating HUD Pill Controls (Pointer events enabled for UI) */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-cyan-500/30 rounded-xl px-4 py-2.5 shadow-2xl flex flex-wrap items-center gap-3 text-xs text-slate-200">
        <div className="flex items-center gap-2 pr-3 border-r border-slate-700/60">
          <Wind className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="font-semibold text-slate-100 uppercase tracking-wider text-[11px]">
            RK2 Wind Advection
          </span>
          <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-[10px] text-cyan-300 font-mono">
            {particleDensity} particles
          </span>
        </div>

        {/* Vector Mode Selector */}
        <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/50">
          <button
            onClick={() => setActiveVectorType('streamline')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
              activeVectorType === 'streamline'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Streamlines
          </button>
          <button
            onClick={() => setActiveVectorType('moisture_flux')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
              activeVectorType === 'moisture_flux'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Moisture Flux
          </button>
          <button
            onClick={() => setActiveVectorType('surface_jet')}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
              activeVectorType === 'surface_jet'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Somali Jet
          </button>
        </div>

        {/* Speed Multiplier */}
        <div className="flex items-center gap-1.5 pl-1">
          <span className="text-slate-400 text-[11px]">Velocity:</span>
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={speedMultiplier}
            onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
            className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <span className="font-mono text-cyan-300 text-[11px] min-w-[28px]">
            {speedMultiplier.toFixed(1)}x
          </span>
        </div>

        {/* Particle Count Toggle */}
        <div className="flex items-center gap-1">
          {[500, 850, 1400].map((count) => (
            <button
              key={count}
              onClick={() => setParticleDensity(count)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                particleDensity === count
                  ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {count}
            </button>
          ))}
        </div>

        {/* Play/Pause Button */}
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          title={isRunning ? 'Pause advection' : 'Resume advection'}
        >
          {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        {onToggleVisible && (
          <button
            onClick={onToggleVisible}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/40 transition-all text-[11px]"
          >
            Hide
          </button>
        )}
      </div>
    </div>
  );
};
