import { createRequestContainer, resolveRequestContext } from '../../../../infra';
import { GET_INVESTMENTS_PRODUCTS_SUMMARY_CONTROLLER_TOKEN } from '../../../../infra/di/generated/tokens';
import { internalError } from '../../../../interface';

/** `GET /api/investments/products-summary` (manual, Parte 6.5.2). Canonical handler. */
export async function GET(request: Request): Promise<Response> {
  try {
    const resolved = await resolveRequestContext(request);
    if (resolved instanceof Response) {
      return resolved;
    }
    const requestContainer = createRequestContainer(resolved.ctx, resolved.accessToken);
    return await requestContainer
      .resolve(GET_INVESTMENTS_PRODUCTS_SUMMARY_CONTROLLER_TOKEN)
      .handle(request);
  } catch {
    return internalError();
  }
}
