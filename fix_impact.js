import fs from 'fs';
let content = fs.readFileSync('src/components/SocioEconomicImpactView.tsx', 'utf8');
content = content.replace("import { RainfallDataPoint, MET_STATIONS } from '../types';", "import { RainfallDataPoint } from '../types';");
fs.writeFileSync('src/components/SocioEconomicImpactView.tsx', content);
