import type {
  BuilderRole,
  ConfigArtifactKind,
  ConfigArtifactRef,
  IAuthz,
  IConfigStore,
} from '../../application/ports';
import { publishArtifactVersion } from '../../infra/store';

/** The handler's collaborators — injected so routes wire production singletons and tests stub them. */
export interface BuilderDeps {
  store: IConfigStore | null;
  authz: IAuthz;
}

const ARTIFACT_KINDS: readonly ConfigArtifactKind[] = [
  'flow',
  'integration',
  'screen',
  'event',
  'hook',
];

function json(status: number, body: unknown): Response {
  return Response.json(body, { status });
}

function fail(status: number, error: string, detail?: string): Response {
  return json(status, detail === undefined ? { error } : { error, detail });
}

function isKind(value: string | undefined): value is ConfigArtifactKind {
  return value !== undefined && (ARTIFACT_KINDS as readonly string[]).includes(value);
}

/** Parses a JSON object body; `undefined` for malformed, non-object, or array. */
async function parseObjectBody(request: Request): Promise<Record<string, unknown> | undefined> {
  try {
    const body: unknown = await request.json();
    return typeof body === 'object' && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

/** Authorizes for `required`, returning the caller's tenant or a short-circuit Response. */
async function authorize(
  authz: IAuthz,
  request: Request,
  required: BuilderRole,
): Promise<{ tenantId: string } | Response> {
  const result = await authz.authorize(request, required);
  if (!result.ok) {
    return fail(result.error === 'unauthenticated' ? 401 : 403, result.error);
  }
  return { tenantId: result.identity.tenantId };
}

/**
 * Builder admin API (ADR 0004 §2) — the surface the SPA drives, over `IConfigStore`.
 * Every route is gated by `IAuthz` (fail-closed) and **scoped to the caller's tenant**
 * from the verified session, never a client-supplied header. Reading needs `editor`;
 * saving a draft needs `editor`; publishing/rollback needs `publisher`. The BFF keeps
 * RLS, secret-refs and publish-validation server-side — the API stays thin.
 *
 *   GET  artifacts[?kind=]                      → list artifacts (summary)
 *   GET  artifacts/:kind/:slug/versions         → list versions (bodies included)
 *   GET  artifacts/:kind/:slug/published        → published body (404 if none)
 *   POST artifacts/:kind/:slug/versions  {body} → save draft → 201 { version }
 *   POST artifacts/:kind/:slug/publish   {version} → publish/rollback (fail-closed)
 */
export async function handleBuilderRequest(
  request: Request,
  segments: string[],
  deps: BuilderDeps,
): Promise<Response> {
  const { store, authz } = deps;
  if (store === null) return fail(503, 'store_unavailable');

  const { method } = request;

  if (method === 'GET' && segments.length === 1 && segments[0] === 'artifacts') {
    const gate = await authorize(authz, request, 'editor');
    if (gate instanceof Response) return gate;
    const kindParam = new URL(request.url).searchParams.get('kind');
    if (kindParam !== null && !isKind(kindParam)) return fail(400, 'invalid_kind');
    return json(200, await store.listArtifacts(gate.tenantId, kindParam ?? undefined));
  }

  if (segments[0] === 'artifacts' && segments.length === 4) {
    const [, kind, slug, action] = segments;
    if (!isKind(kind)) return fail(400, 'invalid_kind');
    if (slug === undefined || slug === '') return fail(400, 'invalid_slug');

    if (method === 'GET' && action === 'versions') {
      const gate = await authorize(authz, request, 'editor');
      if (gate instanceof Response) return gate;
      const ref: ConfigArtifactRef = { tenantId: gate.tenantId, kind, slug };
      const versions = await store.listVersions(ref);
      return json(
        200,
        versions.map(({ artifactId: _omit, ...rest }) => rest),
      );
    }

    if (method === 'GET' && action === 'published') {
      const gate = await authorize(authz, request, 'editor');
      if (gate instanceof Response) return gate;
      const body = await store.getPublished({ tenantId: gate.tenantId, kind, slug });
      return body === null ? fail(404, 'not_found') : json(200, body);
    }

    if (method === 'POST' && action === 'versions') {
      const gate = await authorize(authz, request, 'editor');
      if (gate instanceof Response) return gate;
      const body = await parseObjectBody(request);
      if (body === undefined) return fail(400, 'invalid_json');
      const version = await store.saveDraft({ tenantId: gate.tenantId, kind, slug }, body);
      return json(201, { version });
    }

    if (method === 'POST' && action === 'publish') {
      const gate = await authorize(authz, request, 'publisher');
      if (gate instanceof Response) return gate;
      const body = await parseObjectBody(request);
      const version = body?.version;
      if (typeof version !== 'number' || !Number.isInteger(version)) {
        return fail(400, 'invalid_version');
      }
      const ref: ConfigArtifactRef = { tenantId: gate.tenantId, kind, slug };
      const outcome = await publishArtifactVersion(store, ref, version);
      if (!outcome.published) {
        const status = outcome.error === 'version_not_found' ? 404 : 422;
        return fail(status, outcome.error ?? 'publish_failed', outcome.detail);
      }
      return json(200, { published: true, version });
    }
  }

  return fail(404, 'not_found');
}
