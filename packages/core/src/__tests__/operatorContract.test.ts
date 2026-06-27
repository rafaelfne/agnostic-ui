import { describe, expect, it } from 'vitest';

import {
  ComponentContractSchema,
  OperatorContractSchema,
  contractRefToString,
  normalizeContractRef,
  parseContractRef,
} from '../schemas';

describe('OperatorContract (ADR 0006)', () => {
  it('aceita um contrato válido e aplica defaults', () => {
    const parsed = OperatorContractSchema.parse({
      ref: { namespace: 'acme', name: 'execute-transfer', version: 1 },
      input: { type: 'object' },
      output: { type: 'object' },
      capabilities: { secrets: ['ACME_KEY'] },
      effects: { reversible: false },
    });
    expect(parsed.capabilities.pure).toBe(false);
    expect(parsed.capabilities.integrations).toEqual([]);
    expect(parsed.effects.idempotent).toBe(true);
    expect(parsed.effects.reversible).toBe(false);
  });

  it('rejeita ref malformado (namespace maiúsculo, version não-positiva)', () => {
    expect(
      OperatorContractSchema.safeParse({
        ref: { namespace: 'Acme', name: 'x', version: 0 },
        input: {},
        output: {},
        capabilities: {},
        effects: {},
      }).success,
    ).toBe(false);
  });

  it('ComponentContract exige renderOnly: true', () => {
    const base = {
      ref: { namespace: 'core', name: 'text', version: 1 },
      props: { type: 'object' },
    };
    expect(ComponentContractSchema.safeParse({ ...base, renderOnly: true }).success).toBe(true);
    expect(ComponentContractSchema.safeParse({ ...base, renderOnly: false }).success).toBe(false);
  });

  it('helpers de ref: round-trip e normalização', () => {
    const ref = { namespace: 'core', name: 'validate', version: 1 };
    expect(contractRefToString(ref)).toBe('core.validate@1');
    expect(parseContractRef('core.validate@1')).toEqual(ref);
    expect(parseContractRef('bad')).toBeUndefined();
    expect(normalizeContractRef('validate')).toEqual(ref);
    expect(normalizeContractRef('acme.x@2')).toEqual({ namespace: 'acme', name: 'x', version: 2 });
    expect(normalizeContractRef('Nope!')).toBeUndefined();
  });
});
