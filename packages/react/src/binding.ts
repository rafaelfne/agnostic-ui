import { evaluateExpression } from '@yukilabs/agnostic-ui-engine';

export type Scope = Record<string, unknown>;

/**
 * Resolves `{{ ... }}` placeholders in a value against the scope, recursing into
 * arrays and objects. Reuses the engine's safe evaluator (no `eval`). Idempotent
 * on already-resolved values (a literal string evaluates to itself), so it is safe
 * to run on a server-composed tree.
 */
export function bindValue(value: unknown, scope: Scope): unknown {
  if (typeof value === 'string') return evaluateExpression(value, scope);
  if (Array.isArray(value)) return value.map((item) => bindValue(item, scope));
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = bindValue(item, scope);
    return out;
  }
  return value;
}

export function bindProps(
  props: Record<string, unknown> | undefined,
  scope: Scope,
): Record<string, unknown> {
  if (props === undefined) return {};
  return bindValue(props, scope) as Record<string, unknown>;
}
