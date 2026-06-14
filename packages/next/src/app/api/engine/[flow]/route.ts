import { resolveRequestContext } from '../../../../infra';
import { getFlowLoader, runEngineFlow } from '../../../../infra/engine';
import { internalError } from '../../../../interface';

interface RouteContext {
  params: Promise<{ flow: string }>;
}

/**
 * `GET|POST /api/engine/{flow}` — runs a flow by id (useful for the builder /
 * preview). Resolves the request context, loads the published flow, and delegates
 * to the shared engine handler. Public paths are served by the catch-all route.
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

    return await runEngineFlow(request, flow, resolved.ctx, resolved.accessToken);
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
