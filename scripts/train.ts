import fs from 'fs';
import path from 'path';
import { MONSOON_DATASET } from '../src/data/monsoonDataset';
import { trainQuantileEnsemble, TrainedModelWeights } from '../src/ml/modelTrainer';

console.log('================================================================');
console.log('SAMVARTAKA AI — Operational Monsoon ML Post-Processing Pipeline');
console.log('================================================================');
console.log(`[1] Ingesting & Aligning Dataset: ${MONSOON_DATASET.length} NWP vs Observed pairs.`);

const years = Array.from(new Set(MONSOON_DATASET.map(d => d.year))).sort();
console.log(`[2] Temporal Cross-Validation Split:`);
console.log(`    - Train Partition: Year 2023 (${MONSOON_DATASET.filter(d => d.year === 2023).length} samples)`);
console.log(`    - Validation Partition: Year 2024 (${MONSOON_DATASET.filter(d => d.year === 2024).length} samples)`);
console.log(`    - Blind Test Partition: Year 2025 (${MONSOON_DATASET.filter(d => d.year === 2025).length} samples)`);

console.log(`[3] Launching Iterative Training Loop with Huber Loss & Quantile Pinball Loss...`);

let attempt = 1;
const maxAttempts = 10;
let bestWeights: TrainedModelWeights | null = null;
let bestCsi = 0;
let bestMae = 999;

// Run the training loop until qualitative benchmarks are achieved:
// Benchmarks: Validation MAE < 12.0 mm and Extreme Event CSI >= 0.70
while (attempt <= maxAttempts) {
  const lr = 0.012 + (attempt % 3) * 0.003;
  const epochs = 100 + attempt * 10;
  console.log(`\n--- Iteration Loop ${attempt}/${maxAttempts} (epochs: ${epochs}, lr: ${lr.toFixed(4)}) ---`);

  const result = trainQuantileEnsemble(MONSOON_DATASET, epochs, lr, (m) => {
    if (m.epoch % 25 === 0 || m.epoch === epochs) {
      console.log(`    Epoch ${String(m.epoch).padStart(3, ' ')}/${epochs} | Train Loss: ${m.trainLoss.toFixed(2)} | Val Loss: ${m.valLoss.toFixed(2)} | Val MAE: ${m.valMae.toFixed(2)} mm | Val CSI (>=64.5mm): ${(m.valCsi64 * 100).toFixed(1)}% | Pinball: ${m.valPinballLoss.toFixed(2)}`);
    }
  });

  const m = result.weights.metrics;
  console.log(`-> Results for Loop ${attempt}: Val MAE = ${m.finalValMae}mm, Val CSI = ${(m.finalCsi64 * 100).toFixed(1)}%, Test MAE = ${m.testMae}mm, Test CSI = ${(m.testCsi64 * 100).toFixed(1)}%`);

  if (!bestWeights || (m.finalValMae < bestMae && m.finalCsi64 >= bestCsi)) {
    bestWeights = result.weights;
    bestMae = m.finalValMae;
    bestCsi = m.finalCsi64;
  }

  // Check convergence conditions
  if (m.finalValMae < 12.0 && m.finalCsi64 >= 0.70) {
    console.log(`\n>>> Convergence & Qualitative Criteria Met in Loop ${attempt}! <<<`);
    console.log(`    Validation MAE: ${m.finalValMae} mm (< 12.0 mm target)`);
    console.log(`    Critical Success Index (CSI): ${(m.finalCsi64 * 100).toFixed(1)}% (>= 70.0% target)`);
    console.log(`    Blind Test 2025 MAE: ${m.testMae} mm`);
    bestWeights = result.weights;
    break;
  }

  attempt++;
}

if (!bestWeights) {
  throw new Error('Training failed to produce valid weights.');
}

const outputPath = path.join(process.cwd(), 'src', 'data', 'trainedModelSnapshot.json');
fs.writeFileSync(outputPath, JSON.stringify(bestWeights, null, 2), 'utf-8');

console.log(`\n[4] Serialized Trained Weights successfully to:`);
console.log(`    ${outputPath}`);
console.log('================================================================');
console.log('TRAINING COMPLETE: Operational ML Post-Processor ready for inference.');
console.log('================================================================');
