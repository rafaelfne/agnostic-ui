import { type TemplateNode, TemplateNodeSchema } from '@yukilabs/agnostic-ui-core';
import { z } from 'zod';

import { type Expression, ExpressionSchema } from './expression';
import { IdSchema, SchemaRefSchema } from './refs';

/**
 * The closed, audited vocabulary of operations the engine can execute. This
 * discriminated union — not `eval` — is what keeps the system safe. Fase A shipped
 * five operators; `foreach` is added in F1.A.3; the rest (`transform`,
 * `call-flow`, `delay`, `guard`) come later. Every step may carry a `when` guard
 * (falsy → skipped).
 */
export type StepDef =
  | { op: 'validate'; require: string[]; schema?: string; as?: string; when?: Expression }
  | {
      op: 'call-integration';
      integration: string;
      operation: string;
      input?: Expression;
      as: string;
      when?: Expression;
    }
  | { op: 'compose-template'; template: TemplateNode; as: string; when?: Expression }
  | {
      op: 'branch';
      cases: Array<{ when: Expression; steps: StepDef[] }>;
      else?: StepDef[];
      when?: Expression;
    }
  | { op: 'emit-event'; event: string; payload?: Expression; when?: Expression }
  | { op: 'foreach'; items: Expression; as: string; steps: StepDef[]; when?: Expression };

export const StepDefSchema: z.ZodType<StepDef> = z.lazy(() =>
  z.discriminatedUnion('op', [
    z.object({
      op: z.literal('validate'),
      require: z.array(z.string().min(1)),
      schema: SchemaRefSchema.optional(),
      as: IdSchema.optional(),
      when: ExpressionSchema.optional(),
    }),
    z.object({
      op: z.literal('call-integration'),
      integration: IdSchema,
      operation: IdSchema,
      input: ExpressionSchema.optional(),
      as: IdSchema,
      when: ExpressionSchema.optional(),
    }),
    z.object({
      op: z.literal('compose-template'),
      template: TemplateNodeSchema,
      as: IdSchema,
      when: ExpressionSchema.optional(),
    }),
    z.object({
      op: z.literal('branch'),
      cases: z.array(z.object({ when: ExpressionSchema, steps: z.array(StepDefSchema) })).min(1),
      else: z.array(StepDefSchema).optional(),
      when: ExpressionSchema.optional(),
    }),
    z.object({
      op: z.literal('emit-event'),
      event: IdSchema,
      payload: ExpressionSchema.optional(),
      when: ExpressionSchema.optional(),
    }),
    z.object({
      op: z.literal('foreach'),
      items: ExpressionSchema,
      as: IdSchema,
      steps: z.array(StepDefSchema),
      when: ExpressionSchema.optional(),
    }),
  ]),
);
