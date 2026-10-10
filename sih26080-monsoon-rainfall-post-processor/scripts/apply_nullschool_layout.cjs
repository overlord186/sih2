const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'GlobeSandbox3DSimulator.tsx');
const content = fs.readFileSync(filePath, 'utf8');

// Find boundary 1: start of return (
const returnIndex = content.indexOf('  return (\r\n    <div \r\n      id="globe-simulator"');
const returnIndexUnix = content.indexOf('  return (\n    <div \n      id="globe-simulator"');
const actualReturnIndex = returnIndex !== -1 ? returnIndex : returnIndexUnix;

if (actualReturnIndex === -1) {
  console.error("Could not find start of return statement!");
  process.exit(1);
}

// Find boundary 2: Canvas start
const canvasNeedle = '<WebGLErrorBoundary>\r\n              <Canvas camera={{ position: [0, 0, 7.2], fov: 45, far: 2000 }}>';
const canvasNeedleUnix = '<WebGLErrorBoundary>\n              <Canvas camera={{ position: [0, 0, 7.2], fov: 45, far: 2000 }}>';
let canvasIndex = content.indexOf(canvasNeedle);
let isCrlf = true;
if (canvasIndex === -1) {
  canvasIndex = content.indexOf(canvasNeedleUnix);
  isCrlf = false;
}
if (canvasIndex === -1) {
  console.error("Could not find Canvas start!");
  process.exit(1);
}

// Find boundary 3: EarthNullschoolHUD closing tag
const hudCloseNeedle = 'isUtcTime={nullschoolIsUtcTime}\r\n              onToggleUtc={() => setNullschoolIsUtcTime(!nullschoolIsUtcTime)}\r\n            />';
const hudCloseNeedleUnix = 'isUtcTime={nullschoolIsUtcTime}\n              onToggleUtc={() => setNullschoolIsUtcTime(!nullschoolIsUtcTime)}\n            />';
let hudCloseIndex = content.indexOf(hudCloseNeedle);
let hudCloseLength = hudCloseNeedle.length;
if (hudCloseIndex === -1) {
  hudCloseIndex = content.indexOf(hudCloseNeedleUnix);
  hudCloseLength = hudCloseNeedleUnix.length;
}
if (hudCloseIndex === -1) {
  console.error("Could not find EarthNullschoolHUD closing tag!");
  process.exit(1);
}
const afterHudCloseIndex = hudCloseIndex + hudCloseLength;

// Find boundary 4: End of grid right sidebar, before {/* Floating Satellite Telemetry HUD Badge */}
const satelliteBadgeNeedle = '{/* Floating Satellite Telemetry HUD Badge */}';
const satelliteBadgeIndex = content.indexOf(satelliteBadgeNeedle, afterHudCloseIndex);
if (satelliteBadgeIndex === -1) {
  console.error("Could not find Satellite Telemetry Badge!");
  process.exit(1);
}

console.log("Boundary 1 (return):", actualReturnIndex);
console.log("Boundary 2 (canvas start):", canvasIndex);
console.log("Boundary 3 (hud close):", afterHudCloseIndex);
console.log("Boundary 4 (satellite badge):", satelliteBadgeIndex);

// Backup original
fs.writeFileSync(filePath + '.bak', content, 'utf8');

