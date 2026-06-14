import { and, desc, eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type {
  ConfigArtifactKind,
  ConfigArtifactRef,
  ConfigArtifactSummary,
  ConfigVersionRecord,
  ConfigVersionStatus,
  IConfigStore,
} from '../../application/ports';

import { configArtifact, configVersion, storeSchema } from './schema';

/**
 * The adapter is typed on the production (postgres-js) database; tests pass a
 * pglite-backed Drizzle instance, which is runtime-compatible (same Drizzle API,
 * real Postgres engine).
 */
export type ConfigDatabase = PostgresJsDatabase<typeof storeSchema>;
type ConfigTx = Parameters<Parameters<ConfigDatabase['transaction']>[0]>[0];

export class DrizzleConfigStore implements IConfigStore {
  constructor(private readonly db: ConfigDatabase) {}

  /**
   * Runs the work in a transaction that sets `app.tenant_id` locally — this is
   * what activates RLS for the tenant. Every store operation is tenant-scoped.
   */
  private withTenant<T>(tenantId: string, fn: (tx: ConfigTx) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
      return fn(tx);
    });
  }

  private async findArtifactId(tx: ConfigTx, ref: ConfigArtifactRef): Promise<string | null> {
    const rows = await tx
      .select({ id: configArtifact.id })
      .from(configArtifact)
      .where(
        and(
          eq(configArtifact.tenantId, ref.tenantId),
          eq(configArtifact.kind, ref.kind),
          eq(configArtifact.slug, ref.slug),
        ),
      )
      .limit(1);
    return rows[0]?.id ?? null;
  }

  async getPublished(ref: ConfigArtifactRef): Promise<unknown | null> {
    return this.withTenant(ref.tenantId, async (tx) => {
      const rows = await tx
        .select({ body: configVersion.body })
        .from(configVersion)
        .innerJoin(configArtifact, eq(configVersion.artifactId, configArtifact.id))
        .where(
          and(
            eq(configArtifact.tenantId, ref.tenantId),
            eq(configArtifact.kind, ref.kind),
            eq(configArtifact.slug, ref.slug),
            eq(configVersion.status, 'published'),
          ),
        )
        .limit(1);
      return rows[0]?.body ?? null;
    });
  }

  async saveDraft(ref: ConfigArtifactRef, body: unknown): Promise<number> {
    return this.withTenant(ref.tenantId, async (tx) => {
      let artifactId = await this.findArtifactId(tx, ref);
      if (artifactId === null) {
        const created = await tx
          .insert(configArtifact)
          .values({ tenantId: ref.tenantId, kind: ref.kind, slug: ref.slug })
          .returning({ id: configArtifact.id });
        artifactId = created[0]!.id;
      }
      const maxRows = await tx
        .select({ max: sql<number | null>`max(${configVersion.version})` })
        .from(configVersion)
        .where(eq(configVersion.artifactId, artifactId));
      const currentMax = maxRows[0]?.max;
      const version =
        (currentMax === null || currentMax === undefined ? 0 : Number(currentMax)) + 1;
      await tx.insert(configVersion).values({ artifactId, version, status: 'draft', body });
      return version;
    });
  }

  async publish(ref: ConfigArtifactRef, version: number): Promise<void> {
    await this.withTenant(ref.tenantId, async (tx) => {
      const artifactId = await this.findArtifactId(tx, ref);
      if (artifactId === null) throw new Error('artifact_not_found');

      // Demote the current published version, then promote the target — keeps the
      // "one published per artifact" invariant satisfied at every step.
      await tx
        .update(configVersion)
        .set({ status: 'draft', publishedAt: null })
        .where(
          and(eq(configVersion.artifactId, artifactId), eq(configVersion.status, 'published')),
        );

      const promoted = await tx
        .update(configVersion)
        .set({ status: 'published', publishedAt: new Date() })
        .where(and(eq(configVersion.artifactId, artifactId), eq(configVersion.version, version)))
        .returning({ id: configVersion.id });
      if (promoted.length === 0) throw new Error('version_not_found');
    });
  }

  async listArtifacts(
    tenantId: string,
    kind?: ConfigArtifactKind,
  ): Promise<ConfigArtifactSummary[]> {
    return this.withTenant(tenantId, async (tx) => {
      const rows = await tx
        .select({
          kind: configArtifact.kind,
          slug: configArtifact.slug,
          createdAt: configArtifact.createdAt,
          latestVersion: sql<number>`coalesce(max(${configVersion.version}), 0)`,
          publishedVersion: sql<
            number | null
          >`max(${configVersion.version}) filter (where ${configVersion.status} = 'published')`,
        })
        .from(configArtifact)
        .leftJoin(configVersion, eq(configVersion.artifactId, configArtifact.id))
        .where(
          kind === undefined
            ? eq(configArtifact.tenantId, tenantId)
            : and(eq(configArtifact.tenantId, tenantId), eq(configArtifact.kind, kind)),
        )
        .groupBy(
          configArtifact.id,
          configArtifact.kind,
          configArtifact.slug,
          configArtifact.createdAt,
        )
        .orderBy(configArtifact.kind, configArtifact.slug);
      return rows.map((row) => ({
        kind: row.kind as ConfigArtifactKind,
        slug: row.slug,
        createdAt: row.createdAt,
        latestVersion: Number(row.latestVersion),
        publishedVersion: row.publishedVersion === null ? null : Number(row.publishedVersion),
      }));
    });
  }

  async listVersions(ref: ConfigArtifactRef): Promise<ConfigVersionRecord[]> {
    return this.withTenant(ref.tenantId, async (tx) => {
      const artifactId = await this.findArtifactId(tx, ref);
      if (artifactId === null) return [];
      const rows = await tx
        .select()
        .from(configVersion)
        .where(eq(configVersion.artifactId, artifactId))
        .orderBy(desc(configVersion.version));
      return rows.map((row) => ({
        artifactId: row.artifactId,
        version: row.version,
        status: row.status as ConfigVersionStatus,
        body: row.body,
        createdAt: row.createdAt,
        publishedAt: row.publishedAt,
      }));
    });
  }
}
