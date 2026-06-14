import type { TemplateNode } from '@yukilabs/agnostic-ui-core';
import type {
  EngineErrorResult,
  FlowDefinitionInput,
  RunFlowDeps,
} from '@yukilabs/agnostic-ui-engine';
import type { ReactNode } from 'react';

import type { ComponentRegistry } from './registry';
import { SduiRenderer } from './renderer';
import { type UseFlowInput, useFlow } from './useFlow';

export interface FlowScreenProps {
  flow: FlowDefinitionInput;
  input: UseFlowInput;
  deps: RunFlowDeps;
  registry?: ComponentRegistry;
  loading?: ReactNode;
  renderError?: (error: EngineErrorResult) => ReactNode;
}

/**
 * Runs a screen flow and renders its composed `TemplateNode` output via
 * {@link SduiRenderer}. Shows `loading` while running and `renderError` on failure.
 * The end-to-end of the builder preview: config → engine → SDUI on screen.
 */
export function FlowScreen({
  flow,
  input,
  deps,
  registry,
  loading,
  renderError,
}: FlowScreenProps): ReactNode {
  const state = useFlow(flow, input, deps);
  if (state.status === 'loading') return loading ?? null;
  if (state.status === 'error') return renderError ? renderError(state.error) : null;
  return <SduiRenderer node={state.body as TemplateNode} registry={registry} />;
}
