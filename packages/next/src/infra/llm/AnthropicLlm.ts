import type { ILlm, LlmRequest, LlmResult } from '../../application/ports';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MAX_TOKENS = 4096;

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>;
}

/** Extrai o primeiro bloco ```json … ``` (ou o texto inteiro) e tenta parseá-lo. */
function extractConfig(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const candidate = (fenced?.[1] ?? text).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

/**
 * `ILlm` sobre a API Messages da Anthropic via `fetch` (sem SDK novo). O `context`
 * (grounding, I.2) vira o system prompt; o pedido vira a mensagem do usuário. O
 * parsing estruturado é afinado em I.3 (triagem/saída estruturada). `fetchFn` é
 * injetável para teste.
 */
export class AnthropicLlm implements ILlm {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async generate(request: LlmRequest): Promise<LlmResult> {
    const response = await this.fetchFn(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: MAX_TOKENS,
        system: request.context ?? '',
        messages: [{ role: 'user', content: request.prompt }],
      }),
    });
    if (!response.ok) {
      throw new Error(`anthropic request failed: ${response.status}`);
    }
    const data = (await response.json()) as AnthropicResponse;
    const text = (data.content ?? [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('');
    return { config: extractConfig(text), rationale: text };
  }
}
