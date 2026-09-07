import React from 'react';
import { motion } from 'motion/react';

interface AtmosphericEdgeSmogProps {
  onComplete?: () => void;
  className?: string;
}

export const AtmosphericEdgeSmog: React.FC<AtmosphericEdgeSmogProps> = ({ 
  onComplete,
  className = '' 
}) => {
  return (
    <motion.div 
      id="atmospheric-edge-smog-frame"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 4.6, ease: [0.16, 1, 0.3, 1] }}
      onAnimationComplete={onComplete}
      className={`fixed inset-0 pointer-events-none z-[90] overflow-hidden select-none ${className}`}
    >
      {/* 1. Backdrop Blur Dissolve: Gentle, slow atmospheric clearing so webpage slowly materializes */}
      <motion.div
        initial={{ backdropFilter: 'blur(36px)', opacity: 1 }}
        animate={{ backdropFilter: 'blur(0px)', opacity: 0 }}
        transition={{ duration: 3.8, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 bg-white/75"
      />

      {/* 2. Perimeter Vignette Dispersing Outward and Fading Away */}
      <motion.div
        initial={{ opacity: 0.95, scale: 0.96 }}
        animate={{ opacity: 0, scale: 1.12 }}
        transition={{ duration: 4.4, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 shadow-[inset_0_0_240px_rgba(148,163,184,0.65),inset_0_0_120px_rgba(203,213,225,0.5)]"
      />

      {/* 3. Top Edge Smog Curtain: Sweeps Upward to Top Edge and Fades Away */}
      <motion.div
        initial={{ y: 0, opacity: 0.95 }}
        animate={{ y: '-130%', opacity: 0 }}
        transition={{ duration: 4.4, ease: [0.16, 1, 0.3, 1] }}
        className="absolute top-0 left-0 right-0 h-56 sm:h-72 bg-gradient-to-b from-white/98 via-slate-100/75 to-transparent backdrop-blur-md"
      />

      {/* 4. Bottom Edge Smog Curtain: Sweeps Downward to Bottom Edge and Fades Away */}
      <motion.div
        initial={{ y: 0, opacity: 0.95 }}
        animate={{ y: '130%', opacity: 0 }}
        transition={{ duration: 4.4, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-0 left-0 right-0 h-56 sm:h-72 bg-gradient-to-t from-white/98 via-slate-100/75 to-transparent backdrop-blur-md"
      />

      {/* 5. Left Edge Smog Curtain: Sweeps Outward to Left Edge and Fades Away */}
      <motion.div
        initial={{ x: 0, opacity: 0.95 }}
        animate={{ x: '-130%', opacity: 0 }}
        transition={{ duration: 4.4, ease: [0.16, 1, 0.3, 1] }}
        className="absolute top-0 bottom-0 left-0 w-56 sm:w-72 bg-gradient-to-r from-white/98 via-slate-100/75 to-transparent backdrop-blur-md"
      />

      {/* 6. Right Edge Smog Curtain: Sweeps Outward to Right Edge and Fades Away */}
      <motion.div
        initial={{ x: 0, opacity: 0.95 }}
        animate={{ x: '130%', opacity: 0 }}
        transition={{ duration: 4.4, ease: [0.16, 1, 0.3, 1] }}
        className="absolute top-0 bottom-0 right-0 w-56 sm:w-72 bg-gradient-to-l from-white/98 via-slate-100/75 to-transparent backdrop-blur-md"
      />

      {/* 7. Corner Smog Clouds: Billow Outward Past Screen Edges and Dissolve */}
      <motion.div
        initial={{ scale: 0.9, x: 0, y: 0, opacity: 0.95 }}
        animate={{ scale: 2.4, x: -180, y: -180, opacity: 0 }}
        transition={{ duration: 4.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,1)_0%,rgba(224,242,254,0.85)_40%,transparent_70%)] blur-2xl"
      />
      <motion.div
        initial={{ scale: 0.9, x: 0, y: 0, opacity: 0.95 }}
        animate={{ scale: 2.4, x: 180, y: -180, opacity: 0 }}
        transition={{ duration: 4.6, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
        className="absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,1)_0%,rgba(224,231,255,0.85)_40%,transparent_70%)] blur-2xl"
      />
      <motion.div
        initial={{ scale: 0.9, x: 0, y: 0, opacity: 0.95 }}
        animate={{ scale: 2.4, x: -180, y: 180, opacity: 0 }}
        transition={{ duration: 4.6, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
        className="absolute -bottom-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,1)_0%,rgba(240,249,255,0.85)_40%,transparent_70%)] blur-2xl"
      />
      <motion.div
        initial={{ scale: 0.9, x: 0, y: 0, opacity: 0.95 }}
        animate={{ scale: 2.4, x: 180, y: 180, opacity: 0 }}
        transition={{ duration: 4.6, ease: [0.16, 1, 0.3, 1], delay: 0.16 }}
        className="absolute -bottom-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,1)_0%,rgba(224,242,254,0.85)_40%,transparent_70%)] blur-2xl"
      />

      {/* 8. Center Meteorological Landing Status Pill */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div 
          initial={{ opacity: 1, y: 0, scale: 1 }}
          animate={{ opacity: 0, y: -45, scale: 0.92 }}
          transition={{ duration: 2.6, delay: 0.6, ease: 'easeOut' }}
          className="flex flex-col items-center gap-2"
        >
          <div className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-slate-950/85 border border-emerald-400/40 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-mono font-bold tracking-[0.25em] text-white uppercase">
              Touching Down • SAMVARTAKA Grid
            </span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
