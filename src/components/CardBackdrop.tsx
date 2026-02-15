'use client';

import { useEffect, useRef } from 'react';
import { rgba } from '@/lib/colors';

interface CardBackdropProps {
  name: string;
  color: string;
  theme?: string;
  width?: number;
  height?: number;
}

function makeRng(name: string) {
  let seed = 0;
  for (let i = 0; i < name.length; i++) {
    seed += name.charCodeAt(i) * (i + 1);
  }
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  name: string,
  color: string,
  w: number,
  h: number,
  theme: string = 'default',
) {
  const rng = makeRng(name);

  if (theme === 'glass') {
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, w, h);
    const gx = w * 0.5;
    const gy = h * 0.4;
    const g = ctx.createRadialGradient(gx, gy, 0, w / 2, h / 2, w);
    g.addColorStop(0, rgba(color, 0.06));
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    return;
  }

  if (theme === 'neon' || theme === 'minimal' || theme === 'gradient') {
    // these themes don't use canvas backdrop
    return;
  }

  if (theme === 'noise') {
    ctx.fillStyle = '#0a0a10';
    ctx.fillRect(0, 0, w, h);

    // subtle color wash
    const gx = w * (0.2 + rng() * 0.5);
    const gy = h * (0.15 + rng() * 0.35);
    const g = ctx.createRadialGradient(gx, gy, 0, w / 2, h / 2, w * 0.8);
    g.addColorStop(0, rgba(color, 0.1));
    g.addColorStop(0.4, rgba(color, 0.03));
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // heavy grain (amplitude 30)
    const imageData = ctx.getImageData(0, 0, w * 2, h * 2);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 30;
      data[i] += n;
      data[i + 1] += n;
      data[i + 2] += n;
    }
    ctx.putImageData(imageData, 0, 0);

    // scan lines
    ctx.fillStyle = 'rgba(0,0,0,0.02)';
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }

    // vignette
    const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.7);
    vg.addColorStop(0, 'transparent');
    vg.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
    return;
  }

  // default theme
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, w, h);

  const gx = w * (0.2 + rng() * 0.5);
  const gy = h * (0.15 + rng() * 0.35);
  const g = ctx.createRadialGradient(gx, gy, 0, w / 2, h / 2, w * 0.8);
  g.addColorStop(0, rgba(color, 0.18));
  g.addColorStop(0.4, rgba(color, 0.05));
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 6; i++) {
    const ox = rng() * w;
    const oy = rng() * h;
    const or = 30 + rng() * 100;
    const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, or);
    og.addColorStop(0, rgba(color, 0.04 + rng() * 0.06));
    og.addColorStop(1, 'transparent');
    ctx.fillStyle = og;
    ctx.fillRect(0, 0, w, h);
  }

  const imageData = ctx.getImageData(0, 0, w * 2, h * 2);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    data[i] += n;
    data[i + 1] += n;
    data[i + 2] += n;
  }
  ctx.putImageData(imageData, 0, 0);
}

export default function CardBackdrop({ name, color, theme = 'default', width = 380, height = 500 }: CardBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (theme === 'neon' || theme === 'minimal' || theme === 'gradient') return;

    const cv = canvasRef.current;
    if (!cv) return;

    cv.width = width * 2;
    cv.height = height * 2;
    cv.style.width = width + 'px';
    cv.style.height = height + 'px';

    const ctx = cv.getContext('2d');
    if (!ctx) return;

    ctx.scale(2, 2);
    drawBackdrop(ctx, name, color, width, height, theme);
  }, [name, color, width, height, theme]);

  if (theme === 'neon' || theme === 'minimal' || theme === 'gradient') return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block"
    />
  );
}
