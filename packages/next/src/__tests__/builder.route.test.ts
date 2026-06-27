import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { beforeEach, describe, expect, it } from 'vitest';

import type { IAuthz, LlmRequest, LlmResult } from '../application/ports';
import { SupabaseAuthz } from '../infra/authz/SupabaseAuthz';
import { FakeLlm } from '../infra/llm/FakeLlm';
import { type ConfigDatabase, DrizzleConfigStore } from '../infra/store/DrizzleConfigStore';
import { applyMigrations } from '../infra/store/migrate';
import { storeSchema } from '../infra/store/schema';
import { type BuilderDeps, handleBuilderRequest } from '../interface/builder/builderApi';

async function freshStore(): Promise<DrizzleConfigStore> {
  const client = new PGlite();
  await applyMigrations((sql) => client.exec(sql));
  const db = drizzle(client, { schema: storeSchema }) as unknown as ConfigDatabase;
  return new DrizzleConfigStore(db);
}

/** Real authz over a stub verifier, so the route exercises the actual role logic. */
function authzFor(payload: Record<string, unknown> | null): IAuthz {
  return new SupabaseAuthz(async () => payload);
}

const identity = (roles: string[], tenantId = 'partnerco') => ({
  sub: 'user-1',
  app_metadata: { tenant_id: tenantId, builder_roles: roles },
});

const editor = authzFor(identity(['editor']));
const publisher = authzFor(identity(['publisher']));
const anon = authzFor(null);

const validScreen = {
  id: 'home',
  route: '/home',
  root: { type: 'text', props: { value: 'hi' } },
  dataFlow: 'get-balance',
};

let store: DrizzleConfigStore;
beforeEach(async () => {
  store = await freshStore();
});

interface CallOpts {
  authz?: IAuthz;
  store?: BuilderDeps['store'];
  llm?: BuilderDeps['llm'];
  body?: unknown;
  query?: string;
}

const COMPOSITION_TRIAGE: LlmResult = {
  config: { resolution: 'composition', rationale: 'reuses existing operators' },
  rationale: 'triage',
};

/** `ILlm` que responde uma sequência de resultados — uma chamada por item (clamp no último). */
function scriptLlm(responses: LlmResult[]): FakeLlm {
  let call = 0;
  return new FakeLlm(() => {
    const response = responses[call] ??
      responses[responses.length - 1] ?? { config: null, rationale: '' };
    call += 1;
    return response;
  });
}

/** Geração da IA com triagem feliz (composition) seguida da config — o caminho comum. */
function llmReturning(config: unknown, rationale = 'porque sim'): FakeLlm {
  return scriptLlm([COMPOSITION_TRIAGE, { config, rationale }]);
}

function call(method: string, path: string, opts: CallOpts = {}): Promise<Response> {
  const url = `https://bff.test/api/builder/${path}${opts.query ?? ''}`;
  const init: RequestInit = { method, headers: { authorization: 'Bearer t' } };
  if (opts.body !== undefined) {
    init.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
    init.headers = { ...init.headers, 'content-type': 'application/json' };
  }
  return handleBuilderRequest(new Request(url, init), path.split('/'), {
    store: opts.store === undefined ? store : opts.store,
    authz: opts.authz ?? editor,
    llm: opts.llm ?? null,
  });
}

describe('builder API — authz gating (fail-closed)', () => {
  it('401 when unauthenticated', async () => {
    const res = await call('GET', 'artifacts', { authz: anon });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthenticated' });
  });

  it('403 when authenticated but lacking the required role (editor publishing)', async () => {
    await store.saveDraft({ tenantId: 'partnerco', kind: 'screen', slug: 'home' }, validScreen);
    const res = await call('POST', 'artifacts/screen/home/publish', {
      authz: editor,
      body: { version: 1 },
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'forbidden' });
  });

  it('503 when the store is unavailable', async () => {
    const res = await call('GET', 'artifacts', { store: null });
    expect(res.status).toBe(503);
  });
});

