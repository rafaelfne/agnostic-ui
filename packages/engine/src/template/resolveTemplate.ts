import type { TemplateNode } from '@yukilabs/agnostic-ui-core';

import type { Scope } from '../context/flowContext';
import type { EvalOptions, ExpressionEvaluator } from '../expression';

/** Resolves every expression inside a prop value, recursing through arrays/objects. */
function resolveValue(
  value: unknown,
  evaluate: ExpressionEvaluator,
  scope: Scope,
  options: EvalOptions | undefined,
): unknown {
  if (typeof value === 'string') return evaluate(value, scope, options);
  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, evaluate, scope, options));
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = resolveValue(item, evaluate, scope, options);
    }
    return out;
  }
  return value;
}

/**
 * Walks a TemplateNode tree, binding `{{ ... }}` placeholders in props against the
 * scope while preserving type/id/structure. The single definition of
 * "template + scope → resolved tree", shared by the `compose-template` operator
 * and the conformance runner so both renderers measure against one resolution
 * (ADR 0005 §2). No `eval` — delegates to the curated expression evaluator.
 */
export function resolveTemplate(
  node: TemplateNode,
  scope: Scope,
  evaluate: ExpressionEvaluator,
  options?: EvalOptions,
): TemplateNode {
  const result: TemplateNode = { type: node.type };
  if (node.id !== undefined) result.id = node.id;
  if (node.props !== undefined) {
    result.props = resolveValue(node.props, evaluate, scope, options) as Record<string, unknown>;
  }
  if (node.body !== undefined) {
    result.body = node.body.map((child) => resolveTemplate(child, scope, evaluate, options));
  }
  if (node.children !== undefined) {
    result.children = node.children.map((child) =>
      resolveTemplate(child, scope, evaluate, options),
    );
  }
  return result;
}
