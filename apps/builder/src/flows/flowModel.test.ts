import { describe, expect, it } from 'vitest';

import { STEP_OPS, emptyFlow, emptyStep, validateFlow } from './flowModel';

describe('flowModel', () => {
  it('emptyFlow produces a schema-valid draft', () => {
    expect(validateFlow(emptyFlow('get-balance'))).toEqual({ ok: true });
  });

  it('every emptyStep is valid inside a flow', () => {
    for (const op of STEP_OPS) {
      const flow = { ...emptyFlow('f'), steps: [emptyStep(op)] };
      expect(validateFlow(flow), op).toEqual({ ok: true });
    }
  });

  it('reports issues with a path for a broken draft', () => {
    const result = validateFlow({ id: 'x', name: '', steps: [], output: '{{ x }}' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // name is empty and steps is empty → at least two issues, each with a path
    expect(result.issues.length).toBeGreaterThanOrEqual(2);
    expect(result.issues.every((issue) => typeof issue.path === 'string')).toBe(true);
    expect(result.issues.map((issue) => issue.path)).toContain('steps');
  });

  it('rejects an id that does not match the id pattern', () => {
    const result = validateFlow({ ...emptyFlow('ok'), id: '1-bad' });
    expect(result.ok).toBe(false);
  });
});
