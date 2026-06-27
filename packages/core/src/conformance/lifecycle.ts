import type { ComponentContract } from '../schemas/componentContract';
import type { ContractRef, OperatorContract } from '../schemas/operatorContract';

import { isCertified } from './certification';

const CORE_NAMESPACE = 'core';
const CORE_VERSION = 1;

type Governed = OperatorContract | ComponentContract;

/**
 * Maturidade DERIVADA da extensão (ADR 0006 §7 — ciclo "namespaced → provada → RFC →
 * **gradua** para `core.*`"). Nunca declarada num campo (que poderia mentir): vem do
 * namespace do `ref` + da certificação (≥1 fixture de conformância, [[certification]]).
 *
 * - `core` — já no vocabulário fechado (`core.*`), RFC-gated.
 * - `proven` — namespaced E certificada: candidata a graduar.
 * - `experimental` — namespaced sem conformância provada.
 */
export type MaturityLevel = 'experimental' | 'proven' | 'core';

export function isCoreRef(ref: ContractRef): boolean {
  return ref.namespace === CORE_NAMESPACE;
}

export function maturityLevel(contract: Governed): MaturityLevel {
  if (isCoreRef(contract.ref)) return 'core';
  return isCertified(contract) ? 'proven' : 'experimental';
}

/** Só uma extensão `proven` (namespaced + certificada) gradua — fail-closed. */
export function canGraduate(contract: Governed): boolean {
  return maturityLevel(contract) === 'proven';
}

export type GraduationFailure = 'already_core' | 'not_proven';
export type GraduationOutcome<T> =
  | { graduated: true; contract: T }
  | { graduated: false; reason: GraduationFailure };

/**
 * Gradua uma extensão namespaced provada para `core.*` (o passo "RFC → graduate"):
 * reescreve o `ref` para `core.<name>@1`, preservando o resto do contrato (sem mutar o
 * original). Entra como `@1` — a PRIMEIRA versão core — para se comportar como um
 * built-in: `normalizeContractRef` mapeia o nome bare (`discount`) para `core.<name>@1`,
 * então um op graduado fica alcançável pelo nome bare igual aos 6 ops originais. **Fail-
 * closed** — já-core e não-provadas são recusadas. NÃO checa colisão com um `core.<name>`
 * existente: isso é responsabilidade do registry alvo, que conhece o vocabulário core.
 */
export function graduateContract<T extends Governed>(contract: T): GraduationOutcome<T> {
  const maturity = maturityLevel(contract);
  if (maturity === 'core') return { graduated: false, reason: 'already_core' };
  if (maturity !== 'proven') return { graduated: false, reason: 'not_proven' };
  const contractAtCore = {
    ...contract,
    ref: { ...contract.ref, namespace: CORE_NAMESPACE, version: CORE_VERSION },
  } as T;
  return { graduated: true, contract: contractAtCore };
}
