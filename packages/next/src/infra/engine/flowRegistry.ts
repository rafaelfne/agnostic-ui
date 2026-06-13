import type { FlowDefinitionInput } from '@yukilabs/agnostic-ui-engine';

import { customerDataFlows } from './flows/dataFlows';
import { getBalanceFlow } from './flows/getBalanceFlow';
import { queryBodyFlows } from './flows/queryBodyFlows';

/**
 * In-code registry of published flows — a stand-in for the config store (FB.2),
 * keyed by flow id. The engine route resolves a flow from the URL path segment.
 * The financial vertical's GET data flows live here as config (Fase C).
 */
const FLOWS: Record<string, FlowDefinitionInput> = Object.fromEntries(
  [getBalanceFlow, ...customerDataFlows, ...queryBodyFlows].map((flow) => [flow.id, flow]),
);

export function getFlow(id: string): FlowDefinitionInput | undefined {
  return FLOWS[id];
}
