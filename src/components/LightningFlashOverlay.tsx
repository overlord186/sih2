import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const LightningFlashOverlay = ({ intensity }: { intensity: number }) => {
  const [flashKey, setFlashKey] = useState<number>(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const scheduleFlash = () => {
      // Sporadic trigger: random delay between 3 to 8 seconds
      const nextFlashDelay = 3000 + Math.random() * 5000;
      
      timeout = setTimeout(() => {
        if (!isMounted) return;
        
        // Trigger a new flash cycle by incrementing key
        setIsActive(true);
        setFlashKey(prev => prev + 1);
        
        // Disable after animation completes so it can be re-triggered
        setTimeout(() => {
           if (isMounted) setIsActive(false);
        }, 600);
        
        scheduleFlash();
      }, nextFlashDelay);
    };

    if (intensity >= 120) {
      scheduleFlash();
    } else {
      setIsActive(false);
    }

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [intensity]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          key={flashKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.85, 0.1, 0.7, 0] }}
          transition={{ duration: 0.5, times: [0, 0.1, 0.2, 0.3, 1], ease: "easeOut" }}
          className="fixed inset-0 z-[9999] pointer-events-none bg-white mix-blend-overlay"
        />
      )}
    </AnimatePresence>
  );
};
