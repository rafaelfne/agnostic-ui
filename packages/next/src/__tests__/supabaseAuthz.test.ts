import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';

import type { BuilderRole } from '../application/ports';
import {
  type SupabaseAuthEnv,
  SupabaseAuthz,
  type TokenVerifier,
  createSupabaseVerifier,
} from '../infra/authz/SupabaseAuthz';

function bearer(token: string): Request {
  return new Request('https://bff.test/api/builder/artifacts', {
    headers: { authorization: `Bearer ${token}` },
  });
}

/** A verifier that returns a fixed payload for the literal token "ok", else null. */
function stub(payload: Record<string, unknown>): TokenVerifier {
  return async (token) => (token === 'ok' ? payload : null);
}

describe('SupabaseAuthz (claim mapping + role check)', () => {
  const identity = {
    sub: 'user-1',
    app_metadata: { tenant_id: 'partnerco', builder_roles: ['editor'] },
  };

  it('rejects a request without a bearer token (unauthenticated)', async () => {
    const authz = new SupabaseAuthz(stub(identity));
    const res = await authz.authorize(
      new Request('https://bff.test/api/builder/artifacts'),
      'editor',
    );
    expect(res).toEqual({ ok: false, error: 'unauthenticated' });
  });

  it('rejects an unverifiable token (unauthenticated)', async () => {
    const authz = new SupabaseAuthz(stub(identity));
    expect(await authz.authorize(bearer('tampered'), 'editor')).toEqual({
      ok: false,
      error: 'unauthenticated',
    });
  });

  it('rejects a verified token with no subject (unauthenticated)', async () => {
    const authz = new SupabaseAuthz(stub({ app_metadata: identity.app_metadata }));
    expect(await authz.authorize(bearer('ok'), 'editor')).toEqual({
      ok: false,
      error: 'unauthenticated',
    });
  });

  it('forbids an authenticated user with no tenant or roles', async () => {
    const noTenant = new SupabaseAuthz(
      stub({ sub: 'u', app_metadata: { builder_roles: ['editor'] } }),
    );
    expect(await noTenant.authorize(bearer('ok'), 'editor')).toEqual({
      ok: false,
      error: 'forbidden',
    });

    const noRoles = new SupabaseAuthz(stub({ sub: 'u', app_metadata: { tenant_id: 'partnerco' } }));
    expect(await noRoles.authorize(bearer('ok'), 'editor')).toEqual({
      ok: false,
      error: 'forbidden',
    });
  });

  it('ignores unknown role strings in the claim', async () => {
    const authz = new SupabaseAuthz(
      stub({
        sub: 'u',
        app_metadata: { tenant_id: 'partnerco', builder_roles: ['admin', 'root'] },
      }),
    );
    expect(await authz.authorize(bearer('ok'), 'editor')).toEqual({
      ok: false,
      error: 'forbidden',
    });
  });

  it('authorizes an editor and returns the identity from admin claims', async () => {
    const authz = new SupabaseAuthz(stub(identity));
    expect(await authz.authorize(bearer('ok'), 'editor')).toEqual({
      ok: true,
      identity: { userId: 'user-1', tenantId: 'partnerco', roles: ['editor'] },
    });
  });

  it('forbids an editor from a publisher-only action', async () => {
    const authz = new SupabaseAuthz(stub(identity));
    expect(await authz.authorize(bearer('ok'), 'publisher')).toEqual({
      ok: false,
      error: 'forbidden',
    });
  });

  it('lets a publisher act as editor and publish (role hierarchy)', async () => {
    const pub = {
      sub: 'u',
      app_metadata: { tenant_id: 'partnerco', builder_roles: ['publisher'] },
    };
    const authz = new SupabaseAuthz(stub(pub));
    for (const role of ['editor', 'publisher'] as BuilderRole[]) {
      expect((await authz.authorize(bearer('ok'), role)).ok).toBe(true);
    }
  });
});

describe('createSupabaseVerifier (jose, fail-closed)', () => {
  const secret = 'test-supabase-jwt-secret-which-is-long-enough';
  const env: SupabaseAuthEnv = { SUPABASE_JWT_SECRET: secret };

  const sign = (claims: Record<string, unknown>, opts?: { expSecondsFromNow?: number }) => {
    const jwt = new SignJWT(claims).setProtectedHeader({ alg: 'HS256' }).setIssuedAt();
    if (opts?.expSecondsFromNow !== undefined) {
      jwt.setExpirationTime(Math.floor(Date.now() / 1000) + opts.expSecondsFromNow);
    }
    return jwt.sign(new TextEncoder().encode(secret));
  };

  it('verifies an HS256 token signed with the configured secret', async () => {
    const verify = createSupabaseVerifier(env);
    const token = await sign({
      sub: 'u',
      app_metadata: { tenant_id: 't', builder_roles: ['editor'] },
    });
    const authz = new SupabaseAuthz(verify);
    expect((await authz.authorize(bearer(token), 'editor')).ok).toBe(true);
  });

  it('rejects a token signed with a different secret', async () => {
    const verify = createSupabaseVerifier(env);
    const forged = await new SignJWT({
      sub: 'u',
      app_metadata: { tenant_id: 't', builder_roles: ['publisher'] },
    })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(new TextEncoder().encode('a-different-secret-of-sufficient-length'));
    expect(await verify(forged)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const verify = createSupabaseVerifier(env);
    const expired = await sign({ sub: 'u' }, { expSecondsFromNow: -10 });
    expect(await verify(expired)).toBeNull();
  });

  it('rejects every token when no key is configured (opt-in/fail-closed)', async () => {
    const verify = createSupabaseVerifier({});
    const token = await sign({
      sub: 'u',
      app_metadata: { tenant_id: 't', builder_roles: ['editor'] },
    });
    expect(await verify(token)).toBeNull();
  });
});
