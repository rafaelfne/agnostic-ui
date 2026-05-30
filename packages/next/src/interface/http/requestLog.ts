import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import type { LogContext } from '../../application/ports';

/**
 * Builds the structured log context for a controller (manual, Parte 6.5.4).
 * Always carries `env` (the execution mode) so production dashboards can filter
 * `env != 'sandbox'`.
 */
export function buildLogContext(ctx: ExecutionContext, operation: string): LogContext {
  return {
    env: ctx.mode,
    tenantId: ctx.tenantId,
    customerId: ctx.customerId,
    operation,
  };
}
