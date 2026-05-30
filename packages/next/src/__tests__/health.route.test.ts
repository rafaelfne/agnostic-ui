import { describe, it, expect } from 'vitest';
import { GET } from '../app/api/health/route';

function request(headers: Record<string, string>): Request {
  return new Request('https://bff.test/api/health', { headers });
}

function jwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`;
}

describe('GET /api/health', () => {
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

  it('echoes the resolved live context from the JWT, ignoring the header', async () => {
    const response = await GET(
      request({
        authorization: `Bearer ${jwt({ sub: 'cus_99', tenant: 'partnerco' })}`,
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

  it('returns 401 for a JWT without sub', async () => {
    const response = await GET(
      request({
        authorization: `Bearer ${jwt({ tenant: 'partnerco' })}`,
        'x-tenant-id': 'partnerco',
      }),
    );
    expect(response.status).toBe(401);
  });
});
