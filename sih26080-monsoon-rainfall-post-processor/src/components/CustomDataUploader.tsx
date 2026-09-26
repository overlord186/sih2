import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Play,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FileText,
  RefreshCw,
  Layers,
  MapPin,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { classifySynopticRegime, classifyRegime, applyRegimeAwareCorrection, calculateHeavyRainProbabilities } from '../ml/postProcessor';
import { SynopticWeatherRegime } from '../types';

interface CustomRecord {
  id: string;
  stationName: string;
  subdivision: string;
  state: string;
  rawForecastMm: number;
  relativeHumidity: number;
  surfacePressure: number;
  windSpeed: number;
  leadTimeDays: number;
  isCoast?: boolean;
  isNorthWest?: boolean;
}

interface ProcessedRecord extends CustomRecord {
  synopticRegime: SynopticWeatherRegime;
  correctedForecastMm: number;
  deltaMm: number;
  alertLevel: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  probHeavy64: number;
  probVeryHeavy115: number;
  appliedModel: string;
}

const PRESET_SCENARIOS: { name: string; description: string; data: CustomRecord[] }[] = [
  {
    name: '2024 Gujarat Deep Depression Extreme Event',
    description: 'Landfalling monsoon depression with surface pressure < 996 hPa and high moisture convergence.',
    data: [
      { id: 'SC1-1', stationName: 'Vadodara Met', subdivision: 'Gujarat Region', state: 'Gujarat', rawForecastMm: 110, relativeHumidity: 96, surfacePressure: 994, windSpeed: 42, leadTimeDays: 1, isCoast: true },
      { id: 'SC1-2', stationName: 'Surat Coast', subdivision: 'Gujarat Region', state: 'Gujarat', rawForecastMm: 145, relativeHumidity: 98, surfacePressure: 992, windSpeed: 48, leadTimeDays: 1, isCoast: true },
      { id: 'SC1-3', stationName: 'Ahmedabad AP', subdivision: 'Gujarat Region', state: 'Gujarat', rawForecastMm: 85, relativeHumidity: 92, surfacePressure: 997, windSpeed: 35, leadTimeDays: 1 },
      { id: 'SC1-4', stationName: 'Dwarka Radar', subdivision: 'Saurashtra & Kutch', state: 'Gujarat', rawForecastMm: 160, relativeHumidity: 97, surfacePressure: 991, windSpeed: 52, leadTimeDays: 1, isCoast: true },
      { id: 'SC1-5', stationName: 'Rajkot Obs', subdivision: 'Saurashtra & Kutch', state: 'Gujarat', rawForecastMm: 75, relativeHumidity: 89, surfacePressure: 998, windSpeed: 30, leadTimeDays: 1 },
    ],
  },
  {
    name: '2023 Himalayan Foothills Break Monsoon Spell',
    description: 'Monsoon trough shifted to Himalayan foothills; dry central plains with intense northern orographic downpours.',
    data: [
      { id: 'SC2-1', stationName: 'Dehradun Obs', subdivision: 'Uttarakhand', state: 'Uttarakhand', rawForecastMm: 125, relativeHumidity: 95, surfacePressure: 1002, windSpeed: 22, leadTimeDays: 2, isNorthWest: true },
      { id: 'SC2-2', stationName: 'Shimla Ridge', subdivision: 'Himachal Pradesh', state: 'Himachal Pradesh', rawForecastMm: 95, relativeHumidity: 92, surfacePressure: 1004, windSpeed: 25, leadTimeDays: 2, isNorthWest: true },
      { id: 'SC2-3', stationName: 'Cherrapunji', subdivision: 'Assam & Meghalaya', state: 'Meghalaya', rawForecastMm: 210, relativeHumidity: 99, surfacePressure: 1001, windSpeed: 28, leadTimeDays: 2 },
      { id: 'SC2-4', stationName: 'Nagpur Central', subdivision: 'Vidarbha', state: 'Maharashtra', rawForecastMm: 4.5, relativeHumidity: 58, surfacePressure: 1010, windSpeed: 12, leadTimeDays: 2 },
      { id: 'SC2-5', stationName: 'Hyderabad Met', subdivision: 'Telangana', state: 'Telangana', rawForecastMm: 3.2, relativeHumidity: 54, surfacePressure: 1011, windSpeed: 10, leadTimeDays: 2 },
    ],
  },
  {
    name: 'Western Ghats Heavy Orographic Surge',
    description: 'Strong low-level westerly jet (>40 kt) impinging perpendicularly on Western Ghats windward escarpment.',
    data: [
      { id: 'SC3-1', stationName: 'Mahabaleshwar', subdivision: 'Konkan & Goa', state: 'Maharashtra', rawForecastMm: 180, relativeHumidity: 99, surfacePressure: 1003, windSpeed: 45, leadTimeDays: 1, isCoast: true },
      { id: 'SC3-2', stationName: 'Agumbe Peak', subdivision: 'Coastal Karnataka', state: 'Karnataka', rawForecastMm: 195, relativeHumidity: 100, surfacePressure: 1002, windSpeed: 42, leadTimeDays: 1, isCoast: true },
      { id: 'SC3-3', stationName: 'Ratnagiri Port', subdivision: 'Konkan & Goa', state: 'Maharashtra', rawForecastMm: 115, relativeHumidity: 94, surfacePressure: 1005, windSpeed: 38, leadTimeDays: 1, isCoast: true },
      { id: 'SC3-4', stationName: 'Mangaluru AP', subdivision: 'Coastal Karnataka', state: 'Karnataka', rawForecastMm: 90, relativeHumidity: 92, surfacePressure: 1006, windSpeed: 32, leadTimeDays: 1, isCoast: true },
      { id: 'SC3-5', stationName: 'Pune Leeward', subdivision: 'Madhya Maharashtra', state: 'Maharashtra', rawForecastMm: 12, relativeHumidity: 72, surfacePressure: 1008, windSpeed: 20, leadTimeDays: 1 },
    ],
  },
];

