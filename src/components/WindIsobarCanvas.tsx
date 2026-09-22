import React, { useEffect, useRef } from 'react';

interface Props {
  windSpeed: number; // 0 to 150 km/h
  pressure: number; // 980 to 1020 hPa
  lat: number;
  lon: number;
  intensityMm: number;
}

export const WindIsobarCanvas: React.FC<Props> = ({ windSpeed, pressure, lat, lon, intensityMm }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: { x: number; y: number; age: number; life: number; speed: number; angle: number }[] = [];
    
    // Scale for 800x953 map coordinates
    const width = 800;
    const height = 953;
    
    canvas.width = width;
    canvas.height = height;

    const mapLat = (l: number) => {
       const latMax = 37.5;
       const latMin = 8.0;
       return height - ((l - latMin) / (latMax - latMin) * height);
    };
    
    const mapLon = (l: number) => {
       const lonMin = 67.0;
       const lonMax = 98.0;
       return ((l - lonMin) / (lonMax - lonMin) * width);
    };

    const targetX = mapLon(lon);
    const targetY = mapLat(lat);

    const numParticles = Math.min(2500, 300 + windSpeed * 35);
    
    const isCyclonic = pressure < 1000;
    const baseAngle = -Math.PI / 4; // 45 degrees up and right

    for (let i = 0; i < numParticles; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            age: Math.random() * 100,
            life: 40 + Math.random() * 80,
            speed: (windSpeed / 10) * (0.8 + Math.random() * 0.4),
            angle: 0
        });
    }

    const draw = () => {
        // Fade out previous frame using destination-out to keep canvas transparent
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, width, height);
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';

        particles.forEach(p => {
            let dx = p.x - targetX;
            let dy = p.y - targetY;
            let dist = Math.sqrt(dx * dx + dy * dy);
            
            let angle = baseAngle;
            
            if (isCyclonic && dist < 500) {
                // Swirl towards the center (counter-clockwise)
                let angleToCenter = Math.atan2(dy, dx);
                // Counter-clockwise swirl with slight inward spiral
                angle = angleToCenter - Math.PI / 2 - 0.25; 
                p.speed = (windSpeed / 4.5) * (1 - (dist / 600)) + 1.5;
            } else {
                p.speed = (windSpeed / 10) * (0.8 + Math.random() * 0.4);
            }

            // Draw line
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            
            p.x += Math.cos(angle) * p.speed;
            p.y += Math.sin(angle) * p.speed;
            
            ctx.lineTo(p.x, p.y);
            
            const intensityAlpha = Math.min(1, Math.max(0, 1 - Math.abs(p.age - p.life/2) / (p.life/2)));
            
            if (p.speed > 9) {
                ctx.strokeStyle = `rgba(244, 63, 94, ${intensityAlpha})`; // Rose 500 for extreme
            } else if (p.speed > 5) {
                ctx.strokeStyle = `rgba(250, 204, 21, ${intensityAlpha})`; // Yellow 400
            } else {
                ctx.strokeStyle = `rgba(56, 189, 248, ${intensityAlpha})`; // Sky 400
            }
            
            ctx.stroke();

            p.age++;
            if (p.age > p.life || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
                p.x = Math.random() * width;
                p.y = height + Math.random() * 100; // spawn mostly from south
                if (Math.random() > 0.5) {
                    p.x = -100 + Math.random() * 100; // spawn from west
                    p.y = Math.random() * height;
                }
                p.age = 0;
                p.life = 40 + Math.random() * 80;
            }
        });

        // Draw Isobars
        if (isCyclonic) {
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(targetX, targetY, 120 + Math.sin(Date.now() / 600) * 8, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.setLineDash([4, 6]);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(targetX, targetY, 260 + Math.sin(Date.now() / 500 + 1) * 12, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.setLineDash([4, 8]);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(targetX, targetY, 420 + Math.sin(Date.now() / 400 + 2) * 16, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.setLineDash([4, 10]);
            ctx.stroke();
            
            ctx.setLineDash([]);
            
            // Labels
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = 'bold 12px monospace';
            ctx.fillText(`${pressure} hPa`, targetX - 25, targetY - 130);
            ctx.fillText(`${pressure + 4} hPa`, targetX - 30, targetY - 275);
            ctx.fillText(`${pressure + 8} hPa`, targetX - 30, targetY - 435);
        }

        animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
        cancelAnimationFrame(animationFrameId);
    };
  }, [windSpeed, pressure, lat, lon, intensityMm]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none opacity-80"
      style={{ filter: 'drop-shadow(0 0 2px rgba(56,189,248,0.3))' }}
    />
  );
};
