import { describe, expect, it } from 'vitest';

import { ExpressionError } from '../errors';
import {
  type ExpressionNode,
  evaluate,
  evaluateExpression,
  parsePlaceholder,
  readPath,
  toExpression,
} from '../index';
import { ExpressionNodeSchema } from '../schemas/expression';

const scope = {
  customerId: 'cus_1',
  flow: { currency: 'BRL', minAmount: 10_000, suggestedAmounts: [50_000, 100_000] },
  $auth: { tenantId: 'partnerco', customerId: 'cus_1', mode: 'sandbox' },
};

describe('readPath (safe access)', () => {
  it('reads nested own properties', () => {
    expect(readPath('flow.currency', scope)).toBe('BRL');
    expect(readPath('flow.suggestedAmounts', scope)).toEqual([50_000, 100_000]);
    expect(readPath('$auth.customerId', scope)).toBe('cus_1');
  });

  it('returns undefined on a missing hop instead of throwing', () => {
    expect(readPath('flow.nope.deep', scope)).toBeUndefined();
    expect(readPath('missing', scope)).toBeUndefined();
  });

  it('never traverses the prototype chain', () => {
    expect(readPath('toString', scope)).toBeUndefined();
  });

  it('blocks prototype-pollution segments', () => {
    expect(() => readPath('__proto__.polluted', scope)).toThrow(ExpressionError);
    expect(() => readPath('constructor.prototype', scope)).toThrow(ExpressionError);
  });
});

describe('evaluate', () => {
  it('returns literals and path values', () => {
    expect(evaluate({ kind: 'lit', value: 42 }, scope)).toBe(42);
    expect(evaluate({ kind: 'path', path: 'flow.minAmount' }, scope)).toBe(10_000);
  });

  it('evaluates comparisons and logic with short-circuit', () => {
    const gt = (a: number, b: number): ExpressionNode => ({
      kind: 'op',
      op: '>',
      args: [
        { kind: 'lit', value: a },
        { kind: 'lit', value: b },
      ],
    });
    expect(evaluate(gt(3, 2), scope)).toBe(true);
    expect(
      evaluate({ kind: 'op', op: '&&', args: [{ kind: 'lit', value: false }, gt(3, 2)] }, scope),
    ).toBe(false);
    expect(
      evaluate(
        {
          kind: 'op',
          op: '||',
          args: [
            { kind: 'lit', value: 0 },
            { kind: 'lit', value: 'fallback' },
          ],
        },
        scope,
      ),
    ).toBe('fallback');
    expect(evaluate({ kind: 'op', op: '!', args: [{ kind: 'lit', value: '' }] }, scope)).toBe(true);
  });

  it('does arithmetic and rejects non-numbers and division by zero', () => {
    expect(
      evaluate(
        {
          kind: 'op',
          op: '+',
          args: [
            { kind: 'lit', value: 2 },
            { kind: 'lit', value: 3 },
          ],
        },
        scope,
      ),
    ).toBe(5);
    expect(() =>
      evaluate(
        {
          kind: 'op',
          op: '+',
          args: [
            { kind: 'lit', value: 'x' },
            { kind: 'lit', value: 3 },
          ],
        },
        scope,
      ),
    ).toThrow(ExpressionError);
    expect(() =>
      evaluate(
        {
          kind: 'op',
          op: '/',
          args: [
            { kind: 'lit', value: 1 },
            { kind: 'lit', value: 0 },
          ],
        },
        scope,
      ),
    ).toThrow(ExpressionError);
  });

  it('evaluates conditionals', () => {
    expect(
      evaluate(
        {
          kind: 'cond',
          if: { kind: 'lit', value: true },
          then: { kind: 'lit', value: 'yes' },
          else: { kind: 'lit', value: 'no' },
        },
        scope,
      ),
    ).toBe('yes');
  });

  it('applies curated functions', () => {
    expect(
      evaluate({ kind: 'call', fn: 'upper', args: [{ kind: 'lit', value: 'br' }] }, scope),
    ).toBe('BR');
    expect(
      evaluate(
        {
          kind: 'call',
          fn: 'concat',
          args: [
            { kind: 'lit', value: 'a' },
            { kind: 'path', path: 'flow.currency' },
          ],
        },
        scope,
      ),
    ).toBe('aBRL');
    expect(
      evaluate(
        { kind: 'call', fn: 'len', args: [{ kind: 'path', path: 'flow.suggestedAmounts' }] },
        scope,
      ),
    ).toBe(2);
    expect(
      evaluate(
        {
          kind: 'call',
          fn: 'coalesce',
          args: [
            { kind: 'path', path: 'missing' },
            { kind: 'lit', value: 'def' },
          ],
        },
        scope,
      ),
    ).toBe('def');
  });

  it('guards against unbounded nesting', () => {
    let node: ExpressionNode = { kind: 'lit', value: 1 };
    for (let i = 0; i < 70; i++) node = { kind: 'op', op: '!', args: [node] };
    expect(() => evaluate(node, scope)).toThrow(/too deep/);
  });
});

describe('schema validation', () => {
  it('rejects an unknown function', () => {
    expect(ExpressionNodeSchema.safeParse({ kind: 'call', fn: 'evil', args: [] }).success).toBe(
      false,
    );
  });

  it('rejects an unknown operator', () => {
    expect(ExpressionNodeSchema.safeParse({ kind: 'op', op: '**', args: [] }).success).toBe(false);
  });
});

describe('placeholder parsing', () => {
  it('parses the simple {{ path }} form', () => {
    expect(parsePlaceholder('{{ flow.currency }}')).toEqual({
      kind: 'path',
      path: 'flow.currency',
    });
    expect(parsePlaceholder('{{ $auth.customerId }}')).toEqual({
      kind: 'path',
      path: '$auth.customerId',
    });
  });

  it('treats a non-placeholder string as a literal', () => {
    expect(parsePlaceholder('Investir')).toEqual({ kind: 'lit', value: 'Investir' });
  });

  it('toExpression validates AST objects and evaluateExpression accepts both forms', () => {
    expect(toExpression({ kind: 'lit', value: 1 })).toEqual({ kind: 'lit', value: 1 });
    expect(evaluateExpression('{{ flow.currency }}', scope)).toBe('BRL');
    expect(evaluateExpression('plain', scope)).toBe('plain');
  });
});
