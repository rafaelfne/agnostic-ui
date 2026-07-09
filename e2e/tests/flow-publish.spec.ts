import { expect, request, test } from '@playwright/test';

import { BFF_URL } from '../helpers/env';
import { SEED, bffContext, getToken } from '../helpers/api';

/**
 * Jornada 1 — Loop config-driven: o publisher publica um flow pela UI do builder e o
 * runtime passa a servir a versão publicada. Cobre SPA (browser, sessão do storageState)
 * + store (publish) + runtime (engine). É o coração da plataforma.
 */
async function publishedVersionOf(slug: string): Promise<number | null> {
  const ctx = await bffContext(await getToken(SEED.publisher.email, SEED.publisher.password));
  const res = await ctx.get('/api/builder/artifacts?kind=flow');
  const flows = (await res.json()) as Array<{ slug: string; publishedVersion: number | null }>;
  await ctx.dispose();
  return flows.find((f) => f.slug === slug)?.publishedVersion ?? null;
}

test('publica o get-balance pela UI → runtime serve o saldo publicado', async ({ page }) => {
  const before = await publishedVersionOf('get-balance');

  // browser: lista de flows → abre o get-balance
  await page.goto('/flows');
  await expect(page.getByText('get-balance').first()).toBeVisible();
  await page.getByText('get-balance').first().click();
  await expect(page).toHaveURL(/\/flows\/get-balance/);

  // publica (papel publisher) — "Save & publish"
  const publish = page.getByRole('button', { name: /save & publish/i });
  await expect(publish).toBeEnabled();
  await publish.click();
  await expect(page.getByText(/published/i).first()).toBeVisible({ timeout: 15_000 });

  // store: uma nova versão publicada apareceu (a UI de fato publicou)
  await expect
    .poll(() => publishedVersionOf('get-balance'), { timeout: 15_000 })
    .toBeGreaterThan(before ?? 0);

  // runtime: o engine serve o flow publicado (marker sandbox → mock)
  const ctx = await request.newContext();
  const res = await ctx.get(`${BFF_URL}/api/balance`, {
    headers: {
      authorization: 'Bearer app_sandbox_partnerco_happyPath',
      'x-tenant-id': 'partnerco',
    },
  });
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { currency?: string; netWorth?: number };
  expect(body.currency).toBe('BRL');
  expect(typeof body.netWorth).toBe('number');
  await ctx.dispose();
});
