import { type APIRequestContext, request } from '@playwright/test';

import { BFF_URL, SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

/** Usuários seedados pelo `pnpm setup:local` (provision-local.ts). Senha compartilhada. */
export const SEED = {
  publisher: { email: 'admin@partnerco.com', password: 'builder-local-123', tenant: 'partnerco' },
  editor: { email: 'editor@partnerco.com', password: 'builder-local-123', tenant: 'partnerco' },
  acme: { email: 'admin@acme.com', password: 'builder-local-123', tenant: 'acme' },
} as const;

/** Login GoTrue (Supabase Auth) → access_token JWT com app_metadata.{tenant_id, builder_roles}. */
export async function getToken(email: string, password: string): Promise<string> {
  const ctx = await request.newContext();
  const res = await ctx.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: SUPABASE_ANON_KEY, 'content-type': 'application/json' },
    data: { email, password },
  });
  if (!res.ok()) throw new Error(`login ${email} falhou: ${res.status()} ${await res.text()}`);
  const body = (await res.json()) as { access_token?: string };
  await ctx.dispose();
  if (!body.access_token) throw new Error(`login ${email}: sem access_token`);
  return body.access_token;
}

/** Contexto API contra o BFF, com Bearer opcional (builder API + runtime). */
export function bffContext(token?: string): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: BFF_URL,
    extraHTTPHeaders: token ? { authorization: `Bearer ${token}` } : {},
  });
}
