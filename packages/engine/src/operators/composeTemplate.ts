import { buildScope, writeOutput } from '../context';
import type { StepDef } from '../schemas';
import { resolveTemplate } from '../template';

import type { OperatorHandler } from './operator';

type ComposeTemplateStep = Extract<StepDef, { op: 'compose-template' }>;

/**
 * Builds a data-bound SDUI tree from `template`, resolving `{{ ... }}` placeholders
 * in props against the flow's data, and stores it under `as`. Resolution is shared
 * with the conformance runner via {@link resolveTemplate}.
 */
export const composeTemplateOperator: OperatorHandler<ComposeTemplateStep> = (
  step,
  { ctx, services },
) => {
  const scope = buildScope(ctx);
  writeOutput(ctx, step.as, resolveTemplate(step.template, scope, services.evaluate));
};
