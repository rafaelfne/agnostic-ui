import { describe, expect, it } from 'vitest';

import { FakeLlm } from '../infra/llm/FakeLlm';
import { TriageSchema, triagePrompt, triageRequest } from '../interface/builder/triage';

const ruledOut = { composition: 'a', integration: 'b', expression: 'c' };

describe('I.3 — triagem-primeiro (fail-closed)', () => {
  it('accepts composition/integration/expression without rule-outs', () => {
    for (const resolution of ['composition', 'integration', 'expression'] as const) {
      expect(TriageSchema.safeParse({ resolution, rationale: 'r' }).success).toBe(true);
    }
  });

  it('blocks needs-extension WITHOUT the three rule-outs', () => {
    expect(TriageSchema.safeParse({ resolution: 'needs-extension', rationale: 'r' }).success).toBe(
      false,
    );
    // an empty justification does not count
    expect(
      TriageSchema.safeParse({
        resolution: 'needs-extension',
        rationale: 'r',
        ruledOut: { composition: 'a', integration: 'b', expression: '' },
      }).success,
    ).toBe(false);
    // nor does a whitespace-only one (trim-validated)
    expect(
      TriageSchema.safeParse({
        resolution: 'needs-extension',
        rationale: 'r',
        ruledOut: { composition: '   ', integration: 'b', expression: 'c' },
      }).success,
    ).toBe(false);
  });

  it('accepts needs-extension WITH all three rule-outs', () => {
    expect(
      TriageSchema.safeParse({ resolution: 'needs-extension', rationale: 'r', ruledOut }).success,
    ).toBe(true);
  });

  it('triageRequest flags an unjustified needs-extension as `unjustified`', async () => {
    const llm = new FakeLlm(() => ({
      config: { resolution: 'needs-extension', rationale: 'r' },
      rationale: 'x',
    }));
    expect(await triageRequest(llm, 'do X', 'ctx')).toMatchObject({
      ok: false,
      reason: 'unjustified',
    });
  });

  it('triageRequest flags non-triage output as `invalid`', async () => {
    const llm = new FakeLlm(() => ({ config: { whatever: 1 }, rationale: 'x' }));
    expect(await triageRequest(llm, 'do X', 'ctx')).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('triageRequest passes a satisfiable verdict through', async () => {
    const llm = new FakeLlm(() => ({
      config: { resolution: 'composition', rationale: 'reuse' },
      rationale: 'x',
    }));
    expect(await triageRequest(llm, 'do X', 'ctx')).toMatchObject({ ok: true });
  });

  it('the triage prompt names the three mechanisms and the last-resort rule', () => {
    const p = triagePrompt('build a thing');
    expect(p).toContain('composition');
    expect(p).toContain('integration');
    expect(p).toContain('expression');
    expect(p).toContain('needs-extension');
    expect(p).toContain('build a thing');
  });
});
