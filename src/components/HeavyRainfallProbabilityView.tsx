import React, { useState, useMemo } from 'react';
import { RainfallDataPoint, SynopticWeatherRegime } from '../types';
import { calculateHeavyRainProbabilities, classifySynopticRegime } from '../ml/postProcessor';
import { MET_STATIONS } from '../data/monsoonDataset';
import {
  CloudRain,
  AlertTriangle,
  ShieldAlert,
  Gauge,
  Sliders,
  TrendingUp,
  MapPin,
  Flame,
  Info,
  Layers,
  Sparkles,
  BarChart3,
  Search,
} from 'lucide-react';
import { motion } from 'motion/react';

interface HeavyRainfallProbabilityViewProps {
  dataset: RainfallDataPoint[];
  onSelectStation?: (stationId: string) => void;
}

export const HeavyRainfallProbabilityView: React.FC<HeavyRainfallProbabilityViewProps> = ({
  dataset,
  onSelectStation,
}) => {
  const [testRainMm, setTestRainMm] = useState<number>(78);
  const [testHumidity, setTestHumidity] = useState<number>(92);
  const [testPressure, setTestPressure] = useState<number>(999);
  const [testRegime, setTestRegime] = useState<SynopticWeatherRegime>(SynopticWeatherRegime.MONSOON_DEPRESSION);
  const [stationSearch, setStationSearch] = useState<string>('');

  // Live Probability Calculation for Sandbox
  const liveProbabilities = useMemo(() => {
    return calculateHeavyRainProbabilities(testRainMm, testHumidity, testPressure, testRegime);
  }, [testRainMm, testHumidity, testPressure, testRegime]);

  // Operational IMD Threshold definitions
  const thresholds = [
    {
      id: 'moderate',
      thresholdMm: 15.5,
      name: 'Moderate Rainfall',
      prob: liveProbabilities.probModerate15,
      color: 'from-yellow-500 to-amber-500',
      textColor: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      alertBadge: 'bg-yellow-400/20 text-yellow-800 border-yellow-400/40',
      desc: '15.6 to 64.4 mm in 24h. Steady stratiform rains with localized drainage slowdowns.',
      action: 'Advisory for farmers and transport. Maintain normal municipal stormwater flow.',
    },
    {
      id: 'heavy',
      thresholdMm: 64.5,
      name: 'Heavy Rainfall',
      prob: liveProbabilities.probHeavy64,
      color: 'from-orange-500 to-amber-600',
      textColor: 'text-orange-700',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      alertBadge: 'bg-orange-500/20 text-orange-800 border-orange-500/40',
      desc: '64.5 to 115.5 mm in 24h. Convective bursts causing waterlogging and river swell.',
      action: 'Issue Yellow/Orange alert. Prepare SDRF teams and deploy mobile de-watering pumps.',
    },
    {
      id: 'very_heavy',
      thresholdMm: 115.5,
      name: 'Very Heavy Rainfall',
      prob: liveProbabilities.probVeryHeavy115,
      color: 'from-red-500 to-rose-600',
      textColor: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      alertBadge: 'bg-red-500/20 text-red-800 border-red-500/40',
      desc: '115.6 to 204.4 mm in 24h. Widespread severe flooding, mudslides in ghats, power disruptions.',
      action: 'Issue Orange/Red alert. Restrict traffic on ghat roads, evacuate low-lying riverbeds.',
    },
    {
      id: 'extremely_heavy',
      thresholdMm: 204.4,
      name: 'Extremely Heavy Deluge',
      prob: liveProbabilities.probExtremelyHeavy204,
      color: 'from-purple-600 to-fuchsia-700',
      textColor: 'text-purple-700',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      alertBadge: 'bg-purple-500/20 text-purple-800 border-purple-500/40',
      desc: '≥ 204.5 mm in 24h. Catastrophic extreme precipitation, flash floods, dam spillway release necessity.',
      action: 'IMD RED ALERT. Full disaster mobilization, school/college closures, NDRF deployment.',
    },
  ];

  // Station Exceedance Risk Rankings across the active dataset
  const stationRiskRankings = useMemo(() => {
    return MET_STATIONS.map((stn) => {
      // Find matching samples from dataset
      const stnSamples = dataset.filter((d) => d.stationId === stn.id);
      const avgCorrected = stnSamples.length > 0
        ? stnSamples.reduce((acc, curr) => acc + curr.correctedForecastMm, 0) / stnSamples.length
        : 35;
      const maxCorrected = stnSamples.length > 0
        ? Math.max(...stnSamples.map((d) => d.correctedForecastMm))
        : 65;

      const isCoast = stn.subdivision.includes('Konkan') || stn.subdivision.includes('Coastal');
      const isNW = stn.subdivision.includes('Jammu') || stn.subdivision.includes('Himachal') || stn.subdivision.includes('Uttarakhand');
      const synoptic = classifySynopticRegime({
        rawForecastMm: maxCorrected,
        relativeHumidity: 90,
        surfacePressure: 1002,
        windSpeed: 30,
        isWesternGhatsOrCoast: isCoast,
        isNorthWestOrHimalayan: isNW,
      });

      const probs = calculateHeavyRainProbabilities(maxCorrected, 90, 1002, synoptic.synopticRegime);

      return {
        ...stn,
        avgRain: Math.round(avgCorrected * 10) / 10,
        maxRain: Math.round(maxCorrected * 10) / 10,
        synopticRegime: synoptic.synopticRegime,
        probs,
      };
    })
    .sort((a, b) => b.probs.probHeavy64 - a.probs.probHeavy64)
    .filter((stn) => {
      if (!stationSearch) return true;
      const q = stationSearch.toLowerCase();
      return stn.name.toLowerCase().includes(q) || stn.subdivision.toLowerCase().includes(q) || stn.state.toLowerCase().includes(q);
    });
  }, [dataset, stationSearch]);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
                Module 2: Heavy Rainfall Probability Engine
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                Operational IMD Threshold Calibration
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Threshold Exceedance Probability & Hazard Alerting
            </h2>
            <p className="text-slate-300 text-sm mt-2 max-w-3xl leading-relaxed">
              Deterministic single-value forecasts cannot convey convective uncertainty. SAMVARTAKA AI calculates
              calibrated <strong>exceedance probabilities across all 4 operational IMD categories</strong> (&gt;15.5mm, &gt;64.5mm, &gt;115.5mm, &gt;204.4mm),
              empowering disaster management authorities with risk-quantified decision support.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Probability Tester & Exceedance Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls Column */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Exceedance Scenario Sandbox</h3>
                <p className="text-xs text-slate-500">Simulate rainfall intensity to test threshold probabilities</p>
              </div>
            </div>
          </div>

          {/* Test Rain Slider */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-slate-700">AI Corrected Precipitation Intensity:</span>
              <span className="font-mono font-bold text-indigo-600 text-sm">{testRainMm} mm/day</span>
            </div>
            <input
              type="range"
              min={0}
              max={250}
              step={2}
              value={testRainMm}
              onChange={(e) => setTestRainMm(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Dry (0 mm)</span>
              <span>Heavy (64.5 mm)</span>
              <span>Extreme (204+ mm)</span>
            </div>
          </div>

          {/* Test Moisture */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-slate-700">850 hPa Relative Humidity:</span>
              <span className="font-mono font-bold text-indigo-600">{testHumidity}% RH</span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={1}
              value={testHumidity}
              onChange={(e) => setTestHumidity(parseInt(e.target.value))}
              className="w-full accent-indigo-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
            />
          </div>

          {/* Test Surface Pressure */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-semibold text-slate-700">Surface Pressure (Depression Intensity):</span>
              <span className="font-mono font-bold text-indigo-600">{testPressure} hPa</span>
            </div>
            <input
              type="range"
              min={990}
              max={1015}
              step={1}
              value={testPressure}
              onChange={(e) => setTestPressure(parseInt(e.target.value))}
              className="w-full accent-indigo-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
            />
          </div>

          {/* Test Synoptic Regime Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Synoptic Context Regime:
            </label>
            <select
              value={testRegime}
              onChange={(e) => setTestRegime(e.target.value as SynopticWeatherRegime)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              {Object.values(SynopticWeatherRegime).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Live Alert Status Card */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              liveProbabilities.dominantAlertLevel === 'RED'
                ? 'bg-red-50 border-red-200 text-red-900'
                : liveProbabilities.dominantAlertLevel === 'ORANGE'
                ? 'bg-orange-50 border-orange-200 text-orange-900'
                : liveProbabilities.dominantAlertLevel === 'YELLOW'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-xs uppercase tracking-wide">
                Operational Alert Level: {liveProbabilities.dominantAlertLevel}
              </div>
              <p className="text-xs mt-1 leading-snug">{liveProbabilities.warningMessage}</p>
            </div>
          </div>
        </div>

        {/* Right Column: 4 Exceedance Probability Cards */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {thresholds.map((t) => (
            <div
              key={t.id}
              className={`p-5 rounded-2xl border ${t.borderColor} ${t.bgColor} shadow-xs flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${t.alertBadge}`}>
                    ≥ {t.thresholdMm} mm/day
                  </span>
                  <span className="text-2xl font-black font-mono text-slate-900">
                    {t.prob}%
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 text-base">{t.name}</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{t.desc}</p>

                {/* Progress Bar */}
                <div className="w-full bg-slate-200/80 rounded-full h-2.5 mt-4 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${t.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${t.prob}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 text-[11px] text-slate-600">
                <span className="font-bold text-slate-800 block mb-0.5">Disaster Protocol:</span>
                {t.action}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* District / Station Heavy Rainfall Risk Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Station & District Exceedance Risk Matrix ({stationRiskRankings.length} Subdivisions)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked by probability of Heavy (&gt;64.5mm) and Very Heavy (&gt;115.5mm) rainfall
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search station, district, state..."
              value={stationSearch}
              onChange={(e) => setStationSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Station & Subdivision</th>
                <th className="py-3 px-3">Synoptic Regime</th>
                <th className="py-3 px-3">Corrected Forecast</th>
                <th className="py-3 px-3 text-center">&gt;15.5mm (Moderate)</th>
                <th className="py-3 px-3 text-center">&gt;64.5mm (Heavy)</th>
                <th className="py-3 px-3 text-center">&gt;115.5mm (Very Heavy)</th>
                <th className="py-3 px-3 text-center">&gt;204.4mm (Extreme)</th>
                <th className="py-3 px-4 text-center">Alert Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {stationRiskRankings.slice(0, 12).map((stn) => {
                const p = stn.probs;
                return (
                  <tr key={stn.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{stn.name}</div>
                      <div className="text-[11px] text-slate-500">{stn.subdivision}, {stn.state}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                        {stn.synopticRegime}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                      {stn.maxRain} mm
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      <span className={`px-2 py-0.5 rounded font-bold ${p.probModerate15 > 60 ? 'bg-amber-100 text-amber-800' : 'text-slate-600'}`}>
                        {p.probModerate15}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      <span className={`px-2 py-0.5 rounded font-bold ${p.probHeavy64 > 40 ? 'bg-orange-100 text-orange-800' : 'text-slate-600'}`}>
                        {p.probHeavy64}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      <span className={`px-2 py-0.5 rounded font-bold ${p.probVeryHeavy115 > 25 ? 'bg-red-100 text-red-800' : 'text-slate-600'}`}>
                        {p.probVeryHeavy115}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      <span className={`px-2 py-0.5 rounded font-bold ${p.probExtremelyHeavy204 > 15 ? 'bg-purple-100 text-purple-800' : 'text-slate-500'}`}>
                        {p.probExtremelyHeavy204}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          p.dominantAlertLevel === 'RED'
                            ? 'bg-red-500/15 text-red-700 border-red-300'
                            : p.dominantAlertLevel === 'ORANGE'
                            ? 'bg-orange-500/15 text-orange-700 border-orange-300'
                            : p.dominantAlertLevel === 'YELLOW'
                            ? 'bg-amber-500/15 text-amber-700 border-amber-300'
                            : 'bg-emerald-500/15 text-emerald-700 border-emerald-300'
                        }`}
                      >
                        {p.dominantAlertLevel} ALERT
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
