import { z } from 'zod';

import { ExpressionSchema } from './expression';
import { IdSchema } from './refs';

export const HOOK_PHASES = ['before', 'after', 'onError'] as const;
export const HOOK_SCOPES = ['global', 'flow', 'step'] as const;

/**
 * Built-in cross-cutting hooks. The ADR 0001 hardening (JWT verification,
 * rate-limit) stops being special code and becomes the `auth`/`rateLimit`
 * hooks — applied by config. Schema designed in Fase A; the hook pipeline is
 * executed in Fase B.
 */
export const BUILTIN_HOOKS = ['auth', 'rateLimit', 'cache', 'log', 'metrics', 'transform'] as const;

export const HookActionSchema = z.union([
  z.object({ builtin: z.enum(BUILTIN_HOOKS) }),
  z.object({ flow: IdSchema }),
]);
export type HookAction = z.infer<typeof HookActionSchema>;

export const HookDefSchema = z.object({
  phase: z.enum(HOOK_PHASES),
  scope: z.enum(HOOK_SCOPES),
  when: ExpressionSchema.optional(),
  action: HookActionSchema,
});
export type HookDef = z.infer<typeof HookDefSchema>;
