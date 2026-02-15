'use client';

import { useEffect } from 'react';
import type { DotData } from '@/lib/data';
import { rgba } from '@/lib/colors';
import CardBackdrop from './CardBackdrop';
import MiniConstellation from './MiniConstellation';
import SparkButton from './SparkButton';
import { exportDotHtml } from './ExportEngine';
import { useAuth } from '@/hooks/useAuth';

interface FriendDot {
  id: string;
  slug: string;
  name: string;
  color: string;
  mutual?: boolean;
}

interface CardPreviewProps {
  dot: DotData | null;
  onClose: () => void;
  friends?: FriendDot[];
}

function getCardFrameStyle(theme: string, color: string): React.CSSProperties {
  switch (theme) {
    case 'glass':
      return {
        borderRadius: '24px',
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(40px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 40px 100px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05)',
      };
    case 'neon':
      return {
        borderRadius: '24px',
        background: '#050508',
        border: `1px solid ${color}`,
        boxShadow: `0 0 15px ${rgba(color, 0.3)}, 0 0 60px ${rgba(color, 0.1)}, inset 0 0 30px ${rgba(color, 0.05)}`,
      };
    case 'minimal':
      return {
        borderRadius: '0',
        background: '#000000',
        border: 'none',
        boxShadow: 'none',
      };
    case 'gradient':
      return {
        borderRadius: '24px',
        background: `linear-gradient(145deg, ${color} 0%, ${rgba(color, 0.4)} 40%, #0a0a12 100%)`,
        border: 'none',
        boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
      };
    case 'noise':
      return {
        borderRadius: '24px',
        background: '#0a0a10',
        boxShadow: '0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
      };
    default:
      return {
        borderRadius: '24px',
        boxShadow: '0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
      };
  }
}

function getContentStyle(theme: string): { padding: string; minHeight: string; nameColor: string; lineColor: string; vibeColor: string; nameAlign?: string } {
  switch (theme) {
    case 'minimal':
      return { padding: '60px', minHeight: '440px', nameColor: '#fff', lineColor: 'rgba(255,255,255,0.3)', vibeColor: 'transparent', nameAlign: 'flex-end' };
    case 'neon':
      return { padding: '48px 36px 36px', minHeight: '440px', nameColor: 'inherit', lineColor: 'rgba(255,255,255,0.5)', vibeColor: 'rgba(255,255,255,0.15)' };
    case 'gradient':
      return { padding: '48px 36px 36px', minHeight: '440px', nameColor: '#fff', lineColor: 'rgba(255,255,255,0.6)', vibeColor: 'rgba(255,255,255,0.15)' };
    case 'noise':
      return { padding: '48px 36px 36px', minHeight: '440px', nameColor: '#f0e8d8', lineColor: 'rgba(200,190,170,0.45)', vibeColor: 'rgba(255,255,255,0.15)' };
    default:
      return { padding: '48px 36px 36px', minHeight: '440px', nameColor: '#fff', lineColor: 'rgba(255,255,255,0.45)', vibeColor: 'rgba(255,255,255,0.15)' };
  }
}

export default function CardPreview({ dot, onClose, friends = [] }: CardPreviewProps) {
  const { dot: myDot } = useAuth();
  const isOwner = !!(myDot && dot && myDot.id === String(dot.id));

  useEffect(() => {
    if (!dot) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [dot, onClose]);

  if (!dot) return null;

  const theme = dot.theme || 'default';
  const frameStyle = getCardFrameStyle(theme, dot.color);
  const cs = getContentStyle(theme);
  const showBackdrop = theme !== 'neon' && theme !== 'minimal' && theme !== 'gradient';
  const nameTextShadow = theme === 'neon'
    ? `0 0 20px ${rgba(dot.color, 0.6)}, 0 0 40px ${rgba(dot.color, 0.3)}`
    : '0 2px 30px rgba(0,0,0,0.4)';

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
      style={{ background: '#030305' }}
    >
      {/* card frame */}
      <div
        className="w-[min(380px,88vw)] max-sm:w-[92vw] overflow-hidden relative animate-cardPop"
        style={frameStyle}
      >
        {/* generative backdrop */}
        {showBackdrop && (
          <div className="absolute inset-0">
            <CardBackdrop name={dot.name} color={dot.color} theme={theme} />
          </div>
        )}

        {/* card content */}
        <div
          className="relative z-[2] flex flex-col"
          style={{
            padding: cs.padding,
            minHeight: cs.minHeight,
            justifyContent: cs.nameAlign === 'flex-end' ? 'flex-end' : undefined,
          }}
        >
          <div
            className={`font-serif ${theme === 'minimal' ? 'text-[48px]' : 'text-[38px] max-sm:text-[30px]'} italic tracking-tight mb-2`}
            style={{
              color: theme === 'neon' ? dot.color : cs.nameColor,
              textShadow: nameTextShadow,
            }}
          >
            {dot.name}
          </div>
          <div
            className={`text-sm font-light leading-relaxed max-w-[280px] ${theme === 'minimal' ? '' : 'mb-auto'}`}
            style={{ color: cs.lineColor }}
          >
            {dot.line}
          </div>
          {dot.link && theme !== 'minimal' && (
            <a
              href={dot.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-white/30 no-underline mt-7 block hover:text-white/60"
            >
              {dot.link.replace(/https?:\/\//, '')}
            </a>
          )}
          {friends.length > 0 && theme !== 'minimal' && (
            <div className="mt-4">
              <MiniConstellation friends={friends} centerColor={dot.color} />
            </div>
          )}

          {theme !== 'minimal' && (
            <div className="mt-3">
              <SparkButton dotId={String(dot.id)} dotColor={dot.color} isOwner={isOwner} />
            </div>
          )}

          {theme !== 'minimal' && (
            <div className="flex justify-between mt-5 pt-3.5 border-t border-white/5">
              <div className="text-[9px] tracking-[2px] uppercase font-light" style={{ color: theme === 'neon' ? rgba(dot.color, 0.3) : cs.vibeColor }}>
                {dot.vibe}
              </div>
              <div className="font-serif italic text-[11px] text-white/[0.12]">
                my dot.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* action buttons */}
      <div className="flex gap-2.5 mt-6 w-[min(380px,88vw)] max-sm:w-[92vw] animate-fadeIn">
        <button
          onClick={() => exportDotHtml(dot)}
          className="flex-1 py-3.5 text-xs text-white cursor-pointer transition-all duration-300 text-center font-normal tracking-[0.5px] border-none hover:brightness-[1.15]"
          style={{
            background: dot.color,
            borderRadius: '14px',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          export my dot
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-3.5 text-xs cursor-pointer transition-all duration-300 text-center font-normal tracking-[0.5px] hover:border-[#24243a]"
          style={{
            background: '#0a0a10',
            border: '1px solid #1a1a24',
            borderRadius: '14px',
            color: '#d0d0dd',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          back to galaxy
        </button>
      </div>
    </div>
  );
}
