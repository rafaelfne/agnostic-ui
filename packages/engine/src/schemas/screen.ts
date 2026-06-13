import { TemplateNodeSchema } from '@yukilabs/agnostic-ui-core';
import { z } from 'zod';

import { IdSchema } from './refs';

/**
 * A Server-Driven UI screen as config: an (editable) TemplateNode tree bound to
 * a flow for its data. The tree reuses `TemplateNode` from core (single source
 * of truth); `compose-template` resolves the placeholders in its props.
 */
export const ScreenDefSchema = z.object({
  id: IdSchema,
  route: z.string().min(1),
  root: TemplateNodeSchema,
  dataFlow: IdSchema,
});
export type ScreenDef = z.infer<typeof ScreenDefSchema>;
