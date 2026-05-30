import { describe, it, expect } from 'vitest';
import { TenantConfigSchema } from '../schemas/tenant';

const partnerco = {
  id: 'partnerco',
  name: 'Partner Co',
  slug: 'partner-co',
  dataSource: 'core',
  theme: {
    colors: { primary: '#0055ff', background: '#ffffff' },
    radii: { md: '8px' },
  },
  layout: { density: 'comfortable', navigation: 'tabs' },
  security: { allowedOrigins: ['https://partner.co'], requireSignedTokens: true },
  features: { sandboxBanner: true, pullToRefresh: true },
  version: '1.0.0',
};

describe('TenantConfigSchema', () => {
  it('validates the partnerco descriptor', () => {
    expect(TenantConfigSchema.safeParse(partnerco).success).toBe(true);
  });

  it('defaults requireSignedTokens to true', () => {
    const parsed = TenantConfigSchema.parse({
      id: 'sample',
      name: 'Sample',
      slug: 'sample',
      dataSource: 'mock',
      security: {},
      version: '0.1.0',
    });
    expect(parsed.security?.requireSignedTokens).toBe(true);
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
});
