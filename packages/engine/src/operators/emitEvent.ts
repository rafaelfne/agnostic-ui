import { buildScope } from '../context';
import type { StepDef } from '../schemas';

import type { OperatorHandler } from './operator';

type EmitEventStep = Extract<StepDef, { op: 'emit-event' }>;

/** Emits a named event with an optional, expression-computed payload onto the bus. */
export const emitEventOperator: OperatorHandler<EmitEventStep> = (step, { ctx, services }) => {
  const scope = buildScope(ctx);
  const payload = step.payload === undefined ? undefined : services.evaluate(step.payload, scope);
  services.eventBus.emit({ event: step.event, payload });
};