// Replacement 1: From `id="globe-simulator"` up to `<WebGLErrorBoundary>`
const replacement1 = `  return (
    <div 
      id="globe-simulator"
      className="w-full h-[calc(100vh-75px)] min-h-[700px] relative overflow-hidden bg-slate-950 flex flex-col font-sans select-none border border-slate-800 rounded-2xl shadow-2xl"
    >
      {/* Sleek Top Brand Bar (Earth Nullschool Style) */}
      <div className="h-10 px-4 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-sky-600 flex items-center justify-center shadow-sm">
            <GlobeIcon className="w-3.5 h-3.5 text-white animate-spin-slow" />
          </div>
          <span className="text-xs font-black tracking-widest text-slate-100 uppercase">
            EARTH <span className="text-emerald-400 font-mono font-normal text-[11px]">OBSERVATORY</span>
          </span>
          <span className="text-[10px] font-mono text-slate-400 border border-slate-800 bg-slate-900/80 px-2 py-0.5 rounded-full hidden sm:inline-block">
            NULLSCHOOL CORE v5.0 • 14K PARTICLES
          </span>
          <ExploreBeacon id="globe-simulator" size="sm" />
        </div>
        
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-slate-400 text-[11px] hidden md:inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span className="text-slate-300 font-semibold">{LIVE_GLOBAL_STATIONS.length} Observatories Active</span>
          </span>
          <button
            onClick={() => setIsSoundMuted(!isSoundMuted)}
            className={\`p-1.5 rounded-lg border transition-colors cursor-pointer \${
              isSoundMuted ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
            }\`}
            title={isSoundMuted ? 'Unmute Audio' : 'Mute Atmospheric Audio'}
          >
            {isSoundMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 100% Full-Viewport 3D Globe Stage */}
      <div className="relative w-full flex-1 overflow-hidden bg-slate-950">
        <WebGLErrorBoundary>
          <Canvas camera={{ position: [0, 0, 7.2], fov: 45, far: 2000 }} className="w-full h-full">`;

