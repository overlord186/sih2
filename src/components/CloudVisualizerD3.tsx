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
  const frontCloudsRef = useRef<any[]>([]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    
    svg.selectAll('*').remove(); // Strict hot reload clearance

    const defs = svg.append('defs');
    
    // Glow Filter
    const filter = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Gradients
    const cloudGrad = defs.append('linearGradient').attr('id', 'cloud-grad').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    cloudGrad.append('stop').attr('offset', '0%').attr('class', 'cloud-stop-top');
    cloudGrad.append('stop').attr('offset', '100%').attr('class', 'cloud-stop-bottom');
    
    const bgGrad = defs.append('linearGradient').attr('id', 'bg-grad').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    bgGrad.append('stop').attr('offset', '0%').attr('class', 'bg-stop-top');
    bgGrad.append('stop').attr('offset', '100%').attr('class', 'bg-stop-bottom');

    // Sun Gradient (radial)
    const sunGrad = defs.append('radialGradient').attr('id', 'sun-grad');
    sunGrad.append('stop').attr('offset', '0%').attr('stop-color', '#fef08a');
    sunGrad.append('stop').attr('offset', '50%').attr('stop-color', '#eab308');
    sunGrad.append('stop').attr('offset', '100%').attr('stop-color', '#ca8a04');

    // Layers
    svg.append('rect').attr('class', 'bg-rect').attr('width', '100%').attr('height', '100%').attr('fill', 'url(#bg-grad)');
    const sunLayer = svg.append('g').attr('class', 'sun-layer');
    const windLayer = svg.append('g').attr('class', 'wind-layer');
    const cloudLayerBack = svg.append('g').attr('class', 'cloud-layer-back');
    const rainLayer = svg.append('g').attr('class', 'rain-layer');
    const splashLayer = svg.append('g').attr('class', 'splash-layer');
    const cloudLayerFront = svg.append('g').attr('class', 'cloud-layer-front');
    const effectsLayer = svg.append('g').attr('class', 'effects-layer');

    // Physics parameters
    const normalizedRain = Math.min(rainMm / 150, 1);
    const isHeavy = rainMm > 60;
    const isDry = rainMm < 2;
    const isSnow = temp <= 4;
    
    // Background
    let topBgColor = '#bae6fd';
    let bottomBgColor = '#e0f2fe';
    if (isHeavy) {
        topBgColor = '#0f172a'; 
        bottomBgColor = '#334155'; 
    } else if (rainMm > 15) {
        topBgColor = '#64748b'; 
        bottomBgColor = '#94a3b8'; 
    } else if (temp > 35 && isDry) {
        topBgColor = '#fcd34d'; 
        bottomBgColor = '#fef3c7';
    } else if (isSnow) {
        topBgColor = '#94a3b8';
        bottomBgColor = '#e2e8f0';
    }
    
    defs.select('.bg-stop-top').transition().duration(1200).attr('stop-color', topBgColor);
    defs.select('.bg-stop-bottom').transition().duration(1200).attr('stop-color', bottomBgColor);

    // Clouds
    const cloudTopColor = isSnow ? '#ffffff' : d3.interpolateHslLong('#ffffff', '#475569')(normalizedRain);
    const cloudBottomColor = isSnow ? '#cbd5e1' : d3.interpolateHslLong('#e2e8f0', '#1e293b')(normalizedRain);
    defs.select('.cloud-stop-top').transition().duration(1200).attr('stop-color', cloudTopColor);
    defs.select('.cloud-stop-bottom').transition().duration(1200).attr('stop-color', cloudBottomColor);

    const humidityScale = 0.8 + (Math.max(40, Math.min(humidity, 100)) - 40) / 60 * 0.7;
    
    // SUN
    const showSun = rainMm < 5 && humidity < 80;
    const sunData = showSun ? [1] : [];
    
    const sunRadius = 40 + Math.max(0, temp - 25) * 1.5;
    const sunGroup = sunLayer.selectAll('g.sun-group').data(sunData);
    sunGroup.exit().transition().duration(800).attr('opacity', 0).remove();
    const sunEnter = sunGroup.enter().append('g').attr('class', 'sun-group').attr('transform', `translate(650, 90)`);
    
    // Sun glow
    sunEnter.append('circle')
      .attr('r', sunRadius * 1.5)
      .attr('fill', '#fde047')
      .attr('opacity', 0.2)
      .attr('filter', 'url(#glow)');
      
    // Sun core
    sunEnter.append('circle')
      .attr('r', sunRadius)
      .attr('fill', 'url(#sun-grad)')
      .attr('filter', 'url(#glow)');
      
    // Sun rays
    const numRays = 12;
    const raysData = Array.from({length: numRays}, (_, i) => i);
    sunEnter.selectAll('path.ray').data(raysData).enter()
      .append('path')
      .attr('class', 'ray')
      .attr('d', `M -5 ${sunRadius + 10} L 5 ${sunRadius + 10} L 0 ${sunRadius + 30} Z`)
      .attr('fill', '#fde047')
      .attr('opacity', 0.6)
      .attr('transform', d => `rotate(${d * (360/numRays)})`);

    // CLOUDS (Parallax initialization)
    if (backCloudsRef.current.length === 0) {
      backCloudsRef.current = [
        { id: 1, x: -100, y: -20, scale: 2.2 },
        { id: 2, x: 150, y: -40, scale: 2.8 },
        { id: 3, x: 450, y: -10, scale: 2.5 },
        { id: 4, x: 700, y: -30, scale: 3.0 },
        { id: 5, x: 950, y: -20, scale: 2.1 },
      ];
      frontCloudsRef.current = [
        { id: 1, x: -50, y: 10, scale: 2.5 },
        { id: 2, x: 250, y: 30, scale: 3.2 },
        { id: 3, x: 550, y: 20, scale: 2.9 },
        { id: 4, x: 850, y: 15, scale: 2.7 },
      ];
    }

    const cloudPath = "M 104 148 c -13 0 -24 -11 -24 -24 c 0 -12 9 -23 22 -24 c 3 -16 18 -28 35 -28 c 17 0 32 12 35 28 c 1 0 2 0 4 0 c 12 0 23 10 23 23 c 0 13 -10 23 -23 23 H 104 Z";
    
    const backClouds = cloudLayerBack.selectAll('path.cloud').data(backCloudsRef.current, (d: any) => d.id);
    backClouds.enter().append('path').attr('class', 'cloud')
      .attr('d', cloudPath)
      .merge(backClouds as any)
      .attr('fill', 'url(#cloud-grad)')
      .attr('opacity', 0.7);

    const frontClouds = cloudLayerFront.selectAll('path.cloud').data(frontCloudsRef.current, (d: any) => d.id);
    frontClouds.enter().append('path').attr('class', 'cloud')
      .attr('d', cloudPath)
      .merge(frontClouds as any)
      .attr('fill', 'url(#cloud-grad)');

    // WIND LINES
    const showWind = windSpeed > 15;
    if (windLinesDataRef.current.length === 0) {
        windLinesDataRef.current = Array.from({length: 25}, (_, i) => ({
            id: i, x: Math.random() * 1000, y: 20 + Math.random() * 250,
            length: 40 + Math.random() * 100, speed: 5 + Math.random() * 10,
            opacity: Math.random() * 0.3
        }));
    }
    
    const windLines = windLayer.selectAll('line.wind').data(showWind ? windLinesDataRef.current : [], (d: any) => d.id);
    windLines.exit().remove();
    windLines.enter().append('line').attr('class', 'wind')
        .attr('stroke', '#ffffff')
        .attr('stroke-linecap', 'round')
        .merge(windLines as any)
        .attr('stroke-width', 1.5)
        .attr('opacity', d => d.opacity);

    // RAIN / SNOW PARTICLES
    const numDrops = Math.min(Math.floor(Math.pow(rainMm, 0.88) * 18), 1200); 
    const currentParticles = particlesDataRef.current;
    const windDrift = (windSpeed / 10) * 1.5;

    if (currentParticles.length < numDrops) {
        for (let i = currentParticles.length; i < numDrops; i++) {
            currentParticles.push({
                id: Math.random().toString(36).substring(2, 9),
                x: -200 + Math.random() * 1200, 
                y: -50 + Math.random() * 400, 
                length: 8 + Math.random() * 15,
                speed: 6 + Math.random() * 8,
                thickness: 1.5 + Math.random() * 1.5,
                opacity: 0.2 + Math.random() * 0.6,
                phase: Math.random() * Math.PI * 2 // For snow fluttering
            });
        }
    } else if (currentParticles.length > numDrops) {
        currentParticles.splice(numDrops);
    }
    
    currentParticles.forEach(d => {
        d.length = isSnow ? (3 + Math.random() * 3) : (8 + Math.random() * 15 + (normalizedRain * 20));
        d.speed = isSnow ? (2 + Math.random() * 3) : (6 + Math.random() * 8 + (normalizedRain * 15));
        d.thickness = isSnow ? (2.5 + Math.random() * 2) : (1.5 + Math.random() * 1.5 + (normalizedRain * 2));
    });
    
    particlesDataRef.current = currentParticles;

    const particles = rainLayer.selectAll('line.particle').data(currentParticles, (d: any) => d.id);
    particles.exit().remove();
    particles.enter().append('line').attr('class', 'particle')
      .merge(particles as any)
      .attr('stroke', isSnow ? '#ffffff' : '#93c5fd')
      .attr('stroke-linecap', 'round')
      .attr('stroke-width', d => d.thickness)
      .attr('opacity', d => d.opacity);

    // SPLASHES
    if (splashesDataRef.current.length === 0) {
        splashesDataRef.current = Array.from({length: 40}, (_, i) => ({
            id: i, x: 0, y: 0, r: 0, opacity: 0, active: false
        }));
    }
    const splashes = splashLayer.selectAll('ellipse.splash').data(splashesDataRef.current, (d: any) => d.id);
    splashes.enter().append('ellipse').attr('class', 'splash')
      .attr('stroke', '#93c5fd')
      .attr('stroke-width', 1.5)
      .attr('fill', 'none');

    // LIGHTNING
    const showLightning = isHeavy && pressure < 1002;
    
    let sunRot = 0;

    const timer = d3.timer(() => {
        // Sun Rotation
        if (showSun) {
            sunRot = (sunRot + 0.3) % 360;
            sunLayer.select('g.sun-group').attr('transform', `translate(650, 90) rotate(${sunRot})`);
        }

        // Cloud Parallax
        backCloudsRef.current.forEach(c => {
            c.x -= windDrift * 0.2;
            if (c.x < -300) c.x = 1100;
        });
        cloudLayerBack.selectAll('path.cloud').attr('transform', (d: any) => `translate(${d.x}, ${d.y}) scale(${d.scale * humidityScale})`);

        frontCloudsRef.current.forEach(c => {
            c.x -= windDrift * 0.4;
            if (c.x < -300) c.x = 1100;
        });
        cloudLayerFront.selectAll('path.cloud').attr('transform', (d: any) => `translate(${d.x}, ${d.y}) scale(${d.scale * humidityScale})`);

        // Wind Lines
        if (showWind) {
            windLinesDataRef.current.forEach(w => {
                w.x -= (windSpeed / 5) + w.speed;
                if (w.x < -200) {
                    w.x = 800 + Math.random() * 400;
                    w.y = 20 + Math.random() * 250;
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
            .attr('y1', function(d: any) { 
                d.y += d.speed; 
                if(d.y > 280) { 
                    // Trigger splash if rain (not snow)
                    if (!isSnow && splashIdx < activeSplashes.length && Math.random() > 0.6) {
                        // Find an inactive splash
                        const s = activeSplashes.find(sp => !sp.active);
                        if (s) {
                            s.active = true;
                            s.x = d.x;
                            s.y = 280;
                            s.r = 1;
                            s.opacity = 0.6;
                        }
                    }
                    d.y = -20 - Math.random() * 50; 
                    d.x = -200 + Math.random() * 1400;
                }
                return d.y; 
            })
            .attr('y2', function(d: any) { return d.y + (isSnow ? d.length/2 : d.length); })
            .attr('x1', function(d: any) { 
                d.x -= windDrift; 
                if (isSnow) {
                    d.phase += 0.05;
                    d.x += Math.sin(d.phase) * 1.5;
                }
                return d.x; 
            })
            .attr('x2', function(d: any) { return d.x - (isSnow ? 0 : windDrift * 1.5); }); 

        // Update Splashes
        activeSplashes.forEach(s => {
            if (s.active) {
                s.r += 1.5;
                s.opacity -= 0.04;
                if (s.opacity <= 0) s.active = false;
            }
        });
        splashLayer.selectAll('ellipse.splash')
            .attr('cx', (d: any) => d.x)
            .attr('cy', (d: any) => d.y)
            .attr('rx', (d: any) => d.r * 2)
            .attr('ry', (d: any) => d.r * 0.5)
            .attr('opacity', (d: any) => (d.active ? d.opacity : 0));

        // Lightning
        if (showLightning) {
            const shouldFlash = Math.random() > 0.97;
            if (shouldFlash) {
                const startX = 100 + Math.random() * 600;
                
                // Generate jagged fractal branch
                let lPath = `M ${startX} 60`;
                let lx = startX;
                let ly = 60;
                for (let i = 0; i < 6; i++) {
                    lx += (Math.random() - 0.5) * 80;
                    ly += 20 + Math.random() * 30;
                    lPath += ` L ${lx} ${ly}`;
                }
                
                const bolt = effectsLayer.selectAll('path.lightning').data([1]);
                bolt.enter().append('path').attr('class', 'lightning')
                  .merge(bolt as any)
                  .attr('d', lPath)
                  .attr('fill', 'none')
                  .attr('stroke', '#fef08a')
                  .attr('stroke-width', 3 + Math.random()*3)
                  .attr('filter', 'url(#glow)')
                  .attr('opacity', 1);

                cloudLayerFront.selectAll('path.cloud').attr('fill', '#f8fafc');
            } else {
                effectsLayer.selectAll('path.lightning').attr('opacity', 0);
                cloudLayerFront.selectAll('path.cloud').attr('fill', 'url(#cloud-grad)');
            }
        } else {
            effectsLayer.selectAll('path.lightning').attr('opacity', 0);
            cloudLayerFront.selectAll('path.cloud').attr('fill', 'url(#cloud-grad)');
        }
    });

    return () => timer.stop();
  }, [rainMm, humidity, pressure, temp, windSpeed]);

  return (
    <div className="w-full flex items-center justify-center rounded-xl border border-slate-300 overflow-hidden shadow-inner relative bg-slate-900 transition-all">
       <svg ref={svgRef} viewBox="0 0 800 300" className="w-full h-[220px] drop-shadow-md z-10" preserveAspectRatio="xMidYMid slice" />
       <div className="absolute top-3 left-3 flex flex-col z-20">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider backdrop-blur-md bg-white/70 px-2 py-1 rounded shadow-sm border border-white/50">D3 Atmospheric Sandbox Engine</span>
       </div>
    </div>
  );
};
