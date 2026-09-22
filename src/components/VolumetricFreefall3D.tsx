import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface VolumetricFreefall3DProps {
  className?: string;
}

export const VolumetricFreefall3D: React.FC<VolumetricFreefall3DProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Layered Atmospheric Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdbeafe); // Soft sky cyan
    scene.fog = new THREE.FogExp2(0xf0fdf4, 0.009); // Gentle fog for great visual depth

    // 2. Camera Setup (Pointed downward into the cloud abyss)
    const camera = new THREE.PerspectiveCamera(72, width / height, 0.1, 1400);
    camera.position.set(0, 100, 0);
    camera.rotation.x = -Math.PI / 2; // Looking straight down

    // 3. WebGL Renderer with High Dynamic Range Tone Mapping
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
      container.appendChild(renderer.domElement);
    } catch (e) {
      console.warn("WebGL initialization skipped in VolumetricFreefall3D:", e);
      return;
    }

    // 4. Atmospheric Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xc4b5fd, 1.6);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffae0, 2.5);
    sunLight.position.set(30, 120, 40);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0xe0e7ff, 0.85);
    scene.add(ambientLight);

    // Soft Procedural Radial Texture for Mist & Billboard Cloud Puffs
    const createCloudTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(0.35, 'rgba(240, 249, 255, 0.7)');
      grad.addColorStop(0.7, 'rgba(224, 231, 255, 0.25)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(64, 64, 60, 0, Math.PI * 2);
      ctx.fill();
      return new THREE.CanvasTexture(canvas);
    };

    const cloudTexture = createCloudTexture();

    // 5. Procedural 3D Volumetric Cumulus Clouds Group
    const cloudClusterGroup = new THREE.Group();
    scene.add(cloudClusterGroup);

    const cloudGeom = new THREE.IcosahedronGeometry(1.2, 2);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.05,
      transparent: true,
      opacity: 0.88,
      flatShading: true,
    });

    const CLUSTER_COUNT = 48;
    const cloudClusters: {
      group: THREE.Group;
      speed: number;
      rotSpeed: number;
      driftX: number;
      driftZ: number;
    }[] = [];

    for (let i = 0; i < CLUSTER_COUNT; i++) {
      const cluster = new THREE.Group();
      const puffCount = 8 + Math.floor(Math.random() * 10);
      const clusterRadius = 9 + Math.random() * 14;

      for (let p = 0; p < puffCount; p++) {
        const mesh = new THREE.Mesh(cloudGeom, cloudMat);
        const s = 3.5 + Math.random() * 6.0;
        mesh.scale.set(s, s * (0.65 + Math.random() * 0.4), s);
        mesh.position.set(
          (Math.random() - 0.5) * clusterRadius,
          (Math.random() - 0.5) * (clusterRadius * 0.4),
          (Math.random() - 0.5) * clusterRadius
        );
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        cluster.add(mesh);
      }

      // Arrange in a cylindrical canyon tunnel with open center for descent view
      const angle = Math.random() * Math.PI * 2;
      const dist = 12 + Math.random() * 52;
      const cx = Math.cos(angle) * dist;
      const cz = Math.sin(angle) * dist;
      const cy = -260 + (i / CLUSTER_COUNT) * 400;

      cluster.position.set(cx, cy, cz);
      cloudClusterGroup.add(cluster);

      // Paced, graceful ascent speed so clouds are clearly visible
      cloudClusters.push({
        group: cluster,
        speed: 0.85 + Math.random() * 0.75, // Slowed down from 2.4-5.2 to 0.85-1.6
        rotSpeed: (Math.random() - 0.5) * 0.003,
        driftX: (Math.random() - 0.5) * 0.01,
        driftZ: (Math.random() - 0.5) * 0.01,
      });
    }

    // 6. Billboard Wispy Fog Billows
    const billboardMat = new THREE.SpriteMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      color: 0xffffff,
    });

    const SPRITE_COUNT = 36;
    const fogSprites: { sprite: THREE.Sprite; speed: number }[] = [];
    for (let s = 0; s < SPRITE_COUNT; s++) {
      const sprite = new THREE.Sprite(billboardMat);
      const scale = 30 + Math.random() * 45;
      sprite.scale.set(scale, scale, 1);
      const angle = Math.random() * Math.PI * 2;
      const dist = 6 + Math.random() * 38;
      sprite.position.set(
        Math.cos(angle) * dist,
        -200 + Math.random() * 350,
        Math.sin(angle) * dist
      );
      scene.add(sprite);
      fogSprites.push({ sprite, speed: 1.1 + Math.random() * 0.9 });
    }

    // 7. Visible Aerodynamic Wind Streaks (Paced, elegant slipstream)
    const SPEED_LINE_COUNT = 700;
    const speedLineGeo = new THREE.BufferGeometry();
    const speedLinePositions = new Float32Array(SPEED_LINE_COUNT * 3);
    const speedLineSpeeds = new Float32Array(SPEED_LINE_COUNT);

    for (let i = 0; i < SPEED_LINE_COUNT; i++) {
      speedLinePositions[i * 3] = (Math.random() - 0.5) * 85;
      speedLinePositions[i * 3 + 1] = -180 + Math.random() * 360;
      speedLinePositions[i * 3 + 2] = (Math.random() - 0.5) * 85;
      speedLineSpeeds[i] = 1.6 + Math.random() * 1.8; // Gentle upward speed
    }

    speedLineGeo.setAttribute('position', new THREE.BufferAttribute(speedLinePositions, 3));
    const speedLineMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.9,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const speedPoints = new THREE.Points(speedLineGeo, speedLineMat);
    scene.add(speedPoints);

    // 8. Condensation Vapor Ring Shockwaves (Slow expanding rings)
    const ringGeo = new THREE.TorusGeometry(15, 0.4, 8, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
    const shockwaves: { mesh: THREE.Mesh; speed: number }[] = [];
    for (let r = 0; r < 5; r++) {
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -120 + r * 50;
      scene.add(ring);
      shockwaves.push({ mesh: ring, speed: 1.3 + r * 0.25 });
    }

    let animId: number;
    const clock = new THREE.Clock();

    const render = () => {
      animId = requestAnimationFrame(render);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Gentle camera turbulence and aerodynamic drift
      camera.rotation.z = Math.sin(elapsed * 4) * 0.015;
      camera.position.x = Math.sin(elapsed * 2.5) * 0.4;
      camera.position.z = Math.cos(elapsed * 2.2) * 0.4;

      // Animate 3D Volumetric Cloud Clusters (Paced, clearly visible)
      cloudClusters.forEach((c) => {
        c.group.position.y += c.speed * (delta * 60);
        c.group.rotation.y += c.rotSpeed;
        c.group.position.x += c.driftX;
        c.group.position.z += c.driftZ;

        if (c.group.position.y > 140) {
          c.group.position.y = -220;
          const angle = Math.random() * Math.PI * 2;
          const dist = 12 + Math.random() * 52;
          c.group.position.x = Math.cos(angle) * dist;
          c.group.position.z = Math.sin(angle) * dist;
        }
      });

      // Animate Wispy Fog Sprites
      fogSprites.forEach((f) => {
        f.sprite.position.y += f.speed * (delta * 60);
        if (f.sprite.position.y > 140) {
          f.sprite.position.y = -190;
          const angle = Math.random() * Math.PI * 2;
          const dist = 6 + Math.random() * 38;
          f.sprite.position.x = Math.cos(angle) * dist;
          f.sprite.position.z = Math.sin(angle) * dist;
        }
      });

      // Animate Speed Slipstream Particles
      const pos = speedLineGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < SPEED_LINE_COUNT; i++) {
        let y = pos.getY(i) + speedLineSpeeds[i] * (delta * 60);
        if (y > 140) {
          y = -160;
          pos.setX(i, (Math.random() - 0.5) * 85);
          pos.setZ(i, (Math.random() - 0.5) * 85);
        }
        pos.setY(i, y);
      }
      pos.needsUpdate = true;

      // Animate Vapor Rings Expanding Gracefully
      shockwaves.forEach((sw) => {
        sw.mesh.position.y += sw.speed * (delta * 60);
        const norm = (sw.mesh.position.y - (-120)) / 260;
        const scale = 0.5 + norm * 2.2;
        sw.mesh.scale.set(scale, scale, scale);
        (sw.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.55 * (1 - norm * norm));

        if (sw.mesh.position.y > 140) {
          sw.mesh.position.y = -120;
        }
      });

      renderer.render(scene, camera);
    };

    render();

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || window.innerWidth;
      const newH = container.clientHeight || window.innerHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      cloudTexture.dispose();
      cloudMat.dispose();
      cloudGeom.dispose();
      billboardMat.dispose();
      speedLineMat.dispose();
      speedLineGeo.dispose();
      ringMat.dispose();
      ringGeo.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      scene.clear();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`absolute inset-0 w-full h-full pointer-events-none overflow-hidden ${className}`} 
    />
  );
};
