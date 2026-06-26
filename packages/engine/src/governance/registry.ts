import {
  branchOperator,
  callIntegrationOperator,
  composeTemplateOperator,
  emitEventOperator,
  foreachOperator,
  type OperatorHandler,
  validateOperator,
} from '../operators';
import type { StepDef } from '../schemas';

import {
  type OperatorContract,
  type OperatorRef,
  coreRef,
  normalizeOpToRef,
  refToString,
} from './contract';

/**
 * Handler alargado para a union inteira. O dispatch só o chama com um step cujo
 * `op` bate com o ref sob o qual foi registrado — mesma garantia de segurança que o
 * `switch` fechado dava por narrowing.
 */
export type GovernedHandler = OperatorHandler<StepDef>;

export interface GovernedOperatorEntry {
  contract: OperatorContract;
  handler: GovernedHandler;
}

/**
 * Registry governado por contrato (ADR 0006): mapa `ref → { contract, handler }`,
 * resolvido por lookup (não `switch`). Substitui o mapa fechado de
 * `buildDefaultRegistry` preservando a propriedade "sem `eval`": o que entra é
 * auditável pelo contrato + conformância.
 */
export class GovernedOperatorRegistry {
  private readonly entries = new Map<string, GovernedOperatorEntry>();

  register<S extends StepDef>(contract: OperatorContract, handler: OperatorHandler<S>): void {
    this.entries.set(refToString(contract.ref), {
      contract,
      // Seguro em runtime: o dispatch só invoca com o step do `op` registrado.
      handler: handler as unknown as GovernedHandler,
    });
  }

  /** Aceita `op` literal (`validate`) ou ref namespaced (`core.validate@1`). */
  resolve(opOrRef: string): GovernedOperatorEntry | undefined {
    const ref: OperatorRef | undefined = normalizeOpToRef(opOrRef);
    if (ref === undefined) return undefined;
    return this.entries.get(refToString(ref));
  }

  has(opOrRef: string): boolean {
    return this.resolve(opOrRef) !== undefined;
  }

  refs(): string[] {
    return [...this.entries.keys()];
  }
}

/**
 * Os 6 operadores atuais expressos como contratos `core.*@1`. Prova (G1) de que o
 * registry governado roda o vocabulário fechado de hoje sem tocar nos handlers.
 */
export function buildCoreGovernedRegistry(): GovernedOperatorRegistry {
  const registry = new GovernedOperatorRegistry();
  registry.register({ ref: coreRef('validate') }, validateOperator);
  registry.register({ ref: coreRef('call-integration') }, callIntegrationOperator);
  registry.register({ ref: coreRef('compose-template') }, composeTemplateOperator);
  registry.register({ ref: coreRef('branch') }, branchOperator);
  registry.register({ ref: coreRef('emit-event') }, emitEventOperator);
  registry.register({ ref: coreRef('foreach') }, foreachOperator);
  return registry;
}
