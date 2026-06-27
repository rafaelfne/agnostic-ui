/**
 * Lê os papéis do builder (`app_metadata.builder_roles`) do access-token, **sem
 * verificar a assinatura** — é só UX (mostrar/ocultar o botão de publicar). O portão
 * real é server-side: a rota de publish exige o papel `publisher` (403 fail-closed),
 * então decodificar aqui nunca concede acesso, só reflete o que o servidor já enforça.
 */
function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  return atob(padded);
}

export function decodeBuilderRoles(token: string | null): string[] {
  if (token === null || token === '') return [];
  const parts = token.split('.');
  if (parts.length !== 3) return [];
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1] ?? '')) as {
      app_metadata?: { builder_roles?: unknown };
    };
    const roles = payload.app_metadata?.builder_roles;
    return Array.isArray(roles)
      ? roles.filter((role): role is string => typeof role === 'string')
      : [];
  } catch {
    return [];
  }
}

/** Publicar exige o papel `publisher` (espelha o gate server-side). */
export function canPublish(token: string | null): boolean {
  return decodeBuilderRoles(token).includes('publisher');
}
