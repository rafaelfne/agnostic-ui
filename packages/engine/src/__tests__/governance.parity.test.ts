import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { describe, expect, it } from 'vitest';

import { createFlowContext } from '../context';
import { ConfigError } from '../errors';
import { InMemoryEventBus } from '../events';
import { evaluateExpression } from '../expression';
import {
  type StepDispatcher,
  buildCoreGovernedRegistry,
  createGovernedDispatcher,
  dispatchGoverned,
  contractRefToString,
} from '../governance';
import { runFlow } from '../interpreter';
import type { EngineServices } from '../operators';
import type { IIntegrationRunner } from '../ports';
import type { FlowDefinitionInput, StepDef } from '../schemas';

import { getBalanceFlow, investScreenFlow } from './fixtures/flows';
import { MockIntegrationRunner } from './fixtures/mockIntegrationRunner';

const governed = createGovernedDispatcher(buildCoreGovernedRegistry());
const live: ExecutionContext = { mode: 'live', tenantId: 'partnerco', customerId: 'cus_1' };
const trivialRunner: IIntegrationRunner = { run: async () => ({}) };

describe('G1 — registry governado roda o vocabulário atual em paridade', () => {
  it('registra os 6 operadores como core.*@1', () => {
    expect(buildCoreGovernedRegistry().refs().sort()).toEqual([
      'core.branch@1',
      'core.call-integration@1',
      'core.compose-template@1',
      'core.emit-event@1',
      'core.foreach@1',
      'core.validate@1',
    ]);
  });

  it('resolve aceita op literal e ref namespaced; desconhecido → undefined', () => {
    const registry = buildCoreGovernedRegistry();
    expect(registry.resolve('validate')).toBeDefined();
    expect(registry.resolve('core.validate@1')).toBeDefined();
    expect(registry.resolve('compose-template')?.contract.ref).toEqual({
      namespace: 'core',
      name: 'compose-template',
      version: 1,
    });
    expect(registry.resolve('tenant.unknown@1')).toBeUndefined();
    expect(registry.resolve('Nope!')).toBeUndefined();
  });

  it('os contratos core carregam I/O e capabilities reais (G2)', () => {
    const registry = buildCoreGovernedRegistry();
    const validate = registry.resolve('validate')?.contract;
    expect(validate?.capabilities.pure).toBe(true);
    expect(validate?.input).toMatchObject({ type: 'object' });
    expect(validate?.output).toMatchObject({ type: 'object' });
    const call = registry.resolve('call-integration')?.contract;
    expect(call?.capabilities.pure).toBe(false);
    expect(call?.effects.writes).toContain('as');
  });

  const sandbox: ExecutionContext = {
    mode: 'sandbox',
    tenantId: 'partnerco',
    customerId: 'cus_1',
    mockProfile: 'happyPath',
  };
  const parityCases: ReadonlyArray<[string, FlowDefinitionInput]> = [
    ['get-balance', getBalanceFlow],
    ['invest-screen', investScreenFlow],
  ];

  it.each(parityCases)('paridade switch↔governado: %s', async (_name, flow) => {
    const viaSwitch = await runFlow(
      flow,
      { auth: sandbox },
      { integrationRunner: new MockIntegrationRunner() },
    );
    const viaGoverned = await runFlow(
      flow,
      { auth: sandbox },
      { integrationRunner: new MockIntegrationRunner(), dispatcher: governed },
    );
    expect(viaGoverned.ok).toBe(true);
    expect(viaGoverned).toEqual(viaSwitch);
  });

  it('branch + emit-event despacham pelo governado', async () => {
    const flow: FlowDefinitionInput = {
      id: 'branch-demo',
      name: 'branch demo',
      input: { from: 'request', pick: ['flag'] },
      steps: [
        {
          op: 'branch',
          cases: [{ when: '{{ flag }}', steps: [{ op: 'emit-event', event: 'hit' }] }],
        },
      ],
      output: '{{ flag }}',
    };
    const res = await runFlow(
      flow,
      { auth: live, request: { flag: 1 } },
      { integrationRunner: trivialRunner, dispatcher: governed },
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.emitted.map((event) => event.event)).toContain('hit');
  });

  it('foreach: o governado executa; o switch legado tinha gap (no-op)', async () => {
    const flow: FlowDefinitionInput = {
      id: 'foreach-demo',
      name: 'foreach demo',
      input: { from: 'request', pick: ['xs'] },
      steps: [
        {
          op: 'foreach',
          items: '{{ xs }}',
          as: 'rows',
          steps: [{ op: 'emit-event', event: 'row' }],
        },
      ],
      output: '{{ rows }}',
    };
    const run = (dispatcher?: StepDispatcher): ReturnType<typeof runFlow> =>
      runFlow(
        flow,
        { auth: live, request: { xs: [1, 2, 3] } },
        { integrationRunner: trivialRunner, dispatcher },
      );

    const viaGoverned = await run(governed);
    const viaSwitch = await run();

    expect(viaGoverned.ok).toBe(true);
    expect(viaSwitch.ok).toBe(true);
    // O governado faz o lookup do ref e executa o foreach (3 emissões).
    if (viaGoverned.ok) {
      expect(viaGoverned.emitted.filter((event) => event.event === 'row')).toHaveLength(3);
    }
    // O switch legado não tem caso `foreach` → o step é no-op (gap que o governado fecha).
    if (viaSwitch.ok) {
      expect(viaSwitch.emitted.filter((event) => event.event === 'row')).toHaveLength(0);
    }
  });

  it('ref não registrado → ConfigError (fail-closed)', () => {
    const registry = buildCoreGovernedRegistry();
    const services: EngineServices = {
      integrationRunner: trivialRunner,
      eventBus: new InMemoryEventBus(),
      evaluate: evaluateExpression,
      runSteps: async () => {},
    };
    const context = { ctx: createFlowContext(live, {}), services, profile: undefined };
    const unknownStep = { op: 'tenant.nope@1' } as unknown as StepDef;
    expect(() => dispatchGoverned(unknownStep, context, registry)).toThrow(ConfigError);
  });

  it('contractRefToString formata o ref namespaced', () => {
    expect(contractRefToString({ namespace: 'core', name: 'validate', version: 1 })).toBe(
      'core.validate@1',
    );
    expect(contractRefToString({ namespace: 'acme', name: 'execute-transfer', version: 2 })).toBe(
      'acme.execute-transfer@2',
    );
  });
});
