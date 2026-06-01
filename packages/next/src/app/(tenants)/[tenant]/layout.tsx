import type { CSSProperties, ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { getTenantConfig } from '../../../infra/tenant/tenantConfigStore';
import { tenantRouteParams } from '../../../interface/tenant/tenantRouteParams';
import { tenantThemeCssVars } from '../../../interface/tenant/tenantThemeVars';

export function generateStaticParams() {
  return tenantRouteParams();
}

/**
 * Per-tenant route segment layout (manual, Parte 3.2/3.4). Resolves the tenant
 * descriptor by slug and 404s an unknown tenant before any screen renders. The
 * `(tenants)` route group is organizational — it never appears in the URL, so
 * the path is `/{slug}`, `/{slug}/invest`, etc. Server-side theming wraps this
 * subtree in F5.3; the interactive app bar lands in the react package (Fase 2).
 */
export default async function TenantSegmentLayout({
  params,
  children,
}: {
  params: Promise<{ tenant: string }>;
  children: ReactNode;
}) {
  const { tenant } = await params;
  const config = getTenantConfig(tenant);
  if (!config) {
    notFound();
  }
  return (
    <div data-tenant={config.slug} style={tenantThemeCssVars(config.theme) as CSSProperties}>
      {children}
    </div>
  );
}
