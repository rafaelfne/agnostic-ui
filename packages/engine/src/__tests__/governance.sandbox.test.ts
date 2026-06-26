import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { describe, expect, it } from 'vitest';

import { createFlowContext } from '../context';
import { CapabilityError } from '../errors';
import { InMemoryEventBus } from '../events';
import { evaluateExpression } from '../expression';
import {
  OperatorContractSchema,
  buildCoreGovernedRegistry,
  dispatchGoverned,
  gateIntegrationRunner,
} from '../governance';
import type { EngineServices } from '../operators';
import type { IIntegrationRunner } from '../ports';
import type { StepDef } from '../schemas';

const live: ExecutionContext = { mode: 'live', tenantId: 'partnerco', customerId: 'cus_1' };
const realRunner: IIntegrationRunner = { run: async (call) => ({ ok: call.integration }) };

function contract(
  ns: string,
  name: string,
  capabilities: { pure?: boolean; integrations?: string[] },
) {
  return OperatorContractSchema.parse({
    ref: { namespace: ns, name, version: 1 },
    input: {},
    output: {},
    capabilities,
    effects: {},
  });
}

const call = (integration: string) => ({
  integration,
  operation: 'op',
  input: {},
  profile: undefined,
});

describe('G4 — sandbox de capability', () => {
  it('operador pure não acessa o integration runner', async () => {
    const gated = gateIntegrationRunner(realRunner, contract('core', 'validate', { pure: true }));
    await expect(gated.run(call('core'))).rejects.toBeInstanceOf(CapabilityError);
  });

  it('operador core não-puro usa o runner real (primitivo confiável)', async () => {
    const gated = gateIntegrationRunner(
      realRunner,
      contract('core', 'call-integration', { pure: false }),
    );
    await expect(gated.run(call('core'))).resolves.toEqual({ ok: 'core' });
  });

  it('operador de tenant só chama integrações declaradas', async () => {
    const gated = gateIntegrationRunner(
      realRunner,
      contract('acme', 'pay', { pure: false, integrations: ['stripe'] }),
    );
    await expect(gated.run(call('stripe'))).resolves.toEqual({ ok: 'stripe' });
    await expect(gated.run(call('forbidden'))).rejects.toBeInstanceOf(CapabilityError);
  });

  it('dispatchGoverned escopa o runner: operador pure que tenta egress → CapabilityError', async () => {
    const registry = buildCoreGovernedRegistry();
    registry.register<StepDef>(contract('evil', 'leak', { pure: true }), async (_step, ctx) => {
      await ctx.services.integrationRunner.run(call('core'));
    });
    const services: EngineServices = {
      integrationRunner: realRunner,
      eventBus: new InMemoryEventBus(),
      evaluate: evaluateExpression,
      runSteps: async () => {},
    };
    const context = { ctx: createFlowContext(live, {}), services, profile: undefined };
    await expect(
      dispatchGoverned({ op: 'evil.leak@1' } as unknown as StepDef, context, registry),
    ).rejects.toBeInstanceOf(CapabilityError);
  });

  it('dispatchGoverned escopa o runner: operador de tenant chama integração declarada', async () => {
    const registry = buildCoreGovernedRegistry();
    let result: unknown;
    registry.register<StepDef>(
      contract('acme', 'pay', { pure: false, integrations: ['stripe'] }),
      async (_step, ctx) => {
        result = await ctx.services.integrationRunner.run(call('stripe'));
      },
    );
    const services: EngineServices = {
      integrationRunner: realRunner,
      eventBus: new InMemoryEventBus(),
      evaluate: evaluateExpression,
      runSteps: async () => {},
    };
    const context = { ctx: createFlowContext(live, {}), services, profile: undefined };
    await dispatchGoverned({ op: 'acme.pay@1' } as unknown as StepDef, context, registry);
    expect(result).toEqual({ ok: 'stripe' });
  });
});
