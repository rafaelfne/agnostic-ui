/**
 * Port: o provedor de LLM que a IA-como-editor usa (ADR 0006, Frente I). A IA é só
 * **mais um editor de config** — gera uma PROPOSTA contra os schemas/contratos, nunca
 * código. Fica atrás de uma port (Clean Arch) para ser **mockável**: todo teste injeta
 * um `FakeLlm`, e a não-determinância (e a rede) ficam quarentenadas aqui.
 */
export interface LlmRequest {
  /** O pedido em linguagem natural. */
  prompt: string;
  /** Grounding: vocabulário/contexto contra o qual a IA gera (preenchido em I.2). */
  context?: string;
}

export interface LlmResult {
  /** Candidato de config (JSON) que a IA propõe; `null` se não veio JSON parseável. */
  config: unknown;
  /** Racional legível da proposta. */
  rationale: string;
}

export interface ILlm {
  generate(request: LlmRequest): Promise<LlmResult>;
}
