import type { TenantConfig } from '@yukilabs/agnostic-ui-core';

/** Example tenant descriptor (manual, Parte 3.1). Source of truth for `partnerco`. */
export const partnerco: TenantConfig = {
  id: 'partnerco',
  name: 'Partner Co',
  slug: 'partnerco',
  dataSource: 'mock',
  theme: {
    primaryColor: '#1A56DB',
    secondaryColor: '#9333EA',
    accentColor: '#FFFFFF',
    backgroundColor: '#F5F5F5',
    logoUrl: '/imgs/partnerlogo.png',
  },
  layout: {
    header: { showLogo: false, showTitle: false, title: 'Partner Co' },
    appBar: { default: {}, routes: { '/partnerco': { backBehavior: 'closeWebView' } } },
    navigation: { showAppbar: true },
  },
  security: { corsOrigins: [], ipAllowlist: [], requireAuth: true },
  features: { portfolios: true, intents: true, products: true },
  version: '0.0.1',
};
