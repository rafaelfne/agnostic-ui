import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { describe, expect, it } from 'vitest';

import { createFlowContext } from '../context';
import { ConfigError } from '../errors';
import { InMemoryEventBus } from '../events';
import { evaluateExpression } from '../expression';
import {
  type StepDispatcher,
  OperatorContractSchema,
  buildCoreGovernedRegistry,
  contractRefToString,
  dispatchGoverned,
} from '../governance';
import { createSwitchDispatcher, runFlow } from '../interpreter';
import type { EngineServices } from '../operators';
import type { IIntegrationRunner } from '../ports';
import type { FlowDefinitionInput, StepDef } from '../schemas';

import { getBalanceFlow, investScreenFlow } from './fixtures/flows';
import { MockIntegrationRunner } from './fixtures/mockIntegrationRunner';

const live: ExecutionContext = { mode: 'live', tenantId: 'partnerco', customerId: 'cus_1' };
const trivialRunner: IIntegrationRunner = { run: async () => ({}) };
// O default do runtime é o governado (G3); o switch fica reachable para paridade.
const switchDispatcher = createSwitchDispatcher();

describe('Frente G — registry governado (G1–G3)', () => {
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

  it.each(parityCases)('paridade default(governado)↔switch legado: %s', async (_name, flow) => {
    const viaGoverned = await runFlow(
      flow,
      { auth: sandbox },
      { integrationRunner: new MockIntegrationRunner() },
    );
    const viaSwitch = await runFlow(
      flow,
      { auth: sandbox },
      { integrationRunner: new MockIntegrationRunner(), dispatcher: switchDispatcher },
    );
    expect(viaGoverned.ok).toBe(true);
    expect(viaGoverned).toEqual(viaSwitch);
  });

  it('branch + emit-event despacham pelo default (governado)', async () => {
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
      { integrationRunner: trivialRunner },
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.emitted.map((event) => event.event)).toContain('hit');
  });

  it('foreach: o default (governado) agora executa; o switch legado é no-op (G3 fechou o gap)', async () => {
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

    const viaGoverned = await run(); // default = governado
    const viaSwitch = await run(switchDispatcher);

    expect(viaGoverned.ok).toBe(true);
    expect(viaSwitch.ok).toBe(true);
    if (viaGoverned.ok) {
      expect(viaGoverned.emitted.filter((event) => event.event === 'row')).toHaveLength(3);
    }
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

  it('um operador de tenant registrado despacha pelo governado (G3)', async () => {
    const registry = buildCoreGovernedRegistry();
    let called = false;
    registry.register<StepDef>(
      OperatorContractSchema.parse({
        ref: { namespace: 'acme', name: 'ping', version: 1 },
        input: {},
        output: {},
        capabilities: { pure: true },
        effects: {},
      }),
      () => {
        called = true;
      },
    );
    expect(registry.resolve('acme.ping@1')).toBeDefined();
    const services: EngineServices = {
      integrationRunner: trivialRunner,
      eventBus: new InMemoryEventBus(),
      evaluate: evaluateExpression,
      runSteps: async () => {},
    };
    const context = { ctx: createFlowContext(live, {}), services, profile: undefined };
    await dispatchGoverned({ op: 'acme.ping@1' } as unknown as StepDef, context, registry);
    expect(called).toBe(true);
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
