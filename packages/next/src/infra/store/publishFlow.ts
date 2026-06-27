import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import {
  FlowDefinitionSchema,
  type IIntegrationRunner,
  runFlow,
} from '@yukilabs/agnostic-ui-engine';

import type { ConfigArtifactRef, IConfigStore } from '../../application/ports';

export type FlowValidationError = 'version_not_found' | 'invalid_flow' | 'dry_run_failed';

export interface FlowValidationOutcome {
  valid: boolean;
  error?: FlowValidationError;
  detail?: string;
}

export interface PublishOutcome {
  published: boolean;
  error?: FlowValidationError;
  detail?: string;
}

/** Returns an empty object for any operation — integrations are not exercised on a dry-run. */
const dryRunRunner: IIntegrationRunner = { run: async () => ({}) };

function dryRunAuth(tenantId: string): ExecutionContext {
  return { mode: 'sandbox', tenantId, customerId: 'dryrun', mockProfile: 'happyPath' };
}

/**
 * Valida um flow draft contra o schema do engine E o dry-run, **sem** publicar — o
 * coração fail-closed do publish (ADR 0002 §4). Só falhas de schema ou de
 * expressão/config barram; erros data-dependentes de integração/validação não, porque
 * o dry-run usa input sintético e runner mock. Extraído para a **proposta da IA**
 * (Frente I) avaliar uma geração sem flipar o ponteiro.
 */
export async function validateFlowVersion(
  store: IConfigStore,
  ref: ConfigArtifactRef,
  version: number,
): Promise<FlowValidationOutcome> {
  const versions = await store.listVersions(ref);
  const target = versions.find((candidate) => candidate.version === version);
  if (target === undefined) return { valid: false, error: 'version_not_found' };

  const parsed = FlowDefinitionSchema.safeParse(target.body);
  if (!parsed.success) {
    return { valid: false, error: 'invalid_flow', detail: parsed.error.message };
  }

  const request: Record<string, unknown> = {};
  for (const field of parsed.data.input.pick) request[field] = 'dryrun';
  const result = await runFlow(
    parsed.data,
    { auth: dryRunAuth(ref.tenantId), request },
    { integrationRunner: dryRunRunner },
  );
  if (!result.ok && (result.error.kind === 'config' || result.error.kind === 'expression')) {
    return { valid: false, error: 'dry_run_failed', detail: result.error.code };
  }
  return { valid: true };
}

/**
 * Fail-closed publish for a flow artifact: `validateFlowVersion` then flips the
 * pointer only when valid. A broken draft never becomes published.
 */
export async function publishFlowVersion(
  store: IConfigStore,
  ref: ConfigArtifactRef,
  version: number,
): Promise<PublishOutcome> {
  const validation = await validateFlowVersion(store, ref, version);
  if (!validation.valid) {
    return { published: false, error: validation.error, detail: validation.detail };
  }
  await store.publish(ref, version);
  return { published: true };
}
