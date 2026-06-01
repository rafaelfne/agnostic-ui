/** Extracts the token from an `Authorization: Bearer <token>` header (empty if absent). */
export function extractBearerToken(request: Request): string {
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() ?? '';
}
