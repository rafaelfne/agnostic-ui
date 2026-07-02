import { type ScreenDef, ScreenDefSchema } from '@yukilabs/agnostic-ui-engine';

import type { FlowValidation } from '../flows/flowModel';

/**
 * The editable working value of a screen draft — what the editor mutates and saves.
 * (`ScreenDefSchema` has no defaults/transforms, so input ≡ output ≡ `ScreenDef`.)
 */
export type ScreenDraft = ScreenDef;

/** A minimal, schema-valid starting point for a new screen. */
export function emptyScreen(slug: string): ScreenDraft {
  return {
    id: slug,
    route: `/${slug}`,
    root: { type: 'screen', children: [] },
    dataFlow: slug,
  };
}

/** Validates a draft against the engine schema, flattening Zod issues for display. */
export function validateScreen(value: unknown): FlowValidation {
  const result = ScreenDefSchema.safeParse(value);
  if (result.success) return { ok: true };
  return {
    ok: false,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.length > 0 ? issue.path.join('.') : '(root)',
      message: issue.message,
    })),
  };
}
