const fs = require('fs');

const fullAudioContent = `export class WeatherSynthesizer {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  
  // Rain
  private rainSource: AudioBufferSourceNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private rainGain: GainNode | null = null;
  
  // Wind
  private windSource: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private windLFO: OscillatorNode | null = null;
  private windLFOGain: GainNode | null = null;

  // Thunder
  private thunderSine1: OscillatorNode | null = null;
  private thunderSine2: OscillatorNode | null = null;
  private thunderFilter: BiquadFilterNode | null = null;
  private thunderGain: GainNode | null = null;
  
  // Master
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private stopTimeout: any = null;

  public init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.createNoiseBuffer();
    }
  }

  // Generates 2 seconds of pure white noise that we can filter into rain AND wind
  private createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2; 
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1; // Pure white noise
    }
  }

  private startLoop() {
    if (!this.ctx || !this.noiseBuffer) return;
    
    // --- RAIN LAYER (White noise filtered low) ---
    this.rainSource = this.ctx.createBufferSource();
    this.rainSource.buffer = this.noiseBuffer;
    this.rainSource.loop = true;
    
    this.rainFilter = this.ctx.createBiquadFilter();
    this.rainFilter.type = 'lowpass';
    this.rainFilter.Q.value = 0.5;
    
    this.rainGain = this.ctx.createGain();

    // --- WIND LAYER (White noise with sweeping bandpass filter) ---
    this.windSource = this.ctx.createBufferSource();
    this.windSource.buffer = this.noiseBuffer;
    this.windSource.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass'; // Bandpass creates the "howling" wind effect
    this.windFilter.Q.value = 2.5; // Resonant peak for the howl
    
    this.windGain = this.ctx.createGain();

    // Wind LFO (Low Frequency Oscillator) to automate the howling sweep
    this.windLFO = this.ctx.createOscillator();
    this.windLFO.type = 'sine';
    this.windLFO.frequency.value = 0.3; // Very slow sweep (0.3 times a second)
    
    this.windLFOGain = this.ctx.createGain();
    this.windLFOGain.gain.value = 300; // How much the frequency sweeps (Hz)

    // Connect LFO to Wind Filter Frequency
    this.windLFO.connect(this.windLFOGain);
    this.windLFOGain.connect(this.windFilter.frequency);


    // --- THUNDER LAYER (Detuned sub-bass sines for physical rumble) ---
    this.thunderSine1 = this.ctx.createOscillator();
    this.thunderSine1.type = 'sine'; 
    
    this.thunderSine2 = this.ctx.createOscillator();
    this.thunderSine2.type = 'sine'; 
    
    this.thunderFilter = this.ctx.createBiquadFilter();
    this.thunderFilter.type = 'lowpass';
    this.thunderFilter.Q.value = 0.5; 
    
    this.thunderGain = this.ctx.createGain();
    
    // --- MASTER ---
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0; // start silent

    // Connections
    this.rainSource.connect(this.rainFilter);
    this.rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);

    this.windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    
    this.thunderSine1.connect(this.thunderFilter);
    this.thunderSine2.connect(this.thunderFilter); 
    this.thunderFilter.connect(this.thunderGain);
    this.thunderGain.connect(this.masterGain);
    
    this.masterGain.connect(this.ctx.destination);
    
    // Start all
    this.rainSource.start();
    this.windSource.start();
    this.windLFO.start();
    this.thunderSine1.start();
    this.thunderSine2.start();
    
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
            this.rainSource?.stop();
            this.windSource?.stop();
            this.windLFO?.stop();
            this.thunderSine1?.stop();
            this.thunderSine2?.stop();
            
            this.rainSource?.disconnect();
            this.windSource?.disconnect();
            this.windLFO?.disconnect();
            this.thunderSine1?.disconnect();
            this.thunderSine2?.disconnect();
            
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

    if (this.rainFilter && this.windFilter && this.thunderFilter) {
       
       // 1. RAIN (Decreased sharpness further)
       // Max 600Hz to make it extremely soft and muffled
       this.rainFilter.frequency.setTargetAtTime(isHeavy ? 600 : (150 + normalizedIntensity * 300), t, 0.1);
       this.rainGain!.gain.setTargetAtTime(isHeavy ? 0.8 : 0.1 + (normalizedIntensity * 0.4), t, 0.1);

       // 2. WIND (Fast blowing, howling effect)
       // Base frequency jumps higher during heavy rain
       this.windFilter.frequency.setTargetAtTime(isHeavy ? 600 : 250, t, 0.1);
       // LFO speed increases so the wind "whips" faster
       this.windLFO!.frequency.setTargetAtTime(isHeavy ? 0.8 : 0.2, t, 0.1); 
       // Volume of wind
       this.windGain!.gain.setTargetAtTime(isHeavy ? 1.5 : (normalizedIntensity * 0.5), t, 0.1);
       
       // 3. THUNDER (Deep physical rumble)
       this.thunderFilter.frequency.setTargetAtTime(isHeavy ? 80 : 40, t, 0.1);
       // Massive gain increase for the sub-bass so it shakes
       this.thunderGain!.gain.setTargetAtTime(isHeavy ? 12.0 : (normalizedIntensity * 3.0), t, 0.1);
       
       // Lowered pitch even further to 45Hz & 49Hz for a 4Hz beat frequency (fast rumbling pulse)
       const baseRumble = isHeavy ? 45 : 30;
       this.thunderSine1!.frequency.setTargetAtTime(baseRumble, t, 0.1);
       this.thunderSine2!.frequency.setTargetAtTime(baseRumble + 4, t, 0.1); 
       
       // MASTER VOLUME (Overall lowered slightly to account for added wind and loud thunder)
       this.masterGain!.gain.setTargetAtTime(0.6 + (normalizedIntensity * 0.2), t, 0.1);
    }
  }

  public playRainSound(intensityMm: number) {
      this.setIntensity(intensityMm);
  }
}

export const weatherSynth = new WeatherSynthesizer();
`;

fs.writeFileSync('src/utils/audio.ts', fullAudioContent);
console.log('patched wind audio');
