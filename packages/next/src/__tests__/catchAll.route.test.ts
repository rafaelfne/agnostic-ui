import { describe, expect, it } from 'vitest';

import { GET as catchAllGET, POST as catchAllPOST } from '../app/api/[...path]/route';
import {
  getBalanceMock,
  getCatalogCategoryMock,
  getCatalogPortfoliosMock,
  getCatalogProductDetailsMock,
  getConsolidatedCustodyMock,
  getInvestFlowMock,
  getInvestReviewMock,
  getInvestmentsCategoryMock,
  getInvestmentsProductsMock,
  getInvestmentsProductsSummaryMock,
  getPortfolioBuilderPreviewMock,
  getPortfolioBuilderRiskSelectMock,
  getPortfolioHeroMock,
  getUserWalletsMock,
  postInvestAmountMock,
  postInvestIntentionMock,
  postPortfolioBuilderCreatePortfolioMock,
} from '../infra/gateway/mock/fixtures';

interface Input {
  query?: Record<string, string>;
  body?: Record<string, unknown>;
}
interface Case {
  segments: string[];
  method: 'GET' | 'POST';
  fixture: () => unknown;
  valid: Input;
  invalid?: Input;
}

const cases: readonly Case[] = [
  { segments: ['balance'], method: 'GET', fixture: getBalanceMock, valid: {} },
  { segments: ['catalog', 'category'], method: 'GET', fixture: getCatalogCategoryMock, valid: {} },
  {
    segments: ['catalog', 'portfolios'],
    method: 'GET',
    fixture: getCatalogPortfoliosMock,
    valid: {},
  },
  {
    segments: ['consolidated-custody'],
    method: 'GET',
    fixture: getConsolidatedCustodyMock,
    valid: {},
  },
  { segments: ['invest', 'flow'], method: 'GET', fixture: getInvestFlowMock, valid: {} },
  { segments: ['invest', 'review'], method: 'GET', fixture: getInvestReviewMock, valid: {} },
  {
    segments: ['investments', 'category'],
    method: 'GET',
    fixture: getInvestmentsCategoryMock,
    valid: {},
  },
  {
    segments: ['investments', 'products'],
    method: 'GET',
    fixture: getInvestmentsProductsMock,
    valid: {},
  },
  {
    segments: ['investments', 'products-summary'],
    method: 'GET',
    fixture: getInvestmentsProductsSummaryMock,
    valid: {},
  },
  {
    segments: ['portfolio-builder', 'risk-select'],
    method: 'GET',
    fixture: getPortfolioBuilderRiskSelectMock,
    valid: {},
  },
  {
    segments: ['portfolio-details', 'hero'],
    method: 'GET',
    fixture: getPortfolioHeroMock,
    valid: {},
  },
  { segments: ['wallets'], method: 'GET', fixture: getUserWalletsMock, valid: {} },
  {
    segments: ['catalog', 'product-details'],
    method: 'GET',
    fixture: getCatalogProductDetailsMock,
    valid: { query: { productId: 'prod_1' } },
    invalid: { query: { productId: '' } },
  },
  {
    segments: ['portfolio-builder', 'preview'],
    method: 'GET',
    fixture: getPortfolioBuilderPreviewMock,
    valid: { query: { riskLevel: 'moderate' } },
    invalid: { query: { riskLevel: '' } },
  },
  {
    segments: ['invest', 'amount'],
    method: 'POST',
    fixture: postInvestAmountMock,
    valid: { body: { productId: 'prod_1', amount: 1000 } },
    invalid: { body: { productId: 'prod_1', amount: 0 } },
  },
  {
    segments: ['invest', 'intention'],
    method: 'POST',
    fixture: postInvestIntentionMock,
    valid: { body: { productId: 'prod_1' } },
    invalid: { body: {} },
  },
  {
    segments: ['portfolio-builder', 'create'],
    method: 'POST',
    fixture: postPortfolioBuilderCreatePortfolioMock,
    valid: { body: { riskLevel: 'low' } },
    invalid: { body: { riskLevel: 'nope' } },
  },
];

function request(
  segments: string[],
  method: 'GET' | 'POST',
  profile: string,
  input: Input,
): Request {
  const url = new URL(`https://bff.test/api/${segments.join('/')}`);
  for (const [key, value] of Object.entries(input.query ?? {})) url.searchParams.set(key, value);
  const headers: Record<string, string> = {
    authorization: `Bearer app_sandbox_partnerco_${profile}`,
    'x-tenant-id': 'partnerco',
  };
  const init: RequestInit = { method, headers };
  if (method === 'POST') {
    headers['content-type'] = 'application/json';
    init.body = JSON.stringify(input.body ?? {});
  }
  return new Request(url, init);
}

const call = (c: Case, req: Request): Promise<Response> =>
  (c.method === 'GET' ? catchAllGET : catchAllPOST)(req, {
    params: Promise.resolve({ path: c.segments }),
  });

describe('catch-all runtime host (next como host do engine)', () => {
  it.each(cases)('GET|POST /api/$segments happyPath → 200 + fixture', async (c) => {
    const res = await call(c, request(c.segments, c.method, 'happyPath', c.valid));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(c.fixture());
  });

  it.each(cases)('/api/$segments error → 500 mock_gateway_error', async (c) => {
    const res = await call(c, request(c.segments, c.method, 'error', c.valid));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'mock_gateway_error' });
  });

  it.each(cases.filter((c) => c.invalid !== undefined))(
    '/api/$segments invalid input → 422',
    async (c) => {
      const res = await call(c, request(c.segments, c.method, 'happyPath', c.invalid!));
      expect(res.status).toBe(422);
      expect(await res.json()).toMatchObject({ error: 'Validation failed' });
    },
  );

  it('returns 404 for a path with no matching flow', async () => {
    const res = await catchAllGET(request(['nope'], 'GET', 'happyPath', {}), {
      params: Promise.resolve({ path: ['nope'] }),
    });
    expect(res.status).toBe(404);
  });

  it('passes through 403 tenant_mismatch', async () => {
    const res = await catchAllGET(
      new Request('https://bff.test/api/balance', {
        headers: {
          authorization: 'Bearer app_sandbox_partnerco_happyPath',
          'x-tenant-id': 'otherco',
        },
      }),
      { params: Promise.resolve({ path: ['balance'] }) },
    );
    expect(res.status).toBe(403);
  });
});
