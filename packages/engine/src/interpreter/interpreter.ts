import {
  type EngineRunInput,
  type FlowContext,
  buildScope,
  createFlowContext,
  resolveProfile,
} from '../context';
import { ConfigError } from '../errors';
import { type EmittedEvent, type IEventBus, InMemoryEventBus } from '../events';
import { evaluateExpression } from '../expression';
import {
  type EngineServices,
  type OperatorContext,
  type OperatorRegistry,
  buildDefaultRegistry,
} from '../operators';
import type { IIntegrationRunner } from '../ports';
import {
  type FlowDefinition,
  type FlowDefinitionInput,
  FlowDefinitionSchema,
  type StepDef,
} from '../schemas';

import { type EngineResult, classify } from './result';

export interface RunFlowDeps {
  integrationRunner: IIntegrationRunner;
  /** Optional external bus; emitted events are always returned in the result too. */
  eventBus?: IEventBus;
}

/** Validates the flow config up front; a bad artifact is a `config` error, not a crash. */
function parseFlow(flow: FlowDefinitionInput): FlowDefinition {
  const result = FlowDefinitionSchema.safeParse(flow);
  if (!result.success) {
    throw new ConfigError('invalid flow definition', { cause: result.error });
  }
  return result.data;
}

function extractInput(flow: FlowDefinition, input: EngineRunInput): Record<string, unknown> {
  const { from, pick } = flow.input;
  if (from === 'none') return {};
  const source: Record<string, unknown> =
    from === 'request'
      ? (input.request ?? {})
      : ({ ...input.auth } satisfies Record<string, unknown>);
  const picked: Record<string, unknown> = {};
  for (const field of pick) picked[field] = source[field];
  return picked;
}

/** Type-safe dispatch: each case narrows `step` to the operator's own shape. */
function dispatch(
  step: StepDef,
  context: OperatorContext,
  registry: OperatorRegistry,
): Promise<void> | void {
  switch (step.op) {
    case 'validate':
      return registry.validate(step, context);
    case 'call-integration':
      return registry['call-integration'](step, context);
    case 'compose-template':
      return registry['compose-template'](step, context);
    case 'branch':
      return registry.branch(step, context);
    case 'emit-event':
      return registry['emit-event'](step, context);
  }
}

/**
 * Runs a FlowDefinition over a typed context: validate config → extract input →
 * execute steps in order (honoring each step's `when` guard) → evaluate the
 * output expression. Errors are classified, never thrown to the host.
 */
export async function runFlow(
  flow: FlowDefinitionInput,
  input: EngineRunInput,
  deps: RunFlowDeps,
): Promise<EngineResult> {
  const registry = buildDefaultRegistry();
  const emitted: EmittedEvent[] = [];
  const eventBus: IEventBus = {
    emit: (event) => {
      emitted.push(event);
      deps.eventBus?.emit(event);
    },
  };

  try {
    const parsed = parseFlow(flow);
    const profile = resolveProfile(input.auth);
    const ctx = createFlowContext(input.auth, extractInput(parsed, input));

    const runSteps = async (steps: StepDef[], target: FlowContext): Promise<void> => {
      for (const step of steps) {
        if (step.when !== undefined && !services.evaluate(step.when, buildScope(target))) continue;
        await dispatch(step, { ctx: target, services, profile }, registry);
      }
    };

    const services: EngineServices = {
      integrationRunner: deps.integrationRunner,
      eventBus,
      evaluate: evaluateExpression,
      runSteps,
    };

    await runSteps(parsed.steps, ctx);

    const body = evaluateExpression(parsed.output, buildScope(ctx));
    return { ok: true, body, emitted };
  } catch (error) {
    return { ok: false, error: classify(error) };
  }
}
