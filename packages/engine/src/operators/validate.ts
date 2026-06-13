import { buildScope } from '../context';
import { ConfigError, ValidationError } from '../errors';
import type { StepDef } from '../schemas';

import type { OperatorHandler } from './operator';

type ValidateStep = Extract<StepDef, { op: 'validate' }>;

/**
 * Asserts the input is valid before the flow proceeds. `require` is a presence
 * check (non-null/undefined/empty), reproducing the controllers' `min(1)`. When a
 * `schema` ref is set, the scope is validated against the host-resolved Zod schema
 * and the field-level issues are carried on the error — so the host renders the
 * same 422 message as the hardcoded routes. Raises kind-`validation` (→ 422).
 */
export const validateOperator: OperatorHandler<ValidateStep> = (step, { ctx, services }) => {
  const scope = buildScope(ctx);

  if (step.schema !== undefined) {
    const schema = services.schemas?.(step.schema);
    if (schema === undefined) throw new ConfigError(`unknown schema: ${step.schema}`);
    const result = schema.safeParse(scope);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      const missing = issues.map((issue) => issue.path).filter((path) => path !== '');
      throw new ValidationError(missing, issues);
    }
  }

  const missing = step.require.filter((field) => {
    const value = scope[field];
    return value === null || value === undefined || value === '';
  });
  if (missing.length > 0) throw new ValidationError(missing);
};