export const CustomDataUploader: React.FC = () => {
  const [rawRecords, setRawRecords] = useState<CustomRecord[]>(PRESET_SCENARIOS[0].data);
  const [processedRecords, setProcessedRecords] = useState<ProcessedRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(0);

  const handleProcess = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const results: ProcessedRecord[] = rawRecords.map((rec) => {
        const { regime } = classifyRegime(rec.rawForecastMm, rec.relativeHumidity, rec.surfacePressure, rec.windSpeed, 30);
        const synoptic = classifySynopticRegime({
          rawForecastMm: rec.rawForecastMm,
          relativeHumidity: rec.relativeHumidity,
          surfacePressure: rec.surfacePressure,
          windSpeed: rec.windSpeed,
          isWesternGhatsOrCoast: rec.isCoast,
          isNorthWestOrHimalayan: rec.isNorthWest,
        });

        const { correctedMm, appliedModel } = applyRegimeAwareCorrection(
          rec.rawForecastMm,
          regime,
          rec.relativeHumidity,
          rec.surfacePressure,
          rec.windSpeed,
          rec.leadTimeDays
        );

        const delta = Math.round((correctedMm - rec.rawForecastMm) * 10) / 10;
        const heavyProbs = calculateHeavyRainProbabilities(correctedMm, rec.relativeHumidity, rec.surfacePressure, synoptic.synopticRegime);

        return {
          ...rec,
          synopticRegime: synoptic.synopticRegime,
          correctedForecastMm: correctedMm,
          deltaMm: delta,
          alertLevel: heavyProbs.dominantAlertLevel,
          probHeavy64: heavyProbs.probHeavy64,
          probVeryHeavy115: heavyProbs.probVeryHeavy115,
          appliedModel,
        };
      });

      setProcessedRecords(results);
      setIsProcessing(false);
    }, 400);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          setUploadError('CSV must have a header line and at least 1 record.');
          return;
        }

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]+/g, ''));
        const nameIdx = headers.findIndex((h) => h.includes('station') || h.includes('district') || h.includes('name'));
        const subIdx = headers.findIndex((h) => h.includes('subdivision') || h.includes('region'));
        const stateIdx = headers.findIndex((h) => h.includes('state'));
        const rawIdx = headers.findIndex((h) => h.includes('raw') || h.includes('forecast') || h.includes('rain'));
        const rhIdx = headers.findIndex((h) => h.includes('humidity') || h.includes('rh'));
        const presIdx = headers.findIndex((h) => h.includes('pressure') || h.includes('mslp'));
        const windIdx = headers.findIndex((h) => h.includes('wind') || h.includes('speed'));
        const leadIdx = headers.findIndex((h) => h.includes('lead') || h.includes('day'));

        const records: CustomRecord[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/['"]+/g, ''));
          if (cols.length < 3) continue;

          const stationName = nameIdx >= 0 ? cols[nameIdx] : `Station ${i}`;
          const subdivision = subIdx >= 0 ? cols[subIdx] : 'Indian Region';
          const state = stateIdx >= 0 ? cols[stateIdx] : 'India';
          const rawForecastMm = rawIdx >= 0 ? parseFloat(cols[rawIdx]) || 20 : 20;
          const relativeHumidity = rhIdx >= 0 ? parseFloat(cols[rhIdx]) || 80 : 80;
          const surfacePressure = presIdx >= 0 ? parseFloat(cols[presIdx]) || 1004 : 1004;
          const windSpeed = windIdx >= 0 ? parseFloat(cols[windIdx]) || 20 : 20;
          const leadTimeDays = leadIdx >= 0 ? parseInt(cols[leadIdx], 10) || 1 : 1;

          records.push({
            id: `custom-${i}`,
            stationName,
            subdivision,
            state,
            rawForecastMm,
            relativeHumidity,
            surfacePressure,
            windSpeed,
            leadTimeDays,
            isCoast: subdivision.toLowerCase().includes('coast') || subdivision.toLowerCase().includes('konkan'),
            isNorthWest: subdivision.toLowerCase().includes('himachal') || subdivision.toLowerCase().includes('uttarakhand'),
          });
        }

        if (records.length === 0) {
          setUploadError('No valid data rows found in CSV.');
          return;
        }

        setRawRecords(records);
        setProcessedRecords([]);
      } catch (err) {
        setUploadError('Failed to parse CSV file. Ensure standard comma-separated format.');
      }
    };
    reader.readAsText(file);
  };

  const handleExportProcessedCSV = () => {
    if (processedRecords.length === 0) return;
    const headers = [
      'Station Name',
      'Subdivision',
      'State',
      'Lead Time (Days)',
      'Raw NWP (mm)',
      'Relative Humidity (%)',
      'Surface Pressure (hPa)',
      'Wind Speed (km/h)',
      'Classified Synoptic Regime',
      'SAMVARTAKA AI Forecast (mm)',
      'Delta Correction (mm)',
      'Alert Level',
      'Prob Heavy >64.5mm (%)',
      'Prob Very Heavy >115.5mm (%)',
      'Applied Correction Model',
    ];

    const rows = processedRecords.map((r) => [
      `"${r.stationName}"`,
      `"${r.subdivision}"`,
      `"${r.state}"`,
      r.leadTimeDays,
      r.rawForecastMm,
      r.relativeHumidity,
      r.surfacePressure,
      r.windSpeed,
      `"${r.synopticRegime}"`,
      r.correctedForecastMm,
      r.deltaMm,
      r.alertLevel,
      `${r.probHeavy64}%`,
      `${r.probVeryHeavy115}%`,
      `"${r.appliedModel}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'SAMVARTAKA_Custom_Batch_PostProcessed_Rainfall.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wider">
              Batch NWP Post-Processing Pipeline
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
              Live Grid Ingestion Ready
            </span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            Custom Model Forecast Ingestion & Regime Processing
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Upload custom numerical weather prediction grid points (NCMRWF / ECMWF / GFS / WRF) to diagnose synoptic weather regimes and apply SAMVARTAKA AI post-processing bias corrections in batch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer">
            <Upload className="w-4 h-4 text-purple-400" />
            <span>Upload NWP CSV</span>
            <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={handleProcess}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-blue-200" />
                <span>Run SAMVARTAKA AI ({rawRecords.length} Points)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Preset Scenario Selector Bar */}
      <div>
        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>Or Load Monsoonal Benchmark Test Scenarios:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PRESET_SCENARIOS.map((sc, idx) => (
            <button
              key={sc.name}
              onClick={() => {
                setSelectedScenarioIndex(idx);
                setRawRecords(sc.data);
                setProcessedRecords([]);
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedScenarioIndex === idx
                  ? 'bg-blue-950/60 border-blue-500/60 ring-1 ring-blue-500/30'
                  : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-300'
              }`}
            >
              <div className="text-xs font-bold text-white">{sc.name}</div>
              <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{sc.description}</div>
              <div className="text-[10px] text-blue-400 font-mono mt-2">{sc.data.length} Grid Stations</div>
            </button>
          ))}
        </div>
      </div>

      {/* Processing Results Table */}
      {processedRecords.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-300">
                Batch Post-Processing Completed ({processedRecords.length} Stations Calibrated)
              </span>
            </div>

            <button
              onClick={handleExportProcessedCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-200" />
              <span>Export Calibrated CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900 text-slate-400 font-sans font-semibold uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Station / District</th>
                  <th className="py-2.5 px-3">Subdivision</th>
                  <th className="py-2.5 px-3">Detected Regime</th>
                  <th className="py-2.5 px-3 text-right">Raw NWP</th>
                  <th className="py-2.5 px-3 text-right">AI Corrected</th>
                  <th className="py-2.5 px-3 text-center">Delta</th>
                  <th className="py-2.5 px-3 text-center">Alert Level</th>
                  <th className="py-2.5 px-3 text-right">Prob &gt;64.5mm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {processedRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-sans font-bold text-white flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                      {r.stationName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{r.subdivision}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700 text-[10px] font-semibold font-sans">
                        {r.synopticRegime}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-400">
                      {r.rawForecastMm.toFixed(1)} mm
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-blue-400 text-sm">
                      {r.correctedForecastMm.toFixed(1)} mm
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold">
                      <span className={r.deltaMm > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                        {r.deltaMm > 0 ? `+${r.deltaMm}` : r.deltaMm} mm
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border font-sans ${
                          r.alertLevel === 'RED'
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : r.alertLevel === 'ORANGE'
                            ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                            : r.alertLevel === 'YELLOW'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {r.alertLevel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-200">
                      {r.probHeavy64}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-8 border border-dashed border-slate-800 rounded-xl bg-slate-950/40 text-center space-y-2">
          <FileSpreadsheet className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="text-xs font-semibold text-slate-300">
            {rawRecords.length} Raw Grid Points Loaded in Staging Buffer
          </div>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            Click &quot;Run SAMVARTAKA AI&quot; above to execute synoptic regime classification, drizzle elimination, and heavy rainfall probability estimation.
          </p>
        </div>
      )}
    </div>
  );
};
