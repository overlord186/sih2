const fs = require('fs');
let content = fs.readFileSync('src/utils/audio.ts', 'utf-8');

// The sawtooth caused the "grass cutter" buzzing sound. Let's switch to a filtered square wave with a dedicated sub-bass sine wave.
const newSynthMethod = `
  private startLoop() {
    if (!this.ctx || !this.noiseBuffer) return;
    
    // 1. Rain Noise (Pink Noise)
    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = this.noiseBuffer;
    this.noiseSource.loop = true;
    
    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseFilter.type = 'lowpass';
    this.noiseFilter.Q.value = 0.5;
    
    this.noiseGain = this.ctx.createGain();
    
    // 2. Thunder Rumble (Sub-Bass Sine Wave + Low-passed Square for grit)
    this.rumbleSource = this.ctx.createOscillator();
    this.rumbleSource.type = 'sine'; // Sub-bass foundation
    
    // Add a second oscillator for the "crackle" of thunder
    this.crackleSource = this.ctx.createOscillator();
    this.crackleSource.type = 'square';
    
    this.rumbleFilter = this.ctx.createBiquadFilter();
    this.rumbleFilter.type = 'lowpass';
    // Steep filter to keep the square wave from sounding like a buzzer, only letting the low growl through
    this.rumbleFilter.Q.value = 2; 
    
    this.rumbleGain = this.ctx.createGain();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0; // start silent

    // Connections
    this.noiseSource.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);
    
    this.rumbleSource.connect(this.rumbleFilter);
    this.crackleSource.connect(this.rumbleFilter); // Both thunder synths share the filter
    this.rumbleFilter.connect(this.rumbleGain);
    this.rumbleGain.connect(this.masterGain);
    
    this.masterGain.connect(this.ctx.destination);
    
    this.noiseSource.start();
    this.rumbleSource.start();
    this.crackleSource.start();
    
    this.isPlaying = true;
  }
`;

const setIntensityMethod = `
  public setIntensity(intensityMm: number) {
    if (!this.ctx || !this.noiseBuffer) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;
    
    if (this.stopTimeout) {
        clearTimeout(this.stopTimeout);
        this.stopTimeout = null;
    }

    if (intensityMm === 0) {
      if (this.isPlaying && this.masterGain) {
        this.masterGain.gain.setTargetAtTime(0, t, 0.3);
        this.stopTimeout = setTimeout(() => {
            this.noiseSource?.stop();
            this.rumbleSource?.stop();
            if ((this as any).crackleSource) (this as any).crackleSource.stop();
            this.noiseSource?.disconnect();
            this.rumbleSource?.disconnect();
            if ((this as any).crackleSource) (this as any).crackleSource.disconnect();
            this.isPlaying = false;
        }, 1500);
      }
      return;
    }

    if (!this.isPlaying) {
      this.startLoop();
    }

    const isHeavy = intensityMm >= 64.5;
    const normalizedIntensity = Math.min(1, Math.max(0, intensityMm / 150));

    if (this.noiseFilter && this.noiseGain && this.rumbleFilter && this.rumbleGain && this.masterGain && this.rumbleSource) {
       // Rain parameters
       this.noiseFilter.frequency.setTargetAtTime(isHeavy ? 4000 : (400 + normalizedIntensity * 1000), t, 0.1);
       this.noiseGain.gain.setTargetAtTime(isHeavy ? 1.0 : 0.2 + (normalizedIntensity * 0.5), t, 0.1);
       
       // Thunder parameters
       // Keep filter low to prevent buzzing (grass cutter), emphasize deep bass
       this.rumbleFilter.frequency.setTargetAtTime(isHeavy ? 150 : 60, t, 0.1);
       
       // Push the gain hard for heavy storms
       this.rumbleGain.gain.setTargetAtTime(isHeavy ? 4.0 : (normalizedIntensity * 0.5), t, 0.1);
       
       // Pitch: Deep 45Hz sub-bass, dipping slightly for rumble effect
       const baseRumble = isHeavy ? 45 : 30;
       this.rumbleSource.frequency.setTargetAtTime(baseRumble, t, 0.1);
       if ((this as any).crackleSource) {
           (this as any).crackleSource.frequency.setTargetAtTime(baseRumble * 0.98, t, 0.1); // Slightly detuned square for phase grit
       }
       
       this.masterGain.gain.setTargetAtTime(0.6 + (normalizedIntensity * 0.4), t, 0.1);
    }
  }
`;

// Replace startLoop
content = content.replace(/private startLoop\(\) \{[\s\S]*?this\.isPlaying = true;\n  \}/, newSynthMethod.trim());

// Replace setIntensity
content = content.replace(/public setIntensity\(intensityMm: number\) \{[\s\S]*?\/\/ Backwards compatibility/m, setIntensityMethod.trim() + '\n\n  // Backwards compatibility');

// Add crackleSource to class properties
content = content.replace('private rumbleSource: OscillatorNode | null = null;', 'private rumbleSource: OscillatorNode | null = null;\n  private crackleSource: OscillatorNode | null = null;');

fs.writeFileSync('src/utils/audio.ts', content);
console.log('patched audio thunder');
