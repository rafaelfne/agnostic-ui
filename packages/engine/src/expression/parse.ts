import { ExpressionError } from '../errors';
import {
  EXPRESSION_FUNCTIONS,
  type ExpressionFunction,
  type ExpressionNode,
  ExpressionNodeSchema,
  type ExpressionOperator,
} from '../schemas/expression';

/** A `{{ ... }}` placeholder; the capture is the inner expression source. */
const PLACEHOLDER = /\{\{\s*([\s\S]*?)\s*\}\}/g;

const FUNCTION_NAMES = new Set<string>(EXPRESSION_FUNCTIONS);

/**
 * Parses a config string into an AST node, supporting the rich inline grammar of
 * the manual (operators, comparisons, conditionals `a ? b : c`, function calls,
 * and `path` access) — **without `eval`**. The grammar emits the same closed AST
 * the builder produces, so the operator/function vocabularies stay audited
 * (ADR 0002 §3).
 *
 * - A whole-string placeholder `"{{ expr }}"` parses to the expression's node,
 *   preserving its value type (number/bool/object pass through).
 * - Interpolation `"R$ {{ saldo }}"` becomes a `concat(...)` of literal text and
 *   the embedded expressions (string result).
 * - A string with no placeholder is a string literal.
 */
export function parsePlaceholder(input: string): ExpressionNode {
  const parts = splitInterpolation(input);
  if (parts.length === 1 && parts[0]!.kind === 'text') {
    return { kind: 'lit', value: parts[0]!.value };
  }
  const nodes = parts.map((part) =>
    part.kind === 'text'
      ? ({ kind: 'lit', value: part.value } as ExpressionNode)
      : parseExpression(part.value),
  );
  if (nodes.length === 1) return nodes[0]!;
  return { kind: 'call', fn: 'concat', args: nodes };
}

/** Normalizes either form (string placeholder or AST object) into a validated AST node. */
export function toExpression(input: string | ExpressionNode): ExpressionNode {
  return typeof input === 'string' ? parsePlaceholder(input) : ExpressionNodeSchema.parse(input);
}

type Part = { kind: 'text'; value: string } | { kind: 'expr'; value: string };

/** Splits a string into literal-text and placeholder-expression parts. */
function splitInterpolation(input: string): Part[] {
  const parts: Part[] = [];
  let last = 0;
  PLACEHOLDER.lastIndex = 0;
  for (let m = PLACEHOLDER.exec(input); m; m = PLACEHOLDER.exec(input)) {
    if (m.index > last) {
      parts.push({ kind: 'text', value: input.slice(last, m.index) });
    }
    parts.push({ kind: 'expr', value: m[1]! });
    last = m.index + m[0].length;
  }
  if (last < input.length) parts.push({ kind: 'text', value: input.slice(last) });
  if (parts.length === 0) parts.push({ kind: 'text', value: '' });
  return parts;
}

// ── Tokenizer ──────────────────────────────────────────────────────────────

type Token =
  | { type: 'num'; value: number }
  | { type: 'str'; value: string }
  | { type: 'path'; value: string }
  | { type: 'ident'; value: string }
  | { type: 'punct'; value: string };

const PUNCTUATORS = [
  '==',
  '!=',
  '<=',
  '>=',
  '&&',
  '||',
  '(',
  ')',
  ',',
  '?',
  ':',
  '!',
  '<',
  '>',
  '+',
  '-',
  '*',
  '/',
  '%',
];

function isIdentStart(c: string): boolean {
  return /[A-Za-z_$]/.test(c);
}
function isIdentPart(c: string): boolean {
  return /[A-Za-z0-9_$.]/.test(c);
}

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      let value = '';
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\' && j + 1 < src.length) {
          value += src[j + 1];
          j += 2;
        } else {
          value += src[j];
          j += 1;
        }
      }
      if (j >= src.length) throw new ExpressionError(`unterminated string in: ${src}`);
      tokens.push({ type: 'str', value });
      i = j + 1;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j]!)) j += 1;
      const text = src.slice(i, j);
      const value = Number(text);
      if (!Number.isFinite(value)) throw new ExpressionError(`invalid number: ${text}`);
      tokens.push({ type: 'num', value });
      i = j;
      continue;
    }
    if (isIdentStart(c)) {
      let j = i + 1;
      while (j < src.length && isIdentPart(src[j]!)) j += 1;
      const value = src.slice(i, j);
      tokens.push({ type: value.includes('.') ? 'path' : 'ident', value });
      i = j;
      continue;
    }
    const punct = PUNCTUATORS.find((p) => src.startsWith(p, i));
    if (!punct) throw new ExpressionError(`unexpected character '${c}' in: ${src}`);
    tokens.push({ type: 'punct', value: punct });
    i += punct.length;
  }
  return tokens;
}

