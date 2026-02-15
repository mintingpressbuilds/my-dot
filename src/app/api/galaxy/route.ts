import { NextResponse } from 'next/server';
import { db } from '@/db';
import { dots, connections } from '@/db/schema';

let redisClient: import('@upstash/redis').Redis | null = null;

async function getRedis() {
  if (!process.env.REDIS_URL) return null;
  if (!redisClient) {
    const { Redis } = await import('@upstash/redis');
    redisClient = Redis.fromEnv();
  }
  return redisClient;
}

const CACHE_KEY = 'galaxy:state';
const CACHE_TTL = 300; // 5 minutes

export async function GET() {
  try {
    // try cache first
    const redis = await getRedis();
    if (redis) {
      const cached = await redis.get(CACHE_KEY);
      if (cached) {
        return NextResponse.json(cached, {
          headers: { 'X-Cache': 'HIT' },
        });
      }
    }

    // fetch all dots
    const allDots = await db
      .select({
        id: dots.id,
        slug: dots.slug,
        name: dots.name,
        color: dots.color,
        line: dots.line,
        vibe: dots.vibe,
        x: dots.posX,
        y: dots.posY,
        z: dots.posZ,
      })
      .from(dots);

    // fetch all connections
    const allConnections = await db
      .select({
        fromDotId: connections.fromDotId,
        toDotId: connections.toDotId,
      })
      .from(connections);

    // build index map for connections
    const dotIdToIndex = new Map<string, number>();
    allDots.forEach((d, i) => dotIdToIndex.set(d.id, i));

    const connectionPairs: [number, number][] = allConnections
      .map((c) => {
        const from = dotIdToIndex.get(c.fromDotId);
        const to = dotIdToIndex.get(c.toDotId);
        if (from !== undefined && to !== undefined) {
          return [from, to] as [number, number];
        }
        return null;
      })
      .filter((p): p is [number, number] => p !== null);

    const galaxyState = {
      dots: allDots,
      connections: connectionPairs,
      updatedAt: new Date().toISOString(),
    };

    // cache
    if (redis) {
      await redis.set(CACHE_KEY, JSON.stringify(galaxyState), { ex: CACHE_TTL });
    }

    return NextResponse.json(galaxyState, {
      headers: { 'X-Cache': 'MISS' },
    });
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
