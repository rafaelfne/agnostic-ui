import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { describe, expect, it } from 'vitest';

import type { ConfigArtifactRef } from '../application/ports';
import { type ConfigDatabase, DrizzleConfigStore } from '../infra/store/DrizzleConfigStore';
import { applyMigrations } from '../infra/store/migrate';
import { publishArtifactVersion } from '../infra/store/publishArtifact';
import { storeSchema } from '../infra/store/schema';

async function freshStore(): Promise<DrizzleConfigStore> {
  const client = new PGlite();
  await applyMigrations((sql) => client.exec(sql));
  const db = drizzle(client, { schema: storeSchema }) as unknown as ConfigDatabase;
  return new DrizzleConfigStore(db);
}

const TENANT = 'partnerco';

const validScreen = {
  id: 'home',
  route: '/home',
  root: { type: 'text', props: { value: 'hi' } },
  dataFlow: 'get-balance',
};
const validIntegration = {
  id: 'core',
  name: 'Core',
  kind: 'mock',
  operations: [{ id: 'getBalance' }],
};

describe('DrizzleConfigStore.listArtifacts', () => {
  it('summarizes artifacts with latest/published versions, filterable by kind', async () => {
    const store = await freshStore();
    const screenRef: ConfigArtifactRef = { tenantId: TENANT, kind: 'screen', slug: 'home' };
    await store.saveDraft(screenRef, validScreen);
    await store.saveDraft(screenRef, validScreen); // v2
    await store.publish(screenRef, 1);
    await store.saveDraft(
      { tenantId: TENANT, kind: 'integration', slug: 'core' },
      validIntegration,
    );

    const all = await store.listArtifacts(TENANT);
    expect(all).toEqual([
      {
        kind: 'integration',
        slug: 'core',
        createdAt: expect.any(Date),
        latestVersion: 1,
        publishedVersion: null,
      },
      {
        kind: 'screen',
        slug: 'home',
        createdAt: expect.any(Date),
        latestVersion: 2,
        publishedVersion: 1,
      },
    ]);

    const screens = await store.listArtifacts(TENANT, 'screen');
    expect(screens.map((a) => a.slug)).toEqual(['home']);
  });

  it('does not leak artifacts across tenants', async () => {
    const store = await freshStore();
    await store.saveDraft({ tenantId: 'tenant-a', kind: 'screen', slug: 'a' }, validScreen);
    await store.saveDraft({ tenantId: 'tenant-b', kind: 'screen', slug: 'b' }, validScreen);
    expect((await store.listArtifacts('tenant-a')).map((a) => a.slug)).toEqual(['a']);
    expect((await store.listArtifacts('tenant-b')).map((a) => a.slug)).toEqual(['b']);
  });

  it('returns an empty list for a tenant with no artifacts', async () => {
    const store = await freshStore();
    expect(await store.listArtifacts(TENANT)).toEqual([]);
  });
});

describe('publishArtifactVersion (multi-kind, fail-closed)', () => {
  it('publishes a valid non-flow artifact after schema validation', async () => {
    const store = await freshStore();
    const ref: ConfigArtifactRef = { tenantId: TENANT, kind: 'screen', slug: 'home' };
    await store.saveDraft(ref, validScreen);
    const outcome = await publishArtifactVersion(store, ref, 1);
    expect(outcome.published).toBe(true);
    expect(await store.getPublished(ref)).toMatchObject({ id: 'home' });
  });

  it('rejects a non-flow draft that fails its schema and never flips the pointer', async () => {
    const store = await freshStore();
    const ref: ConfigArtifactRef = { tenantId: TENANT, kind: 'integration', slug: 'broken' };
    await store.saveDraft(ref, { id: 'broken', name: 'B', kind: 'rest', operations: [] });
    const outcome = await publishArtifactVersion(store, ref, 1);
    expect(outcome).toMatchObject({ published: false, error: 'invalid_artifact' });
    expect(await store.getPublished(ref)).toBeNull();
  });

  it('reports version_not_found for a missing version', async () => {
    const store = await freshStore();
    const ref: ConfigArtifactRef = { tenantId: TENANT, kind: 'screen', slug: 'home' };
    await store.saveDraft(ref, validScreen);
    expect(await publishArtifactVersion(store, ref, 99)).toEqual({
      published: false,
      error: 'version_not_found',
    });
  });

  it('routes a flow kind through the dry-run path (rejecting a broken flow)', async () => {
    const store = await freshStore();
    const ref: ConfigArtifactRef = { tenantId: TENANT, kind: 'flow', slug: 'broken' };
    await store.saveDraft(ref, { id: 'broken', name: 'B', steps: [], output: '{{ x }}' });
    expect(await publishArtifactVersion(store, ref, 1)).toMatchObject({
      published: false,
      error: 'invalid_flow',
    });
  });
});
