import { buildScope } from '../context';
import type { StepDef } from '../schemas';

import type { OperatorHandler } from './operator';

type BranchStep = Extract<StepDef, { op: 'branch' }>;

/**
 * Runs the steps of the first case whose `when` is truthy, else the `else` steps.
 * Sub-steps re-enter the interpreter via `services.runSteps`, sharing the context.
 */
export const branchOperator: OperatorHandler<BranchStep> = async (step, { ctx, services }) => {
  const scope = buildScope(ctx);
  for (const branchCase of step.cases) {
    if (services.evaluate(branchCase.when, scope)) {
      await services.runSteps(branchCase.steps, ctx);
      return;
    }
  }
  if (step.else !== undefined) await services.runSteps(step.else, ctx);
};
