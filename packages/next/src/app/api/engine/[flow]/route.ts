import { runFlow } from '@yukilabs/agnostic-ui-engine';

import { ICORE_GATEWAY_TOKEN } from '../../../../application/ports';
import { createRequestContainer, resolveRequestContext } from '../../../../infra';
import { EngineCoreIntegrationRunner, getFlow } from '../../../../infra/engine';
import { engineResultToResponse, internalError } from '../../../../interface';

/**
 * `GET /api/engine/{flow}` — the runtime host (ADR 0002 §8). Resolves the request
 * context (400/401/403/429 short-circuit), looks up the published flow by id,
 * builds the per-request gateway, and runs the flow through the engine. Served
 * alongside the hardcoded routes so parity can be asserted before migration.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ flow: string }> },
): Promise<Response> {
  try {
    const resolved = await resolveRequestContext(request);
    if (resolved instanceof Response) {
      return resolved;
    }

    const { flow: flowId } = await params;
    const flow = getFlow(flowId);
    if (flow === undefined) {
      return Response.json({ error: 'unknown_flow' }, { status: 404 });
    }

    const requestContainer = createRequestContainer(resolved.ctx, resolved.accessToken);
    const gateway = requestContainer.resolve(ICORE_GATEWAY_TOKEN);
    const result = await runFlow(
      flow,
      { auth: resolved.ctx },
      { integrationRunner: new EngineCoreIntegrationRunner(gateway) },
    );
    return engineResultToResponse(result);
  } catch {
    return internalError();
  }
}
