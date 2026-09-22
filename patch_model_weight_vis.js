import fs from 'fs';

let content = fs.readFileSync('src/components/ModelWeightVarianceVisualizer.tsx', 'utf8');

// 1. Add useState
content = content.replace("import React, { useMemo } from 'react';", "import React, { useState, useMemo } from 'react';");

// 2. Add State inside component
const compStart = "export const ModelWeightVarianceVisualizer: React.FC<ModelWeightVarianceVisualizerProps> = ({";
const replaceStart = "export const ModelWeightVarianceVisualizer: React.FC<ModelWeightVarianceVisualizerProps> = ({";
const stateStr = `  const [showConfidenceInterval, setShowConfidenceInterval] = useState(true);\n`;
// wait, I need to insert state inside the function body.

let parts = content.split('  const alpha = realtimeWeight;');
let newContent = parts[0] + '  const [showConfidenceInterval, setShowConfidenceInterval] = useState<boolean>(true);\n  const alpha = realtimeWeight;' + parts[1];

// 3. Add Area inside ComposedChart for Confidence Interval
const areaStr = `              {/* Variance Curve Area */}
              <Area
                yAxisId="var"`;
                
const ciAreaStr = `              {/* Confidence Interval Area */}
              {showConfidenceInterval && (
                <Area
                  yAxisId="pred"
                  type="monotone"
                  dataKey="ciRange"
                  stroke="none"
                  fill="#818cf8"
                  fillOpacity={0.2}
                  name="95% Confidence Interval"
                />
              )}
              {/* Variance Curve Area */}
              <Area
                yAxisId="var"`;
                
newContent = newContent.replace(areaStr, ciAreaStr);

// 4. Update the data format to support ciRange
const dataGenStr = `        ciLower: Math.max(0, Math.round((stepPred - 1.96 * stepStd) * 10) / 10),
        ciUpper: Math.round((stepPred + 1.96 * stepStd) * 10) / 10,
        isCurrent: Math.abs(stepAlpha - alpha) < 0.026,
      });`;
      
const newDataGenStr = `        ciLower: Math.max(0, Math.round((stepPred - 1.96 * stepStd) * 10) / 10),
        ciUpper: Math.round((stepPred + 1.96 * stepStd) * 10) / 10,
        ciRange: [Math.max(0, Math.round((stepPred - 1.96 * stepStd) * 10) / 10), Math.round((stepPred + 1.96 * stepStd) * 10) / 10],
        isCurrent: Math.abs(stepAlpha - alpha) < 0.026,
      });`;

newContent = newContent.replace(dataGenStr, newDataGenStr);

// 5. Add Toggle to UI
const toggleStr = `          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-amber-300">`;
            
const newToggleStr = `          <div className="flex items-center gap-4 text-xs font-mono">
            <label className="flex items-center gap-2 cursor-pointer text-indigo-300 font-sans font-semibold hover:text-indigo-200 transition-colors">
              <input 
                type="checkbox" 
                checked={showConfidenceInterval} 
                onChange={(e) => setShowConfidenceInterval(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-indigo-500/50 bg-indigo-900/50 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
              />
              Show 95% Confidence Interval
            </label>
            <div className="w-px h-4 bg-slate-700/80 mx-1"></div>
            <span className="flex items-center gap-1.5 text-amber-300">`;

newContent = newContent.replace(toggleStr, newToggleStr);

fs.writeFileSync('src/components/ModelWeightVarianceVisualizer.tsx', newContent);
