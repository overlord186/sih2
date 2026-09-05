const fs = require('fs');

let content = fs.readFileSync('src/components/StationOverview.tsx', 'utf-8');

const newImports = `import React, { useEffect, useState } from 'react';
import { MET_STATIONS } from '../data/monsoonDataset';
import { MapPin, ArrowUpRight, CloudRain, Mountain, Wind, Clock, Activity } from 'lucide-react';

const LiveTicker = ({ stationId }: { stationId: string }) => {
  const [readings, setReadings] = useState<{time: string, rain: number}[]>([]);
  
  useEffect(() => {
    if (stationId === 'ALL') {
      setReadings([]);
      return;
    }
    const station = MET_STATIONS.find(s => s.id === stationId);
    if (!station) return;
    
    fetch(\`https://api.open-meteo.com/v1/forecast?latitude=\${station.lat}&longitude=\${station.lon}&hourly=rain\`)
      .then(res => res.json())
      .then(data => {
        if (data.hourly && data.hourly.time && data.hourly.rain) {
          const now = new Date();
          let currentIndex = data.hourly.time.findIndex((t: string) => new Date(t) > now);
          if (currentIndex === -1) currentIndex = data.hourly.time.length;
          
          // Get the 3 hours prior to the current next hour
          const recent = [];
          for (let i = 1; i <= 3; i++) {
            const idx = currentIndex - i;
            if (idx >= 0) {
              const dateObj = new Date(data.hourly.time[idx]);
              const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              recent.push({ time: timeStr, rain: data.hourly.rain[idx] });
            }
          }
          setReadings(recent.reverse());
        }
      })
      .catch(() => { /* silently ignore fetch errors */ });
  }, [stationId]);

  if (stationId === 'ALL' || readings.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-hidden bg-slate-50 border border-slate-200 rounded-full px-3 py-1 shadow-inner max-w-xs sm:max-w-md">
      <Activity className="w-3.5 h-3.5 text-blue-500 shrink-0 animate-pulse" />
      <div className="text-[10px] sm:text-xs font-mono text-slate-600 whitespace-nowrap overflow-hidden flex items-center">
        <span className="font-semibold text-slate-700 mr-2 uppercase tracking-wider">Live:</span>
        <div className="flex animate-[cloudDrift_15s_linear_infinite] sm:animate-none space-x-3">
          {readings.map((r, i) => (
            <span key={i} className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {r.time}: <strong className={r.rain > 0 ? 'text-blue-600' : 'text-slate-500'}>{r.rain}mm</strong>
              {i < readings.length - 1 && <span className="text-slate-300 mx-1">|</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
`;

content = content.replace(/import React from 'react';\nimport { MET_STATIONS } from '\.\.\/data\/monsoonDataset';\nimport { MapPin, ArrowUpRight, CloudRain, Mountain, Wind } from 'lucide-react';/, newImports);

const headerEnd = `          </p>
        </div>`;

const newHeaderEnd = `          </p>
        </div>
        
        <div className="flex-1 flex justify-end mr-2">
          <LiveTicker stationId={selectedStationId} />
        </div>`;

content = content.replace(headerEnd, newHeaderEnd);

fs.writeFileSync('src/components/StationOverview.tsx', content);
console.log('patched StationOverview.tsx');
