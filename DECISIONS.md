# DECISIONS.md — ETOP Platform

Every assumption and decision, logged per the teardown protocol (Part A).
Correct any assumption and dependent plans adjust.

## Decisions made

- **D1 (Stage 2, approved by "keep going"):** Strategic rebuild over retrofit.
  The current Vite/localStorage SPA remains deployed as the demo while the
  Part B foundation is built fresh; curriculum content, exercise renderers,
  audio engine, and brand assets are ported, the foundation is not.
- **D2:** Killed modules are archived to `/graveyard` in the commit that
  removes them (protocol rule), cleaned up later.
- **D3:** Part C's ETOP skill weights ship as defaults: Grammar 30%,
  Listening 30%, Reading 20%, Writing 20% — configurable per class by the
  Academic Director.
- **D4:** No publisher content (Oxford/Cambridge) is bundled, scraped, or
  redistributed. Coursebook alignment is metadata only; teachers attach
  their own materials behind a copyright responsibility notice.

- **D5 (Phase 1):** Data layer is PGlite (in-process WASM Postgres) with
  plain parameterized SQL for dev/test — real Postgres semantics, zero
  system dependencies in this environment. Tenancy is enforced in the API
  layer (every query org-scoped, verified by tests); `rls.sql` ships the
  row-level-security policies to apply the moment a hosted Postgres is
  provisioned. ORM (Prisma/Drizzle) deferred to that same moment.
  Deviation from Part B's "RLS at the database layer from day one" — the
  database that exists today cannot run multi-role RLS meaningfully;
  the policies are written, tested queries are equivalent, gap is logged.
- **D6 (Phase 1):** Password hashing is scrypt via node:crypto (zero
  native dependencies, OWASP-acceptable parameters) rather than argon2;
  argon2 swap is a one-function change when native deps are acceptable.
- **D7 (Phase 1):** Seed tenant starts at 40 students / 2 sites / 6
  classes / 5 staff roles and grows toward Part B's full 250-student demo
  tenant phase by phase as the features that need richer data land.

## Assumptions (pending owner answers to the context questions)

- **A1 — Identity:** "ETOP" = Trung tâm Anh Ngữ E'TOP, Phan Thiết, Việt Nam
  (two sites: Nguyễn Hội & Tôn Thất Thiệp). English-only program, primary
  ages 5–15 (Starters → B1/Flyers), with existing adult/IELTS classes kept
  in scope as ordinary classes.
- **A2 — Scale:** launch ≈ 50–200 students, ~5–10 staff, 2 sites; 2-year
  target assumed ≈ 500 students / 3 sites. Architecture is multi-tenant
  SaaS regardless (Part B requirement).
- **A3 — Jurisdiction:** Vietnam. Privacy work targets Decree 13/2023/NĐ-CP
  (personal data protection) rather than PIPA/PIPEDA/FERPA/COPPA; the
  consent-ledger design satisfies the stricter of the two families where
  cheap to do so. **Needs owner confirmation — legal details are never
  invented; counsel review required before launch.**
- **A4 — Student logins:** yes (existing product already has them), with
  guardian-consent records for minors and an age-gated portal.
- **A5 — Platforms:** web-first responsive PWA for all roles; kiosk = tablet
  PWA with offline queue. Native Expo apps deferred until store accounts
  exist (cannot be provisioned from this environment).
- **A6 — Billing:** Phase 5, Vietnamese rails first (VietQR / bank-transfer
  reconciliation, MoMo candidate). Stripe only if the owner confirms a
  jurisdiction where it operates.
- **A7 — Delivery mode:** in-person primarily; hybrid/video deferred until a
  video provider account exists.
- **A8 — Existing data:** assumed spreadsheets/paper exist → CSV import
  tooling ships with enrollment (Phase 5); no destructive migrations ever.
- **A9 — Languages:** Vietnamese + English at launch (not EN+FR as Part B's
  template suggests); string architecture supports adding more.
- **A10 — Third-party services:** until the owner provisions accounts
  (hosted Postgres, SMS, storage, payments, video), all integrations are
  built behind provider interfaces with local/mock implementations, and the
  system runs fully against local infrastructure. CI uses a Postgres
  service container.
- **A11 — Environment constraint:** this workspace has allowlisted egress;
  app-store distribution, third-party signups, and external API calls are
  impossible from here. Anything requiring them lands as a documented
  integration point.
- **A12 — Demo continuity:** the existing prototype stays live on GitHub
  Pages untouched until the new platform reaches feature parity for the
  demo flows.

## Open questions for the owner

The nine context questions from the Stage 1 audit (seven from Part B plus
two audit-discovered) remain open; assumptions A1–A10 stand in for them
until answered.
