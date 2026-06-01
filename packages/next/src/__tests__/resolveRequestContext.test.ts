import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SignJWT } from 'jose';
import { resolveRequestContext } from '../infra/auth/resolveRequestContext';

const SECRET = 'test-secret-please-change-0123456789';
const secretKey = new TextEncoder().encode(SECRET);

function request(headers: Record<string, string>): Request {
  return new Request('https://bff.test/api/health', { headers });
}

function signHs256(payload: Record<string, unknown>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(secretKey);
}

describe('resolveRequestContext', () => {
  beforeEach(() => {
    process.env.JWT_HS256_SECRET = SECRET;
    delete process.env.JWT_JWKS_URL;
  });
  afterEach(() => {
    delete process.env.JWT_HS256_SECRET;
    delete process.env.JWT_JWKS_URL;
  });

  it('resolves a sandbox request when the marker tenant matches x-tenant-id', async () => {
    const result = await resolveRequestContext(
      request({
        authorization: 'Bearer app_sandbox_partnerco_happyPath',
        'x-tenant-id': 'partnerco',
      }),
    );
    if (result instanceof Response) throw new Error('expected a resolved context');
    expect(result.ctx).toMatchObject({
      mode: 'sandbox',
      tenantId: 'partnerco',
      customerId: 'cus_test_happyPath_partnerco',
    });
    expect(result.accessToken).toBe('app_sandbox_partnerco_happyPath');
    expect(result.requestTenantId).toBe('partnerco');
  });

  it('returns 403 tenant_mismatch when the sandbox marker tenant differs from the header', async () => {
    const result = await resolveRequestContext(
      request({
        authorization: 'Bearer app_sandbox_partnerco_happyPath',
        'x-tenant-id': 'otherco',
      }),
    );
    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'tenant_mismatch' });
  });

  it('returns 400 for a malformed marker', async () => {
    const result = await resolveRequestContext(
      request({
        authorization: 'Bearer app_sandbox_partnerco_nope',
        'x-tenant-id': 'partnerco',
      }),
    );
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
  });

  it('returns 401 for a signed JWT without sub', async () => {
    const result = await resolveRequestContext(
      request({
        authorization: `Bearer ${await signHs256({ tenant: 'partnerco' })}`,
        'x-tenant-id': 'partnerco',
      }),
    );
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it('does not cross-check in live mode — the header is ignored', async () => {
    const result = await resolveRequestContext(
      request({
        authorization: `Bearer ${await signHs256({ sub: 'cus_1', tenant: 'partnerco' })}`,
        'x-tenant-id': 'whatever',
      }),
    );
    if (result instanceof Response) throw new Error('expected a resolved context');
    expect(result.ctx).toMatchObject({ mode: 'live', customerId: 'cus_1' });
  });

  it('returns 401 invalid_jwt when no token is provided', async () => {
    const result = await resolveRequestContext(request({ 'x-tenant-id': 'partnerco' }));
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it('returns 401 when a validly-signed JWT arrives but no key is configured (fail-closed)', async () => {
    const token = await signHs256({ sub: 'cus_1', tenant: 'partnerco' });
    delete process.env.JWT_HS256_SECRET;
    const result = await resolveRequestContext(
      request({ authorization: `Bearer ${token}`, 'x-tenant-id': 'partnerco' }),
    );
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });
});
