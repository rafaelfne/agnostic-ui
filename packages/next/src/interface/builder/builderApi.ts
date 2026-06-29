import {
  OperatorContractSchema,
  contractRefToString,
  graduateContract,
} from '@yukilabs/agnostic-ui-core';

import type {
  BuilderRole,
  ConfigArtifactKind,
  ConfigArtifactRef,
  IAuthz,
  IConfigStore,
  ILlm,
} from '../../application/ports';
import { publishArtifactVersion } from '../../infra/store';

import { proposeArtifactVersion } from './proposeArtifact';

/** The handler's collaborators — injected so routes wire production singletons and tests stub them. */
export interface BuilderDeps {
  store: IConfigStore | null;
  authz: IAuthz;
  llm: ILlm | null;
}

const ARTIFACT_KINDS: readonly ConfigArtifactKind[] = [
  'flow',
  'integration',
  'screen',
  'event',
  'hook',
  'operator',
  'component',
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
 *   POST artifacts/:kind/:slug/versions  {body}   → save draft → 201 { version }
 *   POST artifacts/:kind/:slug/publish   {version} → publish/rollback (fail-closed)
 *   POST artifacts/:kind/:slug/propose   {prompt}  → IA gera draft + valida sem publicar
 *   POST artifacts/operator/:slug/graduate         → registra pedido de graduação (RFC, publisher)
 */
export async function handleBuilderRequest(
  request: Request,
  segments: string[],
  deps: BuilderDeps,
): Promise<Response> {
  const { store, authz, llm } = deps;
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

    if (method === 'POST' && action === 'propose') {
      const gate = await authorize(authz, request, 'editor');
      if (gate instanceof Response) return gate;
      if (llm === null) return fail(503, 'llm_unavailable');
      const body = await parseObjectBody(request);
      const prompt = body?.prompt;
      if (typeof prompt !== 'string' || prompt.trim() === '') return fail(400, 'invalid_prompt');
      const ref: ConfigArtifactRef = { tenantId: gate.tenantId, kind, slug };
      const outcome = await proposeArtifactVersion(store, llm, ref, prompt);
      if (!outcome.proposed) return fail(422, outcome.error ?? 'propose_failed', outcome.rationale);
      return json(201, {
        version: outcome.version,
        valid: outcome.validation?.valid ?? false,
        error: outcome.validation?.error,
        detail: outcome.validation?.detail,
        resolution: outcome.triage?.resolution,
        rationale: outcome.rationale,
      });
    }

    if (method === 'POST' && action === 'graduate') {
      const gate = await authorize(authz, request, 'publisher');
      if (gate instanceof Response) return gate;
      if (kind !== 'operator') return fail(400, 'graduation_unsupported_kind');
      const ref: ConfigArtifactRef = { tenantId: gate.tenantId, kind, slug };
      const published = await store.getPublished(ref);
      if (published === null) return fail(422, 'not_published');
      const parsed = OperatorContractSchema.safeParse(published);
      if (!parsed.success) return fail(422, 'invalid_artifact', parsed.error.message);
      // RFC → graduate (J.4): só `proven` gradua (fail-closed, via J.1). O pedido é
      // gravado como DRAFT do contrato `core.*` — visível, mas o tenant não consegue
      // publicá-lo (o anti-spoof do J.3 barra `namespace 'core' !== tenant`): a promoção
      // final ao core é ação da plataforma.
      const result = graduateContract(parsed.data);
      if (!result.graduated) return fail(422, `graduation_${result.reason}`);
      const graduatedRef = contractRefToString(result.contract.ref);

      // Idempotente: se o último draft já É o contrato graduado, devolve-o (não empilha
      // pedidos duplicados a cada clique).
      const versions = await store.listVersions(ref);
      const latest = versions.reduce<(typeof versions)[number] | undefined>(
        (max, candidate) =>
          max === undefined || candidate.version > max.version ? candidate : max,
        undefined,
      );
      const latestRef = (latest?.body as { ref?: typeof result.contract.ref } | undefined)?.ref;
      if (
        latest !== undefined &&
        latestRef?.namespace === result.contract.ref.namespace &&
        latestRef.name === result.contract.ref.name &&
        latestRef.version === result.contract.ref.version
      ) {
        return json(200, { requested: true, version: latest.version, ref: graduatedRef });
      }

      const version = await store.saveDraft(ref, result.contract);
      return json(201, { requested: true, version, ref: graduatedRef });
    }
  }

  return fail(404, 'not_found');
}
