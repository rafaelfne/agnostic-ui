import type { MockProfile, ReviewSummary, TrustTier } from '@yukilabs/agnostic-ui-core';
import type { z } from 'zod';

import type { FlowContext } from '../context';
import type { IEventBus } from '../events';
import type { ExpressionEvaluator } from '../expression';
import type { IIntegrationRunner } from '../ports';
import type { StepDef } from '../schemas';

/** Resolves a `SchemaRef` to a Zod schema. The host owns the named schemas. */
export type SchemaResolver = (ref: string) => z.ZodTypeAny | undefined;

/** Info de pré-flight de uma ação crítica (ADR 0006 §5). */
export interface PreflightInfo {
  ref: string;
  tier: TrustTier;
  summary: ReviewSummary;
}

/**
 * Hook de pré-flight humano: aprova (ou não) o dispatch de um operador `critical`.
 * Ausente → ações críticas ficam bloqueadas (fail-closed). O host (builder, Frente I)
 * obtém a confirmação humana e injeta o hook.
 */
export type PreflightHook = (info: PreflightInfo) => boolean | Promise<boolean>;

/** Everything an operator needs that is not the step itself. Injected by the interpreter. */
export interface EngineServices {
  integrationRunner: IIntegrationRunner;
  eventBus: IEventBus;
  evaluate: ExpressionEvaluator;
  /** Runs a list of steps against the same context (used by `branch`). */
  runSteps: (steps: StepDef[], ctx: FlowContext) => Promise<void>;
  /** Resolves named schemas for the `validate` operator (optional). */
  schemas?: SchemaResolver;
  /** Aprova ações `critical` (G5). Ausente → crítico bloqueado (fail-closed). */
  preflight?: PreflightHook;
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
