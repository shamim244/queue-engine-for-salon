export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number; // seconds to wait
}

class SlidingWindowRateLimiter {
  private attempts = new Map<string, number[]>();

  /**
   * Check if an action is allowed under the sliding window limit.
   * If allowed, records the attempt timestamp.
   */
  checkLimit(key: string, maxAttempts: number, windowSeconds: number): RateLimitResult {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    const timestamps = (this.attempts.get(key) || []).filter(ts => ts > windowStart);

    if (timestamps.length >= maxAttempts) {
      const oldestAttempt = timestamps[0];
      const retryAfter = Math.ceil((oldestAttempt + windowMs - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.max(1, retryAfter),
      };
    }

    timestamps.push(now);
    this.attempts.set(key, timestamps);

    // Periodic bounded eviction to avoid memory growth from unique client IPs
    if (this.attempts.size > 2000) {
      for (const [k, v] of this.attempts.entries()) {
        if (!v.some(ts => ts > windowStart)) {
          this.attempts.delete(k);
        }
      }
    }

    return {
      allowed: true,
      remaining: Math.max(0, maxAttempts - timestamps.length),
    };
  }

  /**
   * Peak check without recording an attempt (e.g. before executing).
   */
  isBlocked(key: string, maxAttempts: number, windowSeconds: number): RateLimitResult {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    const timestamps = (this.attempts.get(key) || []).filter(ts => ts > windowStart);

    if (timestamps.length >= maxAttempts) {
      const oldestAttempt = timestamps[0];
      const retryAfter = Math.ceil((oldestAttempt + windowMs - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.max(1, retryAfter),
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, maxAttempts - timestamps.length),
    };
  }

  /**
   * Reset attempts for a key (e.g., after successful login or PIN switch).
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Clear all records (useful for test isolation).
   */
  clearAll(): void {
    this.attempts.clear();
  }

  /**
   * Extract client IP safely from request headers.
   */
  getClientIp(headers: Headers | Record<string, string | undefined>): string {
    const get = (name: string): string | undefined => {
      if (headers instanceof Headers) {
        return headers.get(name) || undefined;
      }
      return headers[name] || headers[name.toLowerCase()];
    };

    const cfIp = get('cf-connecting-ip');
    if (cfIp) return cfIp.trim();

    const xForwarded = get('x-forwarded-for');
    if (xForwarded) {
      const parts = xForwarded.split(',');
      if (parts.length > 0 && parts[0].trim()) {
        return parts[0].trim();
      }
    }

    const realIp = get('x-real-ip');
    if (realIp) return realIp.trim();

    return '127.0.0.1';
  }
}

export const rateLimiter = new SlidingWindowRateLimiter();
