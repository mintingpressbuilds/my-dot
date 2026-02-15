'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PALETTE } from '@/lib/colors';
import ColorPicker from './ColorPicker';

const MAP_TYPES = ['people', 'places', 'music', 'ideas', 'custom'] as const;

interface MapBuilderProps {
  open: boolean;
  onClose: () => void;
}

export default function MapBuilder({ open, onClose }: MapBuilderProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(PALETTE[6]);
  const [type, setType] = useState<string>('custom');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [creating, setCreating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const preventBg = (e: TouchEvent) => {
      const scrollEl = scrollRef.current;
      if (scrollEl && scrollEl.contains(e.target as Node)) return;
      e.preventDefault();
    };
    document.addEventListener('touchmove', preventBg, { passive: false });
    return () => document.removeEventListener('touchmove', preventBg);
  }, [open]);

  const handleCreate = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          color,
          type,
          visibility,
        }),
      });
      if (res.ok) {
        const map = await res.json();
        onClose();
        router.push(`/map/${map.slug}`);
      }
    } catch {}
    setCreating(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(3,3,5,0.88)', backdropFilter: 'blur(40px)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:w-[min(420px,90vw)] sm:rounded-[24px] relative animate-slideUp"
        style={{
          background: '#0a0a10',
          border: '1px solid #1a1a24',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '24px 24px 0 0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)' }} />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-5 text-lg text-[#55556a] hover:text-[#d0d0dd] bg-transparent border-none cursor-pointer font-sans z-10"
        >
          ×
        </button>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          style={{
            overflowY: 'auto',
            touchAction: 'pan-y',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            padding: 'clamp(20px, 4vw, 40px) clamp(20px, 4vw, 32px)',
            paddingTop: '8px',
            scrollbarWidth: 'none',
            flex: 1,
            minHeight: 0,
          }}
        >
          <div className="font-serif text-[26px] max-sm:text-[22px] italic text-white mb-1.5 tracking-tight">
            new map.
          </div>
          <div className="text-xs text-[#55556a] mb-6 max-sm:mb-5 font-light">
            a constellation of things you love
          </div>

          {/* Name */}
          <div className="mb-5 max-sm:mb-4">
            <label className="text-[10px] max-sm:text-[11px] tracking-[3px] uppercase text-[#55556a] mb-2 block font-normal">name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="my music, road trip 2026..."
              autoComplete="off"
              className="w-full py-3 px-4 text-sm text-white font-sans outline-none transition-colors duration-300 placeholder:text-[#333] placeholder:font-light"
              style={{ background: '#030305', border: '1px solid #1a1a24', borderRadius: '12px' }}
              onFocus={(e) => (e.target.style.borderColor = '#24243a')}
              onBlur={(e) => (e.target.style.borderColor = '#1a1a24')}
            />
          </div>

          {/* Description */}
          <div className="mb-5 max-sm:mb-4">
            <label className="text-[10px] max-sm:text-[11px] tracking-[3px] uppercase text-[#55556a] mb-2 block font-normal">description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={120}
              placeholder="optional one-liner"
              autoComplete="off"
              className="w-full py-3 px-4 text-sm text-white font-sans outline-none transition-colors duration-300 placeholder:text-[#333] placeholder:font-light"
              style={{ background: '#030305', border: '1px solid #1a1a24', borderRadius: '12px' }}
              onFocus={(e) => (e.target.style.borderColor = '#24243a')}
              onBlur={(e) => (e.target.style.borderColor = '#1a1a24')}
            />
          </div>

          {/* Color */}
          <div className="mb-5 max-sm:mb-4">
            <label className="text-[10px] max-sm:text-[11px] tracking-[3px] uppercase text-[#55556a] mb-2 block font-normal">color</label>
            <ColorPicker selected={color} onChange={setColor} />
          </div>

          {/* Type */}
          <div className="mb-5 max-sm:mb-4">
            <label className="text-[10px] max-sm:text-[11px] tracking-[3px] uppercase text-[#55556a] mb-2 block font-normal">type</label>
            <div className="flex gap-2 flex-wrap">
              {MAP_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="text-[11px] tracking-[1px] font-light cursor-pointer transition-all duration-200 border-none"
                  style={{
                    padding: '8px 14px',
                    borderRadius: '20px',
                    background: type === t ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                    color: type === t ? '#d0d0dd' : '#55556a',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div className="mb-5 max-sm:mb-4">
            <label className="text-[10px] max-sm:text-[11px] tracking-[3px] uppercase text-[#55556a] mb-2 block font-normal">visibility</label>
            <div className="flex gap-2">
              {(['public', 'private'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVisibility(v)}
                  className="text-[11px] tracking-[1px] font-light cursor-pointer transition-all duration-200 border-none"
                  style={{
                    padding: '8px 14px',
                    borderRadius: '20px',
                    background: visibility === v ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                    color: visibility === v ? '#d0d0dd' : '#55556a',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="w-full py-3.5 border-none text-[13px] font-normal tracking-[1px] text-white cursor-pointer transition-all duration-300 mt-2 mb-4 hover:brightness-[1.15] hover:-translate-y-px active:scale-[0.98] disabled:opacity-30 disabled:cursor-default"
            style={{
              background: color,
              borderRadius: '14px',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {creating ? '...' : 'create map'}
          </button>
        </div>
      </div>
    </div>
  );
}
