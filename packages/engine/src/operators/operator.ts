import type { MockProfile } from '@yukilabs/agnostic-ui-core';

import type { FlowContext } from '../context';
import type { IEventBus } from '../events';
import type { ExpressionEvaluator } from '../expression';
import type { IIntegrationRunner } from '../ports';
import type { StepDef } from '../schemas';

/** Everything an operator needs that is not the step itself. Injected by the interpreter. */
export interface EngineServices {
  integrationRunner: IIntegrationRunner;
  eventBus: IEventBus;
  evaluate: ExpressionEvaluator;
  /** Runs a list of steps against the same context (used by `branch`). */
  runSteps: (steps: StepDef[], ctx: FlowContext) => Promise<void>;
}

export interface OperatorContext {
  ctx: FlowContext;
  services: EngineServices;
  profile: MockProfile | undefined;
}

/** A handler for one operator, narrowed to its specific step shape. */
export type OperatorHandler<S extends StepDef> = (
  step: S,
  context: OperatorContext,
) => Promise<void> | void;

/**
 * The fixed, audited operator set, keyed by `op`. A closed map (not dynamic
 * registration) is what makes the engine safe to run config without `eval`.
 */
export type OperatorRegistry = {
  readonly [Op in StepDef['op']]: OperatorHandler<Extract<StepDef, { op: Op }>>;
};
