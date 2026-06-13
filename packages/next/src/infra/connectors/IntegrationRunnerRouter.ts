import type {
  IIntegrationRunner,
  IntegrationCall,
  IntegrationKind,
} from '@yukilabs/agnostic-ui-engine';

import type { IntegrationRegistry } from './integrationRegistry';

/**
 * Routes a call to the runner registered for the integration's `kind`
 * (rest/graphql/mock) — the single place that composes the connector runtime.
 * The engine stays behind one IIntegrationRunner port.
 */
export class IntegrationRunnerRouter implements IIntegrationRunner {
  constructor(
    private readonly registry: IntegrationRegistry,
    private readonly byKind: Partial<Record<IntegrationKind, IIntegrationRunner>>,
  ) {}

  run(call: IntegrationCall): Promise<unknown> {
    const def = this.registry.get(call.integration);
    if (def === undefined) {
      return Promise.reject(new Error(`unknown integration: ${call.integration}`));
    }
    const runner = this.byKind[def.kind];
    if (runner === undefined) {
      return Promise.reject(new Error(`no runner for kind: ${def.kind}`));
    }
    return runner.run(call);
  }
}
