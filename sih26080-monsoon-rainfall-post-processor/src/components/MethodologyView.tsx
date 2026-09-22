import React from 'react';
import { BookOpen, ShieldCheck, CheckCircle, Database, GitBranch, Cpu, AlertCircle, Layers } from 'lucide-react';

export const MethodologyView: React.FC = () => {
  return (
    <div id="methodology-view-container" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 mt-1">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Scientific Architecture & Formulation
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">
              Physics-Informed Regime-Aware Post-Processing Architecture
            </h2>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              Numerical Weather Prediction (NWP) models operate on discrete grid resolutions (typically 12km to 4km for regional models). Convective clouds that trigger intense Indian monsoon downpours are sub-grid scale, causing models to severely dampen extreme rainfall while generating persistent false drizzle. Our architecture addresses this through regime-conditioned machine learning.
            </p>
          </div>
        </div>
      </div>

      {/* 3 Core Architecture Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Pillar 1 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
            <GitBranch className="w-4 h-4" />
            1. Why Global Bias Correction Fails
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Traditional bias correction uses a single global linear transform:
            <code className="block my-2 p-2 bg-slate-50 border border-slate-200 rounded font-mono text-slate-800">
              y_corrected = α · y_raw + β
            </code>
            If α and β are tuned to fix light drizzle, they scale down extreme floods. If tuned for floods, false drizzle worsens. The atmospheric error distribution is inherently bimodal and non-linear.
          </p>
        </div>

        {/* Pillar 2 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
            <Cpu className="w-4 h-4" />
            2. Regime-Conditioned ML Design
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Our pipeline first diagnoses the active synoptic regime using atmospheric state vectors (RH, pressure anomaly, wind shear). Then, specialized model branches execute:
            <span className="block my-2 p-2 bg-slate-50 border border-slate-200 rounded font-mono text-[11px] text-slate-800">
              Dry → Zero-Rain Gate<br />
              Moderate → Trough Calibrator<br />
              Heavy → Convective Multiplier
            </span>
          </p>
        </div>

        {/* Pillar 3 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
            <ShieldCheck className="w-4 h-4" />
            3. Strict Leakage Prevention
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Monsoon precipitation features strong temporal auto-correlation (monsoon intra-seasonal oscillations, active-break cycles). Random K-fold cross-validation causes artificial score inflation. We enforce a <strong>strict temporal train-validation-test split</strong> across consecutive monsoon seasons.
          </p>
        </div>
      </div>

      {/* Official IMD Regime Criteria Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-600" />
          Official India Meteorological Department (IMD) Rainfall Standard
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 text-[11px]">
              <tr>
                <th className="px-4 py-2.5 font-semibold">IMD Classification</th>
                <th className="px-4 py-2.5 font-semibold">24h Rainfall Amount</th>
                <th className="px-4 py-2.5 font-semibold">Typical NWP Model Failure</th>
                <th className="px-4 py-2.5 font-semibold">Regime-Aware AI Correction Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              <tr>
                <td className="px-4 py-2.5 text-amber-700 font-bold">Dry / No Rain</td>
                <td className="px-4 py-2.5 font-mono">&lt; 2.5 mm</td>
                <td className="px-4 py-2.5 text-slate-600">
                  Persistent false drizzle (predicts 3–6 mm during dry spells)
                </td>
                <td className="px-4 py-2.5 text-emerald-700 font-semibold">
                  Zero-rain hard thresholding filter via boundary-layer RH
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-sky-700 font-bold">Light Rain</td>
                <td className="px-4 py-2.5 font-mono">2.5 to 15.5 mm</td>
                <td className="px-4 py-2.5 text-slate-600">
                  Slight positive bias (+15% to +25%)
                </td>
                <td className="px-4 py-2.5 text-emerald-700 font-semibold">
                  Calibrated linear shrinkage factor
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-blue-700 font-bold">Moderate Rain</td>
                <td className="px-4 py-2.5 font-mono">15.6 to 64.4 mm</td>
                <td className="px-4 py-2.5 text-slate-600">
                  Moderate variance depending on depression trough axis
                </td>
                <td className="px-4 py-2.5 text-emerald-700 font-semibold">
                  Barometric pressure anomaly & wind shear coupling
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-purple-700 font-bold">Heavy / Extreme</td>
                <td className="px-4 py-2.5 font-mono">≥ 64.5 mm (up to 200+ mm)</td>
                <td className="px-4 py-2.5 text-rose-600 font-semibold">
                  Severe under-prediction (NWP predicts 35-50 mm for 120 mm deluge)
                </td>
                <td className="px-4 py-2.5 text-purple-700 font-semibold">
                  Convective multiplier restoring peak localized intensities
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Operational Workflow Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          Operational Pipeline Integration Workflow
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
            <strong className="text-slate-900 block font-semibold">Step 1: Synoptic State Ingestion</strong>
            <p className="leading-relaxed">
              After the 00Z / 12Z operational NWP run completes, grid-point total precipitation, 850hPa moisture, pressure anomaly, and 10m wind fields are ingested into memory.
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
            <strong className="text-slate-900 block font-semibold">Step 2: Dynamic Regime Diagnosis</strong>
            <p className="leading-relaxed">
              The regime classifier computes the atmospheric stability indices and dispatches one of 4 specialized model branches (Zero-rain, Light, Moderate, or Heavy).
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
            <strong className="text-slate-900 block font-semibold">Step 3: Dissemination & Alerting</strong>
            <p className="leading-relaxed">
              Sub-second inference executes per station or 0.25° grid box, producing calibrated flood alerts and reservoir runoff guidance for emergency disaster response.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
