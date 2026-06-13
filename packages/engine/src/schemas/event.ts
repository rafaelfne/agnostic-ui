import { z } from 'zod';

import { IdSchema, SchemaRefSchema } from './refs';

export const EventDefSchema = z.object({
  name: IdSchema,
  payload: SchemaRefSchema.optional(),
});
export type EventDef = z.infer<typeof EventDefSchema>;

/** Binds an event to a flow that runs when it fires (executed in Fase B, not A). */
export const SubscriptionDefSchema = z.object({
  event: IdSchema,
  flow: IdSchema,
});
export type SubscriptionDef = z.infer<typeof SubscriptionDefSchema>;
