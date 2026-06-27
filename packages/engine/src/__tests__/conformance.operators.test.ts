import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { describe, expect, it } from 'vitest';

import { runFlow } from '../interpreter';
import type { IIntegrationRunner } from '../ports';
import type { FlowDefinitionInput, StepDef } from '../schemas';

interface OperatorVector {
  name: string;
  step: StepDef;
  input?: Record<string, unknown>;
  integrationResult?: unknown;
  output: string;
  expect: { body?: unknown; emits?: string[]; errorKind?: string };
}

const dir = fileURLToPath(new URL('../../../core/conformance/operators/', import.meta.url));
const vectors: OperatorVector[] = readdirSync(dir)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(readFileSync(`${dir}${file}`, 'utf8')) as OperatorVector);

const live: ExecutionContext = { mode: 'live', tenantId: 'partnerco', customerId: 'cus_1' };

describe('conformance — operadores (engine-only, H5)', () => {
  it('carrega o corpus de operadores', () => {
    expect(vectors.length).toBeGreaterThan(0);
  });

  it.each(vectors)('$name: step → output / efeito', async (vector) => {
    const flow: FlowDefinitionInput = {
      id: 'op-vector',
      name: vector.name,
      input: { from: 'request', pick: Object.keys(vector.input ?? {}) },
      steps: [vector.step],
      output: vector.output,
    };
    const runner: IIntegrationRunner = { run: async () => vector.integrationResult ?? {} };
    const result = await runFlow(
      flow,
      { auth: live, request: vector.input ?? {} },
      { integrationRunner: runner },
    );

    if (vector.expect.errorKind !== undefined) {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe(vector.expect.errorKind);
      return;
    }
    expect(result.ok).toBe(true);
    if (result.ok) {
      if (vector.expect.body !== undefined) expect(result.body).toEqual(vector.expect.body);
      if (vector.expect.emits !== undefined) {
        expect(result.emitted.map((event) => event.event)).toEqual(vector.expect.emits);
      }
    }
  });
});
