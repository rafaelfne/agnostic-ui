import { describe, expect, it } from 'vitest';

import { certificationLevel, isCertified } from '../conformance';
import { OperatorContractSchema } from '../schemas';

function contract(fixtures: string[]) {
  return OperatorContractSchema.parse({
    ref: { namespace: 'acme', name: 'x', version: 1 },
    input: {},
    output: {},
    capabilities: {},
    effects: {},
    conformance: { fixtures },
  });
}

describe('certificação (ADR 0006 §8, H7)', () => {
  it('certified com ≥1 fixture; uncertified sem fixtures', () => {
    expect(certificationLevel(contract(['acme/x.ok']))).toBe('certified');
    expect(isCertified(contract(['acme/x.ok']))).toBe(true);
    expect(certificationLevel(contract([]))).toBe('uncertified');
    expect(isCertified(contract([]))).toBe(false);
  });
});
