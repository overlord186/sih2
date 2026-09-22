import fs from 'fs';

let content = fs.readFileSync('src/components/ForecastChart.tsx', 'utf8');

const targetStr = `            <div className="flex justify-between items-start text-blue-400">
              <span className="flex items-center gap-1.5 pt-0.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> AI Corrected:
              </span>
              <div className="text-right">
                <span className="font-mono font-bold text-sm">
                  {item.aiCorrected} mm{dataRepresentation === 'weeklyMA' ? '/d (7d WMA)' : ''}
                </span>
                <span className="block text-[10px] text-cyan-300 font-mono">
                  {dataRepresentation === 'weeklyMA'
                    ? \`Raw Daily: \${item.rawDailyAiCorrected} mm\`
                    : \`7-Day WMA: \${item.weeklyMaAi} mm/d\`}
                </span>
              </div>
            </div>
          </div>`;

const extraStationsStr = `            <div className="flex justify-between items-start text-blue-400">
              <span className="flex items-center gap-1.5 pt-0.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> AI Corrected:
              </span>
              <div className="text-right">
                <span className="font-mono font-bold text-sm">
                  {item.aiCorrected} mm{dataRepresentation === 'weeklyMA' ? '/d (7d WMA)' : ''}
                </span>
                <span className="block text-[10px] text-cyan-300 font-mono">
                  {dataRepresentation === 'weeklyMA'
                    ? \`Raw Daily: \${item.rawDailyAiCorrected} mm\`
                    : \`7-Day WMA: \${item.weeklyMaAi} mm/d\`}
                </span>
              </div>
            </div>
            
            {payload.filter((p: any) => p.dataKey && p.dataKey.includes('_aiCorrected')).length > 0 && (
              <div className="pt-2 mt-2 border-t border-slate-700/50 space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Compared Stations</div>
                {payload.filter((p: any) => p.dataKey && p.dataKey.includes('_aiCorrected')).map((p: any) => {
                  const stId = p.dataKey.split('_')[0];
                  const obsData = payload.find((x: any) => x.dataKey === \`\${stId}_observed\`);
                  return (
                    <div key={stId} className="flex justify-between items-center text-[11px]" style={{ color: p.color }}>
                      <span className="font-semibold">{stId}</span>
                      <div className="flex items-center gap-2">
                        {obsData && <span className="opacity-70">Obs: {obsData.value}mm</span>}
                        <span className="font-bold">AI: {p.value}mm</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
          </div>`;

content = content.replace(targetStr, extraStationsStr);
fs.writeFileSync('src/components/ForecastChart.tsx', content);
console.log('Tooltip patched');
