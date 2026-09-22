import fs from 'fs';
import path from 'path';
import { MONSOON_DATASET } from '../src/data/monsoonDataset';
import { trainQuantileEnsemble } from '../src/ml/modelTrainer';

console.log(`Starting Model Training with 1901–2025 Climatology Priors...`);
console.log(`Dataset size: ${MONSOON_DATASET.length} points.`);

const result = trainQuantileEnsemble(MONSOON_DATASET, 120, 0.016, (metric) => {
  if (metric.epoch % 20 === 0 || metric.epoch === 1) {
    console.log(`Epoch ${metric.epoch}/120 -> Train Loss: ${metric.trainLoss}, Val Loss: ${metric.valLoss}, Val MAE: ${metric.valMae}mm, Val CSI(>=64.5mm): ${(metric.valCsi64 * 100).toFixed(1)}%`);
  }
});

console.log(`\nTraining Complete!`);
console.log(result.summary);
console.log(`Test MAE: ${result.weights.metrics.testMae} mm`);
console.log(`Test RMSE: ${result.weights.metrics.testRmse} mm`);
console.log(`Test CSI(>=64.5mm): ${(result.weights.metrics.testCsi64 * 100).toFixed(1)}%`);

const outputPath = path.join(process.cwd(), 'src', 'data', 'trainedModelSnapshot.json');
fs.writeFileSync(outputPath, JSON.stringify(result.weights, null, 2), 'utf-8');
console.log(`Successfully updated ${outputPath} with 1901 Climatology weights.`);
