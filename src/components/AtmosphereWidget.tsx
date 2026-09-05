import React, { useState } from 'react';
import { Sun, CloudDrizzle, CloudLightning, Tornado, Settings2, Wind, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type AtmosphereMode = 'auto' | 'clear' | 'drizzle' | 'heavy' | 'cyclone';

interface Props {
  mode: AtmosphereMode;
  onChange: (mode: AtmosphereMode) => void;
}

export const AtmosphereWidget: React.FC<Props> = ({ mode, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const modes: { id: AtmosphereMode; label: string; icon: any; color: string }[] = [
    { id: 'auto', label: 'Auto (Chart Hover)', icon: Settings2, color: 'text-slate-500' },
    { id: 'clear', label: 'Clear Skies', icon: Sun, color: 'text-amber-500' },
    { id: 'drizzle', label: 'Drizzle', icon: CloudDrizzle, color: 'text-blue-400' },
    { id: 'heavy', label: 'Heavy Monsoon', icon: CloudLightning, color: 'text-indigo-500' },
    { id: 'cyclone', label: 'Severe Cyclonic', icon: Tornado, color: 'text-rose-500' },
  ];

  const activeMode = modes.find(m => m.id === mode) || modes[0];
  const MainIcon = isOpen ? X : activeMode.icon;
  const mainIconColor = isOpen ? 'text-slate-400' : activeMode.color;

  const radius = 80; // px distance from center

  return (
    <div className="fixed bottom-32 right-6 z-[45] flex items-center justify-center w-14 h-14">
      <AnimatePresence>
        {isOpen && (
          <>
            {modes.map((m, index) => {
              // Distribute 5 items evenly from top (-90 deg) to left (-180 deg)
              const angleDeg = -90 - (90 / (modes.length - 1)) * index; 
              const angleRad = (angleDeg * Math.PI) / 180;
              const x = radius * Math.cos(angleRad);
              const y = radius * Math.sin(angleRad);
              const active = mode === m.id;
              const Icon = m.icon;

              return (
                <motion.button
                  key={m.id}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.2, rotate: -45 }}
                  animate={{ opacity: 1, x, y, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, x: 0, y: 0, scale: 0.2, rotate: 45 }}
                  transition={{ type: "spring", stiffness: 400, damping: 14, delay: index * 0.05 }}
                  onClick={() => { onChange(m.id); setIsOpen(false); }}
                  className={`absolute w-12 h-12 rounded-full flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.1)] border backdrop-blur-md transition-colors ${
                    active 
                      ? 'bg-white border-blue-200 ring-2 ring-blue-500/20' 
                      : 'bg-white/90 border-slate-200/50 hover:bg-white hover:scale-110'
                  }`}
                  title={m.label}
                >
                  <Icon size={20} className={`${m.color} ${active ? 'opacity-100' : 'opacity-70'}`} strokeWidth={active ? 2.5 : 1.5} />
                </motion.button>
              );
            })}
          </>
        )}
      </AnimatePresence>
      
      {/* Main Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/60 flex items-center justify-center relative z-10 transition-colors"
        title="Atmosphere Settings"
      >
        <MainIcon size={24} className={`${mainIconColor} transition-colors duration-300`} strokeWidth={isOpen ? 2 : 2.5} />
      </motion.button>
    </div>
  );
};
