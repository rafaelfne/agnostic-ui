import {
  type ExecutionContext,
  type MockProfile,
  TemplateNodeSchema,
} from '@yukilabs/agnostic-ui-core';
import { describe, expect, it } from 'vitest';

import { runFlow } from '../interpreter';

import { investScreenFlow } from './fixtures/flows';
import { MockIntegrationRunner } from './fixtures/mockIntegrationRunner';

const runner = new MockIntegrationRunner();

function sandbox(profile: MockProfile): ExecutionContext {
  return { mode: 'sandbox', tenantId: 'partnerco', customerId: 'cus_1', mockProfile: profile };
}

describe('Invest screen composition (compose-template)', () => {
  it('produces a valid, data-bound SDUI tree', async () => {
    const result = await runFlow(
      investScreenFlow,
      { auth: sandbox('happyPath') },
      { integrationRunner: runner },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // The output is a valid SDUI template.
    expect(TemplateNodeSchema.safeParse(result.body).success).toBe(true);

    // Structure preserved, props bound from data, no leftover placeholders.
    expect(result.body).toEqual({
      type: 'screen',
      id: 'invest',
      children: [
        { type: 'header', props: { title: 'Investir', currency: 'BRL' } },
        {
          type: 'amount-input',
          props: { min: 10_000, max: 100_000_000, currency: 'BRL' },
        },
        { type: 'suggestions', props: { values: [50_000, 100_000, 250_000] } },
      ],
    });
  });

  it('classifies an integration failure on the screen flow too', async () => {
    const result = await runFlow(
      investScreenFlow,
      { auth: sandbox('error') },
      { integrationRunner: runner },
    );
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error).toMatchObject({ kind: 'integration', code: 'mock_gateway_error' });
  });
});
