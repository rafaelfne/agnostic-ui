import { describe, expect, it } from 'vitest';

import { EnvSecretResolver } from '../infra/connectors/EnvSecretResolver';
import {
  EgressError,
  type EgressPolicy,
  assertEgressAllowed,
} from '../infra/connectors/egressGuardian';

const allow = (ips: Record<string, string[]>) => ({
  lookup: async (host: string) => ips[host] ?? [],
});

const policy: EgressPolicy = { allowlist: ['api.partner.com'] };

describe('assertEgressAllowed', () => {
  it('allows https to an allowlisted host resolving to a public IP', async () => {
    const url = await assertEgressAllowed(
      'https://api.partner.com/v1/balance',
      policy,
      allow({ 'api.partner.com': ['93.184.216.34'] }),
    );
    expect(url.href).toBe('https://api.partner.com/v1/balance');
  });

  it('rejects plain http unless opted in', async () => {
    await expect(
      assertEgressAllowed(
        'http://api.partner.com/x',
        policy,
        allow({ 'api.partner.com': ['8.8.8.8'] }),
      ),
    ).rejects.toMatchObject({ name: 'EgressError', code: 'scheme_blocked' });

    const url = await assertEgressAllowed(
      'http://api.partner.com/x',
      { ...policy, allowHttp: true },
      allow({ 'api.partner.com': ['8.8.8.8'] }),
    );
    expect(url.protocol).toBe('http:');
  });

  it('rejects a host not on the allowlist', async () => {
    await expect(
      assertEgressAllowed('https://evil.com/x', policy, allow({ 'evil.com': ['8.8.8.8'] })),
    ).rejects.toMatchObject({ code: 'host_not_allowlisted' });
  });

  it('rejects an allowlisted host that resolves to a private IP (rebinding)', async () => {
    await expect(
      assertEgressAllowed(
        'https://api.partner.com/x',
        policy,
        allow({ 'api.partner.com': ['169.254.169.254'] }),
      ),
    ).rejects.toMatchObject({ code: 'ip_blocked' });
  });

  it('rejects when ANY resolved IP is private', async () => {
    await expect(
      assertEgressAllowed(
        'https://api.partner.com/x',
        policy,
        allow({ 'api.partner.com': ['8.8.8.8', '10.0.0.1'] }),
      ),
    ).rejects.toMatchObject({ code: 'ip_blocked' });
  });

  it('rejects an invalid URL', async () => {
    await expect(assertEgressAllowed('not a url', policy)).rejects.toMatchObject({
      code: 'invalid_url',
    });
  });

  it('rejects a host with no DNS records', async () => {
    await expect(
      assertEgressAllowed('https://api.partner.com/x', policy, allow({})),
    ).rejects.toMatchObject({ code: 'dns_no_records' });
  });

  it('checks an IP-literal host directly (no DNS) and blocks private ones', async () => {
    const ok = await assertEgressAllowed('https://93.184.216.34/x', {
      allowlist: ['93.184.216.34'],
    });
    expect(ok.hostname).toBe('93.184.216.34');

    await expect(
      assertEgressAllowed('https://127.0.0.1/x', { allowlist: ['127.0.0.1'] }),
    ).rejects.toMatchObject({ code: 'ip_blocked' });
  });

  it('EgressError carries a stable code', () => {
    expect(new EgressError('ip_blocked', 'x').code).toBe('ip_blocked');
  });
});

describe('EnvSecretResolver (fail-closed)', () => {
  it('resolves a present env var and returns null otherwise', async () => {
    const resolver = new EnvSecretResolver({ PARTNER_TOKEN: 'secret-123', EMPTY: '' });
    await expect(resolver.resolve('PARTNER_TOKEN')).resolves.toBe('secret-123');
    await expect(resolver.resolve('EMPTY')).resolves.toBeNull();
    await expect(resolver.resolve('MISSING')).resolves.toBeNull();
  });
});
