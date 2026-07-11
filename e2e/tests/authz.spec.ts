import { expect, test } from '@playwright/test';

import { SEED, bffContext, getToken } from '../helpers/api';

/**
 * Jornada 3 — Governança fail-closed do builder API (API-level).
 *
 * Prova: sem token → 401; publicar exige papel `publisher` (editor → 403, antes de
 * qualquer validação); e o isolamento por tenant (RLS) — o acme não enxerga artefatos
 * só-do-partnerco. O tenant vem sempre da sessão verificada, nunca de header.
 */
test.describe('builder API · authz fail-closed', () => {
  test('sem token → 401', async () => {
    const ctx = await bffContext();
    const res = await ctx.get('/api/builder/artifacts?kind=flow');
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  test('editor não publica (403); publisher publica (200)', async () => {
    const pub = await bffContext(await getToken(SEED.publisher.email, SEED.publisher.password));
    const ed = await bffContext(await getToken(SEED.editor.email, SEED.editor.password));

    // versão publicada atual do get-balance (não hardcode)
    const list = await pub.get('/api/builder/artifacts?kind=flow');
    const flows = (await list.json()) as Array<{ slug: string; publishedVersion: number | null }>;
    const version = flows.find((f) => f.slug === 'get-balance')?.publishedVersion;
    expect(version, 'get-balance deve ter versão publicada').toBeTruthy();

    // editor: publish é papel publisher → 403 (authz antes de tocar no store)
    const edRes = await ed.post('/api/builder/artifacts/flow/get-balance/publish', {
      data: { version },
    });
    expect(edRes.status()).toBe(403);

    // publisher: re-publica a versão atual → 200 (fail-closed valida e reafirma o ponteiro)
    const pubRes = await pub.post('/api/builder/artifacts/flow/get-balance/publish', {
      data: { version },
    });
    expect(
      pubRes.ok(),
      `publish publisher: ${pubRes.status()} ${await pubRes.text()}`,
    ).toBeTruthy();

    await pub.dispose();
    await ed.dispose();
  });

  test('isolamento por tenant: acme não enxerga o kyc-onboarding do partnerco', async () => {
    const acme = await bffContext(await getToken(SEED.acme.email, SEED.acme.password));

    const published = await acme.get('/api/builder/artifacts/flow/kyc-onboarding/published');
    expect(published.status()).toBe(404);

    const list = await acme.get('/api/builder/artifacts?kind=flow');
    const slugs = ((await list.json()) as Array<{ slug: string }>).map((a) => a.slug);
    expect(slugs).not.toContain('kyc-onboarding');

    await acme.dispose();
  });
});
