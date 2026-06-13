import type { FlowDefinitionInput } from '@yukilabs/agnostic-ui-engine';

import { getBalanceFlow } from './flows/getBalanceFlow';

/**
 * In-code registry of published flows — a stand-in for the config store (FB.2),
 * keyed by flow id. The engine route resolves a flow from the URL path segment.
 */
const FLOWS: Record<string, FlowDefinitionInput> = {
  [getBalanceFlow.id]: getBalanceFlow,
};

export function getFlow(id: string): FlowDefinitionInput | undefined {
  return FLOWS[id];
}
