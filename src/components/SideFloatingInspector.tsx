import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Info,
  Activity,
  Layers,
  BarChart3,
  Sliders,
  ToggleLeft,
  Compass,
  Zap,
  HelpCircle,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

export interface ExplanationEntry {
  title: string;
  category: 'GRAPH' | 'TOGGLE' | 'SELECTABLE' | 'HORIZON' | 'ACTION' | 'STATISTIC';
  description: string;
  meteorologicalContext: string;
  interactionHint?: string;
}

// Comprehensive registry of contextual explanations for platform elements
const EXPLANATION_REGISTRY: Record<string, ExplanationEntry> = {
  // --- SCRUBBER & HORIZONS ---
  'spring-temporal-scrubber': {
    title: '120 FPS Spring Temporal Horizon Scrubber',
    category: 'HORIZON',
    description: 'Scrubs through synchronized meteorological forecast lead-times from -3h Doppler radar nowcasts to +120h Day-5 medium-range NWP.',
    meteorologicalContext: 'Employs critically damped harmonic spring physics (ζ = 1.0) to dynamically recalculate downstream boundary conditions, GIS isochrones, and AI quantile adjustments across synoptic assimilation cycles.',
    interactionHint: 'Drag the glowing scrub head or click any circular synoptic node to shift temporal lead.',
  },
  'horizon-node-minus-3': {
    title: 'T-3h Doppler Radar Nowcast Assimilation',
    category: 'HORIZON',
    description: 'Assimilation horizon fusing real-time Indian Doppler Radar Network (DWR) reflectivity with boundary layer wind observations.',
    meteorologicalContext: 'Captures short-lived mesoscale convective complexes and squall lines before synoptic NWP models can initialize them. Confidence: 98%.',
    interactionHint: 'Click to inspect immediate precipitation nowcasting.',
  },
  'horizon-node-0': {
    title: 'T0 Synoptic Analysis (00 UTC / 12 UTC Init)',
    category: 'HORIZON',
    description: 'Operational ground truth initialization baseline derived from IMD radiosonde soundings and surface AWS network.',
    meteorologicalContext: 'Defines initial thermodynamic state vectors (temperature, MSLP, dew point, 850 hPa geopotential height) for numerical integration.',
    interactionHint: 'Click to view the base unprojected observation state.',
  },
  'horizon-node-24': {
    title: 'Day 1 (+24h) Operational NWP Lead',
    category: 'HORIZON',
    description: 'Primary 24-hour deterministic forecast cycle evaluated against morning IMD 24h cumulative rainfall gauges.',
    meteorologicalContext: 'Key operational benchmark for district-level red alerts and municipal flood warnings before nocturnal convection sets in.',
    interactionHint: 'Click to evaluate Day-1 model accuracy and biases.',
  },
  'horizon-node-48': {
    title: 'Day 2 (+48h) Short-Range Synoptic Lead',
    category: 'HORIZON',
    description: '48-hour forward projection tracking monsoon depressions and offshore trough shear zones.',
    meteorologicalContext: 'Evaluates NWP convective parameterization stability; AI post-processor applies moisture flux divergence corrections.',
    interactionHint: 'Click to evaluate 48-hour forward propagation.',
  },
  'horizon-node-72': {
    title: 'Day 3 (+72h) Medium-Range Ensemble Lead',
    category: 'HORIZON',
    description: '72-hour medium-range window capturing synoptic low-pressure system genesis and peninsular transitions.',
    meteorologicalContext: 'Raw NWP errors compound exponentially beyond 48 hours; SAMVARTAKA AI quantile mapping restores extreme tails (Q90) using 1901 climatology priors.',
    interactionHint: 'Click to inspect medium-range ensemble quantile distribution.',
  },
  'horizon-node-120': {
    title: 'Day 5 (+120h) Extended Horizon Lead',
    category: 'HORIZON',
    description: 'Extended 5-day synoptic regime outlook for reservoir management and disaster preparedness.',
    meteorologicalContext: 'Captures broad monsoon active/break spell transitions driven by the Madden-Julian Oscillation (MJO) and Boreal Summer Intra-Seasonal Oscillation (BSISO).',
    interactionHint: 'Click to view extended climatological trend.',
  },

  // --- TIME SERIES GRAPHS & CONTROLS ---
  'recharts-surface': {
    title: 'Monsoon Rainfall Time-Series Visualizer',
    category: 'GRAPH',
    description: 'High-fidelity dual-axis meteorological time-series showing ground truth observations, raw NWP forecasts, and AI regime corrections.',
    meteorologicalContext: 'Visualizes daily precipitation amounts (mm) across the active June–September southwest monsoon season with overlaid statistical moving averages and anomaly markers.',
    interactionHint: 'Hover over data points for detailed hydro-meteorological diagnostics; use mouse wheel with Ctrl or drag toolbar buttons to pan/zoom.',
  },
  'toggle-imd-line-btn': {
    title: 'IMD Heavy Rainfall Threshold (≥64.5 mm/day)',
    category: 'TOGGLE',
    description: 'Displays the official India Meteorological Department statutory threshold line defining Heavy Rainfall.',
    meteorologicalContext: 'Daily accumulations exceeding 64.5 mm trigger administrative municipal alerts, localized waterlogging, and riverine basin watch protocols.',
    interactionHint: 'Click to toggle the yellow dashed IMD reference line.',
  },
  'toggle-severe-alerts-btn': {
    title: 'Severe Rainfall Spells Highlight Layer',
    category: 'TOGGLE',
    description: 'Highlights critical deluge episodes where daily precipitation exceeded safe drainage capacities.',
    meteorologicalContext: 'Marks atmospheric river landfalls, offshore trough vortex surges, and orographic cloudburst events with translucent warning bands.',
    interactionHint: 'Click to illuminate severe rainfall episodes across the season.',
  },
  'toolbar-d3-trend-btn': {
    title: 'D3 Linear Regression Trend Line',
    category: 'TOGGLE',
    description: 'Fits a robust Ordinary Least Squares (OLS) linear trend across AI-corrected rainfall time-series.',
    meteorologicalContext: 'Removes diurnal convective noise to isolate intra-seasonal synoptic monsoon progression (e.g. onset surge vs mid-season break spell vs withdrawal).',
    interactionHint: 'Click to toggle D3 linear regression trend analysis.',
  },
  'toggle-confidence-interval-btn': {
    title: 'D3 90% Statistical Confidence Band (±1.645σ)',
    category: 'TOGGLE',
    description: 'Shaded uncertainty envelope calculated from empirical residual standard deviation around the linear trend.',
    meteorologicalContext: 'Quantifies atmospheric unpredictability and ensemble spread; wider bands indicate unstable monsoon trough dynamics.',
    interactionHint: 'Click to show/hide the shaded confidence envelope.',
  },
  'toggle-global-crosshair-btn': {
    title: 'D3 Global Surface Crosshair Guide',
    category: 'TOGGLE',
    description: 'Precision dual-axis crosshair aligning hover coordinates with date timesteps and millimeter rainfall scales.',
    meteorologicalContext: 'Allows forecasters to pinpoint exact dates and variance deltas between NWP output and ground station readings.',
    interactionHint: 'Click to toggle high-precision coordinate tracking crosshairs.',
  },
  'toggle-quartile-alerts-btn': {
    title: 'Historical Quartile Alerts (Q75 & Q90)',
    category: 'TOGGLE',
    description: 'Dynamic reference lines indicating station-specific 75th percentile (Heavy) and 90th percentile (Extreme) rainfall thresholds.',
    meteorologicalContext: 'Computed non-parametrically across the station climatology; flags localized micro-climate anomalies relative to historical station baselines.',
    interactionHint: 'Click to display Q75 (amber) and Q90 (crimson) percentile lines.',
  },
  'toggle-d3-anomalies-btn': {
    title: 'D3 Anomaly Markers & Z-Score Detection',
    category: 'TOGGLE',
    description: 'Pulsing animated SVG markers highlighting significant deviation surges and precipitation deficits.',
    meteorologicalContext: 'Flags timesteps where absolute deviation from the moving average exceeds the configured standard deviation threshold (1.0σ to 2.0σ).',
    interactionHint: 'Click to toggle animated anomaly surge/deficit rings.',
  },
  'data-rep-raw-btn': {
    title: 'Raw Daily Observations Representation',
    category: 'SELECTABLE',
    description: 'Displays discrete 24-hour cumulative rainfall observations recorded at 08:30 IST daily.',
    meteorologicalContext: 'Preserves peak cloudburst intensity and sudden convective spikes without smoothing.',
    interactionHint: 'Click to inspect raw daily gauge readings.',
  },
  'data-rep-weekly-btn': {
    title: '7-Day Weekly Moving Average Representation',
    category: 'SELECTABLE',
    description: 'Converts daily series into a rolling 7-day mean to extract background synoptic climate signals.',
    meteorologicalContext: 'Filters out diurnal mesoscale convective noise to expose active vs break monsoon phase transitions.',
    interactionHint: 'Click to smooth daily fluctuations into climate trends.',
  },

  // --- MAP & GIS LAYERS ---
  'gis-live-map': {
    title: 'Interactive GIS Geospatial Observatory',
    category: 'GRAPH',
    description: 'Multi-layer GIS map rendering all 40 primary IMD meteorological stations with live rainfall regimes.',
    meteorologicalContext: 'Pins are color-coded by IMD precipitation regime: Dry (<2.5mm), Light (2.5–15.5mm), Moderate (15.6–64.4mm), and Heavy/Extreme (≥64.5mm).',
    interactionHint: 'Click any observatory pin to switch the active station; use mouse wheel to zoom map.',
  },
  'gis-layer-radar': {
    title: 'Radar Reflectivity (dBZ) Geospatial Layer',
    category: 'TOGGLE',
    description: 'Simulated Doppler weather radar composite mosaic covering peninsular and northern India.',
    meteorologicalContext: 'Displays radar echo intensities from 15 dBZ (drizzle) to 55+ dBZ (severe hail/intense convective cores).',
    interactionHint: 'Click to toggle Doppler radar reflectivity overlay.',
  },
  'gis-layer-wind': {
    title: 'RK2 Lagrangian Wind Vector Streamlines',
    category: 'TOGGLE',
    description: 'Runge-Kutta 2nd-order particle advection field illustrating 850 hPa monsoon winds.',
    meteorologicalContext: 'Depicts southwesterly Arabian Sea moisture transport and Bay of Bengal cyclonic curved streamlines feeding the monsoon trough.',
    interactionHint: 'Click to toggle animated wind streamline particles.',
  },
  'gis-layer-topography': {
    title: 'Digital Elevation Model (DEM) & Orographic Contours',
    category: 'TOGGLE',
    description: 'Topographic contour shading visualizing elevation gradients across the Western Ghats and Himalayas.',
    meteorologicalContext: 'Crucial for assessing orographic rainfall enhancement on windward slopes and rain-shadow deficits on leeward plateaus.',
    interactionHint: 'Click to toggle elevation contour shading.',
  },

  // --- STATISTICAL & VERIFICATION TOOLS ---
  'taylor-diagram': {
    title: 'Taylor Diagram Skill Verification Space',
    category: 'GRAPH',
    description: 'Synthesizes Model Correlation (r), Centered RMSE (E\'), and Normalized Standard Deviation (σ) into a single 2D polar plot.',
    meteorologicalContext: 'Standard WMO verification metric showing how closely post-processed AI and NWP models match real ground truth observations.',
    interactionHint: 'Inspect distance of markers to the REF star; closer distance represents superior forecast skill.',
  },
  'synoptic-radar-canvas': {
    title: 'Synoptic Doppler Radar Scope & Beam Azimuth',
    category: 'GRAPH',
    description: 'Circular radar polar scan displaying calibrated reflectivity returns (dBZ) and storm echo centroids.',
    meteorologicalContext: 'Employs constant altitude plan position indicator (CAPPI) processing at 1.5 km to detect organized mesoscale convective systems.',
    interactionHint: 'Hover or click to view radial distance and peak convective reflectivity.',
  },

  // --- GLOBAL BUTTONS & DROPDOWNS ---
  'station-selector-trigger': {
    title: 'Observatory Station Selector (/ or Ctrl+K)',
    category: 'SELECTABLE',
    description: 'Searchable palette of all 40 IMD meteorological observatories spanning India\'s diverse climate zones.',
    meteorologicalContext: 'Allows instantaneous switching across Western Ghats, Gangetic Plains, Brahmaputra Basin, Thar Desert, and Coastal Corridors.',
    interactionHint: 'Click or press "/" to search and filter stations.',
  },
  'model-version-selector': {
    title: 'Post-Processing AI Architecture Selector',
    category: 'SELECTABLE',
    description: 'Selects the active AI machine learning correction model applied to the raw NWP forecast.',
    meteorologicalContext: 'Options range from v1.0 Linear Baseline, v2.0 Regime Smoother, to v3.2 Trained Quantile Regression Ensemble with 1901 Climatology Priors.',
    interactionHint: 'Select architecture to observe real-time skill score shifts.',
  },
  'season-year-selector': {
    title: 'Monsoon Season Filter (2023–2025)',
    category: 'SELECTABLE',
    description: 'Filters datasets by historical or operational monsoon season year.',
    meteorologicalContext: 'Compares El Niño influenced years (2023), record extreme deluge seasons (2024), and operational 2025 projections.',
    interactionHint: 'Select year to load corresponding climatological dataset.',
  },
  'export-data-btn': {
    title: 'Meteorological Data & Report Exporter',
    category: 'ACTION',
    description: 'Exports certified CSV datasets, JSON machine-readable feeds, and formal IMD Meteorological Dossier PDFs.',
    meteorologicalContext: 'Packages all daily observations, NWP outputs, AI predictions, and verification skill gains for operational briefing.',
    interactionHint: 'Click to select export format (CSV, JSON, Dossier).',
  },
  'btn-master-plans': {
    title: 'Architectural Master Plans Studio',
    category: 'ACTION',
    description: 'Opens the comprehensive blueprint studio documenting system architecture, mathematical formulations, and roadmap.',
    meteorologicalContext: 'Presents detailed architectural plans for real-time telemetry assimilation, AI neural network layers, and GIS physics.',
    interactionHint: 'Click to review platform master plans and specifications.',
  },
  'btn-3d-simulator': {
    title: '3D Ground Digital Twin Simulator (On-Demand)',
    category: 'ACTION',
    description: 'Launches full-screen Three.js WebGL terrain simulator visualizing orographic cloudbursts and water flows.',
    meteorologicalContext: 'Simulates physics-based droplet momentum, Western Ghats canyon wind shear, and terrain inundation modeling.',
    interactionHint: 'Click to explore interactive 3D digital twin.',
  },
};

