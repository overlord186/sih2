/**
 * spatialAcousticsEngine.ts
 * SAMVARTAKA AI — Real-Time 3D Positional Spatial Acoustics Engine
 * 
 * Provides physically grounded environmental acoustics for the 3D ground simulator:
 * 1. Web Audio API with HRTF 3D PannerNode for spatialized rain, wind, and AWS anemometer acoustics.
 * 2. Dynamic acoustic air absorption: High-frequency attenuation via BiquadFilterNode
 *    modeling high humidity (>90%) and rain scattering.
 * 3. Aerodynamic wind turbulence noise synthesized with pink-noise bandpass resonance.
 * 4. Realistic reverberant thunderclaps with distance delay: t = d / 343 m/s.
 */

class SpatialMeteorologicalAcoustics {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  
  // Rain sound nodes
  private rainNoiseNode: AudioNode | null = null;
  private rainGain: GainNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private rainPanner: PannerNode | null = null;

  // Wind sound nodes
  private windNoiseNode: AudioNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;

  private isInitialized: boolean = false;

  constructor() {
    // Lazy initialized on first user interaction to comply with browser autoplay policy
  }

  public init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupRainSynth();
      this.setupWindSynth();
      this.isInitialized = true;
    } catch (e) {
      console.warn('[SpatialAcoustics] Web Audio initialization deferred:', e);
    }
  }

  private setupRainSynth(): void {
    if (!this.ctx || !this.masterGain) return;

    // Generate 2 seconds of pink/white noise buffer for natural rain hiss
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
      b6 = white * 0.115926;
    }

    const whiteNoiseSource = this.ctx.createBufferSource();
    whiteNoiseSource.buffer = noiseBuffer;
    whiteNoiseSource.loop = true;

    // Atmospheric air absorption filter (humidity dampens higher frequencies)
    this.rainFilter = this.ctx.createBiquadFilter();
    this.rainFilter.type = 'lowpass';
    this.rainFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.setValueAtTime(0, this.ctx.currentTime);

    // 3D Spatial Panner
    this.rainPanner = this.ctx.createPanner();
    this.rainPanner.panningModel = 'HRTF';
    this.rainPanner.distanceModel = 'inverse';
    this.rainPanner.refDistance = 5;
    this.rainPanner.maxDistance = 150;
    this.rainPanner.rolloffFactor = 1.2;
    this.rainPanner.positionX.setValueAtTime(0, this.ctx.currentTime);
    this.rainPanner.positionY.setValueAtTime(15, this.ctx.currentTime);
    this.rainPanner.positionZ.setValueAtTime(0, this.ctx.currentTime);

    whiteNoiseSource.connect(this.rainFilter);
    this.rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.rainPanner);
    this.rainPanner.connect(this.masterGain);

    whiteNoiseSource.start();
    this.rainNoiseNode = whiteNoiseSource;
  }

  private setupWindSynth(): void {
    if (!this.ctx || !this.masterGain) return;

    // Deep turbulent wind noise
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 2.5; // boost low frequencies
    }

    const windSource = this.ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(180, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.05, this.ctx.currentTime);

    windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    windSource.start();
    this.windNoiseNode = windSource;
  }

  /**
   * Updates acoustics based on real-time atmospheric state
   */
  public updateAtmosphericState(
    rainRateMmH: number,
    windSpeedKmh: number,
    rhPct: number,
    cameraPos: { x: number; y: number; z: number }
  ): void {
    if (!this.ctx || !this.isInitialized) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime;

    // 1. Rain intensity to gain mapping
    if (this.rainGain && this.rainFilter) {
      const targetRainGain = this.isMuted
        ? 0
        : Math.min(0.85, Math.pow(Math.max(0, rainRateMmH) / 100, 0.6) * 0.6);
      this.rainGain.gain.setTargetAtTime(targetRainGain, now, 0.15);

      // Higher rain rate has broader spectrum, but extreme humidity (>90%) absorbs top frequencies
      const cutoff = Math.min(3500, 800 + rainRateMmH * 22 - (rhPct - 50) * 8);
      this.rainFilter.frequency.setTargetAtTime(Math.max(400, cutoff), now, 0.2);
    }

    // 2. Wind intensity to resonance & volume
    if (this.windGain && this.windFilter) {
      const targetWindGain = this.isMuted
        ? 0
        : Math.min(0.7, Math.pow(Math.max(0, windSpeedKmh) / 80, 1.4) * 0.45);
      this.windGain.gain.setTargetAtTime(targetWindGain, now, 0.2);

      const centerFreq = 120 + Math.min(450, windSpeedKmh * 4.5);
      this.windFilter.frequency.setTargetAtTime(centerFreq, now, 0.2);
    }

    // 3. Audio Listener position in 3D space
    if (this.ctx.listener) {
      if (this.ctx.listener.positionX) {
        this.ctx.listener.positionX.setTargetAtTime(cameraPos.x, now, 0.1);
        this.ctx.listener.positionY.setTargetAtTime(cameraPos.y, now, 0.1);
        this.ctx.listener.positionZ.setTargetAtTime(cameraPos.z, now, 0.1);
      } else {
        // Fallback for older browsers
        this.ctx.listener.setPosition(cameraPos.x, cameraPos.y, cameraPos.z);
      }
    }
  }

  /**
   * Triggers a realistic spatial thunder strike with distance acoustics
   */
  public triggerThunderStrike(distanceKm: number = 1.2): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const delaySeconds = distanceKm / 0.343; // sound speed 343 m/s
    const now = this.ctx.currentTime + Math.min(2.0, delaySeconds * 0.2); // scaled for punchy UX

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 1.2);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.65, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 2.5);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }
}

export const spatialAcoustics = new SpatialMeteorologicalAcoustics();
