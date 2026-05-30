import { createRequestContainer, resolveRequestContext } from '../../../../infra';
import { GetPortfolioBuilderPreviewController, internalError } from '../../../../interface';

/** `GET /api/portfolio-builder/preview` (manual, Parte 6.5.2). Canonical handler. */
export async function GET(request: Request): Promise<Response> {
  try {
    const resolved = resolveRequestContext(request);
    if (resolved instanceof Response) {
      return resolved;
    }
    const requestContainer = createRequestContainer(resolved.ctx, resolved.accessToken);
    return await requestContainer.resolve(GetPortfolioBuilderPreviewController).handle(request);
  } catch {
    return internalError();
  }
}
