import type {
  ArtifactKind,
  ArtifactSummary,
  ArtifactVersion,
  GraduationRequest,
  ProposeResult,
} from './types';

/** A non-2xx response from the builder API; carries the canonical `error` code. */
export class BuilderApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly detail?: string,
  ) {
    super(detail === undefined ? code : `${code}: ${detail}`);
    this.name = 'BuilderApiError';
  }
}

export interface BuilderClientConfig {
  /** Origin prefix; empty for same-origin (dev uses the Vite `/api` proxy). */
  baseUrl?: string;
  /** The current session access token, or `null` when signed out. */
  getToken: () => string | null;
  /** Injectable fetch (tests pass a stub); defaults to the global. */
  fetch?: typeof fetch;
}

export interface BuilderApiClient {
  listArtifacts(kind?: ArtifactKind): Promise<ArtifactSummary[]>;
  listVersions(kind: ArtifactKind, slug: string): Promise<ArtifactVersion[]>;
  /** The published body, or `null` when nothing is published for the artifact. */
  getPublished(kind: ArtifactKind, slug: string): Promise<unknown>;
  /** Appends a draft; resolves the new version number. */
  saveDraft(kind: ArtifactKind, slug: string, body: unknown): Promise<number>;
  /** Publishes (or rolls back to) `version`; rejects fail-closed on a broken draft. */
  publish(kind: ArtifactKind, slug: string, version: number): Promise<void>;
  /**
   * Asks the AI to propose a draft from a natural-language prompt (Frente I). Resolves
   * the {@link ProposeResult} when a draft was created (the AI never publishes);
   * rejects fail-closed (e.g. triage blocked, AI unavailable) without a draft.
   */
  propose(kind: ArtifactKind, slug: string, prompt: string): Promise<ProposeResult>;
  /**
   * Requests graduation of a proven operator extension to `core.*` (Fase J, etapa RFC).
   * Records the request as a draft of the core contract; rejects fail-closed (e.g. not
   * proven, not published) without a record.
   */
  graduate(slug: string): Promise<GraduationRequest>;
}

interface ApiErrorBody {
  error?: unknown;
  detail?: unknown;
}

/**
 * Typed client for the builder API (ADR 0004 §2). Every request carries the
 * session token as a Bearer header; the server authorizes and scopes by tenant.
 * Non-2xx responses become a {@link BuilderApiError} (carrying the status + code),
 * except `getPublished`, where 404 means "nothing published yet" → `null`.
 */
export function createBuilderClient(config: BuilderClientConfig): BuilderApiClient {
  const doFetch = config.fetch ?? fetch;
  const base = config.baseUrl ?? '';
  const enc = encodeURIComponent;

  async function request(method: string, path: string, body?: unknown): Promise<Response> {
    const headers: Record<string, string> = {};
    const token = config.getToken();
    if (token !== null) headers.authorization = `Bearer ${token}`;
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      headers['content-type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    return doFetch(`${base}/api/builder/${path}`, init);
  }

  async function fail(res: Response): Promise<never> {
    let code = 'request_failed';
    let detail: string | undefined;
    try {
      const data = (await res.json()) as ApiErrorBody;
      if (typeof data.error === 'string') code = data.error;
      if (typeof data.detail === 'string') detail = data.detail;
    } catch {
      // non-JSON body — keep the generic code
    }
    throw new BuilderApiError(res.status, code, detail);
  }

  return {
    async listArtifacts(kind) {
      const query = kind === undefined ? '' : `?kind=${enc(kind)}`;
      const res = await request('GET', `artifacts${query}`);
      if (!res.ok) return fail(res);
      return (await res.json()) as ArtifactSummary[];
    },

    async listVersions(kind, slug) {
      const res = await request('GET', `artifacts/${kind}/${enc(slug)}/versions`);
      if (!res.ok) return fail(res);
      return (await res.json()) as ArtifactVersion[];
    },

    async getPublished(kind, slug) {
      const res = await request('GET', `artifacts/${kind}/${enc(slug)}/published`);
      if (res.status === 404) return null;
      if (!res.ok) return fail(res);
      return res.json();
    },

    async saveDraft(kind, slug, body) {
      const res = await request('POST', `artifacts/${kind}/${enc(slug)}/versions`, body);
      if (!res.ok) return fail(res);
      const data = (await res.json()) as { version: number };
      return data.version;
    },

    async publish(kind, slug, version) {
      const res = await request('POST', `artifacts/${kind}/${enc(slug)}/publish`, { version });
      if (!res.ok) return fail(res);
    },

    async propose(kind, slug, prompt) {
      const res = await request('POST', `artifacts/${kind}/${enc(slug)}/propose`, { prompt });
      if (!res.ok) return fail(res);
      return (await res.json()) as ProposeResult;
    },

    async graduate(slug) {
      const res = await request('POST', `artifacts/operator/${enc(slug)}/graduate`, {});
      if (!res.ok) return fail(res);
      return (await res.json()) as GraduationRequest;
    },
  };
}
