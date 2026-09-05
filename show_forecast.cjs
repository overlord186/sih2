const fs = require('fs');
let code = fs.readFileSync('src/components/ActionPlanner.tsx', 'utf-8');

// 1. Add forecastData state
code = code.replace(
  "const [plan, setPlan] = useState<string | null>(null);",
  "const [plan, setPlan] = useState<string | null>(null);\n  const [forecastData, setForecastData] = useState<any>(null);"
);

// 2. Clear forecastData on new fetch
code = code.replace(
  "setPlan(null);",
  "setPlan(null);\n    setForecastData(null);"
);

// 3. Set forecastData on successful fetch
const fetchOld = `          if (wRes.ok) {
            const wData = await wRes.json();
            weatherContext = JSON.stringify({`;
const fetchNew = `          if (wRes.ok) {
            const wData = await wRes.json();
            setForecastData(wData.daily);
            weatherContext = JSON.stringify({`;
code = code.replace(fetchOld, fetchNew);

// 4. Inject forecast UI before the plan UI
const planUIIndex = code.indexOf("{plan && (");
const forecastUI = `{forecastData && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative z-10 p-6 md:p-8 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h4 className="font-semibold text-slate-800 text-lg border-b border-slate-100 pb-4 mb-6 flex items-center gap-2">
            <CloudRain className="w-5 h-5 text-indigo-600" />
            7-Day Live Weather Prediction for {location}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {forecastData.time.map((date: string, i: number) => (
              <div key={date} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center flex flex-col items-center justify-between">
                <div className="text-xs text-slate-500 font-semibold mb-2 uppercase tracking-wider">{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric'})}</div>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-lg font-bold text-slate-800">{Math.round(forecastData.temperature_2m_max[i])}&deg;</span>
                  <span className="text-sm font-medium text-slate-400 mb-0.5">{Math.round(forecastData.temperature_2m_min[i])}&deg;</span>
                </div>
                <div className={\`w-full text-[11px] font-bold py-1.5 rounded-md \${forecastData.precipitation_sum[i] >= 20 ? 'bg-blue-600 text-white' : forecastData.precipitation_sum[i] > 5 ? 'bg-blue-100 text-blue-700' : forecastData.precipitation_sum[i] > 0 ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-500'}\`}>
                  {forecastData.precipitation_sum[i]} mm rain
                </div>
                <div className="text-[10px] text-slate-400 mt-1.5 font-medium">
                  {forecastData.precipitation_probability_max[i]}% prob.
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      `;
    
code = code.slice(0, planUIIndex) + forecastUI + code.slice(planUIIndex);
    
fs.writeFileSync('src/components/ActionPlanner.tsx', code);
console.log('Added forecast data display!');
