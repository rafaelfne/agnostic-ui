import type { TenantConfig } from '@yukilabs/agnostic-ui-core';

/**
 * Port: resolves a tenant descriptor from its slug (manual, Parte 2.3.1).
 * Implemented by infra/tenant/TenantConfigRepository.
 */
export interface ITenantConfigRepository {
  getBySlug(slug: string): Promise<TenantConfig | null>;
}
