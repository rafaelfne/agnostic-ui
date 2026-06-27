import {
  EventDefSchema,
  HookDefSchema,
  IntegrationDefinitionSchema,
  ScreenDefSchema,
} from '@yukilabs/agnostic-ui-engine';
import type { ZodTypeAny } from 'zod';

import type { ConfigArtifactKind, ConfigArtifactRef, IConfigStore } from '../../application/ports';

import { publishFlowVersion, validateFlowVersion } from './publishFlow';

export type ArtifactValidationError =
  | 'version_not_found'
  | 'invalid_artifact'
  | 'invalid_flow'
  | 'dry_run_failed';

export interface ArtifactValidationOutcome {
  valid: boolean;
  error?: ArtifactValidationError;
  detail?: string;
}

export interface ArtifactPublishOutcome {
  published: boolean;
  error?: ArtifactValidationError;
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
 * Valida um draft de qualquer kind contra seu schema (flow tb. dry-runs), **sem**
 * publicar. Extraído do publish para a **proposta da IA** (Frente I, ADR 0006): a IA
 * é só mais um editor e sua geração passa por ESTE mesmo portão, sem flipar o ponteiro.
 * `publishArtifactVersion` = isto + `store.publish` no sucesso.
 */
export async function validateArtifactVersion(
  store: IConfigStore,
  ref: ConfigArtifactRef,
  version: number,
): Promise<ArtifactValidationOutcome> {
  if (ref.kind === 'flow') return validateFlowVersion(store, ref, version);

  const versions = await store.listVersions(ref);
  const target = versions.find((candidate) => candidate.version === version);
  if (target === undefined) return { valid: false, error: 'version_not_found' };

  const parsed = SCHEMA_BY_KIND[ref.kind].safeParse(target.body);
  if (!parsed.success) {
    return { valid: false, error: 'invalid_artifact', detail: parsed.error.message };
  }
  return { valid: true };
}

/**
 * Fail-closed publish for any artifact kind (ADR 0004 §7): `validateArtifactVersion`
 * then flips the pointer only when valid. A flow goes through `publishFlowVersion`
 * (schema + dry-run); every other kind is validated against its engine schema. A
 * broken draft never gets published, whatever its kind. Rollback is just publishing
 * an earlier (already-valid) version.
 */
export async function publishArtifactVersion(
  store: IConfigStore,
  ref: ConfigArtifactRef,
  version: number,
): Promise<ArtifactPublishOutcome> {
  if (ref.kind === 'flow') return publishFlowVersion(store, ref, version);

  const validation = await validateArtifactVersion(store, ref, version);
  if (!validation.valid) {
    return { published: false, error: validation.error, detail: validation.detail };
  }
  await store.publish(ref, version);
  return { published: true };
}
