import fs from 'fs';

let content = fs.readFileSync('src/components/InteractivePredictor.tsx', 'utf8');

const oldButtons = `              {/* Model Select Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <button
                  onClick={() => setSelectedModel('QRF')}
                  className={\`p-2.5 rounded-xl border font-bold transition-all text-center \${
                    selectedModel === 'QRF'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }\`}
                >
                  QRF Regressor
                </button>

                <button
                  onClick={() => setSelectedModel('PINN')}
                  className={\`p-2.5 rounded-xl border font-bold transition-all text-center \${
                    selectedModel === 'PINN'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }\`}
                >
                  PINN Neural
                </button>

                <button
                  onClick={() => setSelectedModel('RF_BC')}
                  className={\`p-2.5 rounded-xl border font-bold transition-all text-center \${
                    selectedModel === 'RF_BC'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }\`}
                >
                  RF-BC Trees
                </button>

                <button
                  onClick={() => setSelectedModel('ENSEMBLE')}
                  className={\`p-2.5 rounded-xl border font-bold transition-all text-center \${
                    selectedModel === 'ENSEMBLE'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }\`}
                >
                  Blend Ensemble
                </button>
              </div>`;
              
const newButtons = `              {/* Model Select Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <button
                  onClick={() => setSelectedModel('Linear Regression')}
                  className={\`p-2.5 rounded-xl border font-bold transition-all text-center \${
                    selectedModel === 'Linear Regression'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }\`}
                >
                  Linear Regression
                </button>

                <button
                  onClick={() => setSelectedModel('Neural Network')}
                  className={\`p-2.5 rounded-xl border font-bold transition-all text-center \${
                    selectedModel === 'Neural Network'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }\`}
                >
                  Neural Network
                </button>

                <button
                  onClick={() => setSelectedModel('Random Forest')}
                  className={\`p-2.5 rounded-xl border font-bold transition-all text-center \${
                    selectedModel === 'Random Forest'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }\`}
                >
                  Random Forest
                </button>

                <button
                  onClick={() => setSelectedModel('Ensemble')}
                  className={\`p-2.5 rounded-xl border font-bold transition-all text-center \${
                    selectedModel === 'Ensemble'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }\`}
                >
                  Blend Ensemble
                </button>
              </div>`;

content = content.replace(oldButtons, newButtons);


const oldDropdownStr = `              {selectedModel === 'ENSEMBLE' && (`;
const newDropdownStr = `              {selectedModel === 'Ensemble' && (`;
content = content.replace(oldDropdownStr, newDropdownStr);


const oldModelsList = `                  <div className={\`p-2 rounded border cursor-pointer transition-colors \${selectedModel === 'QRF' ? 'bg-purple-100 border-purple-400 font-bold' : 'bg-white border-slate-200 hover:bg-slate-100'}\`} onClick={() => setSelectedModel('QRF')}>
                    <span className="text-[10px] text-slate-500 block font-sans">QRF</span>
                    <span className="font-bold text-purple-700">{modelOutputs.qrfVal}</span>
                    <span className="text-[10px] text-slate-400 block">mm</span>
                  </div>

                  <div className={\`p-2 rounded border cursor-pointer transition-colors \${selectedModel === 'PINN' ? 'bg-purple-100 border-purple-400 font-bold' : 'bg-white border-slate-200 hover:bg-slate-100'}\`} onClick={() => setSelectedModel('PINN')}>
                    <span className="text-[10px] text-slate-500 block font-sans">PINN</span>
                    <span className="font-bold text-purple-700">{modelOutputs.pinnVal}</span>
                    <span className="text-[10px] text-slate-400 block">mm</span>
                  </div>

                  <div className={\`p-2 rounded border cursor-pointer transition-colors \${selectedModel === 'RF_BC' ? 'bg-purple-100 border-purple-400 font-bold' : 'bg-white border-slate-200 hover:bg-slate-100'}\`} onClick={() => setSelectedModel('RF_BC')}>
                    <span className="text-[10px] text-slate-500 block font-sans">RF-BC</span>
                    <span className="font-bold text-purple-700">{modelOutputs.rfBcVal}</span>
                    <span className="text-[10px] text-slate-400 block">mm</span>
                  </div>

                  <div className={\`p-2 rounded border cursor-pointer transition-colors \${selectedModel === 'ENSEMBLE' ? 'bg-purple-100 border-purple-400 font-bold' : 'bg-white border-slate-200 hover:bg-slate-100'}\`} onClick={() => setSelectedModel('ENSEMBLE')}>
                    <span className="text-[10px] text-slate-500 block font-sans">Ensemble</span>
                    <span className="font-bold text-purple-700">{modelOutputs.blendVal}</span>
                    <span className="text-[10px] text-slate-400 block">mm</span>
                  </div>`;

