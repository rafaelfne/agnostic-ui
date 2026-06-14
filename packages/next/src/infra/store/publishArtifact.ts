import {
  EventDefSchema,
  HookDefSchema,
  IntegrationDefinitionSchema,
  ScreenDefSchema,
} from '@yukilabs/agnostic-ui-engine';
import type { ZodTypeAny } from 'zod';

import type { ConfigArtifactKind, ConfigArtifactRef, IConfigStore } from '../../application/ports';

import { publishFlowVersion } from './publishFlow';

export interface ArtifactPublishOutcome {
  published: boolean;
  error?: 'version_not_found' | 'invalid_artifact' | 'invalid_flow' | 'dry_run_failed';
  detail?: string;
}

/** Non-flow kinds validate against their schema; flow additionally dry-runs. */
const SCHEMA_BY_KIND: Record<Exclude<ConfigArtifactKind, 'flow'>, ZodTypeAny> = {
  integration: IntegrationDefinitionSchema,
  screen: ScreenDefSchema,
  event: EventDefSchema,
  hook: HookDefSchema,
};

/**
 * Fail-closed publish for any artifact kind (ADR 0004 §7). A flow goes through
 * `publishFlowVersion` (schema + dry-run); every other kind is validated against
 * its engine schema before the pointer flips. A broken draft never gets published,
 * whatever its kind. Rollback is just publishing an earlier (already-valid) version.
 */
export async function publishArtifactVersion(
  store: IConfigStore,
  ref: ConfigArtifactRef,
  version: number,
): Promise<ArtifactPublishOutcome> {
  if (ref.kind === 'flow') return publishFlowVersion(store, ref, version);

  const versions = await store.listVersions(ref);
  const target = versions.find((candidate) => candidate.version === version);
  if (target === undefined) return { published: false, error: 'version_not_found' };

  const parsed = SCHEMA_BY_KIND[ref.kind].safeParse(target.body);
  if (!parsed.success) {
    return { published: false, error: 'invalid_artifact', detail: parsed.error.message };
  }

  await store.publish(ref, version);
  return { published: true };
}
