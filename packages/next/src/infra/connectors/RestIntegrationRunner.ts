import type { IIntegrationRunner, IntegrationCall } from '@yukilabs/agnostic-ui-engine';
import { evaluateExpression } from '@yukilabs/agnostic-ui-engine';

import { BaseHttpRunner } from './BaseHttpRunner';

type Scope = Record<string, unknown>;

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
 * Builds the URL from `baseUrlRef` + the (interpolated) operation path, then runs
 * it through the shared fail-closed HTTP core (egress guardian + secret-ref +
 * timed fetch with re-validated redirects), and maps the response via `op.output`.
 */
export class RestIntegrationRunner extends BaseHttpRunner implements IIntegrationRunner {
  async run(call: IntegrationCall): Promise<unknown> {
    const def = this.resolveDef(call.integration, 'rest');
    const op = this.findOperation(def, call.operation);

    const baseUrl = await this.resolveRequired(def.baseUrlRef, `baseUrlRef of ${def.id}`);
    const scope: Scope = { input: call.input };
    const urlStr = joinUrl(baseUrl, op.path !== undefined ? interpolate(op.path, scope) : '');

    const policy = { allowlist: await this.resolveAllowlist(def.security?.allowlistRef) };
    const url = await this.assertEgress(urlStr, policy);

    const headers = await this.buildAuthHeaders(def);
    const method = op.method ?? 'GET';
    const sendBody = method !== 'GET' && method !== 'DELETE' && call.input !== undefined;
    if (sendBody) headers['content-type'] = 'application/json';

    const response = await this.fetchSecure(
      url,
      { method, headers, body: sendBody ? JSON.stringify(call.input) : undefined },
      policy,
      this.timeoutMs(def),
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
}
