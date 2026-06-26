import { z } from 'zod';

import { ContractRefSchema, JsonSchemaSchema } from './operatorContract';

/**
 * Contrato de um componente (ADR 0006). O **props schema** é a interface nativa da
 * IA: o instante em que um dev registra um componente, a IA já o usa lendo o schema.
 * Roda num sandbox **render-only** — sem I/O, sem segredo, sem egress (enforcement
 * por renderer em G6).
 */
export const ComponentContractSchema = z.object({
  ref: ContractRefSchema,
  props: JsonSchemaSchema,
  renderOnly: z.literal(true),
});
export type ComponentContract = z.infer<typeof ComponentContractSchema>;