describe('builder API — artifact lifecycle', () => {
  it('saves a draft scoped to the caller tenant, then lists and reads it', async () => {
    const save = await call('POST', 'artifacts/screen/home/versions', { body: validScreen });
    expect(save.status).toBe(201);
    expect(await save.json()).toEqual({ version: 1 });

    const list = await call('GET', 'artifacts');
    expect(await list.json()).toEqual([
      {
        kind: 'screen',
        slug: 'home',
        createdAt: expect.any(String),
        latestVersion: 1,
        publishedVersion: null,
        publishedAt: null,
      },
    ]);

    const versions = await call('GET', 'artifacts/screen/home/versions');
    const rows = (await versions.json()) as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ version: 1, status: 'draft', body: validScreen });
    expect(rows[0]).not.toHaveProperty('artifactId');
  });

  it('does not expose another tenant artifacts (tenant from session, not header)', async () => {
    await call('POST', 'artifacts/screen/home/versions', { body: validScreen, authz: editor });
    const otherEditor = authzFor(identity(['editor'], 'otherco'));
    const list = await call('GET', 'artifacts', { authz: otherEditor });
    expect(await list.json()).toEqual([]);
  });

  it('publishes a valid draft (publisher) and serves it as published', async () => {
    await call('POST', 'artifacts/screen/home/versions', { body: validScreen });
    expect((await call('GET', 'artifacts/screen/home/published')).status).toBe(404);

    const pub = await call('POST', 'artifacts/screen/home/publish', {
      authz: publisher,
      body: { version: 1 },
    });
    expect(pub.status).toBe(200);
    expect(await pub.json()).toEqual({ published: true, version: 1 });

    const published = await call('GET', 'artifacts/screen/home/published');
    expect(published.status).toBe(200);
    expect(await published.json()).toMatchObject({ id: 'home' });
  });

  it('rolls back by publishing an earlier version', async () => {
    const ref = { tenantId: 'partnerco', kind: 'screen' as const, slug: 'home' };
    await store.saveDraft(ref, { ...validScreen, route: '/v1' });
    await store.saveDraft(ref, { ...validScreen, route: '/v2' });
    await call('POST', 'artifacts/screen/home/publish', { authz: publisher, body: { version: 2 } });
    await call('POST', 'artifacts/screen/home/publish', { authz: publisher, body: { version: 1 } });
    expect(await store.getPublished(ref)).toMatchObject({ route: '/v1' });
  });
});

describe('builder API — validation & errors', () => {
  it('422 fail-closed when publishing a draft that fails its schema', async () => {
    await store.saveDraft(
      { tenantId: 'partnerco', kind: 'integration', slug: 'broken' },
      { id: 'broken', name: 'B', kind: 'rest', operations: [] },
    );
    const res = await call('POST', 'artifacts/integration/broken/publish', {
      authz: publisher,
      body: { version: 1 },
    });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ error: 'invalid_artifact' });
  });

  it('404 when publishing a missing version', async () => {
    await call('POST', 'artifacts/screen/home/versions', { body: validScreen });
    const res = await call('POST', 'artifacts/screen/home/publish', {
      authz: publisher,
      body: { version: 9 },
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: 'version_not_found' });
  });

  it('400 for an unknown kind', async () => {
    expect((await call('GET', 'artifacts', { query: '?kind=nope' })).status).toBe(400);
    expect((await call('GET', 'artifacts/nope/home/versions')).status).toBe(400);
  });

  it('400 for a malformed draft body', async () => {
    const res = await call('POST', 'artifacts/screen/home/versions', { body: 'not json{' });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'invalid_json' });
  });

  it('400 for a non-integer publish version', async () => {
    const res = await call('POST', 'artifacts/screen/home/publish', {
      authz: publisher,
      body: { version: 'x' },
    });
    expect(res.status).toBe(400);
  });

  it('404 for an unknown route', async () => {
    expect((await call('GET', 'whatever')).status).toBe(404);
    expect((await call('DELETE', 'artifacts/screen/home/versions')).status).toBe(404);
  });
});

