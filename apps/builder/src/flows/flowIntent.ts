import { type OperatorContract, type TrustTier, deriveTrustTier } from '@yukilabs/agnostic-ui-core';
import {
  type FlowDefinitionInput,
  type StepDef,
  coreOperatorContracts,
} from '@yukilabs/agnostic-ui-engine';

const TIERS: readonly TrustTier[] = ['safe', 'sensitive', 'critical'];
const tierRank = (tier: TrustTier): number => TIERS.indexOf(tier);

/** Contratos core por nome de op (dado puro, sem handlers — leve no bundle do browser). */
const CONTRACT_BY_OP = coreOperatorContracts as Record<string, OperatorContract>;

/**
 * Resumo de INTENÇÃO de um flow (I.4, ADR 0006 §5) — derivado dos contratos dos
 * operadores usados + da config dos steps, não do JSON cru. É a base da revisão humana:
 * o que este flow PODE fazer (tier, egress, eventos, escritas, reversibilidade).
 */
export interface FlowIntent {
  tier: TrustTier;
  /** Ops distintos usados (achatando branch/foreach). */
  operators: string[];
  /** Integrações concretas chamadas (do `integration` dos steps call-integration). */
  integrations: string[];
  /** Eventos concretos emitidos (do `event` dos steps emit-event). */
  emits: string[];
  /** Chaves de escopo escritas (o `as` dos steps). */
  writes: string[];
  /** Algum operador é irreversível (tier critical). */
  irreversible: boolean;
  /** Ops sem contrato conhecido (defensivo — não deveria ocorrer em flow válido). */
  unknownOps: string[];
}

/** Achata os steps recursivamente: branch (`cases[].steps` + `else`) e foreach (`steps`). */
function flattenSteps(steps: readonly StepDef[]): StepDef[] {
  const out: StepDef[] = [];
  for (const step of steps) {
    out.push(step);
    if (step.op === 'branch') {
      for (const branch of step.cases) out.push(...flattenSteps(branch.steps));
      if (step.else !== undefined) out.push(...flattenSteps(step.else));
    } else if (step.op === 'foreach') {
      out.push(...flattenSteps(step.steps));
    }
  }
  return out;
}

const sorted = (values: Set<string>): string[] => [...values].sort((a, b) => a.localeCompare(b));

export function flowIntent(flow: FlowDefinitionInput): FlowIntent {
  const steps = flattenSteps(flow.steps ?? []);
  const operators = new Set<string>();
  const integrations = new Set<string>();
  const emits = new Set<string>();
  const writes = new Set<string>();
  const unknownOps = new Set<string>();
  let rank = 0;
  let irreversible = false;

  for (const step of steps) {
    operators.add(step.op);
    const contract = CONTRACT_BY_OP[step.op];
    if (contract === undefined) {
      unknownOps.add(step.op);
    } else {
      rank = Math.max(rank, tierRank(deriveTrustTier(contract)));
      if (contract.effects.reversible === false) irreversible = true;
    }
    if (step.op === 'call-integration') integrations.add(step.integration);
    if (step.op === 'emit-event') emits.add(step.event);
    if ('as' in step && typeof step.as === 'string') writes.add(step.as);
  }

  return {
    tier: TIERS[rank] ?? 'safe',
    operators: sorted(operators),
    integrations: sorted(integrations),
    emits: sorted(emits),
    writes: sorted(writes),
    irreversible,
    unknownOps: sorted(unknownOps),
  };
}

/** Diff de INTENÇÃO entre o publicado (`before`, `null` se nada publicado) e o proposto. */
export interface IntentDiff {
  tierBefore: TrustTier | null;
  tierAfter: TrustTier;
  tierEscalated: boolean;
  addedIntegrations: string[];
  addedEmits: string[];
  addedOperators: string[];
  becameIrreversible: boolean;
}

const added = (before: readonly string[] | undefined, after: readonly string[]): string[] =>
  after.filter((value) => !(before ?? []).includes(value));

export function diffIntent(before: FlowIntent | null, after: FlowIntent): IntentDiff {
  return {
    tierBefore: before?.tier ?? null,
    tierAfter: after.tier,
    tierEscalated: before !== null && tierRank(after.tier) > tierRank(before.tier),
    addedIntegrations: added(before?.integrations, after.integrations),
    addedEmits: added(before?.emits, after.emits),
    addedOperators: added(before?.operators, after.operators),
    becameIrreversible: after.irreversible && !(before?.irreversible ?? false),
  };
}
