import { describe, it, expect } from 'vitest';
import {
  getTenantConfig,
  hasTenant,
  listTenants,
  registeredTenantSlugs,
} from '../infra/tenant/tenantConfigStore';

describe('tenantConfigStore', () => {
  it('resolves each registered descriptor by slug', () => {
    expect(getTenantConfig('partnerco')?.dataSource).toBe('mock');
    expect(getTenantConfig('acme')?.name).toBe('Acme Invest');
  });

  it('keeps tenant themes distinct (proves descriptor-driven theming)', () => {
    expect(getTenantConfig('partnerco')?.theme?.primaryColor).toBe('#1A56DB');
    expect(getTenantConfig('acme')?.theme?.primaryColor).toBe('#0E9F6E');
  });

  it('reports known and unknown tenants', () => {
    expect(hasTenant('partnerco')).toBe(true);
    expect(hasTenant('acme')).toBe(true);
    expect(hasTenant('unknown')).toBe(false);
  });

  it('returns undefined for an unregistered slug', () => {
    expect(getTenantConfig('unknown')).toBeUndefined();
  });

  it('enumerates every registered tenant', () => {
    expect(listTenants().map((tenant) => tenant.slug)).toEqual(['partnerco', 'acme']);
    expect(registeredTenantSlugs()).toEqual(['partnerco', 'acme']);
  });
});
