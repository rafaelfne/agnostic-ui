import { type GraduationFailure, graduateContract } from '@yukilabs/agnostic-ui-core';

import { ConfigError } from '../errors';
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

import { certifyContract } from './conformance';
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

  /**
   * Registro **fail-closed** (G7): recusa um contrato sem fixtures de conformância.
   * A auditoria migra de `buildDefaultRegistry` para contrato + conformância + sandbox.
   */
  registerCertified<S extends StepDef>(
    contract: OperatorContract,
    handler: OperatorHandler<S>,
  ): void {
    if (!certifyContract(contract)) {
      throw new ConfigError(
        `operator ${contractRefToString(contract.ref)} has no conformance fixtures`,
      );
    }
    this.register(contract, handler);
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

  /**
   * Gradua uma extensão namespaced provada para `core.*` (ADR 0006 §7 — "RFC →
   * graduate"): valida o portão (`graduateContract`, fail-closed — só `proven`),
   * recusa colisão com um `core.<name>` já registrado e registra o contrato graduado
   * sob o ref core **reusando o handler**. O ref namespaced original permanece (graduar
   * adiciona ao core, não remove a extensão), então flows existentes não quebram.
   */
  graduate(
    opOrRef: string,
  ):
    | { ok: true; ref: string }
    | { ok: false; reason: 'unknown' | GraduationFailure | 'core_collision' } {
    const entry = this.resolve(opOrRef);
    if (entry === undefined) return { ok: false, reason: 'unknown' };
    const outcome = graduateContract(entry.contract);
    if (!outcome.graduated) return { ok: false, reason: outcome.reason };
    const coreRef = contractRefToString(outcome.contract.ref);
    if (this.entries.has(coreRef)) return { ok: false, reason: 'core_collision' };
    this.entries.set(coreRef, { contract: outcome.contract, handler: entry.handler });
    return { ok: true, ref: coreRef };
  }
}

/**
 * Os 6 operadores atuais expressos como contratos `core.*@1` (com I/O real, G2). Prova
 * de que o registry governado roda o vocabulário fechado de hoje sem tocar nos handlers.
 */
export function buildCoreGovernedRegistry(): GovernedOperatorRegistry {
  const registry = new GovernedOperatorRegistry();
  registry.registerCertified(coreOperatorContracts.validate, validateOperator);
  registry.registerCertified(coreOperatorContracts['call-integration'], callIntegrationOperator);
  registry.registerCertified(coreOperatorContracts['compose-template'], composeTemplateOperator);
  registry.registerCertified(coreOperatorContracts.branch, branchOperator);
  registry.registerCertified(coreOperatorContracts['emit-event'], emitEventOperator);
  registry.registerCertified(coreOperatorContracts.foreach, foreachOperator);
  return registry;
}
