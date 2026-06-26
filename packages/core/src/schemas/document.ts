import { z } from 'zod';

import { TemplateNodeSchema } from './template';

/** Pull-to-refresh metadata for a screen document (manual §10). */
export const SduiRefreshSchema = z.object({
  enabled: z.boolean(),
});
export type SduiRefresh = z.infer<typeof SduiRefreshSchema>;

/** An error surfaced to the renderer, which swaps to the exception template. */
export const SduiExceptionSchema = z.object({
  code: z.string().optional(),
  message: z.string(),
});
export type SduiException = z.infer<typeof SduiExceptionSchema>;

/**
 * The raw SDUI document the BFF emits per screen, and which both renderers (React
 * and Flutter) consume (ADR 0005 §5). It pairs the still-bindable template `root`
 * with the `context` data — the renderer resolves `{{ ... }}` in `root` against
 * `context` (the single shared resolution) — plus optional refresh/exception
 * metadata.
 *
 * Distinct from the authoring `ScreenDef` (engine config: which template + which
 * flow): a document is the **runtime result** of resolving a `ScreenDef`'s data
 * flow into `context`. Two schemas, one reconciled lifecycle.
 */
export const SduiDocumentSchema = z.object({
  screenId: z.string().min(1),
  version: z.string(),
  root: TemplateNodeSchema,
  context: z.record(z.unknown()),
  refresh: SduiRefreshSchema.optional(),
  exception: SduiExceptionSchema.optional(),
});
export type SduiDocument = z.infer<typeof SduiDocumentSchema>;
