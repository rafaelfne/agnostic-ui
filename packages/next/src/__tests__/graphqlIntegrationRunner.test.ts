import type { IntegrationCall } from '@yukilabs/agnostic-ui-engine';
import { describe, expect, it, vi } from 'vitest';

import { EnvSecretResolver } from '../infra/connectors/EnvSecretResolver';
import { GraphqlIntegrationRunner } from '../infra/connectors/GraphqlIntegrationRunner';
import { InMemoryIntegrationRegistry } from '../infra/connectors/integrationRegistry';
import { createIntegrationRunner } from '../infra/connectors/IntegrationRunnerRouter';

const gqlDef = {
  id: 'gql',
  name: 'GQL',
  kind: 'graphql',
  baseUrlRef: 'GQL_URL',
  auth: { type: 'bearer', secretRef: 'GQL_TOKEN' },
  operations: [{ id: 'me', query: 'query { me { id } }', output: '{{ response.me }}' }],
  security: { allowlistRef: 'GQL_ALLOW' },
};

const env: Record<string, string> = {
  GQL_URL: 'https://gql.partner.com/graphql',
  GQL_TOKEN: 'tok',
  GQL_ALLOW: 'gql.partner.com',
};

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function makeRunner(opts: { ips?: string[]; fetchFn: typeof fetch }): GraphqlIntegrationRunner {
  return new GraphqlIntegrationRunner({
    registry: new InMemoryIntegrationRegistry([gqlDef]),
    secrets: new EnvSecretResolver(env),
    fetchFn: opts.fetchFn,
    dnsLookup: async () => opts.ips ?? ['93.184.216.34'],
  });
}

const call: IntegrationCall = {
  integration: 'gql',
  operation: 'me',
  input: { x: 1 },
  profile: undefined,
};

describe('GraphqlIntegrationRunner', () => {
  it('POSTs {query, variables} to the endpoint and maps data', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ data: { me: { id: 'u1' } } }));
    const result = await makeRunner({ fetchFn }).run(call);

    expect(result).toEqual({ id: 'u1' });
    const [calledUrl, init] = fetchFn.mock.calls[0]!;
    expect(calledUrl).toBe('https://gql.partner.com/graphql');
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>).authorization).toBe('Bearer tok');
    expect(JSON.parse(init?.body as string)).toEqual({
      query: 'query { me { id } }',
      variables: { x: 1 },
    });
  });

  it('fails on GraphQL errors', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ data: null, errors: [{ message: 'nope' }] }));
    await expect(makeRunner({ fetchFn }).run(call)).rejects.toThrow(/graphql_errors/);
  });

  it('inherits the egress guardian (refuses a private IP)', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ data: {} }));
    await expect(makeRunner({ ips: ['10.0.0.1'], fetchFn }).run(call)).rejects.toMatchObject({
      code: 'ip_blocked',
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('createIntegrationRunner (router)', () => {
  const restDef = {
    id: 'rest',
    name: 'Rest',
    kind: 'rest',
    baseUrlRef: 'GQL_URL',
    operations: [{ id: 'ping', method: 'GET', path: '/ping' }],
    security: { allowlistRef: 'GQL_ALLOW' },
  };

  it('routes by integration kind to the right runner', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => jsonResponse({ data: { me: 1 } }));
    const runner = createIntegrationRunner({
      registry: new InMemoryIntegrationRegistry([gqlDef, restDef]),
      secrets: new EnvSecretResolver(env),
      fetchFn,
      dnsLookup: async () => ['93.184.216.34'],
    });

    await runner.run({ integration: 'gql', operation: 'me', input: {}, profile: undefined });
    expect(fetchFn.mock.calls[0]![1]?.method).toBe('POST');

    await runner.run({ integration: 'rest', operation: 'ping', input: {}, profile: undefined });
    expect(fetchFn.mock.calls[1]![0]).toBe('https://gql.partner.com/graphql/ping');
    expect(fetchFn.mock.calls[1]![1]?.method).toBe('GET');
  });
});
