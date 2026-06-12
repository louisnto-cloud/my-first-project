# ⭐ Anh Ngữ E’TOP

A student progress & learning app for **Trung tâm Anh Ngữ E’TOP** (Phan Thiết, Vietnam).
Built mobile-first as a web app, with a fully bilingual Vietnamese/English interface.

> **Branding:** the official E’TOP logo shown across the app (login, header,
> favicon) is the single file `public/logo.png` — replace it to update the
> branding everywhere at once.

See [`APP_PROMPT.md`](./APP_PROMPT.md) for the full product spec.

## What's inside

| Role | What they get |
|---|---|
| 🧑‍🎓 **Student** | Dashboard with streak & points, grades with skill breakdown and progress chart, class schedule, homework checklist, **self-study programs** (3 courses with vocabulary + audio, grammar, and interactive exercises), vocabulary flashcards & quizzes, badges and a class leaderboard |
| 🧑‍🏫 **Teacher** | Class overview, gradebook (enter scores + comments per student), assign homework, create vocabulary lists |
| 👩‍💼 **Owner (admin)** | Everything teachers get, plus center-wide stats across all classes |
| 👨‍👦 **Parent** | Read-only view of their child's grades, schedule, homework, and badges |

## Install it on a phone (no app store needed)

The app is a PWA. Open the live link in the phone's browser, then:
- **iPhone (Safari):** tap Share → **Add to Home Screen** ("Thêm vào MH chính")
- **Android (Chrome):** tap ⋮ → **Install app** / **Add to Home screen**

It appears with the E’TOP icon and opens full-screen like a native app, and
the app shell works offline after the first visit.

## Repository structure (monorepo)

This repo is now a Turborepo monorepo (see `ARCHITECTURE.md`, `PLAN.md`,
`DECISIONS.md` for the platform rebuild in progress):

- `apps/web-prototype` — the demo app described below (deployed to Pages)
- `apps/api` — the real multi-tenant backend (Fastify + Postgres/PGlite)
- `packages/domain` — shared RBAC policies, schemas, taxonomy

## Run it

```bash
npm install
npx turbo run build test   # typecheck, build, and test everything
npm run dev:proto          # the demo app on :5173
npm run dev:api            # the API on :3001 (auto-seeds demo tenant)
```

## Demo accounts (password: `etop123`)

| Role | Email |
|---|---|
| Student | `minh@etop.vn` |
| Parent | `phuhuynh@etop.vn` |
| Teacher | `lan@etop.vn` |
| Owner | `zhao@etop.vn` |

The app ships with a seeded demo database — 6 classes, 40 students, score
history, homework, and vocabulary lists — stored in the browser's
localStorage. The **Reset demo data** link on the teacher overview restores it.

## Architecture notes

- **Stack:** React 18 + TypeScript + Vite + Tailwind CSS + React Router.
- **Data layer:** all reads/writes go through `src/store.tsx` (`useApp()`),
  currently backed by localStorage with seed data from `src/seed.ts`. To move
  to a real backend, replace `loadDB`/`mutate` with API calls — pages and
  components don't need to change.
- **i18n:** every UI string goes through `t()` in `src/i18n.tsx` with `vi`
  and `en` dictionaries; the toggle persists per device.
- **Mobile app path:** it's a responsive SPA, ready to be wrapped with
  Capacitor or extended into a PWA (manifest + service worker) later.
