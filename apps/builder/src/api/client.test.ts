import { describe, expect, it, vi } from 'vitest';

import { BuilderApiError, createBuilderClient } from './client';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** A fetch stub that records the last call and returns a fresh response each time. */
function stubFetch(make: () => Response) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return make();
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

const token = 'session-jwt';

describe('createBuilderClient', () => {
  it('lists artifacts with a Bearer header and same-origin path', async () => {
    const summary = [
      { kind: 'screen', slug: 'home', createdAt: 't', latestVersion: 2, publishedVersion: 1 },
    ];
    const { fn, calls } = stubFetch(() => jsonResponse(200, summary));
    const client = createBuilderClient({ getToken: () => token, fetch: fn });

    expect(await client.listArtifacts()).toEqual(summary);
    expect(calls[0]?.url).toBe('/api/builder/artifacts');
    expect(calls[0]?.init.method).toBe('GET');
    expect((calls[0]?.init.headers as Record<string, string>).authorization).toBe(
      `Bearer ${token}`,
    );
  });

  it('passes a kind filter and a base URL prefix', async () => {
    const { fn, calls } = stubFetch(() => jsonResponse(200, []));
    const client = createBuilderClient({
      baseUrl: 'https://bff.example',
      getToken: () => token,
      fetch: fn,
    });
    await client.listArtifacts('flow');
    expect(calls[0]?.url).toBe('https://bff.example/api/builder/artifacts?kind=flow');
  });

  it('omits the auth header when signed out', async () => {
    const { fn, calls } = stubFetch(() => jsonResponse(200, []));
    const client = createBuilderClient({ getToken: () => null, fetch: fn });
    await client.listArtifacts();
    expect((calls[0]?.init.headers as Record<string, string>).authorization).toBeUndefined();
  });

  it('returns null from getPublished on 404 (nothing published)', async () => {
    const { fn } = stubFetch(() => jsonResponse(404, { error: 'not_found' }));
    const client = createBuilderClient({ getToken: () => token, fetch: fn });
    expect(await client.getPublished('screen', 'home')).toBeNull();
  });

  it('returns the published body on 200', async () => {
    const { fn } = stubFetch(() => jsonResponse(200, { id: 'home' }));
    const client = createBuilderClient({ getToken: () => token, fetch: fn });
    expect(await client.getPublished('screen', 'home')).toEqual({ id: 'home' });
  });

  it('saves a draft (JSON body + content-type) and returns the version', async () => {
    const { fn, calls } = stubFetch(() => jsonResponse(201, { version: 3 }));
    const client = createBuilderClient({ getToken: () => token, fetch: fn });

    const body = { id: 'home', route: '/home' };
    expect(await client.saveDraft('screen', 'home', body)).toBe(3);
    expect(calls[0]?.url).toBe('/api/builder/artifacts/screen/home/versions');
    expect(calls[0]?.init.method).toBe('POST');
    expect((calls[0]?.init.headers as Record<string, string>)['content-type']).toBe(
      'application/json',
    );
    expect(JSON.parse(calls[0]?.init.body as string)).toEqual(body);
  });

  it('publishes a version', async () => {
    const { fn, calls } = stubFetch(() => jsonResponse(200, { published: true, version: 2 }));
    const client = createBuilderClient({ getToken: () => token, fetch: fn });
    await client.publish('flow', 'get-balance', 2);
    expect(calls[0]?.url).toBe('/api/builder/artifacts/flow/get-balance/publish');
    expect(JSON.parse(calls[0]?.init.body as string)).toEqual({ version: 2 });
  });

  it('throws BuilderApiError with status, code and detail on a failed publish', async () => {
    const { fn } = stubFetch(() =>
      jsonResponse(422, { error: 'invalid_artifact', detail: 'operations: too small' }),
    );
    const client = createBuilderClient({ getToken: () => token, fetch: fn });
    await expect(client.publish('integration', 'broken', 1)).rejects.toMatchObject({
      name: 'BuilderApiError',
      status: 422,
      code: 'invalid_artifact',
      detail: 'operations: too small',
    });
  });

  it('surfaces a 401 as a BuilderApiError (unauthenticated)', async () => {
    const { fn } = stubFetch(() => jsonResponse(401, { error: 'unauthenticated' }));
    const client = createBuilderClient({ getToken: () => null, fetch: fn });
    const error = await client.listArtifacts().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BuilderApiError);
    expect((error as BuilderApiError).status).toBe(401);
  });

  it('proposes a draft (POST /propose {prompt}) and returns the result on 201', async () => {
    const result = { version: 3, valid: true, resolution: 'composition', rationale: 'reuse' };
    const { fn, calls } = stubFetch(() => jsonResponse(201, result));
    const client = createBuilderClient({ getToken: () => token, fetch: fn });

    expect(await client.propose('flow', 'pay', 'crie um flow de pagamento')).toEqual(result);
    expect(calls[0]?.url).toBe('/api/builder/artifacts/flow/pay/propose');
    expect(calls[0]?.init.method).toBe('POST');
    expect(JSON.parse(calls[0]?.init.body as string)).toEqual({
      prompt: 'crie um flow de pagamento',
    });
  });

  it('rejects fail-closed when the proposal is blocked (422)', async () => {
    const { fn } = stubFetch(() => jsonResponse(422, { error: 'triage_blocked', detail: 'no' }));
    const client = createBuilderClient({ getToken: () => token, fetch: fn });
    await expect(client.propose('flow', 'pay', 'x')).rejects.toMatchObject({
      status: 422,
      code: 'triage_blocked',
    });
  });
});