describe('builder API — AI proposal (I.1, fail-closed)', () => {
  it('proposes a valid draft, validates it, but never publishes (AI is just an editor)', async () => {
    const res = await call('POST', 'artifacts/screen/home/propose', {
      body: { prompt: 'tela de saudação' },
      llm: llmReturning(validScreen),
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({
      version: 1,
      valid: true,
      resolution: 'composition',
      rationale: 'porque sim',
    });

    // O draft existe…
    const versions = (await (
      await call('GET', 'artifacts/screen/home/versions')
    ).json()) as unknown[];
    expect(versions).toHaveLength(1);
    // …mas a IA NÃO publicou.
    expect((await call('GET', 'artifacts/screen/home/published')).status).toBe(404);
  });

  it('saves an invalid proposal as a draft with the fail-closed reason, still unpublished', async () => {
    const res = await call('POST', 'artifacts/screen/home/propose', {
      body: { prompt: 'algo quebrado' },
      llm: llmReturning({ id: 'x' }), // objeto, mas falha o ScreenDefSchema
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ version: 1, valid: false, error: 'invalid_artifact' });
    expect((await call('GET', 'artifacts/screen/home/published')).status).toBe(404);
  });

  it('422 no_proposal when the AI returns no parseable config (no draft created)', async () => {
    const res = await call('POST', 'artifacts/screen/home/propose', {
      body: { prompt: 'oi' },
      llm: llmReturning(null),
    });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ error: 'no_proposal' });
    const versions = (await (
      await call('GET', 'artifacts/screen/home/versions')
    ).json()) as unknown[];
    expect(versions).toHaveLength(0);
  });

  it('503 when the AI is unavailable (no provider configured)', async () => {
    const res = await call('POST', 'artifacts/screen/home/propose', {
      body: { prompt: 'oi' },
      llm: null,
    });
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: 'llm_unavailable' });
  });

  it('400 for an empty prompt', async () => {
    const res = await call('POST', 'artifacts/screen/home/propose', {
      body: { prompt: '  ' },
      llm: llmReturning(validScreen),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'invalid_prompt' });
  });

  it('401 when unauthenticated (proposing needs the editor role)', async () => {
    const res = await call('POST', 'artifacts/screen/home/propose', {
      authz: anon,
      body: { prompt: 'oi' },
      llm: llmReturning(validScreen),
    });
    expect(res.status).toBe(401);
  });

  it('grounds the proposal tenant-scoped: own artifacts by name, never bodies/secret-refs, never other tenants', async () => {
    // partnerco (caller): an integration whose body holds a secret-REF, and a screen.
    await store.saveDraft(
      { tenantId: 'partnerco', kind: 'integration', slug: 'stripe' },
      {
        id: 'stripe',
        name: 'Stripe',
        kind: 'rest',
        auth: { secretRef: 'PARTNER_KEY' },
        operations: [],
      },
    );
    await store.saveDraft({ tenantId: 'partnerco', kind: 'screen', slug: 'existing' }, validScreen);
    // otherco: a secret-bearing integration that must never reach partnerco's grounding.
    await store.saveDraft(
      { tenantId: 'otherco', kind: 'integration', slug: 'othersecret' },
      { id: 'othersecret', auth: { secretRef: 'OTHER_KEY' } },
    );

    let captured: LlmRequest | undefined;
    let call_ = 0;
    const scripted = [COMPOSITION_TRIAGE, { config: validScreen, rationale: 'ok' }];
    const llm = new FakeLlm((req): LlmResult => {
      captured = req; // ambas as chamadas (triagem + geração) recebem o mesmo grounding
      const response = scripted[call_] ??
        scripted[scripted.length - 1] ?? { config: null, rationale: '' };
      call_ += 1;
      return response;
    });
    const res = await call('POST', 'artifacts/screen/home/propose', { body: { prompt: 'x' }, llm });
    expect(res.status).toBe(201);

    const ctx = captured?.context ?? '';
    expect(ctx).toContain('core.validate@1'); // operator vocabulary
    expect(ctx).toContain('core.call-integration@1');
    expect(ctx).toContain('stripe'); // own integration, by slug (from the summary)
    expect(ctx).toContain('existing'); // own screen, by slug
    expect(ctx).not.toContain('PARTNER_KEY'); // secret-ref lives in the body — summaries only
    expect(ctx).not.toContain('othersecret'); // other tenant excluded by RLS
    expect(ctx).not.toContain('OTHER_KEY');
  });

  it('blocks an unjustified needs-extension triage (no generation, no draft)', async () => {
    // Só a triagem: ela barra, então a segunda chamada (geração) nunca acontece.
    const llm = scriptLlm([
      {
        config: { resolution: 'needs-extension', rationale: 'quero um operador novo' },
        rationale: 't',
      },
    ]);
    const res = await call('POST', 'artifacts/screen/home/propose', { body: { prompt: 'x' }, llm });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ error: 'triage_blocked' });
    const versions = (await (
      await call('GET', 'artifacts/screen/home/versions')
    ).json()) as unknown[];
    expect(versions).toHaveLength(0);
  });

  it('returns a justified needs-extension verdict without generating (no draft yet)', async () => {
    const llm = scriptLlm([
      {
        config: {
          resolution: 'needs-extension',
          rationale: 'precisa de um primitivo novo',
          ruledOut: {
            composition: 'não compõe',
            integration: 'não é conector',
            expression: 'não é expressão',
          },
        },
        rationale: 't',
      },
    ]);
    const res = await call('POST', 'artifacts/screen/home/propose', { body: { prompt: 'x' }, llm });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ error: 'triage_needs-extension' });
    const versions = (await (
      await call('GET', 'artifacts/screen/home/versions')
    ).json()) as unknown[];
    expect(versions).toHaveLength(0);
  });

  it('proceeds for an expression-resolution triage and surfaces it in the 201', async () => {
    const llm = scriptLlm([
      { config: { resolution: 'expression', rationale: 'só data-shaping' }, rationale: 't' },
      { config: validScreen, rationale: 'ok' },
    ]);
    const res = await call('POST', 'artifacts/screen/home/propose', { body: { prompt: 'x' }, llm });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ version: 1, valid: true, resolution: 'expression' });
    const versions = (await (
      await call('GET', 'artifacts/screen/home/versions')
    ).json()) as unknown[];
    expect(versions).toHaveLength(1);
  });

  it('returns an integration verdict without generating (no draft yet)', async () => {
    const llm = scriptLlm([
      {
        config: { resolution: 'integration', rationale: 'precisa de um conector' },
        rationale: 't',
      },
    ]);
    const res = await call('POST', 'artifacts/screen/home/propose', { body: { prompt: 'x' }, llm });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ error: 'triage_integration' });
    const versions = (await (
      await call('GET', 'artifacts/screen/home/versions')
    ).json()) as unknown[];
    expect(versions).toHaveLength(0);
  });

  it('triages with a distinct prompt before generating (two calls, same grounding)', async () => {
    const prompts: string[] = [];
    let seq = 0;
    const scripted = [COMPOSITION_TRIAGE, { config: validScreen, rationale: 'ok' }];
    const llm = new FakeLlm((req): LlmResult => {
      prompts.push(req.prompt);
      const response = scripted[seq] ??
        scripted[scripted.length - 1] ?? { config: null, rationale: '' };
      seq += 1;
      return response;
    });
    await call('POST', 'artifacts/screen/home/propose', { body: { prompt: 'crie X' }, llm });
    expect(prompts).toHaveLength(2);
    expect(prompts[0]).toContain('TRIAGE'); // 1ª chamada = triagem
    expect(prompts[0]).toContain('crie X');
    expect(prompts[1]).toBe('crie X'); // 2ª chamada = geração (prompt do usuário)
  });
});
