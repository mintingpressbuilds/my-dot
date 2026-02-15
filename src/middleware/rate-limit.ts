import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (!redis) {
    redis = Redis.fromEnv();
  }
  return redis;
}

export function createRateLimiter(
  prefix: string,
  requests: number,
  window: `${number} s` | `${number} m` | `${number} h` | `${number} d`,
) {
  const r = getRedis();
  if (!r) return null;

  return new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: `ratelimit:${prefix}`,
  });
}

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<{ success: boolean; remaining?: number }> {
  if (!limiter) return { success: true };

  const result = await limiter.limit(identifier);
  return { success: result.success, remaining: result.remaining };
}
