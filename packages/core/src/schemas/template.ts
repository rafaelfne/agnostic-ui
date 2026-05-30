import { z } from 'zod';

/** A node in a Server-Driven UI template tree. */
export interface TemplateNode {
  type: string;
  id?: string;
  props?: Record<string, unknown>;
  body?: TemplateNode[];
  children?: TemplateNode[];
}

export const TemplateNodeSchema: z.ZodType<TemplateNode> = z.lazy(() =>
  z.object({
    type: z.string(),
    id: z.string().optional(),
    props: z.record(z.unknown()).optional(),
    body: z.array(TemplateNodeSchema).optional(),
    children: z.array(TemplateNodeSchema).optional(),
  }),
);
