export class WeatherSynthesizer {
  private ctx: AudioContext | null = null;
  private convolver: ConvolverNode | null = null;
  
  private wetGain: GainNode | null = null;
  private dryGain: GainNode | null = null;

  private tracks: Record<string, { audio: HTMLAudioElement, gain: GainNode }> = {};
  
  private isInit = false;
  private stopTimeout: any = null;

  // Synthesizes an Impulse Response (IR) for the Reverb convolution
  private createReverbBuffer(ctx: AudioContext, duration: number, decay: number) {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    for (let i = 0; i < length; i++) {
      const n = i / length;
      const fade = Math.pow(1 - n, decay);
      // White noise tapered by an exponential decay creates a vast, realistic space
      left[i] = (Math.random() * 2 - 1) * fade;
      right[i] = (Math.random() * 2 - 1) * fade;
    }
    return impulse;
  }

  public init() {
    if (this.isInit) return;
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.dryGain = this.ctx.createGain();
      this.dryGain.connect(this.ctx.destination);

      this.wetGain = this.ctx.createGain();
      this.wetGain.gain.value = 0;
      this.wetGain.connect(this.ctx.destination);

      // Create a 4.5 second long reverb tail
      this.convolver = this.ctx.createConvolver();
      this.convolver.buffer = this.createReverbBuffer(this.ctx, 4.5, 3.5); 
      this.convolver.connect(this.wetGain);

      const setupTrack = (key: string, url: string) => {
        const audio = new Audio(url);
        audio.crossOrigin = "anonymous";
        audio.loop = true;
        // Native volume stays at max. We control fading perfectly via Web Audio GainNodes
        audio.volume = 1; 
        
        const source = this.ctx!.createMediaElementSource(audio);
        const gain = this.ctx!.createGain();
        gain.gain.value = 0;
        
        source.connect(gain);
        
        // Split the signal into the Dry mix and the Wet (Reverb) mix
        gain.connect(this.dryGain!);
        gain.connect(this.convolver!);
        
        this.tracks[key] = { audio, gain };
      };

      setupTrack('lightRain', 'https://actions.google.com/sounds/v1/weather/light_rain.ogg');
      setupTrack('heavyRain', 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg');
      setupTrack('thunder', 'https://actions.google.com/sounds/v1/weather/thunderstorm_long.ogg');
      setupTrack('windLight', 'https://actions.google.com/sounds/v1/weather/wind.ogg');
      setupTrack('windHowl', 'https://actions.google.com/sounds/v1/weather/desert_howling_wind.ogg');
      
      this.isInit = true;
    } catch(e) {
      console.error("Audio init failed", e);
    }
  }

  private startPlayback() {
    if (!this.isInit) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
    }
    
    Object.values(this.tracks).forEach(({ audio }) => {
      if (audio.paused) {
        audio.play().catch(() => {});
      }
    });
  }

  public setIntensity(intensityMm: number) {
    if (!this.isInit) this.init();
    if (!this.ctx) return;
    
    if (this.stopTimeout) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }

    const t = this.ctx.currentTime;

    if (intensityMm <= 0) {
      // Fade out smoothly
      Object.values(this.tracks).forEach(({ gain }) => {
        gain.gain.setTargetAtTime(0, t, 0.3);
      });
      this.stopTimeout = setTimeout(() => {
        Object.values(this.tracks).forEach(({ audio }) => {
          audio.pause();
          audio.currentTime = 0;
        });
      }, 1500);
      return;
    } 
    
    this.startPlayback();
    
    let tLight = 0, tHeavy = 0, tThunder = 0, tWindLight = 0, tWindHowl = 0;
    let windPitch = 1.0;
    
    let wetMix = 0; // Reverb volume
    let dryMix = 1.0; // Direct audio volume

    if (intensityMm < 15) { 
      tLight = 0.4;
      tWindLight = 0.2;
      windPitch = 0.8; 
      wetMix = 0.05;
    } else if (intensityMm < 64.5) { 
      tLight = 0.5;
      tHeavy = 0.15;
      tWindLight = 0.4;
      tWindHowl = 0.2;
      windPitch = 1.0;
      wetMix = 0.2;
    } else if (intensityMm < 120) { 
      tLight = 0.1;
      tHeavy = 0.4;
      tThunder = 0.2;
      tWindLight = 0.6;
      tWindHowl = 0.6;
      windPitch = 1.15; 
      wetMix = 0.8; 
      dryMix = 0.7; // Lower direct audio slightly to add distance
    } else { 
      tLight = 0;
      tHeavy = 0.6;
      tThunder = 0.7; 
      tWindLight = 0.8;
      tWindHowl = 1.0; 
      windPitch = 1.45; 
      wetMix = 1.8; // Massive reverb wash for cyclone
      dryMix = 0.4; // Very distant/enveloping
    }

    // Apply exact audio targets natively through the Web Audio graph
    const TIME_CONSTANT = 0.5; 
    this.tracks['lightRain'].gain.gain.setTargetAtTime(tLight, t, TIME_CONSTANT);
    this.tracks['heavyRain'].gain.gain.setTargetAtTime(tHeavy, t, TIME_CONSTANT);
    this.tracks['thunder'].gain.gain.setTargetAtTime(tThunder, t, TIME_CONSTANT);
    this.tracks['windLight'].gain.gain.setTargetAtTime(tWindLight, t, TIME_CONSTANT);
    this.tracks['windHowl'].gain.gain.setTargetAtTime(tWindHowl, t, TIME_CONSTANT);
    
    // Crossfade the reverb effect
    this.wetGain!.gain.setTargetAtTime(wetMix, t, TIME_CONSTANT);
    this.dryGain!.gain.setTargetAtTime(dryMix, t, TIME_CONSTANT);

    // Slide pitch dynamically for wind tracks
    let currentPitch = this.tracks['windHowl'].audio.playbackRate;
    const slidePitch = () => {
       if (Math.abs(currentPitch - windPitch) < 0.02) {
           currentPitch = windPitch;
       } else {
           currentPitch += (windPitch - currentPitch) * 0.1;
           requestAnimationFrame(slidePitch);
       }
       this.tracks['windLight'].audio.playbackRate = currentPitch;
       this.tracks['windHowl'].audio.playbackRate = currentPitch;
    };
    slidePitch();
  }

  public playRainSound(intensityMm: number) {
      this.setIntensity(intensityMm);
  }
}

export const weatherSynth = new WeatherSynthesizer();
