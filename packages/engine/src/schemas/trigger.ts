import { z } from 'zod';

import { IdSchema } from './refs';

export const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

/**
 * How a flow is entered. The full union is designed up front (forward-compat);
 * Fase A does not dispatch by trigger — flows are run directly by tests/host.
 */
export const TriggerDefSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('http'), method: HttpMethodSchema, path: z.string().min(1) }),
  z.object({ kind: z.literal('event'), eventName: IdSchema }),
  z.object({ kind: z.literal('schedule'), cron: z.string().min(1) }),
  z.object({ kind: z.literal('bridge-action'), action: z.string().min(1) }),
]);
export type TriggerDef = z.infer<typeof TriggerDefSchema>;
