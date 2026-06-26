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
  type ContractRef,
  type OperatorContract,
  contractRefToString,
  normalizeContractRef,
} from './contract';
import { coreOperatorContracts } from './coreContracts';

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
    this.entries.set(contractRefToString(contract.ref), {
      contract,
      // Seguro em runtime: o dispatch só invoca com o step do `op` registrado.
      handler: handler as unknown as GovernedHandler,
    });
  }

  /** Aceita `op` literal (`validate`) ou ref namespaced (`core.validate@1`). */
  resolve(opOrRef: string): GovernedOperatorEntry | undefined {
    const ref: ContractRef | undefined = normalizeContractRef(opOrRef);
    if (ref === undefined) return undefined;
    return this.entries.get(contractRefToString(ref));
  }

  has(opOrRef: string): boolean {
    return this.resolve(opOrRef) !== undefined;
  }

  refs(): string[] {
    return [...this.entries.keys()];
  }
}

/**
 * Os 6 operadores atuais expressos como contratos `core.*@1` (com I/O real, G2). Prova
 * de que o registry governado roda o vocabulário fechado de hoje sem tocar nos handlers.
 */
export function buildCoreGovernedRegistry(): GovernedOperatorRegistry {
  const registry = new GovernedOperatorRegistry();
  registry.register(coreOperatorContracts.validate, validateOperator);
  registry.register(coreOperatorContracts['call-integration'], callIntegrationOperator);
  registry.register(coreOperatorContracts['compose-template'], composeTemplateOperator);
  registry.register(coreOperatorContracts.branch, branchOperator);
  registry.register(coreOperatorContracts['emit-event'], emitEventOperator);
  registry.register(coreOperatorContracts.foreach, foreachOperator);
  return registry;
}
