import { ERROR_HTTP_STATUS, type SandboxErrorCode } from '@yukilabs/agnostic-ui-core';

/** Raised when a token or tenant fails resolution; carries the canonical error code. */
export class SandboxResolutionError extends Error {
  constructor(readonly code: SandboxErrorCode) {
    super(code);
    this.name = 'SandboxResolutionError';
  }
}

/** Maps a resolution error code to its canonical HTTP response (manual error table). */
export function errorResponse(code: SandboxErrorCode): Response {
  return new Response(JSON.stringify({ error: code }), {
    status: ERROR_HTTP_STATUS[code],
    headers: { 'content-type': 'application/json' },
  });
}
