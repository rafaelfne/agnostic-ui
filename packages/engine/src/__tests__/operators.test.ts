import type { ExecutionContext, MockProfile } from '@yukilabs/agnostic-ui-core';
import { describe, expect, it } from 'vitest';

import { createFlowContext } from '../context';
import { ValidationError } from '../errors';
import { InMemoryEventBus } from '../events';
import { evaluateExpression } from '../expression';
import {
  type EngineServices,
  branchOperator,
  buildDefaultRegistry,
  callIntegrationOperator,
  composeTemplateOperator,
  emitEventOperator,
  validateOperator,
} from '../operators';
import type { IIntegrationRunner } from '../ports';
import type { StepDef } from '../schemas';

const live: ExecutionContext = { mode: 'live', tenantId: 'partnerco', customerId: 'cus_1' };

function harness(options: {
  input?: Record<string, unknown>;
  runner?: IIntegrationRunner;
  profile?: MockProfile;
}) {
  const ctx = createFlowContext(live, options.input ?? {});
  const eventBus = new InMemoryEventBus();
  const runStepsCalls: StepDef[][] = [];
  const services: EngineServices = {
    integrationRunner: options.runner ?? { run: async () => ({}) },
    eventBus,
    evaluate: evaluateExpression,
    runSteps: async (steps) => {
      runStepsCalls.push(steps);
    },
  };
  return { ctx, eventBus, runStepsCalls, context: { ctx, services, profile: options.profile } };
}

describe('validate', () => {
  it('passes when required fields are present', () => {
    const h = harness({ input: { customerId: 'cus_1' } });
    expect(() =>
      validateOperator({ op: 'validate', require: ['customerId'] }, h.context),
    ).not.toThrow();
  });

  it('throws ValidationError listing missing fields', () => {
    const h = harness({ input: { customerId: '' } });
    expect(() => validateOperator({ op: 'validate', require: ['customerId'] }, h.context)).toThrow(
      ValidationError,
    );
  });
});

describe('call-integration', () => {
  it('writes the runner result under `as`', async () => {
    const h = harness({ runner: { run: async () => ({ netWorth: 10 }) } });
    await callIntegrationOperator(
      { op: 'call-integration', integration: 'core', operation: 'getBalance', as: 'balance' },
      h.context,
    );
    expect(h.ctx.outputs.balance).toEqual({ netWorth: 10 });
  });

  it('wraps a failure as IntegrationError carrying the cause code', async () => {
    const runner: IIntegrationRunner = {
      run: async () => {
        throw Object.assign(new Error('boom'), { code: 'mock_gateway_error' });
      },
    };
    const h = harness({ runner });
    await expect(
      callIntegrationOperator(
        { op: 'call-integration', integration: 'core', operation: 'getBalance', as: 'balance' },
        h.context,
      ),
    ).rejects.toMatchObject({ name: 'IntegrationError', code: 'mock_gateway_error' });
  });
});

describe('compose-template', () => {
  it('binds props from data and preserves structure', () => {
    const h = harness({ input: {} });
    h.ctx.outputs.flow = { currency: 'BRL', min: 10_000, values: [1, 2] };
    composeTemplateOperator(
      {
        op: 'compose-template',
        as: 'screen',
        template: {
          type: 'screen',
          id: 'invest',
          children: [
            { type: 'header', props: { title: 'Investir', currency: '{{ flow.currency }}' } },
            { type: 'input', props: { min: '{{ flow.min }}', values: '{{ flow.values }}' } },
          ],
        },
      },
      h.context,
    );
    expect(h.ctx.outputs.screen).toEqual({
      type: 'screen',
      id: 'invest',
      children: [
        { type: 'header', props: { title: 'Investir', currency: 'BRL' } },
        { type: 'input', props: { min: 10_000, values: [1, 2] } },
      ],
    });
  });
});

describe('emit-event', () => {
  it('emits with an evaluated payload', () => {
    const h = harness({ input: { customerId: 'cus_1' } });
    emitEventOperator(
      { op: 'emit-event', event: 'balance-read', payload: '{{ customerId }}' },
      h.context,
    );
    expect(h.eventBus.emitted).toEqual([{ event: 'balance-read', payload: 'cus_1' }]);
  });
});

describe('branch', () => {
  it('runs the first matching case and stops', async () => {
    const h = harness({ input: { premium: true } });
    const premiumSteps: StepDef[] = [
      { op: 'call-integration', integration: 'core', operation: 'getPremium', as: 'data' },
    ];
    await branchOperator(
      {
        op: 'branch',
        cases: [{ when: '{{ premium }}', steps: premiumSteps }],
        else: [{ op: 'emit-event', event: 'free' }],
      },
      h.context,
    );
    expect(h.runStepsCalls).toEqual([premiumSteps]);
  });

  it('runs the else branch when no case matches', async () => {
    const h = harness({ input: { premium: false } });
    const elseSteps: StepDef[] = [{ op: 'emit-event', event: 'free' }];
    await branchOperator(
      { op: 'branch', cases: [{ when: '{{ premium }}', steps: [] }], else: elseSteps },
      h.context,
    );
    expect(h.runStepsCalls).toEqual([elseSteps]);
  });
});

describe('buildDefaultRegistry', () => {
  it('exposes exactly the audited operator set', () => {
    const registry = buildDefaultRegistry();
    expect(Object.keys(registry).sort()).toEqual(
      [
        'branch',
        'call-integration',
        'compose-template',
        'emit-event',
        'foreach',
        'validate',
      ].sort(),
    );
  });
});
