/** The HTTP contract of the builder API (`/api/builder/*`, ADR 0004 §2). */

export const ARTIFACT_KINDS = [
  'flow',
  'integration',
  'screen',
  'event',
  'hook',
  // Contratos de extensão de tenant (Fase J) — armazenados como artefatos.
  'operator',
  'component',
] as const;
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

/** One row of the artifact list — no body (see {@link ArtifactVersion} for bodies). */
export interface ArtifactSummary {
  kind: ArtifactKind;
  slug: string;
  createdAt: string;
  latestVersion: number;
  publishedVersion: number | null;
  /** ISO timestamp of when the published version was published, or `null`. */
  publishedAt: string | null;
}

export interface ArtifactVersion {
  version: number;
  status: 'draft' | 'published';
  body: unknown;
  createdAt: string;
  publishedAt: string | null;
}

/**
 * Result of an AI proposal (Frente I). A `201` means a draft was created (possibly
 * schema-invalid, `valid:false`); the triage `resolution` records how the AI decided
 * to satisfy the request. A blocked/needs-extension/unparseable proposal is non-2xx
 * → {@link BuilderApiError}, never a draft.
 */
export interface ProposeResult {
  version?: number;
  valid: boolean;
  error?: string;
  detail?: string;
  resolution?: 'composition' | 'integration' | 'expression' | 'needs-extension';
  rationale: string;
}
