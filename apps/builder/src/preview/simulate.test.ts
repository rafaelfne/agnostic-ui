import type { FlowDefinitionInput } from '@yukilabs/agnostic-ui-engine';
import { describe, expect, it } from 'vitest';

import { fixtureSkeleton, toMockFixtures } from './simulate';

function flow(steps: FlowDefinitionInput['steps']): FlowDefinitionInput {
  return {
    id: 'f',
    name: 'f',
    input: { from: 'executionContext', pick: ['customerId'] },
    steps,
    output: '{{ screen }}',
    emits: [],
  };
}

describe('K4 — simulate helpers', () => {
  it('fixtureSkeleton coleta call-integration (incl. aninhados) sem duplicar', () => {
    const skeleton = fixtureSkeleton(
      flow([
        { op: 'call-integration', integration: 'core', operation: 'getBalance', as: 'b' },
        {
          op: 'branch',
          cases: [
            {
              when: '{{ true }}',
              steps: [
                { op: 'call-integration', integration: 'core', operation: 'getInvest', as: 'i' },
              ],
            },
          ],
          else: [{ op: 'call-integration', integration: 'stripe', operation: 'charge', as: 'c' }],
        },
        { op: 'call-integration', integration: 'core', operation: 'getBalance', as: 'b2' },
      ]),
    );
    expect(skeleton).toEqual({
      core: { getBalance: {}, getInvest: {} },
      stripe: { charge: {} },
    });
  });

  it('toMockFixtures faz cada op devolver o valor no happyPath', async () => {
    const mock = toMockFixtures({ core: { getBalance: { amount: '1.500,00' } } });
    expect(mock.core?.getBalance?.happyPath()).toEqual({ amount: '1.500,00' });
    expect(mock.core?.getBalance?.empty?.()).toEqual({});
  });
});
