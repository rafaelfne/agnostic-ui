import type { IIntegrationRunner, IntegrationCall } from '@yukilabs/agnostic-ui-engine';

import type { ICoreGateway } from '../../application/ports';

type GatewayOperation = (input: Record<string, unknown>) => Promise<unknown>;

/**
 * Adapts the request-scoped {@link ICoreGateway} to the engine's
 * {@link IIntegrationRunner} port. Reuses the existing gateway (mock/http,
 * selected per request by mode × dataSource), so the engine stays ignorant of
 * "core" and the Mock ↔ Core boundary is preserved. The mock profile is already
 * baked into the gateway via its injected ExecutionContext, so it is not
 * re-applied here.
 */
export class EngineCoreIntegrationRunner implements IIntegrationRunner {
  constructor(private readonly gateway: ICoreGateway) {}

  run(call: IntegrationCall): Promise<unknown> {
    if (call.integration !== 'core') {
      return Promise.reject(new Error(`unknown integration: ${call.integration}`));
    }
    const operation = (this.gateway as unknown as Record<string, unknown>)[call.operation];
    if (typeof operation !== 'function') {
      return Promise.reject(new Error(`unknown core operation: ${call.operation}`));
    }
    const input = (call.input ?? {}) as Record<string, unknown>;
    return (operation as GatewayOperation).call(this.gateway, input);
  }
}
