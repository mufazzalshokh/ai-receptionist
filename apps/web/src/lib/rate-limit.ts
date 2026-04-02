/**
 * Simple in-memory sliding-window rate limiter.
 * For production with multiple serverless instances, swap to Upstash @upstash/ratelimit.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetMs: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  cleanup(windowMs);

  const cutoff = now - windowMs;
  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= limit) {
    const oldestInWindow = entry.timestamps[0];
    return {
      success: false,
      remaining: 0,
      resetMs: oldestInWindow + windowMs - now,
    };
  }

  entry.timestamps.push(now);

  return {
    success: true,
    remaining: limit - entry.timestamps.length,
    resetMs: windowMs,
  };
}

/**
 * Extract client IP from request headers (works behind Vercel/Cloudflare proxy).
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
