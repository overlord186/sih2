import fs from 'fs';
let content = fs.readFileSync('src/components/ForecastChart.tsx', 'utf8');

content = content.replace(
  'interface ForecastChartProps {',
  'interface ForecastChartProps {\n  selectedStationId?: string;'
);

content = content.replace(
  'export const ForecastChart: React.FC<ForecastChartProps> = ({',
  'export const ForecastChart: React.FC<ForecastChartProps> = ({\n  selectedStationId = "BOM",'
);

fs.writeFileSync('src/components/ForecastChart.tsx', content);
console.log('Props patched');
