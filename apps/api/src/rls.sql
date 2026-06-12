-- Row-level security for hosted Postgres (not applied on PGlite dev DB,
-- where the API layer enforces tenancy — DECISIONS.md D5).
-- Apply when provisioning the production database, connecting the app as
-- the non-superuser role app_user with SET app.org_id per transaction.

ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_sites ON sites
  USING (org_id = current_setting('app.org_id', true));
CREATE POLICY tenant_users ON users
  USING (org_id = current_setting('app.org_id', true));
CREATE POLICY tenant_classes ON classes
  USING (org_id = current_setting('app.org_id', true));
CREATE POLICY tenant_enrollments ON enrollments
  USING (class_id IN (SELECT id FROM classes WHERE org_id = current_setting('app.org_id', true)));
CREATE POLICY tenant_audit ON audit_log
  USING (org_id = current_setting('app.org_id', true));

-- Audit log is append-only at the database layer.
REVOKE UPDATE, DELETE ON audit_log FROM app_user;
