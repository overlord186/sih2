/**
 * Master Plan 8 & 18: Vector Advection & Lagrangian Particle Streamline Engine
 * Real-time 2D wind vector advection with Runge-Kutta 2nd Order (RK2) trajectory integration
 */

export interface WindParticle {
  x: number; // normalized [0, 1] across domain
  y: number; // normalized [0, 1] across domain
  age: number; // current age in frames
  maxAge: number; // lifetime in frames
  speedMs: number; // local velocity magnitude
  prevX: number;
  prevY: number;
}

export interface VelocityGridPoint {
  u: number; // zonal velocity (m/s, positive eastwards)
  v: number; // meridional velocity (m/s, positive northwards)
}

export interface VectorFieldDomain {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
  cols: number;
  rows: number;
}

export class VectorAdvectionEngine {
  private particles: WindParticle[] = [];
  private velocityGrid: VelocityGridPoint[][];
  private domain: VectorFieldDomain;
  private particleCount: number;

  constructor(
    particleCount: number = 900,
    domain: VectorFieldDomain = {
      minLon: 68.0,
      maxLon: 97.5,
      minLat: 6.5,
      maxLat: 36.5,
      cols: 32,
      rows: 32,
    }
  ) {
    this.particleCount = particleCount;
    this.domain = domain;
    this.velocityGrid = this.generateSynopticVelocityGrid();
    this.initParticles();
  }

  /**
   * Generates a realistic synoptic monsoon wind field across the Indian subcontinent:
   * - Strong south-westerly Somali Low-Level Jet (Findlater Jet) crossing Arabian Sea
   * - Orographic deceleration & deflection along Western Ghats
   * - Monsoon trough cyclonic curvature over Gangetic Plain & head Bay of Bengal
   */
  public generateSynopticVelocityGrid(intensityMultiplier: number = 1.0): VelocityGridPoint[][] {
    const { cols, rows, minLon, maxLon, minLat, maxLat } = this.domain;
    const grid: VelocityGridPoint[][] = [];

    for (let r = 0; r < rows; r++) {
      const rowArr: VelocityGridPoint[] = [];
      const lat = minLat + (r / (rows - 1)) * (maxLat - minLat);

      for (let c = 0; c < cols; c++) {
        const lon = minLon + (c / (cols - 1)) * (maxLon - minLon);

        // 1. South-Westerly Somali Jet Core (Lat 8-18N, Lon 68-76E)
        let u = 12.0 * intensityMultiplier;
        let v = 9.0 * intensityMultiplier;

        // Arabian Sea acceleration
        if (lon < 75 && lat < 20) {
          u += 8.0 * Math.sin(((lat - 6) / 14) * Math.PI) * intensityMultiplier;
          v += 6.0 * intensityMultiplier;
        }

        // Western Ghats barrier deflection (Lon 73-75, Lat 10-20)
        if (lon >= 73.0 && lon <= 75.5 && lat >= 10 && lat <= 20) {
          u *= 0.65; // orographic blocking friction
          v += 3.5; // poleward deflected barrier jet
        }

        // Monsoon Trough cyclonic curvature over Bay of Bengal and Gangetic Basin (Lat 21-26N, Lon 84-92E)
        const troughCenterLon = 88.0;
        const troughCenterLat = 22.5;
        const dLon = lon - troughCenterLon;
        const dLat = lat - troughCenterLat;
        const distTrough = Math.sqrt(dLon * dLon + dLat * dLat);

        if (distTrough < 12.0) {
          // Counter-clockwise cyclonic circulation around the monsoon low
          const cyclonicScale = (1.0 - distTrough / 12.0) * 11.0 * intensityMultiplier;
          u += -dLat * (cyclonicScale / 5.0);
          v += dLon * (cyclonicScale / 5.0);
        }

        // Himalayan northern boundary barrier damping
        if (lat > 29.0) {
          u *= Math.max(0.2, 1.0 - (lat - 29.0) / 7.0);
          v *= Math.max(0.1, 1.0 - (lat - 29.0) / 7.0);
        }

        rowArr.push({ u, v });
      }
      grid.push(rowArr);
    }

    return grid;
  }

  /**
   * Bilinear interpolation of velocity field at normalized coordinates (nx, ny) in [0, 1]
   */
  public sampleVelocity(nx: number, ny: number): VelocityGridPoint {
    const { cols, rows } = this.domain;
    const clampedX = Math.max(0, Math.min(0.9999, nx));
    const clampedY = Math.max(0, Math.min(0.9999, ny));

    const fx = clampedX * (cols - 1);
    const fy = clampedY * (rows - 1);

    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(cols - 1, x0 + 1);
    const y1 = Math.min(rows - 1, y0 + 1);

    const wx = fx - x0;
    const wy = fy - y0;

    const p00 = this.velocityGrid[y0][x0];
    const p10 = this.velocityGrid[y0][x1];
    const p01 = this.velocityGrid[y1][x0];
    const p11 = this.velocityGrid[y1][x1];

    const u =
      (1 - wx) * (1 - wy) * p00.u +
      wx * (1 - wy) * p10.u +
      (1 - wx) * wy * p01.u +
      wx * wy * p11.u;

    const v =
      (1 - wx) * (1 - wy) * p00.v +
      wx * (1 - wy) * p10.v +
      (1 - wx) * wy * p01.v +
      wx * wy * p11.v;

    return { u, v };
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(this.spawnParticle(true));
    }
  }

  private spawnParticle(randomAge: boolean = false): WindParticle {
    const x = Math.random();
    const y = Math.random();
    const vel = this.sampleVelocity(x, y);
    const speed = Math.sqrt(vel.u * vel.u + vel.v * vel.v);
    const maxAge = Math.floor(45 + Math.random() * 55);

    return {
      x,
      y,
      prevX: x,
      prevY: y,
      age: randomAge ? Math.floor(Math.random() * maxAge) : 0,
      maxAge,
      speedMs: speed,
    };
  }

  /**
   * Runge-Kutta 2nd Order (RK2 Midpoint) Advection Step
   * Evaluates velocity at midpoint for higher temporal accuracy and smooth curvature
   */
  public step(dt: number = 0.0028): WindParticle[] {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      p.prevX = p.x;
      p.prevY = p.y;
      p.age++;

      if (p.age >= p.maxAge || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) {
        this.particles[i] = this.spawnParticle(false);
        continue;
      }

      // K1: velocity at current position
      const k1 = this.sampleVelocity(p.x, p.y);

      // Inverted Y: screen coordinates increase downwards, latitude increases upwards
      const dx1 = k1.u * dt;
      const dy1 = -k1.v * dt;

      // K2: velocity at midpoint x + 0.5 * k1
      const midX = p.x + dx1 * 0.5;
      const midY = p.y + dy1 * 0.5;
      const k2 = this.sampleVelocity(midX, midY);

      const dx2 = k2.u * dt;
      const dy2 = -k2.v * dt;

      p.x += dx2;
      p.y += dy2;

      // Update speed for color gradient
      p.speedMs = Math.sqrt(k2.u * k2.u + k2.v * k2.v);
    }

    return this.particles;
  }

  public getParticles(): WindParticle[] {
    return this.particles;
  }

  public setParticleCount(count: number): void {
    this.particleCount = count;
    this.initParticles();
  }

  public updateWindIntensity(multiplier: number): void {
    this.velocityGrid = this.generateSynopticVelocityGrid(multiplier);
  }
}
