import type { IConfigStore } from '../../application/ports';

import { DrizzleConfigStore } from './DrizzleConfigStore';
import { createConfigDatabase } from './db';

let resolved = false;
let store: IConfigStore | null = null;

/**
 * Process-wide config store: store-backed when `DATABASE_URL` is set, `null`
 * otherwise. The builder API and the flow loader share this single instance (one
 * connection pool); the builder treats `null` as "persistence unavailable".
 */
export function getConfigStore(): IConfigStore | null {
  if (!resolved) {
    const url = process.env.DATABASE_URL;
    store =
      url !== undefined && url !== '' ? new DrizzleConfigStore(createConfigDatabase(url)) : null;
    resolved = true;
  }
  return store;
}
