import type { FlowDefinitionInput, StepDef } from '@yukilabs/agnostic-ui-engine';
import type { MockFixtures } from '@yukilabs/agnostic-ui-react';

/** Pares integration/operation chamados no flow, achatando branch/foreach (K4). */
function collectCalls(
  steps: readonly StepDef[],
): Array<{ integration: string; operation: string }> {
  const out: Array<{ integration: string; operation: string }> = [];
  for (const step of steps) {
    if (step.op === 'call-integration') {
      out.push({ integration: step.integration, operation: step.operation });
    } else if (step.op === 'branch') {
      for (const branch of step.cases) out.push(...collectCalls(branch.steps));
      if (step.else !== undefined) out.push(...collectCalls(step.else));
    } else if (step.op === 'foreach') {
      out.push(...collectCalls(step.steps));
    }
  }
  return out;
}

/**
 * Esqueleto de fixtures `{ integration: { operation: {} } }` derivado dos steps
 * `call-integration` do flow — o usuário só preenche os valores de retorno.
 */
export function fixtureSkeleton(
  flow: FlowDefinitionInput,
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const { integration, operation } of collectCalls(flow.steps ?? [])) {
    const ops = (out[integration] ??= {});
    if (!(operation in ops)) ops[operation] = {};
  }
  return out;
}

/**
 * Converte as fixtures editáveis (o valor de retorno por integration.operation) no
 * `MockFixtures` do `createMockRunner` — cada op vira `{ happyPath: () => valor }`.
 */
export function toMockFixtures(fixtures: Record<string, Record<string, unknown>>): MockFixtures {
  const out: MockFixtures = {};
  for (const [integration, ops] of Object.entries(fixtures)) {
    const built: Record<string, { happyPath: () => unknown; empty: () => unknown }> = {};
    for (const [operation, value] of Object.entries(ops)) {
      built[operation] = { happyPath: () => value, empty: () => ({}) };
    }
    out[integration] = built;
  }
  return out;
}
