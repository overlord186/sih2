const fs = require('fs');

const fullAudioContent = `export class WeatherSynthesizer {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;
  
  private rumbleSource: OscillatorNode | null = null;
  private crackleSource: OscillatorNode | null = null;
  private rumbleFilter: BiquadFilterNode | null = null;
  private rumbleGain: GainNode | null = null;
  
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private stopTimeout: any = null;

  public init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.createPinkNoiseBuffer();
    }
  }

  private createPinkNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    
    // Paul Kellet's refined Pink Noise algorithm for natural water/wind sound
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11; // Compensate for gain
        b6 = white * 0.115926;
    }
  }

  private startLoop() {
    if (!this.ctx || !this.noiseBuffer) return;
    
    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = this.noiseBuffer;
    this.noiseSource.loop = true;
    
    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseFilter.type = 'lowpass';
    this.noiseFilter.Q.value = 0.5;
    
    this.noiseGain = this.ctx.createGain();
    
    // 2. Thunder Rumble (Two Sine waves for a beating, throbbing rumble with NO sharp edges)
    this.rumbleSource = this.ctx.createOscillator();
    this.rumbleSource.type = 'sine'; 
    
    this.crackleSource = this.ctx.createOscillator();
    this.crackleSource.type = 'sine'; // SINE wave instead of square to completely eliminate buzz
    
    this.rumbleFilter = this.ctx.createBiquadFilter();
    this.rumbleFilter.type = 'lowpass';
    this.rumbleFilter.Q.value = 0.5; // Removed resonance peak that caused sharpness
    
    this.rumbleGain = this.ctx.createGain();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0; // start silent

    // Connections
    this.noiseSource.connect(this.noiseFilter);
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);
    
    this.rumbleSource.connect(this.rumbleFilter);
    this.crackleSource.connect(this.rumbleFilter); 
    this.rumbleFilter.connect(this.rumbleGain);
    this.rumbleGain.connect(this.masterGain);
    
    this.masterGain.connect(this.ctx.destination);
    
    this.noiseSource.start();
    this.rumbleSource.start();
    this.crackleSource.start();
    
    this.isPlaying = true;
  }

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
            if (this.crackleSource) this.crackleSource.stop();
            this.noiseSource?.disconnect();
            this.rumbleSource?.disconnect();
            if (this.crackleSource) this.crackleSource.disconnect();
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

    if (this.noiseFilter && this.noiseGain && this.rumbleFilter && this.rumbleGain && this.masterGain && this.rumbleSource && this.crackleSource) {
       // RAIN: Drastically lower the frequency to remove the static/sharpness
       // Max 1000Hz (down from 4000Hz) to sound muffled and watery
       this.noiseFilter.frequency.setTargetAtTime(isHeavy ? 1000 : (200 + normalizedIntensity * 400), t, 0.1);
       this.noiseGain.gain.setTargetAtTime(isHeavy ? 1.5 : 0.2 + (normalizedIntensity * 0.8), t, 0.1);
       
       // THUNDER: Deep bass filter (100Hz max)
       this.rumbleFilter.frequency.setTargetAtTime(isHeavy ? 100 : 50, t, 0.1);
       
       // High gain for the sub-bass so it feels rumbling and present
       this.rumbleGain.gain.setTargetAtTime(isHeavy ? 8.0 : (normalizedIntensity * 2.0), t, 0.1);
       
       // PITCH: Use a "beating" effect. Two sine waves slightly detuned (e.g. 55Hz and 58Hz) 
       // create a physical pulsing/rumbling sound with absolutely zero sharp harmonics.
       const baseRumble = isHeavy ? 55 : 40;
       this.rumbleSource.frequency.setTargetAtTime(baseRumble, t, 0.1);
       this.crackleSource.frequency.setTargetAtTime(baseRumble + (isHeavy ? 3 : 1.5), t, 0.1); 
       
       this.masterGain.gain.setTargetAtTime(0.7 + (normalizedIntensity * 0.3), t, 0.1);
    }
  }

  // Backwards compatibility if called elsewhere
  public playRainSound(intensityMm: number) {
      this.setIntensity(intensityMm);
  }
}

export const weatherSynth = new WeatherSynthesizer();
`;

fs.writeFileSync('src/utils/audio.ts', fullAudioContent);
console.log('patched smooth audio');
