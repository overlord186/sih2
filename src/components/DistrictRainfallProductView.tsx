import React, { useState, useMemo } from 'react';
import { RainfallDataPoint, SynopticWeatherRegime, DistrictForecastProduct } from '../types';
import { classifySynopticRegime, calculateHeavyRainProbabilities, applyRegimeAwareCorrection, classifyRegime } from '../ml/postProcessor';
import { MET_STATIONS } from '../data/monsoonDataset';
import {
  MapPin,
  Search,
  Filter,
  Download,
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Sliders,
  Calendar,
  Layers,
  Sparkles,
  Printer,
  ChevronDown,
} from 'lucide-react';
import { motion } from 'motion/react';

interface DistrictRainfallProductViewProps {
  dataset: RainfallDataPoint[];
  selectedLeadTime: number;
  onSelectStation?: (stationId: string) => void;
}

export const DistrictRainfallProductView: React.FC<DistrictRainfallProductViewProps> = ({
  dataset,
  selectedLeadTime,
  onSelectStation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubdivision, setSelectedSubdivision] = useState<string>('all');
  const [selectedAlertFilter, setSelectedAlertFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'correctedForecastMm' | 'rawForecastMm' | 'probHeavy64' | 'name'>('correctedForecastMm');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [leadTime, setLeadTime] = useState<number>(selectedLeadTime || 1);

  // Compute District-Level Forecast Products for each station
  const districtProducts: DistrictForecastProduct[] = useMemo(() => {
    return MET_STATIONS.map((stn) => {
      // Find matching samples from dataset
      const stnSamples = dataset.filter((d) => d.stationId === stn.id);
      const avgRaw = stnSamples.length > 0
        ? stnSamples.reduce((acc, curr) => acc + curr.rawForecastMm, 0) / stnSamples.length
        : 45;
      const avgObs = stnSamples.length > 0
        ? stnSamples.reduce((acc, curr) => acc + curr.observedMm, 0) / stnSamples.length
        : 40;

      const isCoast = stn.subdivision.includes('Konkan') || stn.subdivision.includes('Coastal');
      const isNW = stn.subdivision.includes('Jammu') || stn.subdivision.includes('Himachal') || stn.subdivision.includes('Uttarakhand');
      
      const { regime } = classifyRegime(avgRaw, 88, 1004, 25, 30);
      const synoptic = classifySynopticRegime({
        rawForecastMm: avgRaw,
        relativeHumidity: 88,
        surfacePressure: 1004,
        windSpeed: 25,
        isWesternGhatsOrCoast: isCoast,
        isNorthWestOrHimalayan: isNW,
      });

      const { correctedMm, appliedModel } = applyRegimeAwareCorrection(
        avgRaw,
        regime,
        88,
        1004,
        25,
        leadTime
      );

      const baselineLinearMm = Math.round((avgRaw * 0.86 + 0.5) * 10) / 10;
      const heavyProbs = calculateHeavyRainProbabilities(correctedMm, 88, 1004, synoptic.synopticRegime);

      const delta = Math.round((correctedMm - avgRaw) * 10) / 10;

      let advisoryText = 'Normal monsoonal precipitation. Routine monitoring.';
      if (heavyProbs.dominantAlertLevel === 'RED') {
        advisoryText = 'RED ALERT: Extreme downpour risk. Flash flood danger. NDRF/SDRF mobilization recommended.';
      } else if (heavyProbs.dominantAlertLevel === 'ORANGE') {
        advisoryText = 'ORANGE ALERT: Heavy to very heavy spells. Maintain high vigilance and pump deployments.';
      } else if (heavyProbs.dominantAlertLevel === 'YELLOW') {
        advisoryText = 'YELLOW ALERT: Watch for localized waterlogging in low-lying and urban corridors.';
      }

      return {
        districtName: stn.name,
        stationId: stn.id,
        state: stn.state,
        subdivision: stn.subdivision,
        lat: stn.lat,
        lon: stn.lon,
        rawNwpMm: Math.round(avgRaw * 10) / 10,
        baselineMm: baselineLinearMm,
        aiCorrectedMm: correctedMm,
        observedMm: Math.round(avgObs * 10) / 10,
        biasDeltaMm: delta,
        synopticRegime: synoptic.synopticRegime,
        alertLevel: heavyProbs.dominantAlertLevel,
        heavyRainProbability: heavyProbs,
        advisoryText,
        leadTimeDays: leadTime,
      };
    });
  }, [dataset, leadTime]);

  // Unique subdivisions for dropdown
  const subdivisions = useMemo(() => {
    const set = new Set(MET_STATIONS.map((s) => s.subdivision));
    return Array.from(set).sort();
  }, []);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return districtProducts
      .filter((p) => {
        if (selectedSubdivision !== 'all' && p.subdivision !== selectedSubdivision) return false;
        if (selectedAlertFilter !== 'all' && p.alertLevel !== selectedAlertFilter) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return (
            p.districtName.toLowerCase().includes(q) ||
            p.state.toLowerCase().includes(q) ||
            p.subdivision.toLowerCase().includes(q) ||
            p.synopticRegime.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortField === 'name') {
          return sortAsc ? a.districtName.localeCompare(b.districtName) : b.districtName.localeCompare(a.districtName);
        }
        if (sortField === 'rawForecastMm') {
          return sortAsc ? a.rawNwpMm - b.rawNwpMm : b.rawNwpMm - a.rawNwpMm;
        }
        if (sortField === 'correctedForecastMm') {
          return sortAsc ? a.aiCorrectedMm - b.aiCorrectedMm : b.aiCorrectedMm - a.aiCorrectedMm;
        }
        if (sortField === 'probHeavy64') {
          return sortAsc
            ? a.heavyRainProbability.probHeavy64 - b.heavyRainProbability.probHeavy64
            : b.heavyRainProbability.probHeavy64 - a.heavyRainProbability.probHeavy64;
        }
        return 0;
      });
  }, [districtProducts, selectedSubdivision, selectedAlertFilter, searchQuery, sortField, sortAsc]);

  // Summary counts
  const alertCounts = useMemo(() => {
    const counts = { GREEN: 0, YELLOW: 0, ORANGE: 0, RED: 0 };
    districtProducts.forEach((p) => {
      counts[p.alertLevel] = (counts[p.alertLevel] || 0) + 1;
    });
    return counts;
  }, [districtProducts]);

  // Export to CSV helper
  const handleExportCSV = () => {
    const headers = [
      'District/Station',
      'Subdivision',
      'State',
      'Lead Time (Days)',
      'Synoptic Regime',
      'Raw NWP (mm)',
      'Baseline Linear (mm)',
      'AI Corrected (mm)',
      'Delta (mm)',
      'Prob >15.5mm',
      'Prob >64.5mm',
      'Prob >115.5mm',
      'Alert Level',
      'Advisory',
    ];

    const rows = filteredProducts.map((p) => [
      `"${p.districtName}"`,
      `"${p.subdivision}"`,
      `"${p.state}"`,
      p.leadTimeDays,
      `"${p.synopticRegime}"`,
      p.rawNwpMm,
      p.baselineMm,
      p.aiCorrectedMm,
      p.biasDeltaMm,
      `${p.heavyRainProbability.probModerate15}%`,
      `${p.heavyRainProbability.probHeavy64}%`,
      `${p.heavyRainProbability.probVeryHeavy115}%`,
      p.alertLevel,
      `"${p.advisoryText}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `IMD_SAMVARTAKA_District_Forecast_Day${leadTime}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold uppercase tracking-wider">
                Module 3: District-Level Rainfall Forecast Product
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                Operational IMD Product Active
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Operational District & Grid-Level Rainfall Table
            </h2>
            <p className="text-slate-300 text-sm mt-2 max-w-3xl leading-relaxed">
              Synthesized district-level rainfall products integrating raw numerical weather prediction (NWP),
              regime classification, AI post-processed bias corrections, and operational hazard alert color coding across India's 37 meteorological subdivisions.
            </p>
          </div>

          {/* Alert Pills */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => setSelectedAlertFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                selectedAlertFilter === 'all'
                  ? 'bg-white text-slate-900 border-white shadow-md'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              All ({districtProducts.length})
            </button>
            <button
              onClick={() => setSelectedAlertFilter('RED')}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                selectedAlertFilter === 'RED'
                  ? 'bg-red-500 text-white border-red-500 shadow-md'
                  : 'bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/25'
              }`}
            >
              RED Alert ({alertCounts.RED})
            </button>
            <button
              onClick={() => setSelectedAlertFilter('ORANGE')}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                selectedAlertFilter === 'ORANGE'
                  ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                  : 'bg-orange-500/15 text-orange-300 border-orange-500/30 hover:bg-orange-500/25'
              }`}
            >
              ORANGE Alert ({alertCounts.ORANGE})
            </button>
            <button
              onClick={() => setSelectedAlertFilter('YELLOW')}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                selectedAlertFilter === 'YELLOW'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
              }`}
            >
              YELLOW Alert ({alertCounts.YELLOW})
            </button>
            <button
              onClick={() => setSelectedAlertFilter('GREEN')}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                selectedAlertFilter === 'GREEN'
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
              }`}
            >
              GREEN ({alertCounts.GREEN})
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar: Lead Time, Subdivision Filter, Search, CSV Export */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left Side: Lead Time Selector */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            Lead Time:
          </span>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            {[1, 2, 3, 5, 7].map((lt) => (
              <button
                key={lt}
                onClick={() => setLeadTime(lt)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  leadTime === lt
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Day {lt}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Subdivision dropdown & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1 max-w-2xl">
          <div className="relative w-full sm:w-56">
            <select
              value={selectedSubdivision}
              onChange={(e) => setSelectedSubdivision(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Subdivisions ({subdivisions.length})</option>
              {subdivisions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search district, state, or synoptic regime..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Right Side: CSV Export Button */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Main District Forecast Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold text-slate-700">
            Showing {filteredProducts.length} of {districtProducts.length} Meteorological Stations (Lead: Day {leadTime})
          </span>
          <span className="text-xs text-slate-500">
            Click any row to view station in Live Map
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th
                  onClick={() => {
                    if (sortField === 'name') setSortAsc(!sortAsc);
                    else {
                      setSortField('name');
                      setSortAsc(true);
                    }
                  }}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    District & Station
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Subdivision / State</th>
                <th className="py-3 px-3">Synoptic Regime</th>
                <th
                  onClick={() => {
                    if (sortField === 'rawForecastMm') setSortAsc(!sortAsc);
                    else {
                      setSortField('rawForecastMm');
                      setSortAsc(false);
                    }
                  }}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    Raw NWP
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3">Linear Base</th>
                <th
                  onClick={() => {
                    if (sortField === 'correctedForecastMm') setSortAsc(!sortAsc);
                    else {
                      setSortField('correctedForecastMm');
                      setSortAsc(false);
                    }
                  }}
                  className="py-3 px-3 cursor-pointer hover:text-slate-900 text-blue-700 font-bold"
                >
                  <div className="flex items-center gap-1">
                    AI Corrected
                    <ArrowUpDown className="w-3 h-3 text-blue-500" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">Bias Delta</th>
                <th className="py-3 px-3">IMD Category</th>
                <th
                  onClick={() => {
                    if (sortField === 'probHeavy64') setSortAsc(!sortAsc);
                    else {
                      setSortField('probHeavy64');
                      setSortAsc(false);
                    }
                  }}
                  className="py-3 px-3 text-center cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center justify-center gap-1">
                    Heavy Risk (&gt;64.5mm)
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Alert Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredProducts.map((p) => {
                const isPositiveDelta = p.biasDeltaMm > 0;
                return (
                  <tr
                    key={p.stationId}
                    onClick={() => onSelectStation && onSelectStation(p.stationId)}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        {p.districtName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono pl-5">
                        {p.lat.toFixed(2)}°N, {p.lon.toFixed(2)}°E
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-800 font-semibold">{p.subdivision}</div>
                      <div className="text-[10px] text-slate-400">{p.state}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                        {p.synopticRegime}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 font-bold">
                      {p.rawNwpMm} mm
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">
                      {p.baselineMm} mm
                    </td>
                    <td className="py-3 px-3 font-mono font-black text-blue-700 text-sm">
                      {p.aiCorrectedMm} mm
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                          isPositiveDelta
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {isPositiveDelta ? '+' : ''}
                        {p.biasDeltaMm} mm
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs font-semibold text-slate-700">
                        {p.aiCorrectedMm >= 115.6 ? 'Very Heavy' : p.aiCorrectedMm >= 64.5 ? 'Heavy Rain' : p.aiCorrectedMm >= 15.6 ? 'Moderate Rain' : 'Light Rain'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          p.heavyRainProbability.probHeavy64 >= 50
                            ? 'bg-orange-100 text-orange-800'
                            : p.heavyRainProbability.probHeavy64 >= 25
                            ? 'bg-amber-100 text-amber-800'
                            : 'text-slate-600'
                        }`}
                      >
                        {p.heavyRainProbability.probHeavy64}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          p.alertLevel === 'RED'
                            ? 'bg-red-500/15 text-red-700 border-red-300'
                            : p.alertLevel === 'ORANGE'
                            ? 'bg-orange-500/15 text-orange-700 border-orange-300'
                            : p.alertLevel === 'YELLOW'
                            ? 'bg-amber-500/15 text-amber-700 border-amber-300'
                            : 'bg-emerald-500/15 text-emerald-700 border-emerald-300'
                        }`}
                      >
                        {p.alertLevel}
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
