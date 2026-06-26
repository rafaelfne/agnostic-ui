import { resolveRequestContext } from '../../../../infra';
import { composeDocumentResponse } from '../../../../infra/document';
import { internalError } from '../../../../interface';

interface RouteContext {
  params: Promise<{ screen: string }>;
}

/**
 * Endpoint do **documento SDUI** por tela (ADR 0005 §5). Resolve o modo de
 * execução (sandbox vs live) + tenant + rate-limit reusando o mesmo
 * `resolveRequestContext` das rotas de dados (mapa erro→HTTP: 400/401/403/429),
 * depois compõe e devolve o documento. O renderer nativo consome via `SduiClient`.
 */
async function handle(request: Request, context: RouteContext): Promise<Response> {
  try {
    const resolved = await resolveRequestContext(request);
    if (resolved instanceof Response) {
      return resolved;
    }
    const { screen } = await context.params;
    return await composeDocumentResponse(request, screen, resolved.ctx, resolved.accessToken);
  } catch {
    return internalError();
  }
}

export function GET(request: Request, context: RouteContext): Promise<Response> {
  return handle(request, context);
}
