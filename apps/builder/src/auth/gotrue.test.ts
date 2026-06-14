import { describe, expect, it, vi } from 'vitest';

import { AuthError, signInWithPassword } from './gotrue';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const config = { url: 'http://supabase.test', anonKey: 'anon-key' };

describe('signInWithPassword', () => {
  it('posts to the GoTrue token endpoint with the anon key and returns the session', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchStub = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return jsonResponse(200, { access_token: 'jwt-123', expires_at: 1893456000 });
    }) as unknown as typeof fetch;

    const session = await signInWithPassword({ ...config, fetch: fetchStub }, 'a@b.com', 'secret');

    expect(session).toEqual({ accessToken: 'jwt-123', expiresAt: 1893456000 });
    expect(calls[0]?.url).toBe('http://supabase.test/auth/v1/token?grant_type=password');
    expect(calls[0]?.init.method).toBe('POST');
    expect((calls[0]?.init.headers as Record<string, string>).apikey).toBe('anon-key');
    expect(JSON.parse(calls[0]?.init.body as string)).toEqual({
      email: 'a@b.com',
      password: 'secret',
    });
  });

  it('throws AuthError with the GoTrue status and message on bad credentials', async () => {
    const fetchStub = vi.fn(async () =>
      jsonResponse(400, { error_description: 'Invalid login credentials' }),
    ) as unknown as typeof fetch;

    const error = await signInWithPassword({ ...config, fetch: fetchStub }, 'a@b.com', 'x').catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(AuthError);
    expect((error as AuthError).status).toBe(400);
    expect((error as AuthError).message).toBe('Invalid login credentials');
  });

  it('throws when the response lacks an access token', async () => {
    const fetchStub = vi.fn(async () => jsonResponse(200, {})) as unknown as typeof fetch;
    await expect(
      signInWithPassword({ ...config, fetch: fetchStub }, 'a@b.com', 'x'),
    ).rejects.toBeInstanceOf(AuthError);
  });
});