// ── Parser (precedence climbing) ─────────────────────────────────────────────

const BINARY_TIERS: ExpressionOperator[][] = [
  ['||'],
  ['&&'],
  ['==', '!='],
  ['<', '<=', '>', '>='],
  ['+', '-'],
  ['*', '/', '%'],
];

class Parser {
  private pos = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly src: string,
  ) {}

  parse(): ExpressionNode {
    const node = this.ternary();
    if (this.pos < this.tokens.length) {
      throw new ExpressionError(`unexpected trailing input in: ${this.src}`);
    }
    return node;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private eatPunct(value: string): void {
    const t = this.peek();
    if (!t || t.type !== 'punct' || t.value !== value) {
      throw new ExpressionError(`expected '${value}' in: ${this.src}`);
    }
    this.pos += 1;
  }

  private matchPunct(value: string): boolean {
    const t = this.peek();
    if (t && t.type === 'punct' && t.value === value) {
      this.pos += 1;
      return true;
    }
    return false;
  }

  private ternary(): ExpressionNode {
    const condition = this.binary(0);
    if (this.matchPunct('?')) {
      const thenNode = this.ternary();
      this.eatPunct(':');
      const elseNode = this.ternary();
      return { kind: 'cond', if: condition, then: thenNode, else: elseNode };
    }
    return condition;
  }

  private binary(tier: number): ExpressionNode {
    if (tier >= BINARY_TIERS.length) return this.unary();
    let left = this.binary(tier + 1);
    for (;;) {
      const t = this.peek();
      const op =
        t && t.type === 'punct' && (BINARY_TIERS[tier]! as string[]).includes(t.value)
          ? (t.value as ExpressionOperator)
          : undefined;
      if (!op) return left;
      this.pos += 1;
      const right = this.binary(tier + 1);
      left = { kind: 'op', op, args: [left, right] };
    }
  }

  private unary(): ExpressionNode {
    if (this.matchPunct('!')) return { kind: 'op', op: '!', args: [this.unary()] };
    if (this.matchPunct('-')) {
      const operand = this.unary();
      if (operand.kind === 'lit' && typeof operand.value === 'number') {
        return { kind: 'lit', value: -operand.value };
      }
      return { kind: 'op', op: '-', args: [{ kind: 'lit', value: 0 }, operand] };
    }
    return this.primary();
  }

  private primary(): ExpressionNode {
    const t = this.peek();
    if (!t) throw new ExpressionError(`unexpected end of expression in: ${this.src}`);

    if (t.type === 'num') {
      this.pos += 1;
      return { kind: 'lit', value: t.value };
    }
    if (t.type === 'str') {
      this.pos += 1;
      return { kind: 'lit', value: t.value };
    }
    if (t.type === 'punct' && t.value === '(') {
      this.pos += 1;
      const node = this.ternary();
      this.eatPunct(')');
      return node;
    }
    if (t.type === 'ident' || t.type === 'path') {
      this.pos += 1;
      if (t.type === 'ident') {
        if (t.value === 'true') return { kind: 'lit', value: true };
        if (t.value === 'false') return { kind: 'lit', value: false };
        if (t.value === 'null') return { kind: 'lit', value: null };
        if (this.peek()?.type === 'punct' && this.peek()?.value === '(') {
          return this.call(t.value);
        }
      }
      return { kind: 'path', path: t.value };
    }
    throw new ExpressionError(`unexpected token '${tokenText(t)}' in: ${this.src}`);
  }

  private call(name: string): ExpressionNode {
    if (!FUNCTION_NAMES.has(name)) {
      throw new ExpressionError(`unknown function '${name}' in: ${this.src}`);
    }
    this.eatPunct('(');
    const args: ExpressionNode[] = [];
    if (!this.matchPunct(')')) {
      do {
        args.push(this.ternary());
      } while (this.matchPunct(','));
      this.eatPunct(')');
    }
    return { kind: 'call', fn: name as ExpressionFunction, args };
  }
}

function tokenText(t: Token): string {
  return t.type === 'num' ? String(t.value) : String(t.value);
}

/** Parses a single expression source (the inside of `{{ ... }}`) into an AST. */
export function parseExpression(src: string): ExpressionNode {
  const tokens = tokenize(src);
  if (tokens.length === 0) throw new ExpressionError(`empty expression in: ${src}`);
  return new Parser(tokens, src).parse();
}
