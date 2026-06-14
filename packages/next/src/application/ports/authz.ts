/**
 * Port: authorization for the builder admin surface (ADR 0004 §3). Every
 * `/api/builder/*` route runs through this — it authenticates the request (a
 * Supabase Auth session) and authorizes it for a required capability, by role and
 * tenant. **Fail-closed:** no session, no role, or no auth configured → denied.
 * This is distinct from the runtime's customer-token resolution (sandbox marker /
 * customer JWT) — the builder is admin tooling, not the embedded experience.
 */
export type BuilderRole = 'editor' | 'publisher';

export interface AuthzIdentity {
  userId: string;
  /** The tenant the caller administers; every store operation is scoped to it. */
  tenantId: string;
  roles: readonly BuilderRole[];
}

export type AuthzError = 'unauthenticated' | 'forbidden';

export type AuthzResult = { ok: true; identity: AuthzIdentity } | { ok: false; error: AuthzError };

export interface IAuthz {
  /**
   * Authenticates the request and authorizes it for the `required` role. Returns
   * the caller's identity on success, or an error code (`unauthenticated` → 401,
   * `forbidden` → 403).
   */
  authorize(request: Request, required: BuilderRole): Promise<AuthzResult>;
}
