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
