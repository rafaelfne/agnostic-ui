import { expect, request, test } from '@playwright/test';

import { BFF_URL } from '../helpers/env';

/**
 * Jornada 2 — Runtime sandbox + perfis de mock (API-level).
 *
 * O runtime (`/api/[...path]`) resolve o modo por token: marker
 * `app_sandbox_<tenant>_<profile>` → mock. Prova os 4 perfis e o mapa de erros do
 * CLAUDE.md (tenant_mismatch → 403, marker inválido → 400). Não precisa de login do
 * builder — é o caminho do bridge/WebView.
 */
async function runtimeBalance(profile: string, tenant = 'partnerco') {
  const ctx = await request.newContext();
  const res = await ctx.get(`${BFF_URL}/api/balance`, {
    headers: {
      authorization: `Bearer app_sandbox_partnerco_${profile}`,
      'x-tenant-id': tenant,
    },
  });
  const contentType = res.headers()['content-type'] ?? '';
  const body = contentType.includes('json') ? await res.json() : await res.text();
  await ctx.dispose();
  return { status: res.status(), body };
}

test.describe('runtime · sandbox + perfis', () => {
  test('happyPath → 200 com o saldo mockado', async () => {
    const { status, body } = await runtimeBalance('happyPath');
    expect(status).toBe(200);
    expect(body).toMatchObject({ currency: 'BRL' });
    expect(typeof body.netWorth).toBe('number');
    expect(typeof body.available).toBe('number');
  });

  test('empty → 200', async () => {
    const { status } = await runtimeBalance('empty');
    expect(status).toBe(200);
  });

  test('error → 5xx (integração falha, fail-closed)', async () => {
    const { status } = await runtimeBalance('error');
    expect(status).toBeGreaterThanOrEqual(500);
  });

  test('slow → 200 (responde, com atraso)', async () => {
    const { status } = await runtimeBalance('slow');
    expect(status).toBe(200);
  });

  test('tenant_mismatch (marker partnerco, header acme) → 403', async () => {
    const { status, body } = await runtimeBalance('happyPath', 'acme');
    expect(status).toBe(403);
    expect(body).toMatchObject({ error: 'tenant_mismatch' });
  });

  test('marker inválido → 400', async () => {
    const ctx = await request.newContext();
    const res = await ctx.get(`${BFF_URL}/api/balance`, {
      headers: { authorization: 'Bearer app_sandbox_INVALID', 'x-tenant-id': 'partnerco' },
    });
    expect(res.status()).toBe(400);
    await ctx.dispose();
  });
});
