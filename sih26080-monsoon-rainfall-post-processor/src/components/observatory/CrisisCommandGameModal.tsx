import React, { useState, useEffect, useRef } from 'react';
import { CrisisMissionDefinition, CrisisMissionActionState } from './types';
import { 
  ShieldAlert, 
  Clock, 
  Radio, 
  Trophy, 
  Play, 
  RotateCcw, 
  Sparkles, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  Users, 
  Activity, 
  X 
} from 'lucide-react';
import { weatherSynth } from '../../utils/audio';

interface CrisisCommandGameModalProps {
  onClose: () => void;
  onTargetLocationChange?: (lat: number, lon: number) => void;
  isSoundMuted: boolean;
}

export const CRISIS_MISSIONS: CrisisMissionDefinition[] = [
  {
    id: 'MISSION_REMAL',
    title: 'Operation Remal: Super Cyclone Landfall Defense',
    region: 'Bay of Bengal / Sundarbans Coastal Belt',
    timeLimitSec: 45,
    briefing: 'A rapidly intensifying Category 4 cyclone is recurving toward the Sundarbans. NWP models are underestimating storm surge height by 1.8m due to shallow bathymetry smoothing. Deploy radar, recalibrate to GEV Extreme Value bias weights, and issue Red Warnings to evacuate vulnerable coastal sectors before eye landfall.',
    targetLat: 21.8,
    targetLon: 89.2,
    disasterType: 'SUPER_TYPHOON',
    initialThreatPct: 78,
    populationThreatenedM: 4.8,
    optimalActions: {
      radarNeeded: true,
      preferredModel: 'GEV_EXTREME',
      requiresRedAlert: true,
      requiresDrainage: true,
      requiresEvacuation: true,
    },
  },
  {
    id: 'MISSION_MUMBAI_CLOUDBURST',
    title: 'Operation Jal-Rakshak: Mumbai Mega-Cloudburst Inundation',
    region: 'Konkan Coast (Mumbai / Thane / Raigad)',
    timeLimitSec: 40,
    briefing: 'An intense mesoscale offshore vortex over the Arabian Sea is channeling continuous 100+ mm/hr moisture directly into Mumbai during high-tide (+4.8m). Hydrostatic grids are missing the cloudburst core. Deploy X-band radar, activate PINN Physics-Informed post-processing, and dispatch rapid drainage pumps.',
    targetLat: 19.076,
    targetLon: 72.8777,
    disasterType: 'CLOUDBURST',
    initialThreatPct: 84,
    populationThreatenedM: 12.5,
    optimalActions: {
      radarNeeded: true,
      preferredModel: 'PINN_PHYSICS',
      requiresRedAlert: true,
      requiresDrainage: true,
      requiresEvacuation: false,
    },
  },
  {
    id: 'MISSION_WAYANAD_GHATS',
    title: 'Operation Sahyadri: Wayanad Orographic Deluge Alert',
    region: 'Western Ghats Crest (Kerala / Nilgiri Escarpment)',
    timeLimitSec: 40,
    briefing: 'The Somali Jet is slamming into the steep 1,500m Ghats barrier with 65-knot moisture flux. Soil moisture has reached critical saturation (92%). Raw forecasts predict false light drizzle. Override with GEV Extreme bias corrector and sound immediate evacuation sirens to mountain settlements.',
    targetLat: 11.68,
    targetLon: 76.13,
    disasterType: 'OROGRAPHIC_DELUGE',
    initialThreatPct: 82,
    populationThreatenedM: 1.2,
    optimalActions: {
      radarNeeded: true,
      preferredModel: 'GEV_EXTREME',
      requiresRedAlert: true,
      requiresDrainage: false,
      requiresEvacuation: true,
    },
  },
  {
    id: 'MISSION_BREAK_HEATWAVE',
    title: 'Operation Meghdoot: Break-Monsoon Drought Interception',
    region: 'Central India / Vidarbha Cotton Belt',
    timeLimitSec: 35,
    briefing: 'Monsoon Trough has shifted abruptly north to the Himalayan foothills, inducing a catastrophic 20-day dry break. Soil moisture is plummeting, threatening agricultural collapse. Tune AI to Quantile Regression Forest (QRF) to pinpoint localized convective showers and optimize irrigation reservoir releases.',
    targetLat: 20.93,
    targetLon: 77.75,
    disasterType: 'HEATWAVE_DROUGHT',
    initialThreatPct: 65,
    populationThreatenedM: 6.5,
    optimalActions: {
      radarNeeded: false,
      preferredModel: 'QRF_PERCENTILE',
      requiresRedAlert: false,
      requiresDrainage: false,
      requiresEvacuation: false,
    },
  },
];

