import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as THREE from 'three';

interface CinematicIntroProps {
  onComplete: () => void;
}

// Utility to generate particle target positions from text using a hidden 2D canvas
const getTextPoints = (text: string, count: number): Float32Array => {
  const canvas = document.createElement('canvas');
  const w = 1200;
  const h = 600;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return new Float32Array(count * 3);

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, w, h);
  
  ctx.fillStyle = 'white';
  ctx.font = 'bold 110px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    ctx.fillText(line, w / 2, h / 2 + (i - (lines.length - 1)/2) * 120);
  });
  
  const imgData = ctx.getImageData(0, 0, w, h).data;
  const points: number[] = [];
  
  for (let y = 0; y < h; y += 4) {
    for (let x = 0; x < w; x += 4) {
      const idx = (y * w + x) * 4;
      if (imgData[idx] > 128) { // If pixel is bright enough
        points.push((x - w / 2) * 1.5);
        points.push(-(y - h / 2) * 1.5);
        points.push(0);
      }
    }
  }
  
  const target = new Float32Array(count * 3);
  if (points.length === 0) return target;
  
  const pointsCount = points.length / 3;
  for (let i = 0; i < count; i++) {
    const pIdx = (i % pointsCount) * 3;
    // Add volume and slight scatter to the text shape
    target[i * 3] = points[pIdx] + (Math.random() - 0.5) * 6;
    target[i * 3 + 1] = points[pIdx + 1] + (Math.random() - 0.5) * 6;
    target[i * 3 + 2] = points[pIdx + 2] + (Math.random() - 0.5) * 15;
  }
  
  return target;
};

