import React, { useState } from 'react';
import {
  HelpCircle,
  BookOpen,
  Search,
  Activity,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Compass,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Gauge,
  Info,
  Thermometer,
  CloudRain,
  Wind,
  Droplets,
} from 'lucide-react';

interface GlossaryTerm {
  term: string;
  category: 'Meteorology' | 'AI & Machine Learning' | 'Statistical Metrics' | 'Platform Workflow';
  pronunciation?: string;
  simpleExplanation: string;
  technicalDetails: string;
  howItWorksInApp: string;
  formulaOrExample?: string;
  icon?: string;
}

const GLOSSARY_TERMS: GlossaryTerm[] = [
  // Meteorology & Physics Terms
  {
    term: 'NWP (Numerical Weather Prediction)',
    category: 'Meteorology',
    simpleExplanation:
      'Computer supercomputers solving massive mathematical physics equations of fluid dynamics and thermodynamics to forecast the weather days in advance.',
    technicalDetails:
      'NWP models (like IMD GFS, NCMRWF Unified Model, or ECMWF IFS) divide the atmosphere into 3D grid cells (e.g. 12km or 4km). Physical phenomena smaller than the grid box (like thunderclouds and localized convective downpours) cannot be resolved directly and must be approximated using parameterization schemes.',
    howItWorksInApp:
      'The raw forecast column ("Simulated Raw NWP") represents this unadjusted physics model output before any machine learning calibration.',
    formulaOrExample: 'Examples: IMD GFS, NCMRWF NCUM, ECMWF High-Resolution IFS',
    icon: '🌐',
  },
  {
    term: 'False Drizzle Bias ("Light Rain Over-prediction")',
    category: 'Meteorology',
    simpleExplanation:
      'A very common computer model bug where it predicts light, annoying rain (2 to 5 mm) almost every day, even when the sky is completely dry.',
    technicalDetails:
      'In tropical monsoon regimes, coarse grid parameterizations trigger moist convection too easily at high relative humidity. Consequently, the raw model continuously generates low-intensity rain over widespread areas, diluting real dry spells.',
    howItWorksInApp:
      'The platform’s specialized Zero-Rain Gate identifies dry boundary layers and suppresses these false alarms down to 0.0 mm.',
    formulaOrExample: 'Raw NWP: 4.5 mm  →  AI Post-Processor: 0.0 mm  (Observed: 0.0 mm)',
    icon: '🌧️',
  },
  {
    term: 'Convective Under-Prediction (Extreme Peak Smoothing)',
    category: 'Meteorology',
    simpleExplanation:
      'When an intense storm dumps 100+ mm of rain causing sudden city floods, but the computer model only guessed 35 or 45 mm.',
    technicalDetails:
      'Because NWP averages rainfall over an entire grid cell (e.g., 12 km × 12 km), intense localized mesoscale convective storms (such as Western Ghats orographic surges or cloudbursts) get artificially spread out and flattened across the entire box.',
    howItWorksInApp:
      'When the ML classifier diagnoses the Heavy/Extreme regime via barometric drop and high shear, it applies a convective multiplier to restore peak downpour intensities.',
    formulaOrExample: 'Raw NWP: 42 mm  →  AI Post-Processor: 118 mm  (Observed: 125 mm)',
    icon: '⚡',
  },
  {
    term: '850 hPa Relative Humidity (RH)',
    category: 'Meteorology',
    simpleExplanation:
      'How saturated with water moisture the air is at about 1.5 kilometers (5,000 feet) above ground level.',
    technicalDetails:
      '850 hectopascals (hPa) corresponds to the top of the planetary boundary layer. During the monsoon, high 850hPa RH (>85%) indicates strong moisture transport from the Arabian Sea or Bay of Bengal capable of sustaining deep rain clouds.',
    howItWorksInApp:
      'Used as a primary predictor in our decision trees to differentiate between real precipitation and false drizzle.',
    formulaOrExample: 'Normal: 60-70% • Monsoonal Surge: 88-98%',
    icon: '💧',
  },
  {
    term: 'Surface Pressure Anomaly (ΔP)',
    category: 'Meteorology',
    simpleExplanation:
      'How much lower the barometric air pressure is compared to normal. A sudden drop signals approaching storms or depressions.',
    technicalDetails:
      'Low barometric pressure triggers horizontal convergence and vertical air ascent. Monsoonal depressions typically feature surface pressures dropping 4 to 12 hPa below seasonal normals (e.g., from 1008 hPa down to 996 hPa).',
    howItWorksInApp:
      'The simulator tracks barometric pressure to activate the "Depression Corridor" or "Convective Surge" model branches.',
    formulaOrExample: 'Low Pressure Center < 1000 hPa',
    icon: '📉',
  },
  {
    term: 'IMD Rainfall Threshold Standards',
    category: 'Meteorology',
    simpleExplanation:
      'The official classification rules created by the India Meteorological Department to categorize 24-hour rainfall amounts.',
    technicalDetails:
      'IMD defines four primary operational categories: Dry (< 2.5 mm), Light Rain (2.5 – 15.5 mm), Moderate Rain (15.6 – 64.4 mm), and Heavy / Extreme (≥ 64.5 mm, with Very Heavy at ≥ 115.6 mm and Extremely Heavy at ≥ 204.5 mm).',
    howItWorksInApp:
      'All regime breakdowns, contingency matrices, and alert cards in this platform follow these official IMD brackets.',
    formulaOrExample: 'Dry (<2.5mm) | Light (2.5-15.5mm) | Moderate (15.6-64.4mm) | Heavy (≥64.5mm)',
    icon: '📏',
  },
  {
    term: 'Forecast Lead Time (Day +1, Day +2, Day +3)',
    category: 'Meteorology',
    simpleExplanation:
      'How many days into the future the weather forecast is looking (Day +1 = tomorrow, Day +2 = day after tomorrow, Day +3 = 3 days out).',
    technicalDetails:
      'Forecast uncertainty compounds non-linearly with longer lead times due to chaotic atmospheric dynamics. Day +1 forecasts are generally most accurate, while Day +3 forecasts exhibit greater dispersion and phase errors in trough position.',
    howItWorksInApp:
      'The toolbar lets you isolate or compare performance at Day +1 (24h), Day +2 (48h), and Day +3 (72h) lead intervals.',
    formulaOrExample: 'Lead +1 (24h) | Lead +2 (48h) | Lead +3 (72h)',
    icon: '⏱️',
  },

  // AI & ML Terms
  {
    term: 'Regime-Aware Post-Processing',
    category: 'AI & Machine Learning',
    simpleExplanation:
      'Instead of using one single equation for all types of weather, the AI first diagnoses what kind of weather day it is (sunny, gentle rain, or violent storm), and then picks a tailor-made model for that specific situation.',
    technicalDetails:
      'Atmospheric rainfall error distributions are bimodal and non-linear. A single global equation creates compromise errors. Regime-aware modeling uses a two-stage architecture: Stage 1 classifies the active synoptic regime; Stage 2 routes the prediction through specialized, regime-conditioned regressors.',
    howItWorksInApp:
      'Visible in the architecture diagram and live in the predictor sandbox, where changing weather variables routes computation through different specialized model branches.',
    formulaOrExample: 'Stage 1: Classify Regime → Stage 2: Execute Regime-Specific Branch',
    icon: '🧠',
  },
  {
    term: 'Zero-Rain Gate',
    category: 'AI & Machine Learning',
    simpleExplanation:
      'A smart electronic checkpoint that stops false drizzle in its tracks and forces the forecast to 0.0 mm if the air is too dry to support rain.',
    technicalDetails:
      'A specialized binary decision boundary trained to detect sub-saturation in the planetary boundary layer. If moisture fluxes and pressure gradients fail to meet convective trigger criteria, it overrides positive NWP values with zero.',
    howItWorksInApp:
      'Under the "Dry" regime, the Zero-Rain Gate eliminates over 88% of false rain alarms.',
    formulaOrExample: 'if (RH < 72% and Raw_Rain < 5.0mm) => Output = 0.0 mm',
    icon: '🛡️',
  },
  {
    term: 'Global Linear Bias Correction (Baseline 2)',
    category: 'AI & Machine Learning',
    simpleExplanation:
      'The traditional statistical method of multiplying the whole forecast by one fixed number and adding an offset (y = a*x + b).',
    technicalDetails:
      'A single linear transformation: y_corrected = α · y_raw + β. While simple, it fails catastrophically for monsoons: if tuned to eliminate false drizzle, it severely dampens extreme floods; if tuned to catch floods, false drizzle skyrockets.',
    howItWorksInApp:
      'Included across all metric tables and charts as "Baseline 2 (Linear Correction)" so you can verify how much better our regime-aware AI performs.',
    formulaOrExample: 'y_baseline = 0.88 * y_raw + 1.25',
    icon: '📐',
  },
  {
    term: 'Strict Temporal Train/Test Split (Leakage Prevention)',
    category: 'AI & Machine Learning',
    simpleExplanation:
      'Making sure the AI never cheats by looking at future data. It is only taught using older monsoon months, and tested on completely unseen future months.',
    technicalDetails:
      'Monsoon weather has strong memory (temporal auto-correlation lasting 5 to 20 days). Randomly splitting days into train/test sets causes "data leakage", giving artificially high, fake accuracy scores. A strict chronological split guarantees real-world performance.',
    howItWorksInApp:
      'Our models are trained strictly on earlier monsoonal dates and validated on completely unseen future seasons (2024 and 2025).',
    formulaOrExample: 'Train on historical periods → Test strictly on future seasons',
    icon: '🔒',
  },

  // Statistical Metrics
  {
    term: 'MAE (Mean Absolute Error)',
    category: 'Statistical Metrics',
    simpleExplanation:
      'The average number of millimeters that the forecast was off from the actual recorded rainfall. Lower is better!',
    technicalDetails:
      'MAE measures the average magnitude of absolute errors between predicted (P) and observed (O) values without considering their direction: MAE = (1/n) * Σ |P_i - O_i|.',
    howItWorksInApp:
      'Highlighted on the top KPI card. Our AI reduces raw NWP MAE from ~11.8 mm down to ~6.4 mm (a ~45% improvement!).',
    formulaOrExample: 'MAE = (1/n) · Σ |y_pred - y_true|',
    icon: '🎯',
  },
  {
    term: 'RMSE (Root Mean Square Error)',
    category: 'Statistical Metrics',
    simpleExplanation:
      'Similar to MAE, but heavily penalizes big, dangerous mistakes. Lower is better!',
    technicalDetails:
      'RMSE squares each error before averaging, then takes the square root: RMSE = sqrt((1/n) * Σ (P_i - O_i)^2). Because errors are squared, rare large misses (e.g., missing a 100mm cloudburst) penalize RMSE far more severely than MAE.',
    howItWorksInApp:
      'Displayed in the metric summary table to show resilience against dangerous catastrophic forecast outliers.',
    formulaOrExample: 'RMSE = √[ (1/n) · Σ (y_pred - y_true)² ]',
    icon: '📊',
  },
  {
    term: 'Mean Bias (mm)',
    category: 'Statistical Metrics',
    simpleExplanation:
      'Whether a model tends to consistently guess too much rain (positive bias, e.g. +3.2 mm) or too little rain (negative bias, e.g. -2.1 mm). Zero is perfect!',
    technicalDetails:
      'Mean Bias = (1/n) * Σ (P_i - O_i). A positive value indicates systematic over-forecasting (wet bias), while a negative value indicates persistent under-forecasting (dry bias).',
    howItWorksInApp:
      'Raw NWP has a strong positive bias of +3.4 mm due to drizzle bugs; our AI reduces it to near zero (+0.3 mm).',
    formulaOrExample: 'Bias = (1/n) · Σ (y_pred - y_true)',
    icon: '⚖️',
  },
  {
    term: 'Critical Success Index (CSI / Threat Score)',
    category: 'Statistical Metrics',
    simpleExplanation:
      'A special test score (0 to 1, or 0% to 100%) measuring how accurately the model catches dangerous Heavy Rain storms without crying wolf.',
    technicalDetails:
      'CSI = Hits / (Hits + Misses + False Alarms). It evaluates categorical accuracy for severe events while ignoring correct negative forecasts (dry days where no storm occurred).',
    howItWorksInApp:
      'For Heavy Rain (≥64.5 mm), raw NWP typically achieves a CSI of only ~0.38, whereas our AI model elevates CSI to ~0.62+.',
    formulaOrExample: 'CSI = Hits / (Hits + Misses + False Alarms)',
    icon: '🏆',
  },
  {
    term: 'Pearson Correlation (r)',
    category: 'Statistical Metrics',
    simpleExplanation:
      'Measures how well the ups and downs of the forecast follow the real ups and downs of rainfall. Closer to 1.0 means great synchrony.',
    technicalDetails:
      'Pearson correlation coefficient r quantifies the linear correlation between forecasted and observed rainfall time series, ranging from -1.0 (opposite) to +1.0 (identical variance).',
    howItWorksInApp:
      'Our AI elevates the Pearson correlation from ~0.71 up to ~0.89+ across verified stations.',
    formulaOrExample: 'r = Cov(P, O) / (σ_P · σ_O)',
    icon: '📈',
  },

  // Platform Workflow
  {
    term: 'Synoptic Weather Event Simulator',
    category: 'Platform Workflow',
    simpleExplanation:
      'An interactive 24-hour virtual time machine where you can watch how a storm develops and see the AI adapt its answers in real time.',
    technicalDetails:
      'Simulates consecutive 6-hour atmospheric snapshots (00:00, 06:00, 12:00, 18:00, 24:00 IST) across real monsoonal meteorological scenarios (offshore vortex surge, rain-shadow lee drying, Bay depression, or upper trough confluence).',
    howItWorksInApp:
      'Located inside the "Live Predictor Sandbox" tab. Has play/pause controls, speed adjustments, and both an Animation mode and a Science Dashboard.',
    formulaOrExample: 'Select Scenario → Press "Run Timeline" → Watch Real-time Corrections',
    icon: '🎬',
  },
  {
    term: 'Observatory Station Filters',
    category: 'Platform Workflow',
    simpleExplanation:
      'Select between different weather observatories representing India’s diverse monsoon microclimates.',
    technicalDetails:
      'Covers 4 benchmark IMD observatories: Mumbai Santacruz (coastal orographic surge), Pune Shivajinagar (Western Ghats rain-shadow plateau), Nagpur Sonegaon (central depression corridor), and Delhi Safdarjung (northern plains & trough confluence).',
    howItWorksInApp:
      'Click the Station dropdown in the top toolbar or select cards on the Evaluation Dashboard to focus analytics on a single city.',
    formulaOrExample: 'Mumbai | Pune | Nagpur | Delhi',
    icon: '📍',
  },
];