export const CrisisCommandGameModal: React.FC<CrisisCommandGameModalProps> = ({
  onClose,
  onTargetLocationChange,
  isSoundMuted,
}) => {
  const [selectedMissionIndex, setSelectedMissionIndex] = useState<number>(0);
  const mission = CRISIS_MISSIONS[selectedMissionIndex];

  const [gameState, setGameState] = useState<'BRIEFING' | 'RUNNING' | 'DEBRIEF'>('BRIEFING');
  const [timeLeft, setTimeLeft] = useState<number>(mission.timeLimitSec);

  // Player tactical action state
  const [actions, setActions] = useState<CrisisMissionActionState>({
    xBandRadarDeployed: false,
    aiBiasModel: 'RAW_BASELINE',
    subdivisionAlerts: {
      konkanRed: false,
      ghatsOrange: false,
      bayBengalRed: false,
      vidarbhaYellow: false,
    },
    rapidDrainageDispatched: false,
    cloudburstEvacuationIssued: false,
  });

  const timerRef = useRef<any>(null);

  // Start mission
  const handleStartMission = () => {
    setGameState('RUNNING');
    setTimeLeft(mission.timeLimitSec);
    setActions({
      xBandRadarDeployed: false,
      aiBiasModel: 'RAW_BASELINE',
      subdivisionAlerts: {
        konkanRed: false,
        ghatsOrange: false,
        bayBengalRed: false,
        vidarbhaYellow: false,
      },
      rapidDrainageDispatched: false,
      cloudburstEvacuationIssued: false,
    });

    if (onTargetLocationChange) {
      onTargetLocationChange(mission.targetLat, mission.targetLon);
    }

    if (!isSoundMuted) {
      weatherSynth.playCrisisAlertTone();
    }
  };

  // Timer loop
  useEffect(() => {
    if (gameState === 'RUNNING') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setGameState('DEBRIEF');
            if (!isSoundMuted) {
              weatherSynth.playMissionSuccessFanfare();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, isSoundMuted]);

  // Compute live threat reduction based on actions taken
  const threatReduction = React.useMemo(() => {
    let red = 0;
    if (actions.xBandRadarDeployed) red += 22;
    if (actions.aiBiasModel === mission.optimalActions.preferredModel) red += 35;
    else if (actions.aiBiasModel !== 'RAW_BASELINE') red += 15;

    if (actions.cloudburstEvacuationIssued) red += 18;
    if (actions.rapidDrainageDispatched) red += 15;

    const alertCount = Object.values(actions.subdivisionAlerts).filter(Boolean).length;
    red += alertCount * 8;

    return Math.min(88, red);
  }, [actions, mission]);

  const currentThreatPct = Math.max(8, Math.round(mission.initialThreatPct - threatReduction));
  const civilianSafetyPct = Math.min(100, Math.round(100 - currentThreatPct * 0.9));
  const csiScore = Math.min(0.96, Math.max(0.35, 0.42 + (threatReduction / 100) * 0.52));

  // Handle player actions
  const toggleRadar = () => {
    setActions((prev) => ({ ...prev, xBandRadarDeployed: !prev.xBandRadarDeployed }));
    if (!isSoundMuted) weatherSynth.playRadarScanPing();
  };

  const setModel = (model: CrisisMissionActionState['aiBiasModel']) => {
    setActions((prev) => ({ ...prev, aiBiasModel: model }));
    if (!isSoundMuted) weatherSynth.playConfirmationTone();
  };

  const toggleAlert = (key: keyof CrisisMissionActionState['subdivisionAlerts']) => {
    setActions((prev) => ({
      ...prev,
      subdivisionAlerts: { ...prev.subdivisionAlerts, [key]: !prev.subdivisionAlerts[key] },
    }));
    if (!isSoundMuted) weatherSynth.playCrisisAlertTone();
  };

  const toggleDrainage = () => {
    setActions((prev) => ({ ...prev, rapidDrainageDispatched: !prev.rapidDrainageDispatched }));
    if (!isSoundMuted) weatherSynth.playConfirmationTone();
  };

  const toggleEvacuation = () => {
    setActions((prev) => ({ ...prev, cloudburstEvacuationIssued: !prev.cloudburstEvacuationIssued }));
    if (!isSoundMuted) weatherSynth.playCrisisAlertTone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/50 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col text-white font-sans">
        {/* Top Header */}
        <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-950/80 border border-amber-600/60 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black tracking-wide text-white uppercase">
                  Crisis Command Tactical Simulator
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-900/50 text-amber-300 border border-amber-600/40">
                  {gameState === 'RUNNING' ? 'LIVE OPERATION' : gameState === 'DEBRIEF' ? 'DEBRIEFING' : 'READY ROOM'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">{mission.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Mission Scenario Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {CRISIS_MISSIONS.map((m, idx) => (
              <button
                key={m.id}
                disabled={gameState === 'RUNNING'}
                onClick={() => {
                  setSelectedMissionIndex(idx);
                  setGameState('BRIEFING');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedMissionIndex === idx
                    ? 'bg-amber-500 text-slate-950 shadow-lg'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                } ${gameState === 'RUNNING' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {m.title.split(':')[0]}
              </button>
            ))}
          </div>

          {/* GAME STATE 1: BRIEFING */}
          {gameState === 'BRIEFING' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-amber-400 font-bold uppercase flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Synoptic Situation Brief
                  </span>
                  <span className="text-slate-400">Target Region: {mission.region}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{mission.briefing}</p>

                <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/80 text-center font-mono text-[11px]">
                  <div className="bg-slate-900/80 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Baseline Threat</span>
                    <span className="text-rose-400 font-bold text-sm">{mission.initialThreatPct}%</span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Threatened Civilians</span>
                    <span className="text-amber-300 font-bold text-sm">{mission.populationThreatenedM} Million</span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Operational Window</span>
                    <span className="text-cyan-300 font-bold text-sm">{mission.timeLimitSec} Seconds</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={handleStartMission}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  Initiate Crisis Command
                </button>
              </div>
            </div>
          )}

          {/* GAME STATE 2: RUNNING LIVE OPERATION */}
          {gameState === 'RUNNING' && (
            <div className="space-y-4">
              {/* Telemetry Bar (Timer + Threat Gauge + Safety Meter) */}
              <div className="grid grid-cols-3 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 text-center font-mono">
                {/* Timer */}
                <div className="flex flex-col items-center justify-center">
                  <span className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    Time Remaining
                  </span>
                  <span className={`text-xl font-black mt-0.5 ${timeLeft <= 10 ? 'text-rose-500 animate-ping' : 'text-cyan-400'}`}>
                    00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                  </span>
                </div>

                {/* Threat Gauge */}
                <div className="flex flex-col items-center justify-center border-x border-slate-800 px-2">
                  <span className="text-[10px] text-slate-400 uppercase">Atmospheric Threat</span>
                  <span className={`text-xl font-black mt-0.5 ${currentThreatPct > 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {currentThreatPct}%
                  </span>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full transition-all duration-300 ${currentThreatPct > 50 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${currentThreatPct}%` }}
                    />
                  </div>
                </div>

                {/* Civilian Safety */}
                <div className="flex flex-col items-center justify-center">
                  <span className="text-[10px] text-slate-400 uppercase">Civilian Safety</span>
                  <span className="text-xl font-black text-emerald-400 mt-0.5">{civilianSafetyPct}%</span>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${civilianSafetyPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Tactical Control Actions Deck */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Action 1: Deploy Doppler Radar */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold block text-white flex items-center gap-1.5">
                      <Radio className="w-4 h-4 text-cyan-400" />
                      Mobile X-Band Doppler Radar
                    </span>
                    <span className="text-[10px] text-slate-400">Expose convective cores in blind zones (+22% confidence)</span>
                  </div>
                  <button
                    onClick={toggleRadar}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      actions.xBandRadarDeployed
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {actions.xBandRadarDeployed ? 'DEPLOYED' : 'DEPLOY'}
                  </button>
                </div>

                {/* Action 2: Rapid Drainage Pump Dispatch */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold block text-white flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-sky-400" />
                      Rapid Drainage Taskforce
                    </span>
                    <span className="text-[10px] text-slate-400">Prevent coastal storm surge waterlogging (-15% flood threat)</span>
                  </div>
                  <button
                    onClick={toggleDrainage}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      actions.rapidDrainageDispatched
                        ? 'bg-sky-500 text-slate-950 shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {actions.rapidDrainageDispatched ? 'ACTIVE' : 'DISPATCH'}
                  </button>
                </div>

                {/* Action 3: Evacuate Settlements */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold block text-white flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-rose-400" />
                      Civilian Evacuation Order
                    </span>
                    <span className="text-[10px] text-slate-400">Relocate mountain slopes & tidal lowlands (+18% safety)</span>
                  </div>
                  <button
                    onClick={toggleEvacuation}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      actions.cloudburstEvacuationIssued
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {actions.cloudburstEvacuationIssued ? 'EVACUATING' : 'EVACUATE'}
                  </button>
                </div>

                {/* Action 4: AI Model Selection */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="text-xs font-bold block text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    AI Model Calibration Strategy
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'GEV_EXTREME', name: 'GEV Peak' },
                      { id: 'PINN_PHYSICS', name: 'PINN' },
                      { id: 'QRF_PERCENTILE', name: 'QRF' },
                    ].map((mod) => (
                      <button
                        key={mod.id}
                        onClick={() => setModel(mod.id as any)}
                        className={`py-1 rounded text-[10px] font-bold font-mono transition-all ${
                          actions.aiBiasModel === mod.id
                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        {mod.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Met Subdivision Red/Orange Warnings */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-300 font-mono uppercase flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Subdivision Warning Broadcasts
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'konkanRed', label: 'Konkan Red Alert' },
                    { key: 'ghatsOrange', label: 'Ghats Orange Watch' },
                    { key: 'bayBengalRed', label: 'Bay Bengal Cyclone Red' },
                    { key: 'vidarbhaYellow', label: 'Vidarbha Heat Advisory' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => toggleAlert(item.key as any)}
                      className={`p-2 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                        (actions.subdivisionAlerts as any)[item.key]
                          ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-md'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* GAME STATE 3: DEBRIEFING */}
          {gameState === 'DEBRIEF' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-5 rounded-xl border border-emerald-500/50 text-center space-y-3">
                <Trophy className="w-12 h-12 text-amber-400 mx-auto animate-bounce" />
                <h4 className="text-base font-black text-white uppercase tracking-wider">
                  Operational Cycle Completed
                </h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  {civilianSafetyPct > 80
                    ? 'Exemplary synoptic command. Model recalibration and rapid radar deployment successfully mitigated catastrophic false-negative flood warnings.'
                    : 'Mission concluded with marginal forecast skill. Adjusting model weights earlier will improve lead-time.'}
                </p>

                {/* Score Summary Grid */}
                <div className="grid grid-cols-3 gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800 text-center font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Critical Success Index</span>
                    <span className="text-base font-bold text-emerald-400">{(csiScore * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Civilian Safety</span>
                    <span className="text-base font-bold text-cyan-300">{civilianSafetyPct}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Final Threat Level</span>
                    <span className="text-base font-bold text-amber-400">{currentThreatPct}%</span>
                  </div>
                </div>

                <div className="inline-block px-3 py-1 rounded-full bg-amber-900/40 border border-amber-500/50 text-amber-300 font-mono text-xs font-bold">
                  Awarded Title: {civilianSafetyPct > 85 ? 'Master Synoptic Director' : 'Senior Crisis Meteorologist'}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={handleStartMission}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Replay Operation
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            WMO Standard Verification Metrics Integrated
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 font-bold text-white transition-colors"
          >
            Close Command
          </button>
        </div>
      </div>
    </div>
  );
};
