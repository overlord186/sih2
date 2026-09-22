import fs from 'fs';
let content = fs.readFileSync('src/components/LiveMap.tsx', 'utf8');

// 1. Add state for selectedRegimeFilter
if (!content.includes('const [selectedRegimeFilter, setSelectedRegimeFilter]')) {
    content = content.replace("const [selectedZone, setSelectedZone] = useState('ALL');", "const [selectedZone, setSelectedZone] = useState('ALL');\n  const [selectedRegimeFilter, setSelectedRegimeFilter] = useState<'ALL' | 'DELUGE' | 'MODERATE' | 'LIGHT' | 'DRY'>('ALL');");
}

// 2. Filter filteredStations using selectedRegimeFilter
const mapLineOld = '{filteredStations.map((station) => {';
const mapLineNew = `{filteredStations.filter((station) => {
            if (selectedRegimeFilter === 'ALL') return true;
            const stats = stationStats[station.id];
            const safeAI = (stats && stats.count > 0) ? (stats.ai / stats.count) : 0;
            const avgAI = (typeof safeAI !== 'number' || isNaN(safeAI) || !isFinite(safeAI)) ? 0 : safeAI;
            const isDeluge = avgAI >= 64.5;
            const isModerate = avgAI >= 15.5 && avgAI < 64.5;
            const isLight = avgAI >= 2.5 && avgAI < 15.5;
            const isDry = avgAI < 2.5;
            if (selectedRegimeFilter === 'DELUGE') return isDeluge;
            if (selectedRegimeFilter === 'MODERATE') return isModerate;
            if (selectedRegimeFilter === 'LIGHT') return isLight;
            if (selectedRegimeFilter === 'DRY') return isDry;
            return true;
          }).map((station) => {`;

if (content.includes(mapLineOld) && !content.includes("if (selectedRegimeFilter === 'ALL') return true;")) {
    content = content.replace(mapLineOld, mapLineNew);
}

// 3. Make legend clickable
// Replace legend divs with buttons
content = content.replace(/<div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950\/70 border border-red-500\/40">/g, 
    `<button onClick={() => setSelectedRegimeFilter(selectedRegimeFilter === 'DELUGE' ? 'ALL' : 'DELUGE')} className={\`flex items-center text-left gap-2 p-1.5 rounded-lg bg-slate-950/70 border transition-colors \${selectedRegimeFilter === 'DELUGE' ? 'border-red-400 ring-1 ring-red-400' : 'border-red-500/40 hover:border-red-400'}\`}>`);
content = content.replace(/<div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950\/70 border border-amber-500\/40">/g, 
    `<button onClick={() => setSelectedRegimeFilter(selectedRegimeFilter === 'MODERATE' ? 'ALL' : 'MODERATE')} className={\`flex items-center text-left gap-2 p-1.5 rounded-lg bg-slate-950/70 border transition-colors \${selectedRegimeFilter === 'MODERATE' ? 'border-amber-400 ring-1 ring-amber-400' : 'border-amber-500/40 hover:border-amber-400'}\`}>`);
content = content.replace(/<div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950\/70 border border-blue-500\/40">/g, 
    `<button onClick={() => setSelectedRegimeFilter(selectedRegimeFilter === 'LIGHT' ? 'ALL' : 'LIGHT')} className={\`flex items-center text-left gap-2 p-1.5 rounded-lg bg-slate-950/70 border transition-colors \${selectedRegimeFilter === 'LIGHT' ? 'border-blue-400 ring-1 ring-blue-400' : 'border-blue-500/40 hover:border-blue-400'}\`}>`);
content = content.replace(/<div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-950\/70 border border-slate-700">/g, 
    `<button onClick={() => setSelectedRegimeFilter(selectedRegimeFilter === 'DRY' ? 'ALL' : 'DRY')} className={\`flex items-center text-left gap-2 p-1.5 rounded-lg bg-slate-950/70 border transition-colors \${selectedRegimeFilter === 'DRY' ? 'border-slate-400 ring-1 ring-slate-400' : 'border-slate-700 hover:border-slate-500'}\`}>`);

// Fix the closing divs -> /button
// They are structurally: <div> <span></span> <div> <div></div> <div></div> </div> </div>
// It's tricky to replace just the closing div. 
// We can find them:
// Heavy: </div>\n                    </div>\n                    {/* Moderate Rain */}
// Moderate: </div>\n                    </div>\n                    {/* Light Rain */}
// Light: </div>\n                    </div>\n                    {/* Dry / Break */}
// Dry: </div>\n                    </div>\n                  </div>

content = content.replace(/<\/div>\n                    <\/div>\n                    {\/\* Moderate Rain \*\/}/g, `</div>\n                    </button>\n                    {/* Moderate Rain */}`);
content = content.replace(/<\/div>\n                    <\/div>\n                    {\/\* Light Rain \*\/}/g, `</div>\n                    </button>\n                    {/* Light Rain */}`);
content = content.replace(/<\/div>\n                    <\/div>\n                    {\/\* Dry \/ Break \*\/}/g, `</div>\n                    </button>\n                    {/* Dry / Break */}`);
content = content.replace(/<\/div>\n                    <\/div>\n                  <\/div>\n                  {\/\* Remote Sensing/g, `</div>\n                    </button>\n                  </div>\n                  {/* Remote Sensing`);

fs.writeFileSync('src/components/LiveMap.tsx', content);
console.log('Patched LiveMap.tsx');
