'use client';

import { useState, useCallback, useEffect } from 'react';

interface SparkButtonProps {
  dotId: string;
  dotColor: string;
  sparkCount?: number;
  isOwner?: boolean;
}

function getSparkKey(dotId: string): string {
  return `spark:${dotId}`;
}

function hasRecentlySparked(dotId: string): boolean {
  if (typeof window === 'undefined') return false;
  const ts = localStorage.getItem(getSparkKey(dotId));
  if (!ts) return false;
  const elapsed = Date.now() - parseInt(ts, 10);
  return elapsed < 24 * 60 * 60 * 1000; // 24h
}

export default function SparkButton({ dotId, dotColor, sparkCount, isOwner = false }: SparkButtonProps) {
  const [sparked, setSparked] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSparked(hasRecentlySparked(dotId));
  }, [dotId]);

  const handleSpark = useCallback(async () => {
    if (sparked || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/spark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dotId }),
      });
      if (res.ok || res.status === 429) {
        setSparked(true);
        localStorage.setItem(getSparkKey(dotId), String(Date.now()));
        // glow animation
        setAnimating(true);
        setTimeout(() => setAnimating(false), 600);
      }
    } finally {
      setLoading(false);
    }
  }, [dotId, sparked, loading]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSpark}
        disabled={sparked || loading}
        className="relative transition-all duration-300"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: sparked ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          cursor: sparked ? 'default' : 'pointer',
          opacity: loading ? 0.5 : 1,
          boxShadow: animating ? `0 0 20px ${dotColor}40, 0 0 40px ${dotColor}20` : 'none',
        }}
        title={sparked ? 'sparked' : 'send a spark'}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <path
            d="M7 1L8.5 5.5L13 7L8.5 8.5L7 13L5.5 8.5L1 7L5.5 5.5L7 1Z"
            fill={sparked ? dotColor : 'rgba(255,255,255,0.2)'}
            opacity={sparked ? 0.8 : 1}
          />
        </svg>
      </button>
      {/* spark count only visible to owner */}
      {isOwner && sparkCount !== undefined && sparkCount > 0 && (
        <span className="text-[10px] text-white/20 font-light">
          {sparkCount}
        </span>
      )}
    </div>
  );
}
