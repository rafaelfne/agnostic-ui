import { z } from 'zod';

import { ExpressionSchema } from './expression';
import { IdSchema } from './refs';
import { StepDefSchema } from './step';
import { TriggerDefSchema } from './trigger';

/** Where a flow's initial input comes from. */
export const FlowInputSchema = z.object({
  from: z.enum(['executionContext', 'request', 'none']).default('executionContext'),
  pick: z.array(z.string().min(1)).default([]),
});
export type FlowInput = z.infer<typeof FlowInputSchema>;

/** A use case as data: ordered steps over a typed context, producing an output. */
export const FlowDefinitionSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  trigger: TriggerDefSchema.optional(),
  input: FlowInputSchema.default({ from: 'executionContext', pick: [] }),
  steps: z.array(StepDefSchema).min(1),
  output: ExpressionSchema,
  emits: z.array(IdSchema).default([]),
});
export type FlowDefinition = z.infer<typeof FlowDefinitionSchema>;
/** The pre-default input shape — `input`/`emits` optional. What `runFlow` accepts. */
export type FlowDefinitionInput = z.input<typeof FlowDefinitionSchema>;
