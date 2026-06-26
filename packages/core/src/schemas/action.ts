import { z } from 'zod';

/**
 * The closed vocabulary of UI actions a node (e.g. a button) can dispatch, shared
 * by both renderers' dispatchers (ADR 0005 §4; manual §7). A rich discriminated
 * union mirrors the FlowEngine navigation handlers plus the native bridge — never
 * arbitrary callbacks, keeping the action surface audited like the rest of config.
 */
export const ACTION_TYPES = [
  'navigate',
  'navigateFlow',
  'replaceCurrent',
  'back',
  'refreshHomePage',
  'bridge',
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

const withLabel = { label: z.string().optional() };

/** Navigation that targets a route. */
const NavigateActionSchema = z.object({
  type: z.literal('navigate'),
  target: z.string().min(1),
  ...withLabel,
});

/** Navigation into a flow (target prefixed by the flow). */
const NavigateFlowActionSchema = z.object({
  type: z.literal('navigateFlow'),
  target: z.string().min(1),
  ...withLabel,
});

/** Replaces the current route with `target`. */
const ReplaceCurrentActionSchema = z.object({
  type: z.literal('replaceCurrent'),
  target: z.string().min(1),
  ...withLabel,
});

/** Pops the current route. */
const BackActionSchema = z.object({ type: z.literal('back'), ...withLabel });

/** Triggers the home screen's refresh. */
const RefreshHomePageActionSchema = z.object({
  type: z.literal('refreshHomePage'),
  ...withLabel,
});

/** Invokes a native bridge method (envelope `method`/`params`). */
const BridgeActionSchema = z.object({
  type: z.literal('bridge'),
  method: z.string().min(1),
  params: z.unknown().optional(),
  ...withLabel,
});

export const ActionDefSchema = z.discriminatedUnion('type', [
  NavigateActionSchema,
  NavigateFlowActionSchema,
  ReplaceCurrentActionSchema,
  BackActionSchema,
  RefreshHomePageActionSchema,
  BridgeActionSchema,
]);
export type ActionDef = z.infer<typeof ActionDefSchema>;
