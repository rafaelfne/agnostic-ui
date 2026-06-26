import { describe, expect, it } from 'vitest';

import {
  type OperatorCapabilities,
  type OperatorEffects,
  OperatorContractSchema,
  deriveTrustTier,
  formatReviewSummary,
  reviewSummary,
} from '../schemas';

function contract(
  capabilities: Partial<OperatorCapabilities>,
  effects: Partial<OperatorEffects> = {},
) {
  return OperatorContractSchema.parse({
    ref: { namespace: 'acme', name: 'x', version: 1 },
    input: {},
    output: {},
    capabilities,
    effects,
  });
}

describe('trust tier derivado (ADR 0006 §5)', () => {
  it('pure → safe', () => {
    expect(deriveTrustTier(contract({ pure: true }))).toBe('safe');
  });

  it('integrations ou secrets → sensitive', () => {
    expect(deriveTrustTier(contract({ integrations: ['stripe'] }))).toBe('sensitive');
    expect(deriveTrustTier(contract({ secrets: ['K'] }))).toBe('sensitive');
  });

  it('reversible:false → critical (vence tudo)', () => {
    expect(deriveTrustTier(contract({ pure: true }, { reversible: false }))).toBe('critical');
    expect(deriveTrustTier(contract({ secrets: ['K'] }, { reversible: false }))).toBe('critical');
  });

  it('não-puro sem egress declarado → sensitive (precaução)', () => {
    expect(deriveTrustTier(contract({ pure: false }))).toBe('sensitive');
  });

  it('reviewSummary deriva do mesmo contrato', () => {
    const summary = reviewSummary(
      contract(
        { pure: false, integrations: ['stripe'], secrets: ['K'] },
        { writes: ['ledger'], reversible: false, compensation: 'acme.reverse' },
      ),
    );
    expect(summary.tier).toBe('critical');
    expect(summary.integrations).toEqual(['stripe']);
    expect(summary.secrets).toEqual(['K']);
    expect(summary.writes).toEqual(['ledger']);
    expect(summary.reversible).toBe(false);
    expect(summary.compensation).toBe('acme.reverse');
  });

  it('formatReviewSummary marca a ação crítica', () => {
    const text = formatReviewSummary(contract({ secrets: ['ACME_KEY'] }, { reversible: false }));
    expect(text).toContain('tier: critical');
    expect(text).toContain('pré-flight');
  });
});
