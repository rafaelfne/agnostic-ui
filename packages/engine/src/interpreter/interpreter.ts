import {
  type EngineRunInput,
  type FlowContext,
  buildScope,
  createFlowContext,
  resolveProfile,
} from '../context';
import { ConfigError } from '../errors';
import type { EmittedEvent, IEventBus } from '../events';
import { evaluateExpression } from '../expression';
import {
  type StepDispatcher,
  buildCoreGovernedRegistry,
  createGovernedDispatcher,
} from '../governance';
import { type EngineServices, type PreflightHook, type SchemaResolver } from '../operators';
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
  /** Resolves named schemas for `validate` steps that reference one. */
  schemas?: SchemaResolver;
  /**
   * Aprova ações `critical` (G5). Ausente → operadores críticos ficam bloqueados
   * (fail-closed); o host obtém a confirmação humana e injeta o hook.
   */
  preflight?: PreflightHook;
  /**
   * Dispatcher de steps. Default = o registry governado dos operadores `core.*`.
   * Injete `createGovernedDispatcher(registry)` com um registry que inclua os
   * operadores de **tenant** para rodar flows que os referenciam (ADR 0006).
   */
  dispatcher?: StepDispatcher;
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

/** O caminho de dispatch: o registry governado por contrato dos operadores `core.*`. */
const defaultDispatcher: StepDispatcher = createGovernedDispatcher(buildCoreGovernedRegistry());

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
  const dispatcher: StepDispatcher = deps.dispatcher ?? defaultDispatcher;
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
        await dispatcher(step, { ctx: target, services, profile });
      }
    };

    const services: EngineServices = {
      integrationRunner: deps.integrationRunner,
      eventBus,
      evaluate: evaluateExpression,
      runSteps,
      schemas: deps.schemas,
      preflight: deps.preflight,
    };

    await runSteps(parsed.steps, ctx);

    const body = evaluateExpression(parsed.output, buildScope(ctx));
    return { ok: true, body, emitted };
  } catch (error) {
    return { ok: false, error: classify(error) };
  }
}
