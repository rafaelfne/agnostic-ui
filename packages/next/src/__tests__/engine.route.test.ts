import { describe, expect, it } from 'vitest';

import { GET as engineGET } from '../app/api/engine/[flow]/route';
import { getBalanceMock, getBalanceMockEmpty } from '../infra/gateway/mock/fixtures';

const headers = (profile: string): Record<string, string> => ({
  authorization: `Bearer app_sandbox_partnerco_${profile}`,
  'x-tenant-id': 'partnerco',
});

const req = (flow: string, profile: string): Request =>
  new Request(`https://bff.test/api/engine/${flow}`, { headers: headers(profile) });

const routeParams = (flow: string): { params: Promise<{ flow: string }> } => ({
  params: Promise.resolve({ flow }),
});

describe('GET /api/engine/[flow] (resolve a flow by id)', () => {
  it('serves the get-balance happyPath fixture', async () => {
    const res = await engineGET(req('get-balance', 'happyPath'), routeParams('get-balance'));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(getBalanceMock());
  });

  it('serves the empty fixture for the empty profile', async () => {
    const res = await engineGET(req('get-balance', 'empty'), routeParams('get-balance'));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(getBalanceMockEmpty());
  });

  it('maps the error profile to 500 mock_gateway_error', async () => {
    const res = await engineGET(req('get-balance', 'error'), routeParams('get-balance'));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'mock_gateway_error' });
  });

  it('returns 404 for an unknown flow id', async () => {
    const res = await engineGET(req('nope', 'happyPath'), routeParams('nope'));
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: 'unknown_flow' });
  });

  it('passes through 403 tenant_mismatch', async () => {
    const res = await engineGET(
      new Request('https://bff.test/api/engine/get-balance', {
        headers: {
          authorization: 'Bearer app_sandbox_partnerco_happyPath',
          'x-tenant-id': 'otherco',
        },
      }),
      routeParams('get-balance'),
    );
    expect(res.status).toBe(403);
  });
});
