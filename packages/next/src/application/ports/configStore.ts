/**
 * Port: the config store (ADR 0002 §4). The runtime reads the published body of
 * an artifact; the builder writes drafts and publishes them. Drafts may be broken;
 * publish is fail-closed (validated before the pointer flips — see publishFlow).
 * Implementations live in infra (Drizzle/Postgres), behind RLS by tenant.
 */
/**
 * `flow`/`integration`/`screen`/`event`/`hook` são artefatos SDUI. `operator`/`component`
 * são **contratos de extensão** de tenant (`<tenant>.*`, Fase J): o store de extensões
 * reusa a mesma máquina (versão/draft/publish/RLS), validados contra os schemas de
 * contrato no publish. São a persistência que destrava listar/graduar extensões.
 */
export type ConfigArtifactKind =
  | 'flow'
  | 'integration'
  | 'screen'
  | 'event'
  | 'hook'
  | 'operator'
  | 'component';
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

/** Per-artifact summary for the builder's artifact list (no bodies). */
export interface ConfigArtifactSummary {
  kind: ConfigArtifactKind;
  slug: string;
  createdAt: Date;
  /** Highest version number, or 0 when the artifact has no versions yet. */
  latestVersion: number;
  /** Currently published version number, or `null` when none is published. */
  publishedVersion: number | null;
  /** When the published version was published, or `null` when none is published. */
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
  /** Artifacts for a tenant (optionally one `kind`), with draft/published summary. */
  listArtifacts(tenantId: string, kind?: ConfigArtifactKind): Promise<ConfigArtifactSummary[]>;
}
