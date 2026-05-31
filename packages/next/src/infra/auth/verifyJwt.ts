import { jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose';

/**
 * Inbound-JWT signature verification (BFF hardening, F6 — decisão registrada na
 * ADR `docs/adr/0001`). The token is issued by the provider/auth service; the
 * BFF verifies it here (the core only base64url-decodes). The key source is
 * resolved from the environment **at call time** (so tests can swap it):
 *
 *  - `JWT_JWKS_URL`     → RS256/ES256 via a cached remote JWKS (asymmetric).
 *  - `JWT_HS256_SECRET` → HS256 (symmetric shared secret).
 *  - neither configured → **fail-closed**: every live JWT is rejected.
 *
 * `jwtVerify` enforces `exp`/`nbf` on top of the signature. Any failure (bad
 * signature, expired, malformed, or no key) surfaces as `JwtVerificationError`,
 * which the resolver maps to `invalid_jwt` (401). It never falls back to an
 * unverified decode.
 */
export class JwtVerificationError extends Error {
  constructor(readonly reason: 'no_key_configured' | 'verification_failed') {
    super(reason);
    this.name = 'JwtVerificationError';
  }
}

export type JwtKeyConfig =
  | { kind: 'jwks'; url: string }
  | { kind: 'hs256'; secret: string }
  | null;

/** Just the env keys this reads — narrow enough for tests to pass a plain object. */
export interface JwtKeyEnv {
  JWT_JWKS_URL?: string;
  JWT_HS256_SECRET?: string;
  [key: string]: string | undefined;
}

/** Picks the verification key from the environment; null means fail-closed. */
export function resolveVerificationKey(env: JwtKeyEnv = process.env): JwtKeyConfig {
  const jwksUrl = env.JWT_JWKS_URL?.trim();
  if (jwksUrl) {
    return { kind: 'jwks', url: jwksUrl };
  }
  const secret = env.JWT_HS256_SECRET?.trim();
  if (secret) {
    return { kind: 'hs256', secret };
  }
  return null;
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

export async function verifyJwt(token: string): Promise<JWTPayload> {
  const key = resolveVerificationKey();
  if (!key) {
    throw new JwtVerificationError('no_key_configured');
  }
  try {
    if (key.kind === 'jwks') {
      const { payload } = await jwtVerify(token, jwksFor(key.url), {
        algorithms: ['RS256', 'ES256'],
      });
      return payload;
    }
    const { payload } = await jwtVerify(token, new TextEncoder().encode(key.secret), {
      algorithms: ['HS256'],
    });
    return payload;
  } catch {
    throw new JwtVerificationError('verification_failed');
  }
}
