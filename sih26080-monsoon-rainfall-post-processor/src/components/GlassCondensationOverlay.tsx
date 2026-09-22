import React, { useRef, useEffect, useState, useCallback } from 'react';

interface GlassCondensationOverlayProps {
  isActive?: boolean;
  onWipe?: () => void;
}

export const GlassCondensationOverlay: React.FC<GlassCondensationOverlayProps> = ({
  isActive = true,
  onWipe,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef(false);

  // Clear all condensation mist immediately
  const handleFullDefog = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        onWipe?.();
      }
    }
  }, [onWipe]);

  // Populate initial condensation mist with soft fog & micro-droplets
  const initMist = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    ctx.clearRect(0, 0, width, height);

    // Base frosted condensation layer
    ctx.fillStyle = 'rgba(230, 240, 255, 0.28)';
    ctx.fillRect(0, 0, width, height);

    // Micro droplet scatter
    const dropletCount = Math.floor((width * height) / 3600);
    for (let i = 0; i < dropletCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const r = 0.8 + Math.random() * 2.2;
      const alpha = 0.15 + Math.random() * 0.35;

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();

      // Droplet specular glint
      ctx.beginPath();
      ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();
    }
  }, [isActive]);

  // Listen to custom 'defog-lens' and 'refog-lens' events
  useEffect(() => {
    const onDefogEvent = () => {
      handleFullDefog();
    };
    const onRefogEvent = () => {
      initMist();
    };
    window.addEventListener('defog-lens', onDefogEvent);
    window.addEventListener('refog-lens', onRefogEvent);
    return () => {
      window.removeEventListener('defog-lens', onDefogEvent);
      window.removeEventListener('refog-lens', onRefogEvent);
    };
  }, [handleFullDefog, initMist]);

  // Handle interactive manual wiping with mouse/touch drag
  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    initMist();

    const handleResize = () => {
      if (isActive) initMist();
    };
    window.addEventListener('resize', handleResize);

    const wipeAt = (x: number, y: number, radius = 60) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';

      const grad = ctx.createRadialGradient(x, y, radius * 0.2, x, y, radius);
      grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
      grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.85)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    let lastX = -1;
    let lastY = -1;

    const handlePointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      wipeAt(e.clientX, e.clientY, 65);
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const x = e.clientX;
      const y = e.clientY;

      if (lastX > 0 && lastY > 0) {
        const dist = Math.hypot(x - lastX, y - lastY);
        const steps = Math.max(1, Math.floor(dist / 12));
        for (let s = 1; s <= steps; s++) {
          const ix = lastX + (x - lastX) * (s / steps);
          const iy = lastY + (y - lastY) * (s / steps);
          wipeAt(ix, iy, 60);
        }
      } else {
        wipeAt(x, y, 60);
      }
      lastX = x;
      lastY = y;
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      lastX = -1;
      lastY = -1;
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isActive, initMist]);

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
      {/* Condensation Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full pointer-events-auto cursor-crosshair touch-none"
      />
    </div>
  );
};
