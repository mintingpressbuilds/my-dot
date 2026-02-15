'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ShareDot {
  id: string;
  slug: string;
  name: string;
  color: string;
  line: string;
}

interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  dot: ShareDot;
}

function generateQRCodeSVG(url: string, size: number): string {
  // Simple QR-like visual using a grid pattern seeded by URL
  // For production, use a proper QR library — this gives a visual placeholder
  const cells = 25;
  const cellSize = size / cells;
  let seed = 0;
  for (let i = 0; i < url.length; i++) {
    seed = ((seed << 5) - seed + url.charCodeAt(i)) | 0;
  }
  const prng = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  let rects = '';
  // finder patterns (top-left, top-right, bottom-left)
  const drawFinder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const border = x === 0 || x === 6 || y === 0 || y === 6;
        const inner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        if (border || inner) {
          rects += `<rect x="${(ox + x) * cellSize}" y="${(oy + y) * cellSize}" width="${cellSize}" height="${cellSize}" fill="white"/>`;
        }
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(cells - 7, 0);
  drawFinder(0, cells - 7);

  // data area
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const inFinder =
        (x < 8 && y < 8) ||
        (x >= cells - 8 && y < 8) ||
        (x < 8 && y >= cells - 8);
      if (inFinder) continue;
      if (prng() > 0.5) {
        rects += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="white"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#030305"/>${rects}</svg>`;
}

export default function ShareSheet({ open, onClose, dot }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open && qrRef.current) {
      const url = `${window.location.origin}/dot/${dot.slug}`;
      qrRef.current.innerHTML = generateQRCodeSVG(url, 160);
    }
  }, [open, dot.slug]);

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(t);
    }
  }, [copied]);

  const dotUrl = typeof window !== 'undefined' ? `${window.location.origin}/dot/${dot.slug}` : `https://mydot.space/dot/${dot.slug}`;

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(dotUrl);
    setCopied(true);
  }, [dotUrl]);

  const handleDownloadCard = useCallback(() => {
    window.open(`/api/dots/${dot.slug}/card`, '_blank');
  }, [dot.slug]);

  const handleDownloadImage = useCallback(() => {
    const a = document.createElement('a');
    a.href = `/api/dots/${dot.slug}/image`;
    a.download = `${dot.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  }, [dot.slug, dot.name]);

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      await navigator.share({
        title: `${dot.name} — my dot.`,
        text: dot.line,
        url: dotUrl,
      });
    }
  }, [dot.name, dot.line, dotUrl]);

  if (!open) return null;

  const btnStyle = {
    padding: '14px 20px',
    minHeight: '48px',
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.4)',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '12px',
    letterSpacing: '0.5px',
    cursor: 'pointer' as const,
    transition: 'all 0.3s',
    width: '100%',
    textAlign: 'left' as const,
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* sheet */}
      <div
        className="relative z-10 w-full max-w-[380px] mx-4 mb-4 sm:mb-0 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0a0a12',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '28px',
        }}
      >
        <div className="font-serif text-[20px] italic text-white/70 tracking-tight mb-6">
          share {dot.name}
        </div>

        <div className="flex flex-col gap-2.5">
          <button onClick={handleCopyLink} style={btnStyle}>
            {copied ? 'copied' : 'copy link'}
          </button>

          <button onClick={handleDownloadCard} style={btnStyle}>
            download card
          </button>

          <button onClick={handleDownloadImage} style={btnStyle}>
            download image
          </button>

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button onClick={handleNativeShare} style={btnStyle}>
              share...
            </button>
          )}
        </div>

        {/* QR code */}
        <div className="flex justify-center mt-6">
          <div
            ref={qrRef}
            className="opacity-40"
            style={{ width: 160, height: 160 }}
          />
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 text-[11px] tracking-[1px] text-white/20 cursor-pointer"
          style={{
            padding: '10px',
            background: 'transparent',
            border: 'none',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          close
        </button>
      </div>
    </div>
  );
}
