import React from 'react';
import { 
  Globe, 
  Calendar, 
  Mountain, 
  Compass, 
  CloudRain, 
  Layers, 
  Cpu, 
  Gauge, 
  Radar 
} from 'lucide-react';

export interface ExploreTourItem {
  id: string;
  title: string;
  shortTitle: string;
  category: 'Planetary & Synoptic' | 'Temporal Dynamics' | 'Microscale & Ground' | 'Regional Networks' | 'Machine Learning & Verification';
  scale: string; // e.g. "Planetary (10,000 km)", "Synoptic (1,000 km)", etc.
  iconName: 'Globe' | 'Calendar' | 'Mountain' | 'Compass' | 'CloudRain' | 'Layers' | 'Cpu' | 'Gauge' | 'Radar';
  targetSelector: string; // CSS selector or data-explore-id
  tabTarget?: string; // Tab to switch to if inspecting from modal
  meteorologicalSignificance: {
    primaryAtmosphericLaw: string;
    coreConcept: string;
    physicalDynamics: string;
    whyNwpFails: string;
    operationalImpact: string;
  };
  keyTakeaway: string;
  interactionHint: string;
}

export const EXPLORE_TOUR_ITEMS: ExploreTourItem[] = [
  {
    id: 'globe-simulator',
    title: '3D Earth Planetary Observatory & Globe Simulator',
    shortTitle: '3D Globe Simulator',
    category: 'Planetary & Synoptic',
    scale: 'Planetary (10,000 km)',
    iconName: 'Globe',
    targetSelector: '[data-explore-id="globe-simulator"]',
    tabTarget: 'sandbox',
    meteorologicalSignificance: {
      primaryAtmosphericLaw: 'Equatorial Planetary Wave Dynamics & Cross-Equatorial Flux',
      coreConcept: 'Planetary circulation controlling the Indian Summer Monsoon (ISM) moisture teleconnections.',
      physicalDynamics: 'Models the 850 hPa Somali Low-Level Jet (Findlater Jet), delivering massive maritime moisture flux from the southern Indian Ocean across the equator into the Arabian Sea. Integrates Madden-Julian Oscillation (MJO) phase propagation (phases 1–8), equatorial Rossby waves, and sea surface temperature (SST) thermal anomalies across the Arabian Sea and Bay of Bengal.',
      whyNwpFails: 'Global coarse NWP models often smooth tropical convection and miscalculate wave-mean flow interactions over the warm tropical pool, causing inaccurate onset dates.',
      operationalImpact: 'Provides synoptic forecasters with a macro-scale 3D hemispheric perspective of approaching deep depressions, monsoon troughs, and tropical cyclone tracks before regional landfall.',
    },
    keyTakeaway: 'The ISM is driven by planetary-scale cross-equatorial pressure gradients and Somali jet momentum flux.',
    interactionHint: 'Drag to rotate the 3D globe, zoom to examine cloud tops and convective vortices, or descend directly to ground level.',
  },
  {
    id: 'scenario-scrubber-bar',
    title: 'Scenario Scrubber Bar & Seasonal Progression Timeline',
    shortTitle: 'Scenario Scrubber Bar',
    category: 'Temporal Dynamics',
    scale: 'Synoptic & Seasonal (1,000 km / 4 Months)',
    iconName: 'Calendar',
    targetSelector: '[data-explore-id="scenario-scrubber-bar"]',
    tabTarget: 'dashboard',
    meteorologicalSignificance: {
      primaryAtmosphericLaw: 'Synoptic Monsoon Lifecycle & Dynamical Lead-Time Decay',
      coreConcept: 'Tracks the 4-phase intra-seasonal monsoon progression and forecast degradation over lead times.',
      physicalDynamics: 'Captures the northward migration of the Intertropical Convergence Zone (ITCZ) across 4 distinct phases: (1) June Onset (Arabian Sea surge), (2) July Synoptic Peak (monsoon trough positioned south of Himalayas), (3) August Active/Break spells (trough oscillation toward foothills causing Gangetic plain rain-shadows), and (4) September Post-Monsoon Withdrawal. Simultaneously evaluates forecast skill degradation from Day +1 to Day +5 as chaotic butterfly errors amplify.',
      whyNwpFails: 'Raw numerical weather prediction exhibits severe systematic "drizzle bias" (too many light rain days) and heavy underestimation of localized convective extremes, with errors compounding drastically at Day +3 and beyond.',
      operationalImpact: 'Allows disaster managers to scrub through historical catastrophic benchmark scenarios (e.g. Mumbai Cloudburst, Yamuna Deluge) and verify bias-correction performance at varying forecast horizons.',
    },
    keyTakeaway: 'Lead-time post-processing recovers critical forecast skill before atmospheric chaos degrades deterministic accuracy.',
    interactionHint: 'Click one-click synoptic disaster scenarios to load historical benchmarks, or scrub seasonal phases from June Onset to September Withdrawal.',
  },
  {
    id: 'local-3d-ground-sim',
    title: '3D Ground Station Micro-Physics & AWS Simulator',
    shortTitle: '3D Ground Station Sim',
    category: 'Microscale & Ground',
    scale: 'Microscale & Boundary Layer (100 m – 5 km)',
    iconName: 'Mountain',
    targetSelector: '[data-explore-id="local-3d-ground-sim"]',
    tabTarget: 'dashboard',
    meteorologicalSignificance: {
      primaryAtmosphericLaw: 'Surface Boundary Layer (SBL) Thermodynamics & Horton Infiltration',
      coreConcept: 'Simulates microscale orographic lifting, precipitation kinematics, and ground hydrology.',
      physicalDynamics: 'Simulates the steep orographic boundary layer interaction where moisture-laden monsoonal westerlies encounter terrain barriers (e.g. Western Ghats escarpments at Mahabaleshwar/Agumbe, or Meghalaya plateau funnels at Cherrapunji). Computes kinematic raindrop terminal fall velocities, Horton soil infiltration equations ($f_p = f_c + (f_0 - f_c)e^{-kt}$), surface water pooling depth ($D_{\\text{water}}$), and geotechnical landslide hazard indices.',
      whyNwpFails: 'Sub-grid orography cannot be resolved by standard 12 km grid models; narrow ghat ridges and steep coastal river valleys are flattened into broad plateaus, washing out orographic rainfall spikes.',
      operationalImpact: 'Translates atmospheric rain forecasts into ground-level impacts: imminent urban street ponding, geotechnical landslide alerts, and flash-flood catchment discharge warnings.',
    },
    keyTakeaway: 'Terrain steepness and soil saturation dictate whether heavy rainfall remains benign or triggers catastrophic flash flooding.',
    interactionHint: 'Tweak precipitation intensity (0–300 mm/h) and wind shear sliders to watch real-time water pooling, runoff rates, and IMD hazard advisories update.',
  },
  {
    id: 'station-selector',
    title: 'IMD Meteorological Observatories Network',
    shortTitle: 'IMD Station Network',
    category: 'Regional Networks',
    scale: 'Mesoscale Synoptic Network (50 – 500 km)',
    iconName: 'Compass',
    targetSelector: '[data-explore-id="station-selector"]',
    tabTarget: 'dashboard',
    meteorologicalSignificance: {
      primaryAtmosphericLaw: 'Hydro-Climatic Zonation & Spatial Microclimate Heterogeneity',
      coreConcept: 'Ground-truth observational network spanning 6 diverse Indian meteorological zones.',
      physicalDynamics: 'Encompasses 30+ representative IMD surface stations categorized into distinct regimes: Western Ghats Orographic (BOM, MAHA, PAN), Gangetic Plain Trough (DEL, LKO, PAT), Coastal Maritime (CHN, VIZ), Northeast Fluvial Gorges (GAU, CHE), Peninsular Rain-Shadow (BLR, HYD, PUN), and Semi-Arid Northwest (JAI, AHM). Captures localized thermodynamic soundings (CAPE, CIN, Lifted Condensation Level).',
      whyNwpFails: 'Uniform spatial parameterization in numerical models fails to account for sharp microclimate transitions (e.g. Pune receiving 1/5th the rainfall of Mahabaleshwar just 60 km away across the ghat crest).',
      operationalImpact: 'Enables station-calibrated quantile mapping that preserves local microclimate probability distributions and eliminates localized station biases.',
    },
    keyTakeaway: 'No single statistical model fits India: local hydro-climatic zones dictate distinct convective physics.',
    interactionHint: 'Select any meteorological observatory or click its 3D Ground Sim button to evaluate station-specific bias-correction statistics.',
  },
  {
    id: 'regime-classifier',
    title: 'IMD Regime-Aware Weather State Classifier',
    shortTitle: 'Regime Classifier',
    category: 'Machine Learning & Verification',
    scale: 'Synoptic State Space (1,000 km)',
    iconName: 'Compass',
    targetSelector: '[data-explore-id="regime-classifier"]',
    tabTarget: 'regimes',
    meteorologicalSignificance: {
      primaryAtmosphericLaw: 'Synoptic Weather Regimes & Non-Stationary Convective Physics',
      coreConcept: 'Conditioning statistical post-processing on discrete dynamical circulation states.',
      physicalDynamics: 'Decomposes monsoonal circulation into 5 IMD-standard synoptic regimes: (1) Active Monsoon (high moisture flux, strong low-level westerlies), (2) Break Monsoon (monsoon trough shifts to Himalayan foothills; peninsular rain-shadow), (3) Monsoon Low / Depression (deep cyclonic vorticity maximum), (4) Offshore Trough (coastal mesoscale convergence), and (5) Normal Transitional. Evaluates atmospheric instability indices (Convective Available Potential Energy - CAPE, and Convective Inhibition - CIN).',
      whyNwpFails: 'Standard regression models assume a single stationary error distribution. Applying the same correction during a Break spell as an Active spell creates artificial false alarms.',
      operationalImpact: 'Regime-conditioning ensures machine learning models switch physics parameters based on active atmospheric regimes, boosting extreme event capture by over 90%.',
    },
    keyTakeaway: 'Weather errors are regime-dependent: a break spell has fundamentally different error physics than an active depression.',
    interactionHint: 'Navigate to Regime Classifier to examine regime transition probabilities, thermodynamic profiles, and clustering scatter plots.',
  },
  {
    id: 'heavy-rain-probability',
    title: 'Extreme Rainfall Probability & Quantile Engine',
    shortTitle: 'Heavy Rain Probability',
    category: 'Machine Learning & Verification',
    scale: 'Statistical Tail & Risk (Probability Space)',
    iconName: 'CloudRain',
    targetSelector: '[data-explore-id="heavy-rain-probability"]',
    tabTarget: 'probabilities',
    meteorologicalSignificance: {
      primaryAtmosphericLaw: 'Extreme Value Theory (EVT) & Generalized Pareto Tail Calibration',
      coreConcept: 'Probabilistic modeling of high-impact precipitation threshold exceedances.',
      physicalDynamics: 'Calculates the calibrated likelihood of exceeding IMD categorical warning thresholds: Moderate (15.6–64.4 mm/day), Heavy (64.5–115.5 mm/day), Very Heavy (115.6–204.4 mm/day), and Extremely Heavy Deluge (>204.4 mm/day). Employs non-crossing quantile regression and parametric tail fitting to deliver sharp, calibrated probability densities.',
      whyNwpFails: 'Deterministic models give binary "yes/no" forecasts that frequently miss intense convective cells due to spatial displacement errors, leaving emergency authorities unprepared.',
      operationalImpact: 'Enables National Disaster Response Force (NDRF) and State Disaster Management Authorities (SDMA) to make risk-informed pre-deployment decisions using actionable probability percentiles.',
    },
    keyTakeaway: 'Probabilistic quantiles capture the true risk of catastrophic convective deluges where deterministic numbers fail.',
    interactionHint: 'Explore calibrated probability curves across IMD alert bands to see false-alarm rates decrease and reliability sharpen.',
  },
  {
    id: 'district-products',
    title: 'District Downscaling & Catchment Inundation Products',
    shortTitle: 'District Products',
    category: 'Regional Networks',
    scale: 'Watershed & District (1 – 25 km)',
    iconName: 'Layers',
    targetSelector: '[data-explore-id="district-products"]',
    tabTarget: 'districts',
    meteorologicalSignificance: {
      primaryAtmosphericLaw: 'Catchment Hydrology & Antecedent Soil Moisture Conservation',
      coreConcept: 'Translating gridded atmospheric predictions to administrative district and river basin scales.',
      physicalDynamics: 'Spatial downscaling of 12 km NWP model grids to 1 km watershed polygons. Combines localized precipitation intensity with basin geomorphology, drainage network density, and Antecedent Precipitation Index (API) to simulate hydrological discharge and urban catchment inundation.',
      whyNwpFails: 'NWP grids do not align with river catchments or municipal boundaries; averaging rain across a 25 km grid cell masks localized intense cloudbursts over urban storm drains.',
      operationalImpact: 'Empowers municipal district collectors and flood control cells to issue localized ward-level warnings and manage dam reservoir floodgates safely.',
    },
    keyTakeaway: 'Flooding is dictated by catchment basin geometry: downscaled rainfall must be coupled with hydrological response times.',
    interactionHint: 'Switch to District Products to inspect spatial rainfall heatmaps, regional anomaly maps, and catchment vulnerability scores.',
  },
  {
    id: 'live-predictor',
    title: 'Live Physics-Informed ML Predictor & Pipeline',
    shortTitle: 'Live ML Predictor',
    category: 'Machine Learning & Verification',
    scale: 'Operational Post-Processing (Real-Time)',
    iconName: 'Cpu',
    targetSelector: '[data-explore-id="live-predictor"]',
    tabTarget: 'predictor',
    meteorologicalSignificance: {
      primaryAtmosphericLaw: 'Multi-Variate Atmospheric Sounding Bias Correction',
      coreConcept: 'Ensemble gradient boosted trees and neural networks correcting dynamical model drift.',
      physicalDynamics: 'Ingests 20+ dynamical atmospheric predictors including zonal ($U$) and meridional ($V$) winds at 850, 500, and 200 hPa, vertical omega velocity (convective ascent rate), 700 hPa relative humidity, mean sea level pressure (MSLP), and surface dew point. The ML model learns non-linear physical corrections that simultaneously eliminate drizzle bias and amplify smoothed peaks.',
      whyNwpFails: 'Numerical post-processing often violates mass conservation or fails to learn non-linear thermodynamic interactions between wind shear and mid-tropospheric humidity.',
      operationalImpact: 'Delivers instant, verifiable bias-corrected rainfall estimates for real-time operational meteorologist intervention.',
    },
    keyTakeaway: 'Physics-informed machine learning blends atmospheric dynamics with empirical machine intelligence.',
    interactionHint: 'Adjust environmental sliders (wind shear, moisture, pressure) in the Live Predictor to see post-processed rainfall respond dynamically.',
  },
  {
    id: 'verification-metrics',
    title: 'WMO Standard Verification & Skill Scorecard',
    shortTitle: 'Verification Metrics',
    category: 'Machine Learning & Verification',
    scale: 'Statistical Skill Evaluation',
    iconName: 'Gauge',
    targetSelector: '[data-explore-id="verification-metrics"]',
    tabTarget: 'verification',
    meteorologicalSignificance: {
      primaryAtmosphericLaw: 'WMO Standard Verification Metrics & Dual-Penalty Error Accounting',
      coreConcept: 'Objective evaluation of post-processing skill improvement over raw numerical forecasts.',
      physicalDynamics: 'Evaluates forecasts using World Meteorological Organization (WMO) verification standards: Root Mean Square Error (RMSE), Mean Absolute Error (MAE), Pearson Correlation ($r$), Probability of Detection (POD), False Alarm Ratio (FAR), Critical Success Index (CSI), Equitable Threat Score (ETS), and Brier Score for probabilistic reliability.',
      whyNwpFails: 'Traditional mean-squared error penalizes timing errors twice (missing rain and predicting false rain), hiding the true value of high-resolution convective forecasts.',
      operationalImpact: 'Provides transparent scientific proof of model performance—documenting up to 38% RMSE reduction and 94.2% capture of high-impact monsoon cloudbursts.',
    },
    keyTakeaway: 'True forecast skill requires multi-dimensional verification: reducing drizzle bias without blunting extreme convective tails.',
    interactionHint: 'Review the metric scorecards to observe verified reductions in bias and improvements in threat score over raw NWP.',
  },
];
