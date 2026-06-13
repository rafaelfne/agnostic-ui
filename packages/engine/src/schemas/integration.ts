import { z } from 'zod';

import { ExpressionSchema } from './expression';
import { IdSchema, SchemaRefSchema } from './refs';
import { HttpMethodSchema } from './trigger';

export const IntegrationKindSchema = z.enum(['rest', 'graphql', 'mock']);
export type IntegrationKind = z.infer<typeof IntegrationKindSchema>;

/** One callable operation of an integration (the declarative form of a gateway method). */
export const OperationDefSchema = z.object({
  id: IdSchema,
  method: HttpMethodSchema.optional(),
  path: z.string().optional(),
  /** The GraphQL document, for `kind: 'graphql'` integrations. */
  query: z.string().optional(),
  /** Schema reference validating the request input. */
  input: SchemaRefSchema.optional(),
  /** Maps the raw response into a domain shape. */
  output: ExpressionSchema.optional(),
});
export type OperationDef = z.infer<typeof OperationDefSchema>;

/**
 * The generic, declarative form of a gateway. Secrets are referenced, never
 * inlined. Designed in full for Fase A; only `kind: 'mock'` executes (via the
 * IIntegrationRunner port) — REST/GraphQL adapters land in Fase B.
 */
export const IntegrationDefinitionSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  kind: IntegrationKindSchema,
  baseUrlRef: z.string().optional(),
  auth: z.object({ type: z.string().min(1), secretRef: z.string().min(1) }).optional(),
  operations: z.array(OperationDefSchema).min(1),
  security: z
    .object({
      allowlistRef: z.string().optional(),
      timeoutMs: z.number().int().positive().optional(),
      retries: z.number().int().nonnegative().optional(),
    })
    .optional(),
});
export type IntegrationDefinition = z.infer<typeof IntegrationDefinitionSchema>;
