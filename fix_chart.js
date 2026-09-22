import fs from 'fs';

let content = fs.readFileSync('src/components/ModelTimeTrajectoryChart.tsx', 'utf8');

const oldLoop = `    const data = [];
    const now = new Date();
    // Start at current hour, project forward
    for (let i = 0; i <= leadTimeHours; i++) {
      const forecastTime = new Date(now.getTime() + i * 3600000);
      const timestamp = forecastTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });`;
      
const newLoop = `    const data = [];
    const baseDate = new Date('2026-08-01T08:00:00Z'); // Fixed operational start time for deterministic rendering
    // Project forward
    for (let i = 0; i <= leadTimeHours; i++) {
      const forecastTime = new Date(baseDate.getTime() + i * 3600000);
      const timestamp = forecastTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });`;

content = content.replace(oldLoop, newLoop);
fs.writeFileSync('src/components/ModelTimeTrajectoryChart.tsx', content);
