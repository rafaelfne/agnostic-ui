import type { TenantConfig } from '@yukilabs/agnostic-ui-core';
import { partnerco } from './tenants/partnerco';

/**
 * In-memory registry of tenant descriptors (manual, Parte 2.4.4). Resolves a
 * descriptor by slug and answers whether a slug is registered (used by the
 * resolver's `assertTenantExists`). F5 swaps this for a config-backed source.
 */
const registry = new Map<string, TenantConfig>([[partnerco.slug, partnerco]]);

export function getTenantConfig(slug: string): TenantConfig | undefined {
  return registry.get(slug);
}

export function hasTenant(slug: string): boolean {
  return registry.has(slug);
}

export function registeredTenantSlugs(): readonly string[] {
  return [...registry.keys()];
}
