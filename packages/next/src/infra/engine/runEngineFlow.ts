import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import { type FlowDefinitionInput, runFlow } from '@yukilabs/agnostic-ui-engine';

import { ICORE_GATEWAY_TOKEN } from '../../application/ports';
import { engineResultToResponse } from '../../interface/http/engineResponse';
import { resolveSchema } from '../../interface/http/engineSchemas';
import { readJsonBody } from '../../interface/http/readJsonBody';
import { createRequestContainer } from '../di/createRequestContainer';

import { EngineCoreIntegrationRunner } from './EngineCoreIntegrationRunner';

/**
 * Runs an already-resolved flow through the engine for an HTTP request: extracts
 * client input (query string + JSON body), forces `customerId` from the execution
 * context (never the client), binds the per-request gateway, and maps the result to
 * a Response. Shared by the by-id route (`/api/engine/[flow]`) and the catch-all
 * (`/api/[...path]`). Imports specific interface modules (not the `http` barrel) to
 * stay out of the DI boot cycle.
 */
export async function runEngineFlow(
  request: Request,
  flow: FlowDefinitionInput,
  ctx: ExecutionContext,
  accessToken: string,
): Promise<Response> {
  const query = Object.fromEntries(new URL(request.url).searchParams.entries());
  const body = request.method === 'POST' ? await readJsonBody(request) : {};
  const requestInput = { ...query, ...body, customerId: ctx.customerId };

  const container = createRequestContainer(ctx, accessToken);
  const gateway = container.resolve(ICORE_GATEWAY_TOKEN);
  const result = await runFlow(
    flow,
    { auth: ctx, request: requestInput },
    { integrationRunner: new EngineCoreIntegrationRunner(gateway), schemas: resolveSchema },
  );
  return engineResultToResponse(result);
}
