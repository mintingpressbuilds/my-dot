'use client';

import { useEffect } from 'react';
import type { DotData } from '@/lib/data';
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

export default function CardPreview({ dot, onClose, friends = [] }: CardPreviewProps) {
  const { dot: myDot } = useAuth();
  const isOwner = !!(myDot && dot && myDot.id === String(dot.id));
  // escape to close
  useEffect(() => {
    if (!dot) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [dot, onClose]);

  if (!dot) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
      style={{ background: '#030305' }}
    >
      {/* card frame */}
      <div
        className="w-[min(380px,88vw)] max-sm:w-[92vw] overflow-hidden relative animate-cardPop"
        style={{
          borderRadius: '24px',
          boxShadow: '0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        {/* generative backdrop */}
        <div className="absolute inset-0">
          <CardBackdrop name={dot.name} color={dot.color} />
        </div>

        {/* card content */}
        <div
          className="relative z-[2] flex flex-col"
          style={{
            padding: '48px 36px 36px',
            minHeight: '440px',
          }}
        >
          <div className="font-serif text-[38px] max-sm:text-[30px] italic text-white tracking-tight mb-2"
            style={{ textShadow: '0 2px 30px rgba(0,0,0,0.4)' }}
          >
            {dot.name}
          </div>
          <div className="text-sm text-white/45 font-light leading-relaxed mb-auto max-w-[280px]">
            {dot.line}
          </div>
          {dot.link && (
            <a
              href={dot.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-white/30 no-underline mt-7 block hover:text-white/60"
            >
              {dot.link.replace(/https?:\/\//, '')}
            </a>
          )}
          {/* mini constellation */}
          {friends.length > 0 && (
            <div className="mt-4">
              <MiniConstellation friends={friends} centerColor={dot.color} />
            </div>
          )}

          {/* spark button + count (owner only) */}
          <div className="mt-3">
            <SparkButton dotId={String(dot.id)} dotColor={dot.color} isOwner={isOwner} />
          </div>

          <div className="flex justify-between mt-5 pt-3.5 border-t border-white/5">
            <div className="text-[9px] tracking-[2px] uppercase text-white/15 font-light">
              {dot.vibe}
            </div>
            <div className="font-serif italic text-[11px] text-white/[0.12]">
              my dot.
            </div>
          </div>
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
          save my dot
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
