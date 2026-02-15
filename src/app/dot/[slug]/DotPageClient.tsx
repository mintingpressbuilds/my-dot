'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { rgba } from '@/lib/colors';
import CardBackdrop from '@/components/CardBackdrop';
import MiniConstellation from '@/components/MiniConstellation';
import SparkButton from '@/components/SparkButton';
import FriendLinker from '@/components/FriendLinker';
import ShareSheet from '@/components/ShareSheet';
import { useAuth } from '@/hooks/useAuth';

interface FriendDot {
  id: string;
  slug: string;
  name: string;
  color: string;
  mutual: boolean;
}

interface DotData {
  id: string;
  slug: string;
  name: string;
  color: string;
  line: string;
  vibe: string;
  theme?: string;
  link: string | null;
  sparkCount: number;
  createdAt: string;
}

interface DotPageClientProps {
  dot: DotData;
  friends: FriendDot[];
  isConnected: boolean;
}

function formatSince(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'];
  return `since ${months[d.getMonth()]} ${d.getFullYear()}`;
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

export default function DotPageClient({ dot, friends, isConnected }: DotPageClientProps) {
  const router = useRouter();
  const { dot: myDot } = useAuth();
  const isOwner = myDot?.id === dot.id;
  const [shareOpen, setShareOpen] = useState(false);

  const theme = dot.theme || 'default';
  const frameStyle = getCardFrameStyle(theme, dot.color);
  const cs = getContentStyle(theme);
  const showBackdrop = theme !== 'neon' && theme !== 'minimal' && theme !== 'gradient';
  const isMinimal = theme === 'minimal';
  const nameTextShadow = theme === 'neon'
    ? `0 0 20px ${rgba(dot.color, 0.6)}, 0 0 40px ${rgba(dot.color, 0.3)}`
    : '0 2px 30px rgba(0,0,0,0.4)';

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center" style={{ background: '#030305' }}>
      {/* full-screen generative backdrop */}
      {showBackdrop && (
        <div className="fixed inset-0 z-0 opacity-60">
          <CardBackdrop name={dot.name} color={dot.color} theme={theme} />
        </div>
      )}

      {/* top bar */}
      <div className="fixed top-0 left-0 right-0 z-20 flex justify-between items-center px-7 py-6 max-sm:px-4 max-sm:py-4">
        <a
          href="/"
          className="font-serif text-[22px] max-sm:text-[18px] italic text-white/60 tracking-tight no-underline"
        >
          my dot<span className="text-[#55556a] not-italic font-extralight">.</span>
        </a>
      </div>

      {/* card */}
      <div className="relative z-10 w-[min(380px,88vw)] max-sm:w-[92vw]">
        <div
          className="overflow-hidden relative"
          style={frameStyle}
        >
          {/* card backdrop */}
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
              className={`font-serif ${isMinimal ? 'text-[48px]' : 'text-[38px] max-sm:text-[30px]'} italic tracking-tight mb-2`}
              style={{
                color: theme === 'neon' ? dot.color : cs.nameColor,
                textShadow: nameTextShadow,
              }}
            >
              {dot.name}
            </div>
            <div
              className={`text-sm font-light leading-relaxed max-w-[280px] ${isMinimal ? '' : 'mb-auto'}`}
              style={{ color: cs.lineColor }}
            >
              {dot.line}
            </div>

            {dot.link && !isMinimal && (
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
            {friends.length > 0 && !isMinimal && (
              <div className="mt-4">
                <MiniConstellation
                  friends={friends}
                  centerColor={dot.color}
                  onFriendClick={(slug) => router.push(`/dot/${slug}`)}
                />
              </div>
            )}

            {/* spark button */}
            {!isMinimal && (
              <div className="mt-3">
                <SparkButton
                  dotId={dot.id}
                  dotColor={dot.color}
                  sparkCount={dot.sparkCount}
                  isOwner={isOwner}
                />
              </div>
            )}

            {!isMinimal && (
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

        {/* actions below card */}
        <div className="flex flex-col items-center gap-3 mt-6">
          {/* constellation + share row */}
          <div className="flex gap-2.5 w-full">
            <FriendLinker
              targetSlug={dot.slug}
              targetDotId={dot.id}
              isAlreadyConnected={isConnected}
            />
            <button
              onClick={() => setShareOpen(true)}
              className="text-[11px] tracking-[1px] font-light cursor-pointer transition-all duration-300"
              style={{
                padding: '12px 16px',
                minHeight: '44px',
                borderRadius: '20px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.3)',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              share
            </button>
          </div>

          {/* since date */}
          <div className="text-[10px] tracking-[1.5px] text-white/15 font-light">
            {formatSince(dot.createdAt)}
          </div>
        </div>
      </div>

      {/* share sheet */}
      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        dot={dot}
      />
    </div>
  );
}
