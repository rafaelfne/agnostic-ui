export interface GoTrueConfig {
  url: string;
  anonKey: string;
  /** Injectable fetch (tests pass a stub); defaults to the global. */
  fetch?: typeof fetch;
}

export interface Session {
  accessToken: string;
  /** Unix seconds when the token expires, when the server reports it. */
  expiresAt?: number;
}

/** A failed sign-in; carries the HTTP status from GoTrue. */
export class AuthError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

interface TokenResponse {
  access_token?: unknown;
  expires_at?: unknown;
  error_description?: unknown;
  msg?: unknown;
}

/**
 * Email/password sign-in against Supabase Auth (GoTrue) **directly over REST**,
 * no SDK — keeps the SPA dependency-light (ADR 0004 §1). The returned access token
 * is the JWT the BFF verifies (`SupabaseAuthz`); the anon key is public by design.
 */
export async function signInWithPassword(
  config: GoTrueConfig,
  email: string,
  password: string,
): Promise<Session> {
  const doFetch = config.fetch ?? fetch;
  const res = await doFetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: config.anonKey, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || typeof data.access_token !== 'string') {
    const message =
      typeof data.error_description === 'string'
        ? data.error_description
        : typeof data.msg === 'string'
          ? data.msg
          : 'Falha na autenticação';
    throw new AuthError(res.status, message);
  }

  return {
    accessToken: data.access_token,
    expiresAt: typeof data.expires_at === 'number' ? data.expires_at : undefined,
  };
}
