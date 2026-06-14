import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { describe, expect, it } from 'vitest';

import { InMemoryEventBus } from '../events';
import { type RunFlowDeps, runFlow } from '../interpreter';
import type { IIntegrationRunner } from '../ports';
import type { FlowDefinitionInput } from '../schemas';

const sandbox: ExecutionContext = {
  mode: 'sandbox',
  tenantId: 'partnerco',
  customerId: 'cus_1',
  mockProfile: 'happyPath',
};

function runnerReturning(value: unknown): IIntegrationRunner {
  return { run: async () => value };
}

const deps = (runner: IIntegrationRunner, eventBus?: RunFlowDeps['eventBus']): RunFlowDeps => ({
  integrationRunner: runner,
  eventBus,
});

describe('runFlow', () => {
  it('extracts input from the execution context and returns the output', async () => {
    const flow: FlowDefinitionInput = {
      id: 'get-balance',
      name: 'Get Balance',
      input: { from: 'executionContext', pick: ['customerId'] },
      steps: [
        { op: 'validate', require: ['customerId'] },
        { op: 'call-integration', integration: 'core', operation: 'getBalance', as: 'balance' },
      ],
      output: '{{ balance }}',
    };
    const result = await runFlow(flow, { auth: sandbox }, deps(runnerReturning({ netWorth: 10 })));
    expect(result).toEqual({ ok: true, body: { netWorth: 10 }, emitted: [] });
  });

  it('passes the resolved profile to the integration runner', async () => {
    const calls: Array<string | undefined> = [];
    const runner: IIntegrationRunner = {
      run: async (call) => {
        calls.push(call.profile);
        return {};
      },
    };
    const flow: FlowDefinitionInput = {
      id: 'f',
      name: 'F',
      steps: [{ op: 'call-integration', integration: 'core', operation: 'op', as: 'r' }],
      output: '{{ r }}',
    };
    await runFlow(flow, { auth: sandbox }, deps(runner));
    expect(calls).toEqual(['happyPath']);
  });

  it('skips a step whose `when` guard is falsy', async () => {
    let called = false;
    const runner: IIntegrationRunner = {
      run: async () => {
        called = true;
        return {};
      },
    };
    const flow: FlowDefinitionInput = {
      id: 'f',
      name: 'F',
      input: { from: 'none', pick: [] },
      steps: [
        {
          op: 'call-integration',
          integration: 'core',
          operation: 'op',
          as: 'r',
          when: '{{ missing }}',
        },
      ],
      output: '{{ r }}',
    };
    const result = await runFlow(flow, { auth: sandbox }, deps(runner));
    expect(called).toBe(false);
    expect(result).toEqual({ ok: true, body: undefined, emitted: [] });
  });

  it('executes nested steps inside a matching branch', async () => {
    const flow: FlowDefinitionInput = {
      id: 'f',
      name: 'F',
      input: { from: 'request', pick: ['premium'] },
      steps: [
        {
          op: 'branch',
          cases: [
            {
              when: '{{ premium }}',
              steps: [{ op: 'emit-event', event: 'premium-path' }],
            },
          ],
          else: [{ op: 'emit-event', event: 'free-path' }],
        },
      ],
      output: '{{ $auth.customerId }}',
    };
    const bus = new InMemoryEventBus();
    const result = await runFlow(
      flow,
      { auth: sandbox, request: { premium: true } },
      deps(runnerReturning({}), bus),
    );
    expect(result).toEqual({ ok: true, body: 'cus_1', emitted: [{ event: 'premium-path' }] });
    expect(bus.emitted).toEqual([{ event: 'premium-path' }]);
  });

  it('classifies a missing-field validation as a validation error (host maps to 422)', async () => {
    const flow: FlowDefinitionInput = {
      id: 'f',
      name: 'F',
      input: { from: 'request', pick: ['customerId'] },
      steps: [{ op: 'validate', require: ['customerId'] }],
      output: '{{ customerId }}',
    };
    const result = await runFlow(flow, { auth: sandbox, request: {} }, deps(runnerReturning({})));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({
        kind: 'validation',
        code: 'validation_failed',
        details: { missing: ['customerId'] },
      });
    }
  });

  it('classifies an integration failure, surfacing the underlying code', async () => {
    const runner: IIntegrationRunner = {
      run: async () => {
        throw Object.assign(new Error('boom'), { code: 'mock_gateway_error' });
      },
    };
    const flow: FlowDefinitionInput = {
      id: 'f',
      name: 'F',
      steps: [{ op: 'call-integration', integration: 'core', operation: 'op', as: 'r' }],
      output: '{{ r }}',
    };
    const result = await runFlow(flow, { auth: sandbox }, deps(runner));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({ kind: 'integration', code: 'mock_gateway_error' });
    }
  });

  it('classifies an invalid flow as a config error', async () => {
    const result = await runFlow(
      { id: 'f', name: 'F', steps: [], output: '{{ x }}' },
      { auth: sandbox },
      deps(runnerReturning({})),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('config');
  });
});
