import type { FlowDefinitionInput } from '../../schemas';

/** GetBalance expressed as config — the data-flow parity oracle (cf. the spike). */
export const getBalanceFlow: FlowDefinitionInput = {
  id: 'get-balance',
  name: 'Get Balance',
  trigger: { kind: 'http', method: 'GET', path: '/api/balance' },
  input: { from: 'executionContext', pick: ['customerId'] },
  steps: [
    { op: 'validate', require: ['customerId'] },
    { op: 'call-integration', integration: 'core', operation: 'getBalance', as: 'balance' },
  ],
  output: '{{ balance }}',
};

/**
 * A screen flow exercising `compose-template`: pull invest data, then bind it into
 * an SDUI tree. No strict oracle exists (the BFF has no server-side SDUI yet) — the
 * expected tree is designed here and asserted as valid + correctly bound.
 */
export const investScreenFlow: FlowDefinitionInput = {
  id: 'invest-screen',
  name: 'Invest Screen',
  input: { from: 'executionContext', pick: ['customerId'] },
  steps: [
    { op: 'call-integration', integration: 'core', operation: 'getInvestFlow', as: 'flow' },
    {
      op: 'compose-template',
      as: 'screen',
      template: {
        type: 'screen',
        id: 'invest',
        children: [
          { type: 'header', props: { title: 'Investir', currency: '{{ flow.currency }}' } },
          {
            type: 'amount-input',
            props: {
              min: '{{ flow.minAmount }}',
              max: '{{ flow.maxAmount }}',
              currency: '{{ flow.currency }}',
            },
          },
          { type: 'suggestions', props: { values: '{{ flow.suggestedAmounts }}' } },
        ],
      },
    },
  ],
  output: '{{ screen }}',
};
