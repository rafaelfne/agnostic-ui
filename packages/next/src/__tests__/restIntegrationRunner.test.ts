import type { IntegrationCall } from '@yukilabs/agnostic-ui-engine';
import { describe, expect, it, vi } from 'vitest';

import { EnvSecretResolver } from '../infra/connectors/EnvSecretResolver';
import { InMemoryIntegrationRegistry } from '../infra/connectors/integrationRegistry';
import { RestIntegrationRunner } from '../infra/connectors/RestIntegrationRunner';

const partnerDef = {
  id: 'partner',
  name: 'Partner',
  kind: 'rest',
  baseUrlRef: 'PARTNER_BASE_URL',
  auth: { type: 'bearer', secretRef: 'PARTNER_TOKEN' },
  operations: [
    { id: 'getBalance', method: 'GET', path: '/v1/balance', output: '{{ response.data }}' },
  ],
  security: { allowlistRef: 'PARTNER_ALLOWLIST', timeoutMs: 5000 },
};

const baseEnv: Record<string, string> = {
  PARTNER_BASE_URL: 'https://api.partner.com',
  PARTNER_TOKEN: 'tok-123',
  PARTNER_ALLOWLIST: 'api.partner.com',
};

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function makeRunner(opts: {
  env?: Record<string, string>;
  ips?: string[];
  fetchFn: typeof fetch;
}): RestIntegrationRunner {
  return new RestIntegrationRunner({
    registry: new InMemoryIntegrationRegistry([partnerDef]),
    secrets: new EnvSecretResolver(opts.env ?? baseEnv),
    fetchFn: opts.fetchFn,
    dnsLookup: async () => opts.ips ?? ['93.184.216.34'],
  });
}

const call: IntegrationCall = {
  integration: 'partner',
  operation: 'getBalance',
  input: {},
  profile: undefined,
};

describe('RestIntegrationRunner', () => {
  it('calls the allowlisted URL with the bearer token and maps the output', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ data: { netWorth: 10 } }));
    const result = await makeRunner({ fetchFn }).run(call);

    expect(result).toEqual({ netWorth: 10 });
    const [calledUrl, init] = fetchFn.mock.calls[0]!;
    expect(calledUrl).toBe('https://api.partner.com/v1/balance');
    expect((init?.headers as Record<string, string>).authorization).toBe('Bearer tok-123');
    expect(init?.method).toBe('GET');
  });

  it('refuses a host outside the allowlist', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}));
    await expect(
      makeRunner({ env: { ...baseEnv, PARTNER_ALLOWLIST: 'other.com' }, fetchFn }).run(call),
    ).rejects.toMatchObject({ code: 'host_not_allowlisted' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('refuses when the host resolves to a private IP', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}));
    await expect(makeRunner({ ips: ['169.254.169.254'], fetchFn }).run(call)).rejects.toMatchObject(
      { code: 'ip_blocked' },
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('fails closed when the auth secret is unresolved', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}));
    const env = {
      PARTNER_BASE_URL: baseEnv.PARTNER_BASE_URL!,
      PARTNER_ALLOWLIST: baseEnv.PARTNER_ALLOWLIST!,
    };
    await expect(makeRunner({ env, fetchFn }).run(call)).rejects.toThrow(/unresolved secret/);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('re-validates redirects and refuses an off-allowlist hop', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(null, { status: 302, headers: { location: 'https://evil.com/x' } }),
      );
    await expect(makeRunner({ fetchFn }).run(call)).rejects.toMatchObject({
      code: 'host_not_allowlisted',
    });
  });

  it('throws on a non-2xx response', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ error: 'boom' }, 500));
    await expect(makeRunner({ fetchFn }).run(call)).rejects.toThrow(/integration_http_500/);
  });
});
