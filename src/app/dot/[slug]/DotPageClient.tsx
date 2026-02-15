'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function DotPageClient({ dot, friends, isConnected }: DotPageClientProps) {
  const router = useRouter();
  const { dot: myDot } = useAuth();
  const isOwner = myDot?.id === dot.id;
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center" style={{ background: '#030305' }}>
      {/* full-screen generative backdrop */}
      <div className="fixed inset-0 z-0 opacity-60">
        <CardBackdrop name={dot.name} color={dot.color} />
      </div>

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
          style={{
            borderRadius: '24px',
            boxShadow: '0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        >
          {/* card backdrop */}
          <div className="absolute inset-0">
            <CardBackdrop name={dot.name} color={dot.color} />
          </div>

          {/* card content */}
          <div
            className="relative z-[2] flex flex-col"
            style={{ padding: '48px 36px 36px', minHeight: '440px' }}
          >
            <div
              className="font-serif text-[38px] max-sm:text-[30px] italic text-white tracking-tight mb-2"
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
                <MiniConstellation
                  friends={friends}
                  centerColor={dot.color}
                  onFriendClick={(slug) => router.push(`/dot/${slug}`)}
                />
              </div>
            )}

            {/* spark button */}
            <div className="mt-3">
              <SparkButton
                dotId={dot.id}
                dotColor={dot.color}
                sparkCount={dot.sparkCount}
                isOwner={isOwner}
              />
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
                padding: '8px 16px',
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
