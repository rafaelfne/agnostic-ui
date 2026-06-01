import { getTenantConfig } from '../../../infra/tenant/tenantConfigStore';

/** Tenant home screen (server placeholder). SDUI screens land in the react package. */
export default async function TenantHomePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;
  const config = getTenantConfig(tenant);
  return (
    <main>
      <h1>{config?.name}</h1>
      <p>Tenant home · server placeholder.</p>
    </main>
  );
}
