import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { RainfallDataPoint } from '../types';
import { ShieldCheck, Target, Activity, AlertTriangle, Users, Building, TrendingDown } from 'lucide-react';

interface Props {
  dataset: RainfallDataPoint[];
  selectedStationId: string;
}

export const SocioEconomicImpactView: React.FC<Props> = ({ dataset, selectedStationId }) => {
  const stationData = useMemo(() => {
    if (selectedStationId === 'ALL') {
      return dataset.filter(d => d.leadTimeDays === 1); // Simple aggregate
    }
    return dataset.filter(d => d.stationId === selectedStationId && d.leadTimeDays === 1);
  }, [dataset, selectedStationId]);

  const stats = useMemo(() => {
    if (!stationData.length) return null;
    const avgAI = stationData.reduce((acc, curr) => acc + curr.correctedForecastMm, 0) / stationData.length;
    const avgRaw = stationData.reduce((acc, curr) => acc + curr.rawForecastMm, 0) / stationData.length;
    
    // Simulate impact scores
    const infrastructureRisk = Math.min(100, Math.round(avgAI * 1.5));
    const populationAffected = Math.round(avgAI * 12500);
    const economicLoss = Math.round(avgAI * 0.85); // in millions
    const falseAlarmAvoided = Math.round(Math.max(0, avgRaw - avgAI) * 1.2);

    return { avgAI, avgRaw, infrastructureRisk, populationAffected, economicLoss, falseAlarmAvoided };
  }, [stationData]);

  if (!stats) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
        <p className="text-slate-400">No data available for selected criteria to calculate impact.</p>
      </div>
    );
  }

  const riskColor = stats.infrastructureRisk > 75 ? 'text-red-400' : stats.infrastructureRisk > 40 ? 'text-amber-400' : 'text-emerald-400';
  const riskBg = stats.infrastructureRisk > 75 ? 'bg-red-500/10' : stats.infrastructureRisk > 40 ? 'bg-amber-500/10' : 'bg-emerald-500/10';
  const riskBorder = stats.infrastructureRisk > 75 ? 'border-red-500/20' : stats.infrastructureRisk > 40 ? 'border-amber-500/20' : 'border-emerald-500/20';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
          <Building className="w-5 h-5 text-indigo-400" />
          Socio-Economic Impact Analysis
        </h2>
        <p className="text-xs text-slate-400">
          Simulated infrastructure risk and economic exposure based on AI-corrected rainfall intensities.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Risk Level */}
        <div className={`rounded-xl border p-4 ${riskBg} ${riskBorder}`}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className={`w-4 h-4 ${riskColor}`} />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Infrastructure Risk</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black ${riskColor} font-mono tracking-tighter`}>{stats.infrastructureRisk}</span>
            <span className="text-sm text-slate-500 font-medium">/ 100</span>
          </div>
        </div>

        {/* Population Affected */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Est. Population Impacted</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono tracking-tighter">{(stats.populationAffected).toLocaleString()}</span>
          </div>
        </div>

        {/* Economic Loss */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Potential Loss</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-400 font-mono tracking-tighter">₹{stats.economicLoss}</span>
            <span className="text-sm text-slate-500 font-medium">Cr</span>
          </div>
        </div>

        {/* False Alarms Avoided */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <ShieldCheck className="w-16 h-16" />
          </div>
          <div className="flex items-center gap-2 mb-3 relative z-10">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Resource Savings</span>
          </div>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-3xl font-black text-emerald-400 font-mono tracking-tighter">{stats.falseAlarmAvoided}</span>
            <span className="text-sm text-slate-500 font-medium">Actions Avoided</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
