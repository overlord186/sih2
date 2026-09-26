import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as THREE from 'three';
import { Volume2, VolumeX, SkipForward, RotateCcw, ArrowUpRight, Sparkles, Mountain, Droplets, Bot, Waves, Plus, Minus, Activity, Sun, Zap, Wind, Compass, Sliders, RefreshCw, ShieldCheck, AlertTriangle, AlertOctagon, Info, Eye, X, Camera, Video, Film, Aperture, Maximize2, Grid, ZoomIn, ZoomOut, Move, Navigation, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, CloudRain } from 'lucide-react';
import { GlassCondensationOverlay } from './GlassCondensationOverlay';
import { DopplerRadarWidget } from './DopplerRadarWidget';
import { VolumetricFreefall3D } from './VolumetricFreefall3D';

interface CinematicIntroProps {
  onComplete: () => void;
  isAudioMuted?: boolean;
  onToggleAudio?: () => void;
}

// Visual timeline durations (in seconds)
const PEAKS_RISE_DURATION = 3.2; // Two mountain peaks expand amidst billowing clouds
const WATERFALL_SURGE_DURATION = 3.0; // Water cascades down from between the peaks
const TITLE_REVEAL_DURATION = 5.8; // "SAMVARTKA AI" smoothly appears with zero wiggling & full UI
const TOTAL_DURATION = PEAKS_RISE_DURATION + WATERFALL_SURGE_DURATION + TITLE_REVEAL_DURATION; // 12.0s

// Floating 3D faceted asteroid/crystal rock (matching video's floating rocks)
interface FloatingRock {
  x: number;
  y: number;
  z: number;
  baseRadius: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  rotSpeedX: number;
  rotSpeedY: number;
  rotSpeedZ: number;
  driftVx: number;
  driftVy: number;
  vertices: { x: number; y: number; z: number }[];
  faces: number[][];
}

// Waterfall stream particle
interface WaterParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
}

// Waterfall mist / foam vapor particle
interface MistParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  growth: number;
}

// Rising air bubbles in puddle/floodwater
interface WaterBubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  wobbleSpeed: number;
  wobblePhase: number;
}

// Surface splash droplet particles
interface SplashDroplet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

