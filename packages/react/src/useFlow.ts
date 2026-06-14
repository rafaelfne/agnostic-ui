import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import type {
  EmittedEvent,
  EngineErrorResult,
  FlowDefinitionInput,
  RunFlowDeps,
} from '@yukilabs/agnostic-ui-engine';
import { runFlow } from '@yukilabs/agnostic-ui-engine';
import { useEffect, useState } from 'react';

export type FlowState =
  | { status: 'loading' }
  | { status: 'success'; body: unknown; emitted: EmittedEvent[] }
  | { status: 'error'; error: EngineErrorResult };

export interface UseFlowInput {
  auth: ExecutionContext;
  request?: Record<string, unknown>;
}

/**
 * Runs a flow in the browser and tracks its state (loading → success/error) — the
 * builder's "simular". Re-runs when the flow id or input changes; pass a stable
 * `deps` (e.g. a memoized mock runner).
 */
export function useFlow(
  flow: FlowDefinitionInput,
  input: UseFlowInput,
  deps: RunFlowDeps,
): FlowState {
  const [state, setState] = useState<FlowState>({ status: 'loading' });
  const key = `${flow.id}:${JSON.stringify(input)}`;

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    void runFlow(flow, input, deps).then((result) => {
      if (!active) return;
      setState(
        result.ok
          ? { status: 'success', body: result.body, emitted: result.emitted }
          : { status: 'error', error: result.error },
      );
    });
    return () => {
      active = false;
    };
  }, [key]);

  return state;
}
