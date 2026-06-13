/**
 * Port: the config store (ADR 0002 §4). The runtime reads the published body of
 * an artifact; the builder writes drafts and publishes them. Drafts may be broken;
 * publish is fail-closed (validated before the pointer flips — see publishFlow).
 * Implementations live in infra (Drizzle/Postgres), behind RLS by tenant.
 */
export type ConfigArtifactKind = 'flow' | 'integration' | 'screen' | 'event' | 'hook';
export type ConfigVersionStatus = 'draft' | 'published';

export interface ConfigArtifactRef {
  tenantId: string;
  kind: ConfigArtifactKind;
  slug: string;
}

export interface ConfigVersionRecord {
  artifactId: string;
  version: number;
  status: ConfigVersionStatus;
  body: unknown;
  createdAt: Date;
  publishedAt: Date | null;
}

export interface IConfigStore {
  /** The currently published body for an artifact, or `null` if none is published. */
  getPublished(ref: ConfigArtifactRef): Promise<unknown | null>;
  /** Creates the artifact if needed and appends a new draft version; returns its number. */
  saveDraft(ref: ConfigArtifactRef, body: unknown): Promise<number>;
  /** Flips the published pointer to `version` (demoting the prior). Validate first. */
  publish(ref: ConfigArtifactRef, version: number): Promise<void>;
  /** All versions of an artifact, newest first (empty if the artifact is unknown). */
  listVersions(ref: ConfigArtifactRef): Promise<ConfigVersionRecord[]>;
}
