import { integer, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

/**
 * Append-only config store (ADR 0002 §4.1). An artifact (flow, integration,
 * screen, …) has N versions; "published" is a single pointer per artifact, so
 * rollback is just re-publishing an earlier version. The Drizzle schema mirrors
 * the SQL migrations in `drizzle/` — both are the source of truth and kept in sync.
 */
export const configArtifact = pgTable(
  'config_artifact',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: text('tenant_id').notNull(),
    kind: text('kind').notNull(),
    slug: text('slug').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('config_artifact_tenant_kind_slug_uq').on(t.tenantId, t.kind, t.slug)],
);

export const configVersion = pgTable(
  'config_version',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    artifactId: uuid('artifact_id')
      .notNull()
      .references(() => configArtifact.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    status: text('status').notNull(),
    body: jsonb('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (t) => [unique('config_version_artifact_version_uq').on(t.artifactId, t.version)],
);

export const storeSchema = { configArtifact, configVersion };
