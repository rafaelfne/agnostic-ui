import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { extractBearerToken } from './extractBearerToken';
import { resolveTenant } from './resolveTenant';
import { resolveExecutionMode } from './resolveExecutionMode';
import { SandboxResolutionError, errorResponse } from './httpError';
import { enforceRateLimit } from './rateLimit';

export interface ResolvedRequestContext {
  ctx: ExecutionContext;
  accessToken: string;
  requestTenantId: string;
}

/**
 * Per-route helper (manual, Parte 6.5.1). Combines three steps: extract the
 * bearer token, read the requested tenant, and resolve the execution mode —
 * then applies the sandbox-only cross-check (marker tenant must equal the
 * `x-tenant-id` header, otherwise `tenant_mismatch` 403). In live mode the JWT
 * is the source of truth and there is no cross-check. Finally, once the subject
 * is known, the per-subject rate limit is enforced (429 when exceeded; a no-op
 * when Upstash is unconfigured).
 *
 * Returns the resolved context, or a Response (400/401/403/429) on failure.
 */
export async function resolveRequestContext(
  request: Request,
): Promise<ResolvedRequestContext | Response> {
  const accessToken = extractBearerToken(request);
  const requestTenantId = resolveTenant(request);

  let ctx: ExecutionContext;
  try {
    ctx = await resolveExecutionMode(accessToken);
  } catch (error) {
    if (error instanceof SandboxResolutionError) {
      return errorResponse(error.code);
    }
    throw error;
  }

  if (ctx.mode === 'sandbox' && ctx.tenantId !== requestTenantId) {
    return errorResponse('tenant_mismatch');
  }

  const limited = await enforceRateLimit(request, ctx);
  if (limited) {
    return limited;
  }

  return { ctx, accessToken, requestTenantId };
}
