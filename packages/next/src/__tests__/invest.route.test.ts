import { describe, expect, it } from 'vitest';
import { GET as getInvestFlow } from '../app/api/invest/flow/route';
import { POST as postInvestAmount } from '../app/api/invest/amount/route';
import { getInvestFlowMock, postInvestAmountMock } from '../infra/gateway/mock/fixtures';

const SANDBOX_HEADERS = {
  authorization: 'Bearer app_sandbox_partnerco_happyPath',
  'x-tenant-id': 'partnerco',
};

function getReq(): Request {
  return new Request('https://bff.test/api/invest/flow', { headers: SANDBOX_HEADERS });
}

function postReq(body: unknown, headers: Record<string, string> = SANDBOX_HEADERS): Request {
  return new Request('https://bff.test/api/invest/amount', {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('invest routes', () => {
  it('GET /api/invest/flow returns 200 with the happyPath fixture', async () => {
    const response = await getInvestFlow(getReq());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(getInvestFlowMock());
  });

  it('POST /api/invest/amount returns 200 for a valid body', async () => {
    const response = await postInvestAmount(postReq({ productId: 'prd_1', amount: 100 }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(postInvestAmountMock());
  });

  it('POST /api/invest/amount returns 422 for an invalid amount', async () => {
    const response = await postInvestAmount(postReq({ productId: 'prd_1', amount: -5 }));
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: 'Validation failed' });
  });

  it('POST /api/invest/amount maps the error profile to 500 mock_gateway_error', async () => {
    const response = await postInvestAmount(
      postReq(
        { productId: 'prd_1', amount: 100 },
        { authorization: 'Bearer app_sandbox_partnerco_error', 'x-tenant-id': 'partnerco' },
      ),
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'mock_gateway_error' });
  });

  it('POST /api/invest/amount passes through 403 tenant_mismatch', async () => {
    const response = await postInvestAmount(
      postReq(
        { productId: 'prd_1', amount: 100 },
        { authorization: 'Bearer app_sandbox_partnerco_happyPath', 'x-tenant-id': 'otherco' },
      ),
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'tenant_mismatch' });
  });
});