export const HelpGuideView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);

  const categories = ['ALL', 'Meteorology', 'AI & Machine Learning', 'Statistical Metrics', 'Platform Workflow'];

  const filteredTerms = GLOSSARY_TERMS.filter((t) => {
    const matchesCategory = selectedCategory === 'ALL' || t.category === selectedCategory;
    const matchesSearch =
      t.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.simpleExplanation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.technicalDetails.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.howItWorksInApp.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div id="help-guide-container" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 mt-1">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  Platform Knowledge Base & Glossary
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  User Friendly Guide
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                Comprehensive Explanations of All Terms & System Mechanics
              </h2>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed max-w-3xl">
                Every meteorological concept, machine learning mechanism, and statistical validation metric used across this platform explained in simple, clear language with operational details.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs text-slate-600">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Click any card below to expand in-depth details.</span>
          </div>
        </div>

        {/* Quick How It Works Steps */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">1</span>
              Raw NWP Forecast Ingestion
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Supercomputer models generate grid rainfall, but suffer from false drizzle and smoothed cloudburst peaks.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-purple-50/70 border border-purple-200/80 space-y-1">
            <div className="flex items-center gap-2 font-bold text-purple-900 text-xs">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px]">2</span>
              Dynamic Regime Diagnosis
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Our AI evaluates atmospheric stability (pressure, moisture, wind shear) to identify the true weather regime.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 space-y-1">
            <div className="flex items-center gap-2 font-bold text-emerald-900 text-xs">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">3</span>
              Specialized Branch Calibration
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Targeted model gates eliminate false alarms or amplify convective flood alerts for civic disaster teams.
            </p>
          </div>
        </div>

        {/* ML Methodology Section */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Machine Learning Methodology</h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            SAMVARTAKA employs a robust dual-architecture ensemble to bridge the gap between traditional numerical weather prediction (NWP) and highly localized, non-linear atmospheric phenomena. This ensemble evaluates key meteorological parameters—most notably <strong>Outgoing Longwave Radiation (OLR)</strong> and <strong>Vertical Wind Shear</strong>—to diagnose real-time weather regimes.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Supervised Model */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-3 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center border border-blue-200">
                  <Activity className="w-4 h-4 text-blue-700" />
                </div>
                <div>
                  <div className="text-slate-900 font-bold text-sm">Supervised Classifier (XGBoost)</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Historical Bias Correction</div>
                </div>
              </div>
              <div className="space-y-3 relative z-10 text-xs text-slate-600 leading-relaxed">
                <p>
                  <strong>How it works:</strong> Trained on over 30 years of historical IMD data, this model maps raw NWP errors to specific synoptic setups. It outputs explicit probabilities for known weather regimes (e.g., Active Monsoon Spell vs. Monsoon Break).
                </p>
                <div className="bg-white p-3 rounded border border-slate-200 text-slate-700">
                  <strong>Key Parameters Weighed:</strong>
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li><strong>OLR (Cloud Tops):</strong> Low OLR (&lt; 150 W/m²) heavily weights the probability toward <em>Monsoon Depressions</em>, signaling deep, organized convection blocking terrestrial heat escape.</li>
                    <li><strong>Wind Shear:</strong> High shear (&gt; 25 m/s) combined with low pressure is used as a primary decision node to trigger convective multipliers, anticipating severe localized downpours.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Unsupervised Model */}
            <div className="bg-purple-50/40 border border-purple-100 rounded-xl p-5 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-3 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center border border-purple-200">
                  <Layers className="w-4 h-4 text-purple-700" />
                </div>
                <div>
                  <div className="text-slate-900 font-bold text-sm">Unsupervised Clustering (SOMs)</div>
                  <div className="text-[10px] uppercase tracking-wider text-purple-500 font-semibold">Novel Extreme Detection</div>
                </div>
              </div>
              <div className="space-y-3 relative z-10 text-xs text-slate-600 leading-relaxed">
                <p>
                  <strong>How it works:</strong> Self-Organizing Maps continuously group real-time 3D atmospheric variables into clusters without predefined labels. This is critical for detecting unprecedented extremes (e.g., climate change anomalies) that historical models miss.
                </p>
                <div className="bg-white p-3 rounded border border-purple-100 text-slate-700">
                  <strong>Key Parameters Weighed:</strong>
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li><strong>OLR Divergence:</strong> Tracks rapid changes in OLR gradients across adjacent grid cells. Sudden localized OLR drops alert the model to anomalous, hyper-localized storm clustering.</li>
                    <li><strong>Anomalous Shear Profiles:</strong> Detects when vertical wind shear decouples from typical historical trough patterns, flagging the synoptic state as a "Novel Extreme" rather than forcing it into a known category.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="help-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search any term (e.g., 'NWP', 'MAE', 'Zero-Rain', 'Relative Humidity', 'CSI')..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
            />
          </div>

          {/* Results Count */}
          <span className="text-xs text-slate-500 font-mono self-end sm:self-center shrink-0">
            Showing {filteredTerms.length} of {GLOSSARY_TERMS.length} terms
          </span>
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 mr-1">Categories:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Terms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTerms.map((item) => {
          const isExpanded = expandedTerm === item.term;

          return (
            <div
              key={item.term}
              className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden shadow-xs hover:border-blue-300 ${
                isExpanded ? 'border-blue-500 ring-1 ring-blue-400' : 'border-slate-200'
              }`}
            >
              {/* Card Header / Summary */}
              <button
                onClick={() => setExpandedTerm(isExpanded ? null : item.term)}
                className="w-full text-left p-4.5 flex items-start justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{item.icon || '📌'}</span>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {item.term}
                    </h3>
                  </div>

                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600">
                    {item.category}
                  </span>

                  <p className="text-xs text-slate-700 leading-relaxed mt-1">
                    {item.simpleExplanation}
                  </p>
                </div>

                <div className={`p-1.5 rounded-lg transition-transform ${isExpanded ? 'rotate-90 bg-blue-50 text-blue-600' : 'text-slate-400'}`}>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>

              {/* In-depth Expansion */}
              {isExpanded && (
                <div className="px-4.5 pb-4.5 pt-2 border-t border-slate-100 bg-slate-50/60 space-y-3 text-xs">
                  {/* Technical Background */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      🔬 Technical Details & Physics
                    </span>
                    <p className="text-slate-600 leading-relaxed">
                      {item.technicalDetails}
                    </p>
                  </div>

                  {/* How it Works in the App */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200/80">
                    <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block mb-1">
                      💡 How It Works In This Platform
                    </span>
                    <p className="text-slate-700 leading-relaxed">
                      {item.howItWorksInApp}
                    </p>
                  </div>

                  {/* Formula or Concrete Example */}
                  {item.formulaOrExample && (
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/60 border border-blue-200 font-mono text-[11px] text-blue-900">
                      <span className="text-blue-700 font-semibold">Reference / Formula:</span>
                      <span>{item.formulaOrExample}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Frequently Asked Practical Questions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600" />
          Practical Operational FAQ
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
            <strong className="text-slate-900 block font-semibold">
              Q: What should I look at first if I only have 1 minute?
            </strong>
            <p className="text-slate-600 leading-relaxed">
              Start on the <strong>Evaluation Dashboard</strong> and check the top KPI card (MAE reduction from 11.8 mm to 6.4 mm). Then jump to the <strong>Live Predictor Sandbox</strong> and click &ldquo;Run Timeline&rdquo; on the 24h Simulator to see the AI fix a real storm in real time.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
            <strong className="text-slate-900 block font-semibold">
              Q: Can I use this for my local weather station?
            </strong>
            <p className="text-slate-600 leading-relaxed">
              Yes. The architecture is grid-agnostic. Any station or 0.25° grid coordinate with paired NWP forecasts and surface observations can be plugged directly into this regime-aware post-processor.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
            <strong className="text-slate-900 block font-semibold">
              Q: Why is this better than traditional bias correction?
            </strong>
            <p className="text-slate-600 leading-relaxed">
              Traditional methods use a single global formula (y = a*x + b). If tuned for drizzle, it shrinks real floods. If tuned for floods, false drizzle gets worse. Our regime-aware approach detects the atmospheric physical state first, solving both extremes simultaneously.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
            <strong className="text-slate-900 block font-semibold">
              Q: How do I test custom weather numbers myself?
            </strong>
            <p className="text-slate-600 leading-relaxed">
              Head to the <strong>Live Predictor Sandbox</strong> tab. Under the simulator, you will find interactive sliders for raw forecast rainfall, humidity, barometric pressure, temperature, and wind speed. Adjust any slider to watch live model inference!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
