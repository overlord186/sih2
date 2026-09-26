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
      transition={{ duration: 0.6, ease: 'easeOut' }}
      onAnimationComplete={onComplete}
      className={`fixed inset-0 pointer-events-none z-[90] overflow-hidden select-none ${className}`}
    >
      {/* Subtle translucent dark/cyan mist vignette clearing instantly */}
      <motion.div
        initial={{ opacity: 0.6, scale: 0.98 }}
        animate={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="absolute inset-0 shadow-[inset_0_0_120px_rgba(6,182,212,0.35)]"
      />

      {/* Center Landing Telemetry Badge */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div 
          initial={{ opacity: 1, y: 0, scale: 1 }}
          animate={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="flex flex-col items-center gap-2"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950/90 border border-sky-400/50 shadow-[0_8px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
            <span className="text-[10px] font-mono font-bold tracking-[0.25em] text-white uppercase">
              GRID INITIALIZED • SAMVARTAKA AI
            </span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
