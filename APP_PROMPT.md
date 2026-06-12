# Anh Ngữ E’TOP — Master Build Prompt (v2)

> The complete product specification for the E’TOP English Center app.
> Paste this into Claude Code (or any AI coding agent) to build or extend the app.
> v1 (student progress demo) is already built from the earlier version of this
> prompt; sections marked **[SHIPPED]** exist, everything else is the roadmap.

---

## 1. Context & mission

**Trung tâm Anh Ngữ E’TOP** is an English center in Phan Thiết, Bình Thuận,
Vietnam, owned by Zhao, with ~25 years of teaching heritage and two campuses
(166 Nguyễn Hội, P. Phú Trinh and a second location on Tôn Thất Thiệp).
Hotline: 089 949 0222. Slogan: **Learn – Achieve – Lead**.
Facebook: https://www.facebook.com/ETOP.EnglishCenter.BinhThuan/

It serves **50–200 students of mixed ages** — kids (Starters/Movers), teens
(A2/B1, school exam prep), and adults (conversation, IELTS).

**Mission of the app:** make every student's progress visible and motivating,
make parents feel informed and confident in the center, and remove paperwork
from teachers and the owner — all in an experience so friendly that daily
practice becomes a habit.

## 2. Brand & design system

- **Logo:** yellow circle, lowercase wordmark `e'top` (coral **e**, dark-teal
  **t**, green **o**, cyan **p**), slogan in white. The file lives at
  `public/logo.png` and must appear on login, app header, and favicon. [SHIPPED]
- **Palette derived from the logo:** sunshine yellow `#FFE81A` (primary
  surfaces/accents), coral `#F76C5E`, green `#2EBD85`, teal `#1B6B72`,
  cyan `#7FD8DC`, near-black text `#1F2937`. Use yellow generously —
  the app should feel like the logo.
- **Tone:** friendly & colorful, Duolingo-like; playful but not childish
  (mixed ages). Rounded 24px+ cards, big typography (Nunito), generous
  spacing, micro-celebrations (confetti/pop animations) on achievements.
- **Mobile-first** always; every screen must be excellent on a 360px phone.
- Dark mode: nice-to-have, not required.

## 3. Languages

Fully bilingual **Vietnamese / English** with a persistent per-user toggle on
every screen including login. [SHIPPED] Every new string goes through the i18n
layer (`src/i18n.tsx`) — no hardcoded UI text, ever. Vietnamese is the default.
Dates, numbers, and currency (VND) must format per locale.

## 4. Roles & permissions

| Role | Can do |
|---|---|
| **Student** | View own grades/schedule/homework, submit homework, practice vocabulary, earn points/badges, send feedback |
| **Parent** | Read-only view of each linked child (multiple children supported), receive notifications, send feedback, view invoices/pay tuition |
| **Teacher** | Manage own classes: gradebook, attendance, homework, vocab lists, comments; message their class |
| **Teaching assistant** | Attendance + homework checking for assigned classes (no grade editing) |
| **Owner/Admin (Zhao)** | Everything: all classes and both campuses, staff accounts, billing, reports, announcements, feedback inbox |

Account provisioning is **center-controlled**: staff create student/parent
accounts (single or CSV bulk import); no self-registration. Parents and
students of any age log in with **email & password**; password reset by email;
staff can also reset manually. Enforce role checks on every route *and* every
API endpoint.

## 5. Feature modules

### 5.1 Student experience [SHIPPED in v1, keep & polish]
- **Dashboard:** greeting, streak 🔥, points ⭐, next class, latest score,
  homework due, badges, class leaderboard, feedback shortcut.
- **Grades:** progress chart over time, per-skill breakdown
  (Listening/Speaking/Reading/Writing), teacher comments, full history.
- **Schedule:** weekly timetable with today highlighted, teacher & room.
- **Homework:** to-do/done/overdue states, mark-as-done with points reward.
  *(v2: real submissions — text, photo of workbook page, or audio recording —
  with teacher review & grading flow.)*
- **Practice:** vocabulary flashcards and multiple-choice quizzes from class
  word lists. *(v2: spaced repetition queue "Ôn tập hôm nay", word audio via
  speech synthesis, listening quizzes, sentence-building game, weekly
  challenge with bonus points.)*
