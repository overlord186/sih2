import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as THREE from 'three';
import { Volume2, VolumeX, SkipForward, RotateCcw, ArrowUpRight, Sparkles, Mountain, Droplets, Bot, Waves, Plus, Minus, Activity, Sun, Zap, Wind, Compass, Sliders, RefreshCw, ShieldCheck, AlertTriangle, AlertOctagon, Info, Eye, X } from 'lucide-react';
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
  const [showWaterMeterDeck, setShowWaterMeterDeck] = useState<boolean>(true);
  const cameraTremorRef = useRef<number>(0);
  const [activeWeatherPreset, setActiveWeatherPreset] = useState<'clear' | 'monsoon' | 'squall' | 'surge'>('monsoon');

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
  const lightningCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lightningFlashRef = useRef<number>(0);
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
  const activeStrikesRef = useRef<ActiveStrike[]>([]);
  const waterDilutionsRef = useRef<WaterDilutionWave[]>([]);

  // Audio synthesis references
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);
  const waterGainRef = useRef<GainNode | null>(null);
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

      // 2. Rolling Canyon Resonance Reverberation (Brownian Noise Wave)
      const rumbleLen = Math.floor(ctx.sampleRate * 3.4);
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
      rumbleFilter.frequency.exponentialRampToValueAtTime(22, t + 3.1);
      rumbleFilter.Q.setValueAtTime(5.2, t);

      const rumbleGain = ctx.createGain();
      rumbleGain.gain.setValueAtTime(0.001, t);
      rumbleGain.gain.linearRampToValueAtTime(0.98, t + 0.04);
      rumbleGain.gain.exponentialRampToValueAtTime(0.65, t + 0.55);
      rumbleGain.gain.exponentialRampToValueAtTime(0.35, t + 1.35);
      rumbleGain.gain.exponentialRampToValueAtTime(0.0001, t + 3.35);

      rumbleSource.connect(rumbleFilter);
      rumbleFilter.connect(rumbleGain);

      // 3. Dual Sub-Bass Seismic Shockwave Thump (Deep physical canyon vibration)
      const subOsc1 = ctx.createOscillator();
      subOsc1.type = 'sine';
      subOsc1.frequency.setValueAtTime(50 + (index % 4) * 3, t);
      subOsc1.frequency.exponentialRampToValueAtTime(18, t + 2.4);

      const subGain1 = ctx.createGain();
      subGain1.gain.setValueAtTime(0.001, t);
      subGain1.gain.linearRampToValueAtTime(0.78, t + 0.04);
      subGain1.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
      subOsc1.connect(subGain1);

      const subOsc2 = ctx.createOscillator();
      subOsc2.type = 'triangle';
      subOsc2.frequency.setValueAtTime(36, t);
      subOsc2.frequency.exponentialRampToValueAtTime(14, t + 2.8);

      const subGain2 = ctx.createGain();
      subGain2.gain.setValueAtTime(0.001, t);
      subGain2.gain.linearRampToValueAtTime(0.58, t + 0.06);
      subGain2.gain.exponentialRampToValueAtTime(0.0001, t + 2.85);
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
      rumbleSource.stop(t + 3.4);
      subOsc1.stop(t + 2.45);
      subOsc2.stop(t + 2.9);
    } catch {
      // Audio fallback
    }
  }, []);

  // Spectacular Multi-Bolt Branching Fractal Lightning Strike Generator
  const triggerVisibleThunder = useCallback((index: number) => {
    const container = showcaseContainerRef.current;
    const canvas = lightningCanvasRef.current;
    if (!container || !canvas) return;

    const contRect = container.getBoundingClientRect();
    const el = letterElementsRef.current[index];
    const letterRect = el ? el.getBoundingClientRect() : null;

    // Relative target coordinates on the canvas
    const targetMidX = letterRect
      ? (letterRect.left + letterRect.width / 2) - contRect.left
      : contRect.width * (0.15 + (index / 12) * 0.7);
    const targetMidY = letterRect
      ? (letterRect.top + letterRect.height / 2) - contRect.top
      : contRect.height * 0.22;

    const startX = targetMidX + (Math.random() - 0.5) * 50;
    const startY = 0; // Starts in storm clouds at top of viewport

    // Dynamic water surface line based on waterLevelRatio (rises higher with water level)
    const currentRatio = waterLevelRatioRef.current;
    const waterSurfaceY = Math.max(contRect.height * 0.44, contRect.height * (0.86 - currentRatio * 0.38));
    const groundX = targetMidX + (Math.random() - 0.5) * 120;
    const groundY = waterSurfaceY; // Electricity falls straight into water surface!

    const segments: LightningSegment[] = [];
    const sparks: LightningSpark[] = [];

    // Recursive fractal branch generation with high-voltage jitter
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
          width: isBranch ? 1.6 : 3.4,
          isBranch,
        });
        if (Math.random() < 0.5) {
          sparks.push({
            x: x2,
            y: y2,
            vx: (Math.random() - 0.5) * 4.5,
            vy: 2.0 + Math.random() * 5.0,
            life: 0,
            maxLife: 24 + Math.random() * 28,
            color: Math.random() < 0.6 ? '#38bdf8' : '#e0e7ff',
          });
        }
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

      buildBranch(x1, y1, displacedX, displacedY, depth - 1, roughness * 0.65, isBranch);
      buildBranch(displacedX, displacedY, x2, y2, depth - 1, roughness * 0.65, isBranch);

      // Fork off energetic side lightning branches
      if (!isBranch && depth >= 3 && Math.random() < 0.72) {
        const sideSign = Math.random() > 0.5 ? 1 : -1;
        const branchAngle = sideSign * (0.40 + Math.random() * 0.40);
        const branchLen = len * (0.35 + Math.random() * 0.38);
        const cosA = Math.cos(branchAngle);
        const sinA = Math.sin(branchAngle);
        const dirX = (dx / len) * cosA - (dy / len) * sinA;
        const dirY = (dx / len) * sinA + (dy / len) * cosA;
        const bEndX = displacedX + dirX * branchLen;
        const bEndY = displacedY + dirY * branchLen;

        buildBranch(displacedX, displacedY, bEndX, bEndY, 3, roughness * 0.52, true);
      }
    };

    // Upper trunk: clouds down to the letter
    buildBranch(startX, startY, targetMidX, targetMidY, 4, 34, false);
    // Lower trunk: letter plunging directly into the lake water surface
    buildBranch(targetMidX, targetMidY, groundX, groundY, 5, 45, false);

    // Fork 2: Secondary lightning bolt striking adjacent mountain ridge
    const ridgeX = targetMidX + (index % 2 === 0 ? -1 : 1) * (90 + Math.random() * 70);
    const ridgeY = waterSurfaceY * 0.72;
    buildBranch(targetMidX, targetMidY, ridgeX, ridgeY, 4, 30, true);

    // ELECTRIC WATER DILUTION: Generate horizontal dendritic surface filaments spreading through water
    const waterFilaments: LightningSegment[] = [];
    const buildWaterFilament = (x1: number, y1: number, x2: number, y2: number, depth: number) => {
      if (depth <= 0) {
        waterFilaments.push({ x1, y1, x2, y2, width: 2.0, isBranch: true });
        return;
      }
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2 + (Math.random() - 0.5) * 8;
      buildWaterFilament(x1, y1, mx, my, depth - 1);
      buildWaterFilament(mx, my, x2, y2, depth - 1);
    };

    // Spread left and right across water surface
    const spreadSpan = 110 + Math.random() * 110;
    buildWaterFilament(groundX, groundY, groundX - spreadSpan, groundY + (Math.random() - 0.5) * 10, 3);
    buildWaterFilament(groundX, groundY, groundX + spreadSpan, groundY + (Math.random() - 0.5) * 10, 3);
    buildWaterFilament(groundX, groundY, groundX - spreadSpan * 0.6, groundY + 8 + Math.random() * 14, 2);
    buildWaterFilament(groundX, groundY, groundX + spreadSpan * 0.6, groundY + 8 + Math.random() * 14, 2);

    // Water surface electrified bubbles & steam sparks rising after strike
    const waterSparks: LightningSpark[] = [];
    for (let sp = 0; sp < 24; sp++) {
      waterSparks.push({
        x: groundX + (Math.random() - 0.5) * spreadSpan * 1.6,
        y: groundY + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 3.8,
        vy: -(1.0 + Math.random() * 3.5),
        life: 0,
        maxLife: 35 + Math.random() * 40,
        color: Math.random() < 0.6 ? '#06b6d4' : '#67e8f9',
      });
    }

    activeStrikesRef.current.push({
      id: Date.now() + Math.random(),
      segments,
      sparks,
      waterImpactX: groundX,
      waterImpactY: groundY,
      startTime: performance.now(),
      duration: 420,
    });

    // Add active water dilution ripple wave on the water surface
    waterDilutionsRef.current.push({
      id: Date.now() + Math.random(),
      cx: groundX,
      cy: groundY,
      radius: 8,
      maxRadius: spreadSpan * 1.45,
      alpha: 1.0,
      filaments: waterFilaments,
      sparks: waterSparks,
    });

    // Trigger 3D Water physical splash and electric wave in Three.js scene
    const worldNormX = (groundX / contRect.width - 0.5) * 14;
    triggerWaterSplashFnRef.current?.(worldNormX, 0, 3.2);

    // Trigger Physical Camera Tremor / Screen Shake
    cameraTremorRef.current = 1.3;

    // Momentary screen illumination flash
    setScreenFlash(0.68);

    // 3D Scene Volumetric Flash (mountain peaks & lake water burst into luminous electric blue)
    lightningFlashRef.current = 1.3;
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

    // Extended freefall descent (5.0s) so volumetric clouds, vapor rings, and mist are clearly enjoyed
    setTimeout(() => {
      if (audioCtxRef.current) {
        try {
          if (ambientGainRef.current) ambientGainRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
          if (waterGainRef.current) waterGainRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
          audioCtxRef.current.suspend().catch(() => {});
        } catch {}
      }
      onComplete();
    }, 5000);
  }, [onComplete]);

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
    } catch {
      // Audio autoplay fallback
    }
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

        // Violent electrical flicker
        const flicker = Math.sin(progress * Math.PI * 12) > -0.25 ? 1.0 : 0.45;
        const alpha = Math.max(0, 1 - Math.pow(progress, 0.7)) * flicker;

        // Pass 1: Broad electric-blue outer atmospheric glow
        ctx.save();
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 24;
        ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.75})`;
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (const seg of strike.segments) {
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
        }
        ctx.stroke();
        ctx.restore();

        // Pass 2: Violet/Cyan ionization channel
        ctx.save();
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = `rgba(216, 180, 254, ${alpha * 0.95})`;
        ctx.lineWidth = 4;
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
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.98})`;
        ctx.lineWidth = 2;
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
      // WATER ELECTRIC DILUTION RENDERING: Electricity spreading & dissolving in water
      // =========================================================================
      for (let dIdx = waterDilutionsRef.current.length - 1; dIdx >= 0; dIdx--) {
        const wave = waterDilutionsRef.current[dIdx];
        wave.radius += 2.8;
        wave.alpha -= 0.024; // Smoothly fades out as electricity dilutes in water

        if (wave.alpha <= 0 || wave.radius >= wave.maxRadius) {
          waterDilutionsRef.current.splice(dIdx, 1);
          continue;
        }

        // 1. Diluted Water Glow Halo & Expanding Radial Shockwave
        ctx.save();
        const grad = ctx.createRadialGradient(
          wave.cx, wave.cy, 0,
          wave.cx, wave.cy, wave.radius
        );
        grad.addColorStop(0, `rgba(103, 232, 249, ${wave.alpha * 0.65})`);
        grad.addColorStop(0.4, `rgba(6, 182, 212, ${wave.alpha * 0.45})`);
        grad.addColorStop(0.85, `rgba(14, 165, 233, ${wave.alpha * 0.2})`);
        grad.addColorStop(1, 'rgba(14, 165, 233, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(wave.cx, wave.cy, wave.radius * 1.6, wave.radius * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 2. Horizontal Dendritic Electric Filaments dissolving along water surface
        ctx.save();
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 16;
        ctx.strokeStyle = `rgba(165, 243, 252, ${wave.alpha * 0.88})`;
        ctx.lineWidth = 2.2 * wave.alpha;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (const fil of wave.filaments) {
          ctx.moveTo(fil.x1, fil.y1);
          ctx.lineTo(fil.x2, fil.y2);
        }
        ctx.stroke();
        ctx.restore();

        // 3. Electric surface steam & ionized droplet sparks
        for (let spIdx = wave.sparks.length - 1; spIdx >= 0; spIdx--) {
          const wsp = wave.sparks[spIdx];
          wsp.x += wsp.vx;
          wsp.y += wsp.vy;
          wsp.vx *= 0.98;
          wsp.vy *= 0.96;
          wsp.life++;
          const spAlpha = Math.max(0, 1 - wsp.life / wsp.maxLife) * wave.alpha;
          if (wsp.life >= wsp.maxLife) {
            wave.sparks.splice(spIdx, 1);
            continue;
          }
          ctx.save();
          ctx.shadowColor = wsp.color;
          ctx.shadowBlur = 8;
          ctx.fillStyle = wsp.color;
          ctx.globalAlpha = spAlpha;
          ctx.beginPath();
          ctx.arc(wsp.x, wsp.y, 1.8 * (1 - wsp.life / wsp.maxLife), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

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

          const rGrad = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
          if (tod === 'dawn') {
            const rVal = Math.floor(75 * lightIntensity);
            const gVal = Math.floor(45 * lightIntensity);
            const bVal = Math.floor(25 * lightIntensity);
            rGrad.addColorStop(0, `rgb(${rVal + 55}, ${gVal + 30}, ${bVal + 15})`);
            rGrad.addColorStop(1, `rgb(${rVal}, ${gVal}, ${bVal})`);
            ctx.fillStyle = rGrad;
            ctx.fill();
            ctx.strokeStyle = `rgba(251, 191, 36, ${lightIntensity * 0.5})`;
          } else if (tod === 'night') {
            const rVal = Math.floor(15 * lightIntensity);
            const gVal = Math.floor(45 * lightIntensity);
            const bVal = Math.floor(85 * lightIntensity);
            rGrad.addColorStop(0, `rgb(${rVal + 15}, ${gVal + 40}, ${bVal + 60})`);
            rGrad.addColorStop(1, `rgb(${rVal}, ${gVal}, ${bVal})`);
            ctx.fillStyle = rGrad;
            ctx.fill();
            ctx.strokeStyle = `rgba(6, 182, 212, ${lightIntensity * 0.55})`;
          } else {
            const rVal = Math.floor(45 * lightIntensity);
            const gVal = Math.floor(25 * lightIntensity);
            const bVal = Math.floor(75 * lightIntensity);
            rGrad.addColorStop(0, `rgb(${rVal + 30}, ${gVal + 15}, ${bVal + 60})`);
            rGrad.addColorStop(1, `rgb(${rVal}, ${gVal}, ${bVal})`);
            ctx.fillStyle = rGrad;
            ctx.fill();
            ctx.strokeStyle = `rgba(192, 132, 252, ${lightIntensity * 0.45})`;
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
  useEffect(() => {
    const canvas = mountainCanvasRef.current;
    if (!canvas) return;

    let width = canvas.parentElement?.clientWidth || 800;
    let height = canvas.parentElement?.clientHeight || 520;

    // 1. SCENE, FOG & CAMERA (Atmospheric Overcast Alpine Lighting)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb0c2ce);
    scene.fog = new THREE.FogExp2(0xadc0cc, 0.015);

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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
    } catch (e) {
      console.warn("WebGL initialization skipped in CinematicIntro:", e);
      return;
    }

    // 3. REALISTIC OVERCAST DAYLIGHT & CANYON SHADOWS
    const ambientLight = new THREE.AmbientLight(0x768896, 1.4);
    scene.add(ambientLight);

    // Soft diffused mountain skylight from above
    const sunLight = new THREE.DirectionalLight(0xf5f8fa, 2.2);
    sunLight.position.set(2, 28, 6);
    scene.add(sunLight);

    // High-altitude back light filtering through the gorge notch
    const backLight = new THREE.DirectionalLight(0xdce7ef, 1.8);
    backLight.position.set(0, 16, -22);
    scene.add(backLight);

    // Front-left gorge fill light
    const keyLight = new THREE.DirectionalLight(0x64748b, 1.0);
    keyLight.position.set(-14, 10, 20);
    scene.add(keyLight);

    // 4. MASTER CANYON GORGE GROUP
    const mountainGroup = new THREE.Group();
    scene.add(mountainGroup);

    // REALISTIC ROCK & FOLIAGE MATERIALS (Dark slate granite, wet rock, moss, pine greens)
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x222a30, // natural dark charcoal slate
      roughness: 0.72,
      metalness: 0.22,
      flatShading: true,
    });

    const darkRockMat = new THREE.MeshStandardMaterial({
      color: 0x181f25, // deep craggy shadow rock
      roughness: 0.8,
      metalness: 0.15,
      flatShading: true,
    });

    const wetRockMat = new THREE.MeshStandardMaterial({
      color: 0x141b20, // wet glistening basalt along the waterfall
      roughness: 0.25,
      metalness: 0.5,
      flatShading: true,
    });

    const mossMat = new THREE.MeshStandardMaterial({
      color: 0x263321, // alpine moss and lichens
      roughness: 0.85,
      metalness: 0.1,
      flatShading: true,
    });

    const pineTrunkMat = new THREE.MeshStandardMaterial({
      color: 0x271e16,
      roughness: 0.9,
      flatShading: true,
    });

    const pineFoliageMats = [
      new THREE.MeshStandardMaterial({ color: 0x0d2215, roughness: 0.75, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0x132e1d, roughness: 0.75, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0x193a24, roughness: 0.75, flatShading: true }),
    ];

    // Helper: Construct Realistic Alpine Pine Conifer Tree
    const pineTreeGeo = (scale: number, variant: number) => {
      const treeGroup = new THREE.Group();
      // Trunk
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.22 * scale, 2.2 * scale, 5), pineTrunkMat);
      trunk.position.y = 1.1 * scale;
      treeGroup.add(trunk);

      // 3 Stacked Conifer Needle Cones
      const tiers = [
        { r: 1.35 * scale, h: 2.0 * scale, y: 2.0 * scale },
        { r: 1.05 * scale, h: 1.7 * scale, y: 3.1 * scale },
        { r: 0.72 * scale, h: 1.4 * scale, y: 4.1 * scale },
      ];
      tiers.forEach((t, i) => {
        const mat = pineFoliageMats[(variant + i) % pineFoliageMats.length];
        const cone = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 6), mat);
        cone.position.y = t.y;
        cone.rotation.y = variant * 0.5 + i * 0.3;
        treeGroup.add(cone);
      });
      return treeGroup;
    };

    // A. LEFT CANYON WALL (Sheer, layered craggy vertical rock face)
    const leftRockSegments = [
      // [x, y, z, w, h, d, rotY, rotZ]
      [-13.5, 6.0, -8.0, 15, 24, 14, 0.18, 0.05],
      [-7.5, 4.5, -4.5, 8.5, 18, 9, 0.24, -0.04],
      [-4.6, 2.0, -3.8, 5.2, 14, 6, 0.32, -0.06], // wet cliff flank
      [-16.0, 9.0, 2.0, 14, 22, 12, 0.12, 0.08],
      [-8.5, -3.5, 4.0, 9.0, 12, 8, 0.28, 0.0],
      [-5.5, -5.0, 6.0, 6.0, 10, 7, 0.35, 0.0], // lower gorge base
    ];

    leftRockSegments.forEach(([x, y, z, w, h, d, ry, rz], idx) => {
      const geo = new THREE.BoxGeometry(w, h, d, 4, 6, 4);
      // Displace vertices for craggy natural rock roughness
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i);
        const py = pos.getY(i);
        const pz = pos.getZ(i);
        const noise = Math.sin(px * 0.8) * Math.cos(py * 0.6) * 0.7 + Math.sin(pz * 0.9) * 0.5;
        pos.setXYZ(i, px + noise * 0.4, py + noise * 0.3, pz + noise * 0.4);
      }
      geo.computeVertexNormals();
      const mat = idx === 2 ? wetRockMat : (idx % 2 === 0 ? rockMat : darkRockMat);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.rotation.y = ry;
      mesh.rotation.z = rz;
      mountainGroup.add(mesh);
    });

    // B. RIGHT CANYON WALL (Matching sheer craggy rock face)
    const rightRockSegments = [
      [14.0, 6.5, -8.5, 15, 25, 14, -0.2, -0.05],
      [7.8, 4.8, -4.8, 8.8, 18, 9, -0.25, 0.04],
      [4.7, 2.2, -4.0, 5.4, 14, 6, -0.32, 0.06], // wet cliff flank
      [16.5, 9.5, 2.0, 14, 22, 12, -0.14, -0.08],
      [9.0, -3.2, 4.2, 9.2, 12, 8, -0.26, 0.0],
      [5.8, -4.8, 6.2, 6.2, 10, 7, -0.34, 0.0], // lower gorge base
    ];

    rightRockSegments.forEach(([x, y, z, w, h, d, ry, rz], idx) => {
      const geo = new THREE.BoxGeometry(w, h, d, 4, 6, 4);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i);
        const py = pos.getY(i);
        const pz = pos.getZ(i);
        const noise = Math.cos(px * 0.8) * Math.sin(py * 0.7) * 0.7 + Math.sin(pz * 0.8) * 0.5;
        pos.setXYZ(i, px + noise * 0.4, py + noise * 0.3, pz + noise * 0.4);
      }
      geo.computeVertexNormals();
      const mat = idx === 2 ? wetRockMat : (idx % 2 === 0 ? rockMat : darkRockMat);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.rotation.y = ry;
      mesh.rotation.z = rz;
      mountainGroup.add(mesh);
    });

    // C. REAR GORGE NOTCH & RECEDING RIDGES (Where the waterfall originates)
    const notchLeftCliff = new THREE.Mesh(new THREE.BoxGeometry(7, 18, 8), darkRockMat);
    notchLeftCliff.position.set(-4.8, 9.5, -12);
    notchLeftCliff.rotation.y = 0.4;
    mountainGroup.add(notchLeftCliff);

    const notchRightCliff = new THREE.Mesh(new THREE.BoxGeometry(7, 18, 8), darkRockMat);
    notchRightCliff.position.set(4.8, 9.5, -12);
    notchRightCliff.rotation.y = -0.4;
    mountainGroup.add(notchRightCliff);

    // Distant mountain silhouette receding into white fog
    const distantRidgeGeo = new THREE.ConeGeometry(24, 28, 7);
    const distantRidgeMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true,
    });
    const distantLeftPeak = new THREE.Mesh(distantRidgeGeo, distantRidgeMat);
    distantLeftPeak.position.set(-18, 14, -32);
    mountainGroup.add(distantLeftPeak);

    const distantRightPeak = new THREE.Mesh(distantRidgeGeo, distantRidgeMat);
    distantRightPeak.position.set(18, 15, -34);
    mountainGroup.add(distantRightPeak);

    // D. ALPINE CONIFER PINE TREES (70+ trees distributed across ridges, ledges, and slopes)
    const pineData: [number, number, number, number, number][] = [
      // Left Upper Ridge Crest
      [-12, 16.5, -8, 1.1, 0], [-15, 17.5, -7, 1.2, 1], [-10, 15.5, -9, 1.0, 2],
      [-17, 18.0, -5, 1.3, 0], [-13, 16.0, -5, 1.0, 1], [-9, 14.8, -7, 0.9, 2],
      [-18, 19.0, 0, 1.4, 0], [-14, 17.0, 2, 1.2, 1], [-11, 15.0, 4, 1.1, 2],

      // Right Upper Ridge Crest
      [12, 17.0, -8, 1.1, 1], [15, 18.0, -7, 1.2, 2], [10, 15.8, -9, 1.0, 0],
      [17, 18.5, -5, 1.3, 1], [13, 16.5, -5, 1.0, 2], [9, 15.0, -7, 0.9, 0],
      [18, 19.5, 0, 1.4, 1], [14, 17.5, 2, 1.2, 2], [11, 15.5, 4, 1.1, 0],

      // Clinging to Left Cliff Ledges (like in photo)
      [-5.5, 7.5, -4.2, 0.85, 0], [-4.8, 4.8, -3.8, 0.75, 1], [-6.2, 2.5, -3.5, 0.8, 2],
      [-7.2, 0.5, -2.5, 0.9, 0], [-5.8, -1.8, 0.5, 0.85, 1], [-4.9, -3.5, 2.8, 0.8, 2],
      [-8.0, 5.5, -1.0, 0.95, 0], [-7.5, 8.5, -3.0, 1.0, 1],

      // Clinging to Right Cliff Ledges (like in photo)
      [5.5, 7.8, -4.5, 0.85, 1], [4.8, 5.0, -4.0, 0.75, 2], [6.2, 2.8, -3.6, 0.8, 0],
      [7.2, 0.8, -2.6, 0.9, 1], [5.8, -1.5, 0.6, 0.85, 2], [4.9, -3.2, 2.9, 0.8, 0],
      [8.0, 5.8, -1.2, 0.95, 1], [7.5, 8.8, -3.2, 1.0, 2],

      // Lower Left Slopes & Foreground Forest (Dense Conifers framing the bottom of the gorge)
      [-6.5, -6.0, 7.0, 1.1, 0], [-8.0, -5.5, 8.5, 1.2, 1], [-10.0, -5.0, 9.0, 1.3, 2],
      [-5.5, -6.8, 9.5, 1.0, 0], [-7.5, -6.2, 11.0, 1.25, 1], [-9.5, -5.8, 12.0, 1.35, 2],
      [-12.0, -4.5, 8.0, 1.4, 0], [-13.5, -4.0, 10.0, 1.45, 1],

      // Lower Right Slopes & Foreground Forest (Dense Conifers framing the bottom of the gorge)
      [6.8, -5.8, 7.2, 1.1, 1], [8.2, -5.2, 8.8, 1.2, 2], [10.5, -4.8, 9.2, 1.3, 0],
      [5.8, -6.5, 9.8, 1.0, 1], [7.8, -6.0, 11.2, 1.25, 2], [9.8, -5.5, 12.2, 1.35, 0],
      [12.5, -4.2, 8.2, 1.4, 1], [14.0, -3.8, 10.2, 1.45, 2],
    ];

    pineData.forEach(([tx, ty, tz, s, v]) => {
      const tree = pineTreeGeo(s, v);
      tree.position.set(tx, ty, tz);
      tree.rotation.y = v * 1.2;
      mountainGroup.add(tree);
    });

    // E. 3D REALISTIC WATERFALL SYSTEM (High-velocity vertical foaming cascade)
    // 1. Notch chute stream emerging from rock cleft
    const chuteGeo = new THREE.PlaneGeometry(2.4, 5.0, 12, 18);
    const waterfallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xdff1fc,
      emissiveIntensity: 0.38,
      roughness: 0.12,
      metalness: 0.45,
      transparent: true,
      opacity: 0.94,
      side: THREE.DoubleSide,
    });
    const chuteMesh = new THREE.Mesh(chuteGeo, waterfallMat);
    chuteMesh.position.set(0, 7.2, -7.5);
    chuteMesh.rotation.x = -0.55;
    mountainGroup.add(chuteMesh);

    // 2. Main Vertical Plunging Whitewater Column
    const waterfallRibbonGeo = new THREE.PlaneGeometry(2.8, 15.5, 20, 56);
    const waterfallMesh = new THREE.Mesh(waterfallRibbonGeo, waterfallMat);
    waterfallMesh.position.set(0, 0.2, -4.2);
    waterfallMesh.rotation.x = -0.12; // almost sheer vertical plunge
    mountainGroup.add(waterfallMesh);

    // 3. Whitewater Crest Foam & Spray Ribbon (layered volume)
    const foamRibbonGeo = new THREE.PlaneGeometry(3.1, 15.6, 16, 42);
    const foamMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.45,
      roughness: 0.3,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
    const foamMesh = new THREE.Mesh(foamRibbonGeo, foamMat);
    foamMesh.position.set(0, 0.2, -4.05);
    foamMesh.rotation.x = -0.12;
    mountainGroup.add(foamMesh);

    // 4. Intermediate Boulders & Cascading Rapids (Water striking rocks and fanning out)
    const cascadeGeo = new THREE.PlaneGeometry(4.4, 7.5, 16, 24);
    const cascadeMesh = new THREE.Mesh(cascadeGeo, waterfallMat);
    cascadeMesh.position.set(0, -3.8, -2.4);
    cascadeMesh.rotation.x = -0.45; // fanning over lower rocky shelves
    mountainGroup.add(cascadeMesh);

    // Lower rocky rapids boulders
    [-1.8, 1.8].forEach((bx) => {
      const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 1), wetRockMat);
      boulder.position.set(bx, -4.8, -1.8);
      mountainGroup.add(boulder);
    });

    // F. 1,800+ WHITEWATER DROPLET PARTICLES
    const PARTICLE_COUNT = 1800;
    const dropGeo = new THREE.BufferGeometry();
    const dropPositions = new Float32Array(PARTICLE_COUNT * 3);
    const dropColors = new Float32Array(PARTICLE_COUNT * 3);
    const dropVelocities: { vx: number; vy: number; vz: number; life: number; maxLife: number }[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      dropPositions[i * 3] = (Math.random() - 0.5) * 2.4;
      dropPositions[i * 3 + 1] = 7.5 - Math.random() * 15;
      dropPositions[i * 3 + 2] = -7.0 + Math.random() * 5.5;

      dropVelocities.push({
        vx: (Math.random() - 0.5) * 0.05,
        vy: -(0.24 + Math.random() * 0.32),
        vz: 0.05 + Math.random() * 0.07,
        life: Math.random(),
        maxLife: 1.0,
      });

      // Pure glistening whitewater droplets with subtle cyan mist highlights
      const isWhite = Math.random() > 0.35;
      dropColors[i * 3] = isWhite ? 1.0 : 0.88;
      dropColors[i * 3 + 1] = isWhite ? 1.0 : 0.96;
      dropColors[i * 3 + 2] = 1.0;
    }
    dropGeo.setAttribute('position', new THREE.BufferAttribute(dropPositions, 3));
    dropGeo.setAttribute('color', new THREE.BufferAttribute(dropColors, 3));

    const dropPointsMat = new THREE.PointsMaterial({
      size: 0.36,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
    });
    const dropPoints = new THREE.Points(dropGeo, dropPointsMat);
    mountainGroup.add(dropPoints);

    // G. 450+ VOLUMETRIC MIST PARTICLES (Billowing white vapor rising from plunge point)
    const MIST_COUNT = 450;
    const mistGeo = new THREE.BufferGeometry();
    const mistPositions = new Float32Array(MIST_COUNT * 3);
    const mistVelocities: { vx: number; vy: number; vz: number; life: number; maxLife: number }[] = [];

    for (let i = 0; i < MIST_COUNT; i++) {
      mistPositions[i * 3] = (Math.random() - 0.5) * 7.5;
      mistPositions[i * 3 + 1] = -7.5 + Math.random() * 6.5;
      mistPositions[i * 3 + 2] = -1.0 + (Math.random() - 0.5) * 5.0;

      mistVelocities.push({
        vx: (Math.random() - 0.5) * 0.035,
        vy: 0.035 + Math.random() * 0.05,
        vz: (Math.random() - 0.5) * 0.035,
        life: Math.random(),
        maxLife: 1.0,
      });
    }
    mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3));
    const mistMat = new THREE.PointsMaterial({
      size: 1.8,
      color: 0xe2e8f0, // realistic white mountain mist
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    const mistPoints = new THREE.Points(mistGeo, mistMat);
    mountainGroup.add(mistPoints);

    // H. LOW-HANGING GORGE FOG / CLOUD PUFFS (Rolling mountain fog like in the photo)
    const cloudGroup = new THREE.Group();
    mountainGroup.add(cloudGroup);
    const fogGeo = new THREE.DodecahedronGeometry(3.5, 1);
    const fogMat = new THREE.MeshBasicMaterial({
      color: 0xdae6ee,
      transparent: true,
      opacity: 0.22,
      wireframe: false,
    });
    const fogPuffs: THREE.Mesh[] = [];
    [
      [-4.0, 9.5, -9], [4.0, 10.5, -10], [0.0, 11.5, -12],
      [-2.5, 7.0, -7], [3.2, 8.0, -8], [0.0, 13.0, -15],
    ].forEach(([cx, cy, cz]) => {
      const puff = new THREE.Mesh(fogGeo, fogMat);
      puff.position.set(cx, cy, cz);
      puff.scale.set(1.4, 0.85, 1.2);
      cloudGroup.add(puff);
      fogPuffs.push(puff);
    });

    // I. PLUNGE IMPACT EXPANDING RINGS
    const ringGroup = new THREE.Group();
    mountainGroup.add(ringGroup);
    const ringGeo = new THREE.RingGeometry(0.3, 0.65, 24);
    const rings = [0, 1, 2].map((idx) => {
      const rMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
      });
      const rMesh = new THREE.Mesh(ringGeo, rMat);
      rMesh.rotation.x = -Math.PI / 2;
      rMesh.position.set(0, -7.8, -0.5);
      ringGroup.add(rMesh);
      return { mesh: rMesh, mat: rMat, phase: idx * 0.33 };
    });

    // J. 3D DRAMATIC RISING FLOOD BASIN ("when showing flood make the water level rise more")
    // Submerges the entire lower canyon, rising from deep riverbed -5.2 up to +2.8!
    const baseLakeY = -5.2;
    const maxLakeY = 2.8;

    const lakeGeo = new THREE.PlaneGeometry(64, 46, 48, 48);
    const lakeMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Vibrant alpine azure / glacial cyan
      emissive: 0x03496b, // Aquatic luminescence
      emissiveIntensity: 0.32,
      roughness: 0.12,
      metalness: 0.15,
      transparent: true,
      opacity: 0.88,
    });
    const lakeMesh = new THREE.Mesh(lakeGeo, lakeMat);
    lakeMesh.rotation.x = -Math.PI / 2;
    lakeMesh.position.set(0, baseLakeY + waterLevelRatioRef.current * (maxLakeY - baseLakeY), 4);
    mountainGroup.add(lakeMesh);

    // Dynamic glowing shoreline foam rim ring outlining the rising waterline against cliff walls
    const foamRimGeo = new THREE.RingGeometry(3.5, 8.2, 36);
    const foamRimMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    const foamRimMesh = new THREE.Mesh(foamRimGeo, foamRimMat);
    foamRimMesh.rotation.x = -Math.PI / 2;
    foamRimMesh.position.set(0, lakeMesh.position.y + 0.05, -1.8);
    mountainGroup.add(foamRimMesh);

    // 3D Telemetry Staff / Flood Gauge Marker Post (Submerges as water rises)
    const staffGroup = new THREE.Group();
    staffGroup.position.set(-3.2, 0, 0.5);
    const staffPoleGeo = new THREE.CylinderGeometry(0.12, 0.12, 8.5, 8);
    const staffPoleMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.8,
    });
    const staffPole = new THREE.Mesh(staffPoleGeo, staffPoleMat);
    staffPole.position.y = -1.2;
    staffGroup.add(staffPole);

    for (let mark = 0; mark < 5; mark++) {
      const ringY = -5.0 + mark * 1.5;
      const ringGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.15, 8);
      const ringMat = new THREE.MeshBasicMaterial({
        color: mark >= 3 ? 0xef4444 : (mark >= 2 ? 0xf59e0b : 0x06b6d4),
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.y = ringY;
      staffGroup.add(ringMesh);
    }
    mountainGroup.add(staffGroup);

    // K. INTERACTIVE WATER PHYSICS: RIPPLE PROPAGATION & BURST SPLASH PARTICLES
    interface WaterRipple {
      localX: number;
      localY: number;
      radius: number;
      maxRadius: number;
      strength: number;
      speed: number;
    }
    const activeRipples: WaterRipple[] = [];

    // Interactive Splash Droplets System
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

    // Floating Buoyant Items (Fallen Alpine Logs & Rescue Buoys)
    interface FloatingItem {
      mesh: THREE.Object3D;
      localX: number;
      localZ: number;
      bobSeed: number;
      rotSpeed: number;
      driftSpeed: number;
    }
    const floatingItems: FloatingItem[] = [];

    // Trigger physical ripples, spray particles, and splash audio
    const triggerWaterSplash = (worldX: number, worldZ: number, localX: number, localY: number, power: number = 1.0) => {
      // 1. Expanding shockwave ripple across the lake geometry
      activeRipples.push({
        localX,
        localY,
        radius: 0.3,
        maxRadius: 24.0,
        strength: 0.9 * power,
        speed: 10.5,
      });

      // 2. Burst physical splash droplet particles
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

      // 3. Audio & UI count
      playWaterSplashTone(power);
      setRecentSplashCount((c) => c + 1);
    };

    triggerWaterSplashFnRef.current = (wx, wz, pwr) => {
      const worldX = wx ?? (Math.random() - 0.5) * 6.5;
      const worldZ = wz ?? (2.0 + Math.random() * 5.5);
      const local = lakeMesh.worldToLocal(new THREE.Vector3(worldX, lakeMesh.position.y, worldZ));
      triggerWaterSplash(worldX, worldZ, local.x, local.y, pwr ?? 1.25);
    };

    // Spawner for floating buoyant objects that bob and drift with flood torrent
    const spawnFloatingObject = () => {
      const isBuoy = floatingItems.length % 2 === 1;
      let itemMesh: THREE.Object3D;

      if (isBuoy) {
        // High-visibility orange rescue buoy with reflective white ring
        const buoyGroup = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.25, metalness: 0.1 });
        const ringMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.2 });
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 14), bodyMat);
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.11, 8, 18), ringMat);
        band.rotation.x = Math.PI / 2;
        buoyGroup.add(sphere);
        buoyGroup.add(band);
        itemMesh = buoyGroup;
      } else {
        // Natural alpine timber log with bark
        const logMat = new THREE.MeshStandardMaterial({ color: 0x362213, roughness: 0.9, flatShading: true });
        const logGeo = new THREE.CylinderGeometry(0.3, 0.36, 3.2, 7);
        const log = new THREE.Mesh(logGeo, logMat);
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

      // Splash upon drop
      const local = lakeMesh.worldToLocal(new THREE.Vector3(lx, lakeMesh.position.y, lz));
      triggerWaterSplash(lx, lz, local.x, local.y, 1.4);
    };
    dropFloatingObjectFnRef.current = spawnFloatingObject;

    // K. FLOATING 3D CANYON CRYSTAL ROCKS (Hovering in the gorge with mouse parallax)
    const crystalGeo = new THREE.OctahedronGeometry(0.85, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x9333ea,
      emissive: 0x581c87,
      emissiveIntensity: 0.6,
      roughness: 0.15,
      metalness: 0.85,
      flatShading: true,
    });
    const canyonCrystals: { mesh: THREE.Mesh; baseX: number; baseY: number; baseZ: number; rotSpeed: number; bobSeed: number }[] = [];
    [
      [-7.5, 8.5, 4.0, 1.2],
      [-5.2, 4.2, 10.0, 0.85],
      [7.8, 9.2, 5.0, 1.3],
      [5.5, 5.0, 11.0, 0.9],
      [-8.8, 12.0, -2.0, 1.5],
      [8.5, 12.5, -3.0, 1.4],
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

    // L. MOUNTAIN OBSERVATORY BEACON LIGHTS (Blinking summit telemetry markers)
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const beaconGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const beaconMeshes: THREE.Mesh[] = [];
    [
      [-16.0, 19.5, 1.0],
      [16.5, 20.0, 1.0],
      [-4.8, 18.0, -12.0],
      [4.8, 18.0, -12.0],
      [-18.0, 27.5, -32.0],
    ].forEach(([bx, by, bz]) => {
      const bMesh = new THREE.Mesh(beaconGeo, beaconMat);
      bMesh.position.set(bx, by, bz);
      mountainGroup.add(bMesh);
      beaconMeshes.push(bMesh);
    });

    // Raycasting & Pointer Interaction on Flood Water Surface
    const raycaster = new THREE.Raycaster();
    const pointer2D = new THREE.Vector2();
    let isPointerDown = false;
    let lastDragSplashTime = 0;

    const handleCanvasPointerDown = (e: PointerEvent) => {
      if (!canvas) return;
      isPointerDown = true;
      const rect = canvas.getBoundingClientRect();
      pointer2D.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer2D.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      raycaster.setFromCamera(pointer2D, camera);
      const intersects = raycaster.intersectObject(lakeMesh, false);
      if (intersects.length > 0) {
        const hit = intersects[0];
        const local = lakeMesh.worldToLocal(hit.point.clone());
        triggerWaterSplash(hit.point.x, hit.point.z, local.x, local.y, 1.25);
        lastDragSplashTime = performance.now();
      }
    };

    const handleCanvasPointerUp = () => {
      isPointerDown = false;
    };

    const handleCanvasPointerMove = (e: PointerEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      pointer2D.x = (rawX / rect.width) * 2 - 1;
      pointer2D.y = -((rawY / rect.height) * 2 - 1);

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

        if (isPointerDown) {
          const now = performance.now();
          if (now - lastDragSplashTime > 80) { // dragging across water causes continuous wake ripples
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
      setIsHoveringWater(false);
      setWaterHoverInfo(null);
    };

    canvas.addEventListener('pointerdown', handleCanvasPointerDown);
    canvas.addEventListener('pointermove', handleCanvasPointerMove);
    canvas.addEventListener('pointerup', handleCanvasPointerUp);
    canvas.addEventListener('pointerleave', handleCanvasPointerLeave);

    // L. MOUSE PARALLAX TRACKING
    let mouseX = 0;
    let mouseY = 0;
    const handlePointerMove = (e: MouseEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };
    window.addEventListener('mousemove', handlePointerMove);

    // M. RESIZE OBSERVER
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

    // N. ANIMATION LOOP
    let animId: number;
    let lastReportedFlood = 0;

    const render = () => {
      animId = requestAnimationFrame(render);
      const now = performance.now();
      const elapsed = (now - startTimeRef.current) / 1000;

      // Expansion factor for the canyon walls
      const peaksProgress = Math.min(1.0, elapsed / PEAKS_RISE_DURATION);
      const peaksScale = 0.45 + Math.pow(peaksProgress, 0.8) * 0.55;
      mountainGroup.scale.set(peaksScale, peaksScale, peaksScale);

      // Waterfall surge progress
      const waterfallElapsed = Math.max(0, elapsed - PEAKS_RISE_DURATION);
      const waterfallProgress = Math.min(1.0, waterfallElapsed / WATERFALL_SURGE_DURATION);
      const waterfallIntensity = waterfallProgress;

      // DRAMATIC RISING FLOODWATER: Synchronized with interactive waterLevelRatio
      if (isAutoSurgingRef.current) {
        const surgeVal = 0.35 + Math.sin(elapsed * 0.4) * 0.35;
        waterLevelRatioRef.current = Math.max(0, Math.min(1.0, surgeVal));
      }

      const targetLakeY = baseLakeY + waterLevelRatioRef.current * (maxLakeY - baseLakeY);
      // Fluid physics smoothing
      lakeMesh.position.y += (targetLakeY - lakeMesh.position.y) * 0.15;
      const currentLakeY = lakeMesh.position.y;
      foamRimMesh.position.y = currentLakeY + 0.05;
      foamRimMesh.rotation.z += 0.004;

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

      // Animate low-hanging mountain clouds / fog puffs slowly drifting through the gorge
      const isUltra = isUltraClarityRef.current;
      fogPuffs.forEach((puff, pIdx) => {
        puff.visible = !isUltra;
        if (!isUltra) {
          puff.position.x += Math.sin(elapsed * 0.3 + pIdx) * 0.005;
          puff.position.y += Math.cos(elapsed * 0.25 + pIdx * 0.8) * 0.004;
          puff.rotation.y += 0.0015;
        }
      });

      // Animate Waterfall Torrent & Rapids
      chuteMesh.visible = waterfallIntensity > 0.05;
      waterfallMesh.visible = waterfallIntensity > 0.05;
      foamMesh.visible = waterfallIntensity > 0.05;
      cascadeMesh.visible = waterfallIntensity > 0.05;
      dropPoints.visible = waterfallIntensity > 0.05;
      mistPoints.visible = waterfallIntensity > 0.05;

      if (waterfallIntensity > 0.05) {
        waterfallMat.opacity = 0.94 * waterfallIntensity;
        foamMat.opacity = 0.75 * waterfallIntensity;

        // Displace main waterfall vertices with high-speed turbulent downward rapids
        const wPos = waterfallRibbonGeo.attributes.position;
        for (let i = 0; i < wPos.count; i++) {
          const py = wPos.getY(i);
          const px = wPos.getX(i);
          const wave = Math.sin(py * 3.4 - elapsed * 26) * 0.22 + Math.cos(px * 5.2 + elapsed * 15) * 0.1;
          wPos.setZ(i, wave * waterfallIntensity);
        }
        waterfallRibbonGeo.computeVertexNormals();
        waterfallRibbonGeo.attributes.position.needsUpdate = true;

        // Displace intermediate cascade rapids
        const cPos = cascadeGeo.attributes.position;
        for (let i = 0; i < cPos.count; i++) {
          const py = cPos.getY(i);
          const px = cPos.getX(i);
          const cWave = Math.sin(py * 4.0 - elapsed * 22) * 0.18 + Math.cos(px * 4.0 + elapsed * 12) * 0.08;
          cPos.setZ(i, cWave * waterfallIntensity);
        }
        cascadeGeo.computeVertexNormals();
        cascadeGeo.attributes.position.needsUpdate = true;

        // Animate 1,800+ Falling Whitewater Droplets
        const dPos = dropGeo.attributes.position;
        const spawnY = 7.5;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const v = dropVelocities[i];
          let px = dPos.getX(i);
          let py = dPos.getY(i);
          let pz = dPos.getZ(i);

          py += v.vy * (0.85 + waterfallIntensity * 0.45);
          px += v.vx;
          pz += v.vz;

          if (py <= currentLakeY || py < -10) {
            // Reset to gorge notch chute
            px = (Math.random() - 0.5) * (1.8 + waterfallIntensity * 1.2);
            py = spawnY + Math.random() * 0.5;
            pz = -7.2 + (Math.random() - 0.5) * 1.5;
            v.vy = -(0.24 + Math.random() * 0.32);
          }

          dPos.setXYZ(i, px, py, pz);
        }
        dropGeo.attributes.position.needsUpdate = true;

        // Animate Rising Mist Vapor at Plunge Impact Zone
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

          if (mv.life >= mv.maxLife || my > currentLakeY + 8.5) {
            mx = (Math.random() - 0.5) * 6.5;
            my = currentLakeY + Math.random() * 0.6;
            mz = -1.2 + (Math.random() - 0.5) * 4.0;
            mv.life = 0;
          }
          mPos.setXYZ(i, mx, my, mz);
        }
        mistGeo.attributes.position.needsUpdate = true;

        // Animate Plunge Splash Rings
        ringGroup.position.y = currentLakeY + 0.05;
        rings.forEach((r) => {
          const prog = (elapsed * 1.6 + r.phase) % 1.0;
          const scale = 0.6 + prog * 6.2;
          r.mesh.scale.set(scale, scale, 1);
          r.mat.opacity = (1 - prog) * 0.8 * waterfallIntensity;
        });

        // Dynamic multi-frequency turbulent waves on Lake Surface + Interactive User Ripples!
        const lPos = lakeGeo.attributes.position;
        for (let i = 0; i < lPos.count; i++) {
          const lx = lPos.getX(i);
          const ly = lPos.getY(i);
          const wave = Math.sin(lx * 0.4 + elapsed * 3.2) * 0.14 + Math.cos(ly * 0.45 + elapsed * 2.8) * 0.12;
          const distToPlunge = Math.hypot(lx, ly - 4.2);
          const impactRipple = Math.sin(distToPlunge * 1.6 - elapsed * 9) * Math.max(0, 1 - distToPlunge / 15) * 0.32;

          // Interactive ripples triggered by user clicks and dragging
          let userRippleSum = 0;
          for (let r = 0; r < activeRipples.length; r++) {
            const rip = activeRipples[r];
            const dist = Math.hypot(lx - rip.localX, ly - rip.localY);
            if (Math.abs(dist - rip.radius) < 2.8) {
              userRippleSum += Math.sin((dist - rip.radius) * 2.8) * rip.strength;
            }
          }

          lPos.setZ(i, (wave + impactRipple) * waterfallIntensity + userRippleSum);
        }
        lakeGeo.computeVertexNormals();
        lakeGeo.attributes.position.needsUpdate = true;
      }

      // Animate User Splash Droplets
      for (let i = 0; i < SPLASH_POOL; i++) {
        const v = splashVelocities[i];
        if (v.active) {
          splashPositions[i * 3] += v.vx;
          splashPositions[i * 3 + 1] += v.vy;
          splashPositions[i * 3 + 2] += v.vz;
          v.vy -= 0.015; // Gravity
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
        if (obj.mesh.position.z > 14) {
          obj.mesh.position.z = 0; // Recycle downstream
        }
        obj.mesh.rotation.y += obj.rotSpeed;
        obj.mesh.rotation.x = Math.sin(elapsed * 1.8 + obj.bobSeed) * 0.12;
      });

      // Animate Floating Canyon Crystals with Parallax & Bob
      canyonCrystals.forEach((c) => {
        c.mesh.rotation.y += c.rotSpeed;
        c.mesh.rotation.x = Math.sin(elapsed * 1.5 + c.bobSeed) * 0.2;
        c.mesh.position.y = c.baseY + Math.sin(elapsed * 2.0 + c.bobSeed) * 0.35;
      });

      // Animate Mountain Observatory Beacons
      const beaconStrobe = Math.sin(elapsed * 6.0) > 0.3 ? 1.0 : 0.1;
      beaconMeshes.forEach((b, bIdx) => {
        const offsetStrobe = Math.sin(elapsed * 5.0 + bIdx * 1.2) > 0.2 ? 1.0 : 0.05;
        (b.material as THREE.MeshBasicMaterial).opacity = offsetStrobe;
      });

      // ========================================================
      // TIME-OF-DAY ATMOSPHERIC LIGHTING & MIST SHADERS
      // ========================================================
      const tod = timeOfDayRef.current;
      const isUltraMode = isUltraClarityRef.current;

      if (tod === 'dawn') {
        // 🌅 Golden Hour Dawn: Warm amber sunlight, glowing lake, golden mist
        scene.background = isUltraMode 
          ? new THREE.Color(0xfef08a).lerp(new THREE.Color(0xf59e0b), 0.4)
          : new THREE.Color(0xf59e0b).lerp(new THREE.Color(0x78350f), 0.55);
        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.setHex(0xd97706);
          scene.fog.density = isUltraMode ? 0.0001 : 0.012;
        }
        ambientLight.color.setHex(0xfde68a);
        ambientLight.intensity = isUltraMode ? 1.6 : 1.35;
        sunLight.color.setHex(0xfef08a);
        sunLight.intensity = isUltraMode ? 3.4 : 2.8;
        backLight.color.setHex(0xf97316);
        backLight.intensity = isUltraMode ? 2.8 : 2.4;
        lakeMat.color.setHex(0x1e293b);
        crystalMat.color.setHex(0xf59e0b);
        crystalMat.emissive.setHex(0xb45309);
        beaconMat.color.setHex(0xfacc15);
      } else if (tod === 'night') {
        // 🌌 Night Ridge: Deep celestial twilight with bioluminescent glow
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
        lakeMat.color.setHex(0x020617);
        crystalMat.color.setHex(0x06b6d4);
        crystalMat.emissive.setHex(0x0891b2);
        beaconMat.color.setHex(0x22d3ee);
      } else {
        // ⛈️ High Monsoon: Moody indigo-slate storm clouds with ambient volumetric lightning
        const hasScreenLightning = lightningFlashRef.current > 0.04;
        const isLightning = Math.random() < 0.012 || hasScreenLightning;
        const flashIntensity = hasScreenLightning ? lightningFlashRef.current * 4.5 : (isLightning ? 3.8 : 0);

        scene.background = isLightning 
          ? new THREE.Color(0xe0f2fe) 
          : (isUltraMode ? new THREE.Color(0x1e293b).lerp(new THREE.Color(0x0f172a), 0.3) : new THREE.Color(0x0f172a));
        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.setHex(isLightning ? 0xc7d2fe : 0x1e1b4b);
          scene.fog.density = isUltraMode ? 0.0001 : 0.018;
        }
        ambientLight.color.setHex(isLightning ? 0xffffff : 0x64748b);
        ambientLight.intensity = (isLightning ? 2.8 : (isUltraMode ? 1.55 : 1.25)) + flashIntensity;
        sunLight.color.setHex(isLightning ? 0xffffff : 0x94a3b8);
        sunLight.intensity = (isLightning ? 3.6 : (isUltraMode ? 2.3 : 1.8)) + flashIntensity * 1.3;
        backLight.color.setHex(0x6366f1);
        backLight.intensity = isUltraMode ? 2.3 : 1.9;
        lakeMat.color.setHex(isLightning ? 0x38bdf8 : (isUltraMode ? 0x0369a1 : 0x0284c7));
        crystalMat.color.setHex(0xa855f7);
        crystalMat.emissive.setHex(0x7e22ce);
        beaconMat.color.setHex(0xef4444);

        if (hasScreenLightning) {
          lightningFlashRef.current *= 0.80; // rapid atmospheric decay
        }
      }

      // ========================================================
      // 3D MOUSE PARALLAX, DYNAMIC PERSPECTIVE TILT & SEISMIC CAMERA TREMOR
      // ========================================================
      if (isPlungingRef.current) {
        // High-altitude camera freefall down through the waterfall notch and deep into the cloud bank
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, -36.0, 0.12);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, -32.0, 0.14);
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0, 0.12);
        camera.fov = THREE.MathUtils.lerp(camera.fov, 115, 0.10);
        camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, -1.25, 0.12); // camera dives downwards into clouds
        camera.updateProjectionMatrix();
        camera.lookAt(0, -45.0, -40.0);
      } else {
        // Perspective tilt on mountain diorama group
        mountainGroup.rotation.y = THREE.MathUtils.lerp(mountainGroup.rotation.y, mouseX * 0.12, 0.06);
        mountainGroup.rotation.x = THREE.MathUtils.lerp(mountainGroup.rotation.x, -mouseY * 0.07, 0.06);

        // Smooth camera positional parallax
        const targetCamX = mouseX * 4.2;
        const targetCamY = 3.2 + mouseY * 2.4;
        camera.position.x += (targetCamX - camera.position.x) * 0.06;
        camera.position.y += (targetCamY - camera.position.y) * 0.06;

        // Apply Physical Camera Tremor on thunder strike
        if (cameraTremorRef.current > 0.01) {
          const tremor = cameraTremorRef.current;
          camera.position.x += (Math.random() - 0.5) * tremor * 0.42;
          camera.position.y += (Math.random() - 0.5) * tremor * 0.42;
          cameraTremorRef.current *= 0.86;
        }

        camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, -mouseX * 0.025, 0.06);
        camera.lookAt(0, 1.0, -3.0);
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
      window.removeEventListener('mousemove', handlePointerMove);
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

      {/* Top Header Controls */}
      <div className="fixed top-3 left-3 right-3 sm:top-5 sm:left-6 sm:right-6 z-40 flex items-center justify-between pointer-events-auto">
        {/* Phase Pill Indicator & Translucent Alert Pill */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 bg-slate-950/80 backdrop-blur-xl border border-purple-500/25 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-2xl">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] tracking-[0.25em] font-bold text-purple-400 uppercase">
                {currentPhase === 'peaks' && '1/3 • TWIN PEAKS'}
                {currentPhase === 'waterfall' && '2/3 • WATERFALL SURGE'}
                {currentPhase === 'reveal' && '3/3 • SAMVARTAKA AI'}
              </span>
              <span className="text-xs font-semibold text-slate-100 tracking-wide hidden md:inline">
                {currentPhase === 'peaks' && 'Mountain Peaks Expanding in Clouds'}
                {currentPhase === 'waterfall' && 'Water Cascading from Between Peaks'}
                {currentPhase === 'reveal' && 'Regime-Aware Intelligence'}
              </span>
            </div>
          </div>

          {/* Translucent Hydrological Alert Pill in Top Header (Interactive Water Meter Deck Toggle) */}
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
              {hydroAlert.code} • +{currentDepthM}m (WATER METER)
            </span>
          </button>
        </div>

        {/* Audio Soundwave Visualizer & Dynamic Glowing Enter Grid Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Interactive Soundwave Equalizer Visualizer Button */}
          <button
            onClick={toggleSound}
            className={`px-3 py-2 rounded-full border backdrop-blur-xl transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-2.5 ${
              isMuted 
                ? 'bg-slate-900/90 hover:bg-slate-800 text-slate-400 border-purple-500/25' 
                : 'bg-purple-950/85 hover:bg-purple-900 text-purple-200 border-purple-400/60 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
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
                      : 'bg-gradient-to-t from-purple-500 via-fuchsia-400 to-cyan-300 animate-pulse'
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

            <span className="text-[11px] font-mono font-semibold">
              {isMuted ? 'AUDIO: MUTED' : 'LIVE SOUNDWAVE'}
            </span>
          </button>

          {/* Time-of-Day Quick Illumination Presets in Top Header */}
          <div className="hidden md:flex items-center bg-slate-950/80 backdrop-blur-xl border border-purple-500/25 p-1 rounded-full gap-1 shadow-xl">
            <button
              onClick={() => {
                setTimeOfDay('dawn');
                setActiveWeatherPreset('clear');
              }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                timeOfDay === 'dawn'
                  ? 'bg-amber-500/30 text-amber-200 border border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🌅</span>
              <span>Dawn</span>
            </button>

            <button
              onClick={() => {
                setTimeOfDay('monsoon');
                setActiveWeatherPreset('monsoon');
              }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                timeOfDay === 'monsoon'
                  ? 'bg-purple-500/30 text-purple-200 border border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>⛈️</span>
              <span>Monsoon</span>
            </button>

            <button
              onClick={() => {
                setTimeOfDay('night');
                setActiveWeatherPreset('surge');
              }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                timeOfDay === 'night'
                  ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🌌</span>
              <span>Night</span>
            </button>
          </div>

          {/* Dynamic Enter Grid CTA with dynamic water-level color shifts and glowing radiance */}
          <button
            onClick={handleEnterWaterfall}
            className={`group relative flex items-center gap-2 text-white text-xs font-bold uppercase tracking-wider px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border backdrop-blur-xl transition-all duration-500 active:scale-95 cursor-pointer shadow-2xl select-none ${enterGridTheme.gradient} ${enterGridTheme.border} ${enterGridTheme.shadow} ${enterGridTheme.pulse} ${enterGridTheme.glowAura}`}
            title={`Enter Grid • Current Water Level: +${currentDepthM}m (${enterGridTheme.label})`}
          >
            <span className="relative z-10 flex items-center gap-1.5">
              <span>Enter Grid</span>
              <span className={`text-[8.5px] font-mono font-black px-1.5 py-0.2 rounded-full border hidden sm:inline-block ${enterGridTheme.tagBg}`}>
                +{currentDepthM}m
              </span>
            </span>
            <SkipForward size={14} className="relative z-10 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>

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

          {/* Whole Screen Lightning Atmospheric Illumination Flash */}
          {screenFlash > 0.01 && (
            <div
              className="absolute inset-0 pointer-events-none z-26 transition-opacity duration-75"
              style={{
                backgroundColor: `rgba(219, 234, 254, ${screenFlash})`,
                mixBlendMode: 'screen',
              }}
            />
          )}

          {/* Dynamic Live Water Surface Sonar Probe Tooltip */}
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

          {/* ========================================================================= */}
          {/* ZONE 1: UPPER HERO CENTERPIECE (Title, Subtitle, & Primary CTA)          */}
          {/* ========================================================================= */}
          <div className="relative z-30 flex flex-col items-center text-center pointer-events-none pt-2 sm:pt-4">
            {/* 1. Pill Badge */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: isPlunging ? 0 : 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-900/60 border border-purple-400/40 backdrop-blur-md shadow-[0_0_20px_rgba(168,85,247,0.35)] mb-1 sm:mb-2 pointer-events-auto"
            >
              <Sparkles size={12} className="text-purple-300 animate-pulse" />
              <span className="text-[10px] sm:text-[11px] font-semibold tracking-[0.25em] text-purple-200 uppercase">
                Precision • Speed • Intelligence
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
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-[0.12em] sm:tracking-[0.15em] uppercase leading-none flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-3"
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
                        className="relative inline-block px-1 py-0.5 font-black cursor-pointer group"
                      >
                        {/* Accretion Ring Halo (Glowing White/Purple/Cyan Ring around Black Core) */}
                        <span
                          className="absolute -inset-3 sm:-inset-4 rounded-full pointer-events-none -z-10 blur-md transition-all duration-150"
                          style={{
                            background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(216,180,254,0.85) 30%, rgba(168,85,247,0.7) 60%, rgba(56,189,248,0.4) 85%, transparent 100%)',
                            opacity: Math.max(0.4, strength * 0.95),
                            transform: `scale(${0.9 + strength * 0.35})`,
                          }}
                        />

                        {/* Sprinkled Starlight Dots around each Letter */}
                        <span className="starlight-dot -top-1 -left-1" style={{ animationDelay: `${(charIdx * 0.2) % 2}s` }} />
                        <span className="starlight-dot -top-1.5 right-0" style={{ animationDelay: `${(charIdx * 0.3 + 0.4) % 2}s` }} />
                        <span className="starlight-dot -bottom-1 -left-0.5" style={{ animationDelay: `${(charIdx * 0.15 + 0.8) % 2}s` }} />
                        <span className="starlight-dot -bottom-1.5 right-1" style={{ animationDelay: `${(charIdx * 0.25 + 1.2) % 2}s` }} />

                        {/* Pitch Black Core Letter Glyph */}
                        <span className="blackhole-letter font-black text-black select-none">
                          {char}
                        </span>

                        {isDirectlyHovered && (
                          <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_#fff] animate-ping pointer-events-none" />
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
                        className="relative inline-block px-1 py-0.5 font-black cursor-pointer group"
                      >
                        <span
                          className="absolute -inset-3 sm:-inset-4 rounded-full pointer-events-none -z-10 blur-md transition-all duration-150"
                          style={{
                            background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(216,180,254,0.85) 30%, rgba(168,85,247,0.7) 60%, rgba(56,189,248,0.4) 85%, transparent 100%)',
                            opacity: Math.max(0.4, strength * 0.95),
                            transform: `scale(${0.9 + strength * 0.35})`,
                          }}
                        />

                        <span className="starlight-dot -top-1 -left-1" style={{ animationDelay: `${(charIdx * 0.2 + 0.5) % 2}s` }} />
                        <span className="starlight-dot -top-1.5 right-0" style={{ animationDelay: `${(charIdx * 0.3 + 0.9) % 2}s` }} />
                        <span className="starlight-dot -bottom-1 -left-0.5" style={{ animationDelay: `${(charIdx * 0.15 + 1.3) % 2}s` }} />
                        <span className="starlight-dot -bottom-1.5 right-1" style={{ animationDelay: `${(charIdx * 0.25 + 1.7) % 2}s` }} />

                        <span className="blackhole-letter font-black text-black select-none">
                          {char}
                        </span>

                        {isDirectlyHovered && (
                          <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_#fff] animate-ping pointer-events-none" />
                        )}
                      </span>
                    );
                  })}
                </span>
              </h1>

              {/* 3. Subheading */}
              <motion.h2
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: isPlunging ? 0 : 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-xs sm:text-sm md:text-base font-bold tracking-[0.2em] text-slate-200 uppercase mt-1 drop-shadow-md"
              >
                STOP GUESSING. START CALIBRATING.
              </motion.h2>

              {/* 4. Small Description */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: isPlunging ? 0 : 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-[11px] sm:text-xs text-purple-200/80 font-medium tracking-wide max-w-md mt-0.5 hidden md:block drop-shadow"
              >
                Physics-Informed Deep Neural Post-Processing of Monsoon Rainfall Forecasts
              </motion.p>
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
            exit={{ opacity: 1 }}
            transition={{ duration: 5.0, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[150] pointer-events-none flex flex-col items-center justify-center overflow-hidden"
          >
            {/* 1. Atmospheric Sky & Base Cloud Blanket */}
            <div className="absolute inset-0 bg-gradient-to-b from-sky-200/95 via-purple-100/90 to-white backdrop-blur-3xl" />

            {/* 2. Real-Time 3D Volumetric Cloud & Atmospheric Freefall Canvas */}
            <VolumetricFreefall3D />
            
            {/* 3. STAGE 1: Cascading Waterfall Spray & Water Curtain Breach */}
            <motion.div
              initial={{ y: '-100%', opacity: 1 }}
              animate={{ y: ['-100%', '0%', '120%'], opacity: [1, 0.95, 0] }}
              transition={{ duration: 2.0, ease: [0.25, 1, 0.5, 1] }}
              className="absolute inset-0 bg-gradient-to-b from-cyan-400/80 via-sky-300/60 to-transparent backdrop-blur-md flex flex-col items-center justify-center pointer-events-none"
            >
              {/* Vertical rushing water streams */}
              <div className="w-full h-full bg-[repeating-linear-gradient(to_bottom,transparent_0px,transparent_30px,rgba(255,255,255,0.85)_30px,rgba(255,255,255,0.95)_34px,transparent_36px)]" />
              {/* Cyan refraction glow ring */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.6)_0%,rgba(56,189,248,0.4)_40%,transparent_75%)]" />
            </motion.div>

            {/* 4. Radial Wind Tunnel / Sky-Dive Freefall Vortex Expanding */}
            <motion.div
              initial={{ scale: 0.2, opacity: 0.9 }}
              animate={{ scale: [0.2, 1.8, 5.0], opacity: [0.9, 1, 0.05] }}
              transition={{ duration: 4.6, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 rounded-full border-[28px] border-white/70 shadow-[0_0_150px_rgba(255,255,255,1),inset_0_0_100px_rgba(168,85,247,0.4)]"
            />

            {/* 5. STAGE 3: Breaking Through Cloud Ceiling */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 2.0, 4.0], opacity: [0, 0.95, 0] }}
              transition={{ duration: 2.0, delay: 3.0, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-200/50 via-white to-sky-200/50 blur-2xl"
            />
            
            {/* Freefall Telemetry Readout */}
            <div className="relative z-10 flex flex-col items-center gap-2 text-center select-none">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: [0, 1, 0.9], y: [20, 0, -5] }}
                transition={{ delay: 0.2, duration: 1.0 }}
                className="px-6 py-2.5 rounded-full bg-slate-950/70 backdrop-blur-xl border border-purple-400/40 shadow-[0_8px_32px_rgba(168,85,247,0.4)]"
              >
                <span className="text-xs sm:text-sm font-mono font-bold tracking-[0.35em] uppercase text-white drop-shadow-sm">
                  Freefalling Through Cloud Layer
                </span>
              </motion.div>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.85] }}
                transition={{ delay: 0.6, duration: 1.0 }}
                className="text-[10px] sm:text-xs font-mono text-purple-900/90 font-bold tracking-widest uppercase"
              >
                Altitude Descent • Atmospheric Drag • Touching Down
              </motion.span>
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
            id="intro-ask-ai-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-chat-assistant'))}
            className="hover:text-white flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-blue-900/60 to-purple-900/60 hover:from-blue-800/80 hover:to-purple-800/80 border border-purple-400/40 text-purple-200 transition-all cursor-pointer font-medium active:scale-95 shadow-[0_0_15px_rgba(168,85,247,0.3)] text-xs"
            title="Open SAMVARTAKA AI Meteorological Assistant"
          >
            <Bot size={13} className="text-purple-300 animate-pulse" />
            <span>Ask AI Assistant</span>
          </button>
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
