import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SignJWT } from 'jose';
import {
  verifyJwt,
  resolveVerificationKey,
  JwtVerificationError,
} from '../infra/auth/verifyJwt';

const SECRET = 'unit-test-secret-please-change-0123456789';
const secretKey = new TextEncoder().encode(SECRET);

function signHs256(
  payload: Record<string, unknown>,
  { secret = secretKey, expiresInSec = 3600 }: { secret?: Uint8Array; expiresInSec?: number } = {},
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSec)
    .sign(secret);
}

async function rejectionReason(token: string): Promise<string> {
  try {
    await verifyJwt(token);
  } catch (error) {
    if (error instanceof JwtVerificationError) return error.reason;
    throw error;
  }
  throw new Error('expected verifyJwt to reject');
}

describe('resolveVerificationKey', () => {
  it('prefers JWKS when JWT_JWKS_URL is set', () => {
    expect(
      resolveVerificationKey({ JWT_JWKS_URL: 'https://issuer.test/jwks', JWT_HS256_SECRET: 's' }),
    ).toEqual({ kind: 'jwks', url: 'https://issuer.test/jwks' });
  });

  it('falls back to HS256 when only the secret is set', () => {
    expect(resolveVerificationKey({ JWT_HS256_SECRET: 'shh' })).toEqual({
      kind: 'hs256',
      secret: 'shh',
    });
  });

  it('returns null (fail-closed) when neither is configured', () => {
    expect(resolveVerificationKey({})).toBeNull();
  });

  it('treats whitespace-only values as unset', () => {
    expect(resolveVerificationKey({ JWT_JWKS_URL: '  ', JWT_HS256_SECRET: '  ' })).toBeNull();
  });
});

describe('verifyJwt (HS256)', () => {
  beforeEach(() => {
    process.env.JWT_HS256_SECRET = SECRET;
    delete process.env.JWT_JWKS_URL;
  });
  afterEach(() => {
    delete process.env.JWT_HS256_SECRET;
    delete process.env.JWT_JWKS_URL;
  });

  it('returns the payload for a validly-signed token', async () => {
    const token = await signHs256({ sub: 'cus_42', tenant: 'partnerco' });
    const payload = await verifyJwt(token);
    expect(payload.sub).toBe('cus_42');
    expect(payload.tenant).toBe('partnerco');
  });

  it('rejects an expired token (verification_failed)', async () => {
    const token = await signHs256({ sub: 'cus_42' }, { expiresInSec: -60 });
    await expect(rejectionReason(token)).resolves.toBe('verification_failed');
  });

  it('rejects a token signed with the wrong secret', async () => {
    const token = await signHs256(
      { sub: 'cus_42' },
      { secret: new TextEncoder().encode('some-other-secret-abcdefghij') },
    );
    await expect(rejectionReason(token)).resolves.toBe('verification_failed');
  });

  it('fails closed with no_key_configured when no key is set', async () => {
    const token = await signHs256({ sub: 'cus_42' });
    delete process.env.JWT_HS256_SECRET;
    await expect(rejectionReason(token)).resolves.toBe('no_key_configured');
  });
});
