export interface JwtPayload {
  sub?: string;
  [claim: string]: unknown;
}

function base64UrlToUtf8(segment: string): string {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  if (typeof atob === 'function') {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(padded, 'base64').toString('utf8');
}

/**
 * Decodes the payload segment of a JWT. This performs NO signature
 * verification — it only base64url-decodes and JSON-parses the claims.
 * Signature checks belong to the BFF hardening layer, not the core.
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const payloadSegment = parts[1];
  if (!payloadSegment) return null;
  try {
    const parsed: unknown = JSON.parse(base64UrlToUtf8(payloadSegment));
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed as JwtPayload;
  } catch {
    return null;
  }
}
