import { describe, it, expect } from 'vitest';
import {
  getTenantConfig,
  hasTenant,
  registeredTenantSlugs,
} from '../infra/tenant/tenantConfigStore';

describe('tenantConfigStore', () => {
  it('resolves the registered partnerco descriptor', () => {
    const config = getTenantConfig('partnerco');
    expect(config?.slug).toBe('partnerco');
    expect(config?.dataSource).toBe('mock');
  });

  it('reports known and unknown tenants', () => {
    expect(hasTenant('partnerco')).toBe(true);
    expect(hasTenant('unknown')).toBe(false);
  });

  it('returns undefined for an unregistered slug', () => {
    expect(getTenantConfig('unknown')).toBeUndefined();
  });

  it('lists the registered slugs', () => {
    expect(registeredTenantSlugs()).toContain('partnerco');
  });
});
