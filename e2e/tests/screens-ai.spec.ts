import { expect, test } from '@playwright/test';

import { SEED, bffContext, getToken } from '../helpers/api';

/**
 * Jornada 4 — Telas SDUI (épico K) + IA como editora (Frente I).
 *
 * (a) Browser: o editor de telas lista as telas seedadas e abre uma — prova o SPA do
 *     screen builder ponta a ponta com a sessão real.
 * (b) API: a IA propõe um rascunho de tela (BUILDER_FAKE_LLM determinístico) — ela NUNCA
 *     publica (o publicado segue 404). É a garantia de segurança da IA-como-editor.
 */
test('editor de telas lista e abre uma tela seedada', async ({ page }) => {
  // lista de telas mostra a seedada
  await page.goto('/screens');
  await expect(page.getByRole('cell', { name: 'balance-screen' })).toBeVisible({ timeout: 15_000 });

  // abre o editor (navegação direta — a linha da tabela é clicável, mas o goto é
  // determinístico e evita ambiguidade com a dashboard que também lista o slug)
  await page.goto('/screens/balance-screen');
  await expect(page).toHaveURL(/\/screens\/balance-screen/);
  // o editor carregou: a aba Design aparece (chrome do ScreenEditorPage)
  await expect(page.getByRole('tab', { name: /design/i })).toBeVisible({ timeout: 15_000 });
});

test('IA propõe rascunho de tela e NUNCA publica (fail-closed)', async () => {
  const ctx = await bffContext(await getToken(SEED.publisher.email, SEED.publisher.password));
  const slug = `e2e-ai-${Date.now()}`;

  const res = await ctx.post(`/api/builder/artifacts/screen/${slug}/propose`, {
    data: { prompt: 'tela de saldo com um KPI mostrando o disponível' },
  });
  expect(res.status(), `propose: ${res.status()} ${await res.text()}`).toBe(201);
  const proposal = (await res.json()) as {
    version?: number;
    valid: boolean;
    resolution?: string;
    rationale: string;
  };
  // o FakeLlm canned é um ScreenDef válido → a proposta valida e vira rascunho
  expect(proposal.valid).toBe(true);
  expect(proposal.version).toBeGreaterThan(0);
  expect(proposal.rationale.length).toBeGreaterThan(0);

  // invariante-chave: a IA propôs um RASCUNHO, nada foi publicado
  const published = await ctx.get(`/api/builder/artifacts/screen/${slug}/published`);
  expect(published.status()).toBe(404);

  await ctx.dispose();
});
