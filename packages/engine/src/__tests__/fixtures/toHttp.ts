import type { EngineResult } from '../../interpreter';

export interface HttpResponse {
  status: number;
  body: unknown;
}

/**
 * The host's error-kind → HTTP mapping, living in tests for Fase A (it belongs to
 * the BFF host in Fase B). This is where the spike's 400 becomes the real 422:
 * the engine only carries `kind: 'validation'`; the host picks the status to match
 * the existing 177 tests.
 */
export function toHttp(result: EngineResult): HttpResponse {
  if (result.ok) return { status: 200, body: result.body };

  const { error } = result;
  if (error.kind === 'validation') {
    return { status: 422, body: { error: 'Validation failed', message: error.message } };
  }
  if (error.kind === 'integration' && error.code === 'mock_gateway_error') {
    return { status: 500, body: { error: 'mock_gateway_error' } };
  }
  return { status: 500, body: { error: 'Internal server error' } };
}
