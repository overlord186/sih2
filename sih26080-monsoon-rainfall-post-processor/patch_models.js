import fs from 'fs';

let content = fs.readFileSync('src/components/InteractivePredictor.tsx', 'utf8');

// 1. Update State definition
content = content.replace(
  "const [selectedModel, setSelectedModel] = useState<'QRF' | 'PINN' | 'RF_BC' | 'ENSEMBLE'>('QRF');",
  "const [selectedModel, setSelectedModel] = useState<'Linear Regression' | 'Neural Network' | 'Random Forest' | 'Ensemble'>('Linear Regression');"
);

// 2. Update condition checks in modelOutputs
const oldModelLogic = `    let activeModelVal = qrfVal;
    let modelName = 'Quantile Random Forest (QRF)';

    if (selectedModel === 'PINN') {
      activeModelVal = pinnVal;
      modelName = 'Physics-Informed Neural Network (PINN)';
    } else if (selectedModel === 'RF_BC') {
      activeModelVal = rfBcVal;
      modelName = 'Random Forest Bias Corrector (RF-BC)';
    } else if (selectedModel === 'ENSEMBLE') {
      activeModelVal = blendVal;
      modelName = \`Multi-Model Ensemble (\${Math.round((ensembleWeights.qrf/totalWeight)*100)}% QRF / \${Math.round((ensembleWeights.pinn/totalWeight)*100)}% PINN / \${Math.round((ensembleWeights.rfBc/totalWeight)*100)}% RF-BC)\`;
    }`;

const newModelLogic = `    // Linear Regression mapped to base raw/climatology mix for simplicity, or we can use QRF's output
    let activeModelVal = qrfVal; 
    let modelName = 'Linear Regression';

    if (selectedModel === 'Neural Network') {
      activeModelVal = pinnVal;
      modelName = 'Neural Network';
    } else if (selectedModel === 'Random Forest') {
      activeModelVal = rfBcVal;
      modelName = 'Random Forest';
    } else if (selectedModel === 'Ensemble') {
      activeModelVal = blendVal;
      modelName = \`Multi-Model Ensemble (\${Math.round((ensembleWeights.qrf/totalWeight)*100)}% LR / \${Math.round((ensembleWeights.pinn/totalWeight)*100)}% NN / \${Math.round((ensembleWeights.rfBc/totalWeight)*100)}% RF)\`;
    }`;
    
content = content.replace(oldModelLogic, newModelLogic);

fs.writeFileSync('src/components/InteractivePredictor.tsx', content);
console.log('Done 1');
