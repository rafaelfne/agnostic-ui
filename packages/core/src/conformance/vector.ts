import { z } from 'zod';
import { TemplateNodeSchema } from '../schemas/template';

/**
 * Um vetor de conformance: dado um `template` com bindings (`{{ ... }}`) e um
 * `context`, o renderer deve produzir a árvore `expected`. O corpus é
 * **renderer-agnóstico** (dados) e roda nos dois renderers — React e Flutter —
 * garantindo paridade semântica de data-binding e composição (ADR 0005 §2).
 *
 * Esqueleto (F1.6): aqui só formalizamos o formato e validamos estrutura. A
 * resolução de binding contra `expected` é ligada quando a gramática rica existir
 * (F1.A.5 no engine/React; F2 no Dart).
 */
export const ConformanceVectorSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  template: TemplateNodeSchema,
  context: z.record(z.unknown()),
  expected: TemplateNodeSchema,
});

export type ConformanceVector = z.infer<typeof ConformanceVectorSchema>;
