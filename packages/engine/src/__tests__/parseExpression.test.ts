import { describe, expect, it } from 'vitest';

import { ExpressionError } from '../errors';
import { evaluateExpression, parsePlaceholder } from '../index';

const scope = {
  count: 3,
  price: 10,
  user: { name: 'Ada', premium: true },
  flow: { currency: 'BRL' },
};

const ev = (src: string): unknown => evaluateExpression(src, scope);

describe('parseExpression — gramática inline (F1.A.2)', () => {
  it('resolve paths e preserva o tipo num placeholder inteiro', () => {
    expect(ev('{{ count }}')).toBe(3);
    expect(ev('{{ user.name }}')).toBe('Ada');
    expect(ev('{{ user.premium }}')).toBe(true);
  });

  it('aplica aritmética com precedência e parênteses', () => {
    expect(ev('{{ price + count * 2 }}')).toBe(16);
    expect(ev('{{ (price + count) * 2 }}')).toBe(26);
    expect(ev('{{ price - count }}')).toBe(7);
    expect(ev('{{ -count + 5 }}')).toBe(2);
  });

  it('avalia comparações e igualdade', () => {
    expect(ev('{{ count > 2 }}')).toBe(true);
    expect(ev('{{ count >= 3 }}')).toBe(true);
    expect(ev('{{ count == 3 }}')).toBe(true);
    expect(ev('{{ user.name != "Bob" }}')).toBe(true);
  });

  it('avalia booleanos com curto-circuito', () => {
    expect(ev('{{ user.premium && count > 2 }}')).toBe(true);
    expect(ev('{{ user.premium || missing }}')).toBe(true);
    expect(ev('{{ !user.premium }}')).toBe(false);
    expect(ev('{{ missing && boom.deep }}')).toBeUndefined();
  });

  it('avalia condicional ternário', () => {
    expect(ev("{{ count > 5 ? 'big' : 'small' }}")).toBe('small');
    expect(ev("{{ user.premium ? 'vip' : 'std' }}")).toBe('vip');
  });

  it('chama funções curadas', () => {
    expect(ev('{{ upper(user.name) }}')).toBe('ADA');
    expect(ev("{{ concat(user.name, '!') }}")).toBe('Ada!');
    expect(ev("{{ coalesce(missing, 'fallback') }}")).toBe('fallback');
  });

  it('interpola texto + placeholders via concat', () => {
    expect(ev('R$ {{ price }}')).toBe('R$ 10');
    expect(ev('{{ user.name }} ({{ count }})')).toBe('Ada (3)');
    expect(parsePlaceholder('sem placeholder')).toEqual({
      kind: 'lit',
      value: 'sem placeholder',
    });
  });

  it('rejeita função desconhecida e entrada malformada', () => {
    expect(() => ev('{{ danger(user) }}')).toThrow(ExpressionError);
    expect(() => ev('{{ count + }}')).toThrow(ExpressionError);
    expect(() => ev("{{ 'unterminated }}")).toThrow(ExpressionError);
    expect(() => ev('{{ count count }}')).toThrow(ExpressionError);
  });
});
