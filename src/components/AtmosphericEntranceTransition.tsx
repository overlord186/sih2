import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface AtmosphericEntranceTransitionProps {
  onComplete?: () => void;
  className?: string;
}

/**
 * AtmosphericEntranceTransition
 * 
 * Ultra-High-Fidelity Cinematic Cloud-Piercing & Interface Entry Transition:
 * - Guaranteed fail-safe timer (900ms) ensuring the interface is never stuck.
 * - GPU-accelerated canvas for smooth slipstream and vapor shockwaves.
 * - Dynamic telemetry readout with smooth dissolution.
 */
export const AtmosphericEntranceTransition: React.FC<AtmosphericEntranceTransitionProps> = ({
  onComplete,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const completedRef = useRef<boolean>(false);

  const handleFinish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete?.();
  };

  // Guaranteed fail-safe timer: will NEVER get stuck under any iframe or browser state
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFinish();
    }, 950);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const w = (canvas.width = Math.max(10, (canvas.clientWidth || winW || 1920) * dpr));
    const h = (canvas.height = Math.max(10, (canvas.clientHeight || winH || 1080) * dpr));

    const PARTICLE_COUNT = 90;
    const particles: {
      x: number;
      y: number;
      speed: number;
      length: number;
      width: number;
      opacity: number;
      hue: number;
    }[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        speed: 16 + Math.random() * 22,
        length: 20 + Math.random() * 60,
        width: 1 + Math.random() * 1.8,
        opacity: 0.3 + Math.random() * 0.5,
        hue: Math.random() > 0.4 ? 195 : 225,
      });
    }

    const rings: {
      radius: number;
      maxRadius: number;
      speed: number;
      opacity: number;
      cx: number;
      cy: number;
    }[] = [
      { radius: 10, maxRadius: Math.min(w, h) * 0.7, speed: 14, opacity: 0.6, cx: w * 0.5, cy: h * 0.45 },
    ];

    const startTime = performance.now();
    const duration = 850;

    const render = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);

      ctx.clearRect(0, 0, w, h);

      ctx.save();
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];
        p.y -= p.speed * dpr;
        if (p.y + p.length < 0) {
          p.y = h + Math.random() * 80;
          p.x = Math.random() * w;
        }

        const streakAlpha = p.opacity * (1.0 - Math.pow(progress, 2.0));
        ctx.strokeStyle = `hsla(${p.hue}, 95%, 75%, ${streakAlpha})`;
        ctx.lineWidth = p.width * dpr;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y + p.length * dpr);
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      for (const ring of rings) {
        ring.radius += ring.speed * dpr;
        const ringProgress = Math.min(1.0, ring.radius / ring.maxRadius);
        const ringAlpha = ring.opacity * (1.0 - ringProgress) * (1.0 - progress);

        if (ringAlpha > 0.01) {
          ctx.strokeStyle = `rgba(186, 230, 253, ${ringAlpha})`;
          ctx.lineWidth = 3 * dpr * (1.0 - ringProgress * 0.5);
          ctx.beginPath();
          ctx.ellipse(ring.cx, ring.cy, ring.radius, ring.radius * 0.55, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();

      if (progress < 1.0) {
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <motion.div
      id="atmospheric-entrance-transition-frame"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      onAnimationComplete={handleFinish}
      className={`fixed inset-0 pointer-events-none z-[120] overflow-hidden select-none ${className}`}
    >
      {/* 1. Deep Atmospheric Mist Dissipation */}
      <motion.div
        initial={{ opacity: 0.9 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.75, ease: 'easeOut' }}
        className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-900/70 to-cyan-950/80 backdrop-blur-sm"
      />

      {/* 2. Optical Iris Expansion */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0.7 }}
        animate={{ scale: 1.2, opacity: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="absolute inset-0 shadow-[inset_0_0_140px_rgba(6,182,212,0.4)]"
      />

      {/* 3. Slipstream Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-none"
      />

      {/* 4. Central Telemetry Badge */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0.94, 1, 1.01, 1.03],
            y: [10, 0, -2, -15],
          }}
          transition={{ duration: 0.8, times: [0, 0.2, 0.7, 1], ease: 'easeOut' }}
          className="flex flex-col items-center gap-2.5"
        >
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-950/95 border border-sky-400/70 shadow-[0_10px_35px_rgba(0,0,0,0.85),0_0_25px_rgba(6,182,212,0.35)] backdrop-blur-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-mono font-black tracking-[0.22em] text-white uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                SURFACE LOCK • SAMVARTAKA AI
              </span>
              <span className="text-[8.5px] font-mono text-sky-300/80 tracking-wider">
                CALIBRATING SENSORS • 12 METEOROLOGICAL STATIONS ACTIVE
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
