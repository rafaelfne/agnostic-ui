import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SignJWT } from 'jose';
import { GET } from '../app/api/health/route';

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

describe('GET /api/health', () => {
  beforeEach(() => {
    process.env.JWT_HS256_SECRET = SECRET;
    delete process.env.JWT_JWKS_URL;
  });
  afterEach(() => {
    delete process.env.JWT_HS256_SECRET;
    delete process.env.JWT_JWKS_URL;
  });

  it('echoes the resolved sandbox context when the marker tenant matches the header', async () => {
    const response = await GET(
      request({
        authorization: 'Bearer app_sandbox_partnerco_happyPath',
        'x-tenant-id': 'partnerco',
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      mode: 'sandbox',
      tenantId: 'partnerco',
      customerId: 'cus_test_happyPath_partnerco',
    });
  });

  it('echoes the resolved live context from a verified JWT, ignoring the header', async () => {
    const response = await GET(
      request({
        authorization: `Bearer ${await signHs256({ sub: 'cus_99', tenant: 'partnerco' })}`,
        'x-tenant-id': 'whatever',
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      mode: 'live',
      tenantId: 'partnerco',
      customerId: 'cus_99',
    });
  });

  it('returns 403 tenant_mismatch when the sandbox marker tenant differs from the header', async () => {
    const response = await GET(
      request({
        authorization: 'Bearer app_sandbox_partnerco_happyPath',
        'x-tenant-id': 'otherco',
      }),
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'tenant_mismatch' });
  });

  it('returns 400 for a malformed marker', async () => {
    const response = await GET(
      request({
        authorization: 'Bearer app_sandbox_partnerco_nope',
        'x-tenant-id': 'partnerco',
      }),
    );
    expect(response.status).toBe(400);
  });

  it('returns 401 for a verified JWT without sub', async () => {
    const response = await GET(
      request({
        authorization: `Bearer ${await signHs256({ tenant: 'partnerco' })}`,
        'x-tenant-id': 'partnerco',
      }),
    );
    expect(response.status).toBe(401);
  });

  it('returns 401 (fail-closed) for a JWT when no verification key is configured', async () => {
    const token = await signHs256({ sub: 'cus_99', tenant: 'partnerco' });
    delete process.env.JWT_HS256_SECRET;
    const response = await GET(
      request({ authorization: `Bearer ${token}`, 'x-tenant-id': 'partnerco' }),
    );
    expect(response.status).toBe(401);
  });
});
