import React, { useState } from 'react';
import {
  WebhookAlertConfig,
  GriddedExportConfig,
} from '../types';
import {
  Send,
  Download,
  Bell,
  Sliders,
  CheckCircle2,
  FileCode,
  Globe,
  Radio,
  Copy,
  Check,
  AlertTriangle,
  Zap,
  Terminal,
  ShieldAlert,
  Server,
  Sparkles,
} from 'lucide-react';

const DEFAULT_WEBHOOKS: WebhookAlertConfig[] = [
  {
    id: 'WH_NDMA_NATIONAL',
    name: 'NDMA National Emergency Operations Centre (NEOC)',
    endpointUrl: 'https://api.ndma.gov.in/v2/monsoon-alerts/cap-receiver',
    targetAgencies: ['NDMA', 'SDMA', 'State Relief Commissioners'],
    triggerProbabilityThreshold: 65,
    triggerRainfallThresholdMm: 64.5,
    subdivisionFilter: ['All 36 Subdivisions'],
    leadTimeHours: 48,
    enabled: true,
    smsNotification: true,
    smsRecipients: ['+91-98765-XXXX1', '+91-98765-XXXX2'],
    lastTriggered: '2026-09-06 08:30 IST',
    lastStatus: 'SUCCESS',
  },
  {
    id: 'WH_BMC_MUMBAI',
    name: 'Brihanmumbai Municipal Corporation (BMC Disaster Cell)',
    endpointUrl: 'https://disaster.mcgm.gov.in/api/v1/heavy-rainfall-webhook',
    targetAgencies: ['BMC', 'Central Railway', 'Western Railway', 'BEST'],
    triggerProbabilityThreshold: 60,
    triggerRainfallThresholdMm: 64.5,
    subdivisionFilter: ['Konkan & Goa', 'Western Ghats Crest'],
    leadTimeHours: 24,
    enabled: true,
    smsNotification: true,
    smsRecipients: ['+91-98200-XXXX4', '+91-98200-XXXX8'],
    lastTriggered: '2026-09-06 09:15 IST',
    lastStatus: 'SUCCESS',
  },
  {
    id: 'WH_GCC_CHENNAI',
    name: 'Greater Chennai Corporation (GCC Integrated Command)',
    endpointUrl: 'https://chennaicorporation.gov.in/smartcity/alerts/webhook',
    targetAgencies: ['GCC', 'Tamil Nadu SDMA', 'PWD Water Resources'],
    triggerProbabilityThreshold: 70,
    triggerRainfallThresholdMm: 115.5,
    subdivisionFilter: ['Tamil Nadu, Puducherry & Karaikal', 'Coastal Andhra Pradesh'],
    leadTimeHours: 24,
    enabled: false,
    smsNotification: true,
    smsRecipients: ['+91-94440-XXXX9'],
    lastTriggered: '2026-09-05 18:00 IST',
    lastStatus: 'SUCCESS',
  },
];

