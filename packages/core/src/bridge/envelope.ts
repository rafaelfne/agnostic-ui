import { z } from 'zod';
import { BRIDGE_MESSAGE_TYPES, BRIDGE_ORIGINS } from './constants';

export const BridgeErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});
export type BridgeError = z.infer<typeof BridgeErrorSchema>;

export const EnvelopeMetaSchema = z.object({
  bridgeVersion: z.string(),
  tenantId: z.string(),
});
export type EnvelopeMeta = z.infer<typeof EnvelopeMetaSchema>;

/**
 * The single message format exchanged between the native host and the WebView
 * in both directions. `method`/`params` carry requests, `result` carries
 * responses, and `error` carries failures.
 */
export const EnvelopeSchema = z.object({
  id: z.string().uuid(),
  origin: z.enum(BRIDGE_ORIGINS),
  type: z.enum(BRIDGE_MESSAGE_TYPES),
  method: z.string().optional(),
  params: z.unknown().optional(),
  result: z.unknown().optional(),
  error: BridgeErrorSchema.optional(),
  meta: EnvelopeMetaSchema,
});
export type Envelope = z.infer<typeof EnvelopeSchema>;
