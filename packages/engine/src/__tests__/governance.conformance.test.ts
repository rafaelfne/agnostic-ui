import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { describe, expect, it } from 'vitest';

import {
  type OperatorConformanceFixture,
  OperatorContractSchema,
  buildCoreGovernedRegistry,
  certifyContract,
  coreOperatorContracts,
  coreOperatorFixtures,
} from '../governance';
import { runFlow } from '../interpreter';
import type { IIntegrationRunner } from '../ports';
import type { FlowDefinitionInput, StepDef } from '../schemas';

const live: ExecutionContext = { mode: 'live', tenantId: 'partnerco', customerId: 'cus_1' };

function runOperatorFixture(fixture: OperatorConformanceFixture) {
  const flow: FlowDefinitionInput = {
    // `id` é IdSchema (sem `/` nem `.`); o id da fixture vai no `name`.
    id: 'fixture',
    name: fixture.id,
    input: { from: 'request', pick: Object.keys(fixture.input ?? {}) },
    steps: [fixture.step],
    output: fixture.output,
  };
  const runner: IIntegrationRunner = { run: async () => fixture.integrationResult ?? {} };
  return runFlow(flow, { auth: live, request: fixture.input ?? {} }, { integrationRunner: runner });
}

describe('G7 — conformância por contrato (3º pé do tripé)', () => {
  it('todo contrato core é certificado (declara ≥1 fixture)', () => {
    for (const contract of Object.values(coreOperatorContracts)) {
      expect(certifyContract(contract)).toBe(true);
    }
  });

  it('toda fixture declarada existe no corpus', () => {
    for (const contract of Object.values(coreOperatorContracts)) {
      for (const id of contract.conformance.fixtures) {
        expect(coreOperatorFixtures[id]).toBeDefined();
      }
    }
  });

  it('registerCertified recusa contrato sem fixtures (fail-closed)', () => {
    const registry = buildCoreGovernedRegistry();
    const fixtureless = OperatorContractSchema.parse({
      ref: { namespace: 'acme', name: 'x', version: 1 },
      input: {},
      output: {},
      capabilities: {},
      effects: {},
    });
    expect(() => registry.registerCertified<StepDef>(fixtureless, () => {})).toThrow();
  });

  it.each(Object.values(coreOperatorFixtures))(
    'fixture $id passa contra o handler vivo',
    async (fixture) => {
      const result = await runOperatorFixture(fixture);
      if (fixture.expect.errorKind !== undefined) {
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.kind).toBe(fixture.expect.errorKind);
        return;
      }
      expect(result.ok).toBe(true);
      if (result.ok) {
        if (fixture.expect.body !== undefined) expect(result.body).toEqual(fixture.expect.body);
        if (fixture.expect.emits !== undefined) {
          expect(result.emitted.map((event) => event.event)).toEqual(fixture.expect.emits);
        }
      }
    },
  );
});
