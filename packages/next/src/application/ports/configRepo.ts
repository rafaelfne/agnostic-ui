/**
 * Port: access to configuration by key, including per-tenant settings
 * (manual, Parte 2.3.1).
 */
export interface IConfigRepo {
  get(key: string): Promise<string | undefined>;
  getForTenant(tenantId: string, key: string): Promise<string | undefined>;
}
