import fs from 'fs';

let content = fs.readFileSync('src/components/ModelWeightVarianceVisualizer.tsx', 'utf8');

// remove the trailing garbage
content = content.replace("  const [showConfidenceInterval, setShowConfidenceInterval] = useState<boolean>(true);\n  const alpha = realtimeWeight;undefined", "");

// inject state right after the component declaration
const decl = "export const ModelWeightVarianceVisualizer: React.FC<ModelWeightVarianceVisualizerProps> = ({";
content = content.replace(
  "  realtimeStdDev = 12.0\n}) => {\n  // Fixed Climatological Prior parameters",
  "  realtimeStdDev = 12.0\n}) => {\n  const [showConfidenceInterval, setShowConfidenceInterval] = useState<boolean>(true);\n  // Fixed Climatological Prior parameters"
);

fs.writeFileSync('src/components/ModelWeightVarianceVisualizer.tsx', content);
