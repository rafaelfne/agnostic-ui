import { buildScope } from '../context';
import { ValidationError } from '../errors';
import type { StepDef } from '../schemas';

import type { OperatorHandler } from './operator';

type ValidateStep = Extract<StepDef, { op: 'validate' }>;

/**
 * Asserts that each required field is present and non-empty in scope. Mirrors the
 * real controllers' `min(1)` check, which is exactly "not null/undefined/empty".
 * Raises a kind-`validation` error the host maps to 422.
 */
export const validateOperator: OperatorHandler<ValidateStep> = (step, { ctx }) => {
  const scope = buildScope(ctx);
  const missing = step.require.filter((field) => {
    const value = scope[field];
    return value === null || value === undefined || value === '';
  });
  if (missing.length > 0) throw new ValidationError(missing);
};
