import { z } from 'zod';

/** A node in a Server-Driven UI template tree. */
export interface TemplateNode {
  type: string;
  id?: string;
  props?: Record<string, unknown>;
  body?: TemplateNode[];
  children?: TemplateNode[];
  /**
   * Loop directive: an expression resolving to an array. A node carrying
   * `dataBind` is expanded once per item within its parent's `body`/`children`,
   * with `$item` and `$index` added to scope (renderer-resolved, manual §4/§5).
   */
  dataBind?: string;
}

export const TemplateNodeSchema: z.ZodType<TemplateNode> = z.lazy(() =>
  z.object({
    type: z.string(),
    id: z.string().optional(),
    props: z.record(z.unknown()).optional(),
    body: z.array(TemplateNodeSchema).optional(),
    children: z.array(TemplateNodeSchema).optional(),
    dataBind: z.string().optional(),
  }),
);
