/**
 * Simple token-bucket rate limiter for Fathom API.
 *
 * Fathom limit: 60 requests per 60 seconds per user.
 * Retry: up to 3 times on HTTP 429 with exponential backoff.
 */

const ONE_MINUTE_MS = 60 * 1000;
const MAX_WAIT_MS = 30_000;
const MAX_429_RETRIES = 3;

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms

  constructor(maxTokens: number, refillPeriodMs: number) {
    this.maxTokens = maxTokens;
    this.refillRate = maxTokens / refillPeriodMs;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  tryConsume(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  msUntilAvailable(): number {
    this.refill();
    if (this.tokens >= 1) return 0;
    return Math.ceil((1 - this.tokens) / this.refillRate);
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(
      this.maxTokens,
      this.tokens + elapsed * this.refillRate,
    );
    this.lastRefill = now;
  }
}

// 60 requests per 60 seconds
const bucket = new TokenBucket(60, ONE_MINUTE_MS);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for rate limit capacity. Returns false if wait would exceed MAX_WAIT_MS.
 */
export async function waitForRateLimit(): Promise<
  { allowed: true } | { allowed: false; retryAfterMs: number }
> {
  if (bucket.tryConsume()) return { allowed: true };

  const waitMs = bucket.msUntilAvailable();
  if (waitMs > MAX_WAIT_MS) {
    return { allowed: false, retryAfterMs: waitMs };
  }

  console.error(
    `[rate-limit] Waiting ${Math.ceil(waitMs / 1000)}s for Fathom rate limit...`,
  );
  await sleep(waitMs);

  if (bucket.tryConsume()) return { allowed: true };
  return { allowed: false, retryAfterMs: bucket.msUntilAvailable() };
}

/**
 * Execute a Fathom API call with automatic retry on HTTP 429.
 * Exponential backoff: 2s, 4s, 8s.
 */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const is429 =
        msg.includes("429") || msg.toLowerCase().includes("rate limit");

      if (!is429 || attempt === MAX_429_RETRIES) throw e;

      const backoffMs = 2000 * Math.pow(2, attempt);
      console.error(
        `[rate-limit] Fathom 429 — backing off ${backoffMs / 1000}s (attempt ${attempt + 1}/${MAX_429_RETRIES})...`,
      );
      await sleep(backoffMs);
    }
  }
  throw new Error("Unreachable");
}
