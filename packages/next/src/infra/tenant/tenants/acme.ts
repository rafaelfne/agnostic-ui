import type { TenantConfig } from '@yukilabs/agnostic-ui-core';

/**
 * Second tenant descriptor (manual, Parte 3.1). A deliberately distinct theme
 * (dark canvas, emerald primary) from `partnerco` — proves multi-tenant theming
 * is descriptor-driven, not hard-coded.
 */
export const acme: TenantConfig = {
  id: 'acme',
  name: 'Acme Invest',
  slug: 'acme',
  dataSource: 'mock',
  theme: {
    primaryColor: '#0E9F6E',
    secondaryColor: '#F05252',
    accentColor: '#111827',
    backgroundColor: '#0B1120',
    logoUrl: '/imgs/acmelogo.png',
  },
  layout: {
    header: { showLogo: true, showTitle: true, title: 'Acme Invest' },
    appBar: { default: { sticky: true }, routes: { '/acme': { backBehavior: 'closeWebView' } } },
    navigation: { showAppbar: true },
  },
  security: { corsOrigins: [], ipAllowlist: [], requireAuth: true },
  features: { portfolios: true, intents: true, products: true },
  version: '0.0.1',
};
