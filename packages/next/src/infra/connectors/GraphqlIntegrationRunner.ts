import type { IIntegrationRunner, IntegrationCall } from '@yukilabs/agnostic-ui-engine';
import { evaluateExpression } from '@yukilabs/agnostic-ui-engine';

import { BaseHttpRunner } from './BaseHttpRunner';

interface GraphqlPayload {
  data?: unknown;
  errors?: unknown;
}

/**
 * Generic GraphQL connector: POSTs `{ query, variables }` to the integration's
 * single endpoint, through the same fail-closed HTTP core as REST (egress guardian
 * + secret-ref + timed fetch). A non-empty `errors` array fails the call; the
 * `data` is mapped via `op.output`.
 */
export class GraphqlIntegrationRunner extends BaseHttpRunner implements IIntegrationRunner {
  async run(call: IntegrationCall): Promise<unknown> {
    const def = this.resolveDef(call.integration, 'graphql');
    const op = this.findOperation(def, call.operation);
    if (op.query === undefined) {
      throw new Error(`graphql operation missing query: ${def.id}.${op.id}`);
    }

    const baseUrl = await this.resolveRequired(def.baseUrlRef, `baseUrlRef of ${def.id}`);
    const policy = { allowlist: await this.resolveAllowlist(def.security?.allowlistRef) };
    const url = await this.assertEgress(baseUrl, policy);

    const headers = await this.buildAuthHeaders(def);
    headers['content-type'] = 'application/json';
    const body = JSON.stringify({ query: op.query, variables: call.input ?? {} });

    const response = await this.fetchSecure(
      url,
      { method: 'POST', headers, body },
      policy,
      this.timeoutMs(def),
    );
    if (!response.ok) throw new Error(`integration_http_${response.status}`);

    const payload = (await response.json()) as GraphqlPayload;
    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
      throw new Error('graphql_errors');
    }

    const data = payload.data ?? null;
    return op.output === undefined
      ? data
      : evaluateExpression(op.output, { response: data, input: call.input });
  }
}