// Replacement 2: From after `<EarthNullschoolHUD ... />` up to satellite badge
const replacement2 = `

        {/* Top-Right Floating Tactical Deck (Glass Capsule) */}
        <FloatingTacticalDeck
          selectedDisaster={selectedDisaster}
          onSelectDisaster={(d) => {
            setSelectedDisaster(d);
            handleTriggerDisaster();
          }}
          onTriggerBurst={handleTriggerDisaster}
          climateScenario={climateScenario}
          onSelectClimateScenario={(sc) => setClimateScenario(sc)}
          enableCycloneHunter={enableCycloneHunter}
          onToggleCycloneHunter={() => setEnableCycloneHunter(!enableCycloneHunter)}
          onDropSonde={handleDeployDropsonde}
          enableDopplerRadar={enableDopplerRadar}
          onToggleDopplerRadar={() => setEnableDopplerRadar(!enableDopplerRadar)}
          enableSatellites={enableSatellites}
          onToggleSatellites={() => setEnableSatellites(!enableSatellites)}
          enableLandscapeInteraction={enableLandscapeInteraction}
          onToggleLandscapeInteraction={() => setEnableLandscapeInteraction(!enableLandscapeInteraction)}
          showClouds={showClouds}
          onToggleClouds={() => setShowClouds(!showClouds)}
          showBorders={showBorders}
          onToggleBorders={() => setShowBorders(!showBorders)}
          viewMode={viewMode}
          onChangeViewMode={(vm) => setViewMode(vm)}
          perspectiveMode={perspectiveState.mode}
          onChangePerspective={(mode) => {
            if (mode === 'GLOBAL') {
              handleTriggerPerspectiveChange('GLOBAL', 25, 120, 7.2);
            } else if (mode === 'REGIONAL') {
              handleTriggerPerspectiveChange('REGIONAL', 22, 100, 4.4, { lat: 18.5, lon: 73.8 });
            } else {
              handleTriggerPerspectiveChange('STORM_TRACKING', 24, 92, 3.8, { lat: 16.5, lon: 88.5 });
            }
          }}
          onOpenTelemetryDrawer={() => setShowTelemetryDrawer((prev) => !prev)}
          isTelemetryDrawerOpen={showTelemetryDrawer}
        />

        {/* Optional Floating 3D Landscape Interaction HUD */}
        {enableLandscapeInteraction && (
          <div className="absolute top-16 left-4 z-30 max-w-sm pointer-events-auto">
            <LandscapeInteractionHUD
              activeBarrierId={activeLandscapeBarrierId}
              activeRegimeId={activeLandscapeRegimeId}
              onChangeBarrier={(id) => {
                setActiveLandscapeBarrierId(id);
                const barrier = MOUNTAIN_BARRIERS.find((b) => b.id === id);
                if (barrier) {
                  setCameraPitch(barrier.cameraFocus.pitch);
                  setCameraYaw(barrier.cameraFocus.yaw);
                  setCameraDistance(barrier.cameraFocus.distance);
                  setPerspectiveTrackingCoord({ lat: barrier.cameraFocus.lat, lon: barrier.cameraFocus.lon });
                  setActiveFocusPreset('CUSTOM');
                }
              }}
              onChangeRegime={(id) => setActiveLandscapeRegimeId(id)}
              showRidgeElevation={showLandscapeRidges}
              showLiftStreamlines={showLandscapeStreamlines}
              showRainCurtains={showLandscapeRainCurtains}
              showRainShadowSwath={showLandscapeRainShadow}
              showStationPins={showLandscapeStationPins}
              onToggleLayer={(layerKey) => {
                if (layerKey === 'ridges') setShowLandscapeRidges((prev) => !prev);
                if (layerKey === 'streamlines') setShowLandscapeStreamlines((prev) => !prev);
                if (layerKey === 'curtains') setShowLandscapeRainCurtains((prev) => !prev);
                if (layerKey === 'shadow') setShowLandscapeRainShadow((prev) => !prev);
                if (layerKey === 'pins') setShowLandscapeStationPins((prev) => !prev);
              }}
              onFlyToBarrier={(barrier) => {
                setCameraPitch(barrier.cameraFocus.pitch);
                setCameraYaw(barrier.cameraFocus.yaw);
                setCameraDistance(barrier.cameraFocus.distance);
                setPerspectiveTrackingCoord({ lat: barrier.cameraFocus.lat, lon: barrier.cameraFocus.lon });
                setActiveFocusPreset('CUSTOM');
                if (!isSoundMuted) weatherSynth.playRadarScanPing();
              }}
            />
          </div>
        )}

        {/* Slide-Over Telemetry & Missions Drawer */}
        <SlideOverTelemetryDrawer
          isOpen={showTelemetryDrawer}
          onClose={() => setShowTelemetryDrawer(false)}
          climateScenario={climateScenario}
          derivedMetrics={derivedMetrics}
          onOpenGroundSim={(stationId) => {
            const st = MET_STATIONS.find((s) => s.id === stationId);
            if (st) {
              setCameraPitch(25);
              setCameraYaw(((st.lon + 180) % 360));
              setCameraDistance(3.2);
              setPerspectiveTrackingCoord({ lat: st.lat, lon: st.lon });
              setActiveFocusPreset('CUSTOM');
            }
          }}
          onOpenCrisisModal={() => {
            setShowCrisisModal(true);
            if (!isSoundMuted) weatherSynth.playCrisisAlertTone();
          }}
          perspectiveState={perspectiveState}
          onChangePerspectiveState={setPerspectiveState}
          onTriggerPerspectiveChange={handleTriggerPerspectiveChange}
        />
      </div>\n\n      `;

// Piece together the new content
const part1 = content.substring(0, actualReturnIndex);
const canvasOpening = isCrlf 
  ? '<WebGLErrorBoundary>\r\n              <Canvas camera={{ position: [0, 0, 7.2], fov: 45, far: 2000 }}>' 
  : '<WebGLErrorBoundary>\n              <Canvas camera={{ position: [0, 0, 7.2], fov: 45, far: 2000 }}>';

const part2 = content.substring(canvasIndex + canvasOpening.length, afterHudCloseIndex);
const part3 = content.substring(satelliteBadgeIndex);

const newContent = part1 + replacement1 + part2 + replacement2 + part3;

fs.writeFileSync(filePath, newContent, 'utf8');
console.log("Successfully transformed GlobeSandbox3DSimulator.tsx into full Earth Nullschool layout!");
