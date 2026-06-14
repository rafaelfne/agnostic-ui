import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';

/** A flat bag of values an expression can read from. */
export type Scope = Record<string, unknown>;

/**
 * Mutable state of a single flow run. `input` holds the fields extracted in the
 * input phase; `outputs` accumulates each step's result keyed by its `as`.
 */
export interface FlowContext {
  readonly input: Record<string, unknown>;
  readonly outputs: Record<string, unknown>;
  readonly auth: ExecutionContext;
}

export function createFlowContext(
  auth: ExecutionContext,
  input: Record<string, unknown> = {},
): FlowContext {
  return { input: { ...input }, outputs: {}, auth };
}

/** Writes a step's result into the context under its `as` key. */
export function writeOutput(ctx: FlowContext, key: string, value: unknown): void {
  ctx.outputs[key] = value;
}

/**
 * Builds the read scope for expressions: input fields and step outputs merged
 * flat (outputs win on collision), plus a reserved `$auth` namespace. Back-compat
 * with the SDUI/spike `{{ key }}` and `{{ output.nested }}` placeholders.
 */
export function buildScope(ctx: FlowContext): Scope {
  return {
    ...ctx.input,
    ...ctx.outputs,
    $auth: {
      tenantId: ctx.auth.tenantId,
      customerId: ctx.auth.customerId,
      mode: ctx.auth.mode,
    },
  };
}
