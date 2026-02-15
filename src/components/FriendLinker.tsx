'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface FriendLinkerProps {
  targetSlug: string;
  targetDotId: string;
  isAlreadyConnected?: boolean;
}

export default function FriendLinker({ targetSlug, targetDotId, isAlreadyConnected = false }: FriendLinkerProps) {
  const { isAuthenticated, dot } = useAuth();
  const [connected, setConnected] = useState(isAlreadyConnected);
  const [loading, setLoading] = useState(false);

  const isSelf = dot?.id === targetDotId;

  const handleConnect = useCallback(async () => {
    if (connected || loading || !isAuthenticated) return;
    setLoading(true);
    try {
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetSlug }),
      });
      if (res.ok || res.status === 409) {
        setConnected(true);
      }
    } finally {
      setLoading(false);
    }
  }, [targetSlug, connected, loading, isAuthenticated]);

  // don't show if not authenticated or viewing self
  if (!isAuthenticated || !dot || isSelf) return null;

  return (
    <button
      onClick={handleConnect}
      disabled={connected || loading}
      className="text-[11px] tracking-[1px] font-light cursor-pointer transition-all duration-300"
      style={{
        padding: '8px 16px',
        borderRadius: '20px',
        background: connected ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
        border: connected ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.06)',
        color: connected ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)',
        fontFamily: "'DM Sans', sans-serif",
        opacity: loading ? 0.5 : 1,
      }}
    >
      {connected ? 'in your constellation' : 'add to my constellation'}
    </button>
  );
}
