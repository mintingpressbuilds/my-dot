'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { PALETTE } from '@/lib/colors';

interface ColorPickerProps {
  selected: string;
  onChange: (color: string) => void;
}

function drawColorWheel(ctx: CanvasRenderingContext2D, size: number) {
  const center = size / 2;
  const radius = size / 2 - 4;

  for (let angle = 0; angle < 360; angle++) {
    const startAngle = (angle - 1) * Math.PI / 180;
    const endAngle = (angle + 1) * Math.PI / 180;

    const gradient = ctx.createRadialGradient(
      center, center, 0,
      center, center, radius
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, `hsl(${angle}, 100%, 50%)`);
    gradient.addColorStop(1, `hsl(${angle}, 100%, 20%)`);

    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, startAngle, endAngle);
    ctx.fillStyle = gradient;
    ctx.fill();
  }
}

function isValidHex(s: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(s);
}

export default function ColorPicker({ selected, onChange }: ColorPickerProps) {
  const [showWheel, setShowWheel] = useState(false);
  const [customColor, setCustomColor] = useState(selected);
  const wheelRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (showWheel && wheelRef.current) {
      const ctx = wheelRef.current.getContext('2d');
      if (ctx) drawColorWheel(ctx, 200);
    }
  }, [showWheel]);

  const pickColorFromWheel = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      const touch = e.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pixel = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
    const hex = '#' + [pixel[0], pixel[1], pixel[2]]
      .map(v => v.toString(16).padStart(2, '0')).join('');
    setCustomColor(hex);
    onChange(hex);
  }, [onChange]);

  const isPalette = PALETTE.includes(selected as typeof PALETTE[number]);

  return (
    <div>
      <div className="flex gap-2 flex-wrap">
        {PALETTE.map((c) => (
          <div
            key={c}
            onClick={() => { onChange(c); setShowWheel(false); }}
            className="w-11 h-11 rounded-full cursor-pointer transition-all duration-200 hover:scale-[1.15] active:scale-95"
            style={{
              background: c,
              border: selected === c ? '2px solid rgba(255,255,255,0.8)' : '2px solid transparent',
              transform: selected === c ? 'scale(1.15)' : undefined,
            }}
          />
        ))}
        {/* Rainbow custom dot */}
        <div
          onClick={() => setShowWheel(!showWheel)}
          className="w-11 h-11 rounded-full cursor-pointer transition-all duration-200 hover:scale-[1.15] active:scale-95 relative flex items-center justify-center"
          style={{
            background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
            border: !isPalette && selected !== PALETTE[4] ? '2px solid rgba(255,255,255,0.8)' : '2px solid transparent',
            transform: !isPalette ? 'scale(1.15)' : undefined,
          }}
        >
          <span className="text-white text-sm font-light" style={{ textShadow: '0 1px 3px rgba(0,0,0,.5)' }}>+</span>
        </div>
      </div>

      {showWheel && (
        <div className="flex flex-col items-center gap-3 mt-4">
          <canvas
            ref={wheelRef}
            width={200}
            height={200}
            onClick={pickColorFromWheel}
            onTouchEnd={pickColorFromWheel}
            className="rounded-full cursor-crosshair"
            style={{ width: 160, height: 160, touchAction: 'none' }}
          />
          <div className="flex items-center gap-3">
            <div
              className="rounded-full"
              style={{
                width: 32, height: 32,
                background: isValidHex(customColor) ? customColor : selected,
                border: '2px solid rgba(255,255,255,0.3)',
              }}
            />
            <input
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
                if (isValidHex(e.target.value)) {
                  onChange(e.target.value);
                }
              }}
              placeholder="#ff6b6b"
              maxLength={7}
              className="text-center text-[13px] text-white font-mono outline-none"
              style={{
                width: 100,
                padding: '8px',
                background: '#030305',
                border: '1px solid #1a1a24',
                borderRadius: '8px',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
