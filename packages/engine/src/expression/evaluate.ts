import type { Scope } from '../context/flowContext';
import { ExpressionError } from '../errors';
import type { ExpressionNode, ExpressionOperator } from '../schemas/expression';

import { CURATED_FUNCTIONS, DEFAULT_LOCALE, type EvalContext } from './functions';
import { toExpression } from './parse';
import { readPath } from './safePath';

/** Bound on AST nesting; expressions have no loops, so this caps total work. */
const MAX_DEPTH = 64;

/** Per-evaluation options. `locale` drives the formatting functions. */
export interface EvalOptions {
  readonly locale?: string;
}

const truthy = (value: unknown): boolean => Boolean(value);

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  throw new ExpressionError(`expected a finite number, got ${typeof value}`);
}

function argAt(args: ExpressionNode[], index: number): ExpressionNode {
  const node = args[index];
  if (node === undefined) throw new ExpressionError(`missing operand at index ${index}`);
  return node;
}

function evalOp(
  op: ExpressionOperator,
  args: ExpressionNode[],
  scope: Scope,
  ctx: EvalContext,
  depth: number,
): unknown {
  const ev = (node: ExpressionNode): unknown => evalNode(node, scope, ctx, depth + 1);

  if (op === '!') return !truthy(ev(argAt(args, 0)));
  if (op === '&&') {
    const left = ev(argAt(args, 0));
    return truthy(left) ? ev(argAt(args, 1)) : left;
  }
  if (op === '||') {
    const left = ev(argAt(args, 0));
    return truthy(left) ? left : ev(argAt(args, 1));
  }

  const a = ev(argAt(args, 0));
  const b = ev(argAt(args, 1));
  switch (op) {
    case '==':
      return a === b;
    case '!=':
      return a !== b;
    case '<':
      return asNumber(a) < asNumber(b);
    case '<=':
      return asNumber(a) <= asNumber(b);
    case '>':
      return asNumber(a) > asNumber(b);
    case '>=':
      return asNumber(a) >= asNumber(b);
    case '+':
      return asNumber(a) + asNumber(b);
    case '-':
      return asNumber(a) - asNumber(b);
    case '*':
      return asNumber(a) * asNumber(b);
    case '/': {
      const divisor = asNumber(b);
      if (divisor === 0) throw new ExpressionError('division by zero');
      return asNumber(a) / divisor;
    }
    case '%': {
      const divisor = asNumber(b);
      if (divisor === 0) throw new ExpressionError('modulo by zero');
      return asNumber(a) % divisor;
    }
    default:
      throw new ExpressionError(`unknown operator: ${String(op)}`);
  }
}

function evalNode(node: ExpressionNode, scope: Scope, ctx: EvalContext, depth: number): unknown {
  if (depth > MAX_DEPTH) throw new ExpressionError('expression nesting too deep');
  switch (node.kind) {
    case 'lit':
      return node.value;
    case 'path':
      return readPath(node.path, scope);
    case 'op':
      return evalOp(node.op, node.args, scope, ctx, depth);
    case 'cond':
      return truthy(evalNode(node.if, scope, ctx, depth + 1))
        ? evalNode(node.then, scope, ctx, depth + 1)
        : evalNode(node.else, scope, ctx, depth + 1);
    case 'call': {
      const fn = CURATED_FUNCTIONS[node.fn];
      const callArgs = node.args.map((arg) => evalNode(arg, scope, ctx, depth + 1));
      return fn(callArgs, ctx);
    }
  }
}

/** Evaluates a validated AST node against the scope. No `eval`, no globals, bounded. */
export function evaluate(node: ExpressionNode, scope: Scope, options: EvalOptions = {}): unknown {
  return evalNode(node, scope, { locale: options.locale ?? DEFAULT_LOCALE }, 0);
}

/** The evaluator the operators depend on: accepts a string placeholder or an AST node. */
export type ExpressionEvaluator = (
  input: string | ExpressionNode,
  scope: Scope,
  options?: EvalOptions,
) => unknown;

export const evaluateExpression: ExpressionEvaluator = (input, scope, options) =>
  evaluate(toExpression(input), scope, options);
