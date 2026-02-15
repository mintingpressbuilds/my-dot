import { useRef, useCallback } from 'react';
import type { DotData } from '@/lib/data';

export interface GravityPoint {
  x: number;
  y: number;
  z: number;
}

export function usePhysics() {
  const dotsRef = useRef<DotData[]>([]);
  const scatterRef = useRef(0);
  const gravityRef = useRef<GravityPoint | null>(null);

  const setDots = useCallback((dots: DotData[]) => {
    dotsRef.current = dots;
  }, []);

  const scatter = useCallback(() => {
    scatterRef.current = 3.0;
  }, []);

  const setGravityPoint = useCallback((point: GravityPoint | null) => {
    gravityRef.current = point;
  }, []);

  const resetAll = useCallback(() => {
    gravityRef.current = null;
    scatterRef.current = 0;
    const dots = dotsRef.current;
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      d.px = d.hx;
      d.py = d.hy;
      d.pz = d.hz;
      d.vx = 0;
      d.vy = 0;
      d.vz = 0;
      d.grabbed = false;
    }
  }, []);

  const grabDot = useCallback((index: number) => {
    if (index >= 0 && index < dotsRef.current.length) {
      dotsRef.current[index].grabbed = true;
    }
  }, []);

  const moveDot = useCallback((index: number, x: number, y: number, z: number) => {
    if (index < 0 || index >= dotsRef.current.length) return;
    const d = dotsRef.current[index];
    d.px = x;
    d.py = y;
    // pull friends toward grabbed dot
    d.friends.forEach((fi) => {
      if (fi >= dotsRef.current.length) return;
      const f = dotsRef.current[fi];
      const dx = d.px - f.px;
      const dy = d.py - f.py;
      const dz = d.pz - f.pz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      f.vx += (dx / dist) * 0.3;
      f.vy += (dy / dist) * 0.3;
      f.vz += (dz / dist) * 0.1;
    });
  }, []);

  const releaseDot = useCallback((index: number) => {
    if (index < 0 || index >= dotsRef.current.length) return;
    const d = dotsRef.current[index];
    d.grabbed = false;
    d.vx = (d.px - d.hx) * -0.05;
    d.vy = (d.py - d.hy) * -0.05;
    d.vz = (d.pz - d.hz) * -0.05;
  }, []);

  const step = useCallback(() => {
    const dots = dotsRef.current;
    const gravPt = gravityRef.current;
    const scatterForce = scatterRef.current;

    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      if (d.grabbed) continue;

      // spring snap-back to home
      d.vx += (d.hx - d.px) * 0.008;
      d.vy += (d.hy - d.py) * 0.008;
      d.vz += (d.hz - d.pz) * 0.008;

      // friend pull
      for (let j = 0; j < d.friends.length; j++) {
        const fi = d.friends[j];
        if (fi >= dots.length) continue;
        const f = dots[fi];
        const dx = f.px - d.px;
        const dy = f.py - d.py;
        const dz = f.pz - d.pz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        if (dist > 20) {
          d.vx += (dx / dist) * 0.001;
          d.vy += (dy / dist) * 0.001;
          d.vz += (dz / dist) * 0.001;
        }
      }

      // gravity vortex
      if (gravPt) {
        const dx = gravPt.x - d.px;
        const dy = gravPt.y - d.py;
        const dz = gravPt.z - d.pz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        const f = 0.15 / (1 + dist * 0.01);
        d.vx += (dx / dist) * f;
        d.vy += (dy / dist) * f;
        d.vz += (dz / dist) * f;
        // swirl
        d.vx += (-dy / dist) * f * 0.3;
        d.vy += (dx / dist) * f * 0.3;
      }

      // scatter
      if (scatterForce > 0) {
        const dist = Math.sqrt(d.px * d.px + d.py * d.py + d.pz * d.pz) || 1;
        d.vx += (d.px / dist) * scatterForce * (0.8 + Math.random() * 0.4);
        d.vy += (d.py / dist) * scatterForce * (0.8 + Math.random() * 0.4);
        d.vz += (d.pz / dist) * scatterForce * (0.8 + Math.random() * 0.4);
      }

      // damping
      d.vx *= 0.94;
      d.vy *= 0.94;
      d.vz *= 0.94;

      // integrate
      d.px += d.vx;
      d.py += d.vy;
      d.pz += d.vz;
    }

    // decay scatter
    if (scatterRef.current > 0) {
      scatterRef.current *= 0.8;
      if (scatterRef.current < 0.01) scatterRef.current = 0;
    }
  }, []);

  return {
    dotsRef,
    setDots,
    scatter,
    setGravityPoint,
    gravityRef,
    resetAll,
    grabDot,
    moveDot,
    releaseDot,
    step,
  };
}
