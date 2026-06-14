import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Ordered migration files, versioned in `packages/next/drizzle/`. */
export const MIGRATION_FILES = ['0000_init.sql', '0001_rls.sql'] as const;

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../drizzle');

/**
 * Applies the schema + RLS migrations in order. `exec` runs a multi-statement SQL
 * string — `pglite.exec` in tests, or `postgres`' `sql.unsafe` in a real DB. The
 * SQL files are the deploy artifact (usable by `supabase db push` / psql).
 */
export async function applyMigrations(exec: (sql: string) => Promise<unknown>): Promise<void> {
  for (const file of MIGRATION_FILES) {
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    await exec(sql);
  }
}
