import React, { useState } from 'react';
import { MET_STATIONS } from '../data/monsoonDataset';
import { Briefcase, MapPin, Sparkles, Loader2, AlertCircle, CloudRain, Check } from 'lucide-react';
import Markdown from 'react-markdown';

export const ActionPlanner: React.FC = () => {
  const [location, setLocation] = useState(MET_STATIONS[0].name);
  const [occupation, setOccupation] = useState('Farmer');
  const [useLiveWeather, setUseLiveWeather] = useState(true);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [forecastData, setForecastData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGeneratePlan = async () => {
    if (!location || !occupation) return;
    
    setLoading(true);
    setError(null);
    setPlan(null);
    setForecastData(null);
    
    try {
      let weatherContext = null;
      if (useLiveWeather) {
        const station = MET_STATIONS.find(s => s.name === location) || MET_STATIONS[0];
        try {
          const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${station.lat}&longitude=${station.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&timezone=auto`);
          if (wRes.ok) {
            const wData = await wRes.json();
            setForecastData(wData.daily);
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
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ location, occupation, weatherContext })
      });
      
      let planText = '';
      try {
        const rawBody = await response.text();
        const trimmed = rawBody.trim();
        if (trimmed.startsWith('{')) {
          const parsed = JSON.parse(trimmed);
          if (parsed.error) {
            throw new Error(parsed.error);
          }
          planText = parsed.text || '';
        } else if (trimmed.length > 0 && !trimmed.startsWith('<')) {
          planText = trimmed;
        }
      } catch (parseErr: any) {
        if (parseErr.message && !parseErr.message.includes('JSON')) {
          throw parseErr;
        }
      }
      
      if (!response.ok) {
        throw new Error(planText || `The strategic planner service is temporarily busy (status ${response.status}). Please try again in a moment.`);
      }
      
      if (!planText.trim()) {
        throw new Error("Unable to formulate a strategic plan at this moment. Please check your connection and try again.");
      }
      
      setPlan(planText);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative z-10">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-lg">AI Weather Action Planner</h3>
              <p className="text-xs text-slate-500">Predict future weather patterns and formulate tailored plans.</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                Where do you live?
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {MET_STATIONS.map(stn => (
                  <option key={stn.id} value={stn.name}>{stn.name} ({stn.subdivision})</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
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
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useLiveWeather ? 'bg-indigo-600' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useLiveWeather ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          
          <button
            onClick={handleGeneratePlan}
            disabled={loading || !occupation}
            className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing weather patterns & generating plan...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Strategic Plan
              </>
            )}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 relative z-10">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      {forecastData && (
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
                <div className={`w-full text-[11px] font-bold py-1.5 rounded-md ${forecastData.precipitation_sum[i] >= 20 ? 'bg-blue-600 text-white' : forecastData.precipitation_sum[i] > 5 ? 'bg-blue-100 text-blue-700' : forecastData.precipitation_sum[i] > 0 ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-500'}`}>
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

      {plan && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative z-10 p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h4 className="font-semibold text-slate-800 text-lg border-b border-slate-100 pb-4 mb-6 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            Your Tailored Action Plan
          </h4>
          <div className="prose prose-slate max-w-none prose-headings:text-indigo-900 prose-a:text-indigo-600 prose-strong:text-slate-800 prose-p:text-slate-600 prose-li:text-slate-600">
            <Markdown>{plan}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
};
