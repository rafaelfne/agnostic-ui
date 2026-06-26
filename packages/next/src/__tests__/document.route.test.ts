import { describe, expect, it } from 'vitest';

import { GET } from '../app/api/document/[screen]/route';
import { getBalanceMock } from '../infra/gateway/mock/fixtures';

const headers = (profile: string): Record<string, string> => ({
  authorization: `Bearer app_sandbox_partnerco_${profile}`,
  'x-tenant-id': 'partnerco',
});

const req = (screen: string, profile: string): Request =>
  new Request(`https://bff.test/api/document/${screen}`, { headers: headers(profile) });

const params = (screen: string): { params: Promise<{ screen: string }> } => ({
  params: Promise.resolve({ screen }),
});

describe('GET /api/document/[screen] (documento SDUI)', () => {
  it('emite um SduiDocument para a tela home (happyPath)', async () => {
    const res = await GET(req('home', 'happyPath'), params('home'));
    expect(res.status).toBe(200);
    const doc = (await res.json()) as {
      screenId: string;
      version: string;
      root: { type: string };
      context: unknown;
    };
    expect(doc.screenId).toBe('home');
    expect(doc.version).toBe('1');
    expect(doc.root.type).toBe('container');
    expect(doc.context).toEqual(getBalanceMock());
  });

  it('404 para tela desconhecida', async () => {
    const res = await GET(req('nope', 'happyPath'), params('nope'));
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: 'unknown_screen' });
  });

  it('mapeia o profile error para 500 (o cliente vira exceção)', async () => {
    const res = await GET(req('home', 'error'), params('home'));
    expect(res.status).toBe(500);
  });

  it('passa o 403 tenant_mismatch do resolver', async () => {
    const res = await GET(
      new Request('https://bff.test/api/document/home', {
        headers: {
          authorization: 'Bearer app_sandbox_partnerco_happyPath',
          'x-tenant-id': 'otherco',
        },
      }),
      params('home'),
    );
    expect(res.status).toBe(403);
  });
});
