const fs = require('fs');

const audioContent = `export class WeatherSynthesizer {
  private lightRain: HTMLAudioElement | null = null;
  private heavyRain: HTMLAudioElement | null = null;
  private thunder: HTMLAudioElement | null = null;
  private windLight: HTMLAudioElement | null = null;
  private windHowl: HTMLAudioElement | null = null;
  
  private isInit = false;
  private targetIntensity = 0;
  private stopTimeout: any = null;
  private fadeInterval: any = null;

  private currentLightVol = 0;
  private currentHeavyVol = 0;
  private currentThunderVol = 0;
  private currentWindLightVol = 0;
  private currentWindHowlVol = 0;
  private currentWindPitch = 1.0;

  public init() {
    if (this.isInit) return;
    
    // We use professional recorded audio tracks from Google's sound library
    this.lightRain = new Audio('https://actions.google.com/sounds/v1/weather/light_rain.ogg');
    this.lightRain.loop = true;
    this.lightRain.volume = 0;
    
    this.heavyRain = new Audio('https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg');
    this.heavyRain.loop = true;
    this.heavyRain.volume = 0;
    
    this.thunder = new Audio('https://actions.google.com/sounds/v1/weather/thunderstorm_long.ogg');
    this.thunder.loop = true;
    this.thunder.volume = 0;

    // Added two wind layers: a base windy tone, and a high-pitched howling tone
    this.windLight = new Audio('https://actions.google.com/sounds/v1/weather/wind.ogg');
    this.windLight.loop = true;
    this.windLight.volume = 0;

    this.windHowl = new Audio('https://actions.google.com/sounds/v1/weather/desert_howling_wind.ogg');
    this.windHowl.loop = true;
    this.windHowl.volume = 0;
    
    this.isInit = true;
  }

  private startPlayback() {
    if (!this.isInit) this.init();
    
    // Resume/play all tracks muted
    [this.lightRain, this.heavyRain, this.thunder, this.windLight, this.windHowl].forEach(audio => {
      if (audio && audio.paused) {
        audio.play().catch(() => {});
      }
    });
  }

  public setIntensity(intensityMm: number) {
    if (!this.isInit) this.init();
    
    this.targetIntensity = intensityMm;
    
    if (this.stopTimeout) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }

    if (intensityMm <= 0) {
      this.stopTimeout = setTimeout(() => {
        [this.lightRain, this.heavyRain, this.thunder, this.windLight, this.windHowl].forEach(audio => {
          if (audio) {
            audio.pause();
            audio.currentTime = 0;
          }
        });
      }, 1500);
    } else {
      this.startPlayback();
    }
    
    // Target volumes & pitch based on intensity
    let targetLight = 0;
    let targetHeavy = 0;
    let targetThunder = 0;
    let targetWindLight = 0;
    let targetWindHowl = 0;
    let targetWindPitch = 1.0;

    if (intensityMm > 0) {
      if (intensityMm < 15) { // Drizzle
        targetLight = 0.4;
        targetWindLight = 0.2;
        targetWindPitch = 0.8; // Lower, slower wind
      } else if (intensityMm < 64.5) { // Moderate
        targetLight = 0.5;
        targetHeavy = 0.15;
        targetWindLight = 0.4;
        targetWindHowl = 0.2;
        targetWindPitch = 1.0;
      } else if (intensityMm < 120) { // Heavy Monsoon
        targetLight = 0.1;
        targetHeavy = 0.4;
        targetThunder = 0.2;
        targetWindLight = 0.6;
        targetWindHowl = 0.6;
        targetWindPitch = 1.15; // Starting to howl faster
      } else { // Cyclone level
        targetLight = 0;
        targetHeavy = 0.6;
        targetThunder = 0.7; 
        targetWindLight = 0.8;
        targetWindHowl = 1.0; // Max howl
        targetWindPitch = 1.45; // Pitch stretched high to simulate extreme shrieking wind
      }
    }

    // Smooth fade loop for volumes AND playback rate (pitch)
    if (this.fadeInterval) clearInterval(this.fadeInterval);
    
    this.fadeInterval = setInterval(() => {
      let settled = true;
      
      const fadeStep = 0.05;
      const pitchStep = 0.02;

      const adjust = (current: number, target: number, step: number = fadeStep) => {
        if (Math.abs(current - target) < step) return target;
        settled = false;
        return current < target ? current + step : current - step;
      };

      this.currentLightVol = adjust(this.currentLightVol, targetLight);
      this.currentHeavyVol = adjust(this.currentHeavyVol, targetHeavy);
      this.currentThunderVol = adjust(this.currentThunderVol, targetThunder);
      this.currentWindLightVol = adjust(this.currentWindLightVol, targetWindLight);
      this.currentWindHowlVol = adjust(this.currentWindHowlVol, targetWindHowl);
      
      // Interpolate pitch independently
      this.currentWindPitch = adjust(this.currentWindPitch, targetWindPitch, pitchStep);

      if (this.lightRain) this.lightRain.volume = this.currentLightVol;
      if (this.heavyRain) this.heavyRain.volume = this.currentHeavyVol;
      if (this.thunder) this.thunder.volume = this.currentThunderVol;
      
      if (this.windLight) {
          this.windLight.volume = this.currentWindLightVol;
          // Altering playbackRate natively stretches pitch and tempo
          this.windLight.playbackRate = this.currentWindPitch;
      }
      if (this.windHowl) {
          this.windHowl.volume = this.currentWindHowlVol;
          this.windHowl.playbackRate = this.currentWindPitch;
      }

      if (settled) {
        clearInterval(this.fadeInterval);
      }
    }, 50);
  }

  public playRainSound(intensityMm: number) {
      this.setIntensity(intensityMm);
  }
}

export const weatherSynth = new WeatherSynthesizer();
`;

fs.writeFileSync('src/utils/audio.ts', audioContent);
console.log('Patched audio.ts for wind layers');
