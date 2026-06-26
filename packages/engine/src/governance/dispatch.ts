import { ConfigError } from '../errors';
import type { OperatorContext } from '../operators';
import type { StepDef } from '../schemas';

import type { GovernedOperatorRegistry } from './registry';
import { gateIntegrationRunner } from './sandbox';

/**
 * Estratégia de dispatch de um step. Seam strangler: o interpretador despacha por
 * aqui; o governado é o default (G3) e o `switch` legado fica reachable até G8.
 */
export type StepDispatcher = (step: StepDef, context: OperatorContext) => Promise<void> | void;

/**
 * Despacha um step pelo registry governado: lookup por ref (não `switch`) e chama o
 * handler **dentro do sandbox de capability** (G4) — o operador só enxerga o egress
 * que o contrato declara. Ref não registrado → `ConfigError` (fail-closed). Cobre
 * TODO operador registrado, inclusive `foreach`.
 */
export function dispatchGoverned(
  step: StepDef,
  context: OperatorContext,
  registry: GovernedOperatorRegistry,
): Promise<void> | void {
  const entry = registry.resolve(step.op);
  if (entry === undefined) {
    throw new ConfigError(`unknown operator: ${step.op}`);
  }
  const scoped: OperatorContext = {
    ...context,
    services: {
      ...context.services,
      integrationRunner: gateIntegrationRunner(context.services.integrationRunner, entry.contract),
    },
  };
  return entry.handler(step, scoped);
}

/** Liga um `StepDispatcher` a um registry governado. */
export function createGovernedDispatcher(registry: GovernedOperatorRegistry): StepDispatcher {
  return (step, context) => dispatchGoverned(step, context, registry);
}
