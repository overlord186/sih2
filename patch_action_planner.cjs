const fs = require('fs');
let code = fs.readFileSync('src/components/ActionPlanner.tsx', 'utf-8');

// Add Lucide import
code = code.replace(
  "import { Briefcase, MapPin, Sparkles, Loader2, AlertCircle } from 'lucide-react';",
  "import { Briefcase, MapPin, Sparkles, Loader2, AlertCircle, CloudRain, Check } from 'lucide-react';"
);

// Add state
const stateReplacement = `  const [location, setLocation] = useState(MET_STATIONS[0].name);
  const [occupation, setOccupation] = useState('Farmer');
  const [useLiveWeather, setUseLiveWeather] = useState(true);
  const [loading, setLoading] = useState(false);`;
code = code.replace(
  "  const [location, setLocation] = useState(MET_STATIONS[0].name);\n  const [occupation, setOccupation] = useState('Farmer');\n  const [loading, setLoading] = useState(false);",
  stateReplacement
);

// Update fetch
const fetchOld = `    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, occupation })
      });`;
const fetchNew = `    try {
      let weatherContext = null;
      if (useLiveWeather) {
        const station = MET_STATIONS.find(s => s.name === location) || MET_STATIONS[0];
        try {
          const wRes = await fetch(\`https://api.open-meteo.com/v1/forecast?latitude=\${station.lat}&longitude=\${station.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto\`);
          if (wRes.ok) {
            const wData = await wRes.json();
            weatherContext = JSON.stringify({
              daily_forecast: wData.daily,
              timezone: wData.timezone,
              elevation: wData.elevation
            });
          }
        } catch (e) {
          console.error("Failed to fetch live weather", e);
        }
      }

      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, occupation, weatherContext })
      });`;
code = code.replace(fetchOld, fetchNew);

// Add toggle button to UI
const toggleOld = `            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-400" />
                What is your occupation?
              </label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="e.g. Farmer, Construction Worker, Delivery Driver..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>`;

const toggleNew = `            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-400" />
                What is your occupation?
              </label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="e.g. Farmer, Construction Worker, Delivery Driver..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="mb-6 flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <CloudRain className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-800">Use Live 7-Day Weather Data</h4>
                <p className="text-xs text-slate-500">Fetch real-time forecasts to predict future impacts accurately.</p>
              </div>
            </div>
            <button
              onClick={() => setUseLiveWeather(!useLiveWeather)}
              className={\`relative inline-flex h-6 w-11 items-center rounded-full transition-colors \${useLiveWeather ? 'bg-indigo-600' : 'bg-slate-300'}\`}
            >
              <span className={\`inline-block h-4 w-4 transform rounded-full bg-white transition-transform \${useLiveWeather ? 'translate-x-6' : 'translate-x-1'}\`} />
            </button>
          </div>`;
code = code.replace(toggleOld, toggleNew);

fs.writeFileSync('src/components/ActionPlanner.tsx', code);
console.log('patched action planner');
