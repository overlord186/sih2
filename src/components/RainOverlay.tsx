import React, { useEffect, useRef } from 'react';

export const RainOverlay: React.FC<{ intensity: number }> = ({ intensity }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intensityRef = useRef(intensity);

  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const maxDrops = 2500;
    const maxWindLines = 150;
    const maxParticles = 500;
    
    // Puddle and Ripples State
    let puddleHeight = 0;
    const ripples: { x: number, y: number, radius: number, maxRadius: number, life: number, speed: number }[] = [];
    
    // Wind Particles (Mist/Dust)
    const particles = Array.from({ length: maxParticles }).map(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      speedX: 0,
      speedY: 0,
      size: 0,
      opacity: 0,
      active: false
    }));
    
    // Rain Drops
    const drops = Array.from({ length: maxDrops }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      speedY: 0,
      speedX: 0,
      length: 0,
      active: false
    }));

    // Wind Streaks
    const windLines = Array.from({ length: maxWindLines }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      speedX: 0,
      length: 0,
      active: false
    }));

    let lightnings: any[] = [];
    let flashOpacity = 0;

    const createLightning = () => {
      const startX = Math.random() * width;
      const segments = [];
      let currentX = startX;
      let currentY = 0;
      
      // Main bolt
      while (currentY < height) {
        const nextX = currentX + (Math.random() - 0.5) * 150;
        const nextY = currentY + Math.random() * 80 + 30;
        segments.push({ x: nextX, y: nextY });
        currentX = nextX;
        currentY = nextY;
      }

      // Branch bolt
      const branchSegments = [];
      let branchStart = null;
      if (segments.length > 3) {
          const splitIdx = Math.floor(Math.random() * (segments.length - 2));
          branchStart = { ...segments[splitIdx] };
          let bX = branchStart.x;
          let bY = branchStart.y;
          const dir = Math.random() > 0.5 ? 1 : -1;
          for(let i=0; i<4; i++) {
              bX += dir * (Math.random() * 120 + 40);
              bY += Math.random() * 80 + 30;
              branchSegments.push({ x: bX, y: bY });
          }
      }

      lightnings.push({
        segments,
        branchSegments,
        branchStart,
        startX,
        life: 1.0 
      });
      flashOpacity = 0.15; // Soft subtle atmospheric luminance rather than blinding whiteout
    };

    let animationId: number;

    const render = () => {
      const currentIntensity = intensityRef.current;
      ctx.clearRect(0, 0, width, height);

      if (currentIntensity > 0) {
        const isHeavy = currentIntensity >= 64.5;
        const normalized = Math.min(1, currentIntensity / 100);
        
        
        const isCyclone = currentIntensity >= 120;
        const maxPuddleHeight = height * 0.15;
        
        // Puddle accumulation
        if (isHeavy || isCyclone) {
           puddleHeight += isCyclone ? 0.3 : 0.1;
           if (puddleHeight > maxPuddleHeight) puddleHeight = maxPuddleHeight;
        } else {
           puddleHeight -= 0.2;
           if (puddleHeight < 0) puddleHeight = 0;
        }
        
        // 1. Subtle Ambient Luminance during lightning strike (Non-blinding)
        if (flashOpacity > 0) {
          ctx.fillStyle = `rgba(56, 189, 248, ${flashOpacity * 0.25})`;
          ctx.fillRect(0, 0, width, height);
          flashOpacity -= 0.02;
        }

        // 2. Spawn Lightning Bolts
        if (isHeavy && Math.random() > 0.985) {
          createLightning();
        }

        // 3. Draw Lightning Bolts
        for (let i = lightnings.length - 1; i >= 0; i--) {
          const l = lightnings[i];
          
          ctx.shadowBlur = 20;
          ctx.shadowColor = "rgba(180, 210, 255, 0.9)";
          ctx.lineCap = 'round';
          ctx.lineJoin = 'miter';

          // Main Bolt
          ctx.beginPath();
          ctx.moveTo(l.startX, 0);
          ctx.strokeStyle = `rgba(240, 248, 255, ${l.life})`;
          ctx.lineWidth = 4;
          for (const seg of l.segments) {
            ctx.lineTo(seg.x, seg.y);
          }
          ctx.stroke();

          // Branch Bolt
          if (l.branchStart && l.branchSegments.length > 0) {
              ctx.beginPath();
              ctx.moveTo(l.branchStart.x, l.branchStart.y);
              ctx.lineWidth = 2;
              for (const seg of l.branchSegments) {
                ctx.lineTo(seg.x, seg.y);
              }
              ctx.stroke();
          }
          
          ctx.shadowBlur = 0; // Reset shadow

          // Flicker effect decay
          if (Math.random() > 0.5 && l.life > 0.4) {
              l.life -= 0.02; 
          } else {
              l.life -= 0.15; 
          }
          if (l.life <= 0) lightnings.splice(i, 1);
        }

        const targetDrops = isHeavy ? 1500 + (normalized * 1000) : 100 + (normalized * 300);
        const targetWindLines = isHeavy ? 80 + (normalized * 70) : 0;
        const targetParticles = isHeavy ? 150 + (normalized * 350) : 0;
        
        // Wind Physics
        const windForce = isHeavy ? (20 + normalized * 15) : (2 + normalized * 5);
        const baseSpeedY = isHeavy ? 25 : 10 + (normalized * 5);

        // 4. Draw Wind Streaks (Flowing horizontally right-to-left)
        ctx.strokeStyle = 'rgba(230, 240, 250, 0.15)'; 
        for (let i = 0; i < maxWindLines; i++) {
          const wl = windLines[i];
          if (i < targetWindLines) {
             if (!wl.active) {
               wl.active = true;
               wl.x = width + Math.random() * width;
               wl.y = Math.random() * height;
             }
             wl.speedX = windForce * 3.5 + Math.random() * 20;
             wl.length = 150 + Math.random() * 300;
             
             ctx.lineWidth = Math.random() * 3 + 1;
             ctx.beginPath();
             ctx.moveTo(wl.x, wl.y);
             ctx.lineTo(wl.x + wl.length, wl.y); // Tail extends to the right
             ctx.stroke();

             wl.x -= wl.speedX;
             if (wl.x < -wl.length) {
                wl.x = width + Math.random() * width;
                wl.y = Math.random() * height;
             }
          } else {
             wl.active = false;
          }
        }

        
        // 4.5 Draw Wind Particles (Mist/Debris)
        for (let i = 0; i < maxParticles; i++) {
          const p = particles[i];
          if (i < targetParticles) {
            if (!p.active) {
              p.active = true;
              p.x = width + Math.random() * width * 0.5;
              p.y = Math.random() * height;
              p.size = Math.random() * 2.5 + 0.5;
              p.opacity = Math.random() * 0.5 + 0.1;
            }
            
            // Motion vectors heavily driven by wind force, moving right to left
            p.speedX = windForce * 2.5 + Math.random() * 15 + (normalized * 15);
            // Add turbulence
            p.speedY = (Math.random() - 0.5) * windForce * 0.8 + (baseSpeedY * 0.1);
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            // More opaque during cyclonic conditions
            ctx.fillStyle = `rgba(210, 225, 240, ${p.opacity * (normalized * 1.5)})`;
            ctx.fill();

            p.x -= p.speedX;
            p.y += p.speedY;

            if (p.x < -10 || p.y > height + 10 || p.y < -10) {
              p.x = width + Math.random() * width * 0.5;
              p.y = Math.random() * height;
            }
          } else {
            p.active = false;
          }
        }

        // 5. Draw Rain Drops (Slanted by wind)
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.7)'; 
        ctx.lineWidth = isHeavy ? 1.5 : 1;

        for (let i = 0; i < maxDrops; i++) {
          const drop = drops[i];
          if (i < targetDrops) {
            if (!drop.active) {
              drop.active = true;
              drop.y = Math.random() * height; 
              drop.x = -width * 0.5 + Math.random() * (width * 2.5); 
            }
            drop.speedY = baseSpeedY + (i % 12);
            drop.speedX = windForce + (i % 8);
            drop.length = (isHeavy ? 30 : 12) + (i % 15);
            
            ctx.beginPath();
            ctx.moveTo(drop.x, drop.y);
            // Draw tail trailing up and right
            ctx.lineTo(drop.x + drop.speedX * (drop.length / drop.speedY), drop.y - drop.length);
            ctx.stroke();

            drop.y += drop.speedY;
            drop.x -= drop.speedX;

            if (drop.y > height - puddleHeight || drop.x < -100) {
              // Spawn a ripple when hitting the puddle surface
              if (drop.y > height - puddleHeight && puddleHeight > 0 && drop.x > 0 && drop.x < width && Math.random() > (isCyclone ? 0.2 : 0.6)) {
                ripples.push({
                  x: drop.x,
                  y: height - puddleHeight + (Math.random() * puddleHeight),
                  radius: 1,
                  maxRadius: 10 + Math.random() * 20,
                  life: 1.0,
                  speed: 0.5 + Math.random() * 1.5
                });
              }
              drop.y = -drop.length - (Math.random() * 100);
              // Spawn over a very wide area so slanted rain covers the whole screen horizontally
              drop.x = -width * 0.5 + Math.random() * (width * 2.5);
            }
          } else {
            drop.active = false;
          }
        }
        
        // 6. Draw Puddle and Ripples
        if (puddleHeight > 0) {
           ctx.lineWidth = 1;
           for (let i = ripples.length - 1; i >= 0; i--) {
             const r = ripples[i];
             ctx.beginPath();
             ctx.strokeStyle = `rgba(180, 200, 220, ${r.life * (isCyclone ? 0.6 : 0.3)})`;
             // Squashed ellipse for 3D perspective of water surface
             ctx.ellipse(r.x, r.y, r.radius * 2, r.radius * 0.4, 0, 0, Math.PI * 2);
             ctx.stroke();
             
             r.radius += r.speed;
             r.life -= isCyclone ? 0.05 : 0.02;
             if (r.life <= 0) ripples.splice(i, 1);
           }
           
           // Deep water body fill
           const gradient = ctx.createLinearGradient(0, height - puddleHeight, 0, height);
           gradient.addColorStop(0, 'rgba(15, 25, 40, 0.4)');
           gradient.addColorStop(1, 'rgba(30, 45, 60, 0.9)');
           
           ctx.fillStyle = gradient;
           ctx.fillRect(0, height - puddleHeight, width, puddleHeight);
           
           // Water surface highlight line
           ctx.beginPath();
           ctx.moveTo(0, height - puddleHeight);
           ctx.lineTo(width, height - puddleHeight);
           ctx.strokeStyle = 'rgba(200, 220, 255, 0.2)';
           ctx.stroke();
        }
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed top-0 left-0 w-full h-full pointer-events-none z-[100] transition-opacity duration-700 ${intensity > 0 ? 'opacity-100' : 'opacity-0'}`}
    />
  );
};
