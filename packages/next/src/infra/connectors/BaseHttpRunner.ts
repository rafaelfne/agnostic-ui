import type {
  IntegrationDefinition,
  IntegrationKind,
  OperationDef,
} from '@yukilabs/agnostic-ui-engine';

import type { ISecretResolver } from '../../application/ports';

import {
  type DnsLookup,
  type EgressPolicy,
  assertEgressAllowed,
  dnsLookupAll,
} from './egressGuardian';
import type { IntegrationRegistry } from './integrationRegistry';

export type FetchFn = typeof fetch;

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_REDIRECTS = 3;

export interface HttpRunnerDeps {
  registry: IntegrationRegistry;
  secrets: ISecretResolver;
  fetchFn?: FetchFn;
  dnsLookup?: DnsLookup;
  maxRedirects?: number;
}

/**
 * Shared, security-critical core for the HTTP-backed connectors (REST/GraphQL):
 * definition lookup, reference/secret resolution, the egress guardian, and a
 * timed fetch with manually re-validated redirects. Subclasses build the
 * request and parse the response per protocol. Everything is fail-closed.
 */
export abstract class BaseHttpRunner {
  protected readonly registry: IntegrationRegistry;
  protected readonly secrets: ISecretResolver;
  protected readonly fetchFn: FetchFn;
  protected readonly dnsLookup: DnsLookup;
  protected readonly maxRedirects: number;

  constructor(deps: HttpRunnerDeps) {
    this.registry = deps.registry;
    this.secrets = deps.secrets;
    this.fetchFn = deps.fetchFn ?? fetch;
    this.dnsLookup = deps.dnsLookup ?? dnsLookupAll;
    this.maxRedirects = deps.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  }

  protected resolveDef(integration: string, kind: IntegrationKind): IntegrationDefinition {
    const def = this.registry.get(integration);
    if (def === undefined) throw new Error(`unknown integration: ${integration}`);
    if (def.kind !== kind) throw new Error(`not a ${kind} integration: ${integration}`);
    return def;
  }

  protected findOperation(def: IntegrationDefinition, operation: string): OperationDef {
    const op = def.operations.find((candidate) => candidate.id === operation);
    if (op === undefined) throw new Error(`unknown operation: ${def.id}.${operation}`);
    return op;
  }

  protected async resolveRequired(ref: string | undefined, label: string): Promise<string> {
    if (ref === undefined) throw new Error(`missing reference: ${label}`);
    const value = await this.secrets.resolve(ref);
    if (value === null) throw new Error(`unresolved reference: ${label}`);
    return value;
  }

  protected async resolveAllowlist(ref: string | undefined): Promise<string[]> {
    if (ref === undefined) return []; // no allowlist → guardian blocks everything (fail-closed)
    const value = await this.secrets.resolve(ref);
    if (value === null) return [];
    return value
      .split(',')
      .map((host) => host.trim())
      .filter((host) => host !== '');
  }

  protected async buildAuthHeaders(def: IntegrationDefinition): Promise<Record<string, string>> {
    if (def.auth === undefined) return {};
    const token = await this.secrets.resolve(def.auth.secretRef);
    if (token === null) throw new Error(`unresolved secret: ${def.auth.secretRef}`);
    return { authorization: def.auth.type === 'bearer' ? `Bearer ${token}` : token };
  }

  protected assertEgress(urlStr: string, policy: EgressPolicy): Promise<URL> {
    return assertEgressAllowed(urlStr, policy, { lookup: this.dnsLookup });
  }

  protected timeoutMs(def: IntegrationDefinition): number {
    return def.security?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /** Fetches with a timeout, following redirects manually and re-validating each hop. */
  protected async fetchSecure(
    initialUrl: URL,
    init: RequestInit,
    policy: EgressPolicy,
    timeoutMs: number,
  ): Promise<Response> {
    let current = initialUrl;
    for (let hop = 0; hop <= this.maxRedirects; hop++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let response: Response;
      try {
        response = await this.fetchFn(current.href, {
          ...init,
          redirect: 'manual',
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (response.status < 300 || response.status >= 400) return response;
      const location = response.headers.get('location');
      if (location === null) return response;
      current = await this.assertEgress(new URL(location, current).href, policy);
    }
    throw new Error('too_many_redirects');
  }
}
