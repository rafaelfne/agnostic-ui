import { runFlow } from '@yukilabs/agnostic-ui-engine';

import { ICORE_GATEWAY_TOKEN } from '../../../../application/ports';
import { createRequestContainer, resolveRequestContext } from '../../../../infra';
import { EngineCoreIntegrationRunner, getFlowLoader } from '../../../../infra/engine';
import {
  engineResultToResponse,
  internalError,
  readJsonBody,
  resolveSchema,
} from '../../../../interface';

interface RouteContext {
  params: Promise<{ flow: string }>;
}

/**
 * `GET|POST /api/engine/{flow}` — the runtime host (ADR 0002 §8). Resolves the
 * request context (400/401/403/429 short-circuit), loads the published flow, and
 * runs it through the engine. The client input (query string + JSON body) becomes
 * the flow's `request`, with `customerId` forced from the execution context (never
 * the client). The host registers the schemas the `validate` operator references.
 * Served alongside the hardcoded routes so parity can be asserted before migration.
 */
async function handle(request: Request, context: RouteContext): Promise<Response> {
  try {
    const resolved = await resolveRequestContext(request);
    if (resolved instanceof Response) {
      return resolved;
    }

    const { flow: flowId } = await context.params;
    const flow = await getFlowLoader().load(resolved.ctx.tenantId, flowId);
    if (flow === null) {
      return Response.json({ error: 'unknown_flow' }, { status: 404 });
    }

    const query = Object.fromEntries(new URL(request.url).searchParams.entries());
    const body = request.method === 'POST' ? await readJsonBody(request) : {};
    const requestInput = { ...query, ...body, customerId: resolved.ctx.customerId };

    const requestContainer = createRequestContainer(resolved.ctx, resolved.accessToken);
    const gateway = requestContainer.resolve(ICORE_GATEWAY_TOKEN);
    const result = await runFlow(
      flow,
      { auth: resolved.ctx, request: requestInput },
      { integrationRunner: new EngineCoreIntegrationRunner(gateway), schemas: resolveSchema },
    );
    return engineResultToResponse(result);
  } catch {
    return internalError();
  }
}

export function GET(request: Request, context: RouteContext): Promise<Response> {
  return handle(request, context);
}

export function POST(request: Request, context: RouteContext): Promise<Response> {
  return handle(request, context);
}
