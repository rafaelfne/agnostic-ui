import { createRequestContainer, resolveRequestContext } from '../../../../infra';
import { POST_PORTFOLIO_BUILDER_CREATE_PORTFOLIO_CONTROLLER_TOKEN } from '../../../../infra/di/generated/tokens';
import { internalError } from '../../../../interface';

/** `POST /api/portfolio-builder/create` (manual, Parte 6.5.2). Canonical handler. */
export async function POST(request: Request): Promise<Response> {
  try {
    const resolved = await resolveRequestContext(request);
    if (resolved instanceof Response) {
      return resolved;
    }
    const requestContainer = createRequestContainer(resolved.ctx, resolved.accessToken);
    return await requestContainer
      .resolve(POST_PORTFOLIO_BUILDER_CREATE_PORTFOLIO_CONTROLLER_TOKEN)
      .handle(request);
  } catch {
    return internalError();
  }
}
