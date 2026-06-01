/** Reads the requested tenant slug from the `x-tenant-id` header (empty if absent). */
export function resolveTenant(request: Request): string {
  return request.headers.get('x-tenant-id')?.trim() ?? '';
}
