import { describe, expect, it } from 'vitest';
import { GET } from '../app/api/balance/route';
import { getBalanceMock, getBalanceMockEmpty } from '../infra/gateway/mock/fixtures';

function request(headers: Record<string, string>): Request {
  return new Request('https://bff.test/api/balance', { headers });
}

function jwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`;
}

describe('GET /api/balance', () => {
  it('resolves the controller from the request container and returns 200 happyPath', async () => {
    const response = await GET(
      request({
        authorization: 'Bearer app_sandbox_partnerco_happyPath',
        'x-tenant-id': 'partnerco',
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(getBalanceMock());
  });

  it('returns the empty fixture for the empty profile', async () => {
    const response = await GET(
      request({
        authorization: 'Bearer app_sandbox_partnerco_empty',
        'x-tenant-id': 'partnerco',
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(getBalanceMockEmpty());
  });

  it('maps the error profile to 500 mock_gateway_error', async () => {
    const response = await GET(
      request({
        authorization: 'Bearer app_sandbox_partnerco_error',
        'x-tenant-id': 'partnerco',
      }),
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'mock_gateway_error' });
  });

  it('passes through 403 tenant_mismatch from request-context resolution', async () => {
    const response = await GET(
      request({
        authorization: 'Bearer app_sandbox_partnerco_happyPath',
        'x-tenant-id': 'otherco',
      }),
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'tenant_mismatch' });
  });

  it('passes through 400 for a malformed marker', async () => {
    const response = await GET(
      request({
        authorization: 'Bearer app_sandbox_partnerco_nope',
        'x-tenant-id': 'partnerco',
      }),
    );
    expect(response.status).toBe(400);
  });

  it('passes through 401 for a JWT without sub', async () => {
    const response = await GET(
      request({
        authorization: `Bearer ${jwt({ tenant: 'partnerco' })}`,
        'x-tenant-id': 'partnerco',
      }),
    );
    expect(response.status).toBe(401);
  });
});
