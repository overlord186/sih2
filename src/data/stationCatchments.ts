/**
 * stationCatchments.ts
 * SAMVARTAKA AI — Operational Hydrological Catchment & Critical Infrastructure Data Model
 * 
 * Provides physics-grounded municipal drainage limits, Horton soil infiltration coefficients,
 * and real-world critical urban infrastructure flooding choke-points for each IMD observatory.
 */

export type InfrastructureType = 
  | 'SUBWAY_UNDERPASS'
  | 'AIRPORT_RUNWAY'
  | 'EXPRESSWAY_JUNCTION'
  | 'DRAINAGE_OUTPOUR'
  | 'PUMPING_STATION'
  | 'RAILWAY_TRACK_BASIN';

export type HotspotSeverity = 'CLEAR' | 'CAUTION' | 'CRITICAL_FLOODED';

export interface CriticalInfrastructureHotspot {
  id: string;
  name: string;
  type: InfrastructureType;
  locationDescription: string;
  elevationM: number;
  criticalThresholdCm: number;
  baseElevationRelativeM: number; // For 3D DEM placement
  sensitivityFactor: number;      // Multiplier for surface runoff pooling into this depression
  coordinates3D: [number, number, number]; // [x, y, z] for 3D DEM pinpointing
  actionProtocol: string;
}

export interface StationCatchmentProfile {
  stationId: string;
  stationName: string;
  subdivision: string;
  catchmentAreaKm2: number;
  gravityDrainageCapacityMmH: number; // Municipal stormwater pipe capacity (mm/h)
  rationalRunoffCoeffC: number;        // Catchment runoff coefficient (0 to 1)
  
  // Horton Infiltration Equation: f(t) = fc + (f0 - fc) * exp(-k * t)
  hortonInitialF0: number; // Initial dry infiltration rate (mm/h)
  hortonSteadyFc: number;   // Saturated hydraulic conductivity (mm/h)
  hortonDecayK: number;     // Infiltration exhaustion rate (1/hr)
  
  // Tidal / Sea boundary condition (if coastal)
  isCoastalCatchment: boolean;
  springTideLevelM?: number;
  
  // Critical Infrastructure Hotspots
  hotspots: CriticalInfrastructureHotspot[];
  
  // Tactical mitigation procedures
  emergencyProtocols: string[];
}

