const fs = require('fs');
let content = fs.readFileSync('src/utils/audio.ts', 'utf-8');

// Change triangle to sawtooth
content = content.replace(
  "this.rumbleSource.type = 'triangle';",
  "this.rumbleSource.type = 'sawtooth';"
);

// Boost rumble gain
content = content.replace(
  "this.rumbleGain.gain.setTargetAtTime(isHeavy ? 1.0 : (normalizedIntensity * 0.5), t, 0.1);",
  "this.rumbleGain.gain.setTargetAtTime(isHeavy ? 3.0 : (normalizedIntensity * 0.8), t, 0.1);"
);

// Increase filter frequency slightly so the sawtooth harmonics are audible
content = content.replace(
  "this.rumbleFilter.frequency.setTargetAtTime(isHeavy ? 120 : 80, t, 0.1);",
  "this.rumbleFilter.frequency.setTargetAtTime(isHeavy ? 200 : 100, t, 0.1);"
);

// Master gain might need slightly more overall volume for rumble
content = content.replace(
  "this.masterGain.gain.setTargetAtTime(0.3 + (normalizedIntensity * 0.4), t, 0.1);",
  "this.masterGain.gain.setTargetAtTime(0.5 + (normalizedIntensity * 0.5), t, 0.1);"
);

fs.writeFileSync('src/utils/audio.ts', content);
console.log('patched audio');
