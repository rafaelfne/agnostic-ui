import { createRequestContainer, resolveRequestContext } from '../../../../infra';
import { GET_INVEST_REVIEW_CONTROLLER_TOKEN } from '../../../../infra/di/generated/tokens';
import { internalError } from '../../../../interface';

/** `GET /api/invest/review` (manual, Parte 6.5.2). Canonical handler. */
export async function GET(request: Request): Promise<Response> {
  try {
    const resolved = resolveRequestContext(request);
    if (resolved instanceof Response) {
      return resolved;
    }
    const requestContainer = createRequestContainer(resolved.ctx, resolved.accessToken);
    return await requestContainer.resolve(GET_INVEST_REVIEW_CONTROLLER_TOKEN).handle(request);
  } catch {
    return internalError();
  }
}
