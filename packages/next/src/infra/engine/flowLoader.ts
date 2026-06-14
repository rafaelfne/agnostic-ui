import type { FlowDefinitionInput } from '@yukilabs/agnostic-ui-engine';

import type { IConfigStore } from '../../application/ports';
import { getConfigStore } from '../store';

import { type FlowCache, TtlFlowCache } from './flowCache';
import { getFlow } from './flowRegistry';

export interface FlowLoader {
  load(tenantId: string, flowId: string): Promise<FlowDefinitionInput | null>;
}

export interface FlowLoaderDeps {
  store: IConfigStore | null;
  fallback: (flowId: string) => FlowDefinitionInput | undefined;
  cache?: FlowCache;
}

/**
 * Resolves the flow a request should run: the published version from the config
 * store (tenant-scoped via RLS, cached), falling back to the in-code registry when
 * the store has no published version or is not configured. The body is re-validated
 * by `runFlow`, so the store result is trusted here.
 */
export function createFlowLoader(deps: FlowLoaderDeps): FlowLoader {
  return {
    async load(tenantId, flowId) {
      const key = `${tenantId}:${flowId}`;
      const cached = deps.cache?.get(key);
      if (cached !== undefined) return cached;

      if (deps.store !== null) {
        const body = await deps.store.getPublished({ tenantId, kind: 'flow', slug: flowId });
        if (body !== null) {
          const flow = body as FlowDefinitionInput;
          deps.cache?.set(key, flow);
          return flow;
        }
      }
      return deps.fallback(flowId) ?? null;
    },
  };
}

const CACHE_TTL_MS = 30_000;
let singleton: FlowLoader | null = null;

/**
 * Process-wide loader. Store-backed when `DATABASE_URL` is set (the published flow
 * wins over the in-code registry); registry-only otherwise — keeping local/test
 * runs hermetic without a database.
 */
export function getFlowLoader(): FlowLoader {
  if (singleton !== null) return singleton;
  singleton = createFlowLoader({
    store: getConfigStore(),
    fallback: getFlow,
    cache: new TtlFlowCache(CACHE_TTL_MS),
  });
  return singleton;
}
