import type { FlowContext } from '../context';
import { buildScope, writeOutput } from '../context';
import type { StepDef } from '../schemas';

import type { OperatorHandler } from './operator';

type ForeachStep = Extract<StepDef, { op: 'foreach' }>;

/**
 * Iterates `items` (an expression resolving to an array), running `steps` once per
 * element with `$item`/`$index` in scope, and stores the array of per-item output
 * bags under `as`. Each iteration runs in an **isolated child context** (parent
 * input/auth + `$item`/`$index`, fresh outputs) so items don't see each other's
 * outputs and the parent isn't polluted. A non-array binding yields `[]` — the
 * flow never breaks. Sub-steps re-enter the interpreter via `services.runSteps`.
 */
export const foreachOperator: OperatorHandler<ForeachStep> = async (step, { ctx, services }) => {
  const items = services.evaluate(step.items, buildScope(ctx));
  const results: Record<string, unknown>[] = [];
  if (Array.isArray(items)) {
    for (let index = 0; index < items.length; index += 1) {
      const childCtx: FlowContext = {
        input: { ...ctx.input, $item: items[index], $index: index },
        outputs: {},
        auth: ctx.auth,
      };
      await services.runSteps(step.steps, childCtx);
      results.push(childCtx.outputs);
    }
  }
  writeOutput(ctx, step.as, results);
};
