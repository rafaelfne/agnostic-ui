import { describe, it, expect } from 'vitest';
import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import {
  resolveRateLimitPolicy,
  resolveRateLimitStore,
  rateLimitKey,
  checkRateLimit,
  enforceRateLimit,
  type RateLimitStore,
} from '../infra/auth/rateLimit';

/** In-memory fixed-window store standing in for Upstash Redis. */
class FakeStore implements RateLimitStore {
  readonly counts = new Map<string, number>();
  readonly ttls = new Map<string, number>();
  incr(key: string): Promise<number> {
    const next = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, next);
    return Promise.resolve(next);
  }
  pexpire(key: string, ms: number): Promise<number> {
    this.ttls.set(key, ms);
    return Promise.resolve(1);
  }
}

/** A store whose every call rejects — exercises the fail-open path. */
const brokenStore: RateLimitStore = {
  incr: () => Promise.reject(new Error('redis down')),
  pexpire: () => Promise.reject(new Error('redis down')),
};

const liveCtx: ExecutionContext = { mode: 'live', tenantId: 'partnerco', customerId: 'cus_42' };

function request(headers: Record<string, string> = {}): Request {
  return new Request('https://bff.test/api/balance', { headers });
}

describe('resolveRateLimitPolicy', () => {
  it('falls back to the defaults when nothing is set', () => {
    expect(resolveRateLimitPolicy({})).toEqual({ max: 120, windowMs: 60_000 });
  });

  it('reads max and window from the env', () => {
    expect(resolveRateLimitPolicy({ RATE_LIMIT_MAX: '5', RATE_LIMIT_WINDOW_MS: '1000' })).toEqual({
      max: 5,
      windowMs: 1000,
    });
  });

  it('ignores non-positive or non-numeric overrides', () => {
    expect(resolveRateLimitPolicy({ RATE_LIMIT_MAX: '0', RATE_LIMIT_WINDOW_MS: 'nope' })).toEqual({
      max: 120,
      windowMs: 60_000,
    });
  });
});

describe('resolveRateLimitStore', () => {
  it('returns null (disabled) when either credential is missing', () => {
    expect(resolveRateLimitStore({ UPSTASH_REDIS_REST_URL: 'https://r.test' })).toBeNull();
    expect(resolveRateLimitStore({ UPSTASH_REDIS_REST_TOKEN: 't' })).toBeNull();
    expect(resolveRateLimitStore({})).toBeNull();
  });

  it('treats whitespace-only credentials as unset', () => {
    expect(
      resolveRateLimitStore({ UPSTASH_REDIS_REST_URL: '  ', UPSTASH_REDIS_REST_TOKEN: '  ' }),
    ).toBeNull();
  });

  it('builds a store when both credentials are present', () => {
    const store = resolveRateLimitStore({
      UPSTASH_REDIS_REST_URL: 'https://r.test',
      UPSTASH_REDIS_REST_TOKEN: 'token',
    });
    expect(store).not.toBeNull();
    expect(typeof store?.incr).toBe('function');
    expect(typeof store?.pexpire).toBe('function');
  });
});

describe('rateLimitKey', () => {
  it('keys by tenant + subject', () => {
    expect(rateLimitKey(liveCtx, request())).toBe('ratelimit:partnerco:cus_42');
  });

  it('falls back to the first x-forwarded-for hop when there is no subject', () => {
    const ctx: ExecutionContext = { mode: 'live', tenantId: 'partnerco', customerId: '' };
    expect(rateLimitKey(ctx, request({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe(
      'ratelimit:partnerco:ip:203.0.113.7',
    );
  });

  it('falls back to x-real-ip, then to "unknown"', () => {
    const ctx: ExecutionContext = { mode: 'live', tenantId: 'partnerco', customerId: '' };
    expect(rateLimitKey(ctx, request({ 'x-real-ip': '198.51.100.4' }))).toBe(
      'ratelimit:partnerco:ip:198.51.100.4',
    );
    expect(rateLimitKey(ctx, request())).toBe('ratelimit:partnerco:ip:unknown');
  });
});

describe('checkRateLimit', () => {
  it('sets the window TTL only on the first hit and counts up', async () => {
    const store = new FakeStore();
    const policy = { max: 3, windowMs: 1000 };

    const first = await checkRateLimit('k', store, policy);
    expect(first).toEqual({ allowed: true, limit: 3, remaining: 2, count: 1 });
    expect(store.ttls.get('k')).toBe(1000);

    const second = await checkRateLimit('k', store, policy);
    expect(second).toMatchObject({ allowed: true, remaining: 1, count: 2 });
    // TTL is not refreshed on later hits within the window.
    expect(store.ttls.size).toBe(1);
  });

  it('allows up to the limit and blocks the next request', async () => {
    const store = new FakeStore();
    const policy = { max: 2, windowMs: 1000 };
    expect((await checkRateLimit('k', store, policy)).allowed).toBe(true);
    expect((await checkRateLimit('k', store, policy)).allowed).toBe(true);
    const blocked = await checkRateLimit('k', store, policy);
    expect(blocked).toEqual({ allowed: false, limit: 2, remaining: 0, count: 3 });
  });

  it('fails open when the store throws', async () => {
    const result = await checkRateLimit('k', brokenStore, { max: 1, windowMs: 1000 });
    expect(result.allowed).toBe(true);
  });
});

describe('enforceRateLimit', () => {
  it('is a no-op (null) when Upstash is unconfigured', async () => {
    await expect(enforceRateLimit(request(), liveCtx, {})).resolves.toBeNull();
  });

  it('passes the request through while under the limit', async () => {
    const store = new FakeStore();
    await expect(
      enforceRateLimit(request(), liveCtx, { RATE_LIMIT_MAX: '2' }, store),
    ).resolves.toBeNull();
  });

  it('returns a 429 with Retry-After once the window is exhausted', async () => {
    const store = new FakeStore();
    const env = { RATE_LIMIT_MAX: '1', RATE_LIMIT_WINDOW_MS: '2000' };

    await expect(enforceRateLimit(request(), liveCtx, env, store)).resolves.toBeNull();

    const limited = await enforceRateLimit(request(), liveCtx, env, store);
    expect(limited).toBeInstanceOf(Response);
    const response = limited as Response;
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('2');
    expect(response.headers.get('x-ratelimit-limit')).toBe('1');
    expect(response.headers.get('x-ratelimit-remaining')).toBe('0');
    await expect(response.json()).resolves.toEqual({ error: 'rate_limited' });
  });
});
