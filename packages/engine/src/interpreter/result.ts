import type { EmittedEvent } from '../events';
import { EngineError, type ErrorKind, ValidationError } from '../errors';

/** A failure projected into a plain, serializable shape the host maps to HTTP. */
export interface EngineErrorResult {
  kind: ErrorKind;
  code: string;
  message: string;
  details?: unknown;
}

export type EngineResult =
  | { ok: true; body: unknown; emitted: EmittedEvent[] }
  | { ok: false; error: EngineErrorResult };

/** Projects any thrown value into an EngineErrorResult. Unknown errors are `internal`. */
export function classify(error: unknown): EngineErrorResult {
  if (error instanceof ValidationError) {
    return {
      kind: error.kind,
      code: error.code,
      message: error.message,
      details: { missing: error.missing },
    };
  }
  if (error instanceof EngineError) {
    return { kind: error.kind, code: error.code, message: error.message };
  }
  return {
    kind: 'internal',
    code: 'internal_error',
    message: error instanceof Error ? error.message : String(error),
  };
}
