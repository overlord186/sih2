import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as THREE from 'three';
import { Volume2, VolumeX, SkipForward, RotateCcw, ArrowUpRight, Sparkles, Mountain, Droplets, CloudRain, Bot, Waves, Plus, Minus, Activity } from 'lucide-react';

interface CinematicIntroProps {
  onComplete: () => void;
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

export function CinematicIntro({ onComplete }: CinematicIntroProps) {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const mountainCanvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [currentPhase, setCurrentPhase] = useState<'peaks' | 'waterfall' | 'reveal'>('peaks');
  const [isMuted, setIsMuted] = useState<boolean>(true); // Sound defaults to muted until user clicks sound button
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  const [isPlunging, setIsPlunging] = useState<boolean>(false);
  const isPlungingRef = useRef<boolean>(false);
  const [floodDepth, setFloodDepth] = useState<number>(0);
  const [isFloodSurging, setIsFloodSurging] = useState<boolean>(false);
  const isFloodSurgingRef = useRef<boolean>(false);
  isFloodSurgingRef.current = isFloodSurging;
  const lastReportedFloodRef = useRef<number>(0);

  // User Interactive Flood Water Physics & Controls
  const [manualWaterLevel, setManualWaterLevel] = useState<number | null>(null); // 0.0 to 1.0 (null = auto)
  const manualWaterLevelRef = useRef<number | null>(null);
  manualWaterLevelRef.current = manualWaterLevel;

  const [waterHoverInfo, setWaterHoverInfo] = useState<{ x: number; y: number; depthM: string; currentMps: string } | null>(null);
  const [floatingLogsCount, setFloatingLogsCount] = useState<number>(0);
  const [recentSplashCount, setRecentSplashCount] = useState<number>(0);
  const [isHoveringWater, setIsHoveringWater] = useState<boolean>(false);

  const triggerWaterSplashFnRef = useRef<((worldX?: number, worldZ?: number, power?: number) => void) | null>(null);
  const dropFloatingObjectFnRef = useRef<(() => void) | null>(null);

  // Interactive Letter Hover & Cursor Tracking
  const [hoveredLetterIndex, setHoveredLetterIndex] = useState<number | null>(null);
  const [letterGlowStrengths, setLetterGlowStrengths] = useState<number[]>(new Array(11).fill(0));
  const letterElementsRef = useRef<(HTMLSpanElement | null)[]>([]);

  // Audio synthesis references
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);
  const waterGainRef = useRef<GainNode | null>(null);
  const chimeTriggeredRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(true);
  isMutedRef.current = isMuted;
  const startTimeRef = useRef<number>(performance.now());

