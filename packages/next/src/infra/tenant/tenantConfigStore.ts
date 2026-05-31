import type { TenantConfig } from '@yukilabs/agnostic-ui-core';
import { tenantDescriptors } from './tenants';

/**
 * In-memory registry of tenant descriptors (manual, Parte 3.1), built from the
 * config-backed `tenants/` modules. Resolves a descriptor by slug, answers
 * whether a slug is registered (used by the resolver's `assertTenantExists`),
 * and enumerates tenants for per-tenant route segments.
 */
const registry = new Map<string, TenantConfig>(
  tenantDescriptors.map((tenant) => [tenant.slug, tenant]),
);

export function getTenantConfig(slug: string): TenantConfig | undefined {
  return registry.get(slug);
}

export function hasTenant(slug: string): boolean {
  return registry.has(slug);
}

/** Every registered tenant descriptor — drives the `[tenant]` route segments. */
export function listTenants(): readonly TenantConfig[] {
  return [...registry.values()];
}

export function registeredTenantSlugs(): readonly string[] {
  return [...registry.keys()];
}
