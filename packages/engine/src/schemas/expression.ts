import { z } from 'zod';

/**
 * Restricted expression language (JSONLogic-style AST). This is the only way
 * config binds values between steps — never arbitrary JS, never `eval`. The
 * operator and function vocabularies are closed enums, which is what keeps the
 * system safe with a no-dev audience and a public repo (ADR 0002 §3/§7).
 */
export const EXPRESSION_OPERATORS = [
  '==',
  '!=',
  '<',
  '<=',
  '>',
  '>=',
  '&&',
  '||',
  '!',
  '+',
  '-',
  '*',
  '/',
  '%',
] as const;
export type ExpressionOperator = (typeof EXPRESSION_OPERATORS)[number];

/** Curated, pure functions available to expressions. No I/O, no globals. */
export const EXPRESSION_FUNCTIONS = [
  'upper',
  'lower',
  'concat',
  'coalesce',
  'format',
  'len',
] as const;
export type ExpressionFunction = (typeof EXPRESSION_FUNCTIONS)[number];

export type ExpressionNode =
  | { kind: 'lit'; value: string | number | boolean | null }
  | { kind: 'path'; path: string }
  | { kind: 'op'; op: ExpressionOperator; args: ExpressionNode[] }
  | { kind: 'cond'; if: ExpressionNode; then: ExpressionNode; else: ExpressionNode }
  | { kind: 'call'; fn: ExpressionFunction; args: ExpressionNode[] };

export const ExpressionNodeSchema: z.ZodType<ExpressionNode> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('lit'),
      value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
    }),
    z.object({ kind: z.literal('path'), path: z.string().min(1) }),
    z.object({
      kind: z.literal('op'),
      op: z.enum(EXPRESSION_OPERATORS),
      args: z.array(ExpressionNodeSchema).min(1),
    }),
    z.object({
      kind: z.literal('cond'),
      if: ExpressionNodeSchema,
      then: ExpressionNodeSchema,
      else: ExpressionNodeSchema,
    }),
    z.object({
      kind: z.literal('call'),
      fn: z.enum(EXPRESSION_FUNCTIONS),
      args: z.array(ExpressionNodeSchema),
    }),
  ]),
);

/** An expression as stored in config: either an AST node or a `"{{ path }}"` string. */
export const ExpressionSchema = z.union([z.string(), ExpressionNodeSchema]);
export type Expression = z.infer<typeof ExpressionSchema>;