  // Celestial micro-chime on letter hover
  const playLetterHoverTone = useCallback((index: number) => {
    if (!audioCtxRef.current || isMutedRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      // Ethereal pentatonic scale (A minor / C celestial notes)
      const celestialPitches = [
        329.63, // E4
        392.00, // G4
        440.00, // A4
        523.25, // C5
        587.33, // D5
        659.25, // E5
        783.99, // G5
        880.00, // A5
        1046.50, // C6
        1174.66, // D6
        1318.51, // E6
      ];
      const pitch = celestialPitches[index % celestialPitches.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, ctx.currentTime);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.46);
    } catch {
      // fallback
    }
  }, []);

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

  // Waterfall plunge & fog transition on Enter
  const handleEnterWaterfall = useCallback(() => {
    if (isPlungingRef.current) return;
    isPlungingRef.current = true;
    setIsPlunging(true);

    // Dynamic waterfall audio rush & deep sub-bass cinematic plunge
    if (audioCtxRef.current && !isMutedRef.current) {
      try {
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();
        if (waterGainRef.current) {
          waterGainRef.current.gain.cancelScheduledValues(ctx.currentTime);
          waterGainRef.current.gain.setValueAtTime(waterGainRef.current.gain.value, ctx.currentTime);
          waterGainRef.current.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 0.6);
          waterGainRef.current.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.0);
        }
        // Sub-bass cinematic impact & plunge whoosh
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + 1.25);
        oscGain.gain.setValueAtTime(0.38, ctx.currentTime);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.4);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.5);
      } catch {}
    }

    // After camera plunges deep into the waterfall and thick fog envelops screen completely (1.35s), complete intro
    setTimeout(() => {
      onComplete();
    }, 1350);
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

  const toggleSound = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!audioCtxRef.current) {
      initAudio();
    }
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    isMutedRef.current = nextMuted;
    setHasInteracted(true);

    if (audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      if (!nextMuted) {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        if (ambientGainRef.current) {
          ambientGainRef.current.gain.cancelScheduledValues(ctx.currentTime);
          ambientGainRef.current.gain.setTargetAtTime(0.26, ctx.currentTime, 0.08);
        }
        if (waterGainRef.current) {
          waterGainRef.current.gain.cancelScheduledValues(ctx.currentTime);
          waterGainRef.current.gain.setTargetAtTime(0.20, ctx.currentTime, 0.08);
        }
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

    let animId: number;

    const render = (now: number) => {
      animId = requestAnimationFrame(render);
      const elapsed = (now - startTimeRef.current) / 1000;
      setCurrentTime(elapsed);

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
      // A. DEEP OBSIDIAN & PURPLE LIQUID SILK BACKGROUND
      // ========================================================
      // Base background: Obsidian deep purple/violet
      const bgGrad = ctx.createRadialGradient(
        width * 0.5, height * 0.45, 50,
        width * 0.5, height * 0.5, Math.max(width, height) * 0.8
      );
      bgGrad.addColorStop(0, '#130924'); // deep mystical violet center
      bgGrad.addColorStop(0.45, '#0c0517'); // obsidian indigo
      bgGrad.addColorStop(1, '#030108'); // pitch black rim
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Luminous Liquid Silk Waves (swirling purple/violet fluid ribbons from video)
      ctx.save();
      const waveCount = 5;
      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        const yBase = height * (0.15 + w * 0.2);
        const amp = 65 + w * 18;
        const freq = 0.0018 + w * 0.0004;
        const speed = elapsed * (0.6 + w * 0.2);

        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 15) {
          const y = yBase + Math.sin(x * freq + speed) * amp + Math.cos(x * 0.001 - speed * 0.7) * 35;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();

        const silkGrad = ctx.createLinearGradient(0, yBase - amp, width, yBase + amp);
        if (w % 2 === 0) {
          silkGrad.addColorStop(0, 'rgba(168, 85, 247, 0.12)'); // luminous purple
          silkGrad.addColorStop(0.5, 'rgba(192, 132, 252, 0.06)');
          silkGrad.addColorStop(1, 'rgba(126, 34, 206, 0.14)');
        } else {
          silkGrad.addColorStop(0, 'rgba(99, 102, 241, 0.09)'); // soft indigo
          silkGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.04)');
          silkGrad.addColorStop(1, 'rgba(59, 130, 246, 0.08)');
        }
        ctx.fillStyle = silkGrad;
        ctx.fill();
      }
      ctx.restore();

      // Ambient Glowing Nebulae / Light Orbs
      ctx.save();
      const glowOrb = ctx.createRadialGradient(width * 0.5, height * 0.38, 0, width * 0.5, height * 0.38, 380);
      glowOrb.addColorStop(0, 'rgba(192, 132, 252, 0.18)');
      glowOrb.addColorStop(0.5, 'rgba(147, 51, 234, 0.06)');
      glowOrb.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowOrb;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // ========================================================
      // B. 3D FLOATING FACETED OBSIDIAN ROCKS (Video 00:06 - 00:14)
      // ========================================================
      ctx.save();
      rocks.forEach((rock) => {
        rock.rotX += rock.rotSpeedX;
        rock.rotY += rock.rotSpeedY;
        rock.rotZ += rock.rotSpeedZ;
        rock.x += rock.driftVx;
        rock.y += rock.driftVy;

        // Wrap around boundaries
        if (rock.x < -100) rock.x = width + 80;
        if (rock.x > width + 100) rock.x = -80;
        if (rock.y < -100) rock.y = height + 80;
        if (rock.y > height + 100) rock.y = -80;

        // 3D rotation matrix calculation
        const cosX = Math.cos(rock.rotX), sinX = Math.sin(rock.rotX);
        const cosY = Math.cos(rock.rotY), sinY = Math.sin(rock.rotY);
        const cosZ = Math.cos(rock.rotZ), sinZ = Math.sin(rock.rotZ);

        // Project vertices
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
            x: rock.x + x3,
            y: rock.y + y3,
            z: rock.z + z2,
          };
        });

        // Sort faces by depth
        const faceDepths = rock.faces.map((f, idx) => {
          const avgZ = (projected[f[0]].z + projected[f[1]].z + projected[f[2]].z) / 3;
          return { idx, avgZ };
        });
        faceDepths.sort((a, b) => b.avgZ - a.avgZ);

        // Render faces with realistic violet/obsidian metallic lighting
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

          // Lighting model: directional purple-white light from top-center
          const lightIntensity = Math.max(0.12, (normZ * 0.7 + (ny / len) * -0.3));

          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.closePath();

          // Obsidian rock face gradient with purple specular sheen
          const rGrad = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
          const rVal = Math.floor(45 * lightIntensity);
          const gVal = Math.floor(25 * lightIntensity);
          const bVal = Math.floor(75 * lightIntensity);
          rGrad.addColorStop(0, `rgb(${rVal + 30}, ${gVal + 15}, ${bVal + 60})`);
          rGrad.addColorStop(1, `rgb(${rVal}, ${gVal}, ${bVal})`);

          ctx.fillStyle = rGrad;
          ctx.fill();

          // Facet edge highlight
          ctx.strokeStyle = `rgba(192, 132, 252, ${lightIntensity * 0.45})`;
          ctx.lineWidth = 1.0;
          ctx.stroke();
        });
      });
      ctx.restore();
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
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

    // 2. WEBGL RENDERER
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

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
    // Submerges the entire lower canyon, rising from deep floor -8.2 up to +4.5!
    const lakeGeo = new THREE.PlaneGeometry(64, 46, 48, 48);
    const lakeMat = new THREE.MeshStandardMaterial({
      color: 0x112838, // realistic deep dark mountain alpine water
      roughness: 0.12,
      metalness: 0.85,
      transparent: true,
      opacity: 0.92,
    });
    const lakeMesh = new THREE.Mesh(lakeGeo, lakeMat);
    lakeMesh.rotation.x = -Math.PI / 2;
    lakeMesh.position.set(0, -8.2, 4);
    mountainGroup.add(lakeMesh);

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
    const baseLakeY = -8.2;
    // Dramatically higher flood elevation (up to +4.5), submerging lower cliffs & trees!
    const maxLakeY = 4.5;

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

      // DRAMATIC RISING FLOODWATER: Supports user manual control OR automated monsoon surge
      let floodHeightPx = 0;
      let currentLakeY = baseLakeY;

      if (manualWaterLevelRef.current !== null) {
        // Direct interactive user control over the flood height
        const floodRatio = Math.max(0, Math.min(1.0, manualWaterLevelRef.current));
        currentLakeY = baseLakeY + floodRatio * (maxLakeY - baseLakeY);
        floodHeightPx = Math.round(floodRatio * height * 0.92);
      } else if (waterfallElapsed > 0.2 || isFloodSurgingRef.current) {
        const poolTime = isFloodSurgingRef.current 
          ? Math.min(22, (waterfallElapsed + 12)) 
          : waterfallElapsed - 0.2;
        // Allows the flood water to surge all the way to 92%+ of container height
        const floodRatio = isFloodSurgingRef.current 
          ? Math.min(1.0, 0.35 + poolTime * 0.12)
          : Math.min(1.0, poolTime / 22);
        
        currentLakeY = baseLakeY + floodRatio * (maxLakeY - baseLakeY);
        floodHeightPx = Math.round(floodRatio * height * 0.92); // Up to 92% screen height!
      }
      lakeMesh.position.y = currentLakeY;

      // Report flood depth to parent state
      if (Math.abs(floodHeightPx - lastReportedFlood) > 2) {
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
      fogPuffs.forEach((puff, pIdx) => {
        puff.position.x += Math.sin(elapsed * 0.3 + pIdx) * 0.005;
        puff.position.y += Math.cos(elapsed * 0.25 + pIdx * 0.8) * 0.004;
        puff.rotation.y += 0.0015;
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

      // Camera Parallax & Interactive 3D Orbit
      if (isPlungingRef.current) {
        // Exhilarating 3D plunge directly into the waterfall torrent!
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, -3.8, 0.075);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1.6, 0.075);
        camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0, 0.08);
        camera.lookAt(0, 1.2, -4.5);
      } else {
        const targetCamX = mouseX * 3.6;
        const targetCamY = 3.2 + mouseY * 2.0;
        camera.position.x += (targetCamX - camera.position.x) * 0.05;
        camera.position.y += (targetCamY - camera.position.y) * 0.05;
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

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black overflow-hidden font-sans select-none flex items-center justify-center p-3 sm:p-6 md:p-10"
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
      <div className="absolute top-5 left-5 right-5 sm:top-7 sm:left-8 sm:right-8 z-30 flex items-center justify-between pointer-events-auto">
        {/* Phase Pill Indicator */}
        <div className="flex items-center gap-3 bg-slate-950/80 backdrop-blur-xl border border-purple-500/25 px-4 py-2 rounded-full shadow-2xl">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] tracking-[0.25em] font-bold text-purple-400 uppercase">
              {currentPhase === 'peaks' && '1/3 • TWIN PEAKS'}
              {currentPhase === 'waterfall' && '2/3 • WATERFALL SURGE'}
              {currentPhase === 'reveal' && '3/3 • SAMVARTKA AI'}
            </span>
            <span className="text-xs font-semibold text-slate-100 tracking-wide hidden sm:inline">
              {currentPhase === 'peaks' && 'Mountain Peaks Expanding in Clouds'}
              {currentPhase === 'waterfall' && 'Water Cascading from Between Peaks'}
              {currentPhase === 'reveal' && 'Regime-Aware Intelligence'}
            </span>
          </div>
        </div>

        {/* Audio & Skip Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Flood Surge Toggle Button */}
          <button
            onClick={() => setIsFloodSurging((prev) => !prev)}
            className={`px-3 py-2 rounded-full border backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-1.5 text-xs font-semibold ${
              isFloodSurging
                ? 'bg-rose-950/90 hover:bg-rose-900 text-rose-200 border-rose-400/60 shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse'
                : 'bg-slate-900/85 hover:bg-slate-800 text-cyan-300 border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
            }`}
            title={isFloodSurging ? 'Reset Flood Surge' : 'Simulate Extreme Canyon Flood Surge'}
          >
            <Droplets size={14} className={isFloodSurging ? 'text-rose-300 animate-bounce' : 'text-cyan-400'} />
            <span className="text-[11px] font-mono">
              {isFloodSurging ? 'MAX FLOOD: SURGING' : 'SURGE FLOOD +'}
            </span>
          </button>

          <button
            onClick={toggleSound}
            className={`p-2.5 rounded-full border backdrop-blur-md transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-2 px-3 ${
              isMuted 
                ? 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-purple-500/25' 
                : 'bg-purple-950/80 hover:bg-purple-900 text-purple-200 border-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
            }`}
            title={isMuted ? 'Enable Ambient Sound' : 'Mute Sound'}
          >
            {isMuted ? (
              <>
                <VolumeX size={16} className="text-slate-400" />
                <span className="text-[11px] font-medium hidden sm:inline">Sound Off</span>
              </>
            ) : (
              <>
                <Volume2 size={16} className="text-purple-300 animate-pulse" />
                <span className="text-[11px] font-medium text-purple-300 hidden sm:inline">Sound On</span>
              </>
            )}
          </button>

          <button
            onClick={handleEnterWaterfall}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-full shadow-[0_0_30px_rgba(168,85,247,0.45)] border border-purple-400/40 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          >
            <span>Enter App</span>
            <SkipForward size={14} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* THE HERO SHOWCASE CARD (Exact Luxury UI Mockup from Reference Video)     */}
      {/* ========================================================================= */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={isPlunging ? {
          scale: [1, 1.04, 2.6],
          filter: 'brightness(1.5) blur(6px)',
          opacity: [1, 0.95, 0],
        } : {
          opacity: 1, 
          scale: 1, 
          y: 0,
          filter: 'brightness(1) blur(0px)',
        }}
        transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1] }}
        style={{
          transformOrigin: '50% 42%',
        }}
        className="relative z-20 w-full max-w-4xl min-h-[500px] sm:min-h-[540px] md:min-h-[570px] max-h-[88vh] rounded-3xl bg-slate-950/85 backdrop-blur-2xl border border-purple-500/30 shadow-[0_0_80px_rgba(168,85,247,0.25),inset_0_1px_1px_rgba(255,255,255,0.15)] overflow-hidden flex flex-col pointer-events-auto"
      >
        {/* Showcase Card Top Navigation Bar (matching video's top bar) */}
        <div className="h-12 border-b border-purple-500/20 bg-slate-900/40 backdrop-blur-md px-5 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-purple-300/20" />
          </div>

          <div className="px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-[11px] font-semibold tracking-wider text-purple-200">
            SAMVARTKA AI
          </div>

          <div className="flex items-center gap-2 text-[11px] text-purple-300/70 font-mono">
            <Mountain size={12} className="text-purple-400" />
            <span className="hidden sm:inline">NWP Post-Processing</span>
          </div>
        </div>

        {/* Viewport Canvas: Two Mountain Peaks Expanding in Clouds + Falling Water */}
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
            filter: 'brightness(1) blur(0px)',
          }}
          transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex-1 w-full h-full overflow-hidden"
        >
          <canvas 
            ref={mountainCanvasRef} 
            className={`absolute inset-0 w-full h-full block z-10 transition-colors ${
              isHoveringWater ? 'cursor-pointer' : 'cursor-default'
            }`} 
          />

          {/* Dynamic Live Water Surface Sonar Probe Tooltip */}
          {waterHoverInfo && !isPlunging && (
            <div 
              className="absolute z-25 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3"
              style={{ left: waterHoverInfo.x, top: Math.max(30, waterHoverInfo.y - 10) }}
            >
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/95 border border-cyan-400/80 shadow-[0_0_25px_rgba(6,182,212,0.6)] text-[11px] font-mono text-cyan-200 backdrop-blur-xl whitespace-nowrap animate-in fade-in zoom-in duration-150">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="font-bold text-white tracking-wider">DEPTH: {waterHoverInfo.depthM}m</span>
                <span className="text-cyan-400/50">•</span>
                <span>FLOW: {waterHoverInfo.currentMps} m/s</span>
                <span className="text-cyan-400/50">•</span>
                <span className="text-[10px] font-sans font-semibold text-cyan-300">Click/Drag to Splash 🌊</span>
              </div>
              <div className="w-2 h-2 bg-cyan-400 rotate-45 mx-auto -mt-1 shadow-sm" />
            </div>
          )}

          {/* Vignette inside card */}
          <div className="absolute inset-0 pointer-events-none z-15 shadow-[inset_0_0_90px_rgba(0,0,0,0.85)]" />

          {/* ========================================================================= */}
          {/* SAMVARTKA AI TYPOGRAPHY & HERO INTERFACE (ZERO WIGGLING!)                 */}
          {/* ========================================================================= */}
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-6 pointer-events-none">
            {/* 1. Pill Badge - ALWAYS VISIBLE */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: isPlunging ? 0 : 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-900/60 border border-purple-400/40 backdrop-blur-md shadow-[0_0_20px_rgba(168,85,247,0.35)] mb-2 sm:mb-3 pointer-events-auto"
            >
              <Sparkles size={13} className="text-purple-300 animate-pulse" />
              <span className="text-[11px] sm:text-xs font-semibold tracking-[0.25em] text-purple-200 uppercase">
                Precision • Speed • Intelligence
              </span>
            </motion.div>

            {/* 2. SAMVARTKA AI - INTERACTIVE GLOWING LETTERS (GLOWS BRIGHTER ON HOVER & CURSOR MOVEMENT) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ 
                opacity: isPlunging ? 0 : 1,
                scale: isPlunging ? 1.3 : 1 
              }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              onMouseMove={handleTitleMouseMove}
              onMouseLeave={handleTitleMouseLeave}
              className="select-none flex flex-col items-center pointer-events-auto cursor-default py-1 sm:py-2"
            >
              <h1 
                className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-[0.12em] sm:tracking-[0.14em] uppercase leading-tight flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-4"
                style={{
                  transform: 'none', // Strictly NO wiggling or rotation!
                }}
              >
                {/* Word 1: SAMVARTKA */}
                <span className="inline-flex items-center">
                  {['S', 'A', 'M', 'V', 'A', 'R', 'T', 'K', 'A'].map((char, charIdx) => {
                    const globalIdx = charIdx;
                    const isDirectlyHovered = hoveredLetterIndex === globalIdx;
                    const proximity = letterGlowStrengths[globalIdx] || 0;
                    const strength = Math.max(proximity, isDirectlyHovered ? 1.0 : 0);

                    return (
                      <span
                        key={`samvartka-${charIdx}`}
                        ref={(el) => { letterElementsRef.current[globalIdx] = el; }}
                        onMouseEnter={() => {
                          setHoveredLetterIndex(globalIdx);
                          playLetterHoverTone(globalIdx);
                        }}
                        onMouseLeave={() => {
                          if (hoveredLetterIndex === globalIdx) setHoveredLetterIndex(null);
                        }}
                        style={{
                          textShadow: strength > 0.04
                            ? `0 0 10px #ffffff, 0 0 24px rgba(255, 255, 255, ${0.85 + strength * 0.15}), 0 0 ${35 + strength * 45}px rgba(244, 114, 182, ${0.7 + strength * 0.3}), 0 0 ${60 + strength * 60}px rgba(168, 85, 247, ${0.65 + strength * 0.35}), 0 0 ${95 + strength * 80}px rgba(147, 51, 234, 0.75)`
                            : '0 0 18px rgba(216, 180, 254, 0.65), 0 0 35px rgba(168, 85, 247, 0.45)',
                          transform: `translateY(-${strength * 6}px)`,
                          filter: `brightness(${1.0 + strength * 1.1}) drop-shadow(0 ${strength * 4}px ${12 + strength * 28}px rgba(232, 121, 249, ${0.45 + strength * 0.55}))`,
                          transition: 'transform 0.12s ease-out, filter 0.12s ease-out, text-shadow 0.12s ease-out',
                        }}
                        className="relative inline-block px-0.5 sm:px-1 py-1 font-black cursor-pointer group"
                      >
                        {/* Radial aura expanding behind letter on cursor movement */}
                        <span
                          className="absolute -inset-3 sm:-inset-4 rounded-full pointer-events-none -z-10 blur-xl transition-all duration-150"
                          style={{
                            background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(244,114,182,0.85) 35%, rgba(168,85,247,0.55) 65%, transparent 80%)',
                            opacity: Math.max(0.12, strength * 0.95),
                            transform: `scale(${0.85 + strength * 0.45})`,
                          }}
                        />

                        {/* Letter Glyph */}
                        <span className={`text-transparent bg-clip-text ${strength > 0.3 ? 'bg-gradient-to-b from-white via-pink-100 to-purple-200' : 'bg-gradient-to-b from-white via-slate-100 to-purple-300'}`}>
                          {char}
                        </span>

                        {/* Direct hover pin-light sparkle */}
                        {isDirectlyHovered && (
                          <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white animate-ping pointer-events-none" />
                        )}
                      </span>
                    );
                  })}
                </span>

                {/* Word 2: AI */}
                <span className="inline-flex items-center">
                  {['A', 'I'].map((char, charIdx) => {
                    const globalIdx = 9 + charIdx;
                    const isDirectlyHovered = hoveredLetterIndex === globalIdx;
                    const proximity = letterGlowStrengths[globalIdx] || 0;
                    const strength = Math.max(proximity, isDirectlyHovered ? 1.0 : 0);

                    return (
                      <span
                        key={`ai-${charIdx}`}
                        ref={(el) => { letterElementsRef.current[globalIdx] = el; }}
                        onMouseEnter={() => {
                          setHoveredLetterIndex(globalIdx);
                          playLetterHoverTone(globalIdx);
                        }}
                        onMouseLeave={() => {
                          if (hoveredLetterIndex === globalIdx) setHoveredLetterIndex(null);
                        }}
                        style={{
                          textShadow: strength > 0.04
                            ? `0 0 10px #ffffff, 0 0 24px rgba(255, 255, 255, ${0.85 + strength * 0.15}), 0 0 ${35 + strength * 45}px rgba(244, 114, 182, ${0.7 + strength * 0.3}), 0 0 ${60 + strength * 60}px rgba(168, 85, 247, ${0.65 + strength * 0.35}), 0 0 ${95 + strength * 80}px rgba(147, 51, 234, 0.75)`
                            : '0 0 18px rgba(216, 180, 254, 0.65), 0 0 35px rgba(168, 85, 247, 0.45)',
                          transform: `translateY(-${strength * 6}px)`,
                          filter: `brightness(${1.0 + strength * 1.1}) drop-shadow(0 ${strength * 4}px ${12 + strength * 28}px rgba(232, 121, 249, ${0.45 + strength * 0.55}))`,
                          transition: 'transform 0.12s ease-out, filter 0.12s ease-out, text-shadow 0.12s ease-out',
                        }}
                        className="relative inline-block px-0.5 sm:px-1 py-1 font-black cursor-pointer group"
                      >
                        <span
                          className="absolute -inset-3 sm:-inset-4 rounded-full pointer-events-none -z-10 blur-xl transition-all duration-150"
                          style={{
                            background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(244,114,182,0.85) 35%, rgba(168,85,247,0.55) 65%, transparent 80%)',
                            opacity: Math.max(0.12, strength * 0.95),
                            transform: `scale(${0.85 + strength * 0.45})`,
                          }}
                        />

                        <span className={`text-transparent bg-clip-text ${strength > 0.3 ? 'bg-gradient-to-b from-white via-pink-100 to-purple-200' : 'bg-gradient-to-b from-white via-slate-100 to-purple-300'}`}>
                          {char}
                        </span>

                        {isDirectlyHovered && (
                          <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white animate-ping pointer-events-none" />
                        )}
                      </span>
                    );
                  })}
                </span>
              </h1>

              {/* 3. Subheading */}
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: isPlunging ? 0 : 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="text-xs sm:text-base md:text-lg font-bold tracking-[0.2em] text-slate-200 uppercase mt-1 drop-shadow-md"
              >
                STOP GUESSING. START CALIBRATING.
              </motion.h2>

              {/* 4. Small Description */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: isPlunging ? 0 : 1 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="text-[11px] sm:text-xs text-purple-200/90 font-medium tracking-wide max-w-lg mt-1.5 hidden sm:block drop-shadow"
              >
                Physics-Informed Deep Neural Post-Processing of Monsoon Rainfall Forecasts
              </motion.p>
            </motion.div>

            {/* 5. Dynamic Flood Telemetry Indicator (Shows extreme high flood levels & canyon submersion) */}
            {floodDepth > 5 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: isPlunging ? 0 : 1, scale: 1 }}
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono font-semibold border backdrop-blur-xl transition-all duration-300 pointer-events-auto my-1 ${
                  floodDepth >= 220
                    ? 'bg-rose-950/95 text-rose-100 border-rose-400/80 shadow-[0_0_30px_rgba(244,63,94,0.7)] animate-pulse'
                    : floodDepth >= 110
                    ? 'bg-red-950/90 text-rose-200 border-rose-500/60 shadow-[0_0_25px_rgba(244,63,94,0.5)]'
                    : floodDepth >= 45
                    ? 'bg-amber-950/80 text-amber-200 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                    : 'bg-cyan-950/70 text-cyan-200 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${
                  floodDepth >= 220 ? 'bg-rose-300 animate-ping' : floodDepth >= 110 ? 'bg-rose-400 animate-pulse' : floodDepth >= 45 ? 'bg-amber-400' : 'bg-cyan-400'
                }`} />
                <span>
                  {floodDepth >= 220
                    ? `CATASTROPHIC FLOOD SURGE: Canyon Submerged (+95mm/s • Crest: ${(floodDepth * 0.022).toFixed(1)}m / 92% Gorge Capacity)`
                    : floodDepth >= 110
                    ? `SEVERE FLOOD WARNING: Water Level Rising (+55mm/s • Crest: ${(floodDepth * 0.022).toFixed(1)}m)`
                    : floodDepth >= 45
                    ? `Canyon Runoff Alert: Water Rapidly Rising (+28mm/s • Crest: ${(floodDepth * 0.02).toFixed(1)}m)`
                    : `Canyon Floor: Flash Runoff Accumulating (+14mm/s)`}
                </span>
              </motion.div>
            )}

            {/* 6. Glowing Hero CTA Button - ALWAYS VISIBLE */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: isPlunging ? 0 : 1, scale: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="mt-3.5 sm:mt-5 pointer-events-auto z-30 flex flex-col items-center gap-1.5"
            >
              <button
                onClick={handleEnterWaterfall}
                className={`group relative flex items-center gap-2.5 px-6 sm:px-8 py-3 rounded-full text-white font-bold text-xs sm:text-sm tracking-widest uppercase border transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${
                  floodDepth >= 110
                    ? 'bg-gradient-to-r from-red-600 via-rose-600 to-purple-600 shadow-[0_0_40px_rgba(239,68,68,0.85)] border-rose-300/60 animate-pulse'
                    : floodDepth >= 45
                    ? 'bg-gradient-to-r from-amber-600 via-purple-600 to-indigo-600 shadow-[0_0_35px_rgba(245,158,11,0.7)] border-amber-300/50'
                    : 'bg-gradient-to-r from-purple-600 via-fuchsia-500 to-indigo-600 shadow-[0_0_35px_rgba(168,85,247,0.7)] border-purple-300/40'
                }`}
              >
                <span>{floodDepth >= 110 ? 'Evacuate & Launch Forecast Engine' : 'Launch Forecast Engine'}</span>
                <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            </motion.div>

            {/* 7. INTERACTIVE FLOOD WATER CONTROL DECK (User direct water interaction) */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: isPlunging ? 0 : 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5 }}
              className="mt-3 sm:mt-4 pointer-events-auto z-30 w-full max-w-xl px-2"
            >
              <div className="bg-slate-950/80 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-2.5 sm:p-3 shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_20px_rgba(6,182,212,0.15)] flex flex-col gap-2">
                {/* Top Row: Quick Interactive Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Splash Water Button */}
                    <button
                      type="button"
                      onClick={() => triggerWaterSplashFnRef.current?.(undefined, undefined, 1.35)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-[11px] font-semibold tracking-wide border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-all active:scale-95 cursor-pointer"
                      title="Click to trigger ripples, physics droplets, and splash sound"
                    >
                      <Waves size={13} className="text-cyan-200" />
                      <span>Splash Water</span>
                    </button>

                    {/* Drop Floating Log / Buoy */}
                    <button
                      type="button"
                      onClick={() => dropFloatingObjectFnRef.current?.()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-200 text-[11px] font-semibold tracking-wide border border-amber-500/40 shadow-sm transition-all active:scale-95 cursor-pointer"
                      title="Drop buoyant timber logs and rescue buoys into the flood current"
                    >
                      <span className="text-xs">🪵</span>
                      <span>Drop Float</span>
                      {floatingLogsCount > 0 && (
                        <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-500/20 text-[10px] text-amber-300 font-mono">
                          {floatingLogsCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Flood Level Quick Steppers */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = manualWaterLevel ?? (floodDepth / 240);
                        setManualWaterLevel(Math.min(1.0, Math.max(0, cur + 0.15)));
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900/80 text-rose-200 text-[11px] font-semibold border border-rose-500/40 transition-all active:scale-95 cursor-pointer"
                      title="Raise flood water level"
                    >
                      <Plus size={12} className="text-rose-400" />
                      <span>Surge</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const cur = manualWaterLevel ?? (floodDepth / 240);
                        setManualWaterLevel(Math.max(0.0, cur - 0.15));
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-[11px] font-semibold border border-slate-700 transition-all active:scale-95 cursor-pointer"
                      title="Drain flood water down"
                    >
                      <Minus size={12} className="text-slate-400" />
                      <span>Drain</span>
                    </button>

                    {manualWaterLevel !== null && (
                      <button
                        type="button"
                        onClick={() => {
                          setManualWaterLevel(null);
                          setIsFloodSurging(false);
                        }}
                        className="px-2 py-1 rounded-lg bg-purple-950/60 hover:bg-purple-900/70 text-purple-300 text-[10px] font-mono border border-purple-500/30 transition-all cursor-pointer"
                        title="Reset to automatic monsoon simulation"
                      >
                        Auto
                      </button>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Interactive Slider & Telemetry Readout */}
                <div className="flex items-center gap-3 pt-1 border-t border-cyan-500/15">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-300 whitespace-nowrap min-w-[75px]">
                    <Activity size={11} className="text-cyan-400 animate-pulse" />
                    <span>LEVEL: {(floodDepth * 0.022).toFixed(1)}m</span>
                  </div>

                  {/* Flood Level Scrubbing Slider */}
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round((manualWaterLevel !== null ? manualWaterLevel : Math.min(1.0, floodDepth / 240)) * 100)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) / 100;
                        setManualWaterLevel(val);
                      }}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline whitespace-nowrap">
                    {recentSplashCount > 0 ? `${recentSplashCount} Splashes` : 'Touch canvas to splash'}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      {/* Volumetric Fog & Spray Overlay on Waterfall Plunge */}
      <AnimatePresence>
        {isPlunging && (
          <motion.div
            key="waterfall-plunge-fog-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 1 }}
            transition={{ duration: 1.18, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[150] pointer-events-none flex flex-col items-center justify-center overflow-hidden"
          >
            {/* White & Pearlescent Cyan Volumetric Mist */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/98 via-slate-100/95 to-indigo-50/90 backdrop-blur-3xl" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0.5 }}
              animate={{ scale: 1.5, opacity: 1 }}
              transition={{ duration: 1.35, ease: 'easeOut' }}
              className="absolute -inset-24 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,1)_0%,rgba(224,231,255,0.95)_45%,rgba(168,85,247,0.45)_80%)]" 
            />

            {/* Flying Waterfall Spray Mist Particles */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.4, opacity: 0.9 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.95)_0%,rgba(186,230,253,0.7)_30%,transparent_70%)]"
            />
            
            <div className="relative z-10 flex flex-col items-center gap-3">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="w-14 h-14 rounded-full bg-purple-500/20 border border-purple-400/40 flex items-center justify-center backdrop-blur-md shadow-[0_0_30px_rgba(168,85,247,0.35)]"
              >
                <CloudRain className="w-7 h-7 text-purple-600 animate-bounce" />
              </motion.div>
              <motion.span 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="text-xs font-mono font-bold tracking-[0.3em] uppercase text-purple-950"
              >
                Entering Samvartka Atmospheric Grid...
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Status & Controls Bar (Loading Line Removed as Requested) */}
      <div className="absolute bottom-4 left-5 right-5 sm:bottom-6 sm:left-8 sm:right-8 z-30 flex items-center justify-between text-[10px] text-slate-400 tracking-wider pointer-events-auto">
        <div className="flex items-center gap-4">
          <span className="font-mono text-purple-400 font-bold">
            {currentTime.toFixed(1)}s / {TOTAL_DURATION.toFixed(1)}s
          </span>
          <span className="hidden sm:inline text-slate-400 font-medium">
            Twin Mountain Peaks • Cascading Water • Zero-Wiggle Reveal
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isMuted && (
            <button 
              onClick={toggleSound}
              className="text-purple-300 hover:text-white flex items-center gap-1.5 animate-pulse hidden md:inline-flex font-medium cursor-pointer transition-colors"
              title="Click to activate procedural ambient soundscape"
            >
              <Volume2 size={13} className="text-purple-400" />
              <span>Click to enable soundscape</span>
            </button>
          )}
          <button
            id="intro-ask-ai-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-chat-assistant'))}
            className="hover:text-white flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-blue-900/60 to-purple-900/60 hover:from-blue-800/80 hover:to-purple-800/80 border border-purple-400/40 text-purple-200 transition-all cursor-pointer font-medium active:scale-95 shadow-[0_0_15px_rgba(168,85,247,0.3)] text-xs"
            title="Open Samvartka AI Meteorological Assistant"
          >
            <Bot size={13} className="text-purple-300 animate-pulse" />
            <span>Ask AI Assistant</span>
          </button>
          <button
            onClick={handleReplay}
            className="hover:text-white flex items-center gap-1 transition-colors cursor-pointer text-slate-300 font-medium active:scale-95 text-xs ml-1"
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
