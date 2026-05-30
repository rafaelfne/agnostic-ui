import 'reflect-metadata';
import { injectable } from 'tsyringe';
import type { ILogger, LogContext } from '../../application/ports';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Adapter: emits one JSON line per log with severity and structured context
 * (manual, Parte 2.3.1). Context typically carries env, tenantId, requestId and
 * mockProfile so production dashboards can filter `env != 'sandbox'`.
 */
@injectable()
export class StructuredLogger implements ILogger {
  debug(message: string, context?: LogContext): void {
    this.write('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.write('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.write('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.write('error', message, context);
  }

  private write(level: LogLevel, message: string, context?: LogContext): void {
    const line = JSON.stringify({
      level,
      message,
      ...context,
      timestamp: new Date().toISOString(),
    });
    console[level](line);
  }
}
