const fs = require('fs');
let content = fs.readFileSync('src/components/LiveMap.tsx', 'utf-8');

const oldLogic = `{stats.count > 0 ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded">
                          <span className="text-slate-600 font-medium">Observed Ground Truth:</span> 
                          <strong className="text-slate-900">{(!isNaN(avgObs) && isFinite(avgObs) ? avgObs : 0).toFixed(1)} mm</strong>
                        </div>
                        <div className="flex justify-between items-center px-1.5">
                          <span className="text-slate-500">Raw Model Forecast:</span> 
                          <span className="text-slate-500 font-medium">{(!isNaN(avgRaw) && isFinite(avgRaw) ? avgRaw : 0).toFixed(1)} mm</span>
                        </div>
                        <div className="flex justify-between items-center bg-blue-50/50 p-1.5 rounded border border-blue-100/50">
                          <span className="text-blue-700 font-semibold">AI Corrected Forecast:</span> 
                          <strong className="text-blue-700">{(!isNaN(avgAI) && isFinite(avgAI) ? avgAI : 0).toFixed(1)} mm</strong>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100 text-center">
                          Based on {stats.count} evaluation records
                        </div>
                      </div>
                    ) : (`;

const newLogic = `{stats.count > 0 ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded">
                          <span className="text-slate-600 font-medium">Observed Ground Truth:</span> 
                          <strong className="text-slate-900">{Number((!isNaN(avgObs) && isFinite(avgObs) && avgObs !== null) ? avgObs : 0).toFixed(1)} mm</strong>
                        </div>
                        <div className="flex justify-between items-center px-1.5">
                          <span className="text-slate-500">Raw Model Forecast:</span> 
                          <span className="text-slate-500 font-medium">{Number((!isNaN(avgRaw) && isFinite(avgRaw) && avgRaw !== null) ? avgRaw : 0).toFixed(1)} mm</span>
                        </div>
                        <div className="flex justify-between items-center bg-blue-50/50 p-1.5 rounded border border-blue-100/50">
                          <span className="text-blue-700 font-semibold">AI Corrected Forecast:</span> 
                          <strong className="text-blue-700">{Number((!isNaN(avgAI) && isFinite(avgAI) && avgAI !== null) ? avgAI : 0).toFixed(1)} mm</strong>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100 text-center">
                          Based on {stats.count} evaluation records
                        </div>
                      </div>
                    ) : (`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('src/components/LiveMap.tsx', content);
console.log('patched LiveMap NaN bug 12');