interface HoverInfo {
  entry: ExplanationEntry;
  targetRect: DOMRect;
  dockSide: 'left' | 'right';
}

export const SideFloatingInspector: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = localStorage.getItem('SAMVARTAKA_SIDE_INSPECTOR_ENABLED');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentTargetRef = useRef<HTMLElement | null>(null);

  // Toggle state persistence
  const toggleInspector = useCallback(() => {
    setIsEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('SAMVARTAKA_SIDE_INSPECTOR_ENABLED', String(next));
      } catch {
        // ignore
      }
      return next;
    });
    setHoverInfo(null);
  }, []);

  // Keyboard shortcut (Alt + E or Ctrl + Shift + E)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.key.toLowerCase() === 'e') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'e')) {
        e.preventDefault();
        toggleInspector();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleInspector]);

  // Resolves element explanation from registry, attributes, or semantic tags
  const resolveExplanation = (el: HTMLElement): ExplanationEntry | null => {
    // 1. Direct explicit data-explain attributes
    if (el.dataset.explainTitle && el.dataset.explainDesc) {
      return {
        title: el.dataset.explainTitle,
        category: (el.dataset.explainCat as any) || 'SELECTABLE',
        description: el.dataset.explainDesc,
        meteorologicalContext: el.dataset.explainContext || 'Contextual meteorological parameter driving platform post-processing.',
        interactionHint: el.dataset.explainHint || 'Click or interact to update state.',
      };
    }

    // 2. ID matching in registry
    if (el.id && EXPLANATION_REGISTRY[el.id]) {
      return EXPLANATION_REGISTRY[el.id];
    }

    // 3. Class or Role matching
    for (const [key, val] of Object.entries(EXPLANATION_REGISTRY)) {
      if (el.classList.contains(key) || el.closest(`.${key}`) || el.closest(`#${key}`)) {
        return val;
      }
    }

    // 4. Graph canvas or chart area detection
    if (
      el.tagName.toLowerCase() === 'svg' ||
      el.closest('svg.recharts-surface') ||
      el.closest('.recharts-wrapper') ||
      el.classList.contains('recharts-surface')
    ) {
      return EXPLANATION_REGISTRY['recharts-surface'];
    }

    if (el.closest('.taylor-diagram') || el.classList.contains('taylor-diagram')) {
      return EXPLANATION_REGISTRY['taylor-diagram'];
    }

    if (el.closest('.radar-canvas-container') || el.tagName.toLowerCase() === 'canvas') {
      return EXPLANATION_REGISTRY['synoptic-radar-canvas'];
    }

    if (el.closest('.leaflet-container') || el.classList.contains('leaflet-container')) {
      return EXPLANATION_REGISTRY['gis-live-map'];
    }

    // 5. Buttons, toggles, and selectables heuristic
    const isButton = el.tagName.toLowerCase() === 'button' || el.getAttribute('role') === 'button';
    const isSelect = el.tagName.toLowerCase() === 'select';
    const isInput = el.tagName.toLowerCase() === 'input';
    const isSlider = el.getAttribute('role') === 'slider' || (isInput && (el as HTMLInputElement).type === 'range');
    const isTab = el.getAttribute('role') === 'tab';

    if (isButton || isSelect || isInput || isSlider || isTab) {
      const text = (el.textContent || el.getAttribute('title') || el.getAttribute('aria-label') || '').trim();
      const titleClean = text.slice(0, 40) || (isButton ? 'Interactive Action Control' : 'Interactive Selector');
      
      let cat: ExplanationEntry['category'] = 'SELECTABLE';
      if (isButton && (text.includes('Toggle') || text.includes('VS') || text.includes('Dark') || text.includes('Alert') || text.includes('Line'))) {
        cat = 'TOGGLE';
      } else if (isButton && (text.includes('Download') || text.includes('Export') || text.includes('Report') || text.includes('Reset'))) {
        cat = 'ACTION';
      } else if (isSlider) {
        cat = 'SELECTABLE';
      }

      return {
        title: titleClean,
        category: cat,
        description: `Interactive ${cat.toLowerCase()} modulating operational dashboard parameters and analytical displays.`,
        meteorologicalContext: 'Directly influences post-processing calculations, statistical moving windows, or visual overlay thresholds.',
        interactionHint: isButton ? 'Click to trigger or toggle this control.' : 'Select or adjust to calibrate parameter.',
      };
    }

    return null;
  };

  // Global pointerover / mouseover listener
  useEffect(() => {
    if (!isEnabled) {
      setHoverInfo(null);
      return;
    }

    const handlePointerOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Ignore hover inside the inspector itself
      if (target.closest('#side-floating-inspector-panel')) return;

      // Find nearest eligible element (button, select, input, graph, toggle, etc.)
      const eligible = target.closest(
        'button, select, input, [role="button"], [role="switch"], [role="tab"], [role="slider"], svg.recharts-surface, .recharts-wrapper, .taylor-diagram, canvas, [data-explain-title]'
      ) as HTMLElement | null;

      if (!eligible) {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        setHoverInfo(null);
        currentTargetRef.current = null;
        return;
      }

      if (eligible === currentTargetRef.current) return;
      currentTargetRef.current = eligible;

      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      // 120ms debounce to prevent visual flutter on rapid sweeps
      hoverTimeoutRef.current = setTimeout(() => {
        const explanation = resolveExplanation(eligible);
        if (!explanation) {
          setHoverInfo(null);
          return;
        }

        const rect = eligible.getBoundingClientRect();
        
        // Compute strict side-dock placement:
        // Default to RIGHT of the target element.
        // If target is too close to right edge (< 360px available), flip to LEFT side of element.
        const cardWidth = 340;
        const spacing = 14;
        const fitsRight = rect.right + cardWidth + spacing < window.innerWidth;
        const dockSide = fitsRight ? 'right' : 'left';

        setHoverInfo({
          entry: explanation,
          targetRect: rect,
          dockSide,
        });
      }, 120);
    };

    const handlePointerOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement;
      if (!related || (!related.closest('button, select, input, svg, canvas') && !related.closest('#side-floating-inspector-panel'))) {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
        setHoverInfo(null);
        currentTargetRef.current = null;
      }
    };

    window.addEventListener('mouseover', handlePointerOver, { passive: true });
    window.addEventListener('mouseout', handlePointerOut, { passive: true });

    return () => {
      window.removeEventListener('mouseover', handlePointerOver);
      window.removeEventListener('mouseout', handlePointerOut);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, [isEnabled]);

  // Render floating side card coordinates
  let cardStyle: React.CSSProperties = { display: 'none' };
  let pointerStyle: React.CSSProperties = {};

  if (hoverInfo) {
    const { targetRect, dockSide } = hoverInfo;
    const cardWidth = 330;
    const estimatedHeight = 190;
    const spacing = 14;

    // Strict side-docked X position: right or left of element
    const x = dockSide === 'right' ? targetRect.right + spacing : targetRect.left - cardWidth - spacing;

    // Vertical center alignment with target element, clamped within viewport
    const targetCenterY = targetRect.top + targetRect.height / 2;
    let y = targetCenterY - estimatedHeight / 2;
    y = Math.max(16, Math.min(window.innerHeight - estimatedHeight - 16, y));

    cardStyle = {
      position: 'fixed',
      left: `${Math.round(x)}px`,
      top: `${Math.round(y)}px`,
      width: `${cardWidth}px`,
      zIndex: 99999,
      pointerEvents: 'none',
    };

    // Pointer chevron position pointing to target center
    const pointerRelativeY = Math.max(14, Math.min(estimatedHeight - 14, targetCenterY - y));
    pointerStyle = {
      top: `${Math.round(pointerRelativeY)}px`,
    };
  }

  return (
    <>
      {/* Floating Explanatory Inspector Card (Strictly Side-Docked) */}
      {isEnabled && hoverInfo && (
        <div
          id="side-floating-inspector-panel"
          style={cardStyle}
          className="animate-in fade-in-50 zoom-in-95 duration-200 transition-all filter drop-shadow-[0_12px_36px_rgba(0,0,0,0.65)] select-none"
        >
          {/* Main Glassmorphic Inspector Body */}
          <div className="relative rounded-xl border border-sky-400/40 bg-slate-950/95 backdrop-blur-xl p-3.5 text-slate-100 shadow-2xl shadow-sky-950/70 overflow-hidden">
            {/* Ambient Top Glow Line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-sky-400 to-transparent" />

            {/* Side Indicator Chevron Pointing Directly at Target */}
            {hoverInfo.dockSide === 'right' ? (
              <div
                style={pointerStyle}
                className="absolute -left-2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-sky-400/80"
              />
            ) : (
              <div
                style={pointerStyle}
                className="absolute -right-2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-l-[8px] border-l-sky-400/80"
              />
            )}

            {/* Header: Category Badge & Title */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                  <span className="text-[9px] font-mono font-black uppercase tracking-wider text-cyan-300 px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30">
                    {hoverInfo.entry.category} EXPLANATION
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white tracking-tight leading-snug">
                  {hoverInfo.entry.title}
                </h4>
              </div>

              <div className="p-1 rounded-md bg-sky-950/60 border border-sky-500/20 text-sky-400 shrink-0">
                {hoverInfo.entry.category === 'GRAPH' && <BarChart3 size={13} />}
                {hoverInfo.entry.category === 'TOGGLE' && <ToggleLeft size={13} />}
                {hoverInfo.entry.category === 'HORIZON' && <Compass size={13} />}
                {hoverInfo.entry.category === 'SELECTABLE' && <Sliders size={13} />}
                {hoverInfo.entry.category === 'ACTION' && <Zap size={13} />}
                {hoverInfo.entry.category === 'STATISTIC' && <Activity size={13} />}
              </div>
            </div>

            {/* Section 1: Plain-English Functional Explanation */}
            <p className="text-[11px] text-slate-300 leading-relaxed mb-2 font-normal">
              {hoverInfo.entry.description}
            </p>

            {/* Section 2: Meteorological & Physics Significance Box */}
            <div className="rounded-lg bg-sky-950/40 border border-sky-500/20 p-2 mb-2 text-[10px] space-y-0.5">
              <div className="flex items-center gap-1 text-[9px] font-mono font-bold text-sky-300 uppercase tracking-wider">
                <Info size={10} className="text-sky-400" />
                <span>Atmospheric Physics & Context</span>
              </div>
              <p className="text-slate-300/90 leading-normal font-sans">
                {hoverInfo.entry.meteorologicalContext}
              </p>
            </div>

            {/* Section 3: Interaction & Hotkey Hint */}
            {hoverInfo.entry.interactionHint && (
              <div className="flex items-center justify-between text-[9px] font-mono text-cyan-300/80 pt-1 border-t border-slate-800">
                <span className="flex items-center gap-1">
                  <ChevronRight size={10} />
                  <span>{hoverInfo.entry.interactionHint}</span>
                </span>
                <span className="text-slate-500">Side-Docked</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Discreet Persistent Floating Pill to Toggle Side Explanations Mode */}
      <div className="fixed bottom-4 right-4 z-40 pointer-events-auto">
        <button
          type="button"
          onClick={toggleInspector}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider backdrop-blur-xl border transition-all duration-300 shadow-xl cursor-pointer ${
            isEnabled
              ? 'bg-sky-950/90 text-cyan-200 border-sky-400/80 shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:bg-sky-900'
              : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'
          }`}
          title="Toggle Universal Side-Docked Floating Explanations (Shortcut: Alt+E)"
        >
          {isEnabled ? (
            <>
              <Eye size={12} className="text-cyan-400 animate-pulse" />
              <span>SIDE EXPLANATIONS: ON</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-sky-900/80 text-sky-300 border border-sky-400/30">Alt+E</span>
            </>
          ) : (
            <>
              <EyeOff size={12} className="text-slate-400" />
              <span>SIDE EXPLANATIONS: OFF</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400">Alt+E</span>
            </>
          )}
        </button>
      </div>
    </>
  );
};
