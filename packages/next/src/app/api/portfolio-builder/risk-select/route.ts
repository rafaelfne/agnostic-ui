import { createRequestContainer, resolveRequestContext } from '../../../../infra';
import { GetPortfolioBuilderRiskSelectController, internalError } from '../../../../interface';

/** `GET /api/portfolio-builder/risk-select` (manual, Parte 6.5.2). Canonical handler. */
export async function GET(request: Request): Promise<Response> {
  try {
    const resolved = resolveRequestContext(request);
    if (resolved instanceof Response) {
      return resolved;
    }
    const requestContainer = createRequestContainer(resolved.ctx, resolved.accessToken);
    return await requestContainer.resolve(GetPortfolioBuilderRiskSelectController).handle(request);
  } catch {
    return internalError();
  }
}
