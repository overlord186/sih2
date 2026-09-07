import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface LightningFlashOverlayProps {
  intensity: number;
  isDarkModeActive?: boolean;
}

export const LightningFlashOverlay = ({ intensity, isDarkModeActive }: LightningFlashOverlayProps) => {
  const [flashKey, setFlashKey] = useState<number>(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const scheduleFlash = () => {
      // Sporadic trigger: random delay between 3.5 to 7.5 seconds
      const nextFlashDelay = 3500 + Math.random() * 4000;
      
      timeout = setTimeout(() => {
        if (!isMounted) return;
        
        // Trigger a new flash cycle by incrementing key
        setIsActive(true);
        setFlashKey(prev => prev + 1);

        // Notify body & UI elements of lightning flash
        document.body.classList.add('lightning-active');
        window.dispatchEvent(new CustomEvent('lightning-flash'));
        
        // Disable after animation completes
        setTimeout(() => {
          if (isMounted) {
            setIsActive(false);
            document.body.classList.remove('lightning-active');
          }
        }, 650);
        
        scheduleFlash();
      }, nextFlashDelay);
    };

    if (intensity >= 120 || isDarkModeActive) {
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

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          key={flashKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.95, 0.15, 0.8, 0] }}
          transition={{ duration: 0.55, times: [0, 0.12, 0.22, 0.35, 1], ease: "easeOut" }}
          className="fixed inset-0 z-[9999] pointer-events-none bg-cyan-100/90 mix-blend-overlay"
        />
      )}
    </AnimatePresence>
  );
};
