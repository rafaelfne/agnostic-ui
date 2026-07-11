import { describe, expect, it } from 'vitest';

import { emptyScreen, validateScreen } from './screenModel';

describe('K1 — screenModel', () => {
  it('emptyScreen é schema-válido (mesma garantia do emptyFlow)', () => {
    expect(validateScreen(emptyScreen('home'))).toEqual({ ok: true });
  });

  it('emptyScreen deriva route e dataFlow do slug', () => {
    const draft = emptyScreen('saldo');
    expect(draft).toMatchObject({ id: 'saldo', route: '/saldo', dataFlow: 'saldo' });
    expect(draft.root).toEqual({ type: 'screen', children: [] });
  });

  it('validateScreen achata issues com path legível', () => {
    const result = validateScreen({ id: 'x', route: '', root: { type: 'screen' } });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const paths = result.issues.map((issue) => issue.path);
      expect(paths).toContain('route'); // min(1)
      expect(paths).toContain('dataFlow'); // ausente
    }
  });
});
