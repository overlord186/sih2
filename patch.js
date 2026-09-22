import fs from 'fs';
let content = fs.readFileSync('src/components/MetricCards.tsx', 'utf8');

const targetCounter = `export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  precision = 2,
  prefix = '',
  suffix = '',
  showSign = false,
  duration = 600,
  className = '',
}) => {
  const safeTarget = typeof value === 'number' && !isNaN(value) && isFinite(value) ? value : 0;
  const [currentVal, setCurrentVal] = useState<number>(safeTarget);
  const prevValRef = useRef<number>(safeTarget);
  const rafRef = useRef<number | null>(null);
  const [isCounting, setIsCounting] = useState<boolean>(false);

  useEffect(() => {
    const startVal = prevValRef.current;
    const endVal = safeTarget;

    if (Math.abs(startVal - endVal) < 0.00001) {
      setCurrentVal(endVal);
      return;
    }

    setIsCounting(true);
    const startTime = performance.now();

    // Quartic ease-out curve for natural physical deceleration
    const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      const interpolated = startVal + (endVal - startVal) * eased;

      setCurrentVal(interpolated);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setCurrentVal(endVal);
        prevValRef.current = endVal;
        setIsCounting(false);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      prevValRef.current = currentVal;
    };
  }, [safeTarget, duration]);

  // Clean rounding logic avoiding floating point noise or negative zero
  const rounded = Math.abs(currentVal) < Math.pow(10, -precision - 1) ? 0 : currentVal;
  const numStr = rounded.toFixed(precision);
  
  let signStr = '';
  if (showSign) {
    if (rounded > 0.0001) {
      signStr = '+';
    }
  }

  return (
    <span
      className={\`inline-block tabular-nums font-mono transition-opacity duration-200 \${className} \${
        isCounting ? 'opacity-90' : 'opacity-100'
      }\`}
    >
      {signStr}{prefix}{numStr}{suffix}
    </span>
  );
};`;

const newCounter = `import { animate } from 'motion/react';\n\nexport const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  precision = 2,
  prefix = '',
  suffix = '',
  showSign = false,
  duration = 600,
  className = '',
}) => {
  const safeTarget = typeof value === 'number' && !isNaN(value) && isFinite(value) ? value : 0;
  const nodeRef = useRef<HTMLSpanElement>(null);
  const prevValueRef = useRef<number>(safeTarget);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const controls = animate(prevValueRef.current, safeTarget, {
      duration: duration / 1000,
      ease: 'easeOut',
      onUpdate: (latest) => {
        const rounded = Math.abs(latest) < Math.pow(10, -precision - 1) ? 0 : latest;
        let signStr = '';
        if (showSign && rounded > 0.0001) {
          signStr = '+';
        }
        node.textContent = \`\${signStr}\${prefix}\${rounded.toFixed(precision)}\${suffix}\`;
      },
    });

    prevValueRef.current = safeTarget;

    return controls.stop;
  }, [safeTarget, precision, prefix, suffix, showSign, duration]);

  const initialRounded = Math.abs(safeTarget) < Math.pow(10, -precision - 1) ? 0 : safeTarget;
  let initialSign = '';
  if (showSign && initialRounded > 0.0001) initialSign = '+';

  return (
    <motion.span
      ref={nodeRef}
      className={\`inline-block tabular-nums font-mono \${className}\`}
    >
      {initialSign}{prefix}{initialRounded.toFixed(precision)}{suffix}
    </motion.span>
  );
};`;

if(content.includes('export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({')) {
    // we need to use a regex or string replacement.
    // Let's just find the start and end of AnimatedCounter
    const startIdx = content.indexOf('export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({');
    const endIdxStr = '    </span>\n  );\n};';
    const endIdx = content.indexOf(endIdxStr, startIdx);
    if(startIdx !== -1 && endIdx !== -1) {
        const newContent = content.substring(0, startIdx) + newCounter.replace("import { animate } from 'motion/react';\\n\\n", "") + content.substring(endIdx + endIdxStr.length);
        
        // Let's add animate to imports if not there
        let modifiedContent = newContent;
        if (!modifiedContent.includes('import { animate } from \'motion/react\';')) {
            modifiedContent = modifiedContent.replace('import { motion, AnimatePresence } from \'motion/react\';', 'import { motion, AnimatePresence, animate } from \'motion/react\';');
        }
        
        fs.writeFileSync('src/components/MetricCards.tsx', modifiedContent);
        console.log('Successfully patched AnimatedCounter');
    } else {
        console.log('Could not find end of AnimatedCounter', startIdx, endIdx);
    }
} else {
    console.log('Could not find AnimatedCounter start');
}

// Next, add entrance animation to MetricCards container if needed.
let updatedContent = fs.readFileSync('src/components/MetricCards.tsx', 'utf8');

const oldCardsContainer = `<motion.div 
        layout
        id="metric-cards-container" 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >`;
const newCardsContainer = `<motion.div 
        layout
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ staggerChildren: 0.1, delayChildren: 0.1, duration: 0.4 }}
        id="metric-cards-container" 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >`;

if (updatedContent.includes(oldCardsContainer)) {
    updatedContent = updatedContent.replace(oldCardsContainer, newCardsContainer);
    fs.writeFileSync('src/components/MetricCards.tsx', updatedContent);
    console.log('Successfully patched MetricCards container');
} else {
    console.log('Could not find oldCardsContainer');
}
