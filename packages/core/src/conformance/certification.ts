import type { ComponentContract } from '../schemas/componentContract';
import type { OperatorContract } from '../schemas/operatorContract';

/**
 * Nível de certificação de uma extensão (ADR 0006 §8 — "o contrato é o produto,
 * enforçado por conformância"):
 *
 * - **`certified`** — traz ≥1 fixture de conformance (oráculo próprio). Em modo
 *   estrito o engine só carrega certificados (G7 `registerCertified`).
 * - **`uncertified`** — sem fixtures: extensão de terceiro que ainda não provou
 *   conformidade. Recusada no carregamento estrito.
 *
 * O nível é DERIVADO do contrato (como o trust-tier), nunca declarado.
 */
export type CertificationLevel = 'uncertified' | 'certified';

export function certificationLevel(
  contract: OperatorContract | ComponentContract,
): CertificationLevel {
  return contract.conformance.fixtures.length > 0 ? 'certified' : 'uncertified';
}

export function isCertified(contract: OperatorContract | ComponentContract): boolean {
  return certificationLevel(contract) === 'certified';
}
