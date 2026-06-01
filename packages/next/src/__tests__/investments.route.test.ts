import { describe, expect, it } from 'vitest';
import { GET as getCategory } from '../app/api/investments/category/route';
import { GET as getProducts } from '../app/api/investments/products/route';
import { GET as getProductsSummary } from '../app/api/investments/products-summary/route';
import {
  getInvestmentsCategoryMock,
  getInvestmentsProductsMock,
  getInvestmentsProductsSummaryMock,
} from '../infra/gateway/mock/fixtures';

function req(profile = 'happyPath'): Request {
  return new Request('https://bff.test/api/investments', {
    headers: {
      authorization: `Bearer app_sandbox_partnerco_${profile}`,
      'x-tenant-id': 'partnerco',
    },
  });
}

describe('investments routes', () => {
  it('GET /api/investments/category returns 200 with the happyPath fixture', async () => {
    const response = await getCategory(req());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(getInvestmentsCategoryMock());
  });

  it('GET /api/investments/products returns 200 with the happyPath fixture', async () => {
    const response = await getProducts(req());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(getInvestmentsProductsMock());
  });

  it('GET /api/investments/products-summary returns 200 with the happyPath fixture', async () => {
    const response = await getProductsSummary(req());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(getInvestmentsProductsSummaryMock());
  });

  it('maps the error profile to 500 mock_gateway_error', async () => {
    const response = await getProducts(req('error'));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'mock_gateway_error' });
  });
});
