const fs = require('fs');

let content = fs.readFileSync('src/components/RainOverlay.tsx', 'utf-8');

// 1. Increase max Drops drastically
content = content.replace(
  "const maxDrops = 1000;",
  "const maxDrops = 2500;"
);

// 2. Increase Target Drops
content = content.replace(
  "const targetDrops = isHeavy ? 800 + (normalized * 200) : 50 + (normalized * 200);",
  "const targetDrops = isHeavy ? 1500 + (normalized * 1000) : 100 + (normalized * 300);"
);

// 3. Fix Rain drop initial spawn to cover wide area 
content = content.replace(
  "drop.x = Math.random() * (width + height * (windForce/baseSpeedY));",
  "drop.x = -width * 0.5 + Math.random() * (width * 2.5);"
);

// 4. Fix Rain drop reset logic to cover wide area and fix empty screen gaps
const oldReset = `if (drop.y > height - puddleHeight || drop.x < 0) {
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

const newReset = `if (drop.y > height - puddleHeight || drop.x < -100) {
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
            }`;

content = content.replace(oldReset, newReset);

fs.writeFileSync('src/components/RainOverlay.tsx', content);
console.log('patched RainOverlay for full screen coverage');
