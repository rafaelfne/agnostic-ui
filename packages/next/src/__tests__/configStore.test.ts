import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { describe, expect, it } from 'vitest';

import type { ConfigArtifactRef } from '../application/ports';
import { type ConfigDatabase, DrizzleConfigStore } from '../infra/store/DrizzleConfigStore';
import { applyMigrations } from '../infra/store/migrate';
import { publishFlowVersion } from '../infra/store/publishFlow';
import { storeSchema } from '../infra/store/schema';

async function freshStore(): Promise<{ client: PGlite; store: DrizzleConfigStore }> {
  const client = new PGlite();
  await applyMigrations((sql) => client.exec(sql));
  const db = drizzle(client, { schema: storeSchema }) as unknown as ConfigDatabase;
  return { client, store: new DrizzleConfigStore(db) };
}

function flowBody(name: string): Record<string, unknown> {
  return {
    id: 'get-balance',
    name,
    input: { from: 'executionContext', pick: ['customerId'] },
    steps: [
      { op: 'validate', require: ['customerId'] },
      { op: 'call-integration', integration: 'core', operation: 'getBalance', as: 'balance' },
    ],
    output: '{{ balance }}',
  };
}

const ref: ConfigArtifactRef = { tenantId: 'partnerco', kind: 'flow', slug: 'get-balance' };

describe('DrizzleConfigStore (pglite)', () => {
  it('appends draft versions and reports them newest-first', async () => {
    const { store } = await freshStore();
    expect(await store.saveDraft(ref, flowBody('v1'))).toBe(1);
    expect(await store.saveDraft(ref, flowBody('v2'))).toBe(2);
    expect(await store.getPublished(ref)).toBeNull();
    expect((await store.listVersions(ref)).map((v) => v.version)).toEqual([2, 1]);
  });

  it('publishes a version, keeps a single published pointer, and rolls back', async () => {
    const { store } = await freshStore();
    await store.saveDraft(ref, flowBody('v1'));
    await store.saveDraft(ref, flowBody('v2'));

    await store.publish(ref, 1);
    expect(await store.getPublished(ref)).toMatchObject({ name: 'v1' });

    await store.publish(ref, 2);
    expect(await store.getPublished(ref)).toMatchObject({ name: 'v2' });
    const versions = await store.listVersions(ref);
    expect(versions.find((v) => v.version === 2)?.status).toBe('published');
    expect(versions.find((v) => v.version === 1)?.status).toBe('draft');

    await store.publish(ref, 1); // rollback to an earlier version
    expect(await store.getPublished(ref)).toMatchObject({ name: 'v1' });
  });

  it('isolates tenants via RLS even on an unfiltered query', async () => {
    const { client, store } = await freshStore();
    await store.saveDraft({ tenantId: 'tenant-a', kind: 'flow', slug: 's' }, flowBody('a'));
    await store.saveDraft({ tenantId: 'tenant-b', kind: 'flow', slug: 's' }, flowBody('b'));

    // Superusers bypass RLS, so query as a plain role for the policies to apply —
    // the same posture the app uses against Supabase/Postgres.
    await client.exec(`
      CREATE ROLE app_user;
      GRANT USAGE ON SCHEMA public TO app_user;
      GRANT SELECT ON config_artifact, config_version TO app_user;
    `);

    const seenBy = async (tenant: string): Promise<string[]> => {
      await client.exec(
        `SELECT set_config('app.tenant_id', '${tenant}', false); SET ROLE app_user;`,
      );
      const res = await client.query<{ tenant_id: string }>(
        'SELECT tenant_id FROM config_artifact',
      );
      await client.exec('RESET ROLE');
      return res.rows.map((r) => r.tenant_id);
    };

    expect(await seenBy('tenant-a')).toEqual(['tenant-a']);
    expect(await seenBy('tenant-b')).toEqual(['tenant-b']);
  });
});

describe('publishFlowVersion (fail-closed)', () => {
  it('rejects an invalid draft and never flips the pointer', async () => {
    const { store } = await freshStore();
    const brokenRef: ConfigArtifactRef = { tenantId: 'partnerco', kind: 'flow', slug: 'broken' };
    await store.saveDraft(brokenRef, { id: 'broken', name: 'B', steps: [], output: '{{ x }}' });

    const outcome = await publishFlowVersion(store, brokenRef, 1);
    expect(outcome.published).toBe(false);
    expect(outcome.error).toBe('invalid_flow');
    expect(await store.getPublished(brokenRef)).toBeNull();
  });

  it('publishes a valid draft after schema + dry-run pass', async () => {
    const { store } = await freshStore();
    await store.saveDraft(ref, flowBody('ok'));
    const outcome = await publishFlowVersion(store, ref, 1);
    expect(outcome.published).toBe(true);
    expect(await store.getPublished(ref)).toMatchObject({ name: 'ok' });
  });
});
