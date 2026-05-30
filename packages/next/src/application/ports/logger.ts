/** Structured context attached to a log line (manual, Parte 2.3.1). */
export type LogContext = Record<string, unknown>;

/**
 * Port: structured logging with severity levels and per-line context.
 * Implemented by infra/logging/StructuredLogger.
 */
export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}
