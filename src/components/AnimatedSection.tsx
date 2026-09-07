import React from 'react';
import { motion } from 'motion/react';

interface AnimatedSectionProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  id?: string;
}

export const AnimatedSection: React.FC<AnimatedSectionProps> = ({ children, delay = 0, className = '', id }) => {
  return (
    <motion.div
      id={id}
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        ease: 'easeOut',
        delay,
      }}
    >
      {children}
    </motion.div>
  );
};
