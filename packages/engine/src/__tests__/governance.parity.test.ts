import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { describe, expect, it } from 'vitest';

import { createFlowContext } from '../context';
import { ConfigError } from '../errors';
import { InMemoryEventBus } from '../events';
import { evaluateExpression } from '../expression';
import {
  OperatorContractSchema,
  buildCoreGovernedRegistry,
  contractRefToString,
  dispatchGoverned,
} from '../governance';
import { runFlow } from '../interpreter';
import type { EngineServices } from '../operators';
import type { IIntegrationRunner } from '../ports';
import type { FlowDefinitionInput, StepDef } from '../schemas';

const live: ExecutionContext = { mode: 'live', tenantId: 'partnerco', customerId: 'cus_1' };
const trivialRunner: IIntegrationRunner = { run: async () => ({}) };

describe('Frente G — registry governado (G1–G8)', () => {
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
    const call = registry.resolve('call-integration')?.contract;
    expect(call?.capabilities.pure).toBe(false);
    expect(call?.effects.writes).toContain('as');
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

  it('foreach executa pelo default (governado, lookup por ref)', async () => {
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
    const res = await runFlow(
      flow,
      { auth: live, request: { xs: [1, 2, 3] } },
      { integrationRunner: trivialRunner },
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.emitted.filter((event) => event.event === 'row')).toHaveLength(3);
  });

  it('ref não registrado → ConfigError (fail-closed)', async () => {
    const registry = buildCoreGovernedRegistry();
    const services: EngineServices = {
      integrationRunner: trivialRunner,
      eventBus: new InMemoryEventBus(),
      evaluate: evaluateExpression,
      runSteps: async () => {},
    };
    const context = { ctx: createFlowContext(live, {}), services, profile: undefined };
    const unknownStep = { op: 'tenant.nope@1' } as unknown as StepDef;
    await expect(dispatchGoverned(unknownStep, context, registry)).rejects.toThrow(ConfigError);
  });

  it('um operador de tenant registrado despacha pelo governado', async () => {
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
