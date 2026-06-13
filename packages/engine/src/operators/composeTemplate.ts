import type { TemplateNode } from '@yukilabs/agnostic-ui-core';

import { type Scope, buildScope, writeOutput } from '../context';
import type { ExpressionEvaluator } from '../expression';
import type { StepDef } from '../schemas';

import type { OperatorHandler } from './operator';

type ComposeTemplateStep = Extract<StepDef, { op: 'compose-template' }>;

/** Resolves every expression inside a prop value, recursing through arrays/objects. */
function resolveValue(value: unknown, evaluate: ExpressionEvaluator, scope: Scope): unknown {
  if (typeof value === 'string') return evaluate(value, scope);
  if (Array.isArray(value)) return value.map((item) => resolveValue(item, evaluate, scope));
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = resolveValue(item, evaluate, scope);
    }
    return out;
  }
  return value;
}

/** Walks the template, binding props from data while preserving type/id/structure. */
function composeNode(
  node: TemplateNode,
  evaluate: ExpressionEvaluator,
  scope: Scope,
): TemplateNode {
  const result: TemplateNode = { type: node.type };
  if (node.id !== undefined) result.id = node.id;
  if (node.props !== undefined) {
    result.props = resolveValue(node.props, evaluate, scope) as Record<string, unknown>;
  }
  if (node.body !== undefined) {
    result.body = node.body.map((child) => composeNode(child, evaluate, scope));
  }
  if (node.children !== undefined) {
    result.children = node.children.map((child) => composeNode(child, evaluate, scope));
  }
  return result;
}

/**
 * Builds a data-bound SDUI tree from `template`, resolving `{{ ... }}` placeholders
 * in props against the flow's data, and stores it under `as`. New capability: there
 * is no server-side SDUI composition in the BFF today.
 */
export const composeTemplateOperator: OperatorHandler<ComposeTemplateStep> = (
  step,
  { ctx, services },
) => {
  const scope = buildScope(ctx);
  writeOutput(ctx, step.as, composeNode(step.template, services.evaluate, scope));
};
