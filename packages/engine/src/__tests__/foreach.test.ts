import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { describe, expect, it } from 'vitest';

import { buildScope, createFlowContext, writeOutput } from '../context';
import { InMemoryEventBus } from '../events';
import { evaluateExpression } from '../expression';
import { type EngineServices, foreachOperator } from '../operators';

const live: ExecutionContext = { mode: 'live', tenantId: 'partnerco', customerId: 'cus_1' };

function services(runSteps: EngineServices['runSteps']): EngineServices {
  return {
    integrationRunner: { run: async () => ({}) },
    eventBus: new InMemoryEventBus(),
    evaluate: evaluateExpression,
    runSteps,
  };
}

describe('foreach (F1.A.3)', () => {
  it('itera com $item/$index e coleta os outputs por item', async () => {
    const ctx = createFlowContext(live, { positions: [{ name: 'Ada' }, { name: 'Bob' }] });
    const svc = services(async (_steps, child) => {
      const label = evaluateExpression('{{ $index }}:{{ $item.name }}', buildScope(child));
      writeOutput(child, 'label', label);
    });
    await foreachOperator(
      { op: 'foreach', items: '{{ positions }}', as: 'cards', steps: [] },
      { ctx, services: svc, profile: undefined },
    );
    expect(ctx.outputs.cards).toEqual([{ label: '0:Ada' }, { label: '1:Bob' }]);
  });

  it('binding não-array → array vazio (não quebra)', async () => {
    const ctx = createFlowContext(live, {});
    await foreachOperator(
      { op: 'foreach', items: '{{ missing }}', as: 'cards', steps: [] },
      { ctx, services: services(async () => {}), profile: undefined },
    );
    expect(ctx.outputs.cards).toEqual([]);
  });

  it('isola as iterações: $item não vaza para o contexto pai', async () => {
    const ctx = createFlowContext(live, { xs: [1, 2] });
    await foreachOperator(
      { op: 'foreach', items: '{{ xs }}', as: 'r', steps: [] },
      { ctx, services: services(async () => {}), profile: undefined },
    );
    expect(buildScope(ctx).$item).toBeUndefined();
  });
});
