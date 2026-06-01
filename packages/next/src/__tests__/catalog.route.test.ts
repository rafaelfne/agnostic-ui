import { describe, expect, it } from 'vitest';
import { GET as getCategory } from '../app/api/catalog/category/route';
import { GET as getProductDetails } from '../app/api/catalog/product-details/route';
import { GET as getPortfolios } from '../app/api/catalog/portfolios/route';
import {
  getCatalogCategoryMock,
  getCatalogPortfoliosMock,
  getCatalogProductDetailsMock,
} from '../infra/gateway/mock/fixtures';

function req(path: string, profile = 'happyPath'): Request {
  return new Request(`https://bff.test/api/catalog/${path}`, {
    headers: {
      authorization: `Bearer app_sandbox_partnerco_${profile}`,
      'x-tenant-id': 'partnerco',
    },
  });
}

describe('catalog routes', () => {
  it('GET /api/catalog/category returns 200 with the happyPath fixture', async () => {
    const response = await getCategory(req('category'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(getCatalogCategoryMock());
  });

  it('GET /api/catalog/portfolios returns 200 with the happyPath fixture', async () => {
    const response = await getPortfolios(req('portfolios'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(getCatalogPortfoliosMock());
  });

  it('GET /api/catalog/product-details returns 200 for a valid productId query', async () => {
    const response = await getProductDetails(req('product-details?productId=prd_balanced'));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(getCatalogProductDetailsMock());
  });

  it('GET /api/catalog/product-details returns 422 when productId is absent', async () => {
    const response = await getProductDetails(req('product-details'));
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ error: 'Validation failed' });
  });

  it('maps the error profile to 500 mock_gateway_error', async () => {
    const response = await getCategory(req('category', 'error'));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'mock_gateway_error' });
  });
});
