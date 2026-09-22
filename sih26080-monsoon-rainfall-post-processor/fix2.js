import fs from 'fs';

let content = fs.readFileSync('src/components/ModelWeightVarianceVisualizer.tsx', 'utf8');

content = content.replace(
  "}) => {\n  // Climatology",
  "}) => {\n  const [showConfidenceInterval, setShowConfidenceInterval] = useState<boolean>(true);\n  // Climatology"
);

fs.writeFileSync('src/components/ModelWeightVarianceVisualizer.tsx', content);
