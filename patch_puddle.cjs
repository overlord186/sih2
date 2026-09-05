const fs = require('fs');

let content = fs.readFileSync('src/components/RainOverlay.tsx', 'utf-8');

// Insert puddle state and ripples
content = content.replace(
  "const maxParticles = 500;",
  "const maxParticles = 500;\n    \n    // Puddle and Ripples State\n    let puddleHeight = 0;\n    const ripples: { x: number, y: number, radius: number, maxRadius: number, life: number, speed: number }[] = [];"
);

// Puddle math in render
content = content.replace(
  "// 1. Lightning Flash Background",
  `
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
        
        // 1. Lightning Flash Background`
);

// Alter Rain Drop resetting logic to spawn ripples
const oldRainReset = `if (drop.y > height || drop.x < 0) {
              drop.y = -drop.length;
              drop.x = Math.random() * width + (height * (drop.speedX / drop.speedY));
            }`;

const newRainReset = `if (drop.y > height - puddleHeight || drop.x < 0) {
              // Spawn a ripple when hitting the puddle surface
              if (drop.y > height - puddleHeight && puddleHeight > 0 && Math.random() > (isCyclone ? 0.2 : 0.6)) {
                ripples.push({
                  x: drop.x,
                  y: height - puddleHeight + (Math.random() * puddleHeight),
                  radius: 1,
                  maxRadius: 10 + Math.random() * 20,
                  life: 1.0,
                  speed: 0.5 + Math.random() * 1.5
                });
              }
              drop.y = -drop.length;
              drop.x = Math.random() * width + (height * (drop.speedX / drop.speedY));
            }`;

content = content.replace(oldRainReset, newRainReset);

// Render the puddle and ripples at the end of the loop, inside if(currentIntensity > 0)
const endOfLoop = `}
      }

      animationId = requestAnimationFrame(render);`;

const renderPuddle = `}
        
        // 6. Draw Puddle and Ripples
        if (puddleHeight > 0) {
           ctx.lineWidth = 1;
           for (let i = ripples.length - 1; i >= 0; i--) {
             const r = ripples[i];
             ctx.beginPath();
             ctx.strokeStyle = \`rgba(180, 200, 220, \${r.life * (isCyclone ? 0.6 : 0.3)})\`;
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

      animationId = requestAnimationFrame(render);`;

content = content.replace(endOfLoop, renderPuddle);

fs.writeFileSync('src/components/RainOverlay.tsx', content);
console.log('patched puddle physics');