- **Gamification:** points economy (practice, homework, quizzes), streaks
  with one weekly "streak freeze", 8+ badges, class leaderboard.
  *(v2: levels/ranks, a rewards shop where points convert to real perks
  redeemable at the center — stickers, pencils, a free class drink — managed
  by admin.)*

### 5.2 Parent experience [SHIPPED partially]
- Read-only child progress (grades, chart, comments, schedule, homework,
  badges). Multi-child switcher. [SHIPPED]
- Feedback with star rating. [SHIPPED]
- *(v2)* **Attendance log** of their child with absence reasons.
- *(v2)* **Notifications**: absence alert same day, new report card, fee
  reminder, center announcements (in-app inbox first; Zalo/email later).
- *(v2)* **Tuition view**: invoices, due dates, payment status, VietQR code
  to pay by bank transfer; admin marks received.

### 5.3 Teacher tools [SHIPPED partially]
- Class list, roster with averages and points. [SHIPPED]
- Gradebook: create assessments, enter scores + per-skill marks + comments,
  all from a phone, whole roster on one screen. [SHIPPED — add per-skill
  entry UI, currently only on seeded data]
- Homework assignment with completion tracker. [SHIPPED] *(v2: review queue
  for submitted photos/audio, one-tap "done/redo" grading.)*
- Vocabulary list management (bulk paste). [SHIPPED]
- *(v2)* **Attendance:** tap-tap-tap roster check-in at lesson start
  (present/late/absent + note), auto-notifies parents of absences.
- *(v2)* **Lesson notes:** what was covered each session, visible to parents.
- *(v2)* Class announcement ("no class Friday — holiday") with read receipts.

### 5.4 Owner/Admin (Zhao) [SHIPPED partially]
- Center overview: students, classes, average score, homework rate. [SHIPPED]
- Feedback inbox with ratings. [SHIPPED] *(v2: reply to feedback; NPS trend.)*
- *(v2)* **People management:** create/edit/archive students, parents, staff;
  CSV import; move students between classes; class capacity.
- *(v2)* **Multi-campus:** every class belongs to a campus; all views
  filterable by campus.
- *(v2)* **Billing:** monthly/term invoices per enrollment, discounts &
  sibling rates, payment recording, debt list, automatic gentle reminders.
- *(v2)* **Reports:** enrollment & retention trends, attendance rates, class
  fill rates, revenue by month/campus, score distribution per class — simple
  charts, exportable to Excel (CSV).
- *(v2)* **Term report cards:** one-click generated PDF per student
  (bilingual), with chart, skills, attendance, teacher comment — shareable
  with parents in-app.

### 5.5 Cross-cutting *(v2)*
- **Announcements** from center → all/role/class-scoped, with in-app inbox.
- **AI assist (Claude API):** draft personalized report-card comments from a
  teacher's bullet points (bilingual); auto-generate quiz questions from a
  vocab list; grade short writing homework with gentle feedback. Teacher
  always reviews before anything reaches students/parents.
- **Placement quiz** for prospective students (public link, no login) that
  recommends a class level and captures the lead for Zhao.

## 6. Architecture

### Today [SHIPPED]
React 18 + TypeScript + Vite + Tailwind + React Router (hash routing), all
data through a single store (`src/store.tsx`) backed by localStorage with
rich seeded demo data; deployed to GitHub Pages via Actions
(`.github/workflows/deploy.yml`). The store API is intentionally swappable.

### Target (v2)
- **Backend:** Node + TypeScript (Fastify or Express) + **PostgreSQL** +
  Prisma; REST/JSON; JWT access + refresh tokens; bcrypt; role middleware.
  (Supabase is an acceptable shortcut for auth+DB+storage if it speeds up
  delivery — hide it behind the same store interface.)
- **Frontend:** keep the existing app; replace `loadDB`/`mutate` with an API
  client + react-query-style caching; optimistic updates for homework ticks
  and practice points; offline-tolerant PWA (manifest + service worker,
  practice works offline and syncs).
- **Files:** homework photo/audio uploads to object storage (S3-compatible),
  size-limited, virus-scan optional.
