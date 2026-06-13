-- Tenant isolation in the database, not just the app (ADR 0002 §4.1). FORCE makes
-- RLS apply to the table owner too. The app sets `app.tenant_id` per transaction;
-- `current_setting(..., true)` returns NULL (matching nothing) when it is unset.
ALTER TABLE config_artifact ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_artifact FORCE ROW LEVEL SECURITY;
ALTER TABLE config_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_version FORCE ROW LEVEL SECURITY;

CREATE POLICY config_artifact_tenant_isolation ON config_artifact
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY config_version_tenant_isolation ON config_version
  USING (
    EXISTS (
      SELECT 1 FROM config_artifact a
      WHERE a.id = config_version.artifact_id
        AND a.tenant_id = current_setting('app.tenant_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM config_artifact a
      WHERE a.id = config_version.artifact_id
        AND a.tenant_id = current_setting('app.tenant_id', true)
    )
  );
