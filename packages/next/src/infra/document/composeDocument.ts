import { type ExecutionContext, SduiDocumentSchema } from '@yukilabs/agnostic-ui-core';

import { engineResultToResponse } from '../../interface/http/engineResponse';
import { getFlow } from '../engine/flowRegistry';
import { runFlowForRequest } from '../engine/runEngineFlow';

import { getScreen } from './screens';

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : { value };
}

/**
 * Compõe o documento SDUI de uma tela (ADR 0005 §5): roda o `dataFlow` da tela
 * pelo engine e empacota `{ screenId, version, root, context }`, validando contra
 * o schema do `core`. Reusa o mapa erro→HTTP do host: falha do flow vira status
 * (o `SduiClient` mapeia para o template de exceção). Auth/tenant/mode já foram
 * resolvidos pela rota antes de chegar aqui.
 */
export async function composeDocumentResponse(
  request: Request,
  screenId: string,
  ctx: ExecutionContext,
  accessToken: string,
): Promise<Response> {
  const screen = getScreen(screenId);
  if (screen === undefined) {
    return Response.json({ error: 'unknown_screen' }, { status: 404 });
  }
  const flow = getFlow(screen.dataFlow);
  if (flow === undefined) {
    return Response.json({ error: 'unknown_flow' }, { status: 500 });
  }

  const result = await runFlowForRequest(request, flow, ctx, accessToken);
  if (!result.ok) {
    return engineResultToResponse(result);
  }

  const document = SduiDocumentSchema.parse({
    screenId,
    version: screen.version,
    root: screen.root,
    context: asRecord(result.body),
  });
  return Response.json(document, { status: 200 });
}
