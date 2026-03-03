/// lib/rate-limit.ts
// In-memory rate limiter stub — resets on cold start.
// Replace with Redis (Upstash) for production reliability.

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, retryAfterMs: 0 };
}

// Specific limiters
export function rateProtocolCreate(userId: string, plan: string) {
  if (plan !== "free") return { allowed: true, retryAfterMs: 0 };
  return checkRateLimit(`protocol:${userId}`, 3, 30 * 24 * 60 * 60 * 1000);
}

export function rateUploadsSign(userId: string) {
  return checkRateLimit(`uploads-sign:${userId}`, 50, 60 * 60 * 1000);
}
