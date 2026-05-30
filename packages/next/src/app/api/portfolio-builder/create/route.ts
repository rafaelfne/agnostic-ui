import { createRequestContainer, resolveRequestContext } from '../../../../infra';
import {
  PostPortfolioBuilderCreatePortfolioController,
  internalError,
} from '../../../../interface';

/** `POST /api/portfolio-builder/create` (manual, Parte 6.5.2). Canonical handler. */
export async function POST(request: Request): Promise<Response> {
  try {
    const resolved = resolveRequestContext(request);
    if (resolved instanceof Response) {
      return resolved;
    }
    const requestContainer = createRequestContainer(resolved.ctx, resolved.accessToken);
    return await requestContainer
      .resolve(PostPortfolioBuilderCreatePortfolioController)
      .handle(request);
  } catch {
    return internalError();
  }
}
