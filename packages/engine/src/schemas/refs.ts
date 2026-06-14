import { z } from 'zod';

/**
 * Identifier for a config artifact, operation, event or step output. Permissive
 * enough for kebab (`get-balance`), camel (`getBalance`) and snake; must start
 * with a letter. References between artifacts are by id (Ref pattern) — the
 * graph is resolved by the store in Fase B, not the engine.
 */
export const IdSchema = z
  .string()
  .min(1)
  .regex(/^[A-Za-z][A-Za-z0-9_-]*$/, 'must start with a letter; letters, digits, _ and - only');
export type Id = z.infer<typeof IdSchema>;

/** A reference to another artifact by its id. */
export const RefSchema = IdSchema;
export type Ref = z.infer<typeof RefSchema>;

/** A reference to a named (Zod) schema; resolved to a concrete validator in Fase B. */
export const SchemaRefSchema = IdSchema;
export type SchemaRef = z.infer<typeof SchemaRefSchema>;
