/**
 * Lightweight in-memory token-bucket rate limiter.
 *
 * Suitable for a single-instance deployment and for protecting expensive
 * endpoints (AI, import). For multi-instance horizontal scaling, swap the
 * Map for an Upstash/Redis-backed store behind the same interface.
 */

type Bucket = { tokens: number; updatedAt: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Max requests allowed within the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetMs: number;
}

export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const refillRate = opts.limit / opts.windowMs; // tokens per ms
  const existing = buckets.get(key);

  if (!existing) {
    buckets.set(key, { tokens: opts.limit - 1, updatedAt: now });
    return { success: true, remaining: opts.limit - 1, resetMs: opts.windowMs };
  }

  const elapsed = now - existing.updatedAt;
  const refilled = Math.min(opts.limit, existing.tokens + elapsed * refillRate);

  if (refilled < 1) {
    const resetMs = Math.ceil((1 - refilled) / refillRate);
    buckets.set(key, { tokens: refilled, updatedAt: now });
    return { success: false, remaining: 0, resetMs };
  }

  buckets.set(key, { tokens: refilled - 1, updatedAt: now });
  return { success: true, remaining: Math.floor(refilled - 1), resetMs: opts.windowMs };
}

// Occasionally evict stale buckets to bound memory.
let lastSweep = Date.now();
export function sweepRateLimiter(maxAgeMs = 60 * 60 * 1000): void {
  const now = Date.now();
  if (now - lastSweep < 5 * 60 * 1000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.updatedAt > maxAgeMs) buckets.delete(key);
  }
}
