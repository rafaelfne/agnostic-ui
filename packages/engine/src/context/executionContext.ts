import type { ExecutionContext, MockProfile } from '@yukilabs/agnostic-ui-core';

/**
 * What the host hands the engine to run a flow. The engine never touches HTTP:
 * the auth context is already resolved (JWT/sandbox-marker parsed by the host),
 * and `request` carries client-supplied input only for flows that opt in via
 * `input.from === 'request'`.
 */
export interface EngineRunInput {
  auth: ExecutionContext;
  request?: Record<string, unknown>;
}

/**
 * The mock profile in effect for this run (sandbox), or `undefined` in live mode.
 * Mirrors `CoreMockGateway.profile`: one run resolves to exactly one profile,
 * which keeps the Mock↔Core boundary intact by construction.
 */
export function resolveProfile(auth: ExecutionContext): MockProfile | undefined {
  return auth.mode === 'sandbox' ? auth.mockProfile : undefined;
}
