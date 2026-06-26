import { describe, expect, it } from 'vitest';

import { bindValue } from '../binding';

/**
 * O renderer React acompanha a gramática rica do engine porque `bindValue`
 * delega ao mesmo `evaluateExpression` (F1.A.5). Sem wiring extra nos registries.
 */
describe('binding do React usa a gramática do engine', () => {
  const scope = { user: { name: 'Ada', premium: true }, count: 3, price: 10 };

  it('resolve condicional, comparação, pipe e interpolação', () => {
    expect(bindValue("{{ user.premium ? 'VIP' : 'Std' }}", scope)).toBe('VIP');
    expect(bindValue('{{ count > 2 }}', scope)).toBe(true);
    expect(bindValue('{{ price + count * 2 }}', scope)).toBe(16);
    expect(bindValue('{{ user.name | upper }}', scope)).toBe('ADA');
    expect(bindValue('Olá, {{ user.name }}!', scope)).toBe('Olá, Ada!');
  });
});
