import { z } from 'zod';
import { TemplateNodeSchema } from '../schemas/template';

/** Versão da spec de conformance do corpus v1. Vetores declaram a versão que miram. */
export const CONFORMANCE_SPEC_VERSION = '1.0';

/**
 * Um vetor de conformance: dado um `template` com bindings (`{{ ... }}`) e um
 * `context`, o renderer deve produzir a árvore `expected`. O corpus é
 * **renderer-agnóstico** (dados) e roda nos três renderers — engine (oráculo), React
 * e Flutter — garantindo paridade semântica de data-binding e composição
 * (ADR 0005 §2 / ADR 0006 §8).
 *
 * `.strict()` (H2): chave desconhecida → erro, fechando o escape de campo não
 * declarado (ex. `locale`, lido pelos runners sem o schema validar). `specVersion`
 * versiona o corpus para a generalização (H4) e o gate de divergência (H3).
 */
export const ConformanceVectorSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    specVersion: z.string().min(1),
    /** Locale para pipes sensíveis a locale (ex. currency/date); ausente → default. */
    locale: z.string().optional(),
    template: TemplateNodeSchema,
    context: z.record(z.unknown()),
    expected: TemplateNodeSchema,
  })
  .strict();

export type ConformanceVector = z.infer<typeof ConformanceVectorSchema>;
