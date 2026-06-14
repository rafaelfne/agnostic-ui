/** The HTTP contract of the builder API (`/api/builder/*`, ADR 0004 §2). */

export const ARTIFACT_KINDS = ['flow', 'integration', 'screen', 'event', 'hook'] as const;
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

/** One row of the artifact list — no body (see {@link ArtifactVersion} for bodies). */
export interface ArtifactSummary {
  kind: ArtifactKind;
  slug: string;
  createdAt: string;
  latestVersion: number;
  publishedVersion: number | null;
}

export interface ArtifactVersion {
  version: number;
  status: 'draft' | 'published';
  body: unknown;
  createdAt: string;
  publishedAt: string | null;
}
