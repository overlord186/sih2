import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Props {
  rainMm: number;
  humidity: number;
  pressure: number;
  temp: number;
  windSpeed: number;
}

export const CloudVisualizerD3: React.FC<Props> = ({ rainMm, humidity, pressure, temp, windSpeed }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const particlesDataRef = useRef<any[]>([]);
  const splashesDataRef = useRef<any[]>([]);
  const windLinesDataRef = useRef<any[]>([]);
  const backCloudsRef = useRef<any[]>([]);
  const midCloudsRef = useRef<any[]>([]);
  const frontCloudsRef = useRef<any[]>([]);
  const updraftArrowsRef = useRef<any[]>([]);

  // Calculate thermodynamic derived quantities
  // Magnus formula for Dew Point approximation
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * temp) / (b + temp)) + Math.log(Math.max(humidity, 1) / 100.0);
  const dewPoint = (b * alpha) / (a - alpha);
  
  // Lifting Condensation Level (LCL) in meters approx: 125 * (T - Td)
  const lclMeters = Math.max(120, Math.round(125 * (temp - dewPoint)));
  
  // Updraft velocity estimation (m/s) based on buoyancy & rain intensity
  const updraftSpeed = Number(Math.max(0.4, (temp > 28 ? (temp - 24) * 0.4 : 0.8) + (rainMm > 50 ? 4.2 : rainMm > 15 ? 2.1 : 0.6)).toFixed(1));
  
  // Raindrop terminal velocity (m/s) approx 4.0 to 9.2 m/s
  const terminalVelocity = Number(Math.min(9.2, 4.0 + Math.pow(Math.min(rainMm, 120), 0.35) * 1.3).toFixed(1));

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    
    svg.selectAll('*').remove(); // Clear previous DOM nodes

    const defs = svg.append('defs');
    
    // Glow Filter
    const filter = defs.append('filter').attr('id', 'glow-d3').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', '5').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Gradients
    const cloudGrad = defs.append('linearGradient').attr('id', 'cloud-grad-d3').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    cloudGrad.append('stop').attr('offset', '0%').attr('class', 'cloud-stop-top');
    cloudGrad.append('stop').attr('offset', '100%').attr('class', 'cloud-stop-bottom');
    
    const bgGrad = defs.append('linearGradient').attr('id', 'bg-grad-d3').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    bgGrad.append('stop').attr('offset', '0%').attr('class', 'bg-stop-top');
    bgGrad.append('stop').attr('offset', '100%').attr('class', 'bg-stop-bottom');

    // Sun Gradient (radial)
    const sunGrad = defs.append('radialGradient').attr('id', 'sun-grad-d3');
    sunGrad.append('stop').attr('offset', '0%').attr('stop-color', '#fffbeb');
    sunGrad.append('stop').attr('offset', '45%').attr('stop-color', '#fde047');
    sunGrad.append('stop').attr('offset', '100%').attr('stop-color', '#f59e0b');

    // Layers
    svg.append('rect').attr('class', 'bg-rect').attr('width', '100%').attr('height', '100%').attr('fill', 'url(#bg-grad-d3)');
    const sunLayer = svg.append('g').attr('class', 'sun-layer');
    const thermalGridLayer = svg.append('g').attr('class', 'thermal-grid-layer');
    const updraftLayer = svg.append('g').attr('class', 'updraft-layer');
    const windLayer = svg.append('g').attr('class', 'wind-layer');
    const cloudLayerBack = svg.append('g').attr('class', 'cloud-layer-back');
    const cloudLayerMid = svg.append('g').attr('class', 'cloud-layer-mid');
    const rainLayer = svg.append('g').attr('class', 'rain-layer');
    const splashLayer = svg.append('g').attr('class', 'splash-layer');
    const cloudLayerFront = svg.append('g').attr('class', 'cloud-layer-front');
    const lclLayer = svg.append('g').attr('class', 'lcl-layer');
    const effectsLayer = svg.append('g').attr('class', 'effects-layer');
    const hudLayer = svg.append('g').attr('class', 'hud-layer');

    // Physics parameters
    const normalizedRain = Math.min(rainMm / 150, 1);
    const isHeavy = rainMm > 60;
    const isDry = rainMm < 2;
    const isSnow = temp <= 4;
    
    // Background dynamic sky colors (Crisp, high-luminance palette)
    let topBgColor = '#38bdf8';
    let bottomBgColor = '#bae6fd';
    if (isHeavy) {
      topBgColor = '#1e293b'; 
      bottomBgColor = '#475569'; 
    } else if (rainMm > 15) {
      topBgColor = '#475569'; 
      bottomBgColor = '#94a3b8'; 
    } else if (temp > 35 && isDry) {
      topBgColor = '#f59e0b'; 
      bottomBgColor = '#fef3c7';
    } else if (isSnow) {
      topBgColor = '#64748b';
      bottomBgColor = '#cbd5e1';
    }
    
    defs.select('.bg-stop-top').transition().duration(1000).attr('stop-color', topBgColor);
    defs.select('.bg-stop-bottom').transition().duration(1000).attr('stop-color', bottomBgColor);

    // Clouds colors
    const cloudTopColor = isSnow ? '#ffffff' : d3.interpolateHslLong('#ffffff', '#64748b')(normalizedRain);
    const cloudBottomColor = isSnow ? '#cbd5e1' : d3.interpolateHslLong('#cbd5e1', '#334155')(normalizedRain);
    defs.select('.cloud-stop-top').transition().duration(1000).attr('stop-color', cloudTopColor);
    defs.select('.cloud-stop-bottom').transition().duration(1000).attr('stop-color', cloudBottomColor);

    const humidityScale = 0.85 + (Math.max(40, Math.min(humidity, 100)) - 40) / 60 * 0.75;
    
    // SUN
    const showSun = rainMm < 6 && humidity < 85;
    const sunData = showSun ? [1] : [];
    
    const sunRadius = 46 + Math.max(0, temp - 25) * 1.5;
    const sunGroup = sunLayer.selectAll('g.sun-group').data(sunData);
    sunGroup.exit().transition().duration(600).attr('opacity', 0).remove();
    const sunEnter = sunGroup.enter().append('g').attr('class', 'sun-group').attr('transform', `translate(780, 95)`);
    
    // Sun outer radiance
    sunEnter.append('circle')
      .attr('r', sunRadius * 1.6)
      .attr('fill', '#fde047')
      .attr('opacity', 0.25)
      .attr('filter', 'url(#glow-d3)');
      
    // Sun core
    sunEnter.append('circle')
      .attr('r', sunRadius)
      .attr('fill', 'url(#sun-grad-d3)')
      .attr('filter', 'url(#glow-d3)');
      
    // Sun rays
    const numRays = 16;
    const raysData = Array.from({ length: numRays }, (_, i) => i);
    sunEnter.selectAll('path.ray').data(raysData).enter()
      .append('path')
      .attr('class', 'ray')
      .attr('d', `M -6 ${sunRadius + 12} L 6 ${sunRadius + 12} L 0 ${sunRadius + 38} Z`)
      .attr('fill', '#fde047')
      .attr('opacity', 0.7)
      .attr('transform', (d) => `rotate(${d * (360 / numRays)})`);

    // CLOUDS (Parallax multi-layered setup with high-resolution coordinates)
    if (backCloudsRef.current.length === 0) {
      backCloudsRef.current = [
        { id: 1, x: -120, y: -20, scale: 2.4 },
        { id: 2, x: 180, y: -40, scale: 3.0 },
        { id: 3, x: 520, y: -15, scale: 2.8 },
        { id: 4, x: 800, y: -35, scale: 3.2 },
        { id: 5, x: 1080, y: -25, scale: 2.3 },
      ];
      midCloudsRef.current = [
        { id: 1, x: -80, y: 15, scale: 2.6 },
        { id: 2, x: 280, y: 35, scale: 3.3 },
        { id: 3, x: 620, y: 25, scale: 3.1 },
        { id: 4, x: 960, y: 20, scale: 2.8 },
      ];
      frontCloudsRef.current = [
        { id: 1, x: -40, y: 45, scale: 2.9 },
        { id: 2, x: 380, y: 60, scale: 3.5 },
        { id: 3, x: 740, y: 50, scale: 3.2 },
      ];
    }

    const cloudPath = "M 104 148 c -13 0 -24 -11 -24 -24 c 0 -12 9 -23 22 -24 c 3 -16 18 -28 35 -28 c 17 0 32 12 35 28 c 1 0 2 0 4 0 c 12 0 23 10 23 23 c 0 13 -10 23 -23 23 H 104 Z";
    
    const backClouds = cloudLayerBack.selectAll('path.cloud').data(backCloudsRef.current, (d: any) => d.id);
    backClouds.enter().append('path').attr('class', 'cloud')
      .attr('d', cloudPath)
      .merge(backClouds as any)
      .attr('fill', 'url(#cloud-grad-d3)')
      .attr('opacity', 0.65);

    const midClouds = cloudLayerMid.selectAll('path.cloud').data(midCloudsRef.current, (d: any) => d.id);
    midClouds.enter().append('path').attr('class', 'cloud')
      .attr('d', cloudPath)
      .merge(midClouds as any)
      .attr('fill', 'url(#cloud-grad-d3)')
      .attr('opacity', 0.8);

    const frontClouds = cloudLayerFront.selectAll('path.cloud').data(frontCloudsRef.current, (d: any) => d.id);
    frontClouds.enter().append('path').attr('class', 'cloud')
      .attr('d', cloudPath)
      .merge(frontClouds as any)
      .attr('fill', 'url(#cloud-grad-d3)')
      .attr('opacity', 0.95);

    // LCL Indicator Line & Condensation Base
    const lclY = Math.max(90, Math.min(230, 240 - (lclMeters / 2500) * 120));
    lclLayer.append('line')
      .attr('x1', 40)
      .attr('x2', 920)
      .attr('y1', lclY)
      .attr('y2', lclY)
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '5 4')
      .attr('opacity', 0.7);

    lclLayer.append('text')
      .attr('x', 50)
      .attr('y', lclY - 6)
      .attr('fill', '#0284c7')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('letter-spacing', '0.5px')
      .text(`LCL Cloud Base: ~${lclMeters} m`);

    // Updraft Convective Streamlines / Thermal Arrows
    if (updraftArrowsRef.current.length === 0) {
      updraftArrowsRef.current = [
        { id: 1, x: 180, y: 340, speed: updraftSpeed },
        { id: 2, x: 380, y: 320, speed: updraftSpeed * 1.2 },
        { id: 3, x: 580, y: 350, speed: updraftSpeed * 0.9 },
        { id: 4, x: 780, y: 330, speed: updraftSpeed * 1.1 },
      ];
    }

    // WIND STREAMLINES
    const showWind = windSpeed > 10;
    if (windLinesDataRef.current.length === 0) {
      windLinesDataRef.current = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 1200,
        y: 30 + Math.random() * 300,
        length: 50 + Math.random() * 140,
        speed: 6 + Math.random() * 12,
        opacity: 0.15 + Math.random() * 0.35,
      }));
    }
    
    const windLines = windLayer.selectAll('line.wind').data(showWind ? windLinesDataRef.current : [], (d: any) => d.id);
    windLines.exit().remove();
    windLines.enter().append('line').attr('class', 'wind')
      .attr('stroke', '#ffffff')
      .attr('stroke-linecap', 'round')
      .merge(windLines as any)
      .attr('stroke-width', 2)
      .attr('opacity', (d) => d.opacity);

    // RAIN / SNOW PARTICLES
    const numDrops = Math.min(Math.floor(Math.pow(rainMm, 0.88) * 22), 1600); 
    const currentParticles = particlesDataRef.current;
    const windDrift = (windSpeed / 10) * 1.6;

    if (currentParticles.length < numDrops) {
      for (let i = currentParticles.length; i < numDrops; i++) {
        currentParticles.push({
          id: Math.random().toString(36).substring(2, 9),
          x: -250 + Math.random() * 1450, 
          y: -50 + Math.random() * 500, 
          length: 10 + Math.random() * 18,
          speed: 8 + Math.random() * 10,
          thickness: 1.8 + Math.random() * 1.8,
          opacity: 0.3 + Math.random() * 0.6,
          phase: Math.random() * Math.PI * 2,
        });
      }
    } else if (currentParticles.length > numDrops) {
      currentParticles.splice(numDrops);
    }
    
    currentParticles.forEach((d) => {
      d.length = isSnow ? 4 + Math.random() * 4 : 10 + Math.random() * 18 + (normalizedRain * 22);
      d.speed = isSnow ? 3 + Math.random() * 3 : 8 + Math.random() * 10 + (normalizedRain * 18);
      d.thickness = isSnow ? 2.8 + Math.random() * 2 : 1.8 + Math.random() * 1.8 + (normalizedRain * 2);
    });
    
    particlesDataRef.current = currentParticles;

    const particles = rainLayer.selectAll('line.particle').data(currentParticles, (d: any) => d.id);
    particles.exit().remove();
    particles.enter().append('line').attr('class', 'particle')
      .merge(particles as any)
      .attr('stroke', isSnow ? '#ffffff' : '#60a5fa')
      .attr('stroke-linecap', 'round')
      .attr('stroke-width', (d) => d.thickness)
      .attr('opacity', (d) => d.opacity);

    // SPLASHES ON GROUND
    if (splashesDataRef.current.length === 0) {
      splashesDataRef.current = Array.from({ length: 60 }, (_, i) => ({
        id: i,
        x: 0,
        y: 0,
        r: 0,
        opacity: 0,
        active: false,
      }));
    }
    const splashes = splashLayer.selectAll('ellipse.splash').data(splashesDataRef.current, (d: any) => d.id);
    splashes.enter().append('ellipse').attr('class', 'splash')
      .attr('stroke', '#93c5fd')
      .attr('stroke-width', 1.8)
      .attr('fill', 'none');

    // LIGHTNING
    const showLightning = isHeavy && pressure < 1005;
    let sunRot = 0;

    const timer = d3.timer(() => {
      // Sun Rotation
      if (showSun) {
        sunRot = (sunRot + 0.3) % 360;
        sunLayer.select('g.sun-group').attr('transform', `translate(780, 95) rotate(${sunRot})`);
      }

      // Cloud Parallax
      backCloudsRef.current.forEach((c) => {
        c.x -= windDrift * 0.18;
        if (c.x < -350) c.x = 1250;
      });
      cloudLayerBack.selectAll('path.cloud').attr('transform', (d: any) => `translate(${d.x}, ${d.y}) scale(${d.scale * humidityScale})`);

      midCloudsRef.current.forEach((c) => {
        c.x -= windDrift * 0.32;
        if (c.x < -350) c.x = 1250;
      });
      cloudLayerMid.selectAll('path.cloud').attr('transform', (d: any) => `translate(${d.x}, ${d.y}) scale(${d.scale * humidityScale})`);

      frontCloudsRef.current.forEach((c) => {
        c.x -= windDrift * 0.48;
        if (c.x < -350) c.x = 1250;
      });
      cloudLayerFront.selectAll('path.cloud').attr('transform', (d: any) => `translate(${d.x}, ${d.y}) scale(${d.scale * humidityScale})`);

      // Updraft Thermals Motion
      updraftArrowsRef.current.forEach((u) => {
        u.y -= (u.speed * 0.6);
        if (u.y < lclY) u.y = 360;
      });

      // Wind Lines
      if (showWind) {
        windLinesDataRef.current.forEach((w) => {
          w.x -= (windSpeed / 4.5) + w.speed;
          if (w.x < -250) {
            w.x = 960 + Math.random() * 400;
            w.y = 20 + Math.random() * 320;
          }
        });
        windLayer.selectAll('line.wind')
          .attr('x1', (d: any) => d.x)
          .attr('y1', (d: any) => d.y)
          .attr('x2', (d: any) => d.x + d.length)
          .attr('y2', (d: any) => d.y);
      }

      // Particles Engine
      const activeSplashes = splashesDataRef.current;
      let splashIdx = 0;

      rainLayer.selectAll('line.particle')
        .attr('y1', function (d: any) {
          d.y += d.speed;
          if (d.y > 360) {
            if (!isSnow && splashIdx < activeSplashes.length && Math.random() > 0.55) {
              const s = activeSplashes.find((sp) => !sp.active);
              if (s) {
                s.active = true;
                s.x = d.x;
                s.y = 360;
                s.r = 1.2;
                s.opacity = 0.7;
              }
            }
            d.y = -20 - Math.random() * 60;
            d.x = -250 + Math.random() * 1500;
          }
          return d.y;
        })
        .attr('y2', function (d: any) {
          return d.y + (isSnow ? d.length / 2 : d.length);
        })
        .attr('x1', function (d: any) {
          d.x -= windDrift;
          if (isSnow) {
            d.phase += 0.05;
            d.x += Math.sin(d.phase) * 1.8;
          }
          return d.x;
        })
        .attr('x2', function (d: any) {
          return d.x - (isSnow ? 0 : windDrift * 1.6);
        });

      // Update Splashes
      activeSplashes.forEach((s) => {
        if (s.active) {
          s.r += 1.8;
          s.opacity -= 0.035;
          if (s.opacity <= 0) s.active = false;
        }
      });
      splashLayer.selectAll('ellipse.splash')
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y)
        .attr('rx', (d: any) => d.r * 2.2)
        .attr('ry', (d: any) => d.r * 0.6)
        .attr('opacity', (d: any) => (d.active ? d.opacity : 0));

      // Lightning
      if (showLightning) {
        const shouldFlash = Math.random() > 0.965;
        if (shouldFlash) {
          const startX = 150 + Math.random() * 660;
          let lPath = `M ${startX} 70`;
          let lx = startX;
          let ly = 70;
          for (let i = 0; i < 7; i++) {
            lx += (Math.random() - 0.5) * 90;
            ly += 25 + Math.random() * 35;
            lPath += ` L ${lx} ${ly}`;
          }

          const bolt = effectsLayer.selectAll('path.lightning').data([1]);
          bolt.enter().append('path').attr('class', 'lightning')
            .merge(bolt as any)
            .attr('d', lPath)
            .attr('fill', 'none')
            .attr('stroke', '#fef08a')
            .attr('stroke-width', 3.5 + Math.random() * 3)
            .attr('filter', 'url(#glow-d3)')
            .attr('opacity', 1);

          cloudLayerFront.selectAll('path.cloud').attr('fill', '#f8fafc');
        } else {
          effectsLayer.selectAll('path.lightning').attr('opacity', 0);
          cloudLayerFront.selectAll('path.cloud').attr('fill', 'url(#cloud-grad-d3)');
        }
      } else {
        effectsLayer.selectAll('path.lightning').attr('opacity', 0);
        cloudLayerFront.selectAll('path.cloud').attr('fill', 'url(#cloud-grad-d3)');
      }
    });

    return () => timer.stop();
  }, [rainMm, humidity, pressure, temp, windSpeed, dewPoint, lclMeters, updraftSpeed]);

  return (
    <div className="w-full flex flex-col rounded-xl border border-slate-300 overflow-hidden shadow-sm bg-slate-950 transition-all">
      {/* Top Header with Real-time Physics Telemetry Badges */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">
            D3 Atmospheric Sandbox Physics Engine
          </span>
          <span className="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 text-[10px] font-mono">
            Scale: 1:1 Thermodynamics
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300">
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
            Dew Point: <strong className="text-emerald-400">{dewPoint.toFixed(1)}°C</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
            Updraft: <strong className="text-amber-400">{updraftSpeed} m/s</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
            Terminal V: <strong className="text-blue-400">{terminalVelocity} m/s</strong>
          </span>
        </div>
      </div>

      {/* Main High-Scale D3 SVG Canvas */}
      <div className="relative w-full h-[320px] sm:h-[360px] bg-slate-950 overflow-hidden flex items-center justify-center">
        <svg
          ref={svgRef}
          viewBox="0 0 960 380"
          className="w-full h-full drop-shadow-md z-10 select-none"
          preserveAspectRatio="xMidYMid slice"
        />

        {/* Floating Physical Parameters Micro-HUD */}
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300">
          <span>RH: <strong className="text-sky-300">{humidity}%</strong></span>
          <span>•</span>
          <span>P: <strong className="text-purple-300">{pressure} hPa</strong></span>
          <span>•</span>
          <span>Wind: <strong className="text-teal-300">{windSpeed} km/h</strong></span>
          <span>•</span>
          <span>Precip: <strong className="text-blue-300">{rainMm.toFixed(1)} mm</strong></span>
        </div>
      </div>
    </div>
  );
};
