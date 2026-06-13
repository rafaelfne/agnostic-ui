import { buildScope, writeOutput } from '../context';
import { IntegrationError } from '../errors';
import type { StepDef } from '../schemas';

import type { OperatorHandler } from './operator';

type CallIntegrationStep = Extract<StepDef, { op: 'call-integration' }>;

/**
 * Invokes an integration operation through the IIntegrationRunner port and stores
 * the result under `as`. The input defaults to the full scope, or is computed from
 * an expression. Any failure is wrapped as a kind-`integration` error that carries
 * the underlying cause (so the host can read its code, e.g. mock_gateway_error).
 */
export const callIntegrationOperator: OperatorHandler<CallIntegrationStep> = async (
  step,
  { ctx, services, profile },
) => {
  const scope = buildScope(ctx);
  const input = step.input === undefined ? scope : services.evaluate(step.input, scope);
  try {
    const result = await services.integrationRunner.run({
      integration: step.integration,
      operation: step.operation,
      input,
      profile,
    });
    writeOutput(ctx, step.as, result);
  } catch (error) {
    throw new IntegrationError(step.integration, step.operation, { cause: error });
  }
};
