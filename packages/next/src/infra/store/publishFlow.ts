import type { ExecutionContext } from '@yukilabs/agnostic-ui-core';
import {
  FlowDefinitionSchema,
  type IIntegrationRunner,
  runFlow,
} from '@yukilabs/agnostic-ui-engine';

import type { ConfigArtifactRef, IConfigStore } from '../../application/ports';

export interface PublishOutcome {
  published: boolean;
  error?: 'version_not_found' | 'invalid_flow' | 'dry_run_failed';
  detail?: string;
}

/** Returns an empty object for any operation — integrations are not exercised on a dry-run. */
const dryRunRunner: IIntegrationRunner = { run: async () => ({}) };

function dryRunAuth(tenantId: string): ExecutionContext {
  return { mode: 'sandbox', tenantId, customerId: 'dryrun', mockProfile: 'happyPath' };
}

/**
 * Fail-closed publish for a flow artifact (ADR 0002 §4): the draft is validated
 * against the engine schema AND dry-run before the pointer flips. Only schema or
 * expression/config failures block — data-dependent integration/validation errors
 * do not, since the dry-run uses synthetic input and a mock runner. A broken draft
 * never becomes published.
 */
export async function publishFlowVersion(
  store: IConfigStore,
  ref: ConfigArtifactRef,
  version: number,
): Promise<PublishOutcome> {
  const versions = await store.listVersions(ref);
  const target = versions.find((candidate) => candidate.version === version);
  if (target === undefined) return { published: false, error: 'version_not_found' };

  const parsed = FlowDefinitionSchema.safeParse(target.body);
  if (!parsed.success) {
    return { published: false, error: 'invalid_flow', detail: parsed.error.message };
  }

  const request: Record<string, unknown> = {};
  for (const field of parsed.data.input.pick) request[field] = 'dryrun';
  const result = await runFlow(
    parsed.data,
    { auth: dryRunAuth(ref.tenantId), request },
    { integrationRunner: dryRunRunner },
  );
  if (!result.ok && (result.error.kind === 'config' || result.error.kind === 'expression')) {
    return { published: false, error: 'dry_run_failed', detail: result.error.code };
  }

  await store.publish(ref, version);
  return { published: true };
}
