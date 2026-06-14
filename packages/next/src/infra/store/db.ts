import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import type { ConfigDatabase } from './DrizzleConfigStore';
import { storeSchema } from './schema';

/**
 * Creates the production config database (Supabase/Postgres via the `postgres`
 * driver). Migrations in `drizzle/` are applied out-of-band (supabase db push /
 * psql). The store is reachable in any Postgres — Supabase hosted, local Docker,
 * or bare — keeping the decision reversible (ADR 0002 §4).
 */
export function createConfigDatabase(connectionString: string): ConfigDatabase {
  const client = postgres(connectionString);
  return drizzle(client, { schema: storeSchema });
}
