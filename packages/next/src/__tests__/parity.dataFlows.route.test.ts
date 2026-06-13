import { describe, expect, it } from 'vitest';

import { GET as catalogCategoryGET } from '../app/api/catalog/category/route';
import { GET as catalogPortfoliosGET } from '../app/api/catalog/portfolios/route';
import { GET as custodyGET } from '../app/api/consolidated-custody/route';
import { GET as engineGET } from '../app/api/engine/[flow]/route';
import { GET as investFlowGET } from '../app/api/invest/flow/route';
import { GET as investReviewGET } from '../app/api/invest/review/route';
import { GET as investmentsCategoryGET } from '../app/api/investments/category/route';
import { GET as investmentsProductsGET } from '../app/api/investments/products/route';
import { GET as investmentsProductsSummaryGET } from '../app/api/investments/products-summary/route';
import { GET as riskSelectGET } from '../app/api/portfolio-builder/risk-select/route';
import { GET as heroGET } from '../app/api/portfolio-details/hero/route';
import { GET as walletsGET } from '../app/api/wallets/route';

type RouteGet = (request: Request) => Promise<Response>;

const cases: ReadonlyArray<{ flowId: string; path: string; hardcoded: RouteGet }> = [
  { flowId: 'catalog-category', path: '/api/catalog/category', hardcoded: catalogCategoryGET },
  {
    flowId: 'catalog-portfolios',
    path: '/api/catalog/portfolios',
    hardcoded: catalogPortfoliosGET,
  },
  { flowId: 'consolidated-custody', path: '/api/consolidated-custody', hardcoded: custodyGET },
  { flowId: 'invest-flow', path: '/api/invest/flow', hardcoded: investFlowGET },
  { flowId: 'invest-review', path: '/api/invest/review', hardcoded: investReviewGET },
  {
    flowId: 'investments-category',
    path: '/api/investments/category',
    hardcoded: investmentsCategoryGET,
  },
  {
    flowId: 'investments-products',
    path: '/api/investments/products',
    hardcoded: investmentsProductsGET,
  },
  {
    flowId: 'investments-products-summary',
    path: '/api/investments/products-summary',
    hardcoded: investmentsProductsSummaryGET,
  },
  {
    flowId: 'portfolio-builder-risk-select',
    path: '/api/portfolio-builder/risk-select',
    hardcoded: riskSelectGET,
  },
  { flowId: 'portfolio-hero', path: '/api/portfolio-details/hero', hardcoded: heroGET },
  { flowId: 'user-wallets', path: '/api/wallets', hardcoded: walletsGET },
];

const headers = (profile: string): Record<string, string> => ({
  authorization: `Bearer app_sandbox_partnerco_${profile}`,
  'x-tenant-id': 'partnerco',
});

const routeParams = (flow: string): { params: Promise<{ flow: string }> } => ({
  params: Promise.resolve({ flow }),
});

async function snapshot(res: Response): Promise<{ status: number; body: unknown }> {
  return { status: res.status, body: await res.json() };
}

describe('Fase C onda 1 — paridade engine vs rota hardcoded (GET data flows)', () => {
  for (const { flowId, path, hardcoded } of cases) {
    for (const profile of ['happyPath', 'error'] as const) {
      it(`${flowId} (${profile}) casa com ${path}`, async () => {
        const engine = await snapshot(
          await engineGET(
            new Request(`https://bff.test/api/engine/${flowId}`, { headers: headers(profile) }),
            routeParams(flowId),
          ),
        );
        const hard = await snapshot(
          await hardcoded(new Request(`https://bff.test${path}`, { headers: headers(profile) })),
        );
        expect(engine).toEqual(hard);
      });
    }
  }
});
