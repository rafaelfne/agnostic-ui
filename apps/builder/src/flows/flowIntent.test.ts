import type { FlowDefinitionInput } from '@yukilabs/agnostic-ui-engine';
import { describe, expect, it } from 'vitest';

import { diffIntent, flowIntent } from './flowIntent';

function flow(steps: FlowDefinitionInput['steps']): FlowDefinitionInput {
  return {
    id: 'f',
    name: 'f',
    input: { from: 'executionContext', pick: ['customerId'] },
    steps,
    output: '{{ customerId }}',
    emits: [],
  };
}

describe('I.4 — flowIntent (intenção derivada dos contratos)', () => {
  it('a pure flow is tier safe with no egress', () => {
    const intent = flowIntent(
      flow([
        { op: 'validate', require: ['customerId'] },
        { op: 'compose-template', template: { type: 'text' }, as: 'view' },
      ]),
    );
    expect(intent.tier).toBe('safe');
    expect(intent.integrations).toEqual([]);
    expect(intent.irreversible).toBe(false);
    expect(intent.operators).toEqual(['compose-template', 'validate']);
    expect(intent.writes).toContain('view');
    expect(intent.unknownOps).toEqual([]);
  });

  it('a call-integration flow is tier sensitive and lists the concrete integration', () => {
    const intent = flowIntent(
      flow([{ op: 'call-integration', integration: 'stripe', operation: 'charge', as: 'result' }]),
    );
    expect(intent.tier).toBe('sensitive');
    expect(intent.integrations).toEqual(['stripe']);
    expect(intent.writes).toContain('result');
  });

  it('recurses into branch and foreach sub-steps', () => {
    const intent = flowIntent(
      flow([
        {
          op: 'branch',
          cases: [
            {
              when: '{{ true }}',
              steps: [{ op: 'call-integration', integration: 'inner', operation: 'op', as: 'x' }],
            },
          ],
          else: [{ op: 'emit-event', event: 'else-fired' }],
        },
        {
          op: 'foreach',
          items: '{{ items }}',
          as: 'each',
          steps: [{ op: 'emit-event', event: 'per-item' }],
        },
      ]),
    );
    expect(intent.integrations).toContain('inner'); // aninhado em branch.cases
    expect(intent.emits).toContain('else-fired'); // aninhado em branch.else
    expect(intent.emits).toContain('per-item'); // aninhado em foreach.steps
    expect(intent.tier).toBe('sensitive'); // a call-integration aninhada escala o tier
  });

  it('diffIntent surfaces escalation and added egress vs the published flow', () => {
    const before = flowIntent(flow([{ op: 'validate', require: [] }]));
    const after = flowIntent(
      flow([
        { op: 'validate', require: [] },
        { op: 'call-integration', integration: 'stripe', operation: 'charge', as: 'r' },
      ]),
    );
    const diff = diffIntent(before, after);
    expect(diff.tierBefore).toBe('safe');
    expect(diff.tierAfter).toBe('sensitive');
    expect(diff.tierEscalated).toBe(true);
    expect(diff.addedIntegrations).toEqual(['stripe']);
    expect(diff.addedOperators).toContain('call-integration');
  });

  it('treats a null published flow as no prior intent (nothing escalates from nothing)', () => {
    const after = flowIntent(flow([{ op: 'validate', require: [] }]));
    const diff = diffIntent(null, after);
    expect(diff.tierBefore).toBeNull();
    expect(diff.tierEscalated).toBe(false);
  });
});