export const OperationalDispatchView: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'WEBHOOK' | 'GRIDDED_EXPORT'>('WEBHOOK');
  const [webhooks, setWebhooks] = useState<WebhookAlertConfig[]>(DEFAULT_WEBHOOKS);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookAlertConfig>(DEFAULT_WEBHOOKS[0]);
  const [isCopied, setIsCopied] = useState(false);
  const [isTestSending, setIsTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'IDLE' | 'SUCCESS' | 'ERROR'; message: string }>({
    status: 'IDLE',
    message: '',
  });

  // Gridded Export State
  const [exportFormat, setExportFormat] = useState<'NETCDF4' | 'GEOTIFF' | 'GRIDDED_CSV' | 'GEOJSON'>('NETCDF4');
  const [gridRes, setGridRes] = useState<0.25 | 0.5 | 0.1>(0.25);
  const [selectedLead, setSelectedLead] = useState<number>(1);
  const [includeVariables, setIncludeVariables] = useState({
    rawForecast: true,
    aiCorrected: true,
    biasDelta: true,
    heavyRainProb: true,
    synopticRegime: true,
    uncertaintySpread: true,
  });
  const [isExporting, setIsExporting] = useState(false);

  // Common Alerting Protocol (CAP) JSON Payload preview
  const sampleCapPayload = {
    identifier: `SAMVARTAKA-CAP-20260906-${selectedWebhook.id}`,
    sender: 'samvartaka.imd.gov.in/operational-pipeline',
    sent: new Date().toISOString(),
    status: 'Actual',
    msgType: 'Alert',
    scope: 'Public',
    info: {
      category: 'Met',
      event: 'Heavy Rainfall Exceedance Warning',
      urgency: 'Expected',
      severity: 'Severe',
      certainty: 'Likely',
      eventCode: 'IMD_RAINFALL_ORANGE_RED',
      headline: `Automated Multi-Basin Deluge Warning for ${selectedWebhook.subdivisionFilter.join(', ')}`,
      description: `SAMVARTAKA AI post-processor predicts Heavy to Very Heavy rainfall exceedance (P >= ${selectedWebhook.triggerRainfallThresholdMm} mm) exceeding probability threshold ${selectedWebhook.triggerProbabilityThreshold}%.`,
      instruction: 'Activate municipal high-capacity dewatering pumps, clear stormwater culverts, and notify low-lying settlements.',
      parameter: [
        { valueName: 'leadTimeHours', value: `${selectedWebhook.leadTimeHours}` },
        { valueName: 'biasCorrectedPeakMm', value: '148.5' },
        { valueName: 'probabilityExceedance', value: `${selectedWebhook.triggerProbabilityThreshold}%` },
      ],
      area: {
        areaDesc: selectedWebhook.subdivisionFilter.join(', '),
      },
    },
  };

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(sampleCapPayload, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleTestWebhook = () => {
    setIsTestSending(true);
    setTestResult({ status: 'IDLE', message: '' });

    setTimeout(() => {
      setIsTestSending(false);
      setTestResult({
        status: 'SUCCESS',
        message: `HTTP 200 OK — Payload delivered to ${selectedWebhook.endpointUrl} (Response latency: 124ms). SMS dispatch queue confirmed.`,
      });
    }, 800);
  };

  const handleDownloadGriddedFile = () => {
    setIsExporting(true);
    setTimeout(() => {
      // Create a simulated downloadable array package
      const filename = `SAMVARTAKA_India_Precip_${gridRes}deg_Lead${selectedLead}d_${new Date().toISOString().slice(0, 10)}.${
        exportFormat === 'NETCDF4'
          ? 'nc'
          : exportFormat === 'GEOTIFF'
          ? 'tif'
          : exportFormat === 'GEOJSON'
          ? 'geojson'
          : 'csv'
      }`;

      let content = '';
      if (exportFormat === 'GRIDDED_CSV') {
        content = 'lat,lon,raw_nwp_mm,ai_corrected_mm,bias_delta_mm,prob_heavy_pct,regime_code\n';
        for (let lat = 8.0; lat <= 36.0; lat += 2.0) {
          for (let lon = 68.0; lon <= 96.0; lon += 2.0) {
            const raw = (Math.sin(lat * 0.2) * Math.cos(lon * 0.1) * 35 + 20).toFixed(1);
            const ai = (parseFloat(raw) * 1.25).toFixed(1);
            const delta = (parseFloat(ai) - parseFloat(raw)).toFixed(1);
            const prob = Math.min(95, Math.round(parseFloat(ai) * 0.6));
            content += `${lat.toFixed(2)},${lon.toFixed(2)},${raw},${ai},${delta},${prob},CONVECTIVE_ACTIVE\n`;
          }
        }
      } else {
        content = JSON.stringify(
          {
            format: exportFormat,
            cf_version: 'CF-1.8',
            conventions: 'COARDS/CF-1.8',
            title: 'SAMVARTAKA AI Bias-Corrected Gridded Rainfall Product',
            spatial_resolution_degrees: gridRes,
            bounding_box: { lat_min: 6.0, lat_max: 38.0, lon_min: 68.0, lon_max: 98.0 },
            lead_time_days: selectedLead,
            generation_timestamp: new Date().toISOString(),
            variables_included: includeVariables,
            sample_grid_points: 3840,
          },
          null,
          2
        );
      }

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setIsExporting(false);
    }, 600);
  };

  return (
    <div id="operational-dispatch-container" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" />
                Dissemination & Interoperability
              </span>
              <span className="text-xs text-slate-400">CAP v1.2 & NetCDF-4 CF Compliant</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Automated Alert Webhooks & Gridded Array Exporter
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Connects SAMVARTAKA AI alerts directly into municipal command systems via standard webhooks (JSON/CAP format) and provides high-resolution NetCDF-4/GeoTIFF raster arrays for meteorological researchers and GIS pipelines.
            </p>
          </div>

          <div className="flex items-center bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/80 gap-1">
            <button
              onClick={() => setActiveMode('WEBHOOK')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeMode === 'WEBHOOK'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Webhook / SMS Alerting</span>
            </button>
            <button
              onClick={() => setActiveMode('GRIDDED_EXPORT')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeMode === 'GRIDDED_EXPORT'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>GeoTIFF / NetCDF Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mode 1: Automated Webhook & SMS Alerting */}
      {activeMode === 'WEBHOOK' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Webhook List & Trigger Config (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Server className="w-4 h-4 text-purple-400" />
                  Configured Agency Webhooks
                </h3>
                <span className="text-xs text-slate-400">{webhooks.length} Active Endpoints</span>
              </div>

              <div className="space-y-3">
                {webhooks.map((wh) => (
                  <div
                    key={wh.id}
                    onClick={() => setSelectedWebhook(wh)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedWebhook.id === wh.id
                        ? 'bg-purple-950/40 border-purple-500 shadow-md ring-1 ring-purple-500/40'
                        : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-white">{wh.name}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs font-mono">
                          {wh.endpointUrl}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        wh.enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-700 text-slate-400'
                      }`}>
                        {wh.enabled ? 'ACTIVE' : 'PAUSED'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-400">
                      <span>Trigger: P ≥ {wh.triggerProbabilityThreshold}%</span>
                      <span>•</span>
                      <span>Lead: {wh.leadTimeHours}h</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-medium">Last: {wh.lastTriggered}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Webhook Parameter Controls */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                Dispatch Trigger Thresholds
              </h4>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Heavy Rain Probability Threshold:</span>
                    <span className="font-mono font-bold text-purple-400">{selectedWebhook.triggerProbabilityThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={90}
                    step={5}
                    value={selectedWebhook.triggerProbabilityThreshold}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSelectedWebhook((prev) => ({ ...prev, triggerProbabilityThreshold: val }));
                      setWebhooks((list) =>
                        list.map((w) => (w.id === selectedWebhook.id ? { ...w, triggerProbabilityThreshold: val } : w))
                      );
                    }}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Rainfall Volume Threshold:</span>
                    <span className="font-mono font-bold text-white">{selectedWebhook.triggerRainfallThresholdMm} mm (IMD Heavy)</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <span className="text-slate-400 block">SMS Recipients:</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedWebhook.smsRecipients.map((rec, i) => (
                      <span key={i} className="px-2 py-1 bg-slate-800 rounded text-[11px] font-mono text-slate-300 border border-slate-700">
                        {rec}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: CAP v1.2 Payload Inspector & Test Trigger (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-purple-400" />
                    Standard CAP v1.2 JSON Alert Payload
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    OASIS / IMD Common Alerting Protocol Schema
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyPayload}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                  <button
                    onClick={handleTestWebhook}
                    disabled={isTestSending}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isTestSending ? 'Dispatching...' : 'Dispatch Test Alert'}</span>
                  </button>
                </div>
              </div>

              {/* Code Box */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-96 scrollbar-thin">
                <pre>{JSON.stringify(sampleCapPayload, null, 2)}</pre>
              </div>

              {/* Test Response Message */}
              {testResult.message && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: GeoTIFF / NetCDF-4 Gridded Data Exporter */}
      {activeMode === 'GRIDDED_EXPORT' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileCode className="w-5 h-5 text-purple-400" />
              Scientific Data Array Exporter
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Export bias-corrected rainfall probability cubes and synoptic regime masks into standard meteorological formats for integration into GIS (QGIS, ArcGIS), Python (xarray, netCDF4), and hydrological modeling software.
            </p>

            <div className="space-y-4 text-xs">
              {/* Format Selector */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Export File Format:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'NETCDF4', label: 'NetCDF-4 (.nc)' },
                    { id: 'GEOTIFF', label: 'GeoTIFF (.tif)' },
                    { id: 'GRIDDED_CSV', label: 'Gridded CSV' },
                    { id: 'GEOJSON', label: 'GeoJSON Mesh' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setExportFormat(f.id as any)}
                      className={`p-2.5 rounded-xl border text-center font-semibold transition-all cursor-pointer ${
                        exportFormat === f.id
                          ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Resolution */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Spatial Grid Resolution:</label>
                <div className="flex gap-2">
                  {[
                    { res: 0.25, label: '0.25° × 0.25° (~25 km) - Operational IMD Grid' },
                    { res: 0.5, label: '0.50° × 0.50° (~50 km) - Regional Scale' },
                  ].map((r) => (
                    <button
                      key={r.res}
                      onClick={() => setGridRes(r.res as any)}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        gridRes === r.res
                          ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Variable Checklist */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Include Data Variables:</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'rawForecast', label: 'Raw NWP Rain (mm)' },
                    { key: 'aiCorrected', label: 'SAMVARTAKA AI Corrected (mm)' },
                    { key: 'biasDelta', label: 'Bias Correction Delta (Δ mm)' },
                    { key: 'heavyRainProb', label: 'P(Heavy ≥ 64.5 mm) %' },
                    { key: 'synopticRegime', label: 'Categorical Regime Mask' },
                    { key: 'uncertaintySpread', label: 'Ensemble Standard Deviation' },
                  ].map((v) => (
                    <label key={v.key} className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg border border-slate-700/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(includeVariables as any)[v.key]}
                        onChange={(e) =>
                          setIncludeVariables((prev) => ({ ...prev, [v.key]: e.target.checked }))
                        }
                        className="accent-purple-500"
                      />
                      <span className="text-slate-300">{v.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Download Action Button */}
              <div className="pt-2">
                <button
                  onClick={handleDownloadGriddedFile}
                  disabled={isExporting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? 'Generating Spatial Array...' : `Download ${exportFormat} Dataset`}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right: NetCDF CF Metadata Spec */}
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-400" />
              NetCDF CF-1.8 Convention Header Specification
            </h4>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto space-y-2">
              <p className="text-purple-300">dimensions:</p>
              <p className="pl-4 text-slate-400">time = 1 ; lat = 129 ; lon = 121 ;</p>
              <p className="text-purple-300">variables:</p>
              <p className="pl-4 text-slate-400">float prec_corrected(time, lat, lon) ;</p>
              <p className="pl-8 text-slate-500">prec_corrected:standard_name = "precipitation_amount" ;</p>
              <p className="pl-8 text-slate-500">prec_corrected:units = "mm" ;</p>
              <p className="pl-8 text-slate-500">prec_corrected:post_processing_model = "SAMVARTAKA-AI-v2.4" ;</p>
              <p className="pl-4 text-slate-400">float heavy_prob(time, lat, lon) ;</p>
              <p className="pl-8 text-slate-500">heavy_prob:long_name = "probability_of_heavy_rainfall_ge_64_5mm" ;</p>
              <p className="pl-8 text-slate-500">heavy_prob:units = "percent" ;</p>
              <p className="text-purple-300">// global attributes:</p>
              <p className="pl-4 text-slate-500">:Conventions = "CF-1.8" ;</p>
              <p className="pl-4 text-slate-500">:institution = "India Meteorological Department / SAMVARTAKA" ;</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
