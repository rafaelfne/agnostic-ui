import { injectable } from 'tsyringe';
import type { TenantConfig } from '@yukilabs/agnostic-ui-core';
import type { ITenantConfigRepository } from '../../application/ports';
import { getTenantConfig } from './tenantConfigStore';

/** Adapter: resolves tenant descriptors from the in-memory store. */
@injectable()
export class TenantConfigRepository implements ITenantConfigRepository {
  async getBySlug(slug: string): Promise<TenantConfig | null> {
    return getTenantConfig(slug) ?? null;
  }
}
