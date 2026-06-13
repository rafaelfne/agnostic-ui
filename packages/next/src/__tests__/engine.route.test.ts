import { SignJWT } from 'jose';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GET as balanceGET } from '../app/api/balance/route';
import { GET as engineGET } from '../app/api/engine/[flow]/route';
import { getBalanceMock, getBalanceMockEmpty } from '../infra/gateway/mock/fixtures';

const SECRET = 'test-secret-please-change-0123456789';
const secretKey = new TextEncoder().encode(SECRET);

const engineReq = (headers: Record<string, string>): Request =>
  new Request('https://bff.test/api/engine/get-balance', { headers });

const balanceReq = (headers: Record<string, string>): Request =>
  new Request('https://bff.test/api/balance', { headers });

const routeParams = (flow: string): { params: Promise<{ flow: string }> } => ({
  params: Promise.resolve({ flow }),
});

function signHs256(payload: Record<string, unknown>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(secretKey);
}

describe('GET /api/engine/get-balance (parity with /api/balance)', () => {
  beforeEach(() => {
    process.env.JWT_HS256_SECRET = SECRET;
    delete process.env.JWT_JWKS_URL;
  });
  afterEach(() => {
    delete process.env.JWT_HS256_SECRET;
    delete process.env.JWT_JWKS_URL;
  });

  it.each([
    ['happyPath', getBalanceMock()],
    ['empty', getBalanceMockEmpty()],
  ])('matches the hardcoded route for the %s profile', async (profile, fixture) => {
    const headers = {
      authorization: `Bearer app_sandbox_partnerco_${profile}`,
      'x-tenant-id': 'partnerco',
    };
    const engineRes = await engineGET(engineReq(headers), routeParams('get-balance'));
    const balanceRes = await balanceGET(balanceReq(headers));

    expect(engineRes.status).toBe(200);
    expect(balanceRes.status).toBe(200);
    expect(await engineRes.json()).toEqual(fixture);
    expect(await balanceRes.json()).toEqual(fixture);
  });

  it('maps the error profile to 500 mock_gateway_error', async () => {
    const res = await engineGET(
      engineReq({
        authorization: 'Bearer app_sandbox_partnerco_error',
        'x-tenant-id': 'partnerco',
      }),
      routeParams('get-balance'),
    );
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'mock_gateway_error' });
  });

  it('passes through 403 tenant_mismatch from request-context resolution', async () => {
    const res = await engineGET(
      engineReq({
        authorization: 'Bearer app_sandbox_partnerco_happyPath',
        'x-tenant-id': 'otherco',
      }),
      routeParams('get-balance'),
    );
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: 'tenant_mismatch' });
  });

  it('passes through 400 for a malformed marker', async () => {
    const res = await engineGET(
      engineReq({
        authorization: 'Bearer app_sandbox_partnerco_nope',
        'x-tenant-id': 'partnerco',
      }),
      routeParams('get-balance'),
    );
    expect(res.status).toBe(400);
  });

  it('passes through 401 for a verified JWT without sub', async () => {
    const res = await engineGET(
      engineReq({
        authorization: `Bearer ${await signHs256({ tenant: 'partnerco' })}`,
        'x-tenant-id': 'partnerco',
      }),
      routeParams('get-balance'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 for an unknown flow', async () => {
    const res = await engineGET(
      engineReq({
        authorization: 'Bearer app_sandbox_partnerco_happyPath',
        'x-tenant-id': 'partnerco',
      }),
      routeParams('nope'),
    );
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: 'unknown_flow' });
  });
});
