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
  Crosshair,
  Radio,
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
  'scrubber-audio-clicks-btn': {
    title: 'Acoustic Synthesizer Feedback Toggle',
    category: 'TOGGLE',
    description: 'Toggles real-time procedural Web Audio oscillator clicks on forecast horizon node transitions.',
    meteorologicalContext: 'Generates a 140 Hz micro-acoustic haptic ping to provide non-visual confirmation when scrub lead times cross critical synoptic boundaries.',
    interactionHint: 'Click to mute/unmute temporal scrubber audio feedback.',
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
  // Dual-Callout support for composite widgets (e.g. Scrubber parent + Audio Toggle child)
  parentEntry?: ExplanationEntry;
  parentRect?: DOMRect;
  isDualCallout: boolean;
}

export const SideFloatingInspector: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = localStorage.getItem('SAMVARTAKA_SIDE_INSPECTOR_ENABLED_V3');
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
        localStorage.setItem('SAMVARTAKA_SIDE_INSPECTOR_ENABLED_V3', String(next));
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

  // Global pointerover / mouseover listener with smart hierarchy decomposition
  useEffect(() => {
    if (!isEnabled) {
      setHoverInfo(null);
      return;
    }

    const handlePointerOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Ignore hover inside the inspector itself
      if (target.closest('#side-floating-inspector-panel') || target.closest('#hud-leader-lines-svg')) return;

      // Find nearest eligible element (button, select, input, graph, toggle, etc.)
      const eligible = target.closest(
        'button, select, input, [role="button"], [role="switch"], [role="tab"], [role="slider"], svg.recharts-surface, .recharts-wrapper, .taylor-diagram, canvas, #spring-temporal-scrubber, [data-explain-title]'
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

      // 40ms high-responsiveness debounce to prevent visual flutter on rapid sweeps
      hoverTimeoutRef.current = setTimeout(() => {
        const explanation = resolveExplanation(eligible);
        if (!explanation) {
          setHoverInfo(null);
          return;
        }

        const rect = eligible.getBoundingClientRect();

        // Check if inside composite widget (like Spring Temporal Scrubber)
        const scrubberParent = eligible.closest('#spring-temporal-scrubber') as HTMLElement | null;
        const isChildOfScrubber = scrubberParent && eligible !== scrubberParent;

        if (isChildOfScrubber) {
          // DUAL-CALLOUT MODE:
          // Tab 1: Explains parent Scrubber
          // Tab 2: Explains specific sub-control (e.g. Audio Clicks toggle)
          const parentRect = scrubberParent.getBoundingClientRect();
          const parentExplanation = EXPLANATION_REGISTRY['spring-temporal-scrubber'];

          setHoverInfo({
            entry: explanation,
            targetRect: rect,
            parentEntry: parentExplanation,
            parentRect: parentRect,
            isDualCallout: true,
          });
        } else {
          // SINGLE-CALLOUT MODE:
          setHoverInfo({
            entry: explanation,
            targetRect: rect,
            isDualCallout: false,
          });
        }
      }, 40);
    };

    const handlePointerOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement;
      if (
        !related ||
        (!related.closest('button, select, input, svg, canvas, #spring-temporal-scrubber') &&
          !related.closest('#side-floating-inspector-panel'))
      ) {
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

  // When disabled by user
  if (!isEnabled) {
    return (
      <div className="fixed bottom-4 right-4 z-40 pointer-events-auto">
        <button
          type="button"
          onClick={toggleInspector}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider backdrop-blur-xl border border-slate-700 bg-slate-900/80 text-slate-400 hover:text-white hover:border-slate-500 transition-all shadow-xl cursor-pointer"
          title="Enable Futuristic HUD Callout Explanations (Shortcut: Alt+E)"
        >
          <EyeOff size={12} className="text-slate-500" />
          <span>HUD CALLOUTS: MUTED</span>
          <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400">Alt+E</span>
        </button>
      </div>
    );
  }

  // When enabled but not currently hovering over an inspectable element
  if (!hoverInfo) {
    return (
      <div className="fixed bottom-4 right-4 z-40 pointer-events-auto">
        <button
          type="button"
          onClick={toggleInspector}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-black tracking-wider backdrop-blur-2xl border-2 border-cyan-400/80 bg-slate-950/90 text-cyan-200 shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:bg-cyan-950/80 hover:shadow-[0_0_35px_rgba(0,240,255,0.6)] transition-all cursor-pointer"
          title="Futuristic HUD Callouts Active! Hover over any button, graph, or toggle to inspect. Shortcut: Alt+E to mute."
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <Eye size={13} className="text-cyan-400 animate-pulse" />
          <span>FUTURISTIC HUD: ACTIVE</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-900/80 text-cyan-200 border border-cyan-400/40">
            Alt+E
          </span>
        </button>
      </div>
    );
  }

  const { entry, targetRect, parentEntry, parentRect, isDualCallout } = hoverInfo;

  // Compute Card 1 (Sub-control or Standalone Element)
  const card1Width = 320;
  const card1Height = 175;

  // Default placement: to the right or left with dogleg line
  const fitsRight = targetRect.right + card1Width + 30 < window.innerWidth;
  const card1Left = fitsRight
    ? targetRect.right + 30
    : Math.max(16, targetRect.left - card1Width - 30);
  
  let card1Top = targetRect.top + targetRect.height / 2 - card1Height / 2;
  card1Top = Math.max(16, Math.min(window.innerHeight - card1Height - 16, card1Top));

  // Anchor dot on element 1
  const t1AnchorX = fitsRight ? targetRect.right : targetRect.left;
  const t1AnchorY = targetRect.top + targetRect.height / 2;

  // Dock connection on Card 1
  const c1DockX = fitsRight ? card1Left : card1Left + card1Width;
  const c1DockY = card1Top + 30;

  // Dogleg knee point 1 (45° angle)
  const k1X = fitsRight ? t1AnchorX + 15 : t1AnchorX - 15;
  const k1Y = c1DockY;

  // Compute Card 2 (Parent Scrubber Callout in Dual Mode)
  let parentCardLeft = 0;
  let parentCardTop = 0;
  let pAnchorX = 0;
  let pAnchorY = 0;
  let pDockX = 0;
  let pDockY = 0;
  let pKneeX = 0;
  let pKneeY = 0;

  if (isDualCallout && parentRect && parentEntry) {
    // Parent Card sits in clear space ABOVE / LEFT of the Scrubber (as in user's diagram)
    const pCardWidth = 330;
    const pCardHeight = 170;

    parentCardLeft = Math.max(16, parentRect.left + 20);
    parentCardTop = Math.max(16, parentRect.top - pCardHeight - 24);

    // If too close to top of viewport, dock to top-left corner
    if (parentCardTop < 20) {
      parentCardTop = parentRect.bottom + 20;
    }

    // Anchor on Scrubber timeline track
    pAnchorX = parentRect.left + parentRect.width * 0.45;
    pAnchorY = parentRect.top + 45;

    // Dock on bottom of Parent Card
    pDockX = parentCardLeft + pCardWidth / 2;
    pDockY = parentCardTop < parentRect.top ? parentCardTop + pCardHeight : parentCardTop;

    pKneeX = pDockX;
    pKneeY = pAnchorY - 20;
  }

  return (
    <>
      {/* 1. Full-Viewport Fixed Transparent SVG for Vector Leader Lines */}
      <svg
        id="hud-leader-lines-svg"
        className="fixed inset-0 pointer-events-none z-[9990] w-full h-full overflow-hidden select-none"
      >
        <defs>
          {/* Cybernetic High-Luminance Neon Gradients */}
          <linearGradient id="hudLeaderGradCyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity="1" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.7" />
          </linearGradient>

          <linearGradient id="hudLeaderGradAmber" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0.7" />
          </linearGradient>

          <linearGradient id="hudLaserPulseCyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="30%" stopColor="#00f0ff" stopOpacity="1" />
            <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="hudLaserPulseAmber" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="30%" stopColor="#fbbf24" stopOpacity="1" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>

          {/* Intense Sci-Fi Laser Bloom Filter */}
          <filter id="hudLaserBloom" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* --- LINE 1: Element / Sub-Control Leader Line --- */}
        <g filter="url(#hudLaserBloom)">
          {/* Base Glowing Dogleg Path */}
          <path
            d={`M ${t1AnchorX} ${t1AnchorY} L ${k1X} ${k1Y} L ${c1DockX} ${c1DockY}`}
            fill="none"
            stroke="url(#hudLeaderGradCyan)"
            strokeWidth="2"
            strokeDasharray="6 3"
          />

          {/* High-Energy Animated Laser Tracer Pulse flowing along the line */}
          <path
            d={`M ${t1AnchorX} ${t1AnchorY} L ${k1X} ${k1Y} L ${c1DockX} ${c1DockY}`}
            fill="none"
            stroke="url(#hudLaserPulseCyan)"
            strokeWidth="3.5"
            strokeDasharray="20 180"
            className="animate-[dash_1.8s_linear_infinite]"
          />

          {/* Dual Rotating Concentric Target Reticle on Target Element */}
          <g transform={`translate(${t1AnchorX}, ${t1AnchorY})`}>
            {/* Outer Rotating Segmented Reticle Ring */}
            <circle
              r="15"
              fill="none"
              stroke="#00f0ff"
              strokeWidth="1.2"
              strokeDasharray="7 5"
              className="animate-[spin_6s_linear_infinite]"
            />
            {/* Inner Counter-Rotating Reticle Ring */}
            <circle
              r="10"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1"
              strokeDasharray="4 4"
              className="animate-[spin_4s_linear_infinite_reverse]"
            />
            {/* Precision Crosshair Lines */}
            <line x1="-7" y1="0" x2="7" y2="0" stroke="#00f0ff" strokeWidth="1.5" />
            <line x1="0" y1="-7" x2="0" y2="7" stroke="#00f0ff" strokeWidth="1.5" />
            {/* Center Laser Core */}
            <circle r="3.5" fill="#00f0ff" stroke="#020617" strokeWidth="1.2" />
            <circle r="8" fill="#00f0ff" fillOpacity="0.25" className="animate-ping" />

            {/* Rangefinder Telemetry readout tag */}
            <text
              x={fitsRight ? 20 : -95}
              y="-7"
              fill="#00f0ff"
              fontSize="8.5"
              fontFamily="monospace"
              fontWeight="900"
              letterSpacing="0.1em"
            >
              LOCK // AZ:45°
            </text>
            <text
              x={fitsRight ? 20 : -95}
              y="5"
              fill="#38bdf8"
              fontSize="7.5"
              fontFamily="monospace"
              opacity="0.85"
            >
              ΔX:{Math.round(c1DockX - t1AnchorX)}px
            </text>
          </g>

          {/* Card Docking Reticle Anchor Dot */}
          <circle cx={c1DockX} cy={c1DockY} r="4" fill="#00f0ff" stroke="#020617" strokeWidth="1.5" />
        </g>

        {/* --- LINE 2: Parent Scrubber Leader Line (Dual-Callout Mode) --- */}
        {isDualCallout && parentRect && (
          <g filter="url(#hudLaserBloom)">
            {/* Amber Glowing Dogleg Path */}
            <path
              d={`M ${pAnchorX} ${pAnchorY} L ${pAnchorX} ${pKneeY} L ${pDockX} ${pDockY}`}
              fill="none"
              stroke="url(#hudLeaderGradAmber)"
              strokeWidth="2.2"
              strokeDasharray="7 3.5"
            />
            {/* Amber Animated Laser Tracer Pulse */}
            <path
              d={`M ${pAnchorX} ${pAnchorY} L ${pAnchorX} ${pKneeY} L ${pDockX} ${pDockY}`}
              fill="none"
              stroke="url(#hudLaserPulseAmber)"
              strokeWidth="3.8"
              strokeDasharray="25 200"
              className="animate-[dash_2s_linear_infinite]"
            />

            {/* Rotating Reticle on Primary Scrubber Track */}
            <g transform={`translate(${pAnchorX}, ${pAnchorY})`}>
              <circle
                r="16"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1.4"
                strokeDasharray="8 5"
                className="animate-[spin_5s_linear_infinite]"
              />
              <circle
                r="10"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                className="animate-[spin_3.5s_linear_infinite_reverse]"
              />
              <line x1="-8" y1="0" x2="8" y2="0" stroke="#fbbf24" strokeWidth="1.5" />
              <line x1="0" y1="-8" x2="0" y2="8" stroke="#fbbf24" strokeWidth="1.5" />
              <circle r="4" fill="#fbbf24" stroke="#020617" strokeWidth="1.5" />
              <circle r="9" fill="#f59e0b" fillOpacity="0.3" className="animate-ping" />

              <text
                x="22"
                y="-6"
                fill="#fbbf24"
                fontSize="8.5"
                fontFamily="monospace"
                fontWeight="900"
                letterSpacing="0.1em"
              >
                MACRO // HORIZON
              </text>
              <text
                x="22"
                y="6"
                fill="#f59e0b"
                fontSize="7.5"
                fontFamily="monospace"
                opacity="0.85"
              >
                120 FPS SPRING
              </text>
            </g>

            {/* Parent Card Dock Dot */}
            <circle cx={pDockX} cy={pDockY} r="4" fill="#fbbf24" stroke="#020617" strokeWidth="1.5" />
          </g>
        )}
      </svg>

      {/* 2. Floating Cybernetic Holographic Callout Cards (Strictly Non-Blocking: pointer-events-none) */}
      <div id="side-floating-inspector-panel" className="pointer-events-none select-none">
        {/* --- CARD 1: Sub-control or Standalone Element Tab --- */}
        <div
          style={{
            position: 'fixed',
            left: `${Math.round(card1Left)}px`,
            top: `${Math.round(card1Top)}px`,
            width: `${card1Width}px`,
            zIndex: 99995,
          }}
          className="animate-in fade-in-50 zoom-in-95 duration-200 transition-all filter drop-shadow-[0_16px_40px_rgba(0,240,255,0.25)]"
        >
          {/* Chamfered Sci-Fi Angular HUD Polygon */}
          <div
            style={{
              clipPath:
                'polygon(0 14px, 14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px))',
              backgroundImage:
                'radial-gradient(circle at 10% 10%, rgba(14, 165, 233, 0.22) 0%, rgba(2, 6, 23, 0.96) 80%), repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0, 240, 255, 0.04) 3px, rgba(0, 240, 255, 0.04) 6px)',
            }}
            className="relative border-2 border-cyan-400/80 bg-slate-950 p-3.5 text-slate-100 shadow-[0_0_30px_rgba(0,240,255,0.35)] backdrop-blur-3xl overflow-hidden"
          >
            {/* Cybernetic High-Tech Corner Reticle Brackets */}
            <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-cyan-300" />
            <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-cyan-300" />
            <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-cyan-300" />
            <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-cyan-300" />

            {/* Glowing Neon Plasma Top Header Ribbon */}
            <div className="absolute top-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#00f0ff]" />

            {/* Futuristic Telemetry Header Bar */}
            <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-cyan-500/30 text-[8.5px] font-mono text-cyan-300">
              <span className="flex items-center gap-1 font-bold tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
                SYS // MET_HUD_v4.2
              </span>
              <span className="px-1.5 py-0.2 rounded bg-cyan-950/90 border border-cyan-400/40 text-cyan-200 font-black">
                [LOCKED: 120 FPS]
              </span>
            </div>

            {/* Main Title & Category Chip */}
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-mono font-black uppercase tracking-widest text-cyan-200 px-1.5 py-0.3 rounded bg-cyan-900/60 border border-cyan-400/60 shadow-[0_0_8px_rgba(0,240,255,0.4)]">
                    {entry.category} CALLOUT
                  </span>
                </div>
                <h4 className="text-xs font-black text-white tracking-wide leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  {entry.title}
                </h4>
              </div>

              <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-400/50 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.3)] shrink-0">
                {entry.category === 'GRAPH' && <BarChart3 size={13} />}
                {entry.category === 'TOGGLE' && <ToggleLeft size={13} />}
                {entry.category === 'HORIZON' && <Compass size={13} />}
                {entry.category === 'SELECTABLE' && <Sliders size={13} />}
                {entry.category === 'ACTION' && <Zap size={13} />}
                {entry.category === 'STATISTIC' && <Activity size={13} />}
              </div>
            </div>

            {/* Plain English Functional Description */}
            <p className="text-[10px] text-slate-200 leading-relaxed mb-2 font-normal font-sans">
              {entry.description}
            </p>

            {/* Tactical Meteorological Black-Box Tape */}
            <div className="rounded-lg bg-sky-950/60 border border-cyan-500/30 p-2 mb-1.5 text-[9px] space-y-1">
              <div className="flex items-center gap-1 text-[8px] font-mono font-bold text-cyan-300 uppercase tracking-wider">
                <Info size={9} className="text-cyan-400" />
                <span>&gt;&gt; Atmospheric Physics & Governing Dynamics</span>
              </div>
              <p className="text-slate-200/90 leading-normal font-sans">
                {entry.meteorologicalContext}
              </p>
            </div>

            {/* Interaction Hint & Zero-Interference Tag */}
            {entry.interactionHint && (
              <div className="flex items-center justify-between text-[8px] font-mono text-cyan-300/90 pt-1 border-t border-cyan-500/20">
                <span className="flex items-center gap-1 font-semibold">
                  <ChevronRight size={9} className="text-cyan-400 animate-pulse" />
                  <span>{entry.interactionHint}</span>
                </span>
                <span className="text-cyan-400/60 font-bold uppercase tracking-wider">Pass-Through Bus</span>
              </div>
            )}
          </div>
        </div>

        {/* --- CARD 2: Parent Composite Scrubber Tab (Dual-Callout Mode) --- */}
        {isDualCallout && parentRect && parentEntry && (
          <div
            style={{
              position: 'fixed',
              left: `${Math.round(parentCardLeft)}px`,
              top: `${Math.round(parentCardTop)}px`,
              width: `330px`,
              zIndex: 99996,
            }}
            className="animate-in fade-in-50 zoom-in-95 duration-200 transition-all filter drop-shadow-[0_16px_40px_rgba(245,158,11,0.25)]"
          >
            {/* Chamfered Sci-Fi Angular HUD Polygon in Plasma Amber */}
            <div
              style={{
                clipPath:
                  'polygon(0 14px, 14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px))',
                backgroundImage:
                  'radial-gradient(circle at 10% 10%, rgba(245, 158, 11, 0.22) 0%, rgba(2, 6, 23, 0.96) 80%), repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(251, 191, 36, 0.04) 3px, rgba(251, 191, 36, 0.04) 6px)',
              }}
              className="relative border-2 border-amber-400/80 bg-slate-950 p-3.5 text-slate-100 shadow-[0_0_30px_rgba(245,158,11,0.35)] backdrop-blur-3xl overflow-hidden"
            >
              {/* Amber Corner Reticle Accents */}
              <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-amber-300" />
              <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-amber-300" />
              <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-amber-300" />
              <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-amber-300" />

              {/* Amber Top Glow Ribbon */}
              <div className="absolute top-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_10px_#f59e0b]" />

              {/* Futuristic Amber Telemetry Header Bar */}
              <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-amber-500/30 text-[8.5px] font-mono text-amber-300">
                <span className="flex items-center gap-1 font-bold tracking-widest uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                  PRIMARY WIDGET CONTEXT // SYNC_LEAD
                </span>
                <span className="px-1.5 py-0.2 rounded bg-amber-950/90 border border-amber-400/40 text-amber-200 font-black">
                  [ζ = 1.0 DAMPED]
                </span>
              </div>

              {/* Main Title & Icon */}
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-mono font-black uppercase tracking-widest text-amber-200 px-1.5 py-0.3 rounded bg-amber-900/60 border border-amber-400/60 shadow-[0_0_8px_rgba(245,158,11,0.4)]">
                      TEMPORAL HORIZON PHYSICS
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-amber-100 tracking-wide leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                    {parentEntry.title}
                  </h4>
                </div>

                <div className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-400/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)] shrink-0">
                  <Compass size={13} />
                </div>
              </div>

              {/* Description */}
              <p className="text-[10px] text-slate-200 leading-relaxed mb-2 font-normal font-sans">
                {parentEntry.description}
              </p>

              {/* Meteorological Context Box */}
              <div className="rounded-lg bg-amber-950/50 border border-amber-500/30 p-2 mb-1.5 text-[9px] space-y-1">
                <div className="flex items-center gap-1 text-[8px] font-mono font-bold text-amber-300 uppercase tracking-wider">
                  <Activity size={9} className="text-amber-400" />
                  <span>&gt;&gt; Harmonic Spring Dynamics & Lead Synchronization</span>
                </div>
                <p className="text-slate-200/90 leading-normal font-sans">
                  {parentEntry.meteorologicalContext}
                </p>
              </div>

              {/* Interaction Hint */}
              <div className="flex items-center justify-between text-[8px] font-mono text-amber-300/90 pt-1 border-t border-amber-500/20">
                <span className="flex items-center gap-1 font-semibold">
                  <ChevronRight size={9} className="text-amber-400 animate-pulse" />
                  <span>{parentEntry.interactionHint}</span>
                </span>
                <span className="text-amber-400/60 font-bold uppercase tracking-wider">Parent Lead Track</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Cybernetic Floating HUD Control Pill */}
      <div className="fixed bottom-4 right-4 z-40 pointer-events-auto">
        <button
          type="button"
          onClick={toggleInspector}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-black tracking-wider backdrop-blur-2xl border-2 border-cyan-400/80 bg-slate-950/90 text-cyan-200 shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:bg-cyan-950/80 hover:shadow-[0_0_35px_rgba(0,240,255,0.6)] transition-all cursor-pointer"
          title="Toggle Futuristic HUD Vector Leader Explanations (Shortcut: Alt+E)"
        >
          <Eye size={13} className="text-cyan-400 animate-pulse" />
          <span>FUTURISTIC HUD: ACTIVE</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-900/80 text-cyan-200 border border-cyan-400/40">
            Alt+E
          </span>
        </button>
      </div>
    </>
  );
};
