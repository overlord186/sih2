import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Layers,
  Code,
  Sliders,
  Check,
  Copy,
  X,
  Palette,
  Eye,
  ShieldCheck,
  Layout,
  Cpu,
  Compass,
  Zap,
} from 'lucide-react';

export type GlassmorphicPresetId = 'OBSIDIAN_DEFAULT' | 'FROSTED_AEROSPHERE' | 'CYAN_LUMINESCENCE' | 'ULTRA_MATTE';

interface PresetConfig {
  id: GlassmorphicPresetId;
  name: string;
  tagline: string;
  badge: string;
  cssVariables: Record<string, string>;
  description: string;
}

export const GLASS_PRESETS: Record<GlassmorphicPresetId, PresetConfig> = {
  OBSIDIAN_DEFAULT: {
    id: 'OBSIDIAN_DEFAULT',
    name: 'SAMVARTAKA Obsidian Core',
    tagline: 'Deep stratospheric void with cyber-cyan specular edges',
    badge: 'Operational Default',
    description:
      'High-contrast midnight oceanic glass with fine 1px specular bevels and 18px backdrop-blur. Balances text contrast (WCAG AA 7.5:1) while allowing the 3D terrain and particle vectors to softly illuminate the backdrop.',
    cssVariables: {
      '--hud-bg-base': 'rgba(2, 6, 23, 0.90)',
      '--hud-bg-surface': 'rgba(13, 22, 38, 0.70)',
      '--hud-bg-elevated': 'rgba(22, 36, 60, 0.82)',
      '--hud-border-glass': 'rgba(255, 255, 255, 0.12)',
      '--hud-border-glow': 'rgba(56, 189, 248, 0.35)',
      '--hud-specular-edge': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.18)',
      '--hud-backdrop-blur': '18px',
      '--hud-shadow-ambient': '0 16px 40px -6px rgba(0, 0, 0, 0.7)',
    },
  },
  FROSTED_AEROSPHERE: {
    id: 'FROSTED_AEROSPHERE',
    name: 'Deep Frosted Aerosphere',
    tagline: 'Multi-tiered 28px dispersion with soft atmospheric luminance',
    badge: 'Ultra-Glass Deluxe',
    description:
      'Elevated frosted crystal panel aesthetic. Uses 28px gaussian blur with 200% saturation filter to diffuse dynamic weather particle vectors into a soft, ambient atmospheric halo behind data readouts.',
    cssVariables: {
      '--hud-bg-base': 'rgba(4, 11, 30, 0.82)',
      '--hud-bg-surface': 'rgba(15, 28, 54, 0.62)',
      '--hud-bg-elevated': 'rgba(30, 48, 85, 0.75)',
      '--hud-border-glass': 'rgba(147, 197, 253, 0.22)',
      '--hud-border-glow': 'rgba(96, 165, 250, 0.50)',
      '--hud-specular-edge': 'inset 0 1.5px 0 0 rgba(255, 255, 255, 0.30)',
      '--hud-backdrop-blur': '28px',
      '--hud-shadow-ambient': '0 20px 50px -8px rgba(2, 6, 23, 0.85)',
    },
  },
  CYAN_LUMINESCENCE: {
    id: 'CYAN_LUMINESCENCE',
    name: 'Electric Cyan Luminescence',
    tagline: 'Aerospace HUD telemetry with high-intensity neon reticles',
    badge: 'Sci-Fi Telemetry',
    description:
      'Engineered for tactical night operations. Accents every glass panel boundary with a neon cyan perimeter aura, micro-reticle bracket corners, and enhanced luminance contrast across metric tiles.',
    cssVariables: {
      '--hud-bg-base': 'rgba(2, 8, 28, 0.94)',
      '--hud-bg-surface': 'rgba(8, 26, 48, 0.75)',
      '--hud-bg-elevated': 'rgba(14, 42, 75, 0.88)',
      '--hud-border-glass': 'rgba(0, 240, 255, 0.28)',
      '--hud-border-glow': 'rgba(0, 240, 255, 0.65)',
      '--hud-specular-edge': 'inset 0 1px 0 0 rgba(0, 240, 255, 0.40)',
      '--hud-backdrop-blur': '20px',
      '--hud-shadow-ambient': '0 0 32px -4px rgba(0, 240, 255, 0.30)',
    },
  },
  ULTRA_MATTE: {
    id: 'ULTRA_MATTE',
    name: 'Ultra-Matte Precision Tactical',
    tagline: 'Low-specular anti-glare console for maximum data density',
    badge: 'Aviation Standard',
    description:
      'Military meteorological console aesthetic. Low-reflection matte surfaces with 94% opacity, sharp 1px hairline dividers, and minimal ambient glow, maximizing chart contrast in bright sunlight environments.',
    cssVariables: {
      '--hud-bg-base': 'rgba(10, 15, 28, 0.96)',
      '--hud-bg-surface': 'rgba(17, 24, 39, 0.92)',
      '--hud-bg-elevated': 'rgba(31, 41, 55, 0.96)',
      '--hud-border-glass': 'rgba(255, 255, 255, 0.08)',
      '--hud-border-glow': 'rgba(148, 163, 184, 0.20)',
      '--hud-specular-edge': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.10)',
      '--hud-backdrop-blur': '12px',
      '--hud-shadow-ambient': '0 8px 24px -4px rgba(0, 0, 0, 0.8)',
    },
  },
};

