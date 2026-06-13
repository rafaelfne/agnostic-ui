import type { MockProfile } from '@yukilabs/agnostic-ui-core';

import type { IIntegrationRunner, IntegrationCall } from '../../ports';

/**
 * Reproduces the BFF's `MockGatewayError` (code `mock_gateway_error`) so the
 * engine can surface that code without ever importing from `next`.
 */
export class MockGatewayError extends Error {
  readonly code = 'mock_gateway_error' as const;

  constructor(readonly operation?: string) {
    super(operation ? `mock gateway error in ${operation}` : 'mock gateway error');
    this.name = 'MockGatewayError';
  }
}

interface ProfileFixtures {
  happyPath: () => unknown;
  empty?: () => unknown;
}

/** Fixtures identical to packages/next/.../fixtures/balance.ts. */
const fixtures: Record<string, Record<string, ProfileFixtures>> = {
  core: {
    getBalance: {
      happyPath: () => ({
        netWorth: 12_500_000,
        available: 1_250_000,
        invested: 11_250_000,
        currency: 'BRL',
      }),
      empty: () => ({ netWorth: 0, available: 0, invested: 0, currency: 'BRL' }),
    },
  },
};

/** Mirrors `withProfile`: error→throw, slow→happyPath, empty→empty||happyPath, else→happyPath. */
function withProfile(
  profile: MockProfile | undefined,
  op: ProfileFixtures,
  operation: string,
): unknown {
  switch (profile) {
    case 'error':
      throw new MockGatewayError(operation);
    case 'slow':
      return op.happyPath();
    case 'empty':
      return op.empty ? op.empty() : op.happyPath();
    default:
      return op.happyPath();
  }
}

/**
 * Test double for the IIntegrationRunner port. Reproduces the CoreMockGateway
 * semantics over fixtures equal to the real ones — the parity oracle for Fase A.
 */
export class MockIntegrationRunner implements IIntegrationRunner {
  async run(call: IntegrationCall): Promise<unknown> {
    const op = fixtures[call.integration]?.[call.operation];
    if (op === undefined) {
      throw new Error(`unknown integration op: ${call.integration}.${call.operation}`);
    }
    return withProfile(call.profile, op, call.operation);
  }
}
