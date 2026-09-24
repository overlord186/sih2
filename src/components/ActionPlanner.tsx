import React, { useState, useEffect } from 'react';
import { MET_STATIONS } from '../data/monsoonDataset';
import { Briefcase, MapPin, Sparkles, Loader2, AlertCircle, CloudRain, Check, Copy, ShieldCheck, Calendar, ArrowRight, Zap, Key, X } from 'lucide-react';
import Markdown from 'react-markdown';
import { fetchDailyForecastData } from '../utils/weatherApi';
import { IMDRainfallBadge } from '../utils/imdRainfall';
import { generateMeteorologicalPlan } from '../utils/meteorologicalChatEngine';

interface ActionPlannerProps {
  selectedStationId?: string;
  selectedStationName?: string;
}

const OCCUPATION_PRESETS = [
  { label: '🌾 Farmer / Agriculture', value: 'Farmer & Agricultural Producer' },
  { label: '🏗️ Construction & Civil Works', value: 'Construction Site Manager' },
  { label: '🚚 Logistics & Supply Chain', value: 'Fleet Logistics & Freight Operator' },
  { label: '⚡ Power Grid & Utilities', value: 'Power Transmission & Substation Engineer' },
  { label: '🏥 Disaster & Emergency Relief', value: 'Municipal Disaster Response Officer' },
  { label: '✈️ Aviation & Maritime', value: 'Port & Marine Transit Supervisor' },
];

