import type { OperatorConformanceFixture } from './conformance';

/**
 * Corpus de fixtures dos 6 operadores core (G7): reproduz as asserções de paridade de
 * hoje, rodadas contra o handler vivo pelo harness. Cada `core.*` contrato referencia
 * estes IDs em `conformance.fixtures`.
 */
export const coreOperatorFixtures: Record<string, OperatorConformanceFixture> = {
  'core/validate.ok': {
    id: 'core/validate.ok',
    input: { customerId: 'c1' },
    step: { op: 'validate', require: ['customerId'] },
    output: '{{ customerId }}',
    expect: { body: 'c1' },
  },
  'core/validate.missing': {
    id: 'core/validate.missing',
    step: { op: 'validate', require: ['customerId'] },
    output: '{{ customerId }}',
    expect: { errorKind: 'validation' },
  },
  'core/call-integration.ok': {
    id: 'core/call-integration.ok',
    step: { op: 'call-integration', integration: 'core', operation: 'getBalance', as: 'balance' },
    output: '{{ balance.n }}',
    integrationResult: { n: 5 },
    expect: { body: 5 },
  },
  'core/compose-template.ok': {
    id: 'core/compose-template.ok',
    input: { data: { v: 'hi' } },
    step: {
      op: 'compose-template',
      as: 'screen',
      template: { type: 'card', props: { v: '{{ data.v }}' } },
    },
    output: '{{ screen.props.v }}',
    expect: { body: 'hi' },
  },
  'core/branch.ok': {
    id: 'core/branch.ok',
    input: { flag: 1 },
    step: {
      op: 'branch',
      cases: [{ when: '{{ flag }}', steps: [{ op: 'emit-event', event: 'hit' }] }],
    },
    output: '{{ flag }}',
    expect: { emits: ['hit'] },
  },
  'core/emit-event.ok': {
    id: 'core/emit-event.ok',
    input: { x: 1 },
    step: { op: 'emit-event', event: 'ping' },
    output: '{{ x }}',
    expect: { body: 1, emits: ['ping'] },
  },
  'core/foreach.ok': {
    id: 'core/foreach.ok',
    input: { xs: [1, 2] },
    step: {
      op: 'foreach',
      items: '{{ xs }}',
      as: 'rows',
      steps: [{ op: 'emit-event', event: 'row' }],
    },
    output: '{{ rows }}',
    expect: { emits: ['row', 'row'] },
  },
};