- **Hosting:** any low-cost VN-friendly option (Railway/Render/Fly +
  managed Postgres); keep GitHub Pages for the static frontend if the API is
  hosted separately (CORS configured), or move both to one host.
- **CI/CD:** GitHub Actions — typecheck, tests, build, deploy on merge to
  `main`; preview deploys per PR if the host allows.
- **Monorepo layout:** `apps/web`, `apps/api`, `packages/shared`
  (types + i18n keys shared between both).

### Data model (superset of v1)
`users` (role, campus, locale, parent↔child links) · `classes` (campus,
level, capacity, teacherId, schedule slots) · `enrollments` (with start/end,
status) · `assessments` · `scores` (value, skills jsonb, comment) ·
`homework` + `homework_submissions` (status, media URL, teacher feedback) ·
`attendance` (session, status, note) · `lessons` (date, note) ·
`vocab_lists` + `vocab_words` (+ audio URL) · `practice_events` ·
`badges`/`student_badges` · `rewards` + `redemptions` · `feedback` ·
`announcements` + `reads` · `invoices` + `payments` · `leads` (placement) ·
`audit_log` (who changed what — grades and money especially).

## 7. Security & privacy (children's data — non-negotiable)

- HTTPS everywhere; passwords hashed (bcrypt/argon2); short-lived JWTs.
- Strict object-level authorization: a parent can only read their own
  children; a teacher only their classes. Test this explicitly.
- No student personal data in logs/analytics; no third-party trackers.
- Rate-limit auth endpoints; lockout after repeated failures.
- Daily automated Postgres backups, restore procedure documented.
- Data export & delete on request (parent right).
- An `audit_log` of grade and payment edits.

## 8. Quality bar & acceptance criteria

**Speed-to-value moments (must all hold):**
1. A student logs in and reaches their latest grade + comment in ≤ 2 taps.
2. A teacher takes attendance for a 15-student class in < 30 seconds.
3. A teacher enters a test's scores + comments for the whole class in < 3 min.
4. A parent gets an absence notification the same hour, in Vietnamese.
5. Zhao sees this month's revenue vs last month in one glance.
6. Vocabulary practice works offline and the streak still counts after sync.
7. Every screen renders correctly in both languages on a 360px phone.

**Engineering:**
- TypeScript strict, zero `any` in new code; build + typecheck in CI.
- Unit tests for points/streak/badge logic, fee math, and authorization
  rules; smoke seed-data integrity script stays green (`scripts/smoke.ts`).
- Seeded demo mode is preserved forever — one command/flag gives a
  fully-populated demo for showing prospective parents.
- Lighthouse mobile performance ≥ 90 on dashboard and login.

## 9. Delivery phases

1. **Phase 1 [DONE]** — student progress demo: grades, schedule, homework,
   practice, gamification, parent view, feedback, branding, Pages deploy.
2. **Phase 2 — make it real:** backend + Postgres + real auth, data
   migration of the store interface, account provisioning + CSV import,
   attendance + parent absence notifications, homework submissions.
3. **Phase 3 — run the business:** billing/invoices + VietQR, announcements,
   term report-card PDFs, owner reports, multi-campus, audit log.
4. **Phase 4 — delight:** spaced repetition + audio practice, rewards shop,
   AI comment/quiz assist, placement quiz funnel, PWA install + offline.

Each phase ships behind its own PR(s) with the acceptance criteria above
verified before merge.

## 10. Working agreements for the agent

- Vietnamese UI text must be natural, warm, and correct (tone: trung tâm
  thân thiện, xưng "bạn" with students, "anh/chị" with parents).
- Never hardcode strings, colors, or the center name — use i18n keys and the
  theme; the brand assets live in `public/`.
- Keep `README.md` honest after every change (run instructions, accounts,
  architecture notes).
- Demo accounts (`minh@etop.vn`, `phuhuynh@etop.vn`, `lan@etop.vn`,
  `zhao@etop.vn`, password `etop123`) must keep working in demo mode.
- Prefer boring, maintainable tech; the center has no dev team — anything
  clever needs a comment explaining the constraint that justified it.
