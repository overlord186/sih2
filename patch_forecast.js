import fs from 'fs';
let content = fs.readFileSync('src/components/ForecastChart.tsx', 'utf8');

// Import Bar from recharts
if (!content.includes('Bar,')) {
    content = content.replace('Line,', 'Line,\n  Bar,');
}

// Import motion from framer-motion or motion/react
if (!content.includes("import { motion }")) {
    content = content.replace("import * as d3 from 'd3';", "import * as d3 from 'd3';\nimport { motion } from 'motion/react';");
}

// Wrap ResponsiveContainer with motion.div
const motionWrapperStart = `
        <motion.div 
          key={\`\${selectedStationName}-\${data.length > 0 ? data[0].leadTimeDays : 'all'}-\${dataRepresentation}\`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", staggerChildren: 0.1 }}
          className="w-full h-full"
        >
          <ResponsiveContainer width="100%" height="100%">`;

const motionWrapperEnd = `
          </ResponsiveContainer>
        </motion.div>`;

content = content.replace('<ResponsiveContainer width="100%" height="100%">', motionWrapperStart);
content = content.replace('</ResponsiveContainer>', motionWrapperEnd);

// Change Raw Forecast from Line to Bar to satisfy "bars and lines"
const rawLineRegex = /\{\/\* Raw Forecast.*?\*\/\}\s*<Line\s+type="monotone"\s+dataKey="rawForecast"[^>]*\/>/gs;

const rawBarReplacement = `{/* Raw Forecast (Bars, showing biases) */}
              <Bar
                dataKey="rawForecast"
                fill={themeStyles.colors.rawForecast}
                fillOpacity={0.6}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
                isAnimationActive={false}
              />`;

content = content.replace(rawLineRegex, rawBarReplacement);

fs.writeFileSync('src/components/ForecastChart.tsx', content);
console.log('Patched ForecastChart.tsx');
