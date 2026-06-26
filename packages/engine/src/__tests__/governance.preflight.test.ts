import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { describe, expect, it } from 'vitest';

import { createFlowContext } from '../context';
import { CapabilityError } from '../errors';
import { InMemoryEventBus } from '../events';
import { evaluateExpression } from '../expression';
import { OperatorContractSchema, buildCoreGovernedRegistry, dispatchGoverned } from '../governance';
import type { EngineServices, PreflightHook, PreflightInfo } from '../operators';
import type { IIntegrationRunner } from '../ports';
import type { StepDef } from '../schemas';

const live: ExecutionContext = { mode: 'live', tenantId: 'partnerco', customerId: 'cus_1' };
const trivialRunner: IIntegrationRunner = { run: async () => ({}) };
const step = { op: 'acme.transfer@1' } as unknown as StepDef;

function criticalRegistry() {
  const registry = buildCoreGovernedRegistry();
  let ran = false;
  registry.register<StepDef>(
    OperatorContractSchema.parse({
      ref: { namespace: 'acme', name: 'transfer', version: 1 },
      input: {},
      output: {},
      capabilities: { pure: false, secrets: ['ACME_KEY'] },
      effects: { reversible: false },
    }),
    () => {
      ran = true;
    },
  );
  return { registry, ran: () => ran };
}

function context(preflight?: PreflightHook) {
  const services: EngineServices = {
    integrationRunner: trivialRunner,
    eventBus: new InMemoryEventBus(),
    evaluate: evaluateExpression,
    runSteps: async () => {},
    preflight,
  };
  return { ctx: createFlowContext(live, {}), services, profile: undefined };
}

describe('G5 — pré-flight de ação crítica', () => {
  it('crítico sem hook → bloqueado (fail-closed); o handler não roda', async () => {
    const { registry, ran } = criticalRegistry();
    await expect(dispatchGoverned(step, context(), registry)).rejects.toBeInstanceOf(
      CapabilityError,
    );
    expect(ran()).toBe(false);
  });

  it('crítico com hook que nega → bloqueado', async () => {
    const { registry, ran } = criticalRegistry();
    await expect(
      dispatchGoverned(
        step,
        context(() => false),
        registry,
      ),
    ).rejects.toBeInstanceOf(CapabilityError);
    expect(ran()).toBe(false);
  });

  it('crítico com hook que aprova → despacha; o hook recebe o review summary', async () => {
    const { registry, ran } = criticalRegistry();
    let received: PreflightInfo | undefined;
    const hook: PreflightHook = (info) => {
      received = info;
      return true;
    };
    await dispatchGoverned(step, context(hook), registry);
    expect(ran()).toBe(true);
    expect(received?.tier).toBe('critical');
    expect(received?.summary.secrets).toContain('ACME_KEY');
    expect(received?.ref).toBe('acme.transfer@1');
  });
});