export const STATION_CATCHMENT_REGISTRY: Record<string, StationCatchmentProfile> = {
  BOM_SANTACRUZ: {
    stationId: 'BOM_SANTACRUZ',
    stationName: 'Mumbai (Santacruz)',
    subdivision: 'Konkan & Goa',
    catchmentAreaKm2: 437.7,
    gravityDrainageCapacityMmH: 25.0, // Mumbai municipal stormwater design limit
    rationalRunoffCoeffC: 0.85,       // Dense urban paved impervious surface
    hortonInitialF0: 25.0,
    hortonSteadyFc: 4.8,
    hortonDecayK: 1.8,
    isCoastalCatchment: true,
    springTideLevelM: 4.2,
    hotspots: [
      {
        id: 'BOM_MILAN_SUBWAY',
        name: 'Milan Subway Underpass (Santacruz West)',
        type: 'SUBWAY_UNDERPASS',
        locationDescription: 'Arterial vehicular link under Western Railway tracks connecting East & West',
        elevationM: 3.2,
        criticalThresholdCm: 25.0,
        baseElevationRelativeM: -2.8,
        sensitivityFactor: 2.4,
        coordinates3D: [-12, -2.2, 14],
        actionProtocol: 'Barricade underpass immediately. Divert traffic to Gokhale & Thackeray Flyovers.',
      },
      {
        id: 'BOM_RUNWAY_0927',
        name: 'Chhatrapati Shivaji Maharaj Airport (Runway 09/27)',
        type: 'AIRPORT_RUNWAY',
        locationDescription: 'Primary cross-runway intersecting Mithi River culvert corridor',
        elevationM: 11.5,
        criticalThresholdCm: 4.5,
        baseElevationRelativeM: 0.8,
        sensitivityFactor: 0.45,
        coordinates3D: [8, 0.4, -6],
        actionProtocol: 'Issue standing water NOTAM to ATC. Deploy runway sweeper blowers; inspect friction index.',
      },
      {
        id: 'BOM_WEH_KALANAGAR',
        name: 'Western Express Highway (Kalanagar Junction)',
        type: 'EXPRESSWAY_JUNCTION',
        locationDescription: 'Bandra-Kurla Complex expressway interchange & low-lying silt basin',
        elevationM: 7.8,
        criticalThresholdCm: 15.0,
        baseElevationRelativeM: -0.6,
        sensitivityFactor: 1.2,
        coordinates3D: [18, -0.4, 22],
        actionProtocol: 'Open contra-flow lanes; restrict heavy commercial trucks from low-lying curb lanes.',
      },
      {
        id: 'BOM_MITHI_OUTFALL',
        name: 'Mithi River Drainage Flume & Sluice Gates',
        type: 'DRAINAGE_OUTPOUR',
        locationDescription: 'Mahim Creek tidal outlet discharge flume',
        elevationM: 1.8,
        criticalThresholdCm: 20.0,
        baseElevationRelativeM: -3.5,
        sensitivityFactor: 2.8,
        coordinates3D: [-28, -3.1, -18],
        actionProtocol: 'Trigger reverse-flow flap gates if Arabian Sea tide exceeds 3.8m. Engage 6x 1000m³/h dewatering pumps.',
      },
      {
        id: 'BOM_KURLA_LBS',
        name: 'Kurla West (LBS Marg & Kranti Nagar)',
        type: 'RAILWAY_TRACK_BASIN',
        locationDescription: 'Central Railway suburban tracks & natural stormwater depression',
        elevationM: 5.4,
        criticalThresholdCm: 18.0,
        baseElevationRelativeM: -1.6,
        sensitivityFactor: 1.9,
        coordinates3D: [26, -1.2, 6],
        actionProtocol: 'Halt suburban slow trains between Sion and Kurla. Sound evacuation siren for Kranti Nagar riverbanks.',
      },
      {
        id: 'BOM_CLEAVELAND_PUMP',
        name: 'Stormwater Dewatering Pumping Station #4',
        type: 'PUMPING_STATION',
        locationDescription: 'Heavy-duty storm runoff pump station discharging into Arabian Sea',
        elevationM: 4.0,
        criticalThresholdCm: 30.0,
        baseElevationRelativeM: -1.0,
        sensitivityFactor: 0.8,
        coordinates3D: [-32, -0.8, 8],
        actionProtocol: 'Operate all 8 diesel-electric centrifugal generators at 100% duty cycle.',
      },
    ],
    emergencyProtocols: [
      'Activate MCGM Disaster Management Cell Level-3 Standard Operating Procedure.',
      'Coordinate municipal drainage flap gates with the Mumbai Port Trust tide table.',
      'Deploy 4x NDRF water rescue battalions along the Mithi River corridor.',
      'Send cellular cell-broadcast alerts to 5.2 million residents across Santacruz, Kurla, and Bandra.',
    ],
  },

  LKN_AMAUSI: {
    stationId: 'LKN_AMAUSI',
    stationName: 'Lucknow (Amausi)',
    subdivision: 'East Uttar Pradesh',
    catchmentAreaKm2: 512.0,
    gravityDrainageCapacityMmH: 22.0,
    rationalRunoffCoeffC: 0.72,
    hortonInitialF0: 32.0,
    hortonSteadyFc: 6.2,
    hortonDecayK: 1.4,
    isCoastalCatchment: false,
    hotspots: [
      {
        id: 'LKN_CHARBAGH_BASIN',
        name: 'Charbagh Railway Station Low Track Basin',
        type: 'RAILWAY_TRACK_BASIN',
        locationDescription: 'Sub-surface track yards receiving stormwater from central Lucknow',
        elevationM: 118.0,
        criticalThresholdCm: 22.0,
        baseElevationRelativeM: -2.2,
        sensitivityFactor: 2.1,
        coordinates3D: [14, -1.8, 12],
        actionProtocol: 'Switch signaling to manual interlocking; restrict locomotive movements across yard basin.',
      },
      {
        id: 'LKN_GOMTI_MARGIN',
        name: 'Gomti River Floodplain Embankment',
        type: 'DRAINAGE_OUTPOUR',
        locationDescription: 'Riverfront embankment where urban drain nullahs discharge',
        elevationM: 114.5,
        criticalThresholdCm: 35.0,
        baseElevationRelativeM: -3.0,
        sensitivityFactor: 2.6,
        coordinates3D: [-20, -2.4, -16],
        actionProtocol: 'Inspect Gomti Barrage gates; clear trapped silt and water hyacinth debris.',
      },
      {
        id: 'LKN_AMAUSI_AIRPORT',
        name: 'Chaudhary Charan Singh Airport Taxiway B',
        type: 'AIRPORT_RUNWAY',
        locationDescription: 'Southern perimeter apron and drainage swale',
        elevationM: 122.0,
        criticalThresholdCm: 5.0,
        baseElevationRelativeM: 0.5,
        sensitivityFactor: 0.5,
        coordinates3D: [-10, 0.3, -4],
        actionProtocol: 'Inspect high-speed taxiway turnoffs; clear storm grates along runway margins.',
      },
      {
        id: 'LKN_HAZRATGANJ_CULVERT',
        name: 'Hazratganj Storm Drainage Culvert #2',
        type: 'SUBWAY_UNDERPASS',
        locationDescription: 'Deep Victorian brick masonry storm conduit under main commercial district',
        elevationM: 120.2,
        criticalThresholdCm: 18.0,
        baseElevationRelativeM: -1.4,
        sensitivityFactor: 1.6,
        coordinates3D: [6, -1.0, 20],
        actionProtocol: 'Deploy suction jetting machines to remove urban plastic blockages.',
      },
    ],
    emergencyProtocols: [
      'Trigger Lucknow Municipal Corporation (LMC) urban drainage emergency roster.',
      'Monitor Gomti River stage gauges at Gaughat and Hanuman Setu.',
      'Pre-position dewatering pumps at Charbagh and Alambagh low points.',
    ],
  },

  SHL_CHERRAPUNJI: {
    stationId: 'SHL_CHERRAPUNJI',
    stationName: 'Cherrapunji (Sohra)',
    subdivision: 'Assam & Meghalaya',
    catchmentAreaKm2: 185.0,
    gravityDrainageCapacityMmH: 65.0, // High natural gorge slope gradient
    rationalRunoffCoeffC: 0.94,       // Bare sandstone and karst plateaus
    hortonInitialF0: 12.0,            // Thin mountain topsoil
    hortonSteadyFc: 2.1,
    hortonDecayK: 3.2,
    isCoastalCatchment: false,
    hotspots: [
      {
        id: 'SHL_NOHKALIKAI_FLUME',
        name: 'Nohkalikai Escarpment Torrent Flume',
        type: 'DRAINAGE_OUTPOUR',
        locationDescription: 'Headwaters of 340m vertical plunge waterfall into Bangladesh plains',
        elevationM: 1290.0,
        criticalThresholdCm: 75.0,
        baseElevationRelativeM: -5.0,
        sensitivityFactor: 3.2,
        coordinates3D: [-24, -4.2, -10],
        actionProtocol: 'Cordon tourist viewing platforms; flash flood warning for downstream Sylhet plains.',
      },
      {
        id: 'SHL_SOHRA_ROAD_KM14',
        name: 'Sohra-Shella Mountain Highway (Km 14 Landslip Zone)',
        type: 'EXPRESSWAY_JUNCTION',
        locationDescription: 'Steep colluvial slope prone to debris flow and rockfalls',
        elevationM: 1315.0,
        criticalThresholdCm: 35.0,
        baseElevationRelativeM: 2.2,
        sensitivityFactor: 1.8,
        coordinates3D: [16, 1.8, 18],
        actionProtocol: 'Halt all heavy commercial traffic. Position PWD JCB bulldozers for debris clearance.',
      },
      {
        id: 'SHL_MAWSMAI_GORGE',
        name: 'Mawsmai Limestone Subterranean Channel',
        type: 'SUBWAY_UNDERPASS',
        locationDescription: 'Karst cave system where surface runoff plunges underground',
        elevationM: 1240.0,
        criticalThresholdCm: 45.0,
        baseElevationRelativeM: -3.8,
        sensitivityFactor: 2.4,
        coordinates3D: [-14, -3.2, 22],
        actionProtocol: 'Seal tourist cave entrances; monitor hydrostatic cave pressure.',
      },
    ],
    emergencyProtocols: [
      'Issue Trans-Boundary Flash Flood warning to Flood Forecasting & Warning Centre (FFWC) Bangladesh.',
      'Alert Meghalaya State Disaster Management Authority (SDMA) on escarpment debris flows.',
      'Maintain continuous satellite VHF telemetry links with Sohra AWS.',
    ],
  },

  LEH_LADAKH: {
    stationId: 'LEH_LADAKH',
    stationName: 'Leh Ladakh',
    subdivision: 'Jammu & Kashmir and Ladakh',
    catchmentAreaKm2: 320.0,
    gravityDrainageCapacityMmH: 15.0, // High vulnerability to cloudburst debris flows
    rationalRunoffCoeffC: 0.78,       // Unvegetated glacial scree and moraine
    hortonInitialF0: 18.0,
    hortonSteadyFc: 3.5,
    hortonDecayK: 2.4,
    isCoastalCatchment: false,
    hotspots: [
      {
        id: 'LEH_CHOGLAMSAR_FAN',
        name: 'Choglamsar Alluvial Debris Fan',
        type: 'DRAINAGE_OUTPOUR',
        locationDescription: 'Historic 2010 cloudburst debris flow channel entering Indus River',
        elevationM: 3480.0,
        criticalThresholdCm: 15.0,
        baseElevationRelativeM: -2.0,
        sensitivityFactor: 2.8,
        coordinates3D: [-18, -1.6, 14],
        actionProtocol: 'Sound civil defense sirens; initiate immediate uphill evacuation to designated safety zones.',
      },
      {
        id: 'LEH_AIRPORT_RUNWAY',
        name: 'Kushok Bakula Rimpochee Airport (Runway 07)',
        type: 'AIRPORT_RUNWAY',
        locationDescription: 'High-altitude military & civilian runway surrounded by alluvial bluffs',
        elevationM: 3514.0,
        criticalThresholdCm: 4.0,
        baseElevationRelativeM: 0.6,
        sensitivityFactor: 0.4,
        coordinates3D: [12, 0.4, -8],
        actionProtocol: 'Halt all aircraft operations; divert inbound flights to Srinagar/Chandigarh.',
      },
      {
        id: 'LEH_KHARDUNG_CULVERT',
        name: 'Khardung La Approach Scree Gutter',
        type: 'EXPRESSWAY_JUNCTION',
        locationDescription: 'Mountain highway culvert susceptible to glacial scree damming',
        elevationM: 3620.0,
        criticalThresholdCm: 20.0,
        baseElevationRelativeM: 3.4,
        sensitivityFactor: 2.0,
        coordinates3D: [22, 2.8, 16],
        actionProtocol: 'Deploy Border Roads Organisation (BRO) Project Himank road opening units.',
      },
    ],
    emergencyProtocols: [
      'Activate Ladakh Autonomous Hill Development Council (LAHDC) Cloudburst Protocol.',
      'Deploy Indian Army 14 Corps flood rescue detachments.',
      'Inspect check dams and gabion retention walls across north Leh nullahs.',
    ],
  },

  PUN_SHIVAJINAGAR: {
    stationId: 'PUN_SHIVAJINAGAR',
    stationName: 'Pune (Shivajinagar)',
    subdivision: 'Madhya Maharashtra',
    catchmentAreaKm2: 330.0,
    gravityDrainageCapacityMmH: 28.0,
    rationalRunoffCoeffC: 0.80,
    hortonInitialF0: 28.0,
    hortonSteadyFc: 5.5,
    hortonDecayK: 1.6,
    isCoastalCatchment: false,
    hotspots: [
      {
        id: 'PUN_PULACHIWADI_BASIN',
        name: 'Mutha River Pulachiwadi Low Riverbed Settlement',
        type: 'DRAINAGE_OUTPOUR',
        locationDescription: 'Low-lying riparian flood basin beneath Z-Bridge',
        elevationM: 554.0,
        criticalThresholdCm: 25.0,
        baseElevationRelativeM: -2.8,
        sensitivityFactor: 2.5,
        coordinates3D: [-16, -2.2, 10],
        actionProtocol: 'Evacuate riverside vehicles and temporary settlements; alert Khadakwasla Dam control.',
      },
      {
        id: 'PUN_SHIVAJI_UNDERPASS',
        name: 'Shivajinagar Railway Subway Underpass',
        type: 'SUBWAY_UNDERPASS',
        locationDescription: 'Railway subway under Central Line connecting Wakdewadi',
        elevationM: 558.0,
        criticalThresholdCm: 20.0,
        baseElevationRelativeM: -1.8,
        sensitivityFactor: 2.1,
        coordinates3D: [8, -1.4, -14],
        actionProtocol: 'Close vehicular boom barriers; activate 2x 25HP municipal dewatering pumps.',
      },
      {
        id: 'PUN_SINHAGAD_ROAD',
        name: 'Sinhagad Road (Ekta Nagari Drainage Depression)',
        type: 'EXPRESSWAY_JUNCTION',
        locationDescription: 'Residential arterial corridor receiving overflow from Ambil Odha stream',
        elevationM: 556.5,
        criticalThresholdCm: 30.0,
        baseElevationRelativeM: -1.2,
        sensitivityFactor: 1.8,
        coordinates3D: [-10, -0.9, 24],
        actionProtocol: 'Erect temporary flood deflection sandbag dikes along Ambil Odha.',
      },
    ],
    emergencyProtocols: [
      'Coordinate with Irrigation Department on Khadakwasla Dam discharge rate (cusecs).',
      'Deploy Pune Municipal Corporation (PMC) emergency teams along Mutha River.',
    ],
  },

  JOD_DESERT: {
    stationId: 'JOD_DESERT',
    stationName: 'Jodhpur',
    subdivision: 'West Rajasthan',
    catchmentAreaKm2: 285.0,
    gravityDrainageCapacityMmH: 18.0, // Low drainage density typical of arid terrain
    rationalRunoffCoeffC: 0.65,
    hortonInitialF0: 45.0,            // Sandy dry soil absorbs rapidly initially
    hortonSteadyFc: 4.0,
    hortonDecayK: 2.8,
    isCoastalCatchment: false,
    hotspots: [
      {
        id: 'JOD_MEHRANGARH_RAVINE',
        name: 'Mehrangarh Fort Rock Cut Drainage Chasm',
        type: 'DRAINAGE_OUTPOUR',
        locationDescription: 'Basalt/sandstone scarp channel discharging into Old City walled alleys',
        elevationM: 245.0,
        criticalThresholdCm: 20.0,
        baseElevationRelativeM: 2.4,
        sensitivityFactor: 2.2,
        coordinates3D: [12, 1.8, 8],
        actionProtocol: 'Divert torrent from narrow stepwell gutters into historic water conservation tanks.',
      },
      {
        id: 'JOD_SURPURA_DAM',
        name: 'Surpura Dam Spillway & Supply Canal',
        type: 'DRAINAGE_OUTPOUR',
        locationDescription: 'Key drinking water reservoir intake susceptible to silt flash choking',
        elevationM: 220.0,
        criticalThresholdCm: 40.0,
        baseElevationRelativeM: -2.6,
        sensitivityFactor: 1.7,
        coordinates3D: [-22, -2.0, -18],
        actionProtocol: 'Open bypass spillway sluices; protect water treatment pump intakes.',
      },
      {
        id: 'JOD_RATANADA_DRAIN',
        name: 'Ratanada Storm Trench & Circuit House Basin',
        type: 'SUBWAY_UNDERPASS',
        locationDescription: 'Sub-surface masonry storm canal in civil lines',
        elevationM: 228.0,
        criticalThresholdCm: 18.0,
        baseElevationRelativeM: -1.0,
        sensitivityFactor: 1.5,
        coordinates3D: [4, -0.8, 18],
        actionProtocol: 'Clear sand dunes and windblown scrub obstructing storm grates.',
      },
    ],
    emergencyProtocols: [
      'Activate Jodhpur District Flood Control Cell.',
      'Divert urban runoff into traditional Ranisar and Padamsar stepwell reservoirs.',
    ],
  },
};

