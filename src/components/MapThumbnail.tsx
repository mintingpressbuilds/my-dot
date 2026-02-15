'use client';

import { useEffect, useRef } from 'react';

interface MapDot {
  color: string;
  posX: number;
  posY: number;
}

interface MapThumbnailProps {
  items: MapDot[];
  width?: number;
  height?: number;
}

export default function MapThumbnail({ items, width = 120, height = 80 }: MapThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, w, h);

    if (items.length === 0) return;

    const xs = items.map(d => d.posX);
    const ys = items.map(d => d.posY);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const padding = 12;

    items.forEach(dot => {
      const x = padding + ((dot.posX - minX) / rangeX) * (w - padding * 2);
      const y = padding + ((dot.posY - minY) / rangeY) * (h - padding * 2);

      // Glow
      const grad = ctx.createRadialGradient(x, y, 0, x, y, 6);
      grad.addColorStop(0, dot.color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(x - 6, y - 6, 12, 12);

      // Core
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    });
  }, [items, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width * 2}
      height={height * 2}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: '8px',
      }}
    />
  );
}
