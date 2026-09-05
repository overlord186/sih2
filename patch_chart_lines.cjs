const fs = require('fs');
let content = fs.readFileSync('src/components/ForecastChart.tsx', 'utf-8');

// Adding Legend support
content = content.replace(
  `                  if (val === 'aiCorrected') return <span className="text-blue-700 font-bold">Regime-Aware AI Corrected</span>;
                  return val;`,
  `                  if (val === 'aiCorrected') return <span className="text-blue-700 font-bold">Regime-Aware AI Corrected</span>;
                  if (val === 'compareObserved') return <span className="text-slate-400 font-semibold">{compareYear} Observed (IMD)</span>;
                  if (val === 'compareAiCorrected') return <span className="text-indigo-400 font-bold">{compareYear} AI Corrected</span>;
                  return val;`
);

// Adding Lines to the first chart
content = content.replace(
  `              {/* AI Corrected (Blue bold, high fidelity) */}
              <Line
                type="monotone"
                dataKey="aiCorrected"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={{ r: 2.5, fill: '#2563eb' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>`,
  `              {/* AI Corrected (Blue bold, high fidelity) */}
              <Line
                type="monotone"
                dataKey="aiCorrected"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={{ r: 2.5, fill: '#2563eb' }}
                activeDot={{ r: 6 }}
              />
              
              {/* Compare Data Lines */}
              {isComparing && (
                <>
                  <Line
                    type="monotone"
                    dataKey="compareObserved"
                    stroke="#94a3b8"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={{ r: 1.5, fill: '#94a3b8' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="compareAiCorrected"
                    stroke="#818cf8"
                    strokeWidth={2}
                    dot={{ r: 2, fill: '#818cf8' }}
                  />
                </>
              )}
            </LineChart>`
);

// Updating the Tooltip
content = content.replace(
  `            <span className="font-semibold text-slate-300">{item.fullDate}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-sans">
              {item.regime}
            </span>
          </div>`,
  `            <span className="font-semibold text-slate-300">{item.fullDate}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-sans">
              {item.regime}
            </span>
          </div>
          {item.compareAiCorrected !== undefined && isComparing && (
            <div className="pt-1 pb-1 mb-1 border-b border-slate-800 text-[10px] text-slate-400">
              <span className="block mb-1">{compareYear} Comparison:</span>
              <div className="flex justify-between items-center text-slate-300">
                <span>Observed:</span>
                <span className="font-mono">{item.compareObserved} mm</span>
              </div>
              <div className="flex justify-between items-center text-indigo-300">
                <span>AI Corrected:</span>
                <span className="font-mono font-bold">{item.compareAiCorrected} mm</span>
              </div>
            </div>
          )}`
);

fs.writeFileSync('src/components/ForecastChart.tsx', content);
console.log('patched_lines');
