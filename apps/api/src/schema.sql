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

-- ---------- Phase 3: Learning engine + Part C classes/assignments ----------

-- Skills taxonomy: subject → strand → skill with prerequisite edges
-- (knowledge graph). Seeded for English; orgs can extend later.
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL DEFAULT 'english',
  strand TEXT NOT NULL,           -- grammar | reading | listening | writing
  level TEXT NOT NULL,            -- pre_a1_starters | a1_movers | a2_flyers | b1
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_prereqs (
  skill_id TEXT NOT NULL REFERENCES skills(id),
  prereq_id TEXT NOT NULL REFERENCES skills(id),
  PRIMARY KEY (skill_id, prereq_id)
);

-- Class join requests (child enters a code like BEAR42; teacher approves).
CREATE TABLE IF NOT EXISTS join_requests (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  class_id TEXT NOT NULL REFERENCES classes(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  decided_by TEXT,
  UNIQUE (class_id, student_id, status)
);

-- Teacher question bank. Payload is type-specific; answers never leave the
-- server when serving students. Publisher content must NOT be uploaded
-- (copyright notice shown at upload; series/unit are metadata only).
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  owner_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,   -- mc | mc_multi | fill_blank | fill_gaps | reorder | listen_mc | dictation | picture
  skill TEXT NOT NULL,  -- grammar | reading | listening | writing (exactly one)
  level TEXT,
  series TEXT,          -- coursebook metadata only, e.g. 'Everybody Up'
  unit TEXT,
  prompt TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL,
  shared BOOLEAN NOT NULL DEFAULT false,
  shared_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  class_id TEXT NOT NULL REFERENCES classes(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  due_at TIMESTAMPTZ,
  time_limit_min INT,
  attempts_allowed INT NOT NULL DEFAULT 1,
  show_results TEXT NOT NULL DEFAULT 'instant', -- instant | after_review
  fixed_order BOOLEAN NOT NULL DEFAULT false,   -- true disables per-student shuffle
  status TEXT NOT NULL DEFAULT 'draft',         -- draft | published | locked
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assignment_questions (
  assignment_id TEXT NOT NULL REFERENCES assignments(id),
  question_id TEXT NOT NULL REFERENCES questions(id),
  position INT NOT NULL,
  points INT NOT NULL DEFAULT 1,
  PRIMARY KEY (assignment_id, question_id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  assignment_id TEXT NOT NULL REFERENCES assignments(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  attempt INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'in_progress', -- in_progress | submitted | graded
  answers JSONB NOT NULL DEFAULT '{}',        -- autosaved continuously
  started_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  late BOOLEAN NOT NULL DEFAULT false,
  auto_points REAL,
  auto_possible REAL,
  manual_points REAL,
  manual_possible REAL,
  skill_scores JSONB,    -- {grammar: {earned, possible}, ...}
  rubric JSONB,          -- teacher taps: accuracy/vocabulary/structure + comment
  graded_by TEXT,
  graded_at TIMESTAMPTZ,
  UNIQUE (assignment_id, student_id, attempt)
);

-- Per-skill mastery (broad skills now; knowledge-graph mastery in Phase 6).
CREATE TABLE IF NOT EXISTS mastery (
  student_id TEXT NOT NULL REFERENCES users(id),
  skill TEXT NOT NULL,
  score REAL NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (student_id, skill)
);

-- Tutor session logging, designed for one request in under 60 seconds.
CREATE TABLE IF NOT EXISTS session_logs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  class_id TEXT NOT NULL REFERENCES classes(id),
  tutor_id TEXT NOT NULL REFERENCES users(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  skills JSONB NOT NULL DEFAULT '[]',
  engagement INT,            -- 1-5
  note TEXT NOT NULL DEFAULT '',
  parent_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual Learning Plans: living, versioned documents.
CREATE TABLE IF NOT EXISTS ilps (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  version INT NOT NULL,
  goals JSONB NOT NULL,      -- [{skillKey, targetDate, goal, parentFacing}]
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, version)
);

CREATE INDEX IF NOT EXISTS idx_questions_bank ON questions(org_id, skill, level);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id, status);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_grading ON submissions(org_id, status);

-- ---------- Phase 4: Parent & student experience ----------

-- Effort-based practice events (lessons, vocab, quizzes) → achievements.
CREATE TABLE IF NOT EXISTS practice_events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL,           -- lesson | vocab | quiz | homework
  points INT NOT NULL,
  detail JSONB,
  occurred_on DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Weekly learning summaries: generated from structured session data,
-- reviewed and one-tap approved by the tutor before parents see them.
CREATE TABLE IF NOT EXISTS weekly_summaries (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  class_id TEXT NOT NULL REFERENCES classes(id),
  week_start DATE NOT NULL,
  body_en TEXT NOT NULL,
  body_vi TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | approved
  created_by TEXT NOT NULL,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  UNIQUE (student_id, class_id, week_start)
);

-- Two-way messaging: one thread per (student, guardian, teacher), with
-- director oversight. Students message only via moderated channels —
-- not in scope yet (DECISIONS.md D18).
CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  student_id TEXT NOT NULL REFERENCES users(id),
  guardian_id TEXT NOT NULL REFERENCES users(id),
  teacher_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, guardian_id, teacher_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  thread_id TEXT NOT NULL REFERENCES threads(id),
  sender_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_practice_student ON practice_events(student_id, occurred_on);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, created_at);

CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_classes_org ON classes(org_id);
CREATE INDEX IF NOT EXISTS idx_enroll_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_audit_org_time ON audit_log(org_id, created_at);
