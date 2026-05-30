import { createRequestContainer, resolveRequestContext } from '../../../../infra';
import { PostInvestAmountController, internalError } from '../../../../interface';

/** `POST /api/invest/amount` (manual, Parte 6.5.2). Canonical handler. */
export async function POST(request: Request): Promise<Response> {
  try {
    const resolved = resolveRequestContext(request);
    if (resolved instanceof Response) {
      return resolved;
    }
    const requestContainer = createRequestContainer(resolved.ctx, resolved.accessToken);
    return await requestContainer.resolve(PostInvestAmountController).handle(request);
  } catch {
    return internalError();
  }
}