/**
 * Helper to retrieve catchment profile by station ID (with fallback to Mumbai)
 */
export function getStationCatchmentProfile(stationId: string): StationCatchmentProfile {
  return STATION_CATCHMENT_REGISTRY[stationId] || STATION_CATCHMENT_REGISTRY['BOM_SANTACRUZ'];
}

/**
 * Real-time Hydrological Calculation Engine:
 * Computes Horton infiltration capacity, drainage surcharge, and ponding depth at each hotspot.
 */
export function computeLiveHydrologicalState(
  profile: StationCatchmentProfile,
  rainRateMmH: number,
  surfaceWaterDepthCm: number,
  elapsedSimMinutes: number
) {
  const tHr = elapsedSimMinutes / 60;
  
  // Horton Infiltration Equation: f(t) = fc + (f0 - fc) * exp(-k * t)
  const currentInfiltrationMmH = profile.hortonSteadyFc + 
    (profile.hortonInitialF0 - profile.hortonSteadyFc) * 
    Math.exp(-profile.hortonDecayK * tHr);

  // Precipitation excess rate: rate at which water cannot infiltrate soil
  const excessRainMmH = Math.max(0, rainRateMmH - currentInfiltrationMmH);

  // Municipal Drainage Capacity Surcharge: Q_excess above gravity pipe limits
  const drainageSurplusMmH = rainRateMmH - profile.gravityDrainageCapacityMmH;
  const isDrainageOverwhelmed = drainageSurplusMmH > 0;

  // Compute live ponding depth and operational hazard severity for each hotspot
  const evaluatedHotspots = profile.hotspots.map((h) => {
    // Local depth calculated from catchment ponding + local depression sensitivity
    const localDepthCm = Number(
      Math.max(
        0,
        surfaceWaterDepthCm * h.sensitivityFactor * (rainRateMmH > 0 ? 1.0 : 0.4)
      ).toFixed(1)
    );

    let severity: HotspotSeverity = 'CLEAR';
    let statusLabel = 'CLEAR / PASSABLE';

    if (localDepthCm >= h.criticalThresholdCm) {
      severity = 'CRITICAL_FLOODED';
      statusLabel = 'CRITICAL / FLOODED (CLOSED)';
    } else if (localDepthCm >= h.criticalThresholdCm * 0.45) {
      severity = 'CAUTION';
      statusLabel = 'WATERLOGGED (CAUTION)';
    }

    return {
      ...h,
      currentDepthCm: localDepthCm,
      severity,
      statusLabel,
    };
  });

  const criticalCount = evaluatedHotspots.filter((h) => h.severity === 'CRITICAL_FLOODED').length;
  const cautionCount = evaluatedHotspots.filter((h) => h.severity === 'CAUTION').length;

  return {
    currentInfiltrationMmH: Number(currentInfiltrationMmH.toFixed(1)),
    excessRainMmH: Number(excessRainMmH.toFixed(1)),
    drainageSurplusMmH: Number(drainageSurplusMmH.toFixed(1)),
    isDrainageOverwhelmed,
    evaluatedHotspots,
    criticalCount,
    cautionCount,
  };
}
