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
  const keysToDelete: string[] = [];
  for (const [key, entry] of store) {
    const filtered = entry.timestamps.filter((t) => t > cutoff);
    if (filtered.length === 0) {
      keysToDelete.push(key);
    } else {
      store.set(key, { timestamps: filtered });
    }
  }
  for (const key of keysToDelete) {
    store.delete(key);
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

  // Remove expired timestamps (immutable update)
  const filtered = entry.timestamps.filter((t) => t > cutoff);

  if (filtered.length >= limit) {
    store.set(key, { timestamps: filtered });
    return {
      success: false,
      remaining: 0,
      resetMs: filtered[0] + windowMs - now,
    };
  }

  store.set(key, { timestamps: [...filtered, now] });

  return {
    success: true,
    remaining: limit - filtered.length - 1,
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
