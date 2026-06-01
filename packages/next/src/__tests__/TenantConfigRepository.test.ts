import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { TenantConfigRepository } from '../infra/tenant/TenantConfigRepository';

describe('TenantConfigRepository', () => {
  const repository = new TenantConfigRepository();

  it('resolves each registered tenant by slug', async () => {
    expect((await repository.getBySlug('partnerco'))?.slug).toBe('partnerco');
    expect((await repository.getBySlug('acme'))?.slug).toBe('acme');
  });

  it('returns null for an unknown tenant', async () => {
    expect(await repository.getBySlug('unknown')).toBeNull();
  });
});