export function CinematicIntro({ onComplete }: CinematicIntroProps) {
  const [step, setStep] = useState(0);
  const mountRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef(0); // For animation loop tracking
  const targetRef = useRef<{ t1: Float32Array, t2: Float32Array } | null>(null);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    // 1. Text Sequence Timers
    const timers = [
      setTimeout(() => setStep(1), 1000), // Form "THE MONSOON"
      setTimeout(() => setStep(2), 5000), // Shatter & form "A DELICATE BALANCE"
      setTimeout(() => setStep(3), 8500), // Shatter back to chaotic storm
      setTimeout(() => onComplete(), 9500), // Complete intro
    ];

    // 2. Three.js Setup
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.0012);

    const camera = new THREE.PerspectiveCamera(75, width / height, 1, 3000);
    camera.position.z = 800; // slightly closer

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // 3. Create GPU-Optimized Particle System
    const particleCount = 20000;
    
    // Generate text target buffers offline
    targetRef.current = {
      t1: getTextPoints("THE MONSOON", particleCount),
      t2: getTextPoints("A DELICATE\nBALANCE", particleCount)
    };

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const targetPositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorObj = new THREE.Color();

    for (let i = 0; i < particleCount; i++) {
      // Chaotic positions
      positions[i * 3] = (Math.random() - 0.5) * 3000;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 3000;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 3000;

      // Start targets off as chaotic
      targetPositions[i * 3] = positions[i * 3];
      targetPositions[i * 3 + 1] = positions[i * 3 + 1];
      targetPositions[i * 3 + 2] = positions[i * 3 + 2];

      const randColor = Math.random();
      if (randColor < 0.3) colorObj.setHex(0x7c3aed); 
      else if (randColor < 0.6) colorObj.setHex(0x06b6d4); 
      else if (randColor < 0.9) colorObj.setHex(0x2563eb); 
      else colorObj.setHex(0xf8fafc); 
      
      colors[i * 3] = colorObj.r;
      colors[i * 3 + 1] = colorObj.g;
      colors[i * 3 + 2] = colorObj.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('targetPosition', new THREE.BufferAttribute(targetPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Custom Shader Material for GPU morphing
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0.0 }, // 0 = chaotic storm, 1 = structured text
      },
      vertexShader: `
        attribute vec3 targetPosition;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float uTime;
        uniform float uProgress;

        void main() {
          vColor = color;
          
          // Continuous chaotic flying motion
          vec3 chaoticPos = position;
          chaoticPos.z += mod(uTime * 1200.0 + position.x * 50.0, 3000.0);
          if (chaoticPos.z > 1000.0) {
            chaoticPos.z -= 3000.0; // Loop back
          }
          
          // Structured text motion (slight floating and breathing)
          vec3 structuredPos = targetPosition;
          structuredPos.x += sin(uTime * 1.5 + targetPosition.y * 0.02) * 5.0;
          structuredPos.y += cos(uTime * 1.5 + targetPosition.x * 0.02) * 5.0;
          structuredPos.z += sin(uTime * 2.0 + targetPosition.x * 0.05) * 10.0;
          
          // Morph between chaotic storm and text
          vec3 finalPos = mix(chaoticPos, structuredPos, uProgress);
          
          vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
          
          // Size attenuation - text is slightly tighter
          gl_PointSize = mix(3.5, 2.5, uProgress) * (1000.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform float uProgress;
        
        void main() {
          // Circular particle shape with soft edge glow
          vec2 xy = gl_PointCoord.xy - vec2(0.5);
          float ll = length(xy);
          if (ll > 0.5) discard;
          
          float alpha = (0.5 - ll) * 2.0;
          float opacity = mix(0.5, 0.9, uProgress); // Text is brighter
          gl_FragColor = vec4(vColor, alpha * opacity);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // 4. Mouse Parallax Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    const onDocumentMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX - windowHalfX);
      mouseY = (event.clientY - windowHalfY);
    };
    document.addEventListener('mousemove', onDocumentMouseMove);

    // 5. Animation Loop
    let animationFrameId: number;
    const timer = new THREE.Timer();
    let currentPhase = 0;
    let transitionTimer = 0;
    const transitionDuration = 2.5; // seconds

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      timer.update();
      const time = timer.getElapsed();
      const delta = timer.getDelta();
      
      material.uniforms.uTime.value = time;

      // Detect phase changes to trigger particle shattering
      if (currentPhase !== stepRef.current) {
        currentPhase = stepRef.current;
        transitionTimer = 0; // Reset easing timer
        if (currentPhase === 1 && targetRef.current) {
          geometry.attributes.targetPosition.array.set(targetRef.current.t1);
          geometry.attributes.targetPosition.needsUpdate = true;
          material.uniforms.uProgress.value = 0; // Shatter
        } else if (currentPhase === 2 && targetRef.current) {
          geometry.attributes.targetPosition.array.set(targetRef.current.t2);
          geometry.attributes.targetPosition.needsUpdate = true;
          material.uniforms.uProgress.value = 0; // Shatter
        } else if (currentPhase === 3) {
          material.uniforms.uProgress.value = 1.0; 
        }
      }

      // Smoothly interpolate progress using cubic-bezier easing
      if (currentPhase === 1 || currentPhase === 2) {
        transitionTimer = Math.min(transitionTimer + delta, transitionDuration);
        const t = transitionTimer / transitionDuration;
        
        // Cubic Ease-Out for a fast snap that settles perfectly smoothly
        const easeOutCubic = 1 - Math.pow(1 - t, 3);
        
        material.uniforms.uProgress.value = easeOutCubic;
      } else if (currentPhase === 3) {
        // Fade back to chaotic storm
        transitionTimer = Math.min(transitionTimer + delta, 1.5);
        const t = transitionTimer / 1.5;
        const easeInCubic = t * t * t;
        material.uniforms.uProgress.value = 1.0 - easeInCubic;
      } else {
        material.uniforms.uProgress.value = 0;
      }

      // Smooth mouse follow parallax
      targetX = mouseX * 0.001;
      targetY = mouseY * 0.001;
      particles.rotation.y += 0.02 * (targetX - particles.rotation.y);
      particles.rotation.x += 0.02 * (targetY - particles.rotation.x);

      renderer.render(scene, camera);
    };
    animate();

    // 6. Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(animationFrameId);
      timer.dispose();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousemove', onDocumentMouseMove);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 overflow-hidden font-sans">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-auto" />
      
      {/* HTML Subtitle Overlay (Appears after text morphs) */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none mt-40">
        <AnimatePresence mode="wait">
          {step === 2 && (
             <motion.div
               key="subtitle"
               initial={{ opacity: 0, y: 15, filter: 'blur(10px)' }}
               animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
               exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
               transition={{ delay: 1.5, duration: 2 }} // Wait for particles to form
               className="text-cyan-400 tracking-[0.4em] uppercase text-xs md:text-sm font-semibold drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]"
             >
               Decoded with Artificial Intelligence
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Skip Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        onClick={onComplete}
        className="absolute bottom-8 right-8 z-20 text-slate-400 hover:text-white tracking-widest uppercase text-xs font-semibold transition-colors flex items-center gap-2 group cursor-pointer"
      >
        Skip Intro
        <span className="group-hover:translate-x-1 transition-transform">→</span>
      </motion.button>
    </div>
  );
}

