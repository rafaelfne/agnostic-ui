import { z } from 'zod';

/** Where a tenant's data comes from: `mock` (sandbox) or `core` (real backend). */
export const TenantDataSourceSchema = z.enum(['mock', 'core']);
export type TenantDataSource = z.infer<typeof TenantDataSourceSchema>;

export const TenantThemeSchema = z.object({
  colors: z.record(z.string()).optional(),
  typography: z.record(z.string()).optional(),
  radii: z.record(z.string()).optional(),
});
export type TenantTheme = z.infer<typeof TenantThemeSchema>;

export const TenantLayoutSchema = z.object({
  density: z.enum(['comfortable', 'compact']).optional(),
  navigation: z.enum(['tabs', 'stack', 'drawer']).optional(),
});
export type TenantLayout = z.infer<typeof TenantLayoutSchema>;

export const TenantSecuritySchema = z.object({
  allowedOrigins: z.array(z.string()).optional(),
  requireSignedTokens: z.boolean().default(true),
});
export type TenantSecurity = z.infer<typeof TenantSecuritySchema>;

/** Declarative descriptor for a white-label tenant. */
export const TenantConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  dataSource: TenantDataSourceSchema,
  theme: TenantThemeSchema.optional(),
  layout: TenantLayoutSchema.optional(),
  security: TenantSecuritySchema.optional(),
  features: z.record(z.boolean()).optional(),
  version: z.string(),
});
export type TenantConfig = z.infer<typeof TenantConfigSchema>;
