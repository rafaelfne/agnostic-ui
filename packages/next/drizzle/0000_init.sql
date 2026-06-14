-- Config store — append-only artifacts and versions (ADR 0002 §4.1).
CREATE TABLE IF NOT EXISTS config_artifact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  kind text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT config_artifact_tenant_kind_slug_uq UNIQUE (tenant_id, kind, slug)
);

CREATE TABLE IF NOT EXISTS config_version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id uuid NOT NULL REFERENCES config_artifact(id) ON DELETE CASCADE,
  version integer NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'published')),
  body jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  CONSTRAINT config_version_artifact_version_uq UNIQUE (artifact_id, version)
);

-- At most one published version per artifact — the "published" pointer.
CREATE UNIQUE INDEX IF NOT EXISTS config_version_one_published_uq
  ON config_version (artifact_id)
  WHERE status = 'published';
