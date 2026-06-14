import { resolveRequestContext } from '../../../infra';
import { getFlowLoader, resolveFlowByTrigger, runEngineFlow } from '../../../infra/engine';
import { internalError } from '../../../interface';

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

/**
 * Catch-all runtime host (ADR 0002 §8) — the BFF as pure host. Resolves the flow
 * whose HTTP trigger matches the request method + path, prefers its published
 * version from the store (fallback to the in-code flow), and runs it through the
 * engine. More specific routes (`/api/health`, `/api/engine/[flow]`) take
 * precedence over this catch-all.
 */
async function handle(request: Request, context: RouteContext): Promise<Response> {
  try {
    const resolved = await resolveRequestContext(request);
    if (resolved instanceof Response) {
      return resolved;
    }

    const { path } = await context.params;
    const fullPath = `/api/${path.join('/')}`;
    const matched = resolveFlowByTrigger(request.method, fullPath);
    if (matched === undefined) {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }

    const flow = (await getFlowLoader().load(resolved.ctx.tenantId, matched.id)) ?? matched;
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
