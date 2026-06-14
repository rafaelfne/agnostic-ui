import { type ExpressionNode, ExpressionNodeSchema } from '../schemas/expression';

/** The simple SDUI placeholder form: `{{ a.b.c }}` (also `{{ $auth.customerId }}`). */
const SIMPLE_PLACEHOLDER = /^\{\{\s*([\w.$]+)\s*\}\}$/;

/**
 * Parses a config string into an AST node. A `{{ path }}` placeholder becomes a
 * `path` node (back-compat with the SDUI/spike form); anything else is a string
 * literal. Rich inline grammar is intentionally out of scope for Fase A — the
 * builder emits AST objects directly (handled by {@link toExpression}).
 */
export function parsePlaceholder(input: string): ExpressionNode {
  const match = SIMPLE_PLACEHOLDER.exec(input);
  if (match) return { kind: 'path', path: match[1]! };
  return { kind: 'lit', value: input };
}

/** Normalizes either form (string placeholder or AST object) into a validated AST node. */
export function toExpression(input: string | ExpressionNode): ExpressionNode {
  return typeof input === 'string' ? parsePlaceholder(input) : ExpressionNodeSchema.parse(input);
}
