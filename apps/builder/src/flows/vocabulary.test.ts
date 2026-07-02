import { describe, expect, it } from 'vitest';

import { operatorMaturities, operatorMaturity } from './vocabulary';

const CORE_OPS = [
  'validate',
  'call-integration',
  'compose-template',
  'branch',
  'emit-event',
  'foreach',
];

describe('J.2 — maturidade de operadores no builder (reusa J.1)', () => {
  it('os 6 operadores core têm maturidade `core`', () => {
    for (const op of CORE_OPS) expect(operatorMaturity(op)).toBe('core');
  });

  it('um op sem contrato conhecido é `unknown`', () => {
    expect(operatorMaturity('acme.discount')).toBe('unknown');
    expect(operatorMaturity('nope')).toBe('unknown');
  });

  it('operatorMaturities deduplica, ordena e mapeia a maturidade', () => {
    expect(operatorMaturities(['foreach', 'validate', 'validate', 'mystery'])).toEqual([
      { op: 'foreach', maturity: 'core' },
      { op: 'mystery', maturity: 'unknown' },
      { op: 'validate', maturity: 'core' },
    ]);
  });
});
