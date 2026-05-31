import { listTenants } from '../../infra/tenant/tenantConfigStore';

/**
 * Static params for the `[tenant]` route segment (manual, Parte 3.2): one entry
 * per registered tenant, so every tenant's screens prerender at build time.
 */
export function tenantRouteParams(): { tenant: string }[] {
  return listTenants().map((tenant) => ({ tenant: tenant.slug }));
}
