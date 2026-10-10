/**
 * springPhysics.ts
 * SAMVARTAKA AI — Analytical Critically Damped Harmonic Spring Engine
 * 
 * Provides physically rigorous 120 FPS / 60 FPS motion damping.
 * Governed by the continuous second-order differential equation:
 *   d²x/dt² + 2*zeta*omega_n*(dx/dt) + omega_n²*(x - x_target) = 0
 * 
 * In critically damped mode (zeta = 1.0), the analytical solution is:
 *   x(t) = (C1 + C2 * t) * exp(-omega_n * t) + x_target
 * guaranteeing zero overshoot and maximum smooth convergence without frame-rate dependency.
 */

import { useState, useEffect, useRef } from 'react';

export interface SpringConfig {
  stiffness?: number; // omega_n in rad/s, default: 28.0
  dampingRatio?: number; // zeta: 1.0 = critically damped, <1 underdamped, >1 overdamped
  precision?: number; // convergence epsilon threshold, default: 0.001
  clampTarget?: boolean;
}

export class HarmonicSpringSolver {
  private current: number;
  private target: number;
  private velocity: number;
  private stiffness: number; // omega_n
  private dampingRatio: number; // zeta
  private precision: number;

  constructor(
    initialValue: number = 0,
    config: SpringConfig = {}
  ) {
    this.current = initialValue;
    this.target = initialValue;
    this.velocity = 0;
    this.stiffness = config.stiffness ?? 28.0;
    this.dampingRatio = config.dampingRatio ?? 1.0;
    this.precision = config.precision ?? 0.001;
  }

  public setTarget(newTarget: number): void {
    this.target = newTarget;
  }

  public snapTo(value: number): void {
    this.current = value;
    this.target = value;
    this.velocity = 0;
  }

  public getCurrent(): number {
    return this.current;
  }

  public getTarget(): number {
    return this.target;
  }

  public getVelocity(): number {
    return this.velocity;
  }

  public isSettled(): boolean {
    return Math.abs(this.current - this.target) < this.precision && Math.abs(this.velocity) < this.precision;
  }

  /**
   * Advances the simulation by dt seconds using the exact analytical solution
   */
  public step(dt: number): number {
    if (this.isSettled()) {
      this.current = this.target;
      this.velocity = 0;
      return this.current;
    }

    // Bound dt to prevent explosion on background tab throttling
    const clampedDt = Math.min(dt, 0.064);

    const omega = this.stiffness;
    const zeta = this.dampingRatio;
    const x0 = this.current - this.target;
    const v0 = this.velocity;

    if (Math.abs(zeta - 1.0) < 1e-4) {
      // Critically damped case: zeta = 1
      // x(t) = (x0 + (v0 + omega * x0) * t) * exp(-omega * t)
      const c1 = x0;
      const c2 = v0 + omega * x0;
      const decay = Math.exp(-omega * clampedDt);

      const x = (c1 + c2 * clampedDt) * decay;
      const v = (c2 - omega * (c1 + c2 * clampedDt)) * decay;

      this.current = this.target + x;
      this.velocity = v;
    } else if (zeta < 1.0) {
      // Underdamped case: 0 <= zeta < 1
      const omegaD = omega * Math.sqrt(1 - zeta * zeta);
      const decay = Math.exp(-zeta * omega * clampedDt);
      const c1 = x0;
      const c2 = (v0 + zeta * omega * x0) / omegaD;

      const cosWd = Math.cos(omegaD * clampedDt);
      const sinWd = Math.sin(omegaD * clampedDt);

      const x = decay * (c1 * cosWd + c2 * sinWd);
      const v = -zeta * omega * x + decay * (-c1 * omegaD * sinWd + c2 * omegaD * cosWd);

      this.current = this.target + x;
      this.velocity = v;
    } else {
      // Overdamped case: zeta > 1
      const alpha = Math.sqrt(zeta * zeta - 1);
      const r1 = -omega * (zeta - alpha);
      const r2 = -omega * (zeta + alpha);

      const c2 = (v0 - r1 * x0) / (r2 - r1);
      const c1 = x0 - c2;

      const e1 = Math.exp(r1 * clampedDt);
      const e2 = Math.exp(r2 * clampedDt);

      this.current = this.target + c1 * e1 + c2 * e2;
      this.velocity = c1 * r1 * e1 + c2 * r2 * e2;
    }

    if (this.isSettled()) {
      this.current = this.target;
      this.velocity = 0;
    }

    return this.current;
  }
}

/**
 * React Hook for 120 FPS hardware-synchronized spring animations
 */
export function useSpringValue(targetValue: number, config: SpringConfig = {}): number {
  const [value, setValue] = useState<number>(targetValue);
  const solverRef = useRef<HarmonicSpringSolver | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  if (!solverRef.current) {
    solverRef.current = new HarmonicSpringSolver(targetValue, config);
  }

  useEffect(() => {
    if (solverRef.current) {
      solverRef.current.setTarget(targetValue);
    }

    const animate = (time: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time;
      }
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (solverRef.current) {
        const nextVal = solverRef.current.step(dt);
        setValue(nextVal);

        if (!solverRef.current.isSettled()) {
          frameRef.current = requestAnimationFrame(animate);
        } else {
          lastTimeRef.current = null;
        }
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      lastTimeRef.current = null;
    };
  }, [targetValue]);

  return value;
}
