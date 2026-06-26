import { describe, expect, it } from 'vitest';

import { ACTION_TYPES, ActionDefSchema } from '../schemas/action';

describe('ActionDefSchema (união rica)', () => {
  it('aceita navegação com target e label', () => {
    const a = ActionDefSchema.parse({ type: 'navigate', target: '/invest', label: 'Investir' });
    expect(a).toEqual({ type: 'navigate', target: '/invest', label: 'Investir' });
  });

  it('aceita as variantes sem target (back, refreshHomePage)', () => {
    expect(ActionDefSchema.parse({ type: 'back' }).type).toBe('back');
    expect(ActionDefSchema.parse({ type: 'refreshHomePage' }).type).toBe('refreshHomePage');
  });

  it('aceita bridge com method e params', () => {
    const a = ActionDefSchema.parse({ type: 'bridge', method: 'haptics', params: { kind: 'tap' } });
    expect(a).toMatchObject({ type: 'bridge', method: 'haptics' });
  });

  it('cobre exatamente o vocabulário de tipos', () => {
    expect([...ACTION_TYPES].sort()).toEqual(
      ['back', 'bridge', 'navigate', 'navigateFlow', 'refreshHomePage', 'replaceCurrent'].sort(),
    );
  });

  it('rejeita tipo desconhecido e navigate sem target', () => {
    expect(() => ActionDefSchema.parse({ type: 'teleport' })).toThrow();
    expect(() => ActionDefSchema.parse({ type: 'navigate' })).toThrow();
  });
});