export const ActionPlanner: React.FC<ActionPlannerProps> = ({
  selectedStationId,
  selectedStationName,
}) => {
  const initialStation = 
    (selectedStationId && MET_STATIONS.find(s => s.id === selectedStationId)) ||
    (selectedStationName && MET_STATIONS.find(s => s.name === selectedStationName)) ||
    MET_STATIONS[0];

  const [location, setLocation] = useState(initialStation.name);
  const [occupation, setOccupation] = useState('Farmer & Agricultural Producer');
  const [useLiveWeather, setUseLiveWeather] = useState(true);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [forecastData, setForecastData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [engineUsed, setEngineUsed] = useState<'gemini' | 'synoptic'>('synoptic');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('samvartka_gemini_api_key') || '';
    } catch {
      return '';
    }
  });
  const [keyInput, setKeyInput] = useState(customApiKey);

  // Sync location if selected station changes externally
  useEffect(() => {
    if (selectedStationId) {
      const match = MET_STATIONS.find(s => s.id === selectedStationId);
      if (match) setLocation(match.name);
    } else if (selectedStationName) {
      const match = MET_STATIONS.find(s => s.name === selectedStationName);
      if (match) setLocation(match.name);
    }
  }, [selectedStationId, selectedStationName]);

  const handleSaveApiKey = () => {
    const trimmed = keyInput.trim();
    setCustomApiKey(trimmed);
    try {
      if (trimmed) {
        localStorage.setItem('samvartka_gemini_api_key', trimmed);
      } else {
        localStorage.removeItem('samvartka_gemini_api_key');
      }
    } catch (e) {
      console.warn("Could not save to localStorage", e);
    }
    setIsKeyModalOpen(false);
  };

  const handleGeneratePlan = async () => {
    if (!location || !occupation) return;
    
    setLoading(true);
    setError(null);
    setPlan(null);
    setForecastData(null);
    
    let weatherContext: string | null = null;
    let localWData: any = null;

    try {
      if (useLiveWeather) {
        const station = MET_STATIONS.find(s => s.name === location) || MET_STATIONS[0];
        try {
          const wData = await fetchDailyForecastData(station.lat, station.lon);
          if (wData && wData.daily) {
            setForecastData(wData.daily);
            localWData = wData.daily;
            weatherContext = JSON.stringify({
              daily_forecast: wData.daily,
              timezone: wData.timezone || 'Asia/Kolkata',
              elevation: wData.elevation || 25
            });
          }
        } catch (e) {
          console.error("Failed to fetch live weather", e);
        }
      }

      const effectiveKey = customApiKey || (typeof window !== 'undefined' ? (localStorage.getItem('samvartka_gemini_api_key') || '') : '');

      let planText = '';
      let isLiveAI = false;

      // Tier 1: Try local or hosted /api/plan server with 10s timeout
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch('/api/plan', {
          method: 'POST',
          signal: controller.signal,
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(effectiveKey ? { 'x-gemini-api-key': effectiveKey } : {})
          },
          body: JSON.stringify({ 
            location, 
            occupation, 
            weatherContext,
            apiKey: effectiveKey || undefined 
          })
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const rawBody = await response.text();
          const trimmed = rawBody.trim();
          if (trimmed.startsWith('{')) {
            const parsed = JSON.parse(trimmed);
            if (!parsed.error && parsed.text) {
              planText = parsed.text;
              isLiveAI = Boolean(parsed.isLive);
            }
          } else if (trimmed.length > 0 && !trimmed.startsWith('<')) {
            planText = trimmed;
          }
        }
      } catch (backendErr) {
        console.warn("Backend /api/plan unavailable, checking direct client AI or synoptic core:", backendErr);
      }

      // Tier 2: If backend returned no text, and an API key is available, call Google Gemini directly from client
      if (!planText && effectiveKey) {
        const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
        for (const m of candidateModels) {
          try {
            const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${effectiveKey}`;
            const sysInstruction = `You are an elite research meteorologist and operational disaster resilience advisor embedded inside SAMVARTAKA (India Monsoon Rainfall Post-Processor).
Formulate a crisp, highly structured, authoritative, and sector-tailored Synoptic Action & Resilience Plan. Format your output strictly in professional GitHub Markdown with these exact sections:
### 🌦️ Synoptic Action & Resilience Plan: ${location}
**Target Sector:** ${occupation}  
**Meteorological Engine:** SAMVARTAKA Synoptic Intelligence (Active Live AI - ${m})  
**IMD Alert Classification:** [🟢 Green / 🟡 Yellow / 🟠 Orange / 🔴 Red Alert with exact quantitative mm/24h threshold]

---

#### 1. 🛰️ Synoptic Risk Profile & Agro-Ecological State
- Atmospheric regime classification, moisture convergence, low-level jet velocity, and local topographic dynamics.
- Numerical weather telemetry synthesis: 7-day expected precipitation total (mm), peak rain date and single-day max rain (mm), rain probability %, and peak wind gusts.

#### 2. 🎯 Sector Hazard Matrix & Asset Impact (${occupation})
- Specific operational vulnerabilities (e.g. for Farmers: specific crops like Cotton, Soybean, Pulses, Oranges, Vertisol/black-cotton soil drainage, fertilizer/pesticide wash-off; for Construction: crane wind limit, trench slumping; for Logistics: highway choke points, container sealing).

#### 3. ⏱️ Phased Tactical Action Protocol
- T-48h to T-24h (Readiness Phase): Concrete preventative actions.
- T-12h to T-0h (Active Storm Event): Operational stoppage triggers and live protection.
- Post-Event (Recovery & Assessment): Field drainage, structural checks, crop/asset revival.

#### 4. 🛡️ Critical Go / No-Go Decision Matrix
- Explicit quantitative threshold triggers (e.g. wind speed cutoff, rainfall intensity mm/hr, standing water limits).

#### 5. ✅ Immediate Tactical Readiness Checklist
- Actionable checkboxes [ ] for rapid operational sign-off.`;

            let promptText = `Generate a crisp, operational, sector-tailored Synoptic Action & Resilience Plan for location: "${location}", target sector: "${occupation}".`;
            if (weatherContext) {
              promptText += `\n\nReal-time 7-day weather telemetry:\n${weatherContext}\n\nPlease base your predictions heavily on this live forecast data.`;
            }

            const gRes = await fetch(geminiEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: promptText }] }],
                systemInstruction: { parts: [{ text: sysInstruction }] },
                generationConfig: {
                  temperature: 0.3,
                  maxOutputTokens: 2500,
                }
              })
            });

            if (gRes.ok) {
              const gJson = await gRes.json();
              const candidate = gJson.candidates?.[0]?.content?.parts?.[0]?.text;
              if (candidate && candidate.trim()) {
                planText = candidate.trim();
                isLiveAI = true;
                break;
              }
            }
          } catch (directErr) {
            console.warn(`Direct client Gemini call with ${m} failed:`, directErr);
          }
        }
      }

      // Tier 3: Resilient high-fidelity meteorological intelligence engine
      if (!planText || !planText.trim()) {
        planText = generateMeteorologicalPlan(location, occupation, weatherContext || (localWData ? JSON.stringify({ daily_forecast: localWData }) : undefined));
        isLiveAI = false;
      }

      setEngineUsed(isLiveAI ? 'gemini' : 'synoptic');
      setPlan(planText);
    } catch (err: any) {
      console.warn("Planner API request encountered exception, generating local resilient plan:", err);
      const fallbackPlan = generateMeteorologicalPlan(location, occupation, weatherContext);
      setEngineUsed('synoptic');
      setPlan(fallbackPlan);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!plan) return;
    navigator.clipboard.writeText(plan);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-tight">AI Weather Lead Planner</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  Synoptic Copilot
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Formulate sector-specific operational disaster mitigation and daily deployment plans tailored to real-time monsoon risk profiles.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* API Key Status / Setup Button */}
            <button
              onClick={() => setIsKeyModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                customApiKey 
                  ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/50'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
              title="Configure Gemini API Key"
            >
              <Key className={`w-3.5 h-3.5 ${customApiKey ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{customApiKey ? 'API Key Active' : 'Configure API Key'}</span>
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono bg-slate-950/60 px-3.5 py-1.5 rounded-xl border border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Regime-Aware Risk Modeling Active</span>
              <span className="sm:hidden">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* API Key Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                  <Key size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Gemini API Key</h3>
                  <p className="text-[11px] text-slate-400">Enables live Gemini 2.5 Flash reasoning</p>
                </div>
              </div>
              <button 
                onClick={() => setIsKeyModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs text-slate-300 font-medium">Google AI Studio API Key:</label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Stored securely in your browser's local storage. If left blank, the system automatically runs the high-fidelity SAMVARTAKA Synoptic Meteorological Intelligence Engine offline without requiring an API key.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-slate-800">
              {customApiKey && (
                <button
                  onClick={() => {
                    setKeyInput('');
                    setCustomApiKey('');
                    try { localStorage.removeItem('samvartka_gemini_api_key'); } catch {}
                    setIsKeyModalOpen(false);
                  }}
                  className="px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                >
                  Clear Key
                </button>
              )}
              <button
                onClick={() => setIsKeyModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Configuration Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Location Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-400" />
              Target Meteorological Station / Region
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700 hover:border-slate-600 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-colors cursor-pointer"
            >
              {MET_STATIONS.map(stn => (
                <option key={stn.id} value={stn.name} className="bg-slate-900 text-white">
                  {stn.name} ({stn.state}) — {stn.climateZone}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              Synchronizes with 36 regional meteorological subdivisions and IMD automatic weather stations.
            </p>
          </div>

          {/* Target Occupation / Sector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              Target Sector / Operational Domain
            </label>
            <select
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700 hover:border-slate-600 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-colors cursor-pointer"
            >
              {OCCUPATION_PRESETS.map(occ => (
                <option key={occ.value} value={occ.value} className="bg-slate-900 text-white">
                  {occ.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              Customizes operational lead times, critical thresholds, and asset vulnerability models.
            </p>
          </div>
        </div>

        {/* Live Weather Toggle & Options */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-6">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useLiveWeather}
              onChange={(e) => setUseLiveWeather(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
            />
            <div className="flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-slate-200">
                Incorporate Real-Time 7-Day Numerical Weather Telemetry
              </span>
            </div>
          </label>
          <span className="text-xs text-slate-400 font-mono">
            {useLiveWeather ? 'Open-Meteo High-Resolution Ingestion Active' : 'Climatological Baseline Modeling'}
          </span>
        </div>

        {/* Action Button */}
        <button
          onClick={handleGeneratePlan}
          disabled={loading}
          className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-500 hover:via-indigo-600 hover:to-violet-600 text-white font-bold text-sm tracking-wide shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing Atmospheric Telemetry & Formulating Sector Plan...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>Generate Tailored Synoptic Action Plan</span>
            </>
          )}
        </button>
      </div>
      
      {/* Error Alert */}
      {error && (
        <div className="bg-rose-950/40 border border-rose-800 text-rose-200 p-4 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <p className="text-xs">{error}</p>
          </div>
          <button
            onClick={handleGeneratePlan}
            className="px-3 py-1 bg-rose-800 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}
      
      {/* 7-Day Weather Preview Card */}
      {forecastData && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl animate-in fade-in duration-500">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <CloudRain className="w-5 h-5 text-cyan-400" />
              <h4 className="font-bold text-white text-base">
                7-Day Real-Time Atmospheric Telemetry for {location}
              </h4>
            </div>
            <span className="text-xs text-slate-400 font-mono">Open-Meteo High-Res Sync</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {forecastData.time && forecastData.time.map((date: string, i: number) => {
              const rainMm = forecastData.precipitation_sum ? forecastData.precipitation_sum[i] : 0;
              const maxT = forecastData.temperature_2m_max ? Math.round(forecastData.temperature_2m_max[i]) : 30;
              const minT = forecastData.temperature_2m_min ? Math.round(forecastData.temperature_2m_min[i]) : 24;
              const prob = forecastData.precipitation_probability_max ? forecastData.precipitation_probability_max[i] : 50;

              return (
                <div key={date} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-center flex flex-col items-center justify-between gap-2 hover:border-indigo-500/40 transition-colors">
                  <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider font-mono">
                    {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>

                  <div className="flex items-baseline gap-1 my-1">
                    <span className="text-lg font-bold text-white">{maxT}&deg;</span>
                    <span className="text-xs text-slate-400">{minT}&deg;</span>
                  </div>

                  <div className="w-full my-1">
                    <IMDRainfallBadge rainfallMm={rainMm} size="sm" className="w-full justify-center text-[10px]" />
                  </div>

                  <div className="text-[10px] text-slate-400 font-mono">
                    {prob}% rain risk
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Generated Action Plan Output Card */}
      {plan && (
        <div className="bg-slate-900/90 border border-indigo-500/40 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-white text-lg">Customized Sector Action Plan</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
                    engineUsed === 'gemini'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  }`}>
                    {engineUsed === 'gemini' ? (
                      <>
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        Live Gemini AI
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3 text-indigo-400" />
                        Synoptic Core
                      </>
                    )}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{location} &bull; {occupation}</p>
              </div>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer self-start sm:self-auto"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy Plan'}</span>
            </button>
          </div>

          <div className="prose prose-invert max-w-none prose-headings:text-indigo-300 prose-headings:font-bold prose-strong:text-white prose-p:text-slate-200 prose-li:text-slate-200 prose-ul:my-2 leading-relaxed text-sm">
            <Markdown>{plan}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
};
