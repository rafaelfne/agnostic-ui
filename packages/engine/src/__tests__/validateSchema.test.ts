import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createFlowContext } from '../context';
import { ConfigError, ValidationError } from '../errors';
import { InMemoryEventBus } from '../events';
import { evaluateExpression } from '../expression';
import { type EngineServices, type SchemaResolver, validateOperator } from '../operators';

const live: ExecutionContext = { mode: 'live', tenantId: 't', customerId: 'c' };

const AmountSchema = z.object({ amount: z.number().int().positive() });

function services(schemas: SchemaResolver): EngineServices {
  return {
    integrationRunner: { run: async () => ({}) },
    eventBus: new InMemoryEventBus(),
    evaluate: evaluateExpression,
    runSteps: async () => undefined,
    schemas,
  };
}

const run = (input: Record<string, unknown>, schemas: SchemaResolver): void => {
  const ctx = createFlowContext(live, input);
  validateOperator(
    { op: 'validate', require: [], schema: 'amount' },
    { ctx, services: services(schemas), profile: undefined },
  );
};

describe('validate with a referenced schema', () => {
  it('passes a scope that satisfies the schema', () => {
    expect(() => run({ amount: 100 }, () => AmountSchema)).not.toThrow();
  });

  it('throws ValidationError carrying the field issues', () => {
    expect(() => run({ amount: 0 }, () => AmountSchema)).toThrow(ValidationError);
    try {
      run({ amount: 0 }, () => AmountSchema);
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).issues.map((issue) => issue.path)).toContain('amount');
    }
  });

  it('throws ConfigError when the referenced schema is unknown', () => {
    expect(() => run({ amount: 100 }, () => undefined)).toThrow(ConfigError);
  });
});
