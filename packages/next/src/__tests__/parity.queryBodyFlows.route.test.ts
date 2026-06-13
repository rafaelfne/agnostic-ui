import { describe, expect, it } from 'vitest';

import { GET as productDetailsGET } from '../app/api/catalog/product-details/route';
import { GET as engineGET, POST as enginePOST } from '../app/api/engine/[flow]/route';
import { POST as amountPOST } from '../app/api/invest/amount/route';
import { POST as intentionPOST } from '../app/api/invest/intention/route';
import { POST as createPOST } from '../app/api/portfolio-builder/create/route';
import { GET as previewGET } from '../app/api/portfolio-builder/preview/route';

type RouteFn = (request: Request) => Promise<Response>;
interface Input {
  query?: Record<string, string>;
  body?: Record<string, unknown>;
}
interface Case {
  flowId: string;
  path: string;
  method: 'GET' | 'POST';
  hardcoded: RouteFn;
  valid: Input;
  invalid: Input;
}

const cases: readonly Case[] = [
  {
    flowId: 'catalog-product-details',
    path: '/api/catalog/product-details',
    method: 'GET',
    hardcoded: productDetailsGET,
    valid: { query: { productId: 'prod_1' } },
    invalid: { query: { productId: '' } },
  },
  {
    flowId: 'portfolio-builder-preview',
    path: '/api/portfolio-builder/preview',
    method: 'GET',
    hardcoded: previewGET,
    valid: { query: { riskLevel: 'moderate' } },
    invalid: { query: { riskLevel: '' } },
  },
  {
    flowId: 'invest-amount',
    path: '/api/invest/amount',
    method: 'POST',
    hardcoded: amountPOST,
    valid: { body: { productId: 'prod_1', amount: 1000 } },
    invalid: { body: { productId: 'prod_1', amount: 0 } },
  },
  {
    flowId: 'invest-intention',
    path: '/api/invest/intention',
    method: 'POST',
    hardcoded: intentionPOST,
    valid: { body: { productId: 'prod_1' } },
    invalid: { body: {} },
  },
  {
    flowId: 'portfolio-builder-create',
    path: '/api/portfolio-builder/create',
    method: 'POST',
    hardcoded: createPOST,
    valid: { body: { riskLevel: 'low' } },
    invalid: { body: { riskLevel: 'nope' } },
  },
];

function buildRequest(
  base: string,
  method: 'GET' | 'POST',
  profile: string,
  input: Input,
): Request {
  const url = new URL(base);
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

const engineCall = (c: Case, request: Request): Promise<Response> =>
  (c.method === 'GET' ? engineGET : enginePOST)(request, {
    params: Promise.resolve({ flow: c.flowId }),
  });

async function snapshot(res: Response): Promise<{ status: number; body: unknown }> {
  return { status: res.status, body: await res.json() };
}

const engineReq = (c: Case, profile: string, input: Input): Request =>
  buildRequest(`https://bff.test/api/engine/${c.flowId}`, c.method, profile, input);
const hardReq = (c: Case, profile: string, input: Input): Request =>
  buildRequest(`https://bff.test${c.path}`, c.method, profile, input);

describe('Fase C onda 2 — paridade engine vs hardcoded (query/body + validação)', () => {
  for (const c of cases) {
    for (const profile of ['happyPath', 'error'] as const) {
      it(`${c.flowId} (${profile}, válido) casa com ${c.path}`, async () => {
        const engine = await snapshot(await engineCall(c, engineReq(c, profile, c.valid)));
        const hard = await snapshot(await c.hardcoded(hardReq(c, profile, c.valid)));
        expect(engine).toEqual(hard);
      });
    }

    it(`${c.flowId} (inválido) casa o 422 com ${c.path}`, async () => {
      const engine = await snapshot(await engineCall(c, engineReq(c, 'happyPath', c.invalid)));
      const hard = await snapshot(await c.hardcoded(hardReq(c, 'happyPath', c.invalid)));
      expect(engine.status).toBe(422);
      expect(engine).toEqual(hard);
    });
  }
});
