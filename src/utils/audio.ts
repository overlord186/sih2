export class WeatherSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private thunderGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private reverbGain: GainNode | null = null;

  private windFilter: BiquadFilterNode | null = null;
  private thunderFilter: BiquadFilterNode | null = null;

  private isInit = false;
  private _muted = true; // Default to muted until user enables sound
  private currentIntensity = 0;
  private dropInterval: any = null;

  // Synthesize an Impulse Response (IR) for lush spatial acoustic reverberation
  private createReverbBuffer(ctx: AudioContext, duration = 3.5, decay = 2.8) {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    for (let i = 0; i < length; i++) {
      const n = i / length;
      const fade = Math.pow(1 - n, decay);
      left[i] = (Math.random() * 2 - 1) * fade;
      right[i] = (Math.random() * 2 - 1) * fade;
    }
    return impulse;
  }

  // Synthesize pink/brownian noise buffer for continuous natural rain
  private createRainNoiseBuffer(ctx: AudioContext, duration = 5.0) {
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    const left = noiseBuffer.getChannelData(0);
    const right = noiseBuffer.getChannelData(1);
    let b0L = 0, b1L = 0, b2L = 0, b3L = 0;
    let b0R = 0, b1R = 0, b2R = 0, b3R = 0;

    for (let i = 0; i < bufferSize; i++) {
      // Left channel pink-brown noise
      const whiteL = Math.random() * 2 - 1;
      b0L = 0.99886 * b0L + whiteL * 0.0555179;
      b1L = 0.99332 * b1L + whiteL * 0.0750759;
      b2L = 0.96900 * b2L + whiteL * 0.1538520;
      b3L = 0.86650 * b3L + whiteL * 0.3104856;
      left[i] = (b0L + b1L + b2L + b3L) * 0.22 + (Math.random() > 0.994 ? (Math.random() - 0.5) * 0.6 : 0);

      // Right channel pink-brown noise with slight decorrelation
      const whiteR = Math.random() * 2 - 1;
      b0R = 0.99886 * b0R + whiteR * 0.0555179;
      b1R = 0.99332 * b1R + whiteR * 0.0750759;
      b2R = 0.96900 * b2R + whiteR * 0.1538520;
      b3R = 0.86650 * b3R + whiteR * 0.3104856;
      right[i] = (b0R + b1R + b2R + b3R) * 0.22 + (Math.random() > 0.994 ? (Math.random() - 0.5) * 0.6 : 0);
    }
    return noiseBuffer;
  }

  public init() {
    if (this.isInit && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      this.ctx = ctx;

      // Master Gain
      const master = ctx.createGain();
      master.gain.value = this._muted ? 0.0001 : 0.9;
      master.connect(ctx.destination);
      this.masterGain = master;

      // Convolver Reverb
      const convolver = ctx.createConvolver();
      convolver.buffer = this.createReverbBuffer(ctx, 3.2, 2.5);
      const reverbG = ctx.createGain();
      reverbG.gain.value = 0.22;
      convolver.connect(reverbG);
      reverbG.connect(master);
      this.reverbGain = reverbG;

      // 1. Procedural Rain Sound Generator
      const rainBuffer = this.createRainNoiseBuffer(ctx, 4.0);
      const rainSource = ctx.createBufferSource();
      rainSource.buffer = rainBuffer;
      rainSource.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'bandpass';
      rainFilter.frequency.value = 1400;
      rainFilter.Q.value = 0.65;

      const rainG = ctx.createGain();
      rainG.gain.value = 0.14; // Gentle ambient baseline
      rainSource.connect(rainFilter);
      rainFilter.connect(rainG);
      rainG.connect(master);
      rainG.connect(convolver);
      rainSource.start();
      this.rainGain = rainG;

      // 2. Procedural Wind & Gusts Generator
      const windBuffer = this.createRainNoiseBuffer(ctx, 5.0);
      const windSource = ctx.createBufferSource();
      windSource.buffer = windBuffer;
      windSource.loop = true;

      const windF = ctx.createBiquadFilter();
      windF.type = 'lowpass';
      windF.frequency.value = 380;
      this.windFilter = windF;

      const windG = ctx.createGain();
      windG.gain.value = 0.12; // Soft gentle breeze baseline
      windSource.connect(windF);
      windF.connect(windG);
      windG.connect(master);
      windSource.start();
      this.windGain = windG;

      // 3. Ambient Atmospheric Monsoon Drone (Deep warm harmonic pad)
      const droneOsc1 = ctx.createOscillator();
      const droneOsc2 = ctx.createOscillator();
      droneOsc1.type = 'sine';
      droneOsc2.type = 'sine';
      droneOsc1.frequency.value = 55; // A1
      droneOsc2.frequency.value = 82.4; // E2 (Perfect fifth)

      const droneF = ctx.createBiquadFilter();
      droneF.type = 'lowpass';
      droneF.frequency.value = 220;

      const droneG = ctx.createGain();
      droneG.gain.value = 0.18; // Ethereal base layer, clearly audible
      droneOsc1.connect(droneF);
      droneOsc2.connect(droneF);
      droneF.connect(droneG);
      droneG.connect(master);
      droneOsc1.start();
      droneOsc2.start();
      this.ambientGain = droneG;

      // 4. Low-Frequency Thunder / Storm Rumble Generator
      const thunderOsc = ctx.createOscillator();
      thunderOsc.type = 'sawtooth';
      thunderOsc.frequency.value = 42;

      const thunderF = ctx.createBiquadFilter();
      thunderF.type = 'lowpass';
      thunderF.frequency.value = 90;
      this.thunderFilter = thunderF;

      const thunderG = ctx.createGain();
      thunderG.gain.value = 0.0001; // Silent until storms
      thunderOsc.connect(thunderF);
      thunderF.connect(thunderG);
      thunderG.connect(master);
      thunderG.connect(convolver);
      thunderOsc.start();
      this.thunderGain = thunderG;

      // Periodic natural raindrop plinks
      this.startRaindropEngine();

      this.isInit = true;
    } catch (e) {
      console.warn("Weather audio synthesis initialization:", e);
    }
  }

  // Periodic droplet pings with soft melodic resonance
  private startRaindropEngine() {
    if (this.dropInterval) clearInterval(this.dropInterval);
    this.dropInterval = setInterval(() => {
      if (!this.ctx || this._muted || this.ctx.state === 'suspended') return;

      try {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        // Random micro droplet pitch
        const freq = 1200 + Math.random() * 1600;
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t + 0.06);

        const dropVol = Math.min(0.08, 0.02 + this.currentIntensity * 0.0008);
        gain.gain.setValueAtTime(dropVol, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

        osc.connect(gain);
        if (this.masterGain) gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.09);
      } catch {}
    }, 450);
  }

  public setIntensity(intensityMm: number) {
    this.currentIntensity = intensityMm;
    if (!this.ctx || !this.isInit) return;

    const t = this.ctx.currentTime;
    const TIME_CONST = 0.3;

    // Calculate dynamic audio gains based on meteorological intensity
    let rVol = 0.12; // Base rain volume
    let wVol = 0.10; // Base wind volume
    let tVol = 0.0001; // Base thunder
    let wFreq = 380;
    let revMix = 0.18;

    if (intensityMm > 0 && intensityMm < 15) {
      // Light rain
      rVol = 0.24;
      wVol = 0.16;
      wFreq = 480;
      revMix = 0.22;
    } else if (intensityMm >= 15 && intensityMm < 64.5) {
      // Moderate monsoon rain
      rVol = 0.42;
      wVol = 0.28;
      wFreq = 680;
      tVol = 0.04;
      revMix = 0.35;
    } else if (intensityMm >= 64.5 && intensityMm < 120) {
      // Heavy torrential rainfall
      rVol = 0.65;
      wVol = 0.45;
      wFreq = 950;
      tVol = 0.18;
      revMix = 0.55;
    } else if (intensityMm >= 120) {
      // Cyclonic / Extreme cloudburst
      rVol = 0.88;
      wVol = 0.68;
      wFreq = 1300;
      tVol = 0.45;
      revMix = 0.85;
    }

    if (this.rainGain) {
      this.rainGain.gain.setTargetAtTime(rVol, t, TIME_CONST);
    }
    if (this.windGain) {
      this.windGain.gain.setTargetAtTime(wVol, t, TIME_CONST);
    }
    if (this.windFilter) {
      this.windFilter.frequency.setTargetAtTime(wFreq, t, TIME_CONST);
    }
    if (this.thunderGain) {
      this.thunderGain.gain.setTargetAtTime(tVol, t, TIME_CONST);
    }
    if (this.reverbGain) {
      this.reverbGain.gain.setTargetAtTime(revMix, t, TIME_CONST);
    }
  }

  public playRainSound(intensityMm: number) {
    this.setIntensity(intensityMm);
  }

  public get isMuted(): boolean {
    return this._muted;
  }

  public setMuted(muted: boolean) {
    this._muted = muted;
    if (!this.isInit) {
      this.init();
    }

    if (this.ctx) {
      if (muted) {
        if (this.masterGain) {
          const t = this.ctx.currentTime;
          this.masterGain.gain.cancelScheduledValues(t);
          this.masterGain.gain.setTargetAtTime(0.0001, t, 0.08);
        }
      } else {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        if (this.masterGain) {
          const t = this.ctx.currentTime;
          this.masterGain.gain.cancelScheduledValues(t);
          this.masterGain.gain.setValueAtTime(0.9, t);
        }
        // Play an immediate sweet confirmation chime to confirm audio is active
        this.playConfirmationTone();
        // Ensure intensity gains are applied
        this.setIntensity(this.currentIntensity);
      }
    }
  }

  // Play a soft bell/chime on sound un-mute
  public playConfirmationTone() {
    if (!this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const t = this.ctx.currentTime;
      // Majestic chord: C5, E5, G5, C6
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        const start = t + idx * 0.06;
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.18 / (idx + 1), start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(start);
        osc.stop(start + 0.65);
      });
    } catch {}
  }

  // Play a dynamic water splash sound effect
  public playSplashSound(strength: number = 1.0) {
    if (!this.ctx || this._muted) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const ctx = this.ctx;
      const t = ctx.currentTime;
      const bufferSize = Math.floor(ctx.sampleRate * 0.25);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.06));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800 + Math.random() * 500, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(Math.min(0.3, 0.12 * strength), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(t);
    } catch {}
  }

  // Dropsonde ejection hiss & telemetry chirp
  public playDropsondeReleaseSound() {
    if (!this.ctx || this._muted) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      const ctx = this.ctx;
      const t = ctx.currentTime;

      // 1. Pneumatic ejection hiss (filtered noise)
      const bufSize = Math.floor(ctx.sampleRate * 0.18);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
      const hissSrc = ctx.createBufferSource();
      hissSrc.buffer = buf;
      const hissFilter = ctx.createBiquadFilter();
      hissFilter.type = 'highpass';
      hissFilter.frequency.setValueAtTime(2400, t);
      const hissGain = ctx.createGain();
      hissGain.gain.setValueAtTime(0.2, t);
      hissGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      hissSrc.connect(hissFilter);
      hissFilter.connect(hissGain);
      hissGain.connect(ctx.destination);
      hissSrc.start(t);

      // 2. High-tech dual telemetry pings (descending tones)
      [1760, 1318.5, 2093].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        const start = t + 0.08 + idx * 0.05;
        osc.frequency.setValueAtTime(f, start);
        osc.frequency.exponentialRampToValueAtTime(f * 0.85, start + 0.08);
        g.gain.setValueAtTime(0.08, start);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.08);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.09);
      });
    } catch {}
  }

  // Thunder crackle and rolling rumble for lightning events
  public playLightningThunderCrack() {
    if (!this.ctx || this._muted) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      const ctx = this.ctx;
      const t = ctx.currentTime;

      // Sharp initial electrostatic snap
      const snapOsc = ctx.createOscillator();
      const snapG = ctx.createGain();
      snapOsc.type = 'sawtooth';
      snapOsc.frequency.setValueAtTime(160, t);
      snapOsc.frequency.exponentialRampToValueAtTime(30, t + 0.09);
      snapG.gain.setValueAtTime(0.28, t);
      snapG.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      snapOsc.connect(snapG);
      snapG.connect(ctx.destination);
      snapOsc.start(t);
      snapOsc.stop(t + 0.15);

      // Low rolling acoustic reverberation
      const bufSize = Math.floor(ctx.sampleRate * 1.6);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let val = 0;
      for (let i = 0; i < bufSize; i++) {
        val = (val * 0.96) + (Math.random() * 2 - 1) * 0.15;
        data[i] = val * Math.exp(-i / (ctx.sampleRate * 0.65));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(140, t);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.25, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      noise.connect(f);
      f.connect(g);
      g.connect(ctx.destination);
      noise.start(t + 0.03);
    } catch {}
  }

  // Doppler radar acoustic sweep ping
  public playRadarScanPing() {
    if (!this.ctx || this._muted) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      const ctx = this.ctx;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2200, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.14);
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    } catch {}
  }

  // Satellite Radiometer Scan pulse
  public playSatelliteSwathSweep() {
    if (!this.ctx || this._muted) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      const ctx = this.ctx;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(950, t);
      osc.frequency.linearRampToValueAtTime(1450, t + 0.12);
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    } catch {}
  }

  // Emergency Red Alert Siren chirp
  public playCrisisAlertTone() {
    if (!this.ctx || this._muted) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      const ctx = this.ctx;
      const t = ctx.currentTime;
      [800, 1100, 800, 1100].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        const start = t + idx * 0.12;
        osc.frequency.setValueAtTime(freq, start);
        g.gain.setValueAtTime(0.12, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.11);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.12);
      });
    } catch {}
  }

  // Mission Complete / Victory Fanfare
  public playMissionSuccessFanfare() {
    if (!this.ctx || this._muted) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      const ctx = this.ctx;
      const t = ctx.currentTime;
      const chord = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        const start = t + idx * 0.08;
        osc.frequency.setValueAtTime(freq, start);
        g.gain.setValueAtTime(0.15, start);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.8);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.85);
      });
    } catch {}
  }

  // Daily Challenge Correct Answer Celebration Jingle
  public playChallengeCorrectSound() {
    if (!this.ctx || this._muted) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      const ctx = this.ctx;
      const t = ctx.currentTime;
      // Arpeggiated C-Major to E-High with warm overtone chime
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5, E5, G5, C6, E6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        const start = t + idx * 0.09;
        osc.frequency.setValueAtTime(freq, start);
        g.gain.setValueAtTime(0.2, start);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.65);
      });
    } catch {}
  }

  // Daily Challenge Incorrect Answer Gentle Thud
  public playChallengeWrongSound() {
    if (!this.ctx || this._muted) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      const ctx = this.ctx;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.35);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    } catch {}
  }

  // Achievement Badge Unlock Sparkling Fanfare
  public playBadgeUnlockSound() {
    if (!this.ctx || this._muted) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      const ctx = this.ctx;
      const t = ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51, 1760]; // A major glissando
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        const start = t + idx * 0.06;
        osc.frequency.setValueAtTime(freq, start);
        g.gain.setValueAtTime(0.18, start);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.55);
      });
    } catch {}
  }

  public toggleMute(): boolean {
    this.setMuted(!this._muted);
    return this._muted;
  }
}

export const weatherSynth = new WeatherSynthesizer();
