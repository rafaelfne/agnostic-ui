import { createRequestContainer, resolveRequestContext } from '../../../infra';
import { BALANCE_CONTROLLER_TOKEN } from '../../../infra/di/generated/tokens';
import { internalError } from '../../../interface';

/**
 * `GET /api/balance` (manual, Parte 6.5.2). Canonical handler: resolve the
 * request context (400/401/403 short-circuit), build the per-request DI
 * container, resolve the controller and delegate. Unhandled errors → 500.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const resolved = await resolveRequestContext(request);
    if (resolved instanceof Response) {
      return resolved;
    }
    const requestContainer = createRequestContainer(resolved.ctx, resolved.accessToken);
    return await requestContainer.resolve(BALANCE_CONTROLLER_TOKEN).handle(request);
  } catch {
    return internalError();
  }
}
