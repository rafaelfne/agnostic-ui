import type { ZodError } from 'zod';

/**
 * Sanitized error responses for the interface layer (manual, Parte 10.1). The
 * body never leaks internal detail (stack traces, gateway internals): only a
 * stable `error` code and, for validation, a field-level `message`.
 */
function jsonError(status: number, error: string, message?: string): Response {
  return Response.json(message === undefined ? { error } : { error, message }, { status });
}

/** 422 — input schema rejected the request; `message` carries the field detail. */
export function validationError(error: ZodError): Response {
  const message = error.issues
    .map((issue) => (issue.path.length > 0 ? `${issue.path.join('.')}: ` : '') + issue.message)
    .join('; ');
  return jsonError(422, 'Validation failed', message);
}

/** 500 — unhandled exception. */
export function internalError(): Response {
  return jsonError(500, 'Internal server error');
}

/** 500 — the mock `error` profile fired (expected in sandbox; the UI handles it). */
export function mockGatewayError(): Response {
  return jsonError(500, 'mock_gateway_error');
}
