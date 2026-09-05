import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Wind,
  Gauge,
  Droplets,
  ShieldAlert,
  Sparkles,
  CheckCircle,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Compass,
  Maximize2,
  Box,
} from 'lucide-react';
import { RainfallRegime } from '../types';

export interface WeatherStage3DProps {
  timeLabel: string;
  hour: number;
  synopticPhase: string;
  stationName: string;
  rawForecastMm: number;
  aiForecastMm: number;
  detectedRegime: RainfallRegime;
  windSpeed: number;
  humidity: number;
  pressure: number;
  narrative: string;
  onToggle2D?: () => void;
}

export const WeatherStage3D: React.FC<WeatherStage3DProps> = ({
  timeLabel,
  hour,
  synopticPhase,
  stationName,
  rawForecastMm,
  aiForecastMm,
  detectedRegime,
  windSpeed,
  humidity,
  pressure,
  narrative,
  onToggle2D,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [cameraMode, setCameraMode] = useState<'perspective' | 'top' | 'station'>('perspective');

  // Animation and scene references for real-time reactivity without recreation
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Dynamic moving meshes refs
  const anemometerCupsRef = useRef<THREE.Group | null>(null);
  const radarDishRef = useRef<THREE.Group | null>(null);
  const windVaneRef = useRef<THREE.Group | null>(null);
  const rainSystemRef = useRef<THREE.Points | null>(null);
  const lightningLightRef = useRef<THREE.PointLight | null>(null);
  const lightningMeshRef = useRef<THREE.Line | null>(null);
  const treesGroupRef = useRef<THREE.Group | null>(null);
  const waterMeshRef = useRef<THREE.Mesh | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);
  const cloudsGroupRef = useRef<THREE.Group | null>(null);

  // Keep props in refs for smooth animation loop
  const propsRef = useRef({
    windSpeed,
    hour,
    aiForecastMm,
    rawForecastMm,
    detectedRegime,
    pressure,
    humidity,
  });

  useEffect(() => {
    propsRef.current = {
      windSpeed,
      hour,
      aiForecastMm,
      rawForecastMm,
      detectedRegime,
      pressure,
      humidity,
    };
  }, [windSpeed, hour, aiForecastMm, rawForecastMm, detectedRegime, pressure, humidity]);

  // Regime status helpers
  const isExtreme = detectedRegime === RainfallRegime.HEAVY_EXTREME || aiForecastMm >= 64.5;
  const isModerate = detectedRegime === RainfallRegime.MODERATE || (aiForecastMm >= 15.6 && aiForecastMm < 64.5);
  const isLight = detectedRegime === RainfallRegime.LIGHT || (aiForecastMm >= 2.5 && aiForecastMm < 15.6);
  const isDry = detectedRegime === RainfallRegime.DRY || aiForecastMm < 2.5;

  const getBeaufortDescription = (spd: number) => {
    if (spd < 12) return 'Light Breeze';
    if (spd < 20) return 'Moderate Breeze';
    if (spd < 30) return 'Fresh Breeze';
    if (spd < 40) return 'Strong Wind';
    return 'Gale Squall';
  };

  const getAdvisory = () => {
    if (isExtreme) {
      return {
        alertBadge: 'Red Warning: Torrential Deluge',
        badgeClass: 'bg-rose-600 text-white shadow-rose-900/30',
        summary: 'Massive convective cloudburst! Severe urban runoff, rapid drainage overflow, and hazardous visibility.',
        action: 'Stay indoors, keep electrical gear off ground floors, avoid underpasses, and monitor emergency civic alerts.',
        aiImpact: `Coarse NWP model capped out at only ${rawForecastMm} mm. Machine learning corrected for sub-grid convective physics to predict ${aiForecastMm} mm.`,
      };
    }
    if (isModerate) {
      return {
        alertBadge: 'Orange Advisory: Heavy Monsoon Spells',
        badgeClass: 'bg-amber-600 text-white shadow-amber-900/30',
        summary: 'Steady, persistent monsoonal rain bands with sustained squally winds across the station catchment.',
        action: 'Carry sturdy rainwear, waterproof transit covers, and allow extra travel buffer for waterlogged roads.',
        aiImpact: `AI calibrated model grid bias from ${rawForecastMm} mm to an accurate ${aiForecastMm} mm catchment accumulation.`,
      };
    }
    if (isLight) {
      return {
        alertBadge: 'Green Watch: Light Monsoon Showers',
        badgeClass: 'bg-teal-600 text-white shadow-teal-900/30',
        summary: 'Scattered intermittent drizzle and passing light shower cells beneath broken stratocumulus decks.',
        action: 'A compact folding umbrella or water-resistant light jacket is recommended for outdoor transit.',
        aiImpact: `AI fine-tuned the precipitation intensity from ${rawForecastMm} mm to an observed realistic rate of ${aiForecastMm} mm.`,
      };
    }
    return {
      alertBadge: 'Normal: Dry Break Spell',
      badgeClass: 'bg-emerald-600 text-white shadow-emerald-900/30',
      summary: 'Moisture trough shifted away from station. Sub-saturated boundary layer prevents surface rain.',
      action: 'Safe for sports, outdoor construction, civic utility maintenance, and rapid road transit.',
      aiImpact:
        rawForecastMm > 0
          ? `Zero-Rain Gate activated: Raw model predicted ${rawForecastMm} mm false drizzle, but AI recognized high evaporation and suppressed it to 0.0 mm.`
          : `Station dry conditions confirmed (${aiForecastMm} mm). Accurate verification against surface barometry.`,
    };
  };

  const advisory = getAdvisory();

  // Initialize Three.js WebGL Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 420;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x0f172a, 0.018);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 500);
    camera.position.set(24, 16, 28);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap; // Reverted to avoid deprecation warning
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // Cinematic tone mapping
    renderer.toneMappingExposure = 1.1; // Cinematic exposure
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't go below ground
    controls.minDistance = 8;
    controls.maxDistance = 65;
    controls.target.set(0, 4, 0);
    controlsRef.current = controls;

    // 5. Lighting Setup
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.8);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const sunLight = new THREE.DirectionalLight(0xffedd5, 1.2);
    sunLight.position.set(25, 40, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.camera.left = -25;
    sunLight.shadow.camera.right = 25;
    sunLight.shadow.camera.top = 25;
    sunLight.shadow.camera.bottom = -25;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Lightning Flash Light (hidden by default)
    const lightningLight = new THREE.PointLight(0xa5f3fc, 0, 100, 1.5);
    lightningLight.position.set(0, 35, 0);
    scene.add(lightningLight);
    lightningLightRef.current = lightningLight;

    // 6. Ground & Terrain Mesh
    const terrainGeo = new THREE.PlaneGeometry(80, 80, 48, 48);
    // Add subtle rolling contours
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      // Gentle slope away from the observatory
      const distFromCenter = Math.sqrt(x * x + y * y);
      const elevation = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 1.2 - (distFromCenter < 12 ? 0 : 0.8);
      posAttr.setZ(i, elevation);
    }
    terrainGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true,
    });
    const ground = new THREE.Mesh(terrainGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Distant Mountain Ridges
    const mountainGeo = new THREE.ConeGeometry(14, 18, 5);
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.9,
      flatShading: true,
    });

    const mtnPositions = [
      [-32, 7, -32],
      [-18, 9, -36],
      [4, 11, -38],
      [24, 8, -34],
      [-38, 6, -15],
    ];
    mtnPositions.forEach(([mx, my, mz], idx) => {
      const mtn = new THREE.Mesh(mountainGeo, mountainMat);
      mtn.position.set(mx, my, mz);
      mtn.scale.set(1 + (idx % 3) * 0.3, 1 + (idx % 2) * 0.4, 1 + (idx % 3) * 0.3);
      scene.add(mtn);
    });

    // 7. Water Catchment Basin / Lake (Dynamic Height)
    const waterGeo = new THREE.PlaneGeometry(28, 18, 24, 24);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(12, 0.05, 12);
    waterMesh.receiveShadow = true;
    scene.add(waterMesh);
    waterMeshRef.current = waterMesh;

    // Concrete Pad for Weather Station
    const padGeo = new THREE.BoxGeometry(16, 0.6, 14);
    const padMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(-2, 0.3, -2);
    pad.receiveShadow = true;
    pad.castShadow = true;
    scene.add(pad);

    // 8. 3D METEOROLOGICAL OBSERVATORY BUILDING
    const stationGroup = new THREE.Group();
    stationGroup.position.set(-2, 0.6, -2);

    // Main Station Block
    const buildingGeo = new THREE.BoxGeometry(9, 4.5, 7);
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.2,
    });
    const building = new THREE.Mesh(buildingGeo, buildingMat);
    building.position.y = 2.25;
    building.castShadow = true;
    building.receiveShadow = true;
    stationGroup.add(building);

    // Roof Trim
    const roofTrimGeo = new THREE.BoxGeometry(9.6, 0.4, 7.6);
    const roofTrimMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.4, metalness: 0.5 });
    const roofTrim = new THREE.Mesh(roofTrimGeo, roofTrimMat);
    roofTrim.position.y = 4.6;
    stationGroup.add(roofTrim);

    // Illuminated Windows (emitting warm light)
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    const winGeo = new THREE.PlaneGeometry(1.2, 1.4);
    for (let i = -2; i <= 2; i += 1.4) {
      const win = new THREE.Mesh(winGeo, windowMat);
      win.position.set(i, 2.5, 3.52);
      stationGroup.add(win);
    }

    // Secondary Observation Tower on Roof
    const towerGeo = new THREE.CylinderGeometry(1.8, 2.0, 3.2, 12);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(-2, 6.2, -1);
    tower.castShadow = true;
    stationGroup.add(tower);

    // 9. 3D DOPPLER RADAR RADOME
    const radomeBaseGeo = new THREE.CylinderGeometry(0.5, 0.6, 2, 8);
    const radomeBase = new THREE.Mesh(radomeBaseGeo, towerMat);
    radomeBase.position.set(2.5, 5.6, 1.5);
    stationGroup.add(radomeBase);

    const radomeSphereGeo = new THREE.SphereGeometry(1.4, 16, 16);
    const radomeSphereMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.3,
      metalness: 0.1,
      transparent: true,
      opacity: 0.92,
    });
    const radome = new THREE.Mesh(radomeSphereGeo, radomeSphereMat);
    radome.position.set(2.5, 7.6, 1.5);
    stationGroup.add(radome);

    // Interior Radar Dish that sweeps inside the radome
    const radarDishGroup = new THREE.Group();
    radarDishGroup.position.set(2.5, 7.6, 1.5);
    const dishGeo = new THREE.CylinderGeometry(0.9, 0.2, 0.2, 12);
    const dishMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7 });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.rotation.z = Math.PI / 3;
    radarDishGroup.add(dish);
    stationGroup.add(radarDishGroup);
    radarDishRef.current = radarDishGroup;

    // 10. 3D ANEMOMETER (3-CUP WIND SENSOR)
    const anemometerGroup = new THREE.Group();
    anemometerGroup.position.set(-2, 7.8, -1);

    // Steel Vertical Mast
    const mastGeo = new THREE.CylinderGeometry(0.12, 0.15, 3.5, 8);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.y = 1.75;
    mast.castShadow = true;
    anemometerGroup.add(mast);

    // Rotating Spindle & 3 Cups
    const cupsGroup = new THREE.Group();
    cupsGroup.position.y = 3.5;

    // Cross arms
    const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6);
    const arm1 = new THREE.Mesh(armGeo, mastMat);
    arm1.rotation.z = Math.PI / 2;
    cupsGroup.add(arm1);

    const arm2 = new THREE.Mesh(armGeo, mastMat);
    arm2.rotation.x = Math.PI / 2;
    cupsGroup.add(arm2);

    // 3 Hemispherical Cups
    const cupGeo = new THREE.SphereGeometry(0.3, 8, 8, 0, Math.PI);
    const cupMatRed = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.4, roughness: 0.4 });
    const cupMatSilver = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.2 });

    const cup1 = new THREE.Mesh(cupGeo, cupMatRed);
    cup1.position.set(0.8, 0, 0);
    cup1.rotation.y = Math.PI / 2;
    cupsGroup.add(cup1);

    const cup2 = new THREE.Mesh(cupGeo, cupMatSilver);
    cup2.position.set(-0.8, 0, 0);
    cup2.rotation.y = -Math.PI / 2;
    cupsGroup.add(cup2);

    const cup3 = new THREE.Mesh(cupGeo, cupMatSilver);
    cup3.position.set(0, 0, 0.8);
    cup3.rotation.x = Math.PI / 2;
    cupsGroup.add(cup3);

    anemometerGroup.add(cupsGroup);
    anemometerCupsRef.current = cupsGroup;

    // Wind Direction Vane
    const vaneGroup = new THREE.Group();
    vaneGroup.position.y = 2.4;
    const vaneArrowGeo = new THREE.ConeGeometry(0.3, 0.9, 4);
    const vaneArrowMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });
    const vaneArrow = new THREE.Mesh(vaneArrowGeo, vaneArrowMat);
    vaneArrow.rotation.x = Math.PI / 2;
    vaneArrow.position.z = 0.6;
    vaneGroup.add(vaneArrow);
    const vaneTail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.6), vaneArrowMat);
    vaneTail.position.z = -0.6;
    vaneGroup.add(vaneTail);
    anemometerGroup.add(vaneGroup);
    windVaneRef.current = vaneGroup;

    // Rain Gauge Funnel on Building
    const rainGaugeGeo = new THREE.CylinderGeometry(0.4, 0.15, 0.8, 8);
    const rainGaugeMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, metalness: 0.5 });
    const rainGauge = new THREE.Mesh(rainGaugeGeo, rainGaugeMat);
    rainGauge.position.set(3, 5.0, -2);
    stationGroup.add(rainGauge);

    scene.add(stationGroup);

    // 11. 3D TREES & VEGETATION (Natural Environment)
    const treesGroup = new THREE.Group();
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const treeFoliageMat1 = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 });
    const treeFoliageMat2 = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.7 });

    const treeCoords: [number, number, number][] = [
      [-12, 0, -8],
      [-15, 0, 4],
      [-9, 0, 10],
      [6, 0, -14],
      [14, 0, -8],
      [18, 0, 4],
      [-5, 0, 16],
    ];

    treeCoords.forEach(([tx, ty, tz], i) => {
      const tree = new THREE.Group();
      tree.position.set(tx, ty, tz);

      // Trunk
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 3.5, 6), treeTrunkMat);
      trunk.position.y = 1.75;
      trunk.castShadow = true;
      tree.add(trunk);

      // Foliage Clustered Spheres
      const folGroup = new THREE.Group();
      folGroup.position.y = 3.5;
      const fol1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6 + (i % 3) * 0.2), treeFoliageMat1);
      fol1.castShadow = true;
      folGroup.add(fol1);

      const fol2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2), treeFoliageMat2);
      fol2.position.set(0.6, 0.8, 0.4);
      fol2.castShadow = true;
      folGroup.add(fol2);

      tree.add(folGroup);
      treesGroup.add(tree);
    });

    scene.add(treesGroup);
    treesGroupRef.current = treesGroup;

    // 12. 3D VOLUMETRIC CLOUDS
    const cloudsGroup = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.9,
      transparent: true,
      opacity: 0.85,
    });

    const cloudClusterCoords = [
      [-18, 22, -10],
      [0, 24, 5],
      [18, 21, -12],
      [-8, 25, 18],
    ];

    cloudClusterCoords.forEach(([cx, cy, cz]) => {
      const cluster = new THREE.Group();
      cluster.position.set(cx, cy, cz);
      for (let j = 0; j < 6; j++) {
        const cloudPuff = new THREE.Mesh(new THREE.DodecahedronGeometry(3.5 + Math.random() * 2), cloudMat);
        cloudPuff.position.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 8);
        cluster.add(cloudPuff);
      }
      cloudsGroup.add(cluster);
    });
    scene.add(cloudsGroup);
    cloudsGroupRef.current = cloudsGroup;

    // 13. 3D RAINDROP PARTICLE SYSTEM
    const rainCount = 1800;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    const rainVelocities = new Float32Array(rainCount);

    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 60;
      rainPositions[i * 3 + 1] = Math.random() * 40;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 60;
      rainVelocities[i] = 0.6 + Math.random() * 0.8;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

    const rainMat = new THREE.PointsMaterial({
      color: 0x7dd3fc,
      size: 0.25,
      transparent: true,
      opacity: 0.75,
    });
    const rainSystem = new THREE.Points(rainGeo, rainMat);
    scene.add(rainSystem);
    rainSystemRef.current = rainSystem;

    // 14. 3D STARFIELD PARTICLES (Night Sky)
    const starCount = 600;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 90 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random());
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = Math.max(10, radius * Math.cos(phi));
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, transparent: true, opacity: 0.8 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
    starsRef.current = stars;

    // 15. 3D LIGHTNING BOLT LINE
    const lightningGeo = new THREE.BufferGeometry();
    const lightningMat = new THREE.LineBasicMaterial({ color: 0xa5f3fc, linewidth: 3 });
    const lightningMesh = new THREE.Line(lightningGeo, lightningMat);
    lightningMesh.visible = false;
    scene.add(lightningMesh);
    lightningMeshRef.current = lightningMesh;

    // RESIZE OBSERVER
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 16. ANIMATION LOOP
    let animationFrameId: number;
    let timer = new THREE.Timer();
    timer.connect(document);
    let nextLightningTime = 2.0;

    // State for smooth interpolations
    const animState = {
      windSpeed: windSpeed,
      rainMm: aiForecastMm,
      waterHeight: 0.05,
      bgColor: new THREE.Color(0x38bdf8),
      fogColor: new THREE.Color(0xbae6fd),
      hemiColor: new THREE.Color(0xffffff),
      hemiGroundColor: new THREE.Color(0x15803d),
      sunColor: new THREE.Color(0xffedd5),
      hemiIntensity: 1.1,
      sunIntensity: 1.3,
    };
    
    // Helper to get target colors based on time and weather
    const getTargetLighting = (hour: number, regime: RainfallRegime) => {
      const isNightTime = hour === 0 || hour >= 21 || hour <= 4;
      const isDawnTime = hour > 4 && hour <= 8;
      const isDuskTime = hour >= 18 && hour < 21;
      
      let tBg = 0x38bdf8, tFog = 0xbae6fd, tHemi = 0xffffff, tHemiGr = 0x15803d, tSun = 0xffedd5, tHemiInt = 1.1, tSunInt = 1.3;

      if (isNightTime) {
        tBg = 0x050814; tFog = 0x050814; tHemi = 0x1e1b4b; tHemiGr = 0x030712; tSun = 0xa5b4fc; tHemiInt = 0.35; tSunInt = 0.4;
      } else if (isDawnTime) {
        tBg = 0x312e81; tFog = 0x4338ca; tHemi = 0xfb923c; tHemiGr = 0x1e293b; tSun = 0xfde047; tHemiInt = 0.8; tSunInt = 1.0;
      } else if (isDuskTime) {
        tBg = 0x1e1b4b; tFog = 0x312e81; tHemi = 0xf43f5e; tHemiGr = 0x030712; tSun = 0xf97316; tHemiInt = 0.7; tSunInt = 0.8;
      } else {
        // Midday
        if (regime === RainfallRegime.HEAVY_EXTREME) {
          tBg = 0x0f172a; tFog = 0x0f172a; tHemi = 0x334155; tHemiGr = 0x020617; tSun = 0x94a3b8; tHemiInt = 0.5; tSunInt = 0.5;
        } else if (regime === RainfallRegime.MODERATE) {
          tBg = 0x1e293b; tFog = 0x1e293b; tHemi = 0x64748b; tHemiGr = 0x0f172a; tSun = 0xcbd5e1; tHemiInt = 0.75; tSunInt = 0.9;
        }
      }
      return { tBg, tFog, tHemi, tHemiGr, tSun, tHemiInt, tSunInt, isNightTime };
    };

    const animate = (timestamp?: number) => {
      animationFrameId = requestAnimationFrame(animate);
      timer.update(timestamp);
      const delta = Math.min(timer.getDelta(), 0.1); // cap delta to prevent large jumps
      const elapsed = timer.getElapsed();

      const { windSpeed: targetWind, hour: targetHour, aiForecastMm: targetRain, detectedRegime: targetRegime } = propsRef.current;
      
      // 1. Smooth Interpolations
      const lerpSpeed = delta * 2.5; // Controls how fast it transitions
      animState.windSpeed = THREE.MathUtils.lerp(animState.windSpeed, targetWind, lerpSpeed);
      animState.rainMm = THREE.MathUtils.lerp(animState.rainMm, targetRain, lerpSpeed);
      
      const targetWaterHeight = 0.05 + Math.min(1.8, (targetRain / 100) * 1.5);
      animState.waterHeight = THREE.MathUtils.lerp(animState.waterHeight, targetWaterHeight, lerpSpeed * 0.5); // Slower water rise

      const lighting = getTargetLighting(targetHour, targetRegime);
      animState.bgColor.lerp(new THREE.Color(lighting.tBg), lerpSpeed);
      animState.fogColor.lerp(new THREE.Color(lighting.tFog), lerpSpeed);
      animState.hemiColor.lerp(new THREE.Color(lighting.tHemi), lerpSpeed);
      animState.hemiGroundColor.lerp(new THREE.Color(lighting.tHemiGr), lerpSpeed);
      animState.sunColor.lerp(new THREE.Color(lighting.tSun), lerpSpeed);
      animState.hemiIntensity = THREE.MathUtils.lerp(animState.hemiIntensity, lighting.tHemiInt, lerpSpeed);
      animState.sunIntensity = THREE.MathUtils.lerp(animState.sunIntensity, lighting.tSunInt, lerpSpeed);

      // Apply colors & intensities
      if (scene.background instanceof THREE.Color) scene.background.copy(animState.bgColor);
      if (scene.fog instanceof THREE.FogExp2) scene.fog.color.copy(animState.fogColor);
      
      if (hemiLightRef.current) {
        hemiLightRef.current.color.copy(animState.hemiColor);
        hemiLightRef.current.groundColor.copy(animState.hemiGroundColor);
        hemiLightRef.current.intensity = animState.hemiIntensity;
      }
      if (sunLightRef.current) {
        sunLightRef.current.color.copy(animState.sunColor);
        sunLightRef.current.intensity = animState.sunIntensity;
      }
      if (starsRef.current) {
        // Fade stars based on how dark the background is becoming
        const darkness = 1 - Math.max(animState.bgColor.r, animState.bgColor.g, animState.bgColor.b);
        (starsRef.current.material as THREE.PointsMaterial).opacity = THREE.MathUtils.lerp(
           (starsRef.current.material as THREE.PointsMaterial).opacity,
           lighting.isNightTime ? darkness : 0, 
           lerpSpeed
        );
        starsRef.current.visible = (starsRef.current.material as THREE.PointsMaterial).opacity > 0.01;
      }

      // Spin anemometer cups
      if (anemometerCupsRef.current) {
        const spinRate = Math.max(0.6, animState.windSpeed * 0.18);
        anemometerCupsRef.current.rotation.y += spinRate * delta;
      }

      // Rotate radar dish inside radome
      if (radarDishRef.current) {
        radarDishRef.current.rotation.y += 2.2 * delta;
      }

      // Align wind vane with wind angle
      if (windVaneRef.current) {
        windVaneRef.current.rotation.y = Math.sin(elapsed * 0.4) * 0.25;
      }

      // Sway trees with wind
      if (treesGroupRef.current) {
        const swayAmount = Math.min(0.28, Math.max(0.04, animState.windSpeed * 0.005));
        treesGroupRef.current.children.forEach((tree, idx) => {
          tree.rotation.z = THREE.MathUtils.lerp(tree.rotation.z, Math.sin(elapsed * 2.5 + idx) * swayAmount, lerpSpeed * 2);
        });
      }

      // Drift clouds slowly based on wind
      if (cloudsGroupRef.current) {
        cloudsGroupRef.current.position.x = (elapsed * (animState.windSpeed * 0.04 + 0.4)) % 60 - 30;
      }

      // Dynamic water level
      if (waterMeshRef.current) {
        waterMeshRef.current.position.y = animState.waterHeight;
      }

      // Rain particle animation
      if (rainSystemRef.current) {
        const isRaining = animState.rainMm >= 0.5;
        rainSystemRef.current.visible = isRaining;

        if (isRaining) {
          const positions = rainSystemRef.current.geometry.attributes.position.array as Float32Array;
          const fallSpeed = Math.max(12, animState.rainMm * 0.45);
          const windDrift = (animState.windSpeed / 35) * fallSpeed * 0.35;

          for (let i = 0; i < rainCount; i++) {
            positions[i * 3 + 1] -= fallSpeed * delta;
            positions[i * 3] += windDrift * delta;

            // Reset when hitting the ground
            if (positions[i * 3 + 1] < 0) {
              positions[i * 3 + 1] = 35 + Math.random() * 5;
              positions[i * 3] = (Math.random() - 0.5) * 60;
              positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
            }
          }
          rainSystemRef.current.geometry.attributes.position.needsUpdate = true;
          // Dynamically adjust rain opacity based on intensity
          (rainSystemRef.current.material as THREE.PointsMaterial).opacity = Math.min(0.8, animState.rainMm * 0.02 + 0.1);
        }
      }

      // Extreme Convective Thunderstorm Lightning Flash System
      if (targetRegime === RainfallRegime.HEAVY_EXTREME && elapsed > nextLightningTime) {
        nextLightningTime = elapsed + 3.0 + Math.random() * 3.5;
        if (lightningLightRef.current && lightningMeshRef.current) {
          lightningLightRef.current.intensity = 4.5;
          lightningLightRef.current.position.set((Math.random() - 0.5) * 30, 25, (Math.random() - 0.5) * 30);

          // Generate branching forked lightning path
          const boltPoints: THREE.Vector3[] = [];
          let curPt = new THREE.Vector3(lightningLightRef.current.position.x, 32, lightningLightRef.current.position.z);
          boltPoints.push(curPt.clone());

          while (curPt.y > 0) {
            curPt.y -= 4 + Math.random() * 3;
            curPt.x += (Math.random() - 0.5) * 5;
            curPt.z += (Math.random() - 0.5) * 5;
            boltPoints.push(curPt.clone());
          }

          lightningMeshRef.current.geometry.setFromPoints(boltPoints);
          lightningMeshRef.current.visible = true;

          // Quick fade-out timeout
          setTimeout(() => {
            if (lightningLightRef.current) lightningLightRef.current.intensity = 0;
            if (lightningMeshRef.current) lightningMeshRef.current.visible = false;
          }, 180);
        }
      }

      // Auto-orbit camera rotation when enabled
      if (isAutoRotating && controlsRef.current) {
        controlsRef.current.autoRotate = true;
        controlsRef.current.autoRotateSpeed = 0.8;
      } else if (controlsRef.current) {
        controlsRef.current.autoRotate = false;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      timer.dispose();
      resizeObserver.disconnect();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isAutoRotating]);

  // Handle Preset Camera Angles
  const handleSetCamera = (mode: 'perspective' | 'top' | 'station') => {
    setCameraMode(mode);
    if (!cameraRef.current || !controlsRef.current) return;

    if (mode === 'perspective') {
      cameraRef.current.position.set(24, 16, 28);
      controlsRef.current.target.set(0, 4, 0);
    } else if (mode === 'top') {
      cameraRef.current.position.set(0, 48, 12);
      controlsRef.current.target.set(0, 0, 0);
    } else if (mode === 'station') {
      cameraRef.current.position.set(-6, 9, 6);
      controlsRef.current.target.set(-2, 6, -2);
    }
  };

  const handleResetCamera = () => {
    handleSetCamera('perspective');
  };

  return (
    <div id="synoptic-weather-3d-stage" className="rounded-2xl overflow-hidden border border-slate-700/80 shadow-lg bg-slate-900 text-slate-100">
      {/* 3D WebGL Canvas Container */}
      <div className="relative h-80 sm:h-96 w-full overflow-hidden select-none bg-slate-950">
        {/* Three.js Canvas Mount */}
        <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

        {/* Top-Left Station & Telemetry Pill */}
        <div className="absolute top-3 left-3 sm:left-4 z-20 flex items-center gap-2 pointer-events-none">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700/80 shadow-lg text-white flex items-center gap-2.5">
            <span className="text-lg">
              {isExtreme ? '⛈️' : isModerate ? '🌧️' : isLight ? '🌦️' : '☀️'}
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold block leading-tight text-white">
                  {stationName}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[9px] font-mono">
                  3D WebGL
                </span>
              </div>
              <span className="text-[10px] text-slate-300 font-mono flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                {timeLabel} • {synopticPhase}
              </span>
            </div>
          </div>
        </div>

        {/* Top-Right 3D Camera Controls Toolbar */}
        <div className="absolute top-3 right-3 sm:right-4 z-20 flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 text-xs shadow-md">
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-colors flex items-center gap-1 ${
              isAutoRotating
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Toggle 3D Cinematic Auto-Rotation"
          >
            <RotateCcw className={`w-3 h-3 ${isAutoRotating ? 'animate-spin' : ''}`} />
            <span>Auto-Orbit</span>
          </button>

          <div className="h-3.5 w-[1px] bg-slate-700" />

          <button
            onClick={() => handleSetCamera('perspective')}
            className={`px-2 py-1 rounded-lg text-[10px] transition-colors ${
              cameraMode === 'perspective' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="Overview 3D Perspective"
          >
            Overview
          </button>

          <button
            onClick={() => handleSetCamera('station')}
            className={`px-2 py-1 rounded-lg text-[10px] transition-colors ${
              cameraMode === 'station' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="Focus 3D Weather Station"
          >
            Observatory
          </button>

          <button
            onClick={() => handleSetCamera('top')}
            className={`px-2 py-1 rounded-lg text-[10px] transition-colors ${
              cameraMode === 'top' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="Top-Down Radar View"
          >
            Top-Down
          </button>

          <button
            onClick={handleResetCamera}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reset 3D View"
          >
            <Maximize2 className="w-3 h-3" />
          </button>

          {onToggle2D && (
            <>
              <div className="h-3.5 w-[1px] bg-slate-700 hidden sm:block" />
              <button
                onClick={onToggle2D}
                className="px-2 py-1 rounded-lg text-[10px] bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                title="Switch to 2D Illustrated Canvas"
              >
                2D View
              </button>
            </>
          )}
        </div>

        {/* Bottom-Left 3D Interaction Hint */}
        <div className="absolute bottom-3 left-3 sm:left-4 z-20 pointer-events-none hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/70 backdrop-blur-xs text-[10px] text-slate-400 border border-slate-800">
          <Box className="w-3 h-3 text-cyan-400" />
          <span>Click & drag to rotate 3D view • Scroll to zoom</span>
        </div>

        {/* Bottom-Right Live Accumulation Gauge */}
        <div className="absolute bottom-3 right-3 sm:right-4 z-20 flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/80 text-white text-xs shadow-xl">
          <Droplets className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="text-slate-300 font-medium">Accumulation:</span>
          <span className="font-bold font-mono text-cyan-300 text-sm">
            {aiForecastMm} mm
          </span>
        </div>
      </div>

      {/* Atmospheric Telemetry HUD & AI Calibration Context */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
        {/* Top Badges & Operational Advisory Header */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm flex items-center gap-1.5 ${advisory.badgeClass}`}>
              <ShieldAlert className="w-3.5 h-3.5" />
              {advisory.alertBadge}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Wind: <strong className="text-slate-200">{windSpeed} km/h</strong> ({getBeaufortDescription(windSpeed)}) • Pressure: <strong className="text-slate-200">{pressure.toFixed(1)} hPa</strong> • Moisture: <strong className="text-slate-200">{humidity}%</strong>
            </span>
          </div>

          {/* Model Comparison Pill */}
          <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1 rounded-lg border border-slate-700 text-xs font-mono">
            <span className="text-slate-400">NWP: <strong className="text-slate-200">{rawForecastMm} mm</strong></span>
            <span className="text-slate-500">→</span>
            <span className="text-cyan-400 font-bold">AI Calibrated: <strong>{aiForecastMm} mm</strong></span>
          </div>
        </div>

        {/* Dual Information Cards: Synoptic Condition vs AI Physical Correction */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
          {/* Atmospheric Condition & Safety Action */}
          <div className="md:col-span-7 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 shadow-2xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-200 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Synoptic Evolution & Public Safety
            </div>
            <p className="text-slate-300 leading-relaxed font-medium">
              {advisory.summary}
            </p>
            <p className="text-amber-300/90 leading-relaxed font-medium">
              <strong>Action:</strong> {advisory.action}
            </p>
            <p className="text-[11px] text-slate-500 mt-1 italic border-t border-slate-800/80 pt-1">
              &ldquo;{narrative}&rdquo;
            </p>
          </div>

          {/* Machine Learning Bias Calibration Explanation */}
          <div className="md:col-span-5 bg-gradient-to-br from-blue-950/60 to-slate-950/80 p-3.5 rounded-xl border border-blue-900/60 shadow-2xs space-y-2 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-cyan-300 text-xs">
                <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
                Physical Model Bias Correction
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {advisory.aiImpact}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-blue-900/40 text-[11px] font-mono">
              <span className="text-slate-400">Regime: <strong className="text-slate-200">{detectedRegime}</strong></span>
              <span className="px-2 py-0.5 rounded bg-blue-950 text-cyan-300 border border-blue-800 text-[10px]">
                {aiForecastMm > rawForecastMm
                  ? `+${(aiForecastMm - rawForecastMm).toFixed(1)} mm Boost`
                  : aiForecastMm < rawForecastMm
                  ? `${(aiForecastMm - rawForecastMm).toFixed(1)} mm Suppressed`
                  : 'Calibrated'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
