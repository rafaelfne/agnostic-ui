import { describe, expect, it } from 'vitest';

import type { FlowDraft } from './flowModel';
import { summarizeFlow } from './flowSummary';

const investFlow: FlowDraft = {
  id: 'invest-screen',
  name: 'Invest Screen',
  trigger: { kind: 'http', method: 'GET', path: '/api/invest' },
  input: { from: 'executionContext', pick: ['customerId'] },
  steps: [
    { op: 'validate', require: ['customerId'] },
    { op: 'call-integration', integration: 'core', operation: 'getData', as: 'invest' },
  ],
  output: '{{ invest }}',
  emits: ['balance-viewed'],
};

describe('summarizeFlow', () => {
  it('lê o flow como cláusulas legíveis, com os chips editáveis certos', () => {
    const summary = summarizeFlow(investFlow);
    expect(summary.clauses).toEqual([
      { role: 'trigger', value: '/api/invest', edit: { kind: 'trigger-path' } },
      { role: 'validate', value: 'customerId' },
      {
        role: 'fetch',
        value: 'core',
        detail: 'invest',
        edit: { kind: 'integration', stepIndex: 1 },
      },
      { role: 'output', value: 'invest' },
    ]);
    expect(summary.emits).toEqual(['balance-viewed']);
    expect(summary.hasAdvanced).toBe(false);
  });

  it('marca ops complexos como advanced (degrada com elegância)', () => {
    const summary = summarizeFlow({
      ...investFlow,
      steps: [
        { op: 'branch', cases: [{ when: '{{ true }}', steps: [] }] },
        { op: 'emit-event', event: 'done' },
      ],
      output: { type: 'screen' } as unknown as FlowDraft['output'],
    });
    expect(summary.clauses.map((c) => c.role)).toEqual(['trigger', 'advanced', 'emit', 'output']);
    expect(summary.hasAdvanced).toBe(true);
    // saída objeto (compose) → sem expressão legível; o painel usa o fallback "os dados"
    expect(summary.clauses.at(-1)).toEqual({ role: 'output', value: '' });
  });

  it('é tolerante a rascunho sem trigger / campos ausentes', () => {
    const summary = summarizeFlow({ id: 'x', name: 'x', steps: [], output: '{{ x }}' });
    expect(summary.clauses[0]).toEqual({ role: 'trigger', value: '' });
    expect(summary.emits).toEqual([]);
  });
});
