import { describe, it, expect } from 'vitest';
import { TenantConfigSchema } from '../schemas/tenant';

const partnerco = {
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

describe('TenantConfigSchema', () => {
  it('validates the partnerco descriptor (manual §3.1)', () => {
    expect(TenantConfigSchema.safeParse(partnerco).success).toBe(true);
  });

  it('defaults requireAuth to true', () => {
    const parsed = TenantConfigSchema.parse({
      id: 'sample',
      name: 'Sample',
      slug: 'sample',
      dataSource: 'mock',
      security: {},
      version: '0.1.0',
    });
    expect(parsed.security?.requireAuth).toBe(true);
  });

  it('rejects an invalid dataSource', () => {
    expect(TenantConfigSchema.safeParse({ ...partnerco, dataSource: 'graphql' }).success).toBe(
      false,
    );
  });

  it('rejects a missing id', () => {
    const { id: _id, ...withoutId } = partnerco;
    expect(TenantConfigSchema.safeParse(withoutId).success).toBe(false);
  });

  it('rejects a theme without a primaryColor', () => {
    const { primaryColor: _omit, ...themeWithoutPrimary } = partnerco.theme;
    expect(TenantConfigSchema.safeParse({ ...partnerco, theme: themeWithoutPrimary }).success).toBe(
      false,
    );
  });
});
