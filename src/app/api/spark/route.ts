import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '@/db';
import { sparks, dots } from '@/db/schema';
import { createRateLimiter, checkRateLimit } from '@/middleware/rate-limit';

const rateLimiter = createRateLimiter('spark', 10, '1 h');

async function hashSession(ip: string, ua: string): Promise<string> {
  const data = new TextEncoder().encode(`${ip}:${ua}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function POST(req: Request) {
  try {
    const { dotId } = await req.json();
    if (!dotId) {
      return NextResponse.json({ message: 'dotId required' }, { status: 400 });
    }

    // verify dot exists
    const [dot] = await db
      .select()
      .from(dots)
      .where(eq(dots.id, dotId))
      .limit(1);

    if (!dot) {
      return NextResponse.json({ message: 'Dot not found' }, { status: 404 });
    }

    // compute session hash
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const ua = req.headers.get('user-agent') || 'unknown';
    const sessionHash = await hashSession(ip, ua);

    // rate limit per session
    const rateResult = await checkRateLimit(rateLimiter, sessionHash);
    if (!rateResult.success) {
      return NextResponse.json({ message: 'Too many sparks' }, { status: 429 });
    }

    // check 24h cooldown per session per dot
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [recentSpark] = await db
      .select()
      .from(sparks)
      .where(
        and(
          eq(sparks.dotId, dotId),
          eq(sparks.sessionHash, sessionHash),
          gt(sparks.createdAt, oneDayAgo),
        ),
      )
      .limit(1);

    if (recentSpark) {
      return NextResponse.json({ message: 'Already sparked this dot recently' }, { status: 429 });
    }

    // create spark
    await db.insert(sparks).values({
      id: nanoid(12),
      dotId,
      sessionHash,
    });

    // increment spark count
    await db
      .update(dots)
      .set({ sparkCount: dot.sparkCount + 1 })
      .where(eq(dots.id, dotId));

    return NextResponse.json({ message: 'Sparked!' }, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
