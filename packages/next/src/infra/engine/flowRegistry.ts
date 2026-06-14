import type { FlowDefinitionInput } from '@yukilabs/agnostic-ui-engine';

import { customerDataFlows } from './flows/dataFlows';
import { getBalanceFlow } from './flows/getBalanceFlow';
import { queryBodyFlows } from './flows/queryBodyFlows';

/**
 * In-code registry of published flows — a stand-in for the config store (FB.2),
 * keyed by flow id and by HTTP trigger (method + path). The catch-all route
 * resolves the flow from the request path/method; `/api/engine/[flow]` resolves by
 * id. The financial vertical's use cases live here as config (Fase C).
 */
const ALL_FLOWS: readonly FlowDefinitionInput[] = [
  getBalanceFlow,
  ...customerDataFlows,
  ...queryBodyFlows,
];

const FLOWS_BY_ID: Record<string, FlowDefinitionInput> = Object.fromEntries(
  ALL_FLOWS.map((flow) => [flow.id, flow]),
);

const FLOWS_BY_TRIGGER = new Map<string, FlowDefinitionInput>();
for (const flow of ALL_FLOWS) {
  if (flow.trigger?.kind === 'http') {
    FLOWS_BY_TRIGGER.set(`${flow.trigger.method} ${flow.trigger.path}`, flow);
  }
}

export function getFlow(id: string): FlowDefinitionInput | undefined {
  return FLOWS_BY_ID[id];
}

/** Resolves the flow whose HTTP trigger matches the request method + path. */
export function resolveFlowByTrigger(
  method: string,
  path: string,
): FlowDefinitionInput | undefined {
  return FLOWS_BY_TRIGGER.get(`${method} ${path}`);
}
