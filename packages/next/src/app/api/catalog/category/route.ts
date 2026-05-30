import { createRequestContainer, resolveRequestContext } from '../../../../infra';
import { GetCatalogCategoryController, internalError } from '../../../../interface';

/** `GET /api/catalog/category` (manual, Parte 6.5.2). Canonical handler. */
export async function GET(request: Request): Promise<Response> {
  try {
    const resolved = resolveRequestContext(request);
    if (resolved instanceof Response) {
      return resolved;
    }
    const requestContainer = createRequestContainer(resolved.ctx, resolved.accessToken);
    return await requestContainer.resolve(GetCatalogCategoryController).handle(request);
  } catch {
    return internalError();
  }
}