const newModelsList = `                  <div className={\`p-2 rounded border cursor-pointer transition-colors \${selectedModel === 'Linear Regression' ? 'bg-purple-100 border-purple-400 font-bold' : 'bg-white border-slate-200 hover:bg-slate-100'}\`} onClick={() => setSelectedModel('Linear Regression')}>
                    <span className="text-[10px] text-slate-500 block font-sans">Linear Reg.</span>
                    <span className="font-bold text-purple-700">{modelOutputs.qrfVal}</span>
                    <span className="text-[10px] text-slate-400 block">mm</span>
                  </div>

                  <div className={\`p-2 rounded border cursor-pointer transition-colors \${selectedModel === 'Neural Network' ? 'bg-purple-100 border-purple-400 font-bold' : 'bg-white border-slate-200 hover:bg-slate-100'}\`} onClick={() => setSelectedModel('Neural Network')}>
                    <span className="text-[10px] text-slate-500 block font-sans">Neural Net</span>
                    <span className="font-bold text-purple-700">{modelOutputs.pinnVal}</span>
                    <span className="text-[10px] text-slate-400 block">mm</span>
                  </div>

                  <div className={\`p-2 rounded border cursor-pointer transition-colors \${selectedModel === 'Random Forest' ? 'bg-purple-100 border-purple-400 font-bold' : 'bg-white border-slate-200 hover:bg-slate-100'}\`} onClick={() => setSelectedModel('Random Forest')}>
                    <span className="text-[10px] text-slate-500 block font-sans">Random Forest</span>
                    <span className="font-bold text-purple-700">{modelOutputs.rfBcVal}</span>
                    <span className="text-[10px] text-slate-400 block">mm</span>
                  </div>

                  <div className={\`p-2 rounded border cursor-pointer transition-colors \${selectedModel === 'Ensemble' ? 'bg-purple-100 border-purple-400 font-bold' : 'bg-white border-slate-200 hover:bg-slate-100'}\`} onClick={() => setSelectedModel('Ensemble')}>
                    <span className="text-[10px] text-slate-500 block font-sans">Ensemble</span>
                    <span className="font-bold text-purple-700">{modelOutputs.blendVal}</span>
                    <span className="text-[10px] text-slate-400 block">mm</span>
                  </div>`;
content = content.replace(oldModelsList, newModelsList);

// Now inject the new chart below the models list in that tab.
const insertTarget = `                </div>
              )}
            </div>
          )}`;

const chartComponentImportStr = `import { ModelTimeTrajectoryChart } from './ModelTimeTrajectoryChart';\n`;
if (!content.includes(chartComponentImportStr)) {
  content = content.replace(`import { ModelWeightVarianceVisualizer } from './ModelWeightVarianceVisualizer';`, `import { ModelWeightVarianceVisualizer } from './ModelWeightVarianceVisualizer';\n${chartComponentImportStr}`);
}

const chartBlock = `                </div>
              )}
              
              <div className="pt-4 mt-4 border-t border-slate-100">
                <ModelTimeTrajectoryChart 
                  modelName={selectedModel}
                  basePredictionMm={modelOutputs.activeVal}
                  baseStdDev={modelOutputs.outputStdDev}
                  leadTimeHours={24}
                />
              </div>
            </div>
          )}`;
content = content.replace(insertTarget, chartBlock);

fs.writeFileSync('src/components/InteractivePredictor.tsx', content);
console.log('Done 2');
