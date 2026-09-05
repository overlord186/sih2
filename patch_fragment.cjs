const fs = require('fs');
let content = fs.readFileSync('src/components/ForecastChart.tsx', 'utf-8');

const target = `              {/* Compare Data Lines */}
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
              )}`;

const replacement = `              {/* Compare Data Lines */}
              {isComparing && (
                  <Line
                    type="monotone"
                    dataKey="compareObserved"
                    stroke="#94a3b8"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={{ r: 1.5, fill: '#94a3b8' }}
                  />
              )}
              {isComparing && (
                  <Line
                    type="monotone"
                    dataKey="compareAiCorrected"
                    stroke="#818cf8"
                    strokeWidth={2}
                    dot={{ r: 2, fill: '#818cf8' }}
                  />
              )}`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/ForecastChart.tsx', content);
console.log('patched_fragment');
