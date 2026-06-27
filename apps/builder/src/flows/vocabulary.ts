import {
  type MaturityLevel,
  type OperatorContract,
  maturityLevel,
} from '@yukilabs/agnostic-ui-core';
import { coreOperatorContracts } from '@yukilabs/agnostic-ui-engine';

/** Maturidade de um operador, ou `unknown` se não há contrato conhecido p/ o op. */
export type OpMaturity = MaturityLevel | 'unknown';

/** Contratos core por nome de op (dado puro, sem handlers — leve no bundle do browser). */
const CONTRACT_BY_OP = coreOperatorContracts as Record<string, OperatorContract>;

/**
 * Maturidade de governança de um operador (Fase J / I.4 surface): derivada do contrato
 * via `maturityLevel` (J.1) — `core` (built-in graduado), `proven` (extensão certificada)
 * ou `experimental`. `unknown` quando o op não tem contrato conhecido (defensivo).
 * Reusa a MESMA lógica do core; o builder só a torna visível.
 */
export function operatorMaturity(op: string): OpMaturity {
  const contract = CONTRACT_BY_OP[op];
  return contract === undefined ? 'unknown' : maturityLevel(contract);
}

/** Maturidade por op distinto (ordenado) — a leitura de governança no review. */
export function operatorMaturities(
  ops: readonly string[],
): Array<{ op: string; maturity: OpMaturity }> {
  return [...new Set(ops)]
    .sort((a, b) => a.localeCompare(b))
    .map((op) => ({ op, maturity: operatorMaturity(op) }));
}
