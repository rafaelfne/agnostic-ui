import { getAuthz } from '../../../../infra/authz';
import { getConfigStore } from '../../../../infra/store';
import { internalError } from '../../../../interface';
import { handleBuilderRequest } from '../../../../interface/builder';

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

/**
 * Builder admin API (ADR 0004 §2). Static `builder` segment, so this takes
 * precedence over the runtime catch-all (`/api/[...path]`). Authz, tenant scoping
 * and store access live in `handleBuilderRequest`; the route only unwraps params,
 * wires the production singletons, and contains failures.
 */
async function handle(request: Request, context: RouteContext): Promise<Response> {
  try {
    const { path } = await context.params;
    return await handleBuilderRequest(request, path, {
      store: getConfigStore(),
      authz: getAuthz(),
    });
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
