import { hasTenant } from '../tenant/tenantConfigStore';
import { SandboxResolutionError } from './httpError';

/** Throws `unknown_tenant` when the slug is not in the tenant registry. */
export function assertTenantExists(slug: string): void {
  if (!hasTenant(slug)) {
    throw new SandboxResolutionError('unknown_tenant');
  }
}
