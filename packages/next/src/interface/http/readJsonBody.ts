/**
 * Reads a POST JSON body defensively (manual, Parte 2.5). A malformed or empty
 * body resolves to `{}` rather than throwing, so the Zod schema reports the
 * missing fields as a 422 (client error) instead of bubbling up to a 500.
 */
export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