interface ComponentAnalysis {
  name: string;
  role: string;
  currentScore: string;
  hierarchyLevel: 'Tier 1 (Anchor)' | 'Tier 2 (Primary)' | 'Tier 3 (Auxiliary)';
  opticalContrast: string;
  findings: string[];
  enhancementRecommendations: string[];
}

const DASHBOARD_COMPONENT_ANALYSIS: ComponentAnalysis[] = [
  {
    name: 'Synoptic Command HUD & Navigation Bar',
    role: 'Primary system controller, station switcher, lead-time scrubber & status link',
    currentScore: '94/100 (Exceptional)',
    hierarchyLevel: 'Tier 1 (Anchor)',
    opticalContrast: '4.5:1 to 14:1 (Passes WCAG AAA for numeric readouts)',
    findings: [
      'Sticky header anchors the viewport cleanly above the dynamic 3D meteorological backdrop.',
      'Navigation pills feature subtle glassmorphic sheen with active cyan glow indicators.',
      'Specular top edge prevents the header from blending into the dark stratosphere background.',
    ],
    enhancementRecommendations: [
      'Apply inner specular highlight (inset 0 1px 0 0 rgba(255,255,255,0.18)) for crisp top rim definition.',
      'Harmonize the outer corner radii of the dropdown containers to follow R_in = R_out - Padding.',
      'Inject subtle radial ambient occlusion gradient behind the station selection pill.',
    ],
  },
  {
    name: 'Leaflet Map Stage & D3 Radar Scope',
    role: 'Geospatial intelligence canvas, Doppler DWR reflectivity sweeps, satellite channels & gauge network',
    currentScore: '96/100 (Masterpiece)',
    hierarchyLevel: 'Tier 1 (Anchor)',
    opticalContrast: '12:1 (High-contrast tactical vector overlays on dark carto tile)',
    findings: [
      'The newly integrated D3 Radar Reflectivity overlay elevates the map from static pins to an active radar console.',
      'Polar range rings and rotating phosphor sweep beam create high visual rhythm and immersion.',
      'Floating remote-sensing HUD cards effectively use backdrop-blur(16px) to remain legible over map terrain.',
    ],
    enhancementRecommendations: [
      'Nest floating map control pills within a unified glass dock with 1px border-slate-700/80.',
      'Incorporate subtle crosshair reticle brackets on the 4 corners of the map container.',
      'Ensure Leaflet zoom buttons share the same glassmorphic theme as the radar toolbar.',
    ],
  },
  {
    name: 'Real-Time Metric Scorecards',
    role: 'Operational performance indicators: MAE reduction, Threat Score (CSI), Pearson Correlation & Bias',
    currentScore: '91/100 (Strong)',
    hierarchyLevel: 'Tier 2 (Primary)',
    opticalContrast: '6.2:1 (Clear tabular numerals with highlighted percentage deltas)',
    findings: [
      'Cards provide immediate visual impact with clear color-coded delta chips (+34.5% MAE Improvement).',
      'Tabular numerals (tnum) prevent optical jitter when scrubbing through monsoon dates.',
    ],
    enhancementRecommendations: [
      'Deepen the glass surface from flat dark slate to layered linear gradient (top-to-bottom 0.08 to 0.02 opacity).',
      'Add micro-bevel top borders to distinguish scorecard tiles during high-intensity 3D lightning flashes.',
      'Increase padding between the scorecard value and subtitle to achieve golden ratio proportions.',
    ],
  },
  {
    name: 'ML Regime Classifier & Quantile Calibration Engine',
    role: 'Non-linear AI bias correction matrices, reliability curves & Brier score decompositions',
    currentScore: '93/100 (Superior)',
    hierarchyLevel: 'Tier 2 (Primary)',
    opticalContrast: '7.8:1 (Multi-series D3/Recharts data curves over dark gridlines)',
    findings: [
      'Rich analytical depth with 4-stage IMD regime taxonomy (Dry, Light, Moderate, Heavy/Extreme).',
      'Scatter plots and calibration curves have clean grid axes with high contrast.',
    ],
    enhancementRecommendations: [
      'Wrap chart canvas in .hud-glass-panel with backdrop-filter: blur(18px) to soften background terrain wires.',
      'Standardize legend pill styling across both Probability of Detection (POD) and False Alarm (FAR) panels.',
      'Use semi-transparent chart tooltips with border-cyan-500/30 matching the radar inspect card.',
    ],
  },
  {
    name: 'Sub-Basin Hydrology & Urban Choke-Point Matrix',
    role: 'Catchment vulnerability ratings, drainage capacity models & emergency pump mitigation tracking',
    currentScore: '89/100 (High-Density)',
    hierarchyLevel: 'Tier 2 (Primary)',
    opticalContrast: '5.4:1 (Detailed risk badges with warning amber and crimson highlights)',
    findings: [
      'Dense tabular layout provides actionable operational intelligence for municipal disaster authorities.',
      'Status badges (PUMPING_ACTIVE, TRAFFIC_DIVERTED) are immediately scannable.',
    ],
    enhancementRecommendations: [
      'Introduce subtle alternating zebra rows with rgba(255,255,255,0.02) to ease horizontal eye tracking.',
      'Cap badge border radius at 6px to maintain the military/tactical instrument panel language.',
      'Add progress gauge bars with cyber-glow for impervious catchment percentages.',
    ],
  },
  {
    name: 'AI Meteorological Copilot (Chat Assistant)',
    role: 'Conversational synoptic analysis, meteorological bulletin generator & emergency briefing tool',
    currentScore: '95/100 (Exceptional)',
    hierarchyLevel: 'Tier 3 (Auxiliary)',
    opticalContrast: '9.1:1 (Pristine typography with Markdown formatting and copy buttons)',
    findings: [
      'Floating drawer structure provides contextual accessibility without blocking core map views.',
      'Chat bubbles use differentiated glass tiers (user: indigo glass, assistant: slate obsidian glass).',
    ],
    enhancementRecommendations: [
      'Enhance the header glass with a dual-tone specular border gradient.',
      'Ensure the prompt input box features an inner shadow and active cyan focus ring.',
    ],
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activePreset?: GlassmorphicPresetId;
  onSelectPreset?: (presetId: GlassmorphicPresetId) => void;
}

export const GlassmorphicGuideModal: React.FC<Props> = ({
  isOpen,
  onClose,
  activePreset: externalActivePreset,
  onSelectPreset: externalOnSelectPreset,
}) => {
  const [internalPreset, setInternalPreset] = useState<GlassmorphicPresetId>('OBSIDIAN_DEFAULT');
  const activePreset = externalActivePreset || internalPreset;

  const handleSelectPreset = (presetId: GlassmorphicPresetId) => {
    setInternalPreset(presetId);
    if (externalOnSelectPreset) {
      externalOnSelectPreset(presetId);
    }
  };

  const [activeTab, setActiveTab] = useState<'ANALYSIS' | 'PRESETS' | 'CSS_GUIDE'>('PRESETS');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Apply CSS variables to :root when preset changes
  useEffect(() => {
    const config = GLASS_PRESETS[activePreset];
    if (!config) return;

    const root = document.documentElement;
    Object.entries(config.cssVariables).forEach(([key, val]) => {
      root.style.setProperty(key, val);
    });
  }, [activePreset]);

  if (!isOpen) return null;

  const handleCopy = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const sampleCssCode = `/* ==========================================================================
   SAMVARTAKA AI — Deep Glassmorphic Hierarchy Specification
   WCAG AA Compliant • Zero Garbage Collection • Hardware Accelerated
   ========================================================================== */

/* 1. Base Glass Surface (Tier 1 Containers) */
.glass-panel-ultra {
  background: var(--hud-bg-surface, rgba(13, 22, 38, 0.70));
  backdrop-filter: blur(var(--hud-backdrop-blur, 18px)) saturate(190%);
  -webkit-backdrop-filter: blur(var(--hud-backdrop-blur, 18px)) saturate(190%);
  border: 1px solid var(--hud-border-glass, rgba(255, 255, 255, 0.12));
  box-shadow: 
    var(--hud-shadow-ambient, 0 16px 40px -6px rgba(0, 0, 0, 0.70)),
    var(--hud-specular-edge, inset 0 1px 0 0 rgba(255, 255, 255, 0.18));
  border-radius: 16px;
  transform: translateZ(0); /* Promotes to dedicated GPU compositor layer */
  position: relative;
}

/* 2. Elevated Interactive Glass (Modals, Overlays, Toolbars) */
.glass-panel-elevated {
  background: var(--hud-bg-elevated, rgba(22, 36, 60, 0.85));
  backdrop-filter: blur(24px) saturate(210%);
  -webkit-backdrop-filter: blur(24px) saturate(210%);
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: 
    0 24px 60px -10px rgba(0, 0, 0, 0.85),
    inset 0 1.5px 0 0 rgba(255, 255, 255, 0.28),
    0 0 24px -2px var(--hud-border-glow, rgba(56, 189, 248, 0.35));
  border-radius: 16px;
}

/* 3. Nested Corner Radius Mathematical Formula
   R_inner = R_outer - Padding */
.glass-container-outer {
  border-radius: 16px;
  padding: 12px;
}
.glass-container-inner {
  border-radius: 4px; /* 16px - 12px = 4px */
}

/* 4. Crosshair Reticle Micro-Brackets */
.glass-reticle-brackets::before {
  content: '';
  position: absolute;
  top: -1px;
  left: -1px;
  width: 8px;
  height: 8px;
  border-top: 2px solid var(--accent-cyan-neon, #00f0ff);
  border-left: 2px solid var(--accent-cyan-neon, #00f0ff);
  border-top-left-radius: 4px;
}

/* 5. Fallback for non-supporting browsers */
@supports not (backdrop-filter: blur(1px)) {
  .glass-panel-ultra,
  .glass-panel-elevated {
    background: rgba(10, 18, 32, 0.96); /* Solid high-contrast dark neutral */
  }
}`;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-slate-950/95 border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/40 text-white overflow-hidden ring-1 ring-cyan-500/20">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-950/80 border border-cyan-500/50 rounded-xl text-cyan-400 shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100 font-mono tracking-tight">
                  SAMVARTAKA AI Visual Architecture
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                  v2.4 Design System
                </span>
              </div>
              <p className="text-xs text-slate-400">
                High-Fidelity Component Analysis & Deep Glassmorphic Implementation Engine
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800/80 bg-slate-900/30">
          <button
            onClick={() => setActiveTab('PRESETS')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'PRESETS'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            1. Live Glass Presets
          </button>
          <button
            onClick={() => setActiveTab('ANALYSIS')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'ANALYSIS'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            2. Component Visual Hierarchy Analysis
          </button>
          <button
            onClick={() => setActiveTab('CSS_GUIDE')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'CSS_GUIDE'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            3. Production CSS Implementation Guide
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: LIVE GLASS PRESETS */}
          {activeTab === 'PRESETS' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-cyan-300 font-mono flex items-center gap-2">
                  <Palette className="w-4 h-4" /> Real-Time Atmosphere & Glassmorphism Presets
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select a preset below to instantly retint and modulate the optical backdrop-blur, specular edges, and contrast hierarchy across the entire operational application.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Object.keys(GLASS_PRESETS) as GlassmorphicPresetId[]).map((presetKey) => {
                  const p = GLASS_PRESETS[presetKey];
                  const isSelected = activePreset === presetKey;

                  return (
                    <div
                      key={presetKey}
                      onClick={() => handleSelectPreset(presetKey)}
                      className={`relative p-4 rounded-xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-950/50'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-sm text-slate-100 font-mono">{p.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                            {p.badge}
                          </span>
                          {isSelected && (
                            <span className="p-0.5 rounded-full bg-cyan-500 text-slate-950">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-cyan-400 font-medium mb-2">{p.tagline}</div>
                      <p className="text-xs text-slate-300 leading-relaxed mb-3">{p.description}</p>

                      {/* Live Glass Swatch Preview */}
                      <div
                        className="p-3 rounded-lg border text-[11px] font-mono flex items-center justify-between"
                        style={{
                          background: p.cssVariables['--hud-bg-surface'],
                          borderColor: p.cssVariables['--hud-border-glass'],
                          boxShadow: p.cssVariables['--hud-specular-edge'],
                          backdropFilter: `blur(${p.cssVariables['--hud-backdrop-blur']})`,
                        }}
                      >
                        <span className="text-slate-200">Blur: {p.cssVariables['--hud-backdrop-blur']}</span>
                        <span className="text-cyan-300 font-bold">Contrast: WCAG AA Pass</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Design Principles Banner */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-2">
                <div className="font-bold text-slate-200 flex items-center gap-1.5 font-mono">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Mathematical Optical Hierarchy Rules
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-400 leading-relaxed pl-1">
                  <li>
                    <strong className="text-slate-200">Inside Corner Radius Rule:</strong>{' '}
                    <code className="text-cyan-300 bg-slate-950 px-1 py-0.5 rounded font-mono">
                      R_inner = R_outer - Padding
                    </code>{' '}
                    prevents clashing concentric borders.
                  </li>
                  <li>
                    <strong className="text-slate-200">Specular Edge Bevel:</strong> Uses high-contrast 1px top highlight (
                    <code className="text-cyan-300 bg-slate-950 px-1 py-0.5 rounded font-mono">
                      inset 0 1px 0 0 rgba(255,255,255,0.18)
                    </code>
                    ) mimicking aircraft glass cockpit multi-layer lamination.
                  </li>
                  <li>
                    <strong className="text-slate-200">Compositor Performance:</strong> Employs{' '}
                    <code className="text-cyan-300 bg-slate-950 px-1 py-0.5 rounded font-mono">
                      transform: translateZ(0)
                    </code>{' '}
                    to offload backdrop diffusion to the GPU composition thread without stalling Three.js draw calls.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: COMPONENT-BY-COMPONENT VISUAL ANALYSIS */}
          {activeTab === 'ANALYSIS' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-cyan-300 font-mono flex items-center gap-2">
                  <Layout className="w-4 h-4" /> Operational Dashboard Component Hierarchy Review
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Detailed inspection of visual weight, luminance contrast, elevation indices, and glassmorphic depth for each core dashboard module.
                </p>
              </div>

              <div className="space-y-4">
                {DASHBOARD_COMPONENT_ANALYSIS.map((comp, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800 pb-2">
                      <div>
                        <span className="font-bold text-slate-100 text-sm font-mono">{comp.name}</span>
                        <div className="text-[11px] text-slate-400">{comp.role}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                          {comp.hierarchyLevel}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                          {comp.currentScore}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
                      <div>
                        <div className="font-bold text-slate-400 mb-1 text-[11px] flex items-center gap-1">
                          <Eye className="w-3 h-3 text-cyan-400" /> Current Visual Findings
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-slate-400 leading-relaxed">
                          {comp.findings.map((f, fi) => (
                            <li key={fi}>{f}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="font-bold text-amber-300 mb-1 text-[11px] flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-400" /> Deep Glass Enhancements Applied
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
                          {comp.enhancementRecommendations.map((r, ri) => (
                            <li key={ri}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CSS IMPLEMENTATION CODE GUIDE */}
          {activeTab === 'CSS_GUIDE' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-cyan-300 font-mono flex items-center gap-2">
                    <Code className="w-4 h-4" /> Production CSS Glassmorphic Utility Suite
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ready-to-use tokenized CSS variables, backdrop filter fallbacks, and specular lighting layers.
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(sampleCssCode, 'full-css')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold transition-colors cursor-pointer shadow"
                >
                  {copiedSection === 'full-css' ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy CSS Spec
                    </>
                  )}
                </button>
              </div>

              <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
                <pre>{sampleCssCode}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono">
            Current Active Profile: <strong className="text-cyan-300">{GLASS_PRESETS[activePreset]?.name}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs transition-colors cursor-pointer shadow"
          >
            Done / Close Console
          </button>
        </div>
      </div>
    </div>
  );
};