export function CinematicIntro({ onComplete, isAudioMuted, onToggleAudio }: CinematicIntroProps) {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const mountainCanvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [currentPhase, setCurrentPhase] = useState<'peaks' | 'waterfall' | 'reveal'>('peaks');
  const [isMuted, setIsMuted] = useState<boolean>(isAudioMuted ?? true); // Sound defaults to muted until user clicks sound button
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  const [isPlunging, setIsPlunging] = useState<boolean>(false);
  const isPlungingRef = useRef<boolean>(false);
  const [floodDepth, setFloodDepth] = useState<number>(0);
  const [isFloodSurging, setIsFloodSurging] = useState<boolean>(false);
  const isFloodSurgingRef = useRef<boolean>(false);
  isFloodSurgingRef.current = isFloodSurging;
  const lastReportedFloodRef = useRef<number>(0);

  // Sync with prop if changed from outside
  useEffect(() => {
    if (typeof isAudioMuted === 'boolean') {
      setIsMuted(isAudioMuted);
      isMutedRef.current = isAudioMuted;
    }
  }, [isAudioMuted]);

  // Time-of-Day Lighting Presets: 'dawn' | 'monsoon' | 'night'
  const [timeOfDay, setTimeOfDay] = useState<'dawn' | 'monsoon' | 'night'>('monsoon');
  const timeOfDayRef = useRef<'dawn' | 'monsoon' | 'night'>('monsoon');
  timeOfDayRef.current = timeOfDay;

  // Lens Condensation & Screen Defogging & Ultra Clarity Mode
  const [showCondensation, setShowCondensation] = useState<boolean>(false);
  const [isUltraClarity, setIsUltraClarity] = useState<boolean>(true);
  const isUltraClarityRef = useRef<boolean>(true);
  isUltraClarityRef.current = isUltraClarity;
  const [showWaterMeterDeck, setShowWaterMeterDeck] = useState<boolean>(false);
  const cameraTremorRef = useRef<number>(0);
  const [activeWeatherPreset, setActiveWeatherPreset] = useState<'clear' | 'monsoon' | 'squall' | 'surge'>('monsoon');

  // Dynamic 3D Rain Particle Simulation ('off' | 'drizzle' | 'monsoon')
  const [rainMode, setRainMode] = useState<'off' | 'drizzle' | 'monsoon'>('monsoon');
  const rainModeRef = useRef<'off' | 'drizzle' | 'monsoon'>('monsoon');
  rainModeRef.current = rainMode;

  const toggleRain = useCallback(() => {
    setRainMode(prev => {
      const next = prev === 'off' ? 'drizzle' : prev === 'drizzle' ? 'monsoon' : 'off';
      rainModeRef.current = next;
      return next;
    });
  }, []);

  // 65mm Cinema Camera Macro Focus vs Landscape Infinity Mode
  const [isMacroFocus, setIsMacroFocus] = useState<boolean>(true);
  const isMacroFocusRef = useRef<boolean>(true);
  isMacroFocusRef.current = isMacroFocus;

  // 4K Cinema Video Camera System: Drone Flight, Handheld Steadicam, Vista Panorama, Telephoto Macro, Free Roam
  type CameraCineMode = 'drone' | 'handheld' | 'vista' | 'telephoto' | 'free';
  const [cameraCineMode, setCameraCineMode] = useState<CameraCineMode>('drone');
  const cameraCineModeRef = useRef<CameraCineMode>('drone');
  cameraCineModeRef.current = cameraCineMode;

  // Free camera exploration: Zoom (to and fro), Pan (left/right, up/down), and Orbit
  const userZoomRef = useRef<number>(0); // -24 (zoom in) to +75 (wide zoom out)
  const [userZoomPct, setUserZoomPct] = useState<number>(100);
  const userPanXRef = useRef<number>(0); // -60 to +60
  const userPanYRef = useRef<number>(0); // -30 to +45
  const userOrbitYawRef = useRef<number>(0); // radians
  const userOrbitPitchRef = useRef<number>(0); // radians

  const handleZoom = useCallback((delta: number) => {
    cameraCineModeRef.current = 'free';
    setCameraCineMode('free');
    userZoomRef.current = THREE.MathUtils.clamp(userZoomRef.current + delta, -24, 75);
    const pct = Math.round((34 / (34 + userZoomRef.current)) * 100);
    setUserZoomPct(pct);
  }, []);

  const handlePan = useCallback((dx: number, dy: number) => {
    cameraCineModeRef.current = 'free';
    setCameraCineMode('free');
    userPanXRef.current = THREE.MathUtils.clamp(userPanXRef.current + dx, -60, 60);
    userPanYRef.current = THREE.MathUtils.clamp(userPanYRef.current + dy, -30, 45);
  }, []);

  const handleResetCamera = useCallback(() => {
    userZoomRef.current = 0;
    userPanXRef.current = 0;
    userPanYRef.current = 0;
    userOrbitYawRef.current = 0;
    userOrbitPitchRef.current = 0;
    setUserZoomPct(100);
    cameraCineModeRef.current = 'drone';
    setCameraCineMode('drone');
  }, []);

  // Cinema Lens Focal Length (mm) & Perspective Rack-Focus
  type FocalLength = 24 | 35 | 50 | 85;
  const [focalLength, setFocalLength] = useState<FocalLength>(35);
  const focalLengthRef = useRef<FocalLength>(35);
  focalLengthRef.current = focalLength;

  const [hudToast, setHudToast] = useState<string | null>(null);
  const hudToastTimerRef = useRef<any>(null);

  const triggerHudToast = useCallback((msg: string) => {
    setHudToast(msg);
    if (hudToastTimerRef.current) clearTimeout(hudToastTimerRef.current);
    hudToastTimerRef.current = setTimeout(() => {
      setHudToast(null);
    }, 2500);
  }, []);

  const handleSelectFocalLength = useCallback((fl: FocalLength) => {
    setFocalLength(fl);
    focalLengthRef.current = fl;
    const label = fl === 24 ? '24mm Ultra-Wide (72° Field of View)' 
      : fl === 35 ? '35mm Cinema Wide (54° Field of View)' 
      : fl === 50 ? '50mm Standard Prime (40° Field of View)' 
      : '85mm Telephoto Portrait (26° Field of View)';
    triggerHudToast(`LENS: ${label}`);
  }, [triggerHudToast]);

  const handleToggleFilmGrain = useCallback(() => {
    setShowFilmGrain(prev => {
      const next = !prev;
      triggerHudToast(`FILM GRAIN: ${next ? '35mm 4K SENSOR GRAIN [ACTIVE]' : 'CLEAN DIGITAL SENSOR [OFF]'}`);
      return next;
    });
  }, [triggerHudToast]);

  const handleToggleRain = useCallback(() => {
    setRainMode(prev => {
      const next = prev === 'off' ? 'drizzle' : prev === 'drizzle' ? 'monsoon' : 'off';
      rainModeRef.current = next;
      const label = next === 'monsoon' ? 'MONSOON DOWNPOUR (120 mm/hr)'
        : next === 'drizzle' ? 'LIGHT MOUNTAIN DRIZZLE (4 mm/hr)'
        : 'CLEAR DRY SKY (0 mm/hr)';
      triggerHudToast(`3D PRECIPITATION: ${label}`);
      return next;
    });
  }, [triggerHudToast]);

  // Viewfinder Overlay: 'clean' | 'cinema' (2.39:1 widescreen matte) | 'director' (pro camera HUD)
  const [viewfinderMode, setViewfinderMode] = useState<'clean' | 'cinema' | 'director'>('director');
  const [showFilmGrain, setShowFilmGrain] = useState<boolean>(true);
  const [showRuleOfThirds, setShowRuleOfThirds] = useState<boolean>(false);
  const vuBarRef = useRef<HTMLDivElement | null>(null);
  const vuTextRef = useRef<HTMLSpanElement | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);

  // User Interactive Flood Water Physics & Controls (Unified Real-Time Hydrologic Gauge)
  const [isCircleHubOpen, setIsCircleHubOpen] = useState<boolean>(false);
  const [waterLevelRatio, setWaterLevelRatio] = useState<number>(0.35); // 0.0 to 1.0 (starts at 0.35 - Regulated Flow)
  const waterLevelRatioRef = useRef<number>(0.35);
  waterLevelRatioRef.current = waterLevelRatio;
  const [isAutoSurging, setIsAutoSurging] = useState<boolean>(false);
  const isAutoSurgingRef = useRef<boolean>(false);
  isAutoSurgingRef.current = isAutoSurging;

  // Real-time bidirectional water level setter that updates 3D mesh and state simultaneously
  const handleSetWaterLevel = useCallback((val: number) => {
    const clamped = Math.max(0.0, Math.min(1.0, Math.round(val * 100) / 100));
    setWaterLevelRatio(clamped);
    waterLevelRatioRef.current = clamped;
    setIsAutoSurging(false);
    isAutoSurgingRef.current = false;
    triggerWaterSplashFnRef.current?.(0, 0, 1.4 + clamped * 1.2);
  }, []);

  const [waterHoverInfo, setWaterHoverInfo] = useState<{ x: number; y: number; depthM: string; currentMps: string } | null>(null);
  const [floatingLogsCount, setFloatingLogsCount] = useState<number>(0);
  const [recentSplashCount, setRecentSplashCount] = useState<number>(0);
  const [isHoveringWater, setIsHoveringWater] = useState<boolean>(false);

  const triggerWaterSplashFnRef = useRef<((worldX?: number, worldZ?: number, power?: number) => void) | null>(null);
  const dropFloatingObjectFnRef = useRef<(() => void) | null>(null);

  // Interactive Letter Hover & Cursor Tracking
  const [hoveredLetterIndex, setHoveredLetterIndex] = useState<number | null>(null);
  const [letterGlowStrengths, setLetterGlowStrengths] = useState<number[]>(new Array(12).fill(0));
  const letterElementsRef = useRef<(HTMLSpanElement | null)[]>([]);

  // Visible Falling Thunder & Lightning Screen Effects
  const [screenFlash, setScreenFlash] = useState<number>(0);
  const [flashCoords, setFlashCoords] = useState<{ x: number; y: number } | null>(null);
  const lightningCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lightningFlashRef = useRef<number>(0);
  const lightningStrikePointRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const showcaseContainerRef = useRef<HTMLDivElement | null>(null);

  // Active Thunder Strikes & Water Dilution data for canvas rendering
  interface LightningSegment {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    width: number;
    isBranch?: boolean;
  }
  interface LightningSpark {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
  }
  interface WaterDilutionWave {
    id: number;
    cx: number;
    cy: number;
    radius: number;
    maxRadius: number;
    alpha: number;
    filaments: LightningSegment[];
    sparks: LightningSpark[];
  }
  interface ActiveStrike {
    id: number;
    segments: LightningSegment[];
    sparks: LightningSpark[];
    waterImpactX: number;
    waterImpactY: number;
    startTime: number;
    duration: number;
  }
  // Realistic Slow Ground Dissipation over all places electricity strikes (rocks, mountain, water, letters)
  interface GroundDissipation {
    id: number;
    originX: number;
    originY: number;
    type: 'water' | 'ground' | 'peak' | 'letter';
    filaments: {
      points: { x: number; y: number }[];
      width: number;
      color: string;
      glowColor: string;
    }[];
    sparks: LightningSpark[];
    radius: number;
    maxRadius: number;
    startTime: number;
    duration: number; // 4800ms - slow dissipation all over the places it has fallen
  }

  // Lingering ionized atmospheric plasma channel that drifts and fades slowly in the air
  interface AtmosphericResidual {
    id: number;
    segments: { x1: number; y1: number; x2: number; y2: number; driftX: number; driftY: number }[];
    startTime: number;
    duration: number;
  }

  const activeStrikesRef = useRef<ActiveStrike[]>([]);
  const waterDilutionsRef = useRef<WaterDilutionWave[]>([]);
  const groundDissipationsRef = useRef<GroundDissipation[]>([]);
  const atmosphericResidualsRef = useRef<AtmosphericResidual[]>([]);

  // Audio synthesis references
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);
  const waterGainRef = useRef<GainNode | null>(null);
  const rainGainRef = useRef<GainNode | null>(null);
  const chimeTriggeredRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(isMuted);
  isMutedRef.current = isMuted;
  const startTimeRef = useRef<number>(performance.now());

  // Deep Procedural Thunder Rumble Sound Synthesizer (Massive volumetric canyon resonance)
  const playThunderRumble = useCallback((index: number) => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const t = ctx.currentTime;

      // 1. Initial High-Voltage Lightning Arc Snap / Crack (55ms sharp transient supersonic burst)
      const crackLen = Math.floor(ctx.sampleRate * 0.075);
      const crackBuf = ctx.createBuffer(1, crackLen, ctx.sampleRate);
      const crackData = crackBuf.getChannelData(0);
      for (let i = 0; i < crackLen; i++) {
        crackData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.016));
      }
      const crackSource = ctx.createBufferSource();
      crackSource.buffer = crackBuf;
      const crackFilter = ctx.createBiquadFilter();
      crackFilter.type = 'bandpass';
      crackFilter.frequency.setValueAtTime(1600 + (index % 4) * 180, t);
      crackFilter.Q.setValueAtTime(3.2, t);

      const crackGain = ctx.createGain();
      crackGain.gain.setValueAtTime(0.95, t);
      crackGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);

      crackSource.connect(crackFilter);
      crackFilter.connect(crackGain);

      // 2. Rolling Canyon Resonance Reverberation (Brownian Noise Wave - Slow 4.8s Dissipation)
      const rumbleLen = Math.floor(ctx.sampleRate * 4.8);
      const rumbleBuf = ctx.createBuffer(1, rumbleLen, ctx.sampleRate);
      const rumbleData = rumbleBuf.getChannelData(0);
      let brownAcc1 = 0;
      let brownAcc2 = 0;
      for (let i = 0; i < rumbleLen; i++) {
        const white1 = Math.random() * 2 - 1;
        const white2 = Math.random() * 2 - 1;
        brownAcc1 = (brownAcc1 + 0.048 * white1) / 1.048;
        brownAcc2 = (brownAcc2 + 0.026 * white2) / 1.026;
        const progress = i / rumbleLen;
        const roll1 = Math.sin(progress * Math.PI * 4) * 0.38 + 0.62;
        const roll2 = Math.sin(progress * Math.PI * 8) * 0.28 + 0.72;
        rumbleData[i] = (brownAcc1 * 4.6 + brownAcc2 * 3.0) * roll1 * roll2;
      }
      const rumbleSource = ctx.createBufferSource();
      rumbleSource.buffer = rumbleBuf;

      const rumbleFilter = ctx.createBiquadFilter();
      rumbleFilter.type = 'lowpass';
      const initialFreq = 290 + (index % 6) * 25;
      rumbleFilter.frequency.setValueAtTime(initialFreq, t);
      rumbleFilter.frequency.exponentialRampToValueAtTime(18, t + 4.5);
      rumbleFilter.Q.setValueAtTime(5.2, t);

      const rumbleGain = ctx.createGain();
      rumbleGain.gain.setValueAtTime(0.001, t);
      rumbleGain.gain.linearRampToValueAtTime(0.98, t + 0.04);
      rumbleGain.gain.exponentialRampToValueAtTime(0.70, t + 0.65);
      rumbleGain.gain.exponentialRampToValueAtTime(0.42, t + 1.85);
      rumbleGain.gain.exponentialRampToValueAtTime(0.18, t + 3.20);
      rumbleGain.gain.exponentialRampToValueAtTime(0.0001, t + 4.75);

      rumbleSource.connect(rumbleFilter);
      rumbleFilter.connect(rumbleGain);

      // 3. Dual Sub-Bass Seismic Shockwave Thump (Deep physical canyon vibration)
      const subOsc1 = ctx.createOscillator();
      subOsc1.type = 'sine';
      subOsc1.frequency.setValueAtTime(50 + (index % 4) * 3, t);
      subOsc1.frequency.exponentialRampToValueAtTime(16, t + 3.2);

      const subGain1 = ctx.createGain();
      subGain1.gain.setValueAtTime(0.001, t);
      subGain1.gain.linearRampToValueAtTime(0.82, t + 0.04);
      subGain1.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
      subOsc1.connect(subGain1);

      const subOsc2 = ctx.createOscillator();
      subOsc2.type = 'triangle';
      subOsc2.frequency.setValueAtTime(36, t);
      subOsc2.frequency.exponentialRampToValueAtTime(12, t + 3.8);

      const subGain2 = ctx.createGain();
      subGain2.gain.setValueAtTime(0.001, t);
      subGain2.gain.linearRampToValueAtTime(0.62, t + 0.06);
      subGain2.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);
      subOsc2.connect(subGain2);

      // 4. Stereo Panning based on letter position across screen (-0.85 to +0.85)
      const panNode = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const panVal = Math.max(-0.85, Math.min(0.85, (index - 5.5) / 6.0));
      if (panNode) {
        panNode.pan.setValueAtTime(panVal, t);
        crackGain.connect(panNode);
        rumbleGain.connect(panNode);
        subGain1.connect(panNode);
        subGain2.connect(panNode);
        panNode.connect(ctx.destination);
      } else {
        crackGain.connect(ctx.destination);
        rumbleGain.connect(ctx.destination);
        subGain1.connect(ctx.destination);
        subGain2.connect(ctx.destination);
      }

      crackSource.start(t);
      rumbleSource.start(t);
      subOsc1.start(t);
      subOsc2.start(t);

      crackSource.stop(t + 0.08);
      rumbleSource.stop(t + 4.8);
      subOsc1.stop(t + 3.25);
      subOsc2.stop(t + 3.85);
    } catch {
      // Audio fallback
    }
  }, []);

  // Spectacular Multi-Bolt Branching Fractal Lightning Strike Generator
  // Spectacular Ultra-Luminous Concentrated Lightning Bolt Generator
  const triggerVisibleThunder = useCallback((index: number) => {
    const container = showcaseContainerRef.current;
    const canvas = lightningCanvasRef.current;
    if (!container || !canvas) return;

    const contRect = container.getBoundingClientRect();
    const el = letterElementsRef.current[index];
    const letterRect = el ? el.getBoundingClientRect() : null;

    // Concentrated target coordinates on the canvas
    const targetMidX = letterRect
      ? (letterRect.left + letterRect.width / 2) - contRect.left
      : contRect.width * (0.2 + (index / 12) * 0.6);
    const targetMidY = letterRect
      ? (letterRect.top + letterRect.height / 2) - contRect.top
      : contRect.height * 0.22;

    const startX = targetMidX + (Math.random() - 0.5) * 20;
    const startY = 0; // Starts directly in the overhead storm cloud

    // Dynamic water surface line based on waterLevelRatio
    const currentRatio = waterLevelRatioRef.current;
    const waterSurfaceY = Math.max(contRect.height * 0.44, contRect.height * (0.86 - currentRatio * 0.38));
    // Concentrated single impact point
    const groundX = targetMidX + (Math.random() - 0.5) * 25;
    const groundY = waterSurfaceY;

    const segments: LightningSegment[] = [];

    // Recursive fractal branch generation with focused authoritative path
    const buildBranch = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      depth: number,
      roughness: number,
      isBranch: boolean
    ) => {
      if (depth <= 0) {
        segments.push({
          x1,
          y1,
          x2,
          y2,
          width: isBranch ? 2.2 : 4.8,
          isBranch,
        });
        return;
      }

      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      const normalX = -dy / (len || 1);
      const normalY = dx / (len || 1);

      const offset = (Math.random() - 0.5) * roughness;
      const displacedX = midX + normalX * offset;
      const displacedY = midY + normalY * offset;

      buildBranch(x1, y1, displacedX, displacedY, depth - 1, roughness * 0.62, isBranch);
      buildBranch(displacedX, displacedY, x2, y2, depth - 1, roughness * 0.62, isBranch);

      // Tightly bound secondary leader branches staying close to main trunk
      if (!isBranch && depth >= 3 && Math.random() < 0.45) {
        const sideSign = Math.random() > 0.5 ? 1 : -1;
        const branchAngle = sideSign * (0.25 + Math.random() * 0.25);
        const branchLen = len * (0.28 + Math.random() * 0.22);
        const cosA = Math.cos(branchAngle);
        const sinA = Math.sin(branchAngle);
        const dirX = (dx / len) * cosA - (dy / len) * sinA;
        const dirY = (dx / len) * sinA + (dy / len) * cosA;
        const bEndX = displacedX + dirX * branchLen;
        const bEndY = displacedY + dirY * branchLen;

        buildBranch(displacedX, displacedY, bEndX, bEndY, 2, roughness * 0.45, true);
      }
    };

    // Single unified master bolt trunk from cloud down through the letter into the water
    buildBranch(startX, startY, targetMidX, targetMidY, 4, 28, false);
    buildBranch(targetMidX, targetMidY, groundX, groundY, 4, 32, false);

    // Closely bound secondary discharge trace
    buildBranch(startX + 4, startY, targetMidX + 3, targetMidY, 3, 18, true);
    buildBranch(targetMidX + 3, targetMidY, groundX + 2, groundY, 3, 22, true);

    const strikeNow = performance.now();

    activeStrikesRef.current.push({
      id: Date.now() + Math.random(),
      segments,
      sparks: [],
      waterImpactX: groundX,
      waterImpactY: groundY,
      startTime: strikeNow,
      duration: 360,
    });

    // Atmospheric Ionized Plasma Channel (Smooth lingering ionized sky trail)
    const atmosphericSegments = segments.filter((_, idx) => idx % 2 === 0).map(s => ({
      x1: s.x1,
      y1: s.y1,
      x2: s.x2,
      y2: s.y2,
      driftX: (Math.random() - 0.5) * 0.15,
      driftY: -0.08 - Math.random() * 0.12,
    }));
    atmosphericResidualsRef.current.push({
      id: Date.now() + Math.random(),
      segments: atmosphericSegments,
      startTime: strikeNow,
      duration: 3200,
    });

    // Helper to generate focused dendritic Lichtenberg ground charge filaments
    const createLichtenbergBranches = (ox: number, oy: number, count: number, maxDist: number, color: string, glowColor: string) => {
      const filaments: { points: { x: number; y: number }[]; width: number; color: string; glowColor: string }[] = [];
      for (let b = 0; b < count; b++) {
        const baseAngle = (b / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const pts: { x: number; y: number }[] = [{ x: ox, y: oy }];
        let curX = ox;
        let curY = oy;
        const steps = 5;
        const stepLen = (maxDist / steps) * (0.8 + Math.random() * 0.3);
        for (let s = 0; s < steps; s++) {
          const a = baseAngle + (Math.random() - 0.5) * 0.5;
          curX += Math.cos(a) * stepLen;
          curY += Math.sin(a) * (stepLen * 0.5);
          pts.push({ x: curX, y: curY });
        }
        filaments.push({
          points: pts,
          width: 2.2 - (b % 2) * 0.8,
          color,
          glowColor,
        });
      }
      return filaments;
    };

    // Concentrated Ground Dissipation at Strike Point (Water Impact Basin)
    groundDissipationsRef.current.push({
      id: Date.now() + Math.random(),
      originX: groundX,
      originY: groundY,
      type: 'water',
      filaments: createLichtenbergBranches(groundX, groundY, 8, 48, '#38bdf8', '#0284c7'),
      sparks: [],
      radius: 8,
      maxRadius: 55,
      startTime: strikeNow,
      duration: 3800,
    });

    // Concentrated Struck Letter Ionization
    groundDissipationsRef.current.push({
      id: Date.now() + Math.random(),
      originX: targetMidX,
      originY: targetMidY,
      type: 'letter',
      filaments: createLichtenbergBranches(targetMidX, targetMidY, 6, 36, '#67e8f9', '#06b6d4'),
      sparks: [],
      radius: 6,
      maxRadius: 42,
      startTime: strikeNow,
      duration: 3200,
    });

    // Trigger 3D Water physical splash in Three.js scene
    const worldNormX = (groundX / contRect.width - 0.5) * 14;
    triggerWaterSplashFnRef.current?.(worldNormX, 0, 3.8);

    // Trigger Camera Tremor
    cameraTremorRef.current = 1.6;

    // Concentrated localized flash coordinates
    setFlashCoords({ x: groundX, y: (targetMidY + groundY) * 0.5 });
    setScreenFlash(0.95);

    // 3D Scene Localized Strike Light (Ultra-vibrant, intense localized illumination)
    lightningStrikePointRef.current = { x: worldNormX, y: 1.0, z: -4.0 };
    lightningFlashRef.current = 3.6;
  }, []);

  // Combined Letter Thunder Trigger (Rumble audio + visible lightning falling over screen & diluting into water)
  const triggerThunderStrike = useCallback((index: number) => {
    playThunderRumble(index);
    triggerVisibleThunder(index);
  }, [playThunderRumble, triggerVisibleThunder]);

  // Realistic Procedural Water Splash Sound Synthesizer
  const playWaterSplashTone = useCallback((strength: number = 1.0) => {
    if (!audioCtxRef.current || isMutedRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      // Synthesize rushing splash noise burst + resonant bubble pop
      const bufferSize = Math.floor(ctx.sampleRate * 0.28);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.065));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900 + Math.random() * 600, ctx.currentTime);

      const gain = ctx.createGain();
      const vol = Math.min(0.25, 0.08 * strength);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      // Pitch-swept resonant bubble oscillator
      const bubble = ctx.createOscillator();
      const bubbleGain = ctx.createGain();
      bubble.type = 'sine';
      bubble.frequency.setValueAtTime(260 + Math.random() * 140, ctx.currentTime);
      bubble.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.18);
      bubbleGain.gain.setValueAtTime(0.06 * strength, ctx.currentTime);
      bubbleGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      bubble.connect(bubbleGain);
      bubbleGain.connect(ctx.destination);

      noise.start();
      bubble.start();
      bubble.stop(ctx.currentTime + 0.22);
    } catch {
      // ignore
    }
  }, []);

  // Update letter glow strengths dynamically with cursor movement
  const handleTitleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const newStrengths = letterElementsRef.current.map((el) => {
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dist = Math.hypot(mouseX - centerX, mouseY - centerY);
      // Proximity radius around each letter
      const radius = 120;
      if (dist > radius) return 0;
      return Math.pow(1 - dist / radius, 1.4);
    });
    setLetterGlowStrengths(newStrengths);
  }, []);

  const handleTitleMouseLeave = useCallback(() => {
    setHoveredLetterIndex(null);
    setLetterGlowStrengths(new Array(11).fill(0));
  }, []);

  const handleReplay = useCallback(() => {
    startTimeRef.current = performance.now();
    setCurrentTime(0);
    setCurrentPhase('peaks');
    chimeTriggeredRef.current = false;
    isPlungingRef.current = false;
    setIsPlunging(false);
    lastReportedFloodRef.current = 0;
    setFloodDepth(0);
  }, []);

    // Atmospheric Cloud Freefall & Grid Descent transition on Enter (Paced for full visibility)
    const handleEnterWaterfall = useCallback(() => {
    if (isPlungingRef.current) return;
    isPlungingRef.current = true;
    setIsPlunging(true);

    // High-altitude cloud piercing whoosh & atmospheric slipstream soundscape with auto fadeout
    if (audioCtxRef.current && !isMutedRef.current) {
      try {
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();
        if (waterGainRef.current) {
          waterGainRef.current.gain.cancelScheduledValues(ctx.currentTime);
          waterGainRef.current.gain.setValueAtTime(waterGainRef.current.gain.value, ctx.currentTime);
          waterGainRef.current.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 0.8);
          waterGainRef.current.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 4.8);
        }
        if (ambientGainRef.current) {
          ambientGainRef.current.gain.cancelScheduledValues(ctx.currentTime);
          ambientGainRef.current.gain.setValueAtTime(ambientGainRef.current.gain.value, ctx.currentTime);
          ambientGainRef.current.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 4.2);
        }
        // Atmospheric slipstream pitch drop & grid descent whoosh
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sawtooth';
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 4.8);

        osc.frequency.setValueAtTime(420, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + 4.8);
        oscGain.gain.setValueAtTime(0.3, ctx.currentTime);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 4.8);

        // Sub-bass touchdown impact oscillator
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(90, ctx.currentTime + 3.8);
        subOsc.frequency.exponentialRampToValueAtTime(24, ctx.currentTime + 4.9);
        subGain.gain.setValueAtTime(0.001, ctx.currentTime + 3.8);
        subGain.gain.linearRampToValueAtTime(0.32, ctx.currentTime + 4.2);
        subGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 4.95);

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(ctx.destination);
        subOsc.connect(subGain);
        subGain.connect(ctx.destination);

        osc.start();
        subOsc.start(ctx.currentTime + 3.8);
        osc.stop(ctx.currentTime + 4.9);
        subOsc.stop(ctx.currentTime + 4.95);
      } catch {}
    }

    // Seamless high-fidelity cinematic descent transition
    setTimeout(() => {
      if (audioCtxRef.current) {
        try {
          if (ambientGainRef.current) ambientGainRef.current.gain.linearRampToValueAtTime(0.0001, audioCtxRef.current.currentTime + 0.2);
          if (waterGainRef.current) waterGainRef.current.gain.linearRampToValueAtTime(0.0001, audioCtxRef.current.currentTime + 0.2);
          setTimeout(() => {
            audioCtxRef.current?.suspend().catch(() => {});
          }, 250);
        } catch {}
      }
      onComplete();
    }, 2800);
  }, [onComplete]);

  // Keyboard shortcut for instant interface entry
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        handleEnterWaterfall();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleEnterWaterfall]);

  // Web Audio API procedural soundscape: cosmic ambient drone + mountain waterfall + crystalline harmonic chord
  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      // 1. Deep Cosmic Ambient Drone (Purple space aesthetic)
      const rootFreq = 55; // A1
      const droneOsc1 = ctx.createOscillator();
      const droneOsc2 = ctx.createOscillator();
      droneOsc1.type = 'sawtooth';
      droneOsc2.type = 'sine';
      droneOsc1.frequency.setValueAtTime(rootFreq, ctx.currentTime);
      droneOsc2.frequency.setValueAtTime(rootFreq * 1.5, ctx.currentTime); // E2 (fifth)

      const droneFilter = ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.setValueAtTime(140, ctx.currentTime);

      const droneGain = ctx.createGain();
      droneGain.gain.setValueAtTime(0.26, ctx.currentTime);
      ambientGainRef.current = droneGain;

      droneOsc1.connect(droneFilter);
      droneOsc2.connect(droneFilter);
      droneFilter.connect(droneGain);
      droneGain.connect(ctx.destination);
      droneOsc1.start();
      droneOsc2.start();

      // 2. Cascading Waterfall Sound Generator (Filtered pink noise with turbulent resonance)
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.25;
      }

      const waterSource = ctx.createBufferSource();
      waterSource.buffer = noiseBuffer;
      waterSource.loop = true;

      const waterFilter = ctx.createBiquadFilter();
      waterFilter.type = 'bandpass';
      waterFilter.frequency.setValueAtTime(650, ctx.currentTime);
      waterFilter.Q.setValueAtTime(1.2, ctx.currentTime);

      const waterGain = ctx.createGain();
      waterGain.gain.setValueAtTime(0.18, ctx.currentTime);
      waterGainRef.current = waterGain;

      waterSource.connect(waterFilter);
      waterFilter.connect(waterGain);
      waterGain.connect(ctx.destination);
      waterSource.start();

      // Camera Viewfinder Audio VU Level Analyser
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      droneGain.connect(analyser);
      waterGain.connect(analyser);
      audioAnalyserRef.current = analyser;
    } catch {
      // Audio autoplay fallback
    }
  }, []);

  // Update Camera Viewfinder VU Decibel Meter dynamically (direct DOM ref updates for 60fps buttery performance)
  useEffect(() => {
    let animId: number;
    let currentPeak = 0.42;
    const sampleVU = () => {
      animId = requestAnimationFrame(sampleVU);
      if (audioAnalyserRef.current && !isMutedRef.current) {
        const data = new Uint8Array(audioAnalyserRef.current.frequencyBinCount);
        audioAnalyserRef.current.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / (data.length * 255);
        currentPeak = THREE.MathUtils.lerp(currentPeak, Math.min(1.0, avg * 2.2 + 0.1), 0.25);
      } else {
        currentPeak = THREE.MathUtils.lerp(currentPeak, 0.05, 0.1);
      }
      if (vuBarRef.current) {
        vuBarRef.current.style.width = `${Math.min(100, Math.round(currentPeak * 100))}%`;
      }
      if (vuTextRef.current) {
        vuTextRef.current.textContent = `-${Math.max(0, Math.round((1 - currentPeak) * 32))}dB`;
      }
    };
    animId = requestAnimationFrame(sampleVU);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Crystalline harmonic chime chord when "SAMVARTKA AI" smoothly reveals
  const playTitleChime = useCallback(() => {
    if (!audioCtxRef.current || isMutedRef.current || chimeTriggeredRef.current) return;
    chimeTriggeredRef.current = true;
    try {
      const ctx = audioCtxRef.current;
      // Majestic modern chords: F# - A# - C# - E# - G# (Luxury ethereal voicing)
      const freqs = [369.99, 466.16, 554.37, 739.99, 932.33, 1108.73];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);

        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.18 / (idx + 1), ctx.currentTime + idx * 0.07 + 0.14);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.07 + 4.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.07);
        osc.stop(ctx.currentTime + idx * 0.07 + 4.6);
      });
    } catch {
      // ignore
    }
  }, []);

  const playCelestialChime = useCallback((ctx?: AudioContext) => {
    const targetCtx = ctx || audioCtxRef.current;
    if (!targetCtx || isMutedRef.current) return;
    try {
      if (targetCtx.state === 'suspended') {
        targetCtx.resume().catch(() => {});
      }
      const t = targetCtx.currentTime;
      // Majestic modern chords: F# - A# - C# - E# - G# (Luxury ethereal voicing)
      const freqs = [369.99, 466.16, 554.37, 739.99, 932.33, 1108.73];
      freqs.forEach((freq, idx) => {
        const osc = targetCtx.createOscillator();
        const gain = targetCtx.createGain();
        osc.type = 'sine';
        const start = t + idx * 0.07;
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.18 / (idx + 1), start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 3.5);

        osc.connect(gain);
        gain.connect(targetCtx.destination);
        osc.start(start);
        osc.stop(start + 3.6);
      });
    } catch {}
  }, []);

  const toggleSound = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!audioCtxRef.current) {
      initAudio();
    }
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    isMutedRef.current = nextMuted;
    setHasInteracted(true);
    onToggleAudio?.();

    if (audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      if (!nextMuted) {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        if (ambientGainRef.current) {
          ambientGainRef.current.gain.cancelScheduledValues(ctx.currentTime);
          ambientGainRef.current.gain.setValueAtTime(0.34, ctx.currentTime);
        }
        if (waterGainRef.current) {
          waterGainRef.current.gain.cancelScheduledValues(ctx.currentTime);
          waterGainRef.current.gain.setValueAtTime(0.26, ctx.currentTime);
        }
        // Play instant glorious celestial chime
        playCelestialChime(ctx);
      } else {
        if (ambientGainRef.current) {
          ambientGainRef.current.gain.cancelScheduledValues(ctx.currentTime);
          ambientGainRef.current.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08);
        }
        if (waterGainRef.current) {
          waterGainRef.current.gain.cancelScheduledValues(ctx.currentTime);
          waterGainRef.current.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08);
        }
      }
    }
  };

  useEffect(() => {
    if (audioCtxRef.current) {
      if (isMuted) {
        if (ambientGainRef.current) {
          ambientGainRef.current.gain.setTargetAtTime(0.0001, audioCtxRef.current.currentTime, 0.08);
        }
        if (waterGainRef.current) {
          waterGainRef.current.gain.setTargetAtTime(0.0001, audioCtxRef.current.currentTime, 0.08);
        }
      } else {
        if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }
        if (ambientGainRef.current) {
          ambientGainRef.current.gain.setTargetAtTime(0.26, audioCtxRef.current.currentTime, 0.08);
        }
        if (waterGainRef.current) {
          waterGainRef.current.gain.setTargetAtTime(0.20, audioCtxRef.current.currentTime, 0.08);
        }
      }
    }
  }, [isMuted]);

  // Screen flash decay effect
  useEffect(() => {
    if (screenFlash <= 0.01) return;
    const timer = setTimeout(() => {
      setScreenFlash(prev => Math.max(0, prev * 0.72 - 0.04));
    }, 35);
    return () => clearTimeout(timer);
  }, [screenFlash]);

  // =========================================================================
  // LIGHTNING OVERLAY CANVAS: Dynamic Branching Thunder Arcs & Falling Sparks
  // =========================================================================
  useEffect(() => {
    const canvas = lightningCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = performance.now();

      // Render Active Lightning Strikes
      for (let i = activeStrikesRef.current.length - 1; i >= 0; i--) {
        const strike = activeStrikesRef.current[i];
        const age = now - strike.startTime;
        const progress = age / strike.duration;
        if (progress >= 1.0) {
          activeStrikesRef.current.splice(i, 1);
          continue;
        }

        // Smooth natural return-stroke envelope: intense immediate flash, followed by smooth exponential decay with organic harmonic resonance
        const envelope = Math.exp(-progress * 4.8) * (0.85 + 0.15 * Math.sin(progress * Math.PI * 4));
        const alpha = Math.max(0, Math.min(1.0, envelope));

        // Pass 1: Broad electric-cyan outer plasma bloom
        ctx.save();
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 38;
        ctx.strokeStyle = `rgba(14, 165, 233, ${alpha * 0.85})`;
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (const seg of strike.segments) {
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
        }
        ctx.stroke();
        ctx.restore();

        // Pass 2: High-voltage electric cyan & violet ionization sheath
        ctx.save();
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = `rgba(125, 211, 252, ${alpha * 0.98})`;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (const seg of strike.segments) {
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
        }
        ctx.stroke();
        ctx.restore();

        // Pass 3: Blinding pure white core discharge
        ctx.save();
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 1.0})`;
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (const seg of strike.segments) {
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
        }
        ctx.stroke();
        ctx.restore();

        // Falling electric spark embers showering downwards
        for (let sIdx = strike.sparks.length - 1; sIdx >= 0; sIdx--) {
          const sp = strike.sparks[sIdx];
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.vy += 0.12;
          sp.life++;
          const spAlpha = Math.max(0, 1 - sp.life / sp.maxLife);
          if (sp.life >= sp.maxLife) {
            strike.sparks.splice(sIdx, 1);
            continue;
          }
          ctx.save();
          ctx.fillStyle = sp.color;
          ctx.globalAlpha = spAlpha;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, 1.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // =========================================================================
      // 1. ATMOSPHERIC RESIDUAL IONIZATION: Lingering plasma channels drifting in the sky (4.2s decay)
      // =========================================================================
      for (let aIdx = atmosphericResidualsRef.current.length - 1; aIdx >= 0; aIdx--) {
        const atmo = atmosphericResidualsRef.current[aIdx];
        const atmoAge = now - atmo.startTime;
        const atmoProg = atmoAge / atmo.duration;
        if (atmoProg >= 1.0) {
          atmosphericResidualsRef.current.splice(aIdx, 1);
          continue;
        }

        // Lingering soft glow that gently wafts and dissipates
        const atmoAlpha = Math.pow(1.0 - atmoProg, 1.8) * 0.55;
        ctx.save();
        ctx.shadowColor = '#67e8f9';
        ctx.shadowBlur = 18 * (1 - atmoProg * 0.5);
        ctx.strokeStyle = `rgba(165, 243, 252, ${atmoAlpha})`;
        ctx.lineWidth = 2.4 * (1 - atmoProg * 0.4);
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (const seg of atmo.segments) {
          seg.x1 += seg.driftX;
          seg.y1 += seg.driftY;
          seg.x2 += seg.driftX;
          seg.y2 += seg.driftY;
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
        }
        ctx.stroke();
        ctx.restore();
      }

      // =========================================================================
      // 2. REALISTIC SLOW GROUND DISSIPATION ALL OVER THE PLACES THUNDER HAS FALLEN (4.8s - 5.2s)
      // =========================================================================
      for (let gIdx = groundDissipationsRef.current.length - 1; gIdx >= 0; gIdx--) {
        const diss = groundDissipationsRef.current[gIdx];
        const age = now - diss.startTime;
        const progress = age / diss.duration; // 0.0 to 1.0 over ~5000ms
        if (progress >= 1.0) {
          groundDissipationsRef.current.splice(gIdx, 1);
          continue;
        }

        // Dissipation phases:
        // Phase 1 (0.0 - 0.15): Rapid expanding shockwave & high-voltage flash
        // Phase 2 (0.15 - 0.55): Creeping dendritic Lichtenberg veins diffusing outward
        // Phase 3 (0.55 - 0.85): Thermal glowing embers & violet/cobalt ionization
        // Phase 4 (0.85 - 1.0): Faint steam vapor & final electrostatic decay
        const dissAlpha = Math.pow(1 - progress, 1.4);
        diss.radius = Math.min(diss.maxRadius, diss.radius + (diss.maxRadius - diss.radius) * 0.045);

        // A. Expanding Elliptical Plasma Aura
        ctx.save();
        const auraGrad = ctx.createRadialGradient(
          diss.originX, diss.originY, 0,
          diss.originX, diss.originY, diss.radius
        );
        const auraColor = diss.type === 'water'
          ? (progress < 0.4 ? '56, 189, 248' : progress < 0.7 ? '6, 182, 212' : '14, 116, 144')
          : diss.type === 'peak'
          ? (progress < 0.4 ? '192, 132, 252' : progress < 0.7 ? '147, 51, 234' : '107, 33, 168')
          : (progress < 0.4 ? '96, 165, 250' : progress < 0.7 ? '37, 99, 235' : '30, 64, 175');

        auraGrad.addColorStop(0, `rgba(${auraColor}, ${dissAlpha * 0.55})`);
        auraGrad.addColorStop(0.5, `rgba(${auraColor}, ${dissAlpha * 0.28})`);
        auraGrad.addColorStop(0.9, `rgba(${auraColor}, ${dissAlpha * 0.08})`);
        auraGrad.addColorStop(1, `rgba(${auraColor}, 0)`);
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.ellipse(diss.originX, diss.originY, diss.radius * (diss.type === 'water' ? 1.6 : 1.1), diss.radius * (diss.type === 'water' ? 0.45 : 0.9), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // B. Crawling Dendritic Lichtenberg Electrical Filaments
        const filamentAlpha = dissAlpha * (Math.sin(age * 0.015) * 0.15 + 0.85);
        ctx.save();
        ctx.shadowColor = diss.type === 'water' ? '#22d3ee' : diss.type === 'peak' ? '#c084fc' : '#60a5fa';
        ctx.shadowBlur = 14 * (1 - progress * 0.6);
        ctx.lineWidth = Math.max(0.6, (2.4 - progress * 1.6));
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Choose progressive thermal/plasma color
        let filStroke = `rgba(165, 243, 252, ${filamentAlpha})`;
        if (progress > 0.65) {
          filStroke = `rgba(253, 224, 71, ${filamentAlpha * 0.75})`; // warm residual embers
        } else if (progress > 0.35) {
          filStroke = `rgba(147, 197, 253, ${filamentAlpha * 0.9})`; // cool cobalt
        }
        ctx.strokeStyle = filStroke;

        ctx.beginPath();
        for (const fil of diss.filaments) {
          // Progressively draw points as the wave spreads outward
          const maxVisibleIdx = Math.min(fil.points.length, Math.floor(fil.points.length * (0.35 + progress * 0.9)));
          if (maxVisibleIdx < 2) continue;
          ctx.moveTo(fil.points[0].x, fil.points[0].y);
          for (let p = 1; p < maxVisibleIdx; p++) {
            ctx.lineTo(fil.points[p].x, fil.points[p].y);
          }
        }
        ctx.stroke();
        ctx.restore();

        // C. Electrified Rising Droplet Sparks & Sizzling Thermal Particles
        for (let spIdx = diss.sparks.length - 1; spIdx >= 0; spIdx--) {
          const sp = diss.sparks[spIdx];
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.vx *= 0.97;
          sp.vy *= 0.96;
          sp.life++;
          const spAlpha = Math.max(0, 1 - sp.life / sp.maxLife) * dissAlpha;
          if (sp.life >= sp.maxLife) {
            diss.sparks.splice(spIdx, 1);
            continue;
          }
          ctx.save();
          ctx.shadowColor = sp.color;
          ctx.shadowBlur = 6;
          ctx.fillStyle = sp.color;
          ctx.globalAlpha = spAlpha;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, Math.max(0.4, 1.6 * (1 - sp.life / sp.maxLife)), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Backward compatible waterDilutions cleanup
      waterDilutionsRef.current = [];

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // =========================================================================
  // 1. BACKGROUND CANVAS: Luminous Liquid Silk Waves & 3D Floating Rocks
  // =========================================================================
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Create 3D Polyhedral Floating Rocks (matching video's floating asteroids)
    const createFacetedRock = (x: number, y: number, z: number, r: number): FloatingRock => {
      // Generate icosahedron-like perturbed vertices
      const rawVerts: { x: number; y: number; z: number }[] = [];
      const count = 12;
      for (let i = 0; i < count; i++) {
        const theta = (i / count) * Math.PI * 2;
        const phi = (i % 2 === 0 ? 0.35 : -0.35) * Math.PI;
        const jitter = 0.8 + Math.random() * 0.4;
        rawVerts.push({
          x: Math.cos(theta) * Math.cos(phi) * r * jitter,
          y: Math.sin(phi) * r * jitter,
          z: Math.sin(theta) * Math.cos(phi) * r * jitter,
        });
      }
      // Top and bottom vertices
      rawVerts.push({ x: 0, y: r * 1.15, z: 0 });
      rawVerts.push({ x: 0, y: -r * 1.15, z: 0 });

      // Build triangular faces
      const faces: number[][] = [];
      for (let i = 0; i < count; i++) {
        const next = (i + 1) % count;
        faces.push([12, i, next]); // top cap
        faces.push([13, next, i]); // bottom cap
        faces.push([i, next, (i + 2) % count]); // body
      }

      return {
        x,
        y,
        z,
        baseRadius: r,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        rotSpeedX: (Math.random() - 0.5) * 0.008,
        rotSpeedY: (Math.random() - 0.5) * 0.012,
        rotSpeedZ: (Math.random() - 0.5) * 0.007,
        driftVx: (Math.random() - 0.5) * 0.25,
        driftVy: (Math.random() - 0.5) * 0.18,
        vertices: rawVerts,
        faces,
      };
    };

    // 8 floating rocks distributed in 3D around the viewport edges (like the video)
    const rocks: FloatingRock[] = [
      createFacetedRock(width * 0.12, height * 0.32, 120, 52), // left upper
      createFacetedRock(width * 0.08, height * 0.72, 180, 75), // left lower
      createFacetedRock(width * 0.88, height * 0.28, 140, 60), // right upper
      createFacetedRock(width * 0.92, height * 0.76, 200, 85), // right lower
      createFacetedRock(width * 0.22, height * 0.88, 90, 38),  // bottom left
      createFacetedRock(width * 0.78, height * 0.88, 100, 42), // bottom right
    ];

    let targetBgMouseX = 0;
    let targetBgMouseY = 0;
    let smoothBgMouseX = 0;
    let smoothBgMouseY = 0;

    const handleBgMouseMove = (e: MouseEvent) => {
      targetBgMouseX = (e.clientX / window.innerWidth) * 2 - 1;
      targetBgMouseY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('mousemove', handleBgMouseMove);

    let animId: number;

    const render = (now: number) => {
      animId = requestAnimationFrame(render);
      const elapsed = (now - startTimeRef.current) / 1000;
      setCurrentTime(elapsed);

      smoothBgMouseX += (targetBgMouseX - smoothBgMouseX) * 0.05;
      smoothBgMouseY += (targetBgMouseY - smoothBgMouseY) * 0.05;

      const tod = timeOfDayRef.current;

      // Determine active phase
      if (elapsed >= PEAKS_RISE_DURATION + WATERFALL_SURGE_DURATION) {
        setCurrentPhase('reveal');
        playTitleChime();
        if (waterGainRef.current && audioCtxRef.current) {
          waterGainRef.current.gain.setTargetAtTime(0.18, audioCtxRef.current.currentTime, 0.5);
        }
      } else if (elapsed >= PEAKS_RISE_DURATION) {
        setCurrentPhase('waterfall');
        if (waterGainRef.current && audioCtxRef.current) {
          waterGainRef.current.gain.setTargetAtTime(0.32, audioCtxRef.current.currentTime, 0.4);
        }
      } else {
        setCurrentPhase('peaks');
      }

      // ========================================================
      // A. DYNAMIC LIQUID SILK BACKGROUND (Based on Time of Day)
      // ========================================================
      const bgGrad = ctx.createRadialGradient(
        width * (0.5 + smoothBgMouseX * 0.05), height * (0.45 + smoothBgMouseY * 0.05), 50,
        width * 0.5, height * 0.5, Math.max(width, height) * 0.8
      );

      if (tod === 'dawn') {
        // 🌅 Golden Hour Dawn: Warm amber/rose gold cosmic gorge
        bgGrad.addColorStop(0, '#2d140b'); // warm amber core
        bgGrad.addColorStop(0.45, '#160804'); // deep mahogany
        bgGrad.addColorStop(1, '#060201'); // obsidian rim
      } else if (tod === 'night') {
        // 🌌 Night Ridge: Deep celestial midnight
        bgGrad.addColorStop(0, '#060e26'); // mystical deep blue
        bgGrad.addColorStop(0.45, '#020614'); // obsidian slate
        bgGrad.addColorStop(1, '#000105'); // pitch black rim
      } else {
        // ⛈️ High Monsoon: Deep obsidian purple/violet
        bgGrad.addColorStop(0, '#130924'); // deep mystical violet center
        bgGrad.addColorStop(0.45, '#0c0517'); // obsidian indigo
        bgGrad.addColorStop(1, '#030108'); // pitch black rim
      }

      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Luminous Liquid Silk Waves (swirling fluid ribbons with dynamic perspective tilt)
      ctx.save();
      const waveCount = 5;
      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        const yBase = height * (0.15 + w * 0.2) + smoothBgMouseY * 25 * (w + 1);
        const amp = 65 + w * 18;
        const freq = 0.0018 + w * 0.0004;
        const speed = elapsed * (0.6 + w * 0.2) + smoothBgMouseX * 0.8;

        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 15) {
          const y = yBase + Math.sin(x * freq + speed) * amp + Math.cos(x * 0.001 - speed * 0.7) * 35;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();

        const silkGrad = ctx.createLinearGradient(0, yBase - amp, width, yBase + amp);
        if (tod === 'dawn') {
          if (w % 2 === 0) {
            silkGrad.addColorStop(0, 'rgba(245, 158, 11, 0.14)');
            silkGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.08)');
            silkGrad.addColorStop(1, 'rgba(217, 119, 6, 0.16)');
          } else {
            silkGrad.addColorStop(0, 'rgba(244, 63, 94, 0.10)');
            silkGrad.addColorStop(0.5, 'rgba(253, 186, 116, 0.06)');
            silkGrad.addColorStop(1, 'rgba(234, 88, 12, 0.12)');
          }
        } else if (tod === 'night') {
          if (w % 2 === 0) {
            silkGrad.addColorStop(0, 'rgba(6, 182, 212, 0.15)');
            silkGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.08)');
            silkGrad.addColorStop(1, 'rgba(14, 116, 144, 0.16)');
          } else {
            silkGrad.addColorStop(0, 'rgba(168, 85, 247, 0.11)');
            silkGrad.addColorStop(0.5, 'rgba(192, 132, 252, 0.05)');
            silkGrad.addColorStop(1, 'rgba(99, 102, 241, 0.10)');
          }
        } else {
          if (w % 2 === 0) {
            silkGrad.addColorStop(0, 'rgba(168, 85, 247, 0.12)'); // luminous purple
            silkGrad.addColorStop(0.5, 'rgba(192, 132, 252, 0.06)');
            silkGrad.addColorStop(1, 'rgba(126, 34, 206, 0.14)');
          } else {
            silkGrad.addColorStop(0, 'rgba(99, 102, 241, 0.09)'); // soft indigo
            silkGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.04)');
            silkGrad.addColorStop(1, 'rgba(59, 130, 246, 0.08)');
          }
        }
        ctx.fillStyle = silkGrad;
        ctx.fill();
      }
      ctx.restore();

      // Ambient Glowing Nebulae / Light Orbs
      ctx.save();
      const glowOrb = ctx.createRadialGradient(
        width * (0.5 + smoothBgMouseX * 0.08), height * (0.38 + smoothBgMouseY * 0.08), 0, 
        width * 0.5, height * 0.38, 380
      );
      if (tod === 'dawn') {
        glowOrb.addColorStop(0, 'rgba(251, 191, 36, 0.22)');
        glowOrb.addColorStop(0.5, 'rgba(245, 158, 11, 0.08)');
      } else if (tod === 'night') {
        glowOrb.addColorStop(0, 'rgba(56, 189, 248, 0.18)');
        glowOrb.addColorStop(0.5, 'rgba(6, 182, 212, 0.06)');
      } else {
        glowOrb.addColorStop(0, 'rgba(192, 132, 252, 0.18)');
        glowOrb.addColorStop(0.5, 'rgba(147, 51, 234, 0.06)');
      }
      glowOrb.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowOrb;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // ========================================================
      // B. 3D FLOATING FACETED ROCKS WITH MOUSE PARALLAX
      // ========================================================
      ctx.save();
      rocks.forEach((rock) => {
        rock.rotX += rock.rotSpeedX + smoothBgMouseX * 0.002;
        rock.rotY += rock.rotSpeedY + smoothBgMouseY * 0.002;
        rock.rotZ += rock.rotSpeedZ;
        rock.x += rock.driftVx;
        rock.y += rock.driftVy;

        // Depth parallax offset from cursor
        const depthParallaxX = smoothBgMouseX * (rock.z * 0.35);
        const depthParallaxY = smoothBgMouseY * (rock.z * 0.25);

        // Wrap around boundaries
        if (rock.x < -100) rock.x = width + 80;
        if (rock.x > width + 100) rock.x = -80;
        if (rock.y < -100) rock.y = height + 80;
        if (rock.y > height + 100) rock.y = -80;

        // 3D rotation matrix calculation
        const cosX = Math.cos(rock.rotX), sinX = Math.sin(rock.rotX);
        const cosY = Math.cos(rock.rotY), sinY = Math.sin(rock.rotY);
        const cosZ = Math.cos(rock.rotZ), sinZ = Math.sin(rock.rotZ);

        // Project vertices with depth parallax
        const projected = rock.vertices.map((v) => {
          // Rot X
          let y1 = v.y * cosX - v.z * sinX;
          let z1 = v.y * sinX + v.z * cosX;
          // Rot Y
          let x2 = v.x * cosY + z1 * sinY;
          let z2 = -v.x * sinY + z1 * cosY;
          // Rot Z
          let x3 = x2 * cosZ - y1 * sinZ;
          let y3 = x2 * sinZ + y1 * cosZ;

          return {
            x: rock.x + depthParallaxX + x3,
            y: rock.y + depthParallaxY + y3,
            z: rock.z + z2,
          };
        });

        // Sort faces by depth
        const faceDepths = rock.faces.map((f, idx) => {
          const avgZ = (projected[f[0]].z + projected[f[1]].z + projected[f[2]].z) / 3;
          return { idx, avgZ };
        });
        faceDepths.sort((a, b) => b.avgZ - a.avgZ);

        // Render faces with realistic lighting based on Time-of-Day preset
        faceDepths.forEach(({ idx }) => {
          const f = rock.faces[idx];
          const p0 = projected[f[0]];
          const p1 = projected[f[1]];
          const p2 = projected[f[2]];

          // Calculate face normal for lighting
          const vAx = p1.x - p0.x, vAy = p1.y - p0.y, vAz = p1.z - p0.z;
          const vBx = p2.x - p0.x, vBy = p2.y - p0.y, vBz = p2.z - p0.z;
          const nx = vAy * vBz - vAz * vBy;
          const ny = vAz * vBx - vAx * vBz;
          const nz = vAx * vBy - vAy * vBx;
          const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
          const normZ = nz / len;

          // Backface culling
          if (normZ < 0) return;

          // Lighting model: directional light from top-center
          const lightIntensity = Math.max(0.12, (normZ * 0.7 + (ny / len) * -0.3));

          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.closePath();

          if (tod === 'dawn') {
            const rVal = Math.floor(75 * lightIntensity + 30);
            const gVal = Math.floor(45 * lightIntensity + 18);
            const bVal = Math.floor(25 * lightIntensity + 10);
            ctx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(251, 191, 36, ${lightIntensity * 0.4})`;
          } else if (tod === 'night') {
            const rVal = Math.floor(15 * lightIntensity + 10);
            const gVal = Math.floor(45 * lightIntensity + 20);
            const bVal = Math.floor(85 * lightIntensity + 35);
            ctx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(6, 182, 212, ${lightIntensity * 0.4})`;
          } else {
            const rVal = Math.floor(45 * lightIntensity + 18);
            const gVal = Math.floor(25 * lightIntensity + 10);
            const bVal = Math.floor(75 * lightIntensity + 30);
            ctx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(192, 132, 252, ${lightIntensity * 0.35})`;
          }

          ctx.lineWidth = 1.0;
          ctx.stroke();
        });
      });
      ctx.restore();
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleBgMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, [playTitleChime]);

  // =========================================================================
  // 2. CENTERPIECE 3D WEBGL STAGE: Realistic Alpine Mountain Gorge & Waterfall
  // Directly modeled after the user's reference photograph:
  // - Sheer, craggy dark slate/granite canyon cliffs forming a dramatic V-notch
  // - Alpine conifer pine trees clinging to ledges and dense on lower slopes
  // - High roaring whitewater cascade plunging from a rocky cleft into rapids
  // - Realistic overcast mountain atmosphere with low-hanging misty clouds
  // - Dramatic rising flood water that surges up and submerges the canyon
  // =========================================================================
  // =========================================================================
  // 2. CENTERPIECE 3D WEBGL STAGE: TWIN PEAKS WITH CENTRAL WATERFALL & GORGE
  // Directly built according to the 3D asset specification & reference:
  // - Geometry: Two massive tall twin mountain peaks side-by-side with a deep central gorge
  // - Mesh: Jagged sharp granite rock faces with vertical fissures and snow-capped pinnacles
  // - Fluid: Smooth heavy water volume pouring from central cleft, high-density mist & foam at base
  // - Lighting: Volumetric golden hour sunlight hitting the left side with atmospheric shadows
  // - Valley: Low-lying fog, meandering river bed, and procedural alpine pine tree forest
  // =========================================================================
  useEffect(() => {
    const canvas = mountainCanvasRef.current;
    if (!canvas) return;

    let width = canvas.parentElement?.clientWidth || 800;
    let height = canvas.parentElement?.clientHeight || 520;

    // 1. SCENE, FOG & CAMERA
    const scene = new THREE.Scene();
    // Default Golden-hour atmospheric alpine sky
    scene.background = new THREE.Color(0xfde68a).lerp(new THREE.Color(0xd97706), 0.35);
    scene.fog = new THREE.FogExp2(0xd97706, 0.011);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
    camera.position.set(0, 3.2, 34);

    // 2. WEBGL RENDERER WITH RESILIENT FALLBACK
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: false,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
    } catch (e) {
      console.warn("WebGL initialization skipped in CinematicIntro:", e);
      return;
    }

    // 3. VOLUMETRIC GOLDEN HOUR & 3D SUNLIGHT / ACCENT LIGHTING
    const ambientLight = new THREE.AmbientLight(0xffedd5, 1.45);
    scene.add(ambientLight);

    // Hemisphere light for natural sky/ground bounce
    const hemiLight = new THREE.HemisphereLight(0xfff0d4, 0x3d4b66, 0.95);
    scene.add(hemiLight);

    // Primary Volumetric Golden Hour Sun Light (Striking left mountain peak)
    const sunLight = new THREE.DirectionalLight(0xffe4b5, 3.4);
    sunLight.position.set(-28, 24, 15);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    // High-altitude back light filtering through the central cleft notch
    const backLight = new THREE.DirectionalLight(0xf97316, 2.8);
    backLight.position.set(0, 19, -26);
    scene.add(backLight);

    // Subtle right-side shadow fill
    const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.9);
    fillLight.position.set(22, 14, 16);
    scene.add(fillLight);

    // 3D Point Light at the Waterfall Plunge Base (Casting realistic water spray glints)
    const plungePointLight = new THREE.PointLight(0x38bdf8, 2.2, 18, 1.4);
    plungePointLight.position.set(0, -3.5, -3.0);
    scene.add(plungePointLight);

    // 3D Abyssal Aether Uplight (Illuminating the floating island underbelly from the void below)
    const abyssalUplight = new THREE.DirectionalLight(0x0284c7, 2.4);
    abyssalUplight.position.set(0, -48, 12);
    abyssalUplight.target.position.set(0, -8, 0);
    scene.add(abyssalUplight);
    scene.add(abyssalUplight.target);

    // Warm ambient ground bounce for underbelly rock crevices
    const underbellyBounceLight = new THREE.PointLight(0xf59e0b, 1.4, 38, 1.2);
    underbellyBounceLight.position.set(-8, -22, -6);
    scene.add(underbellyBounceLight);

    // 4. MASTER CANYON GORGE GROUP (FLOATING CONTINENT)
    const mountainGroup = new THREE.Group();
    scene.add(mountainGroup);

    // =========================================================================
    // A. PROCEDURAL HIGH-FIDELITY FLOATING ISLAND TERRAIN (HORIZONTALLY EXPANDED)
    // Sculpted as a massive wide alpine continent with twin jagged peaks, lateral horns & deep central river canyon
    // =========================================================================
    const terrainWidth = 140;
    const terrainDepth = 90;
    const terrainSegments = 90;
    const terrainGeo = new THREE.PlaneGeometry(terrainWidth, terrainDepth, terrainSegments, terrainSegments);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    const colors = new Float32Array(posAttr.count * 3);

    // Tree placement registry
    const treePositions: { x: number; y: number; z: number; scale: number; variant: number }[] = [];

    // Helper functions for fractal noise, geological strata & erosion sculpting
    const fbm = (px: number, pz: number) => {
      let val = 0;
      let amp = 1.0;
      let freq = 0.045;
      for (let oct = 0; oct < 5; oct++) {
        val += (Math.sin(px * freq + oct * 1.7) * Math.cos(pz * freq + oct * 2.3) + Math.sin((px + pz) * freq * 0.72)) * amp;
        amp *= 0.48;
        freq *= 2.18;
      }
      return val;
    };

    // Ridge noise for sharp alpine arêtes
    const ridgeNoise = (px: number, pz: number) => {
      const n = Math.sin(px * 0.10) * Math.cos(pz * 0.10) + Math.sin((px - pz) * 0.08);
      return 1.0 - Math.abs(n);
    };

    // Calculate height & vertex color for every vertex
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);

      // 1. Central Glacial Amphitheater & Cirque Bowl (Solid Rock Water Source Anchor at 0, -16)
      const distCentral = Math.hypot(vx, vz - -16.0);
      const centralMassif = Math.max(0, 24.0 * Math.exp(-Math.pow(distCentral / 16.0, 2.0))) * (0.90 + 0.18 * ridgeNoise(vx, vz));

      // 2. Twin High Alpine Peaks: Left Peak (-24.0, -12.0) and Right Peak (+24.0, -12.0)
      const distLeft = Math.hypot(vx - -24.0, vz - -12.0);
      const distRight = Math.hypot(vx - 24.0, vz - -12.0);
      const leftPeakH = Math.max(0, 30.5 * Math.exp(-Math.pow(distLeft / 16.0, 1.85))) * (0.92 + 0.16 * ridgeNoise(vx, vz));
      const rightPeakH = Math.max(0, 29.5 * Math.exp(-Math.pow(distRight / 16.0, 1.85))) * (0.92 + 0.16 * ridgeNoise(vx + 4, vz));

      // 3. Wide Lateral Massifs & Outlying Horns: Far West (-50, -6) and Far East (+50, -6)
      const distFarLeft = Math.hypot(vx - -50.0, vz - -6.0);
      const distFarRight = Math.hypot(vx - 50.0, vz - -6.0);
      const farLeftH = Math.max(0, 23.0 * Math.exp(-Math.pow(distFarLeft / 15.0, 2.0))) * (0.88 + 0.2 * ridgeNoise(vx, vz));
      const farRightH = Math.max(0, 22.5 * Math.exp(-Math.pow(distFarRight / 15.0, 2.0))) * (0.88 + 0.2 * ridgeNoise(vx, vz));

      // 4. Connecting High Alpine Arêtes and Col Ridges behind the cirque
      const colDist = Math.hypot(vx, vz - -20.0);
      const colRidge = Math.max(0, 19.5 * Math.exp(-Math.pow(colDist / 18.0, 2))) * (0.85 + 0.28 * Math.sin(vx * 0.18));

      let h = Math.max(centralMassif, leftPeakH, rightPeakH, farLeftH, farRightH) + colRidge * 0.45;

      // 5. Central Mountain Cleft & Waterfall Gorge (Steep V-cleft splitting mountains at x ~ 0, vz < 6)
      const gorgeCenterDist = Math.abs(vx);
      const gorgeMask = 1.0 - Math.min(1.0, gorgeCenterDist / 7.5);
      if (vz < 8) {
        // Carve rocky amphitheater gorge floor, stepping down from y = 10.5 at z = -14 down to y = 0.5 at z = -4
        const gorgeT = Math.max(0, Math.min(1.0, (vz - -14.0) / 18.0));
        const baseGorgeFloor = (1.0 - gorgeT) * 10.0 + gorgeT * -1.5;
        const cleftDepth = gorgeMask * (16.0 + (8 - vz) * 0.35);
        h = Math.max(baseGorgeFloor - (1.0 - gorgeMask) * 2.0, h - cleftDepth);
      }

      // 6. Canyon River Bed Channel Carving forward through the valley floor toward front weir (vz > -4)
      const riverCenter = Math.sin(vz * 0.10) * 2.5;
      const distToRiver = Math.abs(vx - riverCenter);
      const riverMask = 1.0 - Math.min(1.0, distToRiver / 6.5);
      if (riverMask > 0 && vz > -4) {
        // Natural downward canyon valley slope toward front spillway
        const canyonSlope = -1.2 - (vz / 20.0) * 1.6;
        h = Math.min(h, Math.max(canyonSlope, h - riverMask * 4.5));
      }

      // 7. Granite Rock Faces, Talus Scree & Stratification Noise
      const rockNoise = fbm(vx * 1.5, vz * 1.5) * 2.8;
      const verticalFissure = Math.sin(vx * 1.6) * Math.sin(vz * 0.6) * 1.4;
      const cliffStratification = Math.sin(h * 1.1) * 0.5;
      
      if (h > 1.0) {
        h += rockNoise + verticalFissure + cliffStratification;
      } else {
        h += fbm(vx * 0.5, vz * 0.5) * 0.4;
      }

      // Base riverbed floor constraint
      h = Math.max(-5.5, h);

      // =========================================================================
      // FLOATING ISLAND PERIMETER CLIFF ROLL-OFF (HORIZONTALLY EXPANDED TO 130m x 80m)
      // =========================================================================
      const normRad = Math.hypot(vx / 64.0, vz / 40.0);
      const angle = Math.atan2(vz, vx);
      const edgeIrregularity = 0.08 * Math.sin(angle * 5.0) + 0.05 * Math.cos(angle * 7.0) + fbm(vx * 0.5, vz * 0.5) * 0.12;
      const effectiveRad = normRad + edgeIrregularity;

      let isEdgeCliff = false;
      if (effectiveRad > 0.74) {
        isEdgeCliff = true;
        const cliffT = Math.min(1.0, (effectiveRad - 0.74) / 0.26);
        const cliffDrop = Math.pow(cliffT, 1.9) * 26.0 + fbm(vx * 1.6, vz * 1.6) * 2.5;
        h -= cliffDrop;
      }
      h = Math.max(-11.5, h);
      posAttr.setY(i, h);

      // PBR Vertex Coloring: Crystalline alpine snow caps, warm golden-hour granite, lush pine valleys, dark wet cliff chutes
      const isSnow = h > 20.0 && (Math.random() > 0.12 || h > 23.0);
      const isSunlit = vx < 0 && h > 4.0;
      const isValley = h < 2.5 && distToRiver > 4.5 && !isEdgeCliff;
      const isChute = Math.abs(vx) < 3.8 && vz > -15 && vz < 18;

      let r = 0.29, g = 0.31, b = 0.35; // Alpine granite
      if (isEdgeCliff && h < -1.5) {
        r = 0.15; g = 0.17; b = 0.21; // Exposed sheer perimeter cliff
      } else if (isSnow) {
        r = 0.96; g = 0.98; b = 1.0; // High-altitude glacial snow
      } else if (isSunlit) {
        r = 0.76; g = 0.58; b = 0.42; // Warm golden hour sunlit rock face
      } else if (isValley) {
        r = 0.14; g = 0.26; b = 0.13; // Lush subalpine pine grass
      } else if (isChute || h < -0.5) {
        r = 0.10; g = 0.13; b = 0.17; // Wet glaciated basalt in waterfall gorge
      } else {
        r = 0.21; g = 0.23; b = 0.27; // Deep canyon shadow
      }

      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;

      // Tree Candidate Placement: Across the horizontally expanded alpine valley flanks
      if (i % 2 === 0 && h > 0.2 && h < 16.0 && distToRiver > 4.2 && vz > -32 && vz < 26 && effectiveRad < 0.72) {
        if (Math.abs(vx) > 4.0 && Math.random() < 0.65) {
          treePositions.push({
            x: vx + (Math.random() - 0.5) * 1.4,
            y: h,
            z: vz + (Math.random() - 0.5) * 1.4,
            scale: 0.65 + Math.random() * 0.65,
            variant: Math.floor(Math.random() * 3),
          });
        }
      }
    }

    terrainGeo.computeVertexNormals();
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.82,
      metalness: 0.12,
      flatShading: true,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    mountainGroup.add(terrainMesh);

    // =========================================================================
    // A2. 3D SCULPTED FLOATING ISLAND KEEL (EXPANDED TO MATCH CONTINENT)
    // Seamlessly connects under the terrain perimeter, tapering down 38m into the void
    // =========================================================================
    const keelRings = 28;
    const keelSlices = 48;
    const keelVerticesCount = keelRings * keelSlices;
    const keelPositions = new Float32Array(keelVerticesCount * 3);
    const keelColors = new Float32Array(keelVerticesCount * 3);
    const keelIndices: number[] = [];

    for (let rIdx = 0; rIdx < keelRings; rIdx++) {
      const t = rIdx / (keelRings - 1);
      const profileRadius = Math.pow(t, 0.72);

      for (let sIdx = 0; sIdx < keelSlices; sIdx++) {
        const theta = (sIdx / keelSlices) * Math.PI * 2;
        const vIdx = (rIdx * keelSlices + sIdx) * 3;

        // Expanded island base ellipse matching expanded terrain
        const baseRadX = 64.0 + 3.2 * Math.sin(theta * 3.0) + 1.8 * Math.cos(theta * 5.0);
        const baseRadZ = 40.0 + 2.4 * Math.cos(theta * 2.0) + 1.8 * Math.sin(theta * 4.0);

        let kx = Math.cos(theta) * baseRadX * profileRadius;
        let kz = Math.sin(theta) * baseRadZ * profileRadius;

        const rimCliffY = -10.5 + 1.6 * Math.sin(theta * 4.0);
        let ky = -38.0 + Math.pow(t, 0.82) * (rimCliffY - -38.0);

        // Sculpt secondary mountain roots under left peak (-24, -12), right peak (+24, -12) and far massifs
        const leftRootDist = Math.hypot(kx - -24.0, kz - -12.0);
        const leftRootPull = Math.max(0, 1.0 - leftRootDist / 18.0);
        ky -= leftRootPull * 11.0;

        const rightRootDist = Math.hypot(kx - 24.0, kz - -12.0);
        const rightRootPull = Math.max(0, 1.0 - rightRootDist / 18.0);
        ky -= rightRootPull * 10.5;

        const backRootDist = Math.hypot(kx, kz - -24.0);
        const backRootPull = Math.max(0, 1.0 - backRootDist / 18.0);
        ky -= backRootPull * 11.5;

        // Stratified geological crags & columnar jointing
        const cragNoise = (Math.sin(kx * 0.4 + ky * 0.3) * Math.cos(kz * 0.4) + Math.sin((kx + kz) * 0.35)) * (1.0 - t * 0.25) * 3.4;
        ky += cragNoise;
        kx += Math.sin(ky * 0.35 + theta * 3.0) * (1.0 - t * 0.35) * 1.8;
        kz += Math.cos(ky * 0.35 + theta * 3.0) * (1.0 - t * 0.35) * 1.8;

        keelPositions[vIdx] = kx;
        keelPositions[vIdx + 1] = ky;
        keelPositions[vIdx + 2] = kz;

        let kr = 0.18, kg = 0.20, kb = 0.24;
        if (ky < -26.0) {
          kr = 0.08; kg = 0.10; kb = 0.14;
        } else if (kx < -12.0 && ky > -20.0) {
          kr = 0.45; kg = 0.32; kb = 0.22;
        } else if (ky > -12.0) {
          kr = 0.12; kg = 0.22; kb = 0.14;
        }

        const crystalSeam = Math.sin(kx * 0.8) * Math.sin(ky * 0.6);
        if (crystalSeam > 0.82 && ky < -12.0) {
          kr = 0.15; kg = 0.78; kb = 0.98;
        }

        keelColors[vIdx] = kr;
        keelColors[vIdx + 1] = kg;
        keelColors[vIdx + 2] = kb;
      }
    }

    for (let rIdx = 0; rIdx < keelRings - 1; rIdx++) {
      for (let sIdx = 0; sIdx < keelSlices; sIdx++) {
        const nextS = (sIdx + 1) % keelSlices;
        const i0 = rIdx * keelSlices + sIdx;
        const i1 = rIdx * keelSlices + nextS;
        const i2 = (rIdx + 1) * keelSlices + sIdx;
        const i3 = (rIdx + 1) * keelSlices + nextS;

        keelIndices.push(i0, i1, i2);
        keelIndices.push(i1, i3, i2);
      }
    }

    const keelGeo = new THREE.BufferGeometry();
    keelGeo.setAttribute('position', new THREE.BufferAttribute(keelPositions, 3));
    keelGeo.setAttribute('color', new THREE.BufferAttribute(keelColors, 3));
    keelGeo.setIndex(keelIndices);
    keelGeo.computeVertexNormals();

    const keelMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.86,
      metalness: 0.18,
      flatShading: true,
      side: THREE.DoubleSide,
    });
    const keelMesh = new THREE.Mesh(keelGeo, keelMat);
    keelMesh.castShadow = true;
    keelMesh.receiveShadow = true;
    mountainGroup.add(keelMesh);

    // =========================================================================
    // A3. MONOLITHIC INVERTED CRAG SPIRES & HANGING ROCK NEEDLES
    // Giant stalactite spires tapering into the sky below the keel (down to y = -52m)
    // =========================================================================
    const spireSeeds = [
      { x: 0, y: -26, z: -2, sx: 2.8, sy: 16.0, sz: 2.8, rotY: 0.4 },
      { x: -16.0, y: -24, z: -8.0, sx: 2.4, sy: 14.5, sz: 2.4, rotY: 1.2 },
      { x: 16.0, y: -23, z: -8.0, sx: 2.2, sy: 14.0, sz: 2.2, rotY: 2.1 },
      { x: 0, y: -25, z: -18, sx: 2.5, sy: 15.0, sz: 2.5, rotY: 0.8 },
      { x: -12, y: -20, z: 12, sx: 1.8, sy: 10.5, sz: 1.8, rotY: 1.6 },
      { x: 14, y: -19, z: 13, sx: 1.7, sy: 10.0, sz: 1.7, rotY: 2.7 },
      { x: -26, y: -18, z: 2, sx: 1.6, sy: 9.5, sz: 1.6, rotY: 0.3 },
      { x: 25, y: -17, z: 3, sx: 1.5, sy: 9.0, sz: 1.5, rotY: 1.9 },
      { x: -20, y: -20, z: -14, sx: 1.6, sy: 10.0, sz: 1.6, rotY: 0.9 },
      { x: 20, y: -19, z: -14, sx: 1.5, sy: 9.5, sz: 1.5, rotY: 2.4 },
    ];

    const spireGeo = new THREE.ConeGeometry(1.0, 1.0, 7);
    spireGeo.rotateX(Math.PI); // Point apex downward into the void
    const spireMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.88,
      metalness: 0.15,
      flatShading: true,
    });

    spireSeeds.forEach((sp) => {
      const spMesh = new THREE.Mesh(spireGeo, spireMat);
      spMesh.position.set(sp.x, sp.y - sp.sy * 0.5, sp.z);
      spMesh.scale.set(sp.sx, sp.sy, sp.sz);
      spMesh.rotation.y = sp.rotY;
      spMesh.castShadow = true;
      spMesh.receiveShadow = true;
      mountainGroup.add(spMesh);
    });

    // =========================================================================
    // A4. HANGING ANCIENT ROOTS & ROCK VINES DANGLING INTO THE OPEN SKY
    // Dense networks of twisting ancient root tendrils clinging to underbelly cliffs
    // =========================================================================
    const rootMat = new THREE.MeshStandardMaterial({
      color: 0x271910, // Dark weathered ancient bark
      roughness: 0.92,
      flatShading: true,
    });
    const rootGeo = new THREE.CylinderGeometry(0.14, 0.05, 1.0, 5);
    const hangingRootsGroup = new THREE.Group();
    mountainGroup.add(hangingRootsGroup);

    interface HangingRootCluster {
      group: THREE.Group;
      baseX: number;
      baseY: number;
      baseZ: number;
      swayFreq: number;
      swayAmp: number;
      phase: number;
    }
    const hangingRootClusters: HangingRootCluster[] = [];

    const rootSpawns = [
      { x: -16, y: -12, z: -8, length: 12 },
      { x: 16, y: -12, z: -7, length: 11 },
      { x: -8, y: -13, z: 10, length: 13 },
      { x: 9, y: -12, z: 12, length: 12 },
      { x: -24, y: -10, z: -3, length: 9 },
      { x: 23, y: -10, z: 3, length: 10 },
      { x: 0, y: -14, z: -14, length: 14 },
      { x: -12, y: -12, z: -18, length: 10 },
      { x: 13, y: -12, z: -17, length: 11 },
      { x: -18, y: -10, z: 14, length: 9 },
      { x: 17, y: -10, z: 15, length: 9 },
      { x: -30, y: -9, z: 1, length: 8 },
      { x: 29, y: -9, z: 2, length: 8 },
    ];

    rootSpawns.forEach((rsp, rIdx) => {
      const rootCluster = new THREE.Group();
      rootCluster.position.set(rsp.x, rsp.y, rsp.z);

      const segments = Math.floor(rsp.length / 1.6);
      let curY = 0;
      let curX = 0;
      let curZ = 0;

      for (let seg = 0; seg < segments; seg++) {
        const segMesh = new THREE.Mesh(rootGeo, rootMat);
        const segLen = 1.6 - seg * 0.05;
        segMesh.scale.set(1.0 - seg * 0.04, segLen, 1.0 - seg * 0.04);
        
        curX += (Math.sin(seg * 1.4 + rIdx) * 0.25);
        curZ += (Math.cos(seg * 1.2 + rIdx) * 0.25);
        curY -= segLen * 0.5;

        segMesh.position.set(curX, curY, curZ);
        segMesh.rotation.z = Math.sin(seg * 0.8 + rIdx) * 0.15;
        segMesh.rotation.x = Math.cos(seg * 0.8 + rIdx) * 0.15;
        rootCluster.add(segMesh);

        curY -= segLen * 0.5;
      }

      hangingRootsGroup.add(rootCluster);
      hangingRootClusters.push({
        group: rootCluster,
        baseX: rsp.x,
        baseY: rsp.y,
        baseZ: rsp.z,
        swayFreq: 0.8 + (rIdx % 4) * 0.2,
        swayAmp: 0.08 + (rIdx % 3) * 0.04,
        phase: rIdx * 0.85,
      });
    });

    // =========================================================================
    // A5. BIOLUMINESCENT CRYSTALLINE GEODES & EMISSIVE AETHER VEINS
    // Glowing crystals protruding from fractures in the floating island underbelly
    // =========================================================================
    const crystalMatCyan = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.8,
      roughness: 0.2,
      metalness: 0.1,
    });
    const crystalMatGold = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xd97706,
      emissiveIntensity: 1.6,
      roughness: 0.2,
      metalness: 0.1,
    });

    const octGeo = new THREE.OctahedronGeometry(0.85, 0);
    const crystalMeshes: { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; phase: number }[] = [];

    const crystalSpawns = [
      { x: -6, y: -22, z: -2, s: 1.2, isGold: false },
      { x: 5, y: -24, z: -4, s: 1.4, isGold: false },
      { x: 0, y: -28, z: -1, s: 1.6, isGold: false },
      { x: -12, y: -19, z: -8, s: 1.1, isGold: true },
      { x: 11, y: -18, z: -7, s: 1.0, isGold: false },
      { x: -3, y: -17, z: 8, s: 1.3, isGold: true },
      { x: 6, y: -19, z: 10, s: 1.1, isGold: false },
      { x: -16, y: -16, z: 4, s: 0.9, isGold: false },
      { x: 15, y: -15, z: 5, s: 0.9, isGold: true },
      { x: 0, y: -25, z: -18, s: 1.3, isGold: false },
    ];

    crystalSpawns.forEach((cs, cIdx) => {
      const cMesh = new THREE.Mesh(octGeo, cs.isGold ? crystalMatGold.clone() : crystalMatCyan.clone());
      cMesh.position.set(cs.x, cs.y, cs.z);
      cMesh.scale.set(cs.s, cs.s * 1.6, cs.s);
      cMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      mountainGroup.add(cMesh);
      crystalMeshes.push({
        mesh: cMesh,
        mat: cMesh.material as THREE.MeshStandardMaterial,
        phase: cIdx * 0.9,
      });
    });

    // =========================================================================
    // A6. DETACHED LEVITATING SATELLITE MICRO-ISLANDS & TUMBLING ROCK SHARDS
    // 16 floating satellite rocks orbiting & hovering in zero-G around the island
    // =========================================================================
    interface SatelliteRock {
      group: THREE.Group;
      baseX: number;
      baseY: number;
      baseZ: number;
      bobFreq: number;
      bobAmp: number;
      rotSpeedX: number;
      rotSpeedY: number;
      phase: number;
    }
    const satelliteRocks: SatelliteRock[] = [];

    const satelliteIsletConfigs = [
      // 4 Larger Satellite Micro-Islands (with mossy plate and tiny pine trees)
      { x: -38, y: 4, z: -32, scale: 3.6, isLarge: true },
      { x: 40, y: 2, z: -28, scale: 3.4, isLarge: true },
      { x: -42, y: -3, z: 24, scale: 3.2, isLarge: true },
      { x: 38, y: -4, z: 26, scale: 3.0, isLarge: true },
      // 12 Floating Jagged Rock Shards tumbling around the perimeter & underbelly
      { x: -28, y: -16, z: -24, scale: 1.8, isLarge: false },
      { x: 26, y: -18, z: -22, scale: 1.7, isLarge: false },
      { x: -32, y: -12, z: 12, scale: 1.6, isLarge: false },
      { x: 30, y: -14, z: 14, scale: 1.9, isLarge: false },
      { x: 0, y: -32, z: -20, scale: 2.2, isLarge: false },
      { x: -14, y: -28, z: 16, scale: 1.5, isLarge: false },
      { x: 16, y: -26, z: 18, scale: 1.6, isLarge: false },
      { x: -46, y: -8, z: -6, scale: 1.4, isLarge: false },
      { x: 44, y: -7, z: -4, scale: 1.5, isLarge: false },
      { x: -20, y: -34, z: -10, scale: 1.7, isLarge: false },
      { x: 22, y: -33, z: -8, scale: 1.8, isLarge: false },
      { x: 0, y: -22, z: 30, scale: 2.0, isLarge: false },
    ];

    const satRockMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.82,
      metalness: 0.15,
      flatShading: true,
    });
    const satMossMat = new THREE.MeshStandardMaterial({
      color: 0x166534,
      roughness: 0.75,
      flatShading: true,
    });

    satelliteIsletConfigs.forEach((cfg, sIdx) => {
      const satGroup = new THREE.Group();
      satGroup.position.set(cfg.x, cfg.y, cfg.z);

      if (cfg.isLarge) {
        // Inverted Cone Keel for Satellite Island
        const satKeelGeo = new THREE.ConeGeometry(cfg.scale, cfg.scale * 2.2, 7);
        satKeelGeo.rotateX(Math.PI);
        const satKeel = new THREE.Mesh(satKeelGeo, satRockMat);
        satKeel.position.y = -cfg.scale * 1.1;
        satGroup.add(satKeel);

        // Mossy Cap Plate
        const capGeo = new THREE.CylinderGeometry(cfg.scale * 0.95, cfg.scale * 0.85, 0.4, 7);
        const satCap = new THREE.Mesh(capGeo, satMossMat);
        satCap.position.y = 0.2;
        satGroup.add(satCap);

        // Miniature Pine Tree on Satellite Island
        const miniTree = new THREE.Group();
        const miniTrunkGeo = new THREE.CylinderGeometry(0.1, 0.16, 1.4, 4);
        const miniTrunk = new THREE.Mesh(miniTrunkGeo, new THREE.MeshStandardMaterial({ color: 0x271910, roughness: 0.9 }));
        miniTrunk.position.y = 0.9;
        miniTree.add(miniTrunk);

        const miniFoliageGeo = new THREE.ConeGeometry(0.9, 2.2, 5);
        const miniFoliage = new THREE.Mesh(miniFoliageGeo, new THREE.MeshStandardMaterial({ color: 0x0f3920, roughness: 0.7 }));
        miniFoliage.position.y = 2.4;
        miniTree.add(miniFoliage);

        miniTree.position.set((Math.random() - 0.5) * cfg.scale * 0.3, 0.2, (Math.random() - 0.5) * cfg.scale * 0.3);
        miniTree.scale.set(0.65, 0.65, 0.65);
        satGroup.add(miniTree);
      } else {
        // Faceted Floating Rock Shard
        const shardGeo = new THREE.DodecahedronGeometry(cfg.scale * 0.7, 1);
        const shardMesh = new THREE.Mesh(shardGeo, satRockMat);
        shardMesh.scale.set(1.0, 1.6, 1.0);
        satGroup.add(shardMesh);
      }

      mountainGroup.add(satGroup);
      satelliteRocks.push({
        group: satGroup,
        baseX: cfg.x,
        baseY: cfg.y,
        baseZ: cfg.z,
        bobFreq: 0.65 + (sIdx % 5) * 0.18,
        bobAmp: 0.45 + (sIdx % 4) * 0.25,
        rotSpeedX: (Math.random() - 0.5) * 0.002,
        rotSpeedY: (Math.random() - 0.5) * 0.003,
        phase: sIdx * 0.75,
      });
    });

    // =========================================================================
    // A7. ABYSSAL UPDRAFT PARTICLES & RISING AETHER SPORES (650 PARTICLES)
    // Luminous updraft motes rising upwards from the void past the island keel
    // =========================================================================
    const UPDRAFT_COUNT = 650;
    const updraftGeo = new THREE.BufferGeometry();
    const updraftPositions = new Float32Array(UPDRAFT_COUNT * 3);
    const updraftVelocities: { vx: number; vy: number; vz: number }[] = [];

    for (let i = 0; i < UPDRAFT_COUNT; i++) {
      const rad = 8.0 + Math.random() * 42.0;
      const ang = Math.random() * Math.PI * 2;
      updraftPositions[i * 3] = Math.cos(ang) * rad;
      updraftPositions[i * 3 + 1] = -46.0 + Math.random() * 56.0;
      updraftPositions[i * 3 + 2] = Math.sin(ang) * rad;

      updraftVelocities.push({
        vx: (Math.random() - 0.5) * 0.04,
        vy: 0.14 + Math.random() * 0.24, // Rapid upward buoyancy
        vz: (Math.random() - 0.5) * 0.04,
      });
    }

    updraftGeo.setAttribute('position', new THREE.BufferAttribute(updraftPositions, 3));
    const updraftMat = new THREE.PointsMaterial({
      size: 0.48,
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const updraftPoints = new THREE.Points(updraftGeo, updraftMat);
    mountainGroup.add(updraftPoints);

    // Add 3D Granite Crag Boulders scattered naturally along the gorge and riverbed
    const boulderMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.78,
      metalness: 0.18,
      flatShading: true,
    });
    const wetBoulderMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.18,
      metalness: 0.45,
      flatShading: true,
    });
    for (let b = 0; b < 28; b++) {
      const bx = (Math.random() - 0.5) * 36;
      const bz = -12 + Math.random() * 42;
      const isWet = Math.abs(bx) < 6 && bz < 6;
      const bGeo = new THREE.DodecahedronGeometry(0.55 + Math.random() * 1.1, 1);
      const bMesh = new THREE.Mesh(bGeo, isWet ? wetBoulderMat : boulderMat);
      bMesh.position.set(bx, isWet ? -4.5 + Math.random() * 0.8 : -2.5 + Math.random() * 4.5, bz);
      bMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      mountainGroup.add(bMesh);
    }

    // =========================================================================
    // B. REALISTIC ALPINE CONIFER PINE FOREST WITH MULTI-TIERED NEEDLE CROWNS
    // =========================================================================
    const pineTrunkMat = new THREE.MeshStandardMaterial({
      color: 0x23180f,
      roughness: 0.92,
      flatShading: true,
    });

    const pineFoliageMats = [
      new THREE.MeshStandardMaterial({ color: 0x0a1f12, roughness: 0.72, flatShading: true }), // Subalpine dark spruce
      new THREE.MeshStandardMaterial({ color: 0x112d1a, roughness: 0.72, flatShading: true }), // Alpine fir
      new THREE.MeshStandardMaterial({ color: 0x183b23, roughness: 0.72, flatShading: true }), // Sunward pine
    ];

    const pineTreeGeo = (scale: number, variant: number) => {
      const treeGroup = new THREE.Group();
      // Natural tapered bark trunk
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * scale, 0.22 * scale, 2.0 * scale, 6), pineTrunkMat);
      trunk.position.y = 1.0 * scale;
      trunk.castShadow = true;
      treeGroup.add(trunk);

      // 4-Tier Realistic Drooping Pine Needle Canopies with offset stars
      const tiers = [
        { r: 1.35 * scale, h: 1.6 * scale, y: 1.5 * scale },
        { r: 1.10 * scale, h: 1.4 * scale, y: 2.3 * scale },
        { r: 0.82 * scale, h: 1.2 * scale, y: 3.1 * scale },
        { r: 0.52 * scale, h: 1.0 * scale, y: 3.9 * scale },
      ];
      tiers.forEach((t, i) => {
        const mat = pineFoliageMats[(variant + i) % pineFoliageMats.length];
        const cone = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 7), mat);
        cone.position.y = t.y;
        cone.rotation.y = variant * 0.6 + i * 0.45;
        cone.castShadow = true;
        cone.receiveShadow = true;
        treeGroup.add(cone);
      });
      return treeGroup;
    };

    // Instantiate 300+ pine forest trees with individual wind sway physics
    const pineTreeMeshes: { group: THREE.Group; baseY: number; baseRotY: number; scale: number; swaySeed: number }[] = [];
    treePositions.forEach((tp) => {
      const tree = pineTreeGeo(tp.scale, tp.variant);
      tree.position.set(tp.x, tp.y, tp.z);
      tree.rotation.y = tp.variant * 1.5;
      mountainGroup.add(tree);
      pineTreeMeshes.push({
        group: tree,
        baseY: tp.y,
        baseRotY: tp.variant * 1.5,
        scale: tp.scale,
        swaySeed: Math.random() * 10,
      });
    });

    // =========================================================================
    // C. ROARING DUAL-STAGE VERTICAL WATERFALL & ROCKY GORGE SYSTEM
    // Anchored firmly to the mountain cirque amphitheater in the rocky gorge cleft (NO cloud overlap)
    // =========================================================================
    // C. SOLID MOUNTAIN-ANCHORED DUAL-STAGE VERTICAL WATERFALL & ROCKY GORGE
    // Originates firmly inside the mountain rock amphitheater at y = 10.5m, z = -13.5m (NO cloud overlap)
    // =========================================================================
    // 1. Upper Glacial Chute & Rock Steps (Rushing down carved granite steps in the mountain cleft)
    const chuteGeo = new THREE.PlaneGeometry(3.6, 6.2, 16, 24);
    const waterfallMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7, // Radiant alpine azure blue
      emissive: 0x0369a1, // Deep cyan-blue inner glow
      emissiveIntensity: 0.38,
      roughness: 0.05,
      metalness: 0.12,
      transmission: 0.82,
      ior: 1.333,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      transparent: true,
      opacity: 0.90,
      side: THREE.DoubleSide,
    });
    const chuteMesh = new THREE.Mesh(chuteGeo, waterfallMat);
    chuteMesh.position.set(0, 8.2, -11.5);
    chuteMesh.rotation.x = -0.72; // Slanted chute rushing down rock shelf
    mountainGroup.add(chuteMesh);

    // 2. Main High-Volume Vertical Plunging Cataract (y = 6.5 to y = 1.5)
    const waterfallRibbonGeo = new THREE.PlaneGeometry(4.2, 6.8, 24, 48);
    const waterfallMesh = new THREE.Mesh(waterfallRibbonGeo, waterfallMat);
    waterfallMesh.position.set(0, 4.0, -8.2);
    waterfallMesh.rotation.x = -0.08; // Sheer vertical roaring torrent
    waterfallMesh.castShadow = true;
    mountainGroup.add(waterfallMesh);

    // 3. Whitewater Foam & Spray Sheath (Translucent aerated whitewater froth layer)
    const foamRibbonGeo = new THREE.PlaneGeometry(4.3, 6.9, 20, 36);
    const foamMat = new THREE.MeshStandardMaterial({
      color: 0xdbeafe, // Soft frothy ice blue
      emissive: 0x38bdf8, // Electric cyan froth shimmer
      emissiveIntensity: 0.28,
      roughness: 0.22,
      transparent: true,
      opacity: 0.58, // Translucent froth allowing the blue water to show through!
      side: THREE.DoubleSide,
    });
    const foamMesh = new THREE.Mesh(foamRibbonGeo, foamMat);
    foamMesh.position.set(0, 4.0, -8.05);
    foamMesh.rotation.x = -0.08;
    mountainGroup.add(foamMesh);

    // 4. Base Cascading Rapids & Gorge Runout Chute (y = 1.5 to y = 0.2, meeting the tilted river)
    const cascadeGeo = new THREE.PlaneGeometry(5.8, 6.5, 20, 24);
    const cascadeMesh = new THREE.Mesh(cascadeGeo, waterfallMat);
    cascadeMesh.position.set(0, 0.8, -5.2);
    cascadeMesh.rotation.x = -0.32; // Churning rapids spilling into tilted river
    mountainGroup.add(cascadeMesh);

    // 5. 3D Volumetric God Rays (Sunbeam shafts cutting through the gorge)
    const godRayGroup = new THREE.Group();
    mountainGroup.add(godRayGroup);
    const rayGeo = new THREE.CylinderGeometry(0.3, 3.2, 28, 12, 1, true);
    const rayMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    for (let r = 0; r < 4; r++) {
      const rayMesh = new THREE.Mesh(rayGeo, rayMat);
      rayMesh.position.set(-6 + r * 3.8, 14 - r * 1.5, -12 + r * 2.5);
      rayMesh.rotation.set(0.65, 0.2, -0.45 + r * 0.12);
      godRayGroup.add(rayMesh);
    }

    // Wet Gorge Flank Boulders
    const wetRockMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.18,
      metalness: 0.55,
      flatShading: true,
    });
    [-2.8, 2.8].forEach((bx) => {
      const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2, 1), wetRockMat);
      boulder.position.set(bx, 0.2, -5.5);
      boulder.castShadow = true;
      mountainGroup.add(boulder);
    });

    // =========================================================================
    // C2. REALISTIC OPTICAL WATERFALL MIST RAINBOW
    // =========================================================================
    const rainbowGeo = new THREE.RingGeometry(2.4, 4.6, 42, 1, 0.25, Math.PI * 0.88);
    const rbCanvas = document.createElement('canvas');
    rbCanvas.width = 256;
    rbCanvas.height = 32;
    const rbCtx = rbCanvas.getContext('2d');
    if (rbCtx) {
      const grad = rbCtx.createLinearGradient(0, 0, 256, 0);
      grad.addColorStop(0.0, 'rgba(239, 68, 68, 0)');
      grad.addColorStop(0.12, 'rgba(239, 68, 68, 0.7)');
      grad.addColorStop(0.28, 'rgba(249, 115, 22, 0.7)');
      grad.addColorStop(0.44, 'rgba(234, 179, 8, 0.75)');
      grad.addColorStop(0.58, 'rgba(34, 197, 94, 0.75)');
      grad.addColorStop(0.72, 'rgba(6, 182, 212, 0.8)');
      grad.addColorStop(0.86, 'rgba(59, 130, 246, 0.75)');
      grad.addColorStop(0.96, 'rgba(168, 85, 247, 0.6)');
      grad.addColorStop(1.0, 'rgba(168, 85, 247, 0)');
      rbCtx.fillStyle = grad;
      rbCtx.fillRect(0, 0, 256, 32);
    }
    const rainbowTex = new THREE.CanvasTexture(rbCanvas);
    const rainbowMat = new THREE.MeshBasicMaterial({
      map: rainbowTex,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const rainbowMesh = new THREE.Mesh(rainbowGeo, rainbowMat);
    rainbowMesh.position.set(1.5, 0.6, -5.2);
    rainbowMesh.rotation.set(-0.35, 0.45, -0.65);
    mountainGroup.add(rainbowMesh);

    // =========================================================================
    // D. HIGH-DENSITY PARTICLES: MOUNTAIN CASCADE SPRAY (STRICTLY ON ROCK SURFACE)
    // =========================================================================
    const PARTICLE_COUNT = 2400;
    const dropGeo = new THREE.BufferGeometry();
    const dropPositions = new Float32Array(PARTICLE_COUNT * 3);
    const dropColors = new Float32Array(PARTICLE_COUNT * 3);
    const dropVelocities: { vx: number; vy: number; vz: number; life: number; maxLife: number }[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      dropPositions[i * 3] = (Math.random() - 0.5) * 3.6;
      dropPositions[i * 3 + 1] = 8.5 - Math.random() * 8.0;
      dropPositions[i * 3 + 2] = -11.5 + Math.random() * 6.5;

      dropVelocities.push({
        vx: (Math.random() - 0.5) * 0.05,
        vy: -(0.32 + Math.random() * 0.38),
        vz: 0.07 + Math.random() * 0.09,
        life: Math.random(),
        maxLife: 1.0,
      });

      const shade = Math.random();
      if (shade < 0.45) {
        // Alpine azure blue
        dropColors[i * 3] = 0.18;
        dropColors[i * 3 + 1] = 0.65;
        dropColors[i * 3 + 2] = 0.95;
      } else if (shade < 0.80) {
        // Bright cyan crystal
        dropColors[i * 3] = 0.45;
        dropColors[i * 3 + 1] = 0.82;
        dropColors[i * 3 + 2] = 0.99;
      } else {
        // Sparkling water glint
        dropColors[i * 3] = 0.88;
        dropColors[i * 3 + 1] = 0.95;
        dropColors[i * 3 + 2] = 1.0;
      }
    }
    dropGeo.setAttribute('position', new THREE.BufferAttribute(dropPositions, 3));
    dropGeo.setAttribute('color', new THREE.BufferAttribute(dropColors, 3));

    const dropPointsMat = new THREE.PointsMaterial({
      size: 0.40,
      vertexColors: true,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
    });
    const dropPoints = new THREE.Points(dropGeo, dropPointsMat);
    mountainGroup.add(dropPoints);

    // High-Density Volumetric Billowing Mist in Gorge (Fresh alpine cyan-sky mist)
    const MIST_COUNT = 1400;
    const mistGeo = new THREE.BufferGeometry();
    const mistPositions = new Float32Array(MIST_COUNT * 3);
    const mistVelocities: { vx: number; vy: number; vz: number; life: number; maxLife: number }[] = [];

    for (let i = 0; i < MIST_COUNT; i++) {
      mistPositions[i * 3] = (Math.random() - 0.5) * 7.5;
      mistPositions[i * 3 + 1] = 0.5 + Math.random() * 6.0;
      mistPositions[i * 3 + 2] = -6.5 + (Math.random() - 0.5) * 5.0;

      mistVelocities.push({
        vx: (Math.random() - 0.5) * 0.04,
        vy: 0.04 + Math.random() * 0.06,
        vz: (Math.random() - 0.5) * 0.04,
        life: Math.random(),
        maxLife: 1.0,
      });
    }
    mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3));
    const mistMat = new THREE.PointsMaterial({
      size: 2.6,
      color: 0xbae6fd, // Fresh alpine sky-cyan mist
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    const mistPoints = new THREE.Points(mistGeo, mistMat);
    mountainGroup.add(mistPoints);

    // =========================================================================
    // 3. REALISTIC 3D VOLUMETRIC FLOATING CLOUDS IN THE HIGH STRATOSPHERE (y = 44m-52m)
    // Towering storm cumulus clouds hovering in the upper sky, far above mountain peaks
    // =========================================================================
    const cloudGroup = new THREE.Group();
    mountainGroup.add(cloudGroup);
    
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.0,
      roughness: 0.95,
      metalness: 0.05,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    interface FloatingCloudCluster {
      group: THREE.Group;
      baseX: number;
      baseY: number;
      baseZ: number;
      driftSpeedX: number;
      driftSpeedZ: number;
      bobFreq: number;
      bobAmp: number;
      rotSpeed: number;
      phase: number;
    }

    const floatingClouds: FloatingCloudCluster[] = [];
    const cloudSeeds = [
      { x: -32, y: 46, z: -24, scale: 2.6, speedX: 0.015, speedZ: 0.007, bobFreq: 0.8 },
      { x: 30, y: 48, z: -22, scale: 2.7, speedX: 0.012, speedZ: 0.008, bobFreq: 0.9 },
      { x: 0, y: 52, z: -36, scale: 3.0, speedX: 0.010, speedZ: 0.005, bobFreq: 0.7 },
      { x: -44, y: 45, z: 10, scale: 2.4, speedX: 0.018, speedZ: 0.010, bobFreq: 1.1 },
      { x: 42, y: 46, z: 12, scale: 2.5, speedX: 0.014, speedZ: 0.008, bobFreq: 1.0 },
      { x: -12, y: 47, z: 28, scale: 2.3, speedX: 0.016, speedZ: 0.011, bobFreq: 1.2 },
      { x: 20, y: 50, z: -40, scale: 2.8, speedX: 0.012, speedZ: 0.006, bobFreq: 0.75 },
      { x: -46, y: 49, z: -16, scale: 2.5, speedX: 0.015, speedZ: 0.009, bobFreq: 0.85 },
      { x: 34, y: 45, z: 30, scale: 2.3, speedX: 0.019, speedZ: 0.012, bobFreq: 1.3 },
    ];

    const sphereGeo = new THREE.SphereGeometry(1.0, 12, 10);

    cloudSeeds.forEach((cs, cIdx) => {
      const clusterGroup = new THREE.Group();
      clusterGroup.position.set(cs.x, cs.y, cs.z);

      const lobeOffsets = [
        { x: 0, y: 0, z: 0, r: 2.8, sy: 0.8 },
        { x: -2.2, y: -0.3, z: 0.4, r: 2.2, sy: 0.75 },
        { x: 2.3, y: -0.2, z: -0.3, r: 2.3, sy: 0.75 },
        { x: -0.8, y: 1.1, z: -0.4, r: 2.1, sy: 0.85 },
        { x: 1.0, y: 0.9, z: 0.5, r: 2.0, sy: 0.85 },
        { x: 0.4, y: -0.5, z: 1.8, r: 1.8, sy: 0.7 },
        { x: -1.2, y: -0.4, z: -1.6, r: 1.9, sy: 0.7 },
        { x: 1.6, y: -0.4, z: 1.5, r: 1.7, sy: 0.65 },
      ];

      lobeOffsets.forEach(lo => {
        const lobeMesh = new THREE.Mesh(sphereGeo, cloudMat);
        lobeMesh.position.set(lo.x * cs.scale, lo.y * cs.scale, lo.z * cs.scale);
        lobeMesh.scale.set(lo.r * cs.scale, lo.r * cs.scale * lo.sy, lo.r * cs.scale);
        clusterGroup.add(lobeMesh);
      });

      cloudGroup.add(clusterGroup);
      floatingClouds.push({
        group: clusterGroup,
        baseX: cs.x,
        baseY: cs.y,
        baseZ: cs.z,
        driftSpeedX: cs.speedX,
        driftSpeedZ: cs.speedZ,
        bobFreq: cs.bobFreq,
        bobAmp: 0.45 + (cIdx % 3) * 0.2,
        rotSpeed: (Math.random() - 0.5) * 0.0015,
        phase: cIdx * 0.75,
      });
    });

    // 4. Plunge Impact Expanding Foam Rings at Gorge Rapids
    const ringGroup = new THREE.Group();
    mountainGroup.add(ringGroup);
    const ringGeo = new THREE.RingGeometry(0.4, 0.95, 28);
    const rings = [0, 1, 2, 3].map((idx) => {
      const rMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8, // Radiant cyan splash rings
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
      });
      const rMesh = new THREE.Mesh(ringGeo, rMat);
      rMesh.rotation.x = -Math.PI / 2;
      rMesh.position.set(0, 0.6, -5.2);
      ringGroup.add(rMesh);
      return { mesh: rMesh, mat: rMat, phase: idx * 0.25 };
    });

    // =========================================================================
    // E. 3D TILTED, VALLEY-FILLING FLOWING CANYON RIVER & RESERVOIR WATER BODY
    // Tilted naturally down the canyon grade (y = 0.6 at rapids to y = -1.8 at weir lip)
    // Custom sculpted to completely fill all valley spaces and hug the canyon walls
    // =========================================================================
    const riverSegmentsX = 48;
    const riverSegmentsZ = 64;
    const riverWidth = 38.0;
    const riverLength = 26.0;
    const canyonWaterGeo = new THREE.PlaneGeometry(riverWidth, riverLength, riverSegmentsX, riverSegmentsZ);
    canyonWaterGeo.rotateX(-Math.PI / 2);

    const cPosAttr = canyonWaterGeo.attributes.position;
    const baseCanyonWaterY = new Float32Array(cPosAttr.count);

    for (let i = 0; i < cPosAttr.count; i++) {
      const rx = cPosAttr.getX(i);
      const rz = cPosAttr.getZ(i); // Ranges from -13.0 to +13.0 (world z: -4.0 to +22.0)

      // World z equivalent
      const worldZ = rz + 9.0;

      // 1. Natural tilted slope down the mountain canyon
      // At worldZ = -4.0 (gorge rapids): y ~ +0.5
      // At worldZ = +19.0 (front weir spillway lip): y ~ -1.6
      const slopeT = Math.max(0, Math.min(1.0, (worldZ - -4.0) / 23.0));
      let wy = (1.0 - slopeT) * 0.55 + slopeT * -1.65;

      // 2. Canyon wall flanching: Hugs and fills the rocky cliff edges at |x| > 8
      const wallDist = Math.abs(rx);
      if (wallDist > 8.0) {
        const wallT = Math.min(1.0, (wallDist - 8.0) / 10.0);
        wy += Math.pow(wallT, 2.0) * 0.45; // Curved valley reservoir waterline
      }

      cPosAttr.setY(i, wy);
      baseCanyonWaterY[i] = wy;
    }
    canyonWaterGeo.computeVertexNormals();

    // High-Fidelity PBR Liquid Water Material (Physical water transmission, clearcoat & refraction)
    const baseLakeY = -2.2;
    const maxLakeY = 0.8;
    const canyonWaterMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7, // Radiant alpine turquoise-azure
      emissive: 0x03496b,
      emissiveIntensity: 0.28,
      roughness: 0.03,
      metalness: 0.06,
      transmission: 0.88, // Physical optical transmission
      ior: 1.333, // True refractive index of liquid water
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      transparent: true,
      opacity: 0.94,
      side: THREE.DoubleSide,
    });
    const lakeMat = canyonWaterMat; // Compatibility alias
    const lakeMesh = new THREE.Mesh(canyonWaterGeo, canyonWaterMat);
    lakeMesh.position.set(0, 0, 9.0);
    lakeMesh.receiveShadow = true;
    mountainGroup.add(lakeMesh);

    // Shoreline Whitewater Foam Border (Dynamic water-line along canyon rock walls)
    const foamRimGeo = new THREE.RingGeometry(5.5, 14.5, 48);
    const foamRimMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc, // Soft alpine cyan froth rim
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
    });
    const foamRimMesh = new THREE.Mesh(foamRimGeo, foamRimMat);
    foamRimMesh.rotation.x = -Math.PI / 2;
    foamRimMesh.position.set(0, 0.1, 4.0);
    mountainGroup.add(foamRimMesh);

    // =========================================================================
    // E2. GRAND PERIMETER CATARACTS (WATER FALLING OFF THE FLOATING ISLAND)
    // River torrent surges over the front gorge weir lip and cascades off cliff precipices into the clouds below
    // Strictly plunging DOWNWARD from the island edge (y = -1.65m) into the abyss (y = -44m)
    // =========================================================================
    const perimeterWaterfallsGroup = new THREE.Group();
    mountainGroup.add(perimeterWaterfallsGroup);

    // 1. Front Cataract Waterfall (Curved fluid chute surging over the gorge lip at z = 19.0 and plunging downward)
    const rimFallWidth = 14.0;
    const rimFallHeight = 42.0;
    const rimFallGeo = new THREE.PlaneGeometry(rimFallWidth, rimFallHeight, 28, 48);
    // Translate geometry so top edge is at y = 0.0 and bottom edge is at y = -42.0
    rimFallGeo.translate(0, -rimFallHeight / 2, 0);

    const rimFallPos = rimFallGeo.attributes.position;
    const baseRimFallZ = new Float32Array(rimFallPos.count);
    for (let i = 0; i < rimFallPos.count; i++) {
      const u = (rimFallPos.getX(i) + rimFallWidth / 2) / rimFallWidth; // 0 to 1 across width
      const curY = rimFallPos.getY(i); // 0 (top weir lip) down to -42.0 (bottom abyss)
      const v = -curY / rimFallHeight; // 0 (top) to 1 (bottom)
      
      // Widen naturally as the torrent falls downward
      const splay = 0.82 + v * 0.40;
      rimFallPos.setX(i, (u - 0.5) * rimFallWidth * splay);
      
      // Parabolic horizontal trajectory launching over weir edge before plunging vertical
      const archZ = Math.sin(Math.min(1.0, v * 3.2) * (Math.PI / 2)) * 3.4 + Math.sin(u * Math.PI) * 0.5;
      rimFallPos.setZ(i, archZ);
      baseRimFallZ[i] = archZ;
    }
    rimFallGeo.computeVertexNormals();

    const rimFallMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7, // Radiant alpine azure blue
      emissive: 0x0369a1,
      emissiveIntensity: 0.38,
      roughness: 0.05,
      metalness: 0.10,
      transmission: 0.82,
      ior: 1.333,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
    });
    const rimFallMesh = new THREE.Mesh(rimFallGeo, rimFallMat);
    rimFallMesh.position.set(0, -1.65, 19.0);
    perimeterWaterfallsGroup.add(rimFallMesh);

    // 2. Churning Whitewater Foam Curtain along Front Cataract
    const rimFoamGeo = new THREE.PlaneGeometry(rimFallWidth * 1.02, rimFallHeight, 22, 40);
    rimFoamGeo.translate(0, -rimFallHeight / 2, 0);
    const rimFoamPos = rimFoamGeo.attributes.position;
    for (let i = 0; i < rimFoamPos.count; i++) {
      const u = (rimFoamPos.getX(i) + (rimFallWidth * 1.02) / 2) / (rimFallWidth * 1.02);
      const curY = rimFoamPos.getY(i);
      const v = -curY / rimFallHeight;
      const splay = 0.82 + v * 0.40;
      rimFoamPos.setX(i, (u - 0.5) * rimFallWidth * 1.02 * splay);
      const archZ = Math.sin(Math.min(1.0, v * 3.2) * (Math.PI / 2)) * 3.45 + Math.sin(u * Math.PI) * 0.55;
      rimFoamPos.setZ(i, archZ);
    }
    rimFoamGeo.computeVertexNormals();

    const rimFoamMat = new THREE.MeshStandardMaterial({
      color: 0xdbeafe, // Soft frothy ice blue
      emissive: 0x38bdf8,
      emissiveIntensity: 0.22,
      roughness: 0.28,
      transparent: true,
      opacity: 0.48, // Translucent froth veil
      side: THREE.DoubleSide,
    });
    const rimFoamMesh = new THREE.Mesh(rimFoamGeo, rimFoamMat);
    rimFoamMesh.position.set(0, -1.63, 19.05);
    perimeterWaterfallsGroup.add(rimFoamMesh);

    // 3. Left Cataract Waterfall (Plunging sheer off west cliffs into the clouds)
    const sideCatWidth = 8.5;
    const sideCatHeight = 38.0;
    const leftCataractGeo = new THREE.PlaneGeometry(sideCatWidth, sideCatHeight, 16, 36);
    leftCataractGeo.translate(0, -sideCatHeight / 2, 0);
    const leftCatPos = leftCataractGeo.attributes.position;
    for (let i = 0; i < leftCatPos.count; i++) {
      const v = -leftCatPos.getY(i) / sideCatHeight;
      const curveZ = Math.sin(Math.min(1.0, v * 2.8) * (Math.PI / 2)) * 2.6;
      leftCatPos.setZ(i, curveZ);
    }
    leftCataractGeo.computeVertexNormals();
    const leftCataractMesh = new THREE.Mesh(leftCataractGeo, rimFallMat);
    leftCataractMesh.position.set(-36.0, -1.8, 3.0);
    leftCataractMesh.rotation.y = Math.PI / 2 + 0.12;
    perimeterWaterfallsGroup.add(leftCataractMesh);

    // 4. Right Cataract Waterfall (Plunging sheer off east cliffs into the clouds)
    const rightCataractGeo = new THREE.PlaneGeometry(sideCatWidth, sideCatHeight, 16, 36);
    rightCataractGeo.translate(0, -sideCatHeight / 2, 0);
    const rightCatPos = rightCataractGeo.attributes.position;
    for (let i = 0; i < rightCatPos.count; i++) {
      const v = -rightCatPos.getY(i) / sideCatHeight;
      const curveZ = Math.sin(Math.min(1.0, v * 2.8) * (Math.PI / 2)) * 2.6;
      rightCatPos.setZ(i, curveZ);
    }
    rightCataractGeo.computeVertexNormals();
    const rightCataractMesh = new THREE.Mesh(rightCataractGeo, rimFallMat);
    rightCataractMesh.position.set(35.5, -2.0, 4.5);
    rightCataractMesh.rotation.y = -Math.PI / 2 - 0.12;
    perimeterWaterfallsGroup.add(rightCataractMesh);

    // 5. Falling Rim Spray Droplets (1,400 particles bursting from waterfall lips into abyss)
    const RIM_SPRAY_COUNT = 1400;
    const rimSprayGeo = new THREE.BufferGeometry();
    const rimSprayPositions = new Float32Array(RIM_SPRAY_COUNT * 3);
    const rimSprayVelocities: { vx: number; vy: number; vz: number; life: number; maxLife: number }[] = [];
    for (let i = 0; i < RIM_SPRAY_COUNT; i++) {
      const isSide = Math.random() < 0.25;
      if (isSide) {
        const isLeft = Math.random() < 0.5;
        rimSprayPositions[i * 3] = isLeft ? -36.0 + (Math.random() - 0.5) * 2.8 : 35.5 + (Math.random() - 0.5) * 2.8;
        rimSprayPositions[i * 3 + 1] = -1.8 - Math.random() * 36.0;
        rimSprayPositions[i * 3 + 2] = (isLeft ? 3.0 : 4.5) + (Math.random() - 0.5) * 4.5;
      } else {
        rimSprayPositions[i * 3] = (Math.random() - 0.5) * 14.0;
        rimSprayPositions[i * 3 + 1] = -1.65 - Math.random() * 40.0;
        rimSprayPositions[i * 3 + 2] = 19.0 + Math.random() * 4.0;
      }
      rimSprayVelocities.push({
        vx: (Math.random() - 0.5) * 0.04,
        vy: -(0.38 + Math.random() * 0.45),
        vz: 0.08 + Math.random() * 0.12,
        life: Math.random(),
        maxLife: 1.0,
      });
    }
    rimSprayGeo.setAttribute('position', new THREE.BufferAttribute(rimSprayPositions, 3));
    const rimSprayMat = new THREE.PointsMaterial({
      size: 0.38,
      color: 0x7dd3fc, // Crystalline cyan spray particles
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const rimSprayPoints = new THREE.Points(rimSprayGeo, rimSprayMat);
    perimeterWaterfallsGroup.add(rimSprayPoints);

    // 6. Billowing Abyss Mist from under the Floating Island (900 particles)
    const ABYSS_MIST_COUNT = 900;
    const abyssMistGeo = new THREE.BufferGeometry();
    const abyssMistPositions = new Float32Array(ABYSS_MIST_COUNT * 3);
    const abyssMistVelocities: { vx: number; vy: number; vz: number }[] = [];
    for (let i = 0; i < ABYSS_MIST_COUNT; i++) {
      abyssMistPositions[i * 3] = (Math.random() - 0.5) * 60.0;
      abyssMistPositions[i * 3 + 1] = -44.0 + Math.random() * 24.0;
      abyssMistPositions[i * 3 + 2] = 16.0 + (Math.random() - 0.5) * 24.0;
      abyssMistVelocities.push({
        vx: (Math.random() - 0.5) * 0.03,
        vy: 0.03 + Math.random() * 0.05,
        vz: (Math.random() - 0.5) * 0.03,
      });
    }
    abyssMistGeo.setAttribute('position', new THREE.BufferAttribute(abyssMistPositions, 3));
    const abyssMistMat = new THREE.PointsMaterial({
      size: 3.4,
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const abyssMistPoints = new THREE.Points(abyssMistGeo, abyssMistMat);
    perimeterWaterfallsGroup.add(abyssMistPoints);

    // =========================================================================
    // E3. 3D REALISTIC WATERDROP RAIN SYSTEM FALLING FROM SKY CLOUDS
    // Micro-streamlined 3D waterdrop streaks with crisp optical specular sheen & refraction
    // =========================================================================
    const drop3DGeo = new THREE.CylinderGeometry(0.04, 0.08, 1.9, 6);
    drop3DGeo.computeVertexNormals();

    const rainDropMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd, // Crystalline sky blue
      emissive: 0x38bdf8,
      emissiveIntensity: 0.65,
      roughness: 0.12,
      metalness: 0.25,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });

    const RAIN_COUNT = 1400;
    const rainInstancedMesh = new THREE.InstancedMesh(drop3DGeo, rainDropMat, RAIN_COUNT);
    rainInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mountainGroup.add(rainInstancedMesh);

    interface RainDropState {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      scale: number;
      cloudIndex: number;
    }
    const rainDrops: RainDropState[] = [];
    const rainDummy = new THREE.Object3D();

    for (let i = 0; i < RAIN_COUNT; i++) {
      const cIdx = i % cloudSeeds.length;
      const cs = cloudSeeds[cIdx];
      // Spawn naturally across the sky atmosphere under the high storm cloud cover
      const rx = (Math.random() - 0.5) * 65.0;
      const ry = 28.0 + Math.random() * 12.0;
      const rz = (Math.random() - 0.5) * 60.0;
      const sc = 0.38 + Math.random() * 0.35;

      rainDrops.push({
        x: rx,
        y: ry,
        z: rz,
        vx: -0.06 - Math.random() * 0.04,
        vy: -(1.4 + Math.random() * 0.85),
        vz: 0.03 + Math.random() * 0.03,
        scale: sc,
        cloudIndex: cIdx,
      });

      rainDummy.position.set(rx, ry, rz);
      rainDummy.scale.set(sc, sc * 2.0, sc);
      rainDummy.updateMatrix();
      rainInstancedMesh.setMatrixAt(i, rainDummy.matrix);
    }
    rainInstancedMesh.instanceMatrix.needsUpdate = true;

    // Dynamic 3D Localized Lightning Strike PointLight (illuminates ONLY where lightning falls)
    const strikeLocalPointLight = new THREE.PointLight(0x7dd3fc, 0, 36, 1.6);
    strikeLocalPointLight.castShadow = false;
    mountainGroup.add(strikeLocalPointLight);

    // =========================================================================
    // 320 REAL-TIME SHIMMERING SUN GLITTER GLINTS ON LAKE SURFACE (4K Camera Specular Highlights)
    // =========================================================================
    const GLITTER_COUNT = 320;
    const glitterGeo = new THREE.BufferGeometry();
    const glitterPositions = new Float32Array(GLITTER_COUNT * 3);
    const glitterSeeds = new Float32Array(GLITTER_COUNT);
    for (let g = 0; g < GLITTER_COUNT; g++) {
      glitterPositions[g * 3] = (Math.random() - 0.5) * 38;
      glitterPositions[g * 3 + 1] = baseLakeY + 0.08;
      glitterPositions[g * 3 + 2] = -4.0 + Math.random() * 26.0;
      glitterSeeds[g] = Math.random() * Math.PI * 2;
    }
    glitterGeo.setAttribute('position', new THREE.BufferAttribute(glitterPositions, 3));
    const glitterMat = new THREE.PointsMaterial({
      size: 0.52,
      color: 0xfffbeb,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glitterPoints = new THREE.Points(glitterGeo, glitterMat);
    mountainGroup.add(glitterPoints);

    // Telemetry Flood Gauge Staff Post
    const staffGroup = new THREE.Group();
    staffGroup.position.set(-3.6, 0, 1.0);
    const staffPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 9.0, 8),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 })
    );
    staffPole.position.y = -1.0;
    staffGroup.add(staffPole);

    for (let mark = 0; mark < 5; mark++) {
      const ringY = -4.8 + mark * 1.6;
      const ringMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.15, 8),
        new THREE.MeshBasicMaterial({
          color: mark >= 3 ? 0xef4444 : mark >= 2 ? 0xf59e0b : 0x06b6d4,
        })
      );
      ringMesh.position.y = ringY;
      staffGroup.add(ringMesh);
    }
    mountainGroup.add(staffGroup);

    // =========================================================================
    // F. INTERACTIVE WATER PHYSICS: RIPPLES, SPLASHES & BUOYANT TIMBER LOGS
    // =========================================================================
    interface WaterRipple {
      localX: number;
      localY: number;
      radius: number;
      maxRadius: number;
      strength: number;
      speed: number;
    }
    const activeRipples: WaterRipple[] = [];

    const SPLASH_POOL = 140;
    const splashGeo = new THREE.BufferGeometry();
    const splashPositions = new Float32Array(SPLASH_POOL * 3);
    const splashVelocities: { vx: number; vy: number; vz: number; life: number; active: boolean }[] = [];
    for (let i = 0; i < SPLASH_POOL; i++) {
      splashVelocities.push({ vx: 0, vy: 0, vz: 0, life: 0, active: false });
      splashPositions[i * 3 + 1] = -100;
    }
    splashGeo.setAttribute('position', new THREE.BufferAttribute(splashPositions, 3));
    const splashMat = new THREE.PointsMaterial({
      size: 0.48,
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const splashPoints = new THREE.Points(splashGeo, splashMat);
    mountainGroup.add(splashPoints);

    interface FloatingItem {
      mesh: THREE.Object3D;
      localX: number;
      localZ: number;
      bobSeed: number;
      rotSpeed: number;
      driftSpeed: number;
    }
    const floatingItems: FloatingItem[] = [];

    const triggerWaterSplash = (worldX: number, worldZ: number, localX: number, localY: number, power: number = 1.0) => {
      activeRipples.push({
        localX,
        localY,
        radius: 0.3,
        maxRadius: 24.0,
        strength: 0.9 * power,
        speed: 10.5,
      });

      let count = 0;
      for (let i = 0; i < SPLASH_POOL && count < 28; i++) {
        const v = splashVelocities[i];
        if (!v.active) {
          v.active = true;
          v.life = 0;
          const angle = Math.random() * Math.PI * 2;
          const spd = (0.09 + Math.random() * 0.2) * power;
          v.vx = Math.cos(angle) * spd;
          v.vy = (0.24 + Math.random() * 0.28) * power;
          v.vz = Math.sin(angle) * spd;
          splashPositions[i * 3] = worldX + (Math.random() - 0.5) * 0.7;
          splashPositions[i * 3 + 1] = lakeMesh.position.y + 0.15;
          splashPositions[i * 3 + 2] = worldZ + (Math.random() - 0.5) * 0.7;
          count++;
        }
      }
      splashGeo.attributes.position.needsUpdate = true;

      playWaterSplashTone(power);
      setRecentSplashCount((c) => c + 1);
    };

    triggerWaterSplashFnRef.current = (wx, wz, pwr) => {
      const worldX = wx ?? (Math.random() - 0.5) * 6.5;
      const worldZ = wz ?? (2.0 + Math.random() * 5.5);
      const local = lakeMesh.worldToLocal(new THREE.Vector3(worldX, lakeMesh.position.y, worldZ));
      triggerWaterSplash(worldX, worldZ, local.x, local.y, pwr ?? 1.25);
    };

    const spawnFloatingObject = () => {
      const isBuoy = floatingItems.length % 2 === 1;
      let itemMesh: THREE.Object3D;

      if (isBuoy) {
        const buoyGroup = new THREE.Group();
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.55, 14, 14),
          new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.25, metalness: 0.1 })
        );
        const band = new THREE.Mesh(
          new THREE.TorusGeometry(0.58, 0.11, 8, 18),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.2 })
        );
        band.rotation.x = Math.PI / 2;
        buoyGroup.add(sphere);
        buoyGroup.add(band);
        itemMesh = buoyGroup;
      } else {
        const logMat = new THREE.MeshStandardMaterial({ color: 0x362213, roughness: 0.9, flatShading: true });
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 3.2, 7), logMat);
        log.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
        itemMesh = log;
      }

      const lx = (Math.random() - 0.5) * 7.5;
      const lz = 1.0 + Math.random() * 6.5;
      itemMesh.position.set(lx, lakeMesh.position.y, lz);
      mountainGroup.add(itemMesh);

      floatingItems.push({
        mesh: itemMesh,
        localX: lx,
        localZ: lz,
        bobSeed: Math.random() * 10,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        driftSpeed: 0.01 + Math.random() * 0.012,
      });
      setFloatingLogsCount(floatingItems.length);

      const local = lakeMesh.worldToLocal(new THREE.Vector3(lx, lakeMesh.position.y, lz));
      triggerWaterSplash(lx, lz, local.x, local.y, 1.4);
    };
    dropFloatingObjectFnRef.current = spawnFloatingObject;

    // Floating 3D Canyon Crystal Minerals
    const crystalGeo = new THREE.OctahedronGeometry(0.85, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xb45309,
      emissiveIntensity: 0.6,
      roughness: 0.15,
      metalness: 0.85,
      flatShading: true,
    });
    const canyonCrystals: { mesh: THREE.Mesh; baseX: number; baseY: number; baseZ: number; rotSpeed: number; bobSeed: number }[] = [];
    [
      [-8.5, 10.5, 4.0, 1.2],
      [-6.2, 6.2, 10.0, 0.85],
      [8.8, 11.2, 5.0, 1.3],
      [6.5, 7.0, 11.0, 0.9],
      [-10.8, 14.0, -2.0, 1.5],
      [10.5, 14.5, -3.0, 1.4],
    ].forEach(([cx, cy, cz, scale]) => {
      const mesh = new THREE.Mesh(crystalGeo, crystalMat);
      mesh.scale.set(scale, scale * 1.3, scale);
      mesh.position.set(cx, cy, cz);
      mountainGroup.add(mesh);
      canyonCrystals.push({
        mesh,
        baseX: cx,
        baseY: cy,
        baseZ: cz,
        rotSpeed: (Math.random() - 0.5) * 0.025,
        bobSeed: Math.random() * 10,
      });
    });

    // Mountain Observatory Summit Telemetry Beacons
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const beaconGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const beaconMeshes: THREE.Mesh[] = [];
    [
      [-17.5, 29.5, -10.0],
      [17.5, 29.0, -10.0],
      [-6.8, 18.0, -14.0],
      [6.8, 18.0, -14.0],
    ].forEach(([bx, by, bz]) => {
      const bMesh = new THREE.Mesh(beaconGeo, beaconMat);
      bMesh.position.set(bx, by, bz);
      mountainGroup.add(bMesh);
      beaconMeshes.push(bMesh);
    });

    // =========================================================================
    // H. SWIRLING ATMOSPHERIC IONIZATION & MONSOON VORTEX MOTES
    // =========================================================================
    const ION_COUNT = 650;
    const ionGeo = new THREE.BufferGeometry();
    const ionPositions = new Float32Array(ION_COUNT * 3);
    const ionColors = new Float32Array(ION_COUNT * 3);
    const ionData: { radius: number; angle: number; y: number; speedY: number; speedAngle: number }[] = [];

    for (let i = 0; i < ION_COUNT; i++) {
      const radius = 2.0 + Math.random() * 16.0;
      const angle = Math.random() * Math.PI * 2;
      const y = -4.0 + Math.random() * 28.0;
      ionPositions[i * 3] = Math.cos(angle) * radius;
      ionPositions[i * 3 + 1] = y;
      ionPositions[i * 3 + 2] = Math.sin(angle) * radius * 0.6 - 3.0;

      const isGolden = Math.random() > 0.45;
      if (isGolden) {
        ionColors[i * 3] = 0.98;     // Amber Gold
        ionColors[i * 3 + 1] = 0.75;
        ionColors[i * 3 + 2] = 0.20;
      } else {
        ionColors[i * 3] = 0.10;     // Electric Cyan
        ionColors[i * 3 + 1] = 0.92;
        ionColors[i * 3 + 2] = 1.0;
      }

      ionData.push({
        radius,
        angle,
        y,
        speedY: (Math.random() - 0.5) * 0.04,
        speedAngle: (0.012 + Math.random() * 0.02) * (Math.random() > 0.5 ? 1 : -1),
      });
    }
    ionGeo.setAttribute('position', new THREE.BufferAttribute(ionPositions, 3));
    ionGeo.setAttribute('color', new THREE.BufferAttribute(ionColors, 3));

    const ionMat = new THREE.PointsMaterial({
      size: 0.42,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
    });
    const ionPoints = new THREE.Points(ionGeo, ionMat);
    mountainGroup.add(ionPoints);

    // =========================================================================
    // G. POINTER & RAYCASTING INTERACTION ON WATER SURFACE & FREE CAMERA CONTROLS
    // =========================================================================
    const raycaster = new THREE.Raycaster();
    const pointer2D = new THREE.Vector2();
    let isPointerDown = false;
    let pointerButton = 0;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let isDraggingCamera = false;
    let lastDragSplashTime = 0;

    const handleCanvasPointerDown = (e: PointerEvent) => {
      if (!canvas) return;
      isPointerDown = true;
      pointerButton = e.button;
      pointerStartX = e.clientX;
      pointerStartY = e.clientY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      isDraggingCamera = false;

      const rect = canvas.getBoundingClientRect();
      pointer2D.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer2D.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      raycaster.setFromCamera(pointer2D, camera);
      const intersects = raycaster.intersectObject(lakeMesh, false);
      if (intersects.length > 0 && e.button === 0) {
        const hit = intersects[0];
        const local = lakeMesh.worldToLocal(hit.point.clone());
        triggerWaterSplash(hit.point.x, hit.point.z, local.x, local.y, 1.25);
        lastDragSplashTime = performance.now();
      }
    };

    const handleCanvasPointerUp = () => {
      isPointerDown = false;
      isDraggingCamera = false;
    };

    const handleCanvasPointerMove = (e: PointerEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      pointer2D.x = (rawX / rect.width) * 2 - 1;
      pointer2D.y = -((rawY / rect.height) * 2 - 1);

      // Handle free camera drag navigation (orbit, pan, to and fro)
      if (isPointerDown) {
        const dx = e.clientX - lastPointerX;
        const dy = e.clientY - lastPointerY;
        const totalDist = Math.hypot(e.clientX - pointerStartX, e.clientY - pointerStartY);
        if (totalDist > 4) {
          isDraggingCamera = true;
          cameraCineModeRef.current = 'free';
          setCameraCineMode('free');
        }

        if (pointerButton === 2 || pointerButton === 1 || e.shiftKey) {
          // Pan camera horizontally (to & fro) and vertically (up & down)
          userPanXRef.current = THREE.MathUtils.clamp(userPanXRef.current - dx * 0.055, -60, 60);
          userPanYRef.current = THREE.MathUtils.clamp(userPanYRef.current + dy * 0.055, -30, 45);
        } else if (pointerButton === 0 && isDraggingCamera) {
          // Left-drag: Orbit perspective (yaw & pitch) + smooth pan
          userOrbitYawRef.current += dx * 0.004;
          userOrbitPitchRef.current = THREE.MathUtils.clamp(userOrbitPitchRef.current - dy * 0.004, -0.65, 0.65);
          userPanXRef.current = THREE.MathUtils.clamp(userPanXRef.current - dx * 0.025, -60, 60);
          userPanYRef.current = THREE.MathUtils.clamp(userPanYRef.current + dy * 0.025, -30, 45);
        }

        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
      }

      raycaster.setFromCamera(pointer2D, camera);
      const intersects = raycaster.intersectObject(lakeMesh, false);
      if (intersects.length > 0) {
        setIsHoveringWater(true);
        const hit = intersects[0];
        const depthVal = Math.max(0.4, ((lakeMesh.position.y - baseLakeY) * 0.72 + Math.max(0, 1.2 - Math.abs(hit.point.x) * 0.12))).toFixed(1);
        const flowVal = (2.6 + Math.max(0, 4.4 - Math.abs(hit.point.z + 1.0) * 0.45)).toFixed(1);
        setWaterHoverInfo({
          x: rawX,
          y: rawY,
          depthM: depthVal,
          currentMps: flowVal,
        });

        if (isPointerDown && !isDraggingCamera) {
          const now = performance.now();
          if (now - lastDragSplashTime > 80) {
            lastDragSplashTime = now;
            const local = lakeMesh.worldToLocal(hit.point.clone());
            triggerWaterSplash(hit.point.x, hit.point.z, local.x, local.y, 0.65);
          }
        }
      } else {
        setIsHoveringWater(false);
        setWaterHoverInfo(null);
      }
    };

    const handleCanvasPointerLeave = () => {
      isPointerDown = false;
      isDraggingCamera = false;
      setIsHoveringWater(false);
      setWaterHoverInfo(null);
    };

    // Zoom camera freely using mouse scroll wheel
    const handleCanvasWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraCineModeRef.current = 'free';
      setCameraCineMode('free');
      // Scrolling down (deltaY > 0) zooms out; scrolling up (deltaY < 0) zooms in
      const zoomDelta = e.deltaY * 0.045;
      userZoomRef.current = THREE.MathUtils.clamp(userZoomRef.current + zoomDelta, -24, 75);
      const pct = Math.round((34 / (34 + userZoomRef.current)) * 100);
      setUserZoomPct(pct);
    };

    // Prevent default context menu on canvas so right-click pan works effortlessly
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Touch pinch-to-zoom support
    let touchStartDist = 0;
    let touchStartZoom = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDist = Math.hypot(dx, dy);
        touchStartZoom = userZoomRef.current;
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.hypot(dx, dy);
        const scale = touchStartDist / Math.max(1, currentDist);
        userZoomRef.current = THREE.MathUtils.clamp(touchStartZoom + (scale - 1) * 22, -24, 75);
        setUserZoomPct(Math.round((34 / (34 + userZoomRef.current)) * 100));
      }
    };

    // Global keyboard navigation keys for free camera control (WASD, Arrows, Q/E, +/-, Space/R)
    const keysPressed: Record<string, boolean> = {};
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      keysPressed[e.code] = true;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'PageUp', 'PageDown', 'Equal', 'Minus'].includes(e.code)) {
        e.preventDefault();
        cameraCineModeRef.current = 'free';
        setCameraCineMode('free');
      }

      if (e.code === 'Space' || e.code === 'KeyR') {
        e.preventDefault();
        userZoomRef.current = 0;
        userPanXRef.current = 0;
        userPanYRef.current = 0;
        userOrbitYawRef.current = 0;
        userOrbitPitchRef.current = 0;
        setUserZoomPct(100);
        cameraCineModeRef.current = 'drone';
        setCameraCineMode('drone');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed[e.code] = false;
    };

    canvas.addEventListener('pointerdown', handleCanvasPointerDown);
    canvas.addEventListener('pointermove', handleCanvasPointerMove);
    canvas.addEventListener('pointerup', handleCanvasPointerUp);
    canvas.addEventListener('pointerleave', handleCanvasPointerLeave);
    canvas.addEventListener('wheel', handleCanvasWheel, { passive: false });
    const containerEl = showcaseContainerRef.current;
    if (containerEl) {
      containerEl.addEventListener('wheel', handleCanvasWheel, { passive: false });
    }
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Mouse parallax tracking
    let mouseX = 0;
    let mouseY = 0;
    const handlePointerMove = (e: MouseEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };
    window.addEventListener('mousemove', handlePointerMove);

    // Resize observer
    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.parentElement.clientWidth;
      height = canvas.parentElement.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // =========================================================================
    // H. MAIN ANIMATION & RENDERING LOOP
    // =========================================================================
    let animId: number;
    let lastReportedFlood = 0;
    let frameCount = 0;
    const curLookTarget = new THREE.Vector3(0, 1.0, -3.0);

    const render = () => {
      animId = requestAnimationFrame(render);
      frameCount++;
      const now = performance.now();
      const elapsed = (now - startTimeRef.current) / 1000;

      // Scaling & Rise progress
      const peaksProgress = Math.min(1.0, elapsed / PEAKS_RISE_DURATION);
      const peaksScale = 0.55 + Math.pow(peaksProgress, 0.8) * 0.45;
      mountainGroup.scale.set(peaksScale, peaksScale, peaksScale);

      // =========================================================================
      // MAJESTIC FLOATING ISLAND CONTINUOUS LEVITATION PHYSICS
      // The entire floating continent breathes with smooth oceanic inertia in the sky
      // =========================================================================
      if (peaksProgress >= 0.75) {
        const floatEase = Math.min(1.0, (peaksProgress - 0.75) / 0.25);
        const floatBob = (Math.sin(elapsed * 0.38) * 0.45 + Math.cos(elapsed * 0.22) * 0.20) * floatEase;
        const floatRoll = (Math.sin(elapsed * 0.26) * 0.005) * floatEase;
        const floatPitch = (Math.cos(elapsed * 0.32) * 0.004) * floatEase;
        mountainGroup.position.y = floatBob;
        mountainGroup.rotation.z = floatRoll;
        mountainGroup.rotation.x = floatPitch;
      }

      // 1. Animate 16 Levitating Satellite Micro-Islands & Tumbling Rock Shards
      satelliteRocks.forEach((sat) => {
        sat.group.position.y = sat.baseY + Math.sin(elapsed * sat.bobFreq + sat.phase) * sat.bobAmp;
        sat.group.rotation.x += sat.rotSpeedX;
        sat.group.rotation.y += sat.rotSpeedY;
      });

      // 2. Animate Bioluminescent Crystalline Geodes with Aether Breathing Pulse
      crystalMeshes.forEach((cr) => {
        const pulse = 1.4 + Math.sin(elapsed * 2.2 + cr.phase) * 0.65;
        cr.mat.emissiveIntensity = pulse;
      });

      // 3. Animate Gentle Wind Sway on Hanging Ancient Roots
      hangingRootClusters.forEach((rc) => {
        const sway = Math.sin(elapsed * rc.swayFreq + rc.phase) * rc.swayAmp;
        rc.group.rotation.z = sway;
        rc.group.rotation.x = Math.cos(elapsed * rc.swayFreq * 0.8 + rc.phase) * (rc.swayAmp * 0.7);
      });

      // 4. Animate 650 Abyssal Updraft Particles Rising Upward past the Island Keel
      const upPos = updraftGeo.attributes.position;
      for (let i = 0; i < UPDRAFT_COUNT; i++) {
        const uv = updraftVelocities[i];
        let ux = upPos.getX(i);
        let uy = upPos.getY(i);
        let uz = upPos.getZ(i);

        uy += uv.vy;
        ux += uv.vx + Math.sin(elapsed * 1.5 + i) * 0.02;
        uz += uv.vz + Math.cos(elapsed * 1.5 + i) * 0.02;

        if (uy > 18.0) {
          const r = 8.0 + Math.random() * 42.0;
          const a = Math.random() * Math.PI * 2;
          ux = Math.cos(a) * r;
          uy = -46.0 - Math.random() * 8.0;
          uz = Math.sin(a) * r;
        }
        upPos.setXYZ(i, ux, uy, uz);
      }
      updraftGeo.attributes.position.needsUpdate = true;

      // Waterfall surge progress
      const waterfallElapsed = Math.max(0, elapsed - PEAKS_RISE_DURATION);
      const waterfallProgress = Math.min(1.0, waterfallElapsed / WATERFALL_SURGE_DURATION);
      const waterfallIntensity = waterfallProgress;

      // DRAMATIC RISING FLOODWATER: Synchronized with interactive waterLevelRatio
      if (isAutoSurgingRef.current) {
        const surgeVal = 0.35 + Math.sin(elapsed * 0.4) * 0.35;
        waterLevelRatioRef.current = Math.max(0, Math.min(1.0, surgeVal));
      }

      // Tilted river rises and swells upward to flood the entire canyon
      const targetWaterElevation = waterLevelRatioRef.current * 2.2;
      lakeMesh.position.y += (targetWaterElevation - lakeMesh.position.y) * 0.15;
      const currentLakeY = lakeMesh.position.y;
      foamRimMesh.position.y = currentLakeY + 0.12;
      foamRimMesh.rotation.z += 0.003;

      const floodHeightPx = Math.round(waterLevelRatioRef.current * height * 0.92);
      if (Math.abs(floodHeightPx - lastReportedFlood) > 4) {
        lastReportedFlood = floodHeightPx;
        setFloodDepth(floodHeightPx);
      }

      // Propagate user interactive water ripples
      for (let rIdx = activeRipples.length - 1; rIdx >= 0; rIdx--) {
        const rip = activeRipples[rIdx];
        rip.radius += rip.speed * 0.016;
        rip.strength *= 0.975;
        if (rip.strength < 0.02 || rip.radius >= rip.maxRadius) {
          activeRipples.splice(rIdx, 1);
        }
      }

      // Animate Realistic 3D Volumetric Floating Clouds in the High Stratosphere
      floatingClouds.forEach((cloud) => {
        cloud.group.visible = true;
        cloud.group.position.x += cloud.driftSpeedX;
        cloud.group.position.z += cloud.driftSpeedZ;
        cloud.group.position.y = cloud.baseY + Math.sin(elapsed * cloud.bobFreq + cloud.phase) * cloud.bobAmp;
        cloud.group.rotation.y += cloud.rotSpeed;

        if (cloud.group.position.x > 50) cloud.group.position.x = -50;
        if (cloud.group.position.x < -50) cloud.group.position.x = 50;
        if (cloud.group.position.z > 40) cloud.group.position.z = -40;
        if (cloud.group.position.z < -40) cloud.group.position.z = 40;
      });

      // Dissipate lightning electric charge in clouds slowly
      if (cloudMat.emissiveIntensity > 0.01) {
        cloudMat.emissiveIntensity *= 0.94;
      }

      // Animate Mountain Waterfall Torrent & Rapids (Firmly anchored to mountain rock cleft)
      chuteMesh.visible = waterfallIntensity > 0.05;
      waterfallMesh.visible = waterfallIntensity > 0.05;
      foamMesh.visible = waterfallIntensity > 0.05;
      cascadeMesh.visible = waterfallIntensity > 0.05;
      dropPoints.visible = waterfallIntensity > 0.05;
      mistPoints.visible = waterfallIntensity > 0.05;

      if (waterfallIntensity > 0.05) {
        waterfallMat.opacity = 0.95 * waterfallIntensity;
        foamMat.opacity = 0.90 * waterfallIntensity;

        // Displace main waterfall vertices with high-speed turbulent downward rapids
        const wPos = waterfallRibbonGeo.attributes.position;
        for (let i = 0; i < wPos.count; i++) {
          const py = wPos.getY(i);
          const px = wPos.getX(i);
          const wave = Math.sin(py * 2.8 - elapsed * 28) * 0.24 + Math.cos(px * 4.8 + elapsed * 16) * 0.12;
          wPos.setZ(i, wave * waterfallIntensity);
        }
        waterfallRibbonGeo.computeVertexNormals();
        waterfallRibbonGeo.attributes.position.needsUpdate = true;

        // Displace intermediate cascade rapids
        const casPos = cascadeGeo.attributes.position;
        for (let i = 0; i < casPos.count; i++) {
          const py = casPos.getY(i);
          const px = casPos.getX(i);
          const cWave = Math.sin(py * 3.8 - elapsed * 24) * 0.2 + Math.cos(px * 3.8 + elapsed * 14) * 0.1;
          casPos.setZ(i, cWave * waterfallIntensity);
        }
        cascadeGeo.computeVertexNormals();
        cascadeGeo.attributes.position.needsUpdate = true;

        // Animate Mountain Whitewater Spray Droplets (Strictly on Rock Face, y = 8.2 to y = 0.0)
        const dPos = dropGeo.attributes.position;
        const spawnY = 8.2;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const v = dropVelocities[i];
          let px = dPos.getX(i);
          let py = dPos.getY(i);
          let pz = dPos.getZ(i);

          py += v.vy * (0.85 + waterfallIntensity * 0.45);
          px += v.vx;
          pz += v.vz;

          if (py <= currentLakeY + 0.2 || py < -1.0) {
            px = (Math.random() - 0.5) * (2.6 + waterfallIntensity * 1.2);
            py = spawnY + Math.random() * 0.6;
            pz = -11.5 + (Math.random() - 0.5) * 2.0;
            v.vy = -(0.30 + Math.random() * 0.35);
          }

          dPos.setXYZ(i, px, py, pz);
        }
        dropGeo.attributes.position.needsUpdate = true;

        // Animate Rising Mist Vapor in Mountain Gorge
        const mPos = mistGeo.attributes.position;
        for (let i = 0; i < MIST_COUNT; i++) {
          const mv = mistVelocities[i];
          let mx = mPos.getX(i);
          let my = mPos.getY(i);
          let mz = mPos.getZ(i);

          my += mv.vy;
          mx += mv.vx;
          mz += mv.vz;
          mv.life += 0.015;

          if (mv.life >= mv.maxLife || my > currentLakeY + 9.5) {
            mx = (Math.random() - 0.5) * 7.5;
            my = currentLakeY + 0.4 + Math.random() * 0.8;
            mz = -5.5 + (Math.random() - 0.5) * 5.0;
            mv.life = 0;
          }
          mPos.setXYZ(i, mx, my, mz);
        }
        mistGeo.attributes.position.needsUpdate = true;

        // Animate Plunge Splash Rings at Gorge Rapids
        ringGroup.position.y = currentLakeY + 0.4;
        rings.forEach((r) => {
          const prog = (elapsed * 1.6 + r.phase) % 1.0;
          const scale = 0.6 + prog * 7.5;
          r.mesh.scale.set(scale, scale, 1);
          r.mat.opacity = (1 - prog) * 0.8 * waterfallIntensity;
        });

        // ========================================================
        // DYNAMIC TILTED FLOWING RIVER & RESERVOIR SURFACE SIMULATION
        // Simulates realistic forward-rushing river current, valley-filling waves & user splash ripples
        // ========================================================
        const cPos = canyonWaterGeo.attributes.position;
        for (let i = 0; i < cPos.count; i++) {
          const rx = cPos.getX(i);
          const rz = cPos.getZ(i);
          const baseY = baseCanyonWaterY[i];

          // 1. Forward-flowing river current ripples (rushing downstream in z+ direction)
          const flowWave = Math.sin(rz * 0.65 - elapsed * 10.0) * 0.15 + Math.cos(rx * 0.75 + elapsed * 5.5) * 0.09;
          
          // 2. Plunge entry impact ripples radiating outward from the mountain gorge rapids
          const distToPlunge = Math.hypot(rx, rz - -13.0);
          const plungeWave = Math.sin(distToPlunge * 1.6 - elapsed * 10.0) * Math.max(0, 1.0 - distToPlunge / 18.0) * 0.28;

          // 3. User interactive ripples
          let userRippleSum = 0;
          for (let r = 0; r < activeRipples.length; r++) {
            const rip = activeRipples[r];
            const dist = Math.hypot(rx - rip.localX, rz - rip.localY);
            if (Math.abs(dist - rip.radius) < 2.5) {
              userRippleSum += Math.sin((dist - rip.radius) * 2.8) * rip.strength;
            }
          }

          cPos.setY(i, baseY + (flowWave + plungeWave) * waterfallIntensity + userRippleSum);
        }
        if (frameCount % 2 === 0) {
          canyonWaterGeo.computeVertexNormals();
        }
        canyonWaterGeo.attributes.position.needsUpdate = true;
      }

      // ========================================================
      // ANIMATE GRAND PERIMETER CATARACTS FALLING OFF THE MODEL INTO THE ABYSS
      // River torrent surges over the front gorge weir lip and plunges sheer down into the clouds
      // ========================================================
      perimeterWaterfallsGroup.visible = waterfallIntensity > 0.05;
      if (waterfallIntensity > 0.05) {
        // 1. Front Rim Cataract Wave Motion
        const rfPos = rimFallGeo.attributes.position;
        for (let i = 0; i < rfPos.count; i++) {
          const py = rfPos.getY(i);
          const px = rfPos.getX(i);
          const fallProgress = Math.min(1.0, -py / 3.5); // 0 at weir lip, 1 as it falls down
          const waveZ = (Math.sin(py * 1.8 - elapsed * 24) * 0.35 + Math.cos(px * 2.4 + elapsed * 14) * 0.18) * fallProgress;
          rfPos.setZ(i, baseRimFallZ[i] + waveZ * waterfallIntensity);
        }
        if (frameCount % 2 === 0) {
          rimFallGeo.computeVertexNormals();
        }
        rimFallGeo.attributes.position.needsUpdate = true;

        // 2. Animate 1,400+ Rim Spray Droplets Falling Off the Model into the Abyss
        const rPos = rimSprayGeo.attributes.position;
        for (let i = 0; i < RIM_SPRAY_COUNT; i++) {
          const v = rimSprayVelocities[i];
          let px = rPos.getX(i);
          let py = rPos.getY(i);
          let pz = rPos.getZ(i);

          py += v.vy * (0.85 + waterfallIntensity * 0.45);
          px += v.vx;
          pz += v.vz;

          // When tumbling into the deep abyss below the model (-44m), reset to top weir crest
          if (py < -44.0) {
            const isSide = Math.random() < 0.25;
            if (isSide) {
              const isLeft = Math.random() < 0.5;
              px = isLeft ? -36.0 + (Math.random() - 0.5) * 2.8 : 35.5 + (Math.random() - 0.5) * 2.8;
              py = -1.8;
              pz = (isLeft ? 3.0 : 4.5) + (Math.random() - 0.5) * 4.5;
            } else {
              px = (Math.random() - 0.5) * 16.0;
              py = -1.65;
              pz = 19.0 + Math.random() * 3.0;
            }
            v.vy = -(0.35 + Math.random() * 0.45);
          }
          rPos.setXYZ(i, px, py, pz);
        }
        rimSprayGeo.attributes.position.needsUpdate = true;

        // 3. Animate Billowing Abyss Mist from under the Floating Island
        const aPos = abyssMistGeo.attributes.position;
        for (let i = 0; i < ABYSS_MIST_COUNT; i++) {
          const av = abyssMistVelocities[i];
          let ax = aPos.getX(i);
          let ay = aPos.getY(i);
          let az = aPos.getZ(i);

          ay += av.vy;
          ax += av.vx;
          az += av.vz;

          if (ay > -16.0) {
            ax = (Math.random() - 0.5) * 55.0;
            ay = -42.0 + Math.random() * 4.0;
            az = 16.0 + (Math.random() - 0.5) * 22.0;
          }
          aPos.setXYZ(i, ax, ay, az);
        }
        abyssMistGeo.attributes.position.needsUpdate = true;
      }

      // ========================================================
      // 3D REALISTIC WATERDROP RAIN SIMULATION FALLING FROM VISIBLE SKY CLOUDS
      // ========================================================
      const rMode = rainModeRef.current;
      if (rMode === 'off') {
        rainInstancedMesh.visible = false;
      } else {
        rainInstancedMesh.visible = true;
        const rainSpeed = rMode === 'monsoon' ? 1.05 : 0.65;
        rainDropMat.opacity = rMode === 'monsoon' ? 0.95 : 0.72;

        for (let i = 0; i < RAIN_COUNT; i++) {
          const drop = rainDrops[i];
          drop.x += drop.vx * rainSpeed;
          drop.y += drop.vy * rainSpeed;
          drop.z += drop.vz * rainSpeed;

          // When 3D waterdrop hits the lake surface or falls past the island perimeter
          if (drop.y <= currentLakeY || drop.y < -14.0) {
            if (drop.y <= currentLakeY && Math.abs(drop.x) < 18.0 && drop.z > -6.0 && drop.z < 20.0) {
              if (Math.random() < (rMode === 'monsoon' ? 0.08 : 0.03) && activeRipples.length < 16) {
                const local = lakeMesh.worldToLocal(new THREE.Vector3(drop.x, currentLakeY, drop.z));
                activeRipples.push({
                  localX: local.x,
                  localY: local.z, // Mapping local z plane
                  radius: 0.08,
                  maxRadius: 2.2,
                  strength: 0.28,
                  speed: 5.4,
                });
              }
            }

            // Respawn directly beneath the visible sky cloud in high stratosphere
            const cs = cloudSeeds[drop.cloudIndex];
            const liveCloud = floatingClouds[drop.cloudIndex]?.group.position || cs;
            drop.x = liveCloud.x + (Math.random() - 0.5) * (18.0 * cs.scale);
            drop.y = liveCloud.y - Math.random() * 4.0;
            drop.z = liveCloud.z + (Math.random() - 0.5) * (16.0 * cs.scale);
          }

          rainDummy.position.set(drop.x, drop.y, drop.z);
          rainDummy.rotation.z = -drop.vx * 0.45;
          rainDummy.rotation.x = drop.vz * 0.45;
          rainDummy.scale.set(drop.scale, drop.scale * 1.7, drop.scale);
          rainDummy.updateMatrix();
          rainInstancedMesh.setMatrixAt(i, rainDummy.matrix);
        }
        rainInstancedMesh.instanceMatrix.needsUpdate = true;
      }

      // Animate User Splash Droplets
      for (let i = 0; i < SPLASH_POOL; i++) {
        const v = splashVelocities[i];
        if (v.active) {
          splashPositions[i * 3] += v.vx;
          splashPositions[i * 3 + 1] += v.vy;
          splashPositions[i * 3 + 2] += v.vz;
          v.vy -= 0.015;
          v.life += 0.035;
          if (splashPositions[i * 3 + 1] <= currentLakeY || v.life >= 1.0) {
            v.active = false;
            splashPositions[i * 3 + 1] = -100;
          }
        }
      }
      splashGeo.attributes.position.needsUpdate = true;

      // Animate Floating Buoyant Items
      floatingItems.forEach((obj) => {
        obj.mesh.position.y = currentLakeY + Math.sin(elapsed * 2.8 + obj.bobSeed) * 0.14;
        obj.mesh.position.z += obj.driftSpeed;
        if (obj.mesh.position.z > 16) {
          obj.mesh.position.z = 0;
        }
        obj.mesh.rotation.y += obj.rotSpeed;
        obj.mesh.rotation.x = Math.sin(elapsed * 1.8 + obj.bobSeed) * 0.12;
      });

      // Animate Floating Canyon Minerals
      canyonCrystals.forEach((c) => {
        c.mesh.rotation.y += c.rotSpeed;
        c.mesh.rotation.x = Math.sin(elapsed * 1.5 + c.bobSeed) * 0.2;
        c.mesh.position.y = c.baseY + Math.sin(elapsed * 2.0 + c.bobSeed) * 0.35;
      });

      // Animate Mountain Observatory Beacons
      beaconMeshes.forEach((b, bIdx) => {
        const offsetStrobe = Math.sin(elapsed * 5.0 + bIdx * 1.2) > 0.2 ? 1.0 : 0.05;
        (b.material as THREE.MeshBasicMaterial).opacity = offsetStrobe;
      });

      // Animate Swirling Atmospheric Ionization & Monsoon Energy Vortex
      const iPos = ionGeo.attributes.position;
      for (let i = 0; i < ION_COUNT; i++) {
        const id = ionData[i];
        id.angle += id.speedAngle;
        id.y += id.speedY;
        if (id.y > 28.0) id.y = -4.0;
        if (id.y < -4.0) id.y = 28.0;
        const ix = Math.cos(id.angle) * id.radius;
        const iz = Math.sin(id.angle) * id.radius * 0.6 - 3.0;
        iPos.setXYZ(i, ix, id.y, iz);
      }
      ionGeo.attributes.position.needsUpdate = true;

      // Animate Pine Forest Canopy Wind Gust Sway
      const windGust = Math.sin(elapsed * 2.4) * 0.06 + Math.cos(elapsed * 4.2) * 0.03;
      pineTreeMeshes.forEach((pt) => {
        pt.group.rotation.z = Math.sin(elapsed * 1.8 + pt.swaySeed) * (0.04 + pt.scale * 0.02) + windGust;
        pt.group.rotation.x = Math.cos(elapsed * 1.5 + pt.swaySeed) * 0.025;
      });

      // ========================================================
      // TIME-OF-DAY ATMOSPHERIC & 3D DYNAMIC LIGHTING PRESETS
      // ========================================================
      const tod = timeOfDayRef.current;
      const isUltraMode = isUltraClarityRef.current;

      // Animate volumetric god rays subtle shimmer
      godRayGroup.children.forEach((ray, rIdx) => {
        (ray as THREE.Mesh).rotation.z = -0.45 + rIdx * 0.12 + Math.sin(elapsed * 0.8 + rIdx) * 0.04;
        const mat = (ray as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.opacity = (tod === 'dawn' ? 0.22 : tod === 'night' ? 0.04 : 0.12) * (isUltraMode ? 0.05 : 1.0);
      });

      if (tod === 'dawn') {
        // 🌅 Golden Hour Dawn: Volumetric golden amber sunlight hitting left side of peaks
        scene.background = isUltraMode
          ? new THREE.Color(0xfef08a).lerp(new THREE.Color(0xf59e0b), 0.4)
          : new THREE.Color(0xf59e0b).lerp(new THREE.Color(0x78350f), 0.55);
        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.setHex(0xd97706);
          scene.fog.density = isUltraMode ? 0.0001 : 0.011;
        }
        ambientLight.color.setHex(0xffedd5);
        ambientLight.intensity = isUltraMode ? 1.65 : 1.45;
        sunLight.color.setHex(0xffe4b5);
        sunLight.intensity = isUltraMode ? 3.8 : 3.4;
        backLight.color.setHex(0xf97316);
        backLight.intensity = isUltraMode ? 3.2 : 2.8;
        plungePointLight.color.setHex(0x38bdf8);
        plungePointLight.intensity = 2.4 + Math.sin(elapsed * 4.5) * 0.4;
        lakeMat.color.setHex(0x0284c7);
        waterfallMat.color.setHex(0x0284c7);
        rimFallMat.color.setHex(0x0284c7);
        crystalMat.color.setHex(0xf59e0b);
        crystalMat.emissive.setHex(0xb45309);
        beaconMat.color.setHex(0xfacc15);
      } else if (tod === 'night') {
        // 🌌 Night Ridge: Deep celestial twilight with bioluminescent accents
        scene.background = isUltraMode ? new THREE.Color(0x060919) : new THREE.Color(0x030712);
        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.setHex(0x020617);
          scene.fog.density = isUltraMode ? 0.0001 : 0.016;
        }
        ambientLight.color.setHex(0x1e1b4b);
        ambientLight.intensity = isUltraMode ? 1.1 : 0.85;
        sunLight.color.setHex(0x38bdf8);
        sunLight.intensity = isUltraMode ? 1.5 : 1.2;
        backLight.color.setHex(0x06b6d4);
        backLight.intensity = isUltraMode ? 2.6 : 2.2;
        plungePointLight.color.setHex(0x06b6d4);
        plungePointLight.intensity = 1.8 + Math.sin(elapsed * 3.5) * 0.3;
        lakeMat.color.setHex(0x0369a1);
        waterfallMat.color.setHex(0x0284c7);
        rimFallMat.color.setHex(0x0284c7);
        crystalMat.color.setHex(0x06b6d4);
        crystalMat.emissive.setHex(0x0891b2);
        beaconMat.color.setHex(0x22d3ee);
      } else {
        // ⛈️ High Monsoon: Moody storm clouds with localized 3D lightning illumination (no screen washout)
        const hasScreenLightning = lightningFlashRef.current > 0.04;

        scene.background = isUltraMode ? new THREE.Color(0x0a101f) : new THREE.Color(0x080e1b);
        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.setHex(0x0f172a);
          scene.fog.density = isUltraMode ? 0.0001 : 0.018;
        }
        ambientLight.color.setHex(0x64748b);
        ambientLight.intensity = isUltraMode ? 1.55 : 1.25;
        sunLight.color.setHex(0x94a3b8);
        sunLight.intensity = isUltraMode ? 2.3 : 1.8;
        backLight.color.setHex(0x6366f1);
        backLight.intensity = isUltraMode ? 2.3 : 1.9;
        plungePointLight.color.setHex(0x0284c7);
        plungePointLight.intensity = 2.2;
        lakeMat.color.setHex(isUltraMode ? 0x0369a1 : 0x0284c7);
        waterfallMat.color.setHex(isUltraMode ? 0x0369a1 : 0x0284c7);
        rimFallMat.color.setHex(isUltraMode ? 0x0369a1 : 0x0284c7);
        crystalMat.color.setHex(0xa855f7);
        crystalMat.emissive.setHex(0x7e22ce);
        beaconMat.color.setHex(0xef4444);

        // Localized 3D lightning strike point light illumination
        if (hasScreenLightning) {
          if (lightningStrikePointRef.current) {
            strikeLocalPointLight.position.set(
              lightningStrikePointRef.current.x,
              lightningStrikePointRef.current.y,
              lightningStrikePointRef.current.z
            );
          }
          strikeLocalPointLight.intensity = lightningFlashRef.current * 16.0;
          strikeLocalPointLight.distance = 32;
          lightningFlashRef.current *= 0.82;
        } else {
          strikeLocalPointLight.intensity = 0;
        }
      }

      // Animate optical mist rainbow shimmer
      if (rainbowMesh) {
        const rbBaseAlpha = (tod === 'dawn' ? 0.68 : tod === 'monsoon' ? 0.28 : 0.05);
        rainbowMat.opacity = rbBaseAlpha * (0.8 + Math.sin(elapsed * 2.2) * 0.2) * (isUltraMode ? 1.0 : 0.85);
        rainbowMesh.rotation.z = -0.65 + Math.sin(elapsed * 0.8) * 0.03;
      }

      // Animate shimmering sun glitter glints on lake surface
      if (glitterPoints) {
        const gPos = glitterGeo.attributes.position;
        for (let g = 0; g < GLITTER_COUNT; g++) {
          gPos.setY(g, lakeMesh.position.y + 0.06 + Math.sin(elapsed * 3.2 + glitterSeeds[g]) * 0.04);
        }
        glitterMat.opacity = (tod === 'dawn' ? 0.95 : tod === 'monsoon' ? 0.45 : 0.15);
        glitterGeo.attributes.position.needsUpdate = true;
      }

      // ========================================================
      // 4K CINEMATIC CAMERA SYSTEM & LIVE CAMERA CINEMATOGRAPHY
      // ========================================================
      // Dynamic Rack Focus & Lens Perspective Compression
      const targetFov = focalLengthRef.current === 24 ? 64 : focalLengthRef.current === 35 ? 46 : focalLengthRef.current === 50 ? 32 : 19;
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.16);
      camera.updateProjectionMatrix();

      // Update camera navigation from held keyboard keys
      const panSpeed = 0.45;
      const zoomSpeed = 0.75;
      if (keysPressed['ArrowLeft'] || keysPressed['KeyA']) {
        userPanXRef.current = THREE.MathUtils.clamp(userPanXRef.current - panSpeed, -60, 60);
      }
      if (keysPressed['ArrowRight'] || keysPressed['KeyD']) {
        userPanXRef.current = THREE.MathUtils.clamp(userPanXRef.current + panSpeed, -60, 60);
      }
      if (keysPressed['ArrowUp'] || keysPressed['KeyW']) {
        userPanYRef.current = THREE.MathUtils.clamp(userPanYRef.current + panSpeed, -30, 45);
      }
      if (keysPressed['ArrowDown'] || keysPressed['KeyS']) {
        userPanYRef.current = THREE.MathUtils.clamp(userPanYRef.current - panSpeed, -30, 45);
      }
      if (keysPressed['KeyQ'] || keysPressed['PageUp']) {
        userPanYRef.current = THREE.MathUtils.clamp(userPanYRef.current + panSpeed, -30, 45);
      }
      if (keysPressed['KeyE'] || keysPressed['PageDown']) {
        userPanYRef.current = THREE.MathUtils.clamp(userPanYRef.current - panSpeed, -30, 45);
      }
      if (keysPressed['Equal'] || keysPressed['KeyZ'] || keysPressed['NumpadAdd']) {
        userZoomRef.current = THREE.MathUtils.clamp(userZoomRef.current - zoomSpeed, -24, 75);
      }
      if (keysPressed['Minus'] || keysPressed['KeyX'] || keysPressed['NumpadSubtract']) {
        userZoomRef.current = THREE.MathUtils.clamp(userZoomRef.current + zoomSpeed, -24, 75);
      }

      const cineMode = cameraCineModeRef.current;
      if (isPlungingRef.current) {
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, -36.0, 0.12);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, -32.0, 0.14);
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0, 0.12);
        camera.fov = THREE.MathUtils.lerp(camera.fov, 115, 0.10);
        camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, -1.25, 0.12);
        camera.updateProjectionMatrix();
        camera.lookAt(0, -45.0, -40.0);
      } else {
        let baseCamX = 0;
        let baseCamY = 3.2;
        let baseCamZ = 34.0;
        let lookTargetX = 0;
        let lookTargetY = 1.0;
        let lookTargetZ = -3.0;
        let rollAngle = 0;

        if (cineMode === 'free') {
          // 🕹️ Free Exploration: Pure user cursor, wheel, and keyboard control
          baseCamX = 0;
          baseCamY = 3.2;
          baseCamZ = 34.0;
          lookTargetX = 0;
          lookTargetY = 1.0;
          lookTargetZ = -3.0;
          rollAngle = 0;
        } else if (cineMode === 'drone') {
          // 🚁 4K Aerial Drone Flight: Sweeping 3D glide through mountain gorge
          const droneT = elapsed * 0.18;
          const droneAngle = Math.sin(droneT * 0.45) * 0.32;
          const droneRadius = 33.5 + Math.sin(droneT * 0.6) * 4.0;
          baseCamX = Math.sin(droneAngle) * droneRadius;
          baseCamZ = Math.cos(droneAngle) * droneRadius - 1.5;
          baseCamY = 3.6 + Math.sin(droneT * 0.55) * 2.2 + Math.cos(droneT * 0.3) * 1.4;
          lookTargetX = Math.sin(droneT * 0.4) * 2.0;
          lookTargetY = 1.2 + Math.sin(droneT * 0.35) * 1.4;
          lookTargetZ = -4.0;
          rollAngle = -Math.sin(droneT * 0.45) * 0.04;
        } else if (cineMode === 'handheld') {
          // 🎥 35mm Handheld Gimbal / Steadicam: Natural organic human micro-breathing & stabilization drift
          const breathX = Math.sin(elapsed * 1.3) * 0.28 + Math.sin(elapsed * 2.7) * 0.12;
          const breathY = Math.cos(elapsed * 1.1) * 0.22 + Math.cos(elapsed * 3.1) * 0.08;
          const microJitterX = Math.sin(elapsed * 7.2) * 0.035;
          const microJitterY = Math.cos(elapsed * 6.5) * 0.035;
          baseCamX = breathX + microJitterX;
          baseCamY = 3.2 + breathY + microJitterY;
          baseCamZ = 33.5;
          lookTargetX = breathX * 0.2;
          lookTargetY = 1.0 + breathY * 0.2;
          lookTargetZ = -3.0;
          rollAngle = breathX * 0.015;
        } else if (cineMode === 'vista') {
          // 🏔️ Ultra-Wide 4K Panoramic: Wide elevated majestic landscape view
          baseCamX = Math.sin(elapsed * 0.12) * 4.2;
          baseCamY = 6.2 + Math.sin(elapsed * 0.2) * 1.2;
          baseCamZ = 38.5;
          lookTargetX = 0;
          lookTargetY = 2.5;
          lookTargetZ = -6.0;
          rollAngle = 0;
        } else if (cineMode === 'telephoto') {
          // 🔍 85mm Telephoto Waterfall Zoom: Tight dramatic crop on plunging whitewater & mist rainbow
          baseCamX = Math.sin(elapsed * 0.25) * 1.2;
          baseCamY = 0.8 + Math.cos(elapsed * 0.2) * 0.8;
          baseCamZ = 18.0;
          lookTargetX = 0;
          lookTargetY = -1.5;
          lookTargetZ = -4.0;
          rollAngle = 0;
        }

        // Add user free navigation: Zoom (to & fro), Pan (left/right & up/down), and Orbit (yaw & pitch)
        const zoomOffset = userZoomRef.current;
        const effectiveDist = Math.max(6.0, baseCamZ + zoomOffset);
        const yaw = userOrbitYawRef.current;
        const pitch = userOrbitPitchRef.current;
        const panX = userPanXRef.current;
        const panY = userPanYRef.current;

        // Physical target position with spherical orbital rotation, user pan offsets, and mouse parallax
        const targetCamX = baseCamX + panX + Math.sin(yaw) * effectiveDist * 0.7 + mouseX * 2.2;
        const targetCamY = baseCamY + panY - Math.sin(pitch) * effectiveDist * 0.5 + mouseY * 1.4;
        const targetCamZ = effectiveDist * Math.cos(yaw) * Math.cos(pitch);

        camera.position.x += (targetCamX - camera.position.x) * 0.08;
        camera.position.y += (targetCamY - camera.position.y) * 0.08;
        camera.position.z += (targetCamZ - camera.position.z) * 0.08;

        if (cameraTremorRef.current > 0.01) {
          const tremor = cameraTremorRef.current;
          camera.position.x += (Math.random() - 0.5) * tremor * 0.42;
          camera.position.y += (Math.random() - 0.5) * tremor * 0.42;
          cameraTremorRef.current *= 0.86;
        }

        const finalLookX = lookTargetX + panX * 0.85 + Math.sin(yaw) * 12;
        const finalLookY = lookTargetY + panY * 0.85 - Math.sin(pitch) * 10;
        const finalLookZ = lookTargetZ;

        // Smooth camera look target interpolation for fluid cinematic pan/orbit
        curLookTarget.x += (finalLookX - curLookTarget.x) * 0.09;
        curLookTarget.y += (finalLookY - curLookTarget.y) * 0.09;
        curLookTarget.z += (finalLookZ - curLookTarget.z) * 0.09;

        // Dynamic Cinema Lens Focal Length (24mm, 35mm, 50mm, 85mm)
        const targetFov = focalLengthRef.current === 24 ? 72 : focalLengthRef.current === 35 ? 54 : focalLengthRef.current === 50 ? 40 : 26;
        if (Math.abs(camera.fov - targetFov) > 0.05) {
          camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.12);
          camera.updateProjectionMatrix();
        }

        camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, rollAngle - mouseX * 0.02, 0.06);
        camera.lookAt(curLookTarget);
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('pointerdown', handleCanvasPointerDown);
      canvas.removeEventListener('pointermove', handleCanvasPointerMove);
      canvas.removeEventListener('pointerup', handleCanvasPointerUp);
      canvas.removeEventListener('pointerleave', handleCanvasPointerLeave);
      canvas.removeEventListener('wheel', handleCanvasWheel);
      if (containerEl) {
        containerEl.removeEventListener('wheel', handleCanvasWheel);
      }
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      renderer.dispose();
      scene.clear();
    };
  }, []);

  const progressPercent = Math.min(100, (currentTime / TOTAL_DURATION) * 100);

  // Hydro Water Ratio & Depth Meter Calculations
  const currentWaterRatio = waterLevelRatio;
  const currentDepthM = (currentWaterRatio * 3.8 + 1.25).toFixed(2);

  // Dynamic Theme for Enter Grid button - Changes color & glow with increasing water level
  const enterGridTheme = (() => {
    if (currentWaterRatio >= 0.75) {
      return {
        gradient: 'bg-gradient-to-r from-red-600 via-rose-600 to-purple-600 hover:from-red-500 hover:to-rose-500',
        border: 'border-rose-400/90',
        shadow: 'shadow-[0_0_40px_rgba(244,63,94,0.9),0_0_15px_rgba(255,255,255,0.7)]',
        pulse: 'animate-pulse',
        textColor: 'text-white',
        tagBg: 'bg-rose-950/80 text-rose-200 border-rose-300/60',
        label: 'Red Alert Surge',
        glowAura: 'ring-2 ring-rose-400/80',
        waterLevelColor: 'text-rose-300',
      };
    }
    if (currentWaterRatio >= 0.50) {
      return {
        gradient: 'bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-500 hover:to-orange-500',
        border: 'border-amber-300/80',
        shadow: 'shadow-[0_0_32px_rgba(245,158,11,0.8),0_0_12px_rgba(251,146,60,0.5)]',
        pulse: 'animate-pulse',
        textColor: 'text-amber-50',
        tagBg: 'bg-amber-950/80 text-amber-200 border-amber-300/60',
        label: 'Orange Flood Warning',
        glowAura: 'ring-2 ring-amber-400/60',
        waterLevelColor: 'text-amber-300',
      };
    }
    if (currentWaterRatio >= 0.25) {
      return {
        gradient: 'bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 hover:from-teal-500 hover:to-emerald-500',
        border: 'border-emerald-300/70',
        shadow: 'shadow-[0_0_26px_rgba(16,185,129,0.65),0_0_10px_rgba(6,182,212,0.4)]',
        pulse: '',
        textColor: 'text-emerald-50',
        tagBg: 'bg-emerald-950/80 text-emerald-200 border-emerald-300/50',
        label: 'Inundation Watch',
        glowAura: 'ring-1 ring-emerald-400/40',
        waterLevelColor: 'text-emerald-300',
      };
    }
    return {
      gradient: 'bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-600 hover:from-sky-500 hover:to-cyan-500',
      border: 'border-cyan-300/60',
      shadow: 'shadow-[0_0_20px_rgba(6,182,212,0.5),0_0_8px_rgba(56,189,248,0.3)]',
      pulse: '',
      textColor: 'text-cyan-50',
      tagBg: 'bg-cyan-950/80 text-cyan-200 border-cyan-300/50',
      label: 'Normal Flow',
      glowAura: '',
      waterLevelColor: 'text-cyan-300',
    };
  })();

  // Translucent Hydrological Alert Status
  const hydroAlert = (() => {
    if (currentWaterRatio >= 0.75) {
      return {
        code: 'RED ALERT',
        stage: 'SURGE BREACH',
        title: 'Flash Flood Red Alert',
        summary: 'Critical crest elevation • Emergency evacuation protocol advised',
        translucentBg: 'bg-rose-950/40 border-rose-500/50 shadow-[0_6px_28px_rgba(244,63,94,0.35)]',
        textColor: 'text-rose-200',
        badgeColor: 'bg-rose-500/25 text-rose-200 border-rose-400/70',
        icon: <AlertOctagon size={14} className="text-rose-400 animate-ping" />,
      };
    }
    if (currentWaterRatio >= 0.50) {
      return {
        code: 'ORANGE WARNING',
        stage: 'HIGH INUNDATION',
        title: 'Orange Flood Warning',
        summary: 'Reservoir spillway surge active • Severe riverbank inundation',
        translucentBg: 'bg-orange-950/40 border-orange-500/50 shadow-[0_6px_24px_rgba(249,115,22,0.3)]',
        textColor: 'text-orange-200',
        badgeColor: 'bg-orange-500/25 text-orange-200 border-orange-400/70',
        icon: <AlertTriangle size={14} className="text-orange-400" />,
      };
    }
    if (currentWaterRatio >= 0.25) {
      return {
        code: 'YELLOW WATCH',
        stage: 'ELEVATED FLOW',
        title: 'Yellow Inundation Watch',
        summary: 'Mountain catchment runoff increasing • Spillway telemetry active',
        translucentBg: 'bg-amber-950/40 border-amber-500/40 shadow-[0_6px_20px_rgba(245,158,11,0.25)]',
        textColor: 'text-amber-200',
        badgeColor: 'bg-amber-500/20 text-amber-200 border-amber-400/60',
        icon: <Info size={14} className="text-amber-300" />,
      };
    }
    return {
      code: 'NORMAL DISCHARGE',
      stage: 'STABLE BASIN',
      title: 'Normal Stream Discharge',
      summary: 'Channel capacity nominal • Regulated gorge runoff parameters',
      translucentBg: 'bg-sky-950/35 border-sky-400/30 shadow-[0_6px_20px_rgba(56,189,248,0.2)]',
      textColor: 'text-sky-200',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-400/50',
      icon: <ShieldCheck size={14} className="text-sky-400" />,
    };
  })();

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black overflow-y-auto sm:overflow-hidden font-sans select-none flex flex-col justify-between items-center pt-14 pb-20 sm:pt-16 sm:pb-24 px-3 sm:px-6"
      onClick={() => {
        if (!hasInteracted && isMuted) {
          toggleSound();
        }
      }}
    >
      {/* Background Luminous Liquid Silk Waves & Floating 3D Rocks */}
      <canvas 
        ref={bgCanvasRef} 
        className="absolute inset-0 w-full h-full block cursor-pointer z-0" 
      />

      {/* Cinematic Vignette & Deep Cosmic Ambiance */}
      <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_180px_rgba(3,1,8,0.96)]" />

      {/* Top Header Controls - Modern 3-Zone Cybernetic HUD */}
      <header className="fixed top-3 left-3 right-3 sm:top-5 sm:left-6 sm:right-6 z-40 flex items-center justify-between pointer-events-auto gap-2 sm:gap-4">
        {/* ZONE 1 (Left): Status Telemetry & Live Regime Indicator */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 bg-slate-950/85 backdrop-blur-xl border border-white/10 hover:border-cyan-400/40 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-2xl transition-all">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-[0.2em] font-bold text-cyan-300 uppercase">
                {currentPhase === 'peaks' && '1/3 • TWIN PEAKS'}
                {currentPhase === 'waterfall' && '2/3 • WATERFALL SURGE'}
                {currentPhase === 'reveal' && '3/3 • SAMVARTAKA AI'}
              </span>
              <span className="text-slate-500 text-[10px] hidden md:inline">|</span>
              <span className="text-xs font-semibold text-slate-200 tracking-wide hidden md:inline">
                {currentPhase === 'peaks' && 'Mountain Peaks Expanding in Clouds'}
                {currentPhase === 'waterfall' && 'Water Cascading Between Peaks'}
                {currentPhase === 'reveal' && 'Regime-Aware Intelligence'}
              </span>
            </div>
          </div>

          {/* Translucent Hydrological Alert Pill in Top Header */}
          <button
            type="button"
            onClick={() => setShowWaterMeterDeck(prev => !prev)}
            className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl border transition-all duration-300 shadow-xl cursor-pointer hover:scale-105 active:scale-95 ${hydroAlert.translucentBg}`}
            title="Click to toggle Hydrological Water Meter & Flow Control Deck"
          >
            <span 
              className="w-2 h-2 rounded-full animate-ping" 
              style={{ backgroundColor: currentWaterRatio >= 0.75 ? '#f43f5e' : currentWaterRatio >= 0.5 ? '#f97316' : currentWaterRatio >= 0.25 ? '#f59e0b' : '#38bdf8' }} 
            />
            <span className={`text-[10px] font-mono font-black uppercase tracking-wider ${hydroAlert.textColor}`}>
              {hydroAlert.code} • +{currentDepthM}m
            </span>
          </button>
        </div>

        {/* ZONE 2 (Center): Environment Presets Segmented Radio Matrix */}
        <div className="hidden md:flex items-center bg-slate-950/90 backdrop-blur-xl border border-white/10 p-1 rounded-full gap-1 shadow-2xl">
          <button
            onClick={() => {
              setTimeOfDay('dawn');
              setActiveWeatherPreset('clear');
            }}
            className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              timeOfDay === 'dawn'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-400/60 shadow-[0_0_14px_rgba(245,158,11,0.45)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <span>☼</span>
            <span>DAWN</span>
          </button>

          <button
            onClick={() => {
              setTimeOfDay('monsoon');
              setActiveWeatherPreset('monsoon');
            }}
            className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              timeOfDay === 'monsoon'
                ? 'bg-purple-500/25 text-purple-200 border border-purple-400/60 shadow-[0_0_14px_rgba(168,85,247,0.45)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <span>⛈</span>
            <span>MONSOON</span>
          </button>

          <button
            onClick={() => {
              setTimeOfDay('night');
              setActiveWeatherPreset('surge');
            }}
            className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              timeOfDay === 'night'
                ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/60 shadow-[0_0_14px_rgba(6,182,212,0.45)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <span>☽</span>
            <span>NIGHT</span>
          </button>
        </div>

        {/* ZONE 3 (Right): Audio Frequency Waveform & Glowing Enter Grid CTA */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Interactive Soundwave Equalizer Visualizer Button */}
          <button
            onClick={toggleSound}
            className={`px-3 py-2 rounded-full border backdrop-blur-xl transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-2.5 ${
              isMuted 
                ? 'bg-slate-900/90 hover:bg-slate-800 text-slate-400 border-white/10' 
                : 'bg-cyan-950/85 hover:bg-cyan-900 text-cyan-200 border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
            }`}
            title={isMuted ? 'Click to Enable Procedural Soundscape' : 'Click to Mute Audio'}
          >
            {/* Animated 5-Bar Frequency Soundwave Equalizer */}
            <div className="flex items-end gap-[3px] h-4 w-6 justify-center">
              {[0.4, 0.85, 1.0, 0.65, 0.9].map((scale, barIdx) => (
                <span
                  key={`eq-bar-${barIdx}`}
                  className={`w-[3px] rounded-full transition-all duration-150 ${
                    isMuted
                      ? 'h-1 bg-slate-600'
                      : 'bg-gradient-to-t from-cyan-500 via-sky-400 to-white animate-pulse'
                  }`}
                  style={{
                    height: isMuted 
                      ? '3px' 
                      : `${Math.max(4, Math.round(scale * 16 * (0.6 + 0.4 * Math.sin(currentTime * 8 + barIdx * 1.5))))}px`,
                    animationDelay: `${barIdx * 120}ms`,
                  }}
                />
              ))}
            </div>

            <span className="text-[11px] font-mono font-bold tracking-wider">
              {isMuted ? 'AUDIO: OFF' : 'LIVE SOUNDWAVE'}
            </span>
          </button>

          {/* Dynamic Enter Grid CTA with Neon Glow */}
          <button
            onClick={handleEnterWaterfall}
            className={`group relative flex items-center gap-2 text-white text-xs font-mono font-bold uppercase tracking-wider px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border backdrop-blur-xl transition-all duration-300 active:scale-95 cursor-pointer shadow-2xl select-none ${enterGridTheme.gradient} ${enterGridTheme.border} ${enterGridTheme.shadow} ${enterGridTheme.pulse} ${enterGridTheme.glowAura}`}
            title={`Enter Grid • Current Water Level: +${currentDepthM}m (${enterGridTheme.label})`}
          >
            <span className="relative z-10 flex items-center gap-1.5">
              <span>ENTER GRID</span>
              <span className={`text-[8.5px] font-mono font-black px-1.5 py-0.2 rounded-full border hidden sm:inline-block ${enterGridTheme.tagBg}`}>
                +{currentDepthM}m
              </span>
            </span>
            <SkipForward size={14} className="relative z-10 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* THE HERO SHOWCASE CARD (Luxury UI Diorama Frame)                          */}
      {/* ========================================================================= */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={isPlunging ? {
          y: [0, -200, -1600],
          scale: [1, 1.06, 1.18],
          filter: 'brightness(1.5) blur(10px)',
          opacity: [1, 0.85, 0],
        } : {
          opacity: 1, 
          scale: 1, 
          y: 0,
          filter: 'brightness(1) blur(0px)',
        }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          transformOrigin: '50% 42%',
        }}
        className="relative z-20 w-full max-w-5xl flex-1 min-h-[440px] max-h-[calc(100vh-160px)] rounded-3xl bg-slate-950/90 backdrop-blur-2xl border border-purple-500/30 shadow-[0_0_80px_rgba(168,85,247,0.25),inset_0_1px_1px_rgba(255,255,255,0.15)] overflow-hidden flex flex-col pointer-events-auto my-auto"
      >
        {/* Showcase Card Top Navigation Bar */}
        <div className="h-10 sm:h-11 border-b border-purple-500/20 bg-slate-900/60 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400/50" />
            <span className="w-2.5 h-2.5 rounded-full bg-purple-300/30" />
            <span className="ml-2 text-[10px] font-mono tracking-widest text-purple-300 font-semibold uppercase hidden sm:inline">
              SAMVARTAKA 3D ATMOSPHERIC SIMULATION
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950/70 border border-purple-500/30 text-[10px] font-mono text-purple-200">
              <Sun size={11} className="text-amber-400" />
              <span>
                {timeOfDay === 'dawn' && '06:15 IST • Dawn Optics'}
                {timeOfDay === 'monsoon' && '12:30 IST • High Monsoon'}
                {timeOfDay === 'night' && '22:45 IST • Night Ridge'}
              </span>
            </div>

            {/* Ultra Clarity Mode Switch */}
            <button
              type="button"
              onClick={() => {
                const next = !isUltraClarity;
                setIsUltraClarity(next);
                if (next) {
                  setShowCondensation(false);
                }
              }}
              className={`px-2.5 py-0.5 rounded-full border text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-all ${
                isUltraClarity
                  ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400/80 shadow-[0_0_12px_rgba(6,182,212,0.6)] font-bold'
                  : 'bg-slate-900/80 hover:bg-slate-800 border-purple-500/25 text-slate-300'
              }`}
              title="Ultra Clarity Mode: Removes all lens blur and fog for crystal-clear HD view"
            >
              <Eye size={11} className={isUltraClarity ? "text-cyan-300" : "text-slate-400"} />
              <span>{isUltraClarity ? 'Ultra Clear: ON' : 'Ultra Clarity'}</span>
            </button>

            {/* Water Meter Deck Dedicated Toggle */}
            <button
              type="button"
              onClick={() => setShowWaterMeterDeck(prev => !prev)}
              className={`px-2.5 py-0.5 rounded-full border text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-all ${
                showWaterMeterDeck
                  ? 'bg-blue-500/30 text-blue-200 border-blue-400/80 shadow-[0_0_12px_rgba(59,130,246,0.6)] font-bold'
                  : 'bg-slate-900/80 hover:bg-slate-800 border-purple-500/25 text-slate-300'
              }`}
              title="Toggle Hydrological Water Meter Deck"
            >
              <Activity size={11} className={showWaterMeterDeck ? "text-blue-300" : "text-cyan-400"} />
              <span>{showWaterMeterDeck ? 'Water Meter: ON' : 'Water Meter'}</span>
            </button>

            {/* Defog / Fog Lens Switch in Upper Bar */}
            <button
              type="button"
              onClick={() => {
                if (isUltraClarity) {
                  setIsUltraClarity(false);
                  setShowCondensation(true);
                } else {
                  setShowCondensation(!showCondensation);
                }
              }}
              className={`px-2.5 py-0.5 rounded-full border text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-all ${
                showCondensation
                  ? 'bg-sky-500/30 text-sky-200 border-sky-400/80 shadow-[0_0_12px_rgba(56,189,248,0.6)] font-bold'
                  : 'bg-slate-900/80 hover:bg-slate-800 border-purple-500/25 text-purple-300'
              }`}
              title="Defog / Fog Camera Lens Glass"
            >
              <Droplets size={11} className={showCondensation ? "text-sky-300" : "text-cyan-400"} />
              <span>{showCondensation ? 'Defog Lens' : 'Fog Lens'}</span>
            </button>

            {/* 3D Rain Particle Simulation Switch */}
            <button
              type="button"
              onClick={toggleRain}
              className={`px-2.5 py-0.5 rounded-full border text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-all ${
                rainMode === 'monsoon'
                  ? 'bg-blue-600/40 text-blue-200 border-blue-400/80 shadow-[0_0_12px_rgba(59,130,246,0.6)] font-bold animate-pulse'
                  : rainMode === 'drizzle'
                  ? 'bg-cyan-600/30 text-cyan-200 border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.4)] font-bold'
                  : 'bg-slate-900/80 hover:bg-slate-800 border-purple-500/25 text-slate-300'
              }`}
              title="Toggle 3D Rain Mode: Off / Drizzle / Monsoon Torrent"
            >
              <CloudRain size={11} className={rainMode !== 'off' ? "text-cyan-300" : "text-slate-400"} />
              <span>Rain: {rainMode === 'monsoon' ? 'Monsoon' : rainMode === 'drizzle' ? 'Drizzle' : 'Off'}</span>
            </button>
          </div>
        </div>

        {/* Viewport Canvas: 3D Mountain Gorge, Waterfall & Interactive Water Layer */}
        <motion.div 
          animate={isPlunging ? {
            scale: 1.45,
            originX: 0.5,
            originY: 0.42,
            filter: 'brightness(1.4)',
          } : {
            scale: 1,
            originX: 0.5,
            originY: 0.5,
            filter: isUltraClarity ? 'brightness(1.05) contrast(1.04) blur(0px)' : 'brightness(1) blur(0px)',
          }}
          transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1] }}
          ref={showcaseContainerRef}
          className="relative flex-1 w-full h-full overflow-hidden flex flex-col justify-between p-3 sm:p-5"
        >
          {!isPlunging && !isUltraClarity && (
            <GlassCondensationOverlay 
              isActive={showCondensation}
              onWipe={() => setShowCondensation(false)}
            />
          )}

          {/* Three.js 3D Mountain Canvas */}
          <canvas 
            ref={mountainCanvasRef} 
            className={`absolute inset-0 w-full h-full block z-10 transition-colors ${
              isHoveringWater ? 'cursor-pointer' : 'cursor-default'
            }`} 
          />

          {/* Dynamic Thunder & Lightning Arcs Canvas (Falls across screen when hovering letters) */}
          <canvas
            ref={lightningCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-25 block"
          />

          {/* Localized Lightning Atmospheric Illumination Flash - only small area where lightning falls */}
          {screenFlash > 0.01 && (
            <div
              className="absolute inset-0 pointer-events-none z-26 transition-opacity duration-75"
              style={{
                background: flashCoords
                  ? `radial-gradient(circle 280px at ${flashCoords.x}px ${flashCoords.y}px, rgba(224, 242, 254, ${screenFlash * 0.88}) 0%, rgba(56, 189, 248, ${screenFlash * 0.45}) 35%, transparent 75%)`
                  : `radial-gradient(circle 260px at 50% 60%, rgba(224, 242, 254, ${screenFlash * 0.75}) 0%, transparent 70%)`,
                mixBlendMode: 'screen',
              }}
            />
          )}

          {/* Authentic 4K Sensor & 35mm Film Grain Overlay */}
          {showFilmGrain && !isPlunging && <div className="cine-4k-grain" />}

          {/* Anamorphic Horizontal Lens Flare Streak in Dawn Sunlight */}
          {timeOfDay === 'dawn' && !isPlunging && (
            <div className="anamorphic-flare-streak top-[24%] opacity-55 z-23 pointer-events-none" />
          )}

          {/* 2.39:1 Anamorphic Cinema Widescreen Matte Bars */}
          {viewfinderMode === 'cinema' && !isPlunging && (
            <>
              <div className="absolute top-0 left-0 right-0 h-10 sm:h-12 bg-black/95 z-28 pointer-events-none border-b border-white/5 flex items-center justify-between px-6">
                <span className="text-[9px] font-mono text-amber-300/80 tracking-widest uppercase">2.39:1 ANAMORPHIC WIDESCREEN • 4K DCI</span>
                <span className="text-[9px] font-mono text-slate-400 tracking-widest hidden sm:inline">SAMVARTAKA CINEVISION</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-10 sm:h-12 bg-black/95 z-28 pointer-events-none border-t border-white/5 flex items-center justify-between px-6">
                <span className="text-[9px] font-mono text-slate-500 hidden sm:inline">COLOR: ACES-CCT / 4K 60FPS</span>
                <span className="text-[9px] font-mono text-cyan-400/80 font-bold">{focalLength}mm T/1.5 PRIME</span>
              </div>
            </>
          )}

          {/* Rule of Thirds Guidelines Grid Overlay */}
          {showRuleOfThirds && !isPlunging && (
            <div className="absolute inset-0 pointer-events-none z-24 grid grid-cols-3 grid-rows-3">
              <div className="border-r border-b border-white/10 border-dashed" />
              <div className="border-r border-b border-white/10 border-dashed" />
              <div className="border-b border-white/10 border-dashed" />
              <div className="border-r border-b border-white/10 border-dashed" />
              <div className="border-r border-b border-white/10 border-dashed" />
              <div className="border-b border-white/10 border-dashed" />
              <div className="border-r border-white/10 border-dashed" />
              <div className="border-r border-white/10 border-dashed" />
              <div />
            </div>
          )}

          {/* Dynamic Live Water Surface Sonar Probe Tooltip */}
          {showFilmGrain && !isPlunging && (
            <div 
              className="absolute inset-0 pointer-events-none z-25 opacity-[0.09] mix-blend-overlay"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat',
              }}
            />
          )}

          {waterHoverInfo && !isPlunging && (
            <div 
              className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3"
              style={{ left: waterHoverInfo.x, top: Math.max(30, waterHoverInfo.y - 10) }}
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/95 border border-cyan-400/80 shadow-[0_0_25px_rgba(6,182,212,0.6)] text-[11px] font-mono text-cyan-200 backdrop-blur-xl whitespace-nowrap animate-in fade-in zoom-in duration-150">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="font-bold text-white tracking-wider">DEPTH: {waterHoverInfo.depthM}m</span>
                <span className="text-cyan-400/50">•</span>
                <span>FLOW: {waterHoverInfo.currentMps} m/s</span>
                <span className="text-cyan-400/50">•</span>
                <span className="text-[10px] font-sans font-semibold text-cyan-300">Click to Splash 🌊</span>
              </div>
              <div className="w-2 h-2 bg-cyan-400 rotate-45 mx-auto -mt-1 shadow-sm" />
            </div>
          )}

          {/* Vignette inside card */}
          <div className="absolute inset-0 pointer-events-none z-15 shadow-[inset_0_0_90px_rgba(0,0,0,0.85)]" />

          {/* Ray-Traced Console Glass Specular Refraction Sheen */}
          <div className="console-glass-sheen z-16 pointer-events-none" />

          {/* Creamy Out-of-Focus Bokeh Orbs (Shallow 65mm Depth of Field) */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-22">
            {[
              { x: '12%', y: '24%', size: 90, color: 'rgba(56,189,248,0.22)', delay: '0s' },
              { x: '82%', y: '18%', size: 120, color: 'rgba(245,158,11,0.20)', delay: '1.2s' },
              { x: '22%', y: '74%', size: 110, color: 'rgba(168,85,247,0.24)', delay: '2.4s' },
              { x: '78%', y: '68%', size: 140, color: 'rgba(6,182,212,0.25)', delay: '0.8s' },
              { x: '48%', y: '15%', size: 80, color: 'rgba(254,240,138,0.28)', delay: '1.8s' },
              { x: '6%', y: '55%', size: 100, color: 'rgba(59,130,246,0.20)', delay: '3.1s' },
              { x: '92%', y: '42%', size: 85, color: 'rgba(239,68,68,0.18)', delay: '2.0s' },
            ].map((b, bIdx) => (
              <div
                key={`bokeh-${bIdx}`}
                className="bokeh-orb animate-pulse"
                style={{
                  left: b.x,
                  top: b.y,
                  width: `${b.size}px`,
                  height: `${b.size}px`,
                  backgroundColor: b.color,
                  animationDuration: `${3.5 + bIdx * 0.7}s`,
                  animationDelay: b.delay,
                }}
              />
            ))}
          </div>

          {/* 4K CINEMA CAMERA VIEW & DIRECTOR TELEMETRY OVERLAY */}
          {viewfinderMode === 'director' && !isPlunging && (
            <>
              {/* Top-Left Camera Viewfinder Controls */}
              <div className="absolute top-3 left-3 z-30 pointer-events-auto flex items-center gap-1.5 select-none">
                <button
                  type="button"
                  onClick={() => setIsMacroFocus(prev => !prev)}
                  className={`hidden sm:flex px-2 py-1 rounded-xl border text-[9px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer ${
                    isMacroFocus
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title="Toggle Macro Telemetry vs Landscape Infinity"
                >
                  {isMacroFocus ? '✦ MACRO' : '✦ INFINITY'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowRuleOfThirds(prev => !prev)}
                  className={`px-2 py-1 rounded-xl border text-[9px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1 ${
                    showRuleOfThirds
                      ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title="Rule of Thirds Grid"
                >
                  <Grid size={11} />
                  <span className="hidden sm:inline">GRID</span>
                </button>
              </div>

              {/* Top-Right Camera Optics & Viewfinder Mode Switcher */}
              <div className="absolute top-3 right-3 z-30 pointer-events-auto flex items-center gap-2 select-none">
                <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-950/90 border border-purple-500/40 backdrop-blur-xl shadow-lg">
                  <span className="text-[9.5px] font-mono font-bold text-amber-300">
                    ISO 100 • {focalLength}mm
                  </span>
                  <span className="text-slate-600 text-[9.5px]">|</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-mono text-slate-400">VU</span>
                    <div className="w-10 h-1.5 bg-slate-900 border border-slate-700 rounded-sm overflow-hidden flex p-[1px]">
                      <div 
                        ref={vuBarRef}
                        className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 rounded-sm transition-all duration-75"
                        style={{ width: '42%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Viewfinder Format Switcher */}
                <div className="flex items-center gap-0.5 bg-slate-950/90 p-0.5 rounded-xl border border-white/10 backdrop-blur-md">
                  {(['director', 'cinema', 'clean'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewfinderMode(mode)}
                      className={`px-2 py-0.5 rounded-lg text-[8.5px] font-mono font-bold uppercase transition-all cursor-pointer ${
                        viewfinderMode === mode
                          ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/80 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                          : 'text-slate-400 hover:text-white border border-transparent'
                      }`}
                    >
                      {mode === 'director' ? 'PRO HUD' : mode === 'cinema' ? 'CINE' : 'CLEAN'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Center Crosshair & Horizon Reticle */}
              <div className="absolute inset-0 pointer-events-none z-24 flex items-center justify-center">
                <div className="relative w-12 h-12 flex items-center justify-center opacity-30">
                  <div className="w-3 h-[1px] bg-cyan-300 absolute left-0" />
                  <div className="w-3 h-[1px] bg-cyan-300 absolute right-0" />
                  <div className="h-3 w-[1px] bg-cyan-300 absolute top-0" />
                  <div className="h-3 w-[1px] bg-cyan-300 absolute bottom-0" />
                  <div className="w-1.5 h-1.5 rounded-full border border-cyan-300" />
                </div>
              </div>
            </>
          )}

          {/* Quick Format Toggle when NOT in director mode */}
          {viewfinderMode !== 'director' && !isPlunging && (
            <div className="absolute top-3 right-3 z-30 pointer-events-auto">
              <button
                type="button"
                onClick={() => setViewfinderMode('director')}
                className="px-2.5 py-1 rounded-xl bg-slate-950/90 border border-cyan-400/50 text-[9px] font-mono font-bold text-cyan-200 backdrop-blur-xl shadow-lg hover:bg-cyan-950 cursor-pointer flex items-center gap-1.5"
              >
                <Camera size={11} className="text-cyan-400" />
                <span>SHOW CAMERA HUD</span>
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ZONE 1: UPPER HERO CENTERPIECE (Title, Subtitle, & Primary CTA)          */}
          {/* ========================================================================= */}
          <div className="relative z-30 flex flex-col items-center text-center pointer-events-none pt-2 sm:pt-4">
            {/* 1. Micro-Eyebrow Badge */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: isPlunging ? 0 : 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-950/80 border border-cyan-500/30 backdrop-blur-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] mb-2 pointer-events-auto"
            >
              <Sparkles size={11} className="text-cyan-300 animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-[0.25em] text-cyan-300 uppercase">
                PRECISION • SPEED • INTELLIGENCE
              </span>
            </motion.div>

            {/* 2. SAMVARTAKA AI - INTERACTIVE GLOWING LETTERS */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ 
                opacity: isPlunging ? 0 : 1,
                scale: isPlunging ? 1.3 : 1 
              }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              onMouseMove={handleTitleMouseMove}
              onMouseLeave={handleTitleMouseLeave}
              className="select-none flex flex-col items-center pointer-events-auto cursor-default"
            >
              <h1 
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-[0.04em] sm:tracking-[0.06em] uppercase leading-none flex flex-wrap items-center justify-center gap-x-1.5 sm:gap-x-2 font-display"
                style={{ transform: 'none' }}
              >
                {/* Word 1: SAMVARTAKA */}
                <span className="inline-flex items-center">
                  {['S', 'A', 'M', 'V', 'A', 'R', 'T', 'A', 'K', 'A'].map((char, charIdx) => {
                    const globalIdx = charIdx;
                    const isDirectlyHovered = hoveredLetterIndex === globalIdx;
                    const proximity = letterGlowStrengths[globalIdx] || 0;
                    const strength = Math.max(proximity, isDirectlyHovered ? 1.0 : 0);

                    return (
                      <span
                        key={`samvartaka-${charIdx}`}
                        ref={(el) => { letterElementsRef.current[globalIdx] = el; }}
                        onMouseEnter={() => {
                          setHoveredLetterIndex(globalIdx);
                          triggerThunderStrike(globalIdx);
                        }}
                        onMouseLeave={() => {
                          if (hoveredLetterIndex === globalIdx) setHoveredLetterIndex(null);
                        }}
                        style={{
                          transform: `translateY(-${strength * 6}px)`,
                          transition: 'transform 0.12s ease-out',
                        }}
                        className="relative inline-block px-0.5 sm:px-1 py-0.5 font-black cursor-pointer group"
                      >
                        {/* Luminous Glow Aura */}
                        <span
                          className="absolute -inset-2 sm:-inset-3 rounded-full pointer-events-none -z-10 blur-md transition-all duration-150"
                          style={{
                            background: 'radial-gradient(circle, rgba(56,189,248,0.7) 0%, rgba(6,182,212,0.4) 50%, transparent 100%)',
                            opacity: Math.max(0.3, strength * 0.95),
                            transform: `scale(${0.9 + strength * 0.35})`,
                          }}
                        />

                        {/* Metallic Cybernetic Title Glyph */}
                        <span className="font-display font-black tracking-tight select-none bg-gradient-to-b from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)] group-hover:drop-shadow-[0_0_24px_rgba(56,189,248,0.9)] transition-all duration-150">
                          {char}
                        </span>

                        {isDirectlyHovered && (
                          <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_12px_#38bdf8] animate-ping pointer-events-none" />
                        )}
                      </span>
                    );
                  })}
                </span>

                {/* Word 2: AI */}
                <span className="inline-flex items-center">
                  {['A', 'I'].map((char, charIdx) => {
                    const globalIdx = 10 + charIdx;
                    const isDirectlyHovered = hoveredLetterIndex === globalIdx;
                    const proximity = letterGlowStrengths[globalIdx] || 0;
                    const strength = Math.max(proximity, isDirectlyHovered ? 1.0 : 0);

                    return (
                      <span
                        key={`ai-${charIdx}`}
                        ref={(el) => { letterElementsRef.current[globalIdx] = el; }}
                        onMouseEnter={() => {
                          setHoveredLetterIndex(globalIdx);
                          triggerThunderStrike(globalIdx);
                        }}
                        onMouseLeave={() => {
                          if (hoveredLetterIndex === globalIdx) setHoveredLetterIndex(null);
                        }}
                        style={{
                          transform: `translateY(-${strength * 6}px)`,
                          transition: 'transform 0.12s ease-out',
                        }}
                        className="relative inline-block px-0.5 sm:px-1 py-0.5 font-black cursor-pointer group"
                      >
                        <span
                          className="absolute -inset-2 sm:-inset-3 rounded-full pointer-events-none -z-10 blur-md transition-all duration-150"
                          style={{
                            background: 'radial-gradient(circle, rgba(56,189,248,0.7) 0%, rgba(6,182,212,0.4) 50%, transparent 100%)',
                            opacity: Math.max(0.3, strength * 0.95),
                            transform: `scale(${0.9 + strength * 0.35})`,
                          }}
                        />

                        <span className="font-display font-black tracking-tight select-none bg-gradient-to-b from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)] group-hover:drop-shadow-[0_0_24px_rgba(56,189,248,0.9)] transition-all duration-150">
                          {char}
                        </span>

                        {isDirectlyHovered && (
                          <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_12px_#38bdf8] animate-ping pointer-events-none" />
                        )}
                      </span>
                    );
                  })}
                </span>
              </h1>

              {/* Accent Hairline Divider */}
              <div className="w-24 sm:w-32 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent my-1.5 opacity-70" />

              {/* 3. Subheading */}
              <motion.h2
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: isPlunging ? 0 : 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-xs sm:text-sm md:text-base font-mono font-bold tracking-[0.22em] text-slate-200 uppercase drop-shadow-md"
              >
                STOP GUESSING. START CALIBRATING.
              </motion.h2>

              {/* 4. Small Description */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: isPlunging ? 0 : 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-[11px] sm:text-xs text-slate-300/80 font-normal tracking-wide max-w-lg mt-0.5 hidden md:block drop-shadow"
              >
                Physics-Informed Deep Neural Post-Processing of Monsoon Rainfall Forecasts
              </motion.p>

              {/* 5. Direct Action CTA */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: isPlunging ? 0 : 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="mt-3 pointer-events-auto flex items-center justify-center gap-3"
              >
                <button
                  onClick={handleEnterWaterfall}
                  className="group relative flex items-center gap-2.5 px-5 sm:px-6 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-white font-mono font-bold text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(6,182,212,0.45),0_6px_20px_rgba(0,0,0,0.6)] border border-cyan-300/70 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                  title="Launch Operational Dashboard (Press Enter or Space)"
                >
                  <span className="flex items-center gap-2">
                    <span>ENTER DASHBOARD</span>
                    <span className="hidden sm:inline-block text-[9px] px-1.5 py-0.5 rounded bg-black/30 border border-white/20 text-cyan-200">
                      SPACE ↵
                    </span>
                  </span>
                  <SkipForward size={14} className="transition-transform group-hover:translate-x-1 text-cyan-200" />
                </button>
              </motion.div>
            </motion.div>
          </div>

          {/* ========================================================================= */}
          {/* ZONE 2: CENTRAL CIRCULAR HYDRO PULSE CONTROLLER & DOCKED TOOLS DOCK       */}
          {/* ========================================================================= */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: isPlunging ? 0 : 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="relative z-30 w-full max-w-xl mx-auto pointer-events-auto my-1 flex flex-col items-center select-none"
          >
            {/* HYDRO CONTROLLER & WATER SCALE ADJUSTMENT */}
            {(() => {
              const currentRatio = waterLevelRatio;
              const depthM = (currentRatio * 3.8 + 1.25).toFixed(2);
              const percent = Math.round(currentRatio * 100);

              // Dynamic color scheme & glowing aura based on water level
              let theme = {
                gradient: 'from-cyan-500 via-teal-600 to-blue-700',
                border: 'border-cyan-300',
                glow: 'shadow-[0_0_35px_rgba(6,182,212,0.85),0_0_70px_rgba(6,182,212,0.4)]',
                textColor: 'text-cyan-200',
                fillColor: '#06b6d4',
                label: 'LOW FLOW'
              };

              if (currentRatio >= 0.7) {
                theme = {
                  gradient: 'from-amber-500 via-orange-600 to-red-600',
                  border: 'border-rose-300/90',
                  glow: 'shadow-[0_0_55px_rgba(245,158,11,1),0_0_110px_rgba(239,68,68,0.7)] animate-pulse',
                  textColor: 'text-rose-200',
                  fillColor: '#ef4444',
                  label: 'TORRENT SURGE'
                };
              } else if (currentRatio >= 0.32) {
                theme = {
                  gradient: 'from-blue-600 via-purple-600 to-indigo-700',
                  border: 'border-purple-300/80',
                  glow: 'shadow-[0_0_45px_rgba(168,85,247,0.9),0_0_90px_rgba(99,102,241,0.5)]',
                  textColor: 'text-purple-200',
                  fillColor: '#a855f7',
                  label: 'MONSOON FLOW'
                };
              }

              // Dock tools with clear layout
              const dockHydroOptions = [
                {
                  id: 'splash',
                  label: 'Splash Water Surface Ripples',
                  shortLabel: 'Splash',
                  icon: <Waves size={15} className="text-cyan-400" />,
                  action: () => triggerWaterSplashFnRef.current?.(undefined, undefined, 1.8),
                  colorClass: 'bg-cyan-950/90 border-cyan-400/80 text-cyan-200 hover:bg-cyan-900 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                },
                {
                  id: 'float',
                  label: 'Drop Floating Timber Log',
                  shortLabel: 'Float Log',
                  icon: <span className="text-xs">🪵</span>,
                  badge: floatingLogsCount,
                  action: () => dropFloatingObjectFnRef.current?.(),
                  colorClass: 'bg-amber-950/90 border-amber-400/80 text-amber-200 hover:bg-amber-900 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                },
                {
                  id: 'autosurge',
                  label: isAutoSurging ? 'Pause Flood Inundation' : 'Auto Monsoon Surge',
                  shortLabel: isAutoSurging ? 'Surging' : 'Auto Surge',
                  icon: <Zap size={15} className={isAutoSurging ? "text-rose-400 animate-bounce" : "text-purple-300"} />,
                  action: () => {
                    setIsAutoSurging(prev => !prev);
                    isAutoSurgingRef.current = !isAutoSurgingRef.current;
                  },
                  colorClass: isAutoSurging
                    ? 'bg-rose-950/90 border-rose-400 text-rose-200 shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse'
                    : 'bg-purple-950/90 border-purple-400/80 text-purple-200 hover:bg-purple-900 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                },
                {
                  id: 'reset',
                  label: 'Reset Water Level (Normal 35%)',
                  shortLabel: 'Reset',
                  icon: <RefreshCw size={14} className="text-emerald-400" />,
                  action: () => handleSetWaterLevel(0.35),
                  colorClass: 'bg-emerald-950/90 border-emerald-400/80 text-emerald-200 hover:bg-emerald-900 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                }
              ];

              return (
                <div className="relative flex flex-col items-center justify-center w-full">
                  {/* CENTRAL CONTAINER FOR HYDRO ORB */}
                  <div className="relative flex flex-col items-center justify-center">
                    {/* MAIN CENTRAL HYDRO ORB CIRCLE (100% UNIFIED TAP AREA) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsCircleHubOpen(prev => !prev);
                      }}
                      className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 ${theme.border} bg-slate-950/95 flex flex-col items-center justify-center p-1.5 cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 ${theme.glow} overflow-hidden group select-none z-30`}
                      title="Tap anywhere on this circle to toggle interactive water tools menu"
                    >
                      {/* Outer Pulsing Dashed Target Ring Indicator */}
                      <div className="absolute -inset-1 rounded-full border border-dashed border-cyan-400/80 animate-spin-slow pointer-events-none" />

                      {/* Animated Hydro Water Level Liquid Fill inside Circle */}
                      <div
                        className="absolute bottom-0 left-0 right-0 transition-all duration-300 ease-out opacity-40 group-hover:opacity-60 pointer-events-none"
                        style={{
                          height: `${percent}%`,
                          background: `linear-gradient(to top, ${theme.fillColor}, transparent)`
                        }}
                      />

                      {/* Unified Inner Content with pointer-events-none */}
                      <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none text-center leading-tight">
                        <Droplets size={14} className={`${theme.textColor} mb-0.5 animate-bounce shrink-0`} />
                        <span className="font-mono font-black text-xs sm:text-sm text-white tracking-wide drop-shadow-md">
                          +{depthM}m
                        </span>
                        <span className={`text-[7.5px] sm:text-[8px] font-mono font-bold tracking-wider ${theme.textColor} uppercase mt-0.5`}>
                          {percent}% • {theme.label}
                        </span>
                        <span className="text-[7px] font-sans font-extrabold text-cyan-200 tracking-wider uppercase mt-1 px-1.5 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-400/80 shadow-md">
                          {isCircleHubOpen ? '▲ HIDE' : '✦ TOOLS'}
                        </span>
                      </div>
                    </button>

                    {/* DOCKED TOOLS TOOLBAR (Appears cleanly below orb - never overlaps titles!) */}
                    <AnimatePresence>
                      {isCircleHubOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.95 }}
                          transition={{ duration: 0.18 }}
                          className="flex items-center justify-center gap-1 sm:gap-1.5 mt-1.5 flex-wrap z-30 max-w-sm"
                        >
                          {dockHydroOptions.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                opt.action();
                              }}
                              className={`relative px-2 py-0.5 rounded-full flex items-center gap-1 border backdrop-blur-xl shadow-md transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer text-xs font-semibold ${opt.colorClass}`}
                              title={opt.label}
                            >
                              {opt.icon}
                              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-white">
                                {opt.shortLabel}
                              </span>
                              {opt.badge !== undefined && opt.badge > 0 && (
                                <span className="px-1 py-0.1 rounded-full bg-amber-500 text-black text-[7.5px] font-mono font-bold">
                                  {opt.badge}
                                </span>
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })()}
          </motion.div>

          {/* ========================================================================= */}
          {/* ZONE 3: 4K CINEMA CAMERA, FREE NAVIGATION & ZOOM DOCK                     */}
          {/* Positioned cleanly below hero centerpiece and hydro tools (no overlay)    */}
          {/* ========================================================================= */}
          {!isPlunging && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5 }}
              className="relative z-30 w-full max-w-3xl mx-auto pointer-events-auto mt-2 flex flex-col items-center gap-1.5 select-none"
            >
              <div className="flex items-center flex-wrap justify-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-950/85 backdrop-blur-xl border border-cyan-500/25 shadow-[0_8px_32px_rgba(0,0,0,0.7)]">
                {/* Cine Camera Modes */}
                <div className="flex items-center gap-1">
                  <div className="hidden sm:flex items-center gap-1 text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider pr-1">
                    <Film size={11} className="text-cyan-400" />
                    <span>CINE:</span>
                  </div>
                  {(
                    [
                      { id: 'drone', label: '🎬 Drone', desc: 'Sweeping 4K aerial drone' },
                      { id: 'handheld', label: '🎥 Handheld', desc: '35mm Steadicam motion' },
                      { id: 'vista', label: '🏔️ Vista', desc: 'Panoramic alpine vista' },
                      { id: 'telephoto', label: '🔍 Telephoto', desc: '85mm waterfall macro' },
                      { id: 'free', label: '🕹️ Free Roam', desc: 'Full manual free camera navigation' },
                    ] as const
                  ).map(cm => (
                    <button
                      key={cm.id}
                      type="button"
                      onClick={() => setCameraCineMode(cm.id)}
                      title={cm.desc}
                      className={`px-2 py-1 rounded-xl text-[9px] font-mono font-bold transition-all cursor-pointer ${
                        cameraCineMode === cm.id
                          ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                          : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      {cm.label}
                    </button>
                  ))}
                </div>

                <div className="hidden md:block w-[1px] h-4 bg-white/10" />

                {/* Free Zoom Controls */}
                <div className="flex items-center gap-1">
                  <span className="hidden sm:inline text-[9px] font-mono text-slate-400 font-semibold">ZOOM:</span>
                  <button
                    type="button"
                    onClick={() => handleZoom(10)}
                    className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                    title="Zoom Out (wide view)"
                  >
                    <Minus size={11} />
                  </button>
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px] font-mono font-bold text-cyan-300 min-w-[42px] text-center font-feature-tabular-nums">
                    {userZoomPct}%
                  </span>
                  <button
                    type="button"
                    onClick={() => handleZoom(-10)}
                    className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                    title="Zoom In (close-up)"
                  >
                    <Plus size={11} />
                  </button>
                </div>

                <div className="hidden md:block w-[1px] h-4 bg-white/10" />

                {/* Pan Directional Controls */}
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => handlePan(-4, 0)}
                    className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                    title="Pan Left (or press A / Left Arrow)"
                  >
                    <ArrowLeft size={11} />
                  </button>
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => handlePan(0, 4)}
                      className="p-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                      title="Pan Up (or press W / Up Arrow)"
                    >
                      <ArrowUp size={9} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePan(0, -4)}
                      className="p-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                      title="Pan Down (or press S / Down Arrow)"
                    >
                      <ArrowDown size={9} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePan(4, 0)}
                    className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                    title="Pan Right (or press D / Right Arrow)"
                  >
                    <ArrowRight size={11} />
                  </button>

                  <button
                    type="button"
                    onClick={handleResetCamera}
                    className="ml-1 px-1.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[8.5px] font-mono font-bold text-amber-300 hover:text-amber-200 transition-all cursor-pointer flex items-center gap-1"
                    title="Reset Camera View (or press Space / R)"
                  >
                    <RotateCcw size={10} />
                    <span className="hidden sm:inline">RESET</span>
                  </button>
                </div>

                <div className="w-[1px] h-4 bg-white/10" />

                {/* Focal Lengths - 24mm, 35mm, 50mm, 85mm */}
                <div className="flex items-center gap-1">
                  <Aperture size={11} className="text-amber-400 shrink-0" />
                  {([24, 35, 50, 85] as const).map(fl => (
                    <button
                      key={fl}
                      type="button"
                      onClick={() => handleSelectFocalLength(fl)}
                      className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold transition-all cursor-pointer ${
                        focalLength === fl
                          ? 'bg-amber-500/30 text-amber-200 border border-amber-400/80 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                          : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/5'
                      }`}
                      title={`${fl}mm Cinema Prime Lens`}
                    >
                      {fl}mm
                    </button>
                  ))}
                </div>

                <div className="w-[1px] h-4 bg-white/10" />

                {/* Film Grain */}
                <button
                  type="button"
                  onClick={handleToggleFilmGrain}
                  className={`flex px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold transition-all cursor-pointer border ${
                    showFilmGrain
                      ? 'bg-purple-500/30 text-purple-200 border-purple-400/80 shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                      : 'border-slate-800 text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Toggle 4K Sensor Film Grain"
                >
                  GRAIN: {showFilmGrain ? 'ON' : 'OFF'}
                </button>

                <div className="w-[1px] h-4 bg-white/10" />

                {/* Dynamic 3D Rain Button */}
                <button
                  type="button"
                  onClick={handleToggleRain}
                  className={`px-2 py-0.5 rounded-xl text-[8.5px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                    rainMode === 'monsoon'
                      ? 'bg-blue-600/40 text-blue-200 border-blue-400/80 shadow-[0_0_10px_rgba(59,130,246,0.6)] animate-pulse'
                      : rainMode === 'drizzle'
                      ? 'bg-cyan-600/30 text-cyan-200 border-cyan-400/80 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white border-slate-700/80'
                  }`}
                  title="Toggle 3D Rain Particle Simulation: Off / Drizzle / Monsoon Downpour"
                >
                  <CloudRain size={10} className={rainMode !== 'off' ? 'text-cyan-300' : 'text-slate-400'} />
                  <span>RAIN: {rainMode.toUpperCase()}</span>
                </button>
              </div>

              {/* Dynamic HUD Quick Feedback Toast */}
              <AnimatePresence>
                {hudToast && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.95 }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/90 border border-amber-400/80 text-amber-200 text-[9.5px] font-mono font-bold tracking-wider shadow-[0_0_18px_rgba(245,158,11,0.4)]"
                  >
                    <Sparkles size={11} className="text-amber-300 animate-spin" />
                    <span>{hudToast}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Intuitive Keyboard & Mouse Control Guide */}
              <div className="flex items-center gap-2 text-[8.5px] font-mono text-slate-400/80 px-2 py-0.5 rounded-full bg-slate-950/60 border border-slate-800/80">
                <span className="text-cyan-400">⌨ WASD / Arrows:</span>
                <span>Pan Up/Down/Left/Right</span>
                <span className="text-slate-600">•</span>
                <span className="text-cyan-400">🖱 Scroll:</span>
                <span>Zoom In/Out</span>
                <span className="text-slate-600">•</span>
                <span className="text-cyan-400">Drag:</span>
                <span>Orbit View</span>
                <span className="text-slate-600">•</span>
                <span className="text-amber-400">Space:</span>
                <span>Reset</span>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* ========================================================================= */}
      {/* HYDROLOGICAL WATER METER & FLOW CONTROL DECK MODAL                       */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showWaterMeterDeck && !isPlunging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setShowWaterMeterDeck(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-slate-950/95 border border-cyan-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_60px_rgba(6,182,212,0.3)] backdrop-blur-2xl text-slate-100 flex flex-col gap-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
                    <Activity size={18} />
                  </div>
                  <div>
                    <h3 className="font-mono font-bold text-sm text-cyan-200 tracking-wide uppercase">
                      Hydrological Water Meter & Flow Control
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Real-time lake telemetry, flood stage & 3D water simulation
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWaterMeterDeck(false)}
                  className="p-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Gauge & Level Visualizer */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-cyan-500/30 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-mono text-cyan-300 font-semibold uppercase">Water Depth</span>
                  <span className="text-2xl font-mono font-black text-white mt-1">+{currentDepthM}m</span>
                  <span className="text-[9px] font-mono text-cyan-400">({Math.round(waterLevelRatio * 100)}% capacity)</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-purple-500/30 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-mono text-purple-300 font-semibold uppercase">Stage Regime</span>
                  <span className="text-lg font-mono font-black text-purple-200 mt-1">{hydroAlert.code}</span>
                  <span className="text-[9px] font-mono text-slate-400 truncate max-w-full">{hydroAlert.title}</span>
                </div>
                <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-slate-900/80 border border-emerald-500/30 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-mono text-emerald-300 font-semibold uppercase">Inflow Torrent</span>
                  <span className="text-lg font-mono font-black text-emerald-200 mt-1">
                    {Math.round(320 + waterLevelRatio * 420)} m³/s
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400">Active Waterfall Inundation</span>
                </div>
              </div>

              {/* Interactive Water Level Slider & Presets */}
              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Sliders size={14} className="text-cyan-400" />
                    Water Depth Scale
                  </span>
                  <span className="text-cyan-300 font-mono text-sm">
                    {Math.round(waterLevelRatio * 100)}% (+{currentDepthM}m)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetWaterLevel(waterLevelRatio - 0.05)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-cyan-300 cursor-pointer transition-all active:scale-90"
                    title="Decrease 5%"
                  >
                    <Minus size={14} />
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={waterLevelRatio}
                    onChange={(e) => handleSetWaterLevel(parseFloat(e.target.value))}
                    className="flex-1 h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />

                  <button
                    type="button"
                    onClick={() => handleSetWaterLevel(waterLevelRatio + 0.05)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-cyan-300 cursor-pointer transition-all active:scale-90"
                    title="Increase 5%"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Level Presets */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[
                    { label: 'Drought', ratio: 0.05, depth: '1.4m' },
                    { label: 'Normal', ratio: 0.35, depth: '2.6m' },
                    { label: 'Monsoon', ratio: 0.65, depth: '3.7m' },
                    { label: 'Torrent', ratio: 0.95, depth: '4.9m' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleSetWaterLevel(preset.ratio)}
                      className={`py-1.5 px-2 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer border flex flex-col items-center justify-center ${
                        Math.abs(waterLevelRatio - preset.ratio) < 0.15
                          ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{preset.label}</span>
                      <span className="text-[8px] opacity-75">{preset.depth}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Tools */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerWaterSplashFnRef.current?.(undefined, undefined, 2.2);
                  }}
                  className="p-2.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <Waves size={14} className="text-cyan-400" />
                  <span>Splash Lake</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    dropFloatingObjectFnRef.current?.();
                  }}
                  className="p-2.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-200 text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <span>🪵 Timber ({floatingLogsCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAutoSurging(prev => !prev);
                    isAutoSurgingRef.current = !isAutoSurgingRef.current;
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                    isAutoSurging
                      ? 'bg-rose-950/90 border-rose-400 text-rose-200 shadow-[0_0_15px_rgba(239,68,68,0.7)] animate-pulse'
                      : 'bg-purple-950/80 hover:bg-purple-900 border-purple-500/40 text-purple-200'
                  }`}
                >
                  <Zap size={14} className={isAutoSurging ? "text-rose-400 animate-bounce" : "text-purple-400"} />
                  <span>{isAutoSurging ? 'Pause Surge' : 'Auto Surge'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Volumetric Cloud Freefall & Piercing Overlay on Grid Entry */}
      <AnimatePresence>
        {isPlunging && (
          <motion.div
            key="waterfall-plunge-fog-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 z-[150] pointer-events-none flex flex-col items-center justify-center overflow-hidden"
          >
            {/* 1. Atmospheric Deep Sky Mist (Dark Slate/Cyan Translucent) */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/60 to-cyan-950/80 backdrop-blur-md" />

            {/* 2. Real-Time 3D Volumetric Cloud & Atmospheric Freefall Canvas */}
            <VolumetricFreefall3D />
            
            {/* 3. Cascading Waterfall Spray & Water Curtain Breach */}
            <motion.div
              initial={{ y: '-100%', opacity: 0.8 }}
              animate={{ y: '120%', opacity: 0 }}
              transition={{ duration: 0.85, ease: 'easeOut' }}
              className="absolute inset-0 bg-gradient-to-b from-cyan-400/40 via-sky-300/20 to-transparent flex flex-col items-center justify-center pointer-events-none"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.4)_0%,rgba(56,189,248,0.2)_40%,transparent_75%)]" />
            </motion.div>

            {/* 4. Radial Atmospheric Shockwave Ring */}
            <motion.div
              initial={{ scale: 0.4, opacity: 0.8 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full border-[6px] border-cyan-400/40 shadow-[0_0_80px_rgba(6,182,212,0.6)]"
            />
            
            {/* Freefall Telemetry Readout */}
            <div className="relative z-10 flex flex-col items-center gap-2 text-center select-none">
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="px-5 py-2 rounded-full bg-slate-950/90 backdrop-blur-xl border border-cyan-400/60 shadow-[0_8px_32px_rgba(6,182,212,0.4)]"
              >
                <span className="text-xs sm:text-sm font-mono font-bold tracking-[0.35em] uppercase text-cyan-200 drop-shadow-sm">
                  Entering Interface
                </span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Status & Controls Bar */}
      <div className="fixed bottom-3 left-3 right-3 sm:bottom-4 sm:left-6 sm:right-6 z-40 flex items-center justify-between text-[10px] text-slate-400 tracking-wider pointer-events-auto">
        {/* Left: Doppler Meteorological Weather Radar HUD Widget */}
        <DopplerRadarWidget isAudioMuted={isMuted} />

        {/* Right: Sound, Assistant & Replay Controls */}
        <div className="flex items-center gap-2 sm:gap-3 bg-slate-950/80 backdrop-blur-xl border border-purple-500/25 px-3 py-1.5 rounded-full shadow-2xl">
          {isMuted && (
            <button 
              onClick={toggleSound}
              className="text-purple-300 hover:text-white flex items-center gap-1.5 animate-pulse hidden md:inline-flex font-medium cursor-pointer transition-colors"
              title="Click to activate procedural ambient soundscape"
            >
              <Volume2 size={13} className="text-purple-400" />
              <span>Enable Soundscape</span>
            </button>
          )}
          <button
            onClick={handleReplay}
            className="hover:text-white flex items-center gap-1 transition-colors cursor-pointer text-slate-300 font-medium active:scale-95 text-xs ml-0.5"
            title="Replay sequence"
          >
            <RotateCcw size={11} />
            <span>Replay</span>
          </button>
        </div>
      </div>
    </div>
  );
}
