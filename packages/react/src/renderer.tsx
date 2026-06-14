import type { TemplateNode } from '@yukilabs/agnostic-ui-core';
import { type ReactNode, createElement } from 'react';

import { type Scope, bindProps } from './binding';
import { defaultRegistry } from './primitives';
import type { ComponentRegistry } from './registry';

export interface SduiRendererProps {
  node: TemplateNode;
  registry?: ComponentRegistry;
  /** When provided, `{{ ... }}` placeholders in props are resolved against it. */
  scope?: Scope;
}

/** Recursively renders a node and its subtree to React. */
export function renderNode(
  node: TemplateNode,
  registry: ComponentRegistry,
  scope: Scope | undefined,
  key?: string | number,
): ReactNode {
  const rawChildren = node.children ?? node.body ?? [];
  const children = rawChildren.map((child, index) => renderNode(child, registry, scope, index));
  const props = scope !== undefined ? bindProps(node.props, scope) : (node.props ?? {});

  const Component = registry[node.type];
  if (Component === undefined) {
    // Unknown type → a marker that preserves the subtree rather than dropping it.
    return createElement('div', { key, 'data-sdui-unknown': node.type }, children);
  }
  return createElement(Component, { key, node, props, children });
}

/**
 * Renders an SDUI `TemplateNode` tree to React through the component registry. The
 * tree is usually already data-bound by the server (`compose-template`); pass a
 * `scope` to resolve any remaining `{{ ... }}` placeholders at render time.
 */
export function SduiRenderer({ node, registry, scope }: SduiRendererProps): ReactNode {
  return renderNode(node, registry ?? defaultRegistry, scope);
}
