import type { ILlm } from '../../application/ports';

import { AnthropicLlm } from './AnthropicLlm';

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
    llm = key !== undefined && key !== '' ? new AnthropicLlm(key, model) : null;
    resolved = true;
  }
  return llm;
}
