import type { FlowDefinitionInput } from '@yukilabs/agnostic-ui-engine';

/**
 * GetBalance expressed as config — the first flow served by the engine, alongside
 * the hardcoded `/api/balance` route (ADR 0002 §8, strangler-fig). An in-code
 * stand-in for the config store until FB.2 reads it from Postgres.
 */
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
