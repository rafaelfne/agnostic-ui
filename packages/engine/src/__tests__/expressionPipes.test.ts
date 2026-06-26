import { describe, expect, it } from 'vitest';

import { ExpressionError } from '../errors';
import { evaluateExpression } from '../index';

const scope = {
  price: 1234.5,
  rate: 0.156,
  when: '2026-01-15T10:00:00Z',
  user: { name: 'Ada' },
};

const ev = (src: string, locale?: string): unknown =>
  evaluateExpression(src, scope, locale ? { locale } : undefined);

describe('pipes + funções de formatação (F1.A.1)', () => {
  it('desugar de pipe é igual à chamada direta', () => {
    expect(ev("{{ price | currency('USD') }}")).toBe('$1,234.50');
    expect(ev("{{ currency(price, 'USD') }}")).toBe('$1,234.50');
  });

  it('formata currency/percent/date com o locale de avaliação', () => {
    expect(ev("{{ price | currency('BRL') }}")).toBe('R$1,234.50');
    expect(ev('{{ rate | percent(1) }}')).toBe('15.6%');
    expect(ev('{{ when | date }}')).toBe('1/15/2026');
  });

  it('o locale ambiente é aplicado e sobreponível por evaluation', () => {
    expect(ev('{{ when | date }}', 'pt-BR')).toBe('15/01/2026');
    expect(ev("{{ price | currency('BRL') }}", 'pt-BR')).toContain('1.234,50');
  });

  it('uppercase e encadeamento de pipes (left-assoc)', () => {
    expect(ev('{{ user.name | uppercase }}')).toBe('ADA');
    expect(ev('{{ user.name | uppercase | lower }}')).toBe('ada');
  });

  it('interpola formatação em texto', () => {
    expect(ev("Saldo: {{ price | currency('USD') }}")).toBe('Saldo: $1,234.50');
  });

  it('rejeita pipe para função desconhecida e código de moeda ausente', () => {
    expect(() => ev('{{ price | danger }}')).toThrow(ExpressionError);
    expect(() => ev('{{ price | currency }}')).toThrow(ExpressionError);
  });
});
