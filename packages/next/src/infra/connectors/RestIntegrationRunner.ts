import type {
  IIntegrationRunner,
  IntegrationCall,
  IntegrationDefinition,
} from '@yukilabs/agnostic-ui-engine';
import { evaluateExpression } from '@yukilabs/agnostic-ui-engine';

import type { ISecretResolver } from '../../application/ports';

import {
  type DnsLookup,
  type EgressPolicy,
  assertEgressAllowed,
  dnsLookupAll,
} from './egressGuardian';
import type { IntegrationRegistry } from './integrationRegistry';

type FetchFn = typeof fetch;
type Scope = Record<string, unknown>;

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_REDIRECTS = 3;

export interface RestRunnerDeps {
  registry: IntegrationRegistry;
  secrets: ISecretResolver;
  fetchFn?: FetchFn;
  dnsLookup?: DnsLookup;
  maxRedirects?: number;
}

/** Replaces each `{{ path }}` token in a template using the scope. */
function interpolate(template: string, scope: Scope): string {
  return template.replace(/\{\{\s*[\w.$]+\s*\}\}/g, (token) => {
    const value = evaluateExpression(token, scope);
    return value === undefined || value === null ? '' : String(value);
  });
}

function joinUrl(base: string, path: string): string {
  if (path === '') return base;
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

/**
 * Generic REST connector (ADR 0003) implementing the engine's IIntegrationRunner.
 * Every call is fail-closed: the base URL and allowlist come from references
 * (unresolved → refuse), the egress guardian validates the URL (https + allowlist +
 * non-private IP), auth secrets are resolved by reference (missing → refuse), and
 * redirects are followed manually with each hop re-validated.
 */
export class RestIntegrationRunner implements IIntegrationRunner {
  private readonly registry: IntegrationRegistry;
  private readonly secrets: ISecretResolver;
  private readonly fetchFn: FetchFn;
  private readonly dnsLookup: DnsLookup;
  private readonly maxRedirects: number;

  constructor(deps: RestRunnerDeps) {
    this.registry = deps.registry;
    this.secrets = deps.secrets;
    this.fetchFn = deps.fetchFn ?? fetch;
    this.dnsLookup = deps.dnsLookup ?? dnsLookupAll;
    this.maxRedirects = deps.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  }

  async run(call: IntegrationCall): Promise<unknown> {
    const def = this.registry.get(call.integration);
    if (def === undefined) throw new Error(`unknown integration: ${call.integration}`);
    if (def.kind !== 'rest') throw new Error(`not a rest integration: ${call.integration}`);

    const op = def.operations.find((candidate) => candidate.id === call.operation);
    if (op === undefined) {
      throw new Error(`unknown operation: ${call.integration}.${call.operation}`);
    }

    const baseUrl = await this.resolveRequired(def.baseUrlRef, `baseUrlRef of ${def.id}`);
    const scope: Scope = { input: call.input };
    const urlStr = joinUrl(baseUrl, op.path !== undefined ? interpolate(op.path, scope) : '');

    const allowlist = await this.resolveAllowlist(def.security?.allowlistRef);
    const policy: EgressPolicy = { allowlist };
    const url = await assertEgressAllowed(urlStr, policy, { lookup: this.dnsLookup });

    const headers = await this.buildAuthHeaders(def);
    const method = op.method ?? 'GET';
    const sendBody = method !== 'GET' && method !== 'DELETE' && call.input !== undefined;
    if (sendBody) headers['content-type'] = 'application/json';

    const timeoutMs = def.security?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const response = await this.fetchSecure(
      url,
      { method, headers, body: sendBody ? JSON.stringify(call.input) : undefined },
      policy,
      timeoutMs,
    );

    if (!response.ok) throw new Error(`integration_http_${response.status}`);
    const body: unknown = await response.json();
    return op.output === undefined
      ? body
      : evaluateExpression(op.output, {
          response: body,
          input: call.input,
          status: response.status,
        });
  }

  private async resolveRequired(ref: string | undefined, label: string): Promise<string> {
    if (ref === undefined) throw new Error(`missing reference: ${label}`);
    const value = await this.secrets.resolve(ref);
    if (value === null) throw new Error(`unresolved reference: ${label}`);
    return value;
  }

  private async resolveAllowlist(ref: string | undefined): Promise<string[]> {
    if (ref === undefined) return []; // no allowlist → guardian blocks everything (fail-closed)
    const value = await this.secrets.resolve(ref);
    if (value === null) return [];
    return value
      .split(',')
      .map((host) => host.trim())
      .filter((host) => host !== '');
  }

  private async buildAuthHeaders(def: IntegrationDefinition): Promise<Record<string, string>> {
    if (def.auth === undefined) return {};
    const token = await this.secrets.resolve(def.auth.secretRef);
    if (token === null) throw new Error(`unresolved secret: ${def.auth.secretRef}`);
    const value = def.auth.type === 'bearer' ? `Bearer ${token}` : token;
    return { authorization: value };
  }

  private async fetchSecure(
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
      current = await assertEgressAllowed(new URL(location, current).href, policy, {
        lookup: this.dnsLookup,
      });
    }
    throw new Error('too_many_redirects');
  }
}
