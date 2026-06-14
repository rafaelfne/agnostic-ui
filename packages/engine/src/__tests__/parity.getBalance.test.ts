import type { ExecutionContext, MockProfile } from '@yukilabs/agnostic-ui-core';
import { describe, expect, it } from 'vitest';

import { runFlow } from '../interpreter';

import { getBalanceFlow } from './fixtures/flows';
import { MockIntegrationRunner } from './fixtures/mockIntegrationRunner';
import { type HttpResponse, toHttp } from './fixtures/toHttp';

const runner = new MockIntegrationRunner();

const happy = { netWorth: 12_500_000, available: 1_250_000, invested: 11_250_000, currency: 'BRL' };
const empty = { netWorth: 0, available: 0, invested: 0, currency: 'BRL' };

function sandbox(profile: MockProfile, customerId: string): ExecutionContext {
  return { mode: 'sandbox', tenantId: 'partnerco', customerId, mockProfile: profile };
}

const run = (auth: ExecutionContext): Promise<HttpResponse> =>
  runFlow(getBalanceFlow, { auth }, { integrationRunner: runner }).then(toHttp);

// The oracle: the real BalanceController + secureError behavior (note 422, not the spike's 400).
const cases: ReadonlyArray<{ name: string; profile: MockProfile; expect: HttpResponse }> = [
  { name: 'happyPath → 200', profile: 'happyPath', expect: { status: 200, body: happy } },
  { name: 'empty → 200 empty', profile: 'empty', expect: { status: 200, body: empty } },
  { name: 'slow → 200 happyPath', profile: 'slow', expect: { status: 200, body: happy } },
  {
    name: 'error → 500',
    profile: 'error',
    expect: { status: 500, body: { error: 'mock_gateway_error' } },
  },
];

describe('GetBalance parity (FlowDefinition vs. real implementation)', () => {
  it.each(cases)('$name', async ({ profile, expect: expected }) => {
    expect(await run(sandbox(profile, 'cus_1'))).toEqual(expected);
  });

  it('missing customerId → 422', async () => {
    const http = await run(sandbox('happyPath', ''));
    expect(http.status).toBe(422);
    expect(http.body).toMatchObject({ error: 'Validation failed' });
  });
});
