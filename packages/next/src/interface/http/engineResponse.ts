import type { EngineResult } from '@yukilabs/agnostic-ui-engine';

import { internalError, mockGatewayError } from './secureError';

/**
 * Maps an engine {@link EngineResult} to an HTTP Response — the host's
 * error-kind → status table (ADR 0002). Reuses the existing secureError shapes so
 * an engine-served route answers identically to its hardcoded counterpart: this is
 * where the engine's kind-`validation` becomes the real **422** (not the spike's 400).
 */
export function engineResultToResponse(result: EngineResult): Response {
  if (result.ok) {
    return Response.json(result.body, { status: 200 });
  }

  const { error } = result;
  if (error.kind === 'validation') {
    const missing = (error.details as { missing?: string[] } | undefined)?.missing ?? [];
    const message = missing.map((field) => `${field}: required`).join('; ');
    return Response.json({ error: 'Validation failed', message }, { status: 422 });
  }
  if (error.kind === 'integration' && error.code === 'mock_gateway_error') {
    return mockGatewayError();
  }
  return internalError();
}
