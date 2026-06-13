import { branchOperator } from './branch';
import { callIntegrationOperator } from './callIntegration';
import { composeTemplateOperator } from './composeTemplate';
import { emitEventOperator } from './emitEvent';
import type { OperatorRegistry } from './operator';
import { validateOperator } from './validate';

export * from './operator';
export * from './validate';
export * from './callIntegration';
export * from './composeTemplate';
export * from './branch';
export * from './emitEvent';

/**
 * The single source of the operator set the engine can execute. There is no
 * dynamic registration in production — auditing this function audits the whole
 * vocabulary.
 */
export function buildDefaultRegistry(): OperatorRegistry {
  return {
    validate: validateOperator,
    'call-integration': callIntegrationOperator,
    'compose-template': composeTemplateOperator,
    branch: branchOperator,
    'emit-event': emitEventOperator,
  };
}
