import type { MockProfile } from '@yukilabs/agnostic-ui-core';
import type { IIntegrationRunner, IntegrationCall } from '@yukilabs/agnostic-ui-engine';

export interface MockOperation {
  happyPath: () => unknown;
  empty?: () => unknown;
}

/** Fixtures keyed by integration → operation, for the client-side mock runner. */
export type MockFixtures = Record<string, Record<string, MockOperation>>;

/** Mirrors the BFF's MockGatewayError so the engine surfaces the same code. */
export class MockGatewayError extends Error {
  readonly code = 'mock_gateway_error' as const;

  constructor(readonly operation?: string) {
    super(operation ? `mock gateway error in ${operation}` : 'mock gateway error');
    this.name = 'MockGatewayError';
  }
}

function withProfile(
  profile: MockProfile | undefined,
  op: MockOperation,
  operation: string,
): unknown {
  switch (profile) {
    case 'error':
      throw new MockGatewayError(operation);
    case 'slow':
      return op.happyPath(); // no artificial delay in the browser preview
    case 'empty':
      return op.empty ? op.empty() : op.happyPath();
    default:
      return op.happyPath();
  }
}

/**
 * A client-side {@link IIntegrationRunner} that serves fixtures by mock profile —
 * the "simular" superpower (ADR 0002 §5). Lets the builder run a flow in the
 * browser against mock data without touching any real Core.
 */
export function createMockRunner(fixtures: MockFixtures): IIntegrationRunner {
  return {
    run(call: IntegrationCall): Promise<unknown> {
      const op = fixtures[call.integration]?.[call.operation];
      if (op === undefined) {
        return Promise.reject(
          new Error(`unknown integration op: ${call.integration}.${call.operation}`),
        );
      }
      try {
        return Promise.resolve(withProfile(call.profile, op, call.operation));
      } catch (error) {
        return Promise.reject(error);
      }
    },
  };
}
