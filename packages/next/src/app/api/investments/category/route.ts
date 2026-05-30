import { createRequestContainer, resolveRequestContext } from '../../../../infra';
import { GetInvestmentsCategoryController, internalError } from '../../../../interface';

/** `GET /api/investments/category` (manual, Parte 6.5.2). Canonical handler. */
export async function GET(request: Request): Promise<Response> {
  try {
    const resolved = resolveRequestContext(request);
    if (resolved instanceof Response) {
      return resolved;
    }
    const requestContainer = createRequestContainer(resolved.ctx, resolved.accessToken);
    return await requestContainer.resolve(GetInvestmentsCategoryController).handle(request);
  } catch {
    return internalError();
  }
}
