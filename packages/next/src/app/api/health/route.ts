import {
  createRequestContainer,
  EXECUTION_CONTEXT_TOKEN,
  resolveRequestContext,
} from '../../../infra';

/**
 * Diagnostic route (non-business, Parte 6.5). Exercises the F1 foundation
 * end-to-end: resolve the request context (bearer + tenant + execution mode,
 * with the sandbox cross-check) and build a per-request DI container, then echo
 * the resolved mode/tenant/customer. Error paths already return a Response with
 * the right HTTP status, so there is no business logic here.
 */
export async function GET(request: Request): Promise<Response> {
  const resolved = await resolveRequestContext(request);
  if (resolved instanceof Response) {
    return resolved;
  }

  const requestContainer = createRequestContainer(resolved.ctx, resolved.accessToken);
  const ctx = requestContainer.resolve(EXECUTION_CONTEXT_TOKEN);

  return Response.json({
    mode: ctx.mode,
    tenantId: ctx.tenantId,
    customerId: ctx.customerId,
  });
}
