import type { ILlm, LlmResult } from '../../application/ports';

import { AnthropicLlm } from './AnthropicLlm';
import { FakeLlm } from './FakeLlm';

/** Default: Sonnet (bom custo/capacidade p/ gerar config; configurável via env). */
const DEFAULT_MODEL = 'claude-sonnet-4-6';

let resolved = false;
let llm: ILlm | null = null;

/**
 * Provedor de LLM do processo: `AnthropicLlm` quando `ANTHROPIC_API_KEY` está setado,
 * `null` caso contrário. A pipeline da IA (Frente I) trata `null` como "IA
 * indisponível" — espelha o `getConfigStore` (null = persistência indisponível). Em
 * teste injeta-se um `FakeLlm` direto, sem passar por aqui.
 */
export function getLlm(): ILlm | null {
  if (!resolved) {
    const key = process.env.ANTHROPIC_API_KEY;
    const model = process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
    if (key !== undefined && key !== '') {
      llm = new AnthropicLlm(key, model);
    } else {
      // Seam de teste/E2E: respostas canned via `BUILDER_FAKE_LLM` mantêm a pipeline da
      // IA determinística contra o BFF de verdade — sem rede nem chave. Como o propose
      // chama o LLM duas vezes (triagem, depois geração — ver proposeArtifact.ts), o env
      // traz o par {triage, generate} e o responder escolhe pelo prompt de triagem.
      // Mesma filosofia do `FakeLlm` já existente; nunca setado em produção.
      const canned = process.env.BUILDER_FAKE_LLM;
      let pair: { triage: LlmResult; generate: LlmResult } | null = null;
      if (canned !== undefined && canned !== '') {
        try {
          pair = JSON.parse(canned) as { triage: LlmResult; generate: LlmResult };
        } catch {
          pair = null;
        }
      }
      llm =
        pair !== null
          ? new FakeLlm((req) => (req.prompt.startsWith('TRIAGE') ? pair.triage : pair.generate))
          : null;
    }
    resolved = true;
  }
  return llm;
}
