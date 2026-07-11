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
| 🧑‍🎓 **Student** | Dashboard with **level/XP progression**, streak & points, grades with skill breakdown and progress chart, **attendance record**, class schedule, homework checklist, vocabulary flashcards & quizzes with **audio pronunciation**, badges and a class leaderboard |
| 🧑‍🏫 **Teacher** | Class overview, gradebook (enter scores + comments per student), **session attendance marking**, assign homework, create vocabulary lists |
| 👩‍💼 **Owner (admin)** | Everything teachers get, plus center-wide stats across all classes (average, homework & **attendance rates**) |
| 👨‍👦 **Parent** | Read-only view of their child's level, grades, attendance, schedule, homework, and badges |

### Feature highlights

- **Level & XP progression** — points earned from practice/homework/quizzes drive an eight-tier level system (🌱 → 👑) with a live progress bar.
- **Attendance** — teachers mark present / late / absent per session; students & parents see attendance rate and history; admins see a center-wide rate.
- **Audio pronunciation** — 🔊 buttons in flashcards & quizzes speak the English word via the browser's built-in speech synthesis (fully offline).
- **Announcements** — teachers/admins post notices (center-wide or to a class); students & parents see a feed with per-device unread badges.

## Run it

```bash
npm install
npm run dev      # development server
npm run build    # production build (also type-checks)
npx tsx scripts/smoke.ts   # sanity-check the seeded demo data
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
