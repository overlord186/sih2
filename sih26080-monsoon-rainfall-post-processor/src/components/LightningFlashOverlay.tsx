import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LightningFlashOverlayProps {
  intensity: number;
  isDarkModeActive?: boolean;
}

/**
 * LightningFlashOverlay
 * 
 * Localized High-Intensity 3D Island Lightning Pulse:
 * - Clamps flash bounding box strictly to the central 3D island coordinates (36% to 64% X, 26% to 54% Y)
 * - Eliminates full-screen white-outs or screen washouts
 * - Localized plasma core with high-intensity ionization ring and sharp inverse-square Gaussian falloff
 * - Multi-stage pulse decay (pre-ionization spark -> discharge peak -> secondary return -> soft dissipation)
 */
export const LightningFlashOverlay: React.FC<LightningFlashOverlayProps> = ({ intensity, isDarkModeActive }) => {
  const [flashKey, setFlashKey] = useState<number>(0);
  const [isActive, setIsActive] = useState(false);
  const [strikePoint, setStrikePoint] = useState<{ x: number; y: number }>({ x: 50, y: 38 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const scheduleFlash = () => {
      // Sporadic trigger: random interval between 4.5s to 9.0s
      const nextFlashDelay = 4500 + Math.random() * 4500;

      timeout = setTimeout(() => {
        if (!isMounted) return;

        // Strictly clamp strike coordinates to central 3D mountain island boundaries
        const randX = 42 + (Math.random() - 0.5) * 16; // 34% to 50% X
        const randY = 34 + (Math.random() - 0.5) * 12; // 28% to 40% Y
        setStrikePoint({ x: randX, y: randY });

        setIsActive(true);
        setFlashKey(prev => prev + 1);

        document.body.classList.add('lightning-active');
        window.dispatchEvent(new CustomEvent('lightning-flash', { detail: { x: randX, y: randY } }));

        // Disable after localized pulse decay completes
        setTimeout(() => {
          if (isMounted) {
            setIsActive(false);
            document.body.classList.remove('lightning-active');
          }
        }, 650);

        scheduleFlash();
      }, nextFlashDelay);
    };

    if (intensity >= 80 || isDarkModeActive) {
      scheduleFlash();
    } else {
      setIsActive(false);
      document.body.classList.remove('lightning-active');
    }

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      document.body.classList.remove('lightning-active');
    };
  }, [intensity, isDarkModeActive]);

  // Localized Additive Island Plasma Shader rendering
  useEffect(() => {
    if (!isActive || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = (canvas.width = canvas.clientWidth * dpr);
    const h = (canvas.height = canvas.clientHeight * dpr);

    let animId: number;
    const startTime = performance.now();
    const duration = 600;

    // Generate jagged plasma filament branches for this specific strike
    const cx = (strikePoint.x / 100) * w;
    const cy = (strikePoint.y / 100) * h;
    const strikeTargetX = cx + (Math.random() - 0.5) * (w * 0.08);
    const strikeTargetY = cy + (h * 0.14);

    const boltPoints: { x: number; y: number }[] = [];
    const segments = 10;
    for (let s = 0; s <= segments; s++) {
      const t = s / segments;
      const jitterX = s > 0 && s < segments ? (Math.random() - 0.5) * (w * 0.04) : 0;
      boltPoints.push({
        x: cx + (strikeTargetX - cx) * t + jitterX,
        y: (cy - h * 0.12) + ((strikeTargetY - (cy - h * 0.12)) * t),
      });
    }

    const render = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / duration);

      ctx.clearRect(0, 0, w, h);

      if (progress < 1.0) {
        // Multi-stage localized pulse envelope:
        // 0.00-0.08: Steep ionization surge (0 -> 1.0)
        // 0.08-0.18: Rebound dip (1.0 -> 0.3)
        // 0.18-0.30: Return stroke flash (0.3 -> 0.9)
        // 0.30-1.00: Smooth localized exponential decay (0.9 -> 0.0)
        let alpha = 0;
        if (progress < 0.08) {
          alpha = progress / 0.08;
        } else if (progress < 0.18) {
          const t = (progress - 0.08) / 0.10;
          alpha = 1.0 - t * 0.7;
        } else if (progress < 0.30) {
          const t = (progress - 0.18) / 0.12;
          alpha = 0.3 + Math.sin(t * Math.PI) * 0.6;
        } else {
          const t = (progress - 0.30) / 0.70;
          alpha = 0.9 * Math.pow(1.0 - t, 3.0);
        }

        ctx.save();
        ctx.globalCompositeOperation = 'lighter'; // Additive blending strictly confined to island

        // Localized radius clamped strictly to the 3D island
        const islandRadius = Math.min(w, h) * 0.28;

        // 1. Mountain Peak Plasma Arc Core (Pure white hot core)
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, islandRadius * 0.35);
        coreGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.65})`);
        coreGrad.addColorStop(0.25, `rgba(224, 242, 254, ${alpha * 0.45})`);
        coreGrad.addColorStop(0.65, `rgba(56, 189, 248, ${alpha * 0.18})`);
        coreGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
        
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, islandRadius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // 2. High-Intensity Mountain Ridge Ionization Halo
        const haloGrad = ctx.createRadialGradient(cx, cy, islandRadius * 0.15, cx, cy, islandRadius);
        haloGrad.addColorStop(0, `rgba(186, 230, 253, ${alpha * 0.30})`);
        haloGrad.addColorStop(0.45, `rgba(99, 102, 241, ${alpha * 0.14})`);
        haloGrad.addColorStop(1, 'rgba(30, 27, 75, 0)');

        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, islandRadius, 0, Math.PI * 2);
        ctx.fill();

        // 3. Localized Lightning Filament Branch targeting mountain crest
        if (alpha > 0.15) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
          ctx.lineWidth = Math.max(1.5, 2.5 * alpha * dpr);
          ctx.beginPath();
          boltPoints.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();

          // Electric outer glow
          ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.45})`;
          ctx.lineWidth = Math.max(3.5, 6.0 * alpha * dpr);
          ctx.stroke();
        }

        ctx.restore();
        animId = requestAnimationFrame(render);
      }
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isActive, strikePoint, flashKey]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          key={flashKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[80] pointer-events-none flex items-center justify-center"
          style={{ mixBlendMode: 'plus-lighter' }}
        >
          {/* Additive Localized Island Shader Canvas */}
          <canvas
            ref={canvasRef}
            className="w-full h-full block pointer-events-none"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
