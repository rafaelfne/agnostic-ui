import type {
  IIntegrationRunner,
  IntegrationCall,
  IntegrationKind,
} from '@yukilabs/agnostic-ui-engine';

import type { HttpRunnerDeps } from './BaseHttpRunner';
import { GraphqlIntegrationRunner } from './GraphqlIntegrationRunner';
import type { IntegrationRegistry } from './integrationRegistry';
import { RestIntegrationRunner } from './RestIntegrationRunner';

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

/** Wires the generic HTTP connectors (rest + graphql) behind one router. */
export function createIntegrationRunner(deps: HttpRunnerDeps): IIntegrationRunner {
  return new IntegrationRunnerRouter(deps.registry, {
    rest: new RestIntegrationRunner(deps),
    graphql: new GraphqlIntegrationRunner(deps),
  });
}
