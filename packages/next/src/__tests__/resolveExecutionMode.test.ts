import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SignJWT } from 'jose';
import { resolveExecutionMode } from '../infra/auth/resolveExecutionMode';
import { SandboxResolutionError } from '../infra/auth/httpError';

const SECRET = 'test-secret-please-change-0123456789';
const secretKey = new TextEncoder().encode(SECRET);

/** Signs an HS256 JWT (defaults: valid for 1h, signed with the env secret). */
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

/** An `alg:none` token with a fake signature segment — structurally a JWT, unsigned. */
function unsignedJwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`;
}

async function caught(fn: () => Promise<unknown>): Promise<SandboxResolutionError> {
  try {
    await fn();
  } catch (error) {
    if (error instanceof SandboxResolutionError) return error;
    throw error;
  }
  throw new Error('expected a SandboxResolutionError to be thrown');
}

describe('resolveExecutionMode', () => {
  beforeEach(() => {
    process.env.JWT_HS256_SECRET = SECRET;
    delete process.env.JWT_JWKS_URL;
  });
  afterEach(() => {
    delete process.env.JWT_HS256_SECRET;
    delete process.env.JWT_JWKS_URL;
  });

  describe('sandbox', () => {
    it('resolves a valid marker and synthesises the customerId', async () => {
      expect(await resolveExecutionMode('app_sandbox_partnerco_happyPath')).toEqual({
        mode: 'sandbox',
        tenantId: 'partnerco',
        customerId: 'cus_test_happyPath_partnerco',
        mockProfile: 'happyPath',
      });
    });

    it('carries the requested mock profile', async () => {
      expect(await resolveExecutionMode('app_sandbox_partnerco_error')).toMatchObject({
        mockProfile: 'error',
        customerId: 'cus_test_error_partnerco',
      });
    });

    it('rejects a marker with an invalid profile as invalid_sandbox_marker', async () => {
      expect((await caught(() => resolveExecutionMode('app_sandbox_partnerco_nope'))).code).toBe(
        'invalid_sandbox_marker',
      );
    });

    it('rejects an uppercase tenant as invalid_sandbox_marker', async () => {
      expect(
        (await caught(() => resolveExecutionMode('app_sandbox_PartnerCo_happyPath'))).code,
      ).toBe('invalid_sandbox_marker');
    });

    it('rejects an unregistered tenant as unknown_tenant', async () => {
      expect((await caught(() => resolveExecutionMode('app_sandbox_ghostco_happyPath'))).code).toBe(
        'unknown_tenant',
      );
    });
  });

  describe('live', () => {
    it('resolves a signed JWT with sub to live mode', async () => {
      const token = await signHs256({ sub: 'cus_42', tenant: 'partnerco' });
      expect(await resolveExecutionMode(token)).toEqual({
        mode: 'live',
        tenantId: 'partnerco',
        customerId: 'cus_42',
      });
    });

    it('defaults tenantId to empty string when the tenant claim is absent', async () => {
      const token = await signHs256({ sub: 'cus_42' });
      expect(await resolveExecutionMode(token)).toEqual({
        mode: 'live',
        tenantId: '',
        customerId: 'cus_42',
      });
    });

    it('rejects a signed JWT without sub as missing_subject', async () => {
      const token = await signHs256({ tenant: 'partnerco' });
      expect((await caught(() => resolveExecutionMode(token))).code).toBe('missing_subject');
    });

    it('rejects a token that is neither marker nor JWT as invalid_jwt', async () => {
      expect((await caught(() => resolveExecutionMode('not-a-token'))).code).toBe('invalid_jwt');
    });

    it('rejects an empty token as invalid_jwt', async () => {
      expect((await caught(() => resolveExecutionMode(''))).code).toBe('invalid_jwt');
    });

    it('rejects an unsigned alg:none token as invalid_jwt', async () => {
      const token = unsignedJwt({ sub: 'cus_42', tenant: 'partnerco' });
      expect((await caught(() => resolveExecutionMode(token))).code).toBe('invalid_jwt');
    });

    it('rejects an expired token as invalid_jwt', async () => {
      const token = await signHs256({ sub: 'cus_42' }, { expiresInSec: -60 });
      expect((await caught(() => resolveExecutionMode(token))).code).toBe('invalid_jwt');
    });

    it('rejects a token signed with the wrong secret as invalid_jwt', async () => {
      const token = await signHs256(
        { sub: 'cus_42' },
        { secret: new TextEncoder().encode('a-different-secret-9876543210') },
      );
      expect((await caught(() => resolveExecutionMode(token))).code).toBe('invalid_jwt');
    });

    it('fail-closed: rejects a validly-signed token when no key is configured', async () => {
      const token = await signHs256({ sub: 'cus_42' });
      delete process.env.JWT_HS256_SECRET;
      expect((await caught(() => resolveExecutionMode(token))).code).toBe('invalid_jwt');
    });
  });
});
