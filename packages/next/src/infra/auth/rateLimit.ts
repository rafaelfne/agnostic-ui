import { Redis } from '@upstash/redis';
import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';

/**
 * Per-subject rate limiting (BFF hardening, F6 — decisão registrada na ADR
 * `docs/adr/0001`). A fixed window keyed by `subject+tenant` (IP como fallback)
 * é mantida no Upstash Redis (REST). O store é resolvido do ambiente **em tempo
 * de chamada** (para testes trocarem):
 *
 *  - `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` → limite ativo.
 *  - qualquer um ausente → **no-op / fail-open**: a requisição passa.
 *
 * Diferente da verificação de JWT (que falha **fechado**), o rate limit é
 * proteção de **disponibilidade**, não de autorização: se o Redis não está
 * configurado ou der erro, **liberamos** a requisição em vez de derrubar o BFF —
 * o que também mantém CI e dev sem precisar de Redis.
 */
export interface RateLimitStore {
  incr(key: string): Promise<number>;
  pexpire(key: string, ms: number): Promise<unknown>;
}

/** Just the env keys this reads — narrow enough for tests to pass a plain object. */
export interface RateLimitEnv {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  RATE_LIMIT_MAX?: string;
  RATE_LIMIT_WINDOW_MS?: string;
  [key: string]: string | undefined;
}

export interface RateLimitPolicy {
  max: number;
  windowMs: number;
}

const DEFAULT_MAX = 120;
const DEFAULT_WINDOW_MS = 60_000;

/** Reads the window size/limit from the env, falling back to safe defaults. */
export function resolveRateLimitPolicy(env: RateLimitEnv = process.env): RateLimitPolicy {
  const max = Number(env.RATE_LIMIT_MAX);
  const windowMs = Number(env.RATE_LIMIT_WINDOW_MS);
  return {
    max: Number.isFinite(max) && max > 0 ? max : DEFAULT_MAX,
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : DEFAULT_WINDOW_MS,
  };
}

const storeByConfig = new Map<string, RateLimitStore>();

/** Builds (and caches) the Upstash store from the env; null means disabled (fail-open). */
export function resolveRateLimitStore(env: RateLimitEnv = process.env): RateLimitStore | null {
  const url = env.UPSTASH_REDIS_REST_URL?.trim();
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    return null;
  }
  const cacheKey = `${url}${token}`;
  let store = storeByConfig.get(cacheKey);
  if (!store) {
    store = new Redis({ url, token });
    storeByConfig.set(cacheKey, store);
  }
  return store;
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

/** Window key: `ratelimit:<tenant>:<subject>`, falling back to the caller IP. */
export function rateLimitKey(ctx: ExecutionContext, request: Request): string {
  const subject = ctx.customerId?.trim();
  const identity = subject || `ip:${clientIp(request)}`;
  return `ratelimit:${ctx.tenantId}:${identity}`;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  count: number;
}

/**
 * Fixed-window counter: INCR the key, set the TTL on the first hit of the window,
 * and allow while `count <= max`. **Fails open** on any store error — a Redis blip
 * lets the request through rather than turning into a 5xx.
 */
export async function checkRateLimit(
  key: string,
  store: RateLimitStore,
  policy: RateLimitPolicy,
): Promise<RateLimitResult> {
  try {
    const count = await store.incr(key);
    if (count === 1) {
      await store.pexpire(key, policy.windowMs);
    }
    return {
      allowed: count <= policy.max,
      limit: policy.max,
      remaining: Math.max(0, policy.max - count),
      count,
    };
  } catch {
    return { allowed: true, limit: policy.max, remaining: policy.max, count: 0 };
  }
}

function tooManyRequests(result: RateLimitResult, policy: RateLimitPolicy): Response {
  return new Response(JSON.stringify({ error: 'rate_limited' }), {
    status: 429,
    headers: {
      'content-type': 'application/json',
      'retry-after': String(Math.ceil(policy.windowMs / 1000)),
      'x-ratelimit-limit': String(result.limit),
      'x-ratelimit-remaining': String(result.remaining),
    },
  });
}

/**
 * Request gate used by `resolveRequestContext`. When Upstash is configured,
 * enforces the fixed window keyed by subject+tenant and returns a 429 once it is
 * exceeded; otherwise a no-op (fail-open) so CI/dev run without Redis.
 */
export async function enforceRateLimit(
  request: Request,
  ctx: ExecutionContext,
  env: RateLimitEnv = process.env,
  store: RateLimitStore | null = resolveRateLimitStore(env),
): Promise<Response | null> {
  if (!store) {
    return null;
  }
  const policy = resolveRateLimitPolicy(env);
  const result = await checkRateLimit(rateLimitKey(ctx, request), store, policy);
  return result.allowed ? null : tooManyRequests(result, policy);
}
