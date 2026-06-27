import { z } from 'zod';

import type { ILlm } from '../../application/ports';

/**
 * Triagem-primeiro (I.3, ADR 0006). O vocabulário de operadores é **fechado**; criar
 * uma extensão (operador/componente novo) é o ÚLTIMO recurso. Antes de propor, a IA
 * declara COMO satisfazer o pedido, preferindo o que já existe — e só pode pedir
 * `needs-extension` provando que nenhuma das três vias resolve.
 */
export const TriageResolutionSchema = z.enum([
  'composition', // compor operadores/templates existentes
  'integration', // uma IntegrationDefinition declarativa (conector REST/GraphQL)
  'expression', // uma expressão segura de data-shaping
  'needs-extension', // genuinamente precisa de um operador/componente novo
]);
export type TriageResolution = z.infer<typeof TriageResolutionSchema>;

const RuledOutSchema = z.object({
  composition: z.string().trim().min(1),
  integration: z.string().trim().min(1),
  expression: z.string().trim().min(1),
});

/** Forma base (sem o invariante) — usada para classificar a falha de validação. */
const TriageBaseSchema = z.object({
  resolution: TriageResolutionSchema,
  rationale: z.string().trim().min(1),
  ruledOut: RuledOutSchema.optional(),
});

/**
 * `needs-extension` EXIGE `ruledOut` com as três justificativas; sem elas o parse falha
 * (fail-closed). É o portão que impede "criar um operador" de virar o caminho fácil.
 */
export const TriageSchema = TriageBaseSchema.refine(
  (triage) => triage.resolution !== 'needs-extension' || triage.ruledOut !== undefined,
  {
    message: 'needs-extension requires ruling out composition, integration and expression',
    path: ['ruledOut'],
  },
);
export type Triage = z.infer<typeof TriageSchema>;

/** Prompt de triagem — roda ANTES da geração, com o mesmo grounding tenant-scoped. */
export function triagePrompt(userRequest: string): string {
  return [
    'TRIAGE the request before generating anything. The operator vocabulary is CLOSED; adding a new operator or component (an "extension") is the LAST resort.',
    'Decide how to satisfy it, preferring existing mechanisms: "composition" (combine the operators listed in the context), "integration" (a declarative REST/GraphQL connector), or "expression" (a safe data-shaping expression).',
    'Choose "needs-extension" ONLY if none of those work — and then you MUST fill "ruledOut" explaining why each of composition, integration and expression is insufficient.',
    'Respond with ONLY a JSON object: {"resolution":"composition|integration|expression|needs-extension","rationale":"...","ruledOut"?:{"composition":"...","integration":"...","expression":"..."}}.',
    '',
    `Request: ${userRequest}`,
  ].join('\n');
}

export type TriageOutcome =
  | { ok: true; triage: Triage }
  | { ok: false; reason: 'unjustified' | 'invalid'; rationale: string };

/**
 * Roda a triagem via `ILlm` e a valida fail-closed. `unjustified`: a IA pediu
 * `needs-extension` sem as justificativas (o caso do DoD); `invalid`: a saída nem é uma
 * triagem. Em ambos, a proposta é barrada antes de qualquer geração/draft.
 */
export async function triageRequest(
  llm: ILlm,
  userRequest: string,
  context: string,
): Promise<TriageOutcome> {
  const result = await llm.generate({ prompt: triagePrompt(userRequest), context });
  const parsed = TriageSchema.safeParse(result.config);
  if (parsed.success) return { ok: true, triage: parsed.data };

  const lenient = TriageBaseSchema.safeParse(result.config);
  const unjustified = lenient.success && lenient.data.resolution === 'needs-extension';
  return {
    ok: false,
    reason: unjustified ? 'unjustified' : 'invalid',
    rationale: result.rationale,
  };
}
