'use client';

import { useEffect, useRef } from 'react';
import { rgba } from '@/lib/colors';

interface CardBackdropProps {
  name: string;
  color: string;
  width?: number;
  height?: number;
}

export function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  name: string,
  color: string,
  w: number,
  h: number,
) {
  // seed RNG from name
  let seed = 0;
  for (let i = 0; i < name.length; i++) {
    seed += name.charCodeAt(i) * (i + 1);
  }
  const rng = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // base fill
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, w, h);

  // main radial gradient
  const gx = w * (0.2 + rng() * 0.5);
  const gy = h * (0.15 + rng() * 0.35);
  const g = ctx.createRadialGradient(gx, gy, 0, w / 2, h / 2, w * 0.8);
  g.addColorStop(0, rgba(color, 0.18));
  g.addColorStop(0.4, rgba(color, 0.05));
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // 6 random orbs
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

  // film grain
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

export default function CardBackdrop({ name, color, width = 380, height = 500 }: CardBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;

    cv.width = width * 2;
    cv.height = height * 2;
    cv.style.width = width + 'px';
    cv.style.height = height + 'px';

    const ctx = cv.getContext('2d');
    if (!ctx) return;

    ctx.scale(2, 2);
    drawBackdrop(ctx, name, color, width, height);
  }, [name, color, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block"
    />
  );
}
