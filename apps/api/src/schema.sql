-- ETOP platform — Phase 1 foundation schema.
-- Multi-tenant: org → site → class. Runs identically on PGlite (dev/test)
-- and hosted Postgres (production). Row-level-security policies for hosted
-- Postgres live in rls.sql; until then tenancy is enforced in the API layer
-- (see DECISIONS.md D5) and verified by tests.

CREATE TABLE IF NOT EXISTS orgs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  site_id TEXT REFERENCES sites(id),
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'vi',
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, email)
);

CREATE TABLE IF NOT EXISTS guardian_students (
  guardian_id TEXT NOT NULL REFERENCES users(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  contact_order INT NOT NULL DEFAULT 1,
  PRIMARY KEY (guardian_id, student_id)
);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  site_id TEXT NOT NULL REFERENCES sites(id),
  teacher_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT '',
  join_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enrollments (
  class_id TEXT NOT NULL REFERENCES classes(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, student_id)
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only. The API exposes no update or delete path for this table;
-- hosted Postgres additionally revokes UPDATE/DELETE (see rls.sql).
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id TEXT,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Phase 2: Safety core ----------

-- Concrete class meetings (instances, not weekly templates) — the source
-- of the expected roster for attendance reconciliation.
CREATE TABLE IF NOT EXISTS class_meetings (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  class_id TEXT NOT NULL REFERENCES classes(id),
  site_id TEXT NOT NULL REFERENCES sites(id),
  room TEXT NOT NULL DEFAULT '',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL
);

-- One row per student per day; event ids make offline replay idempotent.
CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  site_id TEXT NOT NULL REFERENCES sites(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  check_in_at TIMESTAMPTZ,
  check_in_by TEXT REFERENCES users(id),
  check_in_event_id TEXT UNIQUE,
  check_out_at TIMESTAMPTZ,
  check_out_by TEXT REFERENCES users(id),
  check_out_event_id TEXT UNIQUE,
  released_to_name TEXT,
  released_to_pickup_id TEXT,
  UNIQUE (student_id, date)
);

-- Verified pickup people. No accounts; photo + PIN verified at the door.
CREATE TABLE IF NOT EXISTS pickup_people (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  relation TEXT NOT NULL DEFAULT '',
  photo_url TEXT,
  pin_hash TEXT NOT NULL,
  blocked BOOLEAN NOT NULL DEFAULT false
);

-- Missing-child escalations and their timestamped step cascade.
CREATE TABLE IF NOT EXISTS escalations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  site_id TEXT NOT NULL REFERENCES sites(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open | resolved
  opened_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolved_reason TEXT
);

CREATE TABLE IF NOT EXISTS escalation_steps (
  id TEXT PRIMARY KEY,
  escalation_id TEXT NOT NULL REFERENCES escalations(id),
  seq INT NOT NULL,
  kind TEXT NOT NULL, -- staff_alert | guardian_contact | director_alert
  target_user_id TEXT,
  target_contact TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

-- Outbox for SMS/call/push. Provider is mocked until real credentials
-- exist (DECISIONS.md A10); delivery failures will page in Phase 7.
CREATE TABLE IF NOT EXISTS notifications_outbox (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  channel TEXT NOT NULL, -- sms | call | push
  to_user_id TEXT,
  to_contact TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', -- queued | sent | failed
  created_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS emergency_modes (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  site_id TEXT NOT NULL REFERENCES sites(id),
  started_at TIMESTAMPTZ NOT NULL,
  started_by TEXT NOT NULL REFERENCES users(id),
  ended_at TIMESTAMPTZ,
  ended_by TEXT
);

-- Append-only event log for all safety events: the audit and analytics
-- source of truth, separate from operational tables (Part B).
CREATE TABLE IF NOT EXISTS safety_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id TEXT NOT NULL,
  site_id TEXT,
  type TEXT NOT NULL,
  student_id TEXT,
  actor_id TEXT,
  detail JSONB,
  occurred_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meetings_site_time ON class_meetings(site_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date, site_id);
CREATE INDEX IF NOT EXISTS idx_escalations_open ON escalations(status, site_id, date);
CREATE INDEX IF NOT EXISTS idx_safety_events_time ON safety_events(org_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_classes_org ON classes(org_id);
CREATE INDEX IF NOT EXISTS idx_enroll_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_audit_org_time ON audit_log(org_id, created_at);
