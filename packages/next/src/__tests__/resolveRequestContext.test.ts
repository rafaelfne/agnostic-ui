import { describe, it, expect } from 'vitest';
import { resolveRequestContext } from '../infra/auth/resolveRequestContext';

function request(headers: Record<string, string>): Request {
  return new Request('https://bff.test/api/health', { headers });
}

function jwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`;
}

describe('resolveRequestContext', () => {
  it('resolves a sandbox request when the marker tenant matches x-tenant-id', () => {
    const result = resolveRequestContext(
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
    const result = resolveRequestContext(
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

  it('returns 400 for a malformed marker', () => {
    const result = resolveRequestContext(
      request({
        authorization: 'Bearer app_sandbox_partnerco_nope',
        'x-tenant-id': 'partnerco',
      }),
    );
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
  });

  it('returns 401 for a JWT without sub', () => {
    const result = resolveRequestContext(
      request({
        authorization: `Bearer ${jwt({ tenant: 'partnerco' })}`,
        'x-tenant-id': 'partnerco',
      }),
    );
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it('does not cross-check in live mode — the header is ignored', () => {
    const result = resolveRequestContext(
      request({
        authorization: `Bearer ${jwt({ sub: 'cus_1', tenant: 'partnerco' })}`,
        'x-tenant-id': 'whatever',
      }),
    );
    if (result instanceof Response) throw new Error('expected a resolved context');
    expect(result.ctx).toMatchObject({ mode: 'live', customerId: 'cus_1' });
  });

  it('returns 401 invalid_jwt when no token is provided', () => {
    const result = resolveRequestContext(request({ 'x-tenant-id': 'partnerco' }));
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });
});
