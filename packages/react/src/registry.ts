import type { TemplateNode } from '@yukilabs/agnostic-ui-core';
import type { ReactNode } from 'react';

/** Props a registered SDUI component receives from the renderer. */
export interface SduiComponentProps {
  /** The raw node (type/id/props/children). */
  node: TemplateNode;
  /** The node's props, with `{{ ... }}` placeholders resolved when a scope is given. */
  props: Record<string, unknown>;
  /** The already-rendered child nodes. */
  children: ReactNode;
}

export type SduiComponent = (props: SduiComponentProps) => ReactNode;

/** Maps a `TemplateNode.type` to the React component that renders it. */
export type ComponentRegistry = Record<string, SduiComponent>;

/** Merges custom components over the base registry (custom wins on conflict). */
export function createRegistry(
  base: ComponentRegistry,
  custom: ComponentRegistry = {},
): ComponentRegistry {
  return { ...base, ...custom };
}
