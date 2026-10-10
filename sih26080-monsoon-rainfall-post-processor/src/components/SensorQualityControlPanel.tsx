import React, { useState, useMemo } from 'react';
import { MET_STATIONS } from '../data/monsoonDataset';
import { runNetworkQualityControl, NetworkQcSummary, QcValidatedTelemetry, QcFlag } from '../ml/sensorQualityControl';
import { ShieldCheck, AlertTriangle, Radio, RefreshCw, CheckCircle2, XCircle, Activity, Info, Sparkles } from 'lucide-react';

interface SensorQualityControlPanelProps {
  onSelectStation?: (stationId: string) => void;
  selectedStationId?: string;
  className?: string;
}

export const SensorQualityControlPanel: React.FC<SensorQualityControlPanelProps> = ({
  onSelectStation,
  selectedStationId = 'BOM_SANTACRUZ',
  className = '',
}) => {
  // Telemetry stream state with option to inject anomalies
  const [injectedAnomalies, setInjectedAnomalies] = useState<Record<string, number>>({});
  const [filterMode, setFilterMode] = useState<'ALL' | 'FLAGGED' | 'VALID' | 'IMPUTED'>('ALL');
  const [activeStationId, setActiveStationId] = useState<string>(selectedStationId);

  // Generate baseline telemetry
  const baseTelemetry = useMemo(() => {
    const stream: Record<string, number> = {};
    for (const s of MET_STATIONS) {
      stream[s.id] = Math.round((s.avgMonsoonRainMm / 120) * 1.15 * 10) / 10;
    }
    return stream;
  }, []);

  // Merge base with injected anomalies
  const currentTelemetry = useMemo(() => {
    return { ...baseTelemetry, ...injectedAnomalies };
  }, [baseTelemetry, injectedAnomalies]);

  // Run the QC evaluation
  const qcSummary: NetworkQcSummary = useMemo(() => {
    return runNetworkQualityControl(currentTelemetry, 24);
  }, [currentTelemetry]);

  const activeRecord: QcValidatedTelemetry | undefined = qcSummary.validatedTelemetry[activeStationId];
  const activeStation = MET_STATIONS.find((s) => s.id === activeStationId) || MET_STATIONS[0];

  const handleInjectSpike = () => {
    setInjectedAnomalies((prev) => ({
      ...prev,
      [activeStationId]: 165.0, // extreme 165 mm unphysical jump
    }));
  };

  const handleInjectStuckGauge = () => {
    setInjectedAnomalies((prev) => ({
      ...prev,
      [activeStationId]: 0.0, // stuck float zero reading
    }));
  };

  const handleResetTelemetry = () => {
    setInjectedAnomalies({});
  };

  const getFlagColor = (flag: QcFlag) => {
    switch (flag) {
      case 'VALID':
        return 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300';
      case 'UNPHYSICAL_CLOUDBURST_SPIKE':
        return 'bg-rose-950/60 border-rose-500/50 text-rose-300';
      case 'STUCK_GAUGE_PERSISTENCE':
        return 'bg-amber-950/60 border-amber-500/50 text-amber-300';
      case 'SUSPICIOUS_SPATIAL_ANOMALY':
        return 'bg-amber-950/60 border-amber-500/50 text-amber-300';
      case 'OROGRAPHIC_OUTLIER_CONFIRMED':
        return 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300';
      case 'IMPUTED_BUDDY_ESTIMATE':
        return 'bg-purple-950/60 border-purple-500/50 text-purple-300';
      default:
        return 'bg-slate-800 border-slate-600 text-slate-300';
    }
  };

  // Filter stations based on selection
  const filteredStationList = useMemo(() => {
    return MET_STATIONS.filter((s) => {
      const val = qcSummary.validatedTelemetry[s.id];
      if (!val) return true;
      if (filterMode === 'FLAGGED') return !val.isPassed;
      if (filterMode === 'VALID') return val.qcFlag === 'VALID';
      if (filterMode === 'IMPUTED') return val.qcFlag === 'IMPUTED_BUDDY_ESTIMATE';
      return true;
    });
  }, [qcSummary, filterMode]);

  return (
    <div className={`bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-2xl text-slate-100 ${className}`}>
      {/* Header with Network Reliability Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold tracking-tight text-white">
                Multi-Sensor Quality Control (QC) & Buddy Check
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                Master Plan 21
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Mahalanobis Distance Outlier Gate ($D_M^2 \lt \chi^2$) with $k=5$ Geodesic Spatial Buddy Validation
            </p>
          </div>
        </div>

        {/* Network Reliability Metric */}
        <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700/60">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Network Health</span>
            <span className="text-base font-mono font-bold text-emerald-400">
              {qcSummary.networkReliabilityIndex}%
            </span>
          </div>
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/40">
          <span className="text-[10px] text-slate-400 block">Evaluated Stations</span>
          <span className="text-lg font-mono font-bold text-white">{qcSummary.totalStationsEvaluated}</span>
        </div>
        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/40">
          <span className="text-[10px] text-emerald-400 block">Valid Telemetry</span>
          <span className="text-lg font-mono font-bold text-emerald-300">{qcSummary.passedCount}</span>
        </div>
        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/40">
          <span className="text-[10px] text-rose-400 block">Flagged Anomalies</span>
          <span className="text-lg font-mono font-bold text-rose-300">{qcSummary.flaggedCount}</span>
        </div>
        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/40">
          <span className="text-[10px] text-purple-400 block">Buddy Imputations</span>
          <span className="text-lg font-mono font-bold text-purple-300">{qcSummary.imputedCount}</span>
        </div>
      </div>

      {/* Anomaly Stress Test Injection Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs my-4">
        <div className="flex items-center gap-2 text-slate-300">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Simulate Sensor Malfunction on <strong>{activeStation.name}</strong>:</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleInjectSpike}
            className="px-2.5 py-1 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs transition-colors"
          >
            Inject 165mm Cloudburst Spike
          </button>
          <button
            onClick={handleInjectStuckGauge}
            className="px-2.5 py-1 rounded-lg bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 text-xs transition-colors"
          >
            Inject Stuck Float (0mm)
          </button>
          {Object.keys(injectedAnomalies).length > 0 && (
            <button
              onClick={handleResetTelemetry}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-xs transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Station Selector List & Detailed Diagnostic Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        {/* Left Column: Filter Chips & Station List */}
        <div className="lg:col-span-5 space-y-2">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 pb-1">
            {(['ALL', 'FLAGGED', 'VALID', 'IMPUTED'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  filterMode === mode
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
              >
                {mode === 'ALL' ? 'All Stations' : mode}
              </button>
            ))}
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
            {filteredStationList.map((stn) => {
              const res = qcSummary.validatedTelemetry[stn.id];
              const isSelected = stn.id === activeStationId;

              return (
                <div
                  key={stn.id}
                  onClick={() => {
                    setActiveStationId(stn.id);
                    if (onSelectStation) onSelectStation(stn.id);
                  }}
                  className={`p-2.5 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500/60 shadow-md shadow-cyan-950/20'
                      : 'bg-slate-800/40 border-slate-700/40 hover:bg-slate-800/80 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs text-white truncate max-w-[170px]">{stn.name}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${res ? getFlagColor(res.qcFlag) : ''}`}>
                      {res ? res.qcFlag.replace(/_/g, ' ') : 'PENDING'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400 font-mono">
                    <span>Raw: {res ? res.originalRainfallMm : '--'} mm</span>
                    <span className="text-cyan-300">Valid: {res ? res.validatedRainfallMm : '--'} mm</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Station Diagnostics Card */}
        <div className="lg:col-span-7 bg-slate-950/50 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h4 className="font-semibold text-sm text-white">{activeStation.name}</h4>
              <span className="text-xs text-slate-400">{activeStation.subdivision} | Elev: {activeStation.elevationM}m</span>
            </div>
            {activeRecord && (
              <span className={`text-xs px-2.5 py-1 rounded-lg font-mono border ${getFlagColor(activeRecord.qcFlag)}`}>
                {activeRecord.qcFlag.replace(/_/g, ' ')}
              </span>
            )}
          </div>

          {activeRecord ? (
            <div className="mt-3 space-y-3">
              {/* Telemetry Comparison Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Raw Reported Rain</span>
                  <span className="text-base font-mono font-bold text-white">
                    {activeRecord.originalRainfallMm} mm
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-cyan-400 block">QC-Validated Output</span>
                  <span className="text-base font-mono font-bold text-cyan-300">
                    {activeRecord.validatedRainfallMm} mm
                  </span>
                </div>
              </div>

              {/* Statistical QC Gates */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Mahalanobis Distance ($D_M^2$):</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className={activeRecord.mahalanobisDistanceSq > 16.27 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                      {activeRecord.mahalanobisDistanceSq.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500">(Threshold 16.27)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Radio className="w-3.5 h-3.5 text-amber-400" />
                    <span>Spatial Buddy Check $\Delta$:</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className={Math.abs(activeRecord.buddyCheckDeltaMm) > 35 ? 'text-amber-400 font-bold' : 'text-slate-200'}>
                      {activeRecord.buddyCheckDeltaMm > 0 ? `+${activeRecord.buddyCheckDeltaMm}` : activeRecord.buddyCheckDeltaMm} mm
                    </span>
                    <span className="text-[10px] text-slate-500">(k={activeRecord.nearestNeighborsCount} neighbors)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>QC Confidence Score:</span>
                  </div>
                  <span className="font-mono text-emerald-300 font-semibold">
                    {activeRecord.qcConfidenceScore}%
                  </span>
                </div>
              </div>

              {/* Meteorological Rationale */}
              <div className="p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-800/40 text-xs flex items-start gap-2 text-cyan-200">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{activeRecord.rationale}</p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs">
              Select a station to inspect physical sensor validation telemetry
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
