import {
  type CertificationLevel,
  certificationLevel,
  isCertified,
} from '@yukilabs/agnostic-ui-core';

import type { ErrorKind } from '../errors';
import type { Expression, StepDef } from '../schemas';

import type { OperatorContract } from './contract';

export { type CertificationLevel, certificationLevel };

/**
 * Fixture de conformância de operador (G7): um cenário declarativo rodado contra o
 * handler **vivo** (via `runFlow`, no harness). O `id` casa com
 * `contract.conformance.fixtures`. É o oráculo que cada extensão traz (ADR 0006 §8).
 */
export interface OperatorConformanceFixture {
  id: string;
  /** Escopo inicial (entra como `request`). */
  input?: Record<string, unknown>;
  /** O step a executar. */
  step: StepDef;
  /** Expressão de saída do flow a comparar. */
  output: Expression;
  /** Resposta mockada do integration runner (para `call-integration`). */
  integrationResult?: unknown;
  expect: {
    body?: unknown;
    emits?: readonly string[];
    errorKind?: ErrorKind;
  };
}

/**
 * Um contrato é **certificável** quando declara ≥1 fixture. A auditoria migra de
 * "ler `buildDefaultRegistry`" para "contrato + conformância + sandbox": o
 * `registerCertified` recusa contratos sem fixtures (fail-closed) e o harness prova
 * que elas passam. A lógica de nível mora no `core` (`certificationLevel`/`isCertified`),
 * fonte única consumida pelo engine (enforcement) e pelo builder/spec (consulta).
 */
export function certifyContract(contract: OperatorContract): boolean {
  return isCertified(contract);
}
