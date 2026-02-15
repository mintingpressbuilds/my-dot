'use client';

import { useState, useEffect, useCallback } from 'react';
import { PALETTE, CARD_THEMES, type Vibe, type CardTheme } from '@/lib/colors';
import type { DotData } from '@/lib/data';
import ColorPicker from './ColorPicker';
import VibePicker from './VibePicker';

const THEME_LABELS: Record<CardTheme, string> = {
  default: 'default',
  glass: 'glass',
  neon: 'neon',
  minimal: 'minimal',
  gradient: 'gradient',
  noise: 'noise',
};

interface CardBuilderProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (dot: Omit<DotData, 'id' | 'px' | 'py' | 'pz' | 'hx' | 'hy' | 'hz' | 'vx' | 'vy' | 'vz' | 'friends' | 'grabbed'>) => void;
}

export default function CardBuilder({ open, onClose, onSubmit }: CardBuilderProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(PALETTE[4]);
  const [line, setLine] = useState('');
  const [vibe, setVibe] = useState<Vibe>('serene');
  const [theme, setTheme] = useState<CardTheme>('default');
  const [link, setLink] = useState('');

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const handleSubmit = useCallback(() => {
    onSubmit({
      name: name.trim() || 'anonymous',
      color,
      line: line.trim() || 'just got here',
      vibe,
      theme,
      link: link.trim(),
    });
    setName('');
    setLine('');
    setLink('');
    setColor(PALETTE[4]);
    setVibe('serene');
    setTheme('default');
  }, [name, color, line, vibe, theme, link, onSubmit]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        background: 'rgba(3,3,5,0.88)',
        backdropFilter: 'blur(40px)',
      }}
      onClick={onClose}
    >
      <div
        className="w-[min(420px,90vw)] max-h-[90vh] overflow-y-auto relative animate-slideUp max-sm:w-[94vw]"
        style={{
          background: '#0a0a10',
          border: '1px solid #1a1a24',
          borderRadius: '24px',
          padding: 'clamp(24px, 5vw, 40px) clamp(20px, 4vw, 32px)',
          scrollbarWidth: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-5 text-lg text-[#55556a] hover:text-[#d0d0dd] bg-transparent border-none cursor-pointer font-sans"
        >
          ×
        </button>

        <div className="font-serif text-[26px] italic text-white mb-1.5 tracking-tight">
          make your dot.
        </div>
        <div className="text-xs text-[#55556a] mb-7 font-light">
          join the universe
        </div>

        {/* name */}
        <div className="mb-5">
          <label className="text-[10px] max-sm:text-[11px] tracking-[3px] uppercase text-[#55556a] mb-2 block font-normal">
            name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="just a name"
            autoComplete="off"
            className="w-full py-3 px-4 text-sm text-white font-sans outline-none transition-colors duration-300 placeholder:text-[#333] placeholder:font-light"
            style={{
              background: '#030305',
              border: '1px solid #1a1a24',
              borderRadius: '12px',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#24243a')}
            onBlur={(e) => (e.target.style.borderColor = '#1a1a24')}
          />
        </div>

        {/* color */}
        <div className="mb-5">
          <label className="text-[10px] max-sm:text-[11px] tracking-[3px] uppercase text-[#55556a] mb-2 block font-normal">
            color
          </label>
          <ColorPicker selected={color} onChange={setColor} />
        </div>

        {/* line */}
        <div className="mb-5">
          <label className="text-[10px] max-sm:text-[11px] tracking-[3px] uppercase text-[#55556a] mb-2 block font-normal">
            your line
          </label>
          <input
            value={line}
            onChange={(e) => setLine(e.target.value)}
            maxLength={80}
            placeholder="a mood, a thought, anything"
            autoComplete="off"
            className="w-full py-3 px-4 text-sm text-white font-sans outline-none transition-colors duration-300 placeholder:text-[#333] placeholder:font-light"
            style={{
              background: '#030305',
              border: '1px solid #1a1a24',
              borderRadius: '12px',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#24243a')}
            onBlur={(e) => (e.target.style.borderColor = '#1a1a24')}
          />
        </div>

        {/* vibe */}
        <div className="mb-5">
          <label className="text-[10px] max-sm:text-[11px] tracking-[3px] uppercase text-[#55556a] mb-2 block font-normal">
            vibe
          </label>
          <VibePicker selected={vibe} onChange={setVibe} />
        </div>

        {/* card theme */}
        <div className="mb-5">
          <label className="text-[10px] max-sm:text-[11px] tracking-[3px] uppercase text-[#55556a] mb-2 block font-normal">
            card theme
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {CARD_THEMES.map((t) => (
              <div
                key={t}
                onClick={() => setTheme(t)}
                className="flex-shrink-0 cursor-pointer text-center transition-all duration-200"
                style={{ opacity: theme === t ? 1 : 0.5, width: 64 }}
              >
                <div
                  className="mb-1.5 transition-all duration-200"
                  style={{
                    width: 64,
                    height: 80,
                    borderRadius: t === 'minimal' ? 0 : 8,
                    border: theme === t ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    ...getThemePreviewStyle(t, color),
                  }}
                />
                <span className="text-[9px] tracking-[1px] text-[#55556a]">
                  {THEME_LABELS[t]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* link */}
        <div className="mb-5">
          <label className="text-[10px] max-sm:text-[11px] tracking-[3px] uppercase text-[#55556a] mb-2 block font-normal">
            link (optional)
          </label>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="your website, playlist, project"
            autoComplete="off"
            className="w-full py-3 px-4 text-sm text-white font-sans outline-none transition-colors duration-300 placeholder:text-[#333] placeholder:font-light"
            style={{
              background: '#030305',
              border: '1px solid #1a1a24',
              borderRadius: '12px',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#24243a')}
            onBlur={(e) => (e.target.style.borderColor = '#1a1a24')}
          />
        </div>

        <button
          onClick={handleSubmit}
          className="w-full py-3.5 border-none text-[13px] font-normal tracking-[1px] text-white cursor-pointer transition-all duration-300 mt-2 hover:brightness-[1.15] hover:-translate-y-px"
          style={{
            background: color,
            borderRadius: '14px',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          join the universe
        </button>
      </div>
    </div>
  );
}

function getThemePreviewStyle(theme: CardTheme, color: string): React.CSSProperties {
  switch (theme) {
    case 'glass':
      return { background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)' };
    case 'neon':
      return { background: '#050508', boxShadow: `0 0 8px ${color}40, inset 0 0 8px ${color}15`, borderColor: color };
    case 'minimal':
      return { background: '#000' };
    case 'gradient':
      return { background: `linear-gradient(145deg, ${color} 0%, #0a0a12 100%)` };
    case 'noise':
      return { background: '#0a0a10', backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.15\'/%3E%3C/svg%3E")' };
    default:
      return { background: `radial-gradient(circle at 30% 30%, ${color}20, #0a0a12 70%)` };
  }
}
