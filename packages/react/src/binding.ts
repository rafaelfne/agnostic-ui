import type { TemplateNode } from '@yukilabs/agnostic-ui-core';
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

/**
 * Resolve uma árvore de `TemplateNode` contra o scope usando o binding do **React**
 * (`bindValue`/`evaluateExpression`) — espelho de `resolveTemplate` do engine: liga
 * `{{ ... }}` nas props e expande `dataBind` (um filho por item, com `$item`/`$index`).
 * É a definição "template + scope → árvore" medida contra o corpus de conformância,
 * provando que o binding do React concorda com a spec (o renderer usa `bindProps` por
 * nó; o `dataBind` é normalmente resolvido no servidor, mas a lib resolve a árvore toda).
 */
export function resolveTree(node: TemplateNode, scope: Scope): TemplateNode {
  const result: TemplateNode = { type: node.type };
  if (node.id !== undefined) result.id = node.id;
  if (node.props !== undefined) {
    result.props = bindValue(node.props, scope) as Record<string, unknown>;
  }
  if (node.body !== undefined) result.body = resolveChildren(node.body, scope);
  if (node.children !== undefined) result.children = resolveChildren(node.children, scope);
  return result;
}

function resolveChildren(children: TemplateNode[], scope: Scope): TemplateNode[] {
  const out: TemplateNode[] = [];
  for (const child of children) {
    if (child.dataBind === undefined) {
      out.push(resolveTree(child, scope));
      continue;
    }
    const items = bindValue(child.dataBind, scope);
    if (!Array.isArray(items)) continue;
    items.forEach((item, index) => {
      out.push(resolveTree(child, { ...scope, $item: item, $index: index }));
    });
  }
  return out;
}
