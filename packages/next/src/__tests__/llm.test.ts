import { describe, expect, it } from 'vitest';

import type { ILlm } from '../application/ports';
import { AnthropicLlm } from '../infra/llm/AnthropicLlm';
import { FakeLlm } from '../infra/llm/FakeLlm';

describe('I.0 — ILlm port + seam determinístico', () => {
  it('FakeLlm é injetável e determinístico (sem rede)', async () => {
    const llm: ILlm = new FakeLlm((req) => ({ config: { echoed: req.prompt }, rationale: 'fixo' }));
    const result = await llm.generate({ prompt: 'crie uma tela' });
    expect(result.config).toEqual({ echoed: 'crie uma tela' });
    expect(result.rationale).toBe('fixo');
  });

  it('AnthropicLlm monta a request e extrai o bloco json (fetch injetado)', async () => {
    let capturedUrl: Parameters<typeof fetch>[0] | undefined;
    let capturedBody:
      | { model: string; system: string; messages: Array<{ content: string }> }
      | undefined;
    const fakeFetch: typeof fetch = (url, init) => {
      capturedUrl = url;
      capturedBody = JSON.parse(String(init?.body)) as typeof capturedBody;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            content: [{ type: 'text', text: 'pronto:\n```json\n{ "a": 1 }\n```' }],
          }),
          { status: 200 },
        ),
      );
    };
    const llm = new AnthropicLlm('sk-test', 'claude-sonnet-4-6', fakeFetch);
    const result = await llm.generate({ prompt: 'oi', context: 'você é um editor' });

    expect(result.config).toEqual({ a: 1 });
    expect(capturedUrl).toBe('https://api.anthropic.com/v1/messages');
    expect(capturedBody?.model).toBe('claude-sonnet-4-6');
    expect(capturedBody?.system).toBe('você é um editor');
    expect(capturedBody?.messages[0]?.content).toBe('oi');
  });

  it('AnthropicLlm propaga erro HTTP', async () => {
    const fakeFetch: typeof fetch = () => Promise.resolve(new Response('nope', { status: 500 }));
    const llm = new AnthropicLlm('sk-test', 'm', fakeFetch);
    await expect(llm.generate({ prompt: 'x' })).rejects.toThrow();
  });

  it('config = null quando não há JSON parseável', async () => {
    const fakeFetch: typeof fetch = () =>
      Promise.resolve(
        new Response(JSON.stringify({ content: [{ type: 'text', text: 'sem json aqui' }] }), {
          status: 200,
        }),
      );
    const llm = new AnthropicLlm('sk-test', 'm', fakeFetch);
    const result = await llm.generate({ prompt: 'x' });
    expect(result.config).toBeNull();
    expect(result.rationale).toBe('sem json aqui');
  });
});
