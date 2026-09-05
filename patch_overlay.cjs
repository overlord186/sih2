const fs = require('fs');

let content = fs.readFileSync('src/components/RainOverlay.tsx', 'utf-8');

// Insert particle initialization
content = content.replace(
  "const maxWindLines = 150;",
  "const maxWindLines = 150;\n    const maxParticles = 500;\n    \n    // Wind Particles (Mist/Dust)\n    const particles = Array.from({ length: maxParticles }).map(() => ({\n      x: Math.random() * window.innerWidth,\n      y: Math.random() * window.innerHeight,\n      speedX: 0,\n      speedY: 0,\n      size: 0,\n      opacity: 0,\n      active: false\n    }));"
);

// Insert particle target count
content = content.replace(
  "const targetWindLines = isHeavy ? 80 + (normalized * 70) : 0;",
  "const targetWindLines = isHeavy ? 80 + (normalized * 70) : 0;\n        const targetParticles = isHeavy ? 150 + (normalized * 350) : 0;"
);

// Insert particle rendering
const particleRenderCode = `
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
            ctx.fillStyle = \`rgba(210, 225, 240, \${p.opacity * (normalized * 1.5)})\`;
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
`;

content = content.replace(
  "// 5. Draw Rain Drops (Slanted by wind)",
  particleRenderCode + "\n        // 5. Draw Rain Drops (Slanted by wind)"
);

fs.writeFileSync('src/components/RainOverlay.tsx', content);
console.log('patched RainOverlay.tsx');
