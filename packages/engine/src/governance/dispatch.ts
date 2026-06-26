import { ConfigError } from '../errors';
import type { OperatorContext } from '../operators';
import type { StepDef } from '../schemas';

import type { GovernedOperatorRegistry } from './registry';

/**
 * Estratégia de dispatch de um step. Seam strangler (G1): o interpretador despacha
 * por aqui, com o `switch` fechado como default e o governado como alternativa
 * provada-equivalente. Em G3 o governado vira o caminho.
 */
export type StepDispatcher = (step: StepDef, context: OperatorContext) => Promise<void> | void;

/**
 * Despacha um step pelo registry governado: lookup por ref (não `switch`) e chama o
 * handler. Ref não registrado → `ConfigError` (fail-closed). Ao contrário do switch
 * legado, cobre TODO operador registrado — inclusive `foreach`, que o switch omite.
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
  return entry.handler(step, context);
}

/** Liga um `StepDispatcher` a um registry governado. */
export function createGovernedDispatcher(registry: GovernedOperatorRegistry): StepDispatcher {
  return (step, context) => dispatchGoverned(step, context, registry);
}
