import { type OperatorContract, contractRefToString } from './operatorContract';

/**
 * Trust tier DERIVADO do contrato (ADR 0006 §5) — nunca declarado num campo (que
 * poderia mentir). Uma única declaração de capabilities/efeitos policia o runtime,
 * instrui a IA e alimenta a revisão humana.
 */
export type TrustTier = 'safe' | 'sensitive' | 'critical';

/**
 * - `reversible:false` → **critical** (exige pré-flight humano).
 * - declara `integrations`/`secrets` → **sensitive**.
 * - `pure` (sem egress) → **safe**.
 * - não-puro sem egress declarado → **sensitive** por precaução (efeito não provado seguro).
 */
export function deriveTrustTier(contract: OperatorContract): TrustTier {
  if (contract.effects.reversible === false) return 'critical';
  const { capabilities } = contract;
  if (capabilities.integrations.length > 0 || capabilities.secrets.length > 0) {
    return 'sensitive';
  }
  if (capabilities.pure) return 'safe';
  return 'sensitive';
}

/** Resumo de revisão derivado do MESMO contrato — um diff de intenção, não JSON cru. */
export interface ReviewSummary {
  ref: string;
  tier: TrustTier;
  pure: boolean;
  integrations: readonly string[];
  secrets: readonly string[];
  emits: readonly string[];
  writes: readonly string[];
  reversible: boolean;
  idempotent: boolean;
  compensation?: string;
}

export function reviewSummary(contract: OperatorContract): ReviewSummary {
  const { capabilities, effects } = contract;
  return {
    ref: contractRefToString(contract.ref),
    tier: deriveTrustTier(contract),
    pure: capabilities.pure,
    integrations: capabilities.integrations,
    secrets: capabilities.secrets,
    emits: capabilities.emits,
    writes: effects.writes,
    reversible: effects.reversible,
    idempotent: effects.idempotent,
    compensation: effects.compensation,
  };
}

/** Renderização textual do resumo (mensagem de pré-flight + logs). */
export function formatReviewSummary(contract: OperatorContract): string {
  const s = reviewSummary(contract);
  const lines = [
    `${s.ref} — tier: ${s.tier}`,
    `egress: ${s.integrations.length > 0 ? s.integrations.join(', ') : 'nenhum'}`,
    `secrets: ${s.secrets.length > 0 ? s.secrets.join(', ') : 'nenhum'}`,
    `emite: ${s.emits.length > 0 ? s.emits.join(', ') : 'nenhum'}`,
    `escreve: ${s.writes.length > 0 ? s.writes.join(', ') : 'nada'}`,
    `reversível: ${s.reversible}; idempotente: ${s.idempotent}`,
  ];
  if (s.compensation !== undefined) lines.push(`compensação: ${s.compensation}`);
  if (s.tier === 'critical') lines.push('⚠ irreversível — exige pré-flight humano');
  return lines.join('\n');
}
