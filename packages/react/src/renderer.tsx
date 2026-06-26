import type { TemplateNode } from '@yukilabs/agnostic-ui-core';
import { type ReactNode, createElement } from 'react';

import { type Scope, bindProps } from './binding';
import { type ComponentContractRegistry, validateNodeProps } from './contracts';
import { defaultRegistry } from './primitives';
import type { ComponentRegistry } from './registry';

export interface SduiRendererProps {
  node: TemplateNode;
  registry?: ComponentRegistry;
  /** When provided, `{{ ... }}` placeholders in props are resolved against it. */
  scope?: Scope;
  /**
   * Opt-in (ADR 0006, G6): valida as props resolvidas contra o props schema do
   * contrato do tipo e emite `console.warn` por problema. Não-fatal — a tela nunca
   * quebra; sem `contracts`, nada muda.
   */
  contracts?: ComponentContractRegistry;
}

/** Recursively renders a node and its subtree to React. */
export function renderNode(
  node: TemplateNode,
  registry: ComponentRegistry,
  scope: Scope | undefined,
  key?: string | number,
  contracts?: ComponentContractRegistry,
): ReactNode {
  const rawChildren = node.children ?? node.body ?? [];
  const children = rawChildren.map((child, index) =>
    renderNode(child, registry, scope, index, contracts),
  );
  const props = scope !== undefined ? bindProps(node.props, scope) : (node.props ?? {});

  if (contracts !== undefined) {
    for (const issue of validateNodeProps(contracts, node.type, props)) {
      console.warn(`[sdui] ${node.type}: ${issue}`);
    }
  }

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
export function SduiRenderer({ node, registry, scope, contracts }: SduiRendererProps): ReactNode {
  return renderNode(node, registry ?? defaultRegistry, scope, undefined, contracts);
}
