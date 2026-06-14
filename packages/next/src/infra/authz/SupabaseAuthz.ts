import { type JWTPayload, createRemoteJWKSet, jwtVerify } from 'jose';

import type { AuthzResult, BuilderRole, IAuthz } from '../../application/ports';
import { extractBearerToken } from '../auth/extractBearerToken';

const BUILDER_ROLES: readonly BuilderRole[] = ['editor', 'publisher'];

/** Verifies a session token's signature; resolves `null` when invalid/unverifiable. */
export type TokenVerifier = (token: string) => Promise<JWTPayload | null>;

function parseRoles(value: unknown): BuilderRole[] {
  if (!Array.isArray(value)) return [];
  return value.filter((role): role is BuilderRole => BUILDER_ROLES.includes(role as BuilderRole));
}

/** A `publisher` may do anything an `editor` may; an `editor` may not publish. */
function satisfies(roles: readonly BuilderRole[], required: BuilderRole): boolean {
  if (roles.includes(required)) return true;
  return required === 'editor' && roles.includes('publisher');
}

/**
 * Authz over a Supabase Auth session (ADR 0004 §3). The access token is a JWT
 * whose signature this verifies; identity comes from **admin-controlled** claims
 * (`app_metadata`), never user-editable fields — so a caller cannot self-grant a
 * tenant or role. Fail-closed at every gap: bad/missing token → `unauthenticated`;
 * authenticated but unprovisioned or under-privileged → `forbidden`.
 */
export class SupabaseAuthz implements IAuthz {
  constructor(private readonly verify: TokenVerifier) {}

  async authorize(request: Request, required: BuilderRole): Promise<AuthzResult> {
    const token = extractBearerToken(request);
    if (token === '') return { ok: false, error: 'unauthenticated' };

    const payload = await this.verify(token);
    if (payload === null || typeof payload.sub !== 'string') {
      return { ok: false, error: 'unauthenticated' };
    }

    const meta = (payload.app_metadata ?? {}) as Record<string, unknown>;
    const tenantId = typeof meta.tenant_id === 'string' ? meta.tenant_id : '';
    const roles = parseRoles(meta.builder_roles);
    if (tenantId === '' || roles.length === 0) return { ok: false, error: 'forbidden' };
    if (!satisfies(roles, required)) return { ok: false, error: 'forbidden' };

    return { ok: true, identity: { userId: payload.sub, tenantId, roles } };
  }
}

/** Env keys the verifier reads — narrow enough for tests to pass a plain object. */
export interface SupabaseAuthEnv {
  SUPABASE_JWT_JWKS_URL?: string;
  SUPABASE_JWT_SECRET?: string;
  [key: string]: string | undefined;
}

const jwksByUrl = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function jwksFor(url: string): ReturnType<typeof createRemoteJWKSet> {
  let jwks = jwksByUrl.get(url);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(url));
    jwksByUrl.set(url, jwks);
  }
  return jwks;
}

/**
 * Builds the env-driven token verifier (jose). `SUPABASE_JWT_JWKS_URL` (asymmetric,
 * newer projects) wins over `SUPABASE_JWT_SECRET` (HS256, the legacy project
 * secret). Neither configured → a verifier that rejects every token, so the
 * builder is **opt-in**: authz only opens once a key is set (ADR 0004 §3).
 */
export function createSupabaseVerifier(env: SupabaseAuthEnv = process.env): TokenVerifier {
  const jwksUrl = env.SUPABASE_JWT_JWKS_URL?.trim();
  const secret = env.SUPABASE_JWT_SECRET?.trim();
  return async (token) => {
    try {
      if (jwksUrl) {
        const { payload } = await jwtVerify(token, jwksFor(jwksUrl), {
          algorithms: ['RS256', 'ES256'],
        });
        return payload;
      }
      if (secret) {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
          algorithms: ['HS256'],
        });
        return payload;
      }
      return null;
    } catch {
      return null;
    }
  };
}

let singleton: IAuthz | null = null;

/** Process-wide authz, env-driven and fail-closed. */
export function getAuthz(): IAuthz {
  if (singleton === null) singleton = new SupabaseAuthz(createSupabaseVerifier());
  return singleton;
}
