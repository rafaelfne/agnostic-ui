import type { FlowDefinitionInput } from '@yukilabs/agnostic-ui-engine';
import { describe, expect, it, vi } from 'vitest';

import type { IConfigStore } from '../application/ports';
import { TtlFlowCache } from '../infra/engine/flowCache';
import { createFlowLoader } from '../infra/engine/flowLoader';

const flowBody = (name: string): FlowDefinitionInput => ({
  id: 'get-balance',
  name,
  steps: [{ op: 'validate', require: ['customerId'] }],
  output: '{{ customerId }}',
});

function fakeStore(getPublished: IConfigStore['getPublished']): IConfigStore {
  return {
    getPublished,
    saveDraft: async () => 1,
    publish: async () => undefined,
    listVersions: async () => [],
    listArtifacts: async () => [],
  };
}

describe('createFlowLoader', () => {
  it('loads the published flow from the store, scoped by tenant', async () => {
    const store = fakeStore(async (ref) =>
      ref.tenantId === 'partnerco' && ref.slug === 'get-balance' ? flowBody('published') : null,
    );
    const loader = createFlowLoader({ store, fallback: () => undefined });
    expect(await loader.load('partnerco', 'get-balance')).toMatchObject({ name: 'published' });
    expect(await loader.load('otherco', 'get-balance')).toBeNull();
  });

  it('falls back to the in-code registry when nothing is published', async () => {
    const store = fakeStore(async () => null);
    const loader = createFlowLoader({
      store,
      fallback: (id) => (id === 'get-balance' ? flowBody('incode') : undefined),
    });
    expect(await loader.load('partnerco', 'get-balance')).toMatchObject({ name: 'incode' });
  });

  it('uses the registry only when there is no store', async () => {
    const loader = createFlowLoader({
      store: null,
      fallback: (id) => (id === 'x' ? flowBody('incode') : undefined),
    });
    expect(await loader.load('t', 'x')).toMatchObject({ name: 'incode' });
    expect(await loader.load('t', 'missing')).toBeNull();
  });

  it('caches the store result until TTL expiry', async () => {
    let nowMs = 1000;
    const getPublished = vi.fn<IConfigStore['getPublished']>(async () => flowBody('v1'));
    const loader = createFlowLoader({
      store: fakeStore(getPublished),
      fallback: () => undefined,
      cache: new TtlFlowCache(100, () => nowMs),
    });

    await loader.load('t', 'get-balance');
    await loader.load('t', 'get-balance');
    expect(getPublished).toHaveBeenCalledTimes(1); // served from cache

    nowMs += 200; // past TTL
    await loader.load('t', 'get-balance');
    expect(getPublished).toHaveBeenCalledTimes(2); // re-fetched
  });
});
