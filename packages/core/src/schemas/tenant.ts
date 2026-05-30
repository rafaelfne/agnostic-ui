import { z } from 'zod';

/** Where a tenant's data comes from: `mock` (sandbox) or `core` (real backend). */
export const TenantDataSourceSchema = z.enum(['mock', 'core']);
export type TenantDataSource = z.infer<typeof TenantDataSourceSchema>;

/** Colors and logo, applied as CSS vars in `:root` (manual §3.1/§3.3). */
export const TenantThemeSchema = z.object({
  primaryColor: z.string(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  logoUrl: z.string().optional(),
});
export type TenantTheme = z.infer<typeof TenantThemeSchema>;

export const TenantHeaderSchema = z.object({
  showLogo: z.boolean().optional(),
  showTitle: z.boolean().optional(),
  title: z.string().optional(),
});
export type TenantHeader = z.infer<typeof TenantHeaderSchema>;

/** Per-route app bar behavior (e.g. the back button closes the WebView). */
export const TenantAppBarRouteSchema = z.object({
  backBehavior: z.string().optional(),
});
export type TenantAppBarRoute = z.infer<typeof TenantAppBarRouteSchema>;

export const TenantAppBarSchema = z.object({
  default: z
    .object({
      sticky: z.boolean().optional(),
      frosted: z.boolean().optional(),
    })
    .optional(),
  routes: z.record(TenantAppBarRouteSchema).optional(),
});
export type TenantAppBar = z.infer<typeof TenantAppBarSchema>;

export const TenantNavigationSchema = z.object({
  showAppbar: z.boolean().optional(),
});
export type TenantNavigation = z.infer<typeof TenantNavigationSchema>;

export const TenantLayoutSchema = z.object({
  header: TenantHeaderSchema.optional(),
  appBar: TenantAppBarSchema.optional(),
  navigation: TenantNavigationSchema.optional(),
});
export type TenantLayout = z.infer<typeof TenantLayoutSchema>;

export const TenantSecuritySchema = z.object({
  corsOrigins: z.array(z.string()).optional(),
  ipAllowlist: z.array(z.string()).optional(),
  requireAuth: z.boolean().default(true),
});
export type TenantSecurity = z.infer<typeof TenantSecuritySchema>;

/** Declarative descriptor for a white-label tenant (manual §3.1). */
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
