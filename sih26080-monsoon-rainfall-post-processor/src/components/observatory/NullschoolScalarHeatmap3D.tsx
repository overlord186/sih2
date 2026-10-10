import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { NullschoolOverlay, NullschoolHeight, NullschoolMode, NULLSCHOOL_SCALES } from './nullschoolTypes';
import { NullschoolPhysicsEngine } from '../../services/nullschoolPhysicsEngine';

interface NullschoolScalarHeatmap3DProps {
  overlay: NullschoolOverlay;
  height: NullschoolHeight;
  mode: NullschoolMode;
  radius?: number;
  opacity?: number;
}

export const NullschoolScalarHeatmap3D: React.FC<NullschoolScalarHeatmap3DProps> = ({
  overlay,
  height,
  mode,
  radius = 2.005,
  opacity = 0.55,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  // Generate scalar texture on offscreen canvas
  const canvas = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas');
    c.width = 360;
    c.height = 180;
    return c;
  }, []);

  useEffect(() => {
    if (!canvas || overlay === 'None') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const heightPx = canvas.height;
    const imgData = ctx.createImageData(width, heightPx);
    const data = imgData.data;

    const scale = NULLSCHOOL_SCALES[overlay] || NULLSCHOOL_SCALES.Wind;
    const range = Math.max(1, scale.max - scale.min);

    // Color ramp mapping helper: [0, 1] normalized -> RGB
    const getColorForRatio = (ratio: number, ov: NullschoolOverlay): [number, number, number, number] => {
      const r = Math.max(0, Math.min(1, ratio));

      if (ov === 'Wind') {
        // Blue -> Cyan -> Green -> Yellow -> Red -> Magenta -> White
        if (r < 0.2) return [0, Math.floor(r * 5 * 200), 255, 140];
        if (r < 0.4) return [0, 255, Math.floor((1 - (r - 0.2) * 5) * 255), 160];
        if (r < 0.6) return [Math.floor((r - 0.4) * 5 * 255), 255, 0, 180];
        if (r < 0.8) return [255, Math.floor((1 - (r - 0.6) * 5) * 200), 0, 200];
        return [255, Math.floor((r - 0.8) * 5 * 255), Math.floor((r - 0.8) * 5 * 255), 220];
      }

      if (ov === 'Temp') {
        // Deep purple (-50°C) -> Blue (0°C) -> Green (15°C) -> Yellow (25°C) -> Red (40°C+)
        if (r < 0.25) return [Math.floor(r * 4 * 100), 0, Math.floor(150 + r * 4 * 105), 150];
        if (r < 0.5) return [0, Math.floor((r - 0.25) * 4 * 220), 255, 160];
        if (r < 0.75) return [Math.floor((r - 0.5) * 4 * 255), 255, Math.floor((1 - (r - 0.5) * 4) * 255), 180];
        return [255, Math.floor((1 - (r - 0.75) * 4) * 200), 0, 200];
      }

      if (ov === 'CAPE') {
        // Dark blue -> Teal -> Green -> Yellow -> Red -> Purple (Extreme Deluge)
        if (r < 0.2) return [0, 20, Math.floor(100 + r * 5 * 155), 100];
        if (r < 0.4) return [0, Math.floor((r - 0.2) * 5 * 220), 200, 150];
        if (r < 0.7) return [Math.floor((r - 0.4) * 3.33 * 255), 255, 0, 190];
        return [255, 0, Math.floor((r - 0.7) * 3.33 * 255), 220];
      }

      if (ov === 'RH' || ov === 'TPW') {
        // Brown/Tan (Dry) -> Pale Teal -> Blue -> Deep Violet (Saturated Moisture)
        if (r < 0.3) return [Math.floor(120 + r * 3.3 * 80), Math.floor(80 + r * 3.3 * 80), 30, 120];
        if (r < 0.6) return [Math.floor(50 + (1 - r) * 100), Math.floor(150 + r * 100), 200, 160];
        return [Math.floor((r - 0.6) * 2.5 * 150), 0, 255, 200];
      }

      // Default smooth viridis style
      return [
        Math.floor(255 * Math.sin(r * Math.PI)),
        Math.floor(255 * Math.sin((r + 0.33) * Math.PI)),
        Math.floor(255 * Math.sin((r + 0.66) * Math.PI)),
        160,
      ];
    };

    // Fill grid by sampling physics engine
    for (let y = 0; y < heightPx; y++) {
      const lat = 90 - (y / heightPx) * 180;
      for (let x = 0; x < width; x++) {
        const lon = (x / width) * 360 - 180;
        const probe = NullschoolPhysicsEngine.samplePointProbe(lat, lon, height, overlay, 0);

        let val = typeof probe.overlayValue === 'number' ? probe.overlayValue : 0;
        const ratio = (val - scale.min) / range;
        const [r, g, b, a] = getColorForRatio(ratio, overlay);

        const idx = (y * width + x) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = a;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  }, [canvas, overlay, height, mode]);

  const texture = useMemo(() => {
    if (!canvas) return null;
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    textureRef.current = tex;
    return tex;
  }, [canvas]);

  if (overlay === 'None' || !texture) return null;

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[radius, 64, 32]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
};
