'use client';

import { useState, useEffect, useRef } from 'react';
import { PALETTE } from '@/lib/colors';
import ColorPicker from './ColorPicker';

interface MapAddModalProps {
  mapId: string;
  mapColor: string;
  onClose: () => void;
  onItemAdded: (item: { name: string; color: string; line?: string; link?: string }) => void;
}

interface SearchResult {
  id: string;
  slug: string;
  name: string;
  color: string;
  line: string;
}

export default function MapAddModal({ mapId, mapColor, onClose, onItemAdded }: MapAddModalProps) {
  const [tab, setTab] = useState<'person' | 'item'>('item');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // item fields
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(PALETTE[4]);
  const [line, setLine] = useState('');
  const [link, setLink] = useState('');
  const [adding, setAdding] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Prevent background touch events
  useEffect(() => {
    const preventBg = (e: TouchEvent) => {
      const scrollEl = scrollRef.current;
      if (scrollEl && scrollEl.contains(e.target as Node)) return;
      e.preventDefault();
    };
    document.addEventListener('touchmove', preventBg, { passive: false });
    return () => document.removeEventListener('touchmove', preventBg);
  }, []);

  // Search dots by name
  useEffect(() => {
    if (tab !== 'person' || search.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/dots?search=${encodeURIComponent(search)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(Array.isArray(data) ? data.slice(0, 10) : []);
        }
      } catch {}
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, tab]);

  const handleAddDot = async (dotId: string) => {
    try {
      const res = await fetch(`/api/maps/${mapId}/dots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dotId }),
      });
      if (res.ok) {
        const result = results.find(r => r.id === dotId);
        if (result) {
          onItemAdded({ name: result.name, color: result.color, line: result.line });
        }
      }
    } catch {}
  };

  const handleAddItem = async () => {
    if (!name.trim() || adding) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/maps/${mapId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          color,
          line: line.trim() || undefined,
          link: link.trim() || undefined,
        }),
      });
      if (res.ok) {
        onItemAdded({ name: name.trim(), color, line: line.trim(), link: link.trim() });
        setName('');
        setLine('');
        setLink('');
      }
    } catch {}
    setAdding(false);
  };

  const inputStyle = {
    background: '#030305',
    border: '1px solid #1a1a24',
    borderRadius: '12px',
  };

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

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-5 text-lg text-[#55556a] hover:text-[#d0d0dd] bg-transparent border-none cursor-pointer font-sans z-10"
        >
          ×
        </button>

        {/* Tabs */}
        <div className="flex gap-1 mx-[clamp(20px,4vw,32px)] mt-5 mb-4">
          {(['person', 'item'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="text-[10px] tracking-[2px] uppercase font-light cursor-pointer transition-all duration-200 py-2 px-4 border-none"
              style={{
                background: tab === t ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: tab === t ? '#d0d0dd' : '#55556a',
                borderRadius: '8px',
              }}
            >
              {t === 'person' ? 'add person' : 'add item'}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          style={{
            overflowY: 'auto',
            touchAction: 'pan-y',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            padding: '0 clamp(20px, 4vw, 32px) clamp(20px, 4vw, 32px)',
            scrollbarWidth: 'none',
            flex: 1,
            minHeight: 0,
          }}
        >
          {tab === 'person' ? (
            <>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="search dots by name"
                autoComplete="off"
                className="w-full py-3 px-4 text-sm text-white font-sans outline-none transition-colors duration-300 placeholder:text-[#333] placeholder:font-light mb-3"
                style={inputStyle}
              />
              {searching && (
                <div className="text-[10px] text-white/20 font-light text-center py-4">searching...</div>
              )}
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleAddDot(r.id)}
                  className="w-full flex items-center gap-3 py-3 px-4 mb-1 cursor-pointer transition-all duration-200 border-none text-left hover:brightness-[1.1]"
                  style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}
                >
                  <div
                    style={{ width: 10, height: 10, borderRadius: '50%', background: r.color, flexShrink: 0 }}
                  />
                  <div>
                    <div className="text-sm text-white font-light">{r.name}</div>
                    <div className="text-[10px] text-white/25 font-light">{r.line}</div>
                  </div>
                </button>
              ))}
              {search.length >= 2 && !searching && results.length === 0 && (
                <div className="text-[10px] text-white/20 font-light text-center py-4">no dots found</div>
              )}
            </>
          ) : (
            <>
              {/* Name */}
              <div className="mb-4">
                <label className="text-[10px] tracking-[3px] uppercase text-[#55556a] mb-2 block font-normal">name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  placeholder="song, place, idea..."
                  autoComplete="off"
                  className="w-full py-3 px-4 text-sm text-white font-sans outline-none transition-colors duration-300 placeholder:text-[#333] placeholder:font-light"
                  style={inputStyle}
                />
              </div>

              {/* Color */}
              <div className="mb-4">
                <label className="text-[10px] tracking-[3px] uppercase text-[#55556a] mb-2 block font-normal">color</label>
                <ColorPicker selected={color} onChange={setColor} />
              </div>

              {/* Line */}
              <div className="mb-4">
                <label className="text-[10px] tracking-[3px] uppercase text-[#55556a] mb-2 block font-normal">description</label>
                <input
                  value={line}
                  onChange={(e) => setLine(e.target.value)}
                  maxLength={80}
                  placeholder="optional"
                  autoComplete="off"
                  className="w-full py-3 px-4 text-sm text-white font-sans outline-none transition-colors duration-300 placeholder:text-[#333] placeholder:font-light"
                  style={inputStyle}
                />
              </div>

              {/* Link */}
              <div className="mb-4">
                <label className="text-[10px] tracking-[3px] uppercase text-[#55556a] mb-2 block font-normal">link</label>
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="spotify, maps, url..."
                  autoComplete="off"
                  className="w-full py-3 px-4 text-sm text-white font-sans outline-none transition-colors duration-300 placeholder:text-[#333] placeholder:font-light"
                  style={inputStyle}
                />
              </div>

              {/* Add button */}
              <button
                onClick={handleAddItem}
                disabled={!name.trim() || adding}
                className="w-full py-3.5 border-none text-[13px] font-normal tracking-[1px] text-white cursor-pointer transition-all duration-300 mt-1 mb-4 hover:brightness-[1.15] hover:-translate-y-px active:scale-[0.98] disabled:opacity-30 disabled:cursor-default"
                style={{
                  background: mapColor,
                  borderRadius: '14px',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {adding ? '...' : 'add to map'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
